const express = require('express');
const { authenticateToken } = require('./auth');
const db = require('../database');
const bedrockService = require('../services/bedrock');

const router = express.Router();

const CONTENT_GENERATE_MONTHLY_LIMIT = 5;

// Generate all content for a business
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    // Check monthly generation limit
    const usageRow = await db.get(
      `SELECT COUNT(*) as count FROM content_generate_log
       WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')`,
      [req.user.userId]
    );
    if ((usageRow?.count || 0) >= CONTENT_GENERATE_MONTHLY_LIMIT) {
      return res.status(429).json({
        error: `Monthly content generation limit reached (${CONTENT_GENERATE_MONTHLY_LIMIT}/month). Resets on the 1st.`,
      });
    }

    // Get business profile
    const business = await db.get(
      'SELECT * FROM businesses WHERE user_id = ?',
      [req.user.userId]
    );

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found. Please complete setup first.' });
    }

    console.log(`🤖 Generating content for ${business.business_name}...`);

    // Generate all content types in parallel
    const [socialPosts, gmbPosts, emailTemplates] = await Promise.all([
      bedrockService.generateSocialPosts(business, 10),
      bedrockService.generateGMBPosts(business, 8), 
      bedrockService.generateEmailTemplates(business, 4)
    ]);

    // Parse and store generated content
    const parsedContent = {
      social_posts: parseSocialPosts(socialPosts),
      gmb_posts: parseGMBPosts(gmbPosts),
      email_templates: parseEmailTemplates(emailTemplates)
    };

    // Store in database
    await storeGeneratedContent(business.id, parsedContent);

    // Log usage
    await db.run('INSERT INTO content_generate_log (user_id) VALUES (?)', [req.user.userId]);

    console.log(`✅ Content generation complete for ${business.business_name}`);

    const usedAfter = (usageRow?.count || 0) + 1;
    res.json({
      message: 'Content generated successfully!',
      content: parsedContent,
      generated_at: new Date().toISOString(),
      quota: { used: usedAfter, limit: CONTENT_GENERATE_MONTHLY_LIMIT, remaining: CONTENT_GENERATE_MONTHLY_LIMIT - usedAfter },
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
    const row = await db.get(
      `SELECT COUNT(*) as count FROM email_write_log
       WHERE user_id = ? AND date(created_at) = date('now', 'localtime')`,
      [req.user.userId]
    );
    const used = row?.count || 0;
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
    const usageRow = await db.get(
      `SELECT COUNT(*) as count FROM email_write_log
       WHERE user_id = ? AND date(created_at) = date('now', 'localtime')`,
      [req.user.userId]
    );
    if ((usageRow?.count || 0) >= EMAIL_DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily email write limit reached (${EMAIL_DAILY_LIMIT}/day). Resets at midnight.`,
      });
    }

    const business = await db.get('SELECT * FROM businesses WHERE user_id = ?', [req.user.userId]);
    if (!business) {
      return res.status(404).json({ error: 'Business profile not found. Please complete setup first.' });
    }

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
    await db.run('INSERT INTO email_write_log (user_id) VALUES (?)', [req.user.userId]);

    const usedAfter = (usageRow?.count || 0) + 1;
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
    const business = await db.get(
      'SELECT id FROM businesses WHERE user_id = ?',
      [req.user.userId]
    );

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    const content = await db.query(
      `SELECT * FROM generated_content 
       WHERE business_id = ? 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [business.id]
    );

    // Group content by type
    const groupedContent = {
      social_posts: content.filter(c => c.content_type === 'social_post'),
      gmb_posts: content.filter(c => c.content_type === 'gmb_post'),
      email_templates: content.filter(c => c.content_type === 'email')
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
    const business = await db.get(
      'SELECT id FROM businesses WHERE user_id = ?',
      [req.user.userId]
    );

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Update content
    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (content) {
      updateFields.push('content = ?');
      updateValues.push(content);
    }

    updateValues.push(contentId);
    updateValues.push(business.id);

    const result = await db.run(
      `UPDATE generated_content 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND business_id = ?`,
      updateValues
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

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

function parseGMBPosts(rawContent) {
  const posts = [];
  const postRegex = /GMB POST (\d+):\s*Title:\s*(.*?)\s*Content:\s*([\s\S]*?)(?=GMB POST \d+:|---|\n\n$|$)/g;
  let match;

  while ((match = postRegex.exec(rawContent)) !== null) {
    const title = match[2].trim();
    const content = match[3].trim();
    
    if (title && content) {
      posts.push({
        type: 'gmb_post',
        title: title,
        content: content,
        platform: 'gmb'
      });
    }
  }

  return posts;
}

function parseEmailTemplates(rawContent) {
  const emails = [];
  const emailRegex = /EMAIL (\d+):\s*(.*?)\s*Subject:\s*(.*?)\s*Body:\s*([\s\S]*?)(?=EMAIL \d+:|---|\n\n$|$)/g;
  let match;

  while ((match = emailRegex.exec(rawContent)) !== null) {
    const type = match[2].trim();
    const subject = match[3].trim();
    const body = match[4].trim();
    
    if (subject && body) {
      emails.push({
        type: 'email',
        email_type: type,
        title: subject,
        content: body,
        platform: 'email'
      });
    }
  }

  return emails;
}

function extractHashtags(content) {
  const hashtags = content.match(/#[\w]+/g);
  return hashtags ? hashtags.join(' ') : '';
}

// Store generated content in database
async function storeGeneratedContent(businessId, content) {
  const allContent = [
    ...content.social_posts,
    ...content.gmb_posts, 
    ...content.email_templates
  ];

  for (const item of allContent) {
    await db.run(
      `INSERT INTO generated_content 
       (business_id, content_type, title, content, platform, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [businessId, item.type, item.title || null, item.content, item.platform]
    );
  }
}

module.exports = router;