'use client';

import { useState, useEffect } from 'react';
import Protected from '@/components/layout/Protected';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import LineChart from '@/components/ui/LineChart';
import { api } from '../../src/lib/api';
import { toast } from 'react-hot-toast';

interface YouTubeStats {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

interface YouTubeVideo {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

interface ConnectedAccount {
  connected: boolean;
  channelName?: string;
  channelId?: string;
  connectedAt?: string;
}

interface AnalyticsComparison {
  current: YouTubeStats;
  changes: {
    subscribers: {
      daily: number;
      dailyPercentage: number;
      weekly: number;
      weeklyPercentage: number;
    };
    views: {
      daily: number;
      dailyPercentage: number;
      weekly: number;
      weeklyPercentage: number;
    };
    videos: {
      daily: number;
      weekly: number;
    };
  };
}

interface HistoricalDataPoint {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  recordedAt: string;
}

interface AnalyticsData {
  youtube?: {
    stats: YouTubeStats;
    videos: YouTubeVideo[];
  };
  comparison?: AnalyticsComparison;
  historicalStats?: HistoricalDataPoint[];
  insights?: string[];
  lastUpdated?: string;
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [youtubeAccount, setYoutubeAccount] = useState<ConnectedAccount>({ connected: false });
  const [twitchAccount, setTwitchAccount] = useState<ConnectedAccount>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  
  // Line chart specific states
  const [chartData, setChartData] = useState<any>(null);
  const [chartPeriod, setChartPeriod] = useState('month');
  const [chartMetric, setChartMetric] = useState('all');
  const [loadingChart, setLoadingChart] = useState(false);

  const loadConnectedAccounts = async () => {
    try {
      const [youtubeResponse, twitchResponse] = await Promise.all([
        api.getYouTubeAccount(),
        api.getTwitchAccount()
      ]);
      
      if (youtubeResponse.data) {
        setYoutubeAccount(youtubeResponse.data);
      }
      
      if (twitchResponse.data) {
        setTwitchAccount(twitchResponse.data);
      }
    } catch (error) {
      console.error('Failed to load connected accounts:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load connected accounts first
      await loadConnectedAccounts();
      
      // Only load YouTube data if connected
      if (youtubeAccount.connected) {
        // Load YouTube stats, comparison data, and historical stats in parallel
        const [statsResponse, comparisonResponse, historicalResponse] = await Promise.all([
          api.getYouTubeStats(),
          api.getYouTubeAnalyticsComparison(),
          api.getYouTubeHistoricalStats(30)
        ]);
        
        if (statsResponse.data && comparisonResponse.data && historicalResponse.data) {
          setAnalyticsData({
            youtube: statsResponse.data,
            comparison: comparisonResponse.data,
            historicalStats: historicalResponse.data.historicalStats,
            lastUpdated: new Date().toISOString()
          });
        } else {
          throw new Error('Failed to load analytics data');
        }
      } else {
        setAnalyticsData({
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    if (!youtubeAccount.connected) return;
    
    try {
      setLoadingChart(true);
      
      const response = await api.getYouTubeLineChart(chartPeriod, chartMetric);
      
      const chartData = response.data?.data;
      if (chartData && chartData.chartData && chartData.chartData.labels && chartData.chartData.datasets) {
        setChartData(chartData);
      } else {
        console.error('Invalid chart data structure:', {
          hasResponseData: !!response.data,
          hasDataData: !!(response.data && response.data.data),
          hasChartData: !!(response.data && response.data.data && response.data.data.chartData),
          hasLabels: !!(response.data && response.data.data && response.data.data.chartData && response.data.data.chartData.labels),
          hasDatasets: !!(response.data && response.data.data && response.data.data.chartData && response.data.data.chartData.datasets)
        });
        throw new Error('Failed to load chart data - invalid structure');
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to load chart data: ${errorMessage}`);
    } finally {
      setLoadingChart(false);
    }
  };

  const refreshYouTubeStats = async () => {
    if (!youtubeAccount.connected) {
      toast.error('YouTube account not connected');
      return;
    }

    try {
      setRefreshing(true);
      const [statsResponse, comparisonResponse] = await Promise.all([
        api.getYouTubeStats(),
        api.getYouTubeAnalyticsComparison()
      ]);
      if (statsResponse.data && comparisonResponse.data) {
        setAnalyticsData(prev => ({
          ...prev,
          youtube: statsResponse.data,
          comparison: comparisonResponse.data,
          lastUpdated: new Date().toISOString()
        }));
        toast.success('YouTube stats refreshed successfully');
      } else {
        throw new Error('Failed to refresh YouTube stats');
      }
    } catch (error) {
      console.error('Failed to refresh YouTube stats:', error);
      toast.error('Failed to refresh YouTube stats');
    } finally {
      setRefreshing(false);
    }
  };

  const generateAIInsights = async () => {
    if (!analyticsData?.youtube) {
      toast.error('No YouTube data available for insights');
      return;
    }
    try {
      setGeneratingInsights(true);
      const response = await api.generateAnalyticsInsights(analyticsData);
      if (response.data && response.data.insights) {
        setAnalyticsData(prev => ({
          ...prev,
          insights: response.data!.insights
        }));
        toast.success('AI insights generated successfully');
      } else {
        throw new Error(response.error || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setGeneratingInsights(false);
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

  useEffect(() => {
    const initializeData = async () => {
      await loadConnectedAccounts();
    };
    
    initializeData();
    
    // Check for connection success messages in URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('youtube') === 'success') {
      toast.success('YouTube account connected successfully!');
      // Clean up URL and reload data
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => initializeData(), 1000);
    }
    if (urlParams.get('twitch') === 'success') {
      toast.success('Twitch account connected successfully!');
      // Clean up URL and reload data
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => initializeData(), 1000);
    }
  }, []);

  // Load analytics data when YouTube account connection changes
  useEffect(() => {
    if (youtubeAccount.connected) {
      loadAnalyticsData();
    } else {
      setAnalyticsData({
        lastUpdated: new Date().toISOString()
      });
      setLoading(false);
    }
  }, [youtubeAccount.connected]);

  // Auto-generate AI insights when analytics data is loaded and no insights exist
  useEffect(() => {
    if (analyticsData?.youtube && !analyticsData.insights && !generatingInsights) {
      setTimeout(() => {
        generateAIInsights();
      }, 1500); // Small delay to let the user see the data first
    }
  }, [analyticsData?.youtube]);

  // Load chart data when YouTube account is connected or chart parameters change
  useEffect(() => {
    if (youtubeAccount.connected) {
      loadChartData();
    }
  }, [youtubeAccount.connected, chartPeriod, chartMetric]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Trend indicator component
  const TrendIndicator = ({ change, percentage, period }: { change: number, percentage: number, period: string }) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    if (change === 0) {
      return (
        <div className="flex items-center text-gray-500 text-sm">
          <span>No change {period}</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l10-10M17 7v10" />
          </svg>
        ) : (
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17l-10-10M7 7v10" />
          </svg>
        )}
        <span>
          {Math.abs(percentage).toFixed(1)}% {period}
        </span>
      </div>
    );
  };

  return (
    <Protected>
      <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Track your social media performance and get AI-powered insights
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[44px]"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Button
              onClick={refreshYouTubeStats}
              disabled={refreshing || !youtubeAccount.connected}
              variant="secondary"
              size="sm"
            >
              {refreshing ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <Card className="mobile-card lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">YouTube</h3>
                  <p className="text-xs lg:text-sm text-gray-600">Channel Analytics</p>
                </div>
              </div>
              {youtubeAccount.connected ? (
                <Badge label="Connected" tone="green" />
              ) : (
                <Badge label="Not Connected" tone="gray" />
              )}
            </div>
            
            {youtubeAccount.connected ? (
              <div className="space-y-2">
                <p className="text-xs lg:text-sm text-gray-600">
                  Channel: <span className="font-medium text-gray-900 break-all">{youtubeAccount.channelName}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Connected on {youtubeAccount.connectedAt ? formatDate(youtubeAccount.connectedAt) : 'Unknown'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs lg:text-sm text-gray-600">
                  Connect your YouTube channel to view analytics and insights
                </p>
                <Button onClick={connectYouTube} className="w-full" size="sm">
                  Connect YouTube
                </Button>
              </div>
            )}
          </Card>

          <Card className="mobile-card lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6.857 4.714h1.715v5.143H6.857z" />
                    <path d="M21.5 2H2.5C1.119 2 0 3.119 0 4.5v15C0 20.881 1.119 22 2.5 22h19c1.381 0 2.5-1.119 2.5-2.5v-15C24 3.119 22.881 2 21.5 2zM23 19.5c0 .827-.673 1.5-1.5 1.5h-19c-.827 0-1.5-.673-1.5-1.5v-15c0-.827.673-1.5 1.5-1.5h19c.827 0 1.5.673 1.5 1.5v15z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">Twitch</h3>
                  <p className="text-xs lg:text-sm text-gray-600">Stream Analytics</p>
                </div>
              </div>
              {twitchAccount.connected ? (
                <Badge label="Connected" tone="green" />
              ) : (
                <Badge label="Not Connected" tone="gray" />
              )}
            </div>
            
            {twitchAccount.connected ? (
              <div className="space-y-2">
                <p className="text-xs lg:text-sm text-gray-600">
                  Channel: <span className="font-medium text-gray-900 break-all">{twitchAccount.channelName}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Connected on {twitchAccount.connectedAt ? formatDate(twitchAccount.connectedAt) : 'Unknown'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs lg:text-sm text-gray-600">
                  Connect your Twitch channel to view streaming analytics
                </p>
                <Button onClick={connectTwitch} className="w-full" size="sm">
                  Connect Twitch
                </Button>
              </div>
            )}
          </Card>
        </div>
        <Card className="mobile-card lg:p-6">
          <div className="mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">
              More Platforms
            </h3>
            <p className="text-xs lg:text-sm text-gray-600">
              Additional social media integrations coming soon
            </p>
          </div>
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3 text-gray-700">Coming Soon</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative border rounded-lg p-4 flex flex-col items-center opacity-50">
                <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">Soon</span>
                </div>
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">TikTok</span>
                <span className="text-xs text-gray-500 mt-1">Video Analytics</span>
              </div>
              <div className="relative border rounded-lg p-4 flex flex-col items-center opacity-50">
                <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">Soon</span>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">Facebook</span>
                <span className="text-xs text-gray-500 mt-1">Page Analytics</span>
              </div>
              <div className="relative border rounded-lg p-4 flex flex-col items-center opacity-50">
                <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">Soon</span>
                </div>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">Instagram</span>
                <span className="text-xs text-gray-500 mt-1">Post Analytics</span>
              </div>
              <div className="relative border rounded-lg p-4 flex flex-col items-center opacity-50">
                <div className="absolute inset-0 bg-gray-100 bg-opacity-80 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">Soon</span>
                </div>
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
                  </svg>
                </div>
                <span className="text-xs text-gray-700">X</span>
                <span className="text-xs text-gray-500 mt-1">Tweet Analytics</span>
              </div>
            </div>
          </div>
        </Card>

        {youtubeAccount.connected && (
          <>
            {loading ? (
              <div className="mobile-stats-grid">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="mobile-card lg:p-6">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </Card>
                ))}
              </div>
            ) : analyticsData?.youtube ? (
              <>
                {/* YouTube Stats Overview */}
                <div className="mobile-stats-grid">
                  <Card className="mobile-card lg:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                      <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                        Subscribers
                      </h3>
                      {analyticsData.comparison && (
                        <TrendIndicator 
                          change={analyticsData.comparison.changes.subscribers.daily}
                          percentage={analyticsData.comparison.changes.subscribers.dailyPercentage}
                          period="vs yesterday"
                        />
                      )}
                    </div>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      {formatNumber(analyticsData.youtube.stats.subscriberCount)}
                    </p>
                    {analyticsData.comparison && (
                      <div className="mt-2">
                        <TrendIndicator 
                          change={analyticsData.comparison.changes.subscribers.weekly}
                          percentage={analyticsData.comparison.changes.subscribers.weeklyPercentage}
                          period="vs last week"
                        />
                      </div>
                    )}
                  </Card>

                  <Card className="mobile-card lg:p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                      <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                        Total Views
                      </h3>
                      {analyticsData.comparison && (
                        <TrendIndicator 
                          change={analyticsData.comparison.changes.views.daily}
                          percentage={analyticsData.comparison.changes.views.dailyPercentage}
                          period="vs yesterday"
                        />
                      )}
                    </div>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      {formatNumber(analyticsData.youtube.stats.viewCount)}
                    </p>
                    {analyticsData.comparison && (
                      <div className="mt-2">
                        <TrendIndicator 
                          change={analyticsData.comparison.changes.views.weekly}
                          percentage={analyticsData.comparison.changes.views.weeklyPercentage}
                          period="vs last week"
                        />
                      </div>
                    )}
                  </Card>

                  <Card className="mobile-card lg:p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xs lg:text-sm font-medium text-gray-600">
                        Videos
                      </h3>
                    </div>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      {formatNumber(analyticsData.youtube.stats.videoCount)}
                    </p>
                    {analyticsData.comparison && (
                      <div className="mt-2 space-y-1">
                        {analyticsData.comparison.changes.videos.daily !== 0 && (
                          <div className="text-xs lg:text-sm text-gray-600">
                            {analyticsData.comparison.changes.videos.daily > 0 ? '+' : ''}{analyticsData.comparison.changes.videos.daily} today
                          </div>
                        )}
                        {analyticsData.comparison.changes.videos.weekly !== 0 && (
                          <div className="text-xs lg:text-sm text-gray-600">
                            {analyticsData.comparison.changes.videos.weekly > 0 ? '+' : ''}{analyticsData.comparison.changes.videos.weekly} this week
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Interactive Line Chart */}
                <Card className="mobile-card lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 lg:mb-6 gap-4">
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">
                        Video Performance Trends
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-600">
                        Track your video metrics over time across different periods
                      </p>
                    </div>
                    
                    <div className="flex flex-col xs:flex-row gap-2 lg:gap-3">
                      <Select
                        value={chartPeriod}
                        onChange={(e) => setChartPeriod(e.target.value)}
                        className="min-w-32"
                      >
                        <option value="week">Past Week</option>
                        <option value="month">Past Month</option>
                        <option value="quarter">Past Quarter</option>
                        <option value="year">Past Year</option>
                      </Select>
                      
                      <Select
                        value={chartMetric}
                        onChange={(e) => setChartMetric(e.target.value)}
                        className="min-w-32"
                      >
                        <option value="all">All Metrics</option>
                        <option value="views">Views Only</option>
                        <option value="likes">Likes Only</option>
                        <option value="comments">Comments Only</option>
                      </Select>
                    </div>
                  </div>

                  {loadingChart ? (
                    <div className="h-64 lg:h-96 flex items-center justify-center">
                      <div className="text-center">
                        <Skeleton className="h-4 w-32 mx-auto mb-2" />
                        <p className="text-xs lg:text-sm text-gray-500">Loading chart data...</p>
                      </div>
                    </div>
                  ) : chartData && chartData.chartData ? (
                    <div className="mb-4">
                      <LineChart 
                        data={chartData.chartData} 
                        height={window.innerWidth < 768 ? 250 : 400}
                      />
                      <div className="mt-4 grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 lg:gap-4 text-xs text-gray-500">
                        <span>Period: {chartData.period}</span>
                        <span>Metric: {chartData.metric}</span>
                        <span>Data Points: {chartData.totalDataPoints}</span>
                        <span>Source: {chartData.dataSource === 'actual' ? 'Historical Data' : 'Sample Data'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 lg:h-96 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-gray-500 mb-2 text-sm">No chart data available</p>
                        <Button 
                          onClick={loadChartData} 
                          variant="secondary" 
                          size="sm"
                        >
                          Load Chart Data
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>

                {/* 30-Day Trends Chart */}
                {analyticsData.historicalStats && analyticsData.historicalStats.length > 1 && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      30-Day Trends
                    </h3>
                    
                    <div className="space-y-6">
                      {/* Subscribers Trend */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Subscriber Growth</h4>
                        <div className="relative h-20 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-end h-full space-x-1">
                            {analyticsData.historicalStats.slice(-14).map((point, index) => {
                              const maxValue = Math.max(...analyticsData.historicalStats!.slice(-14).map(p => p.subscriberCount));
                              const height = maxValue > 0 ? (point.subscriberCount / maxValue) * 100 : 0;
                              return (
                                <div
                                  key={index}
                                  className="bg-red-500 rounded-sm flex-1 min-w-0"
                                  style={{ height: `${height}%` }}
                                  title={`${formatDate(point.recordedAt)}: ${formatNumber(point.subscriberCount)} subscribers`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Views Trend */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">View Growth</h4>
                        <div className="relative h-20 bg-gray-50 rounded-lg p-4">
                          <div className="flex items-end h-full space-x-1">
                            {analyticsData.historicalStats.slice(-14).map((point, index) => {
                              const maxValue = Math.max(...analyticsData.historicalStats!.slice(-14).map(p => p.viewCount));
                              const height = maxValue > 0 ? (point.viewCount / maxValue) * 100 : 0;
                              return (
                                <div
                                  key={index}
                                  className="bg-blue-500 rounded-sm flex-1 min-w-0"
                                  style={{ height: `${height}%` }}
                                  title={`${formatDate(point.recordedAt)}: ${formatNumber(point.viewCount)} views`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Recent Videos Performance */}
                <Card className="mobile-card lg:p-6">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">
                    Recent Videos Performance
                  </h3>
                  {analyticsData.youtube.videos.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.youtube.videos.slice(0, 5).map((video) => (
                        <div key={video.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 bg-gray-50 rounded-lg space-y-3 lg:space-y-0">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 break-words pr-2" title={video.title}>
                              {video.title}
                            </h4>
                            <p className="text-xs lg:text-sm text-gray-600 mt-1">
                              Published {formatDate(video.publishedAt)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-6 text-xs lg:text-sm text-gray-600 lg:flex-shrink-0">
                            <div className="text-center">
                              <span className="block font-medium text-gray-900">{formatNumber(video.views)}</span>
                              <span>Views</span>
                            </div>
                            <div className="text-center">
                              <span className="block font-medium text-gray-900">{formatNumber(video.likes)}</span>
                              <span>Likes</span>
                            </div>
                            <div className="text-center">
                              <span className="block font-medium text-gray-900">{formatNumber(video.comments)}</span>
                              <span>Comments</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No recent videos found</p>
                    </div>
                  )}
                </Card>

                {/* AI Insights */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      AI Insights
                    </h3>
                    <Button
                      onClick={generateAIInsights}
                      disabled={generatingInsights}
                      variant="secondary"
                    >
                      {generatingInsights ? 'Generating...' : 'Generate Insights'}
                    </Button>
                  </div>

                  {analyticsData.insights && analyticsData.insights.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.insights.map((insight, index) => (
                        <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">
                        Get AI-powered insights about your YouTube performance
                      </p>
                      <Button 
                        onClick={generateAIInsights} 
                        disabled={generatingInsights}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {generatingInsights ? 'Generating Insights...' : 'Generate AI Insights'}
                      </Button>
                    </div>
                  )}
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-gray-600 mb-4">
                  No analytics data available
                </p>
                <Button onClick={refreshYouTubeStats}>
                  Load YouTube Stats
                </Button>
              </Card>
            )}
          </>
        )}

        {/* No Connections State */}
        {!youtubeAccount.connected && !twitchAccount.connected && !loading && (
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Connect Your Social Media Accounts
              </h3>
              <p className="text-gray-600 mb-6">
                Connect your YouTube and Twitch accounts to start tracking your performance and get AI-powered insights. More platforms like TikTok, Instagram, Facebook, and X coming soon!
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
              <Button onClick={connectYouTube} className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Connect YouTube
              </Button>
              
              <Button onClick={connectTwitch} variant="secondary" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6.857 4.714h1.715v5.143H6.857z" />
                  <path d="M21.5 2H2.5C1.119 2 0 3.119 0 4.5v15C0 20.881 1.119 22 2.5 22h19c1.381 0 2.5-1.119 2.5-2.5v-15C24 3.119 22.881 2 21.5 2zM23 19.5c0 .827-.673 1.5-1.5 1.5h-19c-.827 0-1.5-.673-1.5-1.5v-15c0-.827.673-1.5 1.5-1.5h19c.827 0 1.5.673 1.5 1.5v15z"/>
                </svg>
                Connect Twitch
              </Button>
            </div>
          </Card>
        )}

        {/* Last Updated Info */}
        {analyticsData?.lastUpdated && (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Last updated: {formatDate(analyticsData.lastUpdated)}
            </p>
          </div>
        )}
      </div>
    </Protected>
  );
}
