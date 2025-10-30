'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CountrySelect from '@/components/ui/CountrySelect';
import LanguageSelect from '@/components/ui/LanguageSelect';
import { api } from '../src/lib/api';
import { toast } from 'react-hot-toast';

interface CreatorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface OnboardingData {
  // Location & Language
  country: string;
  timezone: string;
  primary_language: string[];
  content_languages?: string[];
  
  // Platform Data
  primary_platforms: string[];
  audience_sizes: { [platform: string]: string };
  average_views: { [platform: string]: string };
  
  // Content & Interests
  top_niches: string[];
  brand_categories: string[];
  
  // Deal Preferences
  deal_types: string[];
  minimum_rates?: { [platform: string]: number };
  preferred_currency: string;
  
  // International Preferences
  accepts_international_brands: boolean;
  shipping_preferences: string;
}

const STEPS = [
  { id: 1, title: 'Location & Language', description: 'Tell us where you\'re based' },
  { id: 2, title: 'Platform & Audience', description: 'Your social media presence' },
  { id: 3, title: 'Content & Interests', description: 'What you create and promote' },
  { id: 4, title: 'Deal Preferences', description: 'How you like to work with brands' }
];

const TIMEZONES = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00',
  'UTC-05:00', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00',
  'UTC+02:00', 'UTC+03:00', 'UTC+04:00', 'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00',
  'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
];

const PLATFORMS = [
  'YouTube', 'Instagram', 'TikTok', 'Twitter', 'Twitch', 'LinkedIn', 'Facebook', 'Pinterest', 'Snapchat'
];

const AUDIENCE_SIZES = [
  '1K-10K', '10K-50K', '50K-100K', '100K-500K', '500K-1M', '1M-5M', '5M+'
];

const NICHES = [
  'Technology', 'Gaming', 'Beauty', 'Fashion', 'Fitness', 'Food', 'Travel', 'Lifestyle',
  'Education', 'Finance', 'Health', 'Entertainment', 'Sports', 'Music', 'Art', 'Business'
];

const BRAND_CATEGORIES = [
  'Apparel', 'Supplements', 'SaaS', 'Wellness', 'Peripherals', 'Apps', 'Beauty Products',
  'Tech Gadgets', 'Food & Beverage', 'Gaming Equipment', 'Fitness Equipment', 'Home & Garden',
  'Electronics', 'Books & Education', 'Travel & Tourism', 'Financial Services'
];

const AVERAGE_VIEWS_RANGES = [
  'Under 1K', '1K-5K', '5K-10K', '10K-25K', '25K-50K', '50K-100K', '100K-500K', '500K-1M', '1M+'
];

const DEAL_TYPES = [
  'Flat Fee', 'Affiliate', 'Gifted', 'Rev-Share', 'UGC Only', 'Sponsored Posts', 
  'Product Reviews', 'Brand Ambassadorship', 'Event Appearances', 'Content Creation', 'Consulting'
];

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'KRW', 'BRL', 'MXN', 'INR'
];

export default function CreatorOnboardingModal({ isOpen, onClose, onComplete }: CreatorOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    country: '',
    timezone: '',
    primary_language: [],
    content_languages: [],
    primary_platforms: [],
    audience_sizes: {},
    average_views: {},
    top_niches: [],
    brand_categories: [],
    deal_types: [],
    minimum_rates: {},
    preferred_currency: 'USD',
    accepts_international_brands: true,
    shipping_preferences: 'international_shipping'
  });

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.country && data.timezone && data.primary_language.length > 0);
      case 2:
        return !!(data.primary_platforms.length > 0 && 
                 data.primary_platforms.every(platform => data.audience_sizes[platform]));
      case 3:
        return !!(data.top_niches.length >= 1 && data.top_niches.length <= 3 && data.brand_categories.length > 0);
      case 4:
        return !!(data.deal_types.length > 0 && data.preferred_currency && data.shipping_preferences);
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

    const completeOnboarding = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await api.saveCreatorProfile({
        ...data,
        onboarding_completed: true
      });

      if (response.data) {
        await api.completeOnboarding();
        toast.success('Profile completed successfully!');
        onComplete();
        onClose();
      } else {
        throw new Error(response.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  const updateData = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: keyof OnboardingData, value: string) => {
    setData(prev => {
      const currentArray = (prev[field] as string[]) || [];
      return {
        ...prev,
        [field]: currentArray.includes(value)
          ? currentArray.filter((item: string) => item !== value)
          : [...currentArray, value]
      };
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location & Language</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <CountrySelect
                value={data.country}
                onChange={(value) => updateData('country', value)}
                placeholder="Select your country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone *</label>
              <Select
                value={data.timezone}
                onChange={(e) => updateData('timezone', e.target.value)}
              >
                <option value="">Select your timezone</option>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </Select>
            </div>

            <LanguageSelect
              value={data.primary_language}
              onChange={(value) => updateData('primary_language', value)}
              label="Primary Languages *"
              placeholder="Select your primary languages"
            />

            <LanguageSelect
              value={data.content_languages || []}
              onChange={(value) => updateData('content_languages', value)}
              label="Content Languages (if different from primary)"
              placeholder="Select content creation languages"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Platform & Audience</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Platforms * (Select all that apply)</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(platform => (
                  <label key={platform} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={data.primary_platforms.includes(platform)}
                      onChange={() => toggleArrayValue('primary_platforms', platform)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {data.primary_platforms.map(platform => (
              <div key={platform} className="space-y-2">
                <h4 className="font-medium">{platform} Details</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Audience Size *</label>
                  <Select
                    value={data.audience_sizes[platform] || ''}
                    onChange={(e) => updateData('audience_sizes', { ...data.audience_sizes, [platform]: e.target.value })}
                  >
                    <option value="">Select audience size</option>
                    {AUDIENCE_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Average Views/Engagement</label>
                  <Select
                    value={data.average_views[platform] || ''}
                    onChange={(e) => updateData('average_views', { ...data.average_views, [platform]: e.target.value })}
                  >
                    <option value="">Select average views range</option>
                    {AVERAGE_VIEWS_RANGES.map(range => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </Select>
                </div>
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content & Interests</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Top 3 Niches * (Select up to 3)</label>
              <div className="grid grid-cols-2 gap-2">
                {NICHES.map(niche => (
                  <label key={niche} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={data.top_niches.includes(niche)}
                      onChange={() => toggleArrayValue('top_niches', niche)}
                      disabled={!data.top_niches.includes(niche) && data.top_niches.length >= 3}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{niche}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand Categories Interested In * (Select all that apply)</label>
              <div className="grid grid-cols-2 gap-2">
                {BRAND_CATEGORIES.map(category => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={data.brand_categories.includes(category)}
                      onChange={() => toggleArrayValue('brand_categories', category)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deal Preferences</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Deal Types * (Select all that apply)</label>
              <div className="grid grid-cols-1 gap-2">
                {DEAL_TYPES.map(dealType => (
                  <label key={dealType} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={data.deal_types.includes(dealType)}
                      onChange={() => toggleArrayValue('deal_types', dealType)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{dealType}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Currency *</label>
              <Select
                value={data.preferred_currency}
                onChange={(e) => updateData('preferred_currency', e.target.value)}
              >
                {CURRENCIES.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rate Guidance (Optional)</label>
              <p className="text-sm text-gray-500 mb-2">Set minimum rates for each platform, or leave blank for AI suggestions</p>
              {data.primary_platforms.map(platform => (
                <div key={platform} className="mb-2">
                  <label className="block text-sm text-gray-600 mb-1">{platform} minimum rate ({data.preferred_currency})</label>
                  <Input
                    type="number"
                    value={data.minimum_rates?.[platform] || ''}
                    onChange={(e) => updateData('minimum_rates', { 
                      ...data.minimum_rates, 
                      [platform]: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="e.g., 500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={data.accepts_international_brands}
                  onChange={(e) => updateData('accepts_international_brands', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">I'm open to working with international brands</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Preferences *</label>
              <Select
                value={data.shipping_preferences}
                onChange={(e) => updateData('shipping_preferences', e.target.value)}
              >
                <option value="digital_only">Digital Products Only</option>
                <option value="domestic_shipping">Domestic Shipping Only</option>
                <option value="international_shipping">International Shipping Available</option>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal open={isOpen} onClose={() => {}}>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Complete Your Creator Profile</h2>
          <p className="text-gray-600">Help us find the perfect brand matches for you</p>
          
          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Step {currentStep} of {STEPS.length}</span>
              <span>{Math.round((currentStep / STEPS.length) * 100)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button
            onClick={prevStep}
            disabled={currentStep === 1}
            variant="secondary"
          >
            Previous
          </Button>

          {currentStep === STEPS.length ? (
            <Button
              onClick={completeOnboarding}
              disabled={loading || !validateStep(currentStep)}
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
