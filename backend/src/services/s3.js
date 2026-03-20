const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

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

module.exports = { uploadBuffer, downloadBuffer, deleteKey, urlToKey, cdnUrl, APP_FOLDER };
