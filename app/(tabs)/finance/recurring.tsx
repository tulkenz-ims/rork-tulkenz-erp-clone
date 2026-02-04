import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Repeat,
  ArrowLeft,
  Plus,
  Calendar,
  Search,
  Filter,
  X,
  Play,
  Pause,
  ChevronRight,
  CheckCircle,
  Trash2,
  Copy,
  FileText,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useRecurringJournalsQuery,
  useUpdateRecurringJournalMutation,
  useRunRecurringJournalMutation,
  useDeleteRecurringJournalMutation,
  useDuplicateRecurringJournalMutation,
  type RecurringJournal,
} from '@/hooks/useSupabaseFinance';
import { RecurringFrequency, RecurringStatus } from '@/constants/financeConstants';

type FilterStatus = 'all' | RecurringStatus;
type FilterFrequency = 'all' | RecurringFrequency;

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const STATUS_CONFIG: Record<RecurringStatus, { color: string; label: string }> = {
  active: { color: '#10B981', label: 'Active' },
  paused: { color: '#F59E0B', label: 'Paused' },
  completed: { color: '#6B7280', label: 'Completed' },
  expired: { color: '#EF4444', label: 'Expired' },
};

const DAY_OF_WEEK_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RecurringJournalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterFrequency, setFilterFrequency] = useState<FilterFrequency>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<RecurringJournal | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: recurringJournals = [], isLoading, refetch, isRefetching } = useRecurringJournalsQuery();
  const updateMutation = useUpdateRecurringJournalMutation();
  const runMutation = useRunRecurringJournalMutation();
  const deleteMutation = useDeleteRecurringJournalMutation();
  const duplicateMutation = useDuplicateRecurringJournalMutation();

  const onRefresh = useCallback(() => {
    console.log('[RecurringJournalsScreen] Refreshing data');
    refetch();
  }, [refetch]);

  const filteredJournals = useMemo(() => {
    return recurringJournals.filter((journal) => {
      const matchesSearch =
        journal.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        journal.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || journal.status === filterStatus;
      const matchesFrequency = filterFrequency === 'all' || journal.frequency === filterFrequency;
      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [recurringJournals, searchQuery, filterStatus, filterFrequency]);

  const stats = useMemo(() => {
    const active = recurringJournals.filter((j) => j.status === 'active').length;
    const paused = recurringJournals.filter((j) => j.status === 'paused').length;
    const totalMonthlyValue = recurringJournals
      .filter((j) => j.status === 'active')
      .reduce((sum, j) => {
        let multiplier = 1;
        switch (j.frequency) {
          case 'daily': multiplier = 30; break;
          case 'weekly': multiplier = 4; break;
          case 'biweekly': multiplier = 2; break;
          case 'monthly': multiplier = 1; break;
          case 'quarterly': multiplier = 1 / 3; break;
          case 'yearly': multiplier = 1 / 12; break;
        }
        return sum + j.totalDebit * multiplier;
      }, 0);
    const upcomingCount = recurringJournals.filter((j) => {
      if (j.status !== 'active') return false;
      const nextRun = new Date(j.nextRunDate);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return nextRun <= weekFromNow;
    }).length;

    return { active, paused, totalMonthlyValue, upcomingCount };
  }, [recurringJournals]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScheduleDescription = (journal: RecurringJournal) => {
    switch (journal.frequency) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return `Every ${DAY_OF_WEEK_LABELS[journal.dayOfWeek || 0]}`;
      case 'biweekly':
        return `Every other ${DAY_OF_WEEK_LABELS[journal.dayOfWeek || 0]}`;
      case 'monthly':
        return `Day ${journal.dayOfMonth} of each month`;
      case 'quarterly':
        return `Quarterly on day ${journal.dayOfMonth}`;
      case 'yearly':
        return `Annually on ${journal.monthOfYear}/${journal.dayOfMonth}`;
      default:
        return journal.frequency;
    }
  };

  const handleToggleStatus = (journal: RecurringJournal) => {
    const newStatus: RecurringStatus = journal.status === 'active' ? 'paused' : 'active';
    console.log('[RecurringJournalsScreen] Toggling status for journal:', journal.id, 'to', newStatus);
    
    updateMutation.mutate(
      { id: journal.id, updates: { status: newStatus } },
      {
        onSuccess: () => {
          if (selectedJournal?.id === journal.id) {
            setSelectedJournal({ ...journal, status: newStatus });
          }
        },
        onError: (error) => {
          console.error('[RecurringJournalsScreen] Error toggling status:', error);
          Alert.alert('Error', 'Failed to update journal status');
        },
      }
    );
  };

  const handleRunNow = (journal: RecurringJournal) => {
    Alert.alert(
      'Run Journal Entry',
      `Are you sure you want to create a journal entry from "${journal.templateName}" now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Now',
          onPress: () => {
            console.log('[RecurringJournalsScreen] Running journal now:', journal.id);
            runMutation.mutate(journal, {
              onSuccess: () => {
                Alert.alert('Success', 'Journal entry created successfully');
              },
              onError: (error) => {
                console.error('[RecurringJournalsScreen] Error running journal:', error);
                Alert.alert('Error', 'Failed to create journal entry');
              },
            });
          },
        },
      ]
    );
  };

  const handleDelete = (journal: RecurringJournal) => {
    Alert.alert(
      'Delete Recurring Journal',
      `Are you sure you want to delete "${journal.templateName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('[RecurringJournalsScreen] Deleting journal:', journal.id);
            deleteMutation.mutate(journal.id, {
              onSuccess: () => {
                setShowDetailModal(false);
                setSelectedJournal(null);
              },
              onError: (error) => {
                console.error('[RecurringJournalsScreen] Error deleting journal:', error);
                Alert.alert('Error', 'Failed to delete recurring journal');
              },
            });
          },
        },
      ]
    );
  };

  const handleDuplicate = (journal: RecurringJournal) => {
    console.log('[RecurringJournalsScreen] Duplicating journal:', journal.id);
    duplicateMutation.mutate(journal, {
      onSuccess: () => {
        Alert.alert('Success', 'Recurring journal duplicated successfully');
      },
      onError: (error) => {
        console.error('[RecurringJournalsScreen] Error duplicating journal:', error);
        Alert.alert('Error', 'Failed to duplicate recurring journal');
      },
    });
  };

  const openDetail = (journal: RecurringJournal) => {
    setSelectedJournal(journal);
    setShowDetailModal(true);
  };

  const renderStatCard = (label: string, value: string | number, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const renderJournalCard = (journal: RecurringJournal) => {
    const statusConfig = STATUS_CONFIG[journal.status];

    return (
      <TouchableOpacity
        key={journal.id}
        style={[styles.journalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openDetail(journal)}
        activeOpacity={0.7}
      >
        <View style={styles.journalHeader}>
          <View style={styles.journalTitleRow}>
            <View style={[styles.frequencyBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Repeat size={14} color={colors.primary} />
              <Text style={[styles.frequencyText, { color: colors.primary }]}>
                {FREQUENCY_LABELS[journal.frequency]}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.journalName, { color: colors.text }]}>{journal.templateName}</Text>
          <Text style={[styles.journalDescription, { color: colors.textSecondary }]} numberOfLines={1}>
            {journal.description}
          </Text>
        </View>

        <View style={[styles.journalDivider, { backgroundColor: colors.border }]} />

        <View style={styles.journalDetails}>
          <View style={styles.journalDetailRow}>
            <View style={styles.journalDetailItem}>
              <DollarSign size={14} color={colors.textSecondary} />
              <Text style={[styles.journalDetailLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.journalDetailValue, { color: colors.text }]}>
                {formatCurrency(journal.totalDebit)}
              </Text>
            </View>
            <View style={styles.journalDetailItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.journalDetailLabel, { color: colors.textSecondary }]}>Next Run</Text>
              <Text style={[styles.journalDetailValue, { color: colors.text }]}>
                {formatDate(journal.nextRunDate)}
              </Text>
            </View>
            <View style={styles.journalDetailItem}>
              <CheckCircle size={14} color={colors.textSecondary} />
              <Text style={[styles.journalDetailLabel, { color: colors.textSecondary }]}>Runs</Text>
              <Text style={[styles.journalDetailValue, { color: colors.text }]}>
                {journal.runCount}{journal.maxRuns ? `/${journal.maxRuns}` : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.journalActions}>
          {journal.status === 'active' ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
              onPress={(e) => {
                e.stopPropagation();
                handleRunNow(journal);
              }}
            >
              <Play size={16} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>Run Now</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: `#10B98115` }]}
              onPress={(e) => {
                e.stopPropagation();
                handleToggleStatus(journal);
              }}
            >
              <Play size={16} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Resume</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              openDetail(journal);
            }}
          >
            <ChevronRight size={16} color={colors.textSecondary} />
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedJournal) return null;
    const statusConfig = STATUS_CONFIG[selectedJournal.status];

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Recurring Journal</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIconContainer, { backgroundColor: `${colors.primary}15` }]}>
                  <Repeat size={28} color={colors.primary} />
                </View>
                <View style={styles.detailHeaderText}>
                  <Text style={[styles.detailName, { color: colors.text }]}>{selectedJournal.templateName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                {selectedJournal.description}
              </Text>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule</Text>
              <View style={styles.scheduleGrid}>
                <View style={styles.scheduleItem}>
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Frequency</Text>
                  <Text style={[styles.scheduleValue, { color: colors.text }]}>
                    {FREQUENCY_LABELS[selectedJournal.frequency]}
                  </Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Pattern</Text>
                  <Text style={[styles.scheduleValue, { color: colors.text }]}>
                    {getScheduleDescription(selectedJournal)}
                  </Text>
                </View>
                <View style={styles.scheduleItem}>
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Start Date</Text>
                  <Text style={[styles.scheduleValue, { color: colors.text }]}>
                    {formatDate(selectedJournal.startDate)}
                  </Text>
                </View>
                {selectedJournal.endDate && (
                  <View style={styles.scheduleItem}>
                    <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>End Date</Text>
                    <Text style={[styles.scheduleValue, { color: colors.text }]}>
                      {formatDate(selectedJournal.endDate)}
                    </Text>
                  </View>
                )}
                <View style={styles.scheduleItem}>
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Next Run</Text>
                  <Text style={[styles.scheduleValue, { color: colors.primary }]}>
                    {formatDate(selectedJournal.nextRunDate)}
                  </Text>
                </View>
                {selectedJournal.lastRunDate && (
                  <View style={styles.scheduleItem}>
                    <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Last Run</Text>
                    <Text style={[styles.scheduleValue, { color: colors.text }]}>
                      {formatDate(selectedJournal.lastRunDate)}
                    </Text>
                  </View>
                )}
                <View style={styles.scheduleItem}>
                  <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Run Count</Text>
                  <Text style={[styles.scheduleValue, { color: colors.text }]}>
                    {selectedJournal.runCount}{selectedJournal.maxRuns ? ` of ${selectedJournal.maxRuns}` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Journal Entry Lines</Text>
              <View style={styles.linesContainer}>
                {selectedJournal.lines.map((line, index) => (
                  <View
                    key={line.id}
                    style={[
                      styles.lineItem,
                      { borderBottomColor: colors.border },
                      index === selectedJournal.lines.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.lineHeader}>
                      <Text style={[styles.lineAccount, { color: colors.text }]}>
                        {line.accountNumber} - {line.accountName}
                      </Text>
                    </View>
                    {line.memo && (
                      <Text style={[styles.lineMemo, { color: colors.textSecondary }]}>{line.memo}</Text>
                    )}
                    <View style={styles.lineAmounts}>
                      <View style={styles.lineAmount}>
                        <Text style={[styles.lineAmountLabel, { color: colors.textSecondary }]}>Debit</Text>
                        <Text style={[styles.lineAmountValue, { color: line.debit > 0 ? '#10B981' : colors.textSecondary }]}>
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </Text>
                      </View>
                      <View style={styles.lineAmount}>
                        <Text style={[styles.lineAmountLabel, { color: colors.textSecondary }]}>Credit</Text>
                        <Text style={[styles.lineAmountValue, { color: line.credit > 0 ? '#EF4444' : colors.textSecondary }]}>
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                  <View style={styles.lineAmounts}>
                    <Text style={[styles.totalValue, { color: '#10B981' }]}>
                      {formatCurrency(selectedJournal.totalDebit)}
                    </Text>
                    <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                      {formatCurrency(selectedJournal.totalCredit)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>
              <View style={styles.modalActions}>
                {selectedJournal.status === 'active' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.modalAction, { backgroundColor: `${colors.primary}15` }]}
                      onPress={() => handleRunNow(selectedJournal)}
                    >
                      <Play size={20} color={colors.primary} />
                      <Text style={[styles.modalActionText, { color: colors.primary }]}>Run Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalAction, { backgroundColor: '#F59E0B15' }]}
                      onPress={() => handleToggleStatus(selectedJournal)}
                    >
                      <Pause size={20} color="#F59E0B" />
                      <Text style={[styles.modalActionText, { color: '#F59E0B' }]}>Pause</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalAction, { backgroundColor: '#10B98115' }]}
                    onPress={() => handleToggleStatus(selectedJournal)}
                  >
                    <Play size={20} color="#10B981" />
                    <Text style={[styles.modalActionText, { color: '#10B981' }]}>Resume</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalAction, { backgroundColor: colors.border }]}
                  onPress={() => handleDuplicate(selectedJournal)}
                >
                  <Copy size={20} color={colors.textSecondary} />
                  <Text style={[styles.modalActionText, { color: colors.textSecondary }]}>Duplicate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalAction, { backgroundColor: '#EF444415' }]}
                  onPress={() => handleDelete(selectedJournal)}
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Metadata</Text>
              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>Created By</Text>
                  <Text style={[styles.metadataValue, { color: colors.text }]}>{selectedJournal.createdBy}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>Created At</Text>
                  <Text style={[styles.metadataValue, { color: colors.text }]}>
                    {formatDate(selectedJournal.createdAt)}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>Last Updated</Text>
                  <Text style={[styles.metadataValue, { color: colors.text }]}>
                    {formatDate(selectedJournal.updatedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIconContainer, { backgroundColor: '#8B5CF615' }]}>
              <Repeat size={32} color="#8B5CF6" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Recurring Journals</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Automate repetitive entries
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {renderStatCard('Active', stats.active, '#10B981')}
          {renderStatCard('Paused', stats.paused, '#F59E0B')}
          {renderStatCard('Due Soon', stats.upcomingCount, colors.primary)}
          {renderStatCard('Monthly Est.', formatCurrency(stats.totalMonthlyValue), '#8B5CF6')}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search recurring journals..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={[styles.filterButton, showFilters && { backgroundColor: `${colors.primary}15` }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={showFilters ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={[styles.filtersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'active', 'paused', 'completed', 'expired'] as FilterStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border },
                    filterStatus === status && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: filterStatus === status ? '#fff' : colors.text },
                    ]}
                  >
                    {status === 'all' ? 'All' : STATUS_CONFIG[status as RecurringStatus].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { color: colors.text, marginTop: 12 }]}>Frequency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] as FilterFrequency[]).map(
                (freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.border },
                      filterFrequency === freq && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFilterFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: filterFrequency === freq ? '#fff' : colors.text },
                      ]}
                    >
                      {freq === 'all' ? 'All' : FREQUENCY_LABELS[freq as RecurringFrequency]}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>
            Templates ({filteredJournals.length})
          </Text>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>New Template</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>Loading journals...</Text>
          </View>
        ) : filteredJournals.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No recurring journals found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery || filterStatus !== 'all' || filterFrequency !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first recurring journal template'}
            </Text>
          </View>
        ) : (
          <View style={styles.journalsList}>{filteredJournals.map(renderJournalCard)}</View>
        )}

        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back to Finance</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
  },
  filtersCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  filterScroll: {
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  journalsList: {
    gap: 12,
  },
  journalCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  journalHeader: {
    padding: 16,
  },
  journalTitleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  frequencyBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  journalName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  journalDescription: {
    fontSize: 13,
  },
  journalDivider: {
    height: 1,
  },
  journalDetails: {
    padding: 14,
  },
  journalDetailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  journalDetailItem: {
    alignItems: 'center' as const,
    flex: 1,
    gap: 4,
  },
  journalDetailLabel: {
    fontSize: 11,
  },
  journalDetailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  journalActions: {
    flexDirection: 'row' as const,
    padding: 12,
    paddingTop: 0,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  backButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 14,
  },
  detailHeaderText: {
    flex: 1,
    gap: 8,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  scheduleLabel: {
    fontSize: 14,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  linesContainer: {
    gap: 0,
  },
  lineItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lineHeader: {
    marginBottom: 4,
  },
  lineAccount: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  lineMemo: {
    fontSize: 13,
    marginBottom: 8,
  },
  lineAmounts: {
    flexDirection: 'row' as const,
    gap: 24,
  },
  lineAmount: {
    flex: 1,
  },
  lineAmountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  lineAmountValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  totalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 12,
    borderTopWidth: 2,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    width: 100,
  },
  modalActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  modalAction: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    minWidth: '45%' as any,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  metadataLabel: {
    fontSize: 14,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
