const AWS = require('aws-sdk');
const https = require('https');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Processing scheduled posts at:', new Date().toISOString());
    
    try {
        // Get posts scheduled for the last 5 minutes
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        
        console.log('Looking for posts between:', fiveMinutesAgo.toISOString(), 'and', now.toISOString());
        
        const params = {
            TableName: 'scheduled_posts_v2', // Updated table name
            FilterExpression: '#status = :pending AND #scheduled_time BETWEEN :start AND :end',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#scheduled_time': 'scheduled_time'
            },
            ExpressionAttributeValues: {
                ':pending': 'pending',
                ':start': fiveMinutesAgo.toISOString(),
                ':end': now.toISOString()
            }
        };
        
        const result = await dynamodb.scan(params).promise();
        console.log(`Found ${result.Items.length} posts to publish`);
        
        // Process each post
        for (const post of result.Items) {
            await processPost(post);
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Processed ${result.Items.length} scheduled posts`,
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('Error processing scheduled posts:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function processPost(post) {
    try {
        console.log(`Processing post: ${post.post_id} for user: ${post.user_id}`);
        
        // Get user's social connection
        const connection = await getUserConnection(post.user_id, post.platform);
        if (!connection) {
            throw new Error(`No ${post.platform} connection found for user ${post.user_id}`);
        }
        
        // Post to social media
        await publishToSocial(connection, post.content, post.platform);
        
        // Mark as posted
        await updatePostStatus(post.user_id, post.post_id, 'posted');
        
        console.log(`✅ Successfully posted: ${post.post_id}`);
        
    } catch (error) {
        console.error(`❌ Failed to post ${post.post_id}:`, error.message);
        await updatePostStatus(post.user_id, post.post_id, 'failed', error.message);
    }
}

async function getUserConnection(userId, platform) {
    // Use marketing-assistant table (main table) for social connections
    const params = {
        TableName: 'marketing-assistant',
        Key: {
            PK: `USER#${userId}`,
            SK: `SOCIAL#${platform}`
        }
    };
    
    const result = await dynamodb.get(params).promise();
    return result.Item;
}

async function publishToSocial(connection, content, platform) {
    if (platform === 'facebook') {
        return await publishToFacebook(connection, content);
    }
    // Add Instagram later
    throw new Error(`Platform ${platform} not supported yet`);
}

async function publishToFacebook(connection, content) {
    const postData = {
        message: content.message,
        access_token: connection.access_token
    };
    
    // Add image if present
    if (content.image_url) {
        postData.url = content.image_url;
    }
    
    const endpoint = content.image_url 
        ? `https://graph.facebook.com/v18.0/${connection.platform_page_id}/photos`
        : `https://graph.facebook.com/v18.0/${connection.platform_page_id}/feed`;
    
    return new Promise((resolve, reject) => {
        const postDataString = Object.keys(postData)
            .map(key => `${key}=${encodeURIComponent(postData[key])}`)
            .join('&');
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postDataString.length
            }
        };
        
        const req = https.request(endpoint, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Facebook API error: ${res.statusCode} ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(postDataString);
        req.end();
    });
}

async function updatePostStatus(userId, postId, status, errorMessage = null) {
    const params = {
        TableName: 'scheduled_posts_v2', // Updated table name
        Key: {
            user_id: userId, // Now expects string user_id
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
    
    await dynamodb.update(params).promise();
}