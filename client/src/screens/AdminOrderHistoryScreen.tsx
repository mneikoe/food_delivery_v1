import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { colors } from '../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface OrderItem {
  productId: {
    name: string;
    price: number;
  };
  quantity: number;
}

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
  items: OrderItem[];
  deliveryPartnerId?: {
    _id: string;
    name: string;
    phone: string;
  };
}

export default function AdminOrderHistoryScreen() {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELLED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY'>('ALL');

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/admin/orders');
      // Only keep completed/cancelled orders
      const completed = response.data.filter((o: Order) =>
        ['DELIVERED', 'CANCELLED'].includes(o.status)
      );
      setOrders(completed);
    } catch (error: any) {
      console.error('Failed to fetch admin order history:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to load order history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (statusFilter === 'DELIVERED' && o.status !== 'DELIVERED') return false;
    if (statusFilter === 'CANCELLED' && o.status !== 'CANCELLED') return false;

    // 2. Date Filter
    if (dateFilter !== 'ALL') {
      const orderDate = new Date(o.createdAt).toDateString();
      const today = new Date().toDateString();
      
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = yesterdayDate.toDateString();

      if (dateFilter === 'TODAY' && orderDate !== today) return false;
      if (dateFilter === 'YESTERDAY' && orderDate !== yesterday) return false;
    }

    return true;
  });

  const getStatusLabel = (status: string) => {
    return status === 'DELIVERED' ? 'Delivered' : 'Cancelled';
  };

  const getStatusColor = (status: string) => {
    return status === 'DELIVERED' ? '#10B981' : '#EF4444';
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => (navigation as any).navigate('OrderDetails', { orderId: item._id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{item.orderId}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Customer Info */}
      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={16} color={colors.muted} />
        <Text style={styles.infoText}>{item.userId?.name || 'Guest'}</Text>
        {item.userId?.phone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.userId.phone}`)}>
            <Ionicons name="call" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
      </View>

      {/* Items */}
      <View style={styles.itemsSection}>
        <Text style={styles.itemsHeader}>Items:</Text>
        {item.items.map((it, idx) => (
          <Text key={idx} style={styles.itemText}>
            • {it.productId?.name || 'Deleted Product'} x {it.quantity}
          </Text>
        ))}
      </View>

      {/* Rider Info if assigned */}
      {item.deliveryPartnerId && (
        <View style={styles.riderRow}>
          <Ionicons name="bicycle-outline" size={18} color={colors.muted} />
          <Text style={styles.riderText}>Delivered by: {item.deliveryPartnerId.name}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <Text style={styles.amountLabel}>Total Revenue Collected:</Text>
        <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Filters Pane */}
      <View style={styles.filterPane}>
        {/* Status filters */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.btnGroup}>
            {['ALL', 'DELIVERED', 'CANCELLED'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, statusFilter === f && styles.filterBtnActive]}
                onPress={() => setStatusFilter(f as any)}
              >
                <Text style={[styles.filterBtnText, statusFilter === f && styles.filterBtnTextActive]}>
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date filters */}
        <View style={[styles.filterRow, { marginTop: 8 }]}>
          <Text style={styles.filterLabel}>Date:</Text>
          <View style={styles.btnGroup}>
            {['ALL', 'TODAY', 'YESTERDAY'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, dateFilter === f && styles.filterBtnActive]}
                onPress={() => setDateFilter(f as any)}
              >
                <Text style={[styles.filterBtnText, dateFilter === f && styles.filterBtnTextActive]}>
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders matched filters</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterPane: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterBtnActive: {
    backgroundColor: '#10b981',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 6,
    fontWeight: '500',
  },
  itemsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  itemsHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  riderText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  amountLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
