import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  ShieldAlert,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Calendar,
  Target,
  Eye,
  Lock,
  Users,
  Truck,
  Package,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type VulnerabilityLevel = 'low' | 'medium' | 'high' | 'critical';
type AssessmentStatus = 'current' | 'due_for_review' | 'overdue' | 'draft';
type MitigationStatus = 'implemented' | 'in_progress' | 'planned' | 'not_started';

interface ActionableProcessStep {
  id: string;
  stepName: string;
  stepDescription: string;
  vulnerabilityScore: number;
  accessibilityScore: number;
  publicHealthImpact: number;
  overallScore: number;
  vulnerabilityLevel: VulnerabilityLevel;
  significantVulnerability: boolean;
  mitigationStrategy?: string;
  mitigationStatus: MitigationStatus;
  monitoringProcedure?: string;
  correctiveAction?: string;
  verificationActivity?: string;
}

interface IAAssessment {
  id: string;
  assessmentName: string;
  facilityName: string;
  productCategory: string;
  assessmentDate: string;
  nextReviewDate: string;
  status: AssessmentStatus;
  conductedBy: string;
  approvedBy?: string;
  processSteps: ActionableProcessStep[];
  totalSteps: number;
  significantVulnerabilities: number;
  mitigatedCount: number;
  createdAt: string;
  updatedAt: string;
}

const ASSESSMENT_STATUS_CONFIG: Record<AssessmentStatus, { label: string; color: string }> = {
  current: { label: 'Current', color: '#10B981' },
  due_for_review: { label: 'Review Due', color: '#F59E0B' },
  overdue: { label: 'Overdue', color: '#EF4444' },
  draft: { label: 'Draft', color: '#6B7280' },
};

const VULNERABILITY_CONFIG: Record<VulnerabilityLevel, { label: string; color: string }> = {
  low: { label: 'Low', color: '#10B981' },
  medium: { label: 'Medium', color: '#F59E0B' },
  high: { label: 'High', color: '#EF4444' },
  critical: { label: 'Critical', color: '#DC2626' },
};

const MITIGATION_CONFIG: Record<MitigationStatus, { label: string; color: string }> = {
  implemented: { label: 'Implemented', color: '#10B981' },
  in_progress: { label: 'In Progress', color: '#F59E0B' },
  planned: { label: 'Planned', color: '#3B82F6' },
  not_started: { label: 'Not Started', color: '#6B7280' },
};

const MOCK_ASSESSMENT: IAAssessment = {
  id: '1',
  assessmentName: 'Annual IA Vulnerability Assessment 2025',
  facilityName: 'Main Production Facility',
  productCategory: 'Ready-to-Eat Salads',
  assessmentDate: '2025-06-15',
  nextReviewDate: '2026-06-15',
  status: 'current',
  conductedBy: 'Sarah Johnson, QA Manager',
  approvedBy: 'Michael Chen, Plant Manager',
  processSteps: [
    {
      id: 'ps1',
      stepName: 'Bulk Liquid Receiving',
      stepDescription: 'Receipt of bulk liquid ingredients (oils, dressings) via tanker trucks',
      vulnerabilityScore: 8,
      accessibilityScore: 7,
      publicHealthImpact: 9,
      overallScore: 504,
      vulnerabilityLevel: 'critical',
      significantVulnerability: true,
      mitigationStrategy: 'Implement tamper-evident seals, driver verification, and tanker inspection protocol',
      mitigationStatus: 'implemented',
      monitoringProcedure: 'Visual inspection of seals, verification of driver credentials, tanker condition check',
      correctiveAction: 'Reject delivery if seals are broken or driver cannot be verified. Notify security.',
      verificationActivity: 'Weekly review of receiving logs, monthly security audit',
    },
    {
      id: 'ps2',
      stepName: 'Secondary Ingredient Storage',
      stepDescription: 'Storage of secondary ingredients in warehouse area',
      vulnerabilityScore: 6,
      accessibilityScore: 5,
      publicHealthImpact: 7,
      overallScore: 210,
      vulnerabilityLevel: 'medium',
      significantVulnerability: false,
      mitigationStrategy: 'Access control, CCTV monitoring, inventory management',
      mitigationStatus: 'implemented',
      monitoringProcedure: 'Daily inventory reconciliation, CCTV review',
    },
    {
      id: 'ps3',
      stepName: 'Mixing/Blending Tank',
      stepDescription: 'Large-scale mixing of ingredients in open blending tanks',
      vulnerabilityScore: 9,
      accessibilityScore: 6,
      publicHealthImpact: 9,
      overallScore: 486,
      vulnerabilityLevel: 'high',
      significantVulnerability: true,
      mitigationStrategy: 'Tank covers, access restriction, buddy system during production',
      mitigationStatus: 'implemented',
      monitoringProcedure: 'Supervisor observation, access log review, tank seal verification',
      correctiveAction: 'Stop production if unauthorized access detected. Quarantine affected product.',
      verificationActivity: 'Daily supervisor sign-off, weekly access log audit',
    },
    {
      id: 'ps4',
      stepName: 'Packaging Line',
      stepDescription: 'Automated packaging of finished products',
      vulnerabilityScore: 4,
      accessibilityScore: 3,
      publicHealthImpact: 8,
      overallScore: 96,
      vulnerabilityLevel: 'low',
      significantVulnerability: false,
      mitigationStatus: 'not_started',
    },
  ],
  totalSteps: 4,
  significantVulnerabilities: 2,
  mitigatedCount: 2,
  createdAt: '2025-06-15',
  updatedAt: '2025-12-01',
};

export default function IAAssessmentScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [assessments, setAssessments] = useState<IAAssessment[]>([MOCK_ASSESSMENT]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<IAAssessment | null>(null);
  const [selectedStep, setSelectedStep] = useState<ActionableProcessStep | null>(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'methodology'>('overview');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = useMemo(() => {
    const allSteps = assessments.flatMap(a => a.processSteps);
    return {
      totalAssessments: assessments.length,
      totalSteps: allSteps.length,
      significantVuln: allSteps.filter(s => s.significantVulnerability).length,
      mitigated: allSteps.filter(s => s.mitigationStatus === 'implemented').length,
    };
  }, [assessments]);

  const openDetail = useCallback((assessment: IAAssessment) => {
    setSelectedAssessment(assessment);
    setActiveTab('overview');
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openStepDetail = useCallback((step: ActionableProcessStep) => {
    setSelectedStep(step);
    setShowStepModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getScoreColor = (score: number): string => {
    if (score >= 400) return '#DC2626';
    if (score >= 200) return '#EF4444';
    if (score >= 100) return '#F59E0B';
    return '#10B981';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#DC2626' + '20' }]}>
            <ShieldAlert size={28} color="#DC2626" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>IA Vulnerability Assessment</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FSMA Intentional Adulteration Rule compliance
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalAssessments}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Assessments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.totalSteps}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Steps</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.significantVuln}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Significant</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.mitigated}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mitigated</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: '#DC2626' + '15', borderColor: '#DC2626' }]}>
          <ShieldAlert size={20} color="#DC2626" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>FSMA IA Rule</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Requires covered facilities to identify vulnerabilities and implement mitigation strategies to protect against intentional adulteration.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Vulnerability Assessments</Text>

        {assessments.map(assessment => {
          const statusConfig = ASSESSMENT_STATUS_CONFIG[assessment.status];
          const progress = Math.round((assessment.mitigatedCount / assessment.significantVulnerabilities) * 100) || 0;

          return (
            <Pressable
              key={assessment.id}
              style={({ pressed }) => [
                styles.assessmentCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: statusConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(assessment)}
            >
              <View style={styles.assessmentHeader}>
                <View style={styles.assessmentInfo}>
                  <Text style={[styles.assessmentName, { color: colors.text }]}>{assessment.assessmentName}</Text>
                  <Text style={[styles.facilityName, { color: colors.textSecondary }]}>
                    {assessment.facilityName} • {assessment.productCategory}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>

              <View style={styles.vulnerabilityStats}>
                <View style={styles.vulnStatItem}>
                  <View style={[styles.vulnIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                    <Target size={16} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={[styles.vulnStatValue, { color: colors.text }]}>{assessment.totalSteps}</Text>
                    <Text style={[styles.vulnStatLabel, { color: colors.textSecondary }]}>Process Steps</Text>
                  </View>
                </View>
                <View style={styles.vulnStatItem}>
                  <View style={[styles.vulnIcon, { backgroundColor: '#DC2626' + '20' }]}>
                    <AlertTriangle size={16} color="#DC2626" />
                  </View>
                  <View>
                    <Text style={[styles.vulnStatValue, { color: colors.text }]}>{assessment.significantVulnerabilities}</Text>
                    <Text style={[styles.vulnStatLabel, { color: colors.textSecondary }]}>Significant</Text>
                  </View>
                </View>
                <View style={styles.vulnStatItem}>
                  <View style={[styles.vulnIcon, { backgroundColor: '#10B981' + '20' }]}>
                    <CheckCircle size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.vulnStatValue, { color: colors.text }]}>{assessment.mitigatedCount}</Text>
                    <Text style={[styles.vulnStatLabel, { color: colors.textSecondary }]}>Mitigated</Text>
                  </View>
                </View>
              </View>

              {assessment.significantVulnerabilities > 0 && (
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#10B981' }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress}% Mitigated</Text>
                </View>
              )}

              <View style={styles.assessmentFooter}>
                <View style={styles.dateInfo}>
                  <Calendar size={12} color={colors.textTertiary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Assessed: {assessment.assessmentDate}
                  </Text>
                </View>
                <View style={styles.dateInfo}>
                  <Clock size={12} color={colors.textTertiary} />
                  <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Review: {assessment.nextReviewDate}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {assessments.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ShieldAlert size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assessments</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No vulnerability assessments have been conducted
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Assessment Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedAssessment && (
            <>
              <View style={styles.tabBar}>
                {(['overview', 'steps', 'methodology'] as const).map(tab => (
                  <Pressable
                    key={tab}
                    style={[
                      styles.tab,
                      activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[
                      styles.tabText,
                      { color: activeTab === tab ? colors.primary : colors.textSecondary },
                    ]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ScrollView style={styles.modalContent}>
                {activeTab === 'overview' && (
                  <>
                    <View style={[styles.detailHeader, { backgroundColor: '#DC2626' + '15' }]}>
                      <View style={[styles.detailIcon, { backgroundColor: '#DC2626' + '30' }]}>
                        <ShieldAlert size={28} color="#DC2626" />
                      </View>
                      <Text style={[styles.detailName, { color: colors.text }]}>{selectedAssessment.assessmentName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: colors.surface, marginTop: 8 }]}>
                        <Text style={[styles.statusText, { color: ASSESSMENT_STATUS_CONFIG[selectedAssessment.status].color }]}>
                          {ASSESSMENT_STATUS_CONFIG[selectedAssessment.status].label}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Assessment Information</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.facilityName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product Category</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.productCategory}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assessment Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.assessmentDate}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next Review</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.nextReviewDate}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Conducted By</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.conductedBy}</Text>
                      </View>
                      {selectedAssessment.approvedBy && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approved By</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedAssessment.approvedBy}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Vulnerability Summary</Text>
                    <View style={styles.summaryCards}>
                      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Target size={20} color="#F59E0B" />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedAssessment.totalSteps}</Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Process Steps</Text>
                      </View>
                      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <AlertTriangle size={20} color="#DC2626" />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedAssessment.significantVulnerabilities}</Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Significant</Text>
                      </View>
                      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <CheckCircle size={20} color="#10B981" />
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedAssessment.mitigatedCount}</Text>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Mitigated</Text>
                      </View>
                    </View>
                  </>
                )}

                {activeTab === 'steps' && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                      Actionable Process Steps ({selectedAssessment.processSteps.length})
                    </Text>

                    {selectedAssessment.processSteps.map(step => {
                      const vulnConfig = VULNERABILITY_CONFIG[step.vulnerabilityLevel];
                      const mitigationConfig = MITIGATION_CONFIG[step.mitigationStatus];

                      return (
                        <Pressable
                          key={step.id}
                          style={({ pressed }) => [
                            styles.stepCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderLeftWidth: 3,
                              borderLeftColor: vulnConfig.color,
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                          onPress={() => openStepDetail(step)}
                        >
                          <View style={styles.stepHeader}>
                            <Text style={[styles.stepName, { color: colors.text }]}>{step.stepName}</Text>
                            <View style={styles.stepBadges}>
                              {step.significantVulnerability && (
                                <View style={[styles.sigBadge, { backgroundColor: '#DC2626' + '15' }]}>
                                  <AlertTriangle size={10} color="#DC2626" />
                                  <Text style={[styles.sigText, { color: '#DC2626' }]}>SV</Text>
                                </View>
                              )}
                              <View style={[styles.vulnBadge, { backgroundColor: vulnConfig.color + '15' }]}>
                                <Text style={[styles.vulnText, { color: vulnConfig.color }]}>{vulnConfig.label}</Text>
                              </View>
                            </View>
                          </View>

                          <Text style={[styles.stepDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                            {step.stepDescription}
                          </Text>

                          <View style={styles.stepScores}>
                            <View style={styles.scoreItem}>
                              <Eye size={12} color={colors.textTertiary} />
                              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>V: {step.vulnerabilityScore}</Text>
                            </View>
                            <View style={styles.scoreItem}>
                              <Lock size={12} color={colors.textTertiary} />
                              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>A: {step.accessibilityScore}</Text>
                            </View>
                            <View style={styles.scoreItem}>
                              <Users size={12} color={colors.textTertiary} />
                              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>PH: {step.publicHealthImpact}</Text>
                            </View>
                            <View style={[styles.totalScore, { backgroundColor: getScoreColor(step.overallScore) + '20' }]}>
                              <Text style={[styles.totalScoreText, { color: getScoreColor(step.overallScore) }]}>
                                Score: {step.overallScore}
                              </Text>
                            </View>
                          </View>

                          {step.significantVulnerability && (
                            <View style={styles.mitigationRow}>
                              <View style={[styles.mitigationBadge, { backgroundColor: mitigationConfig.color + '15' }]}>
                                {mitigationConfig.label === 'Implemented' && <CheckCircle size={12} color={mitigationConfig.color} />}
                                {mitigationConfig.label === 'In Progress' && <Clock size={12} color={mitigationConfig.color} />}
                                <Text style={[styles.mitigationText, { color: mitigationConfig.color }]}>{mitigationConfig.label}</Text>
                              </View>
                            </View>
                          )}

                          <ChevronRight size={16} color={colors.textTertiary} style={styles.stepChevron} />
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {activeTab === 'methodology' && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Three-Factor Assessment</Text>

                    <View style={[styles.methodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.methodHeader}>
                        <View style={[styles.methodIcon, { backgroundColor: '#3B82F6' + '20' }]}>
                          <Eye size={20} color="#3B82F6" />
                        </View>
                        <Text style={[styles.methodTitle, { color: colors.text }]}>Vulnerability (V)</Text>
                      </View>
                      <Text style={[styles.methodText, { color: colors.textSecondary }]}>
                        Degree to which internal attacks could be conducted at the process step, considering physical access, personnel, and process characteristics.
                      </Text>
                      <Text style={[styles.methodScale, { color: colors.primary }]}>Scale: 1-10</Text>
                    </View>

                    <View style={[styles.methodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.methodHeader}>
                        <View style={[styles.methodIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                          <Lock size={20} color="#F59E0B" />
                        </View>
                        <Text style={[styles.methodTitle, { color: colors.text }]}>Accessibility (A)</Text>
                      </View>
                      <Text style={[styles.methodText, { color: colors.textSecondary }]}>
                        Degree to which an attacker has access to the process step, including physical barriers, surveillance, and restricted areas.
                      </Text>
                      <Text style={[styles.methodScale, { color: colors.primary }]}>Scale: 1-10</Text>
                    </View>

                    <View style={[styles.methodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.methodHeader}>
                        <View style={[styles.methodIcon, { backgroundColor: '#DC2626' + '20' }]}>
                          <Users size={20} color="#DC2626" />
                        </View>
                        <Text style={[styles.methodTitle, { color: colors.text }]}>Public Health Impact (PH)</Text>
                      </View>
                      <Text style={[styles.methodText, { color: colors.textSecondary }]}>
                        Potential public health impact if a contaminant were added at this process step, based on volume, distribution, and detection opportunity.
                      </Text>
                      <Text style={[styles.methodScale, { color: colors.primary }]}>Scale: 1-10</Text>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Scoring Formula</Text>
                    <View style={[styles.formulaCard, { backgroundColor: '#6366F1' + '15', borderColor: '#6366F1' }]}>
                      <Zap size={20} color="#6366F1" />
                      <View style={styles.formulaContent}>
                        <Text style={[styles.formulaText, { color: colors.text }]}>Overall Score = V × A × PH</Text>
                        <Text style={[styles.formulaNote, { color: colors.textSecondary }]}>
                          Scores ≥ 200 typically indicate a significant vulnerability requiring mitigation strategies
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Score Interpretation</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.interpretRow}>
                        <View style={[styles.interpretDot, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.interpretText, { color: colors.text }]}>Low (0-99): Standard controls adequate</Text>
                      </View>
                      <View style={styles.interpretRow}>
                        <View style={[styles.interpretDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={[styles.interpretText, { color: colors.text }]}>Medium (100-199): Enhanced monitoring recommended</Text>
                      </View>
                      <View style={styles.interpretRow}>
                        <View style={[styles.interpretDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={[styles.interpretText, { color: colors.text }]}>High (200-399): Mitigation strategy required</Text>
                      </View>
                      <View style={styles.interpretRow}>
                        <View style={[styles.interpretDot, { backgroundColor: '#DC2626' }]} />
                        <Text style={[styles.interpretText, { color: colors.text }]}>Critical (400+): Immediate mitigation required</Text>
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.bottomPadding} />
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={showStepModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowStepModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Process Step Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedStep && (() => {
            const vulnConfig = VULNERABILITY_CONFIG[selectedStep.vulnerabilityLevel];
            const mitigationConfig = MITIGATION_CONFIG[selectedStep.mitigationStatus];

            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.stepDetailHeader, { backgroundColor: vulnConfig.color + '15' }]}>
                  <Text style={[styles.stepDetailName, { color: colors.text }]}>{selectedStep.stepName}</Text>
                  <View style={styles.stepDetailBadges}>
                    {selectedStep.significantVulnerability && (
                      <View style={[styles.sigBadge, { backgroundColor: colors.surface }]}>
                        <AlertTriangle size={12} color="#DC2626" />
                        <Text style={[styles.sigText, { color: '#DC2626' }]}>Significant Vulnerability</Text>
                      </View>
                    )}
                    <View style={[styles.vulnBadge, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.vulnText, { color: vulnConfig.color }]}>{vulnConfig.label} Risk</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Description</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.stepDescFull, { color: colors.text }]}>{selectedStep.stepDescription}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Vulnerability Scores</Text>
                <View style={styles.scoresGrid}>
                  <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Eye size={18} color="#3B82F6" />
                    <Text style={[styles.scoreCardValue, { color: colors.text }]}>{selectedStep.vulnerabilityScore}</Text>
                    <Text style={[styles.scoreCardLabel, { color: colors.textSecondary }]}>Vulnerability</Text>
                  </View>
                  <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Lock size={18} color="#F59E0B" />
                    <Text style={[styles.scoreCardValue, { color: colors.text }]}>{selectedStep.accessibilityScore}</Text>
                    <Text style={[styles.scoreCardLabel, { color: colors.textSecondary }]}>Accessibility</Text>
                  </View>
                  <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Users size={18} color="#DC2626" />
                    <Text style={[styles.scoreCardValue, { color: colors.text }]}>{selectedStep.publicHealthImpact}</Text>
                    <Text style={[styles.scoreCardLabel, { color: colors.textSecondary }]}>Public Health</Text>
                  </View>
                </View>

                <View style={[styles.totalScoreCard, { backgroundColor: getScoreColor(selectedStep.overallScore) + '15', borderColor: getScoreColor(selectedStep.overallScore) }]}>
                  <Text style={[styles.totalScoreLabel, { color: colors.textSecondary }]}>Overall Score</Text>
                  <Text style={[styles.totalScoreValue, { color: getScoreColor(selectedStep.overallScore) }]}>
                    {selectedStep.overallScore}
                  </Text>
                  <Text style={[styles.totalScoreFormula, { color: colors.textSecondary }]}>
                    {selectedStep.vulnerabilityScore} × {selectedStep.accessibilityScore} × {selectedStep.publicHealthImpact}
                  </Text>
                </View>

                {selectedStep.significantVulnerability && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Mitigation Strategy</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.mitigationBadge, { backgroundColor: mitigationConfig.color + '15', alignSelf: 'flex-start' as const, marginBottom: 10 }]}>
                        {mitigationConfig.label === 'Implemented' && <CheckCircle size={12} color={mitigationConfig.color} />}
                        {mitigationConfig.label === 'In Progress' && <Clock size={12} color={mitigationConfig.color} />}
                        <Text style={[styles.mitigationText, { color: mitigationConfig.color }]}>{mitigationConfig.label}</Text>
                      </View>
                      <Text style={[styles.mitigationStrategy, { color: colors.text }]}>
                        {selectedStep.mitigationStrategy || 'No mitigation strategy defined'}
                      </Text>
                    </View>

                    {selectedStep.monitoringProcedure && (
                      <>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Monitoring</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.procedureText, { color: colors.text }]}>{selectedStep.monitoringProcedure}</Text>
                        </View>
                      </>
                    )}

                    {selectedStep.correctiveAction && (
                      <>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Corrective Action</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.procedureText, { color: colors.text }]}>{selectedStep.correctiveAction}</Text>
                        </View>
                      </>
                    )}

                    {selectedStep.verificationActivity && (
                      <>
                        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Verification</Text>
                        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.procedureText, { color: colors.text }]}>{selectedStep.verificationActivity}</Text>
                        </View>
                      </>
                    )}
                  </>
                )}

                <View style={styles.bottomPadding} />
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2 },
  infoCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12 },
  assessmentCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  assessmentHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  assessmentInfo: { flex: 1 },
  assessmentName: { fontSize: 15, fontWeight: '600' as const },
  facilityName: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  vulnerabilityStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  vulnStatItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  vulnIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  vulnStatValue: { fontSize: 16, fontWeight: '700' as const },
  vulnStatLabel: { fontSize: 10 },
  progressContainer: { marginBottom: 10 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, marginTop: 4 },
  assessmentFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  dateInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dateText: { fontSize: 11 },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  detailHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  detailName: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500' as const, flex: 2, textAlign: 'right' as const },
  summaryCards: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  summaryValue: { fontSize: 24, fontWeight: '700' as const, marginTop: 8 },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  stepCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  stepHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  stepName: { fontSize: 14, fontWeight: '600' as const, flex: 1 },
  stepBadges: { flexDirection: 'row' as const, gap: 6 },
  sigBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  sigText: { fontSize: 9, fontWeight: '600' as const },
  vulnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  vulnText: { fontSize: 10, fontWeight: '500' as const },
  stepDescription: { fontSize: 12, marginBottom: 8 },
  stepScores: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 8,
  },
  scoreItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3 },
  scoreLabel: { fontSize: 11 },
  totalScore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto' as const,
  },
  totalScoreText: { fontSize: 11, fontWeight: '600' as const },
  mitigationRow: { marginTop: 4 },
  mitigationBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  mitigationText: { fontSize: 11, fontWeight: '500' as const },
  stepChevron: { position: 'absolute' as const, right: 12, top: 12 },
  methodCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  methodTitle: { fontSize: 15, fontWeight: '600' as const },
  methodText: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  methodScale: { fontSize: 12, fontWeight: '500' as const },
  formulaCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  formulaContent: { flex: 1 },
  formulaText: { fontSize: 16, fontWeight: '700' as const },
  formulaNote: { fontSize: 12, marginTop: 4 },
  interpretRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 8,
  },
  interpretDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  interpretText: { fontSize: 13 },
  stepDetailHeader: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stepDetailName: { fontSize: 18, fontWeight: '700' as const, marginBottom: 10 },
  stepDetailBadges: { flexDirection: 'row' as const, gap: 8 },
  stepDescFull: { fontSize: 14, lineHeight: 20 },
  scoresGrid: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  scoreCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  scoreCardValue: { fontSize: 24, fontWeight: '700' as const, marginTop: 6 },
  scoreCardLabel: { fontSize: 10, marginTop: 2 },
  totalScoreCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  totalScoreLabel: { fontSize: 12 },
  totalScoreValue: { fontSize: 36, fontWeight: '700' as const },
  totalScoreFormula: { fontSize: 12, marginTop: 4 },
  mitigationStrategy: { fontSize: 14, lineHeight: 20 },
  procedureText: { fontSize: 14, lineHeight: 20 },
});
