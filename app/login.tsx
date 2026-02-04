import React, { useState, useCallback } from 'react';
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
} from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';

type LoginType = 'company' | 'employee' | 'platform';

export default function LoginScreen() {
  const router = useRouter();
  const { signInCompany, signInEmployee, signInPlatformAdmin } = useUser();
  const [loginType, setLoginType] = useState<LoginType>('company');
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [companyCode, setCompanyCode] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');

  const { mutate: companyMutate, isPending: isCompanyPending } = useMutation({
    mutationFn: async () => {
      return signInCompany(email, password);
    },
    onSuccess: () => {
      console.log('Company login successful');
      router.replace('/');
    },
    onError: (err: Error) => {
      console.error('Company login error:', err);
      setError(err.message || 'Failed to sign in');
    },
  });

  const { mutate: platformMutate, isPending: isPlatformPending } = useMutation({
    mutationFn: async () => {
      return signInPlatformAdmin(email, password);
    },
    onSuccess: () => {
      console.log('Platform admin login successful');
      router.replace('/');
    },
    onError: (err: Error) => {
      console.error('Platform admin login error:', err);
      setError(err.message || 'Failed to sign in');
    },
  });

  const { mutate: employeeMutate, isPending: isEmployeePending } = useMutation({
    mutationFn: async () => {
      return signInEmployee(companyCode, employeeCode, pin);
    },
    onSuccess: () => {
      console.log('Employee login successful');
      router.replace('/');
    },
    onError: (err: Error) => {
      console.error('Employee login error:', err);
      setError(err.message || 'Failed to sign in');
    },
  });

  const handleCompanyLogin = useCallback(() => {
    setError('');
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    companyMutate();
  }, [email, password, companyMutate]);

  const handleEmployeeLogin = useCallback(() => {
    setError('');
    if (!companyCode || !employeeCode || !pin) {
      setError('Please fill in all fields');
      return;
    }
    employeeMutate();
  }, [companyCode, employeeCode, pin, employeeMutate]);

  const handlePlatformLogin = useCallback(() => {
    setError('');
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    platformMutate();
  }, [email, password, platformMutate]);

  const isLoading = isCompanyPending || isEmployeePending || isPlatformPending;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/erhmndrwrhnmllpl3s294' }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>TulKenz OPS</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.toggleContainer}>
            <Pressable
              style={[
                styles.toggleButton,
                loginType === 'company' && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setLoginType('company');
                setError('');
              }}
            >
              <Building2
                size={18}
                color={loginType === 'company' ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  loginType === 'company' && styles.toggleTextActive,
                ]}
              >
                Company
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                loginType === 'employee' && styles.toggleButtonActive,
              ]}
              onPress={() => {
                setLoginType('employee');
                setError('');
              }}
            >
              <Users
                size={18}
                color={loginType === 'employee' ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.toggleText,
                  loginType === 'employee' && styles.toggleTextActive,
                ]}
              >
                Employee
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.platformLink}
            onPress={() => {
              setLoginType(loginType === 'platform' ? 'company' : 'platform');
              setError('');
            }}
          >
            <KeyRound size={14} color={loginType === 'platform' ? Colors.primary : Colors.textTertiary} />
            <Text style={[styles.platformLinkText, loginType === 'platform' && styles.platformLinkTextActive]}>
              {loginType === 'platform' ? 'Back to regular login' : 'Platform Admin'}
            </Text>
          </Pressable>

          {error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}



          {loginType === 'platform' ? (
            <View style={styles.form}>
              <View style={styles.platformBadge}>
                <KeyRound size={16} color="#F59E0B" />
                <Text style={styles.platformBadgeText}>Platform Administrator Access</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin Email</Text>
                <View style={styles.inputContainer}>
                  <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="admin@tulkenz.net"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  styles.platformButton,
                  pressed && styles.submitButtonPressed,
                  isLoading && styles.submitButtonDisabled,
                ]}
                onPress={handlePlatformLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Sign in as Platform Admin</Text>
                )}
              </Pressable>
            </View>
          ) : loginType === 'company' ? (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email address</Text>
                <View style={styles.inputContainer}>
                  <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="company@example.com"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  isLoading && styles.submitButtonDisabled,
                ]}
                onPress={handleCompanyLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Sign in as Company Owner</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Facility Code</Text>
                <View style={styles.inputContainer}>
                  <Building2 size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputCentered]}
                    value={companyCode}
                    onChangeText={(text) => setCompanyCode(text.toUpperCase())}
                    placeholder="e.g., HQ, PLANT1"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={20}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Employee Code</Text>
                <View style={styles.inputContainer}>
                  <User size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputCentered, styles.inputMono]}
                    value={employeeCode}
                    onChangeText={(text) => setEmployeeCode(text.toUpperCase())}
                    placeholder="e.g., EMP001"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="characters"
                    maxLength={10}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PIN</Text>
                <View style={styles.inputContainer}>
                  <KeyRound size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputCentered, styles.inputMono, styles.inputPin]}
                    value={pin}
                    onChangeText={(text) => setPin(text.replace(/\D/g, ''))}
                    placeholder="••••"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.submitButtonPressed,
                  isLoading && styles.submitButtonDisabled,
                ]}
                onPress={handleEmployeeLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Sign in as Employee</Text>
                )}
              </Pressable>

              <View style={styles.helpContainer}>
                <Text style={styles.helpText}>
                  Use your facility code, employee code, and PIN
                </Text>
                <Text style={styles.helpTextSmall}>
                  Contact your administrator if you need assistance
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: Colors.backgroundSecondary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    color: Colors.error,
    fontSize: 14,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
  },
  inputCentered: {
    textAlign: 'center',
  },
  inputMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
  },
  inputPin: {
    letterSpacing: 6,
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  helpContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  helpText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  helpTextSmall: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  platformLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  platformLinkText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  platformLinkTextActive: {
    color: Colors.primary,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  platformBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  platformButton: {
    backgroundColor: '#F59E0B',
  },
});
