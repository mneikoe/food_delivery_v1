import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function CategoriesScreen({ navigation }: any) {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchCategories();
    }
  }, [token]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get('/user/categories');
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (categoryId: string, categoryName: string, categoryImage?: string) => {
    navigation.navigate('CategoryProducts', {
      categoryId,
      categoryName,
      categoryImage,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Categories</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 18) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Categories</Text>
        <View style={{ width: 24 }} />
      </View>

      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyTitle}>No categories available</Text>
          <Text style={styles.emptySubtext}>
            Check back later for new categories
          </Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(item._id, item.name, item.image)}
              activeOpacity={0.9}
            >
              <View style={styles.categoryImageContainer}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.categoryImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.categoryImagePlaceholder, { backgroundColor: colors.background }]}>
                    <Text style={styles.categoryImageText}>🍽️</Text>
                  </View>
                )}
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  categoryCard: {
    width: (width - 48) / 2,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    margin: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryImageContainer: {
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
  },
  categoryImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImageText: {
    fontSize: 48,
  },
  categoryName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
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
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
