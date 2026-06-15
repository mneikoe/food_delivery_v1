import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function OffersScreen({ navigation }: any) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchOffers();
    }
  }, [token]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/offers');
      setOffers(response.data);
    } catch (error) {
      console.error('Failed to load offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferPress = (offer: any) => {
    if (offer.couponCode) {
      // Navigate to cart or show coupon code
      navigation.navigate('Cart');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offers</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Special Offers</Text>
        <View style={{ width: 24 }} />
      </View>

      {offers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyTitle}>No offers available</Text>
          <Text style={styles.emptySubtext}>
            Check back later for exciting deals!
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.offerCard}
              onPress={() => handleOfferPress(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.image }}
                style={styles.offerImage}
                resizeMode="cover"
              />
              <View style={styles.offerOverlay} />
              <View style={styles.offerContent}>
                <View style={styles.offerBadge}>
                  <Ionicons name="pricetag" size={16} color={colors.white} />
                  <Text style={styles.offerBadgeText}>{item.discountText}</Text>
                </View>
                <Text style={styles.offerTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.offerDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                {item.couponCode && (
                  <View style={styles.couponCodeContainer}>
                    <Text style={styles.couponCodeLabel}>Use Code:</Text>
                    <Text style={styles.couponCode}>{item.couponCode}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  offerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  offerImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.light,
  },
  offerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  offerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  offerBadgeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  offerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  offerDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  couponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  couponCodeLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  couponCode: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
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
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
});
