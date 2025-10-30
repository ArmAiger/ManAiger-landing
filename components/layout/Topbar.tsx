'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface TopbarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function Topbar({ isMobileMenuOpen, setIsMobileMenuOpen }: TopbarProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const localUser = api.getUser();
    setUser(localUser);

    const fetchCurrentUser = async () => {
      try {
        const response = await api.getCurrentUser();
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    if (localUser) {
      fetchCurrentUser();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    try {
      await api.logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="flex h-16 items-center justify-between bg-white border-b border-gray-200 px-4 lg:px-6">
      <div className="flex items-center">
        {/* Mobile menu button */}
        <button
          type="button"
          className="mr-3 h-6 w-6 lg:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Page Title - responsive */}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            <span className="hidden sm:inline">Welcome back, {user?.name || 'User'}!</span>
            <span className="sm:hidden">Hi, {user?.name?.split(' ')[0] || 'User'}!</span>
          </h2>
          <p className="text-sm text-gray-500 hidden sm:block">
            {process.env.NEXT_PUBLIC_APP_TAGLINE || 'Manage your influencer partnerships'}
          </p>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-2 lg:space-x-4">
        {/* Notifications */}
        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <span className="text-lg">🔔</span>
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-1 lg:space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-brand-purple flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden lg:block">{user?.name}</span>
            <span className="text-gray-400 hidden lg:block">▼</span>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Settings
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Billing
              </button>
              <hr className="my-2" />
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}