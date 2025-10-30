'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function TermsOfService() {
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
          
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-8">Effective Date: September 10, 2025</p>
          
          <div className="prose max-w-none">
            <p className="mb-6">
              Welcome to ManAIger. By using our services, you agree to these Terms of Service. Please read them carefully.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Eligibility</h2>
            <p className="mb-6">
              You must be at least 16 years old to use ManAIger. By using the platform, you confirm you have 
              the authority to enter into these terms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Services Provided</h2>
            <p className="mb-6">
              ManAIger offers AI-powered tools to help creators manage brand deals, negotiations, invoicing, 
              and affiliate earnings.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Accounts</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account and password.</li>
              <li>You must provide accurate information and keep it updated.</li>
              <li>We reserve the right to suspend or terminate accounts for misuse.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Payments & Subscriptions</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Subscription fees are billed in advance on a monthly basis (or as otherwise stated).</li>
              <li>All fees are non-refundable unless required by law.</li>
              <li>Failure to pay may result in suspension of access.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Affiliate Program</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Affiliates earn commissions based on tracked referrals.</li>
              <li>Commission terms (e.g., 20% recurring for 12 months) are defined in affiliate agreements.</li>
              <li>Fraudulent or self-referrals are not allowed.</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Use Restrictions</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Reverse-engineer, copy, or resell ManAIger without permission.</li>
              <li>Use ManAIger for unlawful purposes.</li>
              <li>Abuse the platform (spam, harassment, fraudulent activity).</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
            <p className="mb-6">
              All software, branding, and content in ManAIger are owned by the Company. You are granted a 
              limited, non-transferable license to use the platform.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
            <p className="mb-6">
              ManAIger is provided "as is." We are not liable for indirect, incidental, or consequential 
              damages, including loss of revenue, deals, or data.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Termination</h2>
            <p className="mb-6">
              You may cancel your account anytime. We may suspend or terminate accounts violating these terms.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Governing Law</h2>
            <p className="mb-6">These Terms are governed by the laws of US/NY.</p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Changes to Terms</h2>
            <p className="mb-6">
              We may update these Terms of Service. Updates will be effective once posted.
            </p>

            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="mb-8">
              Questions? Reach us at: <a href="mailto:hello@manaiger.co" className="text-brand-purple hover:underline">hello@manaiger.co</a>
            </p>

            <div className="border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Refund Policy</h2>
              <p className="mb-4">
                All subscription fees for ManAIger are non-refundable. This includes partial months of service, 
                upgrade/downgrade changes, and unused time on an active account.
              </p>
              <p className="mb-4">
                <strong>First-Time Guarantee:</strong> If this is your first subscription purchase with ManAIger, 
                you are eligible for a 7-day money-back guarantee. To request a refund, you must contact us at 
                <a href="mailto:hello@manaiger.co" className="text-brand-purple hover:underline"> hello@manaiger.co</a> within 7 days of your initial payment.
              </p>
              <p className="mb-4">
                <strong>Exceptions:</strong> Outside of the first-time guarantee, refunds may only be issued in 
                the case of verified billing errors (such as duplicate charges or incorrect amounts). Requests 
                must be made within 14 days of the charge.
              </p>
              <p className="mb-6">
                We do not provide refunds for change of mind, unused features, or dissatisfaction unless 
                required by applicable law.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
