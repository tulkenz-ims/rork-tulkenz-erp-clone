import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X,
  ChevronRight,
  ChevronDown,
  Users,
  GitBranch,
  Wrench,
  Package,
  Cloud,
  Briefcase,
  FileText,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react-native';
import {
  useFailureRecordsQuery,
  useRootCauseCategories,
  useRootCauses,
  FailureRecord,
  FailureRecordDB,
  RootCause,
} from '@/hooks/useSupabaseFailureCodes';

type FailureRecordUnion = FailureRecord | FailureRecordDB;

function normalizeFailureRecord(record: FailureRecordUnion): FailureRecord {
  if ('workOrderId' in record) {
    return record as FailureRecord;
  }
  const dbRecord = record as FailureRecordDB;
  return {
    id: dbRecord.id,
    workOrderId: dbRecord.work_order_id || '',
    workOrderNumber: dbRecord.work_order_number || '',
    equipmentId: dbRecord.equipment_id,
    equipmentName: dbRecord.equipment_name,
    failureCodeId: dbRecord.failure_code_id,
    failureCode: dbRecord.failure_code,
    rootCauseId: dbRecord.root_cause_id,
    rootCauseCode: dbRecord.root_cause_code,
    actionTakenId: dbRecord.action_taken_id,
    actionTakenCode: dbRecord.action_taken_code,
    failureDate: dbRecord.failure_date,
    reportedBy: dbRecord.reported_by,
    reportedByName: dbRecord.reported_by_name,
    description: dbRecord.description,
    downtimeHours: dbRecord.downtime_hours,
    repairHours: dbRecord.repair_hours,
    partsCost: dbRecord.parts_cost,
    laborCost: dbRecord.labor_cost,
    fiveWhys: dbRecord.five_whys,
    correctiveActions: dbRecord.corrective_actions,
    preventiveActions: dbRecord.preventive_actions,
    isRecurring: dbRecord.is_recurring,
    previousFailureId: dbRecord.previous_failure_id,
  };
}

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  people: Users,
  process: GitBranch,
  equipment: Wrench,
  material: Package,
  environment: Cloud,
  management: Briefcase,
};

const CATEGORY_COLORS: Record<string, string> = {
  people: '#3B82F6',
  process: '#8B5CF6',
  equipment: '#F59E0B',
  material: '#10B981',
  environment: '#06B6D4',
  management: '#EF4444',
};

export default function RootCauseAnalysisScreen() {
  const { colors } = useTheme();
  const [selectedRecord, setSelectedRecord] = useState<FailureRecord | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['people', 'process']);

  const { data: failureRecords = [], isLoading: loadingRecords } = useFailureRecordsQuery();
  const { data: rootCauseCategories = [] } = useRootCauseCategories();
  const { data: rootCauses = [] } = useRootCauses();

  const getRootCauseById = (id: string): RootCause | undefined => {
    return rootCauses.find(rc => rc.id === id);
  };

  const normalizedRecords = useMemo(() => {
    return failureRecords.map(normalizeFailureRecord);
  }, [failureRecords]);

  const recordsWithRCA = useMemo(() => {
    return normalizedRecords.filter(r => r.fiveWhys && r.fiveWhys.length > 0);
  }, [normalizedRecords]);

  const rootCauseStats = useMemo(() => {
    const stats: Record<string, number> = {};
    normalizedRecords.forEach(record => {
      if (record.rootCauseId) {
        const rootCause = getRootCauseById(record.rootCauseId);
        if (rootCause) {
          stats[rootCause.category] = (stats[rootCause.category] || 0) + 1;
        }
      }
    });
    return rootCauseCategories.map(cat => ({
      ...cat,
      color: CATEGORY_COLORS[cat.id] || '#6B7280',
      count: stats[cat.id] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [normalizedRecords, rootCauseCategories, rootCauses]);

  const groupedRootCauses = useMemo(() => {
    const groups: Record<string, RootCause[]> = {};
    rootCauseCategories.forEach(cat => {
      groups[cat.id] = rootCauses.filter(rc => rc.category === cat.id);
    });
    return groups;
  }, [rootCauseCategories, rootCauses]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const renderCategoryIcon = (categoryId: string, size: number = 18, color?: string) => {
    const Icon = CATEGORY_ICONS[categoryId] || HelpCircle;
    const categoryColor = CATEGORY_COLORS[categoryId] || colors.textSecondary;
    return <Icon size={size} color={color || categoryColor} />;
  };

  const renderFiveWhysSection = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <HelpCircle size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>5-Whys Methodology</Text>
        </View>
      </View>

      <Text style={[styles.methodologyText, { color: colors.textSecondary }]}>
        The 5-Whys technique is a root cause analysis method that involves asking &quot;Why?&quot; five times 
        to drill down to the underlying cause of a problem.
      </Text>

      <View style={[styles.exampleBox, { backgroundColor: colors.background }]}>
        <Text style={[styles.exampleTitle, { color: colors.text }]}>Example:</Text>
        <View style={styles.whyStep}>
          <View style={[styles.whyNumber, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.whyNumberText}>1</Text>
          </View>
          <Text style={[styles.whyText, { color: colors.textSecondary }]}>
            Why did the machine fail? → Spindle bearings were worn
          </Text>
        </View>
        <View style={styles.whyStep}>
          <View style={[styles.whyNumber, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.whyNumberText}>2</Text>
          </View>
          <Text style={[styles.whyText, { color: colors.textSecondary }]}>
            Why were bearings worn? → Exceeded recommended service life
          </Text>
        </View>
        <View style={styles.whyStep}>
          <View style={[styles.whyNumber, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.whyNumberText}>3</Text>
          </View>
          <Text style={[styles.whyText, { color: colors.textSecondary }]}>
            Why exceeded service life? → PM schedule was not followed
          </Text>
        </View>
        <View style={styles.whyStep}>
          <View style={[styles.whyNumber, { backgroundColor: '#10B981' }]}>
            <Text style={styles.whyNumberText}>4</Text>
          </View>
          <Text style={[styles.whyText, { color: colors.textSecondary }]}>
            Why was PM not followed? → Resource shortage during holiday
          </Text>
        </View>
        <View style={styles.whyStep}>
          <View style={[styles.whyNumber, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.whyNumberText}>5</Text>
          </View>
          <Text style={[styles.whyText, { color: colors.textSecondary }]}>
            Why resource shortage? → No contingency plan for peak vacation
          </Text>
        </View>
        <View style={[styles.rootCauseResult, { backgroundColor: '#3B82F620' }]}>
          <AlertCircle size={16} color="#3B82F6" />
          <Text style={[styles.rootCauseResultText, { color: '#3B82F6' }]}>
            Root Cause: No contingency plan for peak vacation periods
          </Text>
        </View>
      </View>
    </View>
  );

  const renderRootCauseCategories = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <FileText size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Root Cause Categories</Text>
        </View>
      </View>

      <Text style={[styles.categorySubtext, { color: colors.textSecondary }]}>
        Root causes are typically categorized into 6 major areas (6Ms):
      </Text>

      {rootCauseStats.map(category => {
        const isExpanded = expandedCategories.includes(category.id);
        const causes = groupedRootCauses[category.id] || [];

        return (
          <View key={category.id} style={styles.categorySection}>
            <TouchableOpacity 
              style={[styles.categoryHeader, { borderBottomColor: colors.border }]}
              onPress={() => toggleCategory(category.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.categoryIconBox, { backgroundColor: category.color + '20' }]}>
                {renderCategoryIcon(category.id, 18, category.color)}
              </View>
              <View style={styles.categoryHeaderInfo}>
                <Text style={[styles.categoryHeaderName, { color: colors.text }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryHeaderDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {category.description}
                </Text>
              </View>
              {category.count > 0 && (
                <View style={[styles.categoryCountBadge, { backgroundColor: category.color + '15' }]}>
                  <Text style={[styles.categoryCountText, { color: category.color }]}>
                    {category.count}
                  </Text>
                </View>
              )}
              {isExpanded ? (
                <ChevronDown size={18} color={colors.textSecondary} />
              ) : (
                <ChevronRight size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            {isExpanded && causes.length > 0 && (
              <View style={styles.causesList}>
                {causes.map(cause => (
                  <View key={cause.id} style={[styles.causeItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.causeCode, { backgroundColor: colors.background }]}>
                      <Text style={[styles.causeCodeText, { color: colors.primary }]}>{cause.code}</Text>
                    </View>
                    <View style={styles.causeInfo}>
                      <Text style={[styles.causeName, { color: colors.text }]}>{cause.name}</Text>
                      <Text style={[styles.causeDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        {cause.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderCompletedAnalyses = () => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Completed Analyses</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[styles.countBadgeText, { color: '#10B981' }]}>{recordsWithRCA.length}</Text>
        </View>
      </View>

      {recordsWithRCA.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No root cause analyses have been completed yet.
        </Text>
      ) : (
        recordsWithRCA.map(record => (
          <TouchableOpacity
            key={record.id}
            style={[styles.analysisItem, { borderTopColor: colors.border }]}
            onPress={() => setSelectedRecord(record)}
            activeOpacity={0.7}
          >
            <View style={styles.analysisHeader}>
              <Text style={[styles.analysisWO, { color: colors.primary }]}>{record.workOrderNumber}</Text>
              <Text style={[styles.analysisDate, { color: colors.textSecondary }]}>{record.failureDate}</Text>
            </View>
            <Text style={[styles.analysisEquipment, { color: colors.text }]}>{record.equipmentName}</Text>
            <View style={styles.analysisFooter}>
              <View style={[styles.analysisCodeBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.analysisCodeText, { color: colors.textSecondary }]}>
                  {record.failureCode}
                </Text>
              </View>
              {record.rootCauseCode && (
                <View style={styles.rootCauseIndicator}>
                  <ArrowRight size={12} color={colors.textSecondary} />
                  <Text style={[styles.analysisRootCause, { color: '#10B981' }]}>
                    {record.rootCauseCode}
                  </Text>
                </View>
              )}
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderDetailModal = () => {
    if (!selectedRecord) return null;

    const rootCause = selectedRecord.rootCauseId 
      ? getRootCauseById(selectedRecord.rootCauseId) 
      : null;
    const rootCauseCategory = rootCause 
      ? { ...rootCauseCategories.find(c => c.id === rootCause.category), color: CATEGORY_COLORS[rootCause.category] || '#6B7280' }
      : null;

    return (
      <Modal
        visible={!!selectedRecord}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRecord(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setSelectedRecord(null)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Root Cause Analysis</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Work Order</Text>
                <Text style={[styles.detailValue, { color: colors.primary }]}>
                  {selectedRecord.workOrderNumber}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Equipment</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRecord.equipmentName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Failure Code</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRecord.failureCode}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedRecord.failureDate}
                </Text>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Problem Description</Text>
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                {selectedRecord.description}
              </Text>
            </View>

            {selectedRecord.fiveWhys && selectedRecord.fiveWhys.length > 0 && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>5-Whys Analysis</Text>
                {selectedRecord.fiveWhys.map((why, index) => (
                  <View key={index} style={styles.whyStepDetail}>
                    <View style={[styles.whyNumberDetail, { backgroundColor: getWhyColor(index) }]}>
                      <Text style={styles.whyNumberTextDetail}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.whyTextDetail, { color: colors.text }]}>{why}</Text>
                  </View>
                ))}
              </View>
            )}

            {rootCause && rootCauseCategory && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Identified Root Cause</Text>
                <View style={[styles.rootCauseBox, { backgroundColor: rootCauseCategory.color + '10' }]}>
                  <View style={[styles.rootCauseIcon, { backgroundColor: rootCauseCategory.color + '20' }]}>
                    {rootCauseCategory.id && renderCategoryIcon(rootCauseCategory.id, 20, rootCauseCategory.color)}
                  </View>
                  <View style={styles.rootCauseInfo}>
                    <Text style={[styles.rootCauseCategory, { color: rootCauseCategory.color }]}>
                      {rootCauseCategory.name}
                    </Text>
                    <Text style={[styles.rootCauseCode, { color: colors.text }]}>
                      {rootCause.code} - {rootCause.name}
                    </Text>
                    <Text style={[styles.rootCauseDesc, { color: colors.textSecondary }]}>
                      {rootCause.description}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {selectedRecord.correctiveActions && selectedRecord.correctiveActions.length > 0 && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Corrective Actions</Text>
                {selectedRecord.correctiveActions.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    <CheckCircle size={16} color="#10B981" />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

            {selectedRecord.preventiveActions && selectedRecord.preventiveActions.length > 0 && (
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Preventive Actions</Text>
                {selectedRecord.preventiveActions.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    <AlertCircle size={16} color="#3B82F6" />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {renderFiveWhysSection()}
        {renderRootCauseCategories()}
        {renderCompletedAnalyses()}
        <View style={{ height: 20 }} />
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
}

function getWhyColor(index: number): string {
  const colors = ['#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#3B82F6'];
  return colors[index] || '#6B7280';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
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
    marginBottom: 12,
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
  methodologyText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  exampleBox: {
    borderRadius: 10,
    padding: 14,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  whyStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  whyNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  whyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  rootCauseResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  rootCauseResultText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  categorySubtext: {
    fontSize: 13,
    marginBottom: 14,
  },
  categorySection: {
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderInfo: {
    flex: 1,
  },
  categoryHeaderName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryHeaderDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  categoryCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  causesList: {
    paddingLeft: 46,
    paddingBottom: 8,
  },
  causeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  causeCode: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  causeCodeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  causeInfo: {
    flex: 1,
  },
  causeName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  causeDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  analysisItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  analysisWO: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  analysisDate: {
    fontSize: 12,
  },
  analysisEquipment: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  analysisFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  analysisCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  analysisCodeText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  rootCauseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  analysisRootCause: {
    fontSize: 11,
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
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  whyStepDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  whyNumberDetail: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyNumberTextDetail: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  whyTextDetail: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  rootCauseBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 10,
    gap: 12,
  },
  rootCauseIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rootCauseInfo: {
    flex: 1,
  },
  rootCauseCategory: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  rootCauseCode: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  rootCauseDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
