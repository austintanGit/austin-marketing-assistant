// Debug script to check your business profile status
const axios = require('axios');

async function checkProfile() {
  // You'll need to get your token from browser localStorage
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNzc0MTMyNjUwNjIwdm83aTdrMDJ2IiwiZW1haWwiOiJzb21waG9zdGh1bnNhbis4QGdtYWlsLmNvbSIsImlhdCI6MTc3NDE0MDI3NSwiZXhwIjoxNzc2NzMyMjc1fQ.qcT81y5EhPldoHQWJOUH4GsZq04Wnf15JQESIuyO4r8'; // Replace this with your actual token
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('\n🔑 GET YOUR AUTH TOKEN:');
    console.log('1. Open http://localhost:5173 in your browser');
    console.log('2. Press F12 (Developer Tools)');
    console.log('3. Go to: Application > Local Storage > http://localhost:5173');
    console.log('4. Copy the "token" value');
    console.log('5. Replace YOUR_TOKEN_HERE in this file with that token');
    console.log('6. Run: node check-profile.js again\n');
    return;
  }
  
  const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  console.log('🔍 Checking your business profile...\n');

  try {
    // Check if profile exists
    const response = await api.get('/business/profile');
    console.log('✅ BUSINESS PROFILE FOUND!');
    console.log('📊 Profile Data:');
    console.log('- Business Name:', response.data.business.business_name);
    console.log('- Business Type:', response.data.business.business_type);
    console.log('- Address:', response.data.business.address);
    console.log('- Description:', response.data.business.description);
    console.log('- Target Audience:', response.data.business.target_audience);
    console.log('- Tone:', response.data.business.tone);
    console.log('- Created:', response.data.business.created_at);
    
    console.log('\n🎉 Your profile exists! Let\'s test bulk scheduling...');
    
    // Test bulk scheduling
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bulkRequest = {
      business_category: response.data.business.business_type,
      start_date: tomorrow.toISOString().split('T')[0],
      duration_days: 2,
      platforms: ['facebook'],
      image_option: 'none', // Start with no images
      include_logo: false
    };

    console.log('📝 Testing bulk scheduling...');
    const bulkResponse = await api.post('/social/schedule-bulk', bulkRequest);
    console.log('✅ BULK SCHEDULING WORKS!');
    console.log('📅 Scheduled', bulkResponse.data.scheduled_posts_count, 'posts');
    
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ NO BUSINESS PROFILE FOUND');
      console.log('This means the profile creation failed or wasn\'t completed.');
      
      console.log('\n🛠️ SOLUTIONS:');
      console.log('1. Go back to the setup page (Edit Profile in sidebar)');
      console.log('2. Make sure you complete ALL 5 steps');
      console.log('3. Click "Complete Setup" on step 5');
      console.log('4. Check for any error messages during submission');
      
      console.log('\n💡 Let me try creating a profile for you...');
      try {
        const newProfile = {
          business_name: "My Business",
          business_type: "restaurant", // Change this to match what you want
          address: "123 Main St, Austin, TX",
          phone: "(555) 123-4567",
          website: "https://mybusiness.com",
          description: "A great local business serving our community",
          target_audience: "Local customers who appreciate quality service",
          tone: "friendly"
        };

        const createResponse = await api.post('/business/profile', newProfile);
        console.log('✅ Created test profile successfully!');
        console.log('Now try bulk scheduling again in your app.');
        
      } catch (createError) {
        console.log('❌ Failed to create profile:', createError.response?.data?.error || createError.message);
      }
      
    } else {
      console.log('❌ ERROR:', error.response?.data?.error || error.message);
    }
  }
}

checkProfile();