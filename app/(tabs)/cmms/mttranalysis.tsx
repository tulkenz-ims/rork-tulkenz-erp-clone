import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Timer,
  Wrench,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Target,
  Zap,
  Users,
  DollarSign,
  AlertTriangle,
} from 'lucide-react-native';
import {
  useAllEquipmentReliability,
  useOverallReliabilityStats,
  useReliabilityTrends,
  useFailureRecordsQuery,
  FailureRecordDB,
} from '@/hooks/useSupabaseFailureCodes';
import { FailureRecord } from '@/constants/failureCodesDataConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'overview' | 'byEquipment' | 'byTechnician';

interface TechnicianStats {
  id: string;
  name: string;
  repairCount: number;
  totalRepairHours: number;
  avgRepairTime: number;
  totalCost: number;
}

interface NormalizedFailureRecord {
  id: string;
  reportedBy: string;
  reportedByName: string;
  repairHours: number;
  partsCost: number;
  laborCost: number;
}

function normalizeFailureRecord(record: FailureRecord | FailureRecordDB): NormalizedFailureRecord {
  if ('reported_by' in record) {
    return {
      id: record.id,
      reportedBy: record.reported_by,
      reportedByName: record.reported_by_name,
      repairHours: record.repair_hours,
      partsCost: record.parts_cost,
      laborCost: record.labor_cost,
    };
  }
  return {
    id: record.id,
    reportedBy: record.reportedBy,
    reportedByName: record.reportedByName,
    repairHours: record.repairHours,
    partsCost: record.partsCost,
    laborCost: record.laborCost,
  };
}

