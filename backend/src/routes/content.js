const express = require('express');
const { authenticateToken } = require('./auth');
const dynamodb = require('../services/dynamodb');
const bedrockService = require('../services/bedrock');

const router = express.Router();

// Import the quota helper from social routes (we should move this to a shared utility)
async function getUserQuota(userId) {
  const [user, subscription] = await Promise.all([
    dynamodb.getUserById(userId),
    dynamodb.getUserSubscription(userId)
  ]);

  const isTrialUser = subscription?.plan === 'trial';
  const isProUser = subscription?.plan === 'pro';
  const hasActiveSubscription = subscription?.status === 'active';

  // Trial users have fixed credit limits
  if (isTrialUser && hasActiveSubscription) {
    const trialUsage = {
      content_generate: await dynamodb.getUserUsageLog(userId, 'content_generate_trial') || { count: 0 },
    };

    return {
      plan: 'trial',
      quotas: {
        content_generate: { used: trialUsage.content_generate.count, limit: 2, remaining: Math.max(0, 2 - trialUsage.content_generate.count) },
      }
    };
  }

  // Paid users have monthly limits
  if (hasActiveSubscription && (subscription.plan === 'basic' || subscription.plan === 'pro')) {
    const monthlyUsage = await dynamodb.getMonthlyUsageCount(userId, 'content_generate');
    const limit = isProUser ? 15 : 5;

    return {
      plan: subscription.plan,
      quotas: {
        content_generate: { used: monthlyUsage, limit: limit, remaining: Math.max(0, limit - monthlyUsage) },
      }
    };
  }

  // No subscription
  return {
    plan: 'none',
    quotas: {
      content_generate: { used: 0, limit: 0, remaining: 0 },
    }
  };
}

// Generate all content for a business
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    // Check generation limit
    const userQuota = await getUserQuota(req.user.userId);
    if (userQuota.quotas.content_generate.remaining <= 0) {
      return res.status(429).json({
        error: userQuota.plan === 'trial' 
          ? 'Trial content generation limit reached. Upgrade to continue.'
          : `Monthly content generation limit reached (${userQuota.quotas.content_generate.limit}/month). Resets on the 1st.`,
      });
    }

    // Get business profile
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found. Please complete setup first.' });
    }
    
    const business = businesses[0]; // Use first business

    console.log(`🤖 Generating social posts for ${business.business_name}...`);

    // Generate only social media posts (10 posts)
    const socialPosts = await bedrockService.generateSocialPosts(business, 10);

    // Parse and store generated content
    const parsedContent = {
      social_posts: parseSocialPosts(socialPosts)
    };

    // Store in database
    await storeGeneratedContent(business.id, parsedContent);

    console.log(`✅ Social content generation complete for ${business.business_name}`);

    // Log usage (different log type for trial users)
    const logType = userQuota.plan === 'trial' ? 'content_generate_trial' : 'content_generate';
    await dynamodb.incrementUsageLog(req.user.userId, logType);

    const updatedQuota = await getUserQuota(req.user.userId);
    res.json({
      message: 'Content generated successfully!',
      content: parsedContent,
      generated_at: new Date().toISOString(),
      quota: { 
        used: updatedQuota.quotas.content_generate.used, 
        limit: updatedQuota.quotas.content_generate.limit, 
        remaining: updatedQuota.quotas.content_generate.remaining 
      },
    });

  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate content',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const EMAIL_DAILY_LIMIT = 10;

// ─── GET /api/content/email-quota ────────────────────────────────────────────
router.get('/email-quota', authenticateToken, async (req, res) => {
  try {
    const used = await dynamodb.getDailyUsageCount(req.user.userId, 'email_write');
    const remaining = Math.max(0, EMAIL_DAILY_LIMIT - used);
    res.json({ used, limit: EMAIL_DAILY_LIMIT, remaining, can_write: remaining > 0 });
  } catch (error) {
    console.error('Email quota error:', error);
    res.status(500).json({ error: 'Failed to check email quota' });
  }
});

