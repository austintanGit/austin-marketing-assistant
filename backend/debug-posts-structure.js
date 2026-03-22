// Debug script to check scheduled posts structure
const axios = require('axios');

async function checkPostsStructure() {
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
    console.log('🔍 Checking scheduled posts structure...\n');
    
    const response = await api.get('/social/scheduled-posts');
    const posts = response.data.posts || [];
    
    console.log(`Found ${posts.length} scheduled posts`);
    
    if (posts.length > 0) {
      console.log('\n📊 First post structure:');
      console.log(JSON.stringify(posts[0], null, 2));
      
      console.log('\n🔍 Key fields:');
      console.log('- post_id:', posts[0].post_id);
      console.log('- platform:', posts[0].platform);
      console.log('- status:', posts[0].status);
      console.log('- scheduled_time:', posts[0].scheduled_time);
      console.log('- content:', posts[0].content);
      console.log('- message (direct):', posts[0].message);
      console.log('- content.message:', posts[0].content?.message);
      console.log('- content.image_url:', posts[0].content?.image_url);
      
    } else {
      console.log('❌ No scheduled posts found');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.error || error.message);
  }
}

checkPostsStructure();