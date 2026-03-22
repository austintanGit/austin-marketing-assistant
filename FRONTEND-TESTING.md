# Frontend Testing Guide for Scheduled Posts

## 🧪 Manual Testing Steps

### 1. **Navigation Test**
- ✅ Check that "Scheduled Posts" appears in sidebar navigation
- ✅ Click navigation item - should route to `/scheduled-posts`
- ✅ Check that "Scheduled Posts" card appears on Dashboard

### 2. **Connection Requirements**
- ✅ Without Facebook connected: should show warning banner
- ✅ "Connect Facebook" button should work
- ✅ With Facebook connected: warning should disappear

### 3. **Bulk Scheduling Modal**
- ✅ Click "Bulk Generate" button
- ✅ Step 1: Select business category (try "Restaurant")
- ✅ Step 2: Configure (set date to tomorrow, 7 days)
- ✅ Step 3: Preview shows correct info
- ✅ Step 4: Generate posts (should show success)

### 4. **Individual Scheduling Modal**
- ✅ Click "Schedule Post" button
- ✅ Enter message, select date/time
- ✅ Time presets should work (9 AM, 12 PM, etc.)
- ✅ Submit should create post successfully

### 5. **Posts List**
- ✅ Posts show with correct status badges
- ✅ Filter buttons work (All, Pending, Posted, Failed)
- ✅ Posts grouped by date correctly
- ✅ Delete button works for pending posts
- ✅ View button shows post preview modal

### 6. **Responsive Design**
- ✅ Mobile navigation works
- ✅ Modals display correctly on mobile
- ✅ Table/list is scrollable on small screens

## 🐛 Common Issues & Fixes

### Modal Not Opening
- Check console for React errors
- Ensure state variables are properly initialized
- Verify click handlers are attached correctly

### API Errors
- Check browser network tab for failed requests
- Verify backend is running (`npm run dev`)
- Check JWT token is valid (try logging out/in)

### Styling Issues
- Ensure Tailwind CSS classes are correctly applied
- Check for typos in className strings
- Verify custom CSS classes (austin-input, austin-button)

### Date/Time Issues
- Test with different timezones
- Ensure scheduled time validation works
- Check date format consistency (ISO strings)

## 🎨 UI Component Checklist

### ScheduledPosts Page
- ✅ Header with title and action buttons
- ✅ Connection warning banner (when needed)
- ✅ Stats cards with filtering
- ✅ Posts list with grouping by date
- ✅ Empty state when no posts
- ✅ Loading state during API calls

### BulkSchedulingModal
- ✅ 4-step wizard interface
- ✅ Category selection with icons/colors
- ✅ Configuration form with validation
- ✅ Preview step showing summary
- ✅ Generation step with loading state
- ✅ Trial plan warning

### SchedulePostModal
- ✅ Platform selection (Facebook/Instagram)
- ✅ Message textarea with character count
- ✅ Date/time inputs with validation
- ✅ Quick time preset buttons
- ✅ Schedule preview section

## 📱 Browser Testing

### Desktop
- ✅ Chrome/Safari/Firefox
- ✅ Large screens (1920px+)
- ✅ Medium screens (1024px-1920px)

### Mobile
- ✅ iPhone Safari
- ✅ Android Chrome
- ✅ Tablet (768px-1024px)
- ✅ Phone (320px-767px)

## 🚀 Launch Checklist

- ✅ All modals open/close properly
- ✅ All API endpoints return expected data
- ✅ Error handling shows user-friendly messages
- ✅ Loading states prevent multiple submissions
- ✅ Form validation prevents invalid data
- ✅ Responsive design works on all devices
- ✅ Navigation between pages works seamlessly
- ✅ No console errors in browser dev tools

## 💡 Pro Tips

### Testing with Mock Data
If backend isn't ready, you can temporarily mock API responses:

```javascript
// In your component, temporarily replace API calls:
const mockPosts = [
  {
    post_id: '1',
    scheduled_time: '2024-01-15T14:30:00.000Z',
    platform: 'facebook',
    content: { message: 'Test post content' },
    status: 'pending',
    created_at: '2024-01-14T10:00:00.000Z'
  }
];
setPosts(mockPosts);
```

### Quick Development Setup
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser: `http://localhost:5173`
4. Login with test account
5. Navigate to `/scheduled-posts`

This frontend implementation provides a complete, professional interface for your scheduled posts system!