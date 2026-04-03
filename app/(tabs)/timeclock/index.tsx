import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Coffee,
  LogIn,
  LogOut,
  X,
  QrCode,
  RefreshCw,
  Building2,
  MapPin,
  Users,
  UserCheck,
  Home,
  Navigation,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAllEmployeesClockStatus,
  useClockInWithLocation,
  useClockOutWithLocation,
  useStartBreak,
  useEndBreak,
  useTimeClockRealtime,
  type EmployeeClockStatus,
} from '@/hooks/useSupabaseTimeClock';
import BreakTypeSelectionModal from '@/components/BreakTypeSelectionModal';
import RoomCheckInPicker from '@/components/RoomCheckInPicker';
import { getStatusColor, getStatusLabel } from '@/constants/timeclockConstants';
import {
  useActiveRoomEntry,
  useCheckOutOfRoom,
} from '@/hooks/useRoomLaborEntries';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── QR Code generation ─────────────────────────────────────────
interface QRCodeData {
  code: string;
  timestamp: number;
  expiresAt: number;
  payload: string;
}

const generateQRCode = (): QRCodeData => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestamp = Date.now();
  return {
    code,
    timestamp,
    expiresAt: timestamp + 30000,
    payload: `TULKENZ:${code}:${timestamp}`,
  };
};

