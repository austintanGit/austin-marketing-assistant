require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function upgradeToBasic() {
  try {
    console.log('🔄 Upgrading test-user-id to Basic plan...\n');
    
    // Update subscription to Basic plan
    await dynamodb.createOrUpdateSubscription('test-user-id', {
      plan: 'basic',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      created_at: new Date().toISOString(),
    });
    
    console.log('✅ Upgraded to Basic plan!');
    
    // Verify the subscription
    const subscription = await dynamodb.getUserSubscription('test-user-id');
    console.log('\n📋 Updated subscription:', subscription.plan, subscription.status);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

upgradeToBasic();