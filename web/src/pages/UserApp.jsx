import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
  message,
  Alert,
  Checkbox,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  MenuOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  addUserCartItem,
  createUserAddress,
  createUserOrder,
  deleteUserAddress,
  getUserAddresses,
  getUserCart,
  getUserCategories,
  getUserCoupons,
  getUserOrderDetails,
  getUserOffers,
  getUserOrders,
  getUserProducts,
  getUserProfile,
  getPublicOrderWindow,
  getPublicPaymentChannels,
  updateUserLocation,
  updateUserAddress,
  updateUserCartItem,
  updateUserProfile,
  userLogout,
  validateUserCoupon,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../api/userApi';
import logoImage from '../assets/logo-chatora.png';
import { supabase } from '../services/supabase';
import BrandHeader from '../components/user/BrandHeader';
import CategoryPill from '../components/user/CategoryPill';
import FoodCard from '../components/user/FoodCard';
import QuantitySelector from '../components/user/QuantitySelector';
import './UserApp.css';

const DELIVERY_FEE = 28;
const TAX_PERCENT = 0.05;
const WHATSAPP_PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1600&auto=format&fit=crop';
const SUPPORT_PHONE_DISPLAY = '+91 9111021231';
const SUPPORT_PHONE_LINK = '919111021231';

const ORDER_STATUS_COLORS = {
  CREATED: 'default',
  ACCEPTED_BY_ADMIN: 'processing',
  ASSIGNED_TO_DELIVERY: 'warning',
  PICKED_UP: 'warning',
  OUT_FOR_DELIVERY: 'processing',
  ARRIVED_AT_LOCATION: 'processing',
  OTP_VERIFIED: 'success',
  DELIVERED: 'success',
  CANCELLED: 'error',
};

const PAGE_TABS = [
  { label: 'Explore', value: 'explore' },
  { label: 'Cart', value: 'cart' },
  { label: 'Orders', value: 'orders' },
  { label: 'Profile', value: 'profile' },
];

function normalizePhone(value = '') {
  return String(value).replace(/[^\d+]/g, '').trim();
}

function isValidWhatsAppPhone(value = '') {
  return WHATSAPP_PHONE_REGEX.test(normalizePhone(value));
}

function getOrderClosedToastMessage(windowData) {
  if (!windowData) return 'Orders are temporarily closed. Please try after some time.';
  if (windowData.orderWindowEnabled === false) {
    return 'Orders are temporarily closed. Please try after some time.';
  }
  if (windowData.orderWindowStart && windowData.orderWindowEnd) {
    return `Orders are currently closed. Ordering time is ${windowData.orderWindowStart} to ${windowData.orderWindowEnd} (IST).`;
  }
  return windowData.message || 'Orders are temporarily closed. Please try after some time.';
}

function formatOrderAddress(orderDetails) {
  const source =
    orderDetails?.addressSnapshot ||
    orderDetails?.deliveryAddress?.addressDetails ||
    orderDetails?.deliveryAddress ||
    orderDetails?.addressId ||
    orderDetails?.deliveryAddress ||
    orderDetails?.address ||
    null;
  if (!source) return '';

  const parts = [
    source.title,
    source.addressLine1,
    source.addressLine2,
    source.landmark,
    source.city,
    source.state,
    source.pincode,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean);

  return parts.join(', ');
}

function formatDeliveryPartner(details) {
  const partner = details?.deliveryPartnerId;
  if (!partner) return 'Not assigned yet';
  const name = String(partner.name || '').trim();
  const phone = String(partner.phone || '').trim();
  if (name && phone) return `${name} (${phone})`;
  return name || phone || 'Not assigned yet';
}

export default function UserApp() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('explore');
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState(null);
  const [referralVisible, setReferralVisible] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [orders, setOrders] = useState([]);
  const [coupons, setCoupons] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(undefined);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(undefined);
  const [addressConfirmModalOpen, setAddressConfirmModalOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [orderWindow, setOrderWindow] = useState(null);
  const [locationFetching, setLocationFetching] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [profileGateModalOpen, setProfileGateModalOpen] = useState(false);
  const [profileGateSaving, setProfileGateSaving] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'RAZORPAY'
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyOtpCode, setVerifyOtpCode] = useState('');
  const [verifyOtpSent, setVerifyOtpSent] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [profileForm] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [profileGateForm] = Form.useForm();

  const checkOrderWindowStatus = async ({ showToast = true } = {}) => {
    try {
      const [windowRes, paymentRes] = await Promise.all([
        getPublicOrderWindow(),
        getPublicPaymentChannels()
      ]);
      const windowData = windowRes.data;
      const paymentData = paymentRes.data;
      
      const mergedData = {
        ...windowData,
        codActive: paymentData.codActive !== false,
        onlineActive: paymentData.onlineActive !== false
      };
      
      setOrderWindow(mergedData);

      if (mergedData?.ordersOpen === false) {
        if (showToast) {
          message.warning({
            key: 'order-window-closed',
            duration: 4,
            content: getOrderClosedToastMessage(mergedData),
          });
        }
      } else {
        message.destroy('order-window-closed');
      }

      // Handle payment method default resetting based on active channels
      if (mergedData?.codActive === false && paymentMethod === 'COD') {
        setPaymentMethod('RAZORPAY');
      } else if (mergedData?.onlineActive === false && paymentMethod === 'RAZORPAY') {
        setPaymentMethod('COD');
      }

      return mergedData;
    } catch (error) {
      // silent fallback; order API will still validate on place order
      return null;
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, a, c, pr, ca, o, cp, of] = await Promise.all([
        getUserProfile(),
        getUserAddresses(),
        getUserCategories(),
        getUserProducts(),
        getUserCart(),
        getUserOrders(),
        getUserCoupons(),
        getUserOffers(),
      ]);

      setProfile(p.data);
      setAddresses(a.data || []);
      setCategories(c.data || []);
      setProducts(pr.data || []);
      setCart(ca.data || { items: [], subtotal: 0 });
      setOrders(o.data || []);
      setCoupons(cp.data || []);
      setOffers(of.data || []);
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const autoDetectLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            await updateUserLocation({ latitude, longitude });
          } catch (err) {
            console.warn('Auto location update failed:', err);
          }
        },
        (err) => {
          console.warn('Geolocation permission not granted automatically:', err);
        }
      );
    }
  };

  const reloadOrdersListAndDetails = async () => {
    try {
      const response = await getUserOrders();
      setOrders(response.data || []);
    } catch (err) {
      console.error('Failed to reload orders in real-time:', err);
    }
  };

  useEffect(() => {
    if (orderDetailsModalOpen && selectedOrderDetails?._id) {
      const fetchDetails = async () => {
        try {
          const res = await getUserOrderDetails(selectedOrderDetails._id);
          setSelectedOrderDetails((prev) => (prev?._id === selectedOrderDetails._id ? { ...prev, ...(res.data || {}) } : prev));
        } catch (err) {
          console.warn('Failed to refresh selected order details:', err);
        }
      };
      // Fetch immediately
      fetchDetails();
      
      // Also poll every 10 seconds as a robust backup
      const t = setInterval(fetchDetails, 10000);
      return () => clearInterval(t);
    }
  }, [orderDetailsModalOpen, selectedOrderDetails?._id]);

  useEffect(() => {
    if (!profile?._id) return;

    const channel = supabase.channel(`user_${profile._id}_orders`);

    channel.on('broadcast', { event: 'order_update' }, (payload) => {
      console.log('Realtime order update received in web panel:', payload);
      reloadOrdersListAndDetails();
      if (payload?.payload?.orderId && selectedOrderDetails?._id === payload.payload.orderId) {
        getUserOrderDetails(payload.payload.orderId).then((res) => {
          setSelectedOrderDetails((prev) => (prev?._id === payload.payload.orderId ? { ...prev, ...(res.data || {}) } : prev));
        }).catch(err => console.warn(err));
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to user_${profile._id}_orders channel in web panel`);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [profile?._id, selectedOrderDetails?._id]);

  useEffect(() => {
    loadAll();
    autoDetectLocation();
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') {
      getUserProfile().then((res) => {
        setProfile(res.data);
      }).catch(err => console.warn('Failed to refresh profile on tab focus:', err));
    }
  }, [activeTab]);


  useEffect(() => {
    checkOrderWindowStatus({ showToast: true });
    const interval = setInterval(() => {
      checkOrderWindowStatus({ showToast: false });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!addresses.length) {
      setSelectedAddressId(undefined);
      return;
    }
    if (selectedAddressId && addresses.some((a) => a._id === selectedAddressId)) {
      return;
    }
    const def = addresses.find((a) => a.isDefault) || addresses[0];
    setSelectedAddressId(def?._id);
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (!categories.length) return;
    if (selectedCategory && categories.some((c) => c._id === selectedCategory)) return;
    setSelectedCategory(categories[0]?._id);
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory ? p.categoryId?._id === selectedCategory : true;
      const matchSearch = search
        ? p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c._id === selectedCategory),
    [categories, selectedCategory]
  );
  const selectedAddressObj = useMemo(
    () => addresses.find((address) => address._id === selectedAddressId),
    [addresses, selectedAddressId]
  );

  const cartCount = useMemo(
    () => (cart.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0),
    [cart]
  );
  const cartQtyMap = useMemo(() => {
    const map = {};
    (cart.items || []).forEach((item) => {
      const key = item?.productId?._id || item?.productId || item?._id;
      if (!key) return;
      map[key] = (map[key] || 0) + (item.quantity || 0);
    });
    return map;
  }, [cart.items]);

  const discount = appliedCoupon?.discount || 0;
  const tax = useMemo(() => ((cart.subtotal || 0) + DELIVERY_FEE) * TAX_PERCENT, [cart.subtotal]);
  const payable = Math.max((cart.subtotal || 0) + DELIVERY_FEE + tax - discount, 0);

  const isPhoneValid = useMemo(() => {
    return isValidWhatsAppPhone(profile?.phone);
  }, [profile?.phone]);
  const isNameValid = useMemo(() => Boolean(profile?.name?.trim()), [profile?.name]);
  const isProfileReadyForOrder = isNameValid && isPhoneValid;

  const fetchCartOnly = async () => {
    const ca = await getUserCart();
    setCart(ca.data || { items: [], subtotal: 0 });
  };

  const fetchOrdersOnly = async () => {
    const o = await getUserOrders();
    setOrders(o.data || []);
  };

  const fetchAddressesOnly = async () => {
    const a = await getUserAddresses();
    setAddresses(a.data || []);
  };

  const onAddToCart = async (productId) => {
    try {
      await addUserCartItem({ productId, quantity: 1 });
      await fetchCartOnly();
      message.success('Added to cart');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to add to cart');
    }
  };

  const onUpdateCartItem = async (item, delta) => {
    const nextQty = (item.quantity || 0) + delta;
    try {
      await updateUserCartItem(item.productId || item._id, { quantity: nextQty });
      await fetchCartOnly();
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to update cart');
    }
  };

  const openProfileModal = () => {
    profileForm.setFieldsValue({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
    });
    setProfileModalOpen(true);
  };

  const onSaveProfile = async (values) => {
    try {
      const data = {
        ...values,
        phone: normalizePhone(values.phone),
      };
      const res = await updateUserProfile(data);
      setProfile(res.data);
      setProfileModalOpen(false);
      message.success('Profile updated');
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setLocationCoords(null);
    addressForm.resetFields();
    addressForm.setFieldsValue({
      isDefault: addresses.length === 0,
    });
    setAddressDrawerOpen(true);
  };

  const openEditAddress = (address) => {
    setEditingAddress(address);
    setLocationCoords(address?.coordinates || null);
    addressForm.setFieldsValue({
      ...address,
    });
    setAddressDrawerOpen(true);
  };

  const detectCurrentLocationForAddress = async () => {
    if (!navigator.geolocation) {
      message.error('Geolocation is not supported in this browser');
      return;
    }
    setLocationFetching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const res = await updateUserLocation({ latitude, longitude });
          const location = res.data?.location || {};

          setLocationCoords({ lat: latitude, lng: longitude });
          const current = addressForm.getFieldsValue();
          addressForm.setFieldsValue({
            ...current,
            city: location.city || current.city,
            state: location.state || current.state,
            addressLine1: location.address || current.addressLine1,
            landmark: location.suburb || current.landmark,
          });
          message.success('Location detected and address form updated');
        } catch (error) {
          message.error(error.response?.data?.error || 'Failed to resolve location');
        } finally {
          setLocationFetching(false);
        }
      },
      (geoError) => {
        const map = {
          1: 'Location permission denied',
          2: 'Location unavailable',
          3: 'Location request timed out',
        };
        message.error(map[geoError.code] || 'Unable to get current location');
        setLocationFetching(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const onSaveAddress = async (values) => {
    const coords =
      locationCoords ||
      editingAddress?.coordinates ||
      values?.coordinates ||
      { lat: 0, lng: 0 };
    const payload = {
      ...values,
      pincode: values.pincode ? String(values.pincode).trim() : '',
      coordinates: {
        lat: Number(coords.lat) || 0,
        lng: Number(coords.lng) || 0,
      },
    };
    try {
      if (editingAddress?._id) {
        await updateUserAddress(editingAddress._id, payload);
        message.success('Address updated');
      } else {
        await createUserAddress(payload);
        message.success('Address added');
      }
      setAddressDrawerOpen(false);
      setEditingAddress(null);
      addressForm.resetFields();
      await fetchAddressesOnly();
    } catch (error) {
      const serverErr = error.response?.data;
      const errMsg = serverErr?.errors ? serverErr.errors.join(', ') : (serverErr?.message || serverErr?.error || 'Failed to save address');
      message.error(errMsg);
    }
  };

  const onDeleteAddress = async (id) => {
    try {
      await deleteUserAddress(id);
      message.success('Address deleted');
      await fetchAddressesOnly();
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to delete address');
    }
  };

  const onApplyCoupon = async () => {
    if (!(cart.subtotal > 0)) {
      message.warning('Add items to cart first');
      return;
    }
    if (!couponCode.trim()) {
      message.warning('Enter coupon code first');
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await validateUserCoupon({
        code: couponCode.trim(),
        orderAmount: cart.subtotal || 0,
      });
      setAppliedCoupon(res.data);
      message.success(`Coupon applied. Discount ₹${res.data.discount}`);
    } catch (error) {
      setAppliedCoupon(null);
      message.error(error.response?.data?.error || 'Invalid coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Load Razorpay checkout script dynamically
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const executePlaceOrder = async () => {
    const latestWindow = await checkOrderWindowStatus({ showToast: true });
    if (latestWindow?.ordersOpen === false) return;

    if (!selectedAddressId) {
      message.error('Please select delivery address');
      return;
    }
    const lat = Number(selectedAddressObj?.coordinates?.lat);
    const lng = Number(selectedAddressObj?.coordinates?.lng);
    const hasValidLocation = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    if (!hasValidLocation) {
      message.warning('Please set delivery location for selected address before checkout');
      if (selectedAddressObj?._id) openEditAddress(selectedAddressObj);
      return;
    }
    if (!cart.items?.length) { message.warning('Cart is empty'); return; }

    setCheckoutLoading(true);
    try {
      if (paymentMethod === 'RAZORPAY') {
        // Step 1: Create food order first (backend creates it)
        const orderRes = await createUserOrder({
          addressId: selectedAddressId,
          paymentMethod: 'RAZORPAY',
          couponCode: appliedCoupon?.code || undefined,
        });
        const foodOrderId = orderRes.data?._id || orderRes.data?.order?._id;
        if (!foodOrderId) throw new Error('Failed to create order');

        // Step 2: Create Razorpay order via backend
        const rzpRes = await createRazorpayOrder(foodOrderId);
        const { razorpayOrderId, amount, currency, keyId, prefill } = rzpRes.data;

        // Step 3: Load Razorpay script
        const loaded = await loadRazorpayScript();
        if (!loaded) { message.error('Payment gateway failed to load. Please try COD.'); return; }

        // Step 4: Open Razorpay checkout
        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount,
            currency,
            order_id: razorpayOrderId,
            name: 'Chatora Adda',
            description: 'Food Order Payment',
            image: logoImage,
            prefill: {
              name: prefill?.name || '',
              email: prefill?.email || '',
              contact: prefill?.contact || '',
            },
            theme: { color: '#FF6B35' }, // Match Chatora Adda branding
            modal: {
              ondismiss: () => {
                message.warning('Payment cancelled. Your order is on hold.');
                resolve();
              },
              // Prevents unexpected behavior on mobile/popup web flows
              escape: false,
            },
            handler: async (response) => {
              try {
                // Step 5: Verify payment signature
                await verifyRazorpayPayment({
                  orderId: foodOrderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                message.success('✅ Payment successful! Order confirmed.');
                setAppliedCoupon(null);
                setCouponCode('');
                await Promise.all([fetchCartOnly(), fetchOrdersOnly()]);
                setActiveTab('orders');
                setCartDrawerOpen(false);
                resolve();
              } catch (err) {
                message.error(err.response?.data?.error || 'Payment verification failed');
                reject(err);
              }
            },
          });
          rzp.open();
        });
      } else {
        // COD flow
        await createUserOrder({
          addressId: selectedAddressId,
          paymentMethod: 'COD',
          couponCode: appliedCoupon?.code || undefined,
        });
        message.success('✅ Order placed! Payment on delivery.');
        setAppliedCoupon(null);
        setCouponCode('');
        await Promise.all([fetchCartOnly(), fetchOrdersOnly()]);
        setActiveTab('orders');
        setCartDrawerOpen(false);
      }
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openProfileGateModal = () => {
    profileGateForm.setFieldsValue({
      name: profile?.name || '',
      phone: profile?.phone || '',
      confirmWhatsApp: false,
    });
    setProfileGateModalOpen(true);
  };

  const onSubmitProfileGate = async (values) => {
    setProfileGateSaving(true);
    try {
      const payload = {
        name: values.name?.trim(),
        phone: normalizePhone(values.phone),
      };
      const res = await updateUserProfile(payload);
      setProfile(res.data);
      setProfileGateModalOpen(false);
      message.success('Profile updated. Continuing checkout...');
      await executePlaceOrder();
    } catch (error) {
      message.error(error.response?.data?.error || 'Unable to update profile');
    } finally {
      setProfileGateSaving(false);
    }
  };

  const onPlaceOrder = async () => {
    if (profile && profile.isEmailVerified === false) {
      message.error('Your email is unverified. Please log out and sign in using Email OTP to verify your email and place orders.');
      return;
    }
    if (!isProfileReadyForOrder) {
      openProfileGateModal();
      return;
    }
    setAddressConfirmModalOpen(true);
  };

  const openOrderDetails = async (order) => {
    setOrderDetailsLoading(true);
    setOrderDetailsModalOpen(true);
    try {
      const res = await getUserOrderDetails(order?._id || order);
      // Keep the list row as fallback source for missing fields.
      setSelectedOrderDetails({ ...(order || {}), ...(res.data || {}) });
    } catch (error) {
      setSelectedOrderDetails(order || null);
      message.error(error.response?.data?.error || 'Unable to load order details');
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  const handleLogout = () => {
    userLogout();
    message.success('Logged out');
    window.location.href = '/';
  };

  const openVerificationModal = async () => {
    setVerifyModalOpen(true);
    if (!verifyOtpSent && profile?.email) {
      setVerifyLoading(true);
      try {
        await sendUserOtp(profile.email);
        setVerifyOtpSent(true);
        message.success("OTP sent to your email inbox! 📧");
      } catch (err) {
        message.error(err.response?.data?.error || "Failed to send verification OTP");
      } finally {
        setVerifyLoading(false);
      }
    }
  };

  const handleSendVerifyOtp = async () => {
    if (!profile?.email) return;
    setVerifyLoading(true);
    try {
      await sendUserOtp(profile.email);
      setVerifyOtpSent(true);
      message.success("A fresh OTP has been sent! 📧");
    } catch (err) {
      message.error(err.response?.data?.error || "Failed to resend OTP");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleConfirmVerifyOtp = async () => {
    if (!profile?.email) return;
    if (!verifyOtpCode || verifyOtpCode.length < 4) {
      message.warning("Please enter the 4-digit OTP code");
      return;
    }
    setVerifyLoading(true);
    try {
      await verifyUserOtp(profile.email, verifyOtpCode);
      setVerifyModalOpen(false);
      setVerifyOtpCode('');
      setVerifyOtpSent(false);
      message.success("✅ Email successfully verified!");
      const p = await getUserProfile();
      setProfile(p.data);
    } catch (err) {
      message.error(err.response?.data?.error || "Invalid OTP code. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="user-app-shell">
      <BrandHeader
        profile={profile}
        openProfileModal={openProfileModal}
        openVerificationModal={openVerificationModal}
        setMobileMenuOpen={setMobileMenuOpen}
        navigate={navigate}
        cartCount={cartCount}
        setCartDrawerOpen={setCartDrawerOpen}
        handleLogout={handleLogout}
      />

      <Drawer
        title="User Menu"
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        className="user-mobile-drawer"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button block onClick={() => { navigate('/'); setMobileMenuOpen(false); }}>
            Home
          </Button>
          <Button type="primary" block onClick={() => { navigate('/user/app'); setMobileMenuOpen(false); }}>
            User App
          </Button>
          <Button block onClick={() => { openProfileModal(); setMobileMenuOpen(false); }}>
            Profile
          </Button>
          <Button block onClick={() => { setCartDrawerOpen(true); setMobileMenuOpen(false); }}>
            Cart ({cartCount})
          </Button>
          <Button danger block onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>
            Logout
          </Button>
        </Space>
      </Drawer>

      <div className="user-app-nav">
        <Segmented options={PAGE_TABS} value={activeTab} onChange={setActiveTab} block />
      </div>

      <div className="user-app-content">
        {activeTab === 'explore' && (
          <>
            <Card title="Explore items" loading={loading} style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ minWidth: 240 }}
                />
                <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space size={8} wrap>
                    <Button
                      icon={<AppstoreOutlined />}
                      onClick={() => navigate('/user/categories')}
                    >
                      View Full Categories
                    </Button>
                    <Button
                      icon={<UnorderedListOutlined />}
                      onClick={() => navigate('/user/items')}
                    >
                      View Full Menu
                    </Button>
                  </Space>
                </Space>
                <div className="h-scroll-chips">
                  {categories.map((c) => (
                    <CategoryPill
                      key={c._id}
                      category={c}
                      active={selectedCategory === c._id}
                      onClick={() => setSelectedCategory(c._id)}
                    />
                  ))}
                </div>
              </Space>
            </Card>

            {!!offers.length && (
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {offers.slice(0, 3).map((offer) => (
                  <Col xs={24} md={8} key={offer._id}>
                    <Card className="user-offer-card" size="small">
                      <Typography.Text strong>{offer.title}</Typography.Text>
                      <div>
                        <Tag color="green" style={{ marginTop: 8 }}>
                          {offer.discountText}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}

            <Typography.Title level={5} style={{ marginBottom: 10 }}>
              {selectedCategoryObj?.name || 'Selected category'} items
            </Typography.Title>
            <div className="h-scroll-list" style={{ marginBottom: 14 }}>
              {filteredProducts.map((product) => {
                const qty = cartQtyMap[product._id] || 0;
                const cartItem = cart.items.find((i) => (i.productId?._id || i.productId) === product._id);
                return (
                  <FoodCard
                    key={product._id}
                    p={product}
                    quantity={qty}
                    onAdd={() => qty > 0 ? onUpdateCartItem(cartItem, 1) : onAddToCart(product._id)}
                    onRemove={() => onUpdateCartItem(cartItem, -1)}
                    navigate={navigate}
                    className="h-scroll-card"
                  />
                );
              })}
            </div>
            {!filteredProducts.length && !loading && <Empty style={{ marginTop: 36 }} description="No items found" />}
            <div className="user-app-explore-footer">
              <Typography.Text className="user-app-explore-footer-title">
                Explore more categories and all items
              </Typography.Text>
              <Space wrap>
                <Button onClick={() => navigate('/user/categories')}>View Full Categories</Button>
                <Button type="primary" onClick={() => navigate('/user/items')}>
                  View Full Menu
                </Button>
              </Space>
            </div>
          </>
        )}

        {activeTab === 'cart' && (
          <Card title="Cart & Checkout" loading={loading}>
            {orderWindow?.ordersOpen === false && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="Ordering is currently closed"
                description={getOrderClosedToastMessage(orderWindow)}
              />
            )}
            {profile && profile.isEmailVerified === false && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                message="Email Verification Required"
                description="Your email address is currently unverified. Please log out and sign in using Email OTP to verify and place orders."
              />
            )}
            {!selectedAddressId ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="No delivery address selected"
                description="Please select or add a delivery address below before checkout."
              />
            ) : (
              selectedAddressObj && (!selectedAddressObj.coordinates || (selectedAddressObj.coordinates.lat === 0 && selectedAddressObj.coordinates.lng === 0)) && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Address location not set"
                  description="Please click edit on the selected address and set your location coordinates to place an order."
                />
              )
            )}
            <Space style={{ marginBottom: 12 }} wrap>
              <Badge count={cartCount}>
                <Button icon={<ShoppingCartOutlined />} onClick={() => setCartDrawerOpen(true)}>
                  Open cart drawer
                </Button>
              </Badge>
              <Button icon={<HomeOutlined />} onClick={openAddAddress}>
                Add address
              </Button>
              {!isProfileReadyForOrder && (
                <Tag color="warning">Name + WhatsApp number required before order</Tag>
              )}
            </Space>
            {!cart.items?.length ? (
              <Empty description="Cart is empty" style={{ marginTop: 20 }} />
            ) : (
              <>
                <Typography.Paragraph type="secondary">
                  Select your preferred payment method to proceed.
                </Typography.Paragraph>

                {/* Payment Method Selection */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { key: 'COD', icon: '💵', label: 'Cash on Delivery', sub: 'Pay when delivered', active: orderWindow?.codActive !== false },
                    { key: 'RAZORPAY', icon: '💳', label: 'Pay Online', sub: 'Cards, UPI, Netbanking', active: orderWindow?.onlineActive !== false },
                  ]
                  .filter(pm => pm.active)
                  .map(pm => (
                    <button
                      key={pm.key}
                      type="button"
                      onClick={() => setPaymentMethod(pm.key)}
                      style={{
                        flex: 1,
                        minWidth: 140,
                        padding: '12px 16px',
                        border: paymentMethod === pm.key ? '2px solid #10b981' : '2px solid #e5e7eb',
                        borderRadius: 12,
                        background: paymentMethod === pm.key ? 'rgba(16,185,129,0.06)' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{pm.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: paymentMethod === pm.key ? '#059669' : '#374151' }}>
                          {pm.label}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{pm.sub}</div>
                      </div>
                      {paymentMethod === pm.key && (
                        <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: 16 }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="checkout-inline">
                  <Typography.Text strong>Select delivery address</Typography.Text>
                  <Radio.Group
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    style={{ marginTop: 10, width: '100%' }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {addresses.map((addr) => (
                        <Radio key={addr._id} value={addr._id}>
                          <span>
                            <strong>{addr.title}</strong> - {addr.addressLine1}, {addr.city}, {addr.state} {addr.pincode}
                          </span>
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </div>
                <Space style={{ marginTop: 14 }} wrap>
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    style={{ width: 180 }}
                  />
                  <Button loading={applyingCoupon} onClick={onApplyCoupon}>
                    Apply coupon
                  </Button>
                  {appliedCoupon?.code && <Tag color="green">{appliedCoupon.code}</Tag>}
                </Space>
                {!!coupons.length && (
                  <Space wrap style={{ marginTop: 10 }}>
                    <Typography.Text type="secondary">Available:</Typography.Text>
                    {coupons.map((c) => (
                      <Tag key={c.code} color="blue" onClick={() => setCouponCode(c.code)} style={{ cursor: 'pointer' }}>
                        {c.code}
                      </Tag>
                    ))}
                  </Space>
                )}

                <div className="checkout-summary">
                  <div><span>Subtotal:</span> <strong>₹{(cart.subtotal || 0).toFixed(2)}</strong></div>
                  <div><span>Delivery fee:</span> <strong>₹{DELIVERY_FEE.toFixed(2)}</strong></div>
                  <div><span>Tax:</span> <strong>₹{tax.toFixed(2)}</strong></div>
                  <div><span>Discount:</span> <strong>- ₹{discount.toFixed(2)}</strong></div>
                  <div className="checkout-total">
                    <span>Total payable ({paymentMethod === 'COD' ? 'COD' : 'Online'}):</span>
                    <strong>₹{payable.toFixed(2)}</strong>
                  </div>
                </div>

                <Button
                  type="primary"
                  size="large"
                  loading={checkoutLoading}
                  onClick={onPlaceOrder}
                  style={paymentMethod === 'RAZORPAY' ? {
                    background: 'linear-gradient(135deg,#10b981,#059669)',
                    border: 'none',
                  } : {}}
                >
                  {paymentMethod === 'RAZORPAY' ? '💳 Pay ₹' + payable.toFixed(0) + ' Online' : '✅ Place Order (COD)'}
                </Button>
              </>
            )}
          </Card>
        )}

        {activeTab === 'orders' && (
          <Card title="My Orders" loading={loading}>
            {!orders.length ? (
              <Empty description="No orders yet" />
            ) : (
              <div className="user-orders-grid">
                {orders.map((record) => (
                  <Card key={record._id} className="user-order-card">
                    <div className="user-order-head">
                      <Typography.Text strong>{record.orderId || 'Order'}</Typography.Text>
                      <Tag color={ORDER_STATUS_COLORS[record.status] || 'default'}>
                        {record.status || 'CREATED'}
                      </Tag>
                    </div>
                    <div className="user-order-meta">
                      <div>
                        <Typography.Text type="secondary">Date</Typography.Text>
                        <Typography.Paragraph style={{ marginBottom: 0 }}>
                          {record.createdAt ? dayjs(record.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
                        </Typography.Paragraph>
                      </div>
                      <div>
                        <Typography.Text type="secondary">Total</Typography.Text>
                        <Typography.Paragraph style={{ marginBottom: 0, fontWeight: 600 }}>
                          ₹{record.totalAmount || 0}
                        </Typography.Paragraph>
                      </div>
                    </div>
                    <Button block onClick={() => openOrderDetails(record)}>
                      Order Details
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'profile' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title="Profile">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space align="center">
                    <Avatar size={48} icon={<UserOutlined />} />
                    <div>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        {profile?.name || '-'}
                      </Typography.Title>
                      <Typography.Text type="secondary">{profile?.email || '-'}</Typography.Text>
                      <div style={{ marginTop: 6 }}>
                        {profile?.isEmailVerified ? (
                          <Tag color="success" style={{ border: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, borderRadius: 6 }}>
                            ✓ Verified Account
                          </Tag>
                        ) : (
                          <Tag color="error" onClick={openVerificationModal} style={{ border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600, borderRadius: 6, cursor: 'pointer' }}>
                            ⚠️ Click to Verify Email
                          </Tag>
                        )}
                      </div>
                    </div>
                  </Space>
                  <div>
                    <Typography.Text type="secondary">WhatsApp Number</Typography.Text>
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                      {profile?.phone || 'Not added'}
                    </Typography.Paragraph>
                  </div>
                  <Button onClick={openProfileModal}>Edit profile</Button>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    This number should be your WhatsApp number. Admin can send status updates on this number.
                  </Typography.Text>
                </Space>
              </Card>

              <Card 
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>🎁 Refer & Earn</span>} 
                style={{ marginTop: 16, borderRadius: 12, border: '1px dashed #fa8c16', background: 'rgba(250, 140, 22, 0.02)' }}
              >
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                    Share your unique referral code with friends. You get <strong>100 coins</strong> when they join, and they get <strong>50 coins</strong> instantly!
                  </Typography.Text>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, background: 'rgba(250,140,22,0.08)', padding: '12px 16px', borderRadius: 8, maxWidth: 280, margin: '0 auto 12px auto', border: '1px solid rgba(250,140,22,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Typography.Text strong style={{ fontSize: 20, letterSpacing: 1.5, color: '#d46b08', fontFamily: 'monospace' }}>
                        {referralVisible ? (profile?.referralCode || '------') : '••••••'}
                      </Typography.Text>
                      <Button
                        type="text"
                        size="small"
                        icon={referralVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setReferralVisible(!referralVisible)}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#d46b08' }}
                      />
                    </div>
                    <Button 
                      type="link" 
                      onClick={() => {
                        if (profile?.referralCode) {
                          navigator.clipboard.writeText(profile.referralCode);
                          message.success('Referral code copied to clipboard!');
                        }
                      }}
                      style={{ padding: 0, fontWeight: 600 }}
                    >
                      Copy
                    </Button>
                  </div>
                  <Typography.Text style={{ fontSize: 13, color: '#fa8c16', fontWeight: 600 }}>
                    🪙 Your Wallet Balance: {profile?.coins || 0} Coins
                  </Typography.Text>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Saved addresses" extra={<Button size="small" onClick={openAddAddress}>Add</Button>}>
                <List
                  dataSource={addresses}
                  locale={{ emptyText: 'No addresses saved yet' }}
                  renderItem={(addr) => (
                    <List.Item
                      actions={[
                        <Button key="edit" type="link" onClick={() => openEditAddress(addr)}>Edit</Button>,
                        <Popconfirm
                          key="del"
                          title="Delete this address?"
                          onConfirm={() => onDeleteAddress(addr._id)}
                        >
                          <Button type="link" danger>Delete</Button>
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <span>{addr.title}</span>
                            {addr.isDefault && <Tag color="green">Default</Tag>}
                          </Space>
                        }
                        description={`${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.pincode}`}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>
      {cartCount > 0 && (
        <Badge count={cartCount} className="floating-cart-badge">
          <Button
            type="primary"
            size="large"
            className="floating-cart-btn"
            icon={<ShoppingCartOutlined />}
            onClick={() => setActiveTab('cart')}
          >
            Go to Cart
          </Button>
        </Badge>
      )}

      <Drawer
        title={`Cart (${cartCount})`}
        open={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        width={420}
      >
        {(cart.items || []).length === 0 ? (
          <Empty description="Cart is empty" />
        ) : (
          <>
            <List
              dataSource={cart.items}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={`₹${item.price} each`}
                  />
                  <Space>
                    <Button size="small" icon={<MinusOutlined />} onClick={() => onUpdateCartItem(item, -1)} />
                    <span>{item.quantity}</span>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => onUpdateCartItem(item, 1)} />
                  </Space>
                </List.Item>
              )}
            />
            <div className="cart-drawer-footer">
              <div><span>Subtotal:</span><strong> ₹{(cart.subtotal || 0).toFixed(2)}</strong></div>
              <Button type="primary" block onClick={() => { setActiveTab('cart'); setCartDrawerOpen(false); }}>
                Go to Checkout
              </Button>
            </div>
          </>
        )}
      </Drawer>

      <Modal
        title="Confirm Delivery Address"
        open={addressConfirmModalOpen}
        onCancel={() => setAddressConfirmModalOpen(false)}
        footer={null}
      >
        <div style={{ padding: '12px 0' }}>
          {selectedAddressObj ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>📍</span>
                <Typography.Text strong style={{ fontSize: '15px' }}>
                  {selectedAddressObj.title || 'Delivery Address'}
                </Typography.Text>
              </div>
              <Typography.Paragraph style={{ margin: 0, color: 'var(--text-secondary)' }}>
                {selectedAddressObj.addressLine1}
                {selectedAddressObj.addressLine2 && `, ${selectedAddressObj.addressLine2}`}
                {selectedAddressObj.landmark && ` (Landmark: ${selectedAddressObj.landmark})`}
                {`, ${selectedAddressObj.city}, ${selectedAddressObj.state} - ${selectedAddressObj.pincode}`}
              </Typography.Paragraph>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', marginBottom: '16px' }}>
              <Typography.Paragraph type="secondary" style={{ marginBottom: '16px' }}>
                No delivery address selected or available. Please add an address to continue.
              </Typography.Paragraph>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddressConfirmModalOpen(false); openAddAddress(); }}>
                Add Address
              </Button>
            </div>
          )}

          {addresses.length > 1 && (
            <div style={{ marginBottom: '20px' }}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                Deliver to another address:
              </Typography.Text>
              <Radio.Group
                onChange={(e) => setSelectedAddressId(e.target.value)}
                value={selectedAddressId}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {addresses.filter(a => a._id !== selectedAddressId).map(a => (
                    <Radio key={a._id} value={a._id}>
                      <span style={{ color: 'var(--text-primary)' }}>{a.title} ({a.addressLine1.slice(0, 30)}...)</span>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          )}

          {selectedAddressObj && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <Button style={{ flex: 1 }} onClick={() => { setAddressConfirmModalOpen(false); openAddAddress(); }}>
                Add New Address
              </Button>
              <Button
                type="primary"
                style={{ flex: 2 }}
                loading={checkoutLoading}
                onClick={async () => {
                  setAddressConfirmModalOpen(false);
                  await executePlaceOrder();
                }}
              >
                Confirm & Place Order
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title="Order Details"
        open={orderDetailsModalOpen}
        onCancel={() => {
          setOrderDetailsModalOpen(false);
          setSelectedOrderDetails(null);
        }}
        footer={
          <div className="order-details-modal-footer">
            <Typography.Text type="secondary">Support: {SUPPORT_PHONE_DISPLAY}</Typography.Text>
            <Space size={8} wrap>
              <Button size="small" href={`tel:+${SUPPORT_PHONE_LINK}`}>
                Call
              </Button>
              <Button size="small" type="primary" href={`https://wa.me/${SUPPORT_PHONE_LINK}`} target="_blank">
                WhatsApp
              </Button>
            </Space>
          </div>
        }
      >
        {orderDetailsLoading ? (
          <Card loading />
        ) : !selectedOrderDetails ? (
          <Empty description="Order details not available" />
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div className="order-details-head">
              <Typography.Text strong>{selectedOrderDetails.orderId || 'Order'}</Typography.Text>
              <Tag color={ORDER_STATUS_COLORS[selectedOrderDetails.status] || 'default'}>
                {selectedOrderDetails.status || 'CREATED'}
              </Tag>
            </div>

            {selectedOrderDetails.deliveryOTP?.code && 
             ['ASSIGNED_TO_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_LOCATION'].includes(selectedOrderDetails.status) && (
              <Card 
                size="small" 
                style={{ 
                  background: 'rgba(16, 185, 129, 0.08)', 
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 12,
                  textAlign: 'center',
                  padding: '16px 8px'
                }}
              >
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>
                  🔑 Delivery Verification OTP
                </Typography.Text>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981', letterSpacing: 6, margin: '8px 0 4px 6px' }}>
                  {selectedOrderDetails.deliveryOTP.code}
                </div>
                <Typography.Paragraph type="secondary" style={{ fontSize: 11, margin: 0, color: '#64748b' }}>
                  Please share this code with the delivery rider upon arrival to collect your order.
                </Typography.Paragraph>
              </Card>
            )}
            <div className="order-details-grid">
              <div>
                <Typography.Text type="secondary">Placed On</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, fontWeight: 500 }}>
                  {selectedOrderDetails.createdAt
                    ? dayjs(selectedOrderDetails.createdAt).format('YYYY-MM-DD HH:mm')
                    : '-'}
                </Typography.Paragraph>
              </div>
              <div>
                <Typography.Text type="secondary">Total Amount</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, fontWeight: 700, color: '#f97316' }}>
                  ₹{selectedOrderDetails.totalAmount || 0}
                </Typography.Paragraph>
              </div>
              <div>
                <Typography.Text type="secondary">Payment Method</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, fontWeight: 500 }}>
                  {selectedOrderDetails.paymentMethod === 'COD' ? '💵 Cash on Delivery' : '💳 Online (Razorpay)'}
                </Typography.Paragraph>
              </div>
              <div>
                <Typography.Text type="secondary">Payment Status</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, fontWeight: 600 }}>
                  <span style={{ color: selectedOrderDetails.paymentStatus === 'PAID' ? '#10b981' : selectedOrderDetails.paymentStatus === 'FAILED' ? '#ef4444' : '#f59e0b' }}>
                    {selectedOrderDetails.paymentStatus || 'PENDING'}
                  </span>
                </Typography.Paragraph>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <Typography.Text type="secondary">Customer Contact Details</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  📧 {profile?.email || 'N/A'} | 📱 {profile?.phone || 'N/A'}
                </Typography.Paragraph>
              </div>
              {selectedOrderDetails.paymentMethod === 'RAZORPAY' && selectedOrderDetails.razorpayOrderId && (
                <div style={{ gridColumn: 'span 2' }}>
                  <Typography.Text type="secondary">Razorpay Order ID</Typography.Text>
                  <Typography.Paragraph style={{ marginBottom: 0, fontSize: 12, fontFamily: 'monospace', color: '#38bdf8' }}>
                    {selectedOrderDetails.razorpayOrderId}
                  </Typography.Paragraph>
                </div>
              )}
              {selectedOrderDetails.paymentMethod === 'RAZORPAY' && selectedOrderDetails.razorpayPaymentId && (
                <div style={{ gridColumn: 'span 2' }}>
                  <Typography.Text type="secondary">Transaction ID (Payment ID)</Typography.Text>
                  <Typography.Paragraph style={{ marginBottom: 0, fontSize: 12, fontFamily: 'monospace', color: '#38bdf8' }}>
                    {selectedOrderDetails.razorpayPaymentId}
                  </Typography.Paragraph>
                </div>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <Typography.Text type="secondary">Delivery Partner</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0, fontWeight: 500 }}>
                  {formatDeliveryPartner(selectedOrderDetails)}
                </Typography.Paragraph>
              </div>
            </div>
            <Card size="small" className="order-details-block">
              <Typography.Text strong>Delivery Address</Typography.Text>
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {formatOrderAddress(selectedOrderDetails) || 'Address details not available'}
              </Typography.Paragraph>
            </Card>
            <Card size="small" className="order-details-block">
              <Typography.Text strong>Items</Typography.Text>
              <div className="order-items-list">
                {(selectedOrderDetails.items || []).map((item, index) => (
                  <div key={`${item.productId || index}`} className="order-item-row">
                    <Typography.Text>{item.name || 'Item'}</Typography.Text>
                    <Typography.Text type="secondary">x{item.quantity || 1}</Typography.Text>
                  </div>
                ))}
                {!selectedOrderDetails.items?.length && (
                  <Typography.Text type="secondary">No item details available</Typography.Text>
                )}
              </div>
            </Card>
          </Space>
        )}
      </Modal>

      <Modal
        title="Edit profile"
        open={profileModalOpen}
        onCancel={() => setProfileModalOpen(false)}
        footer={null}
      >
        <Form form={profileForm} layout="vertical" onFinish={onSaveProfile}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter name' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Email Verification Status">
            {profile?.isEmailVerified ? (
              <Tag color="success" style={{ border: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600, borderRadius: 6 }}>
                ✓ Verified Account
              </Tag>
            ) : (
              <Tag color="error" onClick={() => { setProfileModalOpen(false); openVerificationModal(); }} style={{ border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 600, borderRadius: 6, cursor: 'pointer' }}>
                ⚠️ Click to Verify Email
              </Tag>
            )}
          </Form.Item>
          <Form.Item
            name="phone"
            label="WhatsApp number"
            rules={[{ required: true, message: 'Enter WhatsApp number' }]}
          >
            <Input placeholder="10 digit WhatsApp number" />
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setProfileModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Save</Button>
          </Space>
        </Form>
      </Modal>

      <Modal
        title="Complete profile before placing order"
        open={profileGateModalOpen}
        onCancel={() => setProfileGateModalOpen(false)}
        footer={null}
        destroyOnHidden={false}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 14 }}>
          Please enter your name and WhatsApp number. Admin will use this WhatsApp number for order updates.
        </Typography.Paragraph>
        <Form form={profileGateForm} layout="vertical" onFinish={onSubmitProfileGate}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Enter your name' }]}>
            <Input placeholder="Your full name" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="WhatsApp Number"
            rules={[
              { required: true, message: 'Enter WhatsApp number' },
              {
                validator: (_, value) =>
                  isValidWhatsAppPhone(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error('Enter a valid WhatsApp number (10-15 digits, optional +)')),
              },
            ]}
          >
            <Input placeholder="+91XXXXXXXXXX" />
          </Form.Item>
          <Form.Item
            name="confirmWhatsApp"
            valuePropName="checked"
            rules={[
              {
                validator: (_, v) =>
                  v ? Promise.resolve() : Promise.reject(new Error('Please confirm this is your WhatsApp number')),
              },
            ]}
          >
            <Checkbox>This number is active on WhatsApp</Checkbox>
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setProfileGateModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={profileGateSaving}>
              Save & Place Order
            </Button>
          </Space>
        </Form>
      </Modal>

      <Drawer
        title={editingAddress ? 'Edit address' : 'Add address'}
        open={addressDrawerOpen}
        width={420}
        onClose={() => setAddressDrawerOpen(false)}
      >
        <Space style={{ marginBottom: 12 }} wrap>
          <Button
            icon={<EnvironmentOutlined />}
            loading={locationFetching}
            onClick={detectCurrentLocationForAddress}
          >
            Use Current Location
          </Button>
          {locationCoords && (
            <Tag color="green">
              Lat {Number(locationCoords.lat).toFixed(4)}, Lng {Number(locationCoords.lng).toFixed(4)}
            </Tag>
          )}
        </Space>
        <Form form={addressForm} layout="vertical" onFinish={onSaveAddress}>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Enter title' }]}>
            <Input placeholder="Home / Office" />
          </Form.Item>
          <Form.Item name="addressLine1" label="Address line 1" rules={[{ required: true, message: 'Enter address line 1' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="addressLine2" label="Address line 2">
            <Input />
          </Form.Item>
          <Form.Item name="landmark" label="Landmark">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="city" label="City" rules={[{ required: true, message: 'City required' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="state" label="State" rules={[{ required: true, message: 'State required' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="pincode"
            label="Pincode"
            rules={[{ required: true, message: 'Pincode required' }]}
          >
            <InputNumber controls={false} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isDefault">
            <Radio.Group>
              <Radio value>Set as default address</Radio>
              <Radio value={false}>Do not set default</Radio>
            </Radio.Group>
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Delivery location is required before checkout. Use current location for best accuracy.
          </Typography.Text>
          <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
            <Button onClick={() => setAddressDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">{editingAddress ? 'Update' : 'Save'}</Button>
          </Space>
        </Form>
      </Drawer>

      <Modal
        title="Verify Your Email"
        open={verifyModalOpen}
        onCancel={() => setVerifyModalOpen(false)}
        footer={null}
        destroyOnClose={false}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          We have sent a 4-digit verification OTP to your email address: <strong>{profile?.email}</strong>.
          The OTP remains active for 30 minutes. You can close this popup and use the same OTP to verify later.
        </Typography.Paragraph>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            placeholder="Enter 4-digit OTP"
            maxLength={4}
            value={verifyOtpCode}
            onChange={(e) => setVerifyOtpCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ fontSize: 18, textAlign: 'center', letterSpacing: 4, height: 44 }}
            autoFocus
          />
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={handleSendVerifyOtp} loading={verifyLoading}>
              Resend OTP
            </Button>
            <Button
              type="primary"
              onClick={handleConfirmVerifyOtp}
              loading={verifyLoading}
              disabled={verifyOtpCode.length < 4}
            >
              Verify OTP
            </Button>
          </Space>
        </Space>
      </Modal>
    </div>
  );
}
