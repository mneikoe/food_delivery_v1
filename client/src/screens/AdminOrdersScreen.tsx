import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { colors } from '../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

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

interface Rider {
  _id: string;
  name: string;
  phone: string;
}

export default function AdminOrdersScreen() {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'PREPARING' | 'DISPATCHED'>('ALL');

  // Rider assignment modal
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api.get('/admin/orders');
      // Filter out completed/cancelled orders to only show active ones
      const active = response.data.filter((o: Order) =>
        !['DELIVERED', 'CANCELLED'].includes(o.status)
      );
      setOrders(active);
    } catch (error: any) {
      console.error('Failed to fetch admin orders:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to load active orders');
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

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      setLoading(true);
      await api.put(`/admin/orders/${orderId}/status`, { status });
      showAlert('Success', `Order status updated to ${status.replace(/_/g, ' ')}`);
      fetchOrders();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to update order status');
      setLoading(false);
    }
  };

  const openRiderModal = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setRiderModalVisible(true);
    setLoadingRiders(true);
    try {
      const response = await api.get('/admin/delivery-partners/available');
      setRiders(response.data);
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to fetch available delivery partners');
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleAssignRider = async (riderId: string) => {
    if (!selectedOrderId) return;
    try {
      setLoading(true);
      await api.post(`/admin/orders/${selectedOrderId}/assign-delivery`, { deliveryPartnerId: riderId });
      showAlert('Success', 'Delivery partner assigned successfully');
      setRiderModalVisible(false);
      fetchOrders();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to assign rider');
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'NEW') return o.status === 'CREATED';
    if (activeTab === 'PREPARING') return o.status === 'ACCEPTED_BY_ADMIN';
    if (activeTab === 'DISPATCHED') {
      return ['ASSIGNED_TO_DELIVERY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_LOCATION', 'OTP_VERIFIED'].includes(o.status);
    }
    return true;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CREATED': return 'New Order';
      case 'ACCEPTED_BY_ADMIN': return 'Preparing';
      case 'ASSIGNED_TO_DELIVERY': return 'Rider Assigned';
      case 'PICKED_UP': return 'Order Picked Up';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'ARRIVED_AT_LOCATION': return 'Arrived at Location';
      case 'OTP_VERIFIED': return 'OTP Verified';
      default: return status.replace(/_/g, ' ');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CREATED': return '#F59E0B';
      case 'ACCEPTED_BY_ADMIN': return '#3B82F6';
      case 'ASSIGNED_TO_DELIVERY': return '#8B5CF6';
      case 'OUT_FOR_DELIVERY': return '#6366F1';
      case 'ARRIVED_AT_LOCATION': return '#10B981';
      default: return '#64748B';
    }
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
            {new Date(item.createdAt).toLocaleTimeString('en-IN', {
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
        <View style={styles.riderBox}>
          <Text style={styles.riderTitle}>Delivery Partner Assigned:</Text>
          <View style={styles.riderRow}>
            <Ionicons name="bicycle-outline" size={18} color={colors.muted} />
            <Text style={styles.riderName}>{item.deliveryPartnerId.name}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.deliveryPartnerId?.phone}`)}>
              <Ionicons name="call-outline" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <Text style={styles.amount}>Total: ₹{item.totalAmount.toFixed(2)}</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        {item.status === 'CREATED' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelBtn, { flex: 1 }]}
              onPress={() => handleUpdateStatus(item._id, 'CANCELLED')}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryBtn, { flex: 1 }]}
              onPress={() => handleUpdateStatus(item._id, 'ACCEPTED_BY_ADMIN')}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'ACCEPTED_BY_ADMIN' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryBtn, { width: '100%' }]}
            onPress={() => openRiderModal(item._id)}
          >
            <Text style={styles.btnText}>Assign Delivery Rider</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Tab Selectors */}
      <View style={styles.tabContainer}>
        {['ALL', 'NEW', 'PREPARING', 'DISPATCHED'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
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
              <Text style={styles.emptyText}>No active orders in this tab</Text>
            </View>
          }
        />
      )}

      {/* Rider Assignment Modal */}
      <Modal
        visible={riderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRiderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Delivery Partner</Text>
              <TouchableOpacity onPress={() => setRiderModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingRiders ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : riders.length === 0 ? (
              <Text style={styles.noRidersText}>No available delivery partners online</Text>
            ) : (
              <ScrollView style={styles.ridersList}>
                {riders.map((rider) => (
                  <TouchableOpacity
                    key={rider._id}
                    style={styles.riderListItem}
                    onPress={() => handleAssignRider(rider._id)}
                  >
                    <View style={styles.riderAvatar}>
                      <Ionicons name="bicycle" size={20} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riderListName}>{rider.name}</Text>
                      <Text style={styles.riderListPhone}>{rider.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
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
  riderBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  riderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 4,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14532d',
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#10b981',
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  noRidersText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 32,
  },
  ridersList: {
    marginBottom: 16,
  },
  riderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  riderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  riderListName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  riderListPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
