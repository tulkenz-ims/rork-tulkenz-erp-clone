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
  RotateCcw,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Phone,
  Mail,
  User,
  FileText,
  Calendar,
  Package,
  Truck,
  Bell,
  ClipboardList,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type RecallClass = 'class_i' | 'class_ii' | 'class_iii';
type RecallStatus = 'active' | 'completed' | 'mock_drill' | 'planned';
type RecallType = 'voluntary' | 'fda_requested' | 'market_withdrawal';

interface RecallContact {
  role: string;
  name: string;
  phone: string;
  email: string;
  available24hr: boolean;
}

interface RecallEvent {
  id: string;
  eventNumber: string;
  type: RecallType;
  classification: RecallClass;
  status: RecallStatus;
  productName: string;
  lotCodes: string[];
  productionDates: string;
  distributionArea: string;
  quantityAffected: string;
  reasonForRecall: string;
  healthHazard: string;
  initiationDate: string;
  completionDate?: string;
  fdaReportNumber?: string;
  consigneeNotificationMethod: string;
  publicNotificationRequired: boolean;
  pressReleaseIssued: boolean;
  effectivenessChecks: number;
  recoveryRate?: number;
  notes?: string;
  createdAt: string;
}

interface MockDrill {
  id: string;
  drillDate: string;
  scenario: string;
  productTraced: string;
  lotCode: string;
  timeToComplete: string;
  recoveryRate: number;
  findings: string[];
  correctiveActions: string[];
  performedBy: string;
  nextDrillDue: string;
}

const CLASS_CONFIG: Record<RecallClass, { label: string; color: string; description: string }> = {
  class_i: { label: 'Class I', color: '#DC2626', description: 'Reasonable probability of serious health consequences or death' },
  class_ii: { label: 'Class II', color: '#F59E0B', description: 'May cause temporary or medically reversible health consequences' },
  class_iii: { label: 'Class III', color: '#3B82F6', description: 'Not likely to cause adverse health consequences' },
};

const STATUS_CONFIG: Record<RecallStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#EF4444' },
  completed: { label: 'Completed', color: '#10B981' },
  mock_drill: { label: 'Mock Drill', color: '#6366F1' },
  planned: { label: 'Planned', color: '#6B7280' },
};

const RECALL_TEAM: RecallContact[] = [
  { role: 'Recall Coordinator', name: 'Sarah Johnson', phone: '(555) 123-4567', email: 'sjohnson@company.com', available24hr: true },
  { role: 'QA Manager', name: 'Michael Chen', phone: '(555) 234-5678', email: 'mchen@company.com', available24hr: true },
  { role: 'Operations Director', name: 'Lisa Williams', phone: '(555) 345-6789', email: 'lwilliams@company.com', available24hr: true },
  { role: 'Legal Counsel', name: 'David Brown', phone: '(555) 456-7890', email: 'dbrown@company.com', available24hr: false },
  { role: 'Public Relations', name: 'Emily Davis', phone: '(555) 567-8901', email: 'edavis@company.com', available24hr: false },
  { role: 'FDA Liaison', name: 'James Wilson', phone: '(555) 678-9012', email: 'jwilson@company.com', available24hr: true },
];

const MOCK_DRILLS: MockDrill[] = [
  {
    id: 'd1',
    drillDate: '2025-11-15',
    scenario: 'Undeclared allergen (peanut) in finished product',
    productTraced: 'Trail Mix Granola Bars',
    lotCode: 'LOT-2025-1115-A',
    timeToComplete: '2 hours 15 minutes',
    recoveryRate: 98,
    findings: ['Distribution records took 45 minutes to compile', 'One customer contact outdated'],
    correctiveActions: ['Implement real-time distribution tracking', 'Update customer contact database monthly'],
    performedBy: 'QA Team',
    nextDrillDue: '2026-05-15',
  },
];

const MOCK_RECALLS: RecallEvent[] = [
  {
    id: 'r1',
    eventNumber: 'RCL-2025-001',
    type: 'mock_drill' as RecallType,
    classification: 'class_ii',
    status: 'completed',
    productName: 'Organic Caesar Salad Kit',
    lotCodes: ['LOT-2025-0920-A', 'LOT-2025-0920-B'],
    productionDates: '2025-09-20',
    distributionArea: 'CA, OR, WA, NV, AZ',
    quantityAffected: '15,000 units',
    reasonForRecall: 'Mock drill - Potential Listeria contamination',
    healthHazard: 'Simulated Class II recall scenario',
    initiationDate: '2025-09-25',
    completionDate: '2025-09-25',
    consigneeNotificationMethod: 'Email and phone',
    publicNotificationRequired: false,
    pressReleaseIssued: false,
    effectivenessChecks: 3,
    recoveryRate: 97,
    notes: 'Annual mock recall drill - completed successfully within 4 hours',
    createdAt: '2025-09-25',
  },
];

export default function RecallPlanScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [recalls, setRecalls] = useState<RecallEvent[]>(MOCK_RECALLS);
  const [drills, setDrills] = useState<MockDrill[]>(MOCK_DRILLS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'plan' | 'team' | 'events' | 'drills'>('plan');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecall, setSelectedRecall] = useState<RecallEvent | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const stats = useMemo(() => ({
    totalEvents: recalls.length,
    activeRecalls: recalls.filter(r => r.status === 'active').length,
    completedDrills: drills.length,
    avgRecoveryRate: drills.length > 0 ? Math.round(drills.reduce((sum, d) => sum + d.recoveryRate, 0) / drills.length) : 0,
  }), [recalls, drills]);

  const openRecallDetail = useCallback((recall: RecallEvent) => {
    setSelectedRecall(recall);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
          <View style={[styles.iconContainer, { backgroundColor: '#EF4444' + '20' }]}>
            <RotateCcw size={28} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Recall Plan</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FSMA required recall procedures and documentation
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalEvents}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Events</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.activeRecalls}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#6366F1' }]}>{stats.completedDrills}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Drills</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.avgRecoveryRate}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recovery</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(['plan', 'team', 'events', 'drills'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
              onPress={() => {
                setActiveTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[
                styles.tabButtonText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'plan' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recall Procedures</Text>
            
            <View style={[styles.procedureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.procedureHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.procedureTitle, { color: colors.text }]}>Identify & Assess</Text>
              </View>
              <Text style={[styles.procedureText, { color: colors.textSecondary }]}>
                • Identify affected product(s), lot codes, and production dates{'\n'}
                • Assess health hazard and determine recall classification{'\n'}
                • Document reason for recall and scope of distribution
              </Text>
            </View>

            <View style={[styles.procedureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.procedureHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.procedureTitle, { color: colors.text }]}>Notify & Report</Text>
              </View>
              <Text style={[styles.procedureText, { color: colors.textSecondary }]}>
                • Activate recall team and assign responsibilities{'\n'}
                • Report to FDA within 24 hours for Class I recalls{'\n'}
                • Prepare customer and public notifications as required
              </Text>
            </View>

            <View style={[styles.procedureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.procedureHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.procedureTitle, { color: colors.text }]}>Execute & Track</Text>
              </View>
              <Text style={[styles.procedureText, { color: colors.textSecondary }]}>
                • Issue recall notices to all consignees{'\n'}
                • Track product recovery and disposition{'\n'}
                • Document all communications and actions
              </Text>
            </View>

            <View style={[styles.procedureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.procedureHeader}>
                <View style={[styles.stepNumber, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={[styles.procedureTitle, { color: colors.text }]}>Verify & Close</Text>
              </View>
              <Text style={[styles.procedureText, { color: colors.textSecondary }]}>
                • Conduct effectiveness checks{'\n'}
                • Submit final recall status report to FDA{'\n'}
                • Perform root cause analysis and implement corrective actions
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Recall Classifications</Text>
            
            {Object.entries(CLASS_CONFIG).map(([key, config]) => (
              <View
                key={key}
                style={[
                  styles.classCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftWidth: 4,
                    borderLeftColor: config.color,
                  },
                ]}
              >
                <View style={[styles.classBadge, { backgroundColor: config.color + '20' }]}>
                  <Text style={[styles.classLabel, { color: config.color }]}>{config.label}</Text>
                </View>
                <Text style={[styles.classDescription, { color: colors.textSecondary }]}>{config.description}</Text>
              </View>
            ))}
          </>
        )}

        {activeTab === 'team' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recall Team Contacts</Text>
            
            {RECALL_TEAM.map((contact, index) => (
              <View
                key={index}
                style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.contactHeader}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.primary + '20' }]}>
                    <User size={20} color={colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactRole, { color: colors.primary }]}>{contact.role}</Text>
                    <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                  </View>
                  {contact.available24hr && (
                    <View style={[styles.availableBadge, { backgroundColor: '#10B981' + '20' }]}>
                      <Bell size={12} color="#10B981" />
                      <Text style={[styles.availableText, { color: '#10B981' }]}>24/7</Text>
                    </View>
                  )}
                </View>
                <View style={styles.contactDetails}>
                  <View style={styles.contactItem}>
                    <Phone size={14} color={colors.textTertiary} />
                    <Text style={[styles.contactItemText, { color: colors.text }]}>{contact.phone}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Mail size={14} color={colors.textTertiary} />
                    <Text style={[styles.contactItemText, { color: colors.primary }]}>{contact.email}</Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={[styles.emergencyCard, { backgroundColor: '#EF4444' + '15', borderColor: '#EF4444' }]}>
              <AlertTriangle size={24} color="#EF4444" />
              <View style={styles.emergencyInfo}>
                <Text style={[styles.emergencyTitle, { color: '#EF4444' }]}>FDA Emergency Line</Text>
                <Text style={[styles.emergencyPhone, { color: colors.text }]}>1-866-300-4374</Text>
                <Text style={[styles.emergencyNote, { color: colors.textSecondary }]}>
                  Available 24/7 for recall reporting
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'events' && (
          <>
            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Recall Events ({recalls.length})
              </Text>
              <Pressable
                style={[styles.addButton, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  Alert.alert('New Recall', 'This would initiate a new recall event.');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>New</Text>
              </Pressable>
            </View>

            {recalls.map(recall => {
              const classConfig = CLASS_CONFIG[recall.classification];
              const statusConfig = STATUS_CONFIG[recall.status];

              return (
                <Pressable
                  key={recall.id}
                  style={({ pressed }) => [
                    styles.recallCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderLeftWidth: 4,
                      borderLeftColor: classConfig.color,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => openRecallDetail(recall)}
                >
                  <View style={styles.recallHeader}>
                    <View style={styles.recallInfo}>
                      <Text style={[styles.recallNumber, { color: colors.textSecondary }]}>{recall.eventNumber}</Text>
                      <Text style={[styles.recallProduct, { color: colors.text }]}>{recall.productName}</Text>
                    </View>
                    <View style={styles.recallBadges}>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.recallMeta}>
                    <View style={[styles.classBadge, { backgroundColor: classConfig.color + '20' }]}>
                      <Text style={[styles.classLabel, { color: classConfig.color }]}>{classConfig.label}</Text>
                    </View>
                    <View style={styles.dateInfo}>
                      <Calendar size={12} color={colors.textTertiary} />
                      <Text style={[styles.dateText, { color: colors.textSecondary }]}>{recall.initiationDate}</Text>
                    </View>
                  </View>

                  <Text style={[styles.recallReason, { color: colors.textSecondary }]} numberOfLines={2}>
                    {recall.reasonForRecall}
                  </Text>

                  {recall.recoveryRate !== undefined && (
                    <View style={[styles.recoveryBox, { backgroundColor: colors.background }]}>
                      <Package size={14} color="#10B981" />
                      <Text style={[styles.recoveryText, { color: colors.text }]}>
                        Recovery Rate: {recall.recoveryRate}%
                      </Text>
                    </View>
                  )}

                  <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
                </Pressable>
              );
            })}

            {recalls.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <RotateCcw size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recall Events</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No recall events have been recorded
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'drills' && (
          <>
            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Mock Recall Drills ({drills.length})
              </Text>
              <Pressable
                style={[styles.addButton, { backgroundColor: '#6366F1' }]}
                onPress={() => {
                  Alert.alert('New Drill', 'This would schedule a new mock recall drill.');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Schedule</Text>
              </Pressable>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: '#6366F1' + '15', borderColor: '#6366F1' }]}>
              <ClipboardList size={18} color="#6366F1" />
              <Text style={[styles.requirementText, { color: colors.text }]}>
                FSMA requires mock recalls to be conducted at least annually to verify traceability systems
              </Text>
            </View>

            {drills.map(drill => (
              <View
                key={drill.id}
                style={[styles.drillCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.drillHeader}>
                  <View style={styles.drillInfo}>
                    <Text style={[styles.drillDate, { color: colors.primary }]}>{drill.drillDate}</Text>
                    <Text style={[styles.drillProduct, { color: colors.text }]}>{drill.productTraced}</Text>
                  </View>
                  <View style={[styles.recoveryBadge, { backgroundColor: drill.recoveryRate >= 95 ? '#10B981' + '20' : '#F59E0B' + '20' }]}>
                    <Text style={[styles.recoveryBadgeText, { color: drill.recoveryRate >= 95 ? '#10B981' : '#F59E0B' }]}>
                      {drill.recoveryRate}%
                    </Text>
                  </View>
                </View>

                <Text style={[styles.drillScenario, { color: colors.textSecondary }]}>{drill.scenario}</Text>

                <View style={styles.drillMeta}>
                  <View style={styles.drillMetaItem}>
                    <Clock size={12} color={colors.textTertiary} />
                    <Text style={[styles.drillMetaText, { color: colors.text }]}>{drill.timeToComplete}</Text>
                  </View>
                  <View style={styles.drillMetaItem}>
                    <Package size={12} color={colors.textTertiary} />
                    <Text style={[styles.drillMetaText, { color: colors.text }]}>{drill.lotCode}</Text>
                  </View>
                </View>

                {drill.findings.length > 0 && (
                  <View style={[styles.findingsBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.findingsLabel, { color: colors.textSecondary }]}>Findings:</Text>
                    {drill.findings.map((finding, index) => (
                      <Text key={index} style={[styles.findingText, { color: colors.text }]}>• {finding}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.nextDrillRow}>
                  <Calendar size={14} color={colors.primary} />
                  <Text style={[styles.nextDrillText, { color: colors.text }]}>Next Drill Due: {drill.nextDrillDue}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Recall Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedRecall && (() => {
            const classConfig = CLASS_CONFIG[selectedRecall.classification];
            const statusConfig = STATUS_CONFIG[selectedRecall.status];

            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.detailHeader, { backgroundColor: classConfig.color + '15' }]}>
                  <View style={[styles.detailIcon, { backgroundColor: classConfig.color + '30' }]}>
                    <RotateCcw size={28} color={classConfig.color} />
                  </View>
                  <Text style={[styles.detailNumber, { color: colors.textSecondary }]}>{selectedRecall.eventNumber}</Text>
                  <Text style={[styles.detailProduct, { color: colors.text }]}>{selectedRecall.productName}</Text>
                  <View style={styles.detailBadges}>
                    <View style={[styles.classBadge, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.classLabel, { color: classConfig.color }]}>{classConfig.label}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Recall Information</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Reason</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.reasonForRecall}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Health Hazard</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.healthHazard}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lot Codes</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.lotCodes.join(', ')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.quantityAffected}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Distribution</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.distributionArea}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Timeline</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Initiated</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.initiationDate}</Text>
                  </View>
                  {selectedRecall.completionDate && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Completed</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.completionDate}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Effectiveness Checks</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRecall.effectivenessChecks}</Text>
                  </View>
                  {selectedRecall.recoveryRate !== undefined && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Recovery Rate</Text>
                      <Text style={[styles.detailValue, { color: '#10B981' }]}>{selectedRecall.recoveryRate}%</Text>
                    </View>
                  )}
                </View>

                {selectedRecall.notes && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Notes</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.notesText, { color: colors.text }]}>{selectedRecall.notes}</Text>
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
  tabBar: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  tabButtonText: { fontSize: 13, fontWeight: '600' as const },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12 },
  procedureCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  procedureHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  stepNumberText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' as const },
  procedureTitle: { fontSize: 15, fontWeight: '600' as const },
  procedureText: { fontSize: 13, lineHeight: 20 },
  classCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  classBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start' as const,
    marginBottom: 6,
  },
  classLabel: { fontSize: 12, fontWeight: '600' as const },
  classDescription: { fontSize: 13 },
  contactCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  contactHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  contactInfo: { flex: 1 },
  contactRole: { fontSize: 11, fontWeight: '600' as const },
  contactName: { fontSize: 15, fontWeight: '600' as const },
  availableBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  availableText: { fontSize: 10, fontWeight: '600' as const },
  contactDetails: { gap: 6 },
  contactItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  contactItemText: { fontSize: 13 },
  emergencyCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
    marginTop: 12,
  },
  emergencyInfo: { flex: 1 },
  emergencyTitle: { fontSize: 14, fontWeight: '600' as const },
  emergencyPhone: { fontSize: 20, fontWeight: '700' as const, marginVertical: 4 },
  emergencyNote: { fontSize: 12 },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  recallCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  recallHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  recallInfo: { flex: 1 },
  recallNumber: { fontSize: 11, marginBottom: 2 },
  recallProduct: { fontSize: 15, fontWeight: '600' as const },
  recallBadges: { flexDirection: 'row' as const, gap: 6 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  recallMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 8,
  },
  dateInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  dateText: { fontSize: 12 },
  recallReason: { fontSize: 13, marginBottom: 10 },
  recoveryBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  recoveryText: { fontSize: 12, fontWeight: '500' as const },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  requirementCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  requirementText: { flex: 1, fontSize: 13, lineHeight: 18 },
  drillCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  drillHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  drillInfo: { flex: 1 },
  drillDate: { fontSize: 12, fontWeight: '600' as const },
  drillProduct: { fontSize: 15, fontWeight: '600' as const },
  recoveryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recoveryBadgeText: { fontSize: 14, fontWeight: '700' as const },
  drillScenario: { fontSize: 13, marginBottom: 10 },
  drillMeta: {
    flexDirection: 'row' as const,
    gap: 16,
    marginBottom: 10,
  },
  drillMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  drillMetaText: { fontSize: 12 },
  findingsBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  findingsLabel: { fontSize: 11, marginBottom: 4 },
  findingText: { fontSize: 12, marginBottom: 2 },
  nextDrillRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  nextDrillText: { fontSize: 13, fontWeight: '500' as const },
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
  detailNumber: { fontSize: 12 },
  detailProduct: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const, marginTop: 4 },
  detailBadges: { flexDirection: 'row' as const, gap: 8, marginTop: 10 },
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
  notesText: { fontSize: 14, lineHeight: 20 },
});
