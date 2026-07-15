import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import RazorpayCheckout from 'react-native-razorpay';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useAlert } from '../context/AlertContext';
import { useResponsive } from '../hooks/useResponsive';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PhoneNumberModal from '../components/PhoneNumberModal';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { useCart } from '../context/CartContext';

export default function CartScreen({ navigation }: any) {
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);
  const { token, user, refreshUser } = useAuth();
  const { location } = useLocation();
  const { showAlert } = useAlert();
  const { horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const { refreshCart } = useCart();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [showCouponList, setShowCouponList] = useState(true);
  const [hasPlacedOrder, setHasPlacedOrder] = useState(false);
  const [coins, setCoins] = useState(0);
  const [redeemCoins, setRedeemCoins] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [fetchingAddresses, setFetchingAddresses] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'preparing' | 'connecting' | 'launching'>('idle');
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const logAnalyticsEvent = (event: string, params?: any) => {
    console.log(`[Analytics] Track Event: "${event}"`, params || '');
  };

  const [orderWindow, setOrderWindow] = useState<any>(null);

  const checkOrderWindowStatus = async () => {
    try {
      const [windowRes, paymentRes] = await Promise.all([
        api.get('/public/order-window'),
        api.get('/public/payment-channels')
      ]);
      
      const windowData = windowRes.data;
      const paymentData = paymentRes.data;
      
      // Combine for state compatibility
      setOrderWindow({
        ...windowData,
        codActive: paymentData.codActive !== false,
        onlineActive: paymentData.onlineActive !== false
      });
      
      if (paymentData) {
        if (paymentData.codActive === false && paymentMethod === 'COD') {
          setPaymentMethod('RAZORPAY');
        } else if (paymentData.onlineActive === false && paymentMethod === 'RAZORPAY') {
          setPaymentMethod('COD');
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings in Mobile client:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCart();
      fetchAvailableCoupons();
      checkOrderHistory();
      fetchCoins();
      fetchAddresses();
      checkPendingOrder();
      checkOrderWindowStatus();
    }
  }, [token]);

  // Refresh cart when screen comes into focus (e.g., after adding items)
  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchCart();
        fetchCoins();
        fetchAddresses();
        checkPendingOrder();
        checkOrderWindowStatus();
      }
    }, [token])
  );

  const fetchCoins = async () => {
    try {
      const response = await api.get('/user/profile');
      if (response.data && typeof response.data.coins === 'number') {
        setCoins(response.data.coins);
      }
    } catch (error) {
      console.error('Failed to load coins in Cart:', error);
    }
  };

  const fetchAddresses = async () => {
    setFetchingAddresses(true);
    try {
      const response = await api.get('/user/addresses');
      const addrList = response.data || [];
      setAddresses(addrList);
      
      if (addrList.length > 0) {
        const defaultAddr = addrList.find((a: any) => a.isDefault) || addrList[0];
        setSelectedAddressId(defaultAddr._id);
      } else {
        await autoCreateAddress();
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setFetchingAddresses(false);
    }
  };

  const checkPendingOrder = async () => {
    try {
      const response = await api.get('/user/orders');
      const pending = response.data.find((o: any) => o.paymentStatus === 'PENDING' && o.status !== 'CANCELLED');
      if (pending) {
        setPendingOrder(pending);
        logAnalyticsEvent('pending_order_found', { orderId: pending._id });
      } else {
        setPendingOrder(null);
      }
    } catch (error) {
      console.error('Failed to check pending orders:', error);
    }
  };

  const handleResumePayment = async (order: any) => {
    setPlacingOrder(true);
    setCheckoutStep('connecting');
    logAnalyticsEvent('pending_order_resumed', { orderId: order._id });
    try {
      const rzpRes = await api.post('/payment/create-order', { orderId: order._id });
      const { razorpayOrderId, amount, currency, keyId, prefill } = rzpRes.data;

      setCheckoutStep('launching');
      await new Promise<void>(resolve => setTimeout(() => resolve(), 800));

      const options = {
        description: 'Food Order Payment',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1600&auto=format&fit=crop',
        currency: currency,
        key: keyId,
        amount: amount,
        name: 'Chatora Adda',
        order_id: razorpayOrderId,
        prefill: {
          email: prefill.email || user?.email || '',
          contact: prefill.contact || user?.phone || '',
          name: prefill.name || user?.name || ''
        },
        theme: { color: '#FF6B35' }
      };

      logAnalyticsEvent('payment_sdk_opened', { orderId: order._id, amount });

      RazorpayCheckout.open(options).then(async (data: any) => {
        try {
          setCheckoutStep('idle');
          setPlacingOrder(true);
          await api.post('/payment/verify', {
            orderId: order._id,
            razorpayOrderId: data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature
          });

          if (refreshUser) {
            await refreshUser();
          }
          fetchCoins();

          setCart(null);
          setAppliedCoupon(null);
          setCouponCode('');
          setPendingOrder(null);

          setSuccessOrderId(order.orderId || order._id);
          setShowSuccessOverlay(true);
          logAnalyticsEvent('payment_success', { orderId: order._id });
        } catch (verifyError: any) {
          logAnalyticsEvent('payment_failed', { orderId: order._id, error: 'verification_failed' });
          setPaymentError(verifyError.response?.data?.error || 'Payment verification failed. Please contact support.');
        } finally {
          setPlacingOrder(false);
          setCheckoutStep('idle');
        }
      }).catch((err: any) => {
        logAnalyticsEvent('payment_cancelled', { orderId: order._id });
        setPaymentError('Your payment was cancelled. You can retry it using the banner or My Orders screen.');
        setPlacingOrder(false);
        setCheckoutStep('idle');
      });
    } catch (error: any) {
      logAnalyticsEvent('payment_failed', { orderId: order._id, error: error.message });
      setPaymentError(error.response?.data?.error || 'Failed to resume payment session');
      setPlacingOrder(false);
      setCheckoutStep('idle');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await api.post(`/user/orders/${orderId}/cancel`);
      logAnalyticsEvent('payment_cancelled', { orderId });
      setPendingOrder(null);
      fetchCoins();
      showAlert('Order Cancelled', 'The pending order has been successfully cancelled and any redeemed coins refunded.');
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to cancel the pending order');
    }
  };

  const extractPincode = (addressText: string) => {
    const match = addressText.match(/\b[1-9][0-9]{5}\b/);
    return match ? match[0] : '452001';
  };

  const autoCreateAddress = async () => {
    if (!location || !location.address || !location.city) {
      return null;
    }
    try {
      const profileRes = await api.get('/user/profile');
      const lat = profileRes.data.location?.latitude || 22.7196;
      const lng = profileRes.data.location?.longitude || 75.8577;
      
      const fullAddressStr = formatAddress();
      const pincode = extractPincode(fullAddressStr);

      const newAddressData = {
        title: 'Current Location',
        addressLine1: location.address || 'Street address not resolved',
        addressLine2: location.suburb || '',
        city: location.city || 'Unknown City',
        state: location.state || 'Unknown State',
        pincode: pincode,
        coordinates: {
          lat: lat,
          lng: lng
        },
        isDefault: true
      };

      const response = await api.post('/user/addresses', newAddressData);
      if (response.data && response.data._id) {
        setAddresses([response.data]);
        setSelectedAddressId(response.data._id);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to auto-create default address:', error);
    }
    return null;
  };

  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const updateOrderPreview = async () => {
    if (!cart || cart.items.length === 0) return;
    setLoadingPreview(true);
    try {
      const response = await api.post('/user/orders/preview', {
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        redeemCoins: redeemCoins,
      });
      setPreviewData(response.data);
    } catch (err) {
      console.error('Failed to update order preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    updateOrderPreview();
  }, [cart?.subtotal, appliedCoupon, redeemCoins]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/cart');
      const cartData = response.data;
      setCart(cartData);
      // Sync global CartContext so FloatingCartButton reflects real state
      refreshCart();
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      const response = await api.get('/user/coupons');
      setAvailableCoupons(response.data);
      // If no coupons returned, user has already placed an order
      setHasPlacedOrder(response.data.length === 0);
    } catch (error) {
      console.error('Failed to load coupons:', error);
    }
  };

  const checkOrderHistory = async () => {
    try {
      const response = await api.get('/user/orders');
      // Check if user has any non-cancelled orders
      const hasOrders = response.data.some((order: any) => order.status !== 'CANCELLED');
      setHasPlacedOrder(hasOrders);
    } catch (error) {
      console.error('Failed to check order history:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCart();
    await fetchAvailableCoupons();
    await fetchAddresses();
    await checkPendingOrder();
    await checkOrderWindowStatus();
    setRefreshing(false);
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      const response = await api.put(`/user/cart/items/${itemId}`, {
        quantity: newQuantity,
      });
      setCart(response.data);
      
      // Sync global CartContext immediately
      refreshCart();
      
      // Clear applied coupon when cart items change
      if (appliedCoupon) {
        setAppliedCoupon(null);
        setCouponCode('');
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to update quantity');
    }
  };

  const validateCoupon = async (code?: string) => {
    const codeToValidate = code || couponCode.trim();
    
    if (!codeToValidate) {
      showAlert('Error', 'Please enter a coupon code');
      return;
    }

    setValidatingCoupon(true);
    try {
      const response = await api.post('/user/coupons/validate', {
        code: codeToValidate.toUpperCase(),
        orderAmount: cart.subtotal,
      });
      
      setAppliedCoupon(response.data);
      setCouponCode(response.data.code);
      setShowCouponList(false);
      showAlert('Success', `Coupon applied! You saved ₹${response.data.discount.toFixed(2)}`);
    } catch (error: any) {
      showAlert('Invalid Coupon', error.response?.data?.error || 'Failed to validate coupon');
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setShowCouponList(true);
  };

  const applyCouponFromList = (code: string) => {
    setCouponCode(code);
    validateCoupon(code);
  };

  const handlePlaceOrder = async () => {
    // Check phone number
    if (!user?.phone || user.phone.trim() === '') {
      setShowPhoneModal(true);
      return;
    }

    // Check location
    if (!location?.address || !location?.city) {
      showAlert(
        'Location Required',
        'Please enable location to place order. Go to Profile to update your location.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    if (!cart || cart.items.length === 0) {
      showAlert('Error', 'Your cart is empty');
      return;
    }

    // Double-click protection lock
    if (placingOrder) return;

    setPlacingOrder(true);
    setCheckoutStep('preparing');
    logAnalyticsEvent('checkout_started', { paymentMethod, amount: total });

    try {
      let finalAddressId = selectedAddressId;
      if (!finalAddressId) {
        const autoAddr = await autoCreateAddress();
        if (autoAddr && autoAddr._id) {
          finalAddressId = autoAddr._id;
        } else {
          showAlert('Address Error', 'Failed to resolve your delivery address. Please enable location permissions or set it in Profile.');
          setPlacingOrder(false);
          setCheckoutStep('idle');
          return;
        }
      }

      const orderData: any = {
        addressId: finalAddressId,
        paymentMethod,
        redeemCoins: redeemCoins,
      };

      // Add coupon code if applied
      if (appliedCoupon) {
        orderData.couponCode = appliedCoupon.code;
      }

      const response = await api.post('/user/orders', orderData);
      const orderId = response.data._id || response.data.order?._id;
      const displayOrderId = response.data.orderId || response.data.order?.orderId || orderId;
      logAnalyticsEvent('order_created', { orderId });

      if (paymentMethod === 'RAZORPAY') {
        setCheckoutStep('connecting');
        const rzpRes = await api.post('/payment/create-order', { orderId });
        const { razorpayOrderId, amount, currency, keyId, prefill } = rzpRes.data;
        logAnalyticsEvent('payment_order_created', { orderId, razorpayOrderId });

        setCheckoutStep('launching');
        await new Promise<void>(resolve => setTimeout(() => resolve(), 800));

        const options = {
          description: 'Food Order Payment',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1600&auto=format&fit=crop',
          currency: currency,
          key: keyId,
          amount: amount,
          name: 'Chatora Adda',
          order_id: razorpayOrderId,
          prefill: {
            email: prefill.email || user?.email || '',
            contact: prefill.contact || user?.phone || '',
            name: prefill.name || user?.name || ''
          },
          theme: { color: '#10b981' }
        };

        logAnalyticsEvent('payment_sdk_opened', { orderId, amount });

        RazorpayCheckout.open(options).then(async (data: any) => {
          try {
            setCheckoutStep('idle');
            setPlacingOrder(true);
            await api.post('/payment/verify', {
              orderId,
              razorpayOrderId: data.razorpay_order_id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature
            });

            if (refreshUser) {
              await refreshUser();
            }
            fetchCoins();

            setCart(null);
            setAppliedCoupon(null);
            setCouponCode('');
            setPendingOrder(null);

            setSuccessOrderId(displayOrderId);
            setShowSuccessOverlay(true);
            logAnalyticsEvent('payment_success', { orderId });
          } catch (verifyError: any) {
            logAnalyticsEvent('payment_failed', { orderId, error: 'verification_failed' });
            setPaymentError(verifyError.response?.data?.error || 'Payment verification failed. Please contact support.');
          } finally {
            setPlacingOrder(false);
            setCheckoutStep('idle');
          }
        }).catch((err: any) => {
          logAnalyticsEvent('payment_cancelled', { orderId });
          checkPendingOrder();
          setPaymentError('Your payment was cancelled. You can retry it using the banner or My Orders screen.');
          setPlacingOrder(false);
          setCheckoutStep('idle');
        });
      } else {
        if (refreshUser) {
          await refreshUser();
        }
        fetchCoins();

        setCart(null);
        setAppliedCoupon(null);
        setCouponCode('');
        setPendingOrder(null);
        
        setSuccessOrderId(displayOrderId);
        setShowSuccessOverlay(true);
        logAnalyticsEvent('payment_success', { orderId, paymentMethod: 'COD' });
        setPlacingOrder(false);
        setCheckoutStep('idle');
      }
    } catch (error: any) {
      setPlacingOrder(false);
      setCheckoutStep('idle');
      logAnalyticsEvent('payment_failed', { error: error.message });
      const errorMessage = error.response?.data?.error || 'Failed to place order';
      if (errorMessage.includes('phone')) {
        setShowPhoneModal(true);
      } else {
        setPaymentError(errorMessage);
      }
    }
  };

  const handlePhoneSaved = async () => {
    // Refresh user profile to get updated phone number
    if (refreshUser) {
      await refreshUser();
    }
  };

  const formatAddress = () => {
    if (!location) return 'Location not available';
    
    const parts = [];
    if (location.address) parts.push(location.address);
    if (location.suburb) parts.push(location.suburb);
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    
    return parts.length > 0 ? parts.join(', ') : 'Location not available';
  };

  const renderCartItem = ({ item }: any) => {
    const itemId = item._id || item.productId;
    return (
      <View style={styles.cartItem}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.placeholderImage, { backgroundColor: colors.background }]}>
            <Ionicons name="image-outline" size={32} color={colors.muted} />
          </View>
        )}
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateQuantity(itemId, item.quantity - 1)}
            >
              <Ionicons name="remove" size={18} color={tokens.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateQuantity(itemId, item.quantity + 1)}
            >
              <Ionicons name="add" size={18} color={tokens.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.itemTotal}>
          <Text style={styles.itemTotalText}>
            ₹{item.price * item.quantity}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color={colors.muted} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deliveryFee = 28;
  const discount = appliedCoupon ? Math.ceil(appliedCoupon.discount) : 0;
  const subtotalWithFee = (cart.subtotal || 0) + deliveryFee;
  const tax = Math.ceil(subtotalWithFee * 0.05); // 5% tax

  const localCoinDiscount = redeemCoins ? Math.ceil(Math.floor(coins / 100) * 10) : 0;
  const coinDiscount = previewData ? previewData.coinDiscount : localCoinDiscount;
  const total = previewData ? previewData.totalAmount : Math.ceil(Math.max(0, subtotalWithFee - discount - coinDiscount + tax));
  const canPlaceOrder = location?.address && location?.city;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollViewContent, { paddingHorizontal: horizontalPadding, paddingBottom: 110 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <ResponsiveContainer noPadding>
        {/* Pending Order Recovery Card */}
        {pendingOrder && (
          <View style={styles.recoveryCard}>
            <View style={styles.recoveryHeader}>
              <Ionicons name="warning" size={20} color="#eab308" />
              <Text style={styles.recoveryTitle}>Pending Payment Found</Text>
            </View>
            <Text style={styles.recoveryText}>
              You have an unpaid pending order of <Text style={{ fontWeight: 'bold' }}>₹{pendingOrder.totalAmount}</Text>. Please complete this payment or cancel it.
            </Text>
            <View style={styles.recoveryActions}>
              <TouchableOpacity
                style={styles.resumeBtn}
                onPress={() => handleResumePayment(pendingOrder)}
                disabled={placingOrder}
              >
                <Text style={styles.resumeBtnText}>Continue Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelOrder(pendingOrder._id)}
                disabled={placingOrder}
              >
                <Text style={styles.cancelBtnText}>Cancel Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Delivery Address Section */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={20} color={tokens.colors.primary} />
            <Text style={styles.addressTitle}>Delivery Address</Text>
          </View>
          {fetchingAddresses ? (
            <ActivityIndicator size="small" color={tokens.colors.primary} style={{ marginVertical: 12 }} />
          ) : addresses.length > 0 ? (
            <View style={styles.addressesContainer}>
              {addresses.map((addr: any) => (
                <TouchableOpacity
                  key={addr._id}
                  style={[
                    styles.addressItem,
                    selectedAddressId === addr._id && styles.addressItemActive
                  ]}
                  onPress={() => setSelectedAddressId(addr._id)}
                >
                  <View style={styles.addressItemLeft}>
                    <Ionicons 
                      name={selectedAddressId === addr._id ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={selectedAddressId === addr._id ? tokens.colors.primary : colors.muted} 
                    />
                    <View style={styles.addressTextContainer}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.addressTitleText}>{addr.title}</Text>
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.addressTextDetail}>
                        {addr.addressLine1}, {addr.addressLine2 ? `${addr.addressLine2}, ` : ''}{addr.city}, {addr.state} - {addr.pincode}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noAddressContainer}>
              <Text style={styles.addressText}>{formatAddress()}</Text>
              <TouchableOpacity 
                style={styles.autoCreateBtn}
                onPress={autoCreateAddress}
              >
                <Ionicons name="add-circle-outline" size={16} color={tokens.colors.primary} />
                <Text style={styles.autoCreateBtnText}>Use Current Location</Text>
              </TouchableOpacity>
            </View>
          )}
          {!canPlaceOrder && (
            <View style={styles.locationWarning}>
              <Ionicons name="warning-outline" size={16} color="#FF6B6B" />
              <Text style={styles.locationWarningText}>
                Location required to place order
              </Text>
            </View>
          )}
        </View>

        {/* Cart Items */}
        <View style={styles.list}>
          {cart.items.map((item: any, index: number) => {
            const itemId = item._id || item.productId || `item-${index}`;
            return (
              <View key={itemId}>
                {renderCartItem({ item })}
              </View>
            );
          })}
        </View>

        {/* Redeem Coins Toggle Checkbox (Moved to ScrollView) */}
        {coins >= 100 && (
          <TouchableOpacity
            style={styles.redeemCoinsCard}
            onPress={() => setRedeemCoins(!redeemCoins)}
          >
            <View style={styles.redeemLeft}>
              <Ionicons
                name={redeemCoins ? "checkbox" : "square-outline"}
                size={22}
                color={tokens.colors.primary}
              />
              <View>
                <Text style={styles.redeemLabelText}>Redeem Chatora Coins</Text>
                <Text style={styles.redeemCoinsSub}>Save ₹{Math.floor(coins / 100) * 10} on this order</Text>
              </View>
            </View>
            <Text style={styles.coinsBalanceText}>Balance: 🪙{coins}</Text>
          </TouchableOpacity>
        )}

        {/* Payment Method Selector */}
        <View style={styles.paymentSectionContainer}>
          <View style={styles.paymentSelectorHeader}>
            <Ionicons name="card-outline" size={20} color={tokens.colors.primary} />
            <Text style={styles.paymentSelectorTitle}>Select Payment Method</Text>
          </View>
          <View style={styles.paymentSelectorRow}>
            {(!orderWindow || orderWindow.codActive !== false) && (
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'COD' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setPaymentMethod('COD')}
              >
                <Ionicons
                  name="cash"
                  size={22}
                  color={paymentMethod === 'COD' ? tokens.colors.primary : colors.muted}
                />
                <View style={styles.paymentOptionDetails}>
                  <Text
                    style={[
                      styles.paymentOptionLabel,
                      paymentMethod === 'COD' && styles.paymentOptionLabelActive,
                    ]}
                  >
                    Cash on Delivery
                  </Text>
                  <Text style={styles.paymentOptionSub}>Pay cash at your doorstep</Text>
                </View>
                {paymentMethod === 'COD' && (
                  <Ionicons name="checkmark-circle" size={18} color={tokens.colors.primary} />
                )}
              </TouchableOpacity>
            )}

            {(!orderWindow || orderWindow.onlineActive !== false) && (
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'RAZORPAY' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setPaymentMethod('RAZORPAY')}
              >
                <Ionicons
                  name="card"
                  size={22}
                  color={paymentMethod === 'RAZORPAY' ? tokens.colors.primary : colors.muted}
                />
                <View style={styles.paymentOptionDetails}>
                  <Text
                    style={[
                      styles.paymentOptionLabel,
                      paymentMethod === 'RAZORPAY' && styles.paymentOptionLabelActive,
                    ]}
                  >
                    Pay Online
                  </Text>
                  <Text style={styles.paymentOptionSub}>UPI, Cards, Netbanking</Text>
                </View>
                {paymentMethod === 'RAZORPAY' && (
                  <Ionicons name="checkmark-circle" size={18} color={tokens.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Coupon Section - Only show for first-time users */}
        {!hasPlacedOrder && (
          <View style={styles.couponSection}>
            <View style={styles.couponHeader}>
              <Ionicons name="pricetag" size={20} color={tokens.colors.primary} />
              <Text style={styles.couponTitle}>Apply Coupon (First Order Only)</Text>
            </View>
          
          {!appliedCoupon ? (
            <>
              <View style={styles.couponInputContainer}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor={colors.muted}
                  value={couponCode}
                  onChangeText={(text) => setCouponCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  editable={!validatingCoupon}
                />
                <TouchableOpacity
                  style={[
                    styles.applyCouponButton,
                    validatingCoupon && styles.applyCouponButtonDisabled,
                  ]}
                  onPress={() => validateCoupon()}
                  disabled={validatingCoupon}
                >
                  {validatingCoupon ? (
                    <ActivityIndicator size="small" color={tokens.colors.white} />
                  ) : (
                    <Text style={styles.applyCouponText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Available Coupons List */}
              {availableCoupons.length > 0 && (
                <View style={styles.availableCouponsContainer}>
                  <TouchableOpacity 
                    style={styles.availableCouponsToggle}
                    onPress={() => setShowCouponList(!showCouponList)}
                  >
                    <Text style={styles.availableCouponsToggleText}>
                      {availableCoupons.length} coupon{availableCoupons.length > 1 ? 's' : ''} available
                    </Text>
                    <Ionicons 
                      name={showCouponList ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={tokens.colors.primary} 
                    />
                  </TouchableOpacity>

                  {showCouponList && (
                    <View style={styles.couponsList}>
                      {availableCoupons.map((coupon: any) => (
                        <TouchableOpacity
                          key={coupon._id}
                          style={styles.couponCard}
                          onPress={() => applyCouponFromList(coupon.code)}
                          disabled={validatingCoupon}
                        >
                          <View style={styles.couponCardLeft}>
                            <View style={styles.couponBadge}>
                              <Ionicons name="gift" size={16} color={tokens.colors.white} />
                            </View>
                            <View style={styles.couponCardDetails}>
                              <Text style={styles.couponCardCode}>{coupon.code}</Text>
                              <Text style={styles.couponCardDiscount}>
                                {coupon.discountType === 'PERCENTAGE' 
                                  ? `${coupon.discountValue}% OFF` 
                                  : `₹${coupon.discountValue} OFF`}
                                {coupon.maxDiscount && coupon.discountType === 'PERCENTAGE' && 
                                  ` (Max ₹${coupon.maxDiscount})`}
                              </Text>
                              {coupon.minOrderValue > 0 && (
                                <Text style={styles.couponCardMinOrder}>
                                  Min order: ₹{coupon.minOrderValue}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.couponCardRight}>
                            <Text style={styles.couponCardApply}>APPLY</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.appliedCouponContainer}>
              <View style={styles.appliedCouponLeft}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.appliedCouponInfo}>
                  <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
                  <Text style={styles.appliedCouponSavings}>
                    You saved ₹{appliedCoupon.discount.toFixed(2)}!
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={removeCoupon}>
                <Ionicons name="close-circle" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        {/* Bill Details / Summary (Moved to ScrollView) */}
        <View style={styles.billDetailsContainer}>
          <Text style={styles.billDetailsTitle}>Bill Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{cart.subtotal || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{deliveryFee}</Text>
          </View>
          {appliedCoupon && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Discount ({appliedCoupon.code})
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -₹{appliedCoupon.discount.toFixed(2)}
              </Text>
            </View>
          )}
          {coinDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Coins Redeemed
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -₹{coinDiscount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxes & Charges (5%)</Text>
            <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
        </View>

        </ResponsiveContainer>
      </ScrollView>

      {/* Slim & Premium Sticky Bottom Bar */}
      <View style={[styles.checkoutFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerPriceContainer}>
          <Text style={styles.footerPriceValue}>₹{total.toFixed(2)}</Text>
          <Text style={styles.footerPriceLabel}>Total Payable ({paymentMethod === 'COD' ? 'COD' : 'Online'})</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.checkoutButton,
            (!canPlaceOrder || placingOrder) && styles.checkoutButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={!canPlaceOrder || placingOrder}
        >
          {placingOrder ? (
            <ActivityIndicator color={tokens.colors.white} size="small" />
          ) : (
            <View style={styles.checkoutBtnContent}>
              <Text style={styles.checkoutButtonText}>
                {paymentMethod === 'RAZORPAY' ? 'PAY ONLINE' : 'PLACE ORDER'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={tokens.colors.white} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Phone Number Modal */}
      <PhoneNumberModal
        visible={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={handlePhoneSaved}
      />

      {/* Premium Step Loader Overlay */}
      <Modal transparent visible={checkoutStep !== 'idle'} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.loaderCard}>
            <Text style={styles.loaderTitle}>Securing Your Order</Text>
            
            <View style={styles.stepContainer}>
              {/* Step 1 */}
              <View style={styles.stepRow}>
                {checkoutStep === 'preparing' ? (
                  <ActivityIndicator size="small" color={tokens.colors.primary} />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color={tokens.colors.primary} />
                )}
                <Text style={[styles.stepText, checkoutStep === 'preparing' && styles.stepTextActive]}>
                  Preparing Order
                </Text>
              </View>

              {/* Step 2 */}
              <View style={styles.stepRow}>
                {checkoutStep === 'connecting' ? (
                  <ActivityIndicator size="small" color={tokens.colors.primary} />
                ) : (
                  <Ionicons 
                    name={checkoutStep === 'preparing' ? "ellipse-outline" : "checkmark-circle"} 
                    size={20} 
                    color={checkoutStep === 'preparing' ? colors.muted : tokens.colors.primary} 
                  />
                )}
                <Text style={[
                  styles.stepText, 
                  checkoutStep === 'connecting' && styles.stepTextActive,
                  checkoutStep === 'preparing' && styles.stepTextDisabled
                ]}>
                  Connecting Secure Payment Gateway
                </Text>
              </View>

              {/* Step 3 */}
              <View style={styles.stepRow}>
                {(checkoutStep as string) === 'launching' ? (
                  <ActivityIndicator size="small" color={tokens.colors.primary} />
                ) : (
                  <Ionicons 
                    name={(checkoutStep as string) === 'launching' ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={(checkoutStep as string) === 'launching' ? tokens.colors.primary : colors.muted} 
                  />
                )}
                <Text style={[
                  styles.stepText, 
                  (checkoutStep as string) === 'launching' && styles.stepTextActive,
                  ((checkoutStep as string) === 'preparing' || (checkoutStep as string) === 'connecting') && styles.stepTextDisabled
                ]}>
                  Opening UPI & Payment Apps
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Overlay Screen */}
      <Modal transparent visible={showSuccessOverlay} animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={48} color={tokens.colors.white} />
            </View>
            <Text style={styles.successTitle}>Order Confirmed!</Text>
            <Text style={styles.successSub}>Thank you for your order.</Text>
            
            <View style={styles.successDetailsCard}>
              <Text style={styles.successDetailsLabel}>Order Number</Text>
              <Text style={styles.successDetailsValue}>#{successOrderId}</Text>
              
              <View style={styles.successDetailsDivider} />
              
              <Text style={styles.successDetailsLabel}>Estimated Delivery Time</Text>
              <Text style={styles.successDetailsValue}>35 - 45 Mins</Text>
            </View>

            <TouchableOpacity
              style={styles.successPrimaryBtn}
              onPress={() => {
                setShowSuccessOverlay(false);
                navigation.navigate('Orders');
              }}
            >
              <Text style={styles.successPrimaryBtnText}>Track Order</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondaryBtn}
              onPress={() => {
                setShowSuccessOverlay(false);
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.successSecondaryBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Failure Overlay Screen */}
      <Modal transparent visible={paymentError !== null} animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.errorCardContainer}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="alert-circle" size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorCardTitle}>Payment Status</Text>
            <Text style={styles.errorCardMsg}>{paymentError}</Text>

            {pendingOrder ? (
              <TouchableOpacity
                style={styles.errorResumeBtn}
                onPress={() => {
                  setPaymentError(null);
                  handleResumePayment(pendingOrder);
                }}
              >
                <Text style={styles.errorResumeBtnText}>Retry / Resume Payment</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.errorCloseBtn}
              onPress={() => {
                setPaymentError(null);
              }}
            >
              <Text style={styles.errorCloseBtnText}>Return to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (themeColors: any, originalTokens: any, isDark: boolean = false) => {
  const bg = themeColors.background;
  const surface = themeColors.surface;
  const border = themeColors.border;
  const text = themeColors.textPrimary;
  const muted = themeColors.textSecondary;
  const primary = originalTokens.colors.primary;
  const white = originalTokens.colors.white;

  const tokens = {
    ...originalTokens,
    typography: {
      ...originalTokens.typography,
      fontFamily: originalTokens.typography.fonts.regular,
    }
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bg,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      backgroundColor: bg,
    },
    emptyText: {
      fontSize: 18,
      color: muted,
      fontFamily: tokens.typography.fontFamily,
      marginTop: 16,
      marginBottom: 24,
    },
    shopButton: {
      backgroundColor: primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    shopButtonText: {
      color: white,
      fontSize: 16,
      fontFamily: tokens.typography.fontFamily,
      fontWeight: '700',
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 320,
    },
    addressSection: {
      backgroundColor: surface,
      padding: 16,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: border,
    },
    addressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    addressTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    addressText: {
      fontSize: 14,
      color: text,
      lineHeight: 20,
      marginLeft: 28,
      fontFamily: tokens.typography.fontFamily,
    },
    locationWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      marginLeft: 28,
    },
    locationWarningText: {
      fontSize: 12,
      color: '#FF6B6B',
    },
    list: {
      padding: 16,
      paddingBottom: 12,
    },
    couponSection: {
      backgroundColor: surface,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
    },
    couponHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    couponTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    couponInputContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    couponInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 14,
      color: text,
      backgroundColor: bg,
      fontFamily: tokens.typography.fontFamily,
    },
    applyCouponButton: {
      backgroundColor: primary,
      paddingHorizontal: 20,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
    },
    applyCouponButtonDisabled: {
      opacity: 0.6,
    },
    applyCouponText: {
      color: white,
      fontSize: 14,
      fontWeight: '700',
      fontFamily: tokens.typography.fontFamily,
    },
    appliedCouponContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(22, 163, 74, 0.4)' : '#86efac',
    },
    appliedCouponLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    appliedCouponInfo: {
      flex: 1,
    },
    appliedCouponCode: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#4ade80' : '#16a34a',
      marginBottom: 2,
      fontFamily: tokens.typography.fontFamily,
    },
    appliedCouponSavings: {
      fontSize: 13,
      color: isDark ? '#a7f3d0' : '#15803d',
      fontFamily: tokens.typography.fontFamily,
    },
    availableCouponsContainer: {
      marginTop: 16,
    },
    availableCouponsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    availableCouponsToggleText: {
      fontSize: 14,
      fontWeight: '600',
      color: primary,
      fontFamily: tokens.typography.fontFamily,
    },
    couponsList: {
      marginTop: 8,
      gap: 10,
    },
    couponCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: bg,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: border,
      borderStyle: 'dashed',
    },
    couponCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    couponBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    couponCardDetails: {
      flex: 1,
    },
    couponCardCode: {
      fontSize: 15,
      fontWeight: '700',
      color: text,
      marginBottom: 2,
      fontFamily: tokens.typography.fontFamily,
    },
    couponCardDiscount: {
      fontSize: 13,
      fontWeight: '600',
      color: primary,
      marginBottom: 2,
      fontFamily: tokens.typography.fontFamily,
    },
    couponCardMinOrder: {
      fontSize: 11,
      color: muted,
      fontFamily: tokens.typography.fontFamily,
    },
    couponCardRight: {
      paddingLeft: 12,
    },
    couponCardApply: {
      fontSize: 13,
      fontWeight: '700',
      color: primary,
      textDecorationLine: 'underline',
      fontFamily: tokens.typography.fontFamily,
    },
    cartItem: {
      flexDirection: 'row',
      backgroundColor: surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: border,
      shadowColor: isDark ? '#000000' : '#E2E8F0',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: bg,
    },
    placeholderImage: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemDetails: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'space-between',
    },
    itemName: {
      fontSize: 16,
      fontWeight: '700',
      color: text,
      marginBottom: 4,
      fontFamily: tokens.typography.fontFamily,
    },
    itemPrice: {
      fontSize: 14,
      color: primary,
      fontWeight: '600',
      marginBottom: 8,
      fontFamily: tokens.typography.fontFamily,
    },
    quantityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    quantityButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: surface,
    },
    quantityText: {
      fontSize: 16,
      fontWeight: '700',
      color: text,
      minWidth: 24,
      textAlign: 'center',
      fontFamily: tokens.typography.fontFamily,
    },
    itemTotal: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    itemTotalText: {
      fontSize: 18,
      fontWeight: '800',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: surface,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: border,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    summary: {
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: muted,
      fontFamily: tokens.typography.fontFamily,
    },
    summaryValue: {
      fontSize: 14,
      color: text,
      fontWeight: '600',
      fontFamily: tokens.typography.fontFamily,
    },
    discountLabel: {
      color: '#16a34a',
      fontFamily: tokens.typography.fontFamily,
    },
    discountValue: {
      color: '#16a34a',
      fontWeight: '700',
      fontFamily: tokens.typography.fontFamily,
    },
    totalRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: border,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: '800',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: '800',
      color: primary,
      fontFamily: tokens.typography.fontFamily,
    },
    paymentSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: bg,
      borderRadius: 8,
    },
    paymentText: {
      fontSize: 14,
      color: muted,
      fontWeight: '600',
      fontFamily: tokens.typography.fontFamily,
    },
    placeOrderButton: {
      backgroundColor: primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    redeemCoinsCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
      shadowColor: isDark ? '#000000' : '#E2E8F0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    redeemCoinsSub: {
      fontSize: 11,
      color: muted,
      marginTop: 2,
      fontFamily: tokens.typography.fontFamily,
    },
    redeemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    redeemLabelText: {
      fontSize: 13,
      fontWeight: '700',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    coinsBalanceText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FF9800',
      fontFamily: tokens.typography.fontFamily,
    },
    billDetailsContainer: {
      backgroundColor: surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
      shadowColor: isDark ? '#000000' : '#E2E8F0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    billDetailsTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: text,
      marginBottom: 14,
      fontFamily: tokens.typography.fontFamily,
    },
    checkoutFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: surface,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: border,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerPriceContainer: {
      flexDirection: 'column',
    },
    footerPriceLabel: {
      fontSize: 10,
      color: muted,
      fontWeight: '700',
      textTransform: 'uppercase',
      fontFamily: tokens.typography.fontFamily,
    },
    footerPriceValue: {
      fontSize: 20,
      fontWeight: '900',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    checkoutButton: {
      backgroundColor: primary,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 140,
      shadowColor: primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    checkoutButtonDisabled: {
      opacity: 0.5,
      backgroundColor: muted,
      shadowOpacity: 0,
      elevation: 0,
    },
    checkoutButtonText: {
      color: white,
      fontSize: 15,
      fontWeight: '800',
      fontFamily: tokens.typography.fontFamily,
    },
    checkoutBtnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    paymentSectionContainer: {
      backgroundColor: surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: border,
      shadowColor: isDark ? '#000000' : '#E2E8F0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    paymentSelectorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    paymentSelectorTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    paymentSelectorRow: {
      gap: 12,
    },
    paymentOptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: border,
      backgroundColor: surface,
      gap: 12,
    },
    paymentOptionCardActive: {
      borderColor: primary,
      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4',
    },
    paymentOptionDetails: {
      flex: 1,
    },
    paymentOptionLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    paymentOptionLabelActive: {
      color: isDark ? '#4ade80' : '#16a34a',
    },
    paymentOptionSub: {
      fontSize: 11,
      color: muted,
      marginTop: 2,
      fontFamily: tokens.typography.fontFamily,
    },
    addressesContainer: {
      marginTop: 8,
      gap: 8,
    },
    addressItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: surface,
    },
    addressItemActive: {
      borderColor: primary,
      backgroundColor: isDark ? 'rgba(22, 163, 74, 0.1)' : '#f0fdf4',
    },
    addressItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    addressTextContainer: {
      flex: 1,
    },
    addressTitleText: {
      fontSize: 14,
      fontWeight: '700',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    addressTextDetail: {
      fontSize: 12,
      color: muted,
      marginTop: 2,
      lineHeight: 16,
      fontFamily: tokens.typography.fontFamily,
    },
    defaultBadge: {
      backgroundColor: isDark ? 'rgba(255, 107, 53, 0.2)' : primary + '15',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    defaultBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: primary,
      fontFamily: tokens.typography.fontFamily,
    },
    noAddressContainer: {
      gap: 8,
    },
    autoCreateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: primary,
      alignSelf: 'flex-start',
      marginLeft: 28,
    },
    autoCreateBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: primary,
      fontFamily: tokens.typography.fontFamily,
    },
    recoveryCard: {
      backgroundColor: isDark ? '#3b2506' : '#fffbeb',
      borderColor: isDark ? '#78350f' : '#fef3c7',
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 12,
    },
    recoveryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    recoveryTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: isDark ? '#fbbf24' : '#92400e',
      fontFamily: tokens.typography.fontFamily,
    },
    recoveryText: {
      fontSize: 13,
      color: isDark ? '#fef3c7' : '#78350f',
      lineHeight: 18,
      marginBottom: 12,
      fontFamily: tokens.typography.fontFamily,
    },
    recoveryActions: {
      flexDirection: 'row',
      gap: 12,
    },
    resumeBtn: {
      backgroundColor: '#d97706',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      flex: 1,
      alignItems: 'center',
    },
    resumeBtnText: {
      color: white,
      fontWeight: '700',
      fontSize: 13,
      fontFamily: tokens.typography.fontFamily,
    },
    cancelBtn: {
      backgroundColor: 'transparent',
      borderColor: isDark ? '#fbbf24' : '#b45309',
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      flex: 1,
      alignItems: 'center',
    },
    cancelBtnText: {
      color: isDark ? '#fbbf24' : '#b45309',
      fontWeight: '700',
      fontSize: 13,
      fontFamily: tokens.typography.fontFamily,
    },
    modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loaderCard: {
      backgroundColor: surface,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 10,
      borderWidth: 1,
      borderColor: border,
    },
    loaderTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: text,
      marginBottom: 20,
      fontFamily: tokens.typography.fontFamily,
    },
    stepContainer: {
      width: '100%',
      gap: 16,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepText: {
      fontSize: 14,
      color: text,
      fontWeight: '600',
      fontFamily: tokens.typography.fontFamily,
    },
    stepTextActive: {
      color: primary,
      fontWeight: '700',
      fontFamily: tokens.typography.fontFamily,
    },
    stepTextDisabled: {
      color: muted,
      fontFamily: tokens.typography.fontFamily,
    },
    successCard: {
      backgroundColor: surface,
      borderRadius: 28,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 10,
      borderWidth: 1,
      borderColor: border,
    },
    successIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: text,
      marginBottom: 6,
      fontFamily: tokens.typography.fontFamily,
    },
    successSub: {
      fontSize: 14,
      color: muted,
      marginBottom: 24,
      fontFamily: tokens.typography.fontFamily,
    },
    successDetailsCard: {
      width: '100%',
      backgroundColor: bg,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    successDetailsLabel: {
      fontSize: 11,
      color: muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
      fontFamily: tokens.typography.fontFamily,
    },
    successDetailsValue: {
      fontSize: 16,
      fontWeight: '700',
      color: text,
      fontFamily: tokens.typography.fontFamily,
    },
    successDetailsDivider: {
      height: 1,
      backgroundColor: border,
      marginVertical: 12,
    },
    successPrimaryBtn: {
      backgroundColor: primary,
      paddingVertical: 14,
      borderRadius: 14,
      width: '100%',
      alignItems: 'center',
      marginBottom: 12,
    },
    successPrimaryBtnText: {
      color: white,
      fontWeight: '800',
      fontSize: 15,
      fontFamily: tokens.typography.fontFamily,
    },
    successSecondaryBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: primary,
      paddingVertical: 14,
      borderRadius: 14,
      width: '100%',
      alignItems: 'center',
    },
    successSecondaryBtnText: {
      color: primary,
      fontWeight: '800',
      fontSize: 15,
      fontFamily: tokens.typography.fontFamily,
    },
    errorCardContainer: {
      backgroundColor: surface,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 10,
      borderWidth: 1,
      borderColor: border,
    },
    errorIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    errorCardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: text,
      marginBottom: 10,
      fontFamily: tokens.typography.fontFamily,
    },
    errorCardMsg: {
      fontSize: 14,
      color: muted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
      fontFamily: tokens.typography.fontFamily,
    },
    errorResumeBtn: {
      backgroundColor: '#d97706',
      paddingVertical: 14,
      borderRadius: 14,
      width: '100%',
      alignItems: 'center',
      marginBottom: 12,
    },
    errorResumeBtnText: {
      color: white,
      fontWeight: '800',
      fontSize: 15,
      fontFamily: tokens.typography.fontFamily,
    },
    errorCloseBtn: {
      backgroundColor: bg,
      paddingVertical: 14,
      borderRadius: 14,
      width: '100%',
      alignItems: 'center',
    },
    errorCloseBtnText: {
      color: text,
      fontWeight: '800',
      fontSize: 15,
      fontFamily: tokens.typography.fontFamily,
    },
  });
};
