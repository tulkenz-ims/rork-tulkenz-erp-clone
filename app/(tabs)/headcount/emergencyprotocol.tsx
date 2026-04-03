import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Platform,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Flame,
  AlertTriangle,
  Users,
  CheckCircle,
  ArrowLeft,
  Shield,
  Timer,
  UserCheck,
  X,
  Phone,
  Tornado,
  ShieldAlert,
  FileText,
  Siren,
  ClipboardList,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  EMERGENCY_EVENT_TYPE_CONFIG,
  EmergencyEventType,
  EmergencyEventSeverity,
  EMERGENCY_SEVERITY_LABELS,
  EMERGENCY_SEVERITY_COLORS,
} from '@/types/emergencyEvents';
import { useEmergencyEvents } from '@/hooks/useEmergencyEvents';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEmergencyRollCall } from '@/contexts/EmergencyRollCallContext';
import { useAllEmployeesClockStatus, type EmployeeClockStatus } from '@/hooks/useSupabaseTimeClock';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────
type EmployeeStatus = 'pending' | 'safe';

interface EmployeeRollCall {
  employee: EmployeeClockStatus;
  status: EmployeeStatus;
  markedAt: number | null;
}

interface EmergencyState {
  isActive: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  employees: EmployeeRollCall[];
}

// ── Emergency type config ──────────────────────────────────────
const TYPE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  fire:           Flame,
  tornado:        Tornado,
  active_shooter: ShieldAlert,
};

const TYPE_HEADERS: Record<string, { title: string; instruction: string }> = {
  fire:           { title: 'FIRE EVACUATION',   instruction: 'EVACUATE IMMEDIATELY • ACCOUNT FOR ALL PERSONNEL' },
  tornado:        { title: 'TORNADO SHELTER',   instruction: 'MOVE TO SHELTER AREAS • ACCOUNT FOR ALL PERSONNEL' },
  active_shooter: { title: 'ACTIVE SHOOTER',    instruction: 'RUN • HIDE • FIGHT • ACCOUNT FOR ALL PERSONNEL' },
};

const SEVERITY_OPTIONS: EmergencyEventSeverity[] = ['critical', 'high', 'medium', 'low'];

