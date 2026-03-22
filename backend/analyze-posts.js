// Debug script to see what posts were created
const axios = require('axios');

async function analyzePosts() {
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
    console.log('📊 Analyzing your scheduled posts...\n');
    
    const response = await api.get('/social/scheduled-posts');
    const posts = response.data.posts || [];
    
    console.log(`📈 Total posts: ${posts.length}\n`);
    
    // Group by date
    const byDate = {};
    posts.forEach(post => {
      const date = new Date(post.scheduled_time).toDateString();
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(post);
    });
    
    console.log('📅 Posts by date:');
    Object.keys(byDate).sort().forEach(date => {
      console.log(`  ${date}: ${byDate[date].length} posts`);
    });
    
    // Group by template
    const byTemplate = {};
    posts.forEach(post => {
      const template = post.template_id || 'manual';
      if (!byTemplate[template]) byTemplate[template] = 0;
      byTemplate[template]++;
    });
    
    console.log('\n🏷️ Posts by template:');
    Object.entries(byTemplate).forEach(([template, count]) => {
      console.log(`  ${template}: ${count} posts`);
    });
    
    // Show sample posts
    console.log('\n📝 Sample posts (first 3):');
    posts.slice(0, 3).forEach((post, i) => {
      console.log(`  ${i+1}. ${new Date(post.scheduled_time).toLocaleString()}`);
      console.log(`     Template: ${post.template_id || 'manual'}`);
      console.log(`     Message: ${(post.content?.message || post.message || '').substring(0, 50)}...`);
      console.log('');
    });
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data?.error || error.message);
  }
}

analyzePosts();