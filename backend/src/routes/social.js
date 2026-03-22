const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const dynamodb = require('../services/dynamodb');
const { authenticateToken } = require('./auth');
const bedrock = require('../services/bedrock');
const s3 = require('../services/s3');
const pexelsService = require('../services/pexels');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,   // 10 MB for file uploads
    fieldSize: 10 * 1024 * 1024,  // 10 MB for base64 field values (AI-generated images)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = express.Router();

// ─── OAuth State Token Helpers ────────────────────────────────────────────────
// Encodes userId + timestamp into a signed state param so we know which user
// is completing OAuth even though the callback doesn't carry a JWT.

function generateStateToken(userId) {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function verifyStateToken(state) {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const lastColon = decoded.lastIndexOf(':');
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);
    const payload = decoded.substring(0, lastColon);
    const signature = decoded.substring(lastColon + 1);
    const userId = decoded.substring(0, secondLastColon);
    const timestamp = decoded.substring(secondLastColon + 1, lastColon);

    // Reject if older than 15 minutes
    if (Date.now() - parseInt(timestamp) > 15 * 60 * 1000) return null;

    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET);
    hmac.update(payload);
    const expected = hmac.digest('hex');
    if (signature !== expected) return null;

    return userId;
  } catch {
    return null;
  }
}

// ─── POST /api/social/facebook/enhance-post ───────────────────────────────────
// AI-enhances a draft Facebook post message using business context

router.post('/facebook/enhance-post', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    // Check quota
    const userQuota = await getUserQuota(req.user.userId);
    if (userQuota.quotas.post_enhance.remaining <= 0) {
      return res.status(429).json({
        error: `${userQuota.plan === 'trial' ? 'Trial' : 'Daily'} AI assist limit reached. ${userQuota.plan === 'trial' ? 'Upgrade to continue.' : 'Resets at midnight.'}`,
      });
    }

    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;

    const prompt = `You are a social media expert for a local Austin business.
${business ? `Business: ${business.business_name} (${business.business_type})
Tone: ${business.tone || 'friendly'}
Target audience: ${business.target_audience || 'local Austin customers'}` : ''}

The business owner wrote this draft Facebook post:
"${message}"

Rewrite it to be more engaging and effective. Requirements:
- Keep the core message and intent exactly the same
- Make it more compelling and scroll-stopping
- Add relevant emojis where natural (1-3 max)
- Include 2-3 relevant hashtags at the end (#Austin and topic-specific)
- Keep it concise (under 280 characters if possible)
- Match the ${business?.tone || 'friendly'} tone
- Sound authentic, not like generic marketing copy

Return ONLY the enhanced post text. No explanations, no quotes.`;

    const enhanced = await bedrock.generateContent(prompt, 300);

    // Log usage (different log type for trial users)
    const logType = userQuota.plan === 'trial' ? 'post_enhance_trial' : 'post_enhance';
    await dynamodb.incrementUsageLog(req.user.userId, logType);

    const updatedQuota = await getUserQuota(req.user.userId);
    res.json({ 
      enhanced: enhanced.trim(), 
      remaining: updatedQuota.quotas.post_enhance.remaining, 
      limit: updatedQuota.quotas.post_enhance.limit 
    });
  } catch (err) {
    console.error('Enhance post error:', err);
    res.status(500).json({ error: err.message || 'Failed to enhance post' });
  }
});

// ─── GET /api/social/connections ─────────────────────────────────────────────

router.get('/connections', authenticateToken, async (req, res) => {
  try {
    // Use string userId directly (no parsing needed)
    const userId = req.user.userId;
    console.log('🔍 Loading connections for user:', userId);

    const rows = await dynamodb.getUserSocialConnections(userId);
    console.log('📊 Raw connections from DB:', rows);

    const connections = {};
    rows.forEach(row => {
      connections[row.platform] = {
        connected: true,
        page_name: row.platform_page_name,
        page_id: row.platform_page_id,
        extra_data: row.extra_data ? JSON.parse(row.extra_data) : null,
        connected_at: row.created_at,
      };
    });

    console.log('📋 Formatted connections:', connections);
    res.json({ connections });
  } catch (err) {
    console.error('Get connections error:', err);
    res.json({ connections: {} }); // Return empty object instead of error
  }
});

// ─── DEBUG: Manual Instagram Check ───────────────────────────────────────────
// Temporary endpoint to manually test Instagram detection
router.get('/debug/instagram-check', authenticateToken, async (req, res) => {
  try {
    const connections = await dynamodb.getUserSocialConnections(req.user.userId);
    const fbConnection = connections.find(conn => conn.platform === 'facebook');
    
    if (!fbConnection) {
      return res.json({ error: 'No Facebook connection found' });
    }

    const pageToken = fbConnection.access_token;
    const pageId = fbConnection.platform_page_id;
    
    console.log(`🔍 Manual Instagram check - Page ID: ${pageId}, Token exists: ${!!pageToken}`);
    
    if (!pageId) {
      return res.json({ error: 'No Facebook page ID found' });
    }

    // Test the exact same call that happens during OAuth
    const igRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
      params: {
        fields: 'instagram_business_account,name,id',
        access_token: pageToken,
      },
    });

    res.json({
      success: true,
      pageData: igRes.data,
      hasInstagram: !!igRes.data.instagram_business_account,
      instagramId: igRes.data.instagram_business_account?.id || null
    });
    
  } catch (error) {
    console.error('Manual Instagram check error:', error.response?.data || error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// ─── Facebook OAuth ───────────────────────────────────────────────────────────

router.get('/facebook/auth', authenticateToken, (req, res) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(400).json({ error: 'Facebook OAuth is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to your .env file.' });
  }

  const state = generateStateToken(req.user.userId);
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/social/facebook/callback';

  const url =
    `https://www.facebook.com/v18.0/dialog/oauth` +
    `?client_id=${process.env.FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=pages_manage_posts,pages_read_engagement,pages_show_list` +
    `&state=${state}`;

  res.json({ url });
});

router.get('/facebook/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  console.log('🔵 Facebook callback received:', { code: !!code, state: !!state, error });

  if (error) {
    console.log('❌ Facebook OAuth error:', error);
    return res.redirect(`${frontendUrl}/connect-accounts?error=facebook_denied`);
  }

  const userId = verifyStateToken(state);
  console.log('🔍 State verification result:', { userId, validState: !!userId });
  
  if (!userId) {
    console.log('❌ Invalid state token');
    return res.redirect(`${frontendUrl}/connect-accounts?error=invalid_state`);
  }

  try {
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/social/facebook/callback';
    console.log('📡 Starting Facebook token exchange for user:', userId);

    // Exchange code for short-lived token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      },
    });
    const shortLivedToken = tokenRes.data.access_token;
    console.log('✅ Short-lived token obtained');

    // Exchange for long-lived token
    const longRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });
    const longLivedToken = longRes.data.access_token;
    console.log('✅ Long-lived token obtained');

    // Get pages the user manages
    console.log('📋 Fetching Facebook pages...');
    let pages = [];
    try {
      const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { 
          access_token: longLivedToken,
          fields: 'id,name,access_token,tasks' 
        },
      });
      pages = pagesRes.data.data || [];
      console.log(`📄 Found ${pages.length} pages`);
      console.log('📊 Pages data:', JSON.stringify(pages, null, 2));
      
      if (pages.length === 0) {
        console.log('⚠️  No pages found. Possible causes:');
        console.log('   • User is not an admin/editor of any Facebook pages');
        console.log('   • Pages are not published');
        console.log('   • Insufficient permissions in OAuth token');
        console.log('   • Facebook app may need to be reviewed for page access');
      }
    } catch (pagesError) {
      console.error('❌ Error fetching Facebook pages:', pagesError.response?.data || pagesError.message);
      console.log('💡 This might be due to:');
      console.log('   • Missing page permissions in OAuth scope');
      console.log('   • Facebook app not approved for page access');
      console.log('   • Token expired or invalid');
      pages = []; // Fallback to empty array
    }

    let pageId = null;
    let pageName = null;
    let pageToken = null;
    let instagramAccountId = null;

    if (pages.length > 0) {
      pageId = pages[0].id;
      pageName = pages[0].name;
      pageToken = pages[0].access_token; // Page-level permanent token
      console.log(`📄 Selected page: ${pageName} (${pageId})`);

      // Check for connected Instagram business account
      try {
        console.log(`🔍 Checking for Instagram account on page ${pageId}...`);
        const igRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
          params: {
            fields: 'instagram_business_account',
            access_token: pageToken,
          },
        });
        console.log('📊 Instagram API response:', JSON.stringify(igRes.data, null, 2));
        instagramAccountId = igRes.data.instagram_business_account?.id || null;
        console.log(`📷 Instagram account: ${instagramAccountId ? `Found (ID: ${instagramAccountId})` : 'None detected'}`);
        
        if (!instagramAccountId) {
          console.log('💡 No Instagram account found. Make sure:');
          console.log('   1. Your Instagram is a Business account');
          console.log('   2. It is linked to this Facebook page in Business Manager');
          console.log('   3. Your Facebook app has Instagram permissions approved');
        }
      } catch (igErr) {
        console.error('❌ Instagram account fetch error:');
        console.error('   Message:', igErr.message);
        console.error('   Response:', igErr.response?.data);
        console.error('   Status:', igErr.response?.status);
      }
    }

    // Store Facebook connection
    console.log('💾 Saving Facebook connection to DynamoDB...');
    
    // If no pages found, we can't post - save connection but mark it as incomplete
    if (!pageId) {
      console.log('⚠️  No Facebook pages found - user needs to create a Business Page first');
      await dynamodb.createOrUpdateSocialConnection(userId, 'facebook', {
        access_token: longLivedToken,
        platform_page_id: 'me',
        platform_page_name: 'Personal Feed (Cannot Post)',
        extra_data: JSON.stringify({ pages, instagramAccountId, needsBusinessPage: true })
      });
    } else {
      await dynamodb.createOrUpdateSocialConnection(userId, 'facebook', {
        access_token: pageToken || longLivedToken,
        platform_page_id: pageId,
        platform_page_name: pageName,
        extra_data: JSON.stringify({ pages, instagramAccountId })
      });
    }
    console.log('✅ Facebook connection saved successfully');

    // Store Instagram connection if available
    if (instagramAccountId && pageToken) {
      console.log('💾 Saving Instagram connection...');
      await dynamodb.createOrUpdateSocialConnection(userId, 'instagram', {
        access_token: pageToken,
        platform_page_id: instagramAccountId,
        platform_page_name: pageName ? `${pageName} (Instagram)` : 'Instagram Business',
        extra_data: JSON.stringify({ facebookPageId: pageId })
      });
      console.log('✅ Instagram connection saved successfully');
    }

    console.log('🎉 OAuth callback completed successfully, redirecting to:', `${frontendUrl}/connect-accounts?connected=facebook`);
    res.redirect(`${frontendUrl}/connect-accounts?connected=facebook`);
  } catch (err) {
    console.error('❌ Facebook OAuth callback error:', err.response?.data || err.message);
    console.error('❌ Full error details:', err);
    res.redirect(`${frontendUrl}/connect-accounts?error=facebook_failed`);
  }
});

// ─── GET /api/social/facebook/debug ─────────────────────────────────────────
// Debug endpoint to check Facebook connection details

router.get('/facebook/debug', authenticateToken, async (req, res) => {
  try {
    const connection = await dynamodb.getUserSocialConnection(req.user.userId, 'facebook');
    if (!connection) {
      return res.json({ 
        status: 'not_connected',
        message: 'No Facebook connection found'
      });
    }

    const extraData = connection.extra_data ? JSON.parse(connection.extra_data) : {};
    const canPost = connection.platform_page_id && connection.platform_page_id !== 'me';

    res.json({
      status: canPost ? 'ready_to_post' : 'needs_business_page',
      connection: {
        platform: connection.platform,
        pageId: connection.platform_page_id,
        pageName: connection.platform_page_name,
        connectedAt: connection.created_at || connection.updated_at,
        hasAccessToken: !!connection.access_token
      },
      extraData: {
        availablePages: extraData.pages?.length || 0,
        pagesData: extraData.pages || [],
        instagramLinked: !!extraData.instagramAccountId,
        needsBusinessPage: extraData.needsBusinessPage || !connection.platform_page_id
      },
      diagnosis: {
        canPost,
        issue: canPost ? null : 'No Facebook Business Page connected. Create a Business Page and reconnect.',
        recommendation: canPost 
          ? 'Connection is ready for posting!'
          : 'Visit https://www.facebook.com/pages/create to create a Business Page, then reconnect your account.'
      }
    });
  } catch (err) {
    console.error('Facebook debug error:', err);
    res.status(500).json({ error: 'Failed to check Facebook connection' });
  }
});

// ─── GET /api/social/facebook/connection-status ─────────────────────────────
// Check Facebook connection status and whether user needs a business page

router.get('/facebook/connection-status', authenticateToken, async (req, res) => {
  try {
    const connection = await dynamodb.getUserSocialConnection(req.user.userId, 'facebook');
    if (!connection) {
      return res.json({ connected: false });
    }

    const extraData = connection.extra_data ? JSON.parse(connection.extra_data) : {};
    const needsBusinessPage = connection.platform_page_id === 'me' || extraData.needsBusinessPage;

    res.json({
      connected: true,
      canPost: !needsBusinessPage,
      needsBusinessPage,
      pageName: connection.platform_page_name,
      pageId: connection.platform_page_id,
      pagesAvailable: extraData.pages?.length || 0
    });
  } catch (err) {
    console.error('Facebook connection status error:', err);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// ─── GET /api/social/facebook/posts ──────────────────────────────────────────
// Returns the most recent Facebook posts submitted by the user

router.get('/facebook/posts', authenticateToken, async (req, res) => {
  try {
    const posts = await dynamodb.getUserSocialPosts(req.user.userId, 'facebook');
    res.json({ posts });
  } catch (err) {
    console.error('Get facebook posts error:', err);
    res.json({ posts: [] }); // Return empty array instead of error
  }
});

// ─── GET /api/social/facebook/post-status ────────────────────────────────────
// Returns how many posts the user has made today and whether they can post

router.get('/facebook/post-status', authenticateToken, async (req, res) => {
  try {
    const postsThisMonth = await dynamodb.getMonthlySocialPostsCount(req.user.userId, 'facebook');
    res.json({ 
      posts_today: 0, // Could implement daily count if needed
      posts_this_month: postsThisMonth,
      limit: null, 
      can_post: true 
    });
  } catch (err) {
    console.error('Post status error:', err);
    res.status(500).json({ error: 'Failed to check post status' });
  }
});

// ─── POST /api/social/facebook/generate-caption ──────────────────────────────
// Generate a Facebook caption from an image description using AI

const CAPTION_DAILY_LIMIT = 10;

router.post('/facebook/generate-caption', authenticateToken, async (req, res) => {
  const { image_description } = req.body;
  if (!image_description?.trim()) {
    return res.status(400).json({ error: 'image_description is required' });
  }
  try {
    // Check quota
    const userQuota = await getUserQuota(req.user.userId);
    if (userQuota.quotas.caption_generate.remaining <= 0) {
      return res.status(429).json({
        error: userQuota.plan === 'trial' 
          ? 'Trial caption generation limit reached. Upgrade to continue.'
          : `Daily caption limit reached (${userQuota.quotas.caption_generate.limit}/day). Resets at midnight.`,
      });
    }

    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    const caption = await bedrock.generateCaptionFromImageDescription(image_description, business);

    // Log usage (different log type for trial users)
    const logType = userQuota.plan === 'trial' ? 'caption_generate_trial' : 'caption_generate';
    await dynamodb.incrementUsageLog(req.user.userId, logType);

    const updatedQuota = await getUserQuota(req.user.userId);
    res.json({ 
      caption, 
      remaining: updatedQuota.quotas.caption_generate.remaining, 
      limit: updatedQuota.quotas.caption_generate.limit 
    });
  } catch (err) {
    console.error('Generate caption error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate caption' });
  }
});

const MONTHLY_IMAGE_LIMIT = 50;
const IMAGE_CREDIT_PACK_CREDITS = 25;
const IMAGE_CREDIT_PACK_PRICE_CENTS = 299; // $2.99

// ─── Get comprehensive user quota information ─────────────────────────────────

router.get('/quota', authenticateToken, async (req, res) => {
  try {
    const userQuota = await getUserQuota(req.user.userId);
    res.json(userQuota);
  } catch (error) {
    console.error('Get quota error:', error);
    res.status(500).json({ error: 'Failed to get quota information' });
  }
});

// Helper: get comprehensive quota information for a user based on subscription
async function getUserQuota(userId) {
  const [user, subscription] = await Promise.all([
    dynamodb.getUserById(userId),
    dynamodb.getUserSubscription(userId)
  ]);

  const isTrialUser = subscription?.plan === 'trial';
  const isProUser = subscription?.plan === 'pro';
  const hasActiveSubscription = subscription?.status === 'active';

  // Trial users have fixed credit limits (no monthly reset)
  if (isTrialUser && hasActiveSubscription) {
    const trialUsage = {
      content_generate: await dynamodb.getUserUsageLog(userId, 'content_generate_trial') || { count: 0 },
      post_enhance: await dynamodb.getUserUsageLog(userId, 'post_enhance_trial') || { count: 0 },
      image_generate: await dynamodb.getUserUsageLog(userId, 'image_generate_trial') || { count: 0 },
      caption_generate: await dynamodb.getUserUsageLog(userId, 'caption_generate_trial') || { count: 0 },
    };

    return {
      plan: 'trial',
      trial_end: subscription.current_period_end,
      quotas: {
        content_generate: { used: trialUsage.content_generate.count, limit: 2, remaining: Math.max(0, 2 - trialUsage.content_generate.count) },
        post_enhance: { used: trialUsage.post_enhance.count, limit: 5, remaining: Math.max(0, 5 - trialUsage.post_enhance.count) },
        image_generate: { used: trialUsage.image_generate.count, limit: 2, remaining: Math.max(0, 2 - trialUsage.image_generate.count) },
        caption_generate: { used: trialUsage.caption_generate.count, limit: 3, remaining: Math.max(0, 3 - trialUsage.caption_generate.count) },
        email_write: { used: 0, limit: 0, remaining: 0 }, // Not available in trial
      }
    };
  }

  // Paid users have monthly limits
  if (hasActiveSubscription && (subscription.plan === 'basic' || subscription.plan === 'pro')) {
    const monthlyUsage = await Promise.all([
      dynamodb.getMonthlyUsageCount(userId, 'content_generate'),
      dynamodb.getDailyUsageCount(userId, 'post_enhance'),
      dynamodb.getMonthlyUsageCount(userId, 'image_generate'),
      dynamodb.getDailyUsageCount(userId, 'caption_generate'),
      dynamodb.getDailyUsageCount(userId, 'email_write'),
    ]);

    const limits = isProUser ? {
      content_generate: { monthly: 500 },
      post_enhance: { daily: 100 },
      image_generate: { monthly: 75 },
      caption_generate: { daily: 75 },
      email_write: { daily: 75 },
    } : {
      content_generate: { monthly: 200 },
      post_enhance: { daily: 30 },
      image_generate: { monthly: 30 },
      caption_generate: { daily: 30 },
      email_write: { daily: 30 },
    };

    const extraImageCredits = user?.extra_image_credits || 0;
    const monthlyImageRemaining = Math.max(0, limits.image_generate.monthly - monthlyUsage[2]);
    const totalImageRemaining = monthlyImageRemaining + extraImageCredits;

    return {
      plan: subscription.plan,
      billing_cycle: subscription.billing_cycle,
      quotas: {
        content_generate: { 
          used: monthlyUsage[0], 
          limit: limits.content_generate.monthly, 
          remaining: Math.max(0, limits.content_generate.monthly - monthlyUsage[0]) 
        },
        post_enhance: { 
          used: monthlyUsage[1], 
          limit: limits.post_enhance.daily, 
          remaining: Math.max(0, limits.post_enhance.daily - monthlyUsage[1]) 
        },
        image_generate: { 
          used: monthlyUsage[2], 
          limit: limits.image_generate.monthly, 
          remaining: totalImageRemaining,
          extra_credits: extraImageCredits 
        },
        caption_generate: { 
          used: monthlyUsage[3], 
          limit: limits.caption_generate.daily, 
          remaining: Math.max(0, limits.caption_generate.daily - monthlyUsage[3]) 
        },
        email_write: { 
          used: monthlyUsage[4], 
          limit: limits.email_write.daily, 
          remaining: Math.max(0, limits.email_write.daily - monthlyUsage[4]) 
        },
      }
    };
  }

  // No subscription - very limited access
  return {
    plan: 'none',
    quotas: {
      content_generate: { used: 0, limit: 0, remaining: 0 },
      post_enhance: { used: 0, limit: 0, remaining: 0 },
      image_generate: { used: 0, limit: 0, remaining: 0 },
      caption_generate: { used: 0, limit: 0, remaining: 0 },
      email_write: { used: 0, limit: 0, remaining: 0 },
    }
  };
}

// ─── GET /api/social/facebook/image-quota ────────────────────────────────────

router.get('/facebook/image-quota', authenticateToken, async (req, res) => {
  try {
    const userQuota = await getUserQuota(req.user.userId);
    res.json({
      plan: userQuota.plan,
      quota: userQuota.quotas.image_generate,
      can_generate: userQuota.quotas.image_generate.remaining > 0
    });
  } catch (err) {
    console.error('Image quota error:', err);
    res.status(500).json({ error: 'Failed to check image quota' });
  }
});

// ─── POST /api/social/facebook/generate-image ────────────────────────────────
// Generate an AI image using AWS Bedrock Nova Canvas

router.post('/facebook/generate-image', authenticateToken, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  try {
    const userQuota = await getUserQuota(req.user.userId);
    if (userQuota.quotas.image_generate.remaining <= 0) {
      return res.status(429).json({
        error: userQuota.plan === 'trial' 
          ? 'Trial image generation limit reached. Upgrade to continue.' 
          : `No image credits remaining. Your monthly ${userQuota.quotas.image_generate.limit} resets on the 1st, or buy a top-up pack.`,
      });
    }

    // Enrich prompt with business context so image is relevant
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;
    const enrichedPrompt = business
      ? `${prompt}, for a ${business.business_type} business called ${business.business_name} in Austin Texas, professional marketing photo, high quality`
      : `${prompt}, Austin Texas, professional marketing photo, high quality`;

    let imageBuffer = Buffer.from(await bedrock.generateImage(enrichedPrompt), 'base64');

    // Composite logo if requested and available
    const includeLogo = req.body.include_logo === true || req.body.include_logo === 'true';
    if (includeLogo && business?.logo_path) {
      try {
        // Download the processed logo PNG from S3
        const logoBuffer = await s3.downloadBuffer(business.logo_path);

        // Resize logo to 20% of the AI image width (1024px → max 200px), preserving transparency
        const aiMeta = await sharp(imageBuffer).metadata();
        const logoSize = Math.round((aiMeta.width || 1024) * 0.20);

        const resizedLogo = await sharp(logoBuffer)
          .resize({ width: logoSize, height: logoSize, fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer();

        imageBuffer = await sharp(imageBuffer)
          .composite([{ input: resizedLogo, gravity: 'southeast', blend: 'over' }])
          .png()
          .toBuffer();

        console.log(`Logo composited at ${logoSize}px on AI image`);
      } catch (logoErr) {
        console.warn('Logo compositing failed, continuing without logo:', logoErr.message);
      }
    }

    // Upload final image to S3 → return CDN URL (no more base64 to browser)
    const s3Key = `ai-images/${req.user.userId}/${Date.now()}.png`;
    const imageUrl = await s3.uploadBuffer(imageBuffer, s3Key);

    // Log generation (different log type for trial users)
    const logType = userQuota.plan === 'trial' ? 'image_generate_trial' : 'image_generate';
    await dynamodb.incrementUsageLog(req.user.userId, logType, { prompt });

    // If monthly base was exhausted and user has extra credits, deduct from extra credits (paid users only)
    if (userQuota.plan !== 'trial' && userQuota.quotas.image_generate.remaining === userQuota.quotas.image_generate.extra_credits && userQuota.quotas.image_generate.extra_credits > 0) {
      const user = await dynamodb.getUserById(req.user.userId);
      await dynamodb.updateUserCredits(req.user.userId, (user.extra_image_credits || 0) - 1);
    }

    const updatedQuota = await getUserQuota(req.user.userId);
    res.json({ 
      image_url: imageUrl, 
      quota: updatedQuota.quotas.image_generate 
    });
  } catch (err) {
    console.error('Generate image error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate image' });
  }
});

// ─── POST /api/social/facebook/buy-image-credits ─────────────────────────────
// Creates a Stripe one-time checkout for an image credit top-up pack

router.post('/facebook/buy-image-credits', authenticateToken, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const user = await dynamodb.getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${IMAGE_CREDIT_PACK_CREDITS} AI Image Credits`,
            description: `Add ${IMAGE_CREDIT_PACK_CREDITS} extra image generations to your account. Credits never expire.`,
          },
          unit_amount: IMAGE_CREDIT_PACK_PRICE_CENTS,
        },
        quantity: 1,
      }],
      metadata: {
        type: 'image_credits',
        userId: req.user.userId.toString(),
        credits: IMAGE_CREDIT_PACK_CREDITS.toString(),
      },
      success_url: `${process.env.FRONTEND_URL}/dashboard?credit_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error('Buy image credits error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ─── POST /api/social/facebook/verify-credit-purchase ────────────────────────
// Called by frontend after Stripe redirects back with a session_id

router.post('/facebook/verify-credit-purchase', authenticateToken, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.metadata?.type !== 'image_credits') {
      return res.status(400).json({ error: 'Invalid session type' });
    }
    if (session.metadata?.userId !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Prevent double-crediting by checking if this session was already processed
    const alreadyProcessed = null; // TODO: Check DynamoDB processing log
    if (alreadyProcessed) {
      const quota = await getImageQuota(req.user.userId);
      return res.json({ already_processed: true, quota });
    }

    const credits = parseInt(session.metadata.credits, 10);
    // TODO: Update user credits in DynamoDB
    // Record as processed
    // TODO: Log to DynamoDB

    const quota = await getImageQuota(req.user.userId);
    res.json({ success: true, credits_added: credits, quota });
  } catch (err) {
    console.error('Verify credit purchase error:', err);
    res.status(500).json({ error: 'Failed to verify purchase' });
  }
});

// ─── POST /api/social/facebook/post ──────────────────────────────────────────
// Post to Facebook with optional image (upload or AI-generated base64)

router.post('/facebook/post', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Use string userId directly (no parsing needed)
    const userId = req.user.userId;
    const connection = await dynamodb.getUserSocialConnection(userId, 'facebook');
    if (!connection) {
      return res.status(400).json({ error: 'Facebook account not connected' });
    }

    // Check if user is trying to post to personal feed instead of business page
    if (connection.platform_page_id === 'me' || !connection.platform_page_id) {
      return res.status(400).json({ 
        error: 'Cannot post to personal Facebook feed. Please create a Facebook Business Page and reconnect your account.',
        needsBusinessPage: true
      });
    }

    const message = (req.body.message || '').trim();
    const imageSource = req.body.image_source; // 'none' | 'upload' | 'ai'
    const imageUrl = req.body.image_url;        // CDN URL for AI-generated images

    let platformPostId = null;

    if (imageSource === 'upload' && req.file) {
      // Upload user photo to S3, then post via CDN URL to Facebook
      const s3Key = `uploads/${req.user.userId}/${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadedUrl = await s3.uploadBuffer(req.file.buffer, s3Key, req.file.mimetype);

      console.log('[FB post] Posting uploaded image URL to Facebook:', uploadedUrl);

      // Verify the URL is publicly reachable before sending to Facebook
      try {
        const headResponse = await axios.head(uploadedUrl, { 
          timeout: 10000,
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Ignore SSL issues for URL test
        });
        console.log('[FB post] Image URL is accessible:', headResponse.status, 'Content-Type:', headResponse.headers['content-type']);
      } catch (headErr) {
        console.error('[FB post] ERROR: Image URL is NOT accessible:', headErr.response?.status, headErr.message);
        console.error('[FB post] This will cause Facebook to reject the image');
      }

      const photoRes = await axios.post(
        `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`,
        { url: uploadedUrl, ...(message && { message }), access_token: connection.access_token }
      );
      console.log('[FB post] Facebook API response:', photoRes.data);
      platformPostId = photoRes.data.post_id || photoRes.data.id;

    } else if (imageSource === 'ai' && imageUrl) {
      // AI image is already on S3/CDN — post directly via URL
      console.log('[FB post] Posting AI image URL to Facebook:', imageUrl);

      // Verify the URL is publicly reachable before sending to Facebook
      try {
        const headResponse = await axios.head(imageUrl, { 
          timeout: 10000,
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Ignore SSL issues for URL test
        });
        console.log('[FB post] Image URL is accessible:', headResponse.status, 'Content-Type:', headResponse.headers['content-type']);
      } catch (headErr) {
        console.error('[FB post] ERROR: Image URL is NOT accessible:', headErr.response?.status, headErr.message);
        console.error('[FB post] This will cause Facebook to reject the image');
      }

      // Try alternative method: Download image first, then upload as multipart
      try {
        console.log('[FB post] Attempting URL-based upload first...');
        const photoRes = await axios.post(
          `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`,
          { url: imageUrl, ...(message && { message }), access_token: connection.access_token }
        );
        console.log('[FB post] Facebook API response:', photoRes.data);
        platformPostId = photoRes.data.post_id || photoRes.data.id;
      } catch (urlError) {
        console.log('[FB post] URL method failed, trying multipart upload...');
        
        // Download the image and upload as multipart form data
        const imageResponse = await axios.get(imageUrl, { 
          responseType: 'stream',
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });
        
        const FormData = require('form-data');
        const form = new FormData();
        form.append('source', imageResponse.data, { filename: 'image.png', contentType: 'image/png' });
        if (message) form.append('message', message);
        form.append('access_token', connection.access_token);

        const photoRes = await axios.post(
          `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`,
          form,
          { headers: form.getHeaders() }
        );
        console.log('[FB post] Multipart upload successful:', photoRes.data);
        platformPostId = photoRes.data.post_id || photoRes.data.id;
      }

    } else if (imageSource === 'pexels' && imageUrl) {
      // Pexels image is already on S3/CDN — same as AI image handling
      console.log('[FB post] Posting Pexels image URL to Facebook:', imageUrl);

      // Verify the URL is publicly reachable before sending to Facebook
      try {
        const headResponse = await axios.head(imageUrl, { 
          timeout: 10000,
          httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });
        console.log('[FB post] Pexels image URL is accessible:', headResponse.status, 'Content-Type:', headResponse.headers['content-type']);
      } catch (headErr) {
        console.error('[FB post] ERROR: Pexels image URL is NOT accessible:', headErr.response?.status, headErr.message);
      }

      // Try URL-based upload first
      try {
        console.log('[FB post] Attempting Pexels URL-based upload...');
        const photoRes = await axios.post(
          `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`,
          { url: imageUrl, ...(message && { message }), access_token: connection.access_token }
        );
        console.log('[FB post] Facebook API response:', photoRes.data);
        platformPostId = photoRes.data.post_id || photoRes.data.id;
      } catch (urlError) {
        console.log('[FB post] Pexels URL method failed, trying multipart upload...');
        
        // Download the image and upload as multipart form data
        const imageResponse = await axios.get(imageUrl, { 
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        const form = new (require('form-data'))();
        form.append('source', Buffer.from(imageResponse.data), {
          filename: 'pexels_image.jpg',
          contentType: 'image/jpeg'
        });
        if (message) form.append('message', message);
        form.append('access_token', connection.access_token);

        const photoRes = await axios.post(
          `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`,
          form,
          { headers: form.getHeaders() }
        );
        console.log('[FB post] Pexels multipart upload successful:', photoRes.data);
        platformPostId = photoRes.data.post_id || photoRes.data.id;
      }

    } else {
      // Text-only post
      if (!message) return res.status(400).json({ error: 'A message is required for text-only posts' });
      const feedRes = await axios.post(
        `https://graph.facebook.com/v18.0/${connection.platform_page_id}/feed`,
        { message, access_token: connection.access_token }
      );
      platformPostId = feedRes.data.id;
    }

    // Log the post
    await dynamodb.logSocialPost(userId, 'facebook', {
      platform_post_id: platformPostId,
      message: message,
      has_image: imageSource !== 'none',
      image_source: imageSource
    });

    res.json({ success: true, post_id: platformPostId });
  } catch (err) {
    console.error('Facebook post error:', err.response?.data || err.message);
    const fbError = err.response?.data?.error?.message;
    res.status(500).json({ error: fbError || 'Failed to post to Facebook' });
  }
});

