const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class BedrockService {
  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.BEDROCK_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async generateContent(prompt, maxTokens = 1000) {
    try {
      const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
      
      const command = new InvokeModelCommand({
        modelId: modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.7
        })
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return responseBody.content[0].text;

    } catch (error) {
      console.error('Bedrock API error:', error);
      throw new Error('Failed to generate content with AI');
    }
  }

  // Generate location-specific social media posts
  async generateSocialPosts(businessData, count = 10) {
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' });
    const season = this.getCurrentSeason();
    const locationContext = this.getLocationContext(businessData.address);

    const prompt = `Generate ${count} engaging social media posts for a ${businessData.business_type}${businessData.address ? ` in ${businessData.address}` : ''}.

Business Details:
- Name: ${businessData.business_name}
- Type: ${businessData.business_type}
- Description: ${businessData.description}
- Target Audience: ${businessData.target_audience}
- Tone: ${businessData.tone}
- Location: ${businessData.address || 'Local business'}

Local Context:
- Current season: ${season}
- Local events and seasonal activities: ${locationContext}
- Community engagement opportunities
- Seasonal business considerations

Requirements:
- Mix of promotional and community engagement posts
- Include location-specific references when relevant and natural
- Vary post types: tips, behind-the-scenes, customer spotlights, local events
- Keep posts concise (under 280 characters when possible)
- Include relevant hashtags (location-based if applicable)
- ${businessData.tone} tone throughout

Format each post as:
POST [number]:
[content]
#hashtags

---`;

    return await this.generateContent(prompt, 2000);
  }

  // Generate Google My Business posts
  async generateGMBPosts(businessData, count = 8) {
    const currentDate = new Date();
    const season = this.getCurrentSeason();
    const locationContext = this.getLocationContext(businessData.address);

    const prompt = `Generate ${count} Google My Business posts for a ${businessData.business_type}${businessData.address ? ` in ${businessData.address}` : ''}.

Business Details:
- Name: ${businessData.business_name}
- Type: ${businessData.business_type}
- Description: ${businessData.description}
- Location: ${businessData.address || 'Local business'}

Local Context:
- Current season: ${season}
- Local events and activities: ${locationContext}
- Community engagement opportunities

Requirements:
- Focus on local SEO optimization
- Include location-specific keywords naturally when relevant
- Mix of: offers, updates, events, tips
- Each post should be 100-300 words
- Professional but ${businessData.tone} tone
- Include call-to-action

Format each post as:
GMB POST [number]:
Title: [title]
Content: [content]

---`;

    return await this.generateContent(prompt, 2000);
  }

  // Generate email newsletter templates
  async generateEmailTemplates(businessData, count = 4) {
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' });

    const prompt = `Generate ${count} email newsletter templates for a ${businessData.business_type} in Austin, Texas.

Business Details:
- Name: ${businessData.business_name}
- Type: ${businessData.business_type}
- Description: ${businessData.description}
- Target Audience: ${businessData.target_audience}

Templates needed:
1. Monthly newsletter
2. Seasonal promotion
3. Customer appreciation
4. Local community involvement

Requirements:
- Subject line and body for each
- Austin community focus
- ${businessData.tone} tone
- Include personalization placeholders like [Customer Name]
- Keep emails concise but engaging
- Include clear call-to-action

Format each template as:
EMAIL [number]: [type]
Subject: [subject line]
Body:
[email content]

---`;

    return await this.generateContent(prompt, 2500);
  }

  // Generate a Facebook post caption based on an image description and business context
  async generateCaptionFromImageDescription(imageDescription, businessData) {
    const prompt = `You are a social media expert for a local business.

Business: ${businessData.business_name} (${businessData.business_type})
Tone: ${businessData.tone || 'friendly'}
Target audience: ${businessData.target_audience || 'local community'}
Location: ${businessData.address || 'Local area'}

The business owner has a photo they want to post. Here is their description of the image:
"${imageDescription}"

Write a compelling Facebook post caption for this photo. Requirements:
- Match the business tone (${businessData.tone || 'friendly'})
- Keep it under 200 characters if possible
- Include 2-3 relevant hashtags including location-based ones if appropriate
- Sound natural and authentic, not like marketing copy
- Encourage engagement (ask a question or include a call to action)

Return ONLY the caption text with hashtags. No explanations, no quotes.`;

    return await this.generateContent(prompt, 400);
  }

  // Generate an image using Amazon Nova Canvas
  async generateImage(prompt) {
    try {
      console.log('🎨 Generating image with prompt:', prompt.substring(0, 100) + '...');
      
      const command = new InvokeModelCommand({
        modelId: 'amazon.nova-canvas-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          taskType: 'TEXT_IMAGE',
          textToImageParams: { text: prompt },
          imageGenerationConfig: {
            numberOfImages: 1,
            quality: 'standard',
            height: 1024,
            width: 1024,
            cfgScale: 6.5,
            seed: Math.floor(Math.random() * 2147483647),
          },
        }),
      });

      console.log('📤 Sending Nova Canvas request...');
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log('📦 Nova Canvas response structure:', JSON.stringify(responseBody, null, 2));

      // Handle different possible response structures
      if (responseBody.error) {
        throw new Error(`Nova Canvas API error: ${responseBody.error.message || JSON.stringify(responseBody.error)}`);
      }

      // Check for images array (expected structure)
      if (responseBody.images && responseBody.images.length > 0) {
        console.log('✅ Found images array, returning first image');
        return responseBody.images[0]; // base64 string
      }

      // Check for single image property
      if (responseBody.image) {
        console.log('✅ Found single image property, returning image');
        return responseBody.image; // base64 string
      }

      // Check for data array
      if (responseBody.data && responseBody.data.length > 0) {
        console.log('✅ Found data array, returning first item');
        return responseBody.data[0]; // base64 string
      }

      // Check for result.images structure
      if (responseBody.result && responseBody.result.images && responseBody.result.images.length > 0) {
        console.log('✅ Found result.images array, returning first image');
        return responseBody.result.images[0]; // base64 string
      }

      // If we get here, the response structure is unexpected
      console.error('❌ Unexpected Nova Canvas response structure:', responseBody);
      throw new Error('No image data found in Nova Canvas response. Response structure: ' + JSON.stringify(Object.keys(responseBody)));

    } catch (error) {
      console.error('❌ Bedrock image generation error:', error);
      
      // Handle different error types
      if (error.name === 'ValidationException') {
        throw new Error('Invalid request to Nova Canvas. Please check the model availability and request format.');
      }
      
      if (error.name === 'AccessDeniedException') {
        throw new Error('Access denied to Nova Canvas. Please check your AWS permissions and model access.');
      }
      
      if (error.name === 'ResourceNotFoundException') {
        throw new Error('Nova Canvas model not found. Please verify model ID and availability in your region.');
      }
      
      if (error.name === 'ThrottlingException') {
        throw new Error('Nova Canvas request was throttled. Please try again in a few moments.');
      }

      const msg = error?.message || error?.name || 'Unknown error';
      throw new Error(`Failed to generate image: ${msg}`);
    }
  }

  // Helper methods
  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  getLocationContext(address) {
    if (!address) {
      return 'seasonal activities, local community events, regional celebrations';
    }
    
    // Extract city/location from address for basic context
    const addressLower = address.toLowerCase();
    
    if (addressLower.includes('austin')) {
      return 'SXSW Festival, ACL Festival, Keep Austin Weird culture, live music scene, food truck culture, outdoor activities';
    } else if (addressLower.includes('new york') || addressLower.includes('nyc')) {
      return 'seasonal festivals, Broadway shows, street fairs, cultural events, neighborhood activities';
    } else if (addressLower.includes('los angeles') || addressLower.includes('la')) {
      return 'outdoor events, beach activities, farmers markets, cultural festivals, entertainment industry events';
    } else {
      // Generic local context for any location
      return 'local festivals, seasonal celebrations, community events, farmers markets, outdoor activities';
    }
  }

  // Keep Austin-specific method for backward compatibility but make it more generic
  getAustinEvents(date) {
    const month = date.getMonth() + 1;
    const events = {
      1: 'New Year resolutions, winter activities',
      2: 'Valentine\'s Day, Rodeo season',
      3: 'SXSW Festival, spring break, St. Patrick\'s Day',
      4: 'Easter, spring weather, Eeyore\'s Birthday Party',
      5: 'Cinco de Mayo, graduation season, warmer weather',
      6: 'Summer kickoff, Father\'s Day, outdoor activities',
      7: 'Summer events, Independence Day, heat wave',
      8: 'Back to school, summer heat, outdoor concerts',
      9: 'Fall weather, football season, ACL Festival prep',
      10: 'ACL Festival, Halloween, fall activities',
      11: 'Thanksgiving, holiday shopping, cooler weather',
      12: 'Holiday season, New Year prep, winter activities'
    };
    
    return events[month] || 'local seasonal activities';
  }
}

module.exports = new BedrockService();