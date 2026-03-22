const axios = require('axios');

async function debugUserProfile() {
  // Replace with your actual token from browser localStorage
  const token = 'YOUR_TOKEN_HERE';
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('❌ Please get your auth token from the browser:');
    console.log('1. Open your browser dev tools (F12)');
    console.log('2. Go to Application > Local Storage > http://localhost:5173');
    console.log('3. Copy the "token" value and replace YOUR_TOKEN_HERE in this script');
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
    console.log('🔍 Debugging user profile and business data...\n');

    // Test 1: Check business profile
    console.log('1. Checking business profile...');
    try {
      const businessResponse = await api.get('/business/profile');
      console.log('✅ Business profile found!');
      console.log('Business data:', JSON.stringify(businessResponse.data, null, 2));
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('❌ No business profile found');
        console.log('This explains the "Business profile not found" error');
      } else {
        console.log('❌ Error checking business profile:', error.response?.data || error.message);
      }
    }

    // Test 2: Check user data structure in DynamoDB
    console.log('\n2. Checking user authentication...');
    try {
      const quotaResponse = await api.get('/social/quota');
      console.log('✅ User authenticated, quota info:');
      console.log('Plan:', quotaResponse.data.plan);
      console.log('User ID would be extracted from the token');
    } catch (error) {
      console.log('❌ Auth error:', error.response?.data || error.message);
    }

    // Test 3: Try to create a minimal business profile for testing
    console.log('\n3. Attempting to create a test business profile...');
    try {
      const testProfile = {
        business_name: "Test Restaurant",
        business_type: "restaurant",
        address: "123 Main St, Austin, TX",
        phone: "(555) 123-4567",
        website: "https://example.com",
        description: "A great local restaurant serving delicious food",
        target_audience: "Food lovers and local Austin residents",
        tone: "friendly"
      };

      const createResponse = await api.post('/business/profile', testProfile);
      console.log('✅ Test business profile created successfully!');
      console.log('Response:', JSON.stringify(createResponse.data, null, 2));
      
      // Now test bulk scheduling
      console.log('\n4. Testing bulk scheduling with new profile...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const bulkRequest = {
        business_category: 'restaurant',
        start_date: tomorrow.toISOString().split('T')[0],
        duration_days: 2,
        platforms: ['facebook'],
        image_option: 'none', // Start with no images for testing
        include_logo: false
      };

      const bulkResponse = await api.post('/social/schedule-bulk', bulkRequest);
      console.log('✅ Bulk scheduling now works!');
      console.log('Scheduled posts:', bulkResponse.data.scheduled_posts_count);

    } catch (error) {
      console.log('❌ Error creating business profile:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugUserProfile();