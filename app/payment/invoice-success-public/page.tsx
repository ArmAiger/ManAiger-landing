'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

function InvoicePaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simple loading delay for better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleLearnMore = () => {
    // Navigate to a landing page or about section
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Payment...
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your payment.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <span className="text-4xl">✅</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Thank you for your payment. The transaction has been completed successfully.
          </p>
        </div>

        {/* Introduction to ManAIger */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="p-8">
            <div className="mb-4">
              <span className="text-3xl mb-4 block">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Powered by ManAIger
            </h3>
            <p className="text-gray-600 mb-4">
              This invoice was created using ManAIger - the AI-powered platform that helps content creators and influencers manage their brand partnerships, track analytics, and scale their business.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                AI-powered brand matching
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Automated invoicing & payments
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Real-time analytics tracking
              </div>
            </div>
          </Card>

          <Card className="p-8 border-2 border-blue-200 bg-blue-50">
            <div className="mb-4">
              <Badge label="Special Offer" tone="blue" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Start Your Creator Journey
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of creators who use ManAIger to find brand partnerships, automate their workflow, and increase their earnings.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleSignUp}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Start Free Trial
              </Button>
              <Button 
                variant="secondary"
                onClick={handleLearnMore}
                className="w-full"
              >
                Learn More
              </Button>
            </div>
          </Card>
        </div>

        {/* Features Showcase */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Creators Choose ManAIger
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">AI Brand Matching</h4>
              <p className="text-sm text-gray-600">
                Our AI finds the perfect brands for your niche and audience automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Analytics Insights</h4>
              <p className="text-sm text-gray-600">
                Track your performance and optimize your content strategy with detailed analytics.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Automated Payments</h4>
              <p className="text-sm text-gray-600">
                Create professional invoices and get paid faster with automated payment processing.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Scale Your Creator Business?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join ManAIger today and discover how AI can transform your content creation journey. 
            Get matched with brands, automate your workflow, and maximize your earnings.
          </p>
          <div className="space-x-4">
            <Button 
              onClick={handleSignUp}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
            >
              Get Started Free
            </Button>
            <Button 
              variant="secondary"
              onClick={handleLearnMore}
              className="px-8 py-3"
            >
              Learn More
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Questions? Contact the creator who sent you this invoice or reach out to our support team.
          </p>
          <div className="flex justify-center space-x-6 text-sm">
            <a href="#" className="text-gray-600 hover:text-gray-900">Privacy Policy</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Terms of Service</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Support</a>
          </div>
        </div>
      </div>
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
