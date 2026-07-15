import axios from 'axios';

// In dev, use relative /api so Vite proxy forwards to localhost (no .env needed). In production use full URL.
const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'https://www.chatoraadda.in/api');

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401/403/429 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // Rate limit exceeded
      const retryAfter = error.response.data?.retryAfter || 60;
      const minutes = Math.ceil(retryAfter / 60);
      
      // Show user-friendly message
      const message = `Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} and try again.`;
      
      // You can integrate with Ant Design message component if available
      if (window.antMessage) {
        window.antMessage.warning(message, 5);
      } else {
        alert(message);
      }
      
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth
export const login = async (email, otp) => {
  const response = await api.post('/auth/verify-email-otp', { email, otp });
  if (response.data.token) {
    localStorage.setItem('admin_token', response.data.token);
    if (response.data.user) localStorage.setItem('admin_data', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const sendOtp = async (email) => {
  return await api.post('/auth/send-email-otp', { email });
};

// Admin: Email + Password login
export const adminLoginWithPassword = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('admin_token', response.data.token);
    if (response.data.user) localStorage.setItem('admin_data', JSON.stringify(response.data.user));
  }
  return response.data;
};

// Categories
export const getCategories = () => api.get('/admin/categories');
export const createCategory = (data) => api.post('/admin/categories', data);
export const updateCategory = (id, data) => api.put(`/admin/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/admin/categories/${id}`);

// Products
export const getProducts = () => api.get('/admin/products');
export const createProduct = (data) => api.post('/admin/products', data);
export const updateProduct = (id, data) => api.put(`/admin/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/admin/products/${id}`);

// Coupons
export const getCoupons = () => api.get('/admin/coupons');
export const createCoupon = (data) => api.post('/admin/coupons', data);
export const updateCoupon = (id, data) => api.put(`/admin/coupons/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/admin/coupons/${id}`);

// Orders
export const getOrders = (params) => api.get('/admin/orders', { params });
export const getOrderDetails = (id) => api.get(`/admin/orders/${id}`);
export const updateOrderStatus = (id, status) => api.put(`/admin/orders/${id}/status`, { status });
export const assignDeliveryPartner = (id, deliveryPartnerId) => 
  api.post(`/admin/orders/${id}/assign-delivery`, { deliveryPartnerId });

// Delivery Partners
export const getDeliveryPartners = () => api.get('/admin/delivery-partners');
export const getAvailableDeliveryPartners = () => api.get('/admin/delivery-partners/available');
export const createDeliveryPartner = (data) => api.post('/admin/delivery-partners', data);
export const updateDeliveryPartner = (id, data) => api.put(`/admin/delivery-partners/${id}`, data);
export const updateDeliveryPartnerStatus = (id, isActive) => 
  api.patch(`/admin/delivery-partners/${id}/status`, { isActive });

// Offers
export const getOffers = () => api.get('/admin/offers');
export const createOffer = (data) => api.post('/admin/offers', data);
export const updateOffer = (id, data) => api.put(`/admin/offers/${id}`, data);
export const deleteOffer = (id) => api.delete(`/admin/offers/${id}`);

// APK Management
export const uploadApkInfo = (formData) => api.post('/admin/apk-upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
export const getApkInfo = () => api.get('/admin/apk-info');
export const deleteApkInfo = () => api.delete('/admin/apk');

// Order window (accept orders on/off and time duration)
export const getOrderWindow = () => api.get('/admin/order-window');
export const updateOrderWindow = (data) => api.put('/admin/order-window', data);

// Hero slides (home screen – 4 slides: image URL, headline, text)
export const getHeroSlides = () => api.get('/admin/hero-slides');
export const updateHeroSlides = (data) => api.put('/admin/hero-slides', data);
export const uploadHeroImage = (formData, slideIndex) =>
  api.post(`/admin/hero-slides/upload?slideIndex=${slideIndex}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getCoinSettings = () => api.get('/admin/coin-settings');
export const updateCoinSettings = (data) => api.put('/admin/coin-settings', data);

// Gamification API Functions
export const getGamificationSettings = () => api.get('/admin/gamification/settings');
export const updateGamificationSettings = (data) => api.put('/admin/gamification/settings', data);
export const getRewardTiers = () => api.get('/admin/gamification/reward-tiers');
export const createRewardTier = (data) => api.post('/admin/gamification/reward-tiers', data);
export const updateRewardTier = (id, data) => api.put(`/admin/gamification/reward-tiers/${id}`, data);
export const deleteRewardTier = (id) => api.delete(`/admin/gamification/reward-tiers/${id}`);
export const getMissions = () => api.get('/admin/gamification/missions');
export const createMission = (data) => api.post('/admin/gamification/missions', data);
export const updateMission = (id, data) => api.put(`/admin/gamification/missions/${id}`, data);
export const deleteMission = (id) => api.delete(`/admin/gamification/missions/${id}`);
export const getCoinTransactions = () => api.get('/admin/gamification/transactions');

// Payments Monitoring Panel
export const getPaymentDashboard = () => api.get('/payment/admin/dashboard');
export const getPaymentLogs = (params) => api.get('/payment/admin/logs', { params });
export const getPaymentTimeline = (id) => api.get(`/payment/admin/timeline/${id}`);

export default api;
