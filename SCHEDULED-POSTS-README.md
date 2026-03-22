# Scheduled Posts Implementation

## ✅ Implementation Status

**Phase 1 Complete**: Basic scheduled posting functionality  
**Phase 2 Complete**: Business category templates and bulk scheduling!

### What's Done:
- ✅ **Lambda Function**: `scheduled-post-processor` created and deployed
- ✅ **EventBridge Trigger**: Runs every 5 minutes
- ✅ **DynamoDB Tables**: `scheduled_posts` and `posting_schedules` created
- ✅ **DynamoDB Methods**: Added to `dynamodb.js` service
- ✅ **API Routes**: Added to `social.js`
- ✅ **Lambda Permissions**: DynamoDB access configured
- ✅ **Business Templates**: 10 categories with specific strategies
- ✅ **Bulk Scheduling**: Generate 30 days of posts automatically
- ✅ **AI Integration**: Uses Bedrock for personalized content

## 🚀 How It Works

### Phase 1: Individual Scheduling
1. **User schedules a post** via API: `POST /api/social/schedule-post`
2. **Post stored** in `scheduled_posts` DynamoDB table with `status: 'pending'`
3. **Lambda runs every 5 minutes**, checks for posts scheduled in the last 5 minutes
4. **Lambda publishes** qualifying posts to Facebook/Instagram
5. **Post status updated** to `'posted'` or `'failed'` with error details

### Phase 2: Bulk Scheduling
1. **User requests bulk schedule** for their business category
2. **System generates 30 days** of posts using category-specific templates
3. **AI creates personalized content** using business profile + templates
4. **Posts scheduled optimally** based on business type and best practices
5. **Lambda publishes automatically** just like individual posts

## 📡 API Endpoints

### Individual Scheduling
```bash
# Schedule a single post
POST /api/social/schedule-post
{
  "message": "Your post content here!",
  "scheduled_time": "2024-01-15T14:30:00.000Z",
  "platform": "facebook",
  "image_url": "https://optional-image-url.com/image.jpg"
}

# Get scheduled posts
GET /api/social/scheduled-posts

# Delete scheduled post
DELETE /api/social/scheduled-posts/:postId
```

### Bulk Scheduling (Phase 2)
```bash
# Get available business templates
GET /api/social/business-templates

# Generate bulk schedule
POST /api/social/schedule-bulk
{
  "business_category": "restaurant",
  "start_date": "2024-01-15T00:00:00.000Z",
  "duration_days": 30,
  "platforms": ["facebook"]
}
```

## 🏢 Business Categories & Templates

### Available Categories:
1. **Restaurant** - Daily specials, behind-the-scenes, weekend specials
2. **Cafe/Coffee Shop** - Morning coffee, afternoon treats, community events
3. **Retail Store** - New arrivals, styling tips, customer features
4. **Hair Salon/Barbershop** - Transformations, care tips, weekend bookings
5. **Auto Repair** - Maintenance tips, customer success, seasonal reminders
6. **Food Truck** - Location announcements, menu highlights, events
7. **Boutique** - Style inspiration, exclusive previews, local artists
8. **Service Business** - Expert tips, service showcases, community support
9. **Health/Wellness** - Wellness tips, motivation Monday, class highlights
10. **Other Business** - Business updates, value propositions, community engagement

### Template Strategy Examples:

**Restaurant:**
- Daily Special (11 AM daily) - "Create appetizing post about today's chef special..."
- Behind Scenes (Wed 9 AM) - "Show kitchen preparation and craftsmanship..."
- Weekend Special (Fri 5 PM) - "Create excitement for weekend offerings..."

**Cafe:**
- Morning Coffee (7:30 AM daily) - "Feature today's coffee selection..."
- Afternoon Boost (2 PM daily) - "Perfect afternoon break and treats..."
- Community Events (Mon 6 PM) - "Highlight as community gathering space..."

## 🧪 Testing

### Test Individual Scheduling:
```bash
node test-scheduled-posts.js
```

### Test Bulk Scheduling:
```bash
node test-bulk-scheduling.js
```

### Test Template Categories:
```bash
node test-bulk-scheduling.js templates
```

## 📊 Database Schema

### `scheduled_posts` Table (Updated)
```javascript
{
  user_id: Number,          // Partition key
  post_id: String,          // Sort key
  scheduled_time: String,   // ISO timestamp
  platform: String,         // 'facebook' | 'instagram'  
  content: {
    message: String,
    image_url: String,
    image_source: String
  },
  business_category: String, // NEW: 'restaurant', 'cafe', etc.
  template_id: String,      // NEW: 'daily_special', etc.
  content_type: String,     // NEW: 'promotional', 'engagement', etc.
  status: String,           // 'pending' | 'posted' | 'failed'
  created_at: String,
  updated_at: String,
  error_message: String
}
```

### `posting_schedules` Table
```javascript
{
  user_id: Number,          // Partition key
  business_category: String, // Sort key
  schedule_config: {
    templates_used: Array,
    start_date: String,
    duration_days: Number,
    platforms: Array,
    generated_at: String
  },
  active: Boolean,
  created_at: String,
  updated_at: String
}
```

## 🎯 Phase 3: Frontend UI (Next)

### Planned Features:
- [ ] **Calendar View** - Visual scheduling interface
- [ ] **Drag & Drop** - Easy post rescheduling
- [ ] **Bulk Generation UI** - Category selection and preview
- [ ] **Post Preview** - See generated content before scheduling
- [ ] **Analytics Dashboard** - Post performance tracking
- [ ] **Template Customization** - Edit category templates

### UI Mockup Structure:
```
Dashboard
├── Scheduled Posts Calendar
├── Bulk Scheduling Wizard
│   ├── Category Selection
│   ├── Date Range Picker
│   ├── Content Preview
│   └── Generate Button
├── Individual Post Scheduler
└── Analytics & Performance
```

## 🤖 AI Content Generation

### How Templates Work:
1. **Template Prompts** include business placeholders: `{business_name}`
2. **Business Context** added: name, type, description, tone, audience
3. **AI generates** personalized content using your Bedrock integration
4. **Content optimized** for each business category and posting schedule

### Example Generated Content:
**Restaurant Daily Special:**
> "🔥 Today's Chef Special: Smoked BBQ Brisket Platter at Joe's BBQ Pit! 
> Tender, juicy, and packed with flavor. Available until sold out! 
> #ChefSpecial #FreshToday #JoesBBQ"

## 💰 Updated Infrastructure Cost
- **Lambda**: ~$10-25/month (with AI generation)
- **EventBridge**: ~$1-5/month  
- **DynamoDB**: ~$5-15/month (bulk data)
- **Bedrock AI**: ~$5-20/month (content generation)
- **Total**: ~$21-65/month for typical usage

## 🚀 Business Impact

### For Customers:
- **Save 10+ hours/week** on content creation
- **Consistent posting** maintains engagement
- **Professional content** generated automatically
- **Category expertise** built into templates

### For Your Business:
- **Premium Feature** justifies higher pricing
- **Increased Retention** through automated value
- **Scalable Solution** handles growth automatically
- **Competitive Advantage** over manual posting tools

## 🐛 Troubleshooting

### Bulk Scheduling Issues:
- **"Business profile not found"**: Complete business setup first
- **"Trial limitation"**: Upgrade to Basic/Pro plan
- **"Invalid category"**: Use exact category names from templates
- **AI generation fails**: Check Bedrock permissions

### Template Customization:
- Edit `backend/src/config/business-templates.js`
- Restart backend to apply changes
- Test with `node test-bulk-scheduling.js templates`

## 📝 Important Notes

- **Bulk scheduling** requires Basic or Pro plan (not available on trial)
- **30-day generation** typical, but configurable (1-90 days)
- **AI content** varies each generation for freshness
- **Templates optimized** for each business category
- **Posting times** based on social media best practices

---

## 🎉 Phase 2 Complete!

Your marketing assistant now has **professional-grade automated posting** with:
- ✅ 10 business category strategies
- ✅ AI-powered content generation  
- ✅ Bulk 30-day scheduling
- ✅ Optimal timing for each business type
- ✅ Scalable infrastructure

**Ready for Phase 3: Beautiful Frontend UI!**