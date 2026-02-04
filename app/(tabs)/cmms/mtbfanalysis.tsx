import React, { useState } from 'react';
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
  Activity,
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Calendar,
  ChevronRight,
  Gauge,
  Timer,
  Shield,
  DollarSign,
  Zap,
} from 'lucide-react-native';
import {
  useAllEquipmentReliability,
  useOverallReliabilityStats,
  useReliabilityTrends,
  EquipmentReliabilityMetrics,
} from '@/hooks/useSupabaseFailureCodes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ViewMode = 'overview' | 'equipment' | 'trends';

export default function MTBFAnalysisScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentReliabilityMetrics | null>(null);

  const { data: overallStats } = useOverallReliabilityStats();
  const { data: equipmentMetrics = [] } = useAllEquipmentReliability();
  const { data: trends = [] } = useReliabilityTrends();

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

  const maxMTBF = Math.max(...equipmentMetrics.map(m => m.mtbfHours), 1);
  const maxTrendMTBF = Math.max(...trends.map(t => t.mtbf), 1);

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp size={14} color="#10B981" />;
      case 'declining':
        return <TrendingDown size={14} color="#EF4444" />;
      default:
        return <Minus size={14} color="#6B7280" />;
    }
  };

  const getAvailabilityColor = (availability: number) => {
    if (availability >= 98) return '#10B981';
    if (availability >= 95) return '#F59E0B';
    return '#EF4444';
  };

  const getReliabilityScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const renderOverviewTab = () => (
    <>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#3B82F620' }]}>
            <Activity size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.avgMTBF.toFixed(0)}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg. MTBF</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            ~{(stats.avgMTBF / 16).toFixed(0)} days
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B20' }]}>
            <Timer size={20} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.avgMTTR.toFixed(1)}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg. MTTR</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            repair time
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#10B98120' }]}>
            <Shield size={20} color="#10B981" />
          </View>
          <Text style={[styles.statValue, { color: getAvailabilityColor(stats.avgAvailability) }]}>
            {stats.avgAvailability.toFixed(1)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Availability</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            uptime
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#EF444420' }]}>
            <AlertTriangle size={20} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.totalFailures}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Failures</Text>
          <Text style={[styles.statSubtext, { color: colors.textSecondary }]}>
            {stats.totalDowntimeHours.toFixed(1)}h down
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <CheckCircle size={18} color="#10B981" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Top Performers</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Highest MTBF</Text>
        </View>

        {stats.topPerformers.map((equip, index) => (
          <View key={equip.equipmentId} style={[styles.performerRow, { borderTopColor: colors.border }]}>
            <View style={[styles.rankBadge, { backgroundColor: '#10B98120' }]}>
              <Text style={[styles.rankText, { color: '#10B981' }]}>#{index + 1}</Text>
            </View>
            <View style={styles.performerInfo}>
              <Text style={[styles.performerName, { color: colors.text }]} numberOfLines={1}>
                {equip.equipmentName}
              </Text>
              <Text style={[styles.performerMTBF, { color: colors.textSecondary }]}>
                Availability: {equip.availability.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <AlertTriangle size={18} color="#EF4444" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Needs Attention</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Lowest reliability</Text>
        </View>

        {stats.needsAttention.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={32} color="#10B981" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              All equipment within acceptable limits
            </Text>
          </View>
        ) : (
          stats.needsAttention.map((equip, index) => (
            <View key={equip.equipmentId} style={[styles.attentionRow, { borderTopColor: colors.border }]}>
              <View style={[styles.rankBadge, { backgroundColor: '#FEE2E2' }]}>
                <AlertTriangle size={14} color="#EF4444" />
              </View>
              <View style={styles.performerInfo}>
                <Text style={[styles.performerName, { color: colors.text }]} numberOfLines={1}>
                  {equip.equipmentName}
                </Text>
                <View style={styles.attentionStats}>
                  <Text style={[styles.attentionStat, { color: '#EF4444' }]}>
                    {equip.availability.toFixed(1)}% availability
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <DollarSign size={18} color="#8B5CF6" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Maintenance Cost Impact</Text>
          </View>
        </View>
        
        <View style={styles.costSummary}>
          <View style={styles.costItem}>
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Total Maintenance Cost</Text>
            <Text style={[styles.costValue, { color: colors.text }]}>
              ${stats.totalMaintenanceCost.toLocaleString()}
            </Text>
          </View>
          <View style={styles.costItem}>
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Cost per Failure</Text>
            <Text style={[styles.costValue, { color: colors.text }]}>
              ${stats.totalFailures > 0 
                ? (stats.totalMaintenanceCost / stats.totalFailures).toFixed(0) 
                : '0'}
            </Text>
          </View>
          <View style={styles.costItem}>
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Downtime Hours</Text>
            <Text style={[styles.costValue, { color: '#EF4444' }]}>
              {stats.totalDowntimeHours.toFixed(1)}h
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderEquipmentTab = () => (
    <>
      {selectedEquipment ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedEquipment(null)}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back to list</Text>
          </TouchableOpacity>

          <View style={styles.equipmentDetailHeader}>
            <Text style={[styles.equipmentDetailName, { color: colors.text }]}>
              {selectedEquipment.equipmentName}
            </Text>
            <View style={styles.trendBadgeRow}>
              {getTrendIcon(selectedEquipment.trend)}
              <Text style={[styles.trendLabel, { 
                color: selectedEquipment.trend === 'improving' ? '#10B981' : 
                       selectedEquipment.trend === 'declining' ? '#EF4444' : '#6B7280'
              }]}>
                {selectedEquipment.trend}
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Activity size={18} color="#3B82F6" />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {selectedEquipment.mtbfHours.toFixed(0)}h
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>MTBF</Text>
              <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>
                {selectedEquipment.mtbfDays.toFixed(0)} days
              </Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Timer size={18} color="#F59E0B" />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {selectedEquipment.mttrHours.toFixed(1)}h
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>MTTR</Text>
              <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>
                avg repair
              </Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Shield size={18} color={getAvailabilityColor(selectedEquipment.availability)} />
              <Text style={[styles.metricValue, { color: getAvailabilityColor(selectedEquipment.availability) }]}>
                {selectedEquipment.availability.toFixed(1)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Availability</Text>
              <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>
                uptime
              </Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Gauge size={18} color={getAvailabilityColor(selectedEquipment.availability)} />
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {selectedEquipment.failureCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Failures</Text>
              <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>
                total
              </Text>
            </View>
          </View>

          <View style={[styles.detailSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Equipment Summary</Text>
            <View style={[styles.failureHistoryItem, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.failureHistoryStats}>
                <Text style={[styles.failureStat, { color: colors.textSecondary }]}>
                  ⏱ {selectedEquipment.totalDowntimeHours.toFixed(1)}h total downtime
                </Text>
                <Text style={[styles.failureStat, { color: colors.textSecondary }]}>
                  🔧 {selectedEquipment.totalRepairHours.toFixed(1)}h total repair
                </Text>
                <Text style={[styles.failureStat, { color: colors.textSecondary }]}>
                  💰 ${selectedEquipment.totalCost.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Wrench size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Equipment Reliability</Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {equipmentMetrics.length} assets tracked
            </Text>
          </View>

          {equipmentMetrics.map((equip) => {
            const barWidth = (equip.mtbfHours / maxMTBF) * 100;
            
            return (
              <TouchableOpacity 
                key={equip.equipmentId} 
                style={[styles.equipmentRow, { borderTopColor: colors.border }]}
                onPress={() => setSelectedEquipment(equip)}
              >
                <View style={styles.equipmentHeader}>
                  <View style={styles.equipmentNameRow}>
                    <Text style={[styles.equipmentName, { color: colors.text }]} numberOfLines={1}>
                      {equip.equipmentName}
                    </Text>
                    {getTrendIcon(equip.trend)}
                  </View>
                  <View style={styles.equipmentBadges}>
                    <View style={[styles.mtbfBadge, { backgroundColor: '#3B82F615' }]}>
                      <Text style={[styles.mtbfBadgeText, { color: '#3B82F6' }]}>
                        MTBF: {equip.mtbfHours.toFixed(0)}h
                      </Text>
                    </View>
                    <View style={[styles.mttrBadge, { backgroundColor: '#F59E0B15' }]}>
                      <Text style={[styles.mttrBadgeText, { color: '#F59E0B' }]}>
                        MTTR: {equip.mttrHours.toFixed(1)}h
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.equipmentBarContainer}>
                  <View 
                    style={[
                      styles.equipmentBar, 
                      { 
                        width: `${barWidth}%`, 
                        backgroundColor: getAvailabilityColor(equip.availability) 
                      }
                    ]} 
                  />
                </View>

                <View style={styles.equipmentStatsRow}>
                  <Text style={[styles.equipmentStat, { color: colors.textSecondary }]}>
                    {equip.failureCount} failures
                  </Text>
                  <Text style={[styles.equipmentStat, { color: colors.textSecondary }]}>
                    {equip.totalDowntimeHours.toFixed(1)}h downtime
                  </Text>
                  <Text style={[styles.equipmentStat, { color: getAvailabilityColor(equip.availability) }]}>
                    {equip.availability.toFixed(1)}% avail.
                  </Text>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );

  const renderTrendsTab = () => (
    <>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <BarChart3 size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>MTBF Trend</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Last 6 months</Text>
        </View>

        <View style={styles.chartContainer}>
          {trends.map((trend, index) => {
            const barHeight = (trend.mtbf / maxTrendMTBF) * 100;
            
            return (
              <View key={trend.month} style={styles.chartBarColumn}>
                <View style={styles.chartBarWrapper}>
                  <View 
                    style={[
                      styles.chartBar, 
                      { 
                        height: `${barHeight}%`, 
                        backgroundColor: '#3B82F6' 
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.chartBarValue, { color: colors.text }]}>
                  {trend.mtbf}h
                </Text>
                <Text style={[styles.chartBarLabel, { color: colors.textSecondary }]}>
                  {trend.month.split(' ')[0]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Timer size={18} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>MTTR Trend</Text>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Repair efficiency</Text>
        </View>

        {trends.map((trend) => (
          <View key={`mttr-${trend.month}`} style={[styles.trendRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.trendMonth, { color: colors.text }]}>{trend.month}</Text>
            <View style={styles.trendValues}>
              <View style={styles.trendValueItem}>
                <Text style={[styles.trendValueLabel, { color: colors.textSecondary }]}>MTTR</Text>
                <Text style={[styles.trendValueText, { color: '#F59E0B' }]}>{trend.mttr}h</Text>
              </View>
              <View style={styles.trendValueItem}>
                <Text style={[styles.trendValueLabel, { color: colors.textSecondary }]}>Failures</Text>
                <Text style={[styles.trendValueText, { color: '#EF4444' }]}>{trend.failureCount}</Text>
              </View>
              <View style={styles.trendValueItem}>
                <Text style={[styles.trendValueLabel, { color: colors.textSecondary }]}>Avail.</Text>
                <Text style={[styles.trendValueText, { color: getAvailabilityColor(trend.availability) }]}>
                  {trend.availability}%
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Zap size={18} color="#8B5CF6" />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Key Insights</Text>
          </View>
        </View>

        <View style={styles.insightsContainer}>
          <View style={[styles.insightItem, { backgroundColor: '#3B82F610' }]}>
            <Activity size={16} color="#3B82F6" />
            <Text style={[styles.insightText, { color: colors.text }]}>
              MTBF average: {stats.avgMTBF.toFixed(0)} hours ({(stats.avgMTBF / 16).toFixed(0)} operating days)
            </Text>
          </View>

          <View style={[styles.insightItem, { backgroundColor: '#F59E0B10' }]}>
            <Timer size={16} color="#F59E0B" />
            <Text style={[styles.insightText, { color: colors.text }]}>
              Average repair takes {stats.avgMTTR.toFixed(1)} hours
            </Text>
          </View>

          <View style={[styles.insightItem, { backgroundColor: '#10B98110' }]}>
            <Shield size={16} color="#10B981" />
            <Text style={[styles.insightText, { color: colors.text }]}>
              Fleet availability: {stats.avgAvailability.toFixed(1)}%
            </Text>
          </View>

          {stats.needsAttention.length > 0 && (
            <View style={[styles.insightItem, { backgroundColor: '#EF444410' }]}>
              <AlertTriangle size={16} color="#EF4444" />
              <Text style={[styles.insightText, { color: colors.text }]}>
                {stats.needsAttention.length} asset(s) need attention
              </Text>
            </View>
          )}
        </View>
      </View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {[
            { id: 'overview' as ViewMode, label: 'Overview', icon: Gauge },
            { id: 'equipment' as ViewMode, label: 'Equipment', icon: Wrench },
            { id: 'trends' as ViewMode, label: 'Trends', icon: BarChart3 },
          ].map(tab => {
            const isActive = viewMode === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                ]}
                onPress={() => {
                  setViewMode(tab.id);
                  if (tab.id !== 'equipment') setSelectedEquipment(null);
                }}
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
        {viewMode === 'equipment' && renderEquipmentTab()}
        {viewMode === 'trends' && renderTrendsTab()}

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
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  performerMTBF: {
    fontSize: 12,
  },
  attentionStats: {
    flexDirection: 'row',
    gap: 12,
  },
  attentionStat: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  costSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  costItem: {
    alignItems: 'center',
    flex: 1,
  },
  costLabel: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  equipmentRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  equipmentHeader: {
    marginBottom: 8,
  },
  equipmentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  equipmentBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  mtbfBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mtbfBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  mttrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mttrBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  equipmentBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  equipmentBar: {
    height: '100%',
    borderRadius: 3,
  },
  equipmentStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  equipmentStat: {
    fontSize: 11,
  },
  backButton: {
    paddingBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  equipmentDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  equipmentDetailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    flex: 1,
  },
  trendBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricBox: {
    width: (SCREEN_WIDTH - 66) / 2,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 10,
  },
  detailSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  failureHistoryItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  failureHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  failureCode: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  failureDate: {
    fontSize: 12,
  },
  failureHistoryStats: {
    flexDirection: 'row',
    gap: 12,
  },
  failureStat: {
    fontSize: 11,
  },
  lastFailureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  lastFailureText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: 10,
  },
  chartBarColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarWrapper: {
    flex: 1,
    width: 24,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 6,
  },
  chartBarLabel: {
    fontSize: 9,
    marginTop: 2,
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
  trendValues: {
    flexDirection: 'row',
    gap: 16,
  },
  trendValueItem: {
    alignItems: 'center',
  },
  trendValueLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  trendValueText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  insightsContainer: {
    gap: 10,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 13,
    flex: 1,
  },
});
