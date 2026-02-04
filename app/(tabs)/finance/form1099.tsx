import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FileCheck, ArrowLeft, FileText, Send, Calendar } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function Form1099Screen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.placeholderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#B91C1C15' }]}>
            <FileCheck size={48} color="#B91C1C" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>1099 Processing</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Generate and file 1099 forms for vendors with IRS compliance tracking.
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <FileText size={18} color="#B91C1C" />
              <Text style={[styles.featureText, { color: colors.text }]}>1099-NEC, 1099-MISC</Text>
            </View>
            <View style={styles.featureItem}>
              <Send size={18} color="#B91C1C" />
              <Text style={[styles.featureText, { color: colors.text }]}>E-Filing Support</Text>
            </View>
            <View style={styles.featureItem}>
              <Calendar size={18} color="#B91C1C" />
              <Text style={[styles.featureText, { color: colors.text }]}>Deadline Tracking</Text>
            </View>
          </View>

          <View style={[styles.comingSoonBadge, { backgroundColor: '#B91C1C15' }]}>
            <Text style={[styles.comingSoonText, { color: '#B91C1C' }]}>Coming Soon</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back to Finance</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  placeholderCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  description: { fontSize: 15, textAlign: 'center' as const, marginBottom: 24, lineHeight: 22 },
  featureList: { width: '100%', gap: 12, marginBottom: 24 },
  featureItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  featureText: { fontSize: 15 },
  comingSoonBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  comingSoonText: { fontSize: 14, fontWeight: '600' as const },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
});
