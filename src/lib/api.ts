const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'vip';
  subscriptionStatus?: string;
  prioritySupport?: boolean;
  company?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

interface SubscriptionData {
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  plan: 'pro' | 'vip';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface BriefingData {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface SystemEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

class ApiClient {
  private baseURL: string;
  private user: User | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    if (typeof window !== 'undefined') {
      this.loadUserFromStorage();
    }
  }

  private loadUserFromStorage() {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }

  public getUser(): User | null {
    return this.user;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private setAuthToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', token);
  }

  private removeAuthToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.user = null;
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', token);
  }

  private async refreshAuthToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setAuthToken(data.accessToken);
        if (data.refreshToken) {
          this.setRefreshToken(data.refreshToken);
        }
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.removeAuthToken();
    return false;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${!endpoint.startsWith('/api/') ? '/api' : ''}${endpoint}`;
    const token = this.getAuthToken();

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      let response = await fetch(url, config);


      if (response.status === 401 && token) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          const newToken = this.getAuthToken();
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${newToken}`,
          };
          response = await fetch(url, config);
        } else {
          this.removeAuthToken();
          return { error: 'Authentication failed' };
        }
      }

      if (response.status === 204) {
        return { data: null as T };
      }

      const data = await response.json();

      if (!response.ok) {
        console.error(`[API] Request failed:`, { status: response.status, data });
        return { error: data.message || data.error || 'An error occurred' };
      }

      return { data };
    } catch (error) {
      console.error(`[API] Network error:`, error);
      console.error(`[API] Failed URL:`, url);
      console.error(`[API] Failed config:`, config);
      return { error: `Network error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data) {
      this.setAuthToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
      this.user = response.data.user;
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async signup(email: string, password: string, name: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (response.data) {
      this.setAuthToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
      this.user = response.data.user;
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  loginWithGoogle(authData: AuthResponse): ApiResponse<AuthResponse> {
    try {
      this.setAuthToken(authData.accessToken);
      this.setRefreshToken(authData.refreshToken);
      this.user = authData.user;
      localStorage.setItem('user', JSON.stringify(authData.user));
      return { data: authData };
    } catch (error) {
      return { error: 'Failed to process Google authentication' };
    }
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      await this.request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
    this.removeAuthToken();
  }

  clearAuth() {
    this.removeAuthToken();
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request('/api/');
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/api/user');
  }

  async updateProfile(data: any) {
    return this.request('/api/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Brand methods
  async getBrandMatches(options: { status?: string; search?: string; page?: number; pageSize?: number } = {}): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.search) params.append('q', options.search);
    if (options.page) params.append('page', options.page.toString());
    if (options.pageSize) params.append('pageSize', options.pageSize.toString());
    const queryString = params.toString();
    const url = queryString ? `/api/brand-matches?${queryString}` : `/api/brand-matches`;
    return this.request(url);
  }

  async updateBrandMatchStatus(matchId: string, status: string): Promise<ApiResponse> {
    return this.request(`/api/brand-matches/${matchId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async sendOutreach(matchId: string, data: { subject: string; message: string; to?: string; useGmail?: boolean }): Promise<ApiResponse> {
    return this.request(`/api/brand-matches/${matchId}/outreach`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Gmail integration methods
  async connectGmail(): Promise<ApiResponse<{ authUrl: string }>> {
    return this.request('/api/gmail/auth/url');
  }

  async getGmailAccount(): Promise<ApiResponse<{ connected: boolean; email?: string; connectedAt?: string }>> {
    return this.request('/api/gmail/account');
  }

  async disconnectGmail(): Promise<ApiResponse> {
    return this.request('/api/gmail/disconnect', {
      method: 'DELETE'
    });
  }

  async sendGmailOutreach(data: { 
    to: string; 
    subject: string; 
    message: string; 
    matchId?: string;
  }): Promise<ApiResponse> {
    return this.request('/api/gmail/send-outreach', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateAIOutreach(brandName: string, brandData?: any): Promise<ApiResponse<{ subject: string; message: string; }>> {
    return this.request('/api/ai/generate-outreach', {
      method: 'POST',
      body: JSON.stringify({ brandName, brandData }),
    });
  }

  // Niche methods
  async addNiche(nicheName: string): Promise<ApiResponse> {
    return this.request('/api/me/niches', {
      method: 'POST',
      body: JSON.stringify({ name: nicheName }),
    });
  }

  async getUserNiches(): Promise<ApiResponse<{ id: string; name: string; createdAt: string; updatedAt: string; }[]>> {
    return this.request('/api/me/niches');
  }

  async updateUserNiche(oldNicheId: string, newNicheName: string): Promise<ApiResponse> {
    return this.request(`/api/me/niches/${oldNicheId}`, {
      method: 'PUT',
      body: JSON.stringify({ newNicheName }),
    });
  }

  async removeUserNiche(nicheId: string): Promise<ApiResponse> {
    return this.request(`/api/me/niches/${nicheId}`, {
      method: 'DELETE',
    });
  }

  async getUserPlanUsage(): Promise<ApiResponse<{
    plan: string;
    monthlyLimit: number | null;
    monthlyUsage: number;
    remaining: number | null;
    subscriptionStatus: string;
    periodStart: string;
    periodEnd: string;
  }>> {
    return this.request('/api/me/plan-usage');
  }

  // Global niche management (admin operations)
  async getAllNiches(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<{
    niches: { id: string; name: string; createdAt: string; updatedAt: string; }[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return this.request(`/api/niches${query ? `?${query}` : ''}`);
  }

  async createNiche(name: string): Promise<ApiResponse> {
    return this.request('/api/niches', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateNiche(nicheId: string, name: string): Promise<ApiResponse> {
    return this.request(`/api/niches/${nicheId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteNiche(nicheId: string, force: boolean = false): Promise<ApiResponse> {
    const endpoint = force ? `/api/niches/${nicheId}/force` : `/api/niches/${nicheId}`;
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  async getNiche(nicheId: string): Promise<ApiResponse> {
    return this.request(`/api/niches/${nicheId}`);
  }

  async suggestBrandsFromNiches(): Promise<ApiResponse> {
    return this.request('/api/suggest-brands-from-my-niches', {
      method: 'POST',
    });
  }

  async generateMonthlyBrandMatches(existingBrands?: string[]): Promise<ApiResponse> {
    return this.request('/api/generate-monthly-brand-matches', {
      method: 'POST',
      body: JSON.stringify({ existingBrands }),
    });
  }

  // Brand management methods
  async getBrands(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    industry?: string; 
    category?: string; 
    companySize?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{
    brands: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.industry) queryParams.append('industry', params.industry);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.companySize) queryParams.append('companySize', params.companySize);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    
    const query = queryParams.toString();
    return this.request(`/api/brands${query ? `?${query}` : ''}`);
  }

  async getBrand(brandId: string): Promise<ApiResponse> {
    return this.request(`/api/brands/${brandId}`);
  }

  async createBrand(brandData: any): Promise<ApiResponse> {
    return this.request('/api/brands', {
      method: 'POST',
      body: JSON.stringify(brandData),
    });
  }

  async updateBrand(brandId: string, brandData: any): Promise<ApiResponse> {
    return this.request(`/api/brands/${brandId}`, {
      method: 'PUT',
      body: JSON.stringify(brandData),
    });
  }

  async deleteBrand(brandId: string, force: boolean = false): Promise<ApiResponse> {
    const query = force ? '?force=true' : '';
    return this.request(`/api/brands/${brandId}${query}`, {
      method: 'DELETE',
    });
  }

  async findOrCreateBrand(brandData: any): Promise<ApiResponse> {
    return this.request('/api/brands/find-or-create', {
      method: 'POST',
      body: JSON.stringify(brandData),
    });
  }

  async getBrandStats(): Promise<ApiResponse> {
    return this.request('/api/brands/stats/overview');
  }

  // Billing methods
  async subscribe(plan: 'pro' | 'vip'): Promise<ApiResponse<{ url: string }>> {
    const successUrl = `${window.location.origin}/payment/success?plan=${plan}`;
    const cancelUrl = `${window.location.origin}/payment/cancel`;

    return this.request('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ plan, successUrl, cancelUrl }),
    });
  }

  // Briefing methods
  async getBriefing(): Promise<ApiResponse<BriefingData>> {
    return this.request('/api/briefing/latest');
  }

  async runBriefing(): Promise<ApiResponse<BriefingData>> {
    return this.request('/api/briefing/generate', {
      method: 'POST'
    });
  }

  // System Events methods
  async getSystemEvents(): Promise<ApiResponse<SystemEvent[]>> {
    return this.request('/api/system-events');
  }

  // Billing methods
  async clearPendingSubscription(): Promise<ApiResponse> {
    return this.request('/api/billing/clear-pending', {
      method: 'POST'
    });
  }

  async createCheckoutSession(priceId: string): Promise<ApiResponse<{ url: string }>> {
    const plan = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ? 'pro' : 'vip';
    return this.request('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        plan,
        successUrl: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      })
    });
  }

  async verifyPayment(sessionId: string): Promise<ApiResponse> {
    return this.request('/api/billing/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    });
  }

  async getSubscription(): Promise<ApiResponse<SubscriptionData>> {
    return this.request('/api/billing/subscription');
  }

  async syncSubscription(): Promise<ApiResponse> {
    return this.request('/api/billing/sync', {
      method: 'POST'
    });
  }

  async createBillingPortalSession(): Promise<ApiResponse<{ url: string }>> {
    return this.request('/api/billing/portal', {
      method: 'POST',
      body: JSON.stringify({
        returnUrl: `${window.location.origin}/settings`
      })
    });
  }

  async trackRewardfulConversion(data: {
    email: string;
    plan: string;
    amount: number;
    referralId?: string;
    affiliateId?: string;
  }): Promise<ApiResponse> {
    return this.request('/api/rewardful/conversion', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async cancelSubscription(): Promise<ApiResponse> {
    return this.request('/api/billing/cancel', {
      method: 'POST'
    });
  }

  async cancelSubscriptionImmediately(): Promise<ApiResponse<{ deletedMatches: number }>> {
    return this.request('/api/billing/cancel-now', {
      method: 'POST'
    });
  }

  // YouTube integration
  async connectYouTube(): Promise<ApiResponse<{ authUrl: string }>> {
    return this.request('/api/youtube/auth/url');
  }

  async connectTwitch(): Promise<ApiResponse<{ authUrl: string }>> {
    return this.request('/api/twitch/auth/url');
  }

  async getYouTubeAccount(): Promise<ApiResponse<{ connected: boolean; channelName?: string; channelId?: string; connectedAt?: string }>> {
    return this.request('/api/youtube/account');
  }

  async getTwitchAccount(): Promise<ApiResponse<{ connected: boolean; channelName?: string; channelId?: string; connectedAt?: string }>> {
    return this.request('/api/twitch/account');
  }

  async disconnectYouTube(): Promise<ApiResponse> {
    return this.request('/api/youtube/disconnect', {
      method: 'DELETE'
    });
  }

  async disconnectTwitch(): Promise<ApiResponse> {
    return this.request('/api/twitch/disconnect', {
      method: 'DELETE'
    });
  }

  // YouTube Analytics methods
  async getYouTubeStats(): Promise<ApiResponse<{ stats: any; videos: any[] }>> {
    return this.request('/api/youtube/stats');
  }

  async getYouTubeAnalyticsComparison(): Promise<ApiResponse<any>> {
    return this.request('/api/youtube/analytics-comparison');
  }

  async getYouTubeHistoricalStats(days: number = 30): Promise<ApiResponse<{ historicalStats: any[] }>> {
    return this.request(`/api/youtube/historical-stats?days=${days}`);
  }

  async getYouTubeLineChart(period: string = 'month', metric: string = 'all'): Promise<ApiResponse<any>> {
    return this.request(`/api/youtube/line-chart?period=${period}&metric=${metric}`);
  }

  async generateAnalyticsInsights(analyticsData: any): Promise<ApiResponse<{ insights: string[] }>> {
    return this.request('/api/ai/analytics-insights', {
      method: 'POST',
      body: JSON.stringify({ analyticsData })
    });
  }

  // Deal management methods
  async createDeal(dealData: {
    brand_id?: string;
    brand_name?: string;
    contact_name?: string;
    contact_email?: string;
    title: string;
    proposed_amount?: number;
  }): Promise<ApiResponse<any>> {
    return this.request('/api/deals', {
      method: 'POST',
      body: JSON.stringify(dealData),
    });
  }

  async getDeals(params?: {
    status?: string;
    limit?: number;
    cursor?: string;
    page?: number;
  }): Promise<ApiResponse<{
    items: any[];
    next_cursor?: string;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.page) queryParams.append('page', params.page.toString());

    const query = queryParams.toString();
    return this.request(`/api/deals${query ? `?${query}` : ''}`);
  }

  async getDeal(dealId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}`);
  }

  async logConversation(dealId: string, conversationData: {
    channel: 'EMAIL' | 'IG_DM' | 'X_DM' | 'DISCORD' | 'OTHER';
    direction: 'OUTBOUND' | 'INBOUND';
    timestamp?: string;
    summary: string;
    disposition: 'NO_REPLY' | 'INTERESTED' | 'DECLINED' | 'NEEDS_INFO' | 'COUNTER';
    amount?: number;
    terms_delta?: string;
    attachments?: any[];
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}/conversations`, {
      method: 'POST',
      body: JSON.stringify(conversationData),
    });
  }

  async getDealConversations(dealId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}/conversations`);
  }

  async transitionDealStatus(dealId: string, data: {
    to: 'PROSPECT' | 'OUTREACH_SENT' | 'NEGOTIATION' | 'AGREEMENT_LOCKED' | 'INVOICED' | 'PAID' | 'DECLINED';
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}/transition`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markDealNegotiation(dealId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}/mark-negotiation`, {
      method: 'POST',
    });
  }

  async lockDealAgreement(dealId: string, terms: {
    price: { amount: number; currency: string; schedule: 'SINGLE' | 'MILESTONES' };
    usage_rights: string;
    deliverables: Array<{
      platform: string;
      count: number;
      notes: string;
    }>;
    due_dates: { content_due: string; go_live: string };
    brand_poc: { name: string; email: string };
    evidence?: Array<{ type: string; value: string }>;
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}/lock-agreement`, {
      method: 'POST',
      body: JSON.stringify({ terms }),
    });
  }

  async reopenDealNegotiation(dealId: string, reason: string): Promise<ApiResponse<any>> {
    return this.request(`/api/deals/${dealId}/reopen-negotiation`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getDealActivity(dealId: string): Promise<ApiResponse<{
    items: Array<{
      id: string;
      type: string;
      message: string;
      created_at: string;
      actor: string;
      metadata?: any;
    }>;
  }>> {
    return this.request(`/api/deals/${dealId}/activity`);
  }

  async markInvoiceSent(invoiceId: string, data: {
    method: string;
    to: string;
  }): Promise<ApiResponse<{ status: string; sent_at: string }>> {
    return this.request(`/api/invoices/${invoiceId}/mark-sent`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markInvoicePaid(invoiceId: string, data: {
    paid_at?: string;
    method?: string;
    reference?: string;
  }): Promise<ApiResponse<{ status: string; paid_at: string }>> {
    return this.request(`/api/invoices/${invoiceId}/mark-paid`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Invoice management methods
  async createInvoice(invoiceData: {
    dealId?: string | null;
    brandName?: string;
    amount: number;
    currency?: string;
    description?: string;
    useStripeInvoice?: boolean;
    paymentTerms?: string;
    dueDate?: string | null;
    footer?: string;
    projectReference?: string;
    // New BYOP fields
    paymentMethodType?: 'STRIPE_ADMIN' | 'CUSTOM_LINK';
    customPaymentLink?: string | null;
    customPaymentInstructions?: string | null;
  }): Promise<ApiResponse<{
    id: string;
    status: string;
    paymentUrl?: string;
    checkoutUrl?: string;
    stripeInvoiceId?: string;
    sessionId?: string;
    paymentMethodType?: string;
    customPaymentInstructions?: string;
    message?: string;
  }>> {
    return this.request('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });
  }

  async getInvoices(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{
    invoices: any[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request(`/api/invoices${query ? `?${query}` : ''}`);
  }

  async getInvoice(id: string): Promise<ApiResponse<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    deal?: any;
    checkoutUrl?: string;
    paymentUrl?: string;
  }>> {
    return this.request(`/api/invoices/${id}`);
  }

  async getInvoiceStats(): Promise<ApiResponse<{
    totalInvoices: number;
    paidInvoices: number;
    unpaidInvoices: number;
    voidInvoices: number;
    totalRevenue: number;
  }>> {
    return this.request('/api/invoices/stats/summary');
  }

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<{
    dealsInProgress: number;
    earningsThisMonth: number;
    brandMatchesCount: number;
    totalEarnings: number;
  }>> {
    return this.request('/api/dashboard/stats');
  }

  async getRecentActivities(): Promise<ApiResponse<Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    metadata?: any;
  }>>> {
    return this.request('/api/dashboard/activities');
  }

  // Creator Onboarding methods
  async getCreatorProfile(): Promise<ApiResponse<any>> {
    return this.request('/api/creator-profile');
  }

  async saveCreatorProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request('/api/creator-profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async completeOnboarding(): Promise<ApiResponse<any>> {
    return this.request('/api/complete-onboarding', {
      method: 'POST',
    });
  }

  async getOnboardingStatus(): Promise<ApiResponse<{
    hasProfile: boolean;
    isCompleted: boolean;
    profile: any;
  }>> {
    return this.request('/api/onboarding-status');
  }

  // AI Services
  async generateReply(data: {
    dealId: string;
    brandMessage: string;
    context?: string;
  }): Promise<ApiResponse<{
    reply: string;
    context: any;
  }>> {
    return this.request('/api/ai/generate-reply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('accessToken');
  const user = api.getUser();
  
  return !!(token && user);
}
