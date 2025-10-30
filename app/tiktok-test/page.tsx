'use client';

import { useEffect, useState } from 'react';
import { trackCompleteRegistration, trackPageView } from '@/src/lib/tiktok-pixel';
import Button from '@/components/ui/Button';

// For testing TikTok Pixel implementation
// Access via /tiktok-test (for dev/testing purposes only)

export default function TikTokTestPage() {
  const [pixelStatus, setPixelStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [ttqStatus, setTtqStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Check for test ID parameter
    const urlParams = new URLSearchParams(window.location.search);
    const testId = urlParams.get('tt_test_id');
    if (testId) {
      setTtqStatus(`✅ ttq loaded with Test ID: ${testId}`);
      window.tt_test_id = testId;
      sessionStorage.setItem('tt_test_id', testId);
    }
    
    // Check if TikTok pixel is properly loaded
    const checkPixelStatus = () => {
      if (typeof window !== 'undefined') {
        if (window.ttq && typeof window.ttq.track === 'function') {
          setPixelStatus('loaded');
          const testInfo = window.tt_test_id ? ` (Test ID: ${window.tt_test_id})` : '';
          setTtqStatus('✅ ttq object loaded and functional' + testInfo);
        } else if (window.ttq) {
          setPixelStatus('error');
          setTtqStatus('⚠️ ttq object exists but track function not available');
        } else {
          setPixelStatus('error');
          setTtqStatus('❌ ttq object not found');
        }
      }
    };

    // Check immediately
    checkPixelStatus();

    // Also check after a delay in case pixel is still loading
    const timer = setTimeout(checkPixelStatus, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const testCompleteRegistration = () => {
    try {
      trackCompleteRegistration();
      alert('CompleteRegistration event fired! Check DevTools console and TikTok Test Events.');
    } catch (error) {
      console.error('Error firing CompleteRegistration:', error);
      alert('Error firing CompleteRegistration event. Check console.');
    }
  };

  const testPageView = () => {
    try {
      trackPageView();
      alert('PageView event fired! Check DevTools console and TikTok Test Events.');
    } catch (error) {
      console.error('Error firing PageView:', error);
      alert('Error firing PageView event. Check console.');
    }
  };

  const testDirectTtq = () => {
    try {
      if (typeof window !== 'undefined' && window.ttq) {
        // Direct ttq.track call
        (window as any).ttq.track('CompleteRegistration', {
          event_id: 'test_reg_' + Date.now(),
          value: 0,
          currency: 'USD',
          ...(window.tt_test_id && { test_event_code: window.tt_test_id })
        });
        alert('Direct ttq.track fired! Check DevTools console and TikTok Test Events.');
      } else {
        throw new Error('ttq not available');
      }
    } catch (error) {
      console.error('Error with direct ttq.track:', error);
      alert('Error with direct ttq.track. Check console.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            TikTok Pixel Test Page
          </h1>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Pixel Status</h2>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Status:</strong> 
                <span className={`ml-2 font-medium ${
                  pixelStatus === 'loaded' ? 'text-green-600' : 
                  pixelStatus === 'error' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {pixelStatus}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                <strong>TikTok ttq:</strong> {ttqStatus}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Test Events</h2>
            <p className="text-sm text-gray-600 mb-4">
              Open TikTok Ads Manager → Events Manager → Select Pixel → Test Events
              <br />
              Click "Open website" to append ?tt_test_id=... to the URL
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={testPageView}
                variant="secondary" 
                className="w-full"
              >
                Test PageView Event
              </Button>
              
              <Button 
                onClick={testCompleteRegistration}
                variant="primary" 
                className="w-full"
              >
                Test CompleteRegistration Event
              </Button>
              
              <Button 
                onClick={testDirectTtq}
                variant="secondary" 
                className="w-full"
              >
                Test Direct ttq.track Call
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-medium text-blue-900 mb-2">Verification Checklist:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Open DevTools Console</li>
              <li>✓ Navigate to TikTok Test Events</li>
              <li>✓ Check Network tab for analytics.tiktok.com requests</li>
              <li>✓ Verify events show as "Active" in Events Manager</li>
              <li>✓ Test with ad blockers disabled</li>
            </ul>
          </div>

          <div className="mt-6 bg-yellow-50 p-4 rounded">
            <h3 className="font-medium text-yellow-800 mb-2">Pixel ID & Domains:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li><strong>Pixel ID:</strong> D34CKLJC77U7TGIREQ50</li>
              <li><strong>Analytics Domain:</strong> https://analytics.tiktok.com/</li>
              <li><strong>Business API:</strong> https://business-api.tiktok.com/</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