// AI email writer — generates a subject line + body from a user prompt
router.post('/write-email', authenticateToken, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Check daily limit
    const usageCount = await dynamodb.getDailyUsageCount(req.user.userId, 'email_write');
    if (usageCount >= EMAIL_DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily email write limit reached (${EMAIL_DAILY_LIMIT}/day). Resets at midnight.`,
      });
    }

    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found. Please complete setup first.' });
    }
    
    const business = businesses[0]; // Use first business

    const aiPrompt = `You are an email marketing expert for a local Austin business.

Business: ${business.business_name} (${business.business_type})
Tone: ${business.tone || 'friendly'}
Target audience: ${business.target_audience || 'local Austin customers'}
Description: ${business.description || ''}

The owner wants to send an email with this intent:
"${prompt}"

Write a complete marketing email. Requirements:
- Subject line that gets opens (concise, compelling)
- Friendly greeting
- Clear, engaging body (2-4 short paragraphs)
- Strong call-to-action
- Professional sign-off with the business name
- Austin-local tone where natural
- Match the business tone (${business.tone || 'friendly'})

Respond in this exact format:
SUBJECT: [subject line here]
BODY:
[full email body here]`;

    const raw = await bedrockService.generateContent(aiPrompt, 800);

    const subjectMatch = raw.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = raw.match(/BODY:\s*([\s\S]+)/i);

    const subject = subjectMatch ? subjectMatch[1].trim() : 'Message from ' + business.business_name;
    const body = bodyMatch ? bodyMatch[1].trim() : raw.trim();

    // Log successful generation
    await dynamodb.incrementUsageLog(req.user.userId, 'email_write');

    const usedAfter = usageCount + 1;
    res.json({
      subject,
      body,
      quota: { used: usedAfter, limit: EMAIL_DAILY_LIMIT, remaining: EMAIL_DAILY_LIMIT - usedAfter, can_write: usedAfter < EMAIL_DAILY_LIMIT },
    });
  } catch (error) {
    console.error('Write email error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate email' });
  }
});

// Get previously generated content
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const business = businesses[0]; // Use first business

    const content = await dynamodb.getBusinessContent(business.id);

    // Group content by type (only social posts now)
    const groupedContent = {
      social_posts: content.filter(c => c.content_type === 'social_post')
    };

    res.json({ content: groupedContent });

  } catch (error) {
    console.error('Get content history error:', error);
    res.status(500).json({ error: 'Failed to get content history' });
  }
});

// Update content status (approve, edit, etc.)
router.patch('/content/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { status, content } = req.body;

    // Verify ownership
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const business = businesses[0]; // Use first business

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Update content
    const updateData = {};
    if (status) updateData.status = status;
    if (content) updateData.content = content;

    const result = await dynamodb.updateContent(business.id, contentId, updateData);

    res.json({ message: 'Content updated successfully' });

  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Helper functions to parse AI-generated content
function parseSocialPosts(rawContent) {
  const posts = [];
  const postRegex = /POST (\d+):\s*([\s\S]*?)(?=POST \d+:|---|\n\n$|$)/g;
  let match;

  while ((match = postRegex.exec(rawContent)) !== null) {
    const content = match[2].trim();
    if (content) {
      posts.push({
        type: 'social_post',
        platform: 'facebook', // Default, can be customized later
        content: content,
        hashtags: extractHashtags(content)
      });
    }
  }

  return posts;
}

function extractHashtags(content) {
  const hashtags = content.match(/#[\w]+/g);
  return hashtags ? hashtags.join(' ') : '';
}

// Store generated content in database
async function storeGeneratedContent(businessId, content) {
  const allContent = [
    ...content.social_posts
  ];

  for (const item of allContent) {
    await dynamodb.createContent(businessId, {
      content_type: item.type,
      title: item.title || null,
      content: item.content,
      platform: item.platform || null,
      status: 'draft'
    });
  }
}

module.exports = router;