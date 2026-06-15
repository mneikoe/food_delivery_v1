import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { api } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const GAME_WIDTH = width - 48;
const GAME_HEIGHT = 200;
const GRAVITY = 0.55;
const JUMP_FORCE = -10.5;
const BASE_Y = GAME_HEIGHT - 52; // ground level for puppy

interface JumpGameModalProps {
  visible: boolean;
  onClose: () => void;
  onCoinsEarned: (coins: number) => void;
}

type TabType = 'DASHBOARD' | 'MISSIONS' | 'LEADERBOARD' | 'REWARDS';

export default function JumpGameModal({ visible, onClose, onCoinsEarned }: JumpGameModalProps) {
  // Navigation & Dashboard States
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [rewardTiers, setRewardTiers] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [claimingState, setClaimingState] = useState<string | null>(null);

  // Onboarding Tutorial States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Active Gameplay States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  // Gameplay combos and special items
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isGoldenBoneActive, setIsGoldenBoneActive] = useState(false);
  const [goldenBonesCaught, setGoldenBonesCaught] = useState(0);

  // Physics states
  const [puppyY, setPuppyY] = useState(BASE_Y);
  const [obstacleX, setObstacleX] = useState(GAME_WIDTH);
  const [obstacleType, setObstacleType] = useState('🚧');
  const [treatX, setTreatX] = useState(GAME_WIDTH * 0.7);
  const [treatY, setTreatY] = useState(BASE_Y - 50);
  const [treatType, setTreatType] = useState('🦴');
  const [isTreatCollected, setIsTreatCollected] = useState(false);

  // Moving cloud effect
  const [cloudX, setCloudX] = useState(GAME_WIDTH);
  const cloudXRef = useRef(GAME_WIDTH);

  // Floating score text popup effect
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const gameLoopRef = useRef<any>(null);
  const puppyYRef = useRef(BASE_Y);
  const puppyVelocityRef = useRef(0);
  const obstacleXRef = useRef(GAME_WIDTH);
  const obstacleSpeedRef = useRef(4.0);
  const treatXRef = useRef(GAME_WIDTH * 0.7);
  const treatYRef = useRef(BASE_Y - 50);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const comboRef = useRef(0);
  const goldenBonesRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);

  // Lifecycle
  useEffect(() => {
    if (visible) {
      checkOnboardingStatus();
      loadDashboard();
      loadRewardTiers();
    } else {
      stopGame();
      setIsPlaying(false);
      setIsGameOver(false);
    }
    return () => stopGame();
  }, [visible]);

  // Check onboarding completed history
  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem('has_completed_puppy_onboarding');
      if (value !== 'true') {
        setShowOnboarding(true);
        setOnboardingStep(1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem('has_completed_puppy_onboarding', 'true');
      setShowOnboarding(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Dashboard Loader
  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const res = await api.get('/user/game/dashboard');
      setDashboardData(res.data);
      if (res.data && typeof res.data.coins === 'number') {
        onCoinsEarned(res.data.coins);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Reward Tiers catalog loader
  const loadRewardTiers = async () => {
    try {
      const res = await api.get('/user/game/rewards');
      setRewardTiers(res.data);
    } catch (err) {
      console.error('Failed to load rewards tiers:', err);
    }
  };

  // Leaderboard Loader
  const loadLeaderboard = async (type: 'DAILY' | 'WEEKLY') => {
    setLoadingLeaderboard(true);
    try {
      const res = await api.get(`/user/game/leaderboard?type=${type}`);
      setLeaderboardData(res.data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'LEADERBOARD') {
      loadLeaderboard(leaderboardType);
    } else if (tab === 'DASHBOARD') {
      loadDashboard();
    }
  };

  // ----------------------------------------------------
  // GAME ACTIONS
  // ----------------------------------------------------

  const startNewGameSession = async () => {
    try {
      setLoadingDashboard(true);
      const res = await api.post('/user/game/start');
      setSessionId(res.data.sessionId);
      sessionIdRef.current = res.data.sessionId;
      
      // Start Game Canvas
      setIsPlaying(true);
      setIsGameOver(false);
      setScore(0);
      setCoinsEarned(0);
      setComboCount(0);
      setMaxCombo(0);
      setGoldenBonesCaught(0);
      setStartTime(Date.now());
      startTimeRef.current = Date.now();

      puppyYRef.current = BASE_Y;
      puppyVelocityRef.current = 0;
      obstacleXRef.current = GAME_WIDTH;
      obstacleSpeedRef.current = 4.0;
      treatXRef.current = GAME_WIDTH * 0.8;
      treatYRef.current = BASE_Y - 45;
      cloudXRef.current = GAME_WIDTH;
      scoreRef.current = 0;
      coinsRef.current = 0;
      comboRef.current = 0;
      goldenBonesRef.current = 0;

      setPuppyY(BASE_Y);
      setObstacleX(GAME_WIDTH);
      setTreatX(GAME_WIDTH * 0.8);
      setTreatY(BASE_Y - 45);
      setCloudX(GAME_WIDTH);
      setIsTreatCollected(false);
      setShowPopup(false);

      // Randomize initial obstacle and treat
      setObstacleType(['🚧', '🌵', '🪨'][Math.floor(Math.random() * 3)]);
      setTreatType(['🦴', '🍖', '🥩'][Math.floor(Math.random() * 3)]);

      gameLoopRef.current = setInterval(gameTick, 16);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to start game';
      Alert.alert('Play Blocked', errorMsg);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const stopGame = () => {
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };

  const jump = () => {
    if (puppyYRef.current >= BASE_Y) {
      puppyVelocityRef.current = JUMP_FORCE;
    }
  };

  const gameTick = () => {
    // 1. Gravity Calculations
    puppyVelocityRef.current += GRAVITY;
    puppyYRef.current += puppyVelocityRef.current;

    if (puppyYRef.current >= BASE_Y) {
      puppyYRef.current = BASE_Y;
      puppyVelocityRef.current = 0;
    }

    // 2. Obstacle Movement & Dynamic Speed scaling (Easier parameters: initial speed 3.5, slow acceleration *0.15, cap 7.0)
    const targetSpeed = Math.min(7.0, 3.5 + scoreRef.current * 0.15);
    obstacleSpeedRef.current = targetSpeed;

    obstacleXRef.current -= obstacleSpeedRef.current;
    if (obstacleXRef.current < -30) {
      const randomOffset = Math.random() * 120;
      obstacleXRef.current = GAME_WIDTH + randomOffset;
      setObstacleType(['🚧', '🌵', '🪨'][Math.floor(Math.random() * 3)]);
      
      // Successfully jumped over barrier! Increment score and earn coins (with dynamic admin cap protection)
      const coinsPerJump = dashboardData?.coinsPerTreat || 5;
      const maxCoinsPerGame = dashboardData?.maxCoinsPerGame || 50;
      
      scoreRef.current += 1;
      
      if (coinsRef.current < maxCoinsPerGame) {
        const nextCoins = coinsRef.current + coinsPerJump;
        const addedCoins = Math.min(nextCoins, maxCoinsPerGame) - coinsRef.current;
        coinsRef.current += addedCoins;
        
        if (addedCoins > 0) {
          setPopupMessage(`+🪙${addedCoins}`);
        } else {
          setPopupMessage('Cap Reached!');
        }
      } else {
        setPopupMessage('Max Coins!');
      }
      
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 900);
    }

    // 3. Move Clouds
    cloudXRef.current -= 0.8;
    if (cloudXRef.current < -80) {
      cloudXRef.current = GAME_WIDTH;
    }

    // 4. Collision checks (Obstacle)
    const puppyX = 40;
    const isCollidingObstacleX = obstacleXRef.current >= puppyX - 12 && obstacleXRef.current <= puppyX + 22;
    const isCollidingObstacleY = puppyYRef.current >= BASE_Y - 18;

    if (isCollidingObstacleX && isCollidingObstacleY) {
      endGameSession();
      return;
    }

    // Update States
    setPuppyY(puppyYRef.current);
    setObstacleX(obstacleXRef.current);
    setCloudX(cloudXRef.current);
    setScore(scoreRef.current);
    setCoinsEarned(coinsRef.current);
  }

  const endGameSession = async () => {
    stopGame();
    setIsPlaying(false);
    setIsGameOver(true);

    try {
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Submit score authoritatively
      const submitRes = await api.post('/user/game/submit', {
        sessionId: sessionIdRef.current,
        score: scoreRef.current,
        duration: durationSeconds,
        treatsCaught: scoreRef.current // Maps to obstacle jumps to not break the backend
      });

      // Update actual rewarded coins from the response payload
      if (submitRes.data && typeof submitRes.data.coinsEarned === 'number') {
        setCoinsEarned(submitRes.data.coinsEarned);
      }
    } catch (err) {
      console.error('Failed to submit game result:', err);
    }
  };

  // ----------------------------------------------------
  // CLAIMS & REDEMPTION APIS
  // ----------------------------------------------------

  const claimDailyReward = async () => {
    setClaimingState('DAILY');
    try {
      const res = await api.post('/user/game/daily-reward/claim');
      Alert.alert('Success', `Claimed free 🪙${res.data.coinsClaimed} Coins!`);
      loadDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to claim daily reward');
    } finally {
      setClaimingState(null);
    }
  };

  const claimStreakReward = async () => {
    setClaimingState('STREAK');
    try {
      const res = await api.post('/user/game/streak/claim');
      Alert.alert('Streak Reward Claimed!', `Earned 🪙${res.data.coinsClaimed} Streak Bonus Coins!`);
      loadDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to claim streak reward');
    } finally {
      setClaimingState(null);
    }
  };

  const claimMissionReward = async (progressId: string) => {
    setClaimingState(progressId);
    try {
      const res = await api.post('/user/game/missions/claim', { missionProgressId: progressId });
      Alert.alert('Mission Complete!', `Earned 🪙${res.data.coinsClaimed} Coins!`);
      loadDashboard();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to claim mission reward');
    } finally {
      setClaimingState(null);
    }
  };

  const redeemCouponTier = async (tierId: string, title: string) => {
    Alert.alert(
      'Redeem Coupon',
      `Are you sure you want to redeem your coins for: ${title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setClaimingState(tierId);
            try {
              const res = await api.post('/user/game/redeem', { rewardTierId: tierId });
              Alert.alert(
                'Redemption Successful!',
                `Your Coupon Code is:\n\n${res.data.couponCode}\n\nThis coupon has been added to your profile and will be auto-suggested at checkout!`,
                [{ text: 'Great!' }]
              );
              loadDashboard();
            } catch (err: any) {
              Alert.alert('Redeem Failed', err.response?.data?.error || 'Failed to redeem coupon');
            } finally {
              setClaimingState(null);
            }
          }
        }
      ]
    );
  };

  // ----------------------------------------------------
  // UI RENDER HELPERS
  // ----------------------------------------------------

  const renderDashboardTab = () => {
    if (loadingDashboard && !dashboardData) {
      return (
        <View style={styles.tabContentLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    const nextRewardDesc = dashboardData?.nextReward
      ? `Only ${dashboardData.nextReward.coinsNeeded} coins away from ${dashboardData.nextReward.title}!`
      : 'Maximum coupon milestone tier reached!';

    return (
      <ScrollView contentContainerStyle={styles.scrollTabContainer}>
        {/* Streak Dashboard Card */}
        <LinearGradient colors={['#eff6ff', '#dbeafe']} style={styles.dashboardCard}>
          <View style={styles.dashboardCardHeader}>
            <Text style={styles.streakTitle}>🔥 Daily Streak: {dashboardData?.currentStreak || 0} Days</Text>
            {dashboardData?.currentStreak > 0 && !dashboardData?.claimedStreakToday && (
              <TouchableOpacity
                style={styles.smallClaimBtn}
                onPress={claimStreakReward}
                disabled={claimingState === 'STREAK'}
              >
                {claimingState === 'STREAK' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.smallClaimBtnText}>CLAIM</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.streakDaysRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isCompleted = (dashboardData?.currentStreak || 0) >= day;
              const isCurrent = (dashboardData?.currentStreak || 0) === day;
              return (
                <View key={day} style={[styles.streakDayItem, isCompleted && styles.completedStreakDay, isCurrent && styles.currentStreakDay]}>
                  <Text style={[styles.streakDayText, isCompleted && styles.completedStreakDayText]}>D{day}</Text>
                  {isCompleted ? (
                    <Ionicons name="checkmark-circle" size={14} color="#1e3a8a" />
                  ) : (
                    <Text style={styles.streakCoinsText}>+{10 + (day - 1) * 5}🪙</Text>
                  )}
                </View>
              );
            })}
          </View>
        </LinearGradient>

        {/* Daily Free Reward Claim Card */}
        {!dashboardData?.claimedDailyRewardToday ? (
          <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.rewardClaimCard}>
            <View style={styles.rewardClaimTextSection}>
              <Text style={styles.rewardClaimTitle}>🪙 Today's Free Reward</Text>
              <Text style={styles.rewardClaimSub}>Claim your free daily {dashboardData?.dailyRewardAmount || 10} Chatora Coins!</Text>
            </View>
            <TouchableOpacity
              style={styles.claimRewardBtn}
              onPress={claimDailyReward}
              disabled={claimingState === 'DAILY'}
            >
              {claimingState === 'DAILY' ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={styles.claimRewardBtnText}>CLAIM</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <View style={styles.claimedBanner}>
            <Text style={styles.claimedBannerText}>✅ Free Daily Check-in Reward Claimed today</Text>
          </View>
        )}

        {/* Play game section */}
        <View style={styles.playGameSection}>
          <Text style={styles.bestScoreText}>🏆 Today's Best Score: {dashboardData?.bestScore || 0} pts</Text>
          <TouchableOpacity style={styles.primaryPlayButton} onPress={startNewGameSession}>
            <Text style={styles.primaryPlayButtonText}>FEED THE PUPPY 🐕</Text>
          </TouchableOpacity>
        </View>

        {/* Next reward helper progress card */}
        <View style={styles.rewardProgressCard}>
          <Text style={styles.rewardProgressText}>🎁 {nextRewardDesc}</Text>
        </View>

        {/* Summary Daily Mission Progress */}
        <View style={styles.missionSummaryContainer}>
          <Text style={styles.sectionHeader}>Daily Missions progress ({dashboardData?.missionsCompletedSummary || '0/0'})</Text>
          {dashboardData?.missions?.map((m: any, index: number) => {
            const isCompleted = m.progress >= m.target;
            return (
              <View key={index} style={styles.summaryMissionRow}>
                <Ionicons
                  name={isCompleted ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={isCompleted ? "#10b981" : colors.muted}
                />
                <Text style={styles.summaryMissionText} numberOfLines={1}>
                  {m.name} ({m.progress}/{m.target})
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderMissionsTab = () => {
    return (
      <FlatList
        data={dashboardData?.missions || []}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.tabListContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No active missions for today.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCompleted = item.progress >= item.target;
          return (
            <View style={[styles.missionItemCard, isCompleted && styles.completedMissionCard]}>
              <View style={styles.missionCardMain}>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionCardTitle}>{item.name}</Text>
                  <Text style={styles.missionCardReward}>Reward: +🪙{item.rewardCoins} Coins</Text>
                </View>
                <View style={styles.missionActionSection}>
                  {item.claimed ? (
                    <View style={styles.claimedBadge}>
                      <Text style={styles.claimedBadgeText}>CLAIMED</Text>
                    </View>
                  ) : isCompleted ? (
                    <TouchableOpacity
                      style={styles.claimMissionBtn}
                      onPress={() => claimMissionReward(item.progressId)}
                      disabled={claimingState === item.progressId}
                    >
                      {claimingState === item.progressId ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.claimMissionBtnText}>CLAIM</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.progressValueBox}>
                      <Text style={styles.progressValueText}>{item.progress}/{item.target}</Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Progress bar */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarActive,
                    { width: `${Math.min(100, (item.progress / item.target) * 100)}%` },
                    isCompleted && { backgroundColor: '#10b981' }
                  ]}
                />
              </View>
            </View>
          );
        }}
      />
    );
  };

  const renderLeaderboardTab = () => {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.leaderboardToggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, leaderboardType === 'DAILY' && styles.toggleBtnActive]}
            onPress={() => { setLeaderboardType('DAILY'); loadLeaderboard('DAILY'); }}
          >
            <Text style={[styles.toggleBtnText, leaderboardType === 'DAILY' && styles.toggleBtnTextActive]}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, leaderboardType === 'WEEKLY' && styles.toggleBtnActive]}
            onPress={() => { setLeaderboardType('WEEKLY'); loadLeaderboard('WEEKLY'); }}
          >
            <Text style={[styles.toggleBtnText, leaderboardType === 'WEEKLY' && styles.toggleBtnTextActive]}>Weekly</Text>
          </TouchableOpacity>
        </View>
        
        {loadingLeaderboard ? (
          <View style={styles.tabContentLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={leaderboardData}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.tabListContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No ranking scores logged yet.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.leaderboardRow}>
                <View style={styles.leaderboardRankSection}>
                  <Text style={[styles.leaderboardRankText, item.rank <= 3 && styles.topRankText]}>
                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                  </Text>
                </View>
                <Text style={styles.leaderboardUsername} numberOfLines={1}>{item.username}</Text>
                <Text style={styles.leaderboardScore}>{item.score} pts</Text>
              </View>
            )}
          />
        )}
      </View>
    );
  };

  const renderRewardsTab = () => {
    const userCoins = dashboardData ? dashboardData.coins : 0;
    return (
      <FlatList
        data={rewardTiers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.tabListContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No reward tiers configured.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const canAfford = userCoins >= item.coinsRequired;
          return (
            <View style={styles.rewardTierCard}>
              <View style={styles.rewardTierMain}>
                <View style={styles.rewardTierInfo}>
                  <Text style={styles.rewardTierTitle}>{item.title}</Text>
                  <Text style={styles.rewardTierCost}>🪙 Cost: {item.coinsRequired} Coins</Text>
                </View>
                <TouchableOpacity
                  style={[styles.redeemBtn, !canAfford && styles.disabledRedeemBtn]}
                  onPress={() => redeemCouponTier(item._id, item.title)}
                  disabled={!canAfford || claimingState === item._id}
                >
                  {claimingState === item._id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.redeemBtnText}>CLAIM</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    );
  };

  const renderOnboardingTutorial = () => {
    return (
      <Modal visible={showOnboarding} transparent animationType="slide">
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialContent}>
            <Text style={styles.tutorialTitle}>🐾 How to Play: Jump & Run</Text>
            
            {onboardingStep === 1 && (
              <View style={styles.tutorialStepContent}>
                <Text style={styles.tutorialEmoji}>🐕</Text>
                <Text style={styles.tutorialStepHeader}>Step 1: Jump over Barriers</Text>
                <Text style={styles.tutorialStepDesc}>
                  Tap the screen or press the JUMP button to make the puppy leap over hurdles (🚧), cacti (🌵), and rocks (🪨) scrolling on the screen!
                </Text>
              </View>
            )}

            {onboardingStep === 2 && (
              <View style={styles.tutorialStepContent}>
                <Text style={styles.tutorialEmoji}>🪙</Text>
                <Text style={styles.tutorialStepHeader}>Step 2: Earn Coins per Jump</Text>
                <Text style={styles.tutorialStepDesc}>
                  Earn +🪙10 Chatora Coins for every barrier you successfully jump over. Avoid crashing to keep your score going!
                </Text>
              </View>
            )}

            {onboardingStep === 3 && (
              <View style={styles.tutorialStepContent}>
                <Text style={styles.tutorialEmoji}>🎟️</Text>
                <Text style={styles.tutorialStepHeader}>Step 3: Redeem Coins for Coupons</Text>
                <Text style={styles.tutorialStepDesc}>
                  Collect your earned coins and convert them into food discount coupons on checkout to save money on orders!
                </Text>
              </View>
            )}

            <View style={styles.tutorialFooter}>
              <TouchableOpacity style={styles.skipBtn} onPress={skipOnboarding}>
                <Text style={styles.skipBtnText}>Skip Tutorial</Text>
              </TouchableOpacity>
              
              {onboardingStep < 3 ? (
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => setOnboardingStep(prev => prev + 1)}
                >
                  <Text style={styles.nextBtnText}>Next Step</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.nextBtn} onPress={skipOnboarding}>
                  <Text style={styles.nextBtnText}>Let's Play!</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ----------------------------------------------------
  // MAIN RENDERING
  // ----------------------------------------------------

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              stopGame();
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Onboarding Tutorial Modal launcher trigger */}
          {renderOnboardingTutorial()}

          {/* Header Info Panel */}
          {!isPlaying && (
            <View style={styles.headerInfoPanel}>
              <Text style={styles.modalTitle}>🐶 Chatora Game Hub</Text>
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Coins</Text>
                  <Text style={styles.statPillValue}>🪙 {dashboardData?.coins || 0}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Streak</Text>
                  <Text style={styles.statPillValue}>🔥 {dashboardData?.currentStreak || 0}d</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statPillLabel}>Today Rank</Text>
                  <Text style={styles.statPillValue}>🏆 {dashboardData?.rank || 'N/A'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Gameplay View */}
          {isPlaying ? (
            <View style={styles.gameViewContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={jump}
                style={styles.gameContainer}
              >
                <LinearGradient
                  colors={['#0f172a', '#1e1b4b', '#2e1065']}
                  style={StyleSheet.absoluteFill}
                />
                
                {/* Background Details */}
                <View style={styles.moon} />
                <View style={[styles.star, { right: 80, top: 30 }]} />
                <View style={[styles.star, { right: 140, top: 50 }]} />
                <View style={[styles.star, { right: 40, top: 70 }]} />
                <View style={[styles.star, { right: 220, top: 40 }]} />
                <Text style={[styles.cloud, { left: cloudX }]}>☁️</Text>

                {/* Ground Grass Layers */}
                <View style={styles.grassFloor}>
                  <Text style={styles.floorDecor}>🌱   🌸   🌱   🌻   🌱   🌸</Text>
                </View>
                <View style={styles.ground} />

                {/* Score Indicators badge */}
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>Score: {score}</Text>
                  <Text style={styles.coinsProgress}>+🪙{coinsEarned}</Text>
                </View>

                {/* Floating popup indicators */}
                {showPopup && (
                  <View style={[styles.floatingPopup, { top: puppyY - 25 }]}>
                    <Text style={styles.popupText}>{popupMessage}</Text>
                  </View>
                )}

                {/* Puppy shadow */}
                <View
                  style={[
                    styles.puppyShadow,
                    {
                      opacity: Math.max(0.1, 0.4 - (BASE_Y - puppyY) / 100),
                      width: Math.max(12, 32 - (BASE_Y - puppyY) / 3),
                      marginLeft: 40 + (32 - Math.max(12, 32 - (BASE_Y - puppyY) / 3)) / 2,
                    },
                  ]}
                />

                {/* The Puppy Character */}
                <View style={[styles.player, { top: puppyY }]}>
                  <Text style={styles.characterEmoji}>
                    {puppyY < BASE_Y ? '😋' : '🐶'}
                  </Text>
                </View>

                {/* The Obstacles */}
                <View style={[styles.obstacle, { left: obstacleX, top: BASE_Y + 8 }]}>
                  <Text style={styles.obstacleEmoji}>{obstacleType}</Text>
                </View>

              </TouchableOpacity>

              {/* Responsive Jump controller btn */}
              <TouchableOpacity
                style={styles.jumpButton}
                onPress={jump}
                activeOpacity={0.7}
              >
                <Text style={styles.jumpButtonText}>JUMP 🐾</Text>
              </TouchableOpacity>
            </View>
          ) : isGameOver ? (
            /* Game Over Screen layout details */
            <View style={styles.gameOverScreenContainer}>
              <LinearGradient
                colors={['rgba(30, 41, 59, 0.85)', 'rgba(15, 23, 42, 0.95)']}
                style={styles.glassCard}
              >
                <Text style={styles.gameOverText}>💥 GAME OVER</Text>
                <Text style={styles.finalScoreText}>You jumped over {score} obstacles!</Text>
                <Text style={styles.rewardText}>Earned +🪙{coinsEarned} Coins!</Text>
                
                <TouchableOpacity style={styles.playAgainBtn} onPress={startNewGameSession}>
                  <Text style={styles.playAgainBtnText}>PLAY AGAIN</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.claimCloseBtn} onPress={() => { setIsGameOver(false); loadDashboard(); }}>
                  <Text style={styles.claimCloseBtnText}>CLAIM & CLOSE</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            /* Tab Content views layout */
            <View style={{ flex: 1, width: '100%' }}>
              {/* Tab Selector buttons */}
              <View style={styles.tabSelectorRow}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'DASHBOARD' && styles.tabButtonActive]}
                  onPress={() => handleTabChange('DASHBOARD')}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'DASHBOARD' && styles.tabButtonTextActive]}>Hub</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'MISSIONS' && styles.tabButtonActive]}
                  onPress={() => handleTabChange('MISSIONS')}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'MISSIONS' && styles.tabButtonTextActive]}>Missions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'LEADERBOARD' && styles.tabButtonActive]}
                  onPress={() => handleTabChange('LEADERBOARD')}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'LEADERBOARD' && styles.tabButtonTextActive]}>Ranks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'REWARDS' && styles.tabButtonActive]}
                  onPress={() => handleTabChange('REWARDS')}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'REWARDS' && styles.tabButtonTextActive]}>Rewards</Text>
                </TouchableOpacity>
              </View>

              {/* Render Selected Tab content */}
              <View style={{ flex: 1, marginTop: 12 }}>
                {activeTab === 'DASHBOARD' && renderDashboardTab()}
                {activeTab === 'MISSIONS' && renderMissionsTab()}
                {activeTab === 'LEADERBOARD' && renderLeaderboardTab()}
                {activeTab === 'REWARDS' && renderRewardsTab()}
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 24,
    height: '80%',
    maxHeight: 650,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    padding: 4,
  },
  headerInfoPanel: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statPillValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  tabSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    width: '100%',
    marginTop: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  tabContentLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollTabContainer: {
    paddingBottom: 24,
  },
  dashboardCard: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  smallClaimBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  smallClaimBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  streakDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  streakDayItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  completedStreakDay: {
    backgroundColor: '#bfdbfe',
  },
  currentStreakDay: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
  },
  streakDayText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  completedStreakDayText: {
    color: '#1e3a8a',
  },
  streakCoinsText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#1e3a8a',
    marginTop: 2,
  },
  rewardClaimCard: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardClaimTextSection: {
    flex: 1,
    marginRight: 8,
  },
  rewardClaimTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78350f',
  },
  rewardClaimSub: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '700',
    marginTop: 2,
  },
  claimRewardBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  claimRewardBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  claimedBanner: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  claimedBannerText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '800',
  },
  playGameSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 6,
  },
  bestScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
  },
  primaryPlayButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryPlayButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  rewardProgressCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  rewardProgressText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  missionSummaryContainer: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    marginBottom: 10,
  },
  summaryMissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryMissionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 8,
  },
  tabListContainer: {
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  missionItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  completedMissionCard: {
    borderColor: '#e0f2fe',
    backgroundColor: '#f0f9ff',
  },
  missionCardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionInfo: {
    flex: 1,
    marginRight: 12,
  },
  missionCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
  },
  missionCardReward: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '800',
    marginTop: 4,
  },
  missionActionSection: {
    alignItems: 'flex-end',
  },
  claimedBadge: {
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  claimedBadgeText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '900',
  },
  claimMissionBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  claimMissionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  progressValueBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressValueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  leaderboardToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#0f172a',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  leaderboardRankSection: {
    width: 40,
    alignItems: 'center',
  },
  leaderboardRankText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  topRankText: {
    fontSize: 16,
  },
  leaderboardUsername: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 10,
  },
  leaderboardScore: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  rewardTierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
  },
  rewardTierMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardTierInfo: {
    flex: 1,
  },
  rewardTierTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
  },
  rewardTierCost: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '800',
    marginTop: 4,
  },
  redeemBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  disabledRedeemBtn: {
    backgroundColor: '#e2e8f0',
  },
  redeemBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  gameViewContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  gameContainer: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    borderWidth: 2.5,
    borderColor: '#38bdf8',
  },
  moon: {
    position: 'absolute',
    top: 15,
    left: 20,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fef08a',
    opacity: 0.8,
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
    opacity: 0.7,
  },
  cloud: {
    position: 'absolute',
    top: 25,
    fontSize: 32,
    opacity: 0.3,
  },
  grassFloor: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  floorDecor: {
    fontSize: 9,
    opacity: 0.8,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#78350F',
  },
  scoreBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  scoreText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  coinsProgress: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  comboMeter: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  comboMeterText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '900',
  },
  floatingPopup: {
    position: 'absolute',
    left: 35,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 15,
  },
  popupText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
  },
  puppyShadow: {
    position: 'absolute',
    bottom: 12,
    height: 3,
    backgroundColor: '#000',
    borderRadius: 5,
  },
  player: {
    position: 'absolute',
    left: 40,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterEmoji: {
    fontSize: 28,
  },
  obstacle: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  obstacleEmoji: {
    fontSize: 20,
  },
  treat: {
    position: 'absolute',
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  treatEmoji: {
    fontSize: 22,
  },
  treatBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  jumpButton: {
    width: '100%',
    backgroundColor: '#ec4899',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  jumpButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  gameOverScreenContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  gameOverText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 8,
  },
  finalScoreText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FBBF24',
    marginBottom: 20,
  },
  playAgainBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  playAgainBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  claimCloseBtn: {
    width: '100%',
    backgroundColor: '#475569',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  claimCloseBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  tutorialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tutorialContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialStepContent: {
    alignItems: 'center',
    marginVertical: 16,
  },
  tutorialEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  tutorialStepHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 8,
  },
  tutorialStepDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  tutorialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
});
