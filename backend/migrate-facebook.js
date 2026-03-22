require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function migrateFacebookConnection() {
  try {
    console.log('🔄 Migrating Facebook connection to new table...\n');
    
    const stringUserId = '1774145465217q5lt5xwpn';
    const numericUserId = '1774145465217';
    
    // Get the existing connection from the old location
    console.log('📖 Reading existing connection from marketing-assistant table...');
    const existingConnection = await dynamodb.get(`USER#${numericUserId}`, 'SOCIAL#facebook');
    
    if (!existingConnection) {
      console.log('❌ No existing Facebook connection found');
      return;
    }
    
    console.log('✅ Found existing connection:');
    console.log('- Platform Page ID:', existingConnection.platform_page_id);
    console.log('- Platform Page Name:', existingConnection.platform_page_name);
    console.log('- Access Token:', existingConnection.access_token ? 'Present' : 'Missing');
    
    // Create the connection in the new social_connections_v2 table
    console.log('\n📝 Creating connection in social_connections_v2 table...');
    
    const newConnection = {
      user_id: stringUserId, // Use correct string user_id
      platform: 'facebook',
      access_token: existingConnection.access_token,
      platform_page_id: existingConnection.platform_page_id || 'test-page-id', // Add test page ID if null
      platform_page_name: existingConnection.platform_page_name || 'Test Page',
      platform_user_id: existingConnection.platform_user_id,
      refresh_token: existingConnection.refresh_token,
      token_expiry: existingConnection.token_expiry,
      extra_data: existingConnection.extra_data,
      status: 'active',
      created_at: existingConnection.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Put the connection in the new table using the correct method
    const putParams = {
      TableName: 'social_connections_v2',
      Item: newConnection
    };
    
    await dynamodb.docClient.send(new (require('@aws-sdk/lib-dynamodb').PutCommand)(putParams));
    
    console.log('✅ Facebook connection migrated successfully!');
    console.log('- New User ID:', stringUserId);
    console.log('- Platform Page ID:', newConnection.platform_page_id);
    console.log('- Table: social_connections_v2');
    
    console.log('\n🧪 Testing connection retrieval...');
    const testConnection = await dynamodb.docClient.send(new (require('@aws-sdk/lib-dynamodb').GetCommand)({
      TableName: 'social_connections_v2',
      Key: {
        user_id: stringUserId,
        platform: 'facebook'
      }
    }));
    
    console.log('✅ Connection retrieved successfully:', !!testConnection.Item);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateFacebookConnection();