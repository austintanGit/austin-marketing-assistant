require('dotenv').config();
const dynamodb = require('./src/services/dynamodb');

async function checkUsage() {
  try {
    console.log('🔍 Checking your credit usage...\n');
    
    // Hardcode the user ID since we know from the profile check
    const userId = 'test-user-id'; // This should match your actual user ID
    
    console.log(`👤 User: ${userId}`);
    
    // Check trial usage logs  
    const today = new Date().toISOString().split('T')[0];
    const contentUsage = await dynamodb.getUserUsageLog(userId, 'content_generate_trial', today);
    const imageUsage = await dynamodb.getUserUsageLog(userId, 'image_generate_trial', today);
    const enhanceUsage = await dynamodb.getUserUsageLog(userId, 'post_enhance_trial', today);
    const captionUsage = await dynamodb.getUserUsageLog(userId, 'caption_generate_trial', today);
    
    console.log('\n📊 TODAY\'S TRIAL USAGE (' + today + '):');
    console.log('Content Generation:', contentUsage?.count || 0, '(Total used since trial start)');
    console.log('Image Generation:', imageUsage?.count || 0, '(Total used since trial start)');
    console.log('Post Enhancement:', enhanceUsage?.count || 0, '(Total used since trial start)');
    console.log('Caption Generation:', captionUsage?.count || 0, '(Total used since trial start)');
    
    // Calculate remaining credits (trial limits)
    const contentRemaining = Math.max(0, 10 - (contentUsage?.count || 0));
    const imageRemaining = Math.max(0, 5 - (imageUsage?.count || 0));
    
    console.log('\n🎯 TRIAL LIMITS:');
    console.log('Content Generation: Remaining', contentRemaining, '/ 10');
    console.log('Image Generation: Remaining', imageRemaining, '/ 5');
    
    // Check scheduled posts
    const scheduledPosts = await dynamodb.getScheduledPosts(userId);
    console.log('\n📅 Scheduled Posts:', scheduledPosts?.length || 0);
    
    // Check subscription
    const subscription = await dynamodb.getUserSubscription(userId);
    console.log('\n💳 Subscription:');
    console.log('Plan:', subscription?.plan || 'none');
    console.log('Status:', subscription?.status || 'inactive');
    
    console.log('\n✨ EXPLANATION:');
    console.log('For 7 days of scheduled posts, you need 7 content generation credits.');
    console.log('You currently have', contentRemaining, 'content credits remaining.');
    if (contentRemaining < 7) {
      console.log('🔴 INSUFFICIENT: You need', 7 - contentRemaining, 'more content credits.');
      console.log('💡 SOLUTION: Upgrade to Pro plan or wait for credits to reset.');
    } else {
      console.log('🟢 SUFFICIENT: You have enough content credits for 7 days!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 This might be because the user_id doesn\'t match or there\'s no usage data yet.');
  }
}

checkUsage();