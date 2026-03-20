const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

class BedrockService {
  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
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

  // Generate Austin-specific social media posts
  async generateSocialPosts(businessData, count = 10) {
    const currentDate = new Date();
    const month = currentDate.toLocaleString('default', { month: 'long' });
    const season = this.getCurrentSeason();
    const austinEvents = this.getAustinEvents(currentDate);

    const prompt = `Generate ${count} engaging social media posts for a ${businessData.business_type} in Austin, Texas.

Business Details:
- Name: ${businessData.business_name}
- Type: ${businessData.business_type}
- Description: ${businessData.description}
- Target Audience: ${businessData.target_audience}
- Tone: ${businessData.tone}
- Location: ${businessData.address}

Austin Context:
- Current season: ${season}
- Upcoming events: ${austinEvents}
- Local culture: Keep Austin Weird, live music, food trucks, outdoor activities
- Local landmarks: Capitol, Lady Bird Lake, Zilker Park, South by Southwest, ACL

Requirements:
- Mix of promotional and community engagement posts
- Include Austin-specific references where natural
- Vary post types: tips, behind-the-scenes, customer spotlights, local events
- Keep posts concise (under 280 characters when possible)
- Include relevant hashtags (#Austin, #KeepAustinLocal, etc.)
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
    const austinEvents = this.getAustinEvents(currentDate);

    const prompt = `Generate ${count} Google My Business posts for a ${businessData.business_type} in Austin, Texas.

Business Details:
- Name: ${businessData.business_name}
- Type: ${businessData.business_type}
- Description: ${businessData.description}
- Location: ${businessData.address}

Austin Context:
- Current season: ${season}
- Local events: ${austinEvents}
- Local keywords: Austin, Texas, local, downtown, east austin, south austin

Requirements:
- Focus on local SEO optimization
- Include location-specific keywords naturally
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
    const prompt = `You are a social media expert for a local Austin business.

Business: ${businessData.business_name} (${businessData.business_type})
Tone: ${businessData.tone || 'friendly'}
Target audience: ${businessData.target_audience || 'local Austin community'}

The business owner has a photo they want to post. Here is their description of the image:
"${imageDescription}"

Write a compelling Facebook post caption for this photo. Requirements:
- Match the business tone (${businessData.tone || 'friendly'})
- Keep it under 200 characters if possible
- Include 2-3 relevant hashtags including #Austin
- Sound natural and authentic, not like marketing copy
- Encourage engagement (ask a question or include a call to action)

Return ONLY the caption text with hashtags. No explanations, no quotes.`;

    return await this.generateContent(prompt, 400);
  }

  // Generate an image using Amazon Nova Canvas
  async generateImage(prompt) {
    try {
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

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.images[0]; // base64 string
    } catch (error) {
      console.error('Bedrock image generation error:', error);
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