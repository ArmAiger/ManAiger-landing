'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import Protected from '@/components/layout/Protected';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import CreatorOnboardingModal from '@/components/CreatorOnboardingModal';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  dealsInProgress: number;
  earningsThisMonth: number;
  brandMatchesCount: number;
  totalEarnings: number;
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: any;
}

interface BriefingItem {
  id: string;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
}

// Icons for activity feed
const activityIcons: Record<string, string> = {
  "brand_match_generated": "🎯",
  "outreach_sent": "📧",
  "invoice_created": "📄",
  "invoice_paid": "💰",
  "analytics_updated": "📊",
  "brand_created": "🏢",
  "user_register": "👋",
  "billing_subscribe": "⭐",
  "billing_cancel": "⚠️",
  "billing_subscription_created": "💳",
  "billing_subscription_updated": "🔄",
  "billing_subscription_deleted": "❌",
  "brand_match_status_updated": "📝",
  "outreach_drafted": "✍️",
  "default": "📌"
};

// Function to format activity messages in a user-friendly way
const formatActivityMessage = (activity: ActivityItem): string => {
  switch (activity.type) {
    case 'invoice_created':
      return activity.metadata?.invoiceId
        ? `New invoice created (${activity.metadata.invoiceId.substring(0, 8)}...)`
        : 'New invoice created';

    case 'invoice_paid':
      return activity.metadata?.sessionId
        ? `Invoice payment received`
        : 'Invoice payment received';

    case 'billing_cancel':
      return 'Subscription cancelled - will end at period close';

    case 'billing_subscribe':
      return activity.metadata?.plan
        ? `Subscribed to ${activity.metadata.plan} plan`
        : 'Successfully subscribed to ManAIger Pro';

    case 'billing_subscription_created':
      return activity.metadata?.plan
        ? `New ${activity.metadata.plan} subscription activated`
        : 'New subscription activated';

    case 'billing_subscription_updated':
      return activity.metadata?.plan
        ? `Subscription updated to ${activity.metadata.plan} plan`
        : 'Subscription plan updated';

    case 'billing_subscription_deleted':
      return 'Subscription cancelled immediately';

    case 'brand_match_generated':
      const matchCount = activity.metadata?.count || 1;
      return `${matchCount} new brand match${matchCount > 1 ? 'es' : ''} found for you`;

    case 'brand_match_status_updated':
      const brandName = activity.metadata?.brandName || 'Brand';
      const status = activity.metadata?.status || 'updated';
      return `${brandName} match status changed to ${status}`;

    case 'outreach_sent':
      const brand = activity.metadata?.brandName || 'brand';
      return `Outreach email sent to ${brand}`;

    case 'outreach_drafted':
      return 'New outreach message drafted';

    case 'analytics_updated':
      const platform = activity.metadata?.platform || 'your';
      return `${platform} analytics have been updated`;

    case 'brand_created':
      return activity.metadata?.brandName
        ? `New brand "${activity.metadata.brandName}" added to database`
        : 'New brand added to database';

    case 'user_register':
      return 'Welcome to ManAIger!';

    default:
      if (activity.message && activity.message !== 'Activity recorded') {
        return activity.message;
      }
      if (activity.metadata) {
        if (activity.metadata.brandName) {
          return `Activity related to ${activity.metadata.brandName}`;
        }
        if (activity.metadata.plan) {
          return `Billing activity for ${activity.metadata.plan} plan`;
        }
      }
      return `${activity.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} activity`;
  }
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    dealsInProgress: 0,
    earningsThisMonth: 0,
    brandMatchesCount: 0,
    totalEarnings: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [briefings, setBriefings] = useState<BriefingItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
    checkOnboardingStatus();
  }, []);

    const checkOnboardingStatus = async () => {
    try {
      const response = await api.getOnboardingStatus();
      
      // The backend returns { data: { hasProfile, isCompleted, profile } }
      // The API client wraps this as response.data = { data: { hasProfile, isCompleted, profile } }
      // So we need to access response.data.data.isCompleted
      const onboardingData = (response.data as any)?.data;
      
      if (!onboardingData || !onboardingData.isCompleted) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Show onboarding if we can't determine status
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadDashboardData();
    toast.success('Welcome! Your creator profile is now complete.');
  };

  const checkSubscriptionStatus = async () => {
    try {
      const subscriptionResponse = await api.getSubscription();
      const currentUser = api.getUser();

      if (currentUser && subscriptionResponse.data) {
        const subscription = subscriptionResponse.data;
        const isActive = subscription &&
          subscription.status === 'active' &&
          subscription.currentPeriodEnd &&
          new Date(subscription.currentPeriodEnd) > new Date();
        // Update user subscription status
        (currentUser as any).subscription_status = isActive ? 'active' : 'inactive';
        localStorage.setItem('user', JSON.stringify(currentUser));
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      await checkSubscriptionStatus();

      // Load real dashboard stats with error handling
      try {
        const statsResponse = await api.getDashboardStats();
        if (statsResponse.data) {
          // Ensure all values are valid numbers
          setStats({
            brandMatchesCount: statsResponse.data.brandMatchesCount || 0,
            dealsInProgress: statsResponse.data.dealsInProgress || 0,
            earningsThisMonth: statsResponse.data.earningsThisMonth || 0,
            totalEarnings: statsResponse.data.totalEarnings || 0
          });
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        toast.error('Failed to load statistics');
      }

      // Load recent activities with error handling
      try {
        const activitiesResponse = await api.getRecentActivities();
        
        // Handle nested data structure that API is actually returning
        const responseData = activitiesResponse?.data as any;
        if (responseData?.data && Array.isArray(responseData.data)) {
          setActivities(responseData.data);
        } else if (Array.isArray(responseData)) {
          setActivities(responseData);
        } else {
          setActivities([]);
        }
      } catch (error) {
        console.error('Failed to load activities:', error);
        setActivities([]); // Ensure activities is set to empty array on error
        toast.error('Failed to load recent activities');
      }
    
      // Load mock briefings (replace with real API call later)
      setBriefings([
        {
          id: '1',
          title: 'Daily Market Update',
          content: 'Trending topics in your niches include sustainable fashion and tech gadgets. Nike and Adidas are actively looking for micro-influencers this month.',
          date: new Date().toISOString(),
          isRead: false
        },
        {
          id: '2',
          title: 'Performance Insights',
          content: 'Your brand match success rate increased by 15% this week. Consider focusing more on sports and lifestyle brands.',
          date: new Date(Date.now() - 86400000).toISOString(),
          isRead: false
        }
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number | null | undefined) => {
    // Handle null, undefined, or NaN values
    if (num == null || isNaN(num)) {
      return '$0';
    }
    
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    } else {
      return `$${num.toFixed(0)}`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const markBriefingAsRead = (briefingId: string) => {
    setBriefings(briefings.map(briefing => 
      briefing.id === briefingId 
        ? { ...briefing, isRead: true }
        : briefing
    ));
  };

  return (
    <Protected>
      <div className="min-h-full">
        <div className="py-4 lg:py-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
              Welcome back{user?.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Here's what's happening with your brand partnerships
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mobile-stats-grid mb-6 lg:mb-8">
            <Card className="mobile-card">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-xl lg:text-2xl">🎯</span>
                </div>
                <div className="ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Brand Matches</p>
                  {isLoading ? (
                    <Skeleton className="h-6 lg:h-8 w-8 lg:w-12" />
                  ) : (
                    <p className="text-lg lg:text-2xl font-bold text-gray-900">{stats.brandMatchesCount}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="mobile-card">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-xl lg:text-2xl">🤝</span>
                </div>
                <div className="ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Deals in Progress</p>
                  {isLoading ? (
                    <Skeleton className="h-6 lg:h-8 w-8 lg:w-12" />
                  ) : (
                    <p className="text-lg lg:text-2xl font-bold text-gray-900">{stats.dealsInProgress}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="mobile-card">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-xl lg:text-2xl">💰</span>
                </div>
                <div className="ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">This Month</p>
                  {isLoading ? (
                    <Skeleton className="h-6 lg:h-8 w-12 lg:w-16" />
                  ) : (
                    <p className="text-lg lg:text-2xl font-bold text-gray-900">{formatNumber(stats.earningsThisMonth)}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="mobile-card">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-xl lg:text-2xl">💎</span>
                </div>
                <div className="ml-3 lg:ml-4 min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Total Earnings</p>
                  {isLoading ? (
                    <Skeleton className="h-6 lg:h-8 w-12 lg:w-16" />
                  ) : (
                    <p className="text-lg lg:text-2xl font-bold text-gray-900">{formatNumber(stats.totalEarnings)}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            {/* Daily Briefings */}
            <Card className="mobile-card lg:p-6">
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
                Daily ManAIger Briefings
              </h2>

              <div className="space-y-4">
                {briefings.length > 0 ? (
                  briefings.map((briefing) => (
                    <div 
                      key={briefing.id}
                      className="p-3 lg:p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => markBriefingAsRead(briefing.id)}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900 mb-2 text-sm lg:text-base pr-2">
                          {briefing.title}
                        </h3>
                        {!briefing.isRead && (
                          <Badge label="New" tone="blue" />
                        )}
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600 mb-2">
                        {briefing.content}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(briefing.date)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 lg:py-8">
                    <span className="text-3xl lg:text-4xl mb-4 block">📰</span>
                    <p className="text-gray-600 text-sm">
                      No briefings available
                    </p>
                  </div>
                )}
              </div>
              
              <Button variant="secondary" className="w-full mt-4" disabled>
                View All Briefings (Coming Soon)
              </Button>
            </Card>

            {/* Recent Activity */}
            <Card className="mobile-card lg:p-6">
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
                Recent Activity {!isLoading && `(${activities.length})`}
              </h2>
              
              {/* Scrollable container with responsive height */}
              <div className="h-80 lg:h-96 overflow-y-auto space-y-3 lg:space-y-4 pr-2">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <Skeleton className="w-8 h-8 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))
                ) : activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <div key={activity.id} className="flex items-start space-x-3 pb-3 lg:pb-4 border-b border-gray-100 last:border-b-0">
                      <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                        <span className="text-sm">
                          {activityIcons[activity.type] || activityIcons.default}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs lg:text-sm text-gray-900 mb-1">
                          {formatActivityMessage(activity)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(activity.createdAt)}
                        </p>
                        {/* Show additional details for certain activity types */}
                        {activity.type === 'invoice_created' && activity.metadata?.paymentUrl && (
                          <a 
                            href={activity.metadata.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            View Invoice
                          </a>
                        )}
                        {activity.type === 'billing_cancel' && activity.metadata?.updated?.current_period_end && (
                          <p className="text-xs text-orange-600 mt-1">
                            Access until {new Date(activity.metadata.updated.current_period_end * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 lg:py-8">
                    <span className="text-3xl lg:text-4xl mb-4 block">📭</span>
                    <p className="text-gray-600 text-sm">
                      No recent activity
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 lg:mt-8">
            <Card className="mobile-card lg:p-6">
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                <Button 
                  onClick={() => router.push('/brands')}
                  className="flex items-center justify-center space-x-2 text-sm lg:text-base"
                >
                  <span>🎯</span>
                  <span>Find Brand Matches</span>
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => router.push('/invoices')}
                  className="flex items-center justify-center space-x-2 text-sm lg:text-base"
                >
                  <span>📄</span>
                  <span>Create Invoice</span>
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => router.push('/analytics')}
                  className="flex items-center justify-center space-x-2 text-sm lg:text-base"
                >
                  <span>📊</span>
                  <span>View Analytics</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Creator Onboarding Modal */}
      <CreatorOnboardingModal
        isOpen={showOnboarding}
        onClose={() => {}} // Don't allow closing until complete
        onComplete={handleOnboardingComplete}
      />
    </Protected>
  );
}
