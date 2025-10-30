'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import GoogleLoginButton from '@/components/ui/GoogleLoginButton';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
          // Token might be expired, clear auth and continue to login form
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
    setIsLoading(true);

    const response = await api.login(formData.email, formData.password);
    
    if (response.data) {
      toast.success('Login successful!');
      router.replace('/dashboard');
    } else if (response.error) {
      toast.error(response.error);
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

      // Show appropriate message based on whether user is new or existing
      const message = authData.message || (authData.isNewUser 
        ? `Welcome to ManAIger, ${authData.user.name}! Account created successfully.`
        : `Welcome back, ${authData.user.name}!`);

      toast.success(message);
      router.replace('/dashboard');
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/signup"
              className="font-medium text-brand-purple hover:text-brand-purple/80"
            >
              create a new account
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
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-brand-purple focus:ring-brand-purple border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-brand-purple hover:text-brand-purple/80">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}