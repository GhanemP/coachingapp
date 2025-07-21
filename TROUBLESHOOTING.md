# Troubleshooting Guide

## Fixed Issues

### 1. Scorecard Save Error (FIXED)
**Problem:** Error when saving scorecards due to duplicate weight field names
**Solution:** Fixed the API route to properly handle weight field names

### 2. ChunkLoadError (FIXED)
**Problem:** Webpack chunk loading errors
**Solution:** Cleared Next.js cache and restarted dev server

## Known Issues & Solutions

### 1. JWT Session Error
**Issue:** `[next-auth][error][JWT_SESSION_ERROR] decryption operation failed`
**Solution:** This happens when the JWT secret changes or cookies become invalid
- Clear browser cookies for localhost:3000
- Sign out and sign back in

### 2. Navigation Errors
If you encounter any navigation or loading errors:
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache and cookies
3. If error persists, restart the dev server

## How to Test Scorecards

1. **Login as Team Leader:**
   - Email: teamleader1@company.com or teamleader2@company.com
   - Password: password123

2. **Navigate to Scorecards:**
   - Go to Team Leader Dashboard
   - Click on "Scorecards" in the navigation

3. **Create/Edit Scorecard:**
   - Select an agent from the dropdown
   - Choose month and year
   - Click "Create Scorecard" or "Edit Scorecard"
   - Fill in the scores (1-5 for each metric)
   - Optionally adjust weights
   - Add notes if needed
   - Click "Save Scorecard"

4. **View Scorecard:**
   - After selecting an agent, click "View Full Scorecard"
   - This shows historical data and trends

## Metrics Explained

Each agent is evaluated on 8 metrics (scored 1-5):
- **Service**: Customer service quality
- **Productivity**: Work output efficiency
- **Quality**: Work accuracy
- **Assiduity**: Attendance and punctuality
- **Performance**: Overall goal achievement
- **Adherence**: Following procedures
- **Lateness**: Time management
- **Break Exceeds**: Break compliance

## Database Reset

If you need to reset the database:
```bash
# Stop the dev server
# Reset database
npx prisma db push --force-reset
# Seed with test data
npx prisma db seed
# Restart dev server
npm run dev