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

export default function SearchItemCard({ item }: any) {
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
      await fetchCartStatus();
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
      refreshCart();
    } catch (error: any) {
      console.error('❌ Failed to update quantity:', error);
      showAlert('Error', error.response?.data?.error || 'Failed to update quantity');
    } finally {
      setUpdatingQuantity(false);
    }
  };

  const handleCardPress = () => {
    navigation.navigate('ProductDetails', { item });
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.surface, 
          borderColor: colors.border 
        }
      ]} 
      onPress={handleCardPress} 
      activeOpacity={0.95}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.background }]}>
          <Text style={styles.placeholderText}>🍽️</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {item.description && (
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.description}
          </Text>
        )}

        <View style={styles.footer}>
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
              {addingToCart ? (
                <Text style={[styles.addBtnText, { color: tokens.colors.primary }]}>...</Text>
              ) : (
                <Ionicons name="add" size={18} color={tokens.colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 14,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    marginRight: 6,
  },
  desc: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  price: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 16,
    fontWeight: '800',
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 12,
    fontWeight: '700',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
  },
});
