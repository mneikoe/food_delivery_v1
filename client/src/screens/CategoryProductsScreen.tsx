import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchItemCard from '../components/SearchItemCard';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function CategoryProductsScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);
  
  const categoryId = route?.params?.categoryId;
  const categoryName = route?.params?.categoryName;
  const categoryImage = route?.params?.categoryImage;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token, categoryId]);

  useEffect(() => {
    if (token && searchQuery) {
      const timeoutId = setTimeout(() => {
        fetchProducts();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (token && !searchQuery) {
      fetchProducts();
    }
  }, [searchQuery, categoryId, token]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (categoryId) {
        params.categoryId = categoryId;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await api.get('/user/products', { params });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (item: any) => {
    navigation.navigate('ProductDetails', { item });
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
              <Text style={styles.headerTitle} numberOfLines={1}>
                {categoryName || 'Category'}
              </Text>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            <TextInput
              placeholder="Search dishes, cuisines..."
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
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
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your search or browse other categories
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
    minHeight: 250,
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
    marginBottom: 16,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.white,
    letterSpacing: -0.5,
    flex: 1,
    marginTop: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 50,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    zIndex: 1,
    marginTop: 40,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
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
});
