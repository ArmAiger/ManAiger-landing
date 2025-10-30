'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/src/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import Protected from '@/components/layout/Protected';

interface Deal {
  id: string;
  creator_id: string;
  brand_id: string | null;
  brand?: {
    id: string;
    name: string;
    contact_name?: string;
    contact_email?: string;
  } | null;
  title: string;
  status: 'PROSPECT' | 'OUTREACH_SENT' | 'NEGOTIATION' | 'AGREEMENT_LOCKED' | 'INVOICED' | 'PAID' | 'DECLINED';
  proposed_amount: number | null;
  agreed_amount: number | null;
  created_at: string;
  updated_at: string;
  outreach_sent_at?: string | null;
  negotiation_started_at?: string | null;
  agreement_locked_at?: string | null;
  invoiced_at?: string | null;
  paid_at?: string | null;
  closed_at?: string | null;
  terms_snapshot?: any;
  lost_reason?: string | null;
  invoice_id?: string | null;
  dates?: {
    created_at?: string | null;
    outreach_sent_at?: string | null;
    negotiation_started_at?: string | null;
    agreement_locked_at?: string | null;
    invoiced_at?: string | null;
    paid_at?: string | null;
    closed_at?: string | null;
  };
}

const statusColors: Record<string, string> = {
  'PROSPECT': 'bg-gray-100 text-gray-800',
  'OUTREACH_SENT': 'bg-blue-100 text-blue-800',
  'NEGOTIATION': 'bg-yellow-100 text-yellow-800',
  'AGREEMENT_LOCKED': 'bg-purple-100 text-purple-800',
  'INVOICED': 'bg-orange-100 text-orange-800',
  'PAID': 'bg-green-100 text-green-800',
  'DECLINED': 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  'PROSPECT': 'Prospect',
  'OUTREACH_SENT': 'Outreach Sent',
  'NEGOTIATION': 'In Negotiation',
  'AGREEMENT_LOCKED': 'Agreement Locked',
  'INVOICED': 'Invoiced',
  'PAID': 'Paid',
  'DECLINED': 'Declined',
};

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDemoDataModal, setShowDemoDataModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [brands, setBrands] = useState<any[]>([]);

  // Form state for creating deals
  const [formData, setFormData] = useState({
    title: '',
    brand_id: '',
    brand_name: '',
    contact_name: '',
    contact_email: '',
    proposed_amount: ''
  });

  useEffect(() => {
    loadDeals();
    loadBrands();
  }, [statusFilter]);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const response = await api.getDeals({
        status: statusFilter || undefined,
        limit: 50
      });
      if (response.data) {
        setDeals(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      // Use brand matches API since it's working correctly and is user-specific
      const response = await api.getBrandMatches({ pageSize: 100 });
      if (response.data?.data) {
        // Extract unique brands from brand matches
        const uniqueBrands = response.data.data.reduce((acc: any[], match: any) => {
          // Check if we already have this brand name
          const existingBrand = acc.find(b => b.name === match.brandName);
          if (!existingBrand) {
            acc.push({
              id: match.brandId || match.brandName, // Use brandId if available, otherwise brandName as fallback
              name: match.brandName,
              source: 'brand-match' // Flag to indicate this came from brand matches
            });
          }
          return acc;
        }, []);
        setBrands(uniqueBrands);
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
      setBrands([]);
    }
  };

  // Helper to check if a string is a valid UUID (v4)
  const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error('Title is required');
      return;
    }

    try {
      let dealData: any = {
        title: formData.title,
        ...(formData.contact_name && { contact_name: formData.contact_name }),
        ...(formData.contact_email && { contact_email: formData.contact_email }),
        ...(formData.proposed_amount && { proposed_amount: parseFloat(formData.proposed_amount) })
      };

      // Decide whether to send brand_id (UUID) or brand_name (string)
      if (formData.brand_id) {
        if (isValidUUID(formData.brand_id)) {
          dealData.brand_id = formData.brand_id;
        } else {
          // Some sources populate brand.id with the brand name (non-UUID). Treat that as a brand_name.
          dealData.brand_name = formData.brand_id;
        }
      } else if (formData.brand_name) {
        dealData.brand_name = formData.brand_name;
      }

      const response = await api.createDeal(dealData);

      if (response.data) {
        toast.success('Deal created successfully!');
        if (response.data && response.data.id) {
          try {
            const full = await api.getDeal(response.data.id);
            const normalizeDeal = (d: any) => {
              const out = { ...d };
              if (d.dates) {
                out.created_at = out.created_at || d.dates.created_at || null;
                out.outreach_sent_at = out.outreach_sent_at || d.dates.outreach_sent_at || null;
                out.negotiation_started_at = out.negotiation_started_at || d.dates.negotiation_started_at || null;
                out.agreement_locked_at = out.agreement_locked_at || d.dates.agreement_locked_at || null;
                out.invoiced_at = out.invoiced_at || d.dates.invoiced_at || null;
                out.paid_at = out.paid_at || d.dates.paid_at || null;
                out.closed_at = out.closed_at || d.dates.closed_at || null;
              }
              if (out.brand && out.brand.contactInfo) {
                out.brand.contact_name = out.brand.contact_name || out.brand.contactInfo.contactPerson || out.brand.contactInfo.contactPerson || null;
                out.brand.contact_email = out.brand.contact_email || out.brand.contactInfo.email || null;
              }
              return out;
            };

            if (full.data) {
              setDeals(prev => [normalizeDeal(full.data), ...prev]);
            } else {
              loadDeals();
            }
          } catch (err) {
            loadDeals();
          }
        } else {
          // fallback: reload full list
          loadDeals();
        }
        setShowCreateModal(false);
        setFormData({
          title: '',
          brand_id: '',
          brand_name: '',
          contact_name: '',
          contact_email: '',
          proposed_amount: ''
        });
      } else if (response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error('Failed to create deal:', error);
      toast.error('Failed to create deal');
    }
  };

  // Handler when a brand is selected from the dropdown
  const selectBrand = async (value: string) => {
    // If the option is empty, clear
    if (!value) {
      setFormData({ ...formData, brand_id: '', brand_name: '' });
      return;
    }

    // If it's a UUID, treat as brand_id and fetch brand details to populate contact fields
    if (isValidUUID(value)) {
      setFormData({ ...formData, brand_id: value, brand_name: '' });
      try {
        const resp = await api.getBrand(value);
        if (resp.data) {
          const b = resp.data;
          setFormData(prev => ({
            ...prev,
            contact_name: b.contactInfo?.contactPerson || prev.contact_name || '',
            contact_email: b.contactInfo?.email || prev.contact_email || ''
          }));
        }
      } catch (err) {
        // ignore failures here
      }
    } else {
      // Not a UUID - this is likely a brand name fallback from brand matches
      setFormData({ ...formData, brand_id: value, brand_name: value });
    }
  };

  const handleQuickAction = async (deal: Deal, action: string) => {
    try {
      let response;
      
      switch (action) {
        case 'outreach':
          response = await api.transitionDealStatus(deal.id, { to: 'OUTREACH_SENT' });
          break;
        case 'simulate-reply':
          await simulateBrandReply(deal.id);
          return; // simulateBrandReply handles its own success message
        case 'negotiation':
          response = await api.markDealNegotiation(deal.id);
          break;
        case 'decline':
          response = await api.transitionDealStatus(deal.id, { to: 'DECLINED', notes: 'Quick decline' });
          break;
        case 'mark-paid':
          response = await api.transitionDealStatus(deal.id, { to: 'PAID' });
          break;
        case 'details':
          // Navigate to deal detail page
          router.push(`/deals/${deal.id}`);
          return;
        default:
          return;
      }

      if (response && response.data) {
        toast.success(`Deal ${action} completed!`);
        loadDeals();
      } else if (response && response.error) {
        toast.error(response.error);
      }
    } catch (error) {
      console.error(`Failed to ${action} deal:`, error);
      toast.error(`Failed to ${action} deal`);
    }
  };

  const createDemoData = async () => {
    try {
      // Create demo deals for each stage of the workflow
      const demoBrands = [
        { name: 'TechFlow Gaming', email: 'partnerships@techflow.com', stage: 'OUTREACH_SENT', amount: 2500 },
        { name: 'StreamBoost Energy', email: 'collabs@streamboost.com', stage: 'NEGOTIATION', amount: 1800 },
        { name: 'CreatorPro Gear', email: 'marketing@creatorpro.com', stage: 'AGREEMENT_LOCKED', amount: 3200 },
        { name: 'GamerHub Snacks', email: 'partnerships@gamerhub.com', stage: 'INVOICED', amount: 1500 },
        { name: 'StreamDeck Pro', email: 'business@streamdeck.com', stage: 'PAID', amount: 2200 }
      ];

      for (const brand of demoBrands) {
        // Create the deal
        const dealResponse = await api.createDeal({
          title: `${brand.name} Partnership`,
          brand_name: brand.name,
          contact_email: brand.email,
          proposed_amount: brand.amount
        });

        if (dealResponse.data) {
          const dealId = dealResponse.data.id;
          
          // Transition to the desired status
          if (brand.stage !== 'PROSPECT') {
            await api.transitionDealStatus(dealId, { to: brand.stage as 'OUTREACH_SENT' | 'NEGOTIATION' | 'AGREEMENT_LOCKED' | 'INVOICED' | 'PAID' });
          }

          // Add some demo activities based on stage
          if (brand.stage === 'OUTREACH_SENT' || ['NEGOTIATION', 'AGREEMENT_LOCKED', 'INVOICED', 'PAID'].includes(brand.stage)) {
            // Add outreach activity
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
          }

          if (['NEGOTIATION', 'AGREEMENT_LOCKED', 'INVOICED', 'PAID'].includes(brand.stage)) {
            // Add negotiation activity
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (['AGREEMENT_LOCKED', 'INVOICED', 'PAID'].includes(brand.stage)) {
            // Add agreement activity
            if (brand.stage === 'AGREEMENT_LOCKED' || ['INVOICED', 'PAID'].includes(brand.stage)) {
              const terms = {
                price: { amount: brand.amount, currency: 'USD', schedule: 'SINGLE' as const },
                usage_rights: 'Exclusive 6-month usage rights',
                deliverables: [
                  { platform: 'YOUTUBE', count: 2, notes: 'Main channel videos' },
                  { platform: 'TIKTOK', count: 5, notes: 'Short-form content' }
                ],
                due_dates: { 
                  content_due: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  go_live: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                },
                brand_poc: { name: 'Marketing Team', email: brand.email }
              };
              
              await api.lockDealAgreement(dealId, terms);
            }
          }
        }
      }

      toast.success('Demo data created successfully!');
      setShowDemoDataModal(false);
      loadDeals();
    } catch (error) {
      console.error('Failed to create demo data:', error);
      toast.error('Failed to create demo data');
    }
  };

  const simulateBrandReply = async (dealId: string) => {
    try {
      // Simulate a brand response for demo purposes
      const responses = [
        "Thanks for reaching out! We'd love to discuss a partnership. Can we schedule a call?",
        "Interesting proposal! We're currently reviewing partnership opportunities and would like to learn more.",
        "We're interested! Could you send us your media kit and recent performance metrics?",
        "Great timing! We have a campaign launching next month that could be perfect for collaboration."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // Add a conversation log to simulate the reply
      await api.logConversation(dealId, {
        channel: 'EMAIL',
        direction: 'INBOUND',
        summary: randomResponse,
        disposition: 'INTERESTED'
      });

      // Transition to negotiation
      await api.transitionDealStatus(dealId, { to: 'NEGOTIATION' });
      
      toast.success('Brand reply simulated! Deal moved to negotiation.');
      loadDeals();
    } catch (error) {
      console.error('Failed to simulate brand reply:', error);
      toast.error('Failed to simulate brand reply');
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

  const getNextActions = (deal: Deal) => {
    switch (deal.status) {
      case 'PROSPECT':
        return [
          { label: 'Send Outreach', action: 'outreach', color: 'blue' },
          { label: 'Decline', action: 'decline', color: 'red' }
        ];
      case 'OUTREACH_SENT':
        return [
          { label: 'Simulate Reply', action: 'simulate-reply', color: 'green' },
          { label: 'Mark Negotiation', action: 'negotiation', color: 'yellow' },
          { label: 'Decline', action: 'decline', color: 'red' }
        ];
      case 'NEGOTIATION':
        return [
          { label: 'View Details', action: 'details', color: 'purple' },
          { label: 'Decline', action: 'decline', color: 'red' }
        ];
      case 'AGREEMENT_LOCKED':
        return [
          { label: 'View Details', action: 'details', color: 'purple' }
        ];
      case 'INVOICED':
        return [
          { label: 'Mark Paid', action: 'mark-paid', color: 'green' },
          { label: 'View Details', action: 'details', color: 'purple' }
        ];
      default:
        return [{ label: 'View Details', action: 'details', color: 'gray' }];
    }
  };

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header - Responsive layout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Deals</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your brand partnership deals</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowDemoDataModal(true)}
                variant="secondary"
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full sm:w-auto"
              >
                Create Demo Data
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto"
              >
                Create New Deal
              </Button>
            </div>
          </div>

          {/* Filter - Mobile friendly */}
          <div className="mb-6">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:max-w-xs"
            >
              <option value="">All Statuses</option>
              <option value="PROSPECT">Prospects</option>
              <option value="OUTREACH_SENT">Outreach Sent</option>
              <option value="NEGOTIATION">In Negotiation</option>
              <option value="AGREEMENT_LOCKED">Agreement Locked</option>
              <option value="INVOICED">Invoiced</option>
              <option value="PAID">Paid</option>
              <option value="DECLINED">Declined</option>
            </Select>
          </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading deals...</p>
          </div>
        ) : deals.length === 0 ? (
          <Card className="text-center py-12 px-4 sm:px-6">
            <p className="text-gray-600 text-lg mb-4">No deals found</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto"
              >
                Create Your First Deal
              </Button>
              <Button 
                onClick={() => setShowDemoDataModal(true)}
                variant="secondary"
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 w-full sm:w-auto"
              >
                Try Demo Data
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {deals.map((deal) => (
              <Card key={deal.id} className="p-4 sm:p-6 shadow-lg">
                <div className="flex flex-col space-y-4">
                  {/* Header section - responsive layout */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 break-words">
                        {deal.title}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm text-gray-600">
                        {deal.brand && (
                          <span className="font-medium truncate">{deal.brand.name}</span>
                        )}
                        <Badge
                          label={statusLabels[deal.status]}
                          tone={deal.status === 'PAID' ? 'green' : deal.status === 'DECLINED' ? 'red' : deal.status === 'NEGOTIATION' ? 'yellow' : 'blue'}
                        />
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-lg sm:text-xl font-semibold text-gray-900">
                        {formatCurrency(deal.agreed_amount || deal.proposed_amount)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Created {formatDate((deal.dates && deal.dates.created_at) || deal.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Timeline - Responsive */}
                  <div className="overflow-x-auto">
                    <div className="flex items-center gap-1 sm:gap-2 text-xs whitespace-nowrap min-w-max">
                      {deal.created_at && (
                        <span className="text-green-600">Created</span>
                      )}
                      {deal.outreach_sent_at && (
                        <>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600">Outreach Sent</span>
                        </>
                      )}
                      {deal.negotiation_started_at && (
                        <>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600">Negotiation</span>
                        </>
                      )}
                      {deal.agreement_locked_at && (
                        <>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600">Locked</span>
                        </>
                      )}
                      {deal.paid_at && (
                        <>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600">Paid</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {deal.brand?.contact_name && (
                    <p className="text-sm text-gray-600">
                      Contact: {deal.brand.contact_name}
                      {deal.brand.contact_email && (
                        <span className="block sm:inline sm:ml-1">({deal.brand.contact_email})</span>
                      )}
                    </p>
                  )}

                  {/* Actions - Responsive button layout */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-100">
                    {getNextActions(deal).map((action) => (
                      <Button
                        key={action.action}
                        variant={action.color === 'red' ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => {
                          if (action.action === 'details') {
                            router.push(`/deals/${deal.id}`);
                          } else {
                            handleQuickAction(deal, action.action);
                          }
                        }}
                        className={action.color === 'red' ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Deal Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Deal</h3>
          <form onSubmit={handleCreateDeal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deal Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., TikTok x2 + 1 IG Story"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand (Select Existing)
              </label>
              <Select
                value={formData.brand_id}
                onChange={(e) => selectBrand(e.target.value)}
              >
                <option value="">Select a brand...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="text-center text-sm text-gray-500 py-2">OR</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Brand Name
              </label>
              <Input
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                placeholder="Brand name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name
                </label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@brand.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Amount ($)
              </label>
              <Input
                type="number"
                value={formData.proposed_amount}
                onChange={(e) => setFormData({ ...formData, proposed_amount: e.target.value })}
                placeholder="1000"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Deal
              </Button>
            </div>
          </form>
          </div>
        </Modal>

        {/* Demo Data Modal */}
        <Modal
          open={showDemoDataModal}
          onClose={() => setShowDemoDataModal(false)}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Demo Data</h3>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                This will create sample deals showcasing the complete workflow from outreach to payment.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Demo deals will include:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• TechFlow Gaming - Outreach Sent</li>
                  <li>• StreamBoost Energy - In Negotiation</li>
                  <li>• CreatorPro Gear - Agreement Locked</li>
                  <li>• GamerHub Snacks - Invoiced</li>
                  <li>• StreamDeck Pro - Paid</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDemoDataModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={createDemoData}>
                Create Demo Data
              </Button>
            </div>
          </div>
        </Modal>
        </div>
      </div>
    </Protected>
  );
}
