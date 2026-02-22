import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  FileText,
  AlertTriangle,
  FileCheck,
  BookOpen,
  Shield,
  Clipboard,
  Award,
  GraduationCap,
  Wrench,
  ChevronRight,
  CheckCircle,
  BarChart3,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useSDSRecordsQuery } from '@/hooks/useSupabaseSDS';

// ── Types ──────────────────────────────────────────────────────
interface DocumentCategory {
  name: string;
  count: number;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  desc: string;
  hasData: boolean;
  route?: string;
}

// ════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ════════════════════════════════════════════════════════════════
export default function DocumentControlScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { data: sdsRecords = [], isLoading, refetch, isRefetching } = useSDSRecordsQuery();

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  // ── Computed Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const sdsActive = sdsRecords.filter((r: any) => r.status === 'active').length;
    const sdsExpired = sdsRecords.filter((r: any) => r.status === 'expired').length;
    const sdsAllergen = sdsRecords.filter((r: any) => r.contains_allergens === true).length;
    const sdsDanger = sdsRecords.filter((r: any) => {
      const sw = (r.signal_word || '').toLowerCase();
      return sw === 'danger';
    }).length;

    return {
      total: sdsRecords.length,
      sds: sdsRecords.length,
      sops: 0,
      certs: 0,
      active: sdsActive,
      expired: sdsExpired,
      allergen: sdsAllergen,
      danger: sdsDanger,
    };
  }, [sdsRecords]);

  // ── Department Breakdown ────────────────────────────────────
  const deptBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    sdsRecords.forEach((r: any) => {
      const dept = r.primary_department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [sdsRecords]);

  // ── Categories ──────────────────────────────────────────────
  const categories: DocumentCategory[] = useMemo(() => [
    {
      name: 'SDS Sheets',
      count: stats.sds,
      icon: AlertTriangle,
      color: '#EF4444',
      desc: 'Safety Data Sheets — chemical registry, allergens, hazard info',
      hasData: true,
      route: '/(tabs)/documents/sds',
    },
    {
      name: 'SOPs',
      count: 0,
      icon: FileCheck,
      color: '#3B82F6',
      desc: 'Standard Operating Procedures',
      hasData: false,
    },
    {
      name: 'OPLs',
      count: 0,
      icon: BookOpen,
      color: '#8B5CF6',
      desc: 'One Point Lessons — visual training aids',
      hasData: false,
      route: '/(tabs)/safety/lotoprogram',
    },
    {
      name: 'Policies',
      count: 0,
      icon: Shield,
      color: '#F59E0B',
      desc: 'Company policies and guidelines',
      hasData: false,
    },
    {
      name: 'Work Instructions',
      count: 0,
      icon: Wrench,
      color: '#06B6D4',
      desc: 'Step-by-step task procedures',
      hasData: false,
    },
    {
      name: 'Specifications',
      count: 0,
      icon: Clipboard,
      color: '#EC4899',
      desc: 'Product and material specifications',
      hasData: false,
    },
    {
      name: 'Certifications',
      count: 0,
      icon: Award,
      color: '#10B981',
      desc: 'Facility and personnel certifications',
      hasData: false,
    },
  ], [stats]);

  // ── Navigation Handler ──────────────────────────────────────
  const handleCategoryPress = useCallback((cat: DocumentCategory) => {
    if (cat.route) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(cat.route as any);
    }
  }, [router]);

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading documents...</Text>
          </View>
        ) : (
          <>
            {/* ── Summary Stat Cards ── */}
            <View style={styles.statsRow}>
              <StatCard value={stats.total} label="Total Docs" color="#4A90A4" colors={colors} />
              <StatCard value={stats.sds} label="SDS Sheets" color="#10B981" colors={colors} />
              <StatCard value={stats.sops} label="SOPs" color="#6B7280" colors={colors} />
              <StatCard value={stats.certs} label="Certs" color="#6B7280" colors={colors} />
            </View>

            {/* ── Status Breakdown ── */}
            <View style={styles.statsRow}>
              <StatCard value={stats.active} label="Active" color="#10B981" colors={colors} />
              <StatCard value={stats.expired} label="Expired" color="#EF4444" colors={colors} />
              <StatCard value={stats.allergen} label="Allergen" color="#DC2626" colors={colors} />
              <StatCard value={stats.danger} label="Danger" color="#F59E0B" colors={colors} />
            </View>

            {/* ── Document Categories ── */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: '#4A90A4' }]}>Document Categories</Text>
              </View>
              {categories.map((cat, idx) => {
                const IconComp = cat.icon;
                const isLast = idx === categories.length - 1;
                return (
                  <Pressable
                    key={cat.name}
                    style={({ pressed }) => [
                      styles.categoryRow,
                      {
                        borderBottomColor: isLast ? 'transparent' : colors.border,
                        opacity: pressed && cat.route ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => handleCategoryPress(cat)}
                    disabled={!cat.route}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: cat.color + '18' }]}>
                      <IconComp size={20} color={cat.color} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                      <Text style={[styles.categoryDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                        {cat.desc}
                      </Text>
                    </View>
                    <Text style={[styles.categoryCount, { color: cat.count > 0 ? cat.color : colors.textTertiary }]}>
                      {cat.count}
                    </Text>
                    {cat.route ? (
                      <ChevronRight size={16} color={colors.textTertiary} />
                    ) : (
                      <View style={{ width: 16 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* ── SDS by Department ── */}
            {deptBreakdown.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
                  <BarChart3 size={16} color="#8B5CF6" />
                  <Text style={[styles.sectionTitle, { color: '#8B5CF6' }]}>SDS by Department</Text>
                </View>
                {deptBreakdown.map((dept, idx) => {
                  const pct = stats.sds > 0 ? Math.round((dept.count / stats.sds) * 100) : 0;
                  const isLast = idx === deptBreakdown.length - 1;
                  return (
                    <View
                      key={dept.name}
                      style={[styles.deptRow, { borderBottomColor: isLast ? 'transparent' : colors.border }]}
                    >
                      <Text style={[styles.deptName, { color: colors.text }]}>
                        {dept.name.charAt(0).toUpperCase() + dept.name.slice(1)}
                      </Text>
                      <View style={styles.deptBarContainer}>
                        <View style={[styles.deptBarBg, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.deptBarFill,
                              { width: `${pct}%`, backgroundColor: '#8B5CF6' },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={[styles.deptCount, { color: colors.text }]}>{dept.count}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Compliance Note ── */}
            <View style={[styles.complianceCard, { backgroundColor: '#10B981' + '0A', borderColor: '#10B981' + '30' }]}>
              <View style={styles.complianceHeader}>
                <CheckCircle size={18} color="#10B981" />
                <Text style={[styles.complianceTitle, { color: '#10B981' }]}>
                  SQF 2.3.2 — Document Control
                </Text>
              </View>
              <Text style={[styles.complianceText, { color: colors.textSecondary }]}>
                All documents are centrally managed with version control, access tracking, and department-level organization. SDS documents include QR codes for instant access and are linked to allergen and hazard classification systems.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── StatCard Component ────────────────────────────────────────
function StatCard({ value, label, color, colors }: { value: number; label: string; color: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color + '0A', borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 2,
  },

  // ── Section Card ──
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden' as const,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },

  // ── Category Row ──
  categoryRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  categoryDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  categoryCount: {
    fontSize: 20,
    fontWeight: '800' as const,
    minWidth: 28,
    textAlign: 'right' as const,
  },

  // ── Department Breakdown ──
  deptRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  deptName: {
    fontSize: 14,
    fontWeight: '600' as const,
    width: 100,
    textTransform: 'capitalize' as const,
  },
  deptBarContainer: {
    flex: 1,
  },
  deptBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  deptBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  deptCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    minWidth: 28,
    textAlign: 'right' as const,
  },

  // ── Compliance Card ──
  complianceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  complianceHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  complianceTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  complianceText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
