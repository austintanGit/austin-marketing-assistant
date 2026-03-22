const axios = require('axios');

async function testConnection() {
  try {
    // You'll need to replace this with a real JWT token from your app
    console.log('🔍 Testing Facebook debug endpoint...');
    console.log('   (Note: You can also test this in your browser at:');
    console.log('    http://localhost:3001/api/social/facebook/debug )');
    console.log('');
    
    // The key point is that your connection currently has:
    console.log('📊 CURRENT CONNECTION STATUS (from terminal logs):');
    console.log('   • platform_page_id: null');  
    console.log('   • pages: [] (empty array)');
    console.log('   • page_name: "Facebook Page" (generic fallback)');
    console.log('');
    
    console.log('✅ AFTER YOU CREATE A BUSINESS PAGE, you should see:');
    console.log('   • platform_page_id: "123456789" (actual page ID)');
    console.log('   • pages: [{ id: "123456789", name: "Your Business Name" }]');
    console.log('   • page_name: "Your Business Name"');
    console.log('');
    
    console.log('💡 Quick test: Visit the debug endpoint in your browser after creating the page');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnection();