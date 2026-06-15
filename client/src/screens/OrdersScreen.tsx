import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'DELIVERED':
      return '#10B981';
    case 'CANCELLED':
      return '#EF4444';
    case 'CREATED':
      return '#6B7280';
    case 'ACCEPTED_BY_ADMIN':
    case 'ASSIGNED_TO_DELIVERY':
      return '#3B82F6';
    case 'PICKED_UP':
      return '#F59E0B';
    case 'OUT_FOR_DELIVERY':
    case 'ARRIVED_AT_LOCATION':
      return '#8B5CF6';
    default:
      return '#FF6B35';
  }
};

const getStatusLabel = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function OrdersScreen({ navigation }: any) {
  const { token } = useAuth();
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await api.get('/user/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleViewDetails = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const renderOrderItem = ({ item }: any) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleViewDetails(item._id)}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderHeaderLeft}>
            <Text style={styles.orderId}>Order #{item.orderId}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '15' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: statusColor }]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.orderDetails}>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Items:</Text>
            <Text style={styles.orderValue}>{item.items?.length || 0}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>Total Amount:</Text>
            <Text style={[styles.orderTotal, { color: tokens.colors.primary }]}>₹{item.totalAmount}</Text>
          </View>
        </View>
        <View style={styles.orderFooter}>
          <Text style={[styles.viewDetailsText, { color: tokens.colors.primary }]}>View Details</Text>
          <Ionicons name="chevron-forward" size={20} color={tokens.colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={64} color={colors.muted} />
        <Text style={styles.emptyText}>No orders yet</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const getStyles = (colors: any, tokens: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  shopButtonText: {
    color: tokens.colors.white,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  orderDate: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  orderValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  orderTotal: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '800',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewDetailsText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});
