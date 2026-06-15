import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface DeliveryAddress {
  addressDetails?: {
    address?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface Order {
  _id: string;
  orderId: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
  };
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function DeliveryOrderDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { orderId } = route.params as { orderId: string };
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    console.log('📦 Fetching delivery order details for:', orderId);
    try {
      // First try to find in assigned orders (active orders)
      const assignedResponse = await api.get(`/delivery/assigned-orders`);
      const assignedOrders = assignedResponse.data;
      let foundOrder = assignedOrders.find((o: Order) => o._id === orderId);
      
      // If not found, try delivery history (delivered orders)
      if (!foundOrder) {
        try {
          console.log('🔄 Not in assigned orders, checking delivery history...');
          const historyResponse = await api.get(`/delivery/delivery-history`);
          const historyOrders = historyResponse.data;
          foundOrder = historyOrders.find((o: Order) => o._id === orderId);
        } catch (historyError) {
          // If history fetch fails, continue with assigned orders result
          console.warn('Failed to fetch delivery history:', historyError);
        }
      }
      
      if (foundOrder) {
        console.log('✅ Order found');
        setOrder(foundOrder);
      } else {
        console.log('❌ Order not found in both assigned and history');
        // Don't immediately go back, let user retry
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch order details:', error);
      // Don't show alert immediately, let user pull-to-refresh
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Add useFocusEffect to refetch when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused, refetching delivery order details');
      setLoading(true);
      fetchOrderDetails();
    }, [fetchOrderDetails])
  );

  // Supabase realtime subscription
  useEffect(() => {
    if (!token || !user?._id || !supabase || !orderId) return;

    const channel = supabase.channel(`delivery_${user._id}_orders`);

    channel.on('broadcast', { event: 'order_update' }, (payload) => {
      if (payload?.payload?.orderId === orderId || payload?.payload?._id === orderId) {
        console.log('Order update received:', payload);
        fetchOrderDetails();
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to order updates');
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [token, user?._id, orderId, fetchOrderDetails]);

  const handleAcceptOrder = async () => {
    setActionLoading(true);
    try {
      await api.post(`/delivery/orders/${orderId}/accept`);
      showAlert('Success', 'Order accepted successfully');
      fetchOrderDetails();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    setActionLoading(true);
    try {
      await api.post(`/delivery/orders/${orderId}/status`, { status });
      showAlert('Success', 'Order status updated');
      fetchOrderDetails();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOTP = () => {
    navigation.navigate('OTPVerification' as never, { orderId } as never);
  };

  const openGoogleMaps = () => {
    const address = order?.deliveryAddress?.addressDetails;
    if (!address) {
      showAlert('Error', 'Address not available');
      return;
    }

    const lat = address.latitude;
    const lng = address.longitude;

    if (lat && lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url).catch(() => {
        showAlert('Error', 'Could not open Google Maps');
      });
    } else {
      // Fallback to address string
      const addressString = [
        address.address,
        address.suburb,
        address.city,
        address.state,
        address.country,
      ]
        .filter(Boolean)
        .join(', ');
      const encodedAddress = encodeURIComponent(addressString);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      Linking.openURL(url).catch(() => {
        showAlert('Error', 'Could not open Google Maps');
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED_TO_DELIVERY':
        return '#3B82F6';
      case 'PICKED_UP':
        return '#F59E0B';
      case 'OUT_FOR_DELIVERY':
        return '#8B5CF6';
      case 'ARRIVED_AT_LOCATION':
        return '#10B981';
      default:
        return colors.gray;
    }
  };

  const renderActionButton = () => {
    if (!order) return null;

    switch (order.status) {
      case 'ASSIGNED_TO_DELIVERY':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAcceptOrder}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading ? 'Processing...' : 'Accept Order'}
            </Text>
          </TouchableOpacity>
        );
      case 'PICKED_UP':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading ? 'Processing...' : 'Out for Delivery'}
            </Text>
          </TouchableOpacity>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => handleUpdateStatus('ARRIVED_AT_LOCATION')}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              {actionLoading ? 'Processing...' : 'Arrived at Location'}
            </Text>
          </TouchableOpacity>
        );
      case 'ARRIVED_AT_LOCATION':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.verifyButton]}
            onPress={handleVerifyOTP}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Verify OTP</Text>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Order not found</Text>
      </View>
    );
  }

  const address = order.deliveryAddress?.addressDetails;

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.orderId}>{order.orderId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <Text style={styles.detailText}>Name: {order.userId?.name || 'N/A'}</Text>
        <Text style={styles.detailText}>Phone: {order.userId?.phone || 'N/A'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <Text style={styles.addressText}>
          {address?.address || 'N/A'}
          {address?.suburb ? `, ${address.suburb}` : ''}
          {address?.city ? `, ${address.city}` : ''}
          {address?.state ? `, ${address.state}` : ''}
          {address?.country ? `, ${address.country}` : ''}
        </Text>
        <TouchableOpacity style={styles.mapButton} onPress={openGoogleMaps}>
          <Text style={styles.mapButtonText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemDetails}>
              <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{order.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>₹{order.deliveryFee.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{order.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      {renderActionButton()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: colors.white,
    padding: 16,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  mapButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.muted,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  actionButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  verifyButton: {
    backgroundColor: '#8B5CF6',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: colors.gray,
  },
});
