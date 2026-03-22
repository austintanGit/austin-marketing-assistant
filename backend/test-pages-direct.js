const axios = require('axios');

// Token from the terminal logs (your current Facebook token)
const ACCESS_TOKEN = 'EAAeL8EAnPNoBRID5oW0kUAIiEgfGBSf9zGuzEzs4ZA0czcVDIrGAVEXOZBwhtR2rwjaMkughm8LK2wPZBQY2mqH0IiHkJ5kzpKsBAlkXd2GC0ExBZA8ZCpf4QzsiZCozaxlYjpsM0HkoFKNwg0yoK76ke1warX3jWKqRyTBT3QDNd3te6iY0sM0d6M9Ouget21NGlMf1f1mCNeHMAa';

async function testPagesAPI() {
  console.log('🔬 Testing Facebook Pages API Directly');
  console.log('======================================\n');
  
  try {
    console.log('📡 Calling Facebook Graph API: /me/accounts');
    const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { 
        access_token: ACCESS_TOKEN,
        fields: 'id,name,access_token,tasks,category,about'
      },
    });
    
    console.log('✅ API Call Successful!');
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
    const pages = response.data.data || [];
    console.log(`\n📄 Found ${pages.length} pages:`);
    
    if (pages.length > 0) {
      pages.forEach((page, index) => {
        console.log(`\n   ${index + 1}. "${page.name}"`);
        console.log(`      • ID: ${page.id}`);
        console.log(`      • Category: ${page.category || 'Not specified'}`);
        console.log(`      • Has Page Token: ${page.access_token ? '✅ Yes' : '❌ No'}`);
        console.log(`      • Admin Tasks: ${page.tasks ? page.tasks.join(', ') : 'None listed'}`);
      });
      
      console.log('\n🎯 CONCLUSION:');
      console.log('   The Facebook API is returning your pages!');
      console.log('   The issue is in the OAuth callback - it\'s not saving these pages properly.');
      console.log('\n📝 Next Steps:');
      console.log('   1. Disconnect and reconnect Facebook in your app');
      console.log('   2. The updated OAuth scope should now detect these pages');
      console.log('   3. Check the server logs during reconnection for debugging');
      
    } else {
      console.log('\n❌ No pages found');
      console.log('   This means either:');
      console.log('   • You don\'t have admin access to any Facebook pages');
      console.log('   • Your token doesn\'t have page permissions');
      console.log('   • All your pages are unpublished/hidden');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      console.log(`\n📋 Facebook Error Details:`);
      console.log(`   Code: ${fbError.code}`);
      console.log(`   Type: ${fbError.type}`);
      console.log(`   Message: ${fbError.message}`);
      
      if (fbError.code === 190) {
        console.log('\n💡 This is a token error - try reconnecting your Facebook account');
      } else if (fbError.code === 10) {
        console.log('\n💡 Permission error - your app may need additional Facebook review');
      }
    }
  }
}

testPagesAPI();