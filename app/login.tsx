/**
 * app/login.tsx
 * TulKenz OPS — Full HUD Login Screen
 * Book of Enoch / Tony Stark aesthetic — sharp, angular, monospace
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
  Dimensions,
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

const { width: SW } = Dimensions.get('window');

type LoginType = 'company' | 'employee' | 'platform';

// ── Corner bracket component ───────────────────────────────────
function Brackets({ color, size = 14 }: { color: string; size?: number }) {
  const b = StyleSheet.create({
    tl: { position: 'absolute', top: 0, left: 0, width: size, height: size, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: color },
    tr: { position: 'absolute', top: 0, right: 0, width: size, height: size, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: color },
    bl: { position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: color },
    br: { position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: color },
  });
  return (
    <>
      <View style={b.tl} /><View style={b.tr} />
      <View style={b.bl} /><View style={b.br} />
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
      Animated.timing(anim, { toValue: 1, duration: 4000, useNativeDriver: true })
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 600] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, height: 1.5,
        backgroundColor: color, opacity: 0.4,
        transform: [{ translateY }],
      }} />
    </Animated.View>
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
  accentColor: string;
  borderColor: string;
}

function HudInput({
  icon: Icon, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, autoCapitalize, autoComplete,
  maxLength, editable = true, mono, centered,
  accentColor, borderColor,
}: HudInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[
      inp.wrap,
      { borderColor: focused ? accentColor : borderColor },
    ]}>
      <View style={[inp.iconBox, { backgroundColor: accentColor + '12', borderRightColor: focused ? accentColor + '40' : borderColor }]}>
        <Icon size={15} color={focused ? accentColor : borderColor} />
      </View>
      <TextInput
        style={[
          inp.field,
          { color: focused ? '#EEFCFF' : '#9EEEFF' },
          mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 3 },
          centered && { textAlign: 'center' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={borderColor}
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
  wrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, height: 48, backgroundColor: 'rgba(0,0,0,0.4)' },
  iconBox: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center', borderRightWidth: 1 },
  field:   { flex: 1, paddingHorizontal: 14, fontSize: 14 },
});

// ── Field label ────────────────────────────────────────────────
function FieldLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{ fontSize: 9, fontWeight: '800', color, letterSpacing: 2.5, marginBottom: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
      {text.toUpperCase()}
    </Text>
  );
}

// ── Data readout row ───────────────────────────────────────────
function DataRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: color + '18' }}>
      <Text style={{ fontSize: 9, color: color + '80', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{label}</Text>
      <Text style={{ fontSize: 9, color, letterSpacing: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{value}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
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

  // Use theme colors — fall back to cyan defaults
  const C = {
    bg:     colors.hudBg,
    surf:   colors.hudSurface,
    p:      colors.hudPrimary,
    s:      colors.hudSecondary,
    bdr:    colors.hudBorder,
    bdrB:   colors.hudBorderBright,
    text:   colors.hudTextStrong,
    textS:  colors.textSecondary,
    textD:  colors.textTertiary,
    amber:  '#FFB800',
    green:  '#00FF88',
    red:    '#FF3344',
  };

  // Accent color per login type
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
    if (!email || !password) { setError('EMAIL AND PASSWORD REQUIRED'); return; }
    companyMutate();
  }, [email, password, companyMutate]);

  const handleEmployeeLogin = useCallback(() => {
    setError('');
    if (!companyCode || !employeeCode || !pin) { setError('ALL FIELDS REQUIRED'); return; }
    employeeMutate();
  }, [companyCode, employeeCode, pin, employeeMutate]);

  const handlePlatformLogin = useCallback(() => {
    setError('');
    if (!email || !password) { setError('EMAIL AND PASSWORD REQUIRED'); return; }
    platformMutate();
  }, [email, password, platformMutate]);

  const isLoading = isCompanyPending || isEmployeePending || isPlatformPending;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.bg }]}>
      <ScanLine color={C.p} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── SYSTEM STATUS BAR ── */}
          <View style={[s.statusBar, { borderColor: C.bdr, backgroundColor: C.surf + '80' }]}>
            <View style={s.statusLeft}>
              <PulsingDot color={C.green} />
              <Text style={[s.statusText, { color: C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                SYS // ONLINE
              </Text>
            </View>
            <Text style={[s.statusText, { color: C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
              TULKENZ OPS // v1.0.0
            </Text>
            <View style={s.statusLeft}>
              <PulsingDot color={C.p} />
              <Text style={[s.statusText, { color: C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                SECURE
              </Text>
            </View>
          </View>

          {/* ── LOGO SECTION ── */}
          <View style={s.logoSection}>
            <Brackets color={C.p + '60'} size={20} />

            <View style={[s.logoWrap, { borderColor: C.bdrB, backgroundColor: C.surf }]}>
              <Brackets color={C.p} size={10} />
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/erhmndrwrhnmllpl3s294' }}
                style={s.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={[s.brand, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
              <Text style={{ color: C.text }}>TUL</Text>
              <Text style={{ color: C.p }}>KENZ</Text>
              <Text style={{ color: C.text }}> OPS</Text>
            </Text>

            <Text style={[s.brandSub, { color: C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
              OPERATIONS MANAGEMENT PLATFORM
            </Text>
          </View>

          {/* ── TELEMETRY PANEL ── */}
          <View style={[s.telemetry, { borderColor: C.bdr, backgroundColor: C.surf + '60' }]}>
            <Brackets color={C.bdrB} size={8} />
            <DataRow label="AUTH // MODULE" value="IDENTITY_V2" color={C.p} />
            <DataRow label="ENCRYPTION" value="AES-256" color={C.p} />
            <DataRow label="SESSION" value="SECURE" color={C.green} />
          </View>

          {/* ── LOGIN CARD ── */}
          <View style={[s.card, { borderColor: accent + '50', backgroundColor: C.surf }]}>
            <Brackets color={accent} size={14} />

            {/* Card header bar */}
            <View style={[s.cardHeader, { borderBottomColor: C.bdr, backgroundColor: C.bg + 'CC' }]}>
              <View style={[s.cardHeaderAccent, { backgroundColor: accent }]} />
              <Text style={[s.cardHeaderText, { color: accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                {loginType === 'platform' ? 'PLATFORM // ADMINISTRATOR' :
                 loginType === 'employee' ? 'EMPLOYEE // ACCESS' : 'COMPANY // LOGIN'}
              </Text>
            </View>

            {/* Tab toggle */}
            <View style={[s.tabs, { borderBottomColor: C.bdr }]}>
              {(['company', 'employee'] as LoginType[]).map(type => {
                const active = loginType === type;
                const Icon = type === 'company' ? Building2 : Users;
                const tabAccent = type === 'employee' ? C.s : C.p;
                return (
                  <Pressable
                    key={type}
                    style={[
                      s.tab,
                      { borderBottomColor: 'transparent' },
                      active && { borderBottomColor: tabAccent, backgroundColor: tabAccent + '10' },
                    ]}
                    onPress={() => { setLoginType(type); setError(''); }}
                  >
                    <Icon size={14} color={active ? tabAccent : C.textD} />
                    <Text style={[
                      s.tabText,
                      { color: active ? tabAccent : C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
                    ]}>
                      {type === 'company' ? 'COMPANY' : 'EMPLOYEE'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Platform admin toggle */}
            <Pressable
              style={[s.platformLink, { borderBottomColor: C.bdr }]}
              onPress={() => { setLoginType(loginType === 'platform' ? 'company' : 'platform'); setError(''); }}
            >
              <KeyRound size={10} color={loginType === 'platform' ? C.amber : C.textD} />
              <Text style={[
                s.platformLinkText,
                { color: loginType === 'platform' ? C.amber : C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
              ]}>
                {loginType === 'platform' ? '← BACK TO STANDARD LOGIN' : 'PLATFORM ADMIN ACCESS'}
              </Text>
            </Pressable>

            {/* Error */}
            {!!error && (
              <View style={[s.errorBox, { backgroundColor: C.red + '12', borderColor: C.red + '40' }]}>
                <AlertCircle size={13} color={C.red} />
                <Text style={[s.errorText, { color: C.red, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* ── PLATFORM FORM ── */}
            {loginType === 'platform' && (
              <View style={s.form}>
                <View style={[s.platformBadge, { backgroundColor: C.amber + '12', borderColor: C.amber + '35' }]}>
                  <Shield size={13} color={C.amber} />
                  <Text style={[s.platformBadgeText, { color: C.amber, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                    ADMINISTRATOR ACCESS ONLY
                  </Text>
                </View>
                <View style={s.field}>
                  <FieldLabel text="Admin Email" color={C.amber} />
                  <HudInput icon={User} value={email} onChangeText={setEmail} placeholder="admin@tulkenz.net" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isLoading} accentColor={C.amber} borderColor={C.amber + '40'} />
                </View>
                <View style={s.field}>
                  <FieldLabel text="Password" color={C.amber} />
                  <HudInput icon={Lock} value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry autoCapitalize="none" editable={!isLoading} accentColor={C.amber} borderColor={C.amber + '40'} />
                </View>
                <Pressable
                  style={({ pressed }) => [s.btn, { backgroundColor: C.amber + '15', borderColor: C.amber, borderWidth: 1 }, pressed && { opacity: 0.8 }, isLoading && { opacity: 0.5 }]}
                  onPress={handlePlatformLogin}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={C.amber} />
                    : <Text style={[s.btnText, { color: C.amber, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                        AUTHENTICATE // PLATFORM ADMIN
                      </Text>
                  }
                </Pressable>
              </View>
            )}

            {/* ── COMPANY FORM ── */}
            {loginType === 'company' && (
              <View style={s.form}>
                <View style={s.field}>
                  <FieldLabel text="Email Address" color={C.p} />
                  <HudInput icon={User} value={email} onChangeText={setEmail} placeholder="company@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!isLoading} accentColor={C.p} borderColor={C.bdrB} />
                </View>
                <View style={s.field}>
                  <FieldLabel text="Password" color={C.p} />
                  <HudInput icon={Lock} value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry autoCapitalize="none" editable={!isLoading} accentColor={C.p} borderColor={C.bdrB} />
                </View>
                <Pressable
                  style={({ pressed }) => [s.btn, { backgroundColor: C.p + '15', borderColor: C.p, borderWidth: 1 }, pressed && { opacity: 0.8 }, isLoading && { opacity: 0.5 }]}
                  onPress={handleCompanyLogin}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={C.p} />
                    : <Text style={[s.btnText, { color: C.p, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                        AUTHENTICATE // COMPANY
                      </Text>
                  }
                </Pressable>
              </View>
            )}

            {/* ── EMPLOYEE FORM ── */}
            {loginType === 'employee' && (
              <View style={s.form}>
                <View style={s.field}>
                  <FieldLabel text="Facility Code" color={C.s} />
                  <HudInput icon={Building2} value={companyCode} onChangeText={t => setCompanyCode(t.toUpperCase())} placeholder="WEST / HQ / PLANT1" autoCapitalize="characters" maxLength={20} editable={!isLoading} mono centered accentColor={C.s} borderColor={C.bdrB} />
                </View>
                <View style={s.field}>
                  <FieldLabel text="Employee Code" color={C.s} />
                  <HudInput icon={User} value={employeeCode} onChangeText={t => setEmployeeCode(t.toUpperCase())} placeholder="EMP-XXXXXXXX" autoCapitalize="characters" maxLength={15} editable={!isLoading} mono centered accentColor={C.s} borderColor={C.bdrB} />
                </View>
                <View style={s.field}>
                  <FieldLabel text="PIN" color={C.s} />
                  <HudInput icon={KeyRound} value={pin} onChangeText={t => setPin(t.replace(/\D/g, ''))} placeholder="• • • •" secureTextEntry keyboardType="number-pad" maxLength={6} editable={!isLoading} mono centered accentColor={C.s} borderColor={C.bdrB} />
                </View>
                <Pressable
                  style={({ pressed }) => [s.btn, { backgroundColor: C.s + '15', borderColor: C.s, borderWidth: 1 }, pressed && { opacity: 0.8 }, isLoading && { opacity: 0.5 }]}
                  onPress={handleEmployeeLogin}
                  disabled={isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color={C.s} />
                    : <Text style={[s.btnText, { color: C.s, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                        AUTHENTICATE // EMPLOYEE
                      </Text>
                  }
                </Pressable>
                <View style={[s.helpBox, { borderColor: C.bdr, backgroundColor: C.bg + '80' }]}>
                  <Brackets color={C.bdrB} size={6} />
                  <Text style={[s.helpText, { color: C.textS, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                    USE FACILITY CODE + EMPLOYEE CODE + PIN
                  </Text>
                  <Text style={[s.helpSub, { color: C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
                    CONTACT ADMINISTRATOR FOR ACCESS
                  </Text>
                </View>
              </View>
            )}

          </View>

          {/* ── FOOTER ── */}
          <View style={[s.footer, { borderColor: C.bdr }]}>
            <Brackets color={C.bdr} size={6} />
            <Text style={[s.footerText, { color: C.textD, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
              TULKENZ OPS  //  SECURE ACCESS  //  ALL ACTIVITY LOGGED
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  // Status bar
  statusBar:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderWidth: 1, marginBottom: 20 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 8, letterSpacing: 1.5 },

  // Logo
  logoSection:{ alignItems: 'center', marginBottom: 20, paddingVertical: 20, position: 'relative' },
  logoWrap:   { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 14, position: 'relative' },
  logo:       { width: 72, height: 72 },
  brand:      { fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 6 },
  brandSub:   { fontSize: 8, letterSpacing: 3 },

  // Telemetry
  telemetry:  { padding: 10, borderWidth: 1, marginBottom: 16, position: 'relative', paddingHorizontal: 14 },

  // Card
  card:       { borderWidth: 1, marginBottom: 16, position: 'relative', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  cardHeaderAccent: { width: 3, height: 14 },
  cardHeaderText: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // Tabs
  tabs:    { flexDirection: 'row', borderBottomWidth: 1 },
  tab:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2 },
  tabText: { fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // Platform link
  platformLink:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderBottomWidth: 1 },
  platformLinkText:{ fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },

  // Platform badge
  platformBadge:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 4 },
  platformBadgeText:{ fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, padding: 10, marginHorizontal: 16, marginTop: 10 },
  errorText:{ flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  // Form
  form:  { padding: 16, gap: 14 },
  field: { gap: 0 },

  // Button — HUD style: transparent with colored border, no fill
  btn:     { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },

  // Help
  helpBox:  { padding: 12, borderWidth: 1, alignItems: 'center', gap: 4, position: 'relative', marginTop: 4 },
  helpText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  helpSub:  { fontSize: 8, letterSpacing: 1, textAlign: 'center' },

  // Footer
  footer:     { padding: 12, borderWidth: 1, alignItems: 'center', position: 'relative' },
  footerText: { fontSize: 8, letterSpacing: 1.5 },
});
