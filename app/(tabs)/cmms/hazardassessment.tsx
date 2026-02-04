import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useHazardAssessmentsQuery } from '@/hooks/useCMMSSafetyCompliance';
import { 
  HazardAssessment, 
  HazardStatus, 
  HazardSeverity, 
  HazardItem,
  HAZARD_STATUSES, 
  HAZARD_SEVERITIES,
  PERMIT_TYPES,
  CONTROL_MEASURE_TYPES,
} from '@/types/cmms';
import {
  Search,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Filter,
  ArrowUpDown,
  Check,
  FileText,
  MapPin,
  User,
  Wrench,
  Calendar,
  Users,
  Building,
  Target,
  AlertCircle,
  XCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<HazardStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  identified: { label: 'Identified', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: AlertTriangle },
  assessed: { label: 'Assessed', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)', icon: FileText },
  mitigated: { label: 'Mitigated', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)', icon: Shield },
  accepted: { label: 'Accepted', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.15)', icon: CheckCircle2 },
  closed: { label: 'Closed', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)', icon: XCircle },
};

const SEVERITY_CONFIG: Record<HazardSeverity, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  medium: { label: 'Medium', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  high: { label: 'High', color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.15)' },
  critical: { label: 'Critical', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
};

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  jha: 'Job Hazard Analysis',
  risk_assessment: 'Risk Assessment',
  pre_task: 'Pre-Task Assessment',
  routine: 'Routine Assessment',
  change_management: 'Change Management',
};

type StatusFilter = 'all' | HazardStatus;
type RiskFilter = 'all' | HazardSeverity;
type SortField = 'name' | 'assessed_at' | 'risk_level' | 'status';
type SortDirection = 'asc' | 'desc';

