require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBClient.from(new DynamoDBClient({ region: 'us-west-2' }));

async function createFacebookConnection() {
  try {
    console.log('🔄 Creating Facebook connection in social_connections_v2...\n');
    
    const stringUserId = '1774145465217q5lt5xwpn';
    
    // For testing, we'll create a connection with a test page ID
    const connection = {
      user_id: stringUserId,
      platform: 'facebook',
      access_token: 'EAAeL8EAnPNoBRBSw8P9gRyEwn4b3qRMllvXnEEZB92fJ42nqqao2vZBwrKeZC2kGimKaqKL0OgdG2kmRhAuAcd8OT4plhwcBUCpYrfxnMLQxb1MiE8vPcTsSLOmkvGxYu2WTTKEL9t8TmlsGjy0wZBrAxZCI2zTywgrutOsxEiuZCzeVUipXPrnCqZC3yHjKidnBu8QKQywv8xZCS8b8', // From the terminal logs
      platform_page_id: '61550749845553', // Test page ID - replace with your actual Facebook page ID
      platform_page_name: 'Test Page',
      platform_user_id: null,
      refresh_token: null,
      token_expiry: null,
      extra_data: JSON.stringify({ pages: [], instagramAccountId: null }),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const putCommand = new PutCommand({
      TableName: 'social_connections_v2',
      Item: connection
    });
    
    await client.send(putCommand);
    
    console.log('✅ Facebook connection created successfully!');
    console.log('- User ID:', stringUserId);
    console.log('- Platform Page ID:', connection.platform_page_id);
    console.log('- Access Token:', connection.access_token ? 'Present' : 'Missing');
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('Replace platform_page_id with your actual Facebook Page ID');
    console.log('You can find your page ID at: https://www.facebook.com/[your-page]/about');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createFacebookConnection();