'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../src/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lightbox, setLightbox] = useState<null | { src: string; alt: string }>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const user = api.getUser();

      if (token && user) {
        try {
          const response = await api.getProfile();
          if (response.data) {
            router.replace('/dashboard');
            return;
          }
        } catch (error) {
          api.clearAuth();
        }
      }

      setIsAuthenticated(false);
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

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
    <>
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              AI-Powered Creator
              <span className="text-brand-purple"> Management</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl">
              ManAIger asks you a few quick questions about your content, audience, and niche, then pulls a curated list of brands that match your vibe. You get their websites in one place so you can pitch smarter—instead of cold-emailing random companies.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
            <Link href="/signup">
              <Button variant="primary" size="lg" className="min-w-[200px]">
                Get Brand Matches Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg" className="min-w-[200px]">
                Sign In
              </Button>
            </Link>
          </div>
          </div>
          <div className="w-full lg:w-auto">
            <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
              <button
                type="button"
                className="aspect-video bg-gray-100 flex items-center justify-center cursor-zoom-in"
                onClick={() => setLightbox({ src: '/matches.png', alt: 'ManAIger Screenshot' })}
                aria-label="Open screenshot"
              >
                <Image
                  src="/matches.png"
                  alt="ManAIger Screenshot"
                  width={1200}
                  height={1200}
                  className="object-contain w-full h-full p-2"
                  priority
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">How ManAIger Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="text-2xl mb-2">1️⃣</div>
            <h3 className="text-lg font-semibold mb-2">Tell us about your content</h3>
            <p className="text-gray-600 text-sm">
              Fill out a quick 2-minute quiz about your niche, platforms, and follower count so ManAIger understands who you are as a creator.
            </p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl mb-2">2️⃣</div>
            <h3 className="text-lg font-semibold mb-2">Get AI brand matches</h3>
            <p className="text-gray-600 text-sm">
              We’ll surface brands that match your vibe and show their websites so you can pitch smarter.
            </p>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-2xl mb-2">3️⃣</div>
            <h3 className="text-lg font-semibold mb-2">Pitch and track in one place</h3>
            <p className="text-gray-600 text-sm">
              Keep notes, track outreach, and follow up—no more losing potential collabs in your DMs.
            </p>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">See ManAIger in Action</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mt-2">
            Here’s what creators see when they log in. No fluff—just a focused workspace for finding aligned brands and keeping track of who you’ve pitched.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="overflow-hidden flex flex-col">
            <button
              type="button"
              className="aspect-video bg-gray-100 flex items-center justify-center cursor-zoom-in"
              onClick={() => setLightbox({ src: '/list.png', alt: 'Brand Matches List' })}
              aria-label="Open Brand Matches screenshot"
            >
              <Image
                src="/list.png"
                alt="Brand Matches List"
                width={1000}
                height={1000}
                className="object-contain w-full h-full p-2"
              />
            </button>
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-1">Your AI brand matches</h4>
              <p className="text-sm text-gray-600">See a curated list of brands that align with your niche, follower size, and content style.</p>
            </div>
          </Card>
          <Card className="overflow-hidden flex flex-col">
            <button
              type="button"
              className="aspect-video bg-gray-100 flex items-center justify-center cursor-zoom-in"
              onClick={() => setLightbox({ src: '/outreach.png', alt: 'Brand Details' })}
              aria-label="Open Brand Details screenshot"
            >
              <Image
                src="/outreach.png"
                alt="Brand Details"
                width={1000}
                height={1000}
                className="object-contain w-full h-full p-2"
              />
            </button>
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-1">Brand details at a glance</h4>
              <p className="text-sm text-gray-600">Open a match to see who they are and jump straight to their website so you can craft a personalized pitch.</p>
            </div>
          </Card>
          <Card className="overflow-hidden flex flex-col md:col-span-2 lg:col-span-1">
            <button
              type="button"
              className="aspect-video bg-gray-100 flex items-center justify-center cursor-zoom-in"
              onClick={() => setLightbox({ src: '/agreement.png', alt: 'Pitch Tracking / Notes' })}
              aria-label="Open Pitch Tracking screenshot"
            >
              <Image
                src="/agreement.png"
                alt="Pitch Tracking / Notes"
                width={1000}
                height={1000}
                className="object-contain w-full h-full p-2"
              />
            </button>
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-1">Keep track of your pitches</h4>
              <p className="text-sm text-gray-600">Mark who you've pitched and where things stand so no potential collab gets lost in your DMs.</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="border-t border-b bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Built for creators, not agencies</h3>
          <p className="text-sm text-gray-600 max-w-3xl mx-auto">
            ManAIger is a small, independent tool designed for creators who want more control over their brand deals—without waiting to be “big enough” for management.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How ManAIger Helps You Land More Brand Deals
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto"></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Brand Matching</h3>
            <p className="text-gray-600">
              Answer a short onboarding quiz about your content, follower size, and niche, and our AI suggests brands that align with you—no more guessing who to pitch.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Get AI brand matches</h3>
            <p className="text-gray-600">
              We surface brands that fit your niche and show you their websites in one simple dashboard.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">✉️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Pitch from one place</h3>
            <p className="text-gray-600">
              Decide who to contact, track who you’ve pitched, and follow up without losing anything in your DMs.
            </p>
          </Card>

          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🧭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Simple, focused workspace</h3>
            <p className="text-gray-600">
              A clean workflow designed for creators to find aligned brands and manage pitching without the clutter.
            </p>
          </Card>
        </div>
      </div>

      <div className="bg-brand-purple py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Land Better Brand Deals?</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Start by seeing which brands actually match your content. Get a few brand matches free—no credit card required.
          </p>
          <Link href="/signup">
            <Button variant="secondary" size="lg" className="bg-white text-brand-purple hover:bg-gray-50">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>

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
              <a href="mailto:hello@manaiger.co" className="text-gray-400 hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    {lightbox && (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
        <div className="relative w-full max-w-6xl h-[70vh]" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="absolute -top-10 right-0 text-white/90 hover:text-white text-sm"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            Close
          </button>
          <Image
            src={lightbox?.src || ''}
            alt={lightbox?.alt || ''}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            priority
          />
        </div>
      </div>
    )}
    </>
  );
}