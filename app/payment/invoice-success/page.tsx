'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';

interface Invoice {
  id: string;
  brandName?: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

function InvoicePaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyInvoicePayment = async () => {
      try {
        if (!sessionId) {
          setError('No payment session found');
          setLoading(false);
          return;
        }

        // Verify the payment session
        const verifyResponse = await api.verifyPayment(sessionId);
        if (verifyResponse.error) {
          setError('Payment verification failed: ' + verifyResponse.error);
          setLoading(false);
          return;
        }

        // Get the invoice ID from the session metadata
        if (verifyResponse.data?.metadata?.invoiceId) {
          const invoiceResponse = await api.getInvoice(verifyResponse.data.metadata.invoiceId);
          if (invoiceResponse.data) {
            setInvoice(invoiceResponse.data);
          } else {
            setError('Invoice not found');
          }
        } else {
          setError('Invoice ID not found in payment session');
        }

        setLoading(false);
      } catch (err) {
        console.error('Invoice payment verification error:', err);
        setError('Failed to verify invoice payment');
        setLoading(false);
      }
    };

    verifyInvoicePayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/invoices')} className="w-full">
                View All Invoices
              </Button>
              <Button variant="secondary" onClick={() => router.push('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">💰</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your invoice payment has been processed successfully.
          </p>

          {invoice && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Invoice ID:</span>
                  <span className="text-sm font-medium text-gray-900">#{invoice.id}</span>
                </div>
                {invoice.brandName && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Brand:</span>
                    <span className="text-sm font-medium text-gray-900">{invoice.brandName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm font-medium text-green-600">
                    {invoice.currency.toUpperCase()} ${invoice.amount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="text-sm font-medium text-green-600">
                    {invoice.status === 'paid' ? 'Paid' : 'Processing'}
                  </span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Paid At:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(invoice.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={() => router.push('/invoices')} className="w-full">
              View All Invoices
            </Button>
            <Button variant="secondary" onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function InvoicePaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div>Loading...</div></div>}>
      <InvoicePaymentSuccessContent />
    </Suspense>
  );
}
