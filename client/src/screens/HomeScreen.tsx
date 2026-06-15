import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import ProductCard from '../components/ProductCard';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { updateUserLocation } from '../api/LocationApi';
import ManualCitySelector from '../components/ManualCitySelector';
import { api } from '../api/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useResponsive } from '../hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JumpGameModal from '../components/JumpGameModal';
import ResponsiveContainer from '../components/ResponsiveContainer';
import LinearGradient from 'react-native-linear-gradient';

import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Default hero slides (same format, sliding) – used when API fails or admin hasn't set images
const DEFAULT_HERO_SLIDES: { image: string; headline: string; text: string }[] = [
  { image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2070&auto=format&fit=crop', headline: 'Artisan Gourmet Experiences', text: 'Handcrafted dishes delivered to your doorstep' },
  { image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=2081&auto=format&fit=crop', headline: 'Fresh & Tasty', text: 'Order your favorite meals in a taps' },
  { image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?q=80&w=1980&auto=format&fit=crop', headline: 'Quick Delivery', text: 'Hot food at your door, fast' },
  { image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2080&auto=format&fit=crop', headline: 'Premium Quality', text: 'Best ingredients, best taste' },
];

export default function HomeScreen({ navigation, route }: any) {
  const { colors, tokens } = useTheme();
  const styles = getStyles(colors, tokens);

  const { token, user, refreshUser } = useAuth();
  const { setLocation, location } = useLocation();
  const { horizontalPadding } = useResponsive();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const [coins, setCoins] = useState(0);
  const [showGameModal, setShowGameModal] = useState(false);

  const loadCoins = async () => {
    try {
      const res = await api.get('/user/profile');
      if (res.data && typeof res.data.coins === 'number') {
        setCoins(res.data.coins);
      }
    } catch (err) {
      console.error('Failed to load coins:', err);
    }
  };

  const handleCoinsEarned = (totalCoins: number) => {
    setCoins(totalCoins);
    if (refreshUser) {
      refreshUser();
    }
  };
  const [showManualSelector, setShowManualSelector] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [trendingCategories, setTrendingCategories] = useState<any[]>([]);
  const [browseCategories1, setBrowseCategories1] = useState<any[]>([]);
  const [browseCategories2, setBrowseCategories2] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [heroSlidesList, setHeroSlidesList] = useState<{ image: string; headline: string; text: string }[]>(() => [...DEFAULT_HERO_SLIDES]);
  const heroCarouselRef = useRef<FlatList>(null);
  const heroSlideIndex = useRef(0);
  const [heroImageErrors, setHeroImageErrors] = useState<{[key: number]: boolean}>({});
  
  const HERO_MARGIN = 16;
  const HERO_CARD_WIDTH = width - HERO_MARGIN * 2;
  const HERO_PAGE_WIDTH = width;

  const fetchHeroSlides = useCallback(async () => {
    try {
      const res = await api.get('/public/hero-slides');
      const slides = res?.data?.slides;
      if (!Array.isArray(slides) || slides.length === 0) {
        setHeroSlidesList([...DEFAULT_HERO_SLIDES]);
        return;
      }
      const merged = [];
      for (let i = 0; i < 4; i++) {
        const s = slides[i];
        const img = (s && s.image && String(s.image).trim()) ? s.image.trim() : '';
        const def = DEFAULT_HERO_SLIDES[i] || DEFAULT_HERO_SLIDES[0];
        merged.push({
          image: img || def.image,
          headline: (s && s.headline && String(s.headline).trim()) ? s.headline.trim() : def.headline,
          text: (s && s.text && String(s.text).trim()) ? s.text.trim() : def.text,
        });
      }
      setHeroSlidesList(merged);
    } catch (_) {
      setHeroSlidesList([...DEFAULT_HERO_SLIDES]);
    }
  }, []);

  useEffect(() => {
    fetchHeroSlides();
  }, [fetchHeroSlides]);

  useFocusEffect(
    useCallback(() => {
      fetchHeroSlides();
    }, [fetchHeroSlides])
  );

  useEffect(() => {
    if (heroSlidesList.length <= 1) return;
    const t = setInterval(() => {
      heroSlideIndex.current = (heroSlideIndex.current + 1) % heroSlidesList.length;
      heroCarouselRef.current?.scrollToOffset({
        offset: heroSlideIndex.current * HERO_PAGE_WIDTH,
        animated: true,
      });
    }, 4000);
    return () => clearInterval(t);
  }, [heroSlidesList.length, HERO_PAGE_WIDTH]);

  useEffect(() => {
    if (!token || location?.isManual || location?.city) {
      return;
    }

    const fetchLocation = async () => {
      setIsLoadingLocation(true);
      setLocationError(null);
      try {
        await updateUserLocation(setLocation, user?.role);
        setLocationError(null);
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to get location";
        setLocationError(errorMessage);
        console.error('Failed to initialize location:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    fetchLocation();
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchCategories();
      fetchProducts();
      fetchFeaturedProducts();
    }
  }, [token]);

  useEffect(() => {
    loadCoins();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCoins();
      if (route.params?.launchPuppyGame) {
        setShowGameModal(true);
        navigation.setParams({ launchPuppyGame: undefined });
      }
    }, [route.params])
  );

  // Shuffle trending categories every 12 hours
  useEffect(() => {
    if (categories.length === 0) return;

    const shuffleTrending = () => {
      setTrendingCategories(getTrendingCategories(categories));
    };

    // Shuffle immediately
    shuffleTrending();

    // Set interval to shuffle every 12 hours (43200000 ms)
    const interval = setInterval(shuffleTrending, 12 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [categories]);

  // Shuffle array function
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get shuffled trending categories (4 random categories)
  const getTrendingCategories = (allCategories: any[]) => {
    if (allCategories.length <= 4) {
      return allCategories;
    }
    const shuffled = shuffleArray(allCategories);
    return shuffled.slice(0, 4);
  };

  // Split categories into two arrays for browse section
  const splitCategoriesForBrowse = (allCategories: any[]) => {
    const shuffled = shuffleArray(allCategories);
    const mid = Math.ceil(shuffled.length / 2);
    return {
      first: shuffled.slice(0, mid),
      second: shuffled.slice(mid),
    };
  };

  const fetchCategories = async () => {
    if (!token) {
      setLoadingCategories(false);
      return;
    }
    
    setLoadingCategories(true);
    try {
      const response = await api.get('/user/categories');
      if (response.data && Array.isArray(response.data)) {
        setCategories(response.data);
        // Get 4 random trending categories
        setTrendingCategories(getTrendingCategories(response.data));
        // Split categories for browse section (2 scrollviews)
        const { first, second } = splitCategoriesForBrowse(response.data);
        setBrowseCategories1(first);
        setBrowseCategories2(second);
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      setCategories([]);
      setTrendingCategories([]);
      setBrowseCategories1([]);
      setBrowseCategories2([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProducts = async () => {
    if (!token) {
      setLoadingProducts(false);
      return;
    }
    
    setLoadingProducts(true);
    try {
      const response = await api.get('/user/products');
      if (response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/user/products/featured');
      if (response.data && Array.isArray(response.data)) {
        setFeaturedProducts(response.data);
      } else {
        // Fallback: Take first 3 products as featured
        const fallbackResponse = await api.get('/user/products');
        setFeaturedProducts(fallbackResponse.data?.slice(0, 3) || []);
      }
    } catch (error) {
      // Fallback: Use regular products if featured endpoint doesn't exist
      try {
        const fallbackResponse = await api.get('/user/products');
        setFeaturedProducts(fallbackResponse.data?.slice(0, 3) || []);
      } catch (fallbackError) {
        console.error('Failed to load featured products:', error);
        setFeaturedProducts([]);
      }
    }
  };

  const handleCategoryPress = (categoryId: string, categoryName: string, categoryImage?: string) => {
    navigation.navigate('CategoryProducts', { 
      categoryId, 
      categoryName,
      categoryImage 
    });
  };

  const handleRetryLocation = async () => {
    if (!token) return;

    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      await updateUserLocation(setLocation, user?.role);
      setLocationError(null);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to get location";
      setLocationError(errorMessage);
      console.error('Failed to initialize location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'search':
        navigation.navigate('Search');
        break;
      case 'orders':
        navigation.navigate('Orders');
        break;
      case 'offers':
        navigation.navigate('Offers');
        break;
      case 'cart':
        navigation.navigate('Cart');
        break;
    }
  };

  const handleHeroImageError = (index: number) => {
    setHeroImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <TouchableOpacity 
        style={styles.quickAction}
        onPress={() => handleQuickAction('search')}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="search" size={22} color="white" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Search</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickAction}
        onPress={() => handleQuickAction('orders')}
      >
        <LinearGradient
          colors={['#f093fb', '#f5576c']}
          style={styles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="receipt" size={22} color="white" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Orders</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickAction}
        onPress={() => handleQuickAction('offers')}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="pricetag" size={22} color="white" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Offers</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.quickAction}
        onPress={() => handleQuickAction('cart')}
      >
        <LinearGradient
          colors={['#43e97b', '#38f9d7']}
          style={styles.quickActionIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="cart" size={22} color="white" />
        </LinearGradient>
        <Text style={styles.quickActionText}>Cart</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFeaturedSection = () => (
    <View style={styles.featuredSection}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Featured Dishes</Text>
          <Text style={styles.sectionSubtitle}>Chef's special recommendations</Text>
        </View>
      </View>
      
      {featuredProducts.length > 0 ? (
        <FlatList
          data={featuredProducts}
          keyExtractor={item => `featured-${item._id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.featuredCard}
              onPress={() => navigation.navigate('ProductDetails', { item })}
            >
              <ImageBackground
                source={{ uri: item.image || 'https://images.unsplash.com/photo-1565958011703-44f9829ba187' }}
                style={styles.featuredImage}
                imageStyle={styles.featuredImageStyle}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.featuredOverlay}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <View style={styles.featuredBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.featuredBadgeText}>Featured</Text>
                  </View>
                  <Text style={styles.featuredTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.featuredPrice}>₹{item.price}</Text>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No featured items</Text>
        </View>
      )}
    </View>
  );

  const renderTrendingCategories = () => (
    <View style={styles.trendingSection}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Chatora's Choice</Text>
          <Text style={styles.sectionSubtitle}>What's popular right now</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
          <Text style={styles.link}>All Categories</Text>
        </TouchableOpacity>
      </View>
      
      {trendingCategories.length > 0 ? (
        <View style={styles.trendingGrid}>
          {trendingCategories.map((category) => (
            <TouchableOpacity
              key={category._id}
              style={styles.trendingCard}
              onPress={() => handleCategoryPress(category._id, category.name, category.image)}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.trendingIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {category.image ? (
                  <Image source={{ uri: category.image }} style={styles.trendingImage} />
                ) : (
                  <Text style={styles.trendingEmoji}>🍽️</Text>
                )}
              </LinearGradient>
              <Text style={styles.trendingName} numberOfLines={1}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderDiscountBanner = () => (
    <TouchableOpacity 
      style={styles.discountBanner}
      onPress={() => navigation.navigate('Offers')}
    >
      <LinearGradient
        colors={['#FF416C', '#FF4B2B']}
        style={styles.discountGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.discountContent}>
          <View>
            <Text style={styles.discountTitle}>SPECIAL OFFER</Text>
            <Text style={styles.discountSubtitle}>Get 25% off on first order</Text>
            <Text style={styles.discountCode}>Use code: WELCOME25</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={40} color="white" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderTestimonialSection = () => (
    <View style={styles.testimonialSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>What Our Customers Say</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.testimonialList}
      >
        {[
          { id: '1', name: 'Rahul Sharma', text: 'Best food delivery experience! Fresh ingredients and amazing taste.', rating: 5 },
          { id: '2', name: 'Priya Patel', text: 'The chef\'s special dishes are absolutely delicious. Highly recommended!', rating: 5 },
          { id: '3', name: 'Amit Kumar', text: 'Fast delivery and consistent quality. My go-to food app now!', rating: 4 },
        ].map((testimonial) => (
          <View key={testimonial.id} style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <LinearGradient
                colors={[tokens.colors.primary + '80', tokens.colors.primary]}
                style={styles.testimonialAvatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.testimonialAvatarText}>
                  {testimonial.name.charAt(0)}
                </Text>
              </LinearGradient>
              <View>
                <Text style={styles.testimonialName}>{testimonial.name}</Text>
                <View style={styles.ratingContainer}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color="#FFD700" />
                  ))}
                </View>
              </View>
            </View>
            <Text style={styles.testimonialText}>{testimonial.text}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderHeroSlide = ({ item, index }: { item: typeof heroSlidesList[0], index: number }) => {
    const imageSource = heroImageErrors[index] 
      ? DEFAULT_HERO_SLIDES[index % DEFAULT_HERO_SLIDES.length].image 
      : item.image;

    return (
      <View style={[styles.heroPage, { width: HERO_PAGE_WIDTH }]}>
        <View style={[styles.heroWrapper, { width: HERO_CARD_WIDTH }]}>
          <ImageBackground
            source={{ uri: imageSource }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
            onError={() => handleHeroImageError(index)}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.heroOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>FEATURED</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {item.headline || 'Delicious Food'}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>
                  {item.text || 'Order now and enjoy!'}
                </Text>
             
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>
      </View>
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView 
        ref={scrollViewRef}
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer noPadding>
          {/* Location Error Banner */}
          {locationError && !location?.city && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                {locationError.includes("permission denied")
                  ? "Location permission denied"
                  : "Unable to detect location"}
              </Text>
              <View style={styles.errorActions}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetryLocation}
                  disabled={isLoadingLocation}
                >
                  <Text style={styles.retryButtonText}>
                    {isLoadingLocation ? "Loading..." : "Retry"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.manualButton}
                  onPress={() => setShowManualSelector(true)}
                >
                  <Text style={styles.manualButtonText}>Select Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Hero Carousel */}
          <View style={styles.heroContainer}>
            <FlatList
              ref={heroCarouselRef}
              data={heroSlidesList}
              keyExtractor={(_, i) => `hero-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={HERO_PAGE_WIDTH}
              snapToAlignment="center"
              decelerationRate="fast"
              bounces={false}
              getItemLayout={(_, index) => ({
                length: HERO_PAGE_WIDTH,
                offset: HERO_PAGE_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / HERO_PAGE_WIDTH);
                heroSlideIndex.current = Math.max(0, Math.min(idx, heroSlidesList.length - 1));
              }}
              renderItem={renderHeroSlide}
            />
            
            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {heroSlidesList.map((_, index) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.paginationDot,
                    index === heroSlideIndex.current && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Coins Bar & Spin Wheel Promo Banner */}
          <View style={styles.promoContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.coinsCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.coinsHeader}>
                <Text style={styles.coinsTitle}>🪙 Chatora Coins</Text>
                <Text style={styles.coinsValue}>{coins}</Text>
              </View>
              <Text style={styles.coinsSubText}>Use coins for extra discounts on checkout!</Text>
            </LinearGradient>

            <TouchableOpacity
              style={styles.spinWheelBanner}
              onPress={() => setShowGameModal(true)}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={styles.spinGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.spinBannerContent}>
                  <View style={styles.spinBannerLeft}>
                    <Text style={styles.spinBannerTitle}>🐶 Feed the Puppy</Text>
                    <Text style={styles.spinBannerSubtitle}>Play and catch treats to earn Chatora Coins!</Text>
                  </View>
                  <Ionicons name="paw" size={32} color="#FBBF24" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Trending Categories */}
          {renderTrendingCategories()}

          {/* Discount Banner */}
          {renderDiscountBanner()}

          {/* Categories Grid */}
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Explore Adda's Menu</Text>
                <Text style={styles.sectionSubtitle}>Explore our menu</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
                <Text style={styles.link}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={tokens.colors.primary} />
              </View>
            ) : browseCategories1.length > 0 || browseCategories2.length > 0 ? (
              <View>
                {/* First Horizontal ScrollView */}
                <FlatList
                  data={browseCategories1}
                  keyExtractor={(item) => `browse1-${item._id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.browseCategoriesList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.browseCategoryCard}
                      onPress={() => handleCategoryPress(item._id, item.name, item.image)}
                    >
                      <View style={styles.browseCategoryImageContainer}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.browseCategoryImage} />
                        ) : (
                          <LinearGradient
                            colors={['#f0f0f0', '#e0e0e0']}
                            style={styles.browseCategoryImagePlaceholder}
                          >
                            <Text style={styles.browseCategoryImageText}>🍽️</Text>
                          </LinearGradient>
                        )}
                      </View>
                      <Text style={styles.browseCategoryName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
                
                {/* Second Horizontal ScrollView */}
                <FlatList
                  data={browseCategories2}
                  keyExtractor={(item) => `browse2-${item._id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.browseCategoriesList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.browseCategoryCard}
                      onPress={() => handleCategoryPress(item._id, item.name, item.image)}
                    >
                      <View style={styles.browseCategoryImageContainer}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.browseCategoryImage} />
                        ) : (
                          <LinearGradient
                            colors={['#f0f0f0', '#e0e0e0']}
                            style={styles.browseCategoryImagePlaceholder}
                          >
                            <Text style={styles.browseCategoryImageText}>🍽️</Text>
                          </LinearGradient>
                        )}
                      </View>
                      <Text style={styles.browseCategoryName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : null}
          </View>

          {/* Featured Dishes */}
          {renderFeaturedSection()}

          {/* Chef's Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Chef's Selection</Text>
                <Text style={styles.sectionSubtitle}>Handpicked favorites</Text>
              </View>
            </View>

            {loadingProducts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={tokens.colors.primary} />
              </View>
            ) : products.length > 0 ? (
              <FlatList
                data={products.slice(0, 8)}
                keyExtractor={item => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <ProductCard
                    item={{
                      id: item._id,
                      _id: item._id,
                      name: item.name,
                      price: item.price,
                      description: item.description,
                      image: item.image,
                      categoryId: item.categoryId,
                    }}
                    onView={() => navigation.navigate('ProductDetails', { item })}
                  />
                )}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No products available</Text>
              </View>
            )}
          </View>

          {/* Testimonials */}
          {renderTestimonialSection()}

          <View style={{ height: 24 }} />
        </ResponsiveContainer>

        {/* Manual City Selector Modal */}
        <ManualCitySelector
          visible={showManualSelector}
          onClose={() => setShowManualSelector(false)}
        />

        {/* Jumper Game Modal */}
        <JumpGameModal
          visible={showGameModal}
          onClose={() => setShowGameModal(false)}
          onCoinsEarned={handleCoinsEarned}
        />
      </ScrollView>
    </>
  );
}

const getStyles = (colors: any, tokens: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* HERO */
  heroContainer: {
    marginTop: 8,
    marginBottom: 16,
    position: 'relative',
  },
  heroPage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: 280,
    justifyContent: 'flex-end',
  },
  heroImageStyle: {
    borderRadius: 24,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 20,
    borderRadius: 24,
  },
  heroContent: {
    width: '100%',
  },
  heroBadge: {
    backgroundColor: tokens.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: tokens.colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: tokens.colors.white,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    color: tokens.colors.white,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  heroButtonText: {
    color: tokens.colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: tokens.colors.primary,
  },

  /* QUICK ACTIONS */
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 8,
  },
  quickAction: {
    alignItems: 'center',
    width: (width - 64) / 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  /* TRENDING CATEGORIES */
  trendingSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  trendingCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  trendingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  trendingImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: tokens.colors.white,
  },
  trendingEmoji: {
    fontSize: 36,
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  /* DISCOUNT BANNER */
  discountBanner: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  discountGradient: {
    padding: 20,
  },
  discountContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountTitle: {
    color: tokens.colors.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  discountSubtitle: {
    color: tokens.colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  discountCode: {
    color: tokens.colors.white,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },

  /* CATEGORIES GRID */
  categoriesSection: {
    marginBottom: 24,
  },
  browseCategoriesList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  browseCategoryCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  browseCategoryImageContainer: {
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  browseCategoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
  },
  browseCategoryImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseCategoryImageText: {
    fontSize: 36,
  },
  browseCategoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  /* FEATURED SECTION */
  featuredSection: {
    marginBottom: 24,
  },
  featuredList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  featuredCard: {
    width: width * 0.7,
    height: 200,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredImageStyle: {
    borderRadius: 16,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: tokens.colors.white,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  featuredTitle: {
    color: tokens.colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  featuredPrice: {
    color: tokens.colors.white,
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },

  /* TESTIMONIAL SECTION */
  testimonialSection: {
    marginBottom: 24,
  },
  testimonialList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  testimonialCard: {
    width: width * 0.8,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  testimonialAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  testimonialAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.white,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  testimonialText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  /* BOTTOM BANNER */
  bottomBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomBannerGradient: {
    padding: 20,
  },
  bottomBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBannerTitle: {
    color: tokens.colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  bottomBannerSubtitle: {
    color: tokens.colors.white,
    fontSize: 14,
    opacity: 0.9,
  },
  bottomBannerButton: {
    backgroundColor: tokens.colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  bottomBannerButtonText: {
    color: tokens.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  /* SECTION STYLES */
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  link: {
    color: tokens.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  list: {
    paddingLeft: 16,
    paddingBottom: 8,
  },
  
  /* ERROR BANNER */
  errorBanner: {
    backgroundColor: "#FFF3CD",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFC107",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 12,
    fontWeight: '500',
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  retryButtonText: {
    color: tokens.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  manualButton: {
    backgroundColor: tokens.colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
    flex: 1,
    alignItems: 'center',
  },
  manualButtonText: {
    color: tokens.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },

  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  promoContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  coinsCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  coinsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: tokens.colors.white,
  },
  coinsValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FBBF24',
  },
  coinsSubText: {
    fontSize: 12,
    color: tokens.colors.white,
    opacity: 0.9,
    marginTop: 6,
  },
  spinWheelBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  spinGradient: {
    padding: 16,
  },
  spinBannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spinBannerLeft: {
    flex: 1,
  },
  spinBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.white,
  },
  spinBannerSubtitle: {
    fontSize: 12,
    color: tokens.colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
});