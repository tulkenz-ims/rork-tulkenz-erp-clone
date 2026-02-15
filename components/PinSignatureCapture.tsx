import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import {
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  User,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useVerifySignaturePin, SignatureVerification } from '@/hooks/usePinSignature';
import * as Haptics from 'expo-haptics';

interface PinSignatureCaptureProps {
  /** Called when PIN is verified — form should store this verification */
  onVerified: (verification: SignatureVerification) => void;
  /** Called when verification is cleared/reset */
  onCleared?: () => void;
  /** Form type for display context */
  formLabel?: string;
  /** If true, component is compact (for inline use) */
  compact?: boolean;
  /** If already verified, pass the existing verification to show stamp */
  existingVerification?: SignatureVerification | null;
  /** Whether this is required (affects visual styling) */
  required?: boolean;
  /** Custom accent color */
  accentColor?: string;
}

export default function PinSignatureCapture({
  onVerified,
  onCleared,
  formLabel,
  compact = false,
  existingVerification = null,
  required = true,
  accentColor = '#8B5CF6',
}: PinSignatureCaptureProps) {
  const { colors } = useTheme();
  const [initials, setInitials] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<SignatureVerification | null>(existingVerification);
  const pinRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (existingVerification) setVerification(existingVerification);
  }, [existingVerification]);

  const verifyMutation = useVerifySignaturePin({
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVerification(data);
      setError(null);
      setInitials('');
      setPin('');
      onVerified(data);
    },
    onError: (err) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message);
      setPin('');
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    },
  });

  const handleVerify = () => {
    if (!initials.trim()) {
      setError('Enter your initials');
      return;
    }
    if (!pin.trim()) {
      setError('Enter your PIN');
      return;
    }
    setError(null);
    verifyMutation.mutate({ initials: initials.trim(), pin: pin.trim() });
  };

  const handleClear = () => {
    setVerification(null);
    setInitials('');
    setPin('');
    setError(null);
    onCleared?.();
  };

  const handleInitialsSubmit = () => {
    if (initials.trim().length >= 2) {
      pinRef.current?.focus();
    }
  };

  // ── Verified state ────────────────────────────────────────
  if (verification) {
    return (
      <View style={[
        styles.container,
        styles.verifiedContainer,
        { backgroundColor: '#10B98110', borderColor: '#10B981' },
        compact && styles.compactContainer,
      ]}>
        <View style={styles.verifiedHeader}>
          <View style={styles.verifiedLeft}>
            <CheckCircle size={18} color="#10B981" />
            <Text style={[styles.verifiedLabel, { color: '#10B981' }]}>Signature Verified</Text>
          </View>
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.clearText, { color: colors.textTertiary }]}>Clear</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.stampText, { color: colors.text }]}>
          {verification.signatureStamp}
        </Text>
      </View>
    );
  }

  // ── Input state ───────────────────────────────────────────
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: error ? '#EF4444' : required ? accentColor + '60' : colors.border,
          transform: [{ translateX: shakeAnim }],
        },
        compact && styles.compactContainer,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Lock size={16} color={required ? accentColor : colors.textSecondary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Signature Required
          </Text>
        </View>
        {required && (
          <View style={[styles.requiredBadge, { backgroundColor: accentColor + '20' }]}>
            <Text style={[styles.requiredText, { color: accentColor }]}>REQUIRED</Text>
          </View>
        )}
      </View>

      {formLabel && (
        <Text style={[styles.formContext, { color: colors.textSecondary }]}>
          {formLabel}
        </Text>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        {/* Initials */}
        <View style={styles.initialsContainer}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Initials</Text>
          <TextInput
            style={[styles.initialsInput, {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            placeholder="SR"
            placeholderTextColor={colors.textTertiary}
            value={initials}
            onChangeText={(text) => setInitials(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={4}
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={handleInitialsSubmit}
          />
        </View>

        {/* PIN */}
        <View style={styles.pinContainer}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PIN</Text>
          <TextInput
            ref={pinRef}
            style={[styles.pinInput, {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            placeholder="••••"
            placeholderTextColor={colors.textTertiary}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/[^0-9]/g, ''))}
            maxLength={6}
            keyboardType="number-pad"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />
        </View>

        {/* Verify button */}
        <View style={styles.verifyBtnContainer}>
          <Text style={[styles.inputLabel, { color: 'transparent' }]}>.</Text>
          <TouchableOpacity
            style={[styles.verifyBtn, {
              backgroundColor: initials.length >= 2 && pin.length >= 4 ? accentColor : colors.border,
            }]}
            onPress={handleVerify}
            disabled={verifyMutation.isPending || initials.length < 2 || pin.length < 4}
            activeOpacity={0.7}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Shield size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorRow}>
          <XCircle size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Help text */}
      <Text style={[styles.helpText, { color: colors.textTertiary }]}>
        Enter your initials and signature PIN to verify identity
      </Text>
    </Animated.View>
  );
}

// ── Helper: Check if a verification exists ────────────────────
export function isSignatureVerified(verification: SignatureVerification | null | undefined): boolean {
  return !!verification?.employeeId && !!verification?.signatureStamp;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    borderStyle: 'dashed',
    gap: 10,
  },
  compactContainer: {
    padding: 10,
    gap: 8,
  },
  verifiedContainer: {
    borderStyle: 'solid',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formContext: {
    fontSize: 12,
    marginTop: -4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  initialsContainer: {
    width: 80,
    gap: 4,
  },
  pinContainer: {
    flex: 1,
    gap: 4,
  },
  verifyBtnContainer: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  initialsInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 4,
  },
  verifyBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  helpText: {
    fontSize: 11,
    textAlign: 'center',
  },
  verifiedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stampText: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
