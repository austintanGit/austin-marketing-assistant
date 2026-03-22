const axios = require('axios');

// This script will help verify your new Facebook page is working
// Run this AFTER you create the page and reconnect your account

async function verifyNewPage() {
  console.log('🔍 Facebook Page Verification');
  console.log('============================\n');
  
  console.log('📋 BEFORE RUNNING THIS SCRIPT:');
  console.log('   1. ✅ Create your Facebook Business Page');
  console.log('   2. ✅ Make sure it\'s PUBLISHED');
  console.log('   3. ✅ Disconnect Facebook in your app');
  console.log('   4. ✅ Reconnect Facebook in your app');
  console.log('   5. ✅ Select your new page in the dialog');
  console.log('');
  
  console.log('📡 To test your new connection:');
  console.log('   → Visit: http://localhost:3001/api/social/facebook/debug');
  console.log('   → (You\'ll need to be logged in to your app)');
  console.log('');
  console.log('✅ WHAT YOU SHOULD SEE:');
  console.log('   → status: "ready_to_post" (not "needs_business_page")');
  console.log('   → pageName: "Austin Marketing Assistant" (your page name)');
  console.log('   → pageId: actual page ID (not null or "me")');
  console.log('   → canPost: true');
  console.log('   → availablePages: 1 or more');
  console.log('');
  console.log('❌ IF IT STILL SHOWS "needs_business_page":');
  console.log('   → Make sure the page is PUBLISHED (not draft)');
  console.log('   → Try disconnecting/reconnecting again');
  console.log('   → Check that you selected the right page in Facebook dialog');
  console.log('   → Wait 1-2 minutes and try again (Facebook caching)');
  console.log('');
  console.log('🎯 FINAL TEST:');
  console.log('   → Go to your app\'s Dashboard');
  console.log('   → Try posting a test message to Facebook');
  console.log('   → Should work without any API errors!');
}

verifyNewPage();