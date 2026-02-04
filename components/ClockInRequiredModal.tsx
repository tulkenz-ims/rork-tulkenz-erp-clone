import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { LogIn, AlertTriangle, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';


interface ClockInRequiredModalProps {
  visible: boolean;
  onClockIn: () => void;
  onAccessTimeOnly: () => void;
}

export default function ClockInRequiredModal({ visible, onClockIn, onAccessTimeOnly }: ClockInRequiredModalProps) {
  const { colors } = useTheme();
  const { userProfile } = useUser();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockingIn, setIsClockingIn] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (visible) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible, pulseAnim]);

  const handleClockIn = useCallback(async () => {
    setIsClockingIn(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setTimeout(() => {
      onClockIn();
      setIsClockingIn(false);
    }, 500);
  }, [onClockIn]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    container: {
      width: '100%',
      maxWidth: 380,
      borderRadius: 24,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.warning,
      paddingVertical: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    warningIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
      textAlign: 'center',
      marginTop: 4,
    },
    content: {
      backgroundColor: colors.surface,
      padding: 24,
    },
    greeting: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 24,
    },
    timeContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    timeText: {
      fontSize: 42,
      fontWeight: '700' as const,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    dateText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    clockInButton: {
      backgroundColor: colors.success,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      gap: 10,
    },
    clockInButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    clockInButtonDisabled: {
      backgroundColor: colors.textSecondary,
    },
    timeOnlyButton: {
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 16,
      gap: 10,
      borderWidth: 2,
      borderColor: colors.primary,
      marginTop: 12,
    },
    timeOnlyButtonPressed: {
      opacity: 0.7,
    },
    timeOnlyButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.primary,
    },
    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 4,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    orText: {
      paddingHorizontal: 16,
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.textSecondary,
    },
    clockInButtonText: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    infoBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      marginTop: 20,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 4,
    },
    infoText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });

  const firstName = userProfile?.first_name || 'Employee';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.header}>
            <View style={styles.warningIcon}>
              <AlertTriangle size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Clock In Required</Text>
            <Text style={styles.headerSubtitle}>Clock in to access all work modules</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.greeting}>Good {getTimeOfDay()}, {firstName}!</Text>
            <Text style={styles.message}>
              To ensure compliance with labor regulations and accurate time tracking, 
              you must clock in before accessing work modules. Without clocking in, 
              you may only view your time records and manage time-off requests.
            </Text>
            
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
            </View>
            
            <Pressable
              style={({ pressed }) => [
                styles.clockInButton,
                pressed && styles.clockInButtonPressed,
                isClockingIn && styles.clockInButtonDisabled,
              ]}
              onPress={handleClockIn}
              disabled={isClockingIn}
            >
              <LogIn size={22} color="#FFFFFF" />
              <Text style={styles.clockInButtonText}>
                {isClockingIn ? 'Clocking In...' : 'Clock In Now'}
              </Text>
            </Pressable>
            
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>
            
            <Pressable
              style={({ pressed }) => [
                styles.timeOnlyButton,
                pressed && styles.timeOnlyButtonPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAccessTimeOnly();
              }}
            >
              <Clock size={20} color={colors.primary} />
              <Text style={styles.timeOnlyButtonText}>Access Time & Bulletin</Text>
            </Pressable>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>What can I access without clocking in?</Text>
              <Text style={styles.infoText}>
                • View time history and schedule{"\n"}
                • View PTO, vacation, and sick day balances{"\n"}
                • Submit time-off requests{"\n"}
                • View bulletin board announcements{"\n\n"}
                Work requests and all other modules require you to clock in first.
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
