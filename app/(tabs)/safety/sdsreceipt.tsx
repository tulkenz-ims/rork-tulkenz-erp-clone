import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ClipboardCheck,
  ArrowLeft,
  Plus,
  Search,
  X,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Building,
  Briefcase,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface SDSReceiptEntry {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  trainingDate: string;
  chemicalsReviewed: string[];
  trainerName: string;
  acknowledgmentSigned: boolean;
  comprehensionVerified: boolean;
  notes: string;
  expirationDate: string;
}

const INITIAL_ENTRIES: SDSReceiptEntry[] = [
  {
    id: '1',
    employeeName: 'John Martinez',
    employeeId: 'EMP-2847',
    department: 'Production',
    jobTitle: 'Line Operator',
    trainingDate: '2024-12-15',
    chemicalsReviewed: ['Sodium Hypochlorite', 'Peracetic Acid', 'Quaternary Ammonia'],
    trainerName: 'Sarah Johnson',
    acknowledgmentSigned: true,
    comprehensionVerified: true,
    notes: 'Annual HazCom refresher completed',
    expirationDate: '2025-12-15',
  },
  {
    id: '2',
    employeeName: 'Maria Garcia',
    employeeId: 'EMP-3156',
    department: 'Sanitation',
    jobTitle: 'Sanitation Lead',
    trainingDate: '2024-12-10',
    chemicalsReviewed: ['Chlorine Dioxide', 'Caustic Soda', 'Phosphoric Acid', 'Hydrogen Peroxide'],
    trainerName: 'Mike Thompson',
    acknowledgmentSigned: true,
    comprehensionVerified: true,
    notes: 'New chemical introduction - Chlorine Dioxide',
    expirationDate: '2025-12-10',
  },
];

const DEPARTMENTS = [
  'Production',
  'Sanitation',
  'Maintenance',
  'Quality',
  'Warehouse',
  'Shipping',
  'Receiving',
  'Administration',
];

const COMMON_CHEMICALS = [
  'Sodium Hypochlorite',
  'Peracetic Acid',
  'Quaternary Ammonia',
  'Caustic Soda',
  'Phosphoric Acid',
  'Chlorine Dioxide',
  'Hydrogen Peroxide',
  'Ammonia Refrigerant',
  'Lubricating Oil',
  'Degreaser',
];

export default function SDSReceiptScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<SDSReceiptEntry[]>(INITIAL_ENTRIES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SDSReceiptEntry | null>(null);

  const [formData, setFormData] = useState({
    employeeName: '',
    employeeId: '',
    department: '',
    jobTitle: '',
    trainingDate: new Date().toISOString().split('T')[0],
    chemicalsReviewed: [] as string[],
    trainerName: '',
    acknowledgmentSigned: false,
    comprehensionVerified: false,
    notes: '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const resetForm = () => {
    setFormData({
      employeeName: '',
      employeeId: '',
      department: '',
      jobTitle: '',
      trainingDate: new Date().toISOString().split('T')[0],
      chemicalsReviewed: [],
      trainerName: '',
      acknowledgmentSigned: false,
      comprehensionVerified: false,
      notes: '',
    });
    setEditingEntry(null);
  };

  const handleAddEntry = () => {
    if (!formData.employeeName.trim() || !formData.department) {
      Alert.alert('Required Fields', 'Please enter employee name and department.');
      return;
    }

    if (formData.chemicalsReviewed.length === 0) {
      Alert.alert('Required Fields', 'Please select at least one chemical reviewed.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const expirationDate = new Date(formData.trainingDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const newEntry: SDSReceiptEntry = {
      id: editingEntry?.id || Date.now().toString(),
      employeeName: formData.employeeName,
      employeeId: formData.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      department: formData.department,
      jobTitle: formData.jobTitle,
      trainingDate: formData.trainingDate,
      chemicalsReviewed: formData.chemicalsReviewed,
      trainerName: formData.trainerName,
      acknowledgmentSigned: formData.acknowledgmentSigned,
      comprehensionVerified: formData.comprehensionVerified,
      notes: formData.notes,
      expirationDate: expirationDate.toISOString().split('T')[0],
    };

    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? newEntry : e));
    } else {
      setEntries(prev => [newEntry, ...prev]);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleEditEntry = (entry: SDSReceiptEntry) => {
    setEditingEntry(entry);
    setFormData({
      employeeName: entry.employeeName,
      employeeId: entry.employeeId,
      department: entry.department,
      jobTitle: entry.jobTitle,
      trainingDate: entry.trainingDate,
      chemicalsReviewed: entry.chemicalsReviewed,
      trainerName: entry.trainerName,
      acknowledgmentSigned: entry.acknowledgmentSigned,
      comprehensionVerified: entry.comprehensionVerified,
      notes: entry.notes,
    });
    setShowAddModal(true);
  };

  const toggleChemical = (chemical: string) => {
    setFormData(prev => ({
      ...prev,
      chemicalsReviewed: prev.chemicalsReviewed.includes(chemical)
        ? prev.chemicalsReviewed.filter(c => c !== chemical)
        : [...prev.chemicalsReviewed, chemical],
    }));
  };

  const filteredEntries = entries.filter(entry =>
    entry.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExpiringSoon = (expirationDate: string) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  const isExpired = (expirationDate: string) => {
    return new Date(expirationDate) < new Date();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'SDS Receipt Acknowledgment',
          headerLeft: () => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
            <CheckCircle2 size={18} color="#10B981" />
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {entries.filter(e => !isExpired(e.expirationDate)).length}
            </Text>
            <Text style={[styles.statLabel, { color: '#10B981' }]}>Current</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' }]}>
            <Clock size={18} color="#F59E0B" />
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {entries.filter(e => isExpiringSoon(e.expirationDate)).length}
            </Text>
            <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Expiring</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
            <Users size={18} color="#3B82F6" />
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{entries.length}</Text>
            <Text style={[styles.statLabel, { color: '#3B82F6' }]}>Total</Text>
          </View>
        </View>

        {filteredEntries.map((entry) => (
          <Pressable
            key={entry.id}
            style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => handleEditEntry(entry)}
          >
            <View style={styles.entryHeader}>
              <View style={styles.employeeInfo}>
                <View style={[styles.avatarCircle, { backgroundColor: '#3B82F620' }]}>
                  <User size={20} color="#3B82F6" />
                </View>
                <View>
                  <Text style={[styles.employeeName, { color: colors.text }]}>{entry.employeeName}</Text>
                  <Text style={[styles.employeeId, { color: colors.textSecondary }]}>{entry.employeeId}</Text>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: isExpired(entry.expirationDate)
                    ? '#EF444420'
                    : isExpiringSoon(entry.expirationDate)
                      ? '#F59E0B20'
                      : '#10B98120',
                },
              ]}>
                <Text style={[
                  styles.statusText,
                  {
                    color: isExpired(entry.expirationDate)
                      ? '#EF4444'
                      : isExpiringSoon(entry.expirationDate)
                        ? '#F59E0B'
                        : '#10B981',
                  },
                ]}>
                  {isExpired(entry.expirationDate) ? 'Expired' : isExpiringSoon(entry.expirationDate) ? 'Expiring' : 'Current'}
                </Text>
              </View>
            </View>

            <View style={styles.entryDetails}>
              <View style={styles.detailRow}>
                <Building size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{entry.department}</Text>
                <Text style={[styles.separator, { color: colors.textSecondary }]}>•</Text>
                <Briefcase size={14} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>{entry.jobTitle}</Text>
              </View>
            </View>

            <View style={styles.chemicalsRow}>
              <FileText size={14} color={colors.textSecondary} />
              <Text style={[styles.chemicalsText, { color: colors.textSecondary }]} numberOfLines={1}>
                {entry.chemicalsReviewed.slice(0, 2).join(', ')}
                {entry.chemicalsReviewed.length > 2 && ` +${entry.chemicalsReviewed.length - 2} more`}
              </Text>
            </View>

            <View style={styles.verificationRow}>
              <View style={[
                styles.verificationBadge,
                { backgroundColor: entry.acknowledgmentSigned ? '#10B98115' : '#EF444415' },
              ]}>
                <CheckCircle2 size={12} color={entry.acknowledgmentSigned ? '#10B981' : '#EF4444'} />
                <Text style={[
                  styles.verificationText,
                  { color: entry.acknowledgmentSigned ? '#10B981' : '#EF4444' },
                ]}>
                  Signed
                </Text>
              </View>
              <View style={[
                styles.verificationBadge,
                { backgroundColor: entry.comprehensionVerified ? '#10B98115' : '#EF444415' },
              ]}>
                <CheckCircle2 size={12} color={entry.comprehensionVerified ? '#10B981' : '#EF4444'} />
                <Text style={[
                  styles.verificationText,
                  { color: entry.comprehensionVerified ? '#10B981' : '#EF4444' },
                ]}>
                  Verified
                </Text>
              </View>
            </View>

            <View style={styles.entryFooter}>
              <View style={styles.dateInfo}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  Trained: {entry.trainingDate}
                </Text>
              </View>
              <Text style={[styles.expirationText, { color: colors.textSecondary }]}>
                Exp: {entry.expirationDate}
              </Text>
            </View>
          </Pressable>
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={[styles.fab, { backgroundColor: '#3B82F6' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAddModal(false); resetForm(); }}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingEntry ? 'Edit Acknowledgment' : 'New Acknowledgment'}
            </Text>
            <Pressable onPress={handleAddEntry}>
              <Text style={[styles.saveButton, { color: '#3B82F6' }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Employee Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter employee name"
              placeholderTextColor={colors.textSecondary}
              value={formData.employeeName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, employeeName: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Employee ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Auto-generated if blank"
              placeholderTextColor={colors.textSecondary}
              value={formData.employeeId}
              onChangeText={(text) => setFormData(prev => ({ ...prev, employeeId: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Department *</Text>
            <View style={styles.chipContainer}>
              {DEPARTMENTS.map((dept) => (
                <Pressable
                  key={dept}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.department === dept ? '#3B82F620' : colors.surface,
                      borderColor: formData.department === dept ? '#3B82F6' : colors.border,
                    },
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, department: dept }))}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.department === dept ? '#3B82F6' : colors.textSecondary },
                  ]}>
                    {dept}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Job Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter job title"
              placeholderTextColor={colors.textSecondary}
              value={formData.jobTitle}
              onChangeText={(text) => setFormData(prev => ({ ...prev, jobTitle: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Training Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              value={formData.trainingDate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, trainingDate: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Chemicals Reviewed *</Text>
            <View style={styles.chipContainer}>
              {COMMON_CHEMICALS.map((chemical) => (
                <Pressable
                  key={chemical}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: formData.chemicalsReviewed.includes(chemical) ? '#EAB30820' : colors.surface,
                      borderColor: formData.chemicalsReviewed.includes(chemical) ? '#EAB308' : colors.border,
                    },
                  ]}
                  onPress={() => toggleChemical(chemical)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: formData.chemicalsReviewed.includes(chemical) ? '#EAB308' : colors.textSecondary },
                  ]}>
                    {chemical}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Trainer Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter trainer name"
              placeholderTextColor={colors.textSecondary}
              value={formData.trainerName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, trainerName: text }))}
            />

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Acknowledgment Signed</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.acknowledgmentSigned ? '#10B981' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, acknowledgmentSigned: !prev.acknowledgmentSigned }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.acknowledgmentSigned ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Comprehension Verified</Text>
              <Pressable
                style={[
                  styles.toggleButton,
                  { backgroundColor: formData.comprehensionVerified ? '#10B981' : colors.border },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, comprehensionVerified: !prev.comprehensionVerified }))}
              >
                <View style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: formData.comprehensionVerified ? 20 : 2 }],
                  },
                ]} />
              </Pressable>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Additional notes..."
              placeholderTextColor={colors.textSecondary}
              value={formData.notes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
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
  content: {
    padding: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center' as const,
    borderWidth: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  entryCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  employeeInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  entryDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  separator: {
    marginHorizontal: 2,
  },
  chemicalsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
  },
  chemicalsText: {
    fontSize: 12,
    flex: 1,
  },
  verificationRow: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 10,
  },
  verificationBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verificationText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  entryFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 10,
  },
  dateInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  expirationText: {
    fontSize: 11,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    fontSize: 18,
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
    fontWeight: '500' as const,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  chipContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  modalBottomPadding: {
    height: 40,
  },
  bottomPadding: {
    height: 80,
  },
});
