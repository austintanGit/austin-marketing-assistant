const axios = require('axios');

async function checkBusinessProfile() {
  // Get token from browser localStorage or set manually
  const token = 'YOUR_TOKEN_HERE'; // Replace with actual token from browser dev tools
  
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    console.log('🔍 Checking business profile...');
    const response = await api.get('/business/profile');
    
    if (response.data.business) {
      console.log('✅ Business profile found!');
      console.log('Business Name:', response.data.business.business_name);
      console.log('Business Type:', response.data.business.business_type);
      console.log('Description:', response.data.business.description);
      console.log('Target Audience:', response.data.business.target_audience);
      console.log('Tone:', response.data.business.tone);
      
      // Now we can test bulk scheduling
      console.log('\n🚀 Business profile exists, you should be able to use bulk scheduling!');
      console.log('Try the bulk scheduling modal again.');
    } else {
      console.log('❌ No business profile found. You need to complete the setup first.');
    }
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ No business profile found. You need to complete the setup first.');
      console.log('\nTo fix this:');
      console.log('1. Go to your app setup page');
      console.log('2. Complete all business profile fields');
      console.log('3. Or use the create-test-business.js script to create a test profile');
    } else {
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

checkBusinessProfile();