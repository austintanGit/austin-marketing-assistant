const axios = require('axios');

// Token from the terminal logs
const ACCESS_TOKEN = 'EAAeL8EAnPNoBRID5oW0kUAIiEgfGBSf9zGuzEzs4ZA0czcVDIrGAVEXOZBwhtR2rwjaMkughm8LK2wPZBQY2mqH0IiHkJ5kzpKsBAlkXd2GC0ExBZA8ZCpf4QzsiZCozaxlYjpsM0HkoFKNwg0yoK76ke1warX3jWKqRyTBT3QDNd3te6iY0sM0d6M9Ouget21NGlMf1f1mCNeHMAa';

async function fullFacebookDebug() {
  console.log('🔍 Full Facebook Token Debug');
  console.log('============================\n');
  
  try {
    // 1. Check what permissions the token has
    console.log('1️⃣ Checking token permissions...');
    const permissionsRes = await axios.get('https://graph.facebook.com/v18.0/me/permissions', {
      params: { access_token: ACCESS_TOKEN }
    });
    
    const permissions = permissionsRes.data.data || [];
    console.log('✅ Token Permissions:');
    permissions.forEach(perm => {
      const status = perm.status === 'granted' ? '✅' : '❌';
      console.log(`   ${status} ${perm.permission} (${perm.status})`);
    });
    
    // Check for specific permissions we need
    const hasPages = permissions.find(p => p.permission.includes('pages') && p.status === 'granted');
    if (!hasPages) {
      console.log('\n⚠️  Missing page permissions! This is likely the issue.');
    }
    
    console.log('');
    
    // 2. Check user info
    console.log('2️⃣ Checking user info...');
    const userRes = await axios.get('https://graph.facebook.com/v18.0/me', {
      params: { 
        access_token: ACCESS_TOKEN,
        fields: 'id,name,email'
      }
    });
    console.log('✅ User Info:', userRes.data);
    console.log('');
    
    // 3. Try different pages endpoints
    console.log('3️⃣ Trying different pages endpoints...');
    
    // Standard pages endpoint
    try {
      const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { access_token: ACCESS_TOKEN }
      });
      console.log(`   /me/accounts: ${pagesRes.data.data?.length || 0} pages`);
    } catch (e) {
      console.log(`   /me/accounts: ERROR - ${e.response?.data?.error?.message || e.message}`);
    }
    
    // Try with specific fields
    try {
      const pagesRes2 = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { 
          access_token: ACCESS_TOKEN,
          fields: 'id,name,access_token,tasks,category'
        }
      });
      console.log(`   /me/accounts (with fields): ${pagesRes2.data.data?.length || 0} pages`);
      if (pagesRes2.data.data?.length > 0) {
        console.log('   📄 Pages found:', pagesRes2.data.data.map(p => p.name));
      }
    } catch (e) {
      console.log(`   /me/accounts (with fields): ERROR - ${e.response?.data?.error?.message || e.message}`);
    }
    
    console.log('');
    
    // 4. Test if we can access the specific page directly
    console.log('4️⃣ Testing direct page access...');
    const pageId = '264368601404263'; // Tan Estates Manage ID from your screenshot
    try {
      const pageRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
        params: { 
          access_token: ACCESS_TOKEN,
          fields: 'id,name,category,about,is_published'
        }
      });
      console.log('✅ Direct page access works:', pageRes.data);
      console.log('   This suggests the page exists but may not be in /me/accounts');
    } catch (e) {
      console.log(`❌ Direct page access failed: ${e.response?.data?.error?.message || e.message}`);
      if (e.response?.status === 403) {
        console.log('   This suggests you lost admin access to this page');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

fullFacebookDebug();