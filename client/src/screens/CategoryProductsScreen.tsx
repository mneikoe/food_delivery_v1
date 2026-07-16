import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchItemCard from '../components/SearchItemCard';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useCart } from '../context/CartContext';

export default function CategoryProductsScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useTheme();
  const { showAlert } = useAlert();
  const { refreshCart } = useCart();
  const styles = getStyles(colors, tokens);
  
  const categoryId = route?.params?.categoryId;
  const categoryName = route?.params?.categoryName;
  const categoryImage = route?.params?.categoryImage;
  const [categoryDescription, setCategoryDescription] = useState(route?.params?.categoryDescription || '');
  const [products, setProducts] = useState<any[]>([]);
  const [otherProducts, setOtherProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchOtherProducts();
    }
  }, [token, categoryId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/products', {
        params: { categoryId: categoryId },
      });
      setProducts(response.data || []);
      
      // Also get category description if missing
      if (!categoryDescription) {
        const catRes = await api.get('/user/categories');
        const currentCat = (catRes.data || []).find((c: any) => c._id === categoryId);
        if (currentCat) {
          setCategoryDescription(currentCat.description || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch category products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherProducts = async () => {
    try {
      const response = await api.get('/user/products');
      const allProds = response.data || [];
      const filtered = allProds.filter((p: any) => {
        const prodCatId = p.categoryId?._id || p.categoryId;
        return prodCatId !== categoryId;
      });
      setOtherProducts(filtered);
    } catch (error) {
      console.error('Failed to load other products:', error);
    }
  };

  const handleProductPress = (item: any) => {
    navigation.navigate('ProductDetails', { item });
  };

  const handleAddToCart = async (product: any) => {
    try {
      await api.post('/user/cart/items', { productId: product._id, quantity: 1 });
      refreshCart();
      showAlert('Success', `${product.name} added to cart!`);
    } catch (err: any) {
      showAlert('Error', err?.response?.data?.error || 'Failed to add item to cart');
    }
  };

  const renderFooter = () => {
    if (otherProducts.length === 0) return null;
    return (
      <View style={styles.footerSection}>
        <Text style={styles.footerTitle}>Explore Other Delicious Dishes</Text>
        <FlatList
          horizontal
          data={otherProducts}
          keyExtractor={(item) => 'other_' + item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          renderItem={({ item }) => (
            <View style={styles.otherCard}>
              <TouchableOpacity onPress={() => handleProductPress(item)} activeOpacity={0.9}>
                <Image
                  source={item.image ? { uri: item.image } : require('../assets/placeholder.png')}
                  style={styles.otherImage}
                />
              </TouchableOpacity>
              <View style={styles.otherInfo}>
                <Text style={styles.otherName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.otherPrice}>₹{item.price}</Text>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => handleProductPress(item)}
                >
                  <Text style={styles.viewBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER WITH CATEGORY IMAGE BACKGROUND */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) }]}>
        <ImageBackground
          source={
            categoryImage
              ? { uri: categoryImage }
              : require('../assets/placeholder.png')
          }
          style={styles.headerBackground}
          imageStyle={styles.headerImageStyle}
          resizeMode="cover"
        >
          {/* Overlay for better text readability */}
          <View style={styles.overlay} />
          
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={tokens.colors.white} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {categoryName || 'Category'}
                </Text>
                {categoryDescription ? (
                  <Text style={styles.categoryDesc} numberOfLines={2}>
                    {categoryDescription}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* PRODUCTS LIST */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
          <Text style={styles.loadingText}>Loading delicious items...</Text>
        </View>
      ) : products.length > 0 ? (
        <FlatList
          data={products}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleProductPress(item)}>
              <SearchItemCard
                item={{
                  id: item._id,
                  _id: item._id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  image: item.image,
                }}
              />
            </TouchableOpacity>
          )}
          ListFooterComponent={renderFooter}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtext}>
            There are currently no items under this category.
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any, tokens: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: tokens.colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerBackground: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: 180,
  },
  headerImageStyle: {
    opacity: 0.6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 26,
    fontWeight: '800',
    color: tokens.colors.white,
    letterSpacing: -0.5,
    marginTop: 12,
  },
  categoryDesc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 20,
  },
  footerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  horizontalList: {
    paddingBottom: 10,
  },
  otherCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 16,
  },
  otherImage: {
    width: '100%',
    height: 90,
    backgroundColor: colors.background,
  },
  otherInfo: {
    padding: 10,
  },
  otherName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  otherPrice: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: tokens.colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  otherActions: {
    flexDirection: 'row',
    gap: 6,
  },
  viewBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    width: '100%',
  },
  viewBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 11,
    color: tokens.colors.white,
    fontWeight: '700',
  },
});
