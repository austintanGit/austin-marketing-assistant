const axios = require('axios');
const dynamodb = require('./src/services/dynamodb');

async function debugFacebookPages() {
  try {
    console.log('🔍 Facebook Pages Debug Tool');
    console.log('============================\n');
    
    // Get the current Facebook connection
    const connection = await dynamodb.getUserSocialConnection('1774148132227y6pi3qz4t', 'facebook');
    if (!connection) {
      console.log('❌ No Facebook connection found');
      return;
    }
    
    console.log('📊 Current Connection:');
    console.log(`   Access Token: ${connection.access_token ? 'Present' : 'Missing'}`);
    console.log(`   Page ID: ${connection.platform_page_id}`);
    console.log(`   Page Name: ${connection.platform_page_name}`);
    
    const extraData = connection.extra_data ? JSON.parse(connection.extra_data) : {};
    console.log(`   Stored Pages: ${extraData.pages?.length || 0}`);
    console.log('');
    
    // Test the pages API directly
    console.log('🔬 Testing Facebook Pages API...');
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { 
          access_token: connection.access_token,
          fields: 'id,name,access_token,tasks,category'
        },
      });
      
      const pages = response.data.data || [];
      console.log(`✅ API Response: Found ${pages.length} pages`);
      
      if (pages.length > 0) {
        console.log('\n📄 Available Pages:');
        pages.forEach((page, index) => {
          console.log(`   ${index + 1}. ${page.name}`);
          console.log(`      ID: ${page.id}`);
          console.log(`      Category: ${page.category || 'Unknown'}`);
          console.log(`      Has Page Token: ${page.access_token ? 'Yes' : 'No'}`);
          console.log(`      Tasks: ${page.tasks ? page.tasks.join(', ') : 'None listed'}`);
          console.log('');
        });
        
        console.log('🎯 Recommended Action:');
        console.log('   The pages API is working! The issue might be:');
        console.log('   1. OAuth callback timing - try reconnecting');
        console.log('   2. Token permissions - the new scope should help');
        console.log('   3. Page selection not being saved properly');
        
      } else {
        console.log('\n❌ No pages returned by API');
        console.log('\n💡 Possible Fixes:');
        console.log('   1. Make sure you are an admin/editor of Facebook pages');
        console.log('   2. Check that your Facebook pages are published');
        console.log('   3. Your Facebook App may need additional review for page access');
        console.log('   4. Try creating a test page: https://www.facebook.com/pages/create');
      }
      
    } catch (apiError) {
      console.error('❌ Pages API Error:', apiError.response?.data || apiError.message);
      console.log('\n💡 This suggests:');
      console.log('   • Token may have insufficient permissions');
      console.log('   • Facebook app needs approval for page access');
      console.log('   • Try disconnecting and reconnecting with updated permissions');
    }
    
  } catch (error) {
    console.error('Script error:', error.message);
  }
}

debugFacebookPages();