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
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  Calendar,
  Building,
  FileText,
  Bell,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseCompliance, Certification, CertificationType, CertificationStatus } from '@/hooks/useSupabaseCompliance';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<CertificationStatus, { label: string; color: string; bgColor: string }> = {
  'active': { label: 'Active', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  'expiring_soon': { label: 'Expiring Soon', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  'expired': { label: 'Expired', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  'suspended': { label: 'Suspended', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
  'revoked': { label: 'Revoked', color: '#991B1B', bgColor: 'rgba(153, 27, 27, 0.15)' },
  'pending': { label: 'Pending', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.15)' },
};

const CERT_TYPES: { value: CertificationType; label: string }[] = [
  { value: 'sqf', label: 'SQF' },
  { value: 'brc', label: 'BRC' },
  { value: 'fssc22000', label: 'FSSC 22000' },
  { value: 'organic', label: 'Organic' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'halal', label: 'Halal' },
  { value: 'non_gmo', label: 'Non-GMO' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'fair_trade', label: 'Fair Trade' },
  { value: 'other', label: 'Other' },
];

const ISSUING_BODIES = [
  'SQFI', 'BRC', 'Oregon Tilth', 'QAI', 'OU Kosher', 'OK Kosher',
  'Islamic Services of America', 'FDA', 'USDA', 'State Dept of Agriculture',
  'Non-GMO Project', 'GFCO', 'Fair Trade USA', 'Other'
];

const getCertTypeLabel = (type: CertificationType): string => {
  const found = CERT_TYPES.find(t => t.value === type);
  return found ? found.label : type;
};

export default function CertRenewalTrackerScreen() {
  const { colors } = useTheme();
  const { 
    certifications, 
    isLoading, 
    createCertification, 
    refetch 
  } = useSupabaseCompliance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newCert, setNewCert] = useState({
    certification_name: '',
    certification_type: '' as CertificationType | '',
    certifying_body: '',
    certificate_number: '',
    scope: '',
    issue_date: '',
    expiration_date: '',
    notes: '',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const calculateStatus = (expirationDate: string | null): CertificationStatus => {
    if (!expirationDate) return 'active';
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring_soon';
    return 'active';
  };

  const getDaysUntilExpiry = (expirationDate: string | null): number => {
    if (!expirationDate) return 999;
    const today = new Date();
    const expDate = new Date(expirationDate);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDisplayStatus = useCallback((cert: Certification): CertificationStatus => {
    if (cert.status === 'expired' || cert.status === 'suspended' || cert.status === 'revoked' || cert.status === 'pending') {
      return cert.status;
    }
    return calculateStatus(cert.expiration_date);
  }, []);

  const filteredCertifications = useMemo(() => {
    return certifications.filter(cert => {
      const matchesSearch = !searchQuery || 
        cert.certification_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certifying_body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCertTypeLabel(cert.certification_type).toLowerCase().includes(searchQuery.toLowerCase());
      const displayStatus = getDisplayStatus(cert);
      const matchesStatus = !statusFilter || displayStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [certifications, searchQuery, statusFilter, getDisplayStatus]);

  const sortedCertifications = useMemo(() => {
    return [...filteredCertifications].sort((a, b) => {
      const statusOrder: Record<CertificationStatus, number> = { 
        expired: 0, 
        revoked: 0,
        suspended: 1,
        expiring_soon: 2, 
        pending: 3,
        active: 4 
      };
      const aStatus = getDisplayStatus(a);
      const bStatus = getDisplayStatus(b);
      return statusOrder[aStatus] - statusOrder[bStatus];
    });
  }, [filteredCertifications, getDisplayStatus]);

  const stats = useMemo(() => {
    const active = certifications.filter(c => getDisplayStatus(c) === 'active').length;
    const expiring = certifications.filter(c => getDisplayStatus(c) === 'expiring_soon').length;
    const expired = certifications.filter(c => ['expired', 'suspended', 'revoked'].includes(getDisplayStatus(c))).length;
    return {
      total: certifications.length,
      active,
      expiring,
      expired,
    };
  }, [certifications, getDisplayStatus]);

  const handleAddCert = useCallback(async () => {
    if (!newCert.certification_name || !newCert.certification_type || !newCert.certifying_body || !newCert.issue_date) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const status = calculateStatus(newCert.expiration_date || null);
      
      await createCertification({
        certification_type: newCert.certification_type as CertificationType,
        certification_name: newCert.certification_name,
        status,
        facility_id: null,
        certifying_body: newCert.certifying_body,
        certificate_number: newCert.certificate_number || null,
        scope: newCert.scope || null,
        issue_date: newCert.issue_date,
        expiration_date: newCert.expiration_date || null,
        last_audit_date: null,
        next_audit_date: null,
        renewal_fee: null,
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        logo_usage_allowed: false,
        logo_guidelines: null,
        attachments: [],
        notes: newCert.notes || null,
      });

      setShowAddModal(false);
      setNewCert({
        certification_name: '',
        certification_type: '',
        certifying_body: '',
        certificate_number: '',
        scope: '',
        issue_date: '',
        expiration_date: '',
        notes: '',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[Certification] Added:', newCert.certification_name);
    } catch (error) {
      console.error('[Certification] Error adding:', error);
      Alert.alert('Error', 'Failed to add certification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newCert, createCertification]);

  const openDetail = useCallback((cert: Certification) => {
    setSelectedCert(cert);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (isLoading && certifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading certifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={[styles.iconContainer, { backgroundColor: '#10B981' + '20' }]}>
            <Award size={28} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Certification Register</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track certifications, permits, and renewal dates
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            style={[
              styles.statCard, 
              { backgroundColor: colors.surface, borderColor: !statusFilter ? colors.primary : colors.border }
            ]}
            onPress={() => setStatusFilter(null)}
          >
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </Pressable>
          <Pressable
            style={[
              styles.statCard, 
              { backgroundColor: colors.surface, borderColor: statusFilter === 'active' ? '#10B981' : colors.border }
            ]}
            onPress={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
          >
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </Pressable>
          <Pressable
            style={[
              styles.statCard, 
              { backgroundColor: colors.surface, borderColor: statusFilter === 'expiring_soon' ? '#F59E0B' : colors.border }
            ]}
            onPress={() => setStatusFilter(statusFilter === 'expiring_soon' ? null : 'expiring_soon')}
          >
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.expiring}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expiring</Text>
          </Pressable>
          <Pressable
            style={[
              styles.statCard, 
              { backgroundColor: colors.surface, borderColor: statusFilter === 'expired' ? '#EF4444' : colors.border }
            ]}
            onPress={() => setStatusFilter(statusFilter === 'expired' ? null : 'expired')}
          >
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.expired}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expired</Text>
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search certifications..."
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
            Certifications ({sortedCertifications.length})
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#10B981' }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {sortedCertifications.map(cert => {
          const displayStatus = getDisplayStatus(cert);
          const statusConfig = STATUS_CONFIG[displayStatus];
          const daysUntil = getDaysUntilExpiry(cert.expiration_date);
          
          return (
            <Pressable
              key={cert.id}
              style={({ pressed }) => [
                styles.certCard,
                { 
                  backgroundColor: colors.surface, 
                  borderColor: displayStatus === 'expired' || displayStatus === 'revoked' ? '#EF4444' : displayStatus === 'expiring_soon' ? '#F59E0B' : colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: statusConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(cert)}
            >
              <View style={styles.certHeader}>
                <View style={styles.certTitleArea}>
                  <Text style={[styles.certName, { color: colors.text }]}>{cert.certification_name}</Text>
                  <Text style={[styles.certType, { color: colors.textSecondary }]}>{getCertTypeLabel(cert.certification_type)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  {displayStatus === 'active' && <CheckCircle size={12} color={statusConfig.color} />}
                  {displayStatus === 'expiring_soon' && <Clock size={12} color={statusConfig.color} />}
                  {(displayStatus === 'expired' || displayStatus === 'suspended' || displayStatus === 'revoked') && <AlertTriangle size={12} color={statusConfig.color} />}
                  {displayStatus === 'pending' && <Clock size={12} color={statusConfig.color} />}
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
              </View>

              <View style={styles.certDetails}>
                <View style={styles.detailItem}>
                  <Building size={12} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textTertiary }]}>{cert.certifying_body}</Text>
                </View>
                <View style={styles.detailItem}>
                  <FileText size={12} color={colors.textTertiary} />
                  <Text style={[styles.detailText, { color: colors.textTertiary }]}>{cert.certificate_number || 'Pending'}</Text>
                </View>
              </View>

              {cert.expiration_date && (
                <View style={styles.expiryRow}>
                  <View style={styles.expiryInfo}>
                    <Calendar size={14} color={displayStatus === 'expired' ? '#EF4444' : colors.textSecondary} />
                    <Text style={[
                      styles.expiryDate, 
                      { color: displayStatus === 'expired' ? '#EF4444' : colors.text }
                    ]}>
                      Expires: {cert.expiration_date}
                    </Text>
                  </View>
                  <Text style={[
                    styles.daysText,
                    { color: statusConfig.color }
                  ]}>
                    {daysUntil < 0 
                      ? `${Math.abs(daysUntil)} days overdue`
                      : daysUntil === 0 
                        ? 'Expires today'
                        : `${daysUntil} days left`
                    }
                  </Text>
                </View>
              )}

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {sortedCertifications.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Award size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Certifications</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add your first certification to track renewals
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Certification</Text>
            <Pressable onPress={handleAddCert} disabled={isSubmitting}>
              <Text style={[styles.saveButton, { color: isSubmitting ? colors.textTertiary : '#10B981' }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Certification Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., SQF Level 2, USDA Organic"
              placeholderTextColor={colors.textTertiary}
              value={newCert.certification_name}
              onChangeText={(text) => setNewCert(prev => ({ ...prev, certification_name: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {CERT_TYPES.map(type => (
                <Pressable
                  key={type.value}
                  style={[
                    styles.optionButton,
                    { borderColor: newCert.certification_type === type.value ? colors.primary : colors.border },
                    newCert.certification_type === type.value && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewCert(prev => ({ ...prev, certification_type: type.value }))}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newCert.certification_type === type.value ? colors.primary : colors.text },
                  ]}>{type.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Certifying Body *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {ISSUING_BODIES.map(body => (
                <Pressable
                  key={body}
                  style={[
                    styles.optionButton,
                    { borderColor: newCert.certifying_body === body ? colors.primary : colors.border },
                    newCert.certifying_body === body && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewCert(prev => ({ ...prev, certifying_body: body }))}
                >
                  <Text style={[
                    styles.optionText,
                    { color: newCert.certifying_body === body ? colors.primary : colors.text },
                  ]}>{body}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Certificate Number</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Certificate or license number"
              placeholderTextColor={colors.textTertiary}
              value={newCert.certificate_number}
              onChangeText={(text) => setNewCert(prev => ({ ...prev, certificate_number: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Scope</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Scope of certification"
              placeholderTextColor={colors.textTertiary}
              value={newCert.scope}
              onChangeText={(text) => setNewCert(prev => ({ ...prev, scope: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Issue Date *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              value={newCert.issue_date}
              onChangeText={(text) => setNewCert(prev => ({ ...prev, issue_date: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Expiration Date</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD (optional)"
              placeholderTextColor={colors.textTertiary}
              value={newCert.expiration_date}
              onChangeText={(text) => setNewCert(prev => ({ ...prev, expiration_date: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional notes, audit dates, requirements..."
              placeholderTextColor={colors.textTertiary}
              value={newCert.notes}
              onChangeText={(text) => setNewCert(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {isSubmitting && (
              <View style={styles.submittingOverlay}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.submittingText, { color: colors.textSecondary }]}>Saving...</Text>
              </View>
            )}

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Certification Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedCert && (() => {
            const displayStatus = getDisplayStatus(selectedCert);
            const statusConfig = STATUS_CONFIG[displayStatus];
            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.detailHeader, { backgroundColor: statusConfig.bgColor }]}>
                  <Award size={32} color={statusConfig.color} />
                  <Text style={[styles.detailHeaderTitle, { color: colors.text }]}>{selectedCert.certification_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Type</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{getCertTypeLabel(selectedCert.certification_type)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Certifying Body</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.certifying_body}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Certificate #</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.certificate_number || 'Pending'}</Text>
                  </View>
                  {selectedCert.scope && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Scope</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.scope}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Issue Date</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.issue_date}</Text>
                  </View>
                  {selectedCert.expiration_date && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expiration Date</Text>
                      <Text style={[
                        styles.detailValue, 
                        { color: displayStatus === 'expired' ? '#EF4444' : colors.text }
                      ]}>
                        {selectedCert.expiration_date}
                      </Text>
                    </View>
                  )}
                  {selectedCert.last_audit_date && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Audit</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.last_audit_date}</Text>
                    </View>
                  )}
                  {selectedCert.next_audit_date && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next Audit</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.next_audit_date}</Text>
                    </View>
                  )}
                  {selectedCert.renewal_fee && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Renewal Fee</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>${selectedCert.renewal_fee.toLocaleString()}</Text>
                    </View>
                  )}
                </View>

                {(selectedCert.contact_name || selectedCert.contact_email || selectedCert.contact_phone) && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Contact Information</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      {selectedCert.contact_name && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contact</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.contact_name}</Text>
                        </View>
                      )}
                      {selectedCert.contact_email && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.contact_email}</Text>
                        </View>
                      )}
                      {selectedCert.contact_phone && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCert.contact_phone}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {selectedCert.notes && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Notes</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.notesText, { color: colors.text }]}>{selectedCert.notes}</Text>
                    </View>
                  </>
                )}

                <View style={[styles.actionButtons, { marginTop: 20 }]}>
                  <Pressable style={[styles.actionButton, { backgroundColor: colors.primary }]}>
                    <FileText size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>View Document</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}>
                    <Bell size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Set Reminder</Text>
                  </Pressable>
                </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  submittingOverlay: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginTop: 16,
  },
  submittingText: {
    fontSize: 14,
  },
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
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
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
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  certCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  certHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  certTitleArea: { flex: 1 },
  certName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  certType: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' as const },
  certDetails: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 10,
  },
  detailItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  detailText: { fontSize: 11 },
  expiryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  expiryInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  expiryDate: { fontSize: 13, fontWeight: '500' as const },
  daysText: { fontSize: 12, fontWeight: '600' as const },
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
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8, marginTop: 16 },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  horizontalOptions: { flexDirection: 'row' as const },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: { fontSize: 13, fontWeight: '500' as const },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  detailHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  detailHeaderTitle: { fontSize: 18, fontWeight: '700' as const, marginTop: 10, marginBottom: 8 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 20, marginBottom: 10 },
  notesText: { fontSize: 14, lineHeight: 20 },
  actionButtons: { flexDirection: 'row' as const, gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
});
