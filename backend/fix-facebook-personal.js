require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function fixFacebookConnection() {
  try {
    console.log('🔧 Setting up Facebook connection for user posts (no page needed)...\n');
    
    const userId = '1774145465217q5lt5xwpn';
    
    // Get the Facebook connection
    const connection = await dynamodb.getUserSocialConnection(userId, 'facebook');
    if (!connection) {
      console.log('❌ No Facebook connection found');
      return;
    }
    
    // Update to use user feed posting (me/feed) instead of page posting
    const updatedConnection = {
      ...connection,
      platform_page_id: 'me', // Use 'me' for user's own feed
      platform_page_name: 'Personal Feed',
      updated_at: new Date().toISOString()
    };
    
    await dynamodb.put(updatedConnection);
    
    console.log('✅ Facebook connection updated!');
    console.log('- Page ID: "me" (posts to your personal feed)');
    console.log('- This will post to your personal Facebook timeline');
    
    console.log('\n💡 Alternative: Create a Facebook Page');
    console.log('1. Go to facebook.com/pages/creation');
    console.log('2. Create a business page');
    console.log('3. Reconnect Facebook to get page access');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixFacebookConnection();