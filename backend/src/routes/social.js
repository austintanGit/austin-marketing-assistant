const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');
const dynamodb = require('../services/dynamodb');
const { authenticateToken } = require('./auth');
const bedrock = require('../services/bedrock');
const s3 = require('../services/s3');

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

    return parseInt(userId);
  } catch {
    return null;
  }
}

const POST_ENHANCE_DAILY_LIMIT = 10;

// ─── POST /api/social/facebook/enhance-post ───────────────────────────────────
// AI-enhances a draft Facebook post message using business context

router.post('/facebook/enhance-post', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    // Check daily limit
    const used = await dynamodb.getDailyUsageCount(req.user.userId, "post_enhance");
    if (used >= POST_ENHANCE_DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily AI assist limit reached (${POST_ENHANCE_DAILY_LIMIT}/day). Resets at midnight.`,
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

    // Log usage
    await dynamodb.incrementUsageLog(req.user.userId, 'post_enhance');

    const remaining = POST_ENHANCE_DAILY_LIMIT - used - 1;
    res.json({ enhanced: enhanced.trim(), remaining, limit: POST_ENHANCE_DAILY_LIMIT });
  } catch (err) {
    console.error('Enhance post error:', err);
    res.status(500).json({ error: err.message || 'Failed to enhance post' });
  }
});

// ─── GET /api/social/connections ─────────────────────────────────────────────

router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const rows = await dynamodb.getUserSocialConnections(req.user.userId);

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

    res.json({ connections });
  } catch (err) {
    console.error('Get connections error:', err);
    res.json({ connections: {} }); // Return empty object instead of error
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
    const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { access_token: longLivedToken },
    });
    const pages = pagesRes.data.data || [];
    console.log(`📄 Found ${pages.length} pages`);

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
        const igRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
          params: {
            fields: 'instagram_business_account',
            access_token: pageToken,
          },
        });
        instagramAccountId = igRes.data.instagram_business_account?.id || null;
        console.log(`📷 Instagram account: ${instagramAccountId ? 'Found' : 'None'}`);
      } catch (igErr) {
        console.warn('Could not fetch Instagram account:', igErr.message);
      }
    }

    // Store Facebook connection
    console.log('💾 Saving Facebook connection to DynamoDB...');
    await dynamodb.createOrUpdateSocialConnection(userId, 'facebook', {
      access_token: pageToken || longLivedToken,
      platform_page_id: pageId,
      platform_page_name: pageName || 'Facebook Page',
      extra_data: JSON.stringify({ pages, instagramAccountId })
    });
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
    // Check daily limit
    const used = await dynamodb.getDailyUsageCount(req.user.userId, "caption_generate"); if (used >= CAPTION_DAILY_LIMIT) {
      return res.status(429).json({
        error: `Daily caption limit reached (${CAPTION_DAILY_LIMIT}/day). Resets at midnight.`,
      });
    }

    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

    const caption = await bedrock.generateCaptionFromImageDescription(image_description, business);

    // Log usage
    await dynamodb.incrementUsageLog(req.user.userId, 'caption_generate');

    const remaining = CAPTION_DAILY_LIMIT - used - 1;
    res.json({ caption, remaining, limit: CAPTION_DAILY_LIMIT });
  } catch (err) {
    console.error('Generate caption error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate caption' });
  }
});

const MONTHLY_IMAGE_LIMIT = 50;
const IMAGE_CREDIT_PACK_CREDITS = 25;
const IMAGE_CREDIT_PACK_PRICE_CENTS = 299; // $2.99

// Helper: get full image quota for a user
async function getImageQuota(userId) {
  const [monthlyUsed, user] = await Promise.all([
    dynamodb.getMonthlyUsageCount(userId, 'image_generate'),
    dynamodb.getUserById(userId)
  ]);
  const usedThisMonth = monthlyUsed || 0;
  const extraCredits = user?.extra_image_credits || 0;
  const monthlyRemaining = Math.max(0, MONTHLY_IMAGE_LIMIT - usedThisMonth);
  const totalRemaining = monthlyRemaining + extraCredits;
  return {
    used_this_month: usedThisMonth,
    monthly_limit: MONTHLY_IMAGE_LIMIT,
    monthly_remaining: monthlyRemaining,
    extra_credits: extraCredits,
    total_remaining: totalRemaining,
    can_generate: totalRemaining > 0,
  };
}

// ─── GET /api/social/facebook/image-quota ────────────────────────────────────

router.get('/facebook/image-quota', authenticateToken, async (req, res) => {
  try {
    const quota = await getImageQuota(req.user.userId);
    res.json(quota);
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
    const quota = await getImageQuota(req.user.userId);
    if (!quota.can_generate) {
      return res.status(429).json({
        error: `No image credits remaining. Your monthly ${MONTHLY_IMAGE_LIMIT} resets on the 1st, or buy a top-up pack.`,
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

    // Log generation
    await dynamodb.incrementUsageLog(req.user.userId, 'image_generate', { prompt });

    // If monthly base was exhausted, deduct from extra credits
    if (quota.monthly_remaining === 0 && quota.extra_credits > 0) {
      const user = await dynamodb.getUserById(req.user.userId);
      await dynamodb.updateUserCredits(req.user.userId, (user.extra_image_credits || 0) - 1);
    }

    const updatedQuota = await getImageQuota(req.user.userId);
    res.json({ image_url: imageUrl, quota: updatedQuota });
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
    const connection = await dynamodb.getUserSocialConnection(req.user.userId, 'facebook');
    if (!connection) {
      return res.status(400).json({ error: 'Facebook account not connected' });
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
    await dynamodb.logSocialPost(req.user.userId, 'facebook', {
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
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) return res.status(404).json({ error: 'Business not found' });
    
    const business = businesses[0];

    const contentItem = null; // TODO: Get content from DynamoDB
    if (!contentItem) return res.status(404).json({ error: 'Content not found' });

    const results = {};
    const errors = {};

    await Promise.allSettled(
      platforms.map(async (platform) => {
        try {
          const connection = await dynamodb.getUserSocialConnection(req.user.userId, platform);

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
    await dynamodb.deleteSocialConnection(req.user.userId, req.params.platform);
    res.json({ message: `${req.params.platform} disconnected successfully` });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect account' });
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

module.exports = router;
