const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const { authenticateToken } = require('./auth');
const db = require('../database');
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
    const existingBusiness = await db.get(
      'SELECT id FROM businesses WHERE user_id = ?',
      [req.user.userId]
    );

    let result;
    if (existingBusiness) {
      // Update existing profile
      const updateFields = Object.keys(businessData)
        .filter(key => key !== 'user_id')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const updateValues = Object.keys(businessData)
        .filter(key => key !== 'user_id')
        .map(key => businessData[key]);
      
      updateValues.push(req.user.userId);

      await db.run(
        `UPDATE businesses SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        updateValues
      );
      
      result = { id: existingBusiness.id };
    } else {
      // Create new profile
      const fields = Object.keys(businessData).join(', ');
      const placeholders = Object.keys(businessData).map(() => '?').join(', ');
      const values = Object.values(businessData);

      result = await db.run(
        `INSERT INTO businesses (${fields}) VALUES (${placeholders})`,
        values
      );
    }

    res.json({
      message: existingBusiness ? 'Business profile updated' : 'Business profile created',
      business_id: result.id || existingBusiness.id
    });

  } catch (error) {
    console.error('Business profile error:', error);
    res.status(500).json({ error: 'Failed to save business profile' });
  }
});

// Get business profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const business = await db.get(
      'SELECT * FROM businesses WHERE user_id = ?',
      [req.user.userId]
    );

    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }

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

    const business = await db.get('SELECT id, logo_path FROM businesses WHERE user_id = ?', [req.user.userId]);
    if (!business) return res.status(404).json({ error: 'Business profile not found' });

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
    await db.run(
      'UPDATE businesses SET logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [storedKey, req.user.userId]
    );

    res.json({ message: 'Logo uploaded successfully', logo_url: cdnUrl });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Returns the CDN URL of the logo (or 404 if none)
router.get('/logo', authenticateToken, async (req, res) => {
  try {
    const business = await db.get('SELECT logo_path FROM businesses WHERE user_id = ?', [req.user.userId]);
    if (!business?.logo_path) {
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
    const business = await db.get('SELECT logo_path FROM businesses WHERE user_id = ?', [req.user.userId]);
    if (business?.logo_path) {
      try { await s3.deleteKey(business.logo_path); } catch {}
    }
    await db.run('UPDATE businesses SET logo_path = NULL WHERE user_id = ?', [req.user.userId]);
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