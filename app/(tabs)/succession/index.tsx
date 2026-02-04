import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Users,
  Target,
  AlertTriangle,
  TrendingUp,
  Search,
  ChevronRight,
  Star,
  Shield,
  Clock,
  UserCheck,
  Briefcase,
  Award,
  BarChart3,
  Filter,
} from 'lucide-react-native';
import { useSupabasePerformance, type SuccessionPlan, type TalentProfile, type Successor } from '@/hooks/useSupabasePerformance';
import {
  MOCK_KEY_POSITIONS,
  MOCK_SUCCESSOR_CANDIDATES,
  MOCK_TALENT_POOL,
  READINESS_LABELS,
  READINESS_COLORS,
  RISK_COLORS,
  CRITICALITY_COLORS,
  BENCH_STRENGTH_COLORS,
  POOL_CATEGORY_LABELS,
  POOL_CATEGORY_COLORS,
  type KeyPosition,
  type SuccessorCandidate,
  type TalentPoolMember,
  type RiskLevel,
  type PositionCriticality,
} from '@/constants/successionConstants';

type SuccessionView = 'positions' | 'pipeline' | 'talent' | 'analytics';

export default function SuccessionScreen() {
  const { colors } = useTheme();
  const [currentView, setCurrentView] = useState<SuccessionView>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const {
    successionPlans,
    talentProfiles,
    isLoading,
    refetch,
  } = useSupabasePerformance();

  const [refreshing, setRefreshing] = useState(false);

  const transformedPositions = useMemo((): KeyPosition[] => {
    if (successionPlans.length === 0) return MOCK_KEY_POSITIONS;
    
    return successionPlans.map((plan): KeyPosition => {
      const successors = (plan.successors || []) as Successor[];
      const readyNowCount = successors.filter(s => s.readiness === 'ready-now').length;
      const benchStrength = successors.length === 0 ? 'none' 
        : readyNowCount > 0 ? 'strong' 
        : successors.length >= 2 ? 'adequate' 
        : 'weak';
      
      return {
        id: plan.id,
        title: plan.position_title,
        department: plan.department,
        departmentCode: plan.department.substring(0, 4).toUpperCase(),
        level: plan.critical_role ? 'Director' : 'Manager',
        incumbentId: plan.incumbent_id || undefined,
        incumbentName: plan.incumbent_id ? 'Current Incumbent' : undefined,
        incumbentTenure: undefined,
        criticality: plan.critical_role ? 'essential' : 'important' as PositionCriticality,
        vacancyRisk: !plan.incumbent_id ? 'critical' : successors.length === 0 ? 'high' : 'medium' as RiskLevel,
        retirementRisk: plan.retirement_risk,
        flightRisk: 'low' as RiskLevel,
        successorCount: successors.length,
        readyNowCount,
        benchStrength: benchStrength as 'strong' | 'adequate' | 'weak' | 'none',
        lastReviewed: plan.last_reviewed || plan.created_at,
        nextReview: plan.next_review || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      };
    });
  }, [successionPlans]);

  const transformedCandidates = useMemo((): SuccessorCandidate[] => {
    if (successionPlans.length === 0) return MOCK_SUCCESSOR_CANDIDATES;
    
    const candidates: SuccessorCandidate[] = [];
    successionPlans.forEach(plan => {
      const successors = (plan.successors || []) as Successor[];
      successors.forEach((successor, index) => {
        candidates.push({
          id: `${plan.id}-${index}`,
          employeeId: successor.employeeId,
          employeeName: `Employee ${successor.employeeId.slice(-4)}`,
          currentPosition: 'Current Position',
          department: plan.department,
          positionId: plan.id,
          positionTitle: plan.position_title,
          readiness: successor.readiness,
          performanceRating: 4,
          potentialRating: 4,
          yearsInRole: 3,
          strengths: successor.strengths || [],
          developmentNeeds: successor.developmentNeeds || [],
          developmentPlan: [],
          careerAspirations: [],
          willingToRelocate: true,
          targetDate: successor.targetDate,
          lastAssessment: plan.last_reviewed || plan.created_at,
        });
      });
    });
    return candidates.length > 0 ? candidates : MOCK_SUCCESSOR_CANDIDATES;
  }, [successionPlans]);

  const transformedTalentPool = useMemo((): TalentPoolMember[] => {
    if (talentProfiles.length === 0) return MOCK_TALENT_POOL;
    
    return talentProfiles.map((profile): TalentPoolMember => {
      const categoryMap: Record<string, TalentPoolMember['poolCategory']> = {
        'high-performer': 'high-potential',
        'solid-performer': 'emerging-leader',
        'needs-improvement': 'technical-expert',
        'critical-talent': 'future-executive',
      };
      
      return {
        id: profile.id,
        employeeId: profile.employee_id,
        employeeName: `Employee ${profile.employee_id.slice(-4)}`,
        currentPosition: 'Current Position',
        department: 'Department',
        poolCategory: categoryMap[profile.category] || 'high-potential',
        performanceRating: profile.performance_rating || 4,
        potentialRating: profile.potential_rating || 4,
        readyForPromotion: profile.ready_for_promotion,
        flightRisk: profile.flight_risk,
        engagementScore: 85,
        successorFor: profile.successor_for || [],
        keyStrengths: profile.key_strengths || [],
        developmentFocus: profile.development_areas || [],
        lastReviewDate: profile.last_review_date || profile.created_at,
        careerPath: profile.career_aspirations?.[0],
      };
    });
  }, [talentProfiles]);

  const views = [
    { key: 'positions' as const, label: 'Key Positions', icon: Briefcase },
    { key: 'pipeline' as const, label: 'Pipeline', icon: Users },
    { key: 'talent' as const, label: 'Talent Pool', icon: Star },
    { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const metrics = useMemo(() => {
    const positions = transformedPositions;
    const candidates = transformedCandidates;
    const talent = transformedTalentPool;
    
    const totalPositions = positions.length;
    const positionsWithSuccessors = positions.filter(p => p.successorCount > 0).length;
    const atRiskPositions = positions.filter(
      p => p.vacancyRisk === 'high' || p.vacancyRisk === 'critical' || p.benchStrength === 'none' || p.benchStrength === 'weak'
    ).length;
    const readyNow = candidates.filter(c => c.readiness === 'ready-now').length;
    const ready1Year = candidates.filter(c => c.readiness === 'ready-1-year').length;
    const ready2Years = candidates.filter(c => c.readiness === 'ready-2-years').length;
    const retirementRisk = positions.filter(p => p.retirementRisk).length;
    const highFlightRisk = talent.filter(t => t.flightRisk === 'high').length;
    const coverageRate = totalPositions > 0 ? Math.round((positionsWithSuccessors / totalPositions) * 100) : 0;

    return {
      totalPositions,
      positionsWithSuccessors,
      atRiskPositions,
      readyNow,
      ready1Year,
      ready2Years,
      retirementRisk,
      highFlightRisk,
      coverageRate,
      talentPoolSize: talent.length,
    };
  }, [transformedPositions, transformedCandidates, transformedTalentPool]);

  const filteredPositions = useMemo(() => {
    let filtered = transformedPositions;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p => p.title.toLowerCase().includes(query) ||
          p.department.toLowerCase().includes(query) ||
          p.incumbentName?.toLowerCase().includes(query)
      );
    }

    if (selectedFilter === 'at-risk') {
      filtered = filtered.filter(p => p.vacancyRisk === 'high' || p.vacancyRisk === 'critical');
    } else if (selectedFilter === 'no-successor') {
      filtered = filtered.filter(p => p.successorCount === 0);
    } else if (selectedFilter === 'retirement') {
      filtered = filtered.filter(p => p.retirementRisk);
    }

    return filtered;
  }, [searchQuery, selectedFilter, transformedPositions]);

  const filteredCandidates = useMemo(() => {
    let filtered = transformedCandidates;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.employeeName.toLowerCase().includes(query) ||
          c.positionTitle.toLowerCase().includes(query) ||
          c.currentPosition.toLowerCase().includes(query)
      );
    }

    if (selectedFilter === 'ready-now') {
      filtered = filtered.filter(c => c.readiness === 'ready-now');
    } else if (selectedFilter === 'ready-1-year') {
      filtered = filtered.filter(c => c.readiness === 'ready-1-year');
    }

    return filtered;
  }, [searchQuery, selectedFilter, transformedCandidates]);

  const filteredTalentPool = useMemo(() => {
    let filtered = transformedTalentPool;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.employeeName.toLowerCase().includes(query) ||
          t.currentPosition.toLowerCase().includes(query) ||
          t.department.toLowerCase().includes(query)
      );
    }

    if (selectedFilter === 'high-potential') {
      filtered = filtered.filter(t => t.poolCategory === 'high-potential');
    } else if (selectedFilter === 'future-executive') {
      filtered = filtered.filter(t => t.poolCategory === 'future-executive');
    } else if (selectedFilter === 'flight-risk') {
      filtered = filtered.filter(t => t.flightRisk === 'high' || t.flightRisk === 'medium');
    }

    return filtered;
  }, [searchQuery, selectedFilter, transformedTalentPool]);

  const renderPositionCard = (position: KeyPosition) => {
    const criticalityColor = CRITICALITY_COLORS[position.criticality];
    const riskColor = RISK_COLORS[position.vacancyRisk];
    const benchColor = BENCH_STRENGTH_COLORS[position.benchStrength];

    return (
      <TouchableOpacity
        key={position.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.criticalityBadge, { backgroundColor: criticalityColor + '20' }]}>
              <Shield size={14} color={criticalityColor} />
              <Text style={[styles.criticalityText, { color: criticalityColor }]}>
                {position.criticality.charAt(0).toUpperCase() + position.criticality.slice(1)}
              </Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{position.title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {position.department} • {position.level}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.positionInfo}>
          <View style={styles.incumbentRow}>
            <UserCheck size={16} color={colors.textSecondary} />
            <Text style={[styles.incumbentText, { color: colors.text }]}>
              {position.incumbentName || 'VACANT'}
            </Text>
            {position.incumbentTenure && (
              <Text style={[styles.tenureText, { color: colors.textSecondary }]}>
                ({position.incumbentTenure} yrs)
              </Text>
            )}
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Successors</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>
                {position.successorCount} ({position.readyNowCount} ready)
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Bench</Text>
              <View style={[styles.benchBadge, { backgroundColor: benchColor + '20' }]}>
                <Text style={[styles.benchText, { color: benchColor }]}>
                  {position.benchStrength.charAt(0).toUpperCase() + position.benchStrength.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.riskRow}>
            {position.vacancyRisk !== 'low' && (
              <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
                <AlertTriangle size={12} color={riskColor} />
                <Text style={[styles.riskText, { color: riskColor }]}>
                  {position.vacancyRisk.charAt(0).toUpperCase() + position.vacancyRisk.slice(1)} Risk
                </Text>
              </View>
            )}
            {position.retirementRisk && (
              <View style={[styles.riskBadge, { backgroundColor: '#F59E0B20' }]}>
                <Clock size={12} color="#F59E0B" />
                <Text style={[styles.riskText, { color: '#F59E0B' }]}>Retirement</Text>
              </View>
            )}
            {position.flightRisk === 'high' && (
              <View style={[styles.riskBadge, { backgroundColor: '#EF444420' }]}>
                <TrendingUp size={12} color="#EF4444" />
                <Text style={[styles.riskText, { color: '#EF4444' }]}>Flight Risk</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
            Last reviewed: {new Date(position.lastReviewed).toLocaleDateString()}
          </Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCandidateCard = (candidate: SuccessorCandidate) => {
    const readinessColor = READINESS_COLORS[candidate.readiness];
    const completedActions = candidate.developmentPlan.filter(a => a.status === 'completed').length;
    const totalActions = candidate.developmentPlan.length;

    return (
      <TouchableOpacity
        key={candidate.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {candidate.employeeName.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{candidate.employeeName}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {candidate.currentPosition}
              </Text>
            </View>
          </View>
          <View style={[styles.readinessBadge, { backgroundColor: readinessColor + '20' }]}>
            <Text style={[styles.readinessText, { color: readinessColor }]}>
              {READINESS_LABELS[candidate.readiness]}
            </Text>
          </View>
        </View>

        <View style={styles.candidateInfo}>
          <View style={styles.targetPositionRow}>
            <Target size={16} color={colors.primary} />
            <Text style={[styles.targetPositionText, { color: colors.text }]}>
              {candidate.positionTitle}
            </Text>
          </View>

          <View style={styles.ratingsRow}>
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Performance</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={14}
                    color={star <= candidate.performanceRating ? '#F59E0B' : colors.border}
                    fill={star <= candidate.performanceRating ? '#F59E0B' : 'none'}
                  />
                ))}
              </View>
            </View>
            <View style={styles.ratingItem}>
              <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Potential</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={14}
                    color={star <= candidate.potentialRating ? '#3B82F6' : colors.border}
                    fill={star <= candidate.potentialRating ? '#3B82F6' : 'none'}
                  />
                ))}
              </View>
            </View>
          </View>

          {totalActions > 0 && (
            <View style={styles.developmentRow}>
              <Text style={[styles.developmentLabel, { color: colors.textSecondary }]}>
                Development Progress
              </Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${(completedActions / totalActions) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {completedActions}/{totalActions}
                </Text>
              </View>
            </View>
          )}

          {candidate.strengths.length > 0 && (
            <View style={styles.strengthsRow}>
              {candidate.strengths.slice(0, 3).map((strength, index) => (
                <View
                  key={index}
                  style={[styles.strengthChip, { backgroundColor: colors.backgroundTertiary }]}
                >
                  <Text style={[styles.strengthText, { color: colors.textSecondary }]}>
                    {strength}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.reviewDate, { color: colors.textTertiary }]}>
            Assessed: {new Date(candidate.lastAssessment).toLocaleDateString()}
          </Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderTalentCard = (talent: TalentPoolMember) => {
    const categoryColor = POOL_CATEGORY_COLORS[talent.poolCategory];
    const riskColor = RISK_COLORS[talent.flightRisk];

    return (
      <TouchableOpacity
        key={talent.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.avatarText, { color: categoryColor }]}>
                {talent.employeeName.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{talent.employeeName}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {talent.currentPosition} • {talent.department}
              </Text>
            </View>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {POOL_CATEGORY_LABELS[talent.poolCategory]}
            </Text>
          </View>
        </View>

        <View style={styles.talentInfo}>
          <View style={styles.talentMetricsRow}>
            <View style={styles.talentMetricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Performance</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={12}
                    color={star <= talent.performanceRating ? '#F59E0B' : colors.border}
                    fill={star <= talent.performanceRating ? '#F59E0B' : 'none'}
                  />
                ))}
              </View>
            </View>
            <View style={styles.talentMetricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Potential</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={12}
                    color={star <= talent.potentialRating ? '#3B82F6' : colors.border}
                    fill={star <= talent.potentialRating ? '#3B82F6' : 'none'}
                  />
                ))}
              </View>
            </View>
            <View style={styles.talentMetricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Engagement</Text>
              <Text style={[styles.engagementScore, { color: colors.text }]}>{talent.engagementScore}%</Text>
            </View>
          </View>

          <View style={styles.talentBadgesRow}>
            {talent.readyForPromotion && (
              <View style={[styles.promotionBadge, { backgroundColor: '#10B98120' }]}>
                <Award size={12} color="#10B981" />
                <Text style={[styles.promotionText, { color: '#10B981' }]}>Ready for Promotion</Text>
              </View>
            )}
            {talent.flightRisk !== 'low' && (
              <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
                <AlertTriangle size={12} color={riskColor} />
                <Text style={[styles.riskText, { color: riskColor }]}>
                  {talent.flightRisk.charAt(0).toUpperCase() + talent.flightRisk.slice(1)} Flight Risk
                </Text>
              </View>
            )}
          </View>

          {talent.successorFor.length > 0 && (
            <View style={styles.successorForRow}>
              <Text style={[styles.successorForLabel, { color: colors.textSecondary }]}>
                Successor for:
              </Text>
              <Text style={[styles.successorForText, { color: colors.text }]}>
                {talent.successorFor.join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {talent.careerPath && (
            <Text style={[styles.careerPath, { color: colors.primary }]}>{talent.careerPath}</Text>
          )}
          <ChevronRight size={18} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderAnalytics = () => {
    const byReadiness = {
      'Ready Now': metrics.readyNow,
      'Ready 1 Year': metrics.ready1Year,
      'Ready 2 Years': metrics.ready2Years,
    };

    const byBenchStrength = {
      'Strong': transformedPositions.filter(p => p.benchStrength === 'strong').length,
      'Adequate': transformedPositions.filter(p => p.benchStrength === 'adequate').length,
      'Weak': transformedPositions.filter(p => p.benchStrength === 'weak').length,
      'None': transformedPositions.filter(p => p.benchStrength === 'none').length,
    };

    const byCategory = {
      'High Potential': transformedTalentPool.filter(t => t.poolCategory === 'high-potential').length,
      'Emerging Leader': transformedTalentPool.filter(t => t.poolCategory === 'emerging-leader').length,
      'Technical Expert': transformedTalentPool.filter(t => t.poolCategory === 'technical-expert').length,
      'Future Executive': transformedTalentPool.filter(t => t.poolCategory === 'future-executive').length,
    };

    return (
      <View style={styles.analyticsContainer}>
        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Succession Coverage</Text>
          <View style={styles.coverageRow}>
            <View style={styles.coverageCircle}>
              <Text style={[styles.coveragePercent, { color: colors.primary }]}>{metrics.coverageRate}%</Text>
              <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Coverage</Text>
            </View>
            <View style={styles.coverageDetails}>
              <View style={styles.coverageItem}>
                <View style={[styles.coverageDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.coverageText, { color: colors.text }]}>
                  {metrics.positionsWithSuccessors} positions covered
                </Text>
              </View>
              <View style={styles.coverageItem}>
                <View style={[styles.coverageDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.coverageText, { color: colors.text }]}>
                  {metrics.totalPositions - metrics.positionsWithSuccessors} positions uncovered
                </Text>
              </View>
              <View style={styles.coverageItem}>
                <View style={[styles.coverageDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.coverageText, { color: colors.text }]}>
                  {metrics.atRiskPositions} positions at risk
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Pipeline Readiness</Text>
          <View style={styles.barChartContainer}>
            {Object.entries(byReadiness).map(([label, value], index) => {
              const barColors = ['#10B981', '#3B82F6', '#F59E0B'];
              const maxValue = Math.max(...Object.values(byReadiness));
              const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.barFill, { backgroundColor: barColors[index], width: `${width}%` }]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>{value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Bench Strength Distribution</Text>
          <View style={styles.barChartContainer}>
            {Object.entries(byBenchStrength).map(([label, value]) => {
              const benchColors: Record<string, string> = {
                'Strong': '#10B981',
                'Adequate': '#3B82F6',
                'Weak': '#F59E0B',
                'None': '#EF4444',
              };
              const maxValue = Math.max(...Object.values(byBenchStrength));
              const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.barFill, { backgroundColor: benchColors[label], width: `${width}%` }]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>{value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Talent Pool Composition</Text>
          <View style={styles.barChartContainer}>
            {Object.entries(byCategory).map(([label, value]) => {
              const categoryColors: Record<string, string> = {
                'High Potential': '#8B5CF6',
                'Emerging Leader': '#3B82F6',
                'Technical Expert': '#10B981',
                'Future Executive': '#F59E0B',
              };
              const maxValue = Math.max(...Object.values(byCategory));
              const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <View key={label} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                      <View
                        style={[styles.barFill, { backgroundColor: categoryColors[label], width: `${width}%` }]}
                      />
                    </View>
                    <Text style={[styles.barValue, { color: colors.text }]}>{value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.riskSummaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text }]}>Risk Summary</Text>
          <View style={styles.riskSummaryGrid}>
            <View style={[styles.riskSummaryItem, { backgroundColor: '#F59E0B20' }]}>
              <Clock size={24} color="#F59E0B" />
              <Text style={[styles.riskSummaryValue, { color: '#F59E0B' }]}>{metrics.retirementRisk}</Text>
              <Text style={[styles.riskSummaryLabel, { color: colors.textSecondary }]}>Retirement Risk</Text>
            </View>
            <View style={[styles.riskSummaryItem, { backgroundColor: '#EF444420' }]}>
              <TrendingUp size={24} color="#EF4444" />
              <Text style={[styles.riskSummaryValue, { color: '#EF4444' }]}>{metrics.highFlightRisk}</Text>
              <Text style={[styles.riskSummaryLabel, { color: colors.textSecondary }]}>High Flight Risk</Text>
            </View>
            <View style={[styles.riskSummaryItem, { backgroundColor: '#7C3AED20' }]}>
              <AlertTriangle size={24} color="#7C3AED" />
              <Text style={[styles.riskSummaryValue, { color: '#7C3AED' }]}>{metrics.atRiskPositions}</Text>
              <Text style={[styles.riskSummaryLabel, { color: colors.textSecondary }]}>At Risk Positions</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </View>
    );
  };

  const getFilterOptions = () => {
    switch (currentView) {
      case 'positions':
        return [
          { key: null, label: 'All' },
          { key: 'at-risk', label: 'At Risk' },
          { key: 'no-successor', label: 'No Successor' },
          { key: 'retirement', label: 'Retirement Risk' },
        ];
      case 'pipeline':
        return [
          { key: null, label: 'All' },
          { key: 'ready-now', label: 'Ready Now' },
          { key: 'ready-1-year', label: 'Ready 1 Year' },
        ];
      case 'talent':
        return [
          { key: null, label: 'All' },
          { key: 'high-potential', label: 'High Potential' },
          { key: 'future-executive', label: 'Future Executive' },
          { key: 'flight-risk', label: 'Flight Risk' },
        ];
      default:
        return [];
    }
  };

  if (isLoading && successionPlans.length === 0 && talentProfiles.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Succession Planning',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading succession data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Succession Planning',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.statsHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Briefcase size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.totalPositions}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Key Positions</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
              <UserCheck size={18} color="#10B981" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.readyNow}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ready Now</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#EF444420' }]}>
              <AlertTriangle size={18} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.atRiskPositions}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>At Risk</Text>
            </View>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
              <Star size={18} color="#8B5CF6" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.text }]}>{metrics.talentPoolSize}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Talent Pool</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.viewTabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {views.map(view => {
            const Icon = view.icon;
            const isActive = currentView === view.key;
            return (
              <TouchableOpacity
                key={view.key}
                style={[
                  styles.viewTab,
                  {
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setCurrentView(view.key);
                  setSelectedFilter(null);
                }}
              >
                <Icon size={16} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[styles.viewTabText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}
                >
                  {view.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {currentView !== 'analytics' && (
        <>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Search size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <Filter size={16} color={colors.textSecondary} style={styles.filterIcon} />
                {getFilterOptions().map(option => (
                  <TouchableOpacity
                    key={option.key || 'all'}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedFilter === option.key ? colors.primary : colors.surface,
                        borderColor: selectedFilter === option.key ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedFilter(option.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedFilter === option.key ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {currentView === 'positions' && (
          <View style={styles.section}>
            {filteredPositions.length > 0 ? (
              filteredPositions.map(renderPositionCard)
            ) : (
              <View style={styles.emptyState}>
                <Briefcase size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No key positions found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'pipeline' && (
          <View style={styles.section}>
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map(renderCandidateCard)
            ) : (
              <View style={styles.emptyState}>
                <Users size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No successor candidates found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'talent' && (
          <View style={styles.section}>
            {filteredTalentPool.length > 0 ? (
              filteredTalentPool.map(renderTalentCard)
            ) : (
              <View style={styles.emptyState}>
                <Star size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No talent pool members found
                </Text>
              </View>
            )}
          </View>
        )}

        {currentView === 'analytics' && renderAnalytics()}

        {currentView !== 'analytics' && <View style={{ height: 32 }} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  viewTabs: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  viewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginVertical: 12,
    gap: 6,
    borderWidth: 1,
  },
  viewTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 8,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  criticalityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  positionInfo: {
    gap: 10,
  },
  incumbentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incumbentText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  tenureText: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metricItem: {
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  benchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  benchText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  riskRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reviewDate: {
    fontSize: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  readinessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  readinessText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  candidateInfo: {
    gap: 10,
  },
  targetPositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetPositionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  ratingItem: {
    gap: 4,
  },
  ratingLabel: {
    fontSize: 11,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  developmentRow: {
    gap: 6,
  },
  developmentLabel: {
    fontSize: 11,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  strengthsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  strengthChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  strengthText: {
    fontSize: 11,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  talentInfo: {
    gap: 10,
  },
  talentMetricsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  talentMetricItem: {
    gap: 4,
  },
  engagementScore: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  talentBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  promotionText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  successorForRow: {
    gap: 2,
  },
  successorForLabel: {
    fontSize: 11,
  },
  successorForText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  careerPath: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  analyticsContainer: {
    padding: 16,
    gap: 16,
  },
  analyticsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  coverageCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coveragePercent: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  coverageLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  coverageDetails: {
    flex: 1,
    gap: 8,
  },
  coverageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  coverageText: {
    fontSize: 13,
  },
  barChartContainer: {
    gap: 12,
  },
  barRow: {
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    width: 24,
    textAlign: 'right' as const,
  },
  riskSummaryCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  riskSummaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  riskSummaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  riskSummaryValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  riskSummaryLabel: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
});