// ── Helpers ────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ── Main Component ─────────────────────────────────────────────
export default function EmergencyProtocolScreen() {
  const { colors, isHUD } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; drill?: string; auto_start?: string }>();

  const emergencyType = (params.type || 'fire') as EmergencyEventType;
  const isDrill       = params.drill === 'true';
  const autoStart     = params.auto_start === 'true';

  const typeConfig  = EMERGENCY_EVENT_TYPE_CONFIG[emergencyType] || EMERGENCY_EVENT_TYPE_CONFIG.fire;
  const headerConfig = TYPE_HEADERS[emergencyType] || TYPE_HEADERS.fire;
  const TypeIcon    = TYPE_ICONS[emergencyType] || Flame;

  // Emergency header color — always red/bold regardless of theme
  const emergencyRed    = isDrill ? '#1E40AF' : '#B91C1C';
  const emergencyRedDim = isDrill ? '#1E3A8A' : '#991B1B';

  // ── Animations ────────────────────────────────────────────────
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const flashAnim   = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef<NodeJS.Timeout | null>(null);

  // ── Hooks ─────────────────────────────────────────────────────
  const { createEvent, updateEvent, addTimelineEntry, isCreating } = useEmergencyEvents();
  const orgContext     = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { registerRollCall, unregisterRollCall } = useEmergencyRollCall();

  // Real employee data — only checked in employees (in building)
  const { data: allEmployees = [], isLoading: employeesLoading } = useAllEmployeesClockStatus();

  // Employees in building = clocked_in OR on_break AND not left_premises
  // We filter to only those currently on shift
  const inBuildingEmployees = useMemo(() =>
    allEmployees.filter(e => e.status === 'clocked_in' || e.status === 'on_break'),
    [allEmployees]
  );

  // ── State ─────────────────────────────────────────────────────
  const [eventId,                  setEventId]                  = useState<string | null>(null);
  const [isSavingDetails,          setIsSavingDetails]          = useState(false);
  const [severity,                 setSeverity]                 = useState<EmergencyEventSeverity>('high');
  const [locationDetails,          setLocationDetails]          = useState('');
  const [description,              setDescription]              = useState('');
  const [emergencyServicesCalled,  setEmergencyServicesCalled]  = useState(false);
  const [detailsSaved,             setDetailsSaved]             = useState(false);
  const [showInstructions,         setShowInstructions]         = useState(false);
  const [allSafe,                  setAllSafe]                  = useState(false);

  const [emergency, setEmergency] = useState<EmergencyState>({
    isActive: false,
    startTime: null,
    elapsedSeconds: 0,
    employees: [],
  });

  const pendingEmployees = emergency.employees.filter(e => e.status === 'pending');
  const safeEmployees    = emergency.employees.filter(e => e.status === 'safe');

  // Sort alphabetically by last name
  const sortedPending = useMemo(() =>
    [...pendingEmployees].sort((a, b) =>
      a.employee.last_name.localeCompare(b.employee.last_name)
    ), [pendingEmployees]);

  const sortedSafe = useMemo(() =>
    [...safeEmployees].sort((a, b) =>
      a.employee.last_name.localeCompare(b.employee.last_name)
    ), [safeEmployees]);

  // ── Animations ────────────────────────────────────────────────
  useEffect(() => {
    if (emergency.isActive && !allSafe) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
      ]));
      pulse.start();
      const flash = Animated.loop(Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]));
      flash.start();
      return () => { pulse.stop(); flash.stop(); };
    }
  }, [emergency.isActive, allSafe]);

  useEffect(() => {
    if (emergency.isActive && emergency.startTime && !allSafe) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setEmergency(prev => ({
          ...prev,
          elapsedSeconds: Math.floor((now - prev.startTime!) / 1000),
        }));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [emergency.isActive, emergency.startTime, allSafe]);

  // All clear detection
  useEffect(() => {
    if (emergency.isActive && pendingEmployees.length === 0 && emergency.employees.length > 0) {
      setAllSafe(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([100, 100, 100, 100, 500]);
      }
      Animated.timing(successAnim, { toValue: 1, duration: 500, useNativeDriver: false }).start();
      if (eventId) {
        addTimelineEntry({ eventId, action: `All ${emergency.employees.length} personnel accounted for in ${formatTime(emergency.elapsedSeconds)}` })
          .catch(err => console.error('[EmergencyProtocol] Timeline error:', err));
        updateEvent({ id: eventId, status: 'all_clear', all_clear_at: new Date().toISOString(), total_evacuated: emergency.employees.length })
          .catch(err => console.error('[EmergencyProtocol] Update error:', err));
      }
    }
  }, [pendingEmployees.length, emergency.employees.length, emergency.isActive]);

  // ── Actions ───────────────────────────────────────────────────
  const initiateEmergency = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([200, 100, 200, 100, 200, 100, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Use real in-building employees
    const employees: EmployeeRollCall[] = inBuildingEmployees.map(emp => ({
      employee: emp,
      status: 'pending',
      markedAt: null,
    }));

    setEmergency({ isActive: true, startTime: Date.now(), elapsedSeconds: 0, employees });
    setAllSafe(false);
    successAnim.setValue(0);

    try {
      const title = `${typeConfig.label} ${isDrill ? 'Drill' : 'Emergency'} - ${new Date().toLocaleDateString()}`;
      const event = await createEvent({
        event_type: emergencyType,
        severity: 'high',
        title,
        description: undefined,
        location_details: undefined,
        drill: isDrill,
        departments_affected: [],
        emergency_services_called: false,
      });
      setEventId(event.id);
    } catch (err) {
      console.error('[EmergencyProtocol] Failed to log event:', err);
    }
  }, [inBuildingEmployees, successAnim, createEvent, emergencyType, isDrill, typeConfig.label]);

  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current && !emergency.isActive) {
      hasAutoStarted.current = true;
      initiateEmergency();
    }
  }, [autoStart, initiateEmergency, emergency.isActive]);

  const markEmployeeSafe = useCallback((employeeId: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEmergency(prev => ({
      ...prev,
      employees: prev.employees.map(emp =>
        emp.employee.employee_id === employeeId
          ? { ...emp, status: 'safe' as EmployeeStatus, markedAt: Date.now() }
          : emp
      ),
    }));
  }, []);

  const handleSaveDetails = useCallback(async () => {
    if (!eventId) return;
    setIsSavingDetails(true);
    try {
      const detailParts: string[] = [];
      if (severity)              detailParts.push(`Severity: ${EMERGENCY_SEVERITY_LABELS[severity]}`);
      if (locationDetails)       detailParts.push(`Location: ${locationDetails}`);
      if (description)           detailParts.push(`Notes: ${description}`);
      if (emergencyServicesCalled) detailParts.push('Emergency services were called');
      if (detailParts.length > 0) {
        await addTimelineEntry({ eventId, action: 'Post-event details added', notes: detailParts.join('. ') });
      }
      await updateEvent({ id: eventId, status: 'resolved', resolved_at: new Date().toISOString() });
      setDetailsSaved(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Error', 'Failed to save details. You can update them from the Event Log later.');
    } finally {
      setIsSavingDetails(false);
    }
  }, [eventId, severity, locationDetails, description, emergencyServicesCalled, updateEvent, addTimelineEntry]);

  const handleClose = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!eventId && organizationId) {
      try {
        const { data } = await supabase.from('emergency_events').select('id')
          .eq('organization_id', organizationId).in('status', ['initiated', 'in_progress'])
          .order('initiated_at', { ascending: false }).limit(1);
        if (data && data.length > 0) {
          await supabase.from('emergency_events').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).eq('id', data[0].id);
        }
      } catch (err) { console.error('[EmergencyProtocol] Cleanup error:', err); }
    }
    setEmergency({ isActive: false, startTime: null, elapsedSeconds: 0, employees: [] });
    setAllSafe(false);
    successAnim.setValue(0);
    setEventId(null);
    setDetailsSaved(false);
    setLocationDetails('');
    setDescription('');
    setSeverity('high');
    setEmergencyServicesCalled(false);
    unregisterRollCall();
  }, [successAnim, eventId, organizationId, unregisterRollCall]);

  const handleViewLog = useCallback(() => {
    handleClose();
    router.push('/safety/emergencyeventlog' as any);
  }, [handleClose, router]);

  const handleEndProtocol = useCallback(async () => {
    if (eventId) {
      try {
        await updateEvent({ id: eventId, status: 'resolved', resolved_at: new Date().toISOString() });
        await addTimelineEntry({ eventId, action: `Protocol ended early — ${safeEmployees.length}/${emergency.employees.length} accounted for` });
      } catch (err) { console.error('[EmergencyProtocol] End error:', err); }
    }
    handleClose();
    router.back();
  }, [eventId, safeEmployees.length, emergency.employees.length, updateEvent, addTimelineEntry, handleClose, router]);

  const handleCancelEvent = useCallback(async () => {
    if (eventId) {
      try {
        await updateEvent({ id: eventId, status: 'cancelled', resolved_at: new Date().toISOString() });
        await addTimelineEntry({ eventId, action: 'Event cancelled — started by accident' });
      } catch (err) { console.error('[EmergencyProtocol] Cancel error:', err); }
    }
    handleClose();
    router.back();
  }, [eventId, updateEvent, addTimelineEntry, handleClose, router]);

  // Register with AI context
  useEffect(() => {
    if (emergency.isActive && emergency.employees.length > 0) {
      registerRollCall(
        emergency.employees.map(e => ({
          id: e.employee.employee_id,
          firstName: e.employee.first_name,
          lastName: e.employee.last_name,
          department: e.employee.department,
          position: e.employee.position,
          status: e.status,
        })),
        markEmployeeSafe,
        isDrill,
        emergencyType,
        { initiateEmergency, handleEndProtocol, handleCancelEvent, handleSaveDetails, handleViewLog, handleClose, setLocationDetails, setDescription, setSeverity, setEmergencyServicesCalled },
      );
    }
    return () => { if (!emergency.isActive) unregisterRollCall(); };
  }, [emergency.isActive, emergency.employees, markEmployeeSafe]);

  // ── Background color animation ─────────────────────────────────
  const animatedBg = allSafe
    ? successAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.hudBg, '#064E3B'] })
    : flashAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.hudBg, colors.backgroundSecondary] });

  // ── Pre-active screen ──────────────────────────────────────────
  if (!emergency.isActive) {
    return (
      <View style={[S.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Emergency Protocol',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={S.headerButton}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <ScrollView style={S.content} contentContainerStyle={S.contentContainer}>

          {/* Info card */}
          <View style={[S.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={[S.iconCircle, { backgroundColor: isDrill ? colors.info + '20' : colors.error + '20' }]}>
              <Shield size={48} color={isDrill ? colors.info : colors.error} />
            </View>
            <Text style={[S.infoTitle, { color: colors.text }]}>
              {isDrill ? `${typeConfig.label} Drill` : `${typeConfig.label} Emergency Protocol`}
            </Text>
            <Text style={[S.infoDesc, { color: colors.textSecondary }]}>
              {isDrill
                ? `Start a ${typeConfig.label.toLowerCase()} drill. Roll call begins immediately.`
                : `Initiate ${typeConfig.label.toLowerCase()} emergency protocol. Roll call begins immediately.`}
            </Text>
            {isDrill && (
              <View style={[S.drillBadge, { backgroundColor: colors.info + '20', borderColor: colors.info + '40', borderWidth: 1 }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.info, letterSpacing: 1 }}>DRILL MODE</Text>
              </View>
            )}
          </View>

          {/* In-building headcount */}
          <View style={[S.previewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[S.previewTitle, { color: colors.text }]}>
              Personnel In Building ({inBuildingEmployees.length})
            </Text>
            {employeesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : inBuildingEmployees.length === 0 ? (
              <Text style={[S.previewEmpty, { color: colors.textSecondary }]}>
                No employees currently checked in
              </Text>
            ) : (
              <View style={S.employeeChips}>
                {inBuildingEmployees
                  .sort((a, b) => a.last_name.localeCompare(b.last_name))
                  .map(emp => (
                  <View key={emp.employee_id} style={[S.employeeChip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={[S.employeeChipText, { color: colors.text }]}>
                      {emp.first_name} {emp.last_name[0]}.
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Initiate button */}
          <TouchableOpacity
            style={[S.initiateButton, { backgroundColor: isDrill ? colors.info : colors.error }]}
            onPress={initiateEmergency}
            disabled={isCreating || employeesLoading}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <TypeIcon size={24} color="#FFFFFF" />
                <Text style={S.initiateButtonText}>
                  {isDrill
                    ? `START ${typeConfig.label.toUpperCase()} DRILL`
                    : `INITIATE ${typeConfig.label.toUpperCase()} PROTOCOL`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[S.disclaimer, { color: colors.textSecondary }]}>
            Roll call starts immediately. Event is logged automatically.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── Active emergency screen ────────────────────────────────────
  return (
    <Animated.View style={[S.emergencyContainer, { backgroundColor: animatedBg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[S.emergencyHeader, { backgroundColor: allSafe ? '#065F46' : emergencyRed }]}>
        {allSafe ? (
          <>
            <View style={S.successTitleRow}>
              <CheckCircle size={28} color="#10B981" />
              <Text style={S.successTitle}>ALL PERSONNEL SAFE</Text>
              <CheckCircle size={28} color="#10B981" />
            </View>
            <Text style={S.successSubtitle}>
              {isDrill ? 'Drill' : 'Emergency'} complete • All {emergency.employees.length} accounted for
            </Text>
          </>
        ) : (
          <>
            <Animated.View style={[S.emergencyTitleRow, { transform: [{ scale: pulseAnim }] }]}>
              <TypeIcon size={28} color="#FFFFFF" />
              <Text style={S.emergencyTitle}>
                {isDrill ? `${typeConfig.label.toUpperCase()} DRILL` : headerConfig.title}
              </Text>
              <TypeIcon size={28} color="#FFFFFF" />
            </Animated.View>
            <Text style={S.emergencyInstructions}>{headerConfig.instruction}</Text>
          </>
        )}

        {/* Timer + controls */}
        <View style={S.headerControls}>
          <View style={[S.timerPill, allSafe && S.timerPillSuccess]}>
            <Timer size={16} color="#FFFFFF" />
            <Text style={S.timerText}>{formatTime(emergency.elapsedSeconds)}</Text>
          </View>
          {!allSafe && (
            <>
              <TouchableOpacity
                style={S.endBtn}
                onPress={() => Alert.alert('End Protocol?', 'Mark event as resolved. Not all personnel accounted for.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'End Protocol', style: 'destructive', onPress: handleEndProtocol },
                ])}
              >
                <X size={14} color="#FFFFFF" />
                <Text style={S.endBtnText}>END PROTOCOL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.cancelBtn}
                onPress={() => Alert.alert('Cancel Event?', 'This will cancel and clear all alerts.', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Yes, Cancel', style: 'destructive', onPress: handleCancelEvent },
                ])}
              >
                <Text style={S.cancelBtnText}>CANCEL EVENT</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Stats bar */}
      <View style={S.statsBar}>
        <View style={S.statItem}>
          <Users size={14} color="#FFFFFF" />
          <Text style={S.statVal}>{emergency.employees.length}</Text>
          <Text style={S.statLbl}>Total</Text>
        </View>
        <View style={[S.statItem, S.statDivider]}>
          <AlertTriangle size={14} color="#F59E0B" />
          <Text style={[S.statVal, { color: '#F59E0B' }]}>{pendingEmployees.length}</Text>
          <Text style={[S.statLbl, { color: '#F59E0B' }]}>Not Logged</Text>
        </View>
        <View style={[S.statItem, S.statDivider]}>
          <CheckCircle size={14} color="#10B981" />
          <Text style={[S.statVal, { color: '#10B981' }]}>{safeEmployees.length}</Text>
          <Text style={[S.statLbl, { color: '#10B981' }]}>Safe</Text>
        </View>
      </View>

      {/* All safe — details form */}
      {allSafe ? (
        <ScrollView style={S.successScroll} contentContainerStyle={S.successScrollContent}>
          <CheckCircle size={56} color="#10B981" style={{ marginBottom: 10 }} />
          <Text style={S.successMsg}>Everyone is accounted for!</Text>
          <Text style={S.successTime}>Completed in {formatTime(emergency.elapsedSeconds)}</Text>

          {!detailsSaved ? (
            <View style={S.detailsCard}>
              <View style={S.detailsCardHeader}>
                <ClipboardList size={18} color="#FFFFFF" />
                <Text style={S.detailsCardTitle}>Add Event Details</Text>
              </View>
              <Text style={S.detailsCardDesc}>
                Everyone is safe. Add details for the {isDrill ? 'drill' : 'event'} record.
              </Text>

              <Text style={S.fieldLabel}>SEVERITY</Text>
              <View style={S.severityRow}>
                {SEVERITY_OPTIONS.map(s => (
                  <Pressable
                    key={s}
                    style={[S.severityChip, {
                      backgroundColor: severity === s ? EMERGENCY_SEVERITY_COLORS[s] + '30' : 'rgba(255,255,255,0.06)',
                      borderColor:     severity === s ? EMERGENCY_SEVERITY_COLORS[s] : 'rgba(255,255,255,0.12)',
                    }]}
                    onPress={() => { setSeverity(s); Haptics.selectionAsync(); }}
                  >
                    <Text style={[S.severityChipText, { color: severity === s ? EMERGENCY_SEVERITY_COLORS[s] : 'rgba(255,255,255,0.5)' }]}>
                      {EMERGENCY_SEVERITY_LABELS[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={S.fieldLabel}>LOCATION</Text>
              <TextInput
                style={S.detailsInput}
                placeholder="e.g. Building A, 2nd Floor"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={locationDetails}
                onChangeText={setLocationDetails}
              />

              <Text style={S.fieldLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[S.detailsInput, { minHeight: 70 }]}
                placeholder="Additional details..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />

              <Pressable
                style={[S.servicesToggle, emergencyServicesCalled && S.servicesToggleActive]}
                onPress={() => { setEmergencyServicesCalled(!emergencyServicesCalled); Haptics.selectionAsync(); }}
              >
                <Siren size={16} color={emergencyServicesCalled ? '#EF4444' : 'rgba(255,255,255,0.4)'} />
                <Text style={[S.servicesToggleText, { color: emergencyServicesCalled ? '#EF4444' : 'rgba(255,255,255,0.4)' }]}>
                  Emergency Services Called (911)
                </Text>
              </Pressable>

              <Pressable
                style={[S.saveBtn, { opacity: isSavingDetails ? 0.7 : 1 }]}
                onPress={handleSaveDetails}
                disabled={isSavingDetails}
              >
                {isSavingDetails
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <><FileText size={16} color="#FFFFFF" /><Text style={S.saveBtnText}>SAVE DETAILS & CLOSE EVENT</Text></>
                }
              </Pressable>

              <Pressable style={S.skipBtn} onPress={() => { handleClose(); router.back(); }}>
                <Text style={S.skipBtnText}>Skip — close without details</Text>
              </Pressable>
            </View>
          ) : (
            <View style={S.savedCard}>
              <CheckCircle size={28} color="#10B981" />
              <Text style={S.savedText}>Event details saved!</Text>
              <View style={S.savedActions}>
                <Pressable style={S.viewLogBtn} onPress={handleViewLog}>
                  <FileText size={14} color="#FFFFFF" />
                  <Text style={S.viewLogBtnText}>View Event Log</Text>
                </Pressable>
                <Pressable style={S.doneBtn} onPress={() => { handleClose(); router.back(); }}>
                  <Text style={S.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Safe employee list */}
          <View style={S.safeList}>
            <Text style={S.safeListTitle}>All Personnel ({sortedSafe.length})</Text>
            {sortedSafe.map(emp => (
              <View key={emp.employee.employee_id} style={S.safeRow}>
                <View style={S.hereBadge}>
                  <Text style={S.hereBadgeText}>HERE</Text>
                </View>
                <Text style={S.safeRowName}>
                  {emp.employee.first_name} {emp.employee.last_name}
                </Text>
                <Text style={S.safeRowDept}>{emp.employee.department}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        // ── Split panel ──────────────────────────────────────────
        <View style={S.splitContainer}>

          {/* NOT LOGGED panel */}
          <View style={S.splitPane}>
            <View style={[S.paneHeader, { backgroundColor: '#D97706' }]}>
              <AlertTriangle size={15} color="#FFFFFF" />
              <Text style={S.paneHeaderText}>NOT LOGGED ({sortedPending.length})</Text>
            </View>
            <ScrollView style={S.paneScroll} contentContainerStyle={S.paneContent}>
              {sortedPending.map(emp => (
                <TouchableOpacity
                  key={emp.employee.employee_id}
                  style={S.pendingCard}
                  onPress={() => markEmployeeSafe(emp.employee.employee_id)}
                  activeOpacity={0.75}
                >
                  <View style={S.pendingCardInfo}>
                    <Text style={S.pendingName}>
                      {emp.employee.last_name}, {emp.employee.first_name}
                    </Text>
                    <Text style={S.pendingDetail}>
                      {emp.employee.department} • {emp.employee.position}
                    </Text>
                  </View>
                  <View style={S.hereBtn}>
                    <Text style={S.hereBtnText}>HERE</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {sortedPending.length === 0 && (
                <View style={S.emptyPane}>
                  <CheckCircle size={36} color="#10B981" />
                  <Text style={S.emptyPaneText}>All clear!</Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* HERE panel */}
          <View style={[S.splitPane, S.splitPaneRight]}>
            <View style={[S.paneHeader, { backgroundColor: '#059669' }]}>
              <UserCheck size={15} color="#FFFFFF" />
              <Text style={S.paneHeaderText}>HERE ({sortedSafe.length})</Text>
            </View>
            <ScrollView style={S.paneScroll} contentContainerStyle={S.paneContent}>
              {sortedSafe.map(emp => (
                <View key={emp.employee.employee_id} style={S.safeCard}>
                  <View style={S.hereBadgeSm}>
                    <Text style={S.hereBadgeSmText}>✓</Text>
                  </View>
                  <View style={S.safeCardInfo}>
                    <Text style={S.safeName}>
                      {emp.employee.last_name}, {emp.employee.first_name}
                    </Text>
                    <Text style={S.safeDept}>{emp.employee.department}</Text>
                  </View>
                </View>
              ))}
              {sortedSafe.length === 0 && (
                <View style={S.emptyPane}>
                  <Users size={36} color="rgba(255,255,255,0.2)" />
                  <Text style={S.emptyPaneText}>No one marked safe yet</Text>
                </View>
              )}
            </ScrollView>
          </View>

        </View>
      )}

      {/* Instructions modal */}
      <Modal visible={showInstructions} animationType="slide" transparent onRequestClose={() => setShowInstructions(false)}>
        <View style={S.modalOverlay}>
          <View style={S.instructionsSheet}>
            <View style={S.instructionsSheetHead}>
              <Text style={S.instructionsSheetTitle}>{typeConfig.label} Instructions</Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)}>
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={S.instructionText}>{typeConfig.instructions}</Text>
              <View style={S.contactsBox}>
                <Text style={S.contactsTitle}>Emergency Contacts</Text>
                <View style={S.contactRow}><Phone size={14} color="#FFFFFF" /><Text style={S.contactText}>Emergency: 911</Text></View>
                <View style={S.contactRow}><Phone size={14} color="#FFFFFF" /><Text style={S.contactText}>Security: ext. 5555</Text></View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:          { flex: 1 },
  headerButton:       { padding: 8, marginLeft: -8 },
  content:            { flex: 1 },
  contentContainer:   { padding: 16, gap: 14 },

  // Pre-active
  infoCard:     { borderRadius: 14, padding: 24, alignItems: 'center' as const },
  iconCircle:   { width: 72, height: 72, borderRadius: 36, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 14 },
  infoTitle:    { fontSize: 20, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  infoDesc:     { fontSize: 14, textAlign: 'center' as const, lineHeight: 20 },
  drillBadge:   { marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  previewCard:  { borderRadius: 14, padding: 16 },
  previewTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 12 },
  previewEmpty: { fontSize: 13, textAlign: 'center' as const, paddingVertical: 8 },
  employeeChips:    { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  employeeChip:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  employeeChipText: { fontSize: 12, fontWeight: '500' as const },
  initiateButton:     { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: 18, borderRadius: 12, gap: 12 },
  initiateButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.5 },
  disclaimer:         { fontSize: 12, textAlign: 'center' as const },

  // Active emergency
  emergencyContainer: { flex: 1 },
  emergencyHeader:    { paddingTop: 60, paddingBottom: 14, paddingHorizontal: 16, alignItems: 'center' as const },
  emergencyTitleRow:  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 6 },
  emergencyTitle:     { fontSize: 26, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 2 },
  emergencyInstructions: { fontSize: 11, fontWeight: '600' as const, color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const, marginBottom: 10 },
  successTitleRow:    { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 6 },
  successTitle:       { fontSize: 22, fontWeight: '900' as const, color: '#FFFFFF', letterSpacing: 1 },
  successSubtitle:    { fontSize: 12, color: '#D1FAE5', textAlign: 'center' as const, marginBottom: 10 },

  headerControls: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center' as const },
  timerPill:        { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: 'rgba(0,0,0,0.30)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, gap: 6 },
  timerPillSuccess: { backgroundColor: 'rgba(16,185,129,0.30)' },
  timerText:        { fontSize: 22, fontWeight: '700' as const, color: '#FFFFFF', fontVariant: ['tabular-nums'] as any },
  endBtn:     { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  endBtnText: { fontSize: 11, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  cancelBtn:     { backgroundColor: 'rgba(239,68,68,0.18)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  cancelBtnText: { fontSize: 11, fontWeight: '700' as const, color: '#EF4444', letterSpacing: 0.5 },

  // Stats bar
  statsBar:   { flexDirection: 'row' as const, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 10, paddingHorizontal: 16 },
  statItem:   { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 5 },
  statDivider:{ borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' },
  statVal:    { fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  statLbl:    { fontSize: 10, color: 'rgba(255,255,255,0.65)' },

  // Split panel
  splitContainer: { flex: 1, flexDirection: 'row' as const },
  splitPane:      { flex: 1 },
  splitPaneRight: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  paneHeader:     { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 9, gap: 7 },
  paneHeaderText: { fontSize: 12, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.8 },
  paneScroll:     { flex: 1 },
  paneContent:    { padding: 8, gap: 7 },

  // Pending card
  pendingCard:     { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 11, borderLeftWidth: 3, borderLeftColor: '#EF4444' },
  pendingCardInfo: { flex: 1 },
  pendingName:     { fontSize: 13, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 2 },
  pendingDetail:   { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  hereBtn:         { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, marginLeft: 8 },
  hereBtnText:     { fontSize: 11, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: 0.5 },

  // Safe card
  safeCard:     { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 10, padding: 11, borderLeftWidth: 3, borderLeftColor: '#10B981', gap: 9 },
  safeCardInfo: { flex: 1 },
  safeName:     { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF' },
  safeDept:     { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  hereBadgeSm:     { width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' as const, justifyContent: 'center' as const },
  hereBadgeSmText: { fontSize: 12, fontWeight: '700' as const, color: '#FFFFFF' },

  emptyPane:     { alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 36, gap: 10 },
  emptyPaneText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },

  // All-safe scroll
  successScroll:        { flex: 1 },
  successScrollContent: { alignItems: 'center' as const, padding: 20 },
  successMsg:  { fontSize: 20, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
  successTime: { fontSize: 15, color: '#D1FAE5', marginBottom: 20 },

  // Details form
  detailsCard:       { width: '100%', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 14, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  detailsCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 5 },
  detailsCardTitle:  { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  detailsCardDesc:   { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 16, lineHeight: 18 },
  fieldLabel:        { fontSize: 10, fontWeight: '700' as const, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 6 },
  severityRow:       { flexDirection: 'row' as const, gap: 6, marginBottom: 14 },
  severityChip:      { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' as const },
  severityChipText:  { fontSize: 11, fontWeight: '600' as const },
  detailsInput:      { borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, fontSize: 14, color: '#FFFFFF', marginBottom: 14 },
  servicesToggle:       { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 16 },
  servicesToggleActive: { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)' },
  servicesToggleText:   { fontSize: 13, fontWeight: '600' as const },
  saveBtn:     { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 10, marginBottom: 10 },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' as const, letterSpacing: 0.3 },
  skipBtn:     { alignItems: 'center' as const, paddingVertical: 10 },
  skipBtnText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  savedCard:    { width: '100%', backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 14, padding: 20, alignItems: 'center' as const, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', gap: 8 },
  savedText:    { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
  savedActions: { flexDirection: 'row' as const, gap: 10, marginTop: 4 },
  viewLogBtn:     { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: '#3B82F6', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8 },
  viewLogBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },
  doneBtn:     { backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 9, paddingHorizontal: 18, borderRadius: 8 },
  doneBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' as const },

  // Safe list (all-safe view)
  safeList:      { width: '100%', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: 16, marginBottom: 16 },
  safeListTitle: { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 10 },
  safeRow:       { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', gap: 10 },
  hereBadge:     { backgroundColor: '#10B981', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  hereBadgeText: { fontSize: 10, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 0.5 },
  safeRowName:   { flex: 1, fontSize: 13, color: '#FFFFFF', fontWeight: '500' as const },
  safeRowDept:   { fontSize: 10, color: 'rgba(255,255,255,0.45)' },

  // Instructions modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' as const },
  instructionsSheet:    { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' as any },
  instructionsSheetHead:{ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  instructionsSheetTitle:{ fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF' },
  instructionText:      { fontSize: 15, color: '#FFFFFF', lineHeight: 22, marginBottom: 20 },
  contactsBox:          { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 14, marginTop: 10 },
  contactsTitle:        { fontSize: 13, fontWeight: '600' as const, color: '#FFFFFF', marginBottom: 10 },
  contactRow:           { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 6 },
  contactText:          { fontSize: 13, color: '#FFFFFF' },
});
