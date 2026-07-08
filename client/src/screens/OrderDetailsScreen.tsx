import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { supabase } from '../services/supabase';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Responsive scaling functions
const { width, height } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;

// For fonts - responsive font size
const responsiveFontSize = (size: number) => {
  const scaleFactor = width / guidelineBaseWidth;
  const scaledSize = size * scaleFactor;
  // Set min and max font sizes
  const maxFontSize = size * 1.2; // 20% larger on big screens
  const minFontSize = size * 0.9; // 10% smaller on small screens
  
  if (scaledSize > maxFontSize) return maxFontSize;
  if (scaledSize < minFontSize) return minFontSize;
  return scaledSize;
};

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

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const { token, user } = useAuth();
  const { showAlert } = useAlert();
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingProduct, setReviewingProduct] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [productReviews, setProductReviews] = useState<Record<string, any>>({});
  const windowDimensions = useWindowDimensions();
  const isPortrait = windowDimensions.height > windowDimensions.width;

  useEffect(() => {
    if (!token || !orderId || !user?._id) return;

    fetchOrderDetails();
    
    // Fetch existing reviews for products in this order
    if (order?.items && order.status === 'DELIVERED') {
      fetchProductReviews();
    }

    // Setup realtime subscription with error handling
    let channel: any = null;
    
    try {
      if (!supabase) {
        console.warn('Supabase client not available, realtime updates disabled');
        return;
      }

      channel = supabase.channel(`user_${user._id}_orders`);

      channel.on('broadcast', { event: 'order_update' }, (payload: any) => {
        try {
          if (payload?.payload?.orderId === orderId) {
            console.log('Order update received:', payload);
            fetchOrderDetails();
          }
        } catch (error) {
          console.error('Error handling order update:', error);
        }
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to order updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to order updates');
        }
      });

      // Cleanup subscription on unmount
      return () => {
        try {
          if (channel) {
            channel.unsubscribe();
          }
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up Supabase subscription:', error);
      return () => {}; // Return empty cleanup function
    }
  }, [token, orderId, user?._id]);

  // Add useFocusEffect to refetch when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (token && orderId) {
        console.log('🔄 Screen focused, refetching order details');
        fetchOrderDetails();
      }
    }, [token, orderId])
  );

  const fetchOrderDetails = async () => {
    if (!token || !orderId) return;
    
    setLoading(true);
    try {
      console.log('📦 Fetching order details for:', orderId);
      const endpoint = user?.role === 'ADMIN'
        ? `/admin/orders/${orderId}`
        : `/user/orders/${orderId}`;
      const response = await api.get(endpoint);
      console.log('✅ Order details fetched successfully');
      setOrder(response.data);
      
      // Fetch reviews if order is delivered and user is not admin
      if (response.data.status === 'DELIVERED' && response.data.items && user?.role !== 'ADMIN') {
        fetchProductReviews(response.data.items);
      }
    } catch (error: any) {
      console.error('❌ Failed to load order details:', error);
      // Don't show alert immediately, let user retry
      if (error.response?.status === 404) {
        console.log('🔄 Order not found, will retry on pull-to-refresh');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProductReviews = async (items?: any[]) => {
    if (!items && !order?.items) return;
    const orderItems = items || order.items;
    
    try {
      const reviewPromises = orderItems.map(async (item: any) => {
        const productId = item.productId?._id || item.productId;
        if (!productId) return null;
        
        try {
          const response = await api.get(`/user/products/${productId}/reviews`);
          const reviews = response.data || [];
          // Find review by current user for this order
          const userReview = reviews.find((r: any) => 
            r.userId._id === user?._id && r.orderId === orderId
          );
          return { productId, review: userReview };
        } catch (error) {
          return { productId, review: null };
        }
      });
      
      const results = await Promise.all(reviewPromises);
      const reviewsMap: Record<string, any> = {};
      results.forEach((result) => {
        if (result && result.review) {
          reviewsMap[result.productId] = result.review;
        }
      });
      setProductReviews(reviewsMap);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleSubmitReview = async (productId: string, orderId: string) => {
    if (!reviewRating) {
      showAlert('Error', 'Please select a rating');
      return;
    }

    setSubmittingReview(true);
    try {
      await api.post('/user/reviews', {
        productId,
        orderId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      
      // Update local state
      setProductReviews((prev) => ({
        ...prev,
        [productId]: {
          rating: reviewRating,
          comment: reviewComment.trim(),
        },
      }));
      
      setReviewingProduct(null);
      setReviewRating(5);
      setReviewComment('');
      showAlert('Success', 'Review submitted successfully');
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  };

  if (loading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  const orderStatusColor = getStatusColor(order.status);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        !isPortrait && styles.landscapeScrollContent
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Order Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.orderId}>{order.orderId}</Text>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: orderStatusColor + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: orderStatusColor }]}
          >
            {getStatusLabel(order.status)}
          </Text>
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.items?.map((item: any, index: number) => {
          const productId = item.productId?._id || item.productId;
          const hasReview = productReviews[productId];
          
          return (
            <View key={index} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={2}>{item.name}</Text>
                <Text style={[styles.orderItemPrice, { color: tokens.colors.primary }]}>₹{item.price}</Text>
              </View>
              <Text style={styles.orderItemQuantity}>
                Qty: {item.quantity} × ₹{item.price} = ₹{item.price * item.quantity}
              </Text>
              
              {/* Review Section for Delivered Orders */}
              {order.status === 'DELIVERED' && productId && (
                <View style={styles.reviewSection}>
                  {hasReview ? (
                    <View style={styles.reviewSubmitted}>
                      <View style={styles.reviewRatingDisplay}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= hasReview.rating ? 'star' : 'star-outline'}
                            size={16}
                            color="#FFD700"
                          />
                        ))}
                      </View>
                      {hasReview.comment && (
                        <Text style={styles.reviewCommentText}>{hasReview.comment}</Text>
                      )}
                      <Text style={[styles.reviewSubmittedText, { color: tokens.colors.primary }]}>Review submitted</Text>
                    </View>
                  ) : reviewingProduct === productId ? (
                    <View style={styles.reviewForm}>
                      <Text style={styles.reviewLabel}>Rate this product:</Text>
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setReviewRating(star)}
                          >
                            <Ionicons
                              name={star <= reviewRating ? 'star' : 'star-outline'}
                              size={28}
                              color="#FFD700"
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={styles.reviewInput}
                        placeholder="Write a review (optional)"
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        multiline
                        numberOfLines={3}
                        placeholderTextColor={colors.muted}
                      />
                      <View style={styles.reviewActions}>
                        <TouchableOpacity
                          style={styles.reviewCancelButton}
                          onPress={() => {
                            setReviewingProduct(null);
                            setReviewRating(5);
                            setReviewComment('');
                          }}
                        >
                          <Text style={styles.reviewCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.reviewSubmitButton, { backgroundColor: tokens.colors.primary }, submittingReview && styles.reviewSubmitButtonDisabled]}
                          onPress={() => handleSubmitReview(productId, order._id)}
                          disabled={submittingReview}
                        >
                          {submittingReview ? (
                            <ActivityIndicator size="small" color={tokens.colors.white} />
                          ) : (
                            <Text style={styles.reviewSubmitText}>Submit</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => setReviewingProduct(productId)}
                    >
                      <Ionicons name="star-outline" size={16} color={tokens.colors.primary} />
                      <Text style={[styles.reviewButtonText, { color: tokens.colors.primary }]}>Rate & Review</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Delivery Address */}
      {order.deliveryAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressContainer}>
            {order.deliveryAddress.addressDetails?.address && (
              <Text style={styles.addressText} numberOfLines={2}>
                {order.deliveryAddress.addressDetails.address}
              </Text>
            )}
            {order.deliveryAddress.addressDetails?.suburb && (
              <Text style={styles.addressText} numberOfLines={2}>
                {order.deliveryAddress.addressDetails.suburb}
              </Text>
            )}
            <Text style={styles.addressText} numberOfLines={2}>
              {order.deliveryAddress.addressDetails?.city}
              {order.deliveryAddress.addressDetails?.state
                ? `, ${order.deliveryAddress.addressDetails.state}`
                : ''}
              {order.deliveryAddress.addressDetails?.pincode
                ? ` - ${order.deliveryAddress.addressDetails.pincode}`
                : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Delivery OTP - Show when arrived at location */}
      {order.status === 'ARRIVED_AT_LOCATION' && order.deliveryOTP?.code && (
        <View style={styles.otpSection}>
          <View style={[styles.otpContainer, { backgroundColor: tokens.colors.primary }]}>
            <Ionicons 
              name="key-outline" 
              size={scale(32)} 
              color={tokens.colors.white} 
            />
            <Text style={styles.otpTitle}>Delivery OTP</Text>
            <Text style={styles.otpCode}>{order.deliveryOTP.code}</Text>
            <Text style={styles.otpInstruction}>
              Share this OTP with delivery partner to complete delivery
            </Text>
          </View>
        </View>
      )}

      {/* Delivery Partner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Partner</Text>
        {order.deliveryPartnerId ? (
          <View style={styles.partnerContainer}>
            <Ionicons 
              name="person" 
              size={scale(20)} 
              color={tokens.colors.primary} 
            />
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName} numberOfLines={1}>
                {order.deliveryPartnerId.name}
              </Text>
              {order.deliveryPartnerId.phone && (
                <View style={styles.partnerPhoneContainer}>
                  <Ionicons 
                    name="call-outline" 
                    size={scale(16)} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.partnerPhone} numberOfLines={1}>
                    {order.deliveryPartnerId.phone}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noPartnerContainer}>
            <Ionicons 
              name="time-outline" 
              size={scale(20)} 
              color={colors.muted} 
            />
            <Text style={styles.noPartnerText}>
              Delivery partner not assigned yet
            </Text>
          </View>
        )}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>₹{order.subtotal || 0}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>₹{order.deliveryFee || 0}</Text>
        </View>
        {order.discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>-₹{order.discount}</Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalValue, { color: tokens.colors.primary }]}>₹{order.totalAmount}</Text>
        </View>
      </View>

      {/* Payment Method */}
      {order.paymentMethod && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentContainer}>
            <Ionicons 
              name="cash-outline" 
              size={scale(20)} 
              color={tokens.colors.primary} 
            />
            <Text style={styles.paymentMethod}>
              {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const getStyles = (colors: any, tokens: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: 30,
  },
  scrollContent: {
    flexGrow: 1,
  },
  landscapeScrollContent: {
    paddingHorizontal: width > 600 ? scale(20) : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(32),
    backgroundColor: colors.background,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(18),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    padding: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: verticalScale(80),
  },
  headerLeft: {
    flex: 1,
    marginRight: scale(8),
  },
  orderId: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(20),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: scale(4),
    flexShrink: 1,
  },
  orderDate: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    padding: scale(16),
    marginTop: verticalScale(12),
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: verticalScale(12),
  },
  orderItem: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(4),
  },
  orderItemName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: scale(8),
  },
  orderItemPrice: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    flexShrink: 0,
  },
  orderItemQuantity: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
  },
  addressContainer: {
    gap: verticalScale(4),
  },
  addressText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textPrimary,
    lineHeight: scale(20),
  },
  partnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: scale(4),
  },
  partnerPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  partnerPhone: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    flex: 1,
  },
  noPartnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  noPartnerText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  summaryLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textSecondary,
  },
  summaryValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(14),
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  totalValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  paymentMethod: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(16),
    color: colors.textPrimary,
    fontWeight: '600',
  },
  otpSection: {
    margin: scale(16),
    marginBottom: 0,
  },
  otpContainer: {
    borderRadius: scale(16),
    padding: scale(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale(8),
    elevation: 5,
  },
  otpTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#fff',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  otpCode: {
    fontSize: responsiveFontSize(48),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: scale(8),
    marginVertical: verticalScale(16),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  otpInstruction: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginTop: verticalScale(8),
    paddingHorizontal: scale(8),
  },
  bottomSpacer: {
    height: verticalScale(24),
  },
  reviewSection: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: scale(20),
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  reviewForm: {
    marginTop: verticalScale(8),
    padding: scale(12),
    backgroundColor: colors.background,
    borderRadius: scale(12),
  },
  reviewLabel: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: verticalScale(8),
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  reviewInput: {
    backgroundColor: colors.surface,
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: responsiveFontSize(14),
    color: colors.textPrimary,
    minHeight: verticalScale(80),
    textAlignVertical: 'top',
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: scale(12),
    justifyContent: 'flex-end',
  },
  reviewCancelButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewCancelText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reviewSubmitButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
  },
  reviewSubmitButtonDisabled: {
    opacity: 0.6,
  },
  reviewSubmitText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#fff',
  },
  reviewSubmitted: {
    padding: scale(12),
    backgroundColor: colors.background,
    borderRadius: scale(8),
  },
  reviewRatingDisplay: {
    flexDirection: 'row',
    gap: scale(4),
    marginBottom: verticalScale(6),
  },
  reviewCommentText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: responsiveFontSize(14),
    color: colors.textPrimary,
    marginBottom: verticalScale(6),
    fontStyle: 'italic',
  },
  reviewSubmittedText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
  },
});