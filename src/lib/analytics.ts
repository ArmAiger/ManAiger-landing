/**
 * Google Analytics Event Tracking Utility
 * Use these functions to track user actions and conversions throughout the app
 */

// Define common event types for better type safety
export type GAEventName = 
  | 'account_created'
  | 'brand_match_viewed'
  | 'brand_match_generated'
  | 'outreach_draft_created'
  | 'outreach_draft_sent'
  | 'invoice_created'
  | 'invoice_paid'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'deal_accepted'
  | 'deal_completed'
  | 'login'
  | 'signup'
  | 'page_view'
  | string; // Allow custom events

export interface GAEventParams {
  event_category?: string;
  event_label?: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
  [key: string]: any;
}

/**
 * Track a custom event in Google Analytics
 * @param eventName - The name of the event to track
 * @param eventParams - Optional parameters to send with the event
 */
export const trackEvent = (eventName: GAEventName, eventParams?: GAEventParams): void => {
  try {
    // Check if window and gtag are available (client-side only)
    if (typeof window !== 'undefined' && (window as any).gtagTrack) {
      (window as any).gtagTrack(eventName, eventParams);
    } else if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, eventParams);
    } else {
      console.warn('[Analytics] gtag not available yet');
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

/**
 * Track a conversion event (for Google Ads, etc.)
 * @param conversionLabel - The conversion label from Google Ads
 * @param value - The conversion value
 * @param currency - The currency code (default: USD)
 */
export const trackConversion = (
  conversionLabel: string, 
  value?: number, 
  currency: string = 'USD'
): void => {
  trackEvent('conversion', {
    send_to: conversionLabel,
    value: value || 0,
    currency: currency
  });
};

/**
 * Track a purchase/transaction
 * @param transactionId - Unique transaction ID
 * @param value - Total transaction value
 * @param currency - Currency code (default: USD)
 * @param items - Optional array of purchased items
 */
export const trackPurchase = (
  transactionId: string,
  value: number,
  currency: string = 'USD',
  items?: any[]
): void => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items || []
  });
};

/**
 * Track page views manually (Next.js automatically tracks route changes)
 * @param pageTitle - Optional page title
 * @param pagePath - Optional page path
 */
export const trackPageView = (pageTitle?: string, pagePath?: string): void => {
  trackEvent('page_view', {
    page_title: pageTitle,
    page_path: pagePath || (typeof window !== 'undefined' ? window.location.pathname : '')
  });
};

// Convenience functions for common events
export const analytics = {
  // User actions
  accountCreated: (userId?: string) => trackEvent('account_created', { user_id: userId }),
  login: (method?: string) => trackEvent('login', { method: method || 'email' }),
  signup: (method?: string) => trackEvent('signup', { method: method || 'email' }),
  
  // Brand matches
  brandMatchViewed: (brandId?: string) => trackEvent('brand_match_viewed', { brand_id: brandId }),
  brandMatchGenerated: (count?: number) => trackEvent('brand_match_generated', { match_count: count }),
  
  // Outreach
  outreachDraftCreated: (brandId?: string) => trackEvent('outreach_draft_created', { brand_id: brandId }),
  outreachDraftSent: (brandId?: string) => trackEvent('outreach_draft_sent', { brand_id: brandId }),
  
  // Invoices
  invoiceCreated: (invoiceId?: string, value?: number) => 
    trackEvent('invoice_created', { invoice_id: invoiceId, value: value }),
  invoicePaid: (invoiceId?: string, value?: number) => 
    trackEvent('invoice_paid', { invoice_id: invoiceId, value: value }),
  
  // Deals
  dealAccepted: (dealId?: string, value?: number) => 
    trackEvent('deal_accepted', { deal_id: dealId, value: value }),
  dealCompleted: (dealId?: string, value?: number) => 
    trackEvent('deal_completed', { deal_id: dealId, value: value }),
  
  // Subscriptions
  subscriptionStarted: (plan?: string, value?: number) => 
    trackEvent('subscription_started', { plan_name: plan, value: value }),
  subscriptionCancelled: (plan?: string) => 
    trackEvent('subscription_cancelled', { plan_name: plan }),
};

export default analytics;

