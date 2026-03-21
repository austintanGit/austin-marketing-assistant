const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const { authenticateToken } = require('./auth');
const dynamodb = require('../services/dynamodb');
const s3 = require('../services/s3');

const router = express.Router();

// Logo requirements:
//   - Any image format (PNG recommended for transparency)
//   - Max 10 MB upload
//   - Will be resized to max 240×240 px and converted to PNG before storage
//   - Transparent background is preserved and ideal for overlay on AI images

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Validation schema for business profile
const businessSchema = Joi.object({
  business_name: Joi.string().required(),
  business_type: Joi.string().valid(
    'restaurant', 'cafe', 'retail', 'salon', 'auto_repair', 
    'food_truck', 'boutique', 'service', 'health', 'other'
  ).required(),
  address: Joi.string().required(),
  phone: Joi.string().optional(),
  website: Joi.string().uri().optional().allow(''),
  description: Joi.string().max(500).required(),
  target_audience: Joi.string().max(300).required(),
  tone: Joi.string().valid('friendly', 'professional', 'casual', 'quirky').default('friendly')
});

// Create or update business profile
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const { error, value } = businessSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const businessData = { ...value, user_id: req.user.userId };

    // Check if business profile already exists
    const existingBusinesses = await dynamodb.getUserBusinesses(req.user.userId);
    
    let result;
    if (existingBusinesses && existingBusinesses.length > 0) {
      // Update existing business (for now, assume one business per user)
      const existingBusiness = existingBusinesses[0];
      const updatedBusiness = await dynamodb.update(
        `USER#${req.user.userId}`,
        `BUSINESS#${existingBusiness.id}`,
        'SET business_name = :name, business_type = :type, address = :addr, phone = :phone, website = :website, description = :desc, target_audience = :audience, tone = :tone, updated_at = :updated',
        {
          ':name': value.business_name,
          ':type': value.business_type,
          ':addr': value.address,
          ':phone': value.phone || null,
          ':website': value.website || null,
          ':desc': value.description,
          ':audience': value.target_audience,
          ':tone': value.tone || 'friendly',
          ':updated': new Date().toISOString()
        }
      );
      
      result = { id: existingBusiness.id };
    } else {
      // Create new business
      const newBusiness = await dynamodb.createBusiness(req.user.userId, value);
      result = { id: newBusiness.id };
    }

    res.json({
      message: existingBusinesses && existingBusinesses.length > 0 ? 'Business profile updated' : 'Business profile created',
      business_id: result.id
    });

  } catch (error) {
    console.error('Business profile error:', error);
    res.status(500).json({ error: 'Failed to save business profile' });
  }
});

// Get business profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

    // Return the first business (assuming one business per user for now)
    const business = businesses[0];
    res.json({ business });

  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({ error: 'Failed to get business profile' });
  }
});

// Upload brand logo → processed with sharp (max 240×240, PNG) → stored on S3
router.post('/logo', authenticateToken, logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No logo file provided' });

    // Get user's business profiles to find the first one (assuming single business per user for now)
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' });
    }
    
    const business = businesses[0]; // Use first business

    // Normalise to PNG, resize to max 240×240, preserve transparency
    const processedBuffer = await sharp(req.file.buffer)
      .resize({ width: 240, height: 240, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 8 })
      .toBuffer();

    // Delete old logo from S3 if it exists
    if (business.logo_path && business.logo_path.startsWith('lume/')) {
      try { await s3.deleteKey(business.logo_path); } catch {}
    }

    const s3Key = `lume/logos/${req.user.userId}/logo_${Date.now()}.png`;
    const cdnUrl = await s3.uploadBuffer(processedBuffer, `logos/${req.user.userId}/logo_${Date.now()}.png`);

    // Store the S3 key (without CDN base) so we can delete/re-fetch it later
    const storedKey = s3.urlToKey(cdnUrl);
    await dynamodb.updateBusinessLogo(req.user.userId, business.id, storedKey);

    res.json({ message: 'Logo uploaded successfully', logo_url: cdnUrl });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Returns the CDN URL of the logo (or 404 if none)
router.get('/logo', authenticateToken, async (req, res) => {
  try {
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' });
    }
    
    const business = businesses[0]; // Use first business
    if (!business.logo_path) {
      return res.status(404).json({ error: 'No logo uploaded' });
    }
    const logoUrl = s3.cdnUrl(business.logo_path);
    res.json({ logo_url: logoUrl });
  } catch (err) {
    console.error('Get logo error:', err);
    res.status(500).json({ error: 'Failed to get logo' });
  }
});

// Delete brand logo from S3 and clear DB
router.delete('/logo', authenticateToken, async (req, res) => {
  try {
    const businesses = await dynamodb.getUserBusinesses(req.user.userId);
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ error: 'Business profile not found' });
    }
    
    const business = businesses[0]; // Use first business
    if (business.logo_path) {
      try { await s3.deleteKey(business.logo_path); } catch {}
    }
    await dynamodb.updateBusinessLogo(req.user.userId, business.id, null);
    res.json({ message: 'Logo removed' });
  } catch (err) {
    console.error('Delete logo error:', err);
    res.status(500).json({ error: 'Failed to remove logo' });
  }
});

// Get business types with Austin-specific suggestions
router.get('/types', (req, res) => {
  const businessTypes = [
    { value: 'restaurant', label: 'Restaurant', austin_note: 'BBQ, Tex-Mex, Food Trucks welcome!' },
    { value: 'cafe', label: 'Cafe/Coffee Shop', austin_note: 'Keep Austin Caffeinated' },
    { value: 'retail', label: 'Retail Store', austin_note: 'Keep Austin Shopping Local' },
    { value: 'salon', label: 'Hair Salon/Barbershop', austin_note: 'Keep Austin Beautiful' },
    { value: 'auto_repair', label: 'Auto Repair', austin_note: 'Keep Austin Rolling' },
    { value: 'food_truck', label: 'Food Truck', austin_note: 'Austin has 500+ food trucks!' },
    { value: 'boutique', label: 'Boutique', austin_note: 'East Austin vintage vibes' },
    { value: 'service', label: 'Service Business', austin_note: 'Plumbing, cleaning, etc.' },
    { value: 'health', label: 'Health/Wellness', austin_note: 'Yoga, massage, fitness' },
    { value: 'other', label: 'Other', austin_note: 'We support all Austin businesses!' }
  ];

  res.json({ business_types: businessTypes });
});

module.exports = router;