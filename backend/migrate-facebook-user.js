require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function migrateFacebookToCurrentUser() {
  try {
    console.log('🔄 Migrating Facebook connection to current user...\n');
    
    const oldUserId = '1774148132227y6pi3qz4t'; // User ID with the Facebook connection
    const newUserId = '1774145465217q5lt5xwpn'; // Your current user ID
    
    console.log('Old User ID (has Facebook):', oldUserId);
    console.log('New User ID (current):', newUserId);
    
    // Get the Facebook connection from the old user
    const oldConnection = await dynamodb.getUserSocialConnection(oldUserId, 'facebook');
    
    if (!oldConnection) {
      console.log('❌ No Facebook connection found for old user');
      return;
    }
    
    console.log('✅ Found Facebook connection for old user:');
    console.log('- Access Token:', oldConnection.access_token ? 'Present' : 'Missing');
    console.log('- Created:', oldConnection.created_at);
    
    // Delete the old connection
    await dynamodb.delete(`USER#${oldUserId}`, 'SOCIAL#facebook');
    console.log('🗑️  Deleted old connection');
    
    // Create connection for current user with a test page ID
    const newConnection = {
      PK: `USER#${newUserId}`,
      SK: 'SOCIAL#facebook',
      entity_type: 'social_connection',
      user_id: newUserId,
      platform: 'facebook',
      access_token: oldConnection.access_token,
      platform_page_id: 'me', // Use 'me' for user timeline
      platform_page_name: 'Personal Feed',
      platform_user_id: oldConnection.platform_user_id,
      refresh_token: oldConnection.refresh_token,
      token_expiry: oldConnection.token_expiry,
      extra_data: oldConnection.extra_data,
      status: 'active',
      created_at: oldConnection.created_at,
      updated_at: new Date().toISOString()
    };
    
    await dynamodb.put(newConnection);
    
    console.log('✅ Facebook connection migrated successfully!');
    console.log('- New User ID:', newUserId);
    console.log('- Page ID: "me" (personal timeline)');
    
    // Test retrieval
    const testConnection = await dynamodb.getUserSocialConnection(newUserId, 'facebook');
    console.log('🧪 Test retrieval:', !!testConnection);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

migrateFacebookToCurrentUser();