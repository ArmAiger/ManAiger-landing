'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/src/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import Protected from '@/components/layout/Protected';

// Patch: Extend Deal type to allow optional created_at for compatibility
type DealWithCreatedAt = Deal & { created_at?: string };

interface Deal {
  id: string;
  creator_id: string;
  brand: {
    id: string;
    name: string;
    contact_name?: string;
    contact_email?: string;
  } | null;
  title: string;
  status: string;
  proposed_amount: number | null;
  agreed_amount: number | null;
  dates: any;
  terms_snapshot: any;
  lost_reason: string | null;
  invoice_id: string | null;
}

interface Activity {
  id: string;
  type: string;
  message: string;
  created_at: string;
  actor: string;
  metadata?: any;
}

interface Conversation {
  id: string;
  channel: string;
  direction: string;
  timestamp: string;
  summary: string;
  disposition: string;
  amount?: number;
  terms_delta?: string;
  attachments?: any[];
  created_at: string;
}

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showAiReplyModal, setShowAiReplyModal] = useState(false);
  const [aiGeneratedReply, setAiGeneratedReply] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  // Conversation form state
  const [conversationForm, setConversationForm] = useState({
    channel: 'EMAIL' as 'EMAIL' | 'IG_DM' | 'X_DM' | 'DISCORD' | 'OTHER',
    direction: 'OUTBOUND' as 'INBOUND' | 'OUTBOUND',
    summary: '',
    disposition: 'NO_REPLY' as 'NO_REPLY' | 'INTERESTED' | 'DECLINED' | 'NEEDS_INFO' | 'COUNTER',
    amount: '',
    terms_delta: ''
  });

  // Agreement form state
  const [agreementForm, setAgreementForm] = useState({
    amount: '',
    currency: 'USD',
    usage_rights: '',
    content_due: '',
    go_live: '',
    brand_contact_name: '',
    brand_contact_email: '',
    deliverables: [{ platform: 'TIKTOK', count: 1, notes: '' }]
  });

  useEffect(() => {
    if (dealId) {
      loadDeal();
      loadActivities();
      loadConversations();
    }
  }, [dealId]);

  const loadDeal = async () => {
    try {
      const response = await api.getDeal(dealId);
      if (response.data) {
        setDeal(response.data);
      } else if (response.error) {
        toast.error(response.error);
        router.push('/deals');
      }
    } catch (error) {
      console.error('Failed to load deal:', error);
      toast.error('Failed to load deal');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await api.getDealActivity(dealId);
      if (response.data) {
        setActivities(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.getDealConversations(dealId);
      if (response.data) {
        setConversations(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleStatusTransition = async (newStatus: string, notes?: string) => {
    try {
      const response = await api.transitionDealStatus(dealId, { to: newStatus as any, notes });
      if (response.data) {
        toast.success(`Deal status updated to ${newStatus}`);
        loadDeal();
        loadActivities();
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleLogConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.logConversation(dealId, {
        channel: conversationForm.channel,
        direction: conversationForm.direction,
        summary: conversationForm.summary,
        disposition: conversationForm.disposition,
        amount: conversationForm.amount ? parseFloat(conversationForm.amount) : undefined,
        terms_delta: conversationForm.terms_delta || undefined
      });

      if (response.data) {
        toast.success('Conversation logged successfully');
        setShowConversationModal(false);
        setConversationForm({
          channel: 'EMAIL',
          direction: 'OUTBOUND',
          summary: '',
          disposition: 'NO_REPLY',
          amount: '',
          terms_delta: ''
        });
        loadActivities();
        loadConversations();
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('Failed to log conversation:', error);
      toast.error('Failed to log conversation');
    }
  };

  const generateAiReply = async (brandMessage: string) => {
    try {
      setIsGeneratingReply(true);
      
      const response = await api.generateReply({
        dealId,
        brandMessage,
        context: `Recent conversation about ${deal?.title || 'partnership'}`
      });

      if (response.data && response.data.reply) {
        setAiGeneratedReply(response.data.reply);
        setShowAiReplyModal(true);
        toast.success('AI reply generated! Review and use it for your response.');
      } else if (response.error) {
        toast.error(response.error);
      } else {
        console.error('Unexpected response structure:', response);
        toast.error('Failed to generate AI reply');
      }
    } catch (error) {
      console.error('Failed to generate AI reply:', error);
      toast.error('Failed to generate AI reply');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleLockAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const terms = {
        price: {
          amount: parseFloat(agreementForm.amount),
          currency: agreementForm.currency,
          schedule: 'SINGLE' as const
        },
        usage_rights: agreementForm.usage_rights,
        deliverables: agreementForm.deliverables,
        due_dates: {
          content_due: agreementForm.content_due,
          go_live: agreementForm.go_live
        },
        brand_poc: {
          name: agreementForm.brand_contact_name,
          email: agreementForm.brand_contact_email
        }
      };

      const response = await api.lockDealAgreement(dealId, terms);
      if (response.data) {
        toast.success('Agreement locked successfully');
        setShowAgreementModal(false);
        loadDeal();
        loadActivities();
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('Failed to lock agreement:', error);
      toast.error('Failed to lock agreement');
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'PROSPECT': 'gray',
      'OUTREACH_SENT': 'blue',
      'NEGOTIATION': 'yellow',
      'AGREEMENT_LOCKED': 'blue',
      'INVOICED': 'yellow',
      'PAID': 'green',
      'DECLINED': 'red',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  const getAvailableActions = () => {
    if (!deal) return [];
    
    const actions = [];
    
    switch (deal.status) {
      case 'PROSPECT':
        actions.push({ label: 'Send Outreach', action: 'OUTREACH_SENT' });
        break;
      case 'OUTREACH_SENT':
        actions.push({ label: 'Mark Negotiation', action: 'NEGOTIATION' });
        break;
      case 'NEGOTIATION':
        actions.push({ label: 'Lock Agreement', action: 'lock-agreement' });
        break;
      case 'AGREEMENT_LOCKED':
        actions.push({ label: 'Create Invoice', action: 'create-invoice' });
        break;
      case 'INVOICED':
        actions.push({ label: 'Mark Paid', action: 'PAID' });
        break;
    }
    
    if (!['PAID', 'DECLINED'].includes(deal.status)) {
      actions.push({ label: 'Decline', action: 'DECLINED' });
    }
    
    return actions;
  };

  if (loading) {
    return (
      <Protected>
        <div className="p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
          <p className="text-center text-gray-600 mt-2">Loading deal...</p>
        </div>
      </Protected>
    );
  }

  if (!deal) {
    return (
      <Protected>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Card className="text-center py-12">
              <p className="text-gray-600 text-lg mb-4">Deal not found</p>
              <Button onClick={() => router.push('/deals')}>
                Back to Deals
              </Button>
            </Card>
          </div>
        </div>
      </Protected>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button variant="secondary" size="sm" onClick={() => router.push('/deals')}>
                  ← Back
                </Button>
                <Badge 
                  label={deal.status.replace('_', ' ')}
                  tone={getStatusColor(deal.status) as any}
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{deal.title}</h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {deal.brand?.name || 'No brand assigned'} • Created {formatDate((deal.dates && deal.dates.created_at) || (deal as DealWithCreatedAt).created_at)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              {getAvailableActions().map((action) => (
                <Button
                  key={action.action}
                  variant={action.action === 'DECLINED' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => {
                    if (action.action === 'lock-agreement') {
                      setShowAgreementModal(true);
                    } else if (action.action === 'create-invoice') {
                      router.push(`/invoices/new?dealId=${deal.id}`);
                    } else {
                      handleStatusTransition(action.action);
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tabs - Responsive */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              {['overview', 'conversation', 'agreement', 'activity'].map((tab) => (
                <button
                  key={tab}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-brand-purple text-brand-purple'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Deal Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Title</label>
                    <p className="text-gray-900 break-words">{deal.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Proposed Amount</label>
                    <p className="text-gray-900">{formatCurrency(deal.proposed_amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Agreed Amount</label>
                    <p className="text-gray-900">{formatCurrency(deal.agreed_amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <Badge 
                        label={deal.status.replace('_', ' ')}
                        tone={getStatusColor(deal.status) as any}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold mb-4">Brand Information</h3>
                {deal.brand ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Brand Name</label>
                      <p className="text-gray-900 break-words">{deal.brand.name}</p>
                    </div>
                    {deal.brand.contact_name && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contact Person</label>
                        <p className="text-gray-900 break-words">{deal.brand.contact_name}</p>
                      </div>
                    )}
                    {deal.brand.contact_email && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Contact Email</label>
                        <p className="text-gray-900 break-all">{deal.brand.contact_email}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No brand information available</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'conversation' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold">Conversations</h3>
              <Button onClick={() => setShowConversationModal(true)} className="w-full sm:w-auto">
                Log Conversation
              </Button>
            </div>
            <div className="space-y-4">
              {conversations.length > 0 ? (
                conversations.map((conversation, index) => {
                  // Find the most recent inbound conversation by timestamp
                  const inboundConversations = conversations.filter(c => c.direction === 'INBOUND');
                  const mostRecentInbound = inboundConversations.length > 0 
                    ? inboundConversations.reduce((latest, current) => 
                        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
                      )
                    : null;
                  const showAiButton = conversation.direction === 'INBOUND' && mostRecentInbound && conversation.id === mostRecentInbound.id;
                  
                  return (
                    <Card key={conversation.id} className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            label={conversation.direction} 
                            tone={conversation.direction === 'INBOUND' ? 'green' : 'blue'} 
                          />
                          <Badge label={conversation.channel} tone="gray" />
                          <Badge 
                            label={conversation.disposition} 
                            tone={
                              conversation.disposition === 'INTERESTED' ? 'green' :
                              conversation.disposition === 'DECLINED' ? 'red' :
                              conversation.disposition === 'NEEDS_INFO' ? 'yellow' :
                              'gray'
                            } 
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          {showAiButton && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => generateAiReply(conversation.summary)}
                              disabled={isGeneratingReply}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 w-full sm:w-auto"
                            >
                              {isGeneratingReply ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <svg className="-ml-0.5 mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  AI Reply
                                </>
                              )}
                            </Button>
                          )}
                          <span className="text-sm text-gray-500">
                            {formatDate(conversation.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-900 mb-2 break-words">{conversation.summary}</p>
                      {conversation.amount && (
                        <p className="text-sm text-gray-600">
                          Amount discussed: {formatCurrency(conversation.amount)}
                        </p>
                      )}
                      {conversation.terms_delta && (
                        <p className="text-sm text-gray-600 break-words">
                          Terms change: {conversation.terms_delta}
                        </p>
                      )}
                    </Card>
                  );
                })
              ) : (
                <Card className="p-6">
                  <p className="text-gray-500 text-center">No conversations logged yet</p>
                  <p className="text-sm text-gray-400 text-center mt-2">
                    Use the "Log Conversation" button to track communications with brands
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agreement' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h3 className="text-lg font-semibold">Agreement Terms</h3>
              {deal.status === 'NEGOTIATION' && (
                <Button onClick={() => setShowAgreementModal(true)} className="w-full sm:w-auto">
                  Lock Agreement
                </Button>
              )}
            </div>
            <Card className="p-4 sm:p-6">
              {deal.terms_snapshot ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">🔒 Locked Agreement Terms</h4>
                    
                    {/* Price Information */}
                    {deal.terms_snapshot.price && (
                      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                        <h5 className="font-semibold text-green-800 mb-2">💰 Payment Terms</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-green-700">Amount</label>
                            <p className="text-lg font-bold text-green-900 break-words">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: deal.terms_snapshot.price.currency || 'USD'
                              }).format(deal.terms_snapshot.price.amount)}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-green-700">Currency</label>
                            <p className="text-green-900">{deal.terms_snapshot.price.currency || 'USD'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-green-700">Schedule</label>
                            <p className="text-green-900 capitalize">{deal.terms_snapshot.price.schedule || 'Single'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Usage Rights */}
                    {deal.terms_snapshot.usage_rights && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h5 className="font-semibold text-blue-800 mb-2">📋 Usage Rights</h5>
                        <p className="text-blue-900 break-words">{deal.terms_snapshot.usage_rights}</p>
                      </div>
                    )}

                    {/* Deliverables */}
                    {deal.terms_snapshot.deliverables && deal.terms_snapshot.deliverables.length > 0 && (
                      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <h5 className="font-semibold text-purple-800 mb-3">🎯 Deliverables</h5>
                        <div className="space-y-3">
                          {deal.terms_snapshot.deliverables.map((deliverable: any, index: number) => (
                            <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded border border-purple-100 gap-2">
                              <div className="flex items-center space-x-3">
                                <Badge 
                                  label={deliverable.platform} 
                                  tone="blue" 
                                />
                                <span className="font-medium text-purple-900">
                                  {deliverable.count} {deliverable.count === 1 ? 'post' : 'posts'}
                                </span>
                              </div>
                              {deliverable.notes && (
                                <span className="text-sm text-purple-700 break-words">{deliverable.notes}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Due Dates */}
                    {deal.terms_snapshot.due_dates && (
                      <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <h5 className="font-semibold text-orange-800 mb-3">📅 Important Dates</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {deal.terms_snapshot.due_dates.content_due && (
                            <div>
                              <label className="text-sm font-medium text-orange-700">Content Due</label>
                              <p className="text-orange-900 font-medium break-words">
                                {new Date(deal.terms_snapshot.due_dates.content_due).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          )}
                          {deal.terms_snapshot.due_dates.go_live && (
                            <div>
                              <label className="text-sm font-medium text-orange-700">Go Live Date</label>
                              <p className="text-orange-900 font-medium break-words">
                                {new Date(deal.terms_snapshot.due_dates.go_live).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Brand Contact */}
                    {deal.terms_snapshot.brand_poc && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-3">👤 Brand Point of Contact</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {deal.terms_snapshot.brand_poc.name && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Name</label>
                              <p className="text-gray-900 break-words">{deal.terms_snapshot.brand_poc.name}</p>
                            </div>
                          )}
                          {deal.terms_snapshot.brand_poc.email && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Email</label>
                              <p className="text-gray-900 break-all">{deal.terms_snapshot.brand_poc.email}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Raw Terms (Collapsible) */}
                    <details className="mt-6">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        View Raw Terms (Technical Details)
                      </summary>
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
                        <pre className="text-xs text-gray-700 overflow-auto">
                          {JSON.stringify(deal.terms_snapshot, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No agreement terms locked yet</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h3 className="text-lg font-semibold mb-6">Activity Timeline</h3>
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{activity.message}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        by {activity.actor} • {formatDate(activity.created_at)}
                      </p>
                    </div>
                    <Badge label={activity.type} tone="gray" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Log Conversation Modal */}
        <Modal
          open={showConversationModal}
          onClose={() => setShowConversationModal(false)}
        >
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Log Conversation</h3>
            <form onSubmit={handleLogConversation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel
                  </label>
                  <Select
                    value={conversationForm.channel}
                    onChange={(e) => setConversationForm({ ...conversationForm, channel: e.target.value as any })}
                  >
                    <option value="EMAIL">Email</option>
                    <option value="IG_DM">Instagram DM</option>
                    <option value="X_DM">X/Twitter DM</option>
                    <option value="DISCORD">Discord</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction
                  </label>
                  <Select
                    value={conversationForm.direction}
                    onChange={(e) => setConversationForm({ ...conversationForm, direction: e.target.value as any })}
                  >
                    <option value="OUTBOUND">Outbound</option>
                    <option value="INBOUND">Inbound</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Summary *
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows={3}
                  value={conversationForm.summary}
                  onChange={(e) => setConversationForm({ ...conversationForm, summary: e.target.value })}
                  placeholder="Describe what was discussed..."
                  required
                />
                {conversationForm.direction === 'INBOUND' && (
                  <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                        <div>
                          <span className="text-sm font-medium text-purple-800">AI Reply Assistant</span>
                          <p className="text-sm text-purple-700 mt-1">
                            Generate an AI-powered reply suggestion for this inbound message.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => generateAiReply(conversationForm.summary)}
                        disabled={isGeneratingReply || !conversationForm.summary.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isGeneratingReply ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg className="-ml-0.5 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disposition
                  </label>
                  <Select
                    value={conversationForm.disposition}
                    onChange={(e) => setConversationForm({ ...conversationForm, disposition: e.target.value as any })}
                  >
                    <option value="NO_REPLY">No Reply</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="DECLINED">Declined</option>
                    <option value="NEEDS_INFO">Needs Info</option>
                    <option value="COUNTER">Counter Offer</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Discussed ($)
                  </label>
                  <Input
                    type="number"
                    value={conversationForm.amount}
                    onChange={(e) => setConversationForm({ ...conversationForm, amount: e.target.value })}
                    placeholder="1500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms Changes
                </label>
                <Input
                  value={conversationForm.terms_delta}
                  onChange={(e) => setConversationForm({ ...conversationForm, terms_delta: e.target.value })}
                  placeholder="Any changes to terms discussed..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowConversationModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Log Conversation
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Agreement Modal */}
        <Modal
          open={showAgreementModal}
          onClose={() => setShowAgreementModal(false)}
        >
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Lock Agreement Terms</h3>
            <form onSubmit={handleLockAgreement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount ($) *
                  </label>
                  <Input
                    type="number"
                    value={agreementForm.amount}
                    onChange={(e) => setAgreementForm({ ...agreementForm, amount: e.target.value })}
                    placeholder="1500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <Select
                    value={agreementForm.currency}
                    onChange={(e) => setAgreementForm({ ...agreementForm, currency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usage Rights *
                </label>
                <Input
                  value={agreementForm.usage_rights}
                  onChange={(e) => setAgreementForm({ ...agreementForm, usage_rights: e.target.value })}
                  placeholder="e.g., 6 months paid social, organic only"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Due Date *
                  </label>
                  <Input
                    type="date"
                    value={agreementForm.content_due}
                    onChange={(e) => setAgreementForm({ ...agreementForm, content_due: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Go Live Date *
                  </label>
                  <Input
                    type="date"
                    value={agreementForm.go_live}
                    onChange={(e) => setAgreementForm({ ...agreementForm, go_live: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Contact Name *
                  </label>
                  <Input
                    value={agreementForm.brand_contact_name}
                    onChange={(e) => setAgreementForm({ ...agreementForm, brand_contact_name: e.target.value })}
                    placeholder="Contact person name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Contact Email *
                  </label>
                  <Input
                    type="email"
                    value={agreementForm.brand_contact_email}
                    onChange={(e) => setAgreementForm({ ...agreementForm, brand_contact_email: e.target.value })}
                    placeholder="contact@brand.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deliverables
                </label>
                {agreementForm.deliverables.map((deliverable, index) => (
                  <div key={index} className="grid grid-cols-3 gap-3 mb-3">
                    <Select
                      value={deliverable.platform}
                      onChange={(e) => {
                        const newDeliverables = [...agreementForm.deliverables];
                        newDeliverables[index].platform = e.target.value;
                        setAgreementForm({ ...agreementForm, deliverables: newDeliverables });
                      }}
                    >
                      <option value="TIKTOK">TikTok</option>
                      <option value="INSTAGRAM_POST">Instagram Post</option>
                      <option value="INSTAGRAM_STORY">Instagram Story</option>
                      <option value="YOUTUBE">YouTube</option>
                      <option value="X_POST">X/Twitter Post</option>
                    </Select>
                    <Input
                      type="number"
                      value={deliverable.count}
                      onChange={(e) => {
                        const newDeliverables = [...agreementForm.deliverables];
                        newDeliverables[index].count = parseInt(e.target.value);
                        setAgreementForm({ ...agreementForm, deliverables: newDeliverables });
                      }}
                      placeholder="Count"
                      min="1"
                    />
                    <Input
                      value={deliverable.notes}
                      onChange={(e) => {
                        const newDeliverables = [...agreementForm.deliverables];
                        newDeliverables[index].notes = e.target.value;
                        setAgreementForm({ ...agreementForm, deliverables: newDeliverables });
                      }}
                      placeholder="Notes (e.g., 30-45s each)"
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAgreementForm({
                    ...agreementForm,
                    deliverables: [...agreementForm.deliverables, { platform: 'TIKTOK', count: 1, notes: '' }]
                  })}
                >
                  Add Deliverable
                </Button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAgreementModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Lock Agreement
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* AI Generated Reply Modal */}
        <Modal
          open={showAiReplyModal}
          onClose={() => setShowAiReplyModal(false)}
        >
          <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI-Generated Reply</h3>
                <p className="text-sm text-gray-600 mt-1">Professional response crafted for your brand partnership</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Main Reply Section */}
              <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-semibold text-purple-800">✨ Your AI-Generated Response</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent"></div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-purple-100 shadow-sm">
                  <div className="prose prose-gray max-w-none">
                    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                      {aiGeneratedReply || 'Generating your professional response...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 mb-2">💡 Tips for using this reply:</h4>
                    <ul className="text-sm text-amber-700 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>Review and personalize the message to match your authentic voice</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>Add any specific details or clarifications based on your knowledge</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>Double-check any rates, terms, or deliverables mentioned</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>Copy the text and paste it into your preferred email client</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(aiGeneratedReply);
                    toast.success('Reply copied to clipboard!');
                  }}
                  className="flex items-center gap-2 px-4 py-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    // Re-generate the reply with the last used message
                    const lastInboundMessage = conversations
                      .filter(c => c.direction === 'INBOUND')
                      .reduce((latest, current) => 
                        new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
                      );
                    if (lastInboundMessage) {
                      generateAiReply(lastInboundMessage.summary);
                    }
                  }}
                  disabled={isGeneratingReply}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 flex items-center gap-2"
                >
                  {isGeneratingReply ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
        </div>
      </div>
    </Protected>
  );
}