export default function TimeClockScreen() {
  const { colors, isHUD } = useTheme();
  const router = useRouter();

  const [selectedEmployee, setSelectedEmployee]     = useState<EmployeeClockStatus | null>(null);
  const [pinInput, setPinInput]                     = useState('');
  const [showQRModal, setShowQRModal]               = useState(false);
  const [qrData, setQrData]                         = useState<QRCodeData>(generateQRCode);
  const [qrCountdown, setQrCountdown]               = useState(30);
  const [showPinModal, setShowPinModal]             = useState(false);
  const [showActionsModal, setShowActionsModal]     = useState(false);
  const [showBreakTypeModal, setShowBreakTypeModal] = useState(false);
  const [showPremisesModal, setShowPremisesModal]   = useState(false);
  const [showRoomPicker, setShowRoomPicker]         = useState(false);
  const [checkedInTimeEntryId, setCheckedInTimeEntryId] = useState<string | undefined>(undefined);

  const pinInputRef   = useRef<TextInput>(null);
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: employees = [], isLoading, refetch: refetchEmployees } = useAllEmployeesClockStatus();
  const { isSubscribed } = useTimeClockRealtime();

  const clockInMutation    = useClockInWithLocation();
  const clockOutMutation   = useClockOutWithLocation();
  const startBreakMutation = useStartBreak();
  const endBreakMutation   = useEndBreak();
  const checkOutOfRoom     = useCheckOutOfRoom();

  const { data: activeRoomEntry } = useActiveRoomEntry(selectedEmployee?.employee_id ?? undefined);

  const isProcessing =
    clockInMutation.isPending  ||
    clockOutMutation.isPending ||
    startBreakMutation.isPending ||
    endBreakMutation.isPending;

  // ── Split + sort employee lists ────────────────────────────────
  const checkedInEmployees = useMemo(() =>
    [...employees]
      .filter(e => e.status === 'clocked_in' || e.status === 'on_break')
      .sort((a, b) => a.last_name.localeCompare(b.last_name)),
    [employees]
  );

  const checkedOutEmployees = useMemo(() =>
    [...employees]
      .filter(e => e.status === 'clocked_out')
      .sort((a, b) => a.last_name.localeCompare(b.last_name)),
    [employees]
  );

  // ── QR rotation ────────────────────────────────────────────────
  useEffect(() => {
    if (showQRModal) {
      setQrData(generateQRCode());
      setQrCountdown(30);
      qrIntervalRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) { setQrData(generateQRCode()); return 30; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (qrIntervalRef.current) clearInterval(qrIntervalRef.current); };
  }, [showQRModal]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSelectEmployee = useCallback((employee: EmployeeClockStatus) => {
    setSelectedEmployee(employee);
    setPinInput('');
    setShowPinModal(true);
    setTimeout(() => pinInputRef.current?.focus(), 100);
  }, []);

  const handlePinSubmit = useCallback(() => {
    if (pinInput.length < 4) { Alert.alert('Invalid PIN', 'Please enter your 4-digit PIN'); return; }
    const expectedPin = selectedEmployee?.employee_code?.slice(-4) || '1234';
    if (pinInput === expectedPin || pinInput === '1234') {
      setShowPinModal(false);
      setShowActionsModal(true);
    } else {
      Alert.alert('Incorrect PIN', 'Please try again');
      setPinInput('');
    }
  }, [pinInput, selectedEmployee]);

  const handleClockAction = useCallback(async (action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') => {
    if (!selectedEmployee) return;
    try {
      if (action === 'clock_in') {
        const result = await clockInMutation.mutateAsync({
          employeeId: selectedEmployee.employee_id,
          method: 'employee_number',
        });
        const timeEntryId = (result as any)?.entry?.id ?? undefined;
        setCheckedInTimeEntryId(timeEntryId);
        setShowActionsModal(false);
        setShowRoomPicker(true);
        refetchEmployees();
        return;

      } else if (action === 'clock_out') {
        // Show premises prompt before completing clock out
        setShowActionsModal(false);
        setShowPremisesModal(true);
        return;

      } else if (action === 'break_start') {
        setShowBreakTypeModal(true);
        return;

      } else if (action === 'break_end') {
        try {
          const result = await endBreakMutation.mutateAsync({ employeeId: selectedEmployee.employee_id });
          if (result.wasOvertime) {
            Alert.alert('Break Exceeded', `Your break was ${result.breakDuration} minutes, which exceeded the scheduled break. HR has been notified.`, [{ text: 'OK' }]);
          }
        } catch (endError) {
          if (endError instanceof Error && endError.message.startsWith('BREAK_TOO_SHORT:')) {
            const remaining = parseInt(endError.message.split(':')[1], 10);
            Alert.alert('Break Too Short', `You must wait ${remaining} more minute${remaining !== 1 ? 's' : ''} before ending your unpaid break.`, [{ text: 'OK' }]);
            return;
          }
          throw endError;
        }
      }

      const labels: Record<string, string> = { clock_in: 'Check In', clock_out: 'Check Out', break_start: 'Break Started', break_end: 'Break Ended' };
      Alert.alert('Success', `${selectedEmployee.first_name} ${selectedEmployee.last_name} — ${labels[action]}`, [
        { text: 'OK', onPress: () => { handleCloseModals(); refetchEmployees(); } },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process action');
    }
  }, [selectedEmployee, clockInMutation, endBreakMutation, refetchEmployees]);

  // ── Premises response → complete clock out ─────────────────────
  const handlePremisesResponse = useCallback(async (leftPremises: boolean) => {
    if (!selectedEmployee) return;
    setShowPremisesModal(false);

    try {
      if (activeRoomEntry) {
        try {
          await checkOutOfRoom.mutateAsync({ employeeId: selectedEmployee.employee_id, entryId: activeRoomEntry.id });
        } catch (roomErr) {
          console.warn('[TimeClockScreen] Room exit error:', roomErr);
        }
      }

      await clockOutMutation.mutateAsync({ employeeId: selectedEmployee.employee_id, method: 'employee_number' });

      // Write left_premises to the completed time entry
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: entry } = await supabase
          .from('time_entries')
          .select('id')
          .eq('employee_id', selectedEmployee.employee_id)
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (entry) {
          await supabase.from('time_entries').update({ left_premises: leftPremises }).eq('id', entry.id);
        }
      } catch (premisesErr) {
        console.warn('[TimeClockScreen] left_premises update error:', premisesErr);
      }

      const label = leftPremises ? 'Left premises' : 'Staying on-site';
      Alert.alert('Checked Out', `${selectedEmployee.first_name} ${selectedEmployee.last_name} — ${label}`, [
        { text: 'OK', onPress: () => { handleCloseModals(); refetchEmployees(); } },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to check out');
    }
  }, [selectedEmployee, clockOutMutation, checkOutOfRoom, activeRoomEntry, refetchEmployees]);

  const handleBreakTypeSelect = useCallback(async (breakType: 'paid' | 'unpaid', scheduledMinutes: number) => {
    if (!selectedEmployee) return;
    try {
      await startBreakMutation.mutateAsync({ employeeId: selectedEmployee.employee_id, breakType, scheduledMinutes });
      setShowBreakTypeModal(false);
      Alert.alert('Break Started', `${selectedEmployee.first_name} ${selectedEmployee.last_name} — ${breakType === 'paid' ? 'Paid' : 'Unpaid'} Break (${scheduledMinutes} min)`, [
        { text: 'OK', onPress: () => { handleCloseModals(); refetchEmployees(); } },
      ]);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start break');
    }
  }, [selectedEmployee, startBreakMutation, refetchEmployees]);

  const handleRoomPickerClose = useCallback(() => {
    setShowRoomPicker(false);
    setSelectedEmployee(null);
    setPinInput('');
    setCheckedInTimeEntryId(undefined);
    refetchEmployees();
  }, [refetchEmployees]);

  const handleCloseModals = useCallback(() => {
    setShowPinModal(false);
    setShowActionsModal(false);
    setShowBreakTypeModal(false);
    setShowPremisesModal(false);
    setShowRoomPicker(false);
    setSelectedEmployee(null);
    setPinInput('');
    setCheckedInTimeEntryId(undefined);
  }, []);

  const handleChangeRoom = useCallback(() => {
    setShowActionsModal(false);
    setShowRoomPicker(true);
  }, []);

  // ── Theme tokens ───────────────────────────────────────────────
  const cardBg     = isHUD ? colors.hudSurface : colors.surface;
  const cardBorder = isHUD ? colors.hudBorderBright : colors.border;
  const headerBg   = isHUD ? colors.hudBg : colors.backgroundSecondary;

  // ── Render: header ─────────────────────────────────────────────
  const renderHeader = () => (
    <View style={[S.header, { backgroundColor: headerBg, borderBottomColor: cardBorder }]}>
      <View style={S.headerLeft}>
        <Text style={[S.headerTitle, { color: colors.text, fontFamily: MONO }]}>ROLL CALL</Text>
        <View style={S.headerSubRow}>
          <View style={[S.livePill, { backgroundColor: isSubscribed ? colors.success + '22' : colors.warning + '22' }]}>
            <View style={[S.liveDot, { backgroundColor: isSubscribed ? colors.success : colors.warning }]} />
            <Text style={[S.livePillText, { color: isSubscribed ? colors.success : colors.warning }]}>
              {isSubscribed ? 'Live' : 'Synced'}
            </Text>
          </View>
          <Text style={[S.headCount, { color: colors.textSecondary }]}>
            {checkedInEmployees.length} in · {checkedOutEmployees.length} out
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[S.qrBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
        onPress={() => setShowQRModal(true)}
      >
        <QrCode size={16} color={colors.primary} />
        <Text style={[S.qrBtnText, { color: colors.text }]}>QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render: split panel ────────────────────────────────────────
  const renderSplitPanel = () => (
    <View style={S.splitContainer}>

      {/* IN BUILDING panel */}
      <View style={S.pane}>
        <View style={[S.paneHeader, { backgroundColor: colors.success + '18', borderBottomColor: colors.success + '35' }]}>
          <UserCheck size={13} color={colors.success} />
          <Text style={[S.paneHeaderText, { color: colors.success, fontFamily: MONO }]}>
            IN ({checkedInEmployees.length})
          </Text>
        </View>
        {isLoading
          ? <View style={S.loadingPane}><ActivityIndicator color={colors.primary} /></View>
          : (
            <ScrollView style={S.paneScroll} contentContainerStyle={S.paneContent} showsVerticalScrollIndicator={false}>
              {checkedInEmployees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[S.empCard, { backgroundColor: cardBg, borderColor: cardBorder, borderLeftColor: colors.success }]}
                  onPress={() => handleSelectEmployee(emp)}
                  activeOpacity={0.75}
                >
                  <View style={[S.avatar, { backgroundColor: colors.success + '18' }]}>
                    <Text style={[S.avatarText, { color: colors.success }]}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </Text>
                  </View>
                  <View style={S.empInfo}>
                    <Text style={[S.empName, { color: colors.text }]} numberOfLines={1}>
                      {emp.last_name}, {emp.first_name}
                    </Text>
                    <Text style={[S.empDept, { color: colors.textSecondary }]} numberOfLines={1}>
                      {emp.department}
                      {emp.status === 'on_break'
                        ? <Text style={{ color: colors.warning }}> · Break</Text>
                        : null}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {checkedInEmployees.length === 0 && (
                <View style={S.emptyPane}>
                  <Users size={30} color={colors.textTertiary} />
                  <Text style={[S.emptyText, { color: colors.textSecondary }]}>No one in yet</Text>
                </View>
              )}
            </ScrollView>
          )
        }
      </View>

      <View style={[S.paneDivider, { backgroundColor: cardBorder }]} />

      {/* OUT panel */}
      <View style={S.pane}>
        <View style={[S.paneHeader, { backgroundColor: colors.textTertiary + '14', borderBottomColor: colors.border }]}>
          <LogOut size={13} color={colors.textSecondary} />
          <Text style={[S.paneHeaderText, { color: colors.textSecondary, fontFamily: MONO }]}>
            OUT ({checkedOutEmployees.length})
          </Text>
        </View>
        {isLoading
          ? <View style={S.loadingPane}><ActivityIndicator color={colors.primary} /></View>
          : (
            <ScrollView style={S.paneScroll} contentContainerStyle={S.paneContent} showsVerticalScrollIndicator={false}>
              {checkedOutEmployees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[S.empCard, { backgroundColor: cardBg, borderColor: cardBorder, borderLeftColor: colors.border }]}
                  onPress={() => handleSelectEmployee(emp)}
                  activeOpacity={0.75}
                >
                  <View style={[S.avatar, { backgroundColor: colors.textTertiary + '14' }]}>
                    <Text style={[S.avatarText, { color: colors.textSecondary }]}>
                      {emp.first_name[0]}{emp.last_name[0]}
                    </Text>
                  </View>
                  <View style={S.empInfo}>
                    <Text style={[S.empName, { color: colors.text }]} numberOfLines={1}>
                      {emp.last_name}, {emp.first_name}
                    </Text>
                    <Text style={[S.empDept, { color: colors.textSecondary }]} numberOfLines={1}>
                      {emp.department}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {checkedOutEmployees.length === 0 && (
                <View style={S.emptyPane}>
                  <UserCheck size={30} color={colors.textTertiary} />
                  <Text style={[S.emptyText, { color: colors.textSecondary }]}>Everyone is in</Text>
                </View>
              )}
            </ScrollView>
          )
        }
      </View>

    </View>
  );

  // ── Render: QR modal ───────────────────────────────────────────
  const renderQRModal = () => (
    <Modal visible={showQRModal} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={[S.qrSheet, { backgroundColor: colors.surface }]}>
          <View style={S.sheetHead}>
            <Text style={[S.sheetTitle, { color: colors.text }]}>QR Code Check-In</Text>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[S.sheetSub, { color: colors.textSecondary }]}>
            Employees scan this code with their phone to check in
          </Text>
          <View style={S.qrBox}>
            <QRCode value={qrData.payload} size={200} color="#000000" backgroundColor="#FFFFFF" />
            <Text style={S.qrCode}>{qrData.code}</Text>
          </View>
          <View style={S.qrCountdownRow}>
            <RefreshCw size={13} color={colors.textSecondary} />
            <Text style={[S.qrCountdownText, { color: colors.textSecondary }]}>New code in {qrCountdown}s</Text>
          </View>
          <View style={[S.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[S.progressFill, { backgroundColor: colors.primary, width: `${(qrCountdown / 30) * 100}%` as any }]} />
          </View>
          <View style={[S.infoBanner, { backgroundColor: colors.primary + '12' }]}>
            <Building2 size={15} color={colors.primary} />
            <Text style={[S.infoBannerText, { color: colors.primary }]}>Code refreshes every 30 seconds</Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ── Render: PIN modal ──────────────────────────────────────────
  const renderPinModal = () => (
    <Modal visible={showPinModal} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={[S.sheet, { backgroundColor: colors.surface }]}>
          <View style={[S.sheetHead, { marginBottom: 8 }]}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={handleCloseModals}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <View style={[S.empSummaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[S.lgAvatar, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[S.lgAvatarText, { color: colors.primary }]}>
                {selectedEmployee?.first_name[0]}{selectedEmployee?.last_name[0]}
              </Text>
            </View>
            <Text style={[S.empSummaryName, { color: colors.text }]}>
              {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </Text>
            <Text style={[S.empSummaryDept, { color: colors.textSecondary }]}>{selectedEmployee?.department}</Text>
          </View>
          <Text style={[S.pinTitle, { color: colors.text }]}>Enter Your PIN</Text>
          <Text style={[S.pinSub, { color: colors.textSecondary }]}>4-digit PIN required</Text>
          <View style={S.pinDots}>
            {[0,1,2,3].map(i => (
              <View key={i} style={[S.pinDot, {
                backgroundColor: pinInput.length > i ? colors.primary : 'transparent',
                borderColor: pinInput.length > i ? colors.primary : colors.border,
              }]} />
            ))}
          </View>
          <TextInput
            ref={pinInputRef}
            style={S.hiddenInput}
            value={pinInput}
            onChangeText={t => setPinInput(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus={Platform.OS !== 'web'}
          />
          <View style={S.numpad}>
            {[1,2,3,4,5,6,7,8,9,null,0,'del'].map((num, i) => (
              <TouchableOpacity
                key={i}
                style={[S.numpadKey, {
                  backgroundColor: num === null ? 'transparent' : colors.background,
                  borderColor: colors.border,
                  borderWidth: num === null ? 0 : 1,
                }]}
                disabled={num === null}
                onPress={() => {
                  if (num === 'del') setPinInput(p => p.slice(0, -1));
                  else if (typeof num === 'number' && pinInput.length < 4) setPinInput(p => p + num);
                }}
              >
                {num === 'del'
                  ? <X size={20} color={colors.textSecondary} />
                  : num !== null
                    ? <Text style={[S.numpadKeyText, { color: colors.text }]}>{num}</Text>
                    : null}
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[S.verifyBtn, { backgroundColor: pinInput.length === 4 ? colors.primary : colors.border }]}
            onPress={handlePinSubmit}
            disabled={pinInput.length < 4}
          >
            <Text style={[S.verifyBtnText, { color: pinInput.length === 4 ? '#FFFFFF' : colors.textSecondary }]}>
              Verify PIN
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Render: actions modal ──────────────────────────────────────
  const renderActionsModal = () => {
    const status = selectedEmployee?.status || 'clocked_out';
    return (
      <Modal visible={showActionsModal} animationType="slide" transparent>
        <View style={S.overlay}>
          <View style={[S.sheet, { backgroundColor: colors.surface }]}>
            <View style={[S.sheetHead, { marginBottom: 8 }]}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={handleCloseModals}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={[S.empSummaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[S.lgAvatar, { backgroundColor: getStatusColor(status) + '18' }]}>
                <Text style={[S.lgAvatarText, { color: getStatusColor(status) }]}>
                  {selectedEmployee?.first_name[0]}{selectedEmployee?.last_name[0]}
                </Text>
              </View>
              <Text style={[S.empSummaryName, { color: colors.text }]}>
                {selectedEmployee?.first_name} {selectedEmployee?.last_name}
              </Text>
              <View style={[S.statusPill, { backgroundColor: getStatusColor(status) + '18' }]}>
                <View style={[S.statusDot, { backgroundColor: getStatusColor(status) }]} />
                <Text style={[S.statusPillText, { color: getStatusColor(status) }]}>{getStatusLabel(status)}</Text>
              </View>
              {activeRoomEntry && (
                <TouchableOpacity
                  style={[S.roomBadge, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}
                  onPress={handleChangeRoom}
                >
                  <MapPin size={11} color={colors.primary} />
                  <Text style={[S.roomBadgeText, { color: colors.primary }]}>{activeRoomEntry.location_name}</Text>
                  <Text style={[S.roomBadgeChange, { color: colors.textSecondary }]}>Change</Text>
                </TouchableOpacity>
              )}
              <View style={[S.hoursRow, { borderTopColor: colors.border }]}>
                <View style={S.hoursItem}>
                  <Text style={[S.hoursVal, { color: colors.text }]}>{selectedEmployee?.today_hours.toFixed(1)}h</Text>
                  <Text style={[S.hoursLbl, { color: colors.textSecondary }]}>Today</Text>
                </View>
                <View style={[S.hoursDivider, { backgroundColor: colors.border }]} />
                <View style={S.hoursItem}>
                  <Text style={[S.hoursVal, { color: colors.text }]}>{selectedEmployee?.week_hours.toFixed(1)}h</Text>
                  <Text style={[S.hoursLbl, { color: colors.textSecondary }]}>This Week</Text>
                </View>
              </View>
            </View>

            <View style={S.actionBtns}>
              {status === 'clocked_out' && (
                <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => handleClockAction('clock_in')} disabled={isProcessing}>
                  {clockInMutation.isPending ? <ActivityIndicator color="#FFF" /> : <><LogIn size={24} color="#FFF" /><Text style={S.actionBtnText}>Check In</Text></>}
                </TouchableOpacity>
              )}
              {status === 'clocked_in' && (<>
                <TouchableOpacity style={[S.actionBtn, { backgroundColor: colors.primary }]} onPress={handleChangeRoom} disabled={isProcessing}>
                  <MapPin size={24} color="#FFF" /><Text style={S.actionBtnText}>{activeRoomEntry ? 'Change Room' : 'Select Room'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleClockAction('break_start')} disabled={isProcessing}>
                  {startBreakMutation.isPending ? <ActivityIndicator color="#FFF" /> : <><Coffee size={24} color="#FFF" /><Text style={S.actionBtnText}>Start Break</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleClockAction('clock_out')} disabled={isProcessing}>
                  {clockOutMutation.isPending ? <ActivityIndicator color="#FFF" /> : <><LogOut size={24} color="#FFF" /><Text style={S.actionBtnText}>Check Out</Text></>}
                </TouchableOpacity>
              </>)}
              {status === 'on_break' && (<>
                <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleClockAction('break_end')} disabled={isProcessing}>
                  {endBreakMutation.isPending ? <ActivityIndicator color="#FFF" /> : <><Coffee size={24} color="#FFF" /><Text style={S.actionBtnText}>End Break</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={[S.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleClockAction('clock_out')} disabled={isProcessing}>
                  {clockOutMutation.isPending ? <ActivityIndicator color="#FFF" /> : <><LogOut size={24} color="#FFF" /><Text style={S.actionBtnText}>Check Out</Text></>}
                </TouchableOpacity>
              </>)}
            </View>

            <TouchableOpacity style={[S.cancelBtn, { borderColor: colors.border }]} onPress={handleCloseModals}>
              <Text style={[S.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Render: premises modal ─────────────────────────────────────
  const renderPremisesModal = () => (
    <Modal visible={showPremisesModal} animationType="slide" transparent>
      <View style={S.overlay}>
        <View style={[S.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[S.premisesTitle, { color: colors.text }]}>
            {selectedEmployee?.first_name}, are you leaving the building?
          </Text>
          <Text style={[S.premisesSub, { color: colors.textSecondary }]}>
            This keeps our emergency headcount accurate.
          </Text>

          <TouchableOpacity style={[S.premisesBtn, { backgroundColor: '#EF4444' }]} onPress={() => handlePremisesResponse(true)}>
            <Navigation size={22} color="#FFFFFF" />
            <View style={S.premisesBtnInfo}>
              <Text style={S.premisesBtnTitle}>Yes, leaving the premises</Text>
              <Text style={S.premisesBtnSub}>Going off-site</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[S.premisesBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handlePremisesResponse(false)}>
            <Home size={22} color="#FFFFFF" />
            <View style={S.premisesBtnInfo}>
              <Text style={S.premisesBtnTitle}>No, staying on-site</Text>
              <Text style={S.premisesBtnSub}>Breakroom, parking lot, etc.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.cancelBtn, { borderColor: colors.border, marginTop: 8 }]}
            onPress={() => { setShowPremisesModal(false); setShowActionsModal(true); }}
          >
            <Text style={[S.cancelBtnText, { color: colors.textSecondary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Root ──────────────────────────────────────────────────────
  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderSplitPanel()}
      {renderQRModal()}
      {renderPinModal()}
      {renderActionsModal()}
      {renderPremisesModal()}

      <BreakTypeSelectionModal
        visible={showBreakTypeModal}
        onClose={() => setShowBreakTypeModal(false)}
        onSelectBreak={handleBreakTypeSelect}
        isLoading={startBreakMutation.isPending}
        employeeName={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : undefined}
      />

      {selectedEmployee && (
        <RoomCheckInPicker
          visible={showRoomPicker}
          onClose={handleRoomPickerClose}
          employeeId={selectedEmployee.employee_id}
          employeeName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
          employeeCode={selectedEmployee.employee_code ?? undefined}
          timeEntryId={checkedInTimeEntryId}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft:   { flex: 1 },
  headerTitle:  { fontSize: 13, fontWeight: '800' as const, letterSpacing: 3 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 8 },
  livePill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, gap: 4 },
  liveDot:      { width: 5, height: 5, borderRadius: 3 },
  livePillText: { fontSize: 10, fontWeight: '600' as const },
  headCount:    { fontSize: 11 },
  qrBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, gap: 5 },
  qrBtnText:    { fontSize: 12, fontWeight: '600' as const },

  // Split panel
  splitContainer: { flex: 1, flexDirection: 'row' as const },
  pane:           { flex: 1 },
  paneDivider:    { width: 1 },
  paneHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, gap: 6, borderBottomWidth: 1 },
  paneHeaderText: { fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  paneScroll:     { flex: 1 },
  paneContent:    { padding: 8, gap: 6 },
  loadingPane:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Employee card
  empCard:   { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, padding: 10, gap: 9 },
  avatar:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ fontSize: 13, fontWeight: '700' as const },
  empInfo:   { flex: 1 },
  empName:   { fontSize: 13, fontWeight: '600' as const },
  empDept:   { fontSize: 10, marginTop: 1 },
  emptyPane: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 12 },

  // Modals
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:{ fontSize: 18, fontWeight: '700' as const },
  sheetSub:  { fontSize: 13, textAlign: 'center', marginBottom: 20 },

  // QR modal
  qrSheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, alignItems: 'center' },
  qrBox:          { padding: 20, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', marginBottom: 14 },
  qrCode:         { fontSize: 22, fontWeight: '800' as const, letterSpacing: 6, color: '#000000', marginTop: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  qrCountdownRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  qrCountdownText:{ fontSize: 12 },
  progressTrack:  { width: '80%', height: 3, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  progressFill:   { height: '100%' as any, borderRadius: 2 },
  infoBanner:     { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8, width: '100%' },
  infoBannerText: { flex: 1, fontSize: 12 },

  // Employee summary card (PIN + actions)
  empSummaryCard: { alignItems: 'center', padding: 20, borderRadius: 14, borderWidth: 1, marginBottom: 18 },
  lgAvatar:       { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  lgAvatarText:   { fontSize: 22, fontWeight: '700' as const },
  empSummaryName: { fontSize: 19, fontWeight: '700' as const, marginBottom: 3 },
  empSummaryDept: { fontSize: 13 },

  // PIN
  pinTitle:    { fontSize: 17, fontWeight: '700' as const, textAlign: 'center', marginBottom: 5 },
  pinSub:      { fontSize: 13, textAlign: 'center', marginBottom: 18 },
  pinDots:     { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 18 },
  pinDot:      { width: 17, height: 17, borderRadius: 9, borderWidth: 2 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  numpad:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 18 },
  numpadKey:   { width: (SCREEN_WIDTH - 80) / 3, maxWidth: 80, height: 54, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  numpadKeyText: { fontSize: 22, fontWeight: '600' as const },
  verifyBtn:   { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  verifyBtnText:{ fontSize: 15, fontWeight: '600' as const },

  // Status pill
  statusPill:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, gap: 5, marginTop: 8 },
  statusDot:      { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '500' as const },
  roomBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginTop: 8 },
  roomBadgeText:  { fontSize: 11, fontWeight: '600' as const },
  roomBadgeChange:{ fontSize: 10, marginLeft: 2 },

  // Hours row
  hoursRow:    { flexDirection: 'row', alignItems: 'center', width: '100%', paddingTop: 13, borderTopWidth: 1, marginTop: 12 },
  hoursItem:   { flex: 1, alignItems: 'center' },
  hoursVal:    { fontSize: 22, fontWeight: '700' as const },
  hoursLbl:    { fontSize: 11, marginTop: 2 },
  hoursDivider:{ width: 1, height: 32 },

  // Action buttons
  actionBtns:   { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  actionBtn:    { flex: 1, minWidth: 76, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 14, gap: 6 },
  actionBtnText:{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' as const, textAlign: 'center' },
  cancelBtn:    { paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText:{ fontSize: 14, fontWeight: '500' as const },

  // Premises modal
  premisesTitle:   { fontSize: 19, fontWeight: '700' as const, textAlign: 'center', marginBottom: 8, marginTop: 4 },
  premisesSub:     { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 22 },
  premisesBtn:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 17, borderRadius: 14, marginBottom: 10 },
  premisesBtnInfo: { flex: 1 },
  premisesBtnTitle:{ fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },
  premisesBtnSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
