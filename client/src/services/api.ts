import axios, { type AxiosInstance } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.PROD 
        ? '/api' 
        : 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
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

  // Health check
  async healthCheck() {
    const response = await this.api.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
