// Comprehensive tracking utility for all analytics platforms
// This module provides a unified interface for tracking events across TikTok, Facebook, and Google Analytics

/**
 * Tracking utility for user registration completion
 * 
 * This module provides a clean interface for tracking user registration events
 * across all analytics platforms (TikTok Pixel, Facebook Pixel, Google Analytics)
 * 
 * Usage:
 * - trackUserRegistration(method) - fires CompleteRegistration/sign_up events across all platforms
 * - trackUserRegistration('email') - for email signup
 * - trackUserRegistration('google') - for Google OAuth signup
 * - trackUserRegistration('onboarding') - for onboarding completion
 * 
 * Developer Notes:
 * - All tracking functions include proper error handling
 * - Events are only fired when the respective pixel/analytics is available
 * - Method parameter helps distinguish between different registration flows
 */

declare global {
  interface Window {
    ttq?: any;
    ttqTrack?: (eventName: string) => void;
    tt_test_id?: string;
    manaiTrack?: (event: string) => void;
    gtagTrack?: (eventName: string, eventParams?: Record<string, any>) => void;
  }
}

export type RegistrationMethod = 'email' | 'google' | 'onboarding';

/**
 * Track user registration completion across all analytics platforms
 * @param method - The registration method used (email, google, onboarding)
 */
export function trackUserRegistration(method: RegistrationMethod = 'email'): void {
  if (typeof window === 'undefined') return;

  try {
    // TikTok Pixel - CompleteRegistration event
    if (window.ttq && typeof window.ttq.track === 'function') {
      const params: any = {
        event_id: 'reg_' + Date.now(),
        value: 0,
        currency: 'USD'
      };
      if (window.tt_test_id) {
        params.test_event_code = window.tt_test_id;
      }
      window.ttq.track('CompleteRegistration', params);
      console.log('[Tracking] TikTok CompleteRegistration fired');
    } else if (window.ttqTrack) {
      window.ttqTrack('account_created');
      console.log('[Tracking] TikTok account_created fired via ttqTrack');
    }

    // Facebook Pixel - CompleteRegistration event
    if (window.manaiTrack) {
      window.manaiTrack('account_created');
      console.log('[Tracking] Facebook CompleteRegistration fired');
    }

    // Google Analytics - sign_up event
    if (window.gtagTrack) {
      window.gtagTrack('sign_up', { method });
      console.log('[Tracking] Google Analytics sign_up fired with method:', method);
    }

    console.log('[Tracking] User registration tracked successfully');
  } catch (error) {
    console.error('[Tracking] Error tracking user registration:', error);
  }
}

/**
 * Track user registration completion with TikTok Pixel only
 * @param method - The registration method used
 */
export function trackTikTokRegistration(method: RegistrationMethod = 'email'): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.ttq && typeof window.ttq.track === 'function') {
      const params: any = {
        event_id: 'reg_' + Date.now(),
        value: 0,
        currency: 'USD'
      };
      if (window.tt_test_id) {
        params.test_event_code = window.tt_test_id;
      }
      window.ttq.track('CompleteRegistration', params);
      console.log('[Tracking] TikTok CompleteRegistration fired');
    } else if (window.ttqTrack) {
      window.ttqTrack('account_created');
      console.log('[Tracking] TikTok account_created fired via ttqTrack');
    }
  } catch (error) {
    console.error('[Tracking] Error tracking TikTok registration:', error);
  }
}

/**
 * Track user registration completion with Facebook Pixel only
 */
export function trackFacebookRegistration(): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.manaiTrack) {
      window.manaiTrack('account_created');
      console.log('[Tracking] Facebook CompleteRegistration fired');
    }
  } catch (error) {
    console.error('[Tracking] Error tracking Facebook registration:', error);
  }
}

/**
 * Track user registration completion with Google Analytics only
 * @param method - The registration method used
 */
export function trackGoogleAnalyticsRegistration(method: RegistrationMethod = 'email'): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.gtagTrack) {
      window.gtagTrack('sign_up', { method });
      console.log('[Tracking] Google Analytics sign_up fired with method:', method);
    }
  } catch (error) {
    console.error('[Tracking] Error tracking Google Analytics registration:', error);
  }
}

// Export default for convenience
export default trackUserRegistration;