export default function MTTRAnalysisScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const { data: overallStats } = useOverallReliabilityStats();
  const { data: equipmentMetrics = [] } = useAllEquipmentReliability();
  const { data: trends = [] } = useReliabilityTrends();
  const { data: rawFailureRecords = [] } = useFailureRecordsQuery();

  const failureRecords = useMemo((): NormalizedFailureRecord[] => {
    return rawFailureRecords.map(normalizeFailureRecord);
  }, [rawFailureRecords]);

  const stats = overallStats ?? {
    totalEquipment: 0,
    totalFailures: 0,
    avgMTBF: 0,
    avgMTTR: 0,
    avgAvailability: 100,
    topPerformers: [],
    needsAttention: [],
    totalDowntimeHours: 0,
    totalMaintenanceCost: 0,
  };

  const technicianStats = useMemo((): TechnicianStats[] => {
    const techMap = new Map<string, TechnicianStats>();
    
    failureRecords.forEach(record => {
      const existing = techMap.get(record.reportedBy);
      if (existing) {
        existing.repairCount++;
        existing.totalRepairHours += record.repairHours;
        existing.avgRepairTime = existing.totalRepairHours / existing.repairCount;
        existing.totalCost += record.partsCost + record.laborCost;
      } else {
        techMap.set(record.reportedBy, {
          id: record.reportedBy,
          name: record.reportedByName,
          repairCount: 1,
          totalRepairHours: record.repairHours,
          avgRepairTime: record.repairHours,
          totalCost: record.partsCost + record.laborCost,
        });
      }
    });

    return Array.from(techMap.values()).sort((a, b) => b.repairCount - a.repairCount);
  }, [failureRecords]);

  const repairTimeDistribution = useMemo(() => {
    const ranges = [
      { label: '< 1h', min: 0, max: 1, count: 0, color: '#10B981' },
      { label: '1-2h', min: 1, max: 2, count: 0, color: '#3B82F6' },
      { label: '2-4h', min: 2, max: 4, count: 0, color: '#F59E0B' },
      { label: '4-8h', min: 4, max: 8, count: 0, color: '#EF4444' },
      { label: '8h+', min: 8, max: Infinity, count: 0, color: '#7C3AED' },
    ];

    failureRecords.forEach(record => {
      const repairHrs = record.repairHours;
      const range = ranges.find(r => repairHrs >= r.min && repairHrs < r.max);
      if (range) range.count++;
    });

    const maxCount = Math.max(...ranges.map(r => r.count), 1);
    return ranges.map(r => ({ ...r, percentage: (r.count / maxCount) * 100 }));
  }, [failureRecords]);

  const sortedByMTTR = useMemo(() => {
    return [...equipmentMetrics].sort((a, b) => b.mttrHours - a.mttrHours);
  }, [equipmentMetrics]);

  const mttrTarget = 3;

  const getMTTRStatusColor = (mttr: number) => {
    if (mttr <= mttrTarget) return '#10B981';
    if (mttr <= mttrTarget * 1.5) return '#F59E0B';
    return '#EF4444';
  };

  const renderOverviewTab = () => (
    <>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <Timer size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.avgMTTR.toFixed(1)}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg. MTTR</Text>
          <View style={[styles.targetBadge, { 
            backgroundColor: getMTTRStatusColor(stats.avgMTTR) + '20' 
          }]}>
            <Text style={[styles.targetText, { 
              color: getMTTRStatusColor(stats.avgMTTR) 
            }]}>
              Target: {mttrTarget}h
            </Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
            <Wrench size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {failureRecords.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Repairs</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            last 12 months
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
            <Clock size={20} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.totalDowntimeHours.toFixed(1)}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Downtime</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            production lost
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#8B5CF620' }]}>
            <DollarSign size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            ${failureRecords.length > 0 ? (stats.totalMaintenanceCost / failureRecords.length).toFixed(0) : '0'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg. Repair Cost</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            parts + labor
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Repair Time Distribution</Text>
          </View>
        </View>

        {repairTimeDistribution.map((range) => (
          <View key={range.label} style={styles.distributionRow}>
            <View style={styles.distributionLabel}>
              <Text style={[styles.distributionLabelText, { color: colors.text }]}>{range.label}</Text>
              <Text style={[styles.distributionCount, { color: colors.textSecondary }]}>
                {range.count} repairs
              </Text>
            </View>
            <View style={styles.distributionBarContainer}>
              <View 
                style={[
                  styles.distributionBar, 
                  { width: `${range.percentage}%`, backgroundColor: range.color }
                ]} 
              />
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Timer size={18} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>MTTR Trend</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Last 6 months</Text>
        </View>

        {trends.map((trend, index) => {
          const prevMTTR = index > 0 ? trends[index - 1].mttr : trend.mttr;
          const change = trend.mttr - prevMTTR;
          
          return (
            <View key={trend.month} style={[styles.trendRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.trendMonth, { color: colors.text }]}>{trend.month}</Text>
              <View style={styles.trendMTTR}>
                <Text style={[styles.trendValue, { color: getMTTRStatusColor(trend.mttr) }]}>
                  {trend.mttr}h
                </Text>
                {index > 0 && change !== 0 && (
                  <View style={styles.trendChange}>
                    {change < 0 ? (
                      <TrendingDown size={12} color="#10B981" />
                    ) : (
                      <TrendingUp size={12} color="#EF4444" />
                    )}
                    <Text style={[styles.trendChangeText, { 
                      color: change < 0 ? '#10B981' : '#EF4444' 
                    }]}>
                      {Math.abs(change).toFixed(1)}h
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.trendFailures}>
                <Text style={[styles.trendFailureCount, { color: colors.textSecondary }]}>
                  {trend.failureCount} repairs
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Target size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Performance vs Target</Text>
          </View>
        </View>

        <View style={styles.performanceContainer}>
          <View style={styles.performanceGauge}>
            <View style={[styles.gaugeTrack, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.gaugeFill, 
                  { 
                    width: `${Math.min((mttrTarget / (stats.avgMTTR || 1)) * 100, 100)}%`,
                    backgroundColor: getMTTRStatusColor(stats.avgMTTR)
                  }
                ]} 
              />
            </View>
            <View style={styles.gaugeLabels}>
              <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>0h</Text>
              <View style={styles.gaugeTargetMarker}>
                <View style={[styles.targetLine, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.gaugeLabel, { color: '#10B981' }]}>Target {mttrTarget}h</Text>
              </View>
              <Text style={[styles.gaugeLabel, { color: colors.textSecondary }]}>
                {Math.max(stats.avgMTTR, mttrTarget * 2).toFixed(0)}h
              </Text>
            </View>
          </View>

          <View style={styles.performanceStats}>
            <View style={[styles.performanceStat, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.performanceStatLabel, { color: colors.textSecondary }]}>
                Current MTTR
              </Text>
              <Text style={[styles.performanceStatValue, { 
                color: getMTTRStatusColor(stats.avgMTTR) 
              }]}>
                {stats.avgMTTR.toFixed(1)}h
              </Text>
            </View>
            <View style={[styles.performanceStat, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.performanceStatLabel, { color: colors.textSecondary }]}>
                Target
              </Text>
              <Text style={[styles.performanceStatValue, { color: '#10B981' }]}>
                {mttrTarget}h
              </Text>
            </View>
            <View style={[styles.performanceStat, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.performanceStatLabel, { color: colors.textSecondary }]}>
                Variance
              </Text>
              <Text style={[styles.performanceStatValue, { 
                color: stats.avgMTTR <= mttrTarget ? '#10B981' : '#EF4444' 
              }]}>
                {stats.avgMTTR <= mttrTarget ? '-' : '+'}
                {Math.abs(stats.avgMTTR - mttrTarget).toFixed(1)}h
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  const renderByEquipmentTab = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Wrench size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>MTTR by Equipment</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Sorted by repair time
        </Text>
      </View>

      {sortedByMTTR.map((equip, index) => (
        <View key={equip.equipmentId} style={[styles.equipmentRow, { borderTopColor: colors.border }]}>
          <View style={styles.equipmentHeader}>
            <View style={styles.equipmentNameRow}>
              <Text style={[styles.equipmentName, { color: colors.text }]} numberOfLines={1}>
                {equip.equipmentName}
              </Text>
              {equip.mttrHours > mttrTarget ? (
                <AlertTriangle size={14} color="#EF4444" />
              ) : (
                <Zap size={14} color="#10B981" />
              )}
            </View>
          </View>

          <View style={styles.equipmentMetrics}>
            <View style={styles.equipmentMetric}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>MTTR</Text>
              <Text style={[styles.metricValue, { color: getMTTRStatusColor(equip.mttrHours) }]}>
                {equip.mttrHours.toFixed(1)}h
              </Text>
            </View>
            <View style={styles.equipmentMetric}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Repairs</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {equip.failureCount}
              </Text>
            </View>
            <View style={styles.equipmentMetric}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Time</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {equip.totalRepairHours.toFixed(1)}h
              </Text>
            </View>
            <View style={styles.equipmentMetric}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Downtime</Text>
              <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                {equip.totalDowntimeHours.toFixed(1)}h
              </Text>
            </View>
          </View>

          <View style={styles.mttrBarContainer}>
            <View 
              style={[
                styles.mttrBar, 
                { 
                  width: `${Math.min((equip.mttrHours / 10) * 100, 100)}%`,
                  backgroundColor: getMTTRStatusColor(equip.mttrHours)
                }
              ]} 
            />
            <View 
              style={[
                styles.mttrTargetLine, 
                { left: `${(mttrTarget / 10) * 100}%` }
              ]} 
            />
          </View>
        </View>
      ))}
    </View>
  );

  const renderByTechnicianTab = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Users size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Repairs by Technician</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Work distribution
        </Text>
      </View>

      {technicianStats.map((tech, index) => (
        <View key={tech.id} style={[styles.technicianRow, { borderTopColor: colors.border }]}>
          <View style={styles.technicianHeader}>
            <View style={[styles.techRankBadge, { 
              backgroundColor: index < 3 ? '#3B82F620' : colors.backgroundSecondary 
            }]}>
              <Text style={[styles.techRankText, { 
                color: index < 3 ? '#3B82F6' : colors.textSecondary 
              }]}>
                #{index + 1}
              </Text>
            </View>
            <View style={styles.technicianInfo}>
              <Text style={[styles.technicianName, { color: colors.text }]}>{tech.name}</Text>
              <Text style={[styles.technicianId, { color: colors.textSecondary }]}>{tech.id}</Text>
            </View>
          </View>

          <View style={styles.technicianMetrics}>
            <View style={styles.techMetric}>
              <Text style={[styles.techMetricValue, { color: colors.text }]}>{tech.repairCount}</Text>
              <Text style={[styles.techMetricLabel, { color: colors.textSecondary }]}>Repairs</Text>
            </View>
            <View style={styles.techMetric}>
              <Text style={[styles.techMetricValue, { color: '#F59E0B' }]}>
                {tech.avgRepairTime.toFixed(1)}h
              </Text>
              <Text style={[styles.techMetricLabel, { color: colors.textSecondary }]}>Avg. Time</Text>
            </View>
            <View style={styles.techMetric}>
              <Text style={[styles.techMetricValue, { color: colors.text }]}>
                {tech.totalRepairHours.toFixed(1)}h
              </Text>
              <Text style={[styles.techMetricLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.techMetric}>
              <Text style={[styles.techMetricValue, { color: '#8B5CF6' }]}>
                ${tech.totalCost.toLocaleString()}
              </Text>
              <Text style={[styles.techMetricLabel, { color: colors.textSecondary }]}>Cost</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {[
            { id: 'overview' as ViewMode, label: 'Overview', icon: Timer },
            { id: 'byEquipment' as ViewMode, label: 'By Equipment', icon: Wrench },
            { id: 'byTechnician' as ViewMode, label: 'By Technician', icon: Users },
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
      >
        {viewMode === 'overview' && renderOverviewTab()}
        {viewMode === 'byEquipment' && renderByEquipmentTab()}
        {viewMode === 'byTechnician' && renderByTechnicianTab()}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  targetBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  targetText: {
    fontSize: 10,
    fontWeight: '600' as const,
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
  cardSubtitle: {
    fontSize: 12,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  distributionLabel: {
    width: 80,
  },
  distributionLabelText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  distributionCount: {
    fontSize: 11,
  },
  distributionBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    borderRadius: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  trendMonth: {
    fontSize: 13,
    fontWeight: '500' as const,
    width: 80,
  },
  trendMTTR: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  trendValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  trendChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendChangeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  trendFailures: {
    alignItems: 'flex-end',
  },
  trendFailureCount: {
    fontSize: 12,
  },
  performanceContainer: {
    gap: 16,
  },
  performanceGauge: {
    gap: 8,
  },
  gaugeTrack: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 10,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 11,
  },
  gaugeTargetMarker: {
    alignItems: 'center',
  },
  targetLine: {
    width: 2,
    height: 8,
    marginBottom: 2,
  },
  performanceStats: {
    flexDirection: 'row',
    gap: 10,
  },
  performanceStat: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  performanceStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  performanceStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  equipmentRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  equipmentHeader: {
    marginBottom: 10,
  },
  equipmentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  equipmentMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  equipmentMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  mttrBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  mttrBar: {
    height: '100%',
    borderRadius: 4,
  },
  mttrTargetLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#10B981',
  },
  technicianRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  technicianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  techRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techRankText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  technicianInfo: {
    flex: 1,
  },
  technicianName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  technicianId: {
    fontSize: 11,
  },
  technicianMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  techMetric: {
    alignItems: 'center',
  },
  techMetricValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  techMetricLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