export default function HazardAssessmentScreen() {
  const { colors } = useTheme();
  const orgContext = useOrganization();
  const facilityId = orgContext?.facilityId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sortField, setSortField] = useState<SortField>('assessed_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRiskFilterModal, setShowRiskFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<HazardAssessment | null>(null);
  const [expandedHazards, setExpandedHazards] = useState<Set<string>>(new Set());

  const { data: assessments = [], isLoading, refetch } = useHazardAssessmentsQuery({
    facilityId: facilityId || undefined,
  });

  const filteredAssessments = useMemo(() => {
    let filtered = [...assessments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (riskFilter !== 'all') {
      filtered = filtered.filter(a => a.overallRiskLevel === riskFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.assessmentNumber.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query) ||
        a.taskDescription.toLowerCase().includes(query) ||
        a.assessedByName.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'assessed_at':
          comparison = new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime();
          break;
        case 'risk_level':
          const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
          comparison = riskOrder[a.overallRiskLevel] - riskOrder[b.overallRiskLevel];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [assessments, statusFilter, riskFilter, searchQuery, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const total = assessments.length;
    const highRisk = assessments.filter(a => a.overallRiskLevel === 'high' || a.overallRiskLevel === 'critical').length;
    const pending = assessments.filter(a => a.status === 'identified' || a.status === 'assessed').length;
    const mitigated = assessments.filter(a => a.status === 'mitigated' || a.status === 'accepted').length;

    return { total, highRisk, pending, mitigated };
  }, [assessments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAssessmentPress = useCallback((assessment: HazardAssessment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAssessment(assessment);
    setExpandedHazards(new Set());
    setShowDetailModal(true);
  }, []);

  const handleStatusFilterSelect = useCallback((status: StatusFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(status);
    setShowFilterModal(false);
  }, []);

  const handleRiskFilterSelect = useCallback((risk: RiskFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRiskFilter(risk);
    setShowRiskFilterModal(false);
  }, []);

  const handleSortSelect = useCallback((field: SortField) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setShowSortModal(false);
  }, [sortField]);

  const toggleHazardExpanded = useCallback((hazardId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedHazards(prev => {
      const next = new Set(prev);
      if (next.has(hazardId)) {
        next.delete(hazardId);
      } else {
        next.add(hazardId);
      }
      return next;
    });
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderAssessmentCard = (assessment: HazardAssessment) => {
    const statusConfig = STATUS_CONFIG[assessment.status];
    const StatusIcon = statusConfig.icon;
    const riskConfig = SEVERITY_CONFIG[assessment.overallRiskLevel];

    return (
      <TouchableOpacity
        key={assessment.id}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleAssessmentPress(assessment)}
        activeOpacity={0.7}
        testID={`assessment-card-${assessment.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.riskIndicator, { backgroundColor: riskConfig.bgColor }]}>
              <AlertTriangle size={18} color={riskConfig.color} />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.assessmentNumber, { color: colors.primary }]}>
                {assessment.assessmentNumber}
              </Text>
              <Text style={[styles.assessmentName, { color: colors.text }]} numberOfLines={1}>
                {assessment.name}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {assessment.location}{assessment.area ? ` - ${assessment.area}` : ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <User size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {assessment.assessedByName} • {formatDate(assessment.assessedAt)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={[styles.typeBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.typeText, { color: colors.text }]}>
                {ASSESSMENT_TYPE_LABELS[assessment.assessmentType] || assessment.assessmentTypeName}
              </Text>
            </View>
          </View>
          <View style={styles.footerRight}>
            <View style={styles.hazardCount}>
              <AlertCircle size={12} color={colors.textSecondary} />
              <Text style={[styles.hazardCountText, { color: colors.textSecondary }]}>
                {assessment.hazards.length}
              </Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: riskConfig.bgColor }]}>
              <Text style={[styles.riskText, { color: riskConfig.color }]}>
                {riskConfig.label}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <StatusIcon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHazardItem = (hazard: HazardItem, index: number) => {
    const isExpanded = expandedHazards.has(hazard.id);
    const riskBeforeConfig = SEVERITY_CONFIG[hazard.riskLevelBefore];
    const riskAfterConfig = SEVERITY_CONFIG[hazard.riskLevelAfter];

    return (
      <View key={hazard.id || index} style={[styles.hazardItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.hazardHeader}
          onPress={() => toggleHazardExpanded(hazard.id)}
        >
          <View style={styles.hazardHeaderLeft}>
            <View style={[styles.hazardNumber, { backgroundColor: riskBeforeConfig.bgColor }]}>
              <Text style={[styles.hazardNumberText, { color: riskBeforeConfig.color }]}>
                {hazard.order}
              </Text>
            </View>
            <View style={styles.hazardInfo}>
              <Text style={[styles.hazardTask, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                {hazard.taskStep}
              </Text>
              <Text style={[styles.hazardDescription, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                {hazard.hazardDescription}
              </Text>
            </View>
          </View>
          {isExpanded ? (
            <ChevronUp size={20} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.hazardDetails}>
            <View style={[styles.riskComparison, { backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.riskColumn}>
                <Text style={[styles.riskColumnLabel, { color: colors.textSecondary }]}>Before</Text>
                <View style={[styles.riskScoreBox, { backgroundColor: riskBeforeConfig.bgColor }]}>
                  <Text style={[styles.riskScoreValue, { color: riskBeforeConfig.color }]}>
                    {hazard.riskScoreBefore}
                  </Text>
                  <Text style={[styles.riskScoreLabel, { color: riskBeforeConfig.color }]}>
                    {riskBeforeConfig.label}
                  </Text>
                </View>
                <Text style={[styles.riskFactors, { color: colors.textSecondary }]}>
                  L:{hazard.likelihoodBefore} × S:{hazard.severityBefore}
                </Text>
              </View>
              <View style={styles.riskArrow}>
                <TrendingDown size={24} color="#10B981" />
              </View>
              <View style={styles.riskColumn}>
                <Text style={[styles.riskColumnLabel, { color: colors.textSecondary }]}>After</Text>
                <View style={[styles.riskScoreBox, { backgroundColor: riskAfterConfig.bgColor }]}>
                  <Text style={[styles.riskScoreValue, { color: riskAfterConfig.color }]}>
                    {hazard.riskScoreAfter}
                  </Text>
                  <Text style={[styles.riskScoreLabel, { color: riskAfterConfig.color }]}>
                    {riskAfterConfig.label}
                  </Text>
                </View>
                <Text style={[styles.riskFactors, { color: colors.textSecondary }]}>
                  L:{hazard.likelihoodAfter} × S:{hazard.severityAfter}
                </Text>
              </View>
            </View>

            <Text style={[styles.consequenceLabel, { color: colors.textSecondary }]}>Potential Consequence</Text>
            <Text style={[styles.consequenceText, { color: colors.text }]}>{hazard.potentialConsequence}</Text>

            {hazard.controlMeasures.length > 0 && (
              <>
                <Text style={[styles.controlsLabel, { color: colors.textSecondary }]}>
                  Control Measures ({hazard.controlMeasures.length})
                </Text>
                {hazard.controlMeasures.map((control, idx) => (
                  <View key={control.id || idx} style={[styles.controlItem, { backgroundColor: control.isImplemented ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                    <View style={styles.controlHeader}>
                      <View style={[styles.controlTypeBadge, { backgroundColor: colors.backgroundSecondary }]}>
                        <Text style={[styles.controlTypeText, { color: colors.primary }]}>
                          {CONTROL_MEASURE_TYPES[control.type as keyof typeof CONTROL_MEASURE_TYPES] || control.typeName}
                        </Text>
                      </View>
                      {control.isImplemented ? (
                        <CheckCircle2 size={16} color="#10B981" />
                      ) : (
                        <Clock size={16} color="#F59E0B" />
                      )}
                    </View>
                    <Text style={[styles.controlDescription, { color: colors.text }]}>{control.description}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDetailModal = () => {
    if (!selectedAssessment) return null;

    const statusConfig = STATUS_CONFIG[selectedAssessment.status];
    const StatusIcon = statusConfig.icon;
    const riskConfig = SEVERITY_CONFIG[selectedAssessment.overallRiskLevel];
    const residualRiskConfig = selectedAssessment.residualRiskLevel 
      ? SEVERITY_CONFIG[selectedAssessment.residualRiskLevel] 
      : null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Hazard Assessment</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeaderTop}>
                <View style={[styles.riskIndicatorLarge, { backgroundColor: riskConfig.bgColor }]}>
                  <AlertTriangle size={28} color={riskConfig.color} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailNumber, { color: colors.primary }]}>
                    {selectedAssessment.assessmentNumber}
                  </Text>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {selectedAssessment.name}
                  </Text>
                  <Text style={[styles.detailType, { color: colors.textSecondary }]}>
                    {ASSESSMENT_TYPE_LABELS[selectedAssessment.assessmentType] || selectedAssessment.assessmentTypeName}
                  </Text>
                </View>
              </View>
              <View style={styles.detailHeaderBadges}>
                <View style={[styles.riskBadgeLarge, { backgroundColor: riskConfig.bgColor }]}>
                  <Text style={[styles.riskTextLarge, { color: riskConfig.color }]}>
                    {riskConfig.label} Risk
                  </Text>
                </View>
                <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
                  <StatusIcon size={16} color={statusConfig.color} />
                  <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>
            </View>

            {residualRiskConfig && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Risk Reduction</Text>
                <View style={[styles.riskReductionBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.riskReductionItem}>
                    <Text style={[styles.riskReductionLabel, { color: colors.textSecondary }]}>Initial</Text>
                    <View style={[styles.riskReductionBadge, { backgroundColor: riskConfig.bgColor }]}>
                      <Text style={[styles.riskReductionValue, { color: riskConfig.color }]}>{riskConfig.label}</Text>
                    </View>
                  </View>
                  <TrendingDown size={20} color="#10B981" />
                  <View style={styles.riskReductionItem}>
                    <Text style={[styles.riskReductionLabel, { color: colors.textSecondary }]}>Residual</Text>
                    <View style={[styles.riskReductionBadge, { backgroundColor: residualRiskConfig.bgColor }]}>
                      <Text style={[styles.riskReductionValue, { color: residualRiskConfig.color }]}>{residualRiskConfig.label}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.facilityName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.location}</Text>
              </View>
              {selectedAssessment.area && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Area</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.area}</Text>
                </View>
              )}
              {selectedAssessment.equipmentName && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Equipment</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.equipmentName}</Text>
                </View>
              )}
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {selectedAssessment.taskDescription}
              </Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Identified Hazards ({selectedAssessment.hazards.length})
              </Text>
              {selectedAssessment.hazards.map((hazard, index) => renderHazardItem(hazard, index))}
            </View>

            {selectedAssessment.requiredPPE.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Required PPE ({selectedAssessment.requiredPPE.length})
                </Text>
                <View style={styles.tagsContainer}>
                  {selectedAssessment.requiredPPE.map((ppe, index) => (
                    <View key={index} style={[styles.tagBadge, { backgroundColor: colors.backgroundSecondary }]}>
                      <Shield size={12} color={colors.primary} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{ppe}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedAssessment.requiredPermits.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Required Permits ({selectedAssessment.requiredPermits.length})
                </Text>
                <View style={styles.tagsContainer}>
                  {selectedAssessment.requiredPermits.map((permit, index) => (
                    <View key={index} style={[styles.tagBadge, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                      <FileText size={12} color="#3B82F6" />
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        {PERMIT_TYPES[permit] || permit}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedAssessment.requiredTraining.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Required Training ({selectedAssessment.requiredTraining.length})
                </Text>
                <View style={styles.tagsContainer}>
                  {selectedAssessment.requiredTraining.map((training, index) => (
                    <View key={index} style={[styles.tagBadge, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                      <Target size={12} color="#8B5CF6" />
                      <Text style={[styles.tagText, { color: colors.text }]}>{training}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedAssessment.participants.length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Participants ({selectedAssessment.participants.length})
                </Text>
                {selectedAssessment.participants.map((participant, index) => (
                  <View key={participant.id || index} style={[styles.participantItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.participantAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.participantInitials}>
                        {participant.employeeName.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={[styles.participantName, { color: colors.text }]}>{participant.employeeName}</Text>
                      <Text style={[styles.participantRole, { color: colors.textSecondary }]}>
                        {participant.role.charAt(0).toUpperCase() + participant.role.slice(1)} • {participant.employeeNumber}
                      </Text>
                    </View>
                    {participant.acknowledgedAt && (
                      <View style={[styles.acknowledgedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <CheckCircle2 size={12} color="#10B981" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Assessment Details</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assessed By</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.assessedByName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assessed At</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedAssessment.assessedAt)}</Text>
              </View>
              {selectedAssessment.reviewedByName && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reviewed By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.reviewedByName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reviewed At</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedAssessment.reviewedAt!)}</Text>
                  </View>
                </>
              )}
              {selectedAssessment.approvedByName && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.approvedByName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved At</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedAssessment.approvedAt!)}</Text>
                  </View>
                </>
              )}
              {selectedAssessment.validUntil && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Valid Until</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(selectedAssessment.validUntil)}</Text>
                </View>
              )}
            </View>

            {selectedAssessment.notes && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                  {selectedAssessment.notes}
                </Text>
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Status</Text>
          <TouchableOpacity
            onPress={() => setShowFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleStatusFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Statuses</Text>
            {statusFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(HAZARD_STATUSES).map(([key, label]) => {
            const config = STATUS_CONFIG[key as HazardStatus];
            const Icon = config.icon;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleStatusFilterSelect(key as HazardStatus)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.filterIcon, { backgroundColor: config.bgColor }]}>
                    <Icon size={16} color={config.color} />
                  </View>
                  <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
                </View>
                {statusFilter === key && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderRiskFilterModal = () => (
    <Modal
      visible={showRiskFilterModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowRiskFilterModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Filter by Risk Level</Text>
          <TouchableOpacity
            onPress={() => setShowRiskFilterModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={[styles.filterOption, { borderBottomColor: colors.border }]}
            onPress={() => handleRiskFilterSelect('all')}
          >
            <Text style={[styles.filterText, { color: colors.text }]}>All Risk Levels</Text>
            {riskFilter === 'all' && <Check size={20} color={colors.primary} />}
          </TouchableOpacity>

          {Object.entries(HAZARD_SEVERITIES).map(([key, label]) => {
            const config = SEVERITY_CONFIG[key as HazardSeverity];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.filterOption, { borderBottomColor: colors.border }]}
                onPress={() => handleRiskFilterSelect(key as HazardSeverity)}
              >
                <View style={styles.filterOptionContent}>
                  <View style={[styles.filterIcon, { backgroundColor: config.bgColor }]}>
                    <AlertTriangle size={16} color={config.color} />
                  </View>
                  <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
                </View>
                {riskFilter === key && <Check size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Sort By</Text>
          <TouchableOpacity
            onPress={() => setShowSortModal(false)}
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {[
            { field: 'name' as SortField, label: 'Name' },
            { field: 'assessed_at' as SortField, label: 'Assessment Date' },
            { field: 'risk_level' as SortField, label: 'Risk Level' },
            { field: 'status' as SortField, label: 'Status' },
          ].map(({ field, label }) => (
            <TouchableOpacity
              key={field}
              style={[styles.filterOption, { borderBottomColor: colors.border }]}
              onPress={() => handleSortSelect(field)}
            >
              <Text style={[styles.filterText, { color: colors.text }]}>{label}</Text>
              {sortField === field && (
                <View style={styles.sortIndicator}>
                  <Text style={[styles.sortDirectionText, { color: colors.primary }]}>
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Text>
                  <Check size={20} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Hazard Assessment',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{statistics.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{statistics.highRisk}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>High Risk</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{statistics.mitigated}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mitigated</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search assessments..."
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

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={16} color={statusFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: statusFilter !== 'all' ? colors.primary : colors.textSecondary }]}>
              {statusFilter !== 'all' ? STATUS_CONFIG[statusFilter].label : 'Status'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowRiskFilterModal(true)}
          >
            <AlertTriangle size={16} color={riskFilter !== 'all' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.filterButtonText, { color: riskFilter !== 'all' ? colors.primary : colors.textSecondary }]}>
              {riskFilter !== 'all' ? SEVERITY_CONFIG[riskFilter].label : 'Risk'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowSortModal(true)}
          >
            <ArrowUpDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading assessments...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredAssessments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AlertTriangle size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assessments Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || statusFilter !== 'all' || riskFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Hazard assessments will appear here'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''}
              </Text>
              {filteredAssessments.map(renderAssessmentCard)}
            </>
          )}
        </ScrollView>
      )}

      {renderDetailModal()}
      {renderFilterModal()}
      {renderRiskFilterModal()}
      {renderSortModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  resultsText: {
    fontSize: 13,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riskIndicator: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  assessmentNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  assessmentName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  hazardCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hazardCountText: {
    fontSize: 12,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 16,
  },
  sortIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortDirectionText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  detailHeader: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  riskIndicatorLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderInfo: {
    marginLeft: 14,
    flex: 1,
  },
  detailNumber: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  detailType: {
    fontSize: 13,
    marginTop: 4,
  },
  detailHeaderBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  riskBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  riskTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  riskReductionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 10,
  },
  riskReductionItem: {
    alignItems: 'center',
    gap: 6,
  },
  riskReductionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskReductionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  riskReductionValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'right',
  },
  hazardItem: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  hazardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  hazardNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hazardNumberText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  hazardInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  hazardTask: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  hazardDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  hazardDetails: {
    marginTop: 12,
    marginLeft: 38,
  },
  riskComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  riskColumn: {
    alignItems: 'center',
    gap: 4,
  },
  riskColumnLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskScoreBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  riskScoreValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  riskScoreLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  riskFactors: {
    fontSize: 10,
    marginTop: 4,
  },
  riskArrow: {
    paddingHorizontal: 8,
  },
  consequenceLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  consequenceText: {
    fontSize: 13,
    marginBottom: 12,
  },
  controlsLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  controlItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  controlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  controlTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  controlTypeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  controlDescription: {
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  participantInfo: {
    marginLeft: 12,
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  participantRole: {
    fontSize: 12,
    marginTop: 2,
  },
  acknowledgedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
