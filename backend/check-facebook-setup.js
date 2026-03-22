#!/usr/bin/env node

/**
 * Facebook Business Page Helper
 * 
 * This script helps you create and connect a Facebook Business Page
 * for posting with your marketing assistant app.
 */

const { getUserSocialConnection } = require('./src/services/dynamodb');

console.log('🔵 Facebook Business Page Setup Helper');
console.log('=====================================\n');

async function checkCurrentConnection(userId = '1774148132227y6pi3qz4t') {
  try {
    console.log('🔍 Checking current Facebook connection...\n');
    
    const connection = await getUserSocialConnection(userId, 'facebook');
    if (!connection) {
      console.log('❌ No Facebook connection found');
      return;
    }

    console.log('📊 Current Connection Details:');
    console.log(`   Platform: ${connection.platform}`);
    console.log(`   Page ID: ${connection.platform_page_id || 'null'}`);
    console.log(`   Page Name: ${connection.platform_page_name}`);
    
    const extraData = connection.extra_data ? JSON.parse(connection.extra_data) : {};
    console.log(`   Available Pages: ${extraData.pages?.length || 0}`);
    
    if (!connection.platform_page_id || connection.platform_page_id === 'me' || extraData.needsBusinessPage) {
      console.log('\n⚠️  ISSUE DETECTED:');
      console.log('   You are connected to your personal Facebook profile,');
      console.log('   but Facebook requires a Business Page for posting.\n');
      
      console.log('📋 TO FIX THIS:');
      console.log('   1. Create a Facebook Business Page:');
      console.log('      → https://www.facebook.com/pages/create');
      console.log('   2. Choose "Business" and fill out your details');
      console.log('   3. After creating the page, reconnect in your app');
      console.log('   4. The app will detect your new Business Page automatically\n');
      
      console.log('💡 Page Suggestions:');
      console.log('   • Business Name: "Austin Marketing Assistant" or your business name');
      console.log('   • Category: "Marketing Agency" or "Business Service"');
      console.log('   • Description: Brief description of your marketing services\n');
    } else {
      console.log('\n✅ Connection looks good! You can post to Facebook.');
      console.log(`   Connected to: ${connection.platform_page_name}\n`);
    }

  } catch (error) {
    console.error('❌ Error checking connection:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkCurrentConnection()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Script error:', err);
      process.exit(1);
    });
}

module.exports = { checkCurrentConnection };