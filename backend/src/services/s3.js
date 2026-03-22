const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const sharp = require('sharp');

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;
const CDN_BASE = (process.env.CLOUDFRONT_URL || 'https://media.planview.com').replace(/\/$/, '');
const APP_FOLDER = 'lume';

/**
 * Upload a buffer to S3 and return the public CDN URL.
 * key should be relative to the app folder, e.g. "logos/1/logo.png"
 */
async function uploadBuffer(buffer, key, contentType = 'image/png') {
  const fullKey = `${APP_FOLDER}/${key}`;
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: fullKey,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  }));
  return `${CDN_BASE}/${fullKey}`;
}

/**
 * Download a file from S3 by its full key (including app folder prefix).
 * Returns a Buffer.
 */
async function downloadBuffer(fullKey) {
  const response = await client.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: fullKey,
  }));
  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Delete an object from S3 by its full key.
 */
async function deleteKey(fullKey) {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fullKey }));
}

/**
 * Derive the S3 key from a CDN URL.
 * e.g. "https://media.planview.com/lume/logos/1/logo.png" → "lume/logos/1/logo.png"
 */
function urlToKey(cdnUrl) {
  return cdnUrl.replace(`${CDN_BASE}/`, '');
}

/**
 * Build a CDN URL from a full S3 key.
 */
function cdnUrl(fullKey) {
  return `${CDN_BASE}/${fullKey}`;
}

/**
 * Download and process a Pexels photo, optionally adding logo stamp
 */
async function storePexelsPhoto(imageUrl, options = {}) {
  const { photoId, photographer, includeLogo = false, userId } = options;
  
  try {
    // Download the image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    let imageBuffer = Buffer.from(response.data);
    
    // Process with Sharp for optimization and optional logo stamping
    let sharp_image = sharp(imageBuffer);
    
    // Resize to optimal social media dimensions (1200x630 for Facebook)
    sharp_image = sharp_image.resize(1200, 630, { 
      fit: 'cover',
      position: 'center'
    });
    
    // Add logo stamp if requested
    if (includeLogo && userId) {
      try {
        // Try to load user's logo
        const logoKey = `${APP_FOLDER}/logos/${userId}/logo.png`;
        const logoBuffer = await downloadBuffer(logoKey);
        
        // Create a watermark in the bottom right corner
        const logoOverlay = await sharp(logoBuffer)
          .resize(120, 120, { fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer();
          
        sharp_image = sharp_image.composite([{
          input: logoOverlay,
          gravity: 'southeast',
          blend: 'over'
        }]);
      } catch (error) {
        console.log('Could not add logo watermark:', error.message);
        // Continue without logo if there's an error
      }
    }
    
    // Convert to JPEG for better compression
    const processedBuffer = await sharp_image
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Generate unique key
    const key = `pexels/${userId || 'shared'}/${Date.now()}-${photoId}.jpg`;
    
    // Upload to S3
    const cdnUrl = await uploadBuffer(processedBuffer, key, 'image/jpeg');
    
    return {
      url: cdnUrl,
      photoId,
      photographer,
      processedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Failed to store Pexels photo:', error);
    throw error;
  }
}

/**
 * Delete multiple images from S3
 * @param {string[]} keys - Array of S3 keys to delete
 */
async function deleteImages(keys) {
  if (!keys || keys.length === 0) return;
  
  console.log(`Deleting ${keys.length} images from S3:`, keys);
  
  const deletePromises = keys.map(key => {
    return deleteKey(key).catch(error => {
      console.warn(`Failed to delete S3 key ${key}:`, error.message);
      // Don't throw - continue with other deletions
    });
  });
  
  await Promise.all(deletePromises);
}

module.exports = { uploadBuffer, downloadBuffer, deleteKey, urlToKey, cdnUrl, APP_FOLDER, storePexelsPhoto, deleteImages };
