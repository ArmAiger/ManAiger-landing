'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/src/lib/api';
import { toast } from 'react-hot-toast';
import { trackUserRegistration } from '@/src/lib/tracking';

export default function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error first
        const error = searchParams.get('error');
        if (error) {
          const errorMessage = decodeURIComponent(error);
          toast.error(errorMessage);
          router.push('/login');
          return;
        }

        const token = searchParams.get('token');
        const refresh = searchParams.get('refresh');
        const userParam = searchParams.get('user');
        const isNew = searchParams.get('isNew') === 'true';
        const message = searchParams.get('msg');

        if (!token || !refresh || !userParam) {
          const errorMsg = 'Invalid authentication data';
          toast.error(errorMsg);
          router.push('/login');
          return;
        }

        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Process the authentication data
        const authData = {
          user,
          accessToken: token,
          refreshToken: refresh,
          isNewUser: isNew,
          message: message ? decodeURIComponent(message) : undefined
        };

        const result = api.loginWithGoogle(authData);
        if (result.error) {
          toast.error(result.error);
          router.push('/login');
          return;
        }

        // Track successful registration/login for all pixels
        if (isNew) {
          trackUserRegistration('google');
        }

        const welcomeMessage = authData.message || (isNew
          ? `Welcome to ManAIger, ${user.name}! Account created successfully.`
          : `Welcome back, ${user.name}!`);

        toast.success(welcomeMessage);

        router.push('/dashboard');

      } catch (error) {
        console.error('Auth callback error:', error);
        const errorMsg = 'Authentication failed';
        toast.error(errorMsg);
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Completing authentication...
        </h2>
        <p className="text-gray-600">
          Please wait while we finish logging you in.
        </p>
      </div>
    </div>
  );
}
