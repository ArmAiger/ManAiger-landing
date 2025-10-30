'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../src/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function LandingPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const user = api.getUser();
      
      if (token && user) {
        try {
          const response = await api.getProfile();
          if (response.data) {
            // User is authenticated, redirect to dashboard
            router.replace('/dashboard');
            return;
          }
        } catch (error) {
          // Token might be expired, clear auth
          api.clearAuth();
        }
      }

      setIsAuthenticated(false);
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-purple mb-4">
            {process.env.NEXT_PUBLIC_APP_NAME || 'ManAIger'}
          </h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-brand-purple">
                {process.env.NEXT_PUBLIC_APP_NAME || 'ManAIger'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="secondary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Creator
            <span className="text-brand-purple"> Management</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your content creation business with intelligent brand matching,
            automated outreach, and comprehensive analytics. Let AI handle the business
            side while you focus on creating amazing content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/signup">
              <Button variant="primary" size="lg" className="min-w-[200px]">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Sign In
              </Button>
            </Link>
          </div>

          {/* YouTube Video Embed */}
          {/* <div className="flex justify-center">
            <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden shadow-lg border border-gray-200">
              <iframe
                src="https://www.youtube-nocookie.com/embed/a_31NgI7GEA"
                allowFullScreen
                frameBorder="0"
                className="w-full h-full"
                title="ManAIger Demo Video"
                style={{ minHeight: 320 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
            </div>
          </div> */}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Scale Your Creator Business
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From finding the perfect brand matches to managing your collaborations, 
            ManAIger has you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              AI Brand Matching
            </h3>
            <p className="text-gray-600">
              Let our AI analyze your content and automatically find brands that 
              perfectly align with your niche and audience.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Smart Outreach
            </h3>
            <p className="text-gray-600">
              Generate personalized outreach emails and manage your communication 
              pipeline with potential brand partners.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Performance Analytics
            </h3>
            <p className="text-gray-600">
              Track your campaign performance, revenue, and growth with 
              comprehensive analytics and reporting tools.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Revenue Management
            </h3>
            <p className="text-gray-600">
              Manage invoices, track payments, and get insights into your 
              earning potential across different niches.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Niche Optimization
            </h3>
            <p className="text-gray-600">
              Discover and manage multiple content niches to maximize your 
              monetization opportunities.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Workflow Automation
            </h3>
            <p className="text-gray-600">
              Automate repetitive tasks and streamline your creator workflow 
              to focus on what matters most - creating content.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-brand-purple py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Scale Your Creator Business?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are using AI to grow their brand 
            partnerships and maximize their revenue potential.
          </p>
          <Link href="/signup">
            <Button variant="secondary" size="lg" className="bg-white text-brand-purple hover:bg-gray-50">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {process.env.NEXT_PUBLIC_APP_NAME || 'ManAIger'}
            </h3>
            <p className="text-gray-400 mb-4">
              AI-Powered Creator Management Platform
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}