import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import {
  Heart,
  Search,
  Users,
  Calendar,
  AlertTriangle,
  DollarSign,
  Shield,
  FileText,
  TrendingUp,
  ChevronRight,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  CreditCard,
  PiggyBank,
  Stethoscope,
  Eye,
  Smile,
  Umbrella,
  Bell,
  BarChart3,
  Percent,
  UserCheck,
  FileWarning,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BENEFIT_PLANS,
  EMPLOYEE_ENROLLMENTS,
  OPEN_ENROLLMENT_PERIODS,
  COBRA_PARTICIPANTS,
  RETIREMENT_ACCOUNTS,
  BENEFITS_ALERTS,
  BENEFITS_SUMMARY,
} from '@/constants/benefitsConstants';
import type { EmployeeEnrollment, BenefitsAlert } from '@/types/benefits';

type TabKey = 'overview' | 'enrollment' | 'plans' | 'cobra' | '401k' | 'alerts';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'enrollment', label: 'Enrollment', icon: UserCheck },
  { key: 'plans', label: 'Plans', icon: FileText },
  { key: 'cobra', label: 'COBRA', icon: Shield },
  { key: '401k', label: '401(k)', icon: PiggyBank },
  { key: 'alerts', label: 'Alerts', icon: Bell },
];

export default function BenefitsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedPlanType, setSelectedPlanType] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EmployeeEnrollment | null>(null);
  

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const unreadAlerts = BENEFITS_ALERTS.filter((a: BenefitsAlert) => !a.isRead).length;

  const filteredEnrollments = useMemo(() => {
    let filtered = EMPLOYEE_ENROLLMENTS;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e => e.employeeName.toLowerCase().includes(query) ||
             e.department.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [searchQuery]);

  const filteredPlans = useMemo(() => {
    let filtered = BENEFIT_PLANS;
    if (selectedPlanType) {
      filtered = filtered.filter(p => p.type === selectedPlanType);
    }
    return filtered;
  }, [selectedPlanType]);

  const filteredRetirementAccounts = useMemo(() => {
    let filtered = RETIREMENT_ACCOUNTS;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r => r.employeeName.toLowerCase().includes(query) ||
             r.department.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [searchQuery]);

  const getPlanTypeIcon = (type: string) => {
    switch (type) {
      case 'medical': return Stethoscope;
      case 'dental': return Smile;
      case 'vision': return Eye;
      case 'life': return Heart;
      case 'disability': return Umbrella;
      case 'fsa': case 'hsa': return CreditCard;
      case '401k': return PiggyBank;
      default: return FileText;
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'medical': return '#EF4444';
      case 'dental': return '#8B5CF6';
      case 'vision': return '#3B82F6';
      case 'life': return '#EC4899';
      case 'disability': return '#F59E0B';
      case 'fsa': case 'hsa': return '#10B981';
      case '401k': return '#6366F1';
      default: return '#64748B';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'elected': case 'completed': case 'paid': return '#10B981';
      case 'pending': case 'pending_election': case 'upcoming': return '#F59E0B';
      case 'waived': case 'declined': case 'expired': return '#64748B';
      case 'terminated': case 'late': case 'missed': return '#EF4444';
      default: return '#64748B';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderOverviewTab = () => {
    const currentOE = OPEN_ENROLLMENT_PERIODS.find(oe => oe.status === 'upcoming' || oe.status === 'active');
    
    return (
      <View style={styles.tabContent}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIconContainer, { backgroundColor: '#F43F5E15' }]}>
              <Heart size={28} color="#F43F5E" />
            </View>
            <View style={styles.summaryHeaderText}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Benefits Overview</Text>
              <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                {BENEFITS_SUMMARY.totalEligible} eligible employees
              </Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
                {BENEFITS_SUMMARY.totalEnrolled}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Enrolled</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: '#F59E0B' }]}>
                {BENEFITS_SUMMARY.totalWaived}
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Waived</Text>
            </View>
            <View style={[styles.summaryStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatValue, { color: colors.primary }]}>
                {BENEFITS_SUMMARY.participationRate}%
              </Text>
              <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Participation</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#6366F115' }]}>
              <DollarSign size={20} color="#6366F1" />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatCurrency(BENEFITS_SUMMARY.totalMonthlyPremiums)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Monthly Premiums</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#10B98115' }]}>
              <Building size={20} color="#10B981" />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatCurrency(BENEFITS_SUMMARY.employerContribution)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Employer Cost</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#F43F5E15' }]}>
              <Shield size={20} color="#F43F5E" />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {BENEFITS_SUMMARY.cobraParticipants}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>COBRA Active</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <PiggyBank size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatCurrency(BENEFITS_SUMMARY.totalRetirementAssets)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>401(k) Assets</Text>
          </View>
        </View>

        {currentOE && (
          <View style={[styles.oeCard, { backgroundColor: '#6366F110', borderColor: '#6366F140' }]}>
            <View style={styles.oeHeader}>
              <View style={[styles.oeBadge, { backgroundColor: currentOE.status === 'active' ? '#10B981' : '#F59E0B' }]}>
                <Text style={styles.oeBadgeText}>
                  {currentOE.status === 'active' ? 'ACTIVE' : 'UPCOMING'}
                </Text>
              </View>
              <Text style={[styles.oeTitle, { color: colors.text }]}>{currentOE.name}</Text>
            </View>
            <View style={styles.oeDetails}>
              <View style={styles.oeDetailItem}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={[styles.oeDetailText, { color: colors.textSecondary }]}>
                  {formatDate(currentOE.startDate)} - {formatDate(currentOE.endDate)}
                </Text>
              </View>
              <View style={styles.oeDetailItem}>
                <Users size={16} color={colors.textSecondary} />
                <Text style={[styles.oeDetailText, { color: colors.textSecondary }]}>
                  {currentOE.eligibleEmployees} eligible • {currentOE.enrolled} enrolled
                </Text>
              </View>
            </View>
            <View style={styles.oeProgress}>
              <View style={styles.oeProgressBar}>
                <View
                  style={[
                    styles.oeProgressFill,
                    {
                      width: `${(currentOE.enrolled / currentOE.eligibleEmployees) * 100}%`,
                      backgroundColor: '#6366F1',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.oeProgressText, { color: colors.textSecondary }]}>
                {Math.round((currentOE.enrolled / currentOE.eligibleEmployees) * 100)}% complete
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Alerts</Text>
        {BENEFITS_ALERTS.slice(0, 3).map(alert => renderAlertItem(alert))}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Plan Distribution</Text>
        <View style={[styles.distributionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {['medical', 'dental', 'vision', 'life', '401k'].map(type => {
            const count = EMPLOYEE_ENROLLMENTS.filter(e => 
              e.plans.some(p => p.planType === type)
            ).length;
            const percentage = Math.round((count / BENEFITS_SUMMARY.totalEnrolled) * 100);
            const Icon = getPlanTypeIcon(type);
            const color = getPlanTypeColor(type);
            
            return (
              <View key={type} style={styles.distributionRow}>
                <View style={styles.distributionLabel}>
                  <View style={[styles.distributionIcon, { backgroundColor: `${color}15` }]}>
                    <Icon size={16} color={color} />
                  </View>
                  <Text style={[styles.distributionText, { color: colors.text }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </View>
                <View style={styles.distributionBarContainer}>
                  <View style={[styles.distributionBar, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.distributionBarFill,
                        { width: `${percentage}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.distributionPercent, { color: colors.textSecondary }]}>
                    {percentage}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEnrollmentTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.enrollmentStats}>
        <View style={[styles.enrollmentStatCard, { backgroundColor: '#10B98115' }]}>
          <Text style={[styles.enrollmentStatValue, { color: '#10B981' }]}>
            {EMPLOYEE_ENROLLMENTS.filter(e => e.status === 'active').length}
          </Text>
          <Text style={[styles.enrollmentStatLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.enrollmentStatCard, { backgroundColor: '#F59E0B15' }]}>
          <Text style={[styles.enrollmentStatValue, { color: '#F59E0B' }]}>
            {EMPLOYEE_ENROLLMENTS.filter(e => e.status === 'pending').length}
          </Text>
          <Text style={[styles.enrollmentStatLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.enrollmentStatCard, { backgroundColor: '#64748B15' }]}>
          <Text style={[styles.enrollmentStatValue, { color: '#64748B' }]}>
            {EMPLOYEE_ENROLLMENTS.filter(e => e.status === 'waived').length}
          </Text>
          <Text style={[styles.enrollmentStatLabel, { color: colors.textSecondary }]}>Waived</Text>
        </View>
      </View>

      {filteredEnrollments.map(enrollment => (
        <TouchableOpacity
          key={enrollment.id}
          style={[styles.enrollmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setSelectedEnrollment(enrollment)}
        >
          <View style={styles.enrollmentHeader}>
            <View style={styles.enrollmentInfo}>
              <Text style={[styles.enrollmentName, { color: colors.text }]}>
                {enrollment.employeeName}
              </Text>
              <Text style={[styles.enrollmentDept, { color: colors.textSecondary }]}>
                {enrollment.department}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(enrollment.status)}20` }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(enrollment.status) }]}>
                {enrollment.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          {enrollment.status !== 'waived' && (
            <>
              <View style={styles.enrollmentPlans}>
                {enrollment.plans.slice(0, 4).map((plan, index) => {
                  const Icon = getPlanTypeIcon(plan.planType);
                  const color = getPlanTypeColor(plan.planType);
                  return (
                    <View key={index} style={[styles.planBadge, { backgroundColor: `${color}15` }]}>
                      <Icon size={12} color={color} />
                    </View>
                  );
                })}
                {enrollment.plans.length > 4 && (
                  <View style={[styles.planBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.planBadgeMore, { color: colors.textSecondary }]}>
                      +{enrollment.plans.length - 4}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.enrollmentFooter}>
                <View style={styles.enrollmentCost}>
                  <Text style={[styles.enrollmentCostLabel, { color: colors.textSecondary }]}>
                    Monthly Deduction
                  </Text>
                  <Text style={[styles.enrollmentCostValue, { color: colors.text }]}>
                    {formatCurrency(enrollment.totalMonthlyDeduction)}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </View>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlansTab = () => (
    <View style={styles.tabContent}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.planTypeFilters}
      >
        <TouchableOpacity
          style={[
            styles.planTypeFilter,
            {
              backgroundColor: selectedPlanType === null ? colors.primary : colors.surface,
              borderColor: selectedPlanType === null ? colors.primary : colors.border,
            },
          ]}
          onPress={() => setSelectedPlanType(null)}
        >
          <Text style={[styles.planTypeFilterText, { color: selectedPlanType === null ? '#fff' : colors.text }]}>
            All Plans
          </Text>
        </TouchableOpacity>
        {['medical', 'dental', 'vision', 'life', 'disability', 'fsa', 'hsa', '401k'].map(type => {
          const Icon = getPlanTypeIcon(type);
          const isSelected = selectedPlanType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.planTypeFilter,
                {
                  backgroundColor: isSelected ? getPlanTypeColor(type) : colors.surface,
                  borderColor: isSelected ? getPlanTypeColor(type) : colors.border,
                },
              ]}
              onPress={() => setSelectedPlanType(isSelected ? null : type)}
            >
              <Icon size={14} color={isSelected ? '#fff' : getPlanTypeColor(type)} />
              <Text style={[styles.planTypeFilterText, { color: isSelected ? '#fff' : colors.text }]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filteredPlans.map(plan => {
        const Icon = getPlanTypeIcon(plan.type);
        const color = getPlanTypeColor(plan.type);
        
        return (
          <View
            key={plan.id}
            style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.planHeader}>
              <View style={[styles.planIconContainer, { backgroundColor: `${color}15` }]}>
                <Icon size={24} color={color} />
              </View>
              <View style={styles.planHeaderText}>
                <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.planCarrier, { color: colors.textSecondary }]}>
                  {plan.carrier} • {plan.planCode}
                </Text>
              </View>
              {plan.networkType && (
                <View style={[styles.networkBadge, { backgroundColor: `${color}15` }]}>
                  <Text style={[styles.networkBadgeText, { color }]}>{plan.networkType}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.planCoverage, { color: colors.textSecondary }]}>
              {plan.coverage}
            </Text>

            <View style={styles.planCostRow}>
              <View style={styles.planCostItem}>
                <Text style={[styles.planCostLabel, { color: colors.textSecondary }]}>Employee</Text>
                <Text style={[styles.planCostValue, { color: colors.text }]}>
                  {formatCurrency(plan.employeeCost)}/mo
                </Text>
              </View>
              <View style={styles.planCostItem}>
                <Text style={[styles.planCostLabel, { color: colors.textSecondary }]}>Employer</Text>
                <Text style={[styles.planCostValue, { color: '#10B981' }]}>
                  {formatCurrency(plan.employerCost)}/mo
                </Text>
              </View>
              <View style={styles.planCostItem}>
                <Text style={[styles.planCostLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.planCostValue, { color: colors.primary }]}>
                  {formatCurrency(plan.totalCost)}/mo
                </Text>
              </View>
            </View>

            <View style={styles.planFeatures}>
              {plan.features.slice(0, 4).map((feature, index) => (
                <View key={index} style={[styles.featureBadge, { backgroundColor: colors.background }]}>
                  <CheckCircle size={12} color="#10B981" />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderCobraTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.cobraStats}>
        <View style={[styles.cobraStatCard, { backgroundColor: '#10B98115' }]}>
          <Text style={[styles.cobraStatValue, { color: '#10B981' }]}>
            {COBRA_PARTICIPANTS.filter(c => c.status === 'elected').length}
          </Text>
          <Text style={[styles.cobraStatLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.cobraStatCard, { backgroundColor: '#F59E0B15' }]}>
          <Text style={[styles.cobraStatValue, { color: '#F59E0B' }]}>
            {COBRA_PARTICIPANTS.filter(c => c.status === 'pending_election').length}
          </Text>
          <Text style={[styles.cobraStatLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.cobraStatCard, { backgroundColor: '#64748B15' }]}>
          <Text style={[styles.cobraStatValue, { color: '#64748B' }]}>
            {COBRA_PARTICIPANTS.filter(c => c.status === 'declined' || c.status === 'expired').length}
          </Text>
          <Text style={[styles.cobraStatLabel, { color: colors.textSecondary }]}>Declined</Text>
        </View>
      </View>

      {COBRA_PARTICIPANTS.map(participant => (
        <View
          key={participant.id}
          style={[styles.cobraCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.cobraHeader}>
            <View style={styles.cobraInfo}>
              <Text style={[styles.cobraName, { color: colors.text }]}>
                {participant.formerEmployeeName}
              </Text>
              <Text style={[styles.cobraEvent, { color: colors.textSecondary }]}>
                {participant.qualifyingEvent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(participant.status)}20` }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(participant.status) }]}>
                {participant.status.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cobraDetails}>
            <View style={styles.cobraDetailItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.cobraDetailText, { color: colors.textSecondary }]}>
                Event: {formatDate(participant.qualifyingEventDate)}
              </Text>
            </View>
            {participant.status === 'pending_election' && (
              <View style={styles.cobraDetailItem}>
                <AlertTriangle size={14} color="#F59E0B" />
                <Text style={[styles.cobraDetailText, { color: '#F59E0B' }]}>
                  Deadline: {formatDate(participant.electionDeadline)}
                </Text>
              </View>
            )}
            {participant.status === 'elected' && (
              <View style={styles.cobraDetailItem}>
                <DollarSign size={14} color={colors.textSecondary} />
                <Text style={[styles.cobraDetailText, { color: colors.textSecondary }]}>
                  {formatCurrency(participant.totalMonthlyPremium)}/mo • {participant.remainingMonths} mo remaining
                </Text>
              </View>
            )}
          </View>

          {participant.electedPlans.length > 0 && (
            <View style={styles.cobraPlans}>
              {participant.electedPlans.map((plan, index) => (
                <View key={index} style={[styles.cobraPlanBadge, { backgroundColor: colors.background }]}>
                  <Text style={[styles.cobraPlanText, { color: colors.text }]} numberOfLines={1}>
                    {plan.planName}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.cobraFooter}>
            {participant.coveredDependents.length > 0 && (
              <View style={styles.cobraDependents}>
                <Users size={14} color={colors.textSecondary} />
                <Text style={[styles.cobraDependentsText, { color: colors.textSecondary }]}>
                  {participant.coveredDependents.length} dependent(s)
                </Text>
              </View>
            )}
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </View>
      ))}
    </View>
  );

  const render401kTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.retirementSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.retirementSummaryHeader}>
          <View style={[styles.retirementSummaryIcon, { backgroundColor: '#6366F115' }]}>
            <PiggyBank size={28} color="#6366F1" />
          </View>
          <View style={styles.retirementSummaryText}>
            <Text style={[styles.retirementSummaryTitle, { color: colors.text }]}>
              401(k) Program Overview
            </Text>
            <Text style={[styles.retirementSummarySubtitle, { color: colors.textSecondary }]}>
              Fidelity Investments
            </Text>
          </View>
        </View>

        <View style={styles.retirementSummaryStats}>
          <View style={styles.retirementSummaryStatItem}>
            <Text style={[styles.retirementSummaryStatValue, { color: colors.primary }]}>
              {formatCurrency(BENEFITS_SUMMARY.totalRetirementAssets)}
            </Text>
            <Text style={[styles.retirementSummaryStatLabel, { color: colors.textSecondary }]}>
              Total Assets
            </Text>
          </View>
          <View style={[styles.retirementSummaryStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.retirementSummaryStatItem}>
            <Text style={[styles.retirementSummaryStatValue, { color: '#10B981' }]}>
              {BENEFITS_SUMMARY.averageContributionRate}%
            </Text>
            <Text style={[styles.retirementSummaryStatLabel, { color: colors.textSecondary }]}>
              Avg Contribution
            </Text>
          </View>
          <View style={[styles.retirementSummaryStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.retirementSummaryStatItem}>
            <Text style={[styles.retirementSummaryStatValue, { color: '#6366F1' }]}>
              4%
            </Text>
            <Text style={[styles.retirementSummaryStatLabel, { color: colors.textSecondary }]}>
              Employer Match
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search participants..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredRetirementAccounts.map(account => (
        <View
          key={account.id}
          style={[styles.retirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.retirementHeader}>
            <View style={styles.retirementInfo}>
              <Text style={[styles.retirementName, { color: colors.text }]}>
                {account.employeeName}
              </Text>
              <Text style={[styles.retirementDept, { color: colors.textSecondary }]}>
                {account.department} • {account.accountType === '401k_roth' ? 'Roth 401(k)' : '401(k)'}
              </Text>
            </View>
            <Text style={[styles.retirementBalance, { color: colors.primary }]}>
              {formatCurrency(account.totalBalance)}
            </Text>
          </View>

          <View style={styles.retirementDetails}>
            <View style={styles.retirementDetailItem}>
              <Percent size={14} color={colors.textSecondary} />
              <Text style={[styles.retirementDetailText, { color: colors.textSecondary }]}>
                {account.contributionPercent}% contribution
              </Text>
            </View>
            <View style={styles.retirementDetailItem}>
              <TrendingUp size={14} color="#10B981" />
              <Text style={[styles.retirementDetailText, { color: '#10B981' }]}>
                {account.vestedPercent}% vested
              </Text>
            </View>
          </View>

          <View style={styles.retirementContributions}>
            <View style={styles.retirementContributionItem}>
              <Text style={[styles.retirementContributionLabel, { color: colors.textSecondary }]}>
                YTD Employee
              </Text>
              <Text style={[styles.retirementContributionValue, { color: colors.text }]}>
                {formatCurrency(account.ytdContributions)}
              </Text>
            </View>
            <View style={styles.retirementContributionItem}>
              <Text style={[styles.retirementContributionLabel, { color: colors.textSecondary }]}>
                YTD Employer
              </Text>
              <Text style={[styles.retirementContributionValue, { color: '#10B981' }]}>
                {formatCurrency(account.ytdEmployerMatch)}
              </Text>
            </View>
          </View>

          {account.loans.length > 0 && (
            <View style={[styles.loanWarning, { backgroundColor: '#F59E0B15' }]}>
              <AlertTriangle size={14} color="#F59E0B" />
              <Text style={[styles.loanWarningText, { color: '#F59E0B' }]}>
                Active loan: {formatCurrency(account.loans[0].remainingBalance)} remaining
              </Text>
            </View>
          )}

          <View style={styles.retirementFooter}>
            <View style={styles.retirementFeatures}>
              {account.isAutoEscalate && (
                <View style={[styles.featurePill, { backgroundColor: '#10B98115' }]}>
                  <TrendingUp size={12} color="#10B981" />
                  <Text style={[styles.featurePillText, { color: '#10B981' }]}>Auto-Escalate</Text>
                </View>
              )}
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderAlertItem = (alert: BenefitsAlert) => {
    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return '#EF4444';
        case 'medium': return '#F59E0B';
        default: return '#64748B';
      }
    };

    const getTypeIcon = (type: string) => {
      switch (type) {
        case 'enrollment': return Calendar;
        case 'cobra': return Shield;
        case '401k': return PiggyBank;
        case 'compliance': return FileWarning;
        case 'deadline': return Clock;
        case 'payment': return DollarSign;
        default: return AlertCircle;
      }
    };

    const Icon = getTypeIcon(alert.type);
    const priorityColor = getPriorityColor(alert.priority);

    return (
      <View
        key={alert.id}
        style={[
          styles.alertCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: priorityColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        <View style={styles.alertHeader}>
          <View style={[styles.alertIconContainer, { backgroundColor: `${priorityColor}15` }]}>
            <Icon size={18} color={priorityColor} />
          </View>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: colors.text }]} numberOfLines={1}>
              {alert.title}
            </Text>
            <Text style={[styles.alertMessage, { color: colors.textSecondary }]} numberOfLines={2}>
              {alert.message}
            </Text>
          </View>
          {!alert.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>
        <View style={styles.alertFooter}>
          <Text style={[styles.alertDate, { color: colors.textSecondary }]}>
            {formatDate(alert.date)}
          </Text>
          {alert.actionRequired && (
            <View style={[styles.actionRequiredBadge, { backgroundColor: '#EF444415' }]}>
              <Text style={[styles.actionRequiredText, { color: '#EF4444' }]}>Action Required</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderAlertsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.alertsHeader}>
        <Text style={[styles.alertsCount, { color: colors.textSecondary }]}>
          {unreadAlerts} unread alert{unreadAlerts !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity>
          <Text style={[styles.markAllRead, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {BENEFITS_ALERTS.map(alert => renderAlertItem(alert))}
    </View>
  );

  const renderEnrollmentDetailModal = () => (
    <Modal
      visible={!!selectedEnrollment}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedEnrollment(null)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setSelectedEnrollment(null)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Enrollment Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedEnrollment && (
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalCardTitle, { color: colors.text }]}>
                {selectedEnrollment.employeeName}
              </Text>
              <Text style={[styles.modalCardSubtitle, { color: colors.textSecondary }]}>
                {selectedEnrollment.department}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedEnrollment.status)}20`, alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedEnrollment.status) }]}>
                  {selectedEnrollment.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Enrollment Info</Text>
              <View style={styles.modalInfoRow}>
                <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Enrollment Date</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>
                  {formatDate(selectedEnrollment.enrollmentDate)}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Effective Date</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>
                  {formatDate(selectedEnrollment.effectiveDate)}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Monthly Deduction</Text>
                <Text style={[styles.modalInfoValue, { color: colors.primary }]}>
                  {formatCurrency(selectedEnrollment.totalMonthlyDeduction)}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={[styles.modalInfoLabel, { color: colors.textSecondary }]}>Annual Election</Text>
                <Text style={[styles.modalInfoValue, { color: colors.text }]}>
                  {formatCurrency(selectedEnrollment.annualElection)}
                </Text>
              </View>
            </View>

            {selectedEnrollment.plans.length > 0 && (
              <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Enrolled Plans</Text>
                {selectedEnrollment.plans.map((plan, index) => {
                  const Icon = getPlanTypeIcon(plan.planType);
                  const color = getPlanTypeColor(plan.planType);
                  return (
                    <View key={index} style={[styles.enrolledPlanItem, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }]}>
                      <View style={styles.enrolledPlanHeader}>
                        <View style={[styles.enrolledPlanIcon, { backgroundColor: `${color}15` }]}>
                          <Icon size={18} color={color} />
                        </View>
                        <View style={styles.enrolledPlanInfo}>
                          <Text style={[styles.enrolledPlanName, { color: colors.text }]}>{plan.planName}</Text>
                          <Text style={[styles.enrolledPlanTier, { color: colors.textSecondary }]}>
                            {plan.tier.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                        </View>
                        <Text style={[styles.enrolledPlanCost, { color: colors.primary }]}>
                          {formatCurrency(plan.employeeCost)}/mo
                        </Text>
                      </View>
                      {plan.dependents.length > 0 && (
                        <View style={styles.enrolledPlanDependents}>
                          <Users size={14} color={colors.textSecondary} />
                          <Text style={[styles.enrolledPlanDependentsText, { color: colors.textSecondary }]}>
                            {plan.dependents.join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {selectedEnrollment.lifeEvents.length > 0 && (
              <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Life Events</Text>
                {selectedEnrollment.lifeEvents.map((event, index) => (
                  <View key={index} style={styles.lifeEventItem}>
                    <View style={[styles.lifeEventDot, { backgroundColor: colors.primary }]} />
                    <View style={styles.lifeEventContent}>
                      <Text style={[styles.lifeEventType, { color: colors.text }]}>{event.type}</Text>
                      <Text style={[styles.lifeEventDescription, { color: colors.textSecondary }]}>
                        {event.description}
                      </Text>
                      <Text style={[styles.lifeEventDate, { color: colors.textSecondary }]}>
                        {formatDate(event.date)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'enrollment': return renderEnrollmentTab();
      case 'plans': return renderPlansTab();
      case 'cobra': return renderCobraTab();
      case '401k': return render401kTab();
      case 'alerts': return renderAlertsTab();
      default: return renderOverviewTab();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={18} color={isActive ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                {tab.label}
              </Text>
              {tab.key === 'alerts' && unreadAlerts > 0 && (
                <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.badgeText}>{unreadAlerts}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {renderContent()}
      </ScrollView>

      {renderEnrollmentDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    borderBottomWidth: 1,
    maxHeight: 50,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  tabContent: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  summaryStatLabel: {
    fontSize: 12,
  },
  summaryStatDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  oeCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  oeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  oeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  oeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  oeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  oeDetails: {
    gap: 8,
    marginBottom: 14,
  },
  oeDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  oeDetailText: {
    fontSize: 13,
  },
  oeProgress: {
    gap: 6,
  },
  oeProgressBar: {
    height: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  oeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  oeProgressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 4,
  },
  distributionCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: 8,
  },
  distributionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distributionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  distributionBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distributionBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  distributionPercent: {
    fontSize: 12,
    width: 35,
    textAlign: 'right',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
  },
  enrollmentStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  enrollmentStatCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  enrollmentStatValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  enrollmentStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  enrollmentCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  enrollmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  enrollmentInfo: {},
  enrollmentName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  enrollmentDept: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  enrollmentPlans: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  planBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planBadgeMore: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  enrollmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  enrollmentCost: {},
  enrollmentCostLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  enrollmentCostValue: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  planTypeFilters: {
    paddingBottom: 16,
    gap: 8,
  },
  planTypeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  planTypeFilterText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planHeaderText: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  planCarrier: {
    fontSize: 12,
  },
  networkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  planCoverage: {
    fontSize: 13,
    marginBottom: 14,
    fontStyle: 'italic' as const,
  },
  planCostRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  planCostItem: {
    flex: 1,
  },
  planCostLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  planCostValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  planFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  featureText: {
    fontSize: 11,
  },
  cobraStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  cobraStatCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  cobraStatValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  cobraStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  cobraCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cobraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cobraInfo: {},
  cobraName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  cobraEvent: {
    fontSize: 13,
  },
  cobraDetails: {
    gap: 6,
    marginBottom: 10,
  },
  cobraDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cobraDetailText: {
    fontSize: 13,
  },
  cobraPlans: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  cobraPlanBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  cobraPlanText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  cobraFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cobraDependents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cobraDependentsText: {
    fontSize: 13,
  },
  retirementSummary: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  retirementSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  retirementSummaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  retirementSummaryText: {
    flex: 1,
  },
  retirementSummaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  retirementSummarySubtitle: {
    fontSize: 14,
  },
  retirementSummaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retirementSummaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  retirementSummaryStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  retirementSummaryStatLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  retirementSummaryStatDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 10,
  },
  retirementCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  retirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  retirementInfo: {},
  retirementName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  retirementDept: {
    fontSize: 13,
  },
  retirementBalance: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  retirementDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  retirementDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retirementDetailText: {
    fontSize: 13,
  },
  retirementContributions: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 20,
  },
  retirementContributionItem: {},
  retirementContributionLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  retirementContributionValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  loanWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  loanWarningText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  retirementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  retirementFeatures: {
    flexDirection: 'row',
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertsCount: {
    fontSize: 14,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  alertCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  alertDate: {
    fontSize: 12,
  },
  actionRequiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionRequiredText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalCardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  modalCardSubtitle: {
    fontSize: 14,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalInfoLabel: {
    fontSize: 14,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  enrolledPlanItem: {},
  enrolledPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enrolledPlanIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  enrolledPlanInfo: {
    flex: 1,
  },
  enrolledPlanName: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  enrolledPlanTier: {
    fontSize: 12,
  },
  enrolledPlanCost: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  enrolledPlanDependents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingLeft: 52,
  },
  enrolledPlanDependentsText: {
    fontSize: 12,
  },
  lifeEventItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  lifeEventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  lifeEventContent: {
    flex: 1,
  },
  lifeEventType: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  lifeEventDescription: {
    fontSize: 13,
    marginBottom: 4,
  },
  lifeEventDate: {
    fontSize: 12,
  },
});
