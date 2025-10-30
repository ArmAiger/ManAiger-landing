'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Skeleton from '@/components/ui/Skeleton';

interface ProtectedProps {
  children: React.ReactNode;
}

export default function Protected({ children }: ProtectedProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // First do a quick check for token and user
    const token = localStorage.getItem('accessToken');
    const user = api.getUser();
    
    if (!token || !user) {
      api.clearAuth(); // Clear any stale data
      router.replace('/login');
      return;
    }

    let isActive = true; // For cleanup

    const checkAuth = async () => {
      try {
        const [profileResponse, subResponse] = await Promise.all([
          api.getProfile(),
          api.getSubscription()
        ]);

        if (!profileResponse.data) {
          api.clearAuth(); // Clear invalid auth data
          router.replace('/login');
          return;
        }

        // Handle subscription status
        if (subResponse.data?.status === 'incomplete') {
          const plan = subResponse.data.plan;
          // Redirect to success page to handle incomplete subscription
          router.replace(`/payment/success?plan=${plan}`);
          return;
        }

        // Only update state if component is still mounted
        if (isActive) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        api.clearAuth(); // Clear invalid auth data
        router.replace('/login');
      }
    };

    checkAuth();

    // Cleanup function
    return () => {
      isActive = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <div className="hidden lg:flex lg:w-64">
            <Skeleton className="h-screen w-full" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-16 w-full" />
            <div className="p-4">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Mobile backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar 
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
