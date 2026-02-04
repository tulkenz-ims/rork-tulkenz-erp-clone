import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Wrench, 
  ArrowLeft, 
  FileText, 
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface CMMSPlaceholderProps {
  title: string;
  description?: string;
  category?: string;
  relatedForms?: { title: string; route: string }[];
}

export default function CMMSPlaceholder({
  title,
  description,
  category,
  relatedForms,
}: CMMSPlaceholderProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleNavigate = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
          <Wrench size={48} color="#10B981" />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        
        {category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{category}</Text>
          </View>
        )}
        
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description || 'This CMMS module is being configured. Full functionality will be available soon.'}
        </Text>

        <View style={[styles.statusSection, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={styles.statusRow}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Module Status: Configuration Pending
            </Text>
          </View>
          <View style={styles.statusRow}>
            <AlertCircle size={16} color="#F59E0B" />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Integration: Pending Setup
            </Text>
          </View>
        </View>

        <View style={styles.featureList}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>Planned Features:</Text>
          <View style={styles.featureItem}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>Work order creation & tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>Equipment integration</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>Parts & inventory linking</Text>
          </View>
          <View style={styles.featureItem}>
            <CheckCircle2 size={14} color="#10B981" />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>Labor tracking</Text>
          </View>
        </View>
      </View>

      {relatedForms && relatedForms.length > 0 && (
        <View style={styles.relatedSection}>
          <Text style={[styles.relatedTitle, { color: colors.text }]}>Related Modules</Text>
          {relatedForms.map((form, index) => (
            <Pressable
              key={index}
              style={[styles.relatedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleNavigate(form.route)}
            >
              <FileText size={20} color={colors.primary} />
              <Text style={[styles.relatedText, { color: colors.text }]}>{form.title}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.backButton, { backgroundColor: colors.primary }]}
        onPress={handleBack}
      >
        <ArrowLeft size={20} color="#FFFFFF" />
        <Text style={styles.backButtonText}>Back to CMMS</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  description: {
    fontSize: 15,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 20,
  },
  statusSection: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 13,
  },
  featureList: {
    width: '100%',
    gap: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
  },
  relatedSection: {
    marginBottom: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  relatedCard: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  relatedText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
