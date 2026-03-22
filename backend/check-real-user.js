require('dotenv').config();
const jwt = require('jsonwebtoken');
const dynamodb = require('./src/services/dynamodb');

async function checkRealUser() {
  try {
    // Decode the JWT token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNzc0MTQ1NDY1MjE3cTVsdDV4d3BuIiwiZW1haWwiOiJzb21waG9zdGh1bnNhbisxMUBnbWFpbC5jb20iLCJpYXQiOjE3NzQxNDU0NjUsImV4cCI6MTc3NjczNzQ2NX0.T67qF-pqKopWoyESobzUbTLIfPBknd8KUxmwcyzbjo8';
    
    const decoded = jwt.decode(token);
    console.log('🔓 Decoded JWT Token:');
    console.log('- User ID:', decoded.userId);
    console.log('- Email:', decoded.email);
    console.log('- Issued:', new Date(decoded.iat * 1000).toISOString());
    console.log('- Expires:', new Date(decoded.exp * 1000).toISOString());
    
    const userId = decoded.userId;
    console.log('\n👤 Checking user account...');
    
    // Get user data
    const user = await dynamodb.getUserById(userId);
    console.log('User exists:', !!user);
    if (user) {
      console.log('- Business Name:', user.business_name);
      console.log('- Business Type:', user.business_type);
    }
    
    // Check subscription
    const subscription = await dynamodb.getUserSubscription(userId);
    console.log('\n💳 Subscription Status:');
    console.log('- Plan:', subscription?.plan || 'none');
    console.log('- Status:', subscription?.status || 'inactive');
    console.log('- Billing Cycle:', subscription?.billing_cycle || 'N/A');
    
    // Test quota API with real token
    console.log('\n🧪 Testing quota API with your token...');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRealUser();