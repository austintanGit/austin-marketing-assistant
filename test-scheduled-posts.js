const axios = require('axios');

// Test script for scheduled posts functionality
// Make sure your backend is running first!

const API_BASE = 'http://localhost:3001/api/social';

// You'll need to get a valid JWT token from your app
// Replace this with a real token from your login
const JWT_TOKEN = 'your-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testScheduledPosts() {
  console.log('🧪 Testing Scheduled Posts API...\n');

  try {
    // 1. Schedule a post for 1 minute from now
    const scheduleTime = new Date(Date.now() + 60000); // 1 minute from now
    console.log('1️⃣ Scheduling a test post for:', scheduleTime.toISOString());
    
    const scheduleResponse = await axios.post(`${API_BASE}/schedule-post`, {
      message: 'Test scheduled post! 🚀 This was posted automatically.',
      scheduled_time: scheduleTime.toISOString(),
      platform: 'facebook'
    }, { headers });

    console.log('✅ Post scheduled successfully:', scheduleResponse.data);
    const postId = scheduleResponse.data.post_id;

    // 2. Get all scheduled posts
    console.log('\n2️⃣ Fetching all scheduled posts...');
    const getResponse = await axios.get(`${API_BASE}/scheduled-posts`, { headers });
    console.log('📋 Scheduled posts:', getResponse.data.posts.length, 'found');
    
    // 3. Wait and test manual processing
    console.log('\n3️⃣ Waiting 65 seconds then testing manual processing...');
    await new Promise(resolve => setTimeout(resolve, 65000));
    
    const processResponse = await axios.post(`${API_BASE}/process-scheduled-posts`, {}, { headers });
    console.log('⚡ Manual processing result:', processResponse.data);

    // 4. Check updated scheduled posts
    console.log('\n4️⃣ Checking post status after processing...');
    const finalGetResponse = await axios.get(`${API_BASE}/scheduled-posts`, { headers });
    const processedPost = finalGetResponse.data.posts.find(p => p.post_id === postId);
    console.log('📊 Post status:', processedPost?.status || 'not found');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  console.log('⚠️  Before running this test:');
  console.log('1. Make sure your backend is running (npm run dev)');
  console.log('2. Update JWT_TOKEN variable with a valid token');
  console.log('3. Make sure you have a Facebook page connected\n');
  
  testScheduledPosts();
}

module.exports = { testScheduledPosts };