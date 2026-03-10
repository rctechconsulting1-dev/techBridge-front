import { google } from 'googleapis';

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

// Scopes required for Google My Business API
const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/plus.business.manage',
  'profile',
  'email'
];

export class GoogleOAuthManager {
  static generateAuthUrl(state?: string, loginHint?: string) {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: state || 'default',
      ...(loginHint ? { login_hint: loginHint } : {}),
    });
  }

  static async exchangeCodeForTokens(code: string) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  static async refreshAccessToken(refreshToken: string) {
    try {
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  static async getValidAccessToken(accessToken: string, refreshToken: string) {
    try {
      // Set credentials
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      // Check if token is still valid by making a test request
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      await oauth2.userinfo.get();
      
      return accessToken;
     
    } catch (error) {
      // Token is expired, try to refresh
      const newCredentials = await this.refreshAccessToken(refreshToken);
      return newCredentials.access_token;
    }
  }
}
