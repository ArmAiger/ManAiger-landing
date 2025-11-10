'use client';

import { useState, useEffect } from 'react';
import Protected from '@/components/layout/Protected';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { api } from '../../src/lib/api';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
  plan?: 'free' | 'starter' | 'pro' | 'vip';
  subscriptionStatus?: string;
  prioritySupport?: boolean;
}

interface Subscription {
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  planName: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface ConnectedAccount {
  connected: boolean;
  channelName?: string;
  channelId?: string;
  connectedAt?: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [youtubeAccount, setYoutubeAccount] = useState<ConnectedAccount>({ connected: false });
  const [twitchAccount, setTwitchAccount] = useState<ConnectedAccount>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileResponse, subscriptionResponse, youtubeResponse, twitchResponse] = await Promise.all([
        api.getProfile(),
        api.getSubscription(),
        api.getYouTubeAccount(),
        api.getTwitchAccount()
      ]);
      
      if (profileResponse.data) {
        setProfile(profileResponse.data);
        setProfileForm({
          name: profileResponse.data.name || '',
          email: profileResponse.data.email || '',
          company: profileResponse.data.company || '',
          phone: profileResponse.data.phone || ''
        });
      }
      
      if (subscriptionResponse.data) {
        setSubscription({
          status: subscriptionResponse.data.status,
          planName: subscriptionResponse.data.plan,
          currentPeriodEnd: subscriptionResponse.data.currentPeriodEnd,
          cancelAtPeriodEnd: subscriptionResponse.data.cancelAtPeriodEnd
        });
      }
      
      if (youtubeResponse.data) {
        setYoutubeAccount(youtubeResponse.data);
      }
      
