/**
 * app/login.tsx
 * TulKenz OPS — HUD theme login screen
 * All logic identical to original — visual layer rebuilt to match Tony Stark HUD.
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Building2,
  Users,
  User,
  Lock,
  KeyRound,
  AlertCircle,
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';

// ── HUD Theme ──────────────────────────────────────────────────
const HUD = {
  bg:           '#020912',
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  cyanDim:      '#00e5ff18',
  cyanMid:      '#00e5ff44',
  green:        '#00ff88',
  amber:        '#ffb800',
  amberDim:     '#ffb80018',
  red:          '#ff2d55',
  redDim:       '#ff2d5518',
  purple:       '#7b61ff',
  purpleDim:    '#7b61ff18',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
  borderCyan:   '#00e5ff30',
};

type LoginType = 'company' | 'employee' | 'platform';

// ── Pulsing dot ────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1,   duration: 1100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: color, opacity: anim,
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 4,
    }} />
  );
}

// ── HUD Input ──────────────────────────────────────────────────
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
  accentColor?: string;
}

function HudInput({
  icon: Icon, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, autoCapitalize, autoComplete,
  maxLength, editable = true, mono, centered, accentColor = HUD.cyan,
}: HudInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[
      inp.wrap,
      { borderColor: focused ? accentColor : HUD.borderBright },
      focused && { shadowColor: accentColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    ]}>
      <View style={[inp.iconBox, { backgroundColor: accentColor + '18' }]}>
        <Icon size={16} color={focused ? accentColor : HUD.textDim} />
      </View>
      <TextInput
        style={[
          inp.field,
          mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 2 },
          centered && { textAlign: 'center' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={HUD.textDim}
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
const inp = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', backgroundColor: HUD.bgCard, borderRadius: 12, borderWidth: 1, overflow: 'hidden', height: 52 },
  iconBox: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: HUD.border },
  field:   { flex: 1, paddingHorizontal: 14, fontSize: 15, color: HUD.text },
});

// ── HUD Label ──────────────────────────────────────────────────
function FieldLabel({ text, color = HUD.textSec }: { text: string; color?: string }) {
  return <Text style={{ fontSize: 10, fontWeight: '800', color, letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>{text}</Text>;
}

// ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signInCompany, signInEmployee, signInPlatformAdmin } = useUser();
  const [loginType, setLoginType] = useState<LoginType>('company');
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');



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
    if (!email || !password) { setError('Please enter email and password'); return; }
    companyMutate();
  }, [email, password, companyMutate]);

  const handleEmployeeLogin = useCallback(() => {
    setError('');
    if (!companyCode || !employeeCode || !pin) { setError('Please fill in all fields'); return; }
    employeeMutate();
  }, [companyCode, employeeCode, pin, employeeMutate]);

  const handlePlatformLogin = useCallback(() => {
    setError('');
    if (!email || !password) { setError('Please enter email and password'); return; }
    platformMutate();
  }, [email, password, platformMutate]);

  const isLoading = isCompanyPending || isEmployeePending || isPlatformPending;

  // Active tab color
  const tabColor = loginType === 'platform' ? HUD.amber : HUD.cyan;

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── HEADER ── */}
          <View style={s.header}>
            {/* Corner accents */}
            <View style={[s.cornerTL, { borderColor: HUD.cyanMid }]} />
            <View style={[s.cornerTR, { borderColor: HUD.cyanMid }]} />

            <View style={s.logoWrap}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/erhmndrwrhnmllpl3s294' }}
                style={s.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={s.brand}>
              <Text style={{ color: HUD.text }}>Tul</Text>
              <Text style={{ color: HUD.cyan }}>Kenz</Text>
              <Text style={{ color: HUD.text }}> OPS</Text>
            </Text>

            <View style={s.statusRow}>
              <PulsingDot color={HUD.green} />
              <Text style={s.statusText}>SYSTEMS ONLINE</Text>
            </View>
          </View>

          {/* ── LOGIN CARD ── */}
          <View style={s.card}>

            {/* Corner accents on card */}
            <View style={[s.cardCornerTL, { borderColor: tabColor + '60' }]} />
            <View style={[s.cardCornerBR, { borderColor: tabColor + '60' }]} />

            {/* Tab toggle */}
            <View style={s.tabs}>
              {(['company', 'employee'] as LoginType[]).map(type => {
                const active = loginType === type && loginType !== 'platform';
                const Icon = type === 'company' ? Building2 : Users;
                return (
                  <Pressable
                    key={type}
                    style={[s.tab, active && { backgroundColor: HUD.cyan + '15', borderBottomColor: HUD.cyan }]}
                    onPress={() => { setLoginType(type); setError(''); }}
                  >
                    <Icon size={15} color={active ? HUD.cyan : HUD.textDim} />
                    <Text style={[s.tabText, active && { color: HUD.cyan }]}>
                      {type === 'company' ? 'Company' : 'Employee'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Platform admin link */}
            <Pressable
              style={s.platformLink}
              onPress={() => { setLoginType(loginType === 'platform' ? 'company' : 'platform'); setError(''); }}
            >
              <KeyRound size={12} color={loginType === 'platform' ? HUD.amber : HUD.textDim} />
              <Text style={[s.platformLinkText, loginType === 'platform' && { color: HUD.amber }]}>
                {loginType === 'platform' ? '← Back to regular login' : 'Platform Admin'}
              </Text>
            </Pressable>

            {/* Error */}
            {!!error && (
              <View style={s.errorBox}>
                <AlertCircle size={15} color={HUD.red} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* ── PLATFORM FORM ── */}
            {loginType === 'platform' && (
              <View style={s.form}>
                <View style={[s.platformBadge, { backgroundColor: HUD.amberDim, borderColor: HUD.amber + '40' }]}>
                  <KeyRound size={14} color={HUD.amber} />
                  <Text style={[s.platformBadgeText, { color: HUD.amber }]}>Platform Administrator Access</Text>
                </View>
                <View style={s.field}>
                  <FieldLabel text="Admin Email" color={HUD.amber} />
                  <HudInput icon={User} value={email} onChangeText={setEmail} placeholder="admin@tulkenz.net" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isLoading} accentColor={HUD.amber} />
                </View>
                <View style={s.field}>
                  <FieldLabel text="Password" color={HUD.amber} />
                  <HudInput icon={Lock} value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" editable={!isLoading} accentColor={HUD.amber} />
                </View>
                <Pressable style={({ pressed }) => [s.btn, { backgroundColor: HUD.amber }, pressed && s.btnPressed, isLoading && s.btnDisabled]} onPress={handlePlatformLogin} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={[s.btnText, { color: '#1a0e00' }]}>Sign in as Platform Admin</Text>}
                </Pressable>
              </View>
            )}

            {/* ── COMPANY FORM ── */}
            {loginType === 'company' && (
              <View style={s.form}>
                <View style={s.field}>
                  <FieldLabel text="Email Address" />
                  <HudInput icon={User} value={email} onChangeText={setEmail} placeholder="company@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isLoading} />
                </View>
                <View style={s.field}>
                  <FieldLabel text="Password" />
                  <HudInput icon={Lock} value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry autoCapitalize="none" editable={!isLoading} />
                </View>
                <Pressable style={({ pressed }) => [s.btn, pressed && s.btnPressed, isLoading && s.btnDisabled]} onPress={handleCompanyLogin} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnText}>Sign in as Company Owner</Text>}
                </Pressable>
              </View>
            )}

            {/* ── EMPLOYEE FORM ── */}
            {loginType === 'employee' && (
              <View style={s.form}>
                <View style={s.field}>
                  <FieldLabel text="Facility Code" />
                  <HudInput icon={Building2} value={companyCode} onChangeText={t => setCompanyCode(t.toUpperCase())} placeholder="e.g., WEST, HQ, PLANT1" autoCapitalize="characters" maxLength={20} editable={!isLoading} mono centered />
                </View>
                <View style={s.field}>
                  <FieldLabel text="Employee Code" />
                  <HudInput icon={User} value={employeeCode} onChangeText={t => setEmployeeCode(t.toUpperCase())} placeholder="EMP-XXXXXXXX" autoCapitalize="characters" maxLength={15} editable={!isLoading} mono centered />
                </View>
                <View style={s.field}>
                  <FieldLabel text="PIN" />
                  <HudInput icon={KeyRound} value={pin} onChangeText={t => setPin(t.replace(/\D/g, ''))} placeholder="••••" secureTextEntry keyboardType="number-pad" maxLength={6} editable={!isLoading} mono centered />
                </View>
                <Pressable style={({ pressed }) => [s.btn, pressed && s.btnPressed, isLoading && s.btnDisabled]} onPress={handleEmployeeLogin} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnText}>Sign in as Employee</Text>}
                </Pressable>
                <View style={s.helpBox}>
                  <Text style={s.helpText}>Use your facility code, employee code, and PIN</Text>
                  <Text style={s.helpSub}>Contact your administrator if you need assistance</Text>
                </View>
              </View>
            )}

          </View>

          {/* ── FOOTER ── */}
          <Text style={s.footer}>TulKenz OPS  •  Secure Access  •  All activity logged</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: HUD.bg },
  scroll:    { flexGrow: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 40 },

  // Header
  header:    { alignItems: 'center', marginBottom: 28, position: 'relative', paddingTop: 8 },
  cornerTL:  { position: 'absolute', top: 0, left: 0, width: 18, height: 18, borderTopWidth: 2, borderLeftWidth: 2, borderRadius: 2 },
  cornerTR:  { position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderRadius: 2 },
  logoWrap:  { width: 90, height: 90, borderRadius: 20, backgroundColor: HUD.bgCard, borderWidth: 1, borderColor: HUD.borderCyan, alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden',
    shadowColor: HUD.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  logo:      { width: 80, height: 80 },
  brand:     { fontSize: 34, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText:{ fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2 },

  // Card
  card:        { backgroundColor: HUD.bgCard, borderRadius: 16, borderWidth: 1, borderColor: HUD.borderBright, marginBottom: 16, overflow: 'hidden', position: 'relative' },
  cardCornerTL:{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderTopWidth: 1.5, borderLeftWidth: 1.5, zIndex: 1 },
  cardCornerBR:{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, borderBottomWidth: 1.5, borderRightWidth: 1.5, zIndex: 1 },

  // Tabs
  tabs:    { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: HUD.border },
  tab:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.3 },

  // Platform link
  platformLink:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: HUD.border },
  platformLinkText:{ fontSize: 11, fontWeight: '700', color: HUD.textDim, letterSpacing: 0.5 },

  // Platform badge
  platformBadge:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 4 },
  platformBadgeText:{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '40', borderRadius: 10, padding: 12, marginHorizontal: 16, marginTop: 12 },
  errorText:{ flex: 1, color: HUD.red, fontSize: 13, fontWeight: '500' },

  // Form
  form:   { padding: 20, gap: 16 },
  field:  { gap: 0 },

  // Button
  btn:        { height: 52, backgroundColor: HUD.cyan, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: HUD.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  btnPressed: { opacity: 0.85 },
  btnDisabled:{ opacity: 0.5, shadowOpacity: 0 },
  btnText:    { color: '#001822', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

  // Help
  helpBox: { alignItems: 'center', marginTop: 4, gap: 4 },
  helpText:{ fontSize: 12, color: HUD.textSec, textAlign: 'center' },
  helpSub: { fontSize: 11, color: HUD.textDim, textAlign: 'center' },


  // Footer
  footer:{ fontSize: 10, color: HUD.textDim, textAlign: 'center', letterSpacing: 0.5, marginBottom: 8 },
});
