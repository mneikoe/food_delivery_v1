import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { api } from '../api/api';
import { useCart } from '../context/CartContext';

export default function ProductCard({ item, onView }: any) {
  const navigation = useNavigation<any>();
  const authContext = useAuth();
  const token = authContext?.token || null;
  const { showAlert } = useAlert();
  const { colors, tokens } = useTheme();
  const { refreshCart } = useCart();
  
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartItemId, setCartItemId] = useState<string | null>(null);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [updatingQuantity, setUpdatingQuantity] = useState(false);

  // Fetch cart to check if item is already in cart
  useEffect(() => {
    if (token) {
      fetchCartStatus();
    }
  }, [token, item._id]);

  // Refresh cart status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchCartStatus();
      }
    }, [token, item._id])
  );

  const fetchCartStatus = async () => {
    try {
      const response = await api.get('/user/cart');
      const cart = response.data;
      if (cart && cart.items) {
        const cartItem = cart.items.find((ci: any) => 
          (ci.productId === item._id || ci.productId === item.id)
        );
        if (cartItem) {
          // Use productId as the cart item ID for updates/deletes
          setCartItemId(cartItem.productId);
          setCartQuantity(cartItem.quantity || 0);
        } else {
          setCartItemId(null);
          setCartQuantity(0);
        }
      }
    } catch (error) {
      // Silently fail - cart might be empty
      setCartItemId(null);
      setCartQuantity(0);
    }
  };

  const handleAddToCart = async (e: any) => {
    e.stopPropagation();
    
    if (!token) {
      showAlert('Error', 'Please login to add items to cart');
      return;
    }

    setAddingToCart(true);
    try {
      await api.post('/user/cart/items', {
        productId: item._id || item.id,
        quantity: 1,
      });
      // Refresh cart status after adding
      await fetchCartStatus();
      // Update global floating cart button
      refreshCart();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.error || 'Failed to add item to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const updateQuantity = async (newQuantity: number, e: any) => {
    e.stopPropagation();
    
    // Prevent update if already updating
    if (updatingQuantity) return;
    
    if (newQuantity < 1) {
      // Remove from cart by setting quantity to 0
      try {
        setUpdatingQuantity(true);
        // Backend removes item when quantity is 0
        await api.put(`/user/cart/items/${cartItemId}`, {
          quantity: 0,
        });
        // Update state immediately
        setCartItemId(null);
        setCartQuantity(0);
        console.log('✅ Item removed from cart');
        // Update global floating cart button
        refreshCart();
      } catch (error: any) {
        console.error('❌ Failed to remove item:', error);
        showAlert('Error', error.response?.data?.error || 'Failed to remove item');
      } finally {
        setUpdatingQuantity(false);
      }
      return;
    }

    setUpdatingQuantity(true);
    try {
      await api.put(`/user/cart/items/${cartItemId}`, {
        quantity: newQuantity,
      });
      // Update state immediately
      setCartQuantity(newQuantity);
      console.log('✅ Quantity updated to:', newQuantity);
      // Update global floating cart button
      refreshCart();
    } catch (error: any) {
      console.error('❌ Failed to update quantity:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to update quantity');
    } finally {
      setUpdatingQuantity(false);
    }
  };

  const handleCardPress = () => {
    if (onView) {
      onView();
    } else {
      navigation.navigate('ProductDetails', { item });
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
        }
      ]} 
      onPress={handleCardPress} 
      activeOpacity={0.95}
    >
      <View style={styles.imageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.background }]}>
            <Text style={styles.placeholderText}>🍽️</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>

        {item.description ? (
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : (
          <View style={{ height: 32 }} />
        )}

        <View style={styles.actions}>
          <Text style={[styles.price, { color: tokens.colors.primary }]}>₹{item.price}</Text>

          {cartQuantity > 0 ? (
            // Show quantity controls if item is in cart
            <View style={[styles.quantityControl, { backgroundColor: tokens.colors.primary }]}>
              <TouchableOpacity
                style={[styles.quantityButton, updatingQuantity && styles.quantityButtonDisabled]}
                onPress={(e) => updateQuantity(cartQuantity - 1, e)}
                disabled={updatingQuantity}
              >
                <Ionicons name="remove" size={14} color={tokens.colors.white} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{cartQuantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, updatingQuantity && styles.quantityButtonDisabled]}
                onPress={(e) => updateQuantity(cartQuantity + 1, e)}
                disabled={updatingQuantity}
              >
                <Ionicons name="add" size={14} color={tokens.colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            // Show ADD button if item is not in cart
            <TouchableOpacity
              style={[
                styles.addBtn, 
                { backgroundColor: tokens.colors.white, borderColor: tokens.colors.primary },
                addingToCart && styles.addBtnDisabled
              ]}
              onPress={handleAddToCart}
              disabled={addingToCart}
            >
              <Text style={[styles.addText, { color: tokens.colors.primary }]}>
                {addingToCart ? '...' : 'ADD'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    borderRadius: 20,
    marginRight: 16,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  imageContainer: {
    width: '100%',
    height: 130,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  body: {
    padding: 12,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  price: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    fontSize: 16,
  },
  desc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    lineHeight: 16,
    height: 32,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 6,
  },
  quantityButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 13,
    minWidth: 16,
    textAlign: 'center',
  },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  addText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 12,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
});