// ─── POST /api/social/publish/:contentId ─────────────────────────────────────

router.post('/publish/:contentId', authenticateToken, async (req, res) => {
  const { contentId } = req.params;
  const { platforms } = req.body;

  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'Specify at least one platform to publish to.' });
  }

  try {
    // Use string userId directly 
    const userId = req.user.userId;
    const businesses = await dynamodb.getUserBusinesses(userId);
    if (!businesses || businesses.length === 0) return res.status(404).json({ error: 'Business not found' });

    const business = businesses[0];

    const contentItem = null; // TODO: Get content from DynamoDB
    if (!contentItem) return res.status(404).json({ error: 'Content not found' });

    const results = {};
    const errors = {};

    await Promise.allSettled(
      platforms.map(async (platform) => {
        try {
          const connection = await dynamodb.getUserSocialConnection(userId, platform);

          if (!connection) {
            errors[platform] = 'Account not connected';
            return;
          }

          if (platform === 'facebook') {
            await publishToFacebook(connection, contentItem);
          } else if (platform === 'instagram') {
            throw new Error('Instagram requires a media image. Use "Copy" and post manually.');
          }

          results[platform] = 'published';
        } catch (err) {
          console.error(`Publish to ${platform} failed:`, err.message);
          errors[platform] = err.message;
        }
      })
    );

    if (Object.keys(results).length > 0) {
      const publishedPlatforms = Object.keys(results).join(',');
      // Update published status
      await dynamodb.updateContent(business.id, contentId, {
        status: 'published',
        published_at: new Date().toISOString(),
        published_platforms: publishedPlatforms
      });
    }

    res.json({
      message: Object.keys(results).length > 0 ? 'Content published!' : 'All platforms failed',
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Failed to publish content' });
  }
});

