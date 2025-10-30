const axios = require('axios');

class RewardfulService {
  constructor() {
    this.apiKey = process.env.REWARDFUL_API_KEY;
    this.baseUrl = 'https://api.getrewardful.com/v1';
  }

  /**
   * Track a conversion for an affiliate
   * @param {Object} params - Conversion parameters
   * @param {string} params.email - Customer email
   * @param {string} params.external_id - Your internal user/order ID
   * @param {number} params.amount - Revenue amount in cents
   * @param {string} params.currency - Currency code (e.g., 'USD')
   * @param {Object} params.metadata - Additional metadata
   */
  async trackConversion({ email, external_id, amount, currency = 'USD', metadata = {} }) {
    if (!this.apiKey) {
      console.warn('Rewardful API key not configured');
      return;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sales`, {
        email,
        external_id,
        amount,
        currency,
        metadata
      }, {
        auth: {
          username: this.apiKey,
          password: ''
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Conversion tracked successfully
      return data;
    } catch (error) {
      console.error('Failed to track Rewardful conversion:', error.message);
      console.error('Full error:', error.response?.data || error);
      // Don't throw error - tracking failures shouldn't break the app
      return null;
    }
  }

  /**
   * Track a lead (signup) for an affiliate
   * NOTE: Rewardful may not have a dedicated leads endpoint in their API
   * Lead tracking is typically handled by the frontend JavaScript
   * @param {Object} params - Lead parameters
   * @param {string} params.email - Customer email
   * @param {string} params.external_id - Your internal user ID
   * @param {Object} params.metadata - Additional metadata
   */
  async trackLead({ email, external_id, metadata = {} }) {
    if (!this.apiKey) {
      console.warn('Rewardful API key not configured');
      return;
    }

    // For now, we'll skip server-side lead tracking since Rewardful 
    // primarily handles this through their frontend JavaScript
    // The frontend signup page already handles lead tracking via window.Rewardful()
    // Rewardful lead tracking skipped (handled by frontend)
    return null;

    /* 
    // If Rewardful adds a leads API endpoint in the future, uncomment this:
    try {
      const response = await axios.post(`${this.baseUrl}/leads`, {
        email,
        external_id,
        metadata
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Failed to track Rewardful lead:', error.message);
      console.error('Full error:', error.response?.data || error);
      return null;
    }
    */
  }

  /**
   * Track a conversion with referral context from frontend
   * @param {Object} params - Conversion parameters with referral info
   */
  async trackConversionWithReferral({ email, external_id, amount, currency = 'USD', referralId, affiliateId, metadata = {} }) {
    if (!this.apiKey) {
      console.warn('Rewardful API key not configured');
      return;
    }

    try {
      const conversionData = {
        email,
        external_id,
        amount,
        currency,
        metadata: {
          ...metadata,
          ...(referralId && { referral_id: referralId }),
          ...(affiliateId && { affiliate_id: affiliateId })
        }
      };

      const response = await axios.post(`${this.baseUrl}/sales`, conversionData, {
        auth: {
          username: this.apiKey,
          password: ''
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Conversion tracked with referral successfully
      return data;
    } catch (error) {
      console.error('Failed to track Rewardful conversion with referral:', error.message);
      console.error('Full error:', error.response?.data || error);
      return null;
    }
  }
}

module.exports = new RewardfulService();
