'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Extend window to include ttq and test event handling
declare global {
  interface Window {
    ttq?: any;
    ttqTrack?: (eventName: string) => void;
    tt_test_id?: string; // Store test ID globally
  }
}

// Component that handles search params (needs Suspense)
function SearchParamsHandler() {
  const searchParams = useSearchParams();

  // Preserve TikTok test ID across navigation
  useEffect(() => {
    const testId = searchParams.get('tt_test_id');
    if (testId && typeof window !== 'undefined') {
      window.tt_test_id = testId;
      // Store in sessionStorage for persistence
      sessionStorage.setItem('tt_test_id', testId);
    } else if (typeof window !== 'undefined' && !window.tt_test_id) {
      // Restore from sessionStorage if available
      const storedTestId = sessionStorage.getItem('tt_test_id');
      if (storedTestId) {
        window.tt_test_id = storedTestId;
      }
    }
  }, [searchParams]);

  return null;
}

// Component that handles pathname changes
function PathnameHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ttq && typeof window.ttq.page === 'function') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          // Include test_id if available for Test Events
          const pageParams: any = {};
          if (window.tt_test_id) {
            pageParams.test_event_code = window.tt_test_id;
          }
          window.ttq.page(pageParams);
        } catch (error) {
          console.error('[TikTok Pixel] Error firing PageView on route change:', error);
        }
      }, 100);
    } else {
      console.warn('[TikTok Pixel] ttq.page not available on route change');
    }
  }, [pathname]);

  return null;
}

// Main component that combines both handlers
export default function TikTokPixelTracker() {
  // Also fire on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ttq && typeof window.ttq.page === 'function') {
      try {
        const pageParams: any = {};
        if (window.tt_test_id) {
          pageParams.test_event_code = window.tt_test_id;
        }
        window.ttq.page(pageParams);
      } catch (error) {
        console.error('[TikTok Pixel] Error firing PageView on initial load:', error);
      }
    } else {
      console.warn('[TikTok Pixel] ttq.page not available on initial load');
    }
  }, []);

  return (
    <>
      <PathnameHandler />
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>
    </>
  );
}
