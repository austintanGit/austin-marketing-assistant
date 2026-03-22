// Quick test without needing auth tokens
const axios = require('axios');

async function simpleTest() {
  console.log('🧪 Testing API endpoints without auth...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connection...');
    const response = await axios.get('http://localhost:3001/api/social/business-templates');
    console.log('Server response status:', response.status);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Server is running (got 401 as expected - auth required)');
    } else {
      console.log('❌ Server connection failed:', error.message);
      return;
    }
  }

  // Show instructions for getting auth token
  console.log('\n📝 To test with your actual profile:');
  console.log('1. Open your browser and go to http://localhost:5173');
  console.log('2. Log into your app');
  console.log('3. Open Developer Tools (F12)');
  console.log('4. Go to: Application > Local Storage > http://localhost:5173');
  console.log('5. Copy the "token" value');
  console.log('6. Edit debug-profile.js and replace YOUR_TOKEN_HERE with your token');
  console.log('7. Run: node debug-profile.js');
  
  console.log('\n💡 Quick fix: Complete your business profile setup first:');
  console.log('- Click "Edit Profile" in the sidebar');
  console.log('- Complete all 5 steps of the onboarding');
  console.log('- Then try bulk scheduling again');
}

simpleTest();