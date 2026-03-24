const axios = require('axios');

// Create a test JWT token to access the API
// You'll need to replace this with your actual JWT token from the frontend
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

async function debugScheduledPostsViaAPI() {
    console.log('🔍 Debugging scheduled posts via API...\n');
    
    try {
        // First, we need a JWT token. You can either:
        // 1. Copy it from your browser's localStorage
        // 2. Or create a temporary one using the backend
        
        console.log('To debug your scheduled posts, you need to:');
        console.log('');
        console.log('1. Open your frontend in browser');
        console.log('2. Open Developer Tools > Application > Local Storage');
        console.log('3. Find the "token" or "jwt" value');
        console.log('4. Run this script with the token:');
        console.log('   TOKEN="your-jwt-here" node debug-scheduler-api.js');
        console.log('');
        
        const token = process.env.TOKEN;
        if (!token) {
            console.log('❌ No JWT token provided. Please set TOKEN environment variable.');
            console.log('');
            console.log('Alternative: Manually test the endpoints:');
            console.log('- GET /api/social/scheduled-posts');
            console.log('- POST /api/social/process-scheduled-posts');
            return;
        }
        
        const headers = { Authorization: `Bearer ${token}` };
        
        // Check scheduled posts
        console.log('1. Checking scheduled posts...');
        const postsResponse = await axios.get(`${API_BASE}/social/scheduled-posts`, { headers });
        const posts = postsResponse.data.posts || [];
        
        console.log(`   Found ${posts.length} scheduled posts`);
        
        if (posts.length > 0) {
            console.log('   Sample post:');
            console.log('  ', JSON.stringify(posts[0], null, 2));
            
            // Check for overdue posts
            const now = new Date();
            const overduePosts = posts.filter(post => 
                post.status === 'pending' && new Date(post.scheduled_time) < now
            );
            
            console.log(`   ${overduePosts.length} posts are overdue and should have been published`);
            
            if (overduePosts.length > 0) {
                console.log('   Sample overdue post:');
                console.log('  ', JSON.stringify(overduePosts[0], null, 2));
            }
        }
        
        // Test manual processing
        console.log('\n2. Testing manual post processing...');
        const processResponse = await axios.post(`${API_BASE}/social/process-scheduled-posts`, {}, { headers });
        console.log('   Process response:', processResponse.data);
        
        // Check social connections
        console.log('\n3. Checking social connections...');
        const connectionsResponse = await axios.get(`${API_BASE}/social/connections`, { headers });
        const connections = connectionsResponse.data.connections || {};
        
        console.log('   Available connections:', Object.keys(connections));
        Object.entries(connections).forEach(([platform, connection]) => {
            console.log(`   ${platform}:`, {
                connected: connection.connected,
                page_name: connection.page_name,
                page_id: connection.page_id
            });
        });
        
        console.log('\n✅ Debug complete!');
        
    } catch (error) {
        console.error('❌ API Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 The JWT token is invalid or expired.');
            console.log('   Get a fresh token from your browser and try again.');
        }
    }
}

debugScheduledPostsViaAPI();