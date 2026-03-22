require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function fixFacebookConnection() {
  try {
    console.log('🔧 Fixing Facebook connection in marketing-assistant table...\n');
    
    const oldUserId = '1774145465217'; // Truncated numeric ID  
    const newUserId = '1774145465217q5lt5xwpn'; // Correct full string ID
    
    // Get the existing connection
    console.log('📖 Reading existing connection...');
    const existingConnection = await dynamodb.get(`USER#${oldUserId}`, 'SOCIAL#facebook');
    
    if (!existingConnection) {
      console.log('❌ No existing Facebook connection found with old user ID');
      return;
    }
    
    console.log('✅ Found existing connection:');
    console.log('- Old User ID:', oldUserId);
    console.log('- Platform Page ID:', existingConnection.platform_page_id);
    console.log('- Access Token:', existingConnection.access_token ? 'Present' : 'Missing');
    
    // Delete the old connection
    console.log('\n🗑️  Deleting old connection...');
    await dynamodb.delete(`USER#${oldUserId}`, 'SOCIAL#facebook');
    
    // Create the new connection with correct user_id and a test page_id
    console.log('📝 Creating new connection with correct user_id...');
    
    const newConnection = {
      PK: `USER#${newUserId}`, // Use correct string user_id
      SK: 'SOCIAL#facebook',
      entity_type: 'social_connection',
      user_id: newUserId, // Use string user_id
      platform: 'facebook',
      access_token: existingConnection.access_token,
      platform_page_id: '61550749845553', // Test page ID - replace with real one
      platform_page_name: existingConnection.platform_page_name || 'Test Page',
      platform_user_id: existingConnection.platform_user_id,
      refresh_token: existingConnection.refresh_token,
      token_expiry: existingConnection.token_expiry,
      extra_data: existingConnection.extra_data,
      status: 'active',
      created_at: existingConnection.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await dynamodb.put(newConnection);
    
    console.log('✅ Facebook connection fixed!');
    console.log('- New User ID:', newUserId);
    console.log('- Platform Page ID:', newConnection.platform_page_id);
    console.log('- Table: marketing-assistant');
    
    console.log('\n🧪 Testing connection retrieval...');
    const testConnection = await dynamodb.getUserSocialConnection(newUserId, 'facebook');
    console.log('✅ Connection retrieved:', !!testConnection);
    console.log('- Page ID:', testConnection?.platform_page_id);
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('Replace platform_page_id "61550749845553" with your actual Facebook Page ID');
    console.log('You can find it at: https://www.facebook.com/[your-page]/about');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFacebookConnection();