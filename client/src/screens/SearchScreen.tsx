import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SearchItemCard from '../components/SearchItemCard';
import { colors } from '../theme/colors';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function SearchScreen({ navigation }: any) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (token && searchQuery.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setProducts([]);
      setCategories([]);
      setShowResults(false);
    }
  }, [searchQuery, token]);

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setProducts([]);
      setCategories([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setShowResults(true);
    try {
      // Search products
      const productsResponse = await api.get('/user/products', {
        params: { search: searchQuery.trim() },
      });
      setProducts(productsResponse.data || []);

      // Search categories (filter client-side)
      const categoriesResponse = await api.get('/user/categories');
      const filteredCategories = (categoriesResponse.data || []).filter((cat: any) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Search failed:', error);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProductPress = (item: any) => {
    navigation.navigate('ProductDetails', { item });
  };

  const handleCategoryPress = (categoryId: string, categoryName: string, categoryImage?: string) => {
    navigation.navigate('CategoryProducts', {
      categoryId,
      categoryName,
      categoryImage,
    });
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      // Add to recent searches
      const updated = [searchQuery.trim(), ...recentSearches.filter(s => s !== searchQuery.trim())].slice(0, 5);
      setRecentSearches(updated);
      performSearch();
    }
  };

  const handleRecentSearchPress = (search: string) => {
    setSearchQuery(search);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setProducts([]);
    setCategories([]);
    setShowResults(false);
  };

  const hasResults = products.length > 0 || categories.length > 0;
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}>
      {/* Header with Search Bar */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.primary} />
            <TextInput
              placeholder="Search dishes, cuisines, categories..."
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
              returnKeyType="search"
            />
            {hasQuery && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {!showResults && !hasQuery ? (
        // Initial State - Recent Searches & Suggestions
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recentSearchesList}>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.recentSearchItem}
                    onPress={() => handleRecentSearchPress(search)}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.gray} />
                    <Text style={styles.recentSearchText}>{search}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setRecentSearches(recentSearches.filter((_, i) => i !== index));
                      }}
                    >
                      <Ionicons name="close" size={18} color={colors.gray} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.popularSearchesList}>
              {['Pizza', 'Burger', 'Pasta', 'Salad', 'Dessert', 'Beverages'].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.popularSearchChip}
                  onPress={() => handleRecentSearchPress(item)}
                >
                  <Text style={styles.popularSearchText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : loading ? (
        // Loading State
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : hasResults ? (
        // Search Results
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Categories Results */}
          {categories.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsSectionTitle}>Categories</Text>
              <FlatList
                data={categories}
                keyExtractor={(item) => `category-${item._id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryResultCard}
                    onPress={() => handleCategoryPress(item._id, item.name, item.image)}
                  >
                    <View style={styles.categoryResultImageContainer}>
                      {item.image ? (
                        <Image source={{ uri: item.image }} style={styles.categoryResultImage} />
                      ) : (
                        <View style={styles.categoryResultImagePlaceholder}>
                          <Text style={styles.categoryResultImageText}>🍽️</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.categoryResultName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Products Results */}
          {products.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsSectionTitle}>
                Products ({products.length})
              </Text>
              <View style={styles.productsList}>
                {products.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => handleProductPress(item)}
                  >
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
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        // No Results
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtext}>
            Try searching with different keywords
          </Text>
        </View>
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
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 50,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  clearAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  recentSearchesList: {
    gap: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  popularSearchesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  popularSearchChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularSearchText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  resultsSection: {
    padding: 20,
    paddingBottom: 12,
  },
  resultsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  categoriesList: {
    paddingBottom: 8,
  },
  categoryResultCard: {
    width: 120,
    marginRight: 12,
    alignItems: 'center',
  },
  categoryResultImageContainer: {
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryResultImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.light,
  },
  categoryResultImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryResultImageText: {
    fontSize: 40,
  },
  categoryResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  productsList: {
    paddingBottom: 20,
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
