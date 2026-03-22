require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function findRecentUsers() {
  try {
    console.log('🔍 Looking for recent user accounts...\n');
    
    // Since we don't have a scan method, let's try to find users through different approaches
    console.log('💡 To find your actual user account, I need some information:');
    console.log('1. What email did you sign up with?');
    console.log('2. What business name did you use?');
    console.log('3. Or check your browser localStorage for the "token" value');
    console.log('\n🔧 Steps to get your user info:');
    console.log('1. Open browser dev tools (F12)');
    console.log('2. Go to Application tab > Local Storage');
    console.log('3. Look for your domain (localhost:5173 or your domain)');
    console.log('4. Find the "token" entry and copy its value');
    console.log('5. Paste that token here so I can decode your actual user ID');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findRecentUsers();