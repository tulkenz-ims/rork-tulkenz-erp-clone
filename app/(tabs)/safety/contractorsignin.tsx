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
import { useContractorSignIns } from '@/hooks/useContractorSafety';
import {
  ContractorSignIn,
  SignInStatus,
  SIGN_IN_STATUS_LABELS,
  SIGN_IN_STATUS_COLORS,
} from '@/types/contractorSafety';
import {
  Plus,
  Search,
  Filter,
  LogIn,
  LogOut,
  User,
  Building2,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  BadgeCheck,
  Shield,
  MapPin,
  Car,
  AlertTriangle,
  Users,
} from 'lucide-react-native';

export default function ContractorSignInScreen() {
  const { colors } = useTheme();
  const {
    signIns,
    activeSignIns,
    isLoading,
    isRefetching,
    createSignIn,
    signOut,
    isCreating,
    generateSignInNumber,
    refetch,
  } = useContractorSignIns();

  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSignIn, setSelectedSignIn] = useState<ContractorSignIn | null>(null);
  const [formData, setFormData] = useState({
    contractor_company: '',
    person_name: '',
    person_title: '',
    person_phone: '',
    badge_number: '',
    work_area: '',
    purpose_of_visit: '',
    host_name: '',
    vehicle_plate: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    orientation_verified: false,
    insurance_verified: false,
    safety_briefing_completed: false,
    ppe_verified: false,
  });

  const displayedSignIns = useMemo(() => {
    const list = showActiveOnly ? activeSignIns : signIns;
    return list.filter(s => {
      const matchesSearch = 
        s.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contractor_company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.sign_in_number.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [signIns, activeSignIns, searchQuery, showActiveOnly]);

  const stats = useMemo(() => ({
    onSite: activeSignIns.length,
    todaySignIns: signIns.filter(s => {
      const today = new Date().toISOString().split('T')[0];
      return s.sign_in_time.split('T')[0] === today;
    }).length,
    todaySignOuts: signIns.filter(s => {
      const today = new Date().toISOString().split('T')[0];
      return s.sign_out_time?.split('T')[0] === today;
    }).length,
  }), [signIns, activeSignIns]);

  const resetForm = () => {
    setFormData({
      contractor_company: '',
      person_name: '',
      person_title: '',
      person_phone: '',
      badge_number: '',
      work_area: '',
      purpose_of_visit: '',
      host_name: '',
      vehicle_plate: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      orientation_verified: false,
      insurance_verified: false,
      safety_briefing_completed: false,
      ppe_verified: false,
    });
    setSelectedSignIn(null);
  };

  const handleSignIn = async () => {
    if (!formData.contractor_company.trim() || !formData.person_name.trim() || !formData.purpose_of_visit.trim()) {
      Alert.alert('Error', 'Company, name, and purpose are required');
      return;
    }

    if (!formData.orientation_verified || !formData.safety_briefing_completed) {
      Alert.alert('Warning', 'Orientation and safety briefing must be verified before sign-in');
      return;
    }

    try {
      const payload = {
        sign_in_number: generateSignInNumber(),
        contractor_id: null,
        contractor_company: formData.contractor_company,
        person_name: formData.person_name,
        person_title: formData.person_title || null,
        person_phone: formData.person_phone || null,
        badge_number: formData.badge_number || null,
        orientation_verified: formData.orientation_verified,
        orientation_id: null,
        insurance_verified: formData.insurance_verified,
        insurance_id: null,
        work_auth_verified: false,
        work_auth_id: null,
        facility_id: null,
        facility_name: null,
        work_area: formData.work_area || null,
        purpose_of_visit: formData.purpose_of_visit,
        host_name: formData.host_name || null,
        host_id: null,
        host_notified: !!formData.host_name,
        vehicle_info: null,
        vehicle_plate: formData.vehicle_plate || null,
        tools_equipment: null,
        sign_in_time: new Date().toISOString(),
        expected_sign_out_time: null,
        sign_out_time: null,
        status: 'signed_in' as SignInStatus,
        safety_briefing_completed: formData.safety_briefing_completed,
        ppe_verified: formData.ppe_verified,
        ppe_issued: [],
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        photo_url: null,
        signature_url: null,
        notes: null,
      };

      await createSignIn(payload);
      setShowFormModal(false);
      resetForm();
      Alert.alert('Success', 'Contractor signed in successfully');
    } catch (err) {
      console.error('Error signing in:', err);
      Alert.alert('Error', 'Failed to sign in contractor');
    }
  };

  const handleSignOut = async (signIn: ContractorSignIn) => {
    Alert.alert(
      'Sign Out',
      `Sign out ${signIn.person_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await signOut(signIn.id);
              setShowDetailModal(false);
              Alert.alert('Success', 'Contractor signed out successfully');
            } catch (err) {
              Alert.alert('Error', 'Failed to sign out contractor');
            }
          },
        },
      ]
    );
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (signInTime: string, signOutTime?: string | null) => {
    const start = new Date(signInTime);
    const end = signOutTime ? new Date(signOutTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
      padding: 16,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    onSiteCard: {
      backgroundColor: '#10B98120',
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
    personName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      flex: 1,
    },
    signInNumber: {
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
    durationText: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500' as const,
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
      gap: 8,
      marginTop: 8,
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
    signOutButton: {
      backgroundColor: '#EF4444',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 32,
    },
    signOutButtonText: {
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.onSiteCard]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.onSite}</Text>
          <Text style={styles.statLabel}>On Site Now</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.todaySignIns}</Text>
          <Text style={styles.statLabel}>Today Sign-Ins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.todaySignOuts}</Text>
          <Text style={styles.statLabel}>Today Sign-Outs</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contractors..."
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
        {displayedSignIns.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Users size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Contractors {showActiveOnly ? 'On Site' : 'Found'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search'
                : showActiveOnly 
                  ? 'No contractors currently signed in'
                  : 'Sign in your first contractor'}
            </Text>
          </View>
        ) : (
          displayedSignIns.map(signIn => (
            <TouchableOpacity
              key={signIn.id}
              style={styles.card}
              onPress={() => {
                setSelectedSignIn(signIn);
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{signIn.person_name}</Text>
                  <Text style={styles.signInNumber}>{signIn.sign_in_number}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: SIGN_IN_STATUS_COLORS[signIn.status] + '20' },
                  ]}
                >
                  {signIn.status === 'signed_in' ? (
                    <LogIn size={14} color={SIGN_IN_STATUS_COLORS[signIn.status]} />
                  ) : (
                    <LogOut size={14} color={SIGN_IN_STATUS_COLORS[signIn.status]} />
                  )}
                  <Text
                    style={[styles.statusText, { color: SIGN_IN_STATUS_COLORS[signIn.status] }]}
                  >
                    {SIGN_IN_STATUS_LABELS[signIn.status]}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Building2 size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{signIn.contractor_company}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    In: {formatTime(signIn.sign_in_time)}
                    {signIn.sign_out_time && ` • Out: ${formatTime(signIn.sign_out_time)}`}
                  </Text>
                </View>
                {signIn.work_area && (
                  <View style={styles.infoRow}>
                    <MapPin size={14} color={colors.textSecondary} />
                    <Text style={styles.infoText}>{signIn.work_area}</Text>
                  </View>
                )}
              </View>

              <View style={styles.verificationRow}>
                {signIn.orientation_verified && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#10B98120' }]}>
                    <BadgeCheck size={12} color="#10B981" />
                    <Text style={[styles.verificationText, { color: '#10B981' }]}>Oriented</Text>
                  </View>
                )}
                {signIn.ppe_verified && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#3B82F620' }]}>
                    <Shield size={12} color="#3B82F6" />
                    <Text style={[styles.verificationText, { color: '#3B82F6' }]}>PPE</Text>
                  </View>
                )}
                {signIn.safety_briefing_completed && (
                  <View style={[styles.verificationBadge, { backgroundColor: '#8B5CF620' }]}>
                    <CheckCircle size={12} color="#8B5CF6" />
                    <Text style={[styles.verificationText, { color: '#8B5CF6' }]}>Briefed</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.durationText}>
                  Duration: {formatDuration(signIn.sign_in_time, signIn.sign_out_time)}
                </Text>
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
              <Text style={styles.modalTitle}>Contractor Sign-In</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Contractor Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.contractor_company}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, contractor_company: text }))}
                    placeholder="Enter company name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Person Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.person_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, person_name: text }))}
                    placeholder="Full name"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Title</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.person_title}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, person_title: text }))}
                      placeholder="Job title"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Badge #</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.badge_number}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, badge_number: text }))}
                      placeholder="Badge number"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
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
                    <Text style={styles.inputLabel}>Work Area</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.work_area}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, work_area: text }))}
                      placeholder="Location"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Host Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.host_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, host_name: text }))}
                      placeholder="Host contact"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Vehicle Plate</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.vehicle_plate}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, vehicle_plate: text }))}
                    placeholder="License plate number"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                
                <View style={[styles.row, styles.inputGroup]}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Contact Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.emergency_contact_name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, emergency_contact_name: text }))}
                      placeholder="Name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.inputLabel}>Contact Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.emergency_contact_phone}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, emergency_contact_phone: text }))}
                      placeholder="Phone"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Safety Verification</Text>
                
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, orientation_verified: !prev.orientation_verified }))}
                >
                  <View style={[
                    styles.checkbox, 
                    formData.orientation_verified && styles.checkboxChecked,
                    !formData.orientation_verified && styles.checkboxRequired
                  ]}>
                    {formData.orientation_verified && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Orientation Verified <Text style={styles.requiredText}>*</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, safety_briefing_completed: !prev.safety_briefing_completed }))}
                >
                  <View style={[
                    styles.checkbox, 
                    formData.safety_briefing_completed && styles.checkboxChecked,
                    !formData.safety_briefing_completed && styles.checkboxRequired
                  ]}>
                    {formData.safety_briefing_completed && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Safety Briefing Completed <Text style={styles.requiredText}>*</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, insurance_verified: !prev.insurance_verified }))}
                >
                  <View style={[styles.checkbox, formData.insurance_verified && styles.checkboxChecked]}>
                    {formData.insurance_verified && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Insurance Verified</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(prev => ({ ...prev, ppe_verified: !prev.ppe_verified }))}
                >
                  <View style={[styles.checkbox, formData.ppe_verified && styles.checkboxChecked]}>
                    {formData.ppe_verified && <CheckCircle size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>PPE Verified</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSignIn}
                disabled={isCreating}
              >
                <Text style={styles.submitButtonText}>
                  {isCreating ? 'Signing In...' : 'Sign In Contractor'}
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
              <Text style={styles.modalTitle}>Sign-In Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedSignIn && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Contractor Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedSignIn.person_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Company</Text>
                      <Text style={styles.detailValue}>{selectedSignIn.contractor_company}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sign-In #</Text>
                      <Text style={styles.detailValue}>{selectedSignIn.sign_in_number}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text style={[styles.detailValue, { color: SIGN_IN_STATUS_COLORS[selectedSignIn.status] }]}>
                        {SIGN_IN_STATUS_LABELS[selectedSignIn.status]}
                      </Text>
                    </View>
                    {selectedSignIn.badge_number && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Badge #</Text>
                        <Text style={styles.detailValue}>{selectedSignIn.badge_number}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Visit Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Purpose</Text>
                      <Text style={styles.detailValue}>{selectedSignIn.purpose_of_visit}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Sign-In Time</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedSignIn.sign_in_time).toLocaleString()}
                      </Text>
                    </View>
                    {selectedSignIn.sign_out_time && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Sign-Out Time</Text>
                        <Text style={styles.detailValue}>
                          {new Date(selectedSignIn.sign_out_time).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration</Text>
                      <Text style={styles.detailValue}>
                        {formatDuration(selectedSignIn.sign_in_time, selectedSignIn.sign_out_time)}
                      </Text>
                    </View>
                    {selectedSignIn.work_area && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Work Area</Text>
                        <Text style={styles.detailValue}>{selectedSignIn.work_area}</Text>
                      </View>
                    )}
                    {selectedSignIn.host_name && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Host</Text>
                        <Text style={styles.detailValue}>{selectedSignIn.host_name}</Text>
                      </View>
                    )}
                    {selectedSignIn.vehicle_plate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Vehicle</Text>
                        <Text style={styles.detailValue}>{selectedSignIn.vehicle_plate}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Safety Verification</Text>
                    <View style={styles.verificationSection}>
                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedSignIn.orientation_verified ? '#10B98120' : '#EF444420' }
                      ]}>
                        {selectedSignIn.orientation_verified ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <XCircle size={16} color="#EF4444" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedSignIn.orientation_verified ? '#10B981' : '#EF4444' }
                        ]}>
                          Orientation
                        </Text>
                      </View>

                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedSignIn.safety_briefing_completed ? '#10B98120' : '#EF444420' }
                      ]}>
                        {selectedSignIn.safety_briefing_completed ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <XCircle size={16} color="#EF4444" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedSignIn.safety_briefing_completed ? '#10B981' : '#EF4444' }
                        ]}>
                          Safety Briefing
                        </Text>
                      </View>

                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedSignIn.insurance_verified ? '#10B98120' : '#F59E0B20' }
                      ]}>
                        {selectedSignIn.insurance_verified ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <AlertTriangle size={16} color="#F59E0B" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedSignIn.insurance_verified ? '#10B981' : '#F59E0B' }
                        ]}>
                          Insurance
                        </Text>
                      </View>

                      <View style={[
                        styles.verificationItem,
                        { backgroundColor: selectedSignIn.ppe_verified ? '#10B98120' : '#F59E0B20' }
                      ]}>
                        {selectedSignIn.ppe_verified ? (
                          <CheckCircle size={16} color="#10B981" />
                        ) : (
                          <AlertTriangle size={16} color="#F59E0B" />
                        )}
                        <Text style={[
                          styles.verificationItemText,
                          { color: selectedSignIn.ppe_verified ? '#10B981' : '#F59E0B' }
                        ]}>
                          PPE
                        </Text>
                      </View>
                    </View>
                  </View>

                  {selectedSignIn.status === 'signed_in' && (
                    <TouchableOpacity
                      style={styles.signOutButton}
                      onPress={() => handleSignOut(selectedSignIn)}
                    >
                      <Text style={styles.signOutButtonText}>Sign Out Contractor</Text>
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
