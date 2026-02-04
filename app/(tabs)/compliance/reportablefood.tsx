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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  AlertOctagon,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Calendar,
  FileText,
  Globe,
  ExternalLink,
  Phone,
  User,
  Package,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type ReportStatus = 'submitted' | 'under_review' | 'closed' | 'follow_up_required';
type HazardType = 'biological' | 'chemical' | 'physical' | 'allergen' | 'other';

interface RFRReport {
  id: string;
  reportNumber: string;
  status: ReportStatus;
  submissionDate: string;
  productDescription: string;
  brandName: string;
  lotCodes: string[];
  productionDates: string;
  hazardType: HazardType;
  hazardDescription: string;
  reasonForReport: string;
  healthConsequences: string;
  distributionInfo: string;
  quantityDistributed: string;
  consumerComplaints: number;
  illnessesReported: number;
  recallInitiated: boolean;
  reportedBy: string;
  contactPhone: string;
  contactEmail: string;
  fdaResponse?: string;
  followUpActions?: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: '#3B82F6' },
  under_review: { label: 'Under Review', color: '#F59E0B' },
  closed: { label: 'Closed', color: '#10B981' },
  follow_up_required: { label: 'Follow-up Required', color: '#EF4444' },
};

const HAZARD_CONFIG: Record<HazardType, { label: string; color: string }> = {
  biological: { label: 'Biological', color: '#DC2626' },
  chemical: { label: 'Chemical', color: '#7C3AED' },
  physical: { label: 'Physical', color: '#F59E0B' },
  allergen: { label: 'Allergen', color: '#EC4899' },
  other: { label: 'Other', color: '#6B7280' },
};

const MOCK_REPORTS: RFRReport[] = [
  {
    id: '1',
    reportNumber: 'RFR-2025-00456',
    status: 'closed',
    submissionDate: '2025-08-15',
    productDescription: 'Organic Mixed Salad Greens, 5 oz clamshell',
    brandName: 'Fresh Garden',
    lotCodes: ['LOT-2025-0812-A', 'LOT-2025-0812-B'],
    productionDates: '2025-08-12',
    hazardType: 'biological',
    hazardDescription: 'Potential Salmonella contamination detected during routine environmental testing',
    reasonForReport: 'Positive Salmonella environmental swab in production area with potential for product contamination',
    healthConsequences: 'Salmonella infection can cause diarrhea, fever, and abdominal cramps. Serious infections can occur in elderly, infants, and immunocompromised individuals.',
    distributionInfo: 'Retail distribution: CA, OR, WA, NV, AZ',
    quantityDistributed: '15,000 units',
    consumerComplaints: 0,
    illnessesReported: 0,
    recallInitiated: true,
    reportedBy: 'Sarah Johnson, QA Manager',
    contactPhone: '(555) 123-4567',
    contactEmail: 'sjohnson@company.com',
    fdaResponse: 'Report received. Recall effectiveness verified. Case closed.',
    followUpActions: ['Enhanced environmental monitoring implemented', 'Sanitation procedures updated', 'Staff retraining completed'],
    createdAt: '2025-08-15',
    updatedAt: '2025-09-01',
  },
];

export default function ReportableFoodScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<RFRReport[]>(MOCK_REPORTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<RFRReport | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'requirements' | 'criteria'>('reports');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      return !searchQuery ||
        report.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.productDescription.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [reports, searchQuery]);

  const stats = useMemo(() => ({
    total: reports.length,
    open: reports.filter(r => r.status !== 'closed').length,
    withRecall: reports.filter(r => r.recallInitiated).length,
    illnesses: reports.reduce((sum, r) => sum + r.illnessesReported, 0),
  }), [reports]);

  const openDetail = useCallback((report: RFRReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const openRFRPortal = useCallback(() => {
    Linking.openURL('https://www.safetyreporting.hhs.gov/');
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
            <AlertOctagon size={28} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Reportable Food Registry</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FDA electronic portal for reporting food safety issues
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reports</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.open}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.withRecall}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Recalls</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.illnesses}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Illnesses</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(['reports', 'requirements', 'criteria'] as const).map(tab => (
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

        {activeTab === 'reports' && (
          <>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search reports..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                RFR Reports ({filteredReports.length})
              </Text>
              <Pressable
                style={[styles.portalButton, { backgroundColor: '#EF4444' }]}
                onPress={openRFRPortal}
              >
                <Globe size={16} color="#FFFFFF" />
                <Text style={styles.portalButtonText}>Submit</Text>
                <ExternalLink size={14} color="#FFFFFF" />
              </Pressable>
            </View>

            {filteredReports.map(report => {
              const statusConfig = STATUS_CONFIG[report.status];
              const hazardConfig = HAZARD_CONFIG[report.hazardType];

              return (
                <Pressable
                  key={report.id}
                  style={({ pressed }) => [
                    styles.reportCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderLeftWidth: 3,
                      borderLeftColor: statusConfig.color,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                  onPress={() => openDetail(report)}
                >
                  <View style={styles.reportHeader}>
                    <View style={styles.reportInfo}>
                      <Text style={[styles.reportNumber, { color: colors.primary }]}>{report.reportNumber}</Text>
                      <Text style={[styles.productDescription, { color: colors.text }]}>{report.productDescription}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                      <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                    </View>
                  </View>

                  <View style={styles.reportMeta}>
                    <View style={[styles.hazardBadge, { backgroundColor: hazardConfig.color + '15' }]}>
                      <AlertTriangle size={12} color={hazardConfig.color} />
                      <Text style={[styles.hazardText, { color: hazardConfig.color }]}>{hazardConfig.label}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>{report.submissionDate}</Text>
                    </View>
                    {report.recallInitiated && (
                      <View style={[styles.recallBadge, { backgroundColor: '#EF4444' + '15' }]}>
                        <Text style={[styles.recallText, { color: '#EF4444' }]}>Recall</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.hazardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {report.hazardDescription}
                  </Text>

                  <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
                </Pressable>
              );
            })}

            {filteredReports.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AlertOctagon size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reports</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No RFR reports have been submitted
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'requirements' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>RFR Requirements</Text>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#EF4444' + '20' }]}>
                  <AlertOctagon size={20} color="#EF4444" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>What is the RFR?</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                The Reportable Food Registry (RFR) is an electronic portal for industry to report when there is reasonable probability that a food will cause serious adverse health consequences or death.
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                  <Clock size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>When to Report</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                Reports must be submitted within 24 hours of determining that a reportable food situation exists. This applies to:{'\n\n'}
                • Manufacturers and processors{'\n'}
                • Packers and holders{'\n'}
                • Distributors{'\n'}
                • Importers
              </Text>
            </View>

            <View style={[styles.requirementCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.requirementHeader}>
                <View style={[styles.requirementIcon, { backgroundColor: '#10B981' + '20' }]}>
                  <FileText size={20} color="#10B981" />
                </View>
                <Text style={[styles.requirementTitle, { color: colors.text }]}>Required Information</Text>
              </View>
              <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                • Product description and identifiers{'\n'}
                • Lot/batch codes and production dates{'\n'}
                • Nature of the hazard{'\n'}
                • Health consequences{'\n'}
                • Distribution information{'\n'}
                • Quantity distributed{'\n'}
                • Contact information{'\n'}
                • Actions taken (recall status)
              </Text>
            </View>

            <View style={[styles.emergencyCard, { backgroundColor: '#DC2626' + '15', borderColor: '#DC2626' }]}>
              <Phone size={24} color="#DC2626" />
              <View style={styles.emergencyInfo}>
                <Text style={[styles.emergencyTitle, { color: '#DC2626' }]}>FDA Emergency</Text>
                <Text style={[styles.emergencyPhone, { color: colors.text }]}>1-866-300-4374</Text>
                <Text style={[styles.emergencyNote, { color: colors.textSecondary }]}>
                  For urgent food safety matters
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'criteria' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reporting Criteria</Text>

            <View style={[styles.alertCard, { backgroundColor: '#DC2626' + '15', borderColor: '#DC2626' }]}>
              <AlertTriangle size={20} color="#DC2626" />
              <View style={styles.alertContent}>
                <Text style={[styles.alertTitle, { color: '#DC2626' }]}>Key Question</Text>
                <Text style={[styles.alertText, { color: colors.text }]}>
                  Is there a reasonable probability that the use of, or exposure to, the food will cause serious adverse health consequences or death?
                </Text>
              </View>
            </View>

            <Text style={[styles.subSectionTitle, { color: colors.text }]}>Examples of Reportable Foods</Text>

            <View style={[styles.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.exampleIcon, { backgroundColor: '#DC2626' + '20' }]}>
                <AlertTriangle size={18} color="#DC2626" />
              </View>
              <View style={styles.exampleContent}>
                <Text style={[styles.exampleTitle, { color: colors.text }]}>Biological Hazards</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  • Salmonella in RTE foods{'\n'}
                  • E. coli O157:H7{'\n'}
                  • Listeria monocytogenes{'\n'}
                  • Botulinum toxin
                </Text>
              </View>
            </View>

            <View style={[styles.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.exampleIcon, { backgroundColor: '#7C3AED' + '20' }]}>
                <AlertTriangle size={18} color="#7C3AED" />
              </View>
              <View style={styles.exampleContent}>
                <Text style={[styles.exampleTitle, { color: colors.text }]}>Chemical Hazards</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  • Toxic substances{'\n'}
                  • Unsafe food additives{'\n'}
                  • Pesticide residues above tolerance{'\n'}
                  • Heavy metal contamination
                </Text>
              </View>
            </View>

            <View style={[styles.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.exampleIcon, { backgroundColor: '#EC4899' + '20' }]}>
                <AlertTriangle size={18} color="#EC4899" />
              </View>
              <View style={styles.exampleContent}>
                <Text style={[styles.exampleTitle, { color: colors.text }]}>Allergen Hazards</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  • Undeclared major allergens{'\n'}
                  • Cross-contact with allergens{'\n'}
                  • Label errors for allergens
                </Text>
              </View>
            </View>

            <View style={[styles.exampleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.exampleIcon, { backgroundColor: '#F59E0B' + '20' }]}>
                <AlertTriangle size={18} color="#F59E0B" />
              </View>
              <View style={styles.exampleContent}>
                <Text style={[styles.exampleTitle, { color: colors.text }]}>Physical Hazards</Text>
                <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
                  • Glass fragments{'\n'}
                  • Metal pieces{'\n'}
                  • Hard plastic{'\n'}
                  • Other foreign objects causing injury
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={openRFRPortal}
            >
              <Globe size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Access RFR Portal</Text>
              <ExternalLink size={16} color="#FFFFFF" />
            </Pressable>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedReport && (() => {
            const statusConfig = STATUS_CONFIG[selectedReport.status];
            const hazardConfig = HAZARD_CONFIG[selectedReport.hazardType];

            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.detailHeader, { backgroundColor: statusConfig.color + '15' }]}>
                  <View style={[styles.detailIcon, { backgroundColor: statusConfig.color + '30' }]}>
                    <AlertOctagon size={28} color={statusConfig.color} />
                  </View>
                  <Text style={[styles.detailReportNumber, { color: colors.primary }]}>{selectedReport.reportNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.surface, marginTop: 8 }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Product Information</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReport.productDescription}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Brand</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReport.brandName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lot Codes</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReport.lotCodes.join(', ')}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedReport.quantityDistributed}</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Hazard Information</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.hazardBadge, { backgroundColor: hazardConfig.color + '15', alignSelf: 'flex-start' as const, marginBottom: 10 }]}>
                    <AlertTriangle size={14} color={hazardConfig.color} />
                    <Text style={[styles.hazardText, { color: hazardConfig.color }]}>{hazardConfig.label} Hazard</Text>
                  </View>
                  <Text style={[styles.hazardDetailText, { color: colors.text }]}>{selectedReport.hazardDescription}</Text>
                  <Text style={[styles.consequencesTitle, { color: colors.textSecondary, marginTop: 12 }]}>Health Consequences:</Text>
                  <Text style={[styles.consequencesText, { color: colors.text }]}>{selectedReport.healthConsequences}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Distribution</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.distributionText, { color: colors.text }]}>{selectedReport.distributionInfo}</Text>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Reported Incidents</Text>
                <View style={[styles.incidentsRow, { gap: 10 }]}>
                  <View style={[styles.incidentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.incidentValue, { color: '#F59E0B' }]}>{selectedReport.consumerComplaints}</Text>
                    <Text style={[styles.incidentLabel, { color: colors.textSecondary }]}>Complaints</Text>
                  </View>
                  <View style={[styles.incidentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.incidentValue, { color: '#EF4444' }]}>{selectedReport.illnessesReported}</Text>
                    <Text style={[styles.incidentLabel, { color: colors.textSecondary }]}>Illnesses</Text>
                  </View>
                  <View style={[styles.incidentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.incidentValue, { color: selectedReport.recallInitiated ? '#10B981' : '#6B7280' }]}>
                      {selectedReport.recallInitiated ? 'Yes' : 'No'}
                    </Text>
                    <Text style={[styles.incidentLabel, { color: colors.textSecondary }]}>Recall</Text>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Contact</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.contactRow}>
                    <User size={16} color={colors.primary} />
                    <Text style={[styles.contactName, { color: colors.text }]}>{selectedReport.reportedBy}</Text>
                  </View>
                  <Text style={[styles.contactDetail, { color: colors.textSecondary }]}>{selectedReport.contactPhone}</Text>
                  <Text style={[styles.contactDetail, { color: colors.primary }]}>{selectedReport.contactEmail}</Text>
                </View>

                {selectedReport.fdaResponse && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>FDA Response</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.responseText, { color: colors.text }]}>{selectedReport.fdaResponse}</Text>
                    </View>
                  </>
                )}

                {selectedReport.followUpActions && selectedReport.followUpActions.length > 0 && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Follow-up Actions</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {selectedReport.followUpActions.map((action, index) => (
                        <View key={index} style={styles.actionItem}>
                          <CheckCircle size={14} color="#10B981" />
                          <Text style={[styles.actionItemText, { color: colors.text }]}>{action}</Text>
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
  tabButtonText: { fontSize: 12, fontWeight: '600' as const },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  subSectionTitle: { fontSize: 14, fontWeight: '600' as const, marginTop: 16, marginBottom: 10 },
  portalButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  portalButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
  reportCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  reportHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  reportInfo: { flex: 1 },
  reportNumber: { fontSize: 12, fontWeight: '600' as const, marginBottom: 2 },
  productDescription: { fontSize: 15, fontWeight: '600' as const },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  reportMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 10,
  },
  hazardBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  hazardText: { fontSize: 11, fontWeight: '500' as const },
  metaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  metaText: { fontSize: 11 },
  recallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recallText: { fontSize: 10, fontWeight: '600' as const },
  hazardDescription: { fontSize: 13 },
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
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  requirementHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  requirementIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  requirementTitle: { fontSize: 15, fontWeight: '600' as const },
  requirementText: { fontSize: 13, lineHeight: 20 },
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
  alertCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  alertText: { fontSize: 13, lineHeight: 18 },
  exampleCard: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  exampleIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  exampleContent: { flex: 1 },
  exampleTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 6 },
  exampleText: { fontSize: 13, lineHeight: 18 },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    marginTop: 16,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
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
  detailReportNumber: { fontSize: 14, fontWeight: '600' as const },
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
  hazardDetailText: { fontSize: 14, lineHeight: 20 },
  consequencesTitle: { fontSize: 12, fontWeight: '600' as const },
  consequencesText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  distributionText: { fontSize: 14 },
  incidentsRow: { flexDirection: 'row' as const },
  incidentCard: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  incidentValue: { fontSize: 20, fontWeight: '700' as const },
  incidentLabel: { fontSize: 11, marginTop: 4 },
  contactRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8 },
  contactName: { fontSize: 14, fontWeight: '600' as const },
  contactDetail: { fontSize: 13, marginLeft: 24 },
  responseText: { fontSize: 14, lineHeight: 20 },
  actionItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 8,
  },
  actionItemText: { flex: 1, fontSize: 13 },
});
