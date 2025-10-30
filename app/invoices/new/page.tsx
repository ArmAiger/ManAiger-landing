// Extend Window interface for tracking helpers
declare global {
  interface Window {
    manaiTrack?: (event: string) => void;
    ttqTrack?: (event: string) => void;
  }
}
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/src/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'react-hot-toast';
import Protected from '@/components/layout/Protected';

interface Deal {
  id: string;
  title: string;
  brand?: {
    name: string;
  };
  agreed_amount?: number;
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dealId = searchParams.get('dealId');

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    amount: '',
    currency: 'USD',
    description: '',
    paymentMethodType: 'STRIPE_ADMIN' as 'STRIPE_ADMIN' | 'CUSTOM_LINK',
    customPaymentLink: '',
    customPaymentInstructions: '',
    dueDate: '',
    paymentTerms: 'due_on_receipt',
    footer: 'Thank you for your business! Please contact us if you have any questions.',
    projectReference: ''
  });

  useEffect(() => {
    if (dealId) {
      loadDeal();
    }
  }, [dealId]);

  const loadDeal = async () => {
    try {
      const response = await api.getDeal(dealId!);
      if (response.data) {
        const dealData = response.data;
        setDeal(dealData);
        setFormData(prev => ({
          ...prev,
          brandName: dealData.brand?.name || '',
          amount: dealData.agreed_amount?.toString() || dealData.proposed_amount?.toString() || '',
          description: `Invoice for ${dealData.title}`,
          projectReference: `Deal #${dealData.id.substring(0, 8)}`
        }));
      }
    } catch (error) {
      console.error('Failed to load deal:', error);
      toast.error('Failed to load deal details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const invoiceData = {
        dealId: dealId,
        brandName: formData.brandName,
        amount: parseFloat(formData.amount),
        currency: formData.currency.toLowerCase(),
        description: formData.description,
        paymentMethodType: formData.paymentMethodType,
        customPaymentLink: formData.paymentMethodType === 'CUSTOM_LINK' ? formData.customPaymentLink : null,
        customPaymentInstructions: formData.paymentMethodType === 'CUSTOM_LINK' ? formData.customPaymentInstructions : null,
        dueDate: formData.dueDate || null,
        paymentTerms: formData.paymentTerms,
        footer: formData.footer,
        projectReference: formData.projectReference,
        useStripeInvoice: formData.paymentMethodType === 'STRIPE_ADMIN'
      };

      const response = await api.createInvoice(invoiceData);

      if (response.data) {
        toast.success('Invoice created successfully!');
        // Fire tracking events after successful invoice creation
        if (typeof window !== 'undefined') {
          window.manaiTrack && window.manaiTrack('invoice_created');
          window.ttqTrack && window.ttqTrack('invoice_created');
        }
        router.push('/invoices');
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Protected>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="text-gray-600 mt-1">
            {deal ? `Creating invoice for: ${deal.title}` : 'Create a new invoice'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Invoice Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Name *
                  </label>
                  <Input
                    value={formData.brandName}
                    onChange={(e) => handleInputChange('brandName', e.target.value)}
                    placeholder="Enter brand name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <Select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Invoice description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Reference
                  </label>
                  <Input
                    value={formData.projectReference}
                    onChange={(e) => handleInputChange('projectReference', e.target.value)}
                    placeholder="Project or deal reference"
                  />
                </div>
              </div>
            </Card>

            {/* Right Column - Payment Method */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How should brands pay this invoice?
                  </label>
                  
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="STRIPE_ADMIN"
                        checked={formData.paymentMethodType === 'STRIPE_ADMIN'}
                        onChange={(e) => handleInputChange('paymentMethodType', e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Platform Payment</div>
                        <div className="text-sm text-gray-600">
                          Brands pay through our secure Stripe integration. Funds go to platform account.
                        </div>
                        <div className="text-xs text-amber-600 mt-1">
                          ⚠️ Note: Payments will go to the platform account, not directly to you.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CUSTOM_LINK"
                        checked={formData.paymentMethodType === 'CUSTOM_LINK'}
                        onChange={(e) => handleInputChange('paymentMethodType', e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Your Payment Link</div>
                        <div className="text-sm text-gray-600">
                          Use your own Stripe, PayPal, or other payment link. You receive payments directly.
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          ✅ Recommended: Payments go directly to your account.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.paymentMethodType === 'CUSTOM_LINK' && (
                  <div className="space-y-4 mt-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Payment Link *
                      </label>
                      <Input
                        type="url"
                        value={formData.customPaymentLink}
                        onChange={(e) => handleInputChange('customPaymentLink', e.target.value)}
                        placeholder="https://buy.stripe.com/... or https://paypal.me/..."
                        required
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Your Stripe payment link, PayPal.me link, or other payment URL
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Instructions
                      </label>
                      <textarea
                        value={formData.customPaymentInstructions}
                        onChange={(e) => handleInputChange('customPaymentInstructions', e.target.value)}
                        placeholder="Additional instructions for the brand (optional)"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-purple focus:border-brand-purple"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Payment Terms */}
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">Payment Terms</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <Select
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                >
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_7">Net 7 Days</option>
                  <option value="net_15">Net 15 Days</option>
                  <option value="net_30">Net 30 Days</option>
                  <option value="net_60">Net 60 Days</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer Message
              </label>
              <textarea
                value={formData.footer}
                onChange={(e) => handleInputChange('footer', e.target.value)}
                placeholder="Thank you message or additional notes"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-brand-purple focus:border-brand-purple"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </Protected>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}
