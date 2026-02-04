import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Wrench,
  ChevronRight,
  BarChart3,
  PieChart,
  RefreshCw,
  Cog,
  Zap,
  Droplets,
  Wind,
  Gauge,
  Box,
  GitBranch,
  User,
  Cloud,
} from 'lucide-react-native';
import {
  useFailureRecordsQuery,
  useFailureCodeCategories,
  useFailureCodesQuery,
  useFailureStatsByFailureCode,
  useFailureStatsByEquipmentQuery,
} from '@/hooks/useSupabaseFailureCodes';
import { FailureCodeCategory } from '@/constants/failureCodeConstants';

interface FailureStatByCode {
  failureCodeId: string;
  failureCode: string;
  failureName: string;
  count: number;
  totalDowntime: number;
  totalCost: number;
}

interface FailureStatByEquipment {
  equipmentId: string;
  equipmentName: string;
  failureCount: number;
  totalDowntime: number;
  totalCost: number;
  topFailureCode: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_ICONS: Record<FailureCodeCategory, React.ComponentType<any>> = {
  mechanical: Cog,
  electrical: Zap,
  hydraulic: Droplets,
  pneumatic: Wind,
  instrumentation: Gauge,
  structural: Box,
  process: GitBranch,
  operator: User,
  external: Cloud,
};

type ViewMode = 'overview' | 'byCode' | 'byEquipment';

export default function FailureAnalysisScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const { data: failureRecordsData = [], isLoading: isLoadingRecords, refetch: refetchRecords } = useFailureRecordsQuery();
  const { data: categoriesData = [] } = useFailureCodeCategories();
  const { data: failureCodesData = [] } = useFailureCodesQuery();
  const { data: failureStatsByCode = [], isLoading: isLoadingStatsByCode, refetch: refetchStatsByCode } = useFailureStatsByFailureCode();
  const { data: failureStatsByEquipment = [], isLoading: isLoadingStatsByEquipment, refetch: refetchStatsByEquipment } = useFailureStatsByEquipmentQuery();

  const FAILURE_CODE_CATEGORIES = categoriesData;

  const isLoading = isLoadingRecords || isLoadingStatsByCode || isLoadingStatsByEquipment;

  const handleRefresh = useCallback(() => {
    refetchRecords();
    refetchStatsByCode();
    refetchStatsByEquipment();
  }, [refetchRecords, refetchStatsByCode, refetchStatsByEquipment]);

  const normalizedRecords = useMemo(() => {
    return failureRecordsData.map((r: any) => ({
      id: r.id,
      failureCodeId: r.failure_code_id ?? r.failureCodeId ?? '',
      failureCode: r.failure_code ?? r.failureCode ?? '',
      equipmentName: r.equipment_name ?? r.equipmentName ?? '',
      failureDate: r.failure_date ?? r.failureDate ?? '',
      description: r.description ?? '',
      downtimeHours: r.downtime_hours ?? r.downtimeHours ?? 0,
      repairHours: r.repair_hours ?? r.repairHours ?? 0,
      partsCost: r.parts_cost ?? r.partsCost ?? 0,
      laborCost: r.labor_cost ?? r.laborCost ?? 0,
      isRecurring: r.is_recurring ?? r.isRecurring ?? false,
    }));
  }, [failureRecordsData]);

  const getFailureCodeById = useCallback((codeId: string) => {
    const code = failureCodesData.find(fc => fc.id === codeId);
    if (!code) return null;
    return {
      id: code.id,
      code: code.code,
      name: code.name,
      category: code.category,
      severity: code.severity,
    };
  }, [failureCodesData]);

  const totalStats = useMemo(() => {
    const totalDowntime = normalizedRecords.reduce((sum, r) => sum + r.downtimeHours, 0);
    const totalCost = normalizedRecords.reduce((sum, r) => sum + r.partsCost + r.laborCost, 0);
    const totalRepairHours = normalizedRecords.reduce((sum, r) => sum + r.repairHours, 0);
    const avgMTTR = normalizedRecords.length > 0 ? totalRepairHours / normalizedRecords.length : 0;
    const recurringCount = normalizedRecords.filter(r => r.isRecurring).length;
    
    return {
      totalFailures: normalizedRecords.length,
      totalDowntime,
      totalCost,
      avgMTTR,
      recurringCount,
      recurringRate: normalizedRecords.length > 0 
        ? (recurringCount / normalizedRecords.length * 100).toFixed(1) 
        : '0',
    };
  }, [normalizedRecords]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<FailureCodeCategory, { count: number; cost: number; downtime: number }> = {
      mechanical: { count: 0, cost: 0, downtime: 0 },
      electrical: { count: 0, cost: 0, downtime: 0 },
      hydraulic: { count: 0, cost: 0, downtime: 0 },
      pneumatic: { count: 0, cost: 0, downtime: 0 },
      instrumentation: { count: 0, cost: 0, downtime: 0 },
      structural: { count: 0, cost: 0, downtime: 0 },
      process: { count: 0, cost: 0, downtime: 0 },
      operator: { count: 0, cost: 0, downtime: 0 },
      external: { count: 0, cost: 0, downtime: 0 },
    };

    normalizedRecords.forEach(record => {
      const code = getFailureCodeById(record.failureCodeId);
      if (code && code.category in breakdown) {
        const category = code.category as keyof typeof breakdown;
        breakdown[category].count++;
        breakdown[category].cost += record.partsCost + record.laborCost;
        breakdown[category].downtime += record.downtimeHours;
      }
    });

    return Object.entries(breakdown)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([category, data]) => ({
        category: category as FailureCodeCategory,
        ...data,
      }));
  }, [normalizedRecords, getFailureCodeById]);

  const maxCategoryCount = Math.max(...categoryBreakdown.map(c => c.count), 1);

  const renderCategoryIcon = (category: FailureCodeCategory, size: number = 16) => {
    const Icon = CATEGORY_ICONS[category];
    const categoryInfo = FAILURE_CODE_CATEGORIES.find(c => c.id === category);
    return <Icon size={size} color={categoryInfo?.color || colors.textSecondary} />;
  };

  const renderOverviewTab = () => (
    <>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
            <AlertTriangle size={20} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.totalFailures}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Failures</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <Clock size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.totalDowntime.toFixed(1)}h</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Downtime</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
            <DollarSign size={20} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>${totalStats.totalCost.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Cost</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
            <Wrench size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalStats.avgMTTR.toFixed(1)}h</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg. MTTR</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <PieChart size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Failures by Category</Text>
          </View>
        </View>

        {categoryBreakdown.map((item) => {
          const categoryInfo = FAILURE_CODE_CATEGORIES.find(c => c.id === item.category);
          const barWidth = (item.count / maxCategoryCount) * 100;

          return (
            <View key={item.category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryIcon, { backgroundColor: categoryInfo?.color + '20' }]}>
                  {renderCategoryIcon(item.category, 14)}
                </View>
                <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                  {categoryInfo?.name}
                </Text>
              </View>
              <View style={styles.categoryBarContainer}>
                <View 
                  style={[
                    styles.categoryBar, 
                    { 
                      width: `${barWidth}%`, 
                      backgroundColor: categoryInfo?.color 
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.categoryCount, { color: colors.text }]}>{item.count}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <RefreshCw size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Recurring Failures</Text>
          </View>
          <View style={[styles.recurringBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.recurringBadgeText, { color: '#EF4444' }]}>
              {totalStats.recurringRate}%
            </Text>
          </View>
        </View>

        <Text style={[styles.recurringSubtext, { color: colors.textSecondary }]}>
          {totalStats.recurringCount} of {totalStats.totalFailures} failures are recurring issues
        </Text>

        {normalizedRecords.filter(r => r.isRecurring).slice(0, 3).map(failure => (
          <View key={failure.id} style={[styles.recurringItem, { borderTopColor: colors.border }]}>
            <View style={styles.recurringHeader}>
              <Text style={[styles.recurringCode, { color: colors.primary }]}>{failure.failureCode}</Text>
              <Text style={[styles.recurringDate, { color: colors.textSecondary }]}>{failure.failureDate}</Text>
            </View>
            <Text style={[styles.recurringEquipment, { color: colors.text }]}>{failure.equipmentName}</Text>
            <Text style={[styles.recurringDesc, { color: colors.textSecondary }]} numberOfLines={1}>
              {failure.description}
            </Text>
          </View>
        ))}
      </View>
    </>
  );

  const renderByCodeTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Top Failure Codes</Text>
          </View>
        </View>

        {failureStatsByCode.slice(0, 10).map((stat: FailureStatByCode, index: number) => {
          return (
            <View key={stat.failureCodeId} style={[styles.codeRow, { borderTopColor: colors.border }]}>
              <View style={styles.codeRank}>
                <Text style={[styles.rankNumber, { color: index < 3 ? '#EF4444' : colors.textSecondary }]}>
                  #{index + 1}
                </Text>
              </View>
              
              <View style={styles.codeDetails}>
                <View style={styles.codeHeader}>
                  <View style={[styles.codeBadge, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.codeText, { color: colors.primary }]}>{stat.failureCode}</Text>
                  </View>
                  <Text style={[styles.codeCount, { color: colors.text }]}>{stat.count}x</Text>
                </View>
                <Text style={[styles.codeName, { color: colors.text }]} numberOfLines={1}>
                  {stat.failureName}
                </Text>
                <View style={styles.codeStats}>
                  <Text style={[styles.codeStatItem, { color: colors.textSecondary }]}>
                    ⏱ {stat.totalDowntime.toFixed(1)}h
                  </Text>
                  <Text style={[styles.codeStatItem, { color: colors.textSecondary }]}>
                    💰 ${stat.totalCost.toLocaleString()}
                  </Text>
                </View>
              </View>

              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          );
        })}
      </View>
    </>
  );

  const renderByEquipmentTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Wrench size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Equipment Failure Analysis</Text>
          </View>
        </View>

        {failureStatsByEquipment.map((stat: FailureStatByEquipment, index: number) => (
          <View key={stat.equipmentId} style={[styles.equipmentRow, { borderTopColor: colors.border }]}>
            <View style={styles.equipmentHeader}>
              <View style={styles.equipmentRank}>
                <Text style={[
                  styles.equipmentRankNumber, 
                  { 
                    color: index < 3 ? '#FFFFFF' : colors.textSecondary,
                    backgroundColor: index < 3 ? '#EF4444' : 'transparent'
                  }
                ]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.equipmentInfo}>
                <Text style={[styles.equipmentName, { color: colors.text }]} numberOfLines={1}>
                  {stat.equipmentName}
                </Text>
                <View style={styles.topCodesRow}>
                  {stat.topFailureCode && (
                    <View style={[styles.topCodeBadge, { backgroundColor: colors.border }]}>
                      <Text style={[styles.topCodeText, { color: colors.textSecondary }]}>
                        {stat.topFailureCode}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.equipmentStatsGrid}>
              <View style={styles.equipmentStatBox}>
                <Text style={[styles.equipmentStatValue, { color: '#EF4444' }]}>{stat.failureCount}</Text>
                <Text style={[styles.equipmentStatLabel, { color: colors.textSecondary }]}>Failures</Text>
              </View>
              <View style={styles.equipmentStatBox}>
                <Text style={[styles.equipmentStatValue, { color: '#F59E0B' }]}>
                  {stat.totalDowntime.toFixed(1)}h
                </Text>
                <Text style={[styles.equipmentStatLabel, { color: colors.textSecondary }]}>Downtime</Text>
              </View>
              <View style={styles.equipmentStatBox}>
                <Text style={[styles.equipmentStatValue, { color: '#10B981' }]}>
                  ${stat.totalCost.toLocaleString()}
                </Text>
                <Text style={[styles.equipmentStatLabel, { color: colors.textSecondary }]}>Cost</Text>
              </View>
              
            </View>
          </View>
        ))}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {[
            { id: 'overview' as ViewMode, label: 'Overview', icon: BarChart3 },
            { id: 'byCode' as ViewMode, label: 'By Code', icon: AlertTriangle },
            { id: 'byEquipment' as ViewMode, label: 'By Equipment', icon: Wrench },
          ].map(tab => {
            const isActive = viewMode === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                ]}
                onPress={() => setViewMode(tab.id)}
              >
                <tab.icon size={16} color={isActive ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.textSecondary }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && normalizedRecords.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analysis data...</Text>
          </View>
        ) : (
          <>
            {viewMode === 'overview' && renderOverviewTab()}
            {viewMode === 'byCode' && renderByCodeTab()}
            {viewMode === 'byEquipment' && renderByEquipmentTab()}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  tabsContainer: {
    borderBottomWidth: 1,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 34) / 2,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  categoryInfo: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: 4,
  },
  categoryCount: {
    width: 24,
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'right',
  },
  recurringBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recurringBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  recurringSubtext: {
    fontSize: 13,
    marginBottom: 12,
  },
  recurringItem: {
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recurringCode: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  recurringDate: {
    fontSize: 12,
  },
  recurringEquipment: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  recurringDesc: {
    fontSize: 13,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  codeRank: {
    width: 30,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  codeDetails: {
    flex: 1,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  codeCount: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  codeName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  codeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  codeStatItem: {
    fontSize: 11,
  },
  equipmentRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  equipmentRank: {
    width: 24,
  },
  equipmentRankNumber: {
    fontSize: 12,
    fontWeight: '700' as const,
    width: 22,
    height: 22,
    lineHeight: 22,
    textAlign: 'center',
    borderRadius: 11,
    overflow: 'hidden',
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  topCodesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topCodeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  equipmentStatsGrid: {
    flexDirection: 'row',
    marginLeft: 34,
    gap: 8,
  },
  equipmentStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  equipmentStatValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  equipmentStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
