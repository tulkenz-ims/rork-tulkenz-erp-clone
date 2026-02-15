import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Lock,
  Key,
  User,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useEmployees, SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import { useSetSignaturePin, generateUniqueInitials } from '@/hooks/usePinSignature';
import { getDepartmentName, getDepartmentColor } from '@/constants/organizationCodes';
import * as Haptics from 'expo-haptics';

export default function SignaturePinScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<SupabaseEmployee | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [customInitials, setCustomInitials] = useState('');

  const { data: employees = [], isLoading, refetch } = useEmployees({ status: 'active' });

  const setPin = useSetSignaturePin({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('PIN Set', `Signature PIN has been set for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}.`);
      closeSetup();
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((e: SupabaseEmployee) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      (e as any).signature_initials?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const existingInitials = useMemo(() =>
    employees.map((e: any) => e.signature_initials || '').filter(Boolean),
    [employees]
  );

  const pinSetCount = useMemo(() =>
    employees.filter((e: any) => e.signature_pin_set).length,
    [employees]
  );

  const openSetup = useCallback((emp: SupabaseEmployee) => {
    setSelectedEmployee(emp);
    const initials = (emp as any).signature_initials ||
      generateUniqueInitials(emp.first_name, emp.last_name, existingInitials);
    setCustomInitials(initials);
    setNewPin('');
    setConfirmPin('');
    setShowSetup(true);
  }, [existingInitials]);

  const closeSetup = useCallback(() => {
    setShowSetup(false);
    setSelectedEmployee(null);
    setNewPin('');
    setConfirmPin('');
    setCustomInitials('');
  }, []);

  const handleSavePin = useCallback(() => {
    if (!selectedEmployee) return;
    if (newPin.length < 4) {
      Alert.alert('Invalid', 'PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match.');
      return;
    }
    if (!customInitials.trim()) {
      Alert.alert('Required', 'Initials are required.');
      return;
    }

    setPin.mutate({
      employeeId: selectedEmployee.id,
      pin: newPin,
      initials: customInitials.trim(),
    });
  }, [selectedEmployee, newPin, confirmPin, customInitials, setPin]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Shield size={22} color="#8B5CF6" />
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Signature PIN Setup</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {pinSetCount} of {employees.length} employees have PINs
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, {
            backgroundColor: '#10B981',
            width: `${employees.length > 0 ? (pinSetCount / employees.length) * 100 : 0}%`,
          }]} />
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search employees..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Employee list */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {filtered.map((emp: SupabaseEmployee) => {
          const hasPinSet = (emp as any).signature_pin_set;
          const initials = (emp as any).signature_initials || '';
          const deptColor = getDepartmentColor(emp.department_code || '') || '#6B7280';
          const deptName = getDepartmentName(emp.department_code || '') || emp.position;

          return (
            <TouchableOpacity
              key={emp.id}
              style={[styles.empCard, { backgroundColor: colors.surface, borderLeftColor: hasPinSet ? '#10B981' : '#EF4444' }]}
              onPress={() => openSetup(emp)}
              activeOpacity={0.7}
            >
              <View style={styles.empRow}>
                <View style={styles.empLeft}>
                  {/* Avatar with initials */}
                  <View style={[styles.avatar, { backgroundColor: hasPinSet ? '#10B98120' : '#EF444420' }]}>
                    <Text style={[styles.avatarText, { color: hasPinSet ? '#10B981' : '#EF4444' }]}>
                      {initials || (emp.first_name.charAt(0) + emp.last_name.charAt(0)).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={[styles.empName, { color: colors.text }]}>
                      {emp.first_name} {emp.last_name}
                    </Text>
                    <View style={styles.empMeta}>
                      <View style={[styles.deptBadge, { backgroundColor: deptColor + '20' }]}>
                        <Text style={[styles.deptText, { color: deptColor }]}>{deptName}</Text>
                      </View>
                      <Text style={[styles.empCode, { color: colors.textTertiary }]}>{emp.employee_code}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.empRight}>
                  {hasPinSet ? (
                    <View style={styles.statusBadge}>
                      <CheckCircle size={14} color="#10B981" />
                      <Text style={styles.statusSet}>PIN Set</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadge}>
                      <XCircle size={14} color="#EF4444" />
                      <Text style={styles.statusNotSet}>No PIN</Text>
                    </View>
                  )}
                  <Key size={16} color={colors.textTertiary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && !isLoading && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <User size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {search ? `No employees match "${search}"` : 'No active employees found'}
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* PIN Setup Modal */}
      <Modal visible={showSetup} transparent animationType="slide" onRequestClose={closeSetup}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Lock size={20} color="#8B5CF6" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {(selectedEmployee as any)?.signature_pin_set ? 'Reset' : 'Set'} Signature PIN
                </Text>
              </View>
              <TouchableOpacity onPress={closeSetup}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEmployee && (
              <ScrollView style={styles.modalBody}>
                {/* Employee info */}
                <View style={[styles.empBanner, { backgroundColor: colors.background }]}>
                  <View style={[styles.bannerAvatar, { backgroundColor: '#8B5CF620' }]}>
                    <Text style={[styles.bannerAvatarText, { color: '#8B5CF6' }]}>
                      {selectedEmployee.first_name.charAt(0)}{selectedEmployee.last_name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.bannerName, { color: colors.text }]}>
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </Text>
                    <Text style={[styles.bannerCode, { color: colors.textSecondary }]}>
                      {selectedEmployee.employee_code} — {selectedEmployee.position}
                    </Text>
                  </View>
                </View>

                {/* Initials */}
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Signature Initials</Text>
                <Text style={[styles.fieldHelp, { color: colors.textSecondary }]}>
                  Auto-generated from name. Override if needed (e.g., duplicate initials).
                </Text>
                <TextInput
                  style={[styles.initialsInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  value={customInitials}
                  onChangeText={(t) => setCustomInitials(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={4}
                  autoCapitalize="characters"
                  placeholder="SR"
                  placeholderTextColor={colors.textTertiary}
                />

                {/* New PIN */}
                <Text style={[styles.fieldLabel, { color: colors.text }]}>New PIN (4-6 digits)</Text>
                <TextInput
                  style={[styles.pinInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  value={newPin}
                  onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor={colors.textTertiary}
                />

                {/* Confirm PIN */}
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Confirm PIN</Text>
                <TextInput
                  style={[styles.pinInput, {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: confirmPin.length >= 4 && confirmPin !== newPin ? '#EF4444' : colors.border,
                  }]}
                  value={confirmPin}
                  onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, ''))}
                  maxLength={6}
                  keyboardType="number-pad"
                  secureTextEntry
                  placeholder="••••"
                  placeholderTextColor={colors.textTertiary}
                />
                {confirmPin.length >= 4 && confirmPin !== newPin && (
                  <Text style={styles.mismatchText}>PINs do not match</Text>
                )}

                {/* Preview */}
                {newPin.length >= 4 && confirmPin === newPin && customInitials.length >= 2 && (
                  <View style={[styles.previewBox, { backgroundColor: '#10B98110', borderColor: '#10B981' }]}>
                    <CheckCircle size={16} color="#10B981" />
                    <View style={styles.previewContent}>
                      <Text style={[styles.previewLabel, { color: '#10B981' }]}>Signature preview:</Text>
                      <Text style={[styles.previewStamp, { color: colors.text }]}>
                        {selectedEmployee.first_name} {selectedEmployee.last_name} — verified by PPN — {
                          new Date().toLocaleDateString('en-US')
                        }
                      </Text>
                      <Text style={[styles.previewInitials, { color: colors.textSecondary }]}>
                        Initials: {customInitials}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>
            )}

            {/* Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={closeSetup}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: newPin.length >= 4 && confirmPin === newPin && customInitials.length >= 2
                    ? '#8B5CF6' : colors.border,
                }]}
                onPress={handleSavePin}
                disabled={setPin.isPending || newPin.length < 4 || confirmPin !== newPin || customInitials.length < 2}
              >
                {setPin.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Shield size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Save PIN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  list: { flex: 1, padding: 16 },
  empCard: { borderLeftWidth: 3, borderRadius: 10, padding: 14, marginBottom: 8 },
  empRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  empInfo: { flex: 1, gap: 4 },
  empName: { fontSize: 15, fontWeight: '600' },
  empMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  deptText: { fontSize: 11, fontWeight: '600' },
  empCode: { fontSize: 11 },
  empRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusSet: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  statusNotSet: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  emptyState: { alignItems: 'center', padding: 32, borderRadius: 12, gap: 8 },
  emptyText: { fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { paddingHorizontal: 20, paddingTop: 14 },
  empBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  bannerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bannerAvatarText: { fontSize: 16, fontWeight: '800' },
  bannerName: { fontSize: 16, fontWeight: '700' },
  bannerCode: { fontSize: 12, marginTop: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4, marginTop: 12 },
  fieldHelp: { fontSize: 11, marginBottom: 6 },
  initialsInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: 3, width: 120 },
  pinInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700', letterSpacing: 6 },
  mismatchText: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 4 },
  previewBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  previewContent: { flex: 1, gap: 4 },
  previewLabel: { fontSize: 12, fontWeight: '700' },
  previewStamp: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  previewInitials: { fontSize: 11 },
  modalFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
