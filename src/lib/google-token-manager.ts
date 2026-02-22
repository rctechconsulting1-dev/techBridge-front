import { apiClient } from '@/lib/api-client'; // Adjust to your database setup
import { GoogleOAuthManager } from './google-oauth';

export class GoogleTokenManager {
  static async getValidToken(userId: string, clientId: string): Promise<string | null> {
    try {
      const tokenRecord = await apiClient.get(`/google-tokens/${userId}/${clientId}`);

      if (!tokenRecord) {
        return null;
      }

      // Check if token is expired
      const now = new Date();
      if (new Date(tokenRecord.expiresAt) <= now) {
        // Try to refresh the token
        try {
          const newCredentials = await GoogleOAuthManager.refreshAccessToken(
            tokenRecord.refreshToken
          );

          // Update the database with new tokens
          await apiClient.put(`/google-tokens/${userId}/${clientId}`, {
            accessToken: newCredentials.access_token!,
            expiresAt: new Date(newCredentials.expiry_date || Date.now() + 3600000),
            updatedAt: new Date()
          });

          return newCredentials.access_token!;
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          // Delete invalid tokens
          await this.deleteTokens(userId, clientId);
          return null;
        }
      }

      return tokenRecord.accessToken;
    } catch (error) {
      console.error('Error getting valid token:', error);
      return null;
    }
  }

  static async deleteTokens(userId: string, clientId: string): Promise<void> {
    try {
      await apiClient.delete(`/google-tokens/${userId}/${clientId}`);

      // Update business record
      await apiClient.put(`/business/${clientId}`, { 
        gmb_connected: false,
        gmb_connected_at: null
      });
    } catch (error) {
      console.error('Error deleting tokens:', error);
    }
  }

  static async hasValidConnection(userId: string, clientId: string): Promise<boolean> {
    const token = await this.getValidToken(userId, clientId);
    return token !== null;
  }
}
