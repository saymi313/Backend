const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleMeetService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
  }

  // Initialize Google API client with credentials
  initializeClient(credentials = {}) {
    try {
      const {
        clientId,
        clientSecret,
        redirectUri,
        accessToken,
        refreshToken
      } = credentials;

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth client credentials are required');
      }

      this.oauth2Client = new OAuth2Client(
        clientId,
        clientSecret,
        redirectUri
      );

      if (accessToken || refreshToken) {
        this.oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      } else {
        this.calendar = null;
      }
      
      return {
        success: true,
        calendarReady: Boolean(this.calendar),
        message: 'Google API client initialized successfully'
      };
    } catch (error) {
      console.error('Error initializing Google API client:', error);
      return { success: false, error: error.message };
    }
  }

  // Create a Google Meet meeting
  async createMeeting(meetingDetails) {
    try {
      if (!this.calendar) {
        throw new Error('Google API client not initialized');
      }

      const {
        title,
        description,
        startTime,
        endTime,
        attendees = [],
        timezone = 'UTC'
      } = meetingDetails;

      // Create calendar event with Google Meet link
      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: startTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endTime,
          timeZone: timezone,
        },
        attendees: attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      // Insert the event
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all'
      });

      const meetingLink = response.data.conferenceData?.entryPoints?.[0]?.uri;
      const meetingId = response.data.id;

      return {
        success: true,
        meetingLink,
        meetingId,
        eventId: response.data.id,
        calendarEvent: response.data,
        message: 'Google Meet meeting created successfully'
      };

    } catch (error) {
      console.error('Error creating Google Meet meeting:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create Google Meet meeting'
      };
    }
  }

  // Update an existing meeting
  async updateMeeting(eventId, meetingDetails) {
    try {
      if (!this.calendar) {
        throw new Error('Google API client not initialized');
      }

      const {
        title,
        description,
        startTime,
        endTime,
        attendees = []
      } = meetingDetails;

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
        attendees: attendees.map(email => ({ email })),
      };

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        sendUpdates: 'all'
      });

      return {
        success: true,
        meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
        meetingId: response.data.id,
        eventId: response.data.id,
        message: 'Google Meet meeting updated successfully'
      };

    } catch (error) {
      console.error('Error updating Google Meet meeting:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to update Google Meet meeting'
      };
    }
  }

  // Delete a meeting
  async deleteMeeting(eventId) {
    try {
      if (!this.calendar) {
        throw new Error('Google API client not initialized');
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      return {
        success: true,
        message: 'Google Meet meeting deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting Google Meet meeting:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to delete Google Meet meeting'
      };
    }
  }

  // Get meeting details
  async getMeeting(eventId) {
    try {
      if (!this.calendar) {
        throw new Error('Google API client not initialized');
      }

      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      return {
        success: true,
        meeting: response.data,
        meetingLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
        message: 'Meeting details retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting meeting details:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get meeting details'
      };
    }
  }

  // Generate OAuth2 authorization URL
  getAuthUrl() {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      return {
        success: true,
        authUrl,
        message: 'Authorization URL generated successfully'
      };

    } catch (error) {
      console.error('Error generating auth URL:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate authorization URL'
      };
    }
  }

  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      return {
        success: true,
        tokens,
        message: 'Tokens retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting tokens:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to get tokens'
      };
    }
  }
}

module.exports = GoogleMeetService;
