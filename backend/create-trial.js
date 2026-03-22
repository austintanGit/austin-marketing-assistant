require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function createTrialSubscription() {
  try {
    console.log('🔍 Checking subscription for test-user-id...\n');
    
    // Check current subscription
    const existingSub = await dynamodb.getUserSubscription('test-user-id');
    console.log('Current subscription:', existingSub);
    
    if (!existingSub || existingSub.plan !== 'trial') {
      console.log('\n🆕 Creating trial subscription...');
      
      await dynamodb.createOrUpdateSubscription('test-user-id', {
        plan: 'trial',
        status: 'active',
        created_at: new Date().toISOString(),
      });
      
      console.log('✅ Trial subscription created!');
    } else {
      console.log('✅ Trial subscription already exists');
    }
    
    // Verify the subscription
    const newSub = await dynamodb.getUserSubscription('test-user-id');
    console.log('\n📋 Updated subscription:', newSub);
    
    // Test the quota endpoint again
    console.log('\n🧪 Testing quota endpoint...');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTrialSubscription();