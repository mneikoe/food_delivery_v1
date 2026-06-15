import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const PRIZES = [
  { text: 'Try Again', value: 0, color: '#F44336' },
  { text: '50 Coins', value: 50, color: '#FF9800' },
  { text: 'Free Delivery', value: 20, color: '#4CAF50' },
  { text: '100 Coins', value: 100, color: '#FFEB3B', textColor: '#111827' },
  { text: '10% OFF', value: 10, color: '#9C27B0' },
  { text: 'Try Again', value: 0, color: '#F44336' },
  { text: '200 Coins', value: 200, color: '#2196F3' },
  { text: '15% OFF', value: 15, color: '#E91E63' },
];

interface SpinWheelModalProps {
  visible: boolean;
  onClose: () => void;
  onRewardClaimed: (rewardText: string, coinsEarned: number) => void;
}

export default function SpinWheelModal({ visible, onClose, onRewardClaimed }: SpinWheelModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState<string | null>(null);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      checkSpinStatus();
    }
  }, [visible]);

  const checkSpinStatus = async () => {
    try {
      const lastSpinDate = await AsyncStorage.getItem('last_spin_date');
      const today = new Date().toDateString();
      if (lastSpinDate === today) {
        setHasSpunToday(true);
      } else {
        setHasSpunToday(false);
        setReward(null);
        spinAnim.setValue(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpin = () => {
    if (isSpinning || hasSpunToday) return;

    setIsSpinning(true);
    // Pick a random prize
    const prizeIndex = Math.floor(Math.random() * PRIZES.length);
    const selectedPrize = PRIZES[prizeIndex];

    // Calculate rotation: 5 full spins (1800 deg) + segment offset
    // The segments are in clockwise order, we point the arrow at the top (270 deg / -90 deg)
    // To align index `i` at the top: segment angle is 360 / PRIZES.length
    const segmentAngle = 360 / PRIZES.length;
    // Angle to rotate: We want segment `prizeIndex` to land at the top pointer
    // Standard rotation starts at 0. Segment i starts at i * segmentAngle.
    // To bring segment i to top pointer (which is at angle 270 relative to standard 0/right start):
    // Target rotation = 270 - (prizeIndex * segmentAngle) - (segmentAngle / 2)
    // To make sure it rotates clockwise multiple times:
    const baseRotation = 1800; // 5 full spins
    const targetAngle = baseRotation + 270 - (prizeIndex * segmentAngle) - (segmentAngle / 2);

    Animated.timing(spinAnim, {
      toValue: targetAngle,
      duration: 4000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(async () => {
      setIsSpinning(false);
      setReward(selectedPrize.text);
      setHasSpunToday(true);

      // Save today's date so user can't spin again today
      try {
        const today = new Date().toDateString();
        await AsyncStorage.setItem('last_spin_date', today);
      } catch (err) {
        console.error(err);
      }

      onRewardClaimed(selectedPrize.text, selectedPrize.value);
    });
  };

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          {!isSpinning && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>🎁 Lucky Spin Wheel</Text>
          <Text style={styles.subtitle}>Spin daily to win discount coupons and coins!</Text>

          {/* Wheel Container */}
          <View style={styles.wheelWrapper}>
            {/* Top Pointer */}
            <View style={styles.pointerContainer}>
              <Ionicons name="caret-down" size={40} color={colors.primary} />
            </View>

            {/* Rotating Wheel Graphic */}
            <Animated.View style={[styles.wheel, { transform: [{ rotate: spinInterpolation }] }]}>
              {PRIZES.map((prize, index) => {
                const rotation = index * (360 / PRIZES.length);
                return (
                  <View
                    key={index}
                    style={[
                      styles.segment,
                      {
                        transform: [{ rotate: `${rotation}deg` }],
                        backgroundColor: prize.color,
                      },
                    ]}
                  >
                    <Text style={[styles.segmentText, prize.textColor ? { color: prize.textColor } : {}]}>
                      {prize.text}
                    </Text>
                  </View>
                );
              })}
              {/* Inner Center Circle */}
              <View style={styles.innerCircle} />
            </Animated.View>
          </View>

          {/* Status / Claim Box */}
          {reward ? (
            <View style={styles.rewardContainer}>
              <Ionicons name="trophy-outline" size={32} color="#FF9800" />
              <Text style={styles.rewardTitle}>Congratulations!</Text>
              <Text style={styles.rewardText}>You won {reward}!</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>
              {hasSpunToday ? 'You have already used your daily spin.' : 'Spin the wheel now!'}
            </Text>
          )}

          {/* Action Button */}
          {!reward && (
            <TouchableOpacity
              style={[styles.spinButton, (isSpinning || hasSpunToday) && styles.disabledButton]}
              onPress={handleSpin}
              disabled={isSpinning || hasSpunToday}
            >
              <Text style={styles.spinButtonText}>
                {isSpinning ? 'Spinning...' : 'SPIN NOW'}
              </Text>
            </TouchableOpacity>
          )}

          {reward && (
            <TouchableOpacity style={styles.claimButton} onPress={onClose}>
              <Text style={styles.claimButtonText}>Awesome!</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  wheelWrapper: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  pointerContainer: {
    position: 'absolute',
    top: -24,
    zIndex: 10,
  },
  wheel: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 8,
    borderColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    width: 60,
  },
  innerCircle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: '#E5E7EB',
    zIndex: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  spinButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: colors.gray,
  },
  spinButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rewardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF9800',
    marginTop: 8,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  claimButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
