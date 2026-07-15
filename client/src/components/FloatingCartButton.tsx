import React, { useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  cartCount: number;
  cartTotal: number;
  isVisible: boolean; // true = show, false = hide
  onPress: () => void;
}

export default function FloatingCartButton({ cartCount, cartTotal, isVisible, onPress }: Props) {
  const translateY = useRef(new Animated.Value(120)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(0);

  // Slide in/out based on visibility
  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isVisible ? 0 : 120,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, [isVisible, translateY]);

  // Bounce button + badge when a new item is added
  useEffect(() => {
    if (cartCount > prevCount.current && cartCount > 0) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          useNativeDriver: true,
          tension: 300,
          friction: 5,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
      ]).start();

      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.5,
          useNativeDriver: true,
          tension: 400,
          friction: 5,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
      ]).start();
    }
    prevCount.current = cartCount;
  }, [cartCount, scaleAnim, badgeScale]);

  if (!isVisible || cartCount === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }, { scale: scaleAnim }] },
      ]}
      pointerEvents={isVisible ? 'box-none' : 'none'}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={styles.touchable}
      >
        <LinearGradient
          colors={['#FF6B35', '#E84000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.button}
        >
          {/* Cart icon + count badge */}
          <View style={styles.iconContainer}>
            <Ionicons name="cart" size={22} color="#fff" />
            <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.badgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </Animated.View>
          </View>

          {/* Divider */}
          <View style={styles.separator} />

          {/* Item count + price */}
          <View style={styles.textContainer}>
            <Text style={styles.itemLabel} numberOfLines={1}>
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </Text>
            {cartTotal > 0 && (
              <Text style={styles.priceLabel} numberOfLines={1}>
                ₹{Math.round(cartTotal)}
              </Text>
            )}
          </View>

          {/* CTA */}
          <Text style={styles.ctaText}>View Cart</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.9)" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // sit just above the tab bar (~60px) with 20px gap
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 4,
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -7,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FF6B35',
    fontSize: 10,
    fontWeight: '800',
  },
  separator: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 12,
  },
  textContainer: {
    flex: 1,
  },
  itemLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  ctaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 2,
  },
});
