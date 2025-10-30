'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/src/lib/api';
import { trackTikTokEvent } from '@/src/lib/tiktok-pixel';
import Protected from '@/components/layout/Protected';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import { toast } from 'react-hot-toast';

// Simple icon components
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface Invoice {
  id: string;
  brandName?: string;
  amount: number;
  currency: string;
  status: 'unpaid' | 'paid' | 'void' | 'refunded';
  paidAt?: string;
  createdAt: string;
  deal?: {
    id: string;
    brandName: string;
    status: string;
  };
  checkoutUrl?: string;
  paymentUrl?: string;
  // New BYOP fields
  paymentMethodType?: 'STRIPE_ADMIN' | 'CUSTOM_LINK';
  customPaymentLink?: string;
  customPaymentInstructions?: string;
}

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  unpaidInvoices: number;
  voidInvoices: number;
  totalRevenue: number;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
  { value: 'refunded', label: 'Refunded' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'unpaid': return 'yellow';
    case 'paid': return 'green';
    case 'void': return 'gray';
    case 'refunded': return 'red';
    default: return 'gray';
  }
};

function InvoicesContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    page: 1,
    limit: 10,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [newInvoice, setNewInvoice] = useState({
    brandName: '',
    amount: '',
    currency: 'usd',
    description: '',
    useStripeInvoice: true,
    paymentTerms: 'due_on_receipt',
    dueDate: '',
    footer: '',
    projectReference: ''
  });

  useEffect(() => {
    loadInvoices();
    loadStats();
    
    // Check for URL parameters to pre-populate invoice form
    const brandName = searchParams.get('brandName');
    const amount = searchParams.get('amount');
    const dealId = searchParams.get('dealId');
    
    if (brandName || amount || dealId) {
      setNewInvoice(prev => ({
        ...prev,
        ...(brandName && { brandName }),
        ...(amount && { amount }),
        ...(dealId && { projectReference: `Deal #${dealId}` })
      }));
      
      // Auto-open the create modal if parameters are present
      setShowCreateModal(true);
    }
  }, [filters.status, filters.page, searchParams]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const params = {
        ...(filters.status !== 'all' && { status: filters.status }),
        page: filters.page,
        limit: filters.limit,
      };
      const response = await api.getInvoices(params);
      if (response.data) {
        setInvoices(response.data.invoices);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.getInvoiceStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load invoice stats');
    }
  };

  const createInvoice = async () => {
    if (!newInvoice.amount || parseFloat(newInvoice.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!newInvoice.brandName || newInvoice.brandName.trim() === '') {
      toast.error('Please enter a brand name');
      return;
    }

    try {
      setIsCreating(true);
      const response = await api.createInvoice({
        brandName: newInvoice.brandName,
        amount: parseFloat(newInvoice.amount),
        currency: newInvoice.currency,
        description: newInvoice.description || undefined,
        useStripeInvoice: newInvoice.useStripeInvoice,
        paymentTerms: newInvoice.paymentTerms,
        dueDate: newInvoice.dueDate || undefined,
        footer: newInvoice.footer || undefined,
        projectReference: newInvoice.projectReference || undefined
      });

      if (response.data) {
        // Track successful invoice creation
        trackTikTokEvent("invoice_created");
        
        toast.success('Invoice created successfully!');
        
        const paymentUrl = response.data.paymentUrl || response.data.checkoutUrl;
        if (paymentUrl) {
          // Copy to clipboard
          navigator.clipboard.writeText(paymentUrl);
          toast.success('Payment URL copied to clipboard!');
        }
        
        setShowCreateModal(false);
        setNewInvoice({
          brandName: '',
          amount: '',
          currency: 'usd',
          description: '',
          useStripeInvoice: true,
          paymentTerms: 'due_on_receipt',
          dueDate: '',
          footer: '',
          projectReference: ''
        });
        loadInvoices();
        loadStats();
      } else {
        toast.error(response.error || 'Failed to create invoice');
      }
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setIsCreating(false);
    }
  };

  const copyPaymentLink = (invoice: Invoice) => {
    const paymentUrl = invoice.paymentUrl || invoice.checkoutUrl;
    if (paymentUrl) {
      navigator.clipboard.writeText(paymentUrl);
      toast.success('Payment link copied to clipboard!');
    } else {
      toast.error('No payment link available');
    }
  };

  const shareInvoice = (invoice: Invoice) => {
    const paymentUrl = invoice.paymentUrl || invoice.checkoutUrl;
    if (paymentUrl && navigator.share) {
      navigator.share({
        title: `Invoice - $${invoice.amount}`,
        text: `Please pay this invoice for $${invoice.amount}`,
        url: paymentUrl,
      });
    } else {
      copyPaymentLink(invoice);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return '—'; // Return a dash for null/undefined dates
    }
    
    try {
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      const now = new Date();
      
      // For dates within the current year, show compact format
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
      
      // For older dates, include year but keep it compact
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit', // Use 2-digit year to save space
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  const nextPage = () => {
    if (filters.page < totalPages) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const prevPage = () => {
    if (filters.page > 1) {
      setFilters(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0 mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
                <DocumentIcon />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Invoice Management
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">
                  Create, manage, and track your brand deal invoices
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg flex items-center justify-center space-x-2 w-full sm:w-auto"
            >
              <PlusIcon />
              <span>Create Invoice</span>
            </Button>
          </div>

          {/* Stats Dashboard */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-900">
                      {stats.totalInvoices}
                    </div>
                    <div className="text-blue-700 font-medium">Total Invoices</div>
                  </div>
                  <DocumentIcon />
                </div>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      {stats.paidInvoices}
                    </div>
                    <div className="text-green-700 font-medium">Paid</div>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {stats.unpaidInvoices}
                    </div>
                    <div className="text-yellow-700 font-medium">Pending</div>
                  </div>
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stats.voidInvoices}
                    </div>
                    <div className="text-gray-700 font-medium">Void</div>
                  </div>
                  <ExclamationCircleIcon className="w-5 h-5 text-gray-600" />
                </div>
              </Card>
              
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(stats.totalRevenue)}
                    </div>
                    <div className="text-purple-700 font-medium">Total Revenue</div>
                  </div>
                  <CurrencyIcon />
                </div>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="p-6 mb-6 bg-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filter Invoices</h3>
              <div className="text-sm text-gray-500">
                {invoices.length > 0 && `Showing ${invoices.length} invoices`}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

        {/* Invoices List */}
        <Card className="p-0 overflow-hidden shadow-lg bg-white">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Brand/Deal
                  </th>
                  <th className="text-left py-4 px-3 sm:px-6 font-semibold text-gray-900 text-sm uppercase tracking-wider w-24 sm:w-32">
                    Date
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 text-sm uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-6 w-16" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-8 w-16" /></td>
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center space-y-4">
                        <DocumentIcon />
                        <div className="text-gray-500 dark:text-gray-400">
                          <div className="font-medium mb-1">No invoices found</div>
                          <div className="text-sm">Create your first invoice to get started!</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <CurrencyIcon />
                          <div className="font-semibold text-lg text-gray-900">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge label={invoice.status.toUpperCase()} tone={getStatusColor(invoice.status) as any}>
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-900">
                            {invoice.brandName || invoice.deal?.brandName || 'No Brand Name'}
                          </div>
                          {invoice.deal && (
                            <div className="text-xs text-gray-500 mt-1">
                              Deal Status: <span className="capitalize">{invoice.deal.status}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3 sm:px-6 w-24 sm:w-32">
                        <div>
                          <div className="text-gray-900 font-medium text-sm">
                            {formatDate(invoice.createdAt)}
                          </div>
                          {invoice.paidAt && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              ✅ {formatDate(invoice.paidAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailModal(true);
                            }}
                            className="flex items-center space-x-1"
                          >
                            <EyeIcon />
                            <span>View</span>
                          </Button>
                          {(invoice.checkoutUrl || invoice.paymentUrl) && invoice.status === 'unpaid' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => copyPaymentLink(invoice)}
                                className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                              >
                                <LinkIcon />
                                <span>Copy</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => shareInvoice(invoice)}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
                              >
                                <ShareIcon />
                                <span>Share</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <Button
                  variant="secondary"
                  onClick={prevPage}
                  disabled={filters.page === 1}
                  className="flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </Button>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600 font-medium">
                    Page {filters.page} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={nextPage}
                  disabled={filters.page === totalPages}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Create Invoice Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PlusIcon />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Create New Invoice
              </h3>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name *
                </label>
                <Input
                  type="text"
                  value={newInvoice.brandName}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, brandName: e.target.value }))}
                  placeholder="Brand or Client Name"
                  required
                  className="text-base sm:text-lg font-semibold"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    className="text-base sm:text-lg font-semibold"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={newInvoice.currency}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="gbp">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Payment Terms and Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <select
                    value={newInvoice.paymentTerms}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
                  >
                    <option value="due_on_receipt">Due on Receipt</option>
                    <option value="net_7">Net 7 Days</option>
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days</option>
                    <option value="net_60">Net 60 Days</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Due Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="text-base"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Project Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Reference (Optional)
                </label>
                <Input
                  type="text"
                  value={newInvoice.projectReference}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, projectReference: e.target.value }))}
                  placeholder="e.g., Campaign #123, Q4 Content Deal"
                  className="text-base"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newInvoice.description}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the services or products being invoiced..."
                  rows={3}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base resize-none"
                />
              </div>

              {/* Custom Footer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Footer (Optional)
                </label>
                <Input
                  type="text"
                  value={newInvoice.footer}
                  onChange={(e) => setNewInvoice(prev => ({ ...prev, footer: e.target.value }))}
                  placeholder="e.g., Thank you for your business!"
                  className="text-base"
                />
              </div>
              
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="useStripeInvoice"
                    checked={newInvoice.useStripeInvoice}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, useStripeInvoice: e.target.checked }))}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <div>
                    <label htmlFor="useStripeInvoice" className="font-medium text-blue-900 text-sm sm:text-base">
                      Use Professional Stripe Invoice (Recommended)
                    </label>
                    <p className="text-xs sm:text-sm text-blue-700 mt-1">
                      Creates a professional invoice with PDF download, payment tracking, and better customer experience.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  className="w-full sm:w-auto px-4 sm:px-6 order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createInvoice}
                  disabled={isCreating}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 sm:px-8 py-2 font-medium order-1 sm:order-2"
                >
                  {isCreating ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm sm:text-base">Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <PlusIcon />
                      <span className="text-sm sm:text-base">Create Invoice</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Invoice Detail Modal */}
        <Modal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        >
          {selectedInvoice && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invoice Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <div>
                      <Badge label={selectedInvoice.status.toUpperCase()} tone={getStatusColor(selectedInvoice.status) as any}>
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Created
                    </label>
                    <div className="text-gray-600">
                      {formatDate(selectedInvoice.createdAt)}
                    </div>
                  </div>
                  {selectedInvoice.paidAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Paid
                      </label>
                      <div className="text-green-600">
                        {formatDate(selectedInvoice.paidAt)}
                      </div>
                    </div>
                  )}
                </div>

                {selectedInvoice.deal && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Associated Deal
                    </label>
                    <div className="text-gray-900">
                      {selectedInvoice.deal.brandName} ({selectedInvoice.deal.status})
                    </div>
                  </div>
                )}

                {(selectedInvoice.checkoutUrl || selectedInvoice.paymentUrl) && selectedInvoice.status === 'unpaid' && (
                  <div className="border-t pt-4 mt-4">
                    {selectedInvoice.paymentMethodType === 'CUSTOM_LINK' ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <label className="text-sm font-medium text-gray-700">
                            Custom Payment Link (Your Account)
                          </label>
                        </div>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-green-800">
                                ✨ Direct Payment to Your Account
                              </h4>
                              <p className="text-sm text-green-700 mt-1">
                                Payments go directly to your payment provider. No platform fees on transactions.
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-xs text-green-600 font-medium">Payment Link:</p>
                            <p className="text-sm text-green-800 break-all">{selectedInvoice.paymentUrl}</p>
                          </div>
                          
                          {selectedInvoice.customPaymentInstructions && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <p className="text-xs text-green-600 font-medium">Instructions for Brand:</p>
                              <p className="text-sm text-green-800">{selectedInvoice.customPaymentInstructions}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyPaymentLink(selectedInvoice)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Copy Payment Link
                          </Button>
                          <Button
                            onClick={() => shareInvoice(selectedInvoice)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Share Invoice
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <label className="text-sm font-medium text-gray-700">
                            Platform Payment Link
                          </label>
                        </div>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-amber-800">
                                Platform Payment (Admin Account)
                              </h4>
                              <p className="text-sm text-amber-700 mt-1">
                                Payments processed through platform Stripe account. You'll need to coordinate with platform admin for payment transfer.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => copyPaymentLink(selectedInvoice)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Copy Payment Link
                          </Button>
                          <Button
                            onClick={() => shareInvoice(selectedInvoice)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Share Invoice
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
        </div>
      </div>
    </Protected>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton /></div>}>
      <InvoicesContent />
    </Suspense>
  );
}
