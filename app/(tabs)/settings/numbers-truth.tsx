import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE THIS to your actual deployed Vercel URL
// ═══════════════════════════════════════════════════════════════════════════
const CALCULATOR_BASE_URL = 'https://your-tulkenz-domain.vercel.app/numbers-truth';

export default function NumbersTruthSettings() {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const calculatorUrl = CALCULATOR_BASE_URL;

  // ── Copy Link ──
  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(calculatorUrl);
      } else {
        const { default: Clipboard } = await import('expo-clipboard');
        await Clipboard.setStringAsync(calculatorUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      Alert.alert('Link', calculatorUrl);
    }
  };

  // ── Share via system share sheet ──
  const handleShare = async () => {
    try {
      await Share.share({
        title: 'TulKenz OPS — The Numbers Truth',
        message: `Take a look at the real cost of paper operations and cobbled-together software — and see what TulKenz OPS changes.\n\n${calculatorUrl}`,
        url: calculatorUrl,
      });
    } catch {
      // user cancelled
    }
  };

  // ── Send via Email ──
  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSending(true);

    const subject = encodeURIComponent('TulKenz OPS — The Numbers Truth');
    const body = encodeURIComponent(
      `I'd like to share something with you.\n\nThis interactive calculator shows the real cost of paper-based operations and cobbled-together software stacks in food manufacturing — and what changes when you bring it all under one platform.\n\nAll the numbers are adjustable. Take a look and see for yourself:\n\n${calculatorUrl}\n\n— Sent from TulKenz OPS`
    );

    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Email', 'Could not open email client. Copy the link instead.');
      }
    } catch {
      Alert.alert('Error', 'Could not open email client.');
    }

    setSending(false);
    setEmail('');
  };

  // ── Open Calculator ──
  const handleOpenCalculator = () => {
    Linking.openURL(calculatorUrl);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.tkoBadge}>
          <Text style={styles.tkoText}>TKO</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            <Text style={{ color: '#FFFFFF' }}>Tul</Text>
            <Text style={{ color: '#A855F7' }}>Kenz</Text>
            <Text style={{ color: '#FFFFFF' }}> OPS</Text>
          </Text>
          <Text style={styles.headerSubtitle}>The Numbers Truth</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Interactive ROI calculator showing the real cost of paper operations, 
        cobbled-together software stacks, and the financial impact of TulKenz OPS. 
        All numbers are adjustable by anyone with the link.
      </Text>

      {/* Preview / Open Calculator */}
      <TouchableOpacity style={styles.previewCard} onPress={handleOpenCalculator}>
        <View style={styles.previewContent}>
          <Ionicons name="calculator-outline" size={28} color="#E8C547" />
          <View style={styles.previewText}>
            <Text style={styles.previewTitle}>Open Calculator</Text>
            <Text style={styles.previewSubtitle}>Preview or use the Numbers Truth calculator</Text>
          </View>
          <Ionicons name="open-outline" size={20} color="#777799" />
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Share Section */}
      <Text style={styles.sectionTitle}>Share Calculator</Text>

      {/* Copy Link */}
      <View style={styles.linkRow}>
        <View style={styles.linkUrlBox}>
          <Text style={styles.linkUrlText} numberOfLines={1} ellipsizeMode="middle">
            {calculatorUrl}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.copyButton, copied && styles.copyButtonActive]}
          onPress={handleCopyLink}
        >
          <Ionicons
            name={copied ? 'checkmark-circle' : 'copy-outline'}
            size={18}
            color={copied ? '#4ECDC4' : '#E8C547'}
          />
          <Text style={[styles.copyButtonText, copied && styles.copyButtonTextActive]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Share via system */}
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <Ionicons name="share-outline" size={20} color="#A855F7" />
        <Text style={styles.actionButtonText}>Share via...</Text>
        <Ionicons name="chevron-forward" size={16} color="#555566" />
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Send via Email */}
      <Text style={styles.sectionTitle}>Send via Email</Text>

      <View style={styles.emailRow}>
        <TextInput
          style={styles.emailInput}
          placeholder="Enter recipient email"
          placeholderTextColor="#555566"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!email || sending) && styles.sendButtonDisabled]}
          onPress={handleSendEmail}
          disabled={!email || sending}
        >
          <Ionicons name="send" size={16} color={email ? '#0A0A14' : '#555566'} />
          <Text style={[styles.sendButtonText, !email && styles.sendButtonTextDisabled]}>
            {sending ? 'Opening...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.emailNote}>
        Opens your default email client with a pre-written message and calculator link.
      </Text>

      {/* Divider */}
      <View style={styles.divider} />

      {/* What's Included */}
      <Text style={styles.sectionTitle}>What the Calculator Shows</Text>
      <View style={styles.featureList}>
        {[
          { icon: 'document-text-outline', color: '#FF6B6B', text: 'Hidden cost of paper operations (8 categories, research-backed)' },
          { icon: 'layers-outline', color: '#FF8844', text: 'Cost of 7 separate software vendors vs. one platform' },
          { icon: 'flash-outline', color: '#3B82F6', text: 'Task Feed & Auditor Portal — features no competitor has' },
          { icon: 'options-outline', color: '#4ECDC4', text: 'Adjustable investment terms — term-based or lifetime' },
          { icon: 'trending-up-outline', color: '#E8C547', text: '10-year projection with full ROI breakdown' },
          { icon: 'library-outline', color: '#A855F7', text: 'Research sources page with all citations' },
        ].map((item, i) => (
          <View key={i} style={styles.featureItem}>
            <Ionicons name={item.icon as any} size={18} color={item.color} />
            <Text style={styles.featureText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tkoBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tkoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#777799',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: '#9999BB',
    lineHeight: 20,
    marginBottom: 20,
  },
  previewCard: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewText: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewSubtitle: {
    fontSize: 11,
    color: '#777799',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(232,197,71,0.1)',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E8C547',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  linkUrlBox: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  linkUrlText: {
    fontSize: 12,
    color: '#777799',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232,197,71,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  copyButtonActive: {
    backgroundColor: 'rgba(78,205,196,0.1)',
    borderColor: 'rgba(78,205,196,0.25)',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8C547',
  },
  copyButtonTextActive: {
    color: '#4ECDC4',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F0F1A',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#A855F7',
  },
  emailRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFFFFF',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8C547',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#1A1A2E',
  },
  sendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A0A14',
  },
  sendButtonTextDisabled: {
    color: '#555566',
  },
  emailNote: {
    fontSize: 11,
    color: '#555566',
    fontStyle: 'italic',
  },
  featureList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#9999BB',
    lineHeight: 18,
  },
});
