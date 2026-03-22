const api = require('axios').create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with your actual token
    'Content-Type': 'application/json'
  }
});

async function createTestBusinessProfile() {
  try {
    console.log('Creating test business profile...');
    
    const businessProfile = {
      business_name: "Test Business",
      business_type: "restaurant", // Change this to match your category
      address: "123 Main St, Austin, TX",
      phone: "(555) 123-4567",
      website: "https://example.com",
      description: "A great local business providing excellent service to our community.",
      target_audience: "Local customers who value quality and great service",
      tone: "friendly"
    };

    const response = await api.post('/business/profile', businessProfile);
    console.log('✅ Business profile created successfully!');
    console.log(response.data);

    // Now test bulk scheduling
    console.log('\n🚀 Testing bulk scheduling...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bulkRequest = {
      business_category: 'restaurant', // Match your business_type
      start_date: tomorrow.toISOString().split('T')[0],
      duration_days: 3,
      platforms: ['facebook'],
      image_option: 'pexels',
      include_logo: false // Set to true if you have a logo uploaded
    };

    const bulkResponse = await api.post('/social/schedule-bulk', bulkRequest);
    console.log('✅ Bulk scheduling successful!');
    console.log(bulkResponse.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

createTestBusinessProfile();