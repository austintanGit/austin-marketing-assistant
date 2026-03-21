const axios = require('axios');
const sharp = require('sharp');
const { uploadBuffer } = require('./s3');

class PexelsService {
  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY;
    this.baseUrl = 'https://api.pexels.com/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': this.apiKey
      }
    });
  }

  async searchPhotos(query, per_page = 20, page = 1, orientation = 'all') {
    try {
      const response = await this.client.get('/search', {
        params: {
          query,
          per_page,
          page,
          orientation
        }
      });
      
      return {
        photos: response.data.photos,
        total_results: response.data.total_results,
        per_page: response.data.per_page,
        page: response.data.page
      };
    } catch (error) {
      console.error('Pexels API error:', error.response?.data);
      throw new Error(`Pexels API error: ${error.response?.data?.error || error.message}`);
    }
  }

  async getPhoto(photoId) {
    try {
      const response = await this.client.get(`/photos/${photoId}`);
      return response.data;
    } catch (error) {
      console.error('Pexels photo fetch error:', error.response?.data);
      throw new Error(`Failed to fetch photo: ${error.message}`);
    }
  }

  async downloadAndUploadToS3(pexelsUrl, businessId, photoId) {
    try {
      // Download image from Pexels
      const imageResponse = await axios.get(pexelsUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 second timeout
      });
      
      const imageBuffer = Buffer.from(imageResponse.data);
      
      // Process image with Sharp (optimize for social media)
      const processedBuffer = await sharp(imageBuffer)
        .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();
      
      // Upload to S3
      const fileName = `pexels_${photoId}_${Date.now()}.jpg`;
      const key = `${businessId}/images/${fileName}`;
      
      const cdnUrl = await uploadBuffer(processedBuffer, key, 'image/jpeg');
      
      return {
        cdnUrl: cdnUrl,
        s3Key: `lume/${key}`, // Full S3 key for reference
        fileName: fileName
      };
    } catch (error) {
      console.error('Download and upload error:', error);
      throw new Error(`Failed to download and upload image: ${error.message}`);
    }
  }

  // Enhanced search using business context
  async searchWithBusinessContext(businessData, userPrompt) {
    try {
      // Combine business type/description with user prompt for better results
      const businessType = businessData.businessType || '';
      const businessDescription = businessData.description || '';
      
      let enhancedQuery = userPrompt.trim();
      
      // Add business context if not already included
      if (businessType && !userPrompt.toLowerCase().includes(businessType.toLowerCase())) {
        enhancedQuery += ` ${businessType}`;
      }
      
      // Extract relevant keywords from business description
      if (businessDescription) {
        const businessKeywords = businessDescription
          .split(/[,.\s]+/)
          .filter(word => word.length > 3)
          .slice(0, 2) // Take first 2 relevant keywords
          .join(' ');
        
        if (businessKeywords && !enhancedQuery.toLowerCase().includes(businessKeywords.toLowerCase())) {
          enhancedQuery += ` ${businessKeywords}`;
        }
      }
      
      console.log(`Enhanced Pexels search: "${userPrompt}" -> "${enhancedQuery}"`);
      
      return await this.searchPhotos(enhancedQuery, 20, 1);
    } catch (error) {
      console.error('Business context search error:', error);
      // Fallback to regular search
      return await this.searchPhotos(userPrompt, 20, 1);
    }
  }

  // AI-powered photo selection (integrate with existing Bedrock service)
  async selectBestPhotos(photos, prompt, count = 9) {
    try {
      // Simple algorithm to select diverse, high-quality photos
      // Sort by a combination of factors: width, height, and photographer diversity
      const scoredPhotos = photos.map(photo => {
        const aspectRatio = photo.width / photo.height;
        const isSquare = Math.abs(aspectRatio - 1) < 0.1;
        const isLandscape = aspectRatio > 1.2;
        const resolution = photo.width * photo.height;
        
        // Score based on social media friendliness
        let score = 0;
        if (isSquare) score += 3; // Square images work well on social
        if (isLandscape) score += 2; // Landscape also good
        if (resolution > 1000000) score += 2; // High resolution
        if (photo.alt && photo.alt.toLowerCase().includes(prompt.toLowerCase().split(' ')[0])) score += 2;
        
        return { ...photo, score };
      });
      
      // Sort by score and select diverse photographers
      const sortedPhotos = scoredPhotos.sort((a, b) => b.score - a.score);
      const selectedPhotos = [];
      const usedPhotographers = new Set();
      
      for (const photo of sortedPhotos) {
        if (selectedPhotos.length >= count) break;
        
        // Prefer diversity in photographers
        if (!usedPhotographers.has(photo.photographer) || selectedPhotos.length < count / 2) {
          selectedPhotos.push(photo);
          usedPhotographers.add(photo.photographer);
        }
      }
      
      return selectedPhotos.slice(0, count);
    } catch (error) {
      console.error('Photo selection error:', error);
      return photos.slice(0, count);
    }
  }
}

module.exports = new PexelsService();