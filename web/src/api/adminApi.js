import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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

// Handle 401/403 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (email, otp) => {
  const response = await api.post('/auth/verify-email-otp', { email, otp });
  if (response.data.token) {
    localStorage.setItem('admin_token', response.data.token);
  }
  return response.data;
};

export const sendOtp = async (email) => {
  return await api.post('/auth/send-email-otp', { email });
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

export default api;
