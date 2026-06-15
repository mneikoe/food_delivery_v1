import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';

interface Order {
  _id: string;
  orderId: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
  };
  status: string;
  totalAmount: number;
  createdAt: string;
}

export default function AssignedOrdersScreen() {
  const navigation = useNavigation();
  const { user, token } = useAuth();
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/delivery/assigned-orders');
      setOrders(response.data);
    } catch (error: any) {
      console.error('Failed to fetch assigned orders:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  // Supabase realtime subscription
  useEffect(() => {
    if (!token || !user?._id || !supabase) return;

    const channel = supabase.channel(`delivery_${user._id}_orders`);

    channel.on('broadcast', { event: 'order_update' }, (payload) => {
      if (payload?.payload) {
        console.log('Order update received:', payload);
        fetchOrders();
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to delivery order updates');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Error subscribing to delivery order updates');
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [token, user?._id, fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
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

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('DeliveryOrderDetails' as never, { orderId: item._id } as never)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{item.orderId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>
      <Text style={styles.customerName}>Customer: {item.userId?.name || 'N/A'}</Text>
      <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>
      <Text style={styles.date}>
        {new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No assigned orders</Text>
          </View>
        }
      />
    </View>
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
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  customerName: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  date: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray,
  },
});
