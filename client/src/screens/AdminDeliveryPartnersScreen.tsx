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
  TextInput,
  Switch,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/api';
import { useAlert } from '../context/AlertContext';
import { colors } from '../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Partner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  stats?: {
    totalAssigned: number;
    totalDelivered: number;
  };
  orders?: {
    _id: string;
    orderId: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    actualDeliveryTime?: string;
  }[];
}

export default function AdminDeliveryPartnersScreen() {
  const { showAlert } = useAlert();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expandedPartners, setExpandedPartners] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  // Add Partner Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPartners = useCallback(async () => {
    try {
      const response = await api.get('/admin/delivery-partners');
      setPartners(response.data);
    } catch (error: any) {
      console.error('Failed to fetch delivery partners:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to load delivery partners');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      fetchPartners();
    }, [fetchPartners])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPartners();
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await api.patch(`/admin/delivery-partners/${id}/status`, { isActive: newStatus });
      setPartners((prev) =>
        prev.map((p) => (p._id === id ? { ...p, isActive: newStatus } : p))
      );
      showAlert('Success', `Delivery partner status updated to ${newStatus ? 'Active' : 'Inactive'}`);
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to toggle status');
    }
  };

  const handleSendOtp = async () => {
    if (!name.trim()) {
      showAlert('ValidationError', 'Name is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showAlert('ValidationError', 'Please enter a valid email address');
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      showAlert('ValidationError', 'Phone number must be exactly 10 digits');
      return;
    }
    setSubmitting(true);
    try {
      // Use existing endpoint to send OTP
      await api.post('/auth/send-email-otp', { email: email.trim().toLowerCase() });
      showAlert('Success', 'Verification OTP sent to rider\'s email address');
      setStep(2);
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to send verification email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPartner = async () => {
    if (!otp.trim()) {
      showAlert('ValidationError', 'Verification OTP is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/admin/delivery-partners/verify', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        otp: otp.trim(),
      });
      showAlert('Success', 'Delivery partner registered and verified successfully');
      setModalVisible(false);
      setName('');
      setEmail('');
      setPhone('');
      setOtp('');
      setStep(1);
      fetchPartners();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to verify and register rider');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setName('');
    setEmail('');
    setPhone('');
    setOtp('');
    setStep(1);
  };

  const toggleExpandPartner = (id: string) => {
    setExpandedPartners(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderPartnerCard = ({ item }: { item: Partner }) => {
    const isExpanded = expandedPartners[item._id] || false;
    const hasOrders = item.orders && item.orders.length > 0;

    return (
      <View style={styles.partnerCard}>
        <View style={styles.partnerInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerName}>{item.name}</Text>
            <Text style={styles.partnerEmail}>{item.email}</Text>
            {item.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)} style={styles.phoneRow}>
                <Ionicons name="call" size={14} color={colors.primary} />
                <Text style={styles.partnerPhone}>{item.phone}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.noPhone}>No phone number</Text>
            )}
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Assigned Orders</Text>
            <Text style={styles.statValue}>{item.stats?.totalAssigned || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Delivered</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{item.stats?.totalDelivered || 0}</Text>
          </View>
        </View>

        {/* Expandable Order List */}
        {hasOrders && (
          <TouchableOpacity 
            style={styles.expandToggle} 
            onPress={() => toggleExpandPartner(item._id)}
          >
            <Text style={styles.expandToggleText}>
              {isExpanded ? 'Hide Order History' : `Show Order History (${item.orders?.length})`}
            </Text>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        )}

        {isExpanded && hasOrders && (
          <View style={styles.ordersListContainer}>
            {item.orders?.map((ord) => (
              <View key={ord._id} style={styles.orderListItem}>
                <View style={styles.orderItemHeader}>
                  <Text style={styles.orderItemCode}>{ord.orderId}</Text>
                  <Text style={[
                    styles.orderItemStatus,
                    { color: ord.status === 'DELIVERED' ? '#10B981' : ord.status === 'CANCELLED' ? '#EF4444' : '#3B82F6' }
                  ]}>
                    {ord.status.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={styles.orderItemDate}>
                  Assigned: {new Date(ord.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {ord.actualDeliveryTime && (
                  <Text style={styles.orderItemDeliveryDate}>
                    Delivered: {new Date(ord.actualDeliveryTime).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                )}
                <Text style={styles.orderItemAmt}>Amount: ₹{ord.totalAmount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.statusLabelContainer}>
            <View style={[styles.indicator, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.statusLabelText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleStatus(item._id, item.isActive)}
            trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
            thumbColor={item.isActive ? '#10b981' : '#64748b'}
          />
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      {/* Header action panel */}
      <View style={styles.headerPanel}>
        <Text style={styles.panelTitle}>Riders Directory</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="person-add" size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Rider</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={partners}
          keyExtractor={(item) => item._id}
          renderItem={renderPartnerCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No delivery partners registered</Text>
            </View>
          }
        />
      )}

      {/* Add Partner Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Delivery Rider</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              {step === 1 ? (
                <>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    placeholderTextColor="#94a3b8"
                  />

                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="Enter email address"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(txt) => setPhone(txt.replace(/\D/g, ''))}
                    keyboardType="phone-pad"
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#94a3b8"
                    maxLength={10}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleSendOtp}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Send Verification OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.readOnlyContainer}>
                    <Text style={styles.readOnlyLabel}>Registering Rider:</Text>
                    <Text style={styles.readOnlyValue}>{name} ({email})</Text>
                  </View>

                  <Text style={styles.inputLabel}>Enter 6-Digit OTP</Text>
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    placeholder="Enter OTP code sent to rider"
                    placeholderTextColor="#94a3b8"
                    maxLength={6}
                  />

                  <TouchableOpacity
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                    onPress={handleAddPartner}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitBtnText}>Verify & Register</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => setStep(1)}
                    disabled={submitting}
                  >
                    <Text style={styles.backBtnText}>Edit Rider Info</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
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
  headerPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  partnerCard: {
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
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  partnerEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  partnerPhone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  noPhone: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  form: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  readOnlyContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  readOnlyValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
    marginTop: 2,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  backBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#a7f3d0',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    gap: 4,
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  ordersListContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderListItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderItemCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderItemStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderItemDate: {
    fontSize: 11,
    color: '#64748b',
  },
  orderItemDeliveryDate: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 1,
  },
  orderItemAmt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
});

