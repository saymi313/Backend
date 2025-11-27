# Google Meet API Setup Guide

## Prerequisites

1. **Google Cloud Console Account**
2. **Google Workspace Account** (for production use)
3. **Node.js dependencies** (already included in package.json)

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Google Calendar API**
   - **Google Meet API** (if available)

## Step 2: Create OAuth2 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/mentors/google-meet/callback` (development)
   - `https://yourdomain.com/api/mentors/google-meet/callback` (production)

## Step 3: Install Required Dependencies

```bash
npm install googleapis google-auth-library
```

## Step 4: Environment Variables

Add to your `.env` file:

```env
# Google API Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/mentors/google-meet/callback

# For production
GOOGLE_REDIRECT_URI_PROD=https://yourdomain.com/api/mentors/google-meet/callback
```

## Step 5: OAuth2 Flow Implementation

### Frontend Integration

```javascript
// Initialize Google OAuth2
const initializeGoogleAuth = async () => {
  try {
    // Get authorization URL
    const authResponse = await fetch('/api/mentors/google-meet/auth-url', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const { authUrl } = await authResponse.json();
    
    // Redirect to Google OAuth2
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initializing Google auth:', error);
  }
};

// Handle OAuth2 callback
const handleOAuthCallback = async (code) => {
  try {
    const response = await fetch('/api/mentors/google-meet/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ code })
    });
    
    const { tokens } = await response.json();
    
    // Store tokens securely
    localStorage.setItem('googleTokens', JSON.stringify(tokens));
    
    return { success: true, tokens };
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    return { success: false, error: error.message };
  }
};
```

## Step 6: API Endpoints

The following endpoints are available:

### Initialize Google Client
```
POST /api/mentors/google-meet/initialize
Content-Type: application/json
Authorization: Bearer <token>

{
  "credentials": {
    "clientId": "your_client_id",
    "clientSecret": "your_client_secret",
    "accessToken": "user_access_token",
    "refreshToken": "user_refresh_token"
  }
}
```

### Get Authorization URL
```
POST /api/mentors/google-meet/auth-url
Authorization: Bearer <token>
```

### Exchange Code for Tokens
```
POST /api/mentors/google-meet/tokens
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "authorization_code_from_google"
}
```

### Create Meeting
```
POST /api/mentors/google-meet/meetings
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Meeting Title",
  "description": "Meeting Description",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "attendees": ["mentee@example.com"],
  "timezone": "UTC"
}
```

## Step 7: Testing

1. **Start the backend server**
2. **Initialize Google client** with your credentials
3. **Get authorization URL** and complete OAuth2 flow
4. **Create a test meeting** using the API
5. **Verify** the meeting appears in Google Calendar

## Step 8: Production Considerations

### Security
- Store credentials securely (use environment variables)
- Implement proper token refresh logic
- Use HTTPS in production
- Validate all inputs

### Error Handling
- Handle API rate limits
- Implement retry logic for failed requests
- Log errors for debugging

### Performance
- Cache tokens when possible
- Implement request batching
- Monitor API usage

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Check client ID and secret
   - Verify redirect URI matches exactly

2. **"Access denied" error**
   - Check OAuth2 scopes
   - Ensure user has granted permissions

3. **"API not enabled" error**
   - Enable Google Calendar API
   - Check API quotas

### Debug Mode

Enable debug logging:

```javascript
// In your service
console.log('Google API Response:', response.data);
console.log('Meeting Details:', meetingDetails);
```

## Support

For issues with Google APIs:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Meet API Documentation](https://developers.google.com/meet)
- [Google Cloud Console](https://console.cloud.google.com/)

## Example Usage

```javascript
// Complete flow example
const createGoogleMeet = async (meetingDetails) => {
  try {
    // 1. Initialize client
    await meetingService.initializeGoogleClient(credentials);
    
    // 2. Create meeting
    const result = await meetingService.generateMeetingLink(meetingDetails);
    
    if (result.success) {
      console.log('Meeting created:', result.meetingLink);
      return result;
    }
  } catch (error) {
    console.error('Error creating meeting:', error);
    throw error;
  }
};
```

This setup will enable real Google Meet integration with calendar events and meeting links! 🎉
