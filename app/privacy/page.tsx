'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <Link href="/">
              <Button variant="secondary" size="sm">
                ← Back to Home
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-8">Effective Date: September 10, 2025</p>
          
          <div className="prose max-w-none">
            <p className="mb-6">
              ManAIger ("Company," "we," "our," "us") respects your privacy. This Privacy Policy explains how 
              we collect, use, and protect your personal information when you use our website and services.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email, password, country, and other info you provide during signup.</li>
              <li><strong>Payment Information:</strong> We use third-party processors (e.g., Stripe, PayPal). We do not store full credit card details.</li>
              <li><strong>Usage Data:</strong> Information about how you use ManAIger (logins, features used, interactions).</li>
              <li><strong>Communications:</strong> Emails, messages, and customer support interactions.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Information</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>To provide, operate, and improve ManAIger.</li>
              <li>To generate brand matches, invoices, and AI-powered recommendations.</li>
              <li>To process payments and affiliate commissions.</li>
              <li>To communicate updates, offers, and support.</li>
              <li>To ensure compliance with legal obligations.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Sharing of Information</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Service Providers:</strong> Payment processors, cloud hosting, analytics.</li>
              <li><strong>Affiliates:</strong> For tracking referral commissions.</li>
              <li><strong>Legal:</strong> If required by law, regulation, or legal request.</li>
              <li><strong>No Sale of Data:</strong> We do not sell your personal information to third parties.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
            <p className="mb-6">
              We implement security measures (encryption, secure hosting, HTTPS) to protect your data. 
              However, no system is 100% secure.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. International Users</h2>
            <p className="mb-6">
              We operate globally. Your data may be transferred outside your home country, subject to applicable laws.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
            <p className="mb-4">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Access or delete your personal data.</li>
              <li>Export your data ("right to portability").</li>
              <li>Withdraw consent for processing.</li>
            </ul>
            <p className="mb-6">To exercise these, email us at <a href="mailto:hello@manaiger.co" className="text-brand-purple hover:underline">hello@manaiger.co</a></p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Data Retention</h2>
            <p className="mb-6">
              We retain your data as long as your account is active or as needed to provide services.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Children's Privacy</h2>
            <p className="mb-6">Our services are not intended for individuals under 16.</p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Changes to Policy</h2>
            <p className="mb-6">
              We may update this Privacy Policy. Updates will be posted with a new "Effective Date."
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="mb-6">Questions? Reach us at: <a href="mailto:hello@manaiger.co" className="text-brand-purple hover:underline">hello@manaiger.co</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
