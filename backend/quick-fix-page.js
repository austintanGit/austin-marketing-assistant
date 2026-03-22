require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function quickFixPageId() {
  try {
    console.log('🔧 Quick fix: Setting page ID again...\n');
    
    const userId = '1774145465217q5lt5xwpn';
    
    // Get current connection
    const connection = await dynamodb.getUserSocialConnection(userId, 'facebook');
    if (!connection) {
      console.log('❌ No Facebook connection found');
      return;
    }
    
    console.log('Current connection:');
    console.log('- Page ID:', connection.platform_page_id);
    console.log('- Page Name:', connection.platform_page_name);
    
    // Set a working page ID (you can replace this with your actual page ID)
    const updatedConnection = {
      ...connection,
      platform_page_id: 'me', // Use 'me' to post to user feed
      platform_page_name: 'Personal Feed',
      updated_at: new Date().toISOString()
    };
    
    await dynamodb.put(updatedConnection);
    
    console.log('✅ Fixed! Updated connection:');
    console.log('- Page ID: "me" (posts to your personal timeline)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickFixPageId();