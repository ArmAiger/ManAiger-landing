// TikTok Pixel tracking utility
// This module provides a clean interface for TikTok Pixel events

/**
 * TikTok Pixel event tracking utility
 * 
 * Usage:
 * - trackTikTokEvent("account_created") - fires CompleteRegistration event with proper parameters
 * - trackTikTokEvent("brand_match_viewed") - fires ViewContent event with BrandMatch category
 * - trackTikTokEvent("outreach_draft") - fires StartTrial event for OutreachDraft
 * - trackTikTokEvent("invoice_created") - fires Subscribe event for InvoiceCreated
 * - trackCompleteRegistration() - directly fires CompleteRegistration with recommended parameters
 * 
 * Developer Notes:
 * - Pixel must load on all pages (handled in app/layout.tsx)
 * - On route changes in SPA mode, ttq.page() fires automatically via TikTokPixelTracker component
 * - For testing, use TikTok Ads Manager → Events Manager → Test Events
 * - Ensure https://analytics.tiktok.com/ and https://business-api.tiktok.com/ are not blocked
 */

declare global {
  interface Window {
    ttq?: any;
    ttqTrack?: (eventName: string) => void;
    tt_test_id?: string; // Store test ID globally for Test Events
  }
}

export type TikTokEventName = 
  | "account_created"
  | "brand_match_viewed" 
  | "outreach_draft"
  | "invoice_created";

/**
 * Track a TikTok Pixel event
 * @param eventName - The event name to track
 */
export function trackTikTokEvent(eventName: TikTokEventName): void {
  if (typeof window !== 'undefined' && window.ttqTrack) {
    window.ttqTrack(eventName);
  }
}

/**
 * Track CompleteRegistration event directly with proper parameters
 * This is the recommended way to track successful signups
 */
export function trackCompleteRegistration(): void {
  if (typeof window !== 'undefined' && window.ttq && typeof window.ttq.track === 'function') {
    try {
      const params: any = {
        event_id: 'reg_' + Date.now(),
        value: 0,
        currency: 'USD'
      };
      if (window.tt_test_id) {
        params.test_event_code = window.tt_test_id;
      }

      window.ttq.track('CompleteRegistration', params);
    } catch (error) {
      console.error('[TikTok Pixel] Error tracking CompleteRegistration:', error);
    }
  } else {
    console.warn('[TikTok Pixel] ttq.track not available for CompleteRegistration');
  }
}

/**
 * Track PageView event manually (usually handled automatically by TikTokPixelTracker)
 */
export function trackPageView(): void {
  if (typeof window !== 'undefined' && window.ttq && typeof window.ttq.page === 'function') {
    try {
      const params: any = {};
      if (window.tt_test_id) {
        params.test_event_code = window.tt_test_id;
      }
      window.ttq.page(params);
    } catch (error) {
      console.error('[TikTok Pixel] Error tracking PageView:', error);
    }
  } else {
    console.warn('[TikTok Pixel] ttq.page not available for PageView');
  }
}

// Also export as default for convenience
export default trackTikTokEvent;
