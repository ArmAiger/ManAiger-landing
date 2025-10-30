const { google } = require('googleapis');
const { gmail } = require('../config');
const createError = require('http-errors');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      gmail.clientId,
      gmail.clientSecret,
      `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/gmail/callback`
    );
  }

  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to ensure refresh token
      scope: scopes,
      state: userId // Pass user ID to identify user after callback
    });
  }

  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw createError(400, 'Failed to exchange authorization code for tokens');
    }
  }

  async getUserProfile(accessToken) {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return {
        email: profile.data.emailAddress,
        totalMessages: profile.data.messagesTotal
      };
    } catch (error) {
      throw createError(400, 'Failed to get Gmail profile');
    }
  }

  async sendEmail({ accessToken, refreshToken, to, subject, message, replyTo }) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Create the email message
      const messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        replyTo ? `Reply-To: ${replyTo}` : '',
        'Content-Type: text/html; charset=utf-8',
        '',
        message
      ].filter(Boolean);

      const message64 = Buffer.from(messageParts.join('\n')).toString('base64url');

      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message64
        }
      });

      return {
        messageId: result.data.id,
        threadId: result.data.threadId
      };
    } catch (error) {
      console.error('Gmail send error:', error);
      
      if (error.code === 401) {
        throw createError(401, 'Gmail authentication expired. Please reconnect your Gmail account.');
      }
      
      throw createError(500, 'Failed to send email via Gmail');
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      throw createError(401, 'Failed to refresh Gmail access token');
    }
  }
}

module.exports = new GmailService();
