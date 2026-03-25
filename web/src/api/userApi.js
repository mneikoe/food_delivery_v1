import axios from 'axios';

const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'https://www.chatoraadda.in/api');

const userApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

userApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('user_token');
      if (window.location.pathname.startsWith('/user')) {
        window.location.href = '/user/login';
      }
    }
    return Promise.reject(error);
  }
);

export const sendUserOtp = (email) => userApi.post('/auth/send-email-otp', { email });

export const verifyUserOtp = async (email, otp) => {
  const res = await userApi.post('/auth/verify-email-otp', { email, otp });
  if (res.data?.token) {
    localStorage.setItem('user_token', res.data.token);
    localStorage.setItem('user_role', res.data?.user?.role || 'USER');
  }
  return res.data;
};

export const userLogout = () => {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_role');
};

export const getUserProfile = () => userApi.get('/user/profile');
export const updateUserProfile = (data) => userApi.put('/user/profile', data);

export const getUserAddresses = () => userApi.get('/user/addresses');
export const createUserAddress = (data) => userApi.post('/user/addresses', data);
export const updateUserAddress = (id, data) => userApi.put(`/user/addresses/${id}`, data);
export const deleteUserAddress = (id) => userApi.delete(`/user/addresses/${id}`);

export const getUserCategories = () => userApi.get('/user/categories');
export const getUserProducts = (params) => userApi.get('/user/products', { params });
export const getUserOffers = () => userApi.get('/user/offers');

export const getUserCart = () => userApi.get('/user/cart');
export const addUserCartItem = (data) => userApi.post('/user/cart/items', data);
export const updateUserCartItem = (id, data) => userApi.put(`/user/cart/items/${id}`, data);

export const validateUserCoupon = (data) => userApi.post('/user/coupons/validate', data);
export const getUserCoupons = () => userApi.get('/user/coupons');

export const createUserOrder = (data) => userApi.post('/user/orders', data);
export const getUserOrders = () => userApi.get('/user/orders');
export const getUserOrderDetails = (id) => userApi.get(`/user/orders/${id}`);
export const cancelUserOrder = (id) => userApi.post(`/user/orders/${id}/cancel`);
export const getPublicOrderWindow = () => userApi.get('/public/order-window');
export const updateUserLocation = (data) => userApi.post('/user/location/update', data);

export default userApi;