// ─── DELETE /api/social/connections/:platform ─────────────────────────────────

router.delete('/connections/:platform', authenticateToken, async (req, res) => {
  try {
    // Use string userId directly
    const userId = req.user.userId;
    await dynamodb.deleteSocialConnection(userId, req.params.platform);
    res.json({ message: `${req.params.platform} disconnected successfully` });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// ─── PEXELS STOCK PHOTOS API ─────────────────────────────────────────────────
// Routes for searching, selecting, and downloading Pexels stock photos

// Search Pexels photos
router.get('/pexels/search', authenticateToken, async (req, res) => {
  try {
    const { q: query, page = 1, per_page = 20, orientation = 'all' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Try to get business data for context enhancement
    let results;
    try {
      const businessData = await dynamodb.getBusiness(req.user.userId, req.user.userId);
      if (businessData && Object.keys(businessData).length > 0) {
        results = await pexelsService.searchWithBusinessContext(businessData, query);
      } else {
        results = await pexelsService.searchPhotos(query, per_page, page, orientation);
      }
    } catch (businessError) {
      console.log('Business data not found, using regular search:', businessError.message);
      results = await pexelsService.searchPhotos(query, per_page, page, orientation);
    }
    
    res.json(results);
  } catch (error) {
    console.error('Pexels search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific photo details
router.get('/pexels/photo/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await pexelsService.getPhoto(id);
    res.json(photo);
  } catch (error) {
    console.error('Pexels photo fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Select and download photo to S3
router.post('/pexels/select/:id', authenticateToken, async (req, res) => {
  try {
    const { id: photoId } = req.params;
    const { size = 'large' } = req.body; // tiny, small, medium, large, original
    
    // Get photo details
    const photo = await pexelsService.getPhoto(photoId);
    const imageUrl = photo.src[size] || photo.src.large;
    
    // Download and upload to S3
    const uploadResult = await pexelsService.downloadAndUploadToS3(
      imageUrl, 
      req.user.userId, 
      photoId
    );
    
    res.json({
      success: true,
      image: {
        cdnUrl: uploadResult.cdnUrl,
        s3Key: uploadResult.s3Key,
        fileName: uploadResult.fileName,
        photographer: photo.photographer,
        pexelsUrl: photo.url,
        alt: photo.alt
      }
    });
  } catch (error) {
    console.error('Pexels select error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI-powered photo selection - get best photos for a prompt
router.post('/pexels/ai-select', authenticateToken, async (req, res) => {
  try {
    const { prompt, count = 9 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Search for more photos than needed to have selection options
    const searchResults = await pexelsService.searchPhotos(prompt, Math.min(count * 3, 80), 1);
    
    if (!searchResults.photos || searchResults.photos.length === 0) {
      return res.json({ selectedPhotos: [], message: 'No photos found for this prompt' });
    }

    // Use AI selection to pick the best photos
    const selectedPhotos = await pexelsService.selectBestPhotos(
      searchResults.photos, 
      prompt, 
      count
    );
    
    res.json({
      selectedPhotos,
      totalFound: searchResults.total_results,
      reasoning: `Selected ${selectedPhotos.length} diverse, high-quality photos optimized for social media`
    });
  } catch (error) {
    console.error('AI Pexels selection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Platform Publishing Helpers ──────────────────────────────────────────────

async function publishToFacebook(connection, contentItem) {
  if (!connection.platform_page_id || !connection.access_token) {
    throw new Error('Facebook page not configured. Please reconnect your Facebook account.');
  }

  const message = contentItem.title
    ? `${contentItem.title}\n\n${contentItem.content}`.substring(0, 63206)
    : contentItem.content.substring(0, 63206);

  await axios.post(
    `https://graph.facebook.com/v18.0/${connection.platform_page_id}/feed`,
    {
      message,
      access_token: connection.access_token,
    }
  );
}

// ─── SCHEDULED POSTS ROUTES ──────────────────────────────────────────────

// Schedule a single post
router.post('/schedule-post', authenticateToken, async (req, res) => {
  try {
    const { message, scheduled_time, platform, image_url, image_source } = req.body;
    
    if (!message || !scheduled_time || !platform) {
      return res.status(400).json({ error: 'message, scheduled_time, and platform are required' });
    }
    
    // Validate scheduled time is in the future
    if (new Date(scheduled_time) <= new Date()) {
      return res.status(400).json({ error: 'scheduled_time must be in the future' });
    }
    
    const post = {
      user_id: req.user.userId,
      post_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scheduled_time,
      platform,
      content: { 
        message, 
        image_url: image_url || null,
        image_source: image_source || 'none'
      },
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    await dynamodb.putScheduledPost(post);
    
    res.json({ 
      success: true, 
      post_id: post.post_id, 
      scheduled_time: post.scheduled_time,
      message: 'Post scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Get user's scheduled posts
router.get('/scheduled-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // Use string user_id directly
    const posts = await dynamodb.getUserScheduledPosts(userId);
    res.json({ posts });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.json({ posts: [] });
  }
});

// Delete scheduled post
router.delete('/scheduled-posts/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get the post first to check for images that need cleanup
    const posts = await dynamodb.getUserScheduledPosts(userId);
    const postToDelete = posts.find(p => p.post_id === req.params.postId);
    
    if (postToDelete) {
      // Clean up S3 images if they exist
      await cleanupPostImages([postToDelete]);
    }
    
    await dynamodb.deleteScheduledPost(userId, req.params.postId);
    res.json({ success: true, message: 'Scheduled post deleted successfully' });
  } catch (error) {
    console.error('Delete scheduled post error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled post' });
  }
});

// Delete ALL scheduled posts for user
router.delete('/scheduled-posts', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    const userId = req.user.userId;

    // Get posts first to clean up images
    const allPosts = await dynamodb.getUserScheduledPosts(userId);
    const postsToDelete = category 
      ? allPosts.filter(p => p.business_category === category)
      : allPosts;
    
    // Clean up S3 images
    await cleanupPostImages(postsToDelete);

    await dynamodb.deleteUserScheduledPosts(userId, category || null);

    const message = category
      ? `All ${category} scheduled posts deleted successfully`
      : 'All scheduled posts deleted successfully';

    res.json({ success: true, message });
  } catch (error) {
    console.error('Delete all scheduled posts error:', error);
    res.status(500).json({ error: 'Failed to delete scheduled posts' });
  }
});

// Helper function to clean up S3 images from posts
async function cleanupPostImages(posts) {
  if (!posts || posts.length === 0) return;
  
  const s3Service = require('../services/s3');
  const imagesToDelete = [];
  
  // Extract S3 keys from posts
  posts.forEach(post => {
    const imageUrl = post.content?.image_url || post.image_url;
    if (imageUrl && imageUrl.includes('amazonaws.com')) {
      try {
        // Extract S3 key from URL
        // Expected format: https://bucket-name.s3.region.amazonaws.com/path/to/image.jpg
        const url = new URL(imageUrl);
        const key = url.pathname.substring(1); // Remove leading '/'
        if (key) {
          imagesToDelete.push(key);
        }
      } catch (error) {
        console.warn('Failed to parse S3 URL:', imageUrl, error.message);
      }
    }
  });
  
  // Delete images from S3
  if (imagesToDelete.length > 0) {
    try {
      await s3Service.deleteImages(imagesToDelete);
      console.log(`Cleaned up ${imagesToDelete.length} images from S3`);
    } catch (error) {
      console.error('Failed to cleanup S3 images:', error);
      // Don't throw error - post deletion should succeed even if image cleanup fails
    }
  }
}

// Test endpoint to manually trigger scheduled post processing
router.post('/process-scheduled-posts', authenticateToken, async (req, res) => {
  try {
    const posts = await dynamodb.getPostsToPublish();
    console.log(`Found ${posts.length} posts ready to publish`);
    
    const results = [];
    for (const post of posts) {
      try {
        const connection = await dynamodb.getUserSocialConnection(post.user_id, post.platform);
        if (!connection) {
          console.error(`No ${post.platform} connection found for user ${post.user_id}`);
          results.push({
            post_id: post.post_id,
            success: false,
            error: `No ${post.platform} connection found. Please connect your ${post.platform} page first.`
          });
          continue;
        }

        if (!connection.platform_page_id) {
          console.error(`No page ID found for ${post.platform} connection for user ${post.user_id}`);
          results.push({
            post_id: post.post_id,
            success: false,
            error: `No ${post.platform} page ID configured. Please reconnect your ${post.platform} page.`
          });
          continue;
        }
        
        // Use existing Facebook posting logic
        if (post.platform === 'facebook') {
          let platformPostId;

          try {
            if (post.content.image_url) {
              // Post with image
              console.log(`[Scheduled] Posting with image for post ${post.post_id}`);
              const photoRes = await axios.post(
                `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`,
                {
                  url: post.content.image_url,
                  message: post.content.message,
                  access_token: connection.access_token
                }
              );
              platformPostId = photoRes.data.post_id || photoRes.data.id;
            } else {
              // Text-only post
              console.log(`[Scheduled] Posting text-only for post ${post.post_id}`);
              const feedRes = await axios.post(
                `https://graph.facebook.com/v18.0/${connection.platform_page_id}/feed`,
                {
                  message: post.content.message,
                  access_token: connection.access_token
                }
              );
              platformPostId = feedRes.data.id;
            }

            console.log(`[Scheduled] Successfully posted to Facebook: ${platformPostId}`);
          } catch (fbError) {
            console.error(`[Scheduled] Facebook post error for post ${post.post_id}:`, fbError.response?.data || fbError.message);
            results.push({
              post_id: post.post_id,
              success: false,
              error: fbError.response?.data?.error?.message || 'Failed to post to Facebook'
            });
            continue;
          }

          // CRITICAL: Log the post for billing/metrics (same as manual posts)
          await dynamodb.logSocialPost(post.user_id, 'facebook', {
            platform_post_id: platformPostId,
            message: post.content.message,
            has_image: !!post.content.image_url,
            image_source: post.content.image_source || 'scheduled',
            scheduled: true // Mark as scheduled post
          });
        }
        
        // Mark as posted
        await dynamodb.updateScheduledPostStatus(post.user_id, post.post_id, 'posted');
        results.push({ post_id: post.post_id, status: 'posted' });
        
      } catch (error) {
        console.error(`Failed to post ${post.post_id}:`, error.message);
        await dynamodb.updateScheduledPostStatus(post.user_id, post.post_id, 'failed', error.message);
        results.push({ post_id: post.post_id, status: 'failed', error: error.message });
      }
    }
    
    res.json({ 
      success: true, 
      processed_count: posts.length,
      results 
    });
  } catch (error) {
    console.error('Process scheduled posts error:', error);
    res.status(500).json({ error: 'Failed to process scheduled posts' });
  }
});

// ─── BULK SCHEDULING ROUTES ──────────────────────────────────────────────

const BUSINESS_TEMPLATES = require('../config/business-templates');

// Get available business category templates
router.get('/business-templates', authenticateToken, (req, res) => {
  try {
    // Return template structure without the full prompts (for UI display)
    const templates = {};
    Object.keys(BUSINESS_TEMPLATES).forEach(category => {
      templates[category] = {
        name: BUSINESS_TEMPLATES[category].name,
        templates: BUSINESS_TEMPLATES[category].templates.map(t => ({
          id: t.id,
          name: t.name,
          content_type: t.content_type,
          schedule: t.schedule
        }))
      };
    });
    res.json({ templates });
  } catch (error) {
    console.error('Get business templates error:', error);
    res.status(500).json({ error: 'Failed to get business templates' });
  }
});

// Generate and schedule bulk posts for a business category
router.post('/schedule-bulk', authenticateToken, async (req, res) => {
  try {
    const { 
      business_category, 
      start_date, 
      duration_days = 30, 
      platforms = ['facebook'],
      image_option = 'none',
      include_logo = false 
    } = req.body;
    
    if (!business_category || !start_date) {
      return res.status(400).json({ error: 'business_category and start_date are required' });
    }

    if (!BUSINESS_TEMPLATES[business_category]) {
      return res.status(400).json({ error: `Invalid business category: ${business_category}` });
    }

    // Get user's business info for personalized content
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;
    
    if (!business) {
      return res.status(404).json({ error: 'Business profile not found. Complete your setup first.' });
    }

    // Check quota - bulk scheduling is a premium feature
    const userQuota = await getUserQuota(req.user.userId);
    if (userQuota.plan === 'trial') {
      return res.status(403).json({ error: 'Bulk scheduling is not available on trial. Upgrade to Basic or Pro plan.' });
    }

    console.log(`Generating ${duration_days} days of content for ${business_category} with images: ${image_option}...`);
    
    // Generate scheduled posts
    const scheduledPosts = await generateBulkScheduledPosts(
      req.user.userId, // Keep as string for quota lookup
      business,
      business_category,
      new Date(start_date),
      duration_days,
      platforms,
      image_option,
      include_logo
    );

    // Convert user_id to number for DynamoDB storage (scheduled_posts table schema)
    const scheduledPostsForDB = scheduledPosts.map(post => ({
      ...post,
      user_id: req.user.userId // Use string user_id directly
    }));

    // Clear existing scheduled posts for this category (if any) and cleanup images
    const existingPosts = await dynamodb.getUserScheduledPosts(req.user.userId);
    const postsToReplace = existingPosts.filter(p => p.business_category === business_category);
    await cleanupPostImages(postsToReplace);
    await dynamodb.deleteUserScheduledPosts(req.user.userId, business_category);

    // Bulk insert new posts (with string user_id for DB)
    if (scheduledPostsForDB.length > 0) {
      await dynamodb.bulkInsertScheduledPosts(scheduledPostsForDB);
    }

    // Save schedule configuration (with string user_id for DB)
    const templateConfig = BUSINESS_TEMPLATES[business_category];
    await dynamodb.savePostingSchedule(req.user.userId, business_category, {
      templates_used: templateConfig.templates.map(t => t.id),
      start_date,
      duration_days,
      platforms,
      image_option,
      include_logo,
      generated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      scheduled_posts_count: scheduledPosts.length,
      duration_days,
      start_date,
      business_category,
      image_option,
      message: `Successfully scheduled ${scheduledPosts.length} posts over ${duration_days} days`
    });

  } catch (error) {
    console.error('Bulk scheduling error:', error);
    res.status(500).json({ error: 'Failed to generate bulk schedule' });
  }
});

// Helper function to generate bulk scheduled posts
async function generateBulkScheduledPosts(userId, business, businessCategory, startDate, durationDays, platforms, imageOption = 'none', includeLogo = false) {
  const templates = BUSINESS_TEMPLATES[businessCategory].templates;
  const scheduledPosts = [];
  
  // Generate posts for each day
  for (let dayOffset = 0; dayOffset < durationDays; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    let dayHasPosts = false;
    
    // First, check each template to see if it naturally should post on this day
    for (const template of templates) {
      const shouldPost = shouldPostToday(template.schedule, dayOfWeek, dayOffset);
      
      if (shouldPost) {
        dayHasPosts = true;
        // Generate posts for each platform
        for (const platform of platforms) {
          for (const time of template.schedule.times) {
            // Create scheduled time for this post
            const scheduledTime = new Date(currentDate);
            const [hours, minutes] = time.split(':');
            scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Skip if the scheduled time is in the past
            if (scheduledTime <= new Date()) {
              continue;
            }
            
            try {
              // Generate AI content using existing Bedrock integration
              const content = await generateTemplateContent(template, business, imageOption, includeLogo, userId);
              
              const post = {
                user_id: userId,
                post_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                scheduled_time: scheduledTime.toISOString(),
                platform,
                content: {
                  message: content.message,
                  image_url: content.image_url || null,
                  image_source: imageOption
                },
                business_category: businessCategory,
                template_id: template.id,
                content_type: template.content_type,
                status: 'pending',
                created_at: new Date().toISOString()
              };
              
              scheduledPosts.push(post);
              
            } catch (contentError) {
              console.error(`Failed to generate content for template ${template.id}:`, contentError.message);
              // Continue with other posts even if one fails
            }
          }
        }
      }
    }
    
    // If no templates naturally posted on this day, ensure at least 1 post by cycling through templates
    if (!dayHasPosts) {
      // Pick a template using modulo to cycle through them
      const templateIndex = dayOffset % templates.length;
      const forcedTemplate = templates[templateIndex];
      
      console.log(`No natural posts for day ${dayOffset + 1}, forcing template: ${forcedTemplate.name}`);

      // Generate posts for each platform using the forced template
      for (const platform of platforms) {
        // Use the first time from the template's schedule, or default to 12:00 PM
        const defaultTime = (forcedTemplate.schedule.times && forcedTemplate.schedule.times[0]) || '12:00';
        
        // Create scheduled time for this post
        const scheduledTime = new Date(currentDate);
        const [hours, minutes] = defaultTime.split(':');
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Skip if the scheduled time is in the past
        if (scheduledTime <= new Date()) {
          continue;
        }

        try {
          // Generate AI content using existing Bedrock integration
          const content = await generateTemplateContent(forcedTemplate, business, imageOption, includeLogo, userId);

          const post = {
            user_id: userId,
            post_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            scheduled_time: scheduledTime.toISOString(),
            platform,
            content: {
              message: content.message,
              image_url: content.image_url || null,
              image_source: imageOption
            },
            business_category: businessCategory,
            template_id: forcedTemplate.id,
            content_type: forcedTemplate.content_type,
            status: 'pending',
            created_at: new Date().toISOString()
          };

          scheduledPosts.push(post);
          
        } catch (contentError) {
          console.error(`Failed to generate forced content for template ${forcedTemplate.id}:`, contentError.message);
          // Continue even if forced post fails
        }
      }
    }
  }
  
  return scheduledPosts;
}

// Helper function to determine if a template should post today
function shouldPostToday(schedule, dayOfWeek, dayOffset) {
  if (schedule.frequency === 'daily') {
    return true;
  }
  
  if (schedule.frequency === 'weekly') {
    // Check if today's day of the week matches the schedule
    return schedule.days_of_week && schedule.days_of_week.includes(dayOfWeek);
  }
  
  return false;
}

// Helper function to generate content using AI
async function generateTemplateContent(template, business, imageOption = 'none', includeLogo = false, userId = null) {
  // Check user quota first if userId is provided
  if (userId) {
    const userQuota = await getUserQuota(userId);
    
    // Check content generation quota
    if (userQuota.quotas.content_generate.remaining <= 0) {
      throw new Error(userQuota.plan === 'trial' 
        ? 'Trial content generation limit reached. Upgrade to continue.'
        : `No content credits remaining. Your monthly ${userQuota.quotas.content_generate.limit} resets on the 1st.`
      );
    }

    // Check image generation quota if images are requested
    if (imageOption === 'pexels' && userQuota.quotas.image_generate.remaining <= 0) {
      throw new Error(userQuota.plan === 'trial'
        ? 'Trial image generation limit reached. Upgrade to continue.'
        : `No image credits remaining. Your monthly ${userQuota.quotas.image_generate.limit} resets on the 1st, or buy a top-up pack.`
      );
    }
  }
  // Replace business placeholders in the prompt
  let prompt = template.prompt.replace(/{business_name}/g, business.business_name);
  
  // Add business context
  const contextualPrompt = `${prompt}

Business Context:
- Business Name: ${business.business_name}
- Business Type: ${business.business_type}
- Description: ${business.description || 'Local business'}
- Tone: ${business.tone || 'friendly'}
- Target Audience: ${business.target_audience || 'local customers'}

Create authentic, engaging content that matches the business voice and appeals to their audience.`;

  // Generate the text content
  const message = await bedrock.generateContent(contextualPrompt, 200);
  
  let imageUrl = null;
  
  // Handle image generation if requested
  if (imageOption === 'pexels') {
    try {
      // Create strategy-specific search query like the frontend does
      const baseCategory = business.business_type.toLowerCase();
      
      // Map template types to specific search terms (same as frontend)
      const searchMappings = {
        'daily_special': `${baseCategory} food special dish menu`,
        'behind_the_scenes': `${baseCategory} kitchen staff working behind scenes`,
        'weekend_promotion': `${baseCategory} happy crowd weekend celebration`,
        'customer_reviews': `${baseCategory} happy customers dining smiling`,
        'menu_highlight': `${baseCategory} delicious food plate presentation`,
        'community_event': `${baseCategory} community event gathering people`,
        'seasonal_special': `${baseCategory} seasonal food fresh ingredients`,
        'team_spotlight': `${baseCategory} team staff professional portrait`,
        'ambiance': `${baseCategory} interior atmosphere cozy lighting`,
        'new_arrival': `${baseCategory} new product display fresh`,
        'customer_spotlight': `${baseCategory} satisfied customer testimonial`
      };
      
      // Use strategy-specific search or fallback to generic
      const searchQuery = searchMappings[template.id] || `${baseCategory} ${template.content_type} professional`;
      console.log(`Searching Pexels for: ${searchQuery}`);

      const axios = require('axios');

      // Search Pexels with more results for variety
      const pexelsResponse = await axios.get('https://api.pexels.com/v1/search', {
        headers: {
          'Authorization': process.env.PEXELS_API_KEY
        },
        params: {
          query: searchQuery,
          per_page: 20, // Get more photos to choose from
          orientation: 'landscape'
        }
      });

      if (pexelsResponse.data.photos && pexelsResponse.data.photos.length > 0) {
        // Randomly select a photo instead of always using the first one
        const randomIndex = Math.floor(Math.random() * pexelsResponse.data.photos.length);
        const photo = pexelsResponse.data.photos[randomIndex];
        
        // Download and store in S3 (with optional logo stamping)
        const s3Service = require('../services/s3');
        const storedImage = await s3Service.storePexelsPhoto(photo.src.large, {
          photoId: photo.id,
          photographer: photo.photographer,
          includeLogo: includeLogo,
          userId: business.user_id
        });
        
        imageUrl = storedImage.url;
        console.log(`Generated image for post: ${imageUrl}`);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      // Continue without image if there's an error
    }
  }
  
  // Log usage and consume credits if userId is provided
  if (userId) {
    // Log content generation
    const userQuota = await getUserQuota(userId);
    const contentLogType = userQuota.plan === 'trial' ? 'content_generate_trial' : 'content_generate';
    await dynamodb.incrementUsageLog(userId, contentLogType, { 
      template_id: template.id,
      business_category: business.business_type,
      scheduled: true
    });

    // Log image generation if image was created
    if (imageOption === 'pexels' && imageUrl) {
      const imageLogType = userQuota.plan === 'trial' ? 'image_generate_trial' : 'image_generate';
      await dynamodb.incrementUsageLog(userId, imageLogType, { 
        template_id: template.id,
        source: 'pexels',
        scheduled: true
      });

      // Deduct extra credits if monthly quota exhausted (paid users only)
      if (userQuota.plan !== 'trial' && userQuota.quotas.image_generate.remaining === userQuota.quotas.image_generate.extra_credits && userQuota.quotas.image_generate.extra_credits > 0) {
        const user = await dynamodb.getUserById(userId);
        await dynamodb.updateUserCredits(userId, (user.extra_image_credits || 0) - 1);
      }
    }
  }
  
  return {
    message,
    image_url: imageUrl
  };
}

module.exports = router;
