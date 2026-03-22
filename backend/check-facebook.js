require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function checkFacebookConnection() {
  try {
    console.log('🔍 Checking Facebook connection for test-user-id...\n');
    
    const userId = 'test-user-id';
    
    // Get user data
    const user = await dynamodb.getUserById(userId);
    console.log('👤 User Data:');
    console.log('- User ID:', user?.user_id);
    console.log('- Business Name:', user?.business_name);
    console.log('- Facebook Connected:', user?.facebook_connected || false);
    console.log('- Facebook Page ID:', user?.facebook_page_id || 'NOT SET');
    console.log('- Facebook Access Token:', user?.facebook_access_token ? 'SET' : 'NOT SET');
    
    // Get social connections
    const connections = await dynamodb.getUserSocialConnections(userId);
    console.log('\n🔗 Social Connections:');
    if (connections && connections.length > 0) {
      connections.forEach(conn => {
        console.log(`- Platform: ${conn.platform}`);
        console.log(`- Page ID: ${conn.page_id || 'NOT SET'}`);
        console.log(`- Access Token: ${conn.access_token ? 'SET' : 'NOT SET'}`);
        console.log(`- Status: ${conn.status || 'unknown'}`);
        console.log('---');
      });
    } else {
      console.log('❌ No social connections found');
    }
    
    console.log('\n💡 SOLUTION:');
    console.log('You need to connect your Facebook page first:');
    console.log('1. Go to http://localhost:5173/setup');
    console.log('2. Click "Connect Facebook Page"');
    console.log('3. Select your Facebook page');
    console.log('4. Complete the authorization');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkFacebookConnection();