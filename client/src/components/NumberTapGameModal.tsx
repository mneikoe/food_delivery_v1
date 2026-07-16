import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../api/api';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TAP_WINDOW = 3000;
const TIMER_INTERVAL = 50;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr: number[]): number {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Phase = 'INFO' | 'PLAYING' | 'RESULT';
type RoundPhase = 'SHOW' | 'HIDDEN' | 'FEEDBACK';
type CellState = 'idle' | 'correct' | 'wrong' | 'missed' | 'reveal';

interface GameSettings {
  sessionId: string;
  attemptsPerSession: number;
  coinsPerCorrect: number;
  bonusCoins: number;
  sessionsRemaining: number;
}

interface GameResult {
  coinsEarned: number;
  correctClicks: number;
  totalAttempts: number;
  isPerfect: boolean;
  bonusCoins: number;
  newBalance: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCoinsEarned: (newBalance: number) => void;
}

export default function NumberTapGameModal({ visible, onClose, onCoinsEarned }: Props) {
  const { colors, tokens, isDark } = useTheme();
  const styles = getStyles(colors, tokens, isDark);

  const [phase, setPhase] = useState<Phase>('INFO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionsRemaining, setSessionsRemaining] = useState(0);
  const [infoSettings, setInfoSettings] = useState<any>(null);

  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [grid, setGrid] = useState<number[]>(shuffleArray(NUMBERS));
  const [targetNum, setTargetNum] = useState<number>(1);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [cellStates, setCellStates] = useState<CellState[]>(Array(9).fill('idle'));
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('SHOW');

  const [timerProgress, setTimerProgress] = useState(1);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const attemptsRef = useRef(0);
  const correctRef = useRef(0);
  const settingsRef = useRef<GameSettings | null>(null);
  const roundPhaseRef = useRef<RoundPhase>('SHOW');
  const gridRef = useRef<number[]>(NUMBERS);
  const targetRef = useRef(1);
  const processingRef = useRef(false);

  const targetPulse = useRef(new Animated.Value(1)).current;
  const cellAnims = useRef(NUMBERS.map(() => new Animated.Value(1))).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  const [result, setResult] = useState<GameResult | null>(null);

  const clearCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedRef.current = 0;
  }, []);

  const fetchGameStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/user/game/status');
      setInfoSettings(res.data);
      setSessionsRemaining(res.data.sessionsRemaining ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load game info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setPhase('INFO');
      setError(null);
      setResult(null);
      fetchGameStatus();
    } else {
      clearCountdown();
    }
  }, [visible, clearCountdown]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const pulseTarget = useCallback(() => {
    Animated.sequence([
      Animated.spring(targetPulse, { toValue: 1.15, useNativeDriver: true, tension: 400, friction: 5 }),
      Animated.spring(targetPulse, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  }, [targetPulse]);

  const startCountdown = useCallback((onExpire: () => void) => {
    clearCountdown();
    elapsedRef.current = 0;
    setTimerProgress(1);
    setTimerExpired(false);

    timerBarAnim.setValue(1);
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: TAP_WINDOW,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      elapsedRef.current += TIMER_INTERVAL;
      const remaining = TAP_WINDOW - elapsedRef.current;
      setTimerProgress(Math.max(0, remaining / TAP_WINDOW));

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTimerExpired(true);
        onExpire();
      }
    }, TIMER_INTERVAL);
  }, [clearCountdown, timerBarAnim]);

  const finishGame = async () => {
    clearCountdown();
    const s = settingsRef.current;
    if (!s) return;

    try {
      setLoading(true);
      const res = await api.post('/user/game/end', {
        sessionId: s.sessionId,
        correctClicks: correctRef.current,
        totalAttempts: s.attemptsPerSession,
      });
      setResult(res.data);
      setPhase('RESULT');
      onCoinsEarned(res.data.newBalance);
      fetchGameStatus();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit game');
      setPhase('RESULT');
    } finally {
      setLoading(false);
    }
  };

  const startRound = useCallback((currentAttempts: number, showDur: number) => {
    if (currentAttempts <= 0) return;
    processingRef.current = false;

    // Hard reshuffling: Ensure the new target does not land on the same index as the previous round
    let newGrid = shuffleArray(NUMBERS);
    let newTarget = pickRandom(newGrid);
    const prevTargetIndex = gridRef.current ? gridRef.current.indexOf(targetRef.current) : -1;
    let attempts = 0;
    while (prevTargetIndex !== -1 && newGrid.indexOf(newTarget) === prevTargetIndex && attempts < 10) {
      newGrid = shuffleArray(NUMBERS);
      newTarget = pickRandom(newGrid);
      attempts++;
    }

    gridRef.current = newGrid;
    targetRef.current = newTarget;

    setGrid(newGrid);
    setTargetNum(newTarget);
    setCellStates(Array(9).fill('idle'));
    setRoundPhase('SHOW');
    roundPhaseRef.current = 'SHOW';
    setTimerExpired(false);

    pulseTarget();

    const t = setTimeout(() => {
      setRoundPhase('HIDDEN');
      roundPhaseRef.current = 'HIDDEN';

      startCountdown(() => {
        if (processingRef.current) return;
        processingRef.current = true;

        const revealStates: CellState[] = Array(9).fill('idle');
        const idx = gridRef.current.indexOf(targetRef.current);
        if (idx >= 0) revealStates[idx] = 'missed';
        setCellStates(revealStates);
        setRoundPhase('FEEDBACK');
        roundPhaseRef.current = 'FEEDBACK';

        try {
          Vibration.vibrate(100);
        } catch (_) {}

        const newAttempts = attemptsRef.current - 1;
        attemptsRef.current = newAttempts;
        setAttemptsLeft(newAttempts);

        setTimeout(() => {
          if (newAttempts <= 0) {
            finishGame();
          } else {
            startRound(newAttempts, 1000);
          }
        }, 700);
      });
    }, showDur);

    return () => clearTimeout(t);
  }, [pulseTarget, startCountdown]);

  const handleStartGame = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/user/game/start');
      const data: GameSettings = res.data;
      setSettings(data);
      settingsRef.current = data;

      attemptsRef.current = data.attemptsPerSession;
      correctRef.current = 0;
      processingRef.current = false;

      setAttemptsLeft(data.attemptsPerSession);
      setCorrectCount(0);
      setResult(null);
      setSessionsRemaining(data.sessionsRemaining);
      setPhase('PLAYING');

      setTimeout(() => startRound(data.attemptsPerSession, 1000), 300);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleCellTap = useCallback((index: number, value: number) => {
    if (roundPhaseRef.current !== 'HIDDEN') return;
    if (processingRef.current) return;
    processingRef.current = true;

    clearCountdown();
    setRoundPhase('FEEDBACK');
    roundPhaseRef.current = 'FEEDBACK';

    const isCorrect = value === targetRef.current;
    const newStates: CellState[] = Array(9).fill('idle');

    if (isCorrect) {
      newStates[index] = 'correct';
    } else {
      newStates[index] = 'wrong';
      const correctIdx = gridRef.current.indexOf(targetRef.current);
      if (correctIdx >= 0 && correctIdx !== index) newStates[correctIdx] = 'reveal';
    }
    setCellStates(newStates);

    Animated.sequence([
      Animated.spring(cellAnims[index], { toValue: isCorrect ? 1.25 : 0.8, useNativeDriver: true, tension: 400, friction: 5 }),
      Animated.spring(cellAnims[index], { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();

    if (isCorrect) {
      const newCorrect = correctRef.current + 1;
      correctRef.current = newCorrect;
      setCorrectCount(newCorrect);
    } else {
      try {
        Vibration.vibrate(100);
      } catch (_) {}
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    const newAttempts = attemptsRef.current - 1;
    attemptsRef.current = newAttempts;
    setAttemptsLeft(newAttempts);

    setTimeout(() => {
      if (newAttempts <= 0) {
        finishGame();
      } else {
        startRound(newAttempts, 1000);
      }
    }, isCorrect ? 500 : 800);
  }, [cellAnims, shakeAnim, startRound, clearCountdown]);

  const renderHearts = () => {
    if (!settings) return null;
    return (
      <View style={styles.heartsRow}>
        {Array.from({ length: settings.attemptsPerSession }).map((_, i) => (
          <Text key={i} style={styles.heartIcon}>
            {i < attemptsLeft ? '❤️' : '🖤'}
          </Text>
        ))}
      </View>
    );
  };

  const renderGrid = () => {
    const CELL_GAP = 10;
    const CELL_SIZE = (width - 48 - CELL_GAP * 2) / 3;

    return (
      <Animated.View style={[styles.gridWrapper, { transform: [{ translateX: shakeAnim }] }]}>
        <View style={[styles.grid, { gap: CELL_GAP, width: CELL_SIZE * 3 + CELL_GAP * 2 }]}>
          {grid.map((num, idx) => {
            const state = cellStates[idx];
            const showNumber = roundPhase === 'SHOW';

            let cellStyle: any[] = [styles.cell, { width: CELL_SIZE, height: CELL_SIZE }];
            let textStyle: any[] = [styles.cellText];
            let content: React.ReactNode;

            if (state === 'correct') {
              cellStyle.push(styles.cellCorrect);
              textStyle.push(styles.cellTextLight);
              content = <Ionicons name="checkmark" size={32} color="#fff" />;
            } else if (state === 'wrong') {
              cellStyle.push(styles.cellWrong);
              textStyle.push(styles.cellTextLight);
              content = <Ionicons name="close" size={32} color="#fff" />;
            } else if (state === 'missed') {
              cellStyle.push(styles.cellMissed);
              textStyle.push(styles.cellTextLight);
              content = <Text style={[styles.cellText, { color: '#fff', fontSize: 26 }]}>{num}</Text>;
            } else if (state === 'reveal') {
              cellStyle.push(styles.cellReveal);
              content = <Text style={[styles.cellText, { color: '#fff', fontSize: 26 }]}>{num}</Text>;
            } else if (showNumber) {
              content = <Text style={textStyle}>{num}</Text>;
            } else {
              cellStyle.push(styles.cellHidden);
              content = <Text style={styles.cellHiddenText}>?</Text>;
            }

            return (
              <Animated.View
                key={`${idx}`}
                style={[styles.cellWrapper, { width: CELL_SIZE, height: CELL_SIZE, transform: [{ scale: cellAnims[idx] }] }]}
              >
                <TouchableOpacity
                  style={cellStyle}
                  activeOpacity={0.78}
                  onPress={() => handleCellTap(idx, num)}
                  disabled={roundPhase !== 'HIDDEN' || processingRef.current}
                >
                  {content}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const renderInfo = () => (
    <ScrollView contentContainerStyle={styles.phaseContainer} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.infoHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.infoEmoji}>🎯</Text>
        <Text style={styles.infoTitle}>Number Tap</Text>
        <Text style={styles.infoSubtitle}>Remember where it is. Tap it before time runs out!</Text>
      </LinearGradient>

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>How to Play</Text>
        {[
          { icon: '👀', text: 'Numbers appear briefly — memorize where your target is!' },
          { icon: '❓', text: 'Numbers hide — tap the correct blank cell from memory' },
          { icon: '⏱️', text: 'You have 3 seconds to tap — miss it and attempt is wasted' },
          { icon: '🏆', text: 'All correct = bonus coins!' },
        ].map((rule, i) => (
          <View key={i} style={styles.ruleRow}>
            <Text style={styles.ruleIcon}>{rule.icon}</Text>
            <Text style={styles.ruleText}>{rule.text}</Text>
          </View>
        ))}
      </View>

      {infoSettings && (
        <View style={styles.statsGrid}>
          {[
            { val: infoSettings.attemptsPerSession, label: 'Taps / Session' },
            { val: `🪙${infoSettings.coinsPerCorrect}`, label: 'Per Correct' },
            { val: `🪙${infoSettings.bonusCoins}`, label: 'Perfect Bonus' },
            { val: sessionsRemaining, label: 'Sessions Left', danger: sessionsRemaining === 0 },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={[styles.statValue, s.danger && { color: '#EF4444' }]}>{String(s.val)}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {sessionsRemaining === 0 ? (
        <View style={styles.limitBanner}>
          <Ionicons name="time-outline" size={20} color="#EF4444" />
          <Text style={styles.limitText}>Daily session limit reached. Come back tomorrow!</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startBtn, loading && { opacity: 0.6 }]}
          onPress={handleStartGame}
          disabled={loading || !infoSettings?.isActive}
        >
          <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.startGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.startBtnText}>{loading ? 'Loading…' : 'Start Game'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderPlaying = () => {
    const timerColor = timerProgress > 0.5 ? '#10B981' : timerProgress > 0.25 ? '#F59E0B' : '#EF4444';

    return (
      <View style={styles.phaseContainer}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBarLabel}>Attempts left</Text>
            {renderHearts()}
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Correct</Text>
            <Text style={styles.scoreValue}>{correctCount}</Text>
          </View>
        </View>

        <View style={styles.targetSection}>
          <Text style={styles.targetLabel}>FIND THIS NUMBER</Text>
          <Animated.View style={[styles.targetCard, { transform: [{ scale: targetPulse }] }]}>
            <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.targetGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.targetNumber}>{targetNum}</Text>
            </LinearGradient>
          </Animated.View>

          <View style={[styles.phaseBadge, roundPhase === 'SHOW' ? styles.phaseBadgeShow : styles.phaseBadgeHidden]}>
            <Text style={styles.phaseBadgeText}>
              {roundPhase === 'SHOW' ? '👀 Memorize!' : roundPhase === 'HIDDEN' ? '❓ Tap it!' : '⏳ Next…'}
            </Text>
          </View>
        </View>

        <View style={styles.timerBarWrapper}>
          <Animated.View
            style={[
              styles.timerBar,
              {
                width: timerBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: timerColor,
              },
            ]}
          />
        </View>

        {renderGrid()}

        <View style={styles.liveScore}>
          <Text style={styles.liveScoreText}>
            🪙 {correctCount * (settings?.coinsPerCorrect ?? 2)} coins earned so far
          </Text>
        </View>
      </View>
    );
  };

  const renderResult = () => (
    <ScrollView contentContainerStyle={styles.phaseContainer} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={result?.isPerfect ? ['#F59E0B', '#D97706'] : result?.coinsEarned ? ['#7C3AED', '#4F46E5'] : ['#6B7280', '#4B5563']}
        style={styles.resultHeader}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={styles.resultEmoji}>
          {result?.isPerfect ? '🏆' : result?.coinsEarned ? '🎯' : '😢'}
        </Text>
        <Text style={styles.resultTitle}>
          {result?.isPerfect ? 'PERFECT MEMORY!' : result?.coinsEarned ? 'Well Done!' : 'Session Over'}
        </Text>
        <Text style={styles.resultSubtitle}>
          {result?.isPerfect
            ? 'All correct — bonus coins earned!'
            : `${result?.correctClicks ?? 0}/${result?.totalAttempts ?? 0} correct`}
        </Text>
      </LinearGradient>

      {result && (
        <View style={styles.resultStatsCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultRowLabel}>Correct Taps</Text>
            <Text style={styles.resultRowValue}>{result.correctClicks} / {result.totalAttempts}</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.resultRow}>
            <Text style={styles.resultRowLabel}>Base Coins</Text>
            <Text style={styles.resultRowValue}>🪙 {result.coinsEarned - result.bonusCoins}</Text>
          </View>
          {result.bonusCoins > 0 && (
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>Perfect Bonus 🎁</Text>
              <Text style={[styles.resultRowValue, { color: '#F59E0B' }]}>+ 🪙 {result.bonusCoins}</Text>
            </View>
          )}
          <View style={styles.resultDivider} />
          <View style={styles.resultRow}>
            <Text style={[styles.resultRowLabel, { fontWeight: '800', fontSize: 16 }]}>Total Earned</Text>
            <Text style={[styles.resultRowValue, { fontWeight: '900', fontSize: 22, color: '#7C3AED' }]}>
              🪙 {result.coinsEarned}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultRowLabel}>Your Balance</Text>
            <Text style={styles.resultRowValue}>🪙 {result.newBalance}</Text>
          </View>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.resultActions}>
        {sessionsRemaining > 0 && (
          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={() => {
              setResult(null);
              handleStartGame();
            }}
          >
            <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.startGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.startBtnText}>Play Again ({sessionsRemaining} left)</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.closeResultBtn} onPress={onClose}>
          <Text style={styles.closeResultText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHandle} />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {phase === 'INFO' && renderInfo()}
        {phase === 'PLAYING' && renderPlaying()}
        {phase === 'RESULT' && renderResult()}
      </View>
    </Modal>
  );
}

const getStyles = (colors: any, tokens: any, isDark: boolean) => StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    position: 'absolute', top: 8, left: '50%', marginLeft: -20,
  },
  closeBtn: { padding: 8 },

  phaseContainer: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 40 },

  // INFO
  infoHeader: { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, marginTop: 8 },
  infoEmoji: { fontSize: 48, marginBottom: 8 },
  infoTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  infoSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.88)', marginTop: 6, textAlign: 'center' },

  rulesCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
  },
  rulesTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  ruleIcon: { fontSize: 18, marginRight: 10, lineHeight: 22 },
  ruleText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: '#7C3AED' },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  limitBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2',
    borderRadius: 12, padding: 14, gap: 8, marginTop: 4,
  },
  limitText: { flex: 1, fontSize: 14, color: '#EF4444', fontWeight: '600' },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 14, marginVertical: 8 },
  startBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  startGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // PLAYING
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 10 },
  topBarLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  heartsRow: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: width * 0.6, gap: 1 },
  heartIcon: { fontSize: 15 },
  scoreBox: {
    backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#EDE9FE',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center',
  },
  scoreLabel: { fontSize: 10, color: '#7C3AED', fontWeight: '700' },
  scoreValue: { fontSize: 24, fontWeight: '900', color: '#7C3AED' },

  targetSection: { alignItems: 'center', marginBottom: 12 },
  targetLabel: { fontSize: 11, letterSpacing: 2, color: colors.textSecondary, fontWeight: '700', marginBottom: 8 },
  targetCard: {
    borderRadius: 20, overflow: 'hidden',
    elevation: 8, shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
    marginBottom: 10,
  },
  targetGradient: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  targetNumber: { fontSize: 48, fontWeight: '900', color: '#fff' },

  phaseBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  phaseBadgeShow: { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5' },
  phaseBadgeHidden: { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2' },
  phaseBadgeText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },

  timerBarWrapper: {
    height: 6, borderRadius: 3, backgroundColor: isDark ? '#374151' : '#E5E7EB',
    marginBottom: 14, overflow: 'hidden',
  },
  timerBar: { height: '100%', borderRadius: 3 },

  gridWrapper: { alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrapper: {},
  cell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  cellHidden: { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: isDark ? '#374151' : '#D1D5DB' },
  cellCorrect: { backgroundColor: '#10B981', borderColor: '#059669' },
  cellWrong: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  cellMissed: { backgroundColor: '#F59E0B', borderColor: '#D97706' },
  cellReveal: { backgroundColor: '#6D28D9', borderColor: '#5B21B6' },
  cellText: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  cellHiddenText: { fontSize: 26, fontWeight: '900', color: isDark ? '#4B5563' : '#9CA3AF' },
  cellTextLight: { color: '#fff' },

  liveScore: { alignItems: 'center', marginTop: 14 },
  liveScoreText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  // RESULT
  resultHeader: { borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20, marginTop: 8 },
  resultEmoji: { fontSize: 52, marginBottom: 8 },
  resultTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  resultSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },

  resultStatsCard: {
    backgroundColor: colors.surface, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  resultRowLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  resultRowValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '700' },
  resultDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  resultActions: { gap: 12 },
  playAgainBtn: { borderRadius: 16, overflow: 'hidden' },
  closeResultBtn: {
    borderRadius: 16, borderWidth: 2, borderColor: colors.border,
    paddingVertical: 14, alignItems: 'center',
  },
  closeResultText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
});
