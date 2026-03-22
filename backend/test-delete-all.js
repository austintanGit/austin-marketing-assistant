// Test delete all functionality
const axios = require('axios');

async function testDeleteAll() {
  const token = 'YOUR_TOKEN_HERE'; // Replace with your token
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('Please replace YOUR_TOKEN_HERE with your actual auth token');
    return;
  }
  
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('🧪 Testing delete all functionality...\n');
    
    // Check posts before deletion
    console.log('1. Checking posts before deletion...');
    const beforeResponse = await api.get('/social/scheduled-posts');
    const postsBefore = beforeResponse.data.posts || [];
    console.log(`   Found ${postsBefore.length} posts before deletion\n`);
    
    if (postsBefore.length === 0) {
      console.log('❌ No posts to delete. Create some posts first.');
      return;
    }

    // Delete all posts
    console.log('2. Deleting all posts...');
    const deleteResponse = await api.delete('/social/scheduled-posts');
    console.log(`   ✅ API response: ${deleteResponse.data.message}\n`);
    
    // Check posts after deletion
    console.log('3. Checking posts after deletion...');
    const afterResponse = await api.get('/social/scheduled-posts');
    const postsAfter = afterResponse.data.posts || [];
    console.log(`   Found ${postsAfter.length} posts after deletion\n`);
    
    // Results
    if (postsAfter.length === 0) {
      console.log('🎉 SUCCESS! All posts deleted correctly.');
    } else {
      console.log(`❌ FAILED! ${postsAfter.length} posts still remain.`);
      console.log('This indicates a data type mismatch or database issue.');
      
      // Show a sample remaining post for debugging
      if (postsAfter.length > 0) {
        console.log('\n🔍 Sample remaining post:');
        console.log(`   user_id: ${postsAfter[0].user_id} (${typeof postsAfter[0].user_id})`);
        console.log(`   post_id: ${postsAfter[0].post_id}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.error || error.message);
  }
}

testDeleteAll();