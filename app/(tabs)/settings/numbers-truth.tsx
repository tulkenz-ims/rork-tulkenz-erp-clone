import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calculator,
  Copy,
  Link2,
  Send,
  CheckCircle,
  Mail,
  BarChart3,
  FileText,
  Zap,
  Shield,
  Eye,
  Layers,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// ═══════════════════════════════════════════════════════════════
// UPDATE THIS to your actual deployed URL
// ═══════════════════════════════════════════════════════════════
const CALCULATOR_URL = 'https://app.tulkenz.net/api/numbers-truth';

export default function NumbersTruthSettings() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // ── Copy Link ──
  const copyLink = useCallback(async () => {
    await Clipboard.setStringAsync(CALCULATOR_URL);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    Alert.alert('Copied', 'Calculator link copied to clipboard.');
  }, []);

  // ── Send via Resend ──
  const sendEmail = useCallback(async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    Alert.alert(
      'Send Calculator Link',
      `Send the Numbers Truth calculator link to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            setSendingEmail(true);
            setEmailSent(false);
            try {
              const { data, error } = await supabase.rpc('send_numbers_truth_email', {
                p_recipient_email: email.trim(),
                p_sender_name: user?.name || 'TulKenz OPS',
                p_calculator_url: CALCULATOR_URL,
              });
              if (error) throw error;
              const result = data as any;
              if (result?.success) {
                setEmailSent(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Email Sent', result.message || `Calculator link sent to ${email}`);
                setEmail('');
              } else {
                Alert.alert('Email Failed', result?.error || 'Unable to send email. Check Resend configuration.');
              }
            } catch (err: any) {
              console.error('Send email error:', err);
              Alert.alert('Email Error', err.message || 'Failed to send email. Ensure Resend API key is configured in app_secrets.');
            } finally {
              setSendingEmail(false);
            }
          },
        },
      ]
    );
  }, [email, user]);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Page Header */}
        <View style={[s.pageHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.iconCircle, { backgroundColor: '#A855F7' + '15' }]}>
            <Calculator size={28} color="#A855F7" />
          </View>
          <Text style={[s.pageTitle, { color: colors.text }]}>
            <Text style={{ color: colors.text }}>The </Text>
            <Text style={{ color: '#E8C547' }}>Numbers</Text>
            <Text style={{ color: colors.text }}> Truth</Text>
          </Text>
          <Text style={[s.pageSub, { color: colors.textSecondary }]}>
            Interactive ROI calculator — share with prospects to show the real cost of paper operations and cobbled-together software
          </Text>
        </View>

        {/* Link Card */}
        <Text style={[s.sectionTitle, { color: colors.text }]}>Calculator Link</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[s.linkBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Link2 size={14} color="#A855F7" />
            <Text style={[s.linkText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
              {CALCULATOR_URL}
            </Text>
          </View>
          <Pressable
            style={[s.actionBtn, { backgroundColor: copied ? '#10B981' : '#A855F7' }]}
            onPress={copyLink}
          >
            {copied ? <CheckCircle size={16} color="#FFF" /> : <Copy size={16} color="#FFF" />}
            <Text style={s.actionBtnText}>{copied ? 'Copied ✓' : 'Copy Link'}</Text>
          </Pressable>
        </View>

        {/* Send via Email */}
        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>Send to Recipient</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.fieldRow}>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Recipient Email</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="name@company.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {emailSent && (
            <View style={[s.sentBanner, { backgroundColor: '#D1FAE5', borderColor: '#10B981' + '40' }]}>
              <CheckCircle size={12} color="#065F46" />
              <Text style={{ fontSize: 12, color: '#065F46', marginLeft: 6 }}>Email sent successfully</Text>
            </View>
          )}

          <Pressable
            style={[s.actionBtn, {
              backgroundColor: email && !sendingEmail ? '#10B981' : colors.border,
              opacity: sendingEmail ? 0.6 : 1,
            }]}
            onPress={sendEmail}
            disabled={!email || sendingEmail}
          >
            {sendingEmail
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Send size={16} color={email ? '#FFF' : colors.textTertiary} />}
            <Text style={[s.actionBtnText, { color: email ? '#FFF' : colors.textTertiary }]}>
              {sendingEmail ? 'Sending...' : 'Send via Email'}
            </Text>
          </Pressable>

          <Text style={[s.hint, { color: colors.textTertiary }]}>
            Sends a branded email via Resend with the calculator link and a short description.
          </Text>
        </View>

        {/* What's Included */}
        <Text style={[s.sectionTitle, { color: colors.text, marginTop: 20 }]}>What the Calculator Shows</Text>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { icon: FileText, color: '#FF6B6B', text: 'Hidden cost of paper operations — 8 categories, research-backed' },
            { icon: Layers, color: '#FF8844', text: 'Cost of 7 separate software vendors vs. one platform' },
            { icon: Zap, color: '#3B82F6', text: 'Task Feed & Auditor Portal — features no competitor has' },
            { icon: BarChart3, color: '#4ECDC4', text: 'Adjustable investment terms — term-based or lifetime' },
            { icon: TrendingUp, color: '#E8C547', text: '10-year projection with full ROI breakdown' },
            { icon: Eye, color: '#A855F7', text: 'Research sources page with all citations' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <View key={i} style={[s.featureRow, i < 5 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[s.featureIcon, { backgroundColor: item.color + '15' }]}>
                  <Icon size={16} color={item.color} />
                </View>
                <Text style={[s.featureText, { color: colors.text }]}>{item.text}</Text>
              </View>
            );
          })}
        </View>

        {/* Note */}
        <View style={[s.noteCard, { backgroundColor: '#E8C547' + '08', borderColor: '#E8C547' + '30' }]}>
          <Calculator size={14} color="#E8C547" />
          <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1, marginLeft: 8, lineHeight: 18 }}>
            The calculator is fully interactive — recipients can adjust every number to match their facility. No login required.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  pageHeader: { borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, marginBottom: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  pageSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  linkBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  linkText: { fontSize: 13, flex: 1, fontFamily: 'monospace' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14 },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  sentBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, marginBottom: 10 },
  hint: { fontSize: 11, fontStyle: 'italic', marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 13, flex: 1, lineHeight: 18 },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
});