      if (twitchResponse.data) {
        setTwitchAccount(twitchResponse.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const response = await api.updateProfile(profileForm);
      if (response.data) {
        setProfile(response.data);
        toast.success('Profile updated successfully');
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const manageBilling = async () => {
    try {
      const response = await api.createBillingPortalSession();
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error(response.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      toast.error('Failed to open billing portal');
    }
  };

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? It will cancel at the end of your current billing period.')) {
      return;
    }
    
    try {
      setCancelling(true);
      const response = await api.cancelSubscription();
      if (response.data || response.message) {
        toast.success(response.message || 'Subscription will cancel at period end');
        // Reload subscription data
        await loadData();
      } else {
        throw new Error(response.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const cancelSubscriptionNow = async () => {
    if (!confirm('Are you sure you want to cancel your subscription immediately? This will downgrade you to the free plan and remove excess brand matches immediately.')) {
      return;
    }
    
    try {
      setCancelling(true);
      const response = await api.cancelSubscriptionImmediately();
      if (response.data || response.message) {
        const deletedCount = response.data?.deletedMatches || 0;
        toast.success(
          deletedCount > 0 
            ? `Subscription cancelled. ${deletedCount} brand matches were removed to fit the free plan limit.`
            : 'Subscription cancelled immediately'
        );
        // Reload subscription data
        await loadData();
      } else {
        throw new Error(response.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const connectYouTube = async () => {
    try {
      const response = await api.connectYouTube();
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        throw new Error(response.error || 'Failed to get YouTube auth URL');
      }
    } catch (error) {
      console.error('Failed to connect YouTube:', error);
      toast.error('Failed to connect YouTube');
    }
  };

  const connectTwitch = async () => {
    try {
      const response = await api.connectTwitch();
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      } else {
        throw new Error(response.error || 'Failed to get Twitch auth URL');
      }
    } catch (error) {
      console.error('Failed to connect Twitch:', error);
      toast.error('Failed to connect Twitch');
    }
  };

  const disconnectYouTube = async () => {
    if (!confirm('Are you sure you want to disconnect your YouTube account?')) {
      return;
    }
    
    try {
      const response = await api.disconnectYouTube();
      if (response.data || response.message) {
        toast.success('YouTube account disconnected successfully');
        setYoutubeAccount({ connected: false });
      } else {
        throw new Error(response.error || 'Failed to disconnect YouTube');
      }
    } catch (error) {
      console.error('Failed to disconnect YouTube:', error);
      toast.error('Failed to disconnect YouTube');
    }
  };

  const disconnectTwitch = async () => {
    if (!confirm('Are you sure you want to disconnect your Twitch account?')) {
      return;
    }
    
    try {
      const response = await api.disconnectTwitch();
      if (response.data || response.message) {
        toast.success('Twitch account disconnected successfully');
        setTwitchAccount({ connected: false });
      } else {
        throw new Error(response.error || 'Failed to disconnect Twitch');
      }
    } catch (error) {
      console.error('Failed to disconnect Twitch:', error);
      toast.error('Failed to disconnect Twitch');
    }
  };

  const upgradeSubscription = async (priceId: string) => {
    try {
      const response = await api.createCheckoutSession(priceId);
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      toast.error('Failed to upgrade subscription');
    }
  };

  useEffect(() => {
    loadData();
    
    // Check for connection success messages in URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('youtube') === 'success') {
      toast.success('YouTube account connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Reload data to show updated connection status
      setTimeout(() => loadData(), 1000);
    }
    if (urlParams.get('twitch') === 'success') {
      toast.success('Twitch account connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Reload data to show updated connection status
      setTimeout(() => loadData(), 1000);
    }
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(dateString));
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trialing': return 'bg-blue-100 text-blue-800';
      case 'past_due': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Protected>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <Skeleton className="w-full h-64" />
            </Card>
            <Card className="p-6">
              <Skeleton className="w-full h-64" />
            </Card>
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="p-4 lg:p-6">
        <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6">Settings</h1>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <div className="order-2 xl:order-1 flex flex-col gap-4">
          <Card className="mobile-card lg:p-6">
            <h2 className="text-lg lg:text-xl font-semibold mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <Input
                  type="text"
                  value={profileForm.company}
                  onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                  placeholder="Enter your company name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div className="pt-4">
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
            
            {profile && (
              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600">
                  {profile.createdAt && `Account created: ${formatDate(profile.createdAt)}`}
                </div>
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Social Media Integration</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Connect your social media accounts to allow ManAIger to pull your stats and provide better insights.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className={`border rounded-lg p-4 flex flex-col items-center ${youtubeAccount.connected ? 'border-green-200 bg-green-50' : ''}`}>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${youtubeAccount.connected ? 'bg-green-100' : 'bg-red-100'}`}>
                    <svg className={`w-6 h-6 ${youtubeAccount.connected ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <h3 className="font-medium mb-1">YouTube</h3>
                  {youtubeAccount.connected ? (
                    <>
                      <p className="text-xs text-green-600 mb-2 text-center">✓ Connected</p>
                      <p className="text-xs text-gray-600 mb-2 text-center font-medium">{youtubeAccount.channelName}</p>
                      <Button
                        onClick={disconnectYouTube}
                        className="w-full text-xs"
                        variant="secondary"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-2">Not connected</p>
                      <Button
                        onClick={connectYouTube}
                        className="w-full text-xs"
                        variant="secondary"
                      >
                        Connect
                      </Button>
                    </>
                  )}
                </div>
                <div className={`border rounded-lg p-4 flex flex-col items-center ${twitchAccount.connected ? 'border-green-200 bg-green-50' : ''}`}>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${twitchAccount.connected ? 'bg-green-100' : 'bg-purple-100'}`}>
                    <svg className={`w-6 h-6 ${twitchAccount.connected ? 'text-green-600' : 'text-purple-600'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                    </svg>
                  </div>
                  <h3 className="font-medium mb-1">Twitch</h3>
                  {twitchAccount.connected ? (
                    <>
                      <p className="text-xs text-green-600 mb-2 text-center">✓ Connected</p>
                      <p className="text-xs text-gray-600 mb-2 text-center font-medium">{twitchAccount.channelName}</p>
                      <Button
                        onClick={disconnectTwitch}
                        className="w-full text-xs"
                        variant="secondary"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-2">Not connected</p>
                      <Button
                        onClick={connectTwitch}
                        className="w-full text-xs"
                        variant="secondary"
                      >
                        Connect
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-3 text-gray-700">Coming Soon</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="relative border rounded-lg p-3 flex flex-col items-center opacity-50">
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">Soon</span>
                    </div>
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                      </svg>
                    </div>
                    <span className="text-xs">TikTok</span>
                  </div>

                  <div className="relative border rounded-lg p-3 flex flex-col items-center opacity-50">
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">Soon</span>
                    </div>
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <span className="text-xs">Facebook</span>
                  </div>

                  <div className="relative border rounded-lg p-3 flex flex-col items-center opacity-50">
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">Soon</span>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <span className="text-xs">Instagram</span>
                  </div>

                  <div className="relative border rounded-lg p-3 flex flex-col items-center opacity-50">
                    <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">Soon</span>
                    </div>
                    <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                      </svg>
                    </div>
                    <span className="text-xs">X</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          </div>
          <Card className="p-6 order-first xl:order-2">
            <h2 className="text-xl font-semibold mb-4">Billing & Subscription</h2>

            {subscription ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium capitalize">{subscription.planName} Plan</div>
                    <div className="text-sm text-gray-600">
                      {subscription.planName === 'free' ? 'Free' :
                       subscription.planName === 'starter' ? '$19/month' :
                       subscription.planName === 'pro' ? '$39/month' : '$99/month'}
                    </div>
                  </div>
                  <Badge 
                    label={subscription.status}
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2">Current Plan Features:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {subscription.planName === 'free' && (
                      <>
                        <li>• 3 brand matches per month</li>
                        <li>• Basic analytics</li>
                        <li>• Email support</li>
                      </>
                    )}
                    {subscription.planName === 'starter' && (
                      <>
                        <li>• 15 brand matches per month</li>
                        <li>• Brand profiles with website links</li>
                        <li>• Simple tools to track who you’ve pitched</li>
                      </>
                    )}
                    {subscription.planName === 'pro' && (
                      <>
                        <li>• 40 brand matches per month</li>
                        <li>• Brand profiles with website links</li>
                        <li>• Organize pitches and follow-ups in one place</li>
                      </>
                    )}
                    {subscription.planName === 'vip' && (
                      <>
                        <li>• Unlimited brand matches</li>
                        <li>• Brand profiles with website links</li>
                        <li>• Manage multiple creators/brands</li>
                      </>
                    )}
                  </ul>
                </div>
                
                <div className="text-sm text-gray-600">
                  {subscription.cancelAtPeriodEnd ? (
                    <span className="text-red-600">
                      Subscription will cancel on {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  ) : subscription.status === 'active' ? (
                    <span>
                      Next billing date: {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  ) : (
                    <span>
                      Subscription status: {subscription.status}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 pt-4">
                  <Button
                    onClick={manageBilling}
                    variant="secondary"
                    className="w-full"
                  >
                    Manage Billing
                  </Button>
                  
                  {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                    <>
                      <Button
                        onClick={cancelSubscription}
                        variant="secondary"
                        disabled={cancelling}
                        className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel at Period End'}
                      </Button>
                      
                      <Button
                        onClick={cancelSubscriptionNow}
                        variant="secondary"
                        disabled={cancelling}
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel Immediately'}
                      </Button>
                    </>
                  )}
                  {subscription.status !== 'active' && (
                    <Button
                      onClick={() => api.subscribe('starter').then(result => {
                        if (result.data?.url) window.location.href = result.data.url;
                      })}
                      className="w-full"
                    >
                      Upgrade to Starter
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-600 mb-4">
                  No active subscription
                </div>
                <Button
                  onClick={() => upgradeSubscription('price_starter')}
                  className="w-full"
                >
                  Subscribe Now
                </Button>
              </div>
            )}
            
            {/* Pricing Plans */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="font-medium mb-4">Change Plan</h3>
              <div className="space-y-3">
                {/* Free Plan */}
                <div className={`grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start p-3 rounded ${subscription?.planName === 'free' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div>
                    <div className="font-medium flex items-center">
                      Free
                      {subscription?.planName === 'free' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">$0/month</div>
                    <div className="text-xs text-gray-500 mt-1">Very limited usage</div>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1">
                      <li>• 3 brand matches / month (or 3 total to try)</li>
                      <li>• See each brand’s website so you can decide who to pitch</li>
                    </ul>
                  </div>
                  <div className="text-right sm:self-center">
                    {subscription?.planName !== 'free' && subscription?.status === 'active' && (
                      <Button
                        onClick={cancelSubscriptionNow}
                        className="inline-flex items-center justify-center text-center gap-2 text-xs mt-1 h-9 px-4 rounded-md bg-gray-100 text-gray-800 hover:bg-gray-200 shadow-sm w-full sm:w-auto"
                        disabled={cancelling}
                      >
                        {cancelling ? 'Cancelling...' : 'Downgrade'}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Starter Plan */}
                <div className={`relative grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start p-3 rounded ${subscription?.planName === 'starter' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  {/* Ribbon */}
                  <div className="absolute -top-2 left-2">
                    <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-300">Most popular</span>
                  </div>
                  <div>
                    <div className="font-medium flex items-center">
                      Starter
                      {subscription?.planName === 'starter' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">$19 / month</div>
                    <div className="text-xs text-gray-500 mt-1">Best for creators under 20K followers</div>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1">
                      <li>• 15 brand matches / month</li>
                      <li>• Brand profiles with website links</li>
                      <li>• Simple tools to track who you’ve pitched</li>
                    </ul>
                  </div>
                  <div className="text-right sm:self-center">
                    {subscription?.planName !== 'starter' && (
                      <Button
                        onClick={() => api.subscribe('starter').then(result => {
                          if (result.data?.url) window.location.href = result.data.url;
                        })}
                        className="inline-flex items-center justify-center text-center gap-2 text-xs mt-1 h-9 px-4 rounded-md bg-brand-purple text-white hover:bg-brand-purple/90 shadow-sm w-full sm:w-auto"
                      >
                        {subscription?.planName === 'free' ? 'Upgrade' : 'Change'}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Pro Plan */}
                <div className={`grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start p-3 rounded ${subscription?.planName === 'pro' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div>
                    <div className="font-medium flex items-center">
                      Pro
                      {subscription?.planName === 'pro' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">$39 / month</div>
                    <div className="text-xs text-gray-500 mt-1">For growing creators and small teams</div>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1">
                      <li>• 40 brand matches / month</li>
                      <li>• Brand profiles with website links</li>
                      <li>• Organize pitches and follow-ups in one place</li>
                    </ul>
                  </div>
                  <div className="text-right sm:self-center">
                    {subscription?.planName !== 'pro' && (
                      <Button
                        onClick={() => api.subscribe('pro').then(result => {
                          if (result.data?.url) window.location.href = result.data.url;
                        })}
                        className="inline-flex items-center justify-center text-center gap-2 text-xs mt-1 h-9 px-4 rounded-md bg-brand-purple text-white hover:bg-brand-purple/90 shadow-sm w-full sm:w-auto"
                      >
                        {subscription?.planName === 'free' ? 'Upgrade' : 'Change'}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* VIP Plan */}
                <div className={`grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start p-3 rounded ${subscription?.planName === 'vip' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div>
                    <div className="font-medium flex items-center">
                      VIP
                      {subscription?.planName === 'vip' && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Current</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">$99 / month</div>
                    <div className="text-xs text-gray-500 mt-1">For agencies & high-volume creators</div>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1">
                      <li>• Unlimited brand matches / month</li>
                      <li>• Brand profiles with website links</li>
                      <li>• Manage multiple creators/brands</li>
                    </ul>
                  </div>
                  <div className="text-right sm:self-center">
                    {subscription?.planName !== 'vip' && (
                      <Button
                        onClick={() => api.subscribe('vip').then(result => {
                          if (result.data?.url) window.location.href = result.data.url;
                        })}
                        className="inline-flex items-center justify-center text-center gap-2 text-xs mt-1 h-9 px-4 rounded-md bg-brand-purple text-white hover:bg-brand-purple/90 shadow-sm w-full sm:w-auto"
                      >
                        {subscription?.planName === 'free' ? 'Upgrade' : 'Change'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          
        </div>
        
        {/* Additional row for more settings if needed */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Need help? Have questions or feedback? We're here to assist you.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-brand-purple/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Email Support</h3>
                    <a
                      href="mailto:hello@manaiger.co"
                      className="text-sm text-brand-purple hover:underline"
                    >
                      hello@manaiger.co
                    </a>
                    <p className="text-xs text-gray-500 mt-1">We typically respond within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-brand-purple/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Help Center</h3>
                    <p className="text-sm text-gray-600">
                      Check out our documentation and FAQs for quick answers
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={() => window.location.href = 'mailto:support@manaiger.co?subject=Support Request'}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Send us a message
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Protected>
  );
}