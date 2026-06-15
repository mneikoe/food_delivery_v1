import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchItemCard from '../components/SearchItemCard';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProductScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const { colors, tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const categoryId = route?.params?.categoryId;
  const categoryName = route?.params?.categoryName;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const styles = getStyles(colors, tokens, isDark);

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
      {/* TOP BAR */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 18) }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="restaurant-outline"
                size={20}
                color={tokens.colors.primary}
              />
            </View>
            <Text style={styles.headerTitle}>
              {categoryName || 'Food Items'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
          >
            <Text style={styles.cancel}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search dishes, cuisines..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LIST */}
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
            Try adjusting your search or browse categories
          </Text>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any, tokens: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 4,
    shadowColor: isDark ? '#000000' : '#E2E8F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.06,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? colors.background : 'rgba(255, 107, 53, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: tokens.typography.fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancel: {
    color: tokens.colors.primary,
    fontFamily: tokens.typography.fonts.bold,
    fontWeight: '600',
    fontSize: 15,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: tokens.typography.fonts.medium,
    color: colors.textPrimary,
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
    fontFamily: tokens.typography.fonts.medium,
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
    color: colors.textPrimary,
    fontFamily: tokens.typography.fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontFamily: tokens.typography.fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
