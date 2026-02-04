import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useVisitorSafety } from '@/hooks/useContractorSafety';
import {
  VisitorSafety,
  VisitorType,
  VISITOR_TYPE_LABELS,
} from '@/types/contractorSafety';
import {
  Plus,
  Search,
  UserCheck,
  User,
  Building2,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  BadgeCheck,
  Shield,
  MapPin,
  Video,
  FileText,
  LogOut,
  Users,
} from 'lucide-react-native';

export default function VisitorSafetyScreen() {
  const { colors } = useTheme();
  const {
    visitors,
    activeVisitors,
    isLoading,
    isRefetching,
    createVisitor,
    checkOutVisitor,
    isCreating,
    generateVisitorNumber,
    refetch,
  } = useVisitorSafety();

  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorSafety | null>(null);
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_company: '',
    visitor_phone: '',
    visitor_email: '',
    visitor_type: 'business' as VisitorType,
    purpose_of_visit: '',
    host_name: '',
    host_department: '',
    badge_number: '',
    escort_required: false,
    escort_name: '',
    photo_id_verified: false,
    safety_video_watched: false,
    safety_rules_acknowledged: false,
    emergency_procedures_reviewed: false,
    nda_signed: false,
  });

  const displayedVisitors = useMemo(() => {
    const list = showActiveOnly ? activeVisitors : visitors;
    return list.filter(v => {
      const matchesSearch = 
        v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.visitor_company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        v.visitor_number.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [visitors, activeVisitors, searchQuery, showActiveOnly]);

  const stats = useMemo(() => ({
    onSite: activeVisitors.length,
    todayVisitors: visitors.filter(v => {
      const today = new Date().toISOString().split('T')[0];
      return v.check_in_time.split('T')[0] === today;
    }).length,
  }), [visitors, activeVisitors]);

  const resetForm = () => {
    setFormData({
      visitor_name: '',
      visitor_company: '',
      visitor_phone: '',
      visitor_email: '',
      visitor_type: 'business',
      purpose_of_visit: '',
      host_name: '',
      host_department: '',
      badge_number: '',
      escort_required: false,
      escort_name: '',
      photo_id_verified: false,
      safety_video_watched: false,
      safety_rules_acknowledged: false,
      emergency_procedures_reviewed: false,
      nda_signed: false,
    });
    setSelectedVisitor(null);
  };

  const handleCheckIn = async () => {
    if (!formData.visitor_name.trim() || !formData.purpose_of_visit.trim() || !formData.host_name.trim()) {
      Alert.alert('Error', 'Visitor name, purpose, and host are required');
      return;
    }

    if (!formData.photo_id_verified) {
      Alert.alert('Warning', 'Photo ID must be verified before check-in');
      return;
    }

    if (!formData.safety_rules_acknowledged) {
      Alert.alert('Warning', 'Visitor must acknowledge safety rules before check-in');
      return;
    }

    try {
      const payload = {
        visitor_number: generateVisitorNumber(),
        visitor_name: formData.visitor_name,
        visitor_company: formData.visitor_company || null,
        visitor_title: null,
        visitor_phone: formData.visitor_phone || null,
        visitor_email: formData.visitor_email || null,
        visitor_type: formData.visitor_type,
        facility_id: null,
        facility_name: null,
        purpose_of_visit: formData.purpose_of_visit,
        host_name: formData.host_name,
        host_id: null,
        host_department: formData.host_department || null,
        host_notified: true,
        host_notified_at: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        expected_duration_minutes: null,
        check_out_time: null,
        badge_number: formData.badge_number || `V-${Date.now().toString().slice(-4)}`,
        badge_issued: true,
        badge_returned: false,
        areas_authorized: [],
        escort_required: formData.escort_required,
        escort_name: formData.escort_name || null,
        escort_id: null,
        photo_id_verified: formData.photo_id_verified,
        photo_id_type: null,
        safety_video_watched: formData.safety_video_watched,
        safety_rules_acknowledged: formData.safety_rules_acknowledged,
        emergency_procedures_reviewed: formData.emergency_procedures_reviewed,
        ppe_provided: [],
        health_screening_completed: false,
        health_screening_passed: null,
        nda_signed: formData.nda_signed,
        nda_document_id: null,
        signature_url: null,
        signed_date: new Date().toISOString(),
        vehicle_info: null,
        vehicle_plate: null,
        notes: null,
      };

      await createVisitor(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Visitor checked in successfully');
    } catch (error) {
      console.error('Error checking in visitor:', error);
      Alert.alert('Error', 'Failed to check in visitor');
    }
  };

  const handleCheckOut = async (visitor: VisitorSafety) => {
    Alert.alert(
      'Check Out',
      `Check out ${visitor.visitor_name}?\n\nWas the badge returned?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Badge Not Returned',
          style: 'destructive',
          onPress: async () => {
            try {
              await checkOutVisitor({ id: visitor.id, badge_returned: false });
              setShowDetailModal(false);
              Alert.alert('Warning', 'Visitor checked out. Badge NOT returned - please follow up.');
            } catch (err) {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
        {
          text: 'Badge Returned',
          onPress: async () => {
            try {
              await checkOutVisitor({ id: visitor.id, badge_returned: true });
              setShowDetailModal(false);
              Alert.alert('Success', 'Visitor checked out successfully');
            } catch (err) {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (checkInTime: string, checkOutTime?: string | null) => {
    const start = new Date(checkInTime);
    const end = checkOutTime ? new Date(checkOutTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const visitorTypes: { value: VisitorType; label: string }[] = [
    { value: 'business', label: 'Business' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'customer', label: 'Customer' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'inspector', label: 'Inspector' },
    { value: 'tour', label: 'Tour' },
    { value: 'interview', label: 'Interview' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'other', label: 'Other' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statsContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 32,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    onSiteCard: {
      backgroundColor: '#3B82F620',
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: colors.text,
    },
    filterButton: {
      height: 44,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500' as const,
    },
    filterButtonTextActive: {
      color: '#fff',
    },
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    visitorName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
    visitorNumber: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
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
    cardBody: {
      gap: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.primary + '20',
    },
    typeText: {
      fontSize: 11,
      fontWeight: '500' as const,
      color: colors.primary,
    },
    viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewButtonText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500' as const,
    },
    verificationRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    verificationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    verificationText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 16,
    },
    formSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    inputGroup: {
      marginBottom: 12,
    },
    inputLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    halfWidth: {
      flex: 1,
    },
    typeSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    typeOption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    typeOptionText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    typeOptionTextSelected: {
      color: colors.primary,
      fontWeight: '500' as const,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    checkboxRequired: {
      borderColor: '#EF4444',
    },
    checkboxLabel: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    requiredText: {
      color: '#EF4444',
      fontSize: 12,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    detailSection: {
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      width: 120,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    checkOutButton: {
      backgroundColor: '#EF4444',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    checkOutButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    verificationSection: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    verificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 6,
    },
    verificationItemText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    badgeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: '#3B82F620',
      borderRadius: 8,
      marginBottom: 16,
    },
    badgeInfoText: {
      fontSize: 14,
      color: '#3B82F6',
      fontWeight: '600' as const,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.onSiteCard]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.onSite}</Text>
          <Text style={styles.statLabel}>Visitors On Site</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.todayVisitors}</Text>
          <Text style={styles.statLabel}>Today&apos;s Visitors</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search visitors..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showActiveOnly && styles.filterButtonActive]}
          onPress={() => setShowActiveOnly(!showActiveOnly)}
        >
          <Text style={[styles.filterButtonText, showActiveOnly && styles.filterButtonTextActive]}>
            {showActiveOnly ? 'On Site' : 'All'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {displayedVisitors.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Visitors {showActiveOnly ? 'On Site' : 'Found'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search'
                : showActiveOnly 
                  ? 'No visitors currently checked in'
                  : 'Check in your first visitor'}
            </Text>
          </View>
        ) : (
          displayedVisitors.map(visitor => (
            <TouchableOpacity
              key={visitor.id}
              style={styles.card}
              onPress={() => {
                setSelectedVisitor(visitor);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitorName}>{visitor.visitor_name}</Text>
                  <Text style={styles.visitorNumber}>{visitor.visitor_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: visitor.check_out_time ? '#6B728020' : '#10B98120' },
                  ]}
                >
                  {visitor.check_out_time ? (
                    <LogOut size={14} color="#6B7280" />
                  ) : (
                    <UserCheck size={14} color="#10B981" />
                  )}
                  <Text
                    style={[styles.statusText, { color: visitor.check_out_time ? '#6B7280' : '#10B981' }]}
                  >
                    {visitor.check_out_time ? 'Checked Out' : 'On Site'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                {visitor.visitor_company && (
                  <View style={styles.infoRow}>
                    <Building2 size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{visitor.visitor_company}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <User size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>Host: {visitor.host_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    In: {formatTime(visitor.check_in_time)}
                    {visitor.check_out_time && ` • Out: ${formatTime(visitor.check_out_time)}`}
                  </Text>
                </View>
              </View>

              <View style={styles.verificationRow}>
                {visitor.badge_issued && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#3B82F620' }]}>
                    <BadgeCheck size={12} color="#3B82F6" />
                    <Text style={[styles.verificationText, { color: '#3B82F6' }]}>
                      {visitor.badge_number}
                    </Text>
                  </View>
                )}
                {visitor.photo_id_verified && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#10B98120' }]}>
                    <CheckCircle size={12} color="#10B981" />
                    <Text style={[styles.verificationText, { color: '#10B981' }]}>ID Verified</Text>
                  </View>
                )}
                {visitor.escort_required && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#F59E0B20' }]}>
                    <Shield size={12} color="#F59E0B" />
                    <Text style={[styles.verificationText, { color: '#F59E0B' }]}>Escort Req.</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{VISITOR_TYPE_LABELS[visitor.visitor_type]}</Text>
                </View>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>Details</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowFormModal(true);
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Form Modal */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFormModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Visitor Check-In</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Visitor Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Visitor Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.visitor_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, visitor_name: text }))}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.visitor_company}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, visitor_company: text }))}
                    placeholder="Company name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.visitor_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, visitor_phone: text }))}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.visitor_email}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, visitor_email: text }))}
                      placeholder="Email"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Visit Type</Text>
                <View style={styles.typeSelector}>
                  {visitorTypes.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.visitor_type === type.value && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, visitor_type: type.value }))}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          formData.visitor_type === type.value && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Visit Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Purpose of Visit *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.purpose_of_visit}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, purpose_of_visit: text }))}
                    placeholder="Describe the purpose of the visit"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Host Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.host_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, host_name: text }))}
                      placeholder="Host name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Department</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.host_department}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, host_department: text }))}
                      placeholder="Department"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Safety Verification</Text>
                
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, photo_id_verified: !prev.photo_id_verified }))}
                >
                  <View style={[
                    styles.checkbox, 
                    formData.photo_id_verified && styles.checkboxChecked,
                    !formData.photo_id_verified && styles.checkboxRequired
                  ]}>
                    {formData.photo_id_verified && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Photo ID Verified <Text style={styles.requiredText}>*</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, safety_rules_acknowledged: !prev.safety_rules_acknowledged }))}
                >
                  <View style={[
                    styles.checkbox, 
                    formData.safety_rules_acknowledged && styles.checkboxChecked,
                    !formData.safety_rules_acknowledged && styles.checkboxRequired
                  ]}>
                    {formData.safety_rules_acknowledged && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Safety Rules Acknowledged <Text style={styles.requiredText}>*</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, safety_video_watched: !prev.safety_video_watched }))}
                >
                  <View style={[styles.checkbox, formData.safety_video_watched && styles.checkboxChecked]}>
                    {formData.safety_video_watched && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Safety Video Watched</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, emergency_procedures_reviewed: !prev.emergency_procedures_reviewed }))}
                >
                  <View style={[styles.checkbox, formData.emergency_procedures_reviewed && styles.checkboxChecked]}>
                    {formData.emergency_procedures_reviewed && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Emergency Procedures Reviewed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, escort_required: !prev.escort_required }))}
                >
                  <View style={[styles.checkbox, formData.escort_required && styles.checkboxChecked]}>
                    {formData.escort_required && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Escort Required</Text>
                </TouchableOpacity>

                {formData.escort_required && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Escort Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.escort_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, escort_name: text }))}
                      placeholder="Escort name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, nda_signed: !prev.nda_signed }))}
                >
                  <View style={[styles.checkbox, formData.nda_signed && styles.checkboxChecked]}>
                    {formData.nda_signed && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>NDA Signed</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCheckIn}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Checking In...' : 'Check In Visitor'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Visitor Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedVisitor && (
                <>
                  {selectedVisitor.badge_issued && (
                    <View style={styles.badgeInfo}>
                      <BadgeCheck size={24} color="#3B82F6" />
                      <Text style={styles.badgeInfoText}>
                        Badge: {selectedVisitor.badge_number}
                        {selectedVisitor.badge_returned && ' (Returned)'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Visitor Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedVisitor.visitor_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Visitor #</Text>
                      <Text style={styles.detailValue}>{selectedVisitor.visitor_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{VISITOR_TYPE_LABELS[selectedVisitor.visitor_type]}</Text>
                    </View>
                    {selectedVisitor.visitor_company && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Company</Text>
                        <Text style={styles.detailValue}>{selectedVisitor.visitor_company}</Text>
                      </View>
                    )}
                    {selectedVisitor.visitor_phone && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedVisitor.visitor_phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Visit Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purpose</Text>
                      <Text style={styles.detailValue}>{selectedVisitor.purpose_of_visit}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Host</Text>
                      <Text style={styles.detailValue}>{selectedVisitor.host_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Check-In</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedVisitor.check_in_time).toLocaleString()}
                      </Text>
                    </View>
                    {selectedVisitor.check_out_time && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-Out</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedVisitor.check_out_time).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>
                        {formatDuration(selectedVisitor.check_in_time, selectedVisitor.check_out_time)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Safety Verification</Text>
                    <View style={styles.verificationSection}>
                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedVisitor.photo_id_verified ? '#10B98120' : '#EF444420' }
                      ]}>
                        {selectedVisitor.photo_id_verified ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <XCircle size={16} color="#EF4444" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedVisitor.photo_id_verified ? '#10B981' : '#EF4444' }
                        ]}>
                          Photo ID
                        </Text>
                      </View>

                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedVisitor.safety_rules_acknowledged ? '#10B98120' : '#EF444420' }
                      ]}>
                        {selectedVisitor.safety_rules_acknowledged ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <XCircle size={16} color="#EF4444" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedVisitor.safety_rules_acknowledged ? '#10B981' : '#EF4444' }
                        ]}>
                          Safety Rules
                        </Text>
                      </View>

                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedVisitor.safety_video_watched ? '#10B98120' : '#F59E0B20' }
                      ]}>
                        {selectedVisitor.safety_video_watched ? (
                          <Video size={16} color="#10B981" />
                        ) : (
                          <Video size={16} color="#F59E0B" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedVisitor.safety_video_watched ? '#10B981' : '#F59E0B' }
                        ]}>
                          Safety Video
                        </Text>
                      </View>

                      {selectedVisitor.nda_signed && (
                        <View style={[styles.verificationItem, { backgroundColor: '#8B5CF620' }]}>
                          <FileText size={16} color="#8B5CF6" />
                          <Text style={[styles.verificationItemText, { color: '#8B5CF6' }]}>
                            NDA Signed
                          </Text>
                        </View>
                      )}

                      {selectedVisitor.escort_required && (
                        <View style={[styles.verificationItem, { backgroundColor: '#F59E0B20' }]}>
                          <Shield size={16} color="#F59E0B" />
                          <Text style={[styles.verificationItemText, { color: '#F59E0B' }]}>
                            Escort: {selectedVisitor.escort_name || 'Required'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {!selectedVisitor.check_out_time && (
                    <TouchableOpacity
                      style={styles.checkOutButton}
                      onPress={() => handleCheckOut(selectedVisitor)}
                    >
                      <Text style={styles.checkOutButtonText}>Check Out Visitor</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
