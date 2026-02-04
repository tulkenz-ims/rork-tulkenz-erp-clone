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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  FileX,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronRight,
  Calendar,
  User,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseQuality, NCRRecord, NCRStatus, NCRSeverity, NCRSource, NCRType } from '@/hooks/useSupabaseQuality';
import * as Haptics from 'expo-haptics';

const SEVERITY_CONFIG: Record<NCRSeverity, { label: string; color: string; bgColor: string }> = {
  minor: { label: 'Minor', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  major: { label: 'Major', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  critical: { label: 'Critical', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.2)' },
};

const STATUS_CONFIG: Record<NCRStatus, { label: string; color: string; icon: typeof AlertCircle }> = {
  open: { label: 'Open', color: '#EF4444', icon: AlertCircle },
  investigation: { label: 'Investigation', color: '#F59E0B', icon: Search },
  containment: { label: 'Containment', color: '#8B5CF6', icon: Clock },
  root_cause: { label: 'Root Cause', color: '#EC4899', icon: Search },
  corrective_action: { label: 'Corrective Action', color: '#3B82F6', icon: Clock },
  verification: { label: 'Verification', color: '#06B6D4', icon: CheckCircle },
  closed: { label: 'Closed', color: '#10B981', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#6B7280', icon: X },
};

const NCR_TYPES: { value: NCRType; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'process', label: 'Process' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
  { value: 'regulatory', label: 'Regulatory' },
];

const NCR_SOURCES: { value: NCRSource; label: string }[] = [
  { value: 'incoming_inspection', label: 'Incoming Inspection' },
  { value: 'in_process', label: 'In-Process' },
  { value: 'final_inspection', label: 'Final Inspection' },
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'audit', label: 'Audit' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'internal', label: 'Internal' },
  { value: 'other', label: 'Other' },
];

const LOCATIONS = ['Production Line A', 'Production Line B', 'Packaging Line 1', 'Packaging Line 2', 'Mixing Area', 'Cold Storage', 'Receiving', 'Warehouse'];

export default function NCRScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const {
    ncrs,
    isLoading,
    createNCR,
    updateNCR,
    generateNCRNumber,
    refetch,
  } = useSupabaseQuality();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<NCRStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNCR, setSelectedNCR] = useState<NCRRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newNCR, setNewNCR] = useState({
    title: '',
    description: '',
    ncr_type: 'product' as NCRType,
    severity: 'minor' as NCRSeverity,
    source: 'in_process' as NCRSource,
    location: '',
    containment_actions: '',
    product_name: '',
    lot_number: '',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredNCRs = useMemo(() => {
    return ncrs.filter(ncr => {
      const matchesSearch = !searchQuery || 
        ncr.ncr_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ncr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ncr.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = !statusFilter || ncr.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ncrs, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    open: ncrs.filter(n => n.status === 'open').length,
    investigation: ncrs.filter(n => n.status === 'investigation' || n.status === 'containment' || n.status === 'root_cause').length,
    corrective_action: ncrs.filter(n => n.status === 'corrective_action' || n.status === 'verification').length,
    closed: ncrs.filter(n => n.status === 'closed').length,
  }), [ncrs]);

  const handleAddNCR = useCallback(async () => {
    if (!newNCR.title || !newNCR.description) {
      Alert.alert('Required Fields', 'Please fill in title and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ncrNumber = generateNCRNumber();
      const today = new Date().toISOString().split('T')[0];
      
      await createNCR({
        ncr_number: ncrNumber,
        title: newNCR.title,
        description: newNCR.description,
        ncr_type: newNCR.ncr_type,
        severity: newNCR.severity,
        status: 'open',
        source: newNCR.source,
        location: newNCR.location || null,
        product_name: newNCR.product_name || null,
        lot_number: newNCR.lot_number || null,
        containment_actions: newNCR.containment_actions || null,
        discovered_date: today,
        discovered_by: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        discovered_by_id: user?.id || null,
        assigned_to: null,
        assigned_to_id: null,
        facility_id: null,
        department_code: null,
        department_name: null,
        product_code: null,
        quantity_affected: null,
        unit_of_measure: null,
        root_cause: null,
        root_cause_category: null,
        containment_date: null,
        corrective_actions: null,
        corrective_action_date: null,
        preventive_actions: null,
        verification_method: null,
        verification_date: null,
        verified_by: null,
        verified_by_id: null,
        disposition: null,
        disposition_notes: null,
        cost_impact: null,
        customer_notified: false,
        customer_notification_date: null,
        capa_required: false,
        capa_id: null,
        attachments: [],
        closed_date: null,
        closed_by: null,
        closed_by_id: null,
        notes: null,
      });

      setShowAddModal(false);
      setNewNCR({
        title: '',
        description: '',
        ncr_type: 'product',
        severity: 'minor',
        source: 'in_process',
        location: '',
        containment_actions: '',
        product_name: '',
        lot_number: '',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[NCR] Created new NCR:', ncrNumber);
    } catch (error) {
      console.error('[NCR] Error creating NCR:', error);
      Alert.alert('Error', 'Failed to create NCR. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newNCR, createNCR, generateNCRNumber, user]);

  const handleStatusChange = useCallback(async (ncr: NCRRecord, newStatus: NCRStatus) => {
    try {
      const updates: Partial<NCRRecord> & { id: string } = {
        id: ncr.id,
        status: newStatus,
      };

      if (newStatus === 'closed') {
        updates.closed_date = new Date().toISOString().split('T')[0];
        updates.closed_by = user ? `${user.first_name} ${user.last_name}` : 'Unknown';
        updates.closed_by_id = user?.id || null;
      }

      await updateNCR(updates);
      setSelectedNCR(prev => prev ? { ...prev, status: newStatus } : null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('[NCR] Status changed:', ncr.ncr_number, '->', newStatus);
    } catch (error) {
      console.error('[NCR] Error updating status:', error);
      Alert.alert('Error', 'Failed to update status.');
    }
  }, [updateNCR, user]);

  const openDetail = useCallback((ncr: NCRRecord) => {
    setSelectedNCR(ncr);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderNCRCard = useCallback((ncr: NCRRecord) => {
    const severityConfig = SEVERITY_CONFIG[ncr.severity];
    const statusConfig = STATUS_CONFIG[ncr.status];
    const StatusIcon = statusConfig.icon;

    return (
      <Pressable
        key={ncr.id}
        style={({ pressed }) => [
          styles.ncrCard,
          { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={() => openDetail(ncr)}
      >
        <View style={styles.ncrHeader}>
          <View style={styles.ncrTitleRow}>
            <Text style={[styles.ncrNumber, { color: colors.text }]}>{ncr.ncr_number}</Text>
            <View style={[styles.severityBadge, { backgroundColor: severityConfig.bgColor }]}>
              <Text style={[styles.severityText, { color: severityConfig.color }]}>
                {severityConfig.label}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <StatusIcon size={12} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <Text style={[styles.ncrTitle, { color: colors.text }]} numberOfLines={1}>
          {ncr.title}
        </Text>

        <Text style={[styles.ncrDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {ncr.description}
        </Text>

        <View style={styles.ncrMeta}>
          <View style={styles.metaItem}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{ncr.discovered_date}</Text>
          </View>
          {ncr.location && (
            <View style={styles.metaItem}>
              <MapPin size={12} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>{ncr.location}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <User size={12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>{ncr.discovered_by}</Text>
          </View>
        </View>

        <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
      </Pressable>
    );
  }, [colors, openDetail]);

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
            <FileX size={28} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Non-Conformance Reports</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Document and track non-conforming products or processes
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: statusFilter === 'open' ? '#EF4444' : colors.border },
            ]}
            onPress={() => {
              setStatusFilter(statusFilter === 'open' ? null : 'open');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.open}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
          </Pressable>
          <Pressable
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: statusFilter === 'investigation' ? '#F59E0B' : colors.border },
            ]}
            onPress={() => {
              setStatusFilter(statusFilter === 'investigation' ? null : 'investigation');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.investigation}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
          </Pressable>
          <Pressable
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: statusFilter === 'corrective_action' ? '#3B82F6' : colors.border },
            ]}
            onPress={() => {
              setStatusFilter(statusFilter === 'corrective_action' ? null : 'corrective_action');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.corrective_action}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Action</Text>
          </Pressable>
          <Pressable
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: statusFilter === 'closed' ? '#10B981' : colors.border },
            ]}
            onPress={() => {
              setStatusFilter(statusFilter === 'closed' ? null : 'closed');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.closed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Closed</Text>
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search NCRs..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            NCR Records ({filteredNCRs.length})
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New NCR</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={[styles.loadingContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading NCRs...</Text>
          </View>
        ) : (
          filteredNCRs.map(renderNCRCard)
        )}

        {!isLoading && filteredNCRs.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FileX size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No NCRs Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Create a new NCR to get started'}
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New NCR</Text>
            <Pressable onPress={handleAddNCR} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Brief title for the NCR"
              placeholderTextColor={colors.textTertiary}
              value={newNCR.title}
              onChangeText={(text) => setNewNCR(prev => ({ ...prev, title: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>NCR Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {NCR_TYPES.map(type => (
                <Pressable
                  key={type.value}
                  style={[
                    styles.optionButton,
                    { borderColor: newNCR.ncr_type === type.value ? colors.primary : colors.border },
                    newNCR.ncr_type === type.value && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewNCR(prev => ({ ...prev, ncr_type: type.value }))}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newNCR.ncr_type === type.value ? colors.primary : colors.text },
                  ]}>{type.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {NCR_SOURCES.map(source => (
                <Pressable
                  key={source.value}
                  style={[
                    styles.optionButton,
                    { borderColor: newNCR.source === source.value ? colors.primary : colors.border },
                    newNCR.source === source.value && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewNCR(prev => ({ ...prev, source: source.value }))}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newNCR.source === source.value ? colors.primary : colors.text },
                  ]}>{source.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {LOCATIONS.map(loc => (
                <Pressable
                  key={loc}
                  style={[
                    styles.optionButton,
                    { borderColor: newNCR.location === loc ? colors.primary : colors.border },
                    newNCR.location === loc && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewNCR(prev => ({ ...prev, location: loc }))}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newNCR.location === loc ? colors.primary : colors.text },
                  ]}>{loc}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe the non-conformance in detail..."
              placeholderTextColor={colors.textTertiary}
              value={newNCR.description}
              onChangeText={(text) => setNewNCR(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Severity *</Text>
            <View style={styles.optionRow}>
              {(['minor', 'major', 'critical'] as const).map(sev => {
                const config = SEVERITY_CONFIG[sev];
                return (
                  <Pressable
                    key={sev}
                    style={[
                      styles.severityOption,
                      { borderColor: newNCR.severity === sev ? config.color : colors.border },
                      newNCR.severity === sev && { backgroundColor: config.bgColor },
                    ]}
                    onPress={() => setNewNCR(prev => ({ ...prev, severity: sev }))}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: newNCR.severity === sev ? config.color : colors.text },
                    ]}>{config.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Product Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Affected product name"
              placeholderTextColor={colors.textTertiary}
              value={newNCR.product_name}
              onChangeText={(text) => setNewNCR(prev => ({ ...prev, product_name: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Lot Number</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Affected lot number"
              placeholderTextColor={colors.textTertiary}
              value={newNCR.lot_number}
              onChangeText={(text) => setNewNCR(prev => ({ ...prev, lot_number: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Containment Actions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="What immediate containment actions were taken..."
              placeholderTextColor={colors.textTertiary}
              value={newNCR.containment_actions}
              onChangeText={(text) => setNewNCR(prev => ({ ...prev, containment_actions: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedNCR?.ncr_number}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedNCR && (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedNCR.status].color + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_CONFIG[selectedNCR.status].color }]}>
                      {STATUS_CONFIG[selectedNCR.status].label}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Severity</Text>
                  <View style={[styles.severityBadge, { backgroundColor: SEVERITY_CONFIG[selectedNCR.severity].bgColor }]}>
                    <Text style={[styles.severityText, { color: SEVERITY_CONFIG[selectedNCR.severity].color }]}>
                      {SEVERITY_CONFIG[selectedNCR.severity].label}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {NCR_TYPES.find(t => t.value === selectedNCR.ncr_type)?.label || selectedNCR.ncr_type}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Discovered Date</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.discovered_date}</Text>
                </View>
                {selectedNCR.source && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Source</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {NCR_SOURCES.find(s => s.value === selectedNCR.source)?.label || selectedNCR.source}
                    </Text>
                  </View>
                )}
                {selectedNCR.location && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.location}</Text>
                  </View>
                )}
                {selectedNCR.product_name && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Product</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.product_name}</Text>
                  </View>
                )}
                {selectedNCR.lot_number && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lot Number</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.lot_number}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Discovered By</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.discovered_by}</Text>
                </View>
                {selectedNCR.assigned_to && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Assigned To</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedNCR.assigned_to}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Title</Text>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailText, { color: colors.text }]}>{selectedNCR.title}</Text>
              </View>

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Description</Text>
              <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.detailText, { color: colors.text }]}>{selectedNCR.description}</Text>
              </View>

              {selectedNCR.containment_actions && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Containment Actions</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailText, { color: colors.text }]}>{selectedNCR.containment_actions}</Text>
                  </View>
                </>
              )}

              {selectedNCR.root_cause && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Root Cause</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailText, { color: colors.text }]}>{selectedNCR.root_cause}</Text>
                  </View>
                </>
              )}

              {selectedNCR.corrective_actions && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Corrective Actions</Text>
                  <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.detailText, { color: colors.text }]}>{selectedNCR.corrective_actions}</Text>
                  </View>
                </>
              )}

              <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Update Status</Text>
              <View style={styles.statusActions}>
                {(['open', 'investigation', 'containment', 'root_cause', 'corrective_action', 'verification', 'closed'] as NCRStatus[]).map(status => {
                  const config = STATUS_CONFIG[status];
                  const isActive = selectedNCR.status === status;
                  return (
                    <Pressable
                      key={status}
                      style={[
                        styles.statusAction,
                        { 
                          borderColor: isActive ? config.color : colors.border,
                          backgroundColor: isActive ? config.color + '20' : colors.surface,
                        },
                      ]}
                      onPress={() => handleStatusChange(selectedNCR, status)}
                    >
                      <Text style={[styles.statusActionText, { color: isActive ? config.color : colors.text }]}>
                        {config.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.bottomPadding} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
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
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: {
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  ncrCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  ncrHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  ncrTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  ncrNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  ncrTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  ncrDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  ncrMeta: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  chevron: {
    position: 'absolute' as const,
    right: 14,
    top: '50%',
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  loadingContainer: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  severityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  horizontalOptions: {
    flexDirection: 'row' as const,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    height: 44,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  detailCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 20,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  statusAction: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusActionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
