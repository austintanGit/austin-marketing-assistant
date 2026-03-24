const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

async function debugScheduledPosts() {
    console.log('🔍 Debugging scheduled posts system...\n');
    
    try {
        // 1. Check if there are any scheduled posts
        console.log('1. Checking for scheduled posts...');
        const postsResult = await dynamodb.send(new ScanCommand({
            TableName: 'scheduled_posts_v2',
            Limit: 10
        }));
        
        console.log(`   Found ${postsResult.Items.length} total scheduled posts`);
        
        if (postsResult.Items.length > 0) {
            console.log('   Sample post structure:');
            console.log('  ', JSON.stringify(postsResult.Items[0], null, 2));
            
            // Check for posts that should have been published
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            const duePostsResult = await dynamodb.send(new ScanCommand({
                TableName: 'scheduled_posts_v2',
                FilterExpression: '#status = :pending AND #scheduled_time < :now',
                ExpressionAttributeNames: {
                    '#status': 'status',
                    '#scheduled_time': 'scheduled_time'
                },
                ExpressionAttributeValues: {
                    ':pending': 'pending',
                    ':now': now.toISOString()
                }
            }));
            
            console.log(`   Found ${duePostsResult.Items.length} overdue posts that should have been published`);
            
            if (duePostsResult.Items.length > 0) {
                console.log('   Sample overdue post:');
                console.log('  ', JSON.stringify(duePostsResult.Items[0], null, 2));
                
                // Check if user has valid social connections
                const samplePost = duePostsResult.Items[0];
                console.log(`\n2. Checking social connection for user ${samplePost.user_id}...`);
                
                const connectionResult = await dynamodb.send(new GetCommand({
                    TableName: 'marketing-assistant',
                    Key: {
                        PK: `USER#${samplePost.user_id}`,
                        SK: `SOCIAL#${samplePost.platform}`
                    }
                }));
                
                if (connectionResult.Item) {
                    console.log('   ✅ Social connection found');
                    console.log('   Connection data:');
                    const connection = { ...connectionResult.Item };
                    delete connection.access_token; // Don't log the token
                    connection.access_token = connection.access_token ? '[PRESENT]' : '[MISSING]';
                    console.log('  ', JSON.stringify(connection, null, 2));
                } else {
                    console.log('   ❌ No social connection found');
                    console.log('   Expected key:', {
                        PK: `USER#${samplePost.user_id}`,
                        SK: `SOCIAL#${samplePost.platform}`
                    });
                }
            }
        } else {
            console.log('   ❌ No scheduled posts found in database');
        }
        
        // 3. Check EventBridge logs (if accessible)
        console.log('\n3. Next steps:');
        console.log('   - Check your EventBridge rule is enabled and triggering');
        console.log('   - Check Lambda function logs in CloudWatch');
        console.log('   - Verify Lambda has proper IAM permissions for DynamoDB');
        console.log('   - Test Lambda function manually with a test event');
        
    } catch (error) {
        console.error('❌ Error debugging:', error);
    }
}

debugScheduledPosts();