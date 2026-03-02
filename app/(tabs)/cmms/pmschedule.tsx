import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  Plus,
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Cog,
  User,
  X,
  Play,
  Pause,
  Wrench,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  usePMSchedulesQuery,
  usePMComplianceMetrics,
  type ExtendedPMSchedule,
  type PMFrequency,
  type PMPriority,
} from '@/hooks/useSupabasePMSchedules';
import * as Haptics from 'expo-haptics';
import PinSignatureCapture from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';

type StatusFilter = 'all' | 'active' | 'inactive';
type FrequencyFilter = PMFrequency | 'all';
type PriorityFilter = PMPriority | 'all';

const FREQUENCY_LABELS: Record<PMFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

const PRIORITY_CONFIG: Record<PMPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#10B981' },
  medium: { label: 'Medium', color: '#3B82F6' },
  high: { label: 'High', color: '#F59E0B' },
  critical: { label: 'Critical', color: '#EF4444' },
};

export default function PMScheduleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const { data: pmSchedules = [], refetch } = usePMSchedulesQuery();
  const { data: complianceMetrics } = usePMComplianceMetrics();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Generate WO state
  const [showGenerateWOModal, setShowGenerateWOModal] = useState(false);
  const [selectedPMForGenerate, setSelectedPMForGenerate] = useState<ExtendedPMSchedule | null>(null);
  const [generateSignature, setGenerateSignature] = useState<SignatureVerification | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredSchedules = useMemo(() => {
    return pmSchedules.filter(pm => {
      const matchesSearch = searchQuery === '' ||
        pm.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pm.equipment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pm.equipment_tag?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && pm.active) ||
        (statusFilter === 'inactive' && !pm.active);
      const matchesFrequency = frequencyFilter === 'all' || pm.frequency === frequencyFilter;
      const matchesPriority = priorityFilter === 'all' || pm.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesFrequency && matchesPriority;
    });
  }, [pmSchedules, searchQuery, statusFilter, frequencyFilter, priorityFilter]);

  const stats = useMemo(() => {
    if (complianceMetrics) {
      return {
        total: complianceMetrics.totalSchedules,
        active: pmSchedules.filter(pm => pm.active).length,
        upcomingWeek: pmSchedules.filter(pm => {
          if (!pm.next_due) return false;
          const dueDate = new Date(pm.next_due);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilDue >= 0 && daysUntilDue <= 7 && pm.active;
        }).length,
        overdue: complianceMetrics.overdue,
      };
    }
    const now = new Date();
    const upcoming = pmSchedules.filter(pm => {
      if (!pm.next_due) return false;
      const dueDate = new Date(pm.next_due);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7 && pm.active;
    });
    const overdue = pmSchedules.filter(pm => {
      if (!pm.next_due) return false;
      const dueDate = new Date(pm.next_due);
      return dueDate < now && pm.active;
    });
    
    return {
      total: pmSchedules.length,
      active: pmSchedules.filter(pm => pm.active).length,
      upcomingWeek: upcoming.length,
      overdue: overdue.length,
    };
  }, [pmSchedules, complianceMetrics]);

  const handleSchedulePress = useCallback((scheduleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/cmms/pmtemplates?id=${scheduleId}&mode=edit`);
  }, [router]);

  const handleAddSchedule = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/cmms/pmtemplates?mode=new');
  }, [router]);

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setFrequencyFilter('all');
    setPriorityFilter('all');
    setSearchQuery('');
  }, []);

  const hasActiveFilters = statusFilter !== 'all' || frequencyFilter !== 'all' || priorityFilter !== 'all';

  const getDaysUntilDue = (nextDue: string | null | undefined) => {
    if (!nextDue) return 999;
    const now = new Date();
    const dueDate = new Date(nextDue);
    return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ── Generate WO handlers ──
  const handleOpenGenerateWO = useCallback((pm: ExtendedPMSchedule) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPMForGenerate(pm);
    setGenerateSignature(null);
    setShowGenerateWOModal(true);
  }, []);

  const handleGenerateWO = useCallback(async () => {
    if (!selectedPMForGenerate) return;
    if (!generateSignature) {
      Alert.alert('Signature Required', 'Please verify your identity with PPN before generating a work order.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/pm/generate-wo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pm_schedule_id: selectedPMForGenerate.id,
          triggered_by_name: generateSignature.employeeName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate work order');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Work Order Generated',
        `${data.work_order.work_order_number} has been created for "${selectedPMForGenerate.name}".\n\nTask Feed: ${data.task_feed_post.post_number}\nDepartments notified: ${data.departments_notified}`,
        [{ text: 'OK' }]
      );

      setShowGenerateWOModal(false);
      setSelectedPMForGenerate(null);
      setGenerateSignature(null);
      
      // Refresh to show updated next_due
      await refetch();

    } catch (error: any) {
      console.error('[PMSchedule] Generate WO error:', error);
      Alert.alert('Error', error.message || 'Failed to generate work order. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedPMForGenerate, generateSignature, refetch]);

  const renderScheduleCard = useCallback((item: ExtendedPMSchedule) => {
    const priorityConfig = PRIORITY_CONFIG[item.priority as PMPriority] || PRIORITY_CONFIG.medium;
    const daysUntilDue = getDaysUntilDue(item.next_due);
    const tasks = ((item as unknown as { tasks?: Array<{ id: string; description: string; required: boolean; order: number }> }).tasks || []);
    const frequency = item.frequency as PMFrequency;
    const isOverdue = daysUntilDue < 0;
    const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.scheduleCard,
          { 
            backgroundColor: colors.surface, 
            borderColor: isOverdue ? '#EF4444' : isDueSoon ? '#F59E0B' : colors.border,
            borderWidth: isOverdue || isDueSoon ? 2 : 1,
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => handleSchedulePress(item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.scheduleIcon, { backgroundColor: priorityConfig.color + '15' }]}>
            <Calendar size={24} color={priorityConfig.color} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.scheduleName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.equipmentRow}>
              <Cog size={12} color={colors.textSecondary} />
              <Text style={[styles.equipmentText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.equipment_name || 'Unknown'} ({item.equipment_tag || 'N/A'})
              </Text>
            </View>
          </View>
          <View style={styles.statusIndicator}>
            {item.active ? (
              <Play size={16} color="#10B981" />
            ) : (
              <Pause size={16} color="#6B7280" />
            )}
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {FREQUENCY_LABELS[frequency] || frequency} • Est. {item.estimated_hours || 1}h
            </Text>
          </View>
          
          {item.assigned_name && (
            <View style={styles.infoRow}>
              <User size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {item.assigned_name}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <CheckCircle size={14} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {tasks.length} tasks • {tasks.filter(t => t.required).length} required
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '15' }]}>
            <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
              {priorityConfig.label}
            </Text>
          </View>
          
          <View style={[styles.frequencyBadge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.frequencyText, { color: colors.text }]}>
              {FREQUENCY_LABELS[frequency] || frequency}
            </Text>
          </View>

          <View style={[
            styles.dueBadge, 
            { backgroundColor: isOverdue ? '#EF444415' : isDueSoon ? '#F59E0B15' : '#10B98115' }
          ]}>
            {isOverdue ? (
              <AlertTriangle size={12} color="#EF4444" />
            ) : isDueSoon ? (
              <Clock size={12} color="#F59E0B" />
            ) : (
              <CheckCircle size={12} color="#10B981" />
            )}
            <Text style={[
              styles.dueText, 
              { color: isOverdue ? '#EF4444' : isDueSoon ? '#F59E0B' : '#10B981' }
            ]}>
              {isOverdue 
                ? `${Math.abs(daysUntilDue)}d overdue` 
                : daysUntilDue === 0 
                  ? 'Due today'
                  : `Due in ${daysUntilDue}d`}
            </Text>
          </View>
        </View>

        {/* Generate WO Button */}
        {item.active && (
          <Pressable
            style={[styles.generateWOButton, { backgroundColor: '#8B5CF6' }]}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenGenerateWO(item);
            }}
          >
            <Wrench size={16} color="#FFFFFF" />
            <Text style={styles.generateWOButtonText}>Generate Work Order</Text>
          </Pressable>
        )}
      </Pressable>
    );
  }, [colors, handleSchedulePress, handleOpenGenerateWO]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search PM schedules..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[
            styles.filterButton,
            { 
              backgroundColor: hasActiveFilters ? colors.primary + '15' : colors.surface, 
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(true);
          }}
        >
          <Filter size={18} color={hasActiveFilters ? colors.primary : colors.textSecondary} />
          <Text style={[styles.filterButtonText, { color: hasActiveFilters ? colors.primary : colors.text }]}>
            Filters {hasActiveFilters && `(${[statusFilter !== 'all', frequencyFilter !== 'all', priorityFilter !== 'all'].filter(Boolean).length})`}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddSchedule}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add PM</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.upcomingWeek}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Week</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.overdue}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
        </View>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {filteredSchedules.length > 0 ? (
          filteredSchedules.map(renderScheduleCard)
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No PM Schedules Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || hasActiveFilters 
                ? 'Try adjusting your search or filters'
                : 'Create a PM schedule to get started'}
            </Text>
            {hasActiveFilters && (
              <Pressable style={[styles.clearButton, { backgroundColor: colors.primary }]} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFilters(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Status</Text>
              <View style={styles.filterOptions}>
                {(['all', 'active', 'inactive'] as StatusFilter[]).map(status => (
                  <Pressable
                    key={status}
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: statusFilter === status ? colors.primary : colors.backgroundSecondary,
                        borderColor: statusFilter === status ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: statusFilter === status ? '#FFFFFF' : colors.text },
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Priority</Text>
              <View style={styles.filterOptions}>
                {(['all', 'critical', 'high', 'medium', 'low'] as (PriorityFilter)[]).map(priority => (
                  <Pressable
                    key={priority}
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: priorityFilter === priority ? colors.primary : colors.backgroundSecondary,
                        borderColor: priorityFilter === priority ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setPriorityFilter(priority)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: priorityFilter === priority ? '#FFFFFF' : colors.text },
                    ]}>
                      {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Frequency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterOptions}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { 
                        backgroundColor: frequencyFilter === 'all' ? colors.primary : colors.backgroundSecondary,
                        borderColor: frequencyFilter === 'all' ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setFrequencyFilter('all')}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: frequencyFilter === 'all' ? '#FFFFFF' : colors.text },
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {(Object.keys(FREQUENCY_LABELS) as PMFrequency[]).map(freq => (
                    <Pressable
                      key={freq}
                      style={[
                        styles.filterChip,
                        { 
                          backgroundColor: frequencyFilter === freq ? colors.primary : colors.backgroundSecondary,
                          borderColor: frequencyFilter === freq ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setFrequencyFilter(freq)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: frequencyFilter === freq ? '#FFFFFF' : colors.text },
                      ]}>
                        {FREQUENCY_LABELS[freq]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Clear All</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Generate Work Order Modal with PPN Signature */}
      <Modal
        visible={showGenerateWOModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isGenerating) {
            setShowGenerateWOModal(false);
            setSelectedPMForGenerate(null);
            setGenerateSignature(null);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isGenerating) {
              setShowGenerateWOModal(false);
              setSelectedPMForGenerate(null);
              setGenerateSignature(null);
            }
          }}
        >
          <Pressable style={[styles.generateModalContent, { backgroundColor: colors.surface }]} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Generate Work Order</Text>
              <Pressable
                onPress={() => {
                  if (!isGenerating) {
                    setShowGenerateWOModal(false);
                    setSelectedPMForGenerate(null);
                    setGenerateSignature(null);
                  }
                }}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.generateModalBody} showsVerticalScrollIndicator={false}>
              {selectedPMForGenerate && (
                <>
                  {/* PM Summary */}
                  <View style={[styles.pmSummaryCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <View style={styles.pmSummaryHeader}>
                      <Calendar size={20} color="#8B5CF6" />
                      <Text style={[styles.pmSummaryTitle, { color: colors.text }]} numberOfLines={2}>
                        {selectedPMForGenerate.name}
                      </Text>
                    </View>
                    <View style={styles.pmSummaryDetails}>
                      <View style={styles.pmSummaryRow}>
                        <Cog size={14} color={colors.textSecondary} />
                        <Text style={[styles.pmSummaryText, { color: colors.textSecondary }]}>
                          {selectedPMForGenerate.equipment_name || 'N/A'} ({selectedPMForGenerate.equipment_tag || 'N/A'})
                        </Text>
                      </View>
                      <View style={styles.pmSummaryRow}>
                        <Clock size={14} color={colors.textSecondary} />
                        <Text style={[styles.pmSummaryText, { color: colors.textSecondary }]}>
                          {FREQUENCY_LABELS[selectedPMForGenerate.frequency as PMFrequency] || selectedPMForGenerate.frequency} • Est. {selectedPMForGenerate.estimated_hours || 1}h
                        </Text>
                      </View>
                      {selectedPMForGenerate.assigned_name && (
                        <View style={styles.pmSummaryRow}>
                          <User size={14} color={colors.textSecondary} />
                          <Text style={[styles.pmSummaryText, { color: colors.textSecondary }]}>
                            Assigned: {selectedPMForGenerate.assigned_name}
                          </Text>
                        </View>
                      )}
                      <View style={styles.pmSummaryRow}>
                        <CheckCircle size={14} color={colors.textSecondary} />
                        <Text style={[styles.pmSummaryText, { color: colors.textSecondary }]}>
                          {((selectedPMForGenerate as any).tasks || []).length} tasks
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.pmSummaryBadgeRow]}>
                      <View style={[styles.pmSummaryBadge, { backgroundColor: (PRIORITY_CONFIG[selectedPMForGenerate.priority as PMPriority] || PRIORITY_CONFIG.medium).color + '15' }]}>
                        <Text style={[styles.pmSummaryBadgeText, { color: (PRIORITY_CONFIG[selectedPMForGenerate.priority as PMPriority] || PRIORITY_CONFIG.medium).color }]}>
                          {(PRIORITY_CONFIG[selectedPMForGenerate.priority as PMPriority] || PRIORITY_CONFIG.medium).label} Priority
                        </Text>
                      </View>
                      <View style={[styles.pmSummaryBadge, { backgroundColor: '#8B5CF615' }]}>
                        <Text style={[styles.pmSummaryBadgeText, { color: '#8B5CF6' }]}>
                          Preventive
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* What will happen */}
                  <View style={[styles.generateInfoCard, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF640' }]}>
                    <Wrench size={18} color="#8B5CF6" />
                    <View style={styles.generateInfoContent}>
                      <Text style={[styles.generateInfoTitle, { color: '#8B5CF6' }]}>This will:</Text>
                      <Text style={[styles.generateInfoText, { color: colors.textSecondary }]}>
                        • Create a PM Work Order (WO-PM-...){'\n'}
                        • Post to Task Feed with linked WO{'\n'}
                        • Send to assigned department inboxes{'\n'}
                        • Advance next due date to {FREQUENCY_LABELS[selectedPMForGenerate.frequency as PMFrequency] || selectedPMForGenerate.frequency} schedule
                      </Text>
                    </View>
                  </View>

                  {/* PPN Signature */}
                  <View style={styles.signatureSection}>
                    <Text style={[styles.signatureSectionTitle, { color: colors.text }]}>
                      Authorization Required
                    </Text>
                    <Text style={[styles.signatureSectionHint, { color: colors.textSecondary }]}>
                      Verify your identity with PPN to authorize this work order
                    </Text>
                    <PinSignatureCapture
                      onVerified={(verification) => setGenerateSignature(verification)}
                      onCleared={() => setGenerateSignature(null)}
                      formLabel="Generate PM Work Order"
                      existingVerification={generateSignature}
                      required={true}
                      accentColor="#8B5CF6"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={[styles.generateModalFooter, { borderTopColor: colors.border }]}>
              <Pressable
                style={[styles.generateModalButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => {
                  if (!isGenerating) {
                    setShowGenerateWOModal(false);
                    setSelectedPMForGenerate(null);
                    setGenerateSignature(null);
                  }
                }}
                disabled={isGenerating}
              >
                <Text style={[styles.generateModalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.generateModalButton,
                  { backgroundColor: generateSignature && !isGenerating ? '#8B5CF6' : colors.border },
                ]}
                onPress={handleGenerateWO}
                disabled={!generateSignature || isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Wrench size={18} color="#FFFFFF" />
                    <Text style={[styles.generateModalButtonText, { color: '#FFFFFF' }]}>Generate WO</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginLeft: 'auto',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  scheduleCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  equipmentText: {
    fontSize: 12,
    flex: 1,
  },
  statusIndicator: {
    marginRight: 8,
  },
  cardBody: {
    gap: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  frequencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    marginLeft: 'auto',
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  generateWOButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  generateWOButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  // Generate WO Modal styles
  generateModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  generateModalBody: {
    paddingHorizontal: 20,
    maxHeight: 500,
  },
  pmSummaryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  pmSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pmSummaryTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },
  pmSummaryDetails: {
    gap: 8,
    marginBottom: 12,
  },
  pmSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pmSummaryText: {
    fontSize: 13,
    flex: 1,
  },
  pmSummaryBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pmSummaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pmSummaryBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  generateInfoCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  generateInfoContent: {
    flex: 1,
  },
  generateInfoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  generateInfoText: {
    fontSize: 13,
    lineHeight: 22,
  },
  signatureSection: {
    marginBottom: 20,
  },
  signatureSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  signatureSectionHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  generateModalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  generateModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  generateModalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
