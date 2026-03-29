/**
 * app/login.tsx
 * TulKenz OPS — Login Screen
 * HUD structure with readable typography
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Building2,
  Users,
  User,
  Lock,
  KeyRound,
  AlertCircle,
  Shield,
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

type LoginType = 'company' | 'employee' | 'platform';

// ── Corner brackets — used on main containers only ─────────────
function Brackets({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', top: 0, right: 0, width: size, height: size, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color }} />
      <View style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: color }} />
    </>
  );
}

// ── Pulsing dot ────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: anim }} />;
}

// ── Scan line ──────────────────────────────────────────────────
function ScanLine({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 5000, useNativeDriver: true })
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 800] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        backgroundColor: color, opacity: 0.2,
        transform: [{ translateY }],
      }} />
    </Animated.View>
  );
}

// ── Input ──────────────────────────────────────────────────────
interface HudInputProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  autoComplete?: any;
  maxLength?: number;
  editable?: boolean;
  mono?: boolean;
  centered?: boolean;
  accentColor: string;
  bgColor: string;
  textColor: string;
  dimColor: string;
  borderColor: string;
}

function HudInput({
  icon: Icon, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, autoCapitalize, autoComplete,
  maxLength, editable = true, mono, centered,
  accentColor, bgColor, textColor, dimColor, borderColor,
}: HudInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderWidth: 1,
      borderColor: focused ? accentColor : borderColor,
      backgroundColor: bgColor,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <View style={{
        width: 48, height: '100%',
        alignItems: 'center', justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: focused ? accentColor + '50' : borderColor,
        backgroundColor: accentColor + '0A',
      }}>
        <Icon size={17} color={focused ? accentColor : dimColor} />
      </View>
      <TextInput
        style={{
          flex: 1,
          paddingHorizontal: 14,
          fontSize: 15,
          color: textColor,
          fontFamily: mono ? MONO : undefined,
          letterSpacing: mono ? 2 : 0,
          textAlign: centered ? 'center' : 'left',
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={dimColor}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        maxLength={maxLength}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ── Field label ────────────────────────────────────────────────
function FieldLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 1.5, marginBottom: 7, fontFamily: MONO }}>
      {text.toUpperCase()}
    </Text>
  );
}

// ── Telemetry data row ─────────────────────────────────────────
function DataRow({ label, value, color, dimColor }: {
  label: string; value: string; color: string; dimColor: string;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontSize: 11, color: dimColor, fontFamily: MONO, letterSpacing: 1 }}>{label}</Text>
      <Text style={{ fontSize: 11, color, fontFamily: MONO, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signInCompany, signInEmployee, signInPlatformAdmin } = useUser();
  const [loginType, setLoginType] = useState<LoginType>('company');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');

  const C = {
    bg:    colors.hudBg,
    surf:  colors.hudSurface,
    p:     colors.hudPrimary,
    s:     colors.hudSecondary,
    text:  colors.hudTextStrong,
    textS: colors.textSecondary,
    textD: colors.textTertiary,
    bdr:   colors.hudBorder,
    bdrB:  colors.hudBorderBright,
    green: colors.success,
    amber: colors.warning,
    red:   colors.error,
  };

  const accent = loginType === 'platform' ? C.amber : loginType === 'employee' ? C.s : C.p;

  const { mutate: companyMutate, isPending: isCompanyPending } = useMutation({
    mutationFn: async () => signInCompany(email, password),
    onSuccess: () => router.replace('/'),
    onError: (err: Error) => setError(err.message || 'Failed to sign in'),
  });

  const { mutate: platformMutate, isPending: isPlatformPending } = useMutation({
    mutationFn: async () => signInPlatformAdmin(email, password),
    onSuccess: () => router.replace('/'),
    onError: (err: Error) => setError(err.message || 'Failed to sign in'),
  });

  const { mutate: employeeMutate, isPending: isEmployeePending } = useMutation({
    mutationFn: async () => signInEmployee(companyCode, employeeCode, pin),
    onSuccess: () => router.replace('/'),
    onError: (err: Error) => setError(err.message || 'Failed to sign in'),
  });

  const handleCompanyLogin = useCallback(() => {
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    companyMutate();
  }, [email, password, companyMutate]);

  const handleEmployeeLogin = useCallback(() => {
    setError('');
    if (!companyCode || !employeeCode || !pin) { setError('All fields are required'); return; }
    employeeMutate();
  }, [companyCode, employeeCode, pin, employeeMutate]);

  const handlePlatformLogin = useCallback(() => {
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    platformMutate();
  }, [email, password, platformMutate]);

  const isLoading = isCompanyPending || isEmployeePending || isPlatformPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScanLine color={C.p} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── SYSTEM STATUS BAR ── */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: C.bdr,
            paddingHorizontal: 12,
            paddingVertical: 6,
            marginBottom: 24,
            borderRadius: 6,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PulsingDot color={C.green} />
              <Text style={{ fontSize: 10, color: C.textD, fontFamily: MONO, letterSpacing: 1.5 }}>
                SYS // ONLINE
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: C.textD, fontFamily: MONO, letterSpacing: 1.5 }}>
              TULKENZ OPS // v1.0.0
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PulsingDot color={C.p} />
              <Text style={{ fontSize: 10, color: C.textD, fontFamily: MONO, letterSpacing: 1.5 }}>
                SECURE
              </Text>
            </View>
          </View>

          {/* ── LOGO — corner brackets here only ── */}
          <View style={{ alignItems: 'center', marginBottom: 24, paddingVertical: 16, position: 'relative' }}>
            <Brackets color={C.p + '45'} size={18} />

            <View style={{
              width: 88, height: 88,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: C.bdrB,
              backgroundColor: C.surf,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/erhmndrwrhnmllpl3s294' }}
                style={{ width: 78, height: 78 }}
                resizeMode="contain"
              />
            </View>

            <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: 2, marginBottom: 6 }}>
              <Text style={{ color: C.text }}>Tul</Text>
              <Text style={{ color: C.p }}>Kenz</Text>
              <Text style={{ color: C.text }}> OPS</Text>
            </Text>

            <Text style={{ fontSize: 11, color: C.textD, fontFamily: MONO, letterSpacing: 2.5 }}>
              OPERATIONS MANAGEMENT PLATFORM
            </Text>
          </View>

          {/* ── TELEMETRY PANEL ── */}
          <View style={{
            borderWidth: 1,
            borderColor: C.bdr,
            borderRadius: 8,
            backgroundColor: C.surf,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginBottom: 16,
          }}>
            <DataRow label="AUTH // MODULE" value="IDENTITY_V2" color={C.p} dimColor={C.textD} />
            <View style={{ height: 1, backgroundColor: C.bdr }} />
            <DataRow label="ENCRYPTION" value="AES-256" color={C.p} dimColor={C.textD} />
            <View style={{ height: 1, backgroundColor: C.bdr }} />
            <DataRow label="SESSION" value="SECURE" color={C.green} dimColor={C.textD} />
          </View>

          {/* ── LOGIN CARD — corner brackets here only ── */}
          <View style={{
            borderWidth: 1,
            borderColor: C.bdrB,
            borderRadius: 14,
            backgroundColor: C.surf,
            marginBottom: 20,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <Brackets color={accent + '60'} size={12} />

            {/* Card header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 13,
              borderBottomWidth: 1,
              borderBottomColor: C.bdr,
            }}>
              <View style={{ width: 3, height: 16, backgroundColor: accent, borderRadius: 2 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: accent, letterSpacing: 1.5, fontFamily: MONO }}>
                {loginType === 'platform' ? 'PLATFORM // ADMINISTRATOR' :
                 loginType === 'employee' ? 'EMPLOYEE // ACCESS' : 'COMPANY // LOGIN'}
              </Text>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.bdr }}>
              {(['company', 'employee'] as LoginType[]).map(type => {
                const active = loginType === type && loginType !== 'platform';
                const Icon = type === 'company' ? Building2 : Users;
                const tabAccent = type === 'employee' ? C.s : C.p;
                return (
                  <Pressable
                    key={type}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      paddingVertical: 13,
                      borderBottomWidth: 2,
                      borderBottomColor: active ? tabAccent : 'transparent',
                      backgroundColor: active ? tabAccent + '10' : 'transparent',
                    }}
                    onPress={() => { setLoginType(type); setError(''); }}
                  >
                    <Icon size={16} color={active ? tabAccent : C.textD} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: active ? tabAccent : C.textD }}>
                      {type === 'company' ? 'Company' : 'Employee'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Platform admin toggle */}
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 9,
                borderBottomWidth: 1,
                borderBottomColor: C.bdr,
              }}
              onPress={() => { setLoginType(loginType === 'platform' ? 'company' : 'platform'); setError(''); }}
            >
              <KeyRound size={13} color={loginType === 'platform' ? C.amber : C.textD} />
              <Text style={{ fontSize: 13, color: loginType === 'platform' ? C.amber : C.textD, fontWeight: '500' }}>
                {loginType === 'platform' ? '← Back to regular login' : 'Platform Admin Access'}
              </Text>
            </Pressable>

            {/* Error */}
            {!!error && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: C.red + '12',
                borderWidth: 1,
                borderColor: C.red + '40',
                borderRadius: 8,
                padding: 12,
                marginHorizontal: 16,
                marginTop: 14,
              }}>
                <AlertCircle size={16} color={C.red} />
                <Text style={{ flex: 1, color: C.red, fontSize: 13, fontWeight: '500' }}>{error}</Text>
              </View>
            )}

            {/* ── PLATFORM FORM ── */}
            {loginType === 'platform' && (
              <View style={{ padding: 16, gap: 16 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: C.amber + '10',
                  borderWidth: 1,
                  borderColor: C.amber + '35',
                  borderRadius: 8,
                  paddingVertical: 11,
                }}>
                  <Shield size={15} color={C.amber} />
                  <Text style={{ fontSize: 13, color: C.amber, fontWeight: '600' }}>
                    Administrator Access Only
                  </Text>
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Admin Email" color={C.amber} />
                  <HudInput
                    icon={User} value={email} onChangeText={setEmail}
                    placeholder="admin@tulkenz.net" keyboardType="email-address"
                    autoCapitalize="none" autoComplete="email" editable={!isLoading}
                    accentColor={C.amber} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.amber + '45'}
                  />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Password" color={C.amber} />
                  <HudInput
                    icon={Lock} value={password} onChangeText={setPassword}
                    placeholder="Enter your password" secureTextEntry
                    autoCapitalize="none" editable={!isLoading}
                    accentColor={C.amber} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.amber + '45'}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [{
                    height: 52, borderWidth: 1, borderColor: C.amber, borderRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? C.amber + '18' : 'transparent',
                    opacity: isLoading ? 0.5 : 1,
                  }]}
                  onPress={handlePlatformLogin}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={C.amber} />
                    : <Text style={{ color: C.amber, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, fontFamily: MONO }}>
                        AUTHENTICATE // PLATFORM ADMIN
                      </Text>
                  }
                </Pressable>
              </View>
            )}

            {/* ── COMPANY FORM ── */}
            {loginType === 'company' && (
              <View style={{ padding: 16, gap: 16 }}>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Email Address" color={C.p} />
                  <HudInput
                    icon={User} value={email} onChangeText={setEmail}
                    placeholder="company@example.com" keyboardType="email-address"
                    autoCapitalize="none" autoComplete="email" editable={!isLoading}
                    accentColor={C.p} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.bdrB}
                  />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Password" color={C.p} />
                  <HudInput
                    icon={Lock} value={password} onChangeText={setPassword}
                    placeholder="Enter your password" secureTextEntry
                    autoCapitalize="none" editable={!isLoading}
                    accentColor={C.p} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.bdrB}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [{
                    height: 52, borderWidth: 1, borderColor: C.p, borderRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? C.p + '18' : 'transparent',
                    opacity: isLoading ? 0.5 : 1,
                  }]}
                  onPress={handleCompanyLogin}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={C.p} />
                    : <Text style={{ color: C.p, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, fontFamily: MONO }}>
                        AUTHENTICATE // COMPANY
                      </Text>
                  }
                </Pressable>
              </View>
            )}

            {/* ── EMPLOYEE FORM ── */}
            {loginType === 'employee' && (
              <View style={{ padding: 16, gap: 16 }}>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Facility Code" color={C.s} />
                  <HudInput
                    icon={Building2} value={companyCode}
                    onChangeText={t => setCompanyCode(t.toUpperCase())}
                    placeholder="WEST / HQ / PLANT1" autoCapitalize="characters"
                    maxLength={20} editable={!isLoading} mono centered
                    accentColor={C.s} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.bdrB}
                  />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Employee Code" color={C.s} />
                  <HudInput
                    icon={User} value={employeeCode}
                    onChangeText={t => setEmployeeCode(t.toUpperCase())}
                    placeholder="EMP-XXXXXXXX" autoCapitalize="characters"
                    maxLength={15} editable={!isLoading} mono centered
                    accentColor={C.s} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.bdrB}
                  />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="PIN" color={C.s} />
                  <HudInput
                    icon={KeyRound} value={pin}
                    onChangeText={t => setPin(t.replace(/\D/g, ''))}
                    placeholder="••••" secureTextEntry keyboardType="number-pad"
                    maxLength={6} editable={!isLoading} mono centered
                    accentColor={C.s} bgColor={C.bg} textColor={C.text}
                    dimColor={C.textD} borderColor={C.bdrB}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [{
                    height: 52, borderWidth: 1, borderColor: C.s, borderRadius: 8,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: pressed ? C.s + '18' : 'transparent',
                    opacity: isLoading ? 0.5 : 1,
                  }]}
                  onPress={handleEmployeeLogin}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={C.s} />
                    : <Text style={{ color: C.s, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, fontFamily: MONO }}>
                        AUTHENTICATE // EMPLOYEE
                      </Text>
                  }
                </Pressable>

                <View style={{
                  backgroundColor: C.surf,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.bdr,
                  padding: 12,
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <Text style={{ fontSize: 13, color: C.textS, textAlign: 'center' }}>
                    Use your facility code, employee code, and PIN
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textD, textAlign: 'center' }}>
                    Contact your administrator if you need access
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── FOOTER ── */}
          <Text style={{ fontSize: 12, color: C.textD, textAlign: 'center', letterSpacing: 0.5 }}>
            TulKenz OPS  •  Secure Access  •  All activity logged
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
