const express = require('express');
const { authenticateToken } = require('./auth');
const db = require('../database');
const bedrockService = require('../services/bedrock');

const router = express.Router();

// Generate all content for a business
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    // Get business profile
    const business = await db.get(
      'SELECT * FROM businesses WHERE user_id = ?',
      [req.user.userId]
    );

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found. Please complete setup first.' });
    }

    // Check if user has active subscription (for now, skip this check in MVP)
    // TODO: Add subscription check

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

    console.log(`✅ Content generation complete for ${business.business_name}`);

    res.json({
      message: 'Content generated successfully!',
      content: parsedContent,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate content',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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