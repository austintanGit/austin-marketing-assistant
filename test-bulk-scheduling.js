const axios = require('axios');

// Test script for bulk scheduling functionality
// Make sure your backend is running first!

const API_BASE = 'http://localhost:3001/api/social';

// You'll need to get a valid JWT token from your app
// Replace this with a real token from your login
const JWT_TOKEN = 'your-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testBulkScheduling() {
  console.log('🧪 Testing Bulk Scheduling API...\n');

  try {
    // 1. Get available business templates
    console.log('1️⃣ Fetching available business templates...');
    const templatesResponse = await axios.get(`${API_BASE}/business-templates`, { headers });
    console.log('✅ Available templates:', Object.keys(templatesResponse.data.templates));
    
    // Show restaurant template details as example
    const restaurantTemplates = templatesResponse.data.templates.restaurant;
    console.log('\n📋 Restaurant template example:');
    restaurantTemplates.templates.forEach(template => {
      console.log(`   - ${template.name} (${template.content_type})`);
      console.log(`     Schedule: ${JSON.stringify(template.schedule)}`);
    });

    // 2. Generate bulk schedule for restaurant category
    console.log('\n2️⃣ Generating 7-day bulk schedule for restaurant...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start tomorrow
    
    const bulkResponse = await axios.post(`${API_BASE}/schedule-bulk`, {
      business_category: 'restaurant',
      start_date: startDate.toISOString(),
      duration_days: 7,
      platforms: ['facebook']
    }, { headers });

    console.log('✅ Bulk schedule created:', bulkResponse.data);

    // 3. Verify scheduled posts were created
    console.log('\n3️⃣ Checking created scheduled posts...');
    const postsResponse = await axios.get(`${API_BASE}/scheduled-posts`, { headers });
    const restaurantPosts = postsResponse.data.posts.filter(p => p.business_category === 'restaurant');
    
    console.log(`📊 Found ${restaurantPosts.length} restaurant posts scheduled`);
    
    // Show sample posts
    console.log('\n📝 Sample scheduled posts:');
    restaurantPosts.slice(0, 3).forEach(post => {
      console.log(`   - ${post.scheduled_time}: ${post.content.message.substring(0, 80)}...`);
      console.log(`     Template: ${post.template_id}, Type: ${post.content_type}`);
    });

    // 4. Test different business category
    console.log('\n4️⃣ Testing cafe category with 3-day schedule...');
    const cafeStartDate = new Date();
    cafeStartDate.setDate(cafeStartDate.getDate() + 8); // Start after restaurant posts
    
    const cafeResponse = await axios.post(`${API_BASE}/schedule-bulk`, {
      business_category: 'cafe',
      start_date: cafeStartDate.toISOString(),
      duration_days: 3,
      platforms: ['facebook']
    }, { headers });

    console.log('✅ Cafe schedule created:', cafeResponse.data);

    // 5. Show final summary
    console.log('\n5️⃣ Final summary...');
    const finalPostsResponse = await axios.get(`${API_BASE}/scheduled-posts`, { headers });
    const allPosts = finalPostsResponse.data.posts;
    
    const postsByCategory = {};
    allPosts.forEach(post => {
      if (post.business_category) {
        postsByCategory[post.business_category] = (postsByCategory[post.business_category] || 0) + 1;
      }
    });

    console.log('📊 Posts by category:', postsByCategory);
    console.log('📅 Date range:', 
      new Date(Math.min(...allPosts.map(p => new Date(p.scheduled_time)))).toDateString(),
      'to',
      new Date(Math.max(...allPosts.map(p => new Date(p.scheduled_time)))).toDateString()
    );

    console.log('\n🎉 Bulk scheduling test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('\n💡 Note: Bulk scheduling requires Basic or Pro plan (not trial)');
    } else if (error.response?.status === 404) {
      console.log('\n💡 Note: Make sure you have completed business setup first');
    }
  }
}

async function testTemplateCategories() {
  console.log('🧪 Testing all business category templates...\n');

  try {
    const templatesResponse = await axios.get(`${API_BASE}/business-templates`, { headers });
    const templates = templatesResponse.data.templates;

    Object.keys(templates).forEach(category => {
      const categoryData = templates[category];
      console.log(`\n📋 ${categoryData.name.toUpperCase()}`);
      console.log(`   Templates: ${categoryData.templates.length}`);
      
      categoryData.templates.forEach(template => {
        const freq = template.schedule.frequency;
        const times = template.schedule.times.join(', ');
        const days = template.schedule.days_of_week ? ` on days ${template.schedule.days_of_week.join(',')}` : '';
        
        console.log(`   - ${template.name}: ${freq} at ${times}${days}`);
      });
    });

  } catch (error) {
    console.error('❌ Template test failed:', error.response?.data || error.message);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  console.log('⚠️  Before running this test:');
  console.log('1. Make sure your backend is running (npm run dev)');
  console.log('2. Update JWT_TOKEN variable with a valid token');
  console.log('3. Complete your business setup first');
  console.log('4. Make sure you have Basic or Pro plan (not trial)\n');
  
  const testType = process.argv[2];
  
  if (testType === 'templates') {
    testTemplateCategories();
  } else {
    testBulkScheduling();
  }
}

module.exports = { testBulkScheduling, testTemplateCategories };