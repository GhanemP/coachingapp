# Google Workspace OAuth Setup Guide

## Overview

This guide will help you set up Google Workspace (G Suite) authentication for your coaching app. Your employees will be able to sign in using their existing Google Workspace accounts.

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "SmartSource Coaching App")
5. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on "Google+ API" and click "Enable"
4. Also search for and enable "People API" (recommended for better user info)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "Internal" (since this is for your organization's employees)
3. Fill in the required information:
   - **App name**: SmartSource Coaching Hub
   - **User support email**: Your admin email
   - **Developer contact information**: Your admin email
4. Click "Save and Continue"
5. On the "Scopes" page, click "Add or Remove Scopes"
6. Add these scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
7. Click "Save and Continue"
8. Review and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Enter a name (e.g., "Coaching App Web Client")
5. Add Authorized JavaScript origins:
   - `http://localhost:3002` (for development)
   - `https://yourdomain.com` (for production)
6. Add Authorized redirect URIs:
   - `http://localhost:3002/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)

   **IMPORTANT**: Make sure the redirect URI exactly matches: `http://localhost:3002/api/auth/callback/google`

7. Click "Create"
8. Copy the **Client ID** and **Client Secret** - you'll need these for your environment variables

## Step 5: Update Environment Variables

1. Copy your `.env.example` to `.env.development` (if not already done)
2. Add the Google OAuth credentials:

```bash
# Google OAuth (Required for Google Workspace authentication)
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

3. Make sure your `NEXTAUTH_URL` is correct:

```bash
NEXTAUTH_URL="http://localhost:3002"  # for development
```

## Step 6: Domain Verification (For Production)

For production deployment, you may need to verify your domain:

1. In Google Cloud Console, go to "APIs & Services" > "Domain verification"
2. Add your production domain
3. Follow the verification process (usually involves adding a DNS TXT record or HTML file)

## Step 7: Workspace Admin Configuration (Optional)

If you want to restrict access to only your organization's users:

1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to "Security" > "API controls"
3. Go to "App access control"
4. Add your app to the trusted apps list using the Client ID

## Step 8: Test the Setup

1. Start your development server: `npm run dev`
2. Go to `http://localhost:3002`
3. Click "Continue with Google Workspace"
4. You should be redirected to Google's OAuth consent screen
5. After authorization, you should be redirected back to your app's dashboard

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**:
   - Check that your redirect URI in Google Cloud Console exactly matches: `http://localhost:3002/api/auth/callback/google`

2. **"access_denied" error**:
   - Make sure the OAuth consent screen is configured correctly
   - Check that the user's email domain is allowed (if using internal app type)

3. **"invalid_client" error**:
   - Verify your Client ID and Client Secret are correct in your `.env` file
   - Make sure there are no extra spaces or quotes

### Environment Variables Checklist:

```bash
# Required for Google OAuth
GOOGLE_CLIENT_ID="your-actual-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-actual-client-secret"
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-nextauth-secret"

# Database (already configured)
DATABASE_URL="your-database-url"
```

## Security Notes

- Keep your Client Secret secure and never commit it to version control
- Use environment variables for all sensitive configuration
- For production, ensure you're using HTTPS URLs
- Consider implementing additional security measures like domain restrictions

## Next Steps

Once Google OAuth is working:

1. Test with multiple users from your organization
2. Configure user roles and permissions as needed
3. Set up production environment with proper domain and SSL
4. Train your team on the new authentication process

The Google Workspace integration will provide a seamless single sign-on experience for your employees, eliminating the need for separate passwords and improving security.
