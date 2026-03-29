/**
 * app/login.tsx
 * TulKenz OPS — Adaptive Login Screen
 * Adapts visual style to active theme: HUD/JARVIS, Clean Light, Classic, Ghost Protocol
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, Users, User, Lock, KeyRound, AlertCircle, Shield } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeStyle } from '@/hooks/useThemeStyle';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
type LoginType = 'company' | 'employee' | 'platform';

// ── Corner brackets (HUD only) ─────────────────────────────────
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

// ── Scan line (HUD only) ───────────────────────────────────────
function ScanLine({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(anim, { toValue: 1, duration: 5000, useNativeDriver: true })).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 800] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: color, opacity: 0.2, transform: [{ translateY }] }} />
    </Animated.View>
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

// ── Adaptive input ─────────────────────────────────────────────
interface InputProps {
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
}

function AdaptiveInput({ icon: Icon, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, autoComplete, maxLength, editable = true,
  mono, centered, accentColor }: InputProps) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();
  const ts = useThemeStyle();

  return (
    <View style={[
      ts.input.container,
      focused ? { borderColor: accentColor } : {},
      ts.isGhost && { borderRadius: 0, borderColor: focused ? accentColor : '#333333', backgroundColor: '#F0F0F0' },
      ts.isClassic && { backgroundColor: '#FAF7F2', borderColor: focused ? accentColor : colors.border },
    ]}>
      <View style={{
        width: 44, height: '100%', alignItems: 'center', justifyContent: 'center',
        borderRightWidth: 1, borderRightColor: focused ? accentColor + '50' : colors.border,
        backgroundColor: accentColor + '0A',
      }}>
        <Icon size={17} color={focused ? accentColor : colors.textTertiary} />
      </View>
      <TextInput
        style={[ts.input.text, {
          paddingHorizontal: 14,
          fontFamily: mono ? MONO : ts.font.primary,
          letterSpacing: mono ? 2 : 0,
          textAlign: centered ? 'center' : 'left',
        }]}
        value={value} onChangeText={onChangeText}
        placeholder={placeholder} placeholderTextColor={colors.textTertiary}
        secureTextEntry={secureTextEntry} keyboardType={keyboardType}
        autoCapitalize={autoCapitalize} autoComplete={autoComplete}
        maxLength={maxLength} editable={editable}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </View>
  );
}

// ── Field label ────────────────────────────────────────────────
function FieldLabel({ text, color }: { text: string; color: string }) {
  const ts = useThemeStyle();
  return (
    <Text style={[ts.label.section, { color, marginBottom: 7 }]}>
      {text.toUpperCase()}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const ts = useThemeStyle();
  const { signInCompany, signInEmployee, signInPlatformAdmin } = useUser();
  const [loginType, setLoginType] = useState<LoginType>('company');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');

  const accent = loginType === 'platform' ? colors.warning : loginType === 'employee' ? colors.hudSecondary : colors.hudPrimary;

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

  // ── Brand name rendering ───────────────────────────────────────
  const BrandName = () => {
    if (ts.isClassic) {
      return (
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, fontFamily: ts.font.serif, letterSpacing: 1 }}>
          TulKenz OPS
        </Text>
      );
    }
    if (ts.isGhost) {
      return (
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#111111', letterSpacing: 4, textTransform: 'uppercase' }}>
          TULKENZ OPS
        </Text>
      );
    }
    // HUD / Clean
    return (
      <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: ts.isHUD ? 2 : 1, marginBottom: 6 }}>
        <Text style={{ color: colors.text }}>Tul</Text>
        <Text style={{ color: colors.hudPrimary }}>Kenz</Text>
        <Text style={{ color: colors.text }}> OPS</Text>
      </Text>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {ts.isHUD && <ScanLine color={colors.hudPrimary} />}

      {/* Ghost Protocol top bar */}
      {ts.isGhost && (
        <View style={{ backgroundColor: '#111111', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 8, letterSpacing: 3, color: '#FFFFFF', fontFamily: MONO }}>TULKENZ OPS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <PulsingDot color="#CC0000" />
            <Text style={{ fontSize: 7, letterSpacing: 2, color: '#888888', fontFamily: MONO }}>RESTRICTED</Text>
          </View>
        </View>
      )}

      {/* Classic top rule */}
      {ts.isClassic && (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ height: 2, backgroundColor: colors.border }} />
          <View style={{ height: 1, backgroundColor: colors.border, marginTop: 2, opacity: 0.5 }} />
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        >

          {/* ── SYSTEM STATUS (HUD only) ─────────────────────────── */}
          {ts.isHUD && (
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              borderWidth: 1, borderColor: colors.hudBorder,
              paddingHorizontal: 12, paddingVertical: 6, marginBottom: 24, borderRadius: ts.radius.sm,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PulsingDot color={colors.success} />
                <Text style={[ts.label.section, { color: colors.textTertiary }]}>SYS // ONLINE</Text>
              </View>
              <Text style={[ts.label.section, { color: colors.textTertiary }]}>TULKENZ OPS // v1.0.0</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PulsingDot color={colors.hudPrimary} />
                <Text style={[ts.label.section, { color: colors.textTertiary }]}>SECURE</Text>
              </View>
            </View>
          )}

          {/* ── LOGO / HEADER ────────────────────────────────────── */}
          <View style={{
            alignItems: 'center', marginBottom: 24,
            paddingVertical: ts.isClassic ? 20 : 16,
            position: 'relative',
          }}>
            {ts.isHUD && <Brackets color={colors.hudPrimary + '45'} size={18} />}

            {/* Classic ornament */}
            {ts.isClassic && (
              <View style={{ width: '60%', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ height: 2, width: '100%', backgroundColor: colors.border }} />
                <View style={{ height: 1, width: '100%', backgroundColor: colors.border, marginTop: 2, opacity: 0.5 }} />
              </View>
            )}

            {/* Logo */}
            <View style={{
              width: ts.isGhost ? 60 : 88,
              height: ts.isGhost ? 60 : 88,
              borderRadius: ts.isGhost ? 0 : ts.radius.lg,
              borderWidth: 1,
              borderColor: ts.isGhost ? '#333333' : colors.hudBorderBright,
              backgroundColor: ts.isGhost ? '#111111' : colors.hudSurface,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/erhmndrwrhnmllpl3s294' }}
                style={{ width: ts.isGhost ? 50 : 78, height: ts.isGhost ? 50 : 78 }}
                resizeMode="contain"
              />
            </View>

            <BrandName />

            <Text style={[ts.label.hint, { letterSpacing: ts.isHUD ? 2.5 : 1, marginTop: 4 }]}>
              {ts.isHUD ? 'OPERATIONS MANAGEMENT PLATFORM'
                : ts.isGhost ? 'OPERATIONS MANAGEMENT — RESTRICTED ACCESS'
                : ts.isClassic ? 'Operations Management Platform'
                : 'Operations Management Platform'}
            </Text>

            {ts.isClassic && (
              <View style={{ width: '60%', alignItems: 'center', marginTop: 12 }}>
                <View style={{ height: 1, width: '100%', backgroundColor: colors.border, opacity: 0.5 }} />
                <View style={{ height: 2, width: '100%', backgroundColor: colors.border, marginTop: 2 }} />
              </View>
            )}
          </View>

          {/* ── HUD TELEMETRY PANEL ──────────────────────────────── */}
          {ts.isHUD && (
            <View style={[ts.card.surface, { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 16 }]}>
              {[
                { label: 'AUTH // MODULE', value: 'IDENTITY_V2', color: colors.hudPrimary },
                { label: 'ENCRYPTION',    value: 'AES-256',     color: colors.hudPrimary },
                { label: 'SESSION',       value: 'SECURE',      color: colors.success },
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
                    <Text style={[ts.label.hint, { fontFamily: MONO, letterSpacing: 1 }]}>{row.label}</Text>
                    <Text style={{ fontSize: 11, color: row.color, fontFamily: MONO, fontWeight: '600' }}>{row.value}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={ts.divider} />}
                </View>
              ))}
            </View>
          )}

          {/* ── LOGIN CARD ───────────────────────────────────────── */}
          <View style={[
            ts.card.surface,
            { marginBottom: 20, overflow: 'hidden', position: 'relative' },
            ts.isGhost && { borderWidth: 0, borderTopWidth: 3, borderTopColor: '#CC0000' },
          ]}>
            {ts.isHUD && <Brackets color={accent + '60'} size={12} />}

            {/* Card header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 16, paddingVertical: 13,
              borderBottomWidth: 1, borderBottomColor: colors.border,
              backgroundColor: ts.isGhost ? '#111111' : 'transparent',
            }}>
              {ts.isHUD && <View style={{ width: 3, height: 16, backgroundColor: accent, borderRadius: 2 }} />}
              <Text style={[
                ts.label.section,
                { color: ts.isGhost ? '#FFFFFF' : accent },
              ]}>
                {loginType === 'platform' ? 'Platform Administrator'
                  : loginType === 'employee' ? 'Employee Access'
                  : 'Company Login'}
              </Text>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
              {(['company', 'employee'] as LoginType[]).map(type => {
                const active = loginType === type && loginType !== 'platform';
                const Icon = type === 'company' ? Building2 : Users;
                const tabAccent = type === 'employee' ? colors.hudSecondary : colors.hudPrimary;
                return (
                  <Pressable key={type}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 7, paddingVertical: 13,
                      borderBottomWidth: 2, borderBottomColor: active ? tabAccent : 'transparent',
                      backgroundColor: active ? tabAccent + '10' : 'transparent',
                    }}
                    onPress={() => { setLoginType(type); setError(''); }}
                  >
                    <Icon size={16} color={active ? tabAccent : colors.textTertiary} />
                    <Text style={[ts.label.body, { color: active ? tabAccent : colors.textTertiary, fontWeight: '600' }]}>
                      {type === 'company' ? 'Company' : 'Employee'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Platform admin toggle */}
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}
              onPress={() => { setLoginType(loginType === 'platform' ? 'company' : 'platform'); setError(''); }}
            >
              <KeyRound size={13} color={loginType === 'platform' ? colors.warning : colors.textTertiary} />
              <Text style={[ts.label.secondary, { color: loginType === 'platform' ? colors.warning : colors.textTertiary }]}>
                {loginType === 'platform' ? '← Back to regular login' : 'Platform Admin Access'}
              </Text>
            </Pressable>

            {/* Error */}
            {!!error && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.error + '40',
                borderRadius: ts.radius.md, padding: 12, marginHorizontal: 16, marginTop: 14,
              }}>
                <AlertCircle size={16} color={colors.error} />
                <Text style={[ts.label.secondary, { flex: 1, color: colors.error, fontWeight: '500' }]}>{error}</Text>
              </View>
            )}

            {/* ── PLATFORM FORM ── */}
            {loginType === 'platform' && (
              <View style={{ padding: 16, gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.warning + '10', borderWidth: 1, borderColor: colors.warning + '35', borderRadius: ts.radius.md, paddingVertical: 11 }}>
                  <Shield size={15} color={colors.warning} />
                  <Text style={[ts.label.secondary, { color: colors.warning, fontWeight: '600' }]}>Administrator Access Only</Text>
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Admin Email" color={colors.warning} />
                  <AdaptiveInput icon={User} value={email} onChangeText={setEmail} placeholder="admin@tulkenz.net" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isLoading} accentColor={colors.warning} />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Password" color={colors.warning} />
                  <AdaptiveInput icon={Lock} value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" editable={!isLoading} accentColor={colors.warning} />
                </View>
                <Pressable
                  style={[ts.button.primary, { borderColor: colors.warning, opacity: isLoading ? 0.5 : 1 }]}
                  onPress={handlePlatformLogin} disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator size="small" color={colors.warning} />
                    : <Text style={[ts.button.primaryText, { color: colors.warning }]}>Authenticate — Platform Admin</Text>}
                </Pressable>
              </View>
            )}

            {/* ── COMPANY FORM ── */}
            {loginType === 'company' && (
              <View style={{ padding: 16, gap: 16 }}>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Email Address" color={colors.hudPrimary} />
                  <AdaptiveInput icon={User} value={email} onChangeText={setEmail} placeholder="company@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isLoading} accentColor={colors.hudPrimary} />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Password" color={colors.hudPrimary} />
                  <AdaptiveInput icon={Lock} value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" editable={!isLoading} accentColor={colors.hudPrimary} />
                </View>
                <Pressable
                  style={[ts.button.primary, { opacity: isLoading ? 0.5 : 1 }]}
                  onPress={handleCompanyLogin} disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator size="small" color={colors.hudPrimary} />
                    : <Text style={ts.button.primaryText}>Authenticate — Company</Text>}
                </Pressable>
              </View>
            )}

            {/* ── EMPLOYEE FORM ── */}
            {loginType === 'employee' && (
              <View style={{ padding: 16, gap: 16 }}>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Facility Code" color={colors.hudSecondary} />
                  <AdaptiveInput icon={Building2} value={companyCode} onChangeText={t => setCompanyCode(t.toUpperCase())} placeholder="WEST / HQ / PLANT1" autoCapitalize="characters" maxLength={20} editable={!isLoading} mono centered accentColor={colors.hudSecondary} />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="Employee Code" color={colors.hudSecondary} />
                  <AdaptiveInput icon={User} value={employeeCode} onChangeText={t => setEmployeeCode(t.toUpperCase())} placeholder="EMP-XXXXXXXX" autoCapitalize="characters" maxLength={15} editable={!isLoading} mono centered accentColor={colors.hudSecondary} />
                </View>
                <View style={{ gap: 7 }}>
                  <FieldLabel text="PIN" color={colors.hudSecondary} />
                  <AdaptiveInput icon={KeyRound} value={pin} onChangeText={t => setPin(t.replace(/\D/g, ''))} placeholder="••••" secureTextEntry keyboardType="number-pad" maxLength={6} editable={!isLoading} mono centered accentColor={colors.hudSecondary} />
                </View>
                <Pressable
                  style={[ts.button.primary, { borderColor: colors.hudSecondary, opacity: isLoading ? 0.5 : 1 }]}
                  onPress={handleEmployeeLogin} disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator size="small" color={colors.hudSecondary} />
                    : <Text style={[ts.button.primaryText, { color: colors.hudSecondary }]}>Authenticate — Employee</Text>}
                </Pressable>
                <View style={[ts.card.inset, { padding: 12, alignItems: 'center', gap: 4 }]}>
                  <Text style={[ts.label.secondary, { textAlign: 'center' }]}>
                    Use your facility code, employee code, and PIN
                  </Text>
                  <Text style={[ts.label.hint, { textAlign: 'center' }]}>
                    Contact your administrator if you need access
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── FOOTER ────────────────────────────────────────────── */}
          {ts.isClassic && (
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <View style={{ height: 1, width: '60%', backgroundColor: colors.border, opacity: 0.5 }} />
              <View style={{ height: 2, width: '60%', backgroundColor: colors.border, marginTop: 2 }} />
            </View>
          )}
          <Text style={[ts.label.hint, { textAlign: 'center', letterSpacing: 0.5 }]}>
            TulKenz OPS  •  Secure Access  •  All activity logged
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
