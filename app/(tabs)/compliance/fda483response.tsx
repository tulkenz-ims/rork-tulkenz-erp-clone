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
  FileWarning,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Calendar,
  FileText,
  User,
  Building2,
  ClipboardCheck,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type ObservationStatus = 'open' | 'in_progress' | 'corrected' | 'verified';
type ObservationSeverity = 'critical' | 'major' | 'minor';
type ResponseStatus = 'draft' | 'submitted' | 'accepted' | 'follow_up';

interface Observation {
  id: string;
  number: number;
  description: string;
  regulatoryReference: string;
  severity: ObservationSeverity;
  status: ObservationStatus;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction: string;
  responsiblePerson: string;
  targetDate: string;
  completionDate?: string;
  verificationMethod?: string;
  evidence?: string[];
}

interface FDA483Response {
  id: string;
  inspectionDate: string;
  inspectionEndDate: string;
  facilityName: string;
  facilityAddress: string;
  investigatorName: string;
  investigatorDistrict: string;
  responseStatus: ResponseStatus;
  responseDueDate: string;
  responseSubmittedDate?: string;
  observations: Observation[];
  totalObservations: number;
  correctedCount: number;
  inProgressCount: number;
  createdAt: string;
  updatedAt: string;
}

const RESPONSE_STATUS_CONFIG: Record<ResponseStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6B7280' },
  submitted: { label: 'Submitted', color: '#3B82F6' },
  accepted: { label: 'Accepted', color: '#10B981' },
  follow_up: { label: 'Follow-up Required', color: '#F59E0B' },
};

const OBSERVATION_STATUS_CONFIG: Record<ObservationStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#EF4444' },
  in_progress: { label: 'In Progress', color: '#F59E0B' },
  corrected: { label: 'Corrected', color: '#10B981' },
  verified: { label: 'Verified', color: '#6366F1' },
};

const SEVERITY_CONFIG: Record<ObservationSeverity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#DC2626' },
  major: { label: 'Major', color: '#F59E0B' },
  minor: { label: 'Minor', color: '#3B82F6' },
};

const MOCK_483: FDA483Response = {
  id: '1',
  inspectionDate: '2025-10-15',
  inspectionEndDate: '2025-10-18',
  facilityName: 'Main Production Facility',
  facilityAddress: '1234 Food Safety Boulevard, Chicago, IL 60601',
  investigatorName: 'John Smith',
  investigatorDistrict: 'Chicago District',
  responseStatus: 'submitted',
  responseDueDate: '2025-11-02',
  responseSubmittedDate: '2025-10-30',
  observations: [
    {
      id: 'o1',
      number: 1,
      description: 'The firm failed to establish and implement a food safety plan that provides for the management of food safety.',
      regulatoryReference: '21 CFR 117.126(a)(1)',
      severity: 'critical',
      status: 'corrected',
      rootCause: 'Food safety plan existed but was not fully implemented across all production lines',
      correctiveAction: 'Updated food safety plan to include all production lines. Trained all supervisors on plan requirements.',
      preventiveAction: 'Implemented quarterly food safety plan reviews and annual third-party audits.',
      responsiblePerson: 'Sarah Johnson, QA Manager',
      targetDate: '2025-11-15',
      completionDate: '2025-11-10',
      verificationMethod: 'Internal audit conducted on 2025-11-12 confirmed full implementation',
      evidence: ['Updated Food Safety Plan v4.0', 'Training records', 'Internal audit report'],
    },
    {
      id: 'o2',
      number: 2,
      description: 'The written sanitation controls were not adequate to ensure sanitizing of food-contact surfaces.',
      regulatoryReference: '21 CFR 117.135(c)(3)',
      severity: 'major',
      status: 'verified',
      rootCause: 'Sanitation SOPs did not specify adequate contact time for sanitizer',
      correctiveAction: 'Revised sanitation SOPs to include specific sanitizer concentration and contact time requirements.',
      preventiveAction: 'Implemented ATP verification testing after each sanitation event.',
      responsiblePerson: 'Michael Chen, Sanitation Manager',
      targetDate: '2025-11-20',
      completionDate: '2025-11-18',
      verificationMethod: 'ATP testing results and third-party sanitation audit',
      evidence: ['Revised SOP-SAN-001', 'ATP test results', 'Third-party audit report'],
    },
    {
      id: 'o3',
      number: 3,
      description: 'Environmental monitoring records did not demonstrate adequate frequency of sampling.',
      regulatoryReference: '21 CFR 117.165(a)(3)',
      severity: 'minor',
      status: 'in_progress',
      correctiveAction: 'Increased environmental sampling frequency from monthly to weekly for Zone 1 areas.',
      preventiveAction: 'Updated environmental monitoring program with risk-based sampling schedule.',
      responsiblePerson: 'Lisa Williams, QA Supervisor',
      targetDate: '2025-12-01',
    },
  ],
  totalObservations: 3,
  correctedCount: 2,
  inProgressCount: 1,
  createdAt: '2025-10-18',
  updatedAt: '2025-11-20',
};

export default function FDA483ResponseScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [responses, setResponses] = useState<FDA483Response[]>([MOCK_483]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FDA483Response | null>(null);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'observations' | 'timeline'>('overview');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = useMemo(() => {
    const allObs = responses.flatMap(r => r.observations);
    return {
      total483s: responses.length,
      totalObservations: allObs.length,
      corrected: allObs.filter(o => o.status === 'corrected' || o.status === 'verified').length,
      open: allObs.filter(o => o.status === 'open' || o.status === 'in_progress').length,
    };
  }, [responses]);

  const openDetail = useCallback((response: FDA483Response) => {
    setSelectedResponse(response);
    setActiveTab('overview');
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openObservationDetail = useCallback((observation: Observation) => {
    setSelectedObservation(observation);
    setShowObservationModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
          <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
            <FileWarning size={28} color="#F59E0B" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>FDA 483 Response</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track and manage FDA inspection observations
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total483s}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>483s</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.totalObservations}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Observations</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.corrected}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Corrected</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.open}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: '#3B82F6' + '15', borderColor: '#3B82F6' }]}>
          <FileText size={20} color="#3B82F6" />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Response Timeline</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Written response to FDA 483 observations should be submitted within 15 business days of inspection close-out.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>FDA 483 Forms</Text>

        {responses.map(response => {
          const statusConfig = RESPONSE_STATUS_CONFIG[response.responseStatus];
          const progress = Math.round((response.correctedCount / response.totalObservations) * 100);

          return (
            <Pressable
              key={response.id}
              style={({ pressed }) => [
                styles.responseCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: statusConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(response)}
            >
              <View style={styles.responseHeader}>
                <View style={styles.responseInfo}>
                  <Text style={[styles.facilityName, { color: colors.text }]}>{response.facilityName}</Text>
                  <Text style={[styles.inspectionDate, { color: colors.textSecondary }]}>
                    Inspection: {response.inspectionDate} - {response.inspectionEndDate}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>

              <View style={styles.investigatorRow}>
                <User size={14} color={colors.textTertiary} />
                <Text style={[styles.investigatorText, { color: colors.textSecondary }]}>
                  {response.investigatorName}, {response.investigatorDistrict}
                </Text>
              </View>

              <View style={styles.observationsSummary}>
                <View style={styles.observationCount}>
                  <AlertTriangle size={16} color="#F59E0B" />
                  <Text style={[styles.observationCountText, { color: colors.text }]}>
                    {response.totalObservations} Observation{response.totalObservations !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: '#10B981' }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress}% Corrected</Text>
                </View>
              </View>

              <View style={styles.responseFooter}>
                <View style={styles.dueInfo}>
                  <Calendar size={12} color={colors.textTertiary} />
                  <Text style={[styles.dueText, { color: colors.textSecondary }]}>
                    Response Due: {response.responseDueDate}
                  </Text>
                </View>
                {response.responseSubmittedDate && (
                  <View style={[styles.submittedBadge, { backgroundColor: '#10B981' + '15' }]}>
                    <CheckCircle size={12} color="#10B981" />
                    <Text style={[styles.submittedText, { color: '#10B981' }]}>Submitted</Text>
                  </View>
                )}
              </View>

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {responses.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileWarning size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No FDA 483s</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No FDA 483 forms have been received
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>483 Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedResponse && (
            <>
              <View style={styles.tabBar}>
                {(['overview', 'observations', 'timeline'] as const).map(tab => (
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
                    <View style={[styles.detailHeader, { backgroundColor: RESPONSE_STATUS_CONFIG[selectedResponse.responseStatus].color + '15' }]}>
                      <View style={[styles.detailIcon, { backgroundColor: RESPONSE_STATUS_CONFIG[selectedResponse.responseStatus].color + '30' }]}>
                        <FileWarning size={28} color={RESPONSE_STATUS_CONFIG[selectedResponse.responseStatus].color} />
                      </View>
                      <Text style={[styles.detailFacility, { color: colors.text }]}>{selectedResponse.facilityName}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: colors.surface, marginTop: 8 }]}>
                        <Text style={[styles.statusText, { color: RESPONSE_STATUS_CONFIG[selectedResponse.responseStatus].color }]}>
                          {RESPONSE_STATUS_CONFIG[selectedResponse.responseStatus].label}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Inspection Details</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Dates</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {selectedResponse.inspectionDate} - {selectedResponse.inspectionEndDate}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Investigator</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedResponse.investigatorName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>District</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedResponse.investigatorDistrict}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility Address</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedResponse.facilityAddress}</Text>
                      </View>
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Response Status</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due Date</Text>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{selectedResponse.responseDueDate}</Text>
                      </View>
                      {selectedResponse.responseSubmittedDate && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Submitted</Text>
                          <Text style={[styles.detailValue, { color: '#10B981' }]}>{selectedResponse.responseSubmittedDate}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Correction Progress</Text>
                    <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.progressStats}>
                        <View style={styles.progressStatItem}>
                          <Text style={[styles.progressStatValue, { color: '#10B981' }]}>{selectedResponse.correctedCount}</Text>
                          <Text style={[styles.progressStatLabel, { color: colors.textSecondary }]}>Corrected</Text>
                        </View>
                        <View style={styles.progressStatItem}>
                          <Text style={[styles.progressStatValue, { color: '#F59E0B' }]}>{selectedResponse.inProgressCount}</Text>
                          <Text style={[styles.progressStatLabel, { color: colors.textSecondary }]}>In Progress</Text>
                        </View>
                        <View style={styles.progressStatItem}>
                          <Text style={[styles.progressStatValue, { color: colors.text }]}>{selectedResponse.totalObservations}</Text>
                          <Text style={[styles.progressStatLabel, { color: colors.textSecondary }]}>Total</Text>
                        </View>
                      </View>
                      <View style={[styles.largeProgressBar, { backgroundColor: colors.border }]}>
                        <View 
                          style={[
                            styles.largeProgressFill, 
                            { 
                              width: `${Math.round((selectedResponse.correctedCount / selectedResponse.totalObservations) * 100)}%`, 
                              backgroundColor: '#10B981' 
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </>
                )}

                {activeTab === 'observations' && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                      Observations ({selectedResponse.observations.length})
                    </Text>

                    {selectedResponse.observations.map(observation => {
                      const statusConfig = OBSERVATION_STATUS_CONFIG[observation.status];
                      const severityConfig = SEVERITY_CONFIG[observation.severity];

                      return (
                        <Pressable
                          key={observation.id}
                          style={({ pressed }) => [
                            styles.observationCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderLeftWidth: 3,
                              borderLeftColor: severityConfig.color,
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                          onPress={() => openObservationDetail(observation)}
                        >
                          <View style={styles.observationHeader}>
                            <View style={styles.observationNumber}>
                              <Text style={[styles.observationNumberText, { color: colors.primary }]}>#{observation.number}</Text>
                            </View>
                            <View style={styles.observationBadges}>
                              <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '15' }]}>
                                <Text style={[styles.severityText, { color: severityConfig.color }]}>{severityConfig.label}</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                                {observation.status === 'corrected' || observation.status === 'verified' ? (
                                  <CheckCircle size={10} color={statusConfig.color} />
                                ) : (
                                  <Clock size={10} color={statusConfig.color} />
                                )}
                                <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                              </View>
                            </View>
                          </View>

                          <Text style={[styles.observationDescription, { color: colors.text }]} numberOfLines={3}>
                            {observation.description}
                          </Text>

                          <View style={styles.observationMeta}>
                            <Text style={[styles.regulatoryRef, { color: colors.primary }]}>
                              {observation.regulatoryReference}
                            </Text>
                            <View style={styles.targetDate}>
                              <Target size={12} color={colors.textTertiary} />
                              <Text style={[styles.targetDateText, { color: colors.textSecondary }]}>
                                Target: {observation.targetDate}
                              </Text>
                            </View>
                          </View>

                          <ChevronRight size={16} color={colors.textTertiary} style={styles.obsChevron} />
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {activeTab === 'timeline' && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Response Timeline</Text>

                    <View style={styles.timelineContainer}>
                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                        <View style={styles.timelineContent}>
                          <Text style={[styles.timelineDate, { color: colors.primary }]}>{selectedResponse.inspectionDate}</Text>
                          <Text style={[styles.timelineTitle, { color: colors.text }]}>Inspection Started</Text>
                          <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                            FDA investigator {selectedResponse.investigatorName} began inspection
                          </Text>
                        </View>
                      </View>

                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                        <View style={styles.timelineContent}>
                          <Text style={[styles.timelineDate, { color: colors.primary }]}>{selectedResponse.inspectionEndDate}</Text>
                          <Text style={[styles.timelineTitle, { color: colors.text }]}>483 Issued</Text>
                          <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                            {selectedResponse.totalObservations} observations documented
                          </Text>
                        </View>
                      </View>

                      {selectedResponse.responseSubmittedDate && (
                        <View style={styles.timelineItem}>
                          <View style={[styles.timelineDot, { backgroundColor: '#3B82F6' }]} />
                          <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                          <View style={styles.timelineContent}>
                            <Text style={[styles.timelineDate, { color: colors.primary }]}>{selectedResponse.responseSubmittedDate}</Text>
                            <Text style={[styles.timelineTitle, { color: colors.text }]}>Response Submitted</Text>
                            <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                              Written response sent to FDA
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: selectedResponse.correctedCount === selectedResponse.totalObservations ? '#10B981' : colors.border }]} />
                        <View style={styles.timelineContent}>
                          <Text style={[styles.timelineDate, { color: colors.primary }]}>Ongoing</Text>
                          <Text style={[styles.timelineTitle, { color: colors.text }]}>Corrective Actions</Text>
                          <Text style={[styles.timelineDesc, { color: colors.textSecondary }]}>
                            {selectedResponse.correctedCount} of {selectedResponse.totalObservations} observations corrected
                          </Text>
                        </View>
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

      <Modal visible={showObservationModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowObservationModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Observation #{selectedObservation?.number}</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedObservation && (() => {
            const statusConfig = OBSERVATION_STATUS_CONFIG[selectedObservation.status];
            const severityConfig = SEVERITY_CONFIG[selectedObservation.severity];

            return (
              <ScrollView style={styles.modalContent}>
                <View style={styles.obsBadgeRow}>
                  <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '15' }]}>
                    <Text style={[styles.severityText, { color: severityConfig.color }]}>{severityConfig.label}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                  <Text style={[styles.obsRegRef, { color: colors.primary }]}>{selectedObservation.regulatoryReference}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Observation</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.obsDescription, { color: colors.text }]}>{selectedObservation.description}</Text>
                </View>

                {selectedObservation.rootCause && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Root Cause</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.obsText, { color: colors.text }]}>{selectedObservation.rootCause}</Text>
                    </View>
                  </>
                )}

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Corrective Action</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.obsText, { color: colors.text }]}>{selectedObservation.correctiveAction}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Preventive Action</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.obsText, { color: colors.text }]}>{selectedObservation.preventiveAction}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Assignment</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Responsible</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedObservation.responsiblePerson}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Target Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedObservation.targetDate}</Text>
                  </View>
                  {selectedObservation.completionDate && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Completed</Text>
                      <Text style={[styles.detailValue, { color: '#10B981' }]}>{selectedObservation.completionDate}</Text>
                    </View>
                  )}
                </View>

                {selectedObservation.verificationMethod && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Verification</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.obsText, { color: colors.text }]}>{selectedObservation.verificationMethod}</Text>
                    </View>
                  </>
                )}

                {selectedObservation.evidence && selectedObservation.evidence.length > 0 && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Evidence</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {selectedObservation.evidence.map((item, index) => (
                        <View key={index} style={styles.evidenceItem}>
                          <FileText size={14} color={colors.primary} />
                          <Text style={[styles.evidenceText, { color: colors.text }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
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
  responseCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  responseHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  responseInfo: { flex: 1 },
  facilityName: { fontSize: 15, fontWeight: '600' as const },
  inspectionDate: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  investigatorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  investigatorText: { fontSize: 12 },
  observationsSummary: { marginBottom: 10 },
  observationCount: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 8,
  },
  observationCountText: { fontSize: 14, fontWeight: '500' as const },
  progressContainer: { gap: 4 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11 },
  responseFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  dueInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dueText: { fontSize: 11 },
  submittedBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  submittedText: { fontSize: 10, fontWeight: '600' as const },
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
  detailFacility: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const },
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
  progressCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  progressStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    marginBottom: 12,
  },
  progressStatItem: { alignItems: 'center' as const },
  progressStatValue: { fontSize: 24, fontWeight: '700' as const },
  progressStatLabel: { fontSize: 11, marginTop: 2 },
  largeProgressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden' as const,
  },
  largeProgressFill: { height: '100%', borderRadius: 5 },
  observationCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  observationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  observationNumber: {},
  observationNumberText: { fontSize: 14, fontWeight: '700' as const },
  observationBadges: { flexDirection: 'row' as const, gap: 6 },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: { fontSize: 10, fontWeight: '600' as const },
  observationDescription: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  observationMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  regulatoryRef: { fontSize: 11, fontWeight: '500' as const },
  targetDate: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  targetDateText: { fontSize: 11 },
  obsChevron: { position: 'absolute' as const, right: 12, top: 12 },
  timelineContainer: { paddingLeft: 8 },
  timelineItem: {
    flexDirection: 'row' as const,
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute' as const,
    left: 5,
    top: 16,
    bottom: -20,
    width: 2,
  },
  timelineContent: { marginLeft: 16, flex: 1 },
  timelineDate: { fontSize: 12, fontWeight: '600' as const },
  timelineTitle: { fontSize: 14, fontWeight: '600' as const, marginTop: 2 },
  timelineDesc: { fontSize: 12, marginTop: 2 },
  obsBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 16,
  },
  obsRegRef: { fontSize: 12, fontWeight: '500' as const },
  obsDescription: { fontSize: 14, lineHeight: 20 },
  obsText: { fontSize: 14, lineHeight: 20 },
  evidenceItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  evidenceText: { fontSize: 13 },
});
