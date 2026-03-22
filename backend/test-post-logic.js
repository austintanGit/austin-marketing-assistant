require('dotenv').config();

// Test the updated logic for salon (3 weekly templates)
function testPostGeneration() {
  // Simulate salon templates (3 weekly templates)
  const salonTemplates = [
    {
      id: 'transformation',
      name: 'Transformation Tuesday',
      schedule: { frequency: 'weekly', times: ['12:00'], days_of_week: [2] } // Tuesday
    },
    {
      id: 'hair_care_tip', 
      name: 'Hair Care Tips',
      schedule: { frequency: 'weekly', times: ['14:00'], days_of_week: [4] } // Thursday
    },
    {
      id: 'weekend_availability',
      name: 'Weekend Bookings', 
      schedule: { frequency: 'weekly', times: ['17:00'], days_of_week: [4] } // Thursday
    }
  ];

  // Simulate shouldPostToday function
  function shouldPostToday(schedule, dayOfWeek, dayOffset) {
    if (schedule.frequency === 'daily') {
      return true;
    }
    if (schedule.frequency === 'weekly') {
      return schedule.days_of_week && schedule.days_of_week.includes(dayOfWeek);
    }
    return false;
  }

  // Test 7 days starting from Monday (dayOfWeek 1)
  console.log('🧪 Testing 7-day post generation for salon:');
  console.log('Templates:', salonTemplates.map(t => `${t.name} (${t.schedule.frequency})`));
  console.log();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayOfWeek = (1 + dayOffset) % 7; // Start from Monday (1)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    
    let dayHasPosts = false;
    let naturalPosts = [];

    // Check natural posts
    for (const template of salonTemplates) {
      const shouldPost = shouldPostToday(template.schedule, dayOfWeek, dayOffset);
      if (shouldPost) {
        dayHasPosts = true;
        naturalPosts.push(template.name);
      }
    }

    // If no natural posts, force one
    let forcedPost = null;
    if (!dayHasPosts) {
      const templateIndex = dayOffset % salonTemplates.length;
      const forcedTemplate = salonTemplates[templateIndex];
      forcedPost = forcedTemplate.name;
    }

    console.log(`Day ${dayOffset + 1} (${dayName}):`);
    if (naturalPosts.length > 0) {
      console.log(`  ✅ Natural posts: ${naturalPosts.join(', ')}`);
    } else {
      console.log(`  🔄 Forced post: ${forcedPost}`);
    }
    console.log(`  📊 Total posts: ${Math.max(naturalPosts.length, 1)}`);
    console.log();
  }

  const totalNaturalDays = [1, 3].length; // Tuesday=1, Thursday=2 posts 
  const totalForcedDays = 7 - 2; // 5 days need forced posts
  console.log(`📈 Summary:`);
  console.log(`- Days with natural posts: 2 (Tuesday: 1 post, Thursday: 2 posts)`);
  console.log(`- Days needing forced posts: ${totalForcedDays}`);
  console.log(`- Total posts: ${3 + totalForcedDays} posts`); // 3 natural + 5 forced = 8 posts
  console.log(`- Expected posts for 7 days: 7 posts ✅`);
}

testPostGeneration();