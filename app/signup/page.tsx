'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import { trackUserRegistration } from '@/src/lib/tracking';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GoogleLoginButton from '@/components/ui/GoogleLoginButton';
import { toast } from 'react-hot-toast';

// Declare Rewardful for TypeScript
declare global {
  interface Window {
    Rewardful?: (action: string, data?: any) => void;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const user = api.getUser();
      
      if (token && user) {
        try {
          const response = await api.getProfile();
          if (response.data) {
            // User is already authenticated, redirect to dashboard
            router.replace('/dashboard');
            return;
          }
        } catch (error) {
          // Token might be expired, clear auth and continue to signup form
          api.clearAuth();
        }
      }
      
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.signup(formData.email, formData.password, formData.name);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      
      if (response.data) {
        // Track successful account creation for all pixels
        trackUserRegistration('email');
        toast.success('Welcome to ManAIger! Account created successfully.');
        // Redirect to dashboard since user is now logged in
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = (authData: any) => {
    try {
      const result = api.loginWithGoogle(authData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Track successful registration/login for all pixels
      if (authData.isNewUser) {
        trackUserRegistration('google');
      }
      // Show appropriate message based on whether user is new or existing
      const message = authData.message || (authData.isNewUser 
        ? `Welcome to ManAIger, ${authData.user.name}! Account created successfully.`
        : `Welcome back, ${authData.user.name}!`);
      
      toast.success(message);
      router.push('/dashboard');
    } catch (error) {
      console.error('Google login processing error:', error);
      toast.error('Failed to complete Google login');
    }
  };

  const handleGoogleError = (error: any) => {
    console.error('Google login error:', error);
    toast.error(error.message || 'Google login failed');
  };

  // Show loading state while checking authentication
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-brand-purple">
            {process.env.NEXT_PUBLIC_APP_NAME || 'ManAIger'}
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/login"
              className="font-medium text-brand-purple hover:text-brand-purple/80"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        <div className="mt-8">
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={isLoading}
            text="Continue with Google"
          />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">Or continue with email</span>
          </div>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password (min. 6 characters)"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-brand-purple hover:text-brand-purple/80 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" target="_blank" className="text-brand-purple hover:text-brand-purple/80 underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}