'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { api } from '../../src/lib/api';
import { isAuthenticated } from '../../src/lib/api';
import { trackUserRegistration } from '../../src/lib/tracking';
import { toast } from 'react-hot-toast';

interface OnboardingData {
  step1: {
    name: string;
    company: string;
    role: string;
    teamSize: string;
  };
  step2: {
    industry: string;
    goals: string[];
    budget: string;
  };
  step3: {
    experience: string;
    tools: string[];
    challenges: string[];
  };
}

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Tell us about yourself' },
  { id: 2, title: 'Business Details', description: 'Your business and goals' },
  { id: 3, title: 'Experience & Tools', description: 'Your current setup' },
  { id: 4, title: 'Complete Setup', description: 'Finalize your account' }
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Other'
];

const GOALS = [
  'Increase brand awareness',
  'Generate more leads',
  'Improve customer engagement',
  'Expand market reach',
  'Optimize marketing spend',
  'Build partnerships'
];

const TOOLS = [
  'Google Ads',
  'Facebook Ads',
  'LinkedIn Ads',
  'Email Marketing',
  'Content Marketing',
  'SEO Tools',
  'Analytics Tools',
  'CRM Systems'
];

const CHALLENGES = [
  'Finding the right partners',
  'Managing multiple campaigns',
  'Measuring ROI',
  'Creating engaging content',
  'Budget optimization',
  'Time management'
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    step1: {
      name: '',
      company: '',
      role: '',
      teamSize: ''
    },
    step2: {
      industry: '',
      goals: [],
      budget: ''
    },
    step3: {
      experience: '',
      tools: [],
      challenges: []
    }
  });

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  const updateStepData = (step: keyof OnboardingData, updates: any) => {
    setData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...updates }
    }));
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(data.step1.name && data.step1.company && data.step1.role && data.step1.teamSize);
      case 2:
        return !!(data.step2.industry && data.step2.goals.length > 0 && data.step2.budget);
      case 3:
        return !!(data.step3.experience && data.step3.tools.length > 0 && data.step3.challenges.length > 0);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const completeOnboarding = async () => {
    try {
      setLoading(true);
      
      // Note: This is a simple onboarding completion
      // The actual creator profile data should be saved separately
      const response = await api.completeOnboarding();
      if (response.data) {
        toast.success('Onboarding completed successfully!');
        // Fire tracking events after successful account creation
        trackUserRegistration('onboarding');
        router.push('/dashboard');
      } else {
        throw new Error(response.error || 'Failed to complete onboarding');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <Input
          type="text"
          value={data.step1.name}
          onChange={(e) => updateStepData('step1', { name: e.target.value })}
          placeholder="Enter your full name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Name *
        </label>
        <Input
          type="text"
          value={data.step1.company}
          onChange={(e) => updateStepData('step1', { company: e.target.value })}
          placeholder="Enter your company name"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Role *
        </label>
        <Select
          value={data.step1.role}
          onChange={(e) => updateStepData('step1', { role: e.target.value })}
        >
          <option value="">Select your role</option>
          <option value="founder">Founder/CEO</option>
          <option value="marketing_manager">Marketing Manager</option>
          <option value="marketing_director">Marketing Director</option>
          <option value="business_owner">Business Owner</option>
          <option value="consultant">Consultant</option>
          <option value="other">Other</option>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Team Size *
        </label>
        <Select
          value={data.step1.teamSize}
          onChange={(e) => updateStepData('step1', { teamSize: e.target.value })}
        >
          <option value="">Select team size</option>
          <option value="1">Just me</option>
          <option value="2-5">2-5 people</option>
          <option value="6-20">6-20 people</option>
          <option value="21-50">21-50 people</option>
          <option value="50+">50+ people</option>
        </Select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Industry *
        </label>
        <Select
          value={data.step2.industry}
          onChange={(e) => updateStepData('step2', { industry: e.target.value })}
        >
          <option value="">Select your industry</option>
          {INDUSTRIES.map(industry => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Marketing Goals * (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map(goal => (
            <label key={goal} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step2.goals.includes(goal)}
                onChange={() => updateStepData('step2', {
                  goals: toggleArrayItem(data.step2.goals, goal)
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{goal}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Monthly Marketing Budget *
        </label>
        <Select
          value={data.step2.budget}
          onChange={(e) => updateStepData('step2', { budget: e.target.value })}
        >
          <option value="">Select budget range</option>
          <option value="<1k">Less than $1,000</option>
          <option value="1k-5k">$1,000 - $5,000</option>
          <option value="5k-10k">$5,000 - $10,000</option>
          <option value="10k-25k">$10,000 - $25,000</option>
          <option value="25k+">$25,000+</option>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Marketing Experience *
        </label>
        <Select
          value={data.step3.experience}
          onChange={(e) => updateStepData('step3', { experience: e.target.value })}
        >
          <option value="">Select your experience level</option>
          <option value="beginner">Beginner (0-1 years)</option>
          <option value="intermediate">Intermediate (2-5 years)</option>
          <option value="advanced">Advanced (5+ years)</option>
          <option value="expert">Expert (10+ years)</option>
        </Select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Tools * (Select all that apply)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TOOLS.map(tool => (
            <label key={tool} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step3.tools.includes(tool)}
                onChange={() => updateStepData('step3', {
                  tools: toggleArrayItem(data.step3.tools, tool)
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{tool}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Biggest Challenges * (Select all that apply)
        </label>
        <div className="grid grid-cols-1 gap-2">
          {CHALLENGES.map(challenge => (
            <label key={challenge} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.step3.challenges.includes(challenge)}
                onChange={() => updateStepData('step3', {
                  challenges: toggleArrayItem(data.step3.challenges, challenge)
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{challenge}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl mb-4">🎉</div>
      <h3 className="text-2xl font-bold text-gray-900">You're All Set!</h3>
      <p className="text-gray-600 max-w-md mx-auto">
        Thank you for completing the onboarding process. We'll use this information to personalize your experience and help you achieve your marketing goals.
      </p>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Explore your personalized dashboard</li>
          <li>• Set up your first brand matching campaign</li>
          <li>• Connect with potential partners</li>
          <li>• Start generating leads and revenue</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-600">
              {STEPS[currentStep - 1].description}
            </p>
          </div>
        </div>

        <Card className="p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              onClick={prevStep}
              variant="secondary"
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={completeOnboarding}
                disabled={loading}
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}