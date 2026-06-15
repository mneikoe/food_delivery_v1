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
import { useAlert } from '../context/AlertContext';
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
  actualDeliveryTime?: string;
}

export default function OrderHistoryScreen() {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeliveredOrders = useCallback(async () => {
    try {
      const response = await api.get('/delivery/delivery-history');
      setOrders(response.data);
    } catch (error: any) {
      console.error('Failed to fetch order history:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to load order history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDeliveredOrders();
    }, [fetchDeliveredOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveredOrders();
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('DeliveryOrderDetails' as never, { orderId: item._id } as never)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{item.orderId}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>DELIVERED</Text>
        </View>
      </View>
      <Text style={styles.customerName}>Customer: {item.userId?.name || 'N/A'}</Text>
      <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>
      {item.actualDeliveryTime && (
        <Text style={styles.date}>
          Delivered: {new Date(item.actualDeliveryTime).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      )}
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
            <Text style={styles.emptyText}>No delivery history</Text>
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
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
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
