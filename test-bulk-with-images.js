const axios = require('axios');

// Test script for bulk scheduling with images
async function testBulkSchedulingWithImages() {
  const API_BASE = 'http://localhost:3001/api';
  
  // You need to replace this with a valid token from your browser dev tools
  // Open the browser, log in, go to localStorage and copy the token
  const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNzc0MTMyNjUwNjIwIiwidXNlcm5hbWUiOiJhdXN0aW50YW4iLCJlbWFpbCI6ImF1c3RpbnRhbjcwQGljbG91ZC5jb20iLCJpYXQiOjE3MzIyMzI1MTR9.Nnq4WO7Cp_Mz7q09IAbXQ2J46-LrQYEpS43oXz4o4fQ';
  
  const api = axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('🚀 Testing Bulk Scheduling with Images...\n');

    // Test 1: Get business templates
    console.log('1. Testing /business-templates endpoint...');
    const templatesResponse = await api.get('/social/business-templates');
    console.log('✅ Business templates loaded:', Object.keys(templatesResponse.data.templates).length, 'categories\n');

    // Test 2: Schedule bulk posts with images
    console.log('2. Testing bulk scheduling with Pexels images...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bulkRequest = {
      business_category: 'restaurant', // You can change this to match your business type
      start_date: tomorrow.toISOString().split('T')[0], // Tomorrow's date
      duration_days: 3, // Just 3 days for testing
      platforms: ['facebook'],
      image_option: 'pexels', // Enable Pexels images
      include_logo: true // Include logo stamping
    };

    console.log('Request payload:', JSON.stringify(bulkRequest, null, 2));
    
    const bulkResponse = await api.post('/social/schedule-bulk', bulkRequest);
    console.log('✅ Bulk scheduling successful!');
    console.log('Response:', JSON.stringify(bulkResponse.data, null, 2));

    // Test 3: Verify scheduled posts were created
    console.log('\n3. Verifying scheduled posts...');
    const postsResponse = await api.get('/social/scheduled-posts');
    console.log('✅ Scheduled posts count:', postsResponse.data.posts.length);
    
    if (postsResponse.data.posts.length > 0) {
      const firstPost = postsResponse.data.posts[0];
      console.log('First post preview:');
      console.log('- Message:', firstPost.content?.message?.substring(0, 100) + '...');
      console.log('- Has image:', !!firstPost.content?.image_url);
      console.log('- Image URL:', firstPost.content?.image_url || 'No image');
      console.log('- Scheduled for:', firstPost.scheduled_time);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Your auth token might be expired. To get a fresh token:');
      console.log('1. Open your browser and go to http://localhost:5173');
      console.log('2. Log in to the application');
      console.log('3. Open Developer Tools (F12)');
      console.log('4. Go to Application > Local Storage > http://localhost:5173');
      console.log('5. Copy the "token" value and replace AUTH_TOKEN in this script');
    }
  }
}

// Run the test
testBulkSchedulingWithImages();