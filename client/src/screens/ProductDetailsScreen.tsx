import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProductDetailsScreen({ route }: any) {
  const { item } = route.params;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { showAlert } = useAlert();
  const navigation = useNavigation();
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Use isVeg directly from backend data
  const isVeg = item.isVeg !== undefined ? item.isVeg : true;

  useEffect(() => {
    if (token && item._id) {
      fetchReviews();
    }
  }, [token, item._id]);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await api.get(`/user/products/${item._id}/reviews`);
      const reviewsData = response.data || [];
      setReviews(reviewsData);
      
      if (reviewsData.length > 0) {
        const sum = reviewsData.reduce((acc: number, review: any) => acc + review.rating, 0);
        setAverageRating(sum / reviewsData.length);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const increaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    if (!token) {
      showAlert('Error', 'Please login to add items to cart');
      return;
    }

    if (!item._id) {
      showAlert('Error', 'Product information is missing');
      return;
    }

    setAddingToCart(true);
    try {
      await api.post('/user/cart/items', {
        productId: item._id,
        quantity: quantity,
      });
      
      showAlert(
        'Success',
        `${quantity} ${item.name} added to cart`,
        [
          {
            text: 'Continue Shopping',
            style: 'cancel',
            onPress: () => setQuantity(1),
          },
          {
            text: 'View Cart',
            onPress: () => {
              setQuantity(1);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [
                    { 
                      name: 'App',
                      state: {
                        routes: [{ name: 'Cart' }],
                        index: 0,
                      }
                    },
                  ],
                })
              );
            },
          },
        ]
      );
      
    } catch (error: any) {
      showAlert(
        'Error',
        error.response?.data?.error || 'Failed to add item to cart'
      );
    } finally {
      setAddingToCart(false);
    }
  };

  const totalPrice = (item.price * quantity).toFixed(2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ 
              uri: item.image || 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=2064'
            }} 
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Top Navigation Buttons */}
        <View style={[styles.topNav, { top: insets.top }]}>
          <TouchableOpacity style={styles.navButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View style={styles.contentWrapper}>
          {/* Badge & Title Card */}
          <View style={styles.titleCard}>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, isVeg ? styles.vegBadge : styles.nonVegBadge]}>
                <View style={[styles.badgeIcon, isVeg ? styles.vegIcon : styles.nonVegIcon]}>
                  {isVeg ? (
                    <Ionicons name="leaf" size={12} color="#00a868" />
                  ) : (
                    <Text style={styles.nonVegIconText}>•</Text>
                  )}
                </View>
                <Text style={[styles.badgeText, isVeg ? styles.vegText : styles.nonVegText]}>
                  {isVeg ? 'Veg' : 'Non-Veg'}
                </Text>
              </View>
            
              {item.preparationTime && (
                <View style={[styles.badge, styles.prepTimeBadge]}>
                  <Ionicons name="time-outline" size={12} color={tokens.colors.primary} />
                  <Text style={[styles.prepTimeBadgeText, { color: tokens.colors.primary }]}>{item.preparationTime} mins</Text>
                </View>
              )}
            </View>

            <Text style={styles.productTitle}>{item.name}</Text>
            
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: tokens.colors.primary }]}>₹{item.price}</Text>
              {item.originalPrice && (
                <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
              )}
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About this dish</Text>
            <Text style={styles.description}>
              {item.description || 'Freshly sourced ingredients prepared by our master chefs. Each dish is crafted with care and attention to detail, ensuring a memorable dining experience.'}
            </Text>
          </View>

          {/* Reviews Section */}
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
            
            {loadingReviews ? (
              <View style={styles.reviewsLoading}>
                <ActivityIndicator size="small" color={tokens.colors.primary} />
              </View>
            ) : reviews.length > 0 ? (
              <>
                <View style={styles.ratingSummary}>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= Math.round(averageRating) ? 'star' : 'star-outline'}
                        size={20}
                        color="#FFD700"
                      />
                    ))}
                  </View>
                  <Text style={styles.averageRating}>
                    {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reviewsScroll}
                  contentContainerStyle={styles.reviewsList}
                >
                  {reviews.map((review: any, index: number) => (
                    <View key={index} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={[styles.reviewUserAvatar, { backgroundColor: colors.background }]}>
                          <Text style={[styles.reviewUserInitial, { color: tokens.colors.primary }]}>
                            {review.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={styles.reviewUserInfo}>
                          <Text style={styles.reviewUserName}>
                            {review.userId?.name || 'Anonymous'}
                          </Text>
                          <View style={styles.reviewRating}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= review.rating ? 'star' : 'star-outline'}
                                size={14}
                                color="#FFD700"
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      {review.comment && (
                        <Text style={styles.reviewComment} numberOfLines={3}>
                          {review.comment}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : (
              <View style={styles.noReviews}>
                <Ionicons name="star-outline" size={32} color={colors.muted} />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
                <Text style={styles.noReviewsSubtext}>Be the first to review this product</Text>
              </View>
            )}
          </View>

          {/* Spacer for bottom action bar */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.actionBarContent}>
          {/* Quantity Selector */}
          <View style={styles.quantitySelector}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={decreaseQuantity}
              disabled={quantity <= 1}
            >
              <Ionicons 
                name="remove" 
                size={20} 
                color={quantity <= 1 ? colors.muted : tokens.colors.primary} 
              />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={increaseQuantity}
            >
              <Ionicons name="add" size={20} color={tokens.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity 
            style={[styles.addToCartButton, addingToCart && styles.addToCartButtonDisabled]}
            onPress={handleAddToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color={tokens.colors.white} />
            ) : (
              <>
                <Text style={styles.addToCartText}>Add to Cart</Text>
                <Text style={styles.addToCartSeparator}>•</Text>
                <Text style={styles.addToCartPrice}>₹{totalPrice}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, tokens: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroContainer: {
    width: '100%',
    height: width * 1.25,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentWrapper: {
    paddingHorizontal: 24,
    marginTop: -40,
  },
  titleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 32,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  vegBadge: {
    backgroundColor: 'rgba(0, 168, 104, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 104, 0.3)',
  },
  nonVegBadge: {
    backgroundColor: 'rgba(143, 140, 130, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(143, 140, 130, 0.3)',
  },
  prepTimeBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  badgeIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegIcon: {
    backgroundColor: '#00a868',
  },
  nonVegIcon: {
    backgroundColor: '#8f8c82',
  },
  nonVegIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  vegText: {
    color: '#00a868',
  },
  nonVegText: {
    color: '#8f8c82',
  },
  prepTimeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  productTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 34,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 28,
    fontWeight: '800',
  },
  originalPrice: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  descriptionSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  description: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  reviewsSection: {
    marginBottom: 24,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
  },
  averageRating: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reviewsScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    width: width * 0.7,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginRight: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reviewUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewUserInitial: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  reviewsLoading: {
    padding: 40,
    alignItems: 'center',
  },
  noReviews: {
    alignItems: 'center',
    padding: 40,
  },
  noReviewsText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  noReviewsSubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomSpacer: {
    height: 120,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  actionBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 4,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    height: 48,
    backgroundColor: tokens.colors.primary,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.white,
  },
  addToCartSeparator: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  addToCartPrice: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.white,
  },
  addToCartButtonDisabled: {
    opacity: 0.7,
  },
});