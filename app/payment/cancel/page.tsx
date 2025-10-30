'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { api } from '@/src/lib/api';

export default function PaymentCancelPage() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(true);

  useEffect(() => {
    const clearSubscription = async () => {
      try {
        await api.clearPendingSubscription();
      } catch (error) {
        console.error('Failed to clear pending subscription:', error);
      } finally {
        setIsClearing(false);
      }
    };
    clearSubscription();
  }, []);

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center">
          {isClearing ? (
            <>
              <div className="mx-auto flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Cleaning up...</h2>
              <p className="mt-2 text-gray-600">Please wait while we clear your pending subscription.</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Payment cancelled</h2>
              <p className="mt-2 text-gray-600">Your payment was cancelled. No charges were made.</p>
              <Button onClick={goToDashboard} className="mt-6">
                Return to Dashboard
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
