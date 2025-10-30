'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/src/lib/api';
import { trackTikTokEvent } from '@/src/lib/tiktok-pixel';
import Protected from '@/components/layout/Protected';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Drawer from '@/components/ui/Drawer';
import Skeleton from '@/components/ui/Skeleton';
import BrandDetailsModal from '@/components/BrandDetailsModal';
import NicheManager from '@/components/NicheManager';
import { toast } from 'react-hot-toast';

interface BrandMatch {
  id: string;
  userId: string;
  source: string;
  brandName: string;
  fitReason: string;
  outreachDraft: string;
  status: 'draft' | 'pending' | 'contacted' | 'interested' | 'rejected' | 'completed';
  matchScore: number;
  createdAt: string;
  updatedAt: string;
  brandId?: string;
  // Enhanced AI fields
  dealType?: string;
  estimatedRate?: string;
  brandCountry?: string;
  requiresShipping?: boolean;
  brandWebsite?: string;
  brandEmail?: string;
  brand?: {
    id: string;
    name: string;
    description?: string;
    website?: string;
    industry?: string;
    category?: string;
    tags?: string[];
    socialMedia?: {
      instagram?: string;
      twitter?: string;
      tiktok?: string;
      youtube?: string;
    };
    contactInfo?: {
      email?: string;
      phone?: string;
      contactPerson?: string;
    };
    companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
    location?: string;
    targetAudience?: string;
    brandValues?: string;
    averageCampaignBudget?: string;
    preferredContentTypes?: string[];
    logoUrl?: string;
  };
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'draft': return 'gray';
    case 'contacted': return 'blue';
    case 'interested': return 'green';
    case 'rejected': return 'red';
    case 'completed': return 'green';
    default: return 'gray';
  }
};

interface Niche {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function BrandsPageContent() {
  const searchParams = useSearchParams();
  const isNewCreator = searchParams.get('newCreator') === 'true';
  
  const [brandMatches, setBrandMatches] = useState<BrandMatch[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isNewCreator);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
  });
  const [selectedMatch, setSelectedMatch] = useState<BrandMatch | null>(null);
  const [showOutreachDrawer, setShowOutreachDrawer] = useState(false);
  const [showBrandDetails, setShowBrandDetails] = useState(false);
  const [selectedBrandMatch, setSelectedBrandMatch] = useState<BrandMatch | null>(null);
  const [outreachForm, setOutreachForm] = useState({
    subject: '',
    message: '',
    to: '',
    useGmail: false,
  });
  const [isSendingOutreach, setIsSendingOutreach] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [gmailAccount, setGmailAccount] = useState<{ connected: boolean; email?: string; connectedAt?: string } | null>(null);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [userPlan, setUserPlan] = useState<{
    plan: string;
    monthlyUsage: number;
    monthlyLimit: number | null;
    remaining: number | null;
    subscriptionStatus: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);

  useEffect(() => {
    loadBrandMatches();
    loadNiches();
    loadGmailAccount();
    loadUserPlanUsage();
  }, []);

  useEffect(() => {
    filterMatches();
  }, [filters]);

  // Check for Gmail connection status from URL params (after OAuth redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailStatus = urlParams.get('gmail');
    
    if (gmailStatus === 'connected') {
      // Refresh Gmail account status after successful connection
      setTimeout(() => {
        loadGmailAccount();
      }, 1000);
      toast.success('Gmail connected successfully!');
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (gmailStatus === 'error') {
      const errorMessage = urlParams.get('message') || 'Failed to connect Gmail';
      toast.error(`Gmail connection failed: ${errorMessage}`);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const loadGmailAccount = async () => {
    try {
      const response = await api.getGmailAccount();
      if (response.data) {
        setGmailAccount(response.data);
      }
    } catch (error) {
      console.error('Failed to load Gmail account:', error);
    }
  };

  const loadUserPlanUsage = async () => {
    try {
      const response = await api.getUserPlanUsage();
      if (response.data) {
        setUserPlan(response.data);
      } else {
        console.warn("No valid plan data found in response:", response);
      }
    } catch (error) {
      console.error('Failed to load user plan usage:', error);
    }
  };

  const connectGmail = async () => {
    try {
      setIsLoadingGmail(true);
      const response = await api.connectGmail();
      if (response.data?.authUrl) {
        window.location.href = response.data.authUrl;
      }
    } catch (error) {
      toast.error('Failed to connect Gmail');
      setIsLoadingGmail(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      const response = await api.disconnectGmail();
      if (response.data) {
        setGmailAccount({ connected: false });
        toast.success('Gmail disconnected successfully');
      }
    } catch (error) {
      toast.error('Failed to disconnect Gmail');
    }
  };

  const loadBrandMatches = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const options = {
        page,
        pageSize: pagination.pageSize,
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search })
      };
      const response = await api.getBrandMatches(options);
      if (response.data) {
        setBrandMatches(response.data.data || []);
        setPagination({
          page: response.data.page || page,
          pageSize: response.data.pageSize || 20,
          total: response.data.total || 0,
          totalPages: Math.ceil((response.data.total || 0) / (response.data.pageSize || 20))
        });
      }
    } catch (error) {
      toast.error('Failed to load brand matches');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNiches = async () => {
    try {
      const response = await api.getUserNiches();
      if (response.data) {
        setNiches(response.data);
      }
    } catch (error) {
      console.error('Failed to load niches:', error);
    }
  };

  const handleNichesChange = async (updatedNiches?: Niche[]) => {
    if (updatedNiches) {
      // Direct update from component
      setNiches(updatedNiches);
    } else {
      // Reload from API
      await loadNiches();
    }
  };

  const handleGetBrandMatches = async () => {
    if (niches.length === 0) {
      toast.error('Please add at least one niche first');
      return;
    }

    setIsGenerating(true);
    try {
      // Get existing brand names to send to AI for better duplicate prevention
      const existingBrandNames = brandMatches.map(match => match.brandName);
      
      // Use the smart monthly brand generation endpoint
      const response = await api.generateMonthlyBrandMatches(existingBrandNames);
      
      if (response.data !== undefined) {
        const data = response.data;
        const actualMatches = Array.isArray(data) ? data.length : data.actualMatches || 0;
        const duplicatesFiltered = data.duplicatesFiltered || 0;
        const attemptsUsed = data.attemptsUsed || 1;
        
        if (actualMatches > 0) {
          // Track successful brand match generation
          trackTikTokEvent("brand_match_viewed");
          
          // Successfully created new brands
          let message = response.message || `Generated ${actualMatches} new brand matches!`;
          
          // Add helpful context about the generation process
          if (duplicatesFiltered > 0) {
            toast.success(message, {
              duration: 6000, // Show longer for more complex messages
            });
            // Show additional info as a separate toast
            setTimeout(() => {
              toast(`ℹ️ ${duplicatesFiltered} duplicates were filtered out to ensure you only get unique brands`, {
                duration: 4000,
              });
            }, 1000);
          } else {
            toast.success(message);
          }
          
          // Show generation stats if multiple attempts were made
          if (attemptsUsed > 1) {
            setTimeout(() => {
              toast(`🔄 Used ${attemptsUsed} AI generation attempts to find unique matches`, {
                duration: 3000,
              });
            }, 2000);
          }
        } else {
          // No new brands could be generated
          const message = response.message || 'No new unique brand matches could be generated at this time.';
          toast('ℹ️ ' + message, { duration: 5000 });
          
          if (duplicatesFiltered > 0) {
            setTimeout(() => {
              toast(`All ${duplicatesFiltered} suggested brands were already in your matches. Try adding new niches for fresh suggestions.`, {
                duration: 6000,
              });
            }, 1000);
          }
        }
        
        // Always reload to show any new matches and update usage
        await Promise.all([
          loadBrandMatches(1),
          loadUserPlanUsage()
        ]);
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error: any) {
      console.error('Failed to generate brand matches:', error);
      
      // Handle specific error cases
      if (error?.response?.status === 402) {
        // Payment/plan limit error
        const errorMessage = error.response?.data?.message || error.message || 'Plan limit reached';
        toast.error(errorMessage, { duration: 8000 });
      } else {
        toast.error('Failed to generate brand matches. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const filterMatches = () => {
    // Since we're doing server-side filtering, just reload with current filters
    loadBrandMatches(1);
  };

  const updateMatchStatus = async (matchId: string, newStatus: string) => {
    try {
      const response = await api.updateBrandMatchStatus(matchId, newStatus);
      if (response.data) {
        setBrandMatches(prev =>
          prev.map(match =>
            match.id === matchId ? { ...match, status: newStatus as any } : match
          )
        );
        toast.success('Status updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openOutreachDrawer = (match: BrandMatch) => {
    setSelectedMatch(match);
    setOutreachForm({
      subject: `Partnership Opportunity with ${match.brandName}`,
      message: `Hi ${match.brandName} team,

I hope this email finds you well. I'm reaching out because I believe ${match.brandName} and my content audience would be an excellent strategic fit.

From what I understand about ${match.brandName}, your brand focuses on [brand's key area/values]. My audience and content align perfectly with your target demographic, particularly in [specific alignment area].

To give you a brief overview of my reach: [audience size/platform], with [engagement metric] and a primary audience of [demographic info that matches brand's target].

I believe a partnership between us could provide significant value to ${match.brandName} by [specific benefit/ROI for the brand]. This collaboration could help you [achieve specific brand goal/reach target audience].

I'd love to discuss how we can work together to create content that drives meaningful results for your brand. Would you be available for a brief call this week to explore this opportunity?

Best regards`,
      to: '',
      useGmail: gmailAccount?.connected || false,
    });
    setShowOutreachDrawer(true);
  };

  const openBrandDetails = (match: BrandMatch) => {
    setSelectedBrandMatch(match);
    setShowBrandDetails(true);
  };

  const closeBrandDetails = () => {
    setSelectedBrandMatch(null);
    setShowBrandDetails(false);
  };

  const sendOutreach = async () => {
    if (!selectedMatch) return;

    // Validate required fields
    if (!outreachForm.subject || !outreachForm.message) {
      toast.error('Please fill in both subject and message');
      return;
    }

    // Check if we have an email address
    if (!outreachForm.to && outreachForm.useGmail) {
      toast.error('Please provide an email address to send the outreach to');
      return;
    }

    if (outreachForm.useGmail && !gmailAccount?.connected) {
      toast.error('Gmail is not connected. Please connect your Gmail account first.');
      return;
    }

    setIsSendingOutreach(true);
    try {
      const response = await api.sendOutreach(selectedMatch.id, {
        subject: outreachForm.subject,
        message: outreachForm.message,
        to: outreachForm.to,
        useGmail: outreachForm.useGmail
      });

      if (response.data) {
        // Track successful outreach sent
        trackTikTokEvent("outreach_draft");
        
        if (outreachForm.useGmail) {
          toast.success('Outreach email sent via Gmail!');
        } else {
          toast.success('Outreach logged successfully!');
        }
        await updateMatchStatus(selectedMatch.id, 'sent');
        setShowOutreachDrawer(false);
        setSelectedMatch(null);
      }
    } catch (error) {
      console.error('Send outreach error:', error);
      toast.error('Failed to send outreach email');
    } finally {
      setIsSendingOutreach(false);
    }
  };

  const generateAIOutreach = async () => {
    if (!selectedMatch) return;

    setIsGeneratingAI(true);
    try {
      const response = await api.generateAIOutreach(
        selectedMatch.brandName,
        selectedMatch.brand
      );


      if (response.data) {
        const aiData = (response.data as any).data || response.data;
        setOutreachForm(prev => ({
          ...prev,
          subject: '',
          message: '',
        }));
        setTimeout(() => {
          setOutreachForm(prev => ({
            ...prev,
            subject: aiData?.subject || '',
            message: aiData?.message || '',
          }));
        }, 50);
        
        toast.success('AI outreach generated successfully!');
      } else {
        console.error('No data in response:', response);
        throw new Error(response.error || 'Failed to generate AI outreach');
      }
    } catch (error) {
      console.error('Failed to generate AI outreach:', error);
      toast.error('Failed to generate AI outreach');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const emailText = `Subject: ${outreachForm.subject}\n\n${outreachForm.message}`;
      await navigator.clipboard.writeText(emailText);
      setIsCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

    const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'gray'
      case 'sent': return 'blue'
      case 'contacted': return 'blue'
      case 'interested': return 'green'
      case 'accepted': return 'green'
      case 'rejected': return 'red'
      case 'completed': return 'green'
      default: return 'gray'
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Protected>
      <div className="space-y-4 lg:space-y-6">
        {/* Welcome message for new creators */}
        {showWelcome && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">
                    🎉 Welcome to your Brand Matches!
                  </h2>
                  <p className="text-blue-700 mb-4">
                    Based on your creator profile, we've generated personalized brand matches just for you. 
                    These brands align with your content style, audience, and deal preferences.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowWelcome(false)}
                      variant="secondary"
                      className="text-sm"
                    >
                      Got it!
                    </Button>
                  </div>
                </div>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Plan Usage Card */}
        {userPlan && (
          <Card className={`p-4 ${
            userPlan.remaining === 0 
              ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
              : userPlan.remaining !== null && userPlan.remaining <= 1 
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold text-sm">
                    {userPlan.plan.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {userPlan.plan} Plan
                  </h3>
                  <p className="text-sm text-gray-600">
                    {userPlan.monthlyLimit === null ? 'Unlimited' : 
                     `${userPlan.monthlyUsage}/${userPlan.monthlyLimit} brand matches this month`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {userPlan.monthlyLimit !== null && userPlan.remaining !== null && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {userPlan.remaining} remaining
                    </p>
                    <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          (userPlan.remaining / userPlan.monthlyLimit) > 0.5 ? 'bg-green-500' :
                          (userPlan.remaining / userPlan.monthlyLimit) > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.max(5, (userPlan.remaining / userPlan.monthlyLimit) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {userPlan.plan === 'free' && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs whitespace-nowrap"
                    onClick={() => window.location.href = '/settings'}
                  >
                    Upgrade Plan
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Brand Matches</h1>
            <p className="text-gray-600 text-sm lg:text-base">Discover and connect with brands that match your niche</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGetBrandMatches}
              disabled={isGenerating || (userPlan?.remaining === 0)}
              variant="primary"
              className="text-sm lg:text-base"
              title={userPlan?.remaining === 0 ? 'Monthly limit reached' : 
                     userPlan?.remaining === null ? 'Unlimited brand matches' : undefined}
            >
              {isGenerating ? 'Generating...' : 
               userPlan?.remaining === 0 ? 'Monthly Limit Reached' : 
               userPlan?.remaining === null ? 'Generate 5 more (Unlimited)' :
               userPlan?.remaining !== null && userPlan?.remaining !== undefined ? `Generate ${userPlan.remaining} Matches` :
               'Generate Matches'}
            </Button>
            {userPlan?.remaining === 0 && userPlan?.plan === 'free' && (
              <Button
                variant="secondary"
                className="text-sm lg:text-base"
                onClick={() => window.location.href = '/settings'}
              >
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>

        <NicheManager 
          niches={niches} 
          onNichesChange={handleNichesChange} 
        />

        <Card className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search brands or reasons..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="w-full lg:w-48">
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="mobile-grid">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="mobile-card lg:p-6">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </Card>
            ))}
          </div>
        ) : brandMatches.length > 0 ? (
          <>
            <div className="mobile-grid">
              {brandMatches.map((match) => (
                <Card key={match.id} className="mobile-card lg:p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                      {match.brand?.logoUrl && (
                        <img 
                          src={match.brand.logoUrl} 
                          alt={`${match.brandName} logo`} 
                          className="w-6 h-6 lg:w-8 lg:h-8 object-contain rounded flex-shrink-0"
                        />
                      )}
                      <h3 className="font-semibold text-gray-900 text-base lg:text-lg truncate">{match.brandName}</h3>
                    </div>
                    <Badge
                      tone={getStatusColor(match.status) as any}
                      label={match.status}
                    />
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2 mb-2 flex-wrap">
                    <Badge
                      tone="blue"
                      label={match.source}
                    />
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs lg:text-sm text-gray-500">Score: {match.matchScore}%</span>
                    {match.brandCountry && (
                      <>
                        <span className="text-xs text-gray-500">•</span>
                        <Badge tone="gray" label={match.brandCountry} />
                      </>
                    )}
                    {match.brand?.industry && (
                      <>
                        <span className="text-xs text-gray-500">•</span>
                        <Badge tone="green" label={match.brand.industry} />
                      </>
                    )}
                  </div>

                  {/* Deal Information */}
                  {(match.dealType || match.estimatedRate) && (
                    <div className="mb-3 bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        {match.dealType && (
                          <div>
                            <p className="text-xs text-blue-600 font-medium mb-1">Deal Type</p>
                            <Badge tone="blue" label={match.dealType} />
                          </div>
                        )}
                        {match.estimatedRate && (
                          <div className="text-right">
                            <p className="text-xs text-blue-600 font-medium mb-1">Est. Rate</p>
                            <p className="text-sm font-semibold text-blue-700">{match.estimatedRate}</p>
                          </div>
                        )}
                      </div>
                      {match.requiresShipping !== undefined && (
                        <div className="mt-2 pt-2 border-t border-blue-100">
                          <p className="text-xs text-blue-600">
                            {match.requiresShipping ? '📦 Physical products' : '💻 Digital only'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Brand Description */}
                  {match.brand?.description && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">About:</p>
                      <p className="text-gray-600 text-xs lg:text-sm line-clamp-2">
                        {match.brand.description}
                      </p>
                    </div>
                  )}

                  {/* Contact Information */}
                  {(match.brandWebsite || match.brandEmail || match.brand?.contactInfo?.email) ? (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Contact:</p>
                      <div className="flex flex-wrap gap-2">
                        {match.brandWebsite && (
                          <a
                            href={match.brandWebsite.startsWith('http') ? match.brandWebsite : `https://${match.brandWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors"
                          >
                            🌐 Website
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-yellow-600 text-sm">⚠️</span>
                          <div>
                            <p className="text-xs font-medium text-yellow-800 mb-1">No Contact Email Available</p>
                            <p className="text-xs text-yellow-700">
                              You'll need to research and provide the brand's contact email when sending outreach.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mb-3 lg:mb-4">
                    <p className="text-xs text-gray-500 mb-1">Why it's a match:</p>
                    <p className="text-gray-600 text-xs lg:text-sm line-clamp-2">
                      {match.fitReason}
                    </p>
                  </div>
                  
                  <div className="mb-3 lg:mb-4">
                    <p className="text-xs text-gray-500 mb-2">Draft Outreach:</p>
                    <p className="text-xs lg:text-sm text-gray-700 line-clamp-2">
                      {match.outreachDraft}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3 lg:mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge 
                        tone={getStatusColor(match.status) as any} 
                        label={match.status}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Generated</p>
                      <p className="font-semibold text-gray-700 text-xs lg:text-sm">{formatDate(match.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => openBrandDetails(match)}
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-xs lg:text-sm"
                      >
                        View Details
                      </Button>
                      
                      {(match.status === 'draft' || match.status === 'contacted') && (
                        <Button
                          onClick={() => openOutreachDrawer(match)}
                          variant="primary"
                          size="sm"
                          className="flex-1 text-xs lg:text-sm"
                        >
                          {match.status === 'draft' ? 'Send Outreach' : 'Send Follow-up'}
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Change Status:</label>
                      <Select
                        value={match.status}
                        onChange={(e) => updateMatchStatus(match.id, e.target.value)}
                        className="w-full text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="contacted">Contacted</option>
                        <option value="interested">Interested</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadBrandMatches(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                
                <Button
                  variant="secondary" 
                  size="sm"
                  onClick={() => loadBrandMatches(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filters.status !== 'all' || filters.search ? 'No matches found' : 'No brand matches yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filters.status !== 'all' || filters.search 
                ? 'Try adjusting your filters to see more results.'
                : userPlan 
                  ? `Generate your first brand matches to get started with partnerships. You can generate ${userPlan.monthlyLimit === null ? 'unlimited' : userPlan.monthlyLimit} matches this month.`
                  : 'Generate your first brand matches to get started with partnerships.'
              }
            </p>
            {(!filters.status || filters.status === 'all') && !filters.search && (
              <Button
                onClick={handleGetBrandMatches}
                disabled={isGenerating}
                variant="primary"
              >
                {isGenerating ? 'Generating...' : 'Generate Brand Matches'}
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Modals and Drawers - Outside the space-y container */}
      <Drawer open={showOutreachDrawer} onClose={() => setShowOutreachDrawer(false)}>
        {selectedMatch && (
          <>
            {/* Header - Fixed */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                    Outreach to {selectedMatch.brandName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Compose your partnership proposal
                  </p>
                </div>
                <button
                  onClick={() => setShowOutreachDrawer(false)}
                  className="ml-4 flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Gmail Connection Status */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Email Method</h3>
                  {gmailAccount?.connected && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Gmail Connected
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {gmailAccount?.connected ? (
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Connected as {gmailAccount.email}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={loadGmailAccount}
                          disabled={isLoadingGmail}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Refresh
                        </Button>
                        <Button
                          onClick={disconnectGmail}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                        </svg>
                        <span>Gmail not connected</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">You can still compose your email</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={loadGmailAccount}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          Refresh
                        </Button>
                        <Button
                          onClick={connectGmail}
                          disabled={isLoadingGmail}
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                        >
                          {isLoadingGmail ? 'Connecting...' : 'Connect Gmail'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Email To Field */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">Send To</label>
                <Input
                  value={outreachForm.to}
                  onChange={(e) => setOutreachForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="Enter brand contact email"
                  className="text-sm"
                  required
                />
              </div>

              {/* Gmail Option */}
              {gmailAccount?.connected && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={outreachForm.useGmail}
                      onChange={(e) => setOutreachForm(prev => ({ ...prev, useGmail: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="text-sm">
                      <span className="font-medium text-blue-700">
                        Send via Gmail
                      </span>
                      <p className="text-blue-600 text-xs mt-1">
                        Send directly from {gmailAccount.email}
                      </p>
                    </div>
                  </label>
                </div>
              )}
              
              {/* Subject Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Subject</label>
                <Input
                  value={outreachForm.subject}
                  onChange={(e) => setOutreachForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Email subject"
                  className="text-sm"
                />
              </div>
              
              {/* Message Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Message</label>
                <textarea
                  value={outreachForm.message}
                  onChange={(e) => setOutreachForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Your outreach message"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm leading-relaxed"
                />
              </div>

              {/* AI Generation and Copy buttons */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={generateAIOutreach}
                    disabled={isGeneratingAI}
                    variant="secondary"
                    className="flex items-center justify-center gap-2 text-sm"
                  >
                    {isGeneratingAI ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Generate with AI
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={copyToClipboard}
                    disabled={!outreachForm.subject || !outreachForm.message}
                    variant="secondary"
                    className="flex items-center justify-center gap-2 text-sm"
                  >
                    {isCopied ? (
                      <>
                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        Copy Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Footer - Fixed */}
            <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={sendOutreach}
                  disabled={isSendingOutreach || !outreachForm.subject || !outreachForm.message}
                  variant="primary"
                  className="flex-1 sm:flex-none sm:min-w-[120px] justify-center"
                >
                  {isSendingOutreach ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    outreachForm.useGmail ? 'Send via Gmail' : 'Log Outreach'
                  )}
                </Button>
                <Button
                  onClick={() => setShowOutreachDrawer(false)}
                  variant="secondary"
                  className="flex-1 sm:flex-none sm:min-w-[100px] justify-center"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        )}
      </Drawer>
      
      <BrandDetailsModal
        open={showBrandDetails}
        onClose={closeBrandDetails}
        brand={selectedBrandMatch?.brand || null}
        fitReason={selectedBrandMatch?.fitReason}
        outreachDraft={selectedBrandMatch?.outreachDraft}
      />
    </Protected>
  );
}

export default function BrandsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div>Loading...</div></div>}>
      <BrandsPageContent />
    </Suspense>
  );
}