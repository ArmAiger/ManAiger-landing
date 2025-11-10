'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// Declare Rewardful for TypeScript
declare global {
  interface Window {
    Rewardful?: (action: string, data?: any) => void;
    fbq?: (action: string, event: string, params?: any) => void;
  }
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'incomplete' | null>(null);
  const sessionId = searchParams.get('session_id');
  const plan = searchParams.get('plan');

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Check subscription status directly
        const subResponse = await api.getSubscription();
        
        if (subResponse.error) {
          setError(subResponse.error);
          setLoading(false);
          return;
        }

        if (!subResponse.data) {
          setError('No subscription data found');
          setLoading(false);
          return;
        }

        // Only update user plan if subscription is actually active
        if (subResponse.data.status === 'active') {
          // Update the user data in localStorage to reflect the new plan
          const user = api.getUser();
          if (user) {
            user.plan = subResponse.data.plan;
            localStorage.setItem('user', JSON.stringify(user));
          }
          setSubscriptionStatus('active');
          const planAmounts: { [key: string]: number } = {
            'starter': 19.00,
            'pro': 39.00,
            'vip': 99.00
          };
          const subscriptionAmount = planAmounts[subResponse.data.plan] || 0;
          try {
            if (typeof window !== 'undefined' && window.fbq) {
              window.fbq('track', 'Subscribe', {
                value: subscriptionAmount,
                currency: 'USD'
              });
              console.log('[Meta Pixel] Subscribe event fired:', {
                value: subscriptionAmount,
                currency: 'USD',
                plan: subResponse.data.plan
              });
            }
          } catch (error) {
            console.error('[Meta Pixel] Error firing Subscribe event:', error);
          }
          try {
            // Method 1: Create a custom event that Rewardful might detect
            const conversionEvent = new CustomEvent('rewardful-conversion', {
              detail: {
                email: user?.email,
                amount: subscriptionAmount,
                currency: 'USD',
                plan: subResponse.data.plan
              }
            });
            window.dispatchEvent(conversionEvent);

            // Method 2: Create a tracking pixel with conversion data
            const trackingImg = document.createElement('img');
            trackingImg.style.display = 'none';
            trackingImg.src = `https://track.getrewardful.com/conversion?email=${encodeURIComponent(user?.email || '')}&amount=${subscriptionAmount}`;
            document.body.appendChild(trackingImg);

          } catch (error) {
            console.log('Alternative tracking error:', error);
          }

        } else if (subResponse.data.status === 'incomplete') {
          setSubscriptionStatus('incomplete');
        }

        setLoading(false);
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify subscription. Please contact support if you believe this is an error.');
        setLoading(false);
      }
    };

    verifySubscription();
  }, [sessionId]);

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Verifying your subscription...</h2>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <Button onClick={goToDashboard} className="mt-4">Return to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (subscriptionStatus === 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Welcome to {plan?.toUpperCase()}!</h2>
            <p className="mt-2 text-gray-600">Your subscription is now active. You can start using all the features right away.</p>
            <Button onClick={goToDashboard} className="mt-4">Go to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Payment Pending</h2>
          <p className="mt-2 text-gray-600">Your subscription requires attention. Please check your email for payment instructions.</p>
          <Button onClick={goToDashboard} className="mt-4">Return to Dashboard</Button>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div>Loading...</div></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
