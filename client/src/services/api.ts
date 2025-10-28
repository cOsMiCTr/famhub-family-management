import axios, { type AxiosInstance } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api',
      timeout: 30000, // Increased for slow mobile connections
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        // Check for regular token first, then temp_token (for password change flow)
        const token = localStorage.getItem('token') || localStorage.getItem('temp_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors and retry logic
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        // Retry logic for network errors (up to 3 attempts)
        if (!config._retryCount && (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED')) {
          config._retryCount = 0;
        }
        
        if (config._retryCount < 3 && (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED')) {
          config._retryCount += 1;
          const delay = Math.pow(2, config._retryCount) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.api(config);
        }
        
        // Only redirect to login for 401 errors that are NOT from the login endpoint itself
        if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async validateInvitation(token: string) {
    const response = await this.api.get(`/auth/validate-invitation/${token}`);
    return response.data;
  }

  async completeRegistration(data: any) {
    const response = await this.api.post('/auth/complete-registration', data);
    return response.data;
  }

  async changePasswordFirstLogin(data: any) {
    const response = await this.api.post('/auth/change-password-first-login', data);
    return response.data;
  }

  async refreshToken() {
    const response = await this.api.post('/auth/refresh');
    return response.data;
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  // Settings endpoints
  async getUserSettings() {
    const response = await this.api.get('/settings');
    return response.data;
  }

  async updateUserSettings(data: any) {
    const response = await this.api.put('/settings', data);
    return response.data;
  }

  async changePassword(data: any) {
    const response = await this.api.post('/settings/change-password', data);
    return response.data;
  }

  async getCurrencies() {
    const response = await this.api.get('/settings/currencies');
    return response.data;
  }

  async getLanguages() {
    const response = await this.api.get('/settings/languages');
    return response.data;
  }

  // Assets endpoints
  async getAssets(params?: any) {
    const response = await this.api.get('/assets', { params });
    return response.data;
  }

  async getAssetById(id: string) {
    const response = await this.api.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(data: any) {
    const response = await this.api.post('/assets', data);
    return response.data;
  }

  async updateAsset(id: string, data: any) {
    const response = await this.api.put(`/assets/${id}`, data);
    return response.data;
  }

  async deleteAsset(id: string) {
    const response = await this.api.delete(`/assets/${id}`);
    return response.data;
  }

  async getAssetCategories() {
    const response = await this.api.get('/assets/categories');
    return response.data;
  }

  async getAssetSummary(params?: any) {
    const response = await this.api.get('/assets/summary/currency-conversion', { params });
    return response.data;
  }

  async getHouseholdAssets(householdId: string, params?: any) {
    const response = await this.api.get(`/assets/household/${householdId}`, { params });
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardSummary() {
    const response = await this.api.get('/dashboard/summary');
    return response.data;
  }

  async getDashboardStats(params?: any) {
    const response = await this.api.get('/dashboard/stats', { params });
    return response.data;
  }

  async getHouseholdDashboard(householdId: string) {
    const response = await this.api.get(`/dashboard/household/${householdId}/summary`);
    return response.data;
  }

  // Exchange rates endpoints
  async getExchangeRates() {
    const response = await this.api.get('/exchange-rates');
    return response.data;
  }

  async convertCurrency(from: string, to: string, amount: number) {
    const response = await this.api.get('/exchange-rates/convert', {
      params: { from, to, amount }
    });
    return response.data;
  }

  async getExchangeRate(from: string, to: string) {
    const response = await this.api.get(`/exchange-rates/rate/${from}/${to}`);
    return response.data;
  }

  // Admin endpoints
  async inviteUser(data: any) {
    const response = await this.api.post('/admin/invite-user', data);
    return response.data;
  }

  async getInvitations() {
    const response = await this.api.get('/admin/invitations');
    return response.data;
  }

  async revokeInvitation(id: string) {
    const response = await this.api.delete(`/admin/invitations/${id}`);
    return response.data;
  }

  async getUsers() {
    const response = await this.api.get('/admin/users');
    return response.data;
  }

  async updateUser(id: string, data: any) {
    const response = await this.api.put(`/admin/users/${id}`, data);
    return response.data;
  }

  async deactivateUser(id: string) {
    const response = await this.api.delete(`/admin/users/${id}`);
    return response.data;
  }

  async hardDeleteUser(id: string) {
    const response = await this.api.delete(`/admin/users/${id}/hard-delete`);
    return response.data;
  }

  async createUser(data: any) {
    const response = await this.api.post('/admin/users', data);
    return response.data;
  }

  async resetUserPassword(userId: string) {
    const response = await this.api.post(`/admin/users/${userId}/reset-password`);
    return response.data;
  }

  async forcePasswordChange(userId: string) {
    const response = await this.api.post(`/admin/users/${userId}/force-password-change`);
    return response.data;
  }

  async unlockUser(userId: string) {
    const response = await this.api.post(`/admin/users/${userId}/unlock`);
    return response.data;
  }

  async toggleUserStatus(userId: string, status: string) {
    const response = await this.api.put(`/admin/users/${userId}/toggle-status`, { status });
    return response.data;
  }

  async getAdminNotifications(page: number = 1, limit: number = 20, readFilter?: boolean) {
    const params: any = { page, limit };
    if (readFilter !== undefined) {
      params.read = readFilter;
    }
    const response = await this.api.get('/admin/notifications', { params });
    return response.data;
  }

  async markNotificationRead(id: string) {
    const response = await this.api.put(`/admin/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsRead(notificationIds: number[]) {
    const response = await this.api.put('/admin/notifications/mark-all-read', { notificationIds });
    return response.data;
  }

  async deleteNotification(id: string) {
    const response = await this.api.delete(`/admin/notifications/${id}`);
    return response.data;
  }

  async getSecurityDashboard() {
    const response = await this.api.get('/admin/security-dashboard');
    return response.data;
  }

  async getAdminDashboardStats(page: number = 1, date: string = '', filter: string = 'all') {
    const response = await this.api.get('/admin/dashboard-stats', { 
      params: { page, date, filter } 
    });
    return response.data;
  }

  async getUserLoginHistory(limit: number = 50) {
    const response = await this.api.get('/user/login-history', { params: { limit } });
    return response.data;
  }

  async getUserAccountActivity() {
    const response = await this.api.get('/user/account-activity');
    return response.data;
  }

  async createHousehold(data: any) {
    const response = await this.api.post('/admin/households', data);
    return response.data;
  }

  async getHouseholds() {
    const response = await this.api.get('/admin/households');
    return response.data;
  }

  async updateHousehold(id: string, data: any) {
    const response = await this.api.put(`/admin/households/${id}`, data);
    return response.data;
  }

  async deleteHousehold(id: string) {
    const response = await this.api.delete(`/admin/households/${id}`);
    return response.data;
  }

  async getHouseholdMembers(householdId: string) {
    const response = await this.api.get(`/admin/households/${householdId}/members`);
    return response.data;
  }

  // Contracts endpoints (placeholder)
  async getContracts() {
    const response = await this.api.get('/contracts');
    return response.data;
  }

  async getContractCategories() {
    const response = await this.api.get('/contracts/categories');
    return response.data;
  }

  // Translation management endpoints
  async getTranslations(category?: string, search?: string) {
    const params: any = {};
    if (category) params.category = category;
    if (search) params.search = search;
    
    const response = await this.api.get('/translations', { params });
    return response.data;
  }

  async getTranslationCategories() {
    const response = await this.api.get('/translations/categories');
    return response.data;
  }

  async updateTranslation(id: string, data: any) {
    const response = await this.api.put(`/translations/${id}`, data);
    return response.data;
  }

  async bulkUpdateTranslations(translations: any[]) {
    const response = await this.api.put('/translations/bulk', { translations });
    return response.data;
  }

  async syncTranslations() {
    const response = await this.api.post('/translations/sync');
    return response.data;
  }

  // Generic methods
  async get(url: string, config?: any) {
    const response = await this.api.get(url, config);
    return response;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.api.post(url, data, config);
    return response;
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.api.put(url, data, config);
    return response;
  }

  async delete(url: string, config?: any) {
    const response = await this.api.delete(url, config);
    return response;
  }

  // Health check
  async healthCheck() {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Sync exchange rates
  async syncExchangeRates() {
    const response = await this.api.post('/exchange/sync');
    return response.data;
  }

  // Delete user account
  async deleteAccount() {
    const response = await this.api.delete('/users/delete-account');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
