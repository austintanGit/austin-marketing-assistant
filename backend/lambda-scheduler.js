const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

// Environment variables
const MAIN_TABLE = process.env.MAIN_TABLE || 'marketing-assistant';
const SCHEDULED_POSTS_TABLE = process.env.SCHEDULED_POSTS_TABLE || 'scheduled_posts_v2';

exports.handler = async (event) => {
    console.log('🔄 Processing scheduled posts at:', new Date().toISOString());
    
    try {
        // Get all pending posts that are due (scheduled_time <= now), including overdue posts
        const now = new Date();
        
        console.log('🔍 Looking for posts scheduled on or before:', now.toISOString());
        
        const params = {
            TableName: SCHEDULED_POSTS_TABLE,
            FilterExpression: '#status = :pending AND #scheduled_time <= :now',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#scheduled_time': 'scheduled_time'
            },
            ExpressionAttributeValues: {
                ':pending': 'pending',
                ':now': now.toISOString()
            }
        };
        
        const result = await dynamodb.send(new ScanCommand(params));
        console.log(`📊 Found ${result.Items.length} posts to publish`);
        
        // Process each post
        const results = [];
        for (const post of result.Items) {
            const processResult = await processPost(post);
            results.push(processResult);
        }
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        console.log(`✅ Processed: ${successCount} successful, ${failCount} failed`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Processed ${result.Items.length} scheduled posts`,
                successful: successCount,
                failed: failCount,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Error processing scheduled posts:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};

async function processPost(post) {
    try {
        console.log(`🔄 Processing post: ${post.post_id} for user: ${post.user_id}`);
        
        // Get user's social connection using correct DynamoDB structure
        const connection = await getUserConnection(post.user_id, post.platform);
        if (!connection) {
            throw new Error(`No ${post.platform} connection found for user ${post.user_id}`);
        }
        
        if (!connection.platform_page_id || !connection.access_token) {
            throw new Error(`Invalid ${post.platform} connection: missing page ID or access token`);
        }
        
        // Post to social media
        const platformPostId = await publishToSocial(connection, post.content, post.platform);
        
        // Log the post to social_posts table (for billing/metrics)
        await logSocialPost(post.user_id, post.platform, {
            platform_post_id: platformPostId,
            message: post.content.message,
            has_image: !!post.content.image_url,
            image_source: post.content.image_source || 'scheduled',
            scheduled: true
        });
        
        // Mark as posted
        await updatePostStatus(post.user_id, post.post_id, 'posted');
        
        console.log(`✅ Successfully posted: ${post.post_id} -> ${platformPostId}`);
        return { success: true, post_id: post.post_id, platform_post_id: platformPostId };
        
    } catch (error) {
        console.error(`❌ Failed to post ${post.post_id}:`, error.message);
        await updatePostStatus(post.user_id, post.post_id, 'failed', error.message);
        return { success: false, post_id: post.post_id, error: error.message };
    }
}

async function getUserConnection(userId, platform) {
    try {
        const params = {
            TableName: MAIN_TABLE,
            Key: {
                PK: `USER#${userId}`,
                SK: `SOCIAL#${platform}`
            }
        };
        
        const result = await dynamodb.send(new GetCommand(params));
        
        if (!result.Item) {
            console.log(`⚠️  No ${platform} connection found for user ${userId}`);
            return null;
        }
        
        console.log(`✅ Found ${platform} connection for user ${userId}`);
        return result.Item;
        
    } catch (error) {
        console.error(`❌ Error getting connection for user ${userId}, platform ${platform}:`, error);
        throw error;
    }
}

async function publishToSocial(connection, content, platform) {
    if (platform === 'facebook') {
        return await publishToFacebook(connection, content);
    }
    // Add Instagram later if needed
    throw new Error(`Platform ${platform} not supported yet`);
}

async function publishToFacebook(connection, content) {
    try {
        const postData = {
            access_token: connection.access_token
        };
        
        // Determine endpoint and data based on content type
        let endpoint;
        if (content.image_url) {
            // Post with image
            endpoint = `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`;
            postData.url = content.image_url;
            if (content.message) {
                postData.message = content.message;
            }
        } else {
            // Text-only post
            endpoint = `https://graph.facebook.com/v18.0/${connection.platform_page_id}/feed`;
            postData.message = content.message;
        }
        
        console.log(`📤 Posting to Facebook: ${endpoint}`);
        
        const response = await makeHttpsRequest(endpoint, postData);
        const platformPostId = response.post_id || response.id;
        
        if (!platformPostId) {
            throw new Error('No post ID returned from Facebook API');
        }
        
        return platformPostId;
        
    } catch (error) {
        console.error('❌ Facebook posting error:', error);
        throw error;
    }
}

async function makeHttpsRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postDataString = Object.keys(data)
            .map(key => `${key}=${encodeURIComponent(data[key])}`)
            .join('&');
        
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postDataString)
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const parsedData = JSON.parse(responseData);
                        resolve(parsedData);
                    } else {
                        console.error(`HTTP ${res.statusCode}: ${responseData}`);
                        reject(new Error(`Facebook API error: ${res.statusCode} ${responseData}`));
                    }
                } catch (parseError) {
                    reject(new Error(`Failed to parse Facebook response: ${responseData}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('HTTPS request error:', error);
            reject(error);
        });
        
        req.write(postDataString);
        req.end();
    });
}

async function logSocialPost(userId, platform, postData) {
    try {
        const postLog = {
            PK: `USER#${userId}`,
            SK: `POST#${platform}#${Date.now()}#${Math.random().toString(36).substr(2, 9)}`,
            entity_type: 'social_post',
            platform,
            platform_post_id: postData.platform_post_id,
            message: postData.message,
            has_image: postData.has_image || false,
            image_source: postData.image_source || 'none',
            scheduled: postData.scheduled || false,
            created_at: new Date().toISOString()
        };
        
        await dynamodb.send(new PutCommand({
            TableName: MAIN_TABLE,
            Item: postLog
        }));
        
        console.log(`📝 Logged social post: ${postData.platform_post_id}`);
        
    } catch (error) {
        console.error('❌ Failed to log social post:', error);
        // Don't throw - logging failure shouldn't stop the post
    }
}

async function updatePostStatus(userId, postId, status, errorMessage = null) {
    try {
        const params = {
            TableName: SCHEDULED_POSTS_TABLE,
            Key: {
                user_id: userId,
                post_id: postId
            },
            UpdateExpression: 'SET #status = :status, updated_at = :updated_at' + 
                             (errorMessage ? ', error_message = :error' : ''),
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':updated_at': new Date().toISOString()
            }
        };
        
        if (errorMessage) {
            params.ExpressionAttributeValues[':error'] = errorMessage;
        }
        
        await dynamodb.send(new UpdateCommand(params));
        console.log(`📝 Updated post status: ${postId} -> ${status}`);
        
    } catch (error) {
        console.error(`❌ Failed to update post status for ${postId}:`, error);
        throw error;
    }
}