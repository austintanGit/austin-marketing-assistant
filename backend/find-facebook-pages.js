require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');
const axios = require('axios');

async function findFacebookPages() {
  try {
    console.log('🔍 Finding your Facebook pages...\n');
    
    const userId = '1774145465217q5lt5xwpn';
    
    // Get the Facebook connection
    const connection = await dynamodb.getUserSocialConnection(userId, 'facebook');
    if (!connection) {
      console.log('❌ No Facebook connection found');
      return;
    }
    
    console.log('✅ Found Facebook connection');
    console.log('- Access Token:', connection.access_token ? 'Present' : 'Missing');
    
    // Get user's pages from Facebook API
    console.log('\n📡 Fetching your pages from Facebook...');
    
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: connection.access_token
      }
    });
    
    console.log('🎯 Your Facebook Pages:');
    if (response.data.data && response.data.data.length > 0) {
      response.data.data.forEach((page, index) => {
        console.log(`${index + 1}. Name: ${page.name}`);
        console.log(`   ID: ${page.id}`);
        console.log(`   Category: ${page.category}`);
        console.log(`   Access Token: ${page.access_token ? 'Present' : 'Missing'}`);
        console.log('');
      });
      
      const firstPage = response.data.data[0];
      console.log(`💡 I'll update your connection to use: "${firstPage.name}" (ID: ${firstPage.id})`);
      
      // Update the connection with the correct page
      const updatedConnection = {
        ...connection,
        platform_page_id: firstPage.id,
        platform_page_name: firstPage.name,
        access_token: firstPage.access_token, // Use page-specific token
        updated_at: new Date().toISOString()
      };
      
      await dynamodb.put(updatedConnection);
      console.log('✅ Facebook connection updated with correct page!');
      
    } else {
      console.log('❌ No pages found. Make sure you have admin access to at least one Facebook page.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

findFacebookPages();