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
```

## Socket.IO Connection Errors

### XHR Poll Error

**Issue:** `Error: xhr poll error` in the browser console
**Cause:** The Socket.IO client cannot connect to the server

**Solutions:**

1. **Use the correct start command:**

   ```bash
   # CORRECT - This starts the Socket.IO server
   node server.js

   # WRONG - This doesn't include Socket.IO
   npm run dev
   ```

2. **Add Socket.IO URL to environment variables:**
   Create or update `.env.local`:

   ```
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
   ```

3. **Check if the server is running:**

   ```bash
   # Should show node server.js process
   ps aux | grep "node server.js"

   # Check if port 3002 is listening
   lsof -i :3002
   ```

4. **Common causes and fixes:**
   - **Wrong start command**: Use `node server.js` not `npm run dev`
   - **Port conflict**: Make sure port 3002 is free
   - **Missing env variable**: Add `NEXT_PUBLIC_SOCKET_URL` to `.env.local`
   - **Firewall/antivirus**: May block WebSocket connections on port 3002

5. **Debug in browser:**
   - Open DevTools > Network tab
   - Look for requests to `http://localhost:3002/socket.io/`
   - Check for 404, CORS, or connection refused errors

6. **Verify authentication:**
   - Socket.IO only connects for authenticated users
   - Make sure you're logged in before expecting connections

### Testing Socket.IO Connection

1. **Check connection status in browser console:**

   ```javascript
   // After logging in, open browser console
   // The useSocket hook should establish connection
   // Look for "Socket connected" message in console
   ```

2. **Monitor real-time events:**
   - Create a quick note or action item
   - Check browser console for Socket.IO event logs
   - Other logged-in users should receive notifications
