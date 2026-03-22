require('dotenv').config();
const jwt = require('jsonwebtoken');

// Create a test JWT token for the API call
const testUser = {
  userId: 'test-user-id',
  email: 'test@example.com'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
console.log('🔑 Test JWT Token:');
console.log(token);
console.log('\n📋 Use this token in your browser\'s developer tools:');
console.log('1. Open browser dev tools (F12)');
console.log('2. Go to Application/Storage > Local Storage');
console.log('3. Find "token" and set its value to the above token');
console.log('4. Refresh the page');
console.log('\n🔗 Or test the API directly:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5001/api/social/quota`);