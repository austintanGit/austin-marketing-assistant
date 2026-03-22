// Business Category Templates for Automated Posting
// Each category has specific content types and optimal posting schedules

const BUSINESS_CATEGORY_TEMPLATES = {
  restaurant: {
    name: 'Restaurant',
    templates: [
      {
        id: 'daily_special',
        name: 'Daily Special',
        prompt: `Create an appetizing Facebook post about today's chef special at {business_name}. 
                 Make it mouth-watering and include a call-to-action to visit today. 
                 Mention the special is available until sold out. 
                 Use 1-2 food emojis and keep it under 150 characters.
                 End with relevant hashtags like #ChefSpecial #FreshToday.`,
        schedule: { frequency: 'daily', times: ['11:00'] }, // 11 AM daily
        content_type: 'promotional'
      },
      {
        id: 'behind_scenes',
        name: 'Behind the Scenes',
        prompt: `Write about the behind-the-scenes preparation at {business_name} kitchen. 
                 Showcase the craftsmanship, early morning prep, or special cooking techniques. 
                 Make it personal and authentic, showing the passion behind the food.
                 Use 1-2 chef/cooking emojis and include hashtags like #BehindTheScenes #MadeWithLove.`,
        schedule: { frequency: 'weekly', times: ['09:00'], days_of_week: [3] }, // Wednesday 9 AM
        content_type: 'engagement'
      },
      {
        id: 'weekend_special',
        name: 'Weekend Special',
        prompt: `Create an exciting post about {business_name}'s weekend offerings. 
                 This could be weekend brunch, dinner specials, or extended hours.
                 Create excitement for the weekend and encourage reservations or visits.
                 Include weekend-themed emojis and hashtags like #WeekendSpecial #WeekendVibes.`,
        schedule: { frequency: 'weekly', times: ['17:00'], days_of_week: [5] }, // Friday 5 PM
        content_type: 'promotional'
      }
    ]
  },

  cafe: {
    name: 'Cafe/Coffee Shop',
    templates: [
      {
        id: 'morning_coffee',
        name: 'Morning Coffee Feature',
        prompt: `Create an energizing morning post about today's coffee selection at {business_name}.
                 Feature a specific coffee, brewing method, or morning pastry pairing.
                 Make it perfect for the morning coffee crowd and work-from-home customers.
                 Use coffee emojis and hashtags like #MorningBrew #CoffeeTime.`,
        schedule: { frequency: 'daily', times: ['07:30'] }, // 7:30 AM daily
        content_type: 'promotional'
      },
      {
        id: 'afternoon_boost',
        name: 'Afternoon Pick-Me-Up',
        prompt: `Write about the perfect afternoon break at {business_name}.
                 Focus on afternoon treats, specialty drinks, or the cozy atmosphere.
                 Target the 2-4 PM crowd looking for an energy boost.
                 Include afternoon/energy emojis and hashtags like #AfternoonTreat #EnergyBoost.`,
        schedule: { frequency: 'daily', times: ['14:00'] }, // 2 PM daily
        content_type: 'lifestyle'
      },
      {
        id: 'community_space',
        name: 'Community & Events',
        prompt: `Highlight {business_name} as a community gathering space.
                 Mention events, meetings, study groups, or local partnerships.
                 Emphasize the welcoming atmosphere and community connection.
                 Use community emojis and hashtags like #CommunityHub #LocalGathering.`,
        schedule: { frequency: 'weekly', times: ['18:00'], days_of_week: [1] }, // Monday 6 PM
        content_type: 'engagement'
      }
    ]
  },

  retail: {
    name: 'Retail Store',
    templates: [
      {
        id: 'new_arrivals',
        name: 'New Arrivals',
        prompt: `Showcase exciting new arrivals at {business_name}.
                 Highlight 1-2 specific products that just came in.
                 Create curiosity and urgency to visit and see the new items.
                 Use shopping/new emojis and hashtags like #NewArrivals #JustIn.`,
        schedule: { frequency: 'weekly', times: ['10:00'], days_of_week: [1, 4] }, // Monday & Thursday 10 AM
        content_type: 'promotional'
      },
      {
        id: 'styling_tip',
        name: 'Styling Tips',
        prompt: `Share a helpful styling or product tip from {business_name}.
                 Give practical advice on how to use, style, or care for products.
                 Position the business as knowledgeable and helpful.
                 Use tip/lightbulb emojis and hashtags like #StylingTip #ProTip.`,
        schedule: { frequency: 'weekly', times: ['15:00'], days_of_week: [2] }, // Tuesday 3 PM
        content_type: 'educational'
      },
      {
        id: 'customer_feature',
        name: 'Customer Spotlight',
        prompt: `Feature a happy customer at {business_name} (without using real names).
                 Show how customers style or use the products.
                 Create social proof and community feeling.
                 Use heart/star emojis and hashtags like #HappyCustomer #CommunityLove.`,
        schedule: { frequency: 'weekly', times: ['16:00'], days_of_week: [5] }, // Friday 4 PM
        content_type: 'social_proof'
      }
    ]
  },

  salon: {
    name: 'Hair Salon/Barbershop',
    templates: [
      {
        id: 'transformation',
        name: 'Transformation Tuesday',
        prompt: `Create an exciting transformation post for {business_name}.
                 Describe an amazing before/after transformation (without specific customer details).
                 Highlight the skill and artistry of the stylists.
                 Use transformation emojis and hashtags like #TransformationTuesday #NewLook.`,
        schedule: { frequency: 'weekly', times: ['12:00'], days_of_week: [2] }, // Tuesday 12 PM
        content_type: 'showcase'
      },
      {
        id: 'hair_care_tip',
        name: 'Hair Care Tips',
        prompt: `Share professional hair care advice from the experts at {business_name}.
                 Give seasonal tips, product recommendations, or styling advice.
                 Show expertise and build trust with potential clients.
                 Use hair/tip emojis and hashtags like #HairCareTip #HealthyHair.`,
        schedule: { frequency: 'weekly', times: ['14:00'], days_of_week: [4] }, // Thursday 2 PM
        content_type: 'educational'
      },
      {
        id: 'weekend_availability',
        name: 'Weekend Bookings',
        prompt: `Promote weekend availability at {business_name}.
                 Encourage booking for special occasions, date nights, or weekend events.
                 Create urgency around weekend appointments.
                 Use calendar/booking emojis and hashtags like #WeekendBooking #SpecialOccasion.`,
        schedule: { frequency: 'weekly', times: ['17:00'], days_of_week: [4] }, // Thursday 5 PM
        content_type: 'promotional'
      }
    ]
  },

  auto_repair: {
    name: 'Auto Repair',
    templates: [
      {
        id: 'maintenance_tip',
        name: 'Maintenance Tips',
        prompt: `Share important car maintenance advice from the experts at {business_name}.
                 Give seasonal tips, warning signs to watch for, or preventive care advice.
                 Help customers save money and stay safe.
                 Use car/tool emojis and hashtags like #MaintenanceTip #CarCare.`,
        schedule: { frequency: 'weekly', times: ['08:00'], days_of_week: [1] }, // Monday 8 AM
        content_type: 'educational'
      },
      {
        id: 'customer_success',
        name: 'Customer Success Story',
        prompt: `Share a customer success story from {business_name} (without personal details).
                 Highlight a problem solved, money saved, or excellent service provided.
                 Build trust and show the value of professional service.
                 Use success/check emojis and hashtags like #CustomerSuccess #ProblemSolved.`,
        schedule: { frequency: 'weekly', times: ['16:00'], days_of_week: [3] }, // Wednesday 4 PM
        content_type: 'social_proof'
      },
      {
        id: 'seasonal_reminder',
        name: 'Seasonal Service Reminder',
        prompt: `Remind customers about seasonal car care needs at {business_name}.
                 Focus on upcoming weather changes, seasonal maintenance, or service specials.
                 Create urgency around seasonal preparation.
                 Use season/weather emojis and hashtags like #SeasonalCare #WinterReady.`,
        schedule: { frequency: 'weekly', times: ['10:00'], days_of_week: [5] }, // Friday 10 AM
        content_type: 'seasonal'
      }
    ]
  },

  food_truck: {
    name: 'Food Truck',
    templates: [
      {
        id: 'location_announcement',
        name: 'Daily Location',
        prompt: `Announce {business_name}'s location for today!
                 Build excitement about the location and what's available.
                 Include operating hours and any daily specials.
                 Use location/truck emojis and hashtags like #FoodTruck #FindUs.`,
        schedule: { frequency: 'daily', times: ['10:30'] }, // 10:30 AM daily
        content_type: 'location'
      },
      {
        id: 'menu_highlight',
        name: 'Menu Highlight',
        prompt: `Feature a signature dish from {business_name}'s menu.
                 Make it sound irresistible and perfect for on-the-go eating.
                 Highlight what makes this dish special or unique.
                 Use food emojis and hashtags like #SignatureDish #FoodTruckFavorite.`,
        schedule: { frequency: 'daily', times: ['12:00'] }, // 12 PM daily
        content_type: 'promotional'
      },
      {
        id: 'event_participation',
        name: 'Event Participation',
        prompt: `Announce {business_name}'s participation in local events, festivals, or markets.
                 Create excitement about special event offerings or limited-time items.
                 Encourage followers to find you at the event.
                 Use event/festival emojis and hashtags like #LocalEvent #Festival.`,
        schedule: { frequency: 'weekly', times: ['19:00'], days_of_week: [4] }, // Thursday 7 PM
        content_type: 'event'
      }
    ]
  },

  boutique: {
    name: 'Boutique',
    templates: [
      {
        id: 'style_inspiration',
        name: 'Style Inspiration',
        prompt: `Share style inspiration featuring pieces from {business_name}.
                 Create outfit ideas, seasonal looks, or trend spotlights.
                 Help customers envision themselves in the pieces.
                 Use fashion emojis and hashtags like #StyleInspiration #OOTD.`,
        schedule: { frequency: 'weekly', times: ['09:00'], days_of_week: [1, 4] }, // Monday & Thursday 9 AM
        content_type: 'inspiration'
      },
      {
        id: 'exclusive_preview',
        name: 'Exclusive Preview',
        prompt: `Give followers an exclusive preview of what's coming to {business_name}.
                 Create anticipation for new collections, limited items, or special pieces.
                 Make followers feel like VIP insiders.
                 Use exclusive/VIP emojis and hashtags like #ExclusivePreview #VIPAccess.`,
        schedule: { frequency: 'weekly', times: ['18:00'], days_of_week: [2] }, // Tuesday 6 PM
        content_type: 'exclusive'
      },
      {
        id: 'local_artist',
        name: 'Local Artist Feature',
        prompt: `Highlight local artists, makers, or designers featured at {business_name}.
                 Show support for the local creative community.
                 Share the story behind unique or handmade pieces.
                 Use art/heart emojis and hashtags like #LocalArtist #SupportLocal.`,
        schedule: { frequency: 'weekly', times: ['15:00'], days_of_week: [6] }, // Saturday 3 PM
        content_type: 'community'
      }
    ]
  },

  service: {
    name: 'Service Business',
    templates: [
      {
        id: 'expert_tip',
        name: 'Expert Tips',
        prompt: `Share professional advice from the experts at {business_name}.
                 Give helpful tips that showcase expertise and help potential customers.
                 Address common problems or questions in your field.
                 Use expert/lightbulb emojis and hashtags like #ExpertTip #ProAdvice.`,
        schedule: { frequency: 'weekly', times: ['09:00'], days_of_week: [1] }, // Monday 9 AM
        content_type: 'educational'
      },
      {
        id: 'service_showcase',
        name: 'Service Showcase',
        prompt: `Showcase the quality and professionalism of {business_name}'s services.
                 Highlight attention to detail, customer satisfaction, or unique approaches.
                 Build confidence in your professional capabilities.
                 Use quality/star emojis and hashtags like #QualityService #Professional.`,
        schedule: { frequency: 'weekly', times: ['14:00'], days_of_week: [3] }, // Wednesday 2 PM
        content_type: 'showcase'
      },
      {
        id: 'local_business_support',
        name: 'Local Business Support',
        prompt: `Show {business_name}'s commitment to the local business community.
                 Highlight partnerships, local hiring, or community involvement.
                 Connect with other local business owners and residents.
                 Use community/handshake emojis and hashtags like #LocalBusiness #CommunitySupport.`,
        schedule: { frequency: 'weekly', times: ['11:00'], days_of_week: [5] }, // Friday 11 AM
        content_type: 'community'
      }
    ]
  },

  health: {
    name: 'Health/Wellness',
    templates: [
      {
        id: 'wellness_tip',
        name: 'Weekly Wellness Tip',
        prompt: `Share a valuable wellness tip from the professionals at {business_name}.
                 Focus on preventive care, healthy habits, or stress management.
                 Make health and wellness accessible and actionable.
                 Use health/wellness emojis and hashtags like #WellnessTip #HealthyLiving.`,
        schedule: { frequency: 'weekly', times: ['08:00'], days_of_week: [1] }, // Monday 8 AM
        content_type: 'educational'
      },
      {
        id: 'motivation_monday',
        name: 'Motivation Monday',
        prompt: `Create an inspiring post to start the week right from {business_name}.
                 Focus on motivation, goal-setting, or positive mindset.
                 Help followers start their week with energy and purpose.
                 Use motivation emojis and hashtags like #MotivationMonday #WeeklyGoals.`,
        schedule: { frequency: 'weekly', times: ['07:00'], days_of_week: [1] }, // Monday 7 AM
        content_type: 'motivational'
      },
      {
        id: 'class_highlight',
        name: 'Class/Service Highlight',
        prompt: `Highlight a specific class, service, or program offered at {business_name}.
                 Explain the benefits and who would benefit most.
                 Encourage new clients to try something new for their wellness.
                 Use fitness/service emojis and hashtags like #ClassHighlight #TrySomethingNew.`,
        schedule: { frequency: 'weekly', times: ['17:00'], days_of_week: [3] }, // Wednesday 5 PM
        content_type: 'promotional'
      }
    ]
  },

  other: {
    name: 'Other Business',
    templates: [
      {
        id: 'business_update',
        name: 'Business Update',
        prompt: `Share an interesting update or news about {business_name}.
                 This could be new services, improvements, achievements, or changes.
                 Keep customers informed and engaged with your business journey.
                 Use update/news emojis and hashtags like #BusinessUpdate #News.`,
        schedule: { frequency: 'weekly', times: ['10:00'], days_of_week: [2] }, // Tuesday 10 AM
        content_type: 'update'
      },
      {
        id: 'value_proposition',
        name: 'Value Highlight',
        prompt: `Highlight what makes {business_name} special and valuable to customers.
                 Focus on unique benefits, quality, service, or customer experience.
                 Help potential customers understand why they should choose you.
                 Use value/star emojis and hashtags like #WhyChooseUs #QualityService.`,
        schedule: { frequency: 'weekly', times: ['15:00'], days_of_week: [4] }, // Thursday 3 PM
        content_type: 'value'
      },
      {
        id: 'community_engagement',
        name: 'Community Engagement',
        prompt: `Show {business_name}'s connection to the local community.
                 Highlight local partnerships, community events, or giving back.
                 Build relationships with local customers and businesses.
                 Use community/heart emojis and hashtags like #LocalCommunity #GivingBack.`,
        schedule: { frequency: 'weekly', times: ['16:00'], days_of_week: [6] }, // Saturday 4 PM
        content_type: 'community'
      }
    ]
  }
};

module.exports = BUSINESS_CATEGORY_TEMPLATES;