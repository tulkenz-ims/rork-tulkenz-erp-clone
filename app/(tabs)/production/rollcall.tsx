import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, Alert, ActivityIndicator, RefreshControl,
  TextInput, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users, ChevronLeft, X, Check, AlertTriangle,
  UserCheck, Search, ArrowRight, Shield,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useUser } from '@/contexts/UserContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// ── Room config — matches exact location_codes in DB ──────────
const ALL_ROOMS = [
  { code: 'PW1', name: 'Pre-Weigh',        line: 'Support', color: '#06B6D4' },
  { code: 'BB1', name: 'Big Blend',         line: 'Support', color: '#F97316' },
  { code: 'SB1', name: 'Small Blend',       line: 'Support', color: '#EC4899' },
  { code: 'PR1', name: 'Production Room 1', line: 'Line 1',  color: '#F59E0B' },
  { code: 'PO1', name: 'Packout 1',         line: 'Line 1',  color: '#F59E0B' },
  { code: 'PR2', name: 'Production Room 2', line: 'Line 2',  color: '#10B981' },
  { code: 'PO2', name: 'Packout 2',         line: 'Line 2',  color: '#10B981' },
  { code: 'PA1', name: 'Packet Room 1',     line: 'Line 3',  color: '#8B5CF6' },
  { code: 'PO3', name: 'Packout 3',         line: 'Line 3',  color: '#8B5CF6' },
];

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  department_code: string | null;
}

interface LocationRow {
  id: string;
  location_code: string;
  name: string;
  hygiene_log_required: boolean;
}

interface RoomLaborEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  location_id: string;
  location_code: string;
  location_name: string;
  entered_at: string;
}

interface EmergencyEvent {
  id: string;
  event_type: string;
  status: string;
  is_drill: boolean;
}

export default function RollCallScreen() {
  const { colors, isHUD } = useTheme();
  const { organizationId, facilityId } = useOrganization();
  const { user, userProfile } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch]                   = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedLocationCode, setSelectedLocationCode] = useState('');

  const bg   = isHUD ? '#020912' : colors.background;
  const surf = isHUD ? '#050f1e' : colors.surface;
  const bdr  = isHUD ? '#1a4060' : colors.border;
  const cyan = isHUD ? '#00D4EE' : colors.primary;

  // ── Load production room location rows ─────────────────────
  const { data: locationRows = [] } = useQuery({
    queryKey: ['prod-locations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const codes = ALL_ROOMS.map(r => r.code);
      const { data, error } = await supabase
        .from('locations')
        .select('id, location_code, name, hygiene_log_required')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .in('location_code', codes);
      if (error) throw error;
      return (data || []) as LocationRow[];
    },
    enabled: !!organizationId,
  });

  // Map location_code → full location row for quick lookup
  const locationByCode = useMemo(() => {
    const map: Record<string, LocationRow> = {};
    locationRows.forEach(l => { map[l.location_code] = l; });
    return map;
  }, [locationRows]);

  // ── Check for active emergency ─────────────────────────────
  const { data: activeEmergency } = useQuery({
    queryKey: ['active-emergency', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data } = await supabase
        .from('emergency_events')
        .select('id, event_type, status, is_drill')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle();
      return data as EmergencyEvent | null;
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  const isEmergencyMode = !!activeEmergency;

  // ── Load checked-in employees ──────────────────────────────
  const { data: checkedInEmployees = [], refetch: refetchEmployees } = useQuery({
    queryKey: ['checked-in-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      // Try time_entries first (active punches today)
      const { data: punches } = await supabase
        .from('time_entries')
        .select('employee_id, employees(id, first_name, last_name, position, department_code)')
        .eq('organization_id', organizationId)
        .gte('clock_in', `${today}T00:00:00`)
        .is('clock_out', null);

      const employees: Employee[] = [];
      const seen = new Set<string>();
      (punches || []).forEach((p: any) => {
        const emp = p.employees;
        if (emp && !seen.has(emp.id)) {
          seen.add(emp.id);
          employees.push(emp);
        }
      });

      // Fallback: show all active production + maintenance + sanitation employees
      if (employees.length === 0) {
        const { data: allEmp } = await supabase
          .from('employees')
          .select('id, first_name, last_name, position, department_code')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .in('department_code', ['1001','1002','1003','1004','1005','1008']);
        return (allEmp || []) as Employee[];
      }
      return employees;
    },
    enabled: !!organizationId,
    refetchInterval: 60000,
  });

  // ── Load active room labor entries ─────────────────────────
  const { data: activeEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['room-labor-active', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('room_labor_entries')
        .select('id, employee_id, employee_name, location_id, location_code, location_name, entered_at')
        .eq('organization_id', organizationId)
        .gte('entered_at', `${today}T00:00:00`)
        .is('exited_at', null);
      if (error) throw error;
      return (data || []) as RoomLaborEntry[];
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  // ── Emergency roll call data ────────────────────────────────
  const { data: emergencyRollCall = [], refetch: refetchRollCall } = useQuery({
    queryKey: ['emergency-roll-call', activeEmergency?.id],
    queryFn: async () => {
      if (!activeEmergency?.id) return [];
      const { data } = await supabase
        .from('emergency_roll_calls')
        .select('*')
        .eq('event_id', activeEmergency.id);
      return data || [];
    },
    enabled: !!activeEmergency?.id,
    refetchInterval: 10000,
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchEmployees(), refetchEntries(), refetchRollCall()]);
  }, [refetchEmployees, refetchEntries, refetchRollCall]);

  // ── Assign employee to room ────────────────────────────────
  const assignToRoom = useMutation({
    mutationFn: async ({
      employee,
      locationCode,
    }: {
      employee: Employee;
      locationCode: string;
    }) => {
      if (!organizationId) throw new Error('No org ID');
      const loc = locationByCode[locationCode];
      if (!loc) throw new Error(`Location not found: ${locationCode}`);
      const empName = `${employee.first_name} ${employee.last_name}`;
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      // 1. Close any existing active entry for this employee
      const existing = activeEntries.find(e => e.employee_id === employee.id);
      if (existing) {
        const enteredAt = new Date(existing.entered_at).getTime();
        const exitedAt  = new Date(now).getTime();
        const hours     = parseFloat(((exitedAt - enteredAt) / 3600000).toFixed(4));

        await supabase
          .from('room_labor_entries')
          .update({ exited_at: now, hours_in_room: hours, updated_at: now })
          .eq('id', existing.id);

        // Close hygiene log entry if location was hygiene-required
        const prevLoc = locationByCode[existing.location_code];
        if (prevLoc?.hygiene_log_required) {
          const { data: hygieneEntry } = await supabase
            .from('room_hygiene_log')
            .select('id, entry_time, daily_report_id')
            .eq('organization_id', organizationId)
            .eq('entered_by_id', employee.id)
            .eq('room_id', existing.location_id)
            .eq('status', 'active')
            .order('entry_time', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (hygieneEntry) {
            const duration = Math.round(
              (new Date(now).getTime() - new Date(hygieneEntry.entry_time).getTime()) / 60000
            );
            await supabase
              .from('room_hygiene_log')
              .update({ exit_time: now, duration_minutes: duration, status: 'completed' })
              .eq('id', hygieneEntry.id);
          }
        }
      }

      // 2. Insert new room labor entry
      await supabase
        .from('room_labor_entries')
        .insert({
          organization_id: organizationId,
          employee_id:     employee.id,
          employee_name:   empName,
          employee_code:   (employee as any).employee_code || null,
          location_id:     loc.id,
          location_code:   loc.location_code,
          location_name:   loc.name,
          entered_at:      now,
          task_description: 'Production room assignment',
          notes: `Assigned by ${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
          created_at:      now,
          updated_at:      now,
        });

      // 3. If hygiene log required, create hygiene log entry
      if (loc.hygiene_log_required) {
        // Find or create daily report
        let reportId: string | null = null;
        const { data: existingReport } = await supabase
          .from('daily_room_hygiene_reports')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('room_id', loc.id)
          .eq('report_date', today)
          .maybeSingle();

        if (existingReport?.id) {
          reportId = existingReport.id;
        } else {
          const { data: newReport } = await supabase
            .from('daily_room_hygiene_reports')
            .insert({
              organization_id:           organizationId,
              facility_id:               facilityId || null,
              room_id:                   loc.id,
              room_name:                 loc.name,
              report_date:               today,
              status:                    'open',
              total_entries:             0,
              flagged_entries:           0,
              active_entries:            0,
              completed_entries:         0,
              department_counts:         {},
              highest_contamination_risk:'none',
              contamination_entry_count: 0,
            })
            .select('id')
            .single();
          reportId = newReport?.id || null;
        }

        // Insert hygiene log entry
        await supabase
          .from('room_hygiene_log')
          .insert({
            organization_id:  organizationId,
            facility_id:      facilityId || null,
            room_id:          loc.id,
            room_name:        loc.name,
            entry_time:       now,
            entered_by_id:    employee.id,
            entered_by_name:  empName,
            department_code:  employee.department_code || '1003',
            department_name:  'Production',
            purpose:          'production',
            purpose_detail:   `Room assignment — ${loc.name}`,
            actions_performed:'Production room assignment',
            equipment_touched:[],
            chemicals_used:   [],
            tools_brought_in: [],
            handwash_on_entry: true,
            ppe_worn:         ['hairnet', 'gloves', 'smock'],
            hairnet:          true,
            gloves:           true,
            smock:            true,
            boot_covers:      false,
            contamination_risk:'none',
            status:           'active',
            daily_report_id:  reportId,
          });

        // Update daily report active count
        if (reportId) {
          await supabase.rpc('update_daily_report_counters', { p_report_id: reportId }).throwOnError().catch(() => {
            // RPC may not exist — do manual update
            supabase
              .from('daily_room_hygiene_reports')
              .update({ active_entries: supabase.rpc as any })
              .eq('id', reportId);
          });
        }
      }
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['room-labor-active'] });
      queryClient.invalidateQueries({ queryKey: ['room-assignments-today'] });
      setShowAssignModal(false);
      setSelectedEmployee(null);
      setSelectedLocationCode('');
    },
    onError: (err: any) => Alert.alert('Error', err.message || 'Failed to assign employee'),
  });

  // ── Remove from room ───────────────────────────────────────
  const removeFromRoom = useMutation({
    mutationFn: async (entry: RoomLaborEntry) => {
      const now = new Date().toISOString();
      const hours = parseFloat(
        ((new Date(now).getTime() - new Date(entry.entered_at).getTime()) / 3600000).toFixed(4)
      );

      await supabase
        .from('room_labor_entries')
        .update({ exited_at: now, hours_in_room: hours, updated_at: now })
        .eq('id', entry.id);

      // Close hygiene log if applicable
      const loc = locationByCode[entry.location_code];
      if (loc?.hygiene_log_required) {
        const { data: hygieneEntry } = await supabase
          .from('room_hygiene_log')
          .select('id, entry_time')
          .eq('organization_id', organizationId)
          .eq('entered_by_id', entry.employee_id)
          .eq('room_id', entry.location_id)
          .eq('status', 'active')
          .order('entry_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (hygieneEntry) {
          const duration = Math.round(
            (new Date(now).getTime() - new Date(hygieneEntry.entry_time).getTime()) / 60000
          );
          await supabase
            .from('room_hygiene_log')
            .update({ exit_time: now, duration_minutes: duration, status: 'completed' })
            .eq('id', hygieneEntry.id);
        }
      }
    },
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      queryClient.invalidateQueries({ queryKey: ['room-labor-active'] });
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  // ── Mark safe in emergency ─────────────────────────────────
  const markSafe = useMutation({
    mutationFn: async (employee: Employee) => {
      if (!activeEmergency?.id) throw new Error('No active emergency');
      await supabase
        .from('emergency_roll_calls')
        .upsert({
          event_id:     activeEmergency.id,
          employee_id:  employee.id,
          employee_name:`${employee.first_name} ${employee.last_name}`,
          status:       'safe',
          checked_at:   new Date().toISOString(),
          checked_by:   `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim(),
        }, { onConflict: 'event_id,employee_id' });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['emergency-roll-call'] });
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  // ── Computed maps ──────────────────────────────────────────
  const entryByEmployee = useMemo(() => {
    const map: Record<string, RoomLaborEntry> = {};
    activeEntries.forEach(e => { map[e.employee_id] = e; });
    return map;
  }, [activeEntries]);

  const entriesByLocationCode = useMemo(() => {
    const map: Record<string, RoomLaborEntry[]> = {};
    activeEntries.forEach(e => {
      if (!map[e.location_code]) map[e.location_code] = [];
      map[e.location_code].push(e);
    });
    return map;
  }, [activeEntries]);

  const safeIds = useMemo(() => {
    const set = new Set<string>();
    emergencyRollCall.forEach((r: any) => { if (r.status === 'safe') set.add(r.employee_id); });
    return set;
  }, [emergencyRollCall]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return checkedInEmployees;
    const q = search.toLowerCase();
    return checkedInEmployees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.position || '').toLowerCase().includes(q)
    );
  }, [checkedInEmployees, search]);

  const unassignedCount = useMemo(() =>
    checkedInEmployees.filter(e => !entryByEmployee[e.id]).length,
    [checkedInEmployees, entryByEmployee]
  );

  const safeCount    = safeIds.size;
  const missingCount = isEmergencyMode ? checkedInEmployees.length - safeCount : 0;

  const openAssignModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSelectedLocationCode(entryByEmployee[emp.id]?.location_code || '');
    setShowAssignModal(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={[
        styles.header,
        { backgroundColor: isEmergencyMode ? '#EF444415' : surf, borderBottomColor: isEmergencyMode ? '#EF4444' : bdr }
      ]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={isEmergencyMode ? '#EF4444' : cyan} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {isEmergencyMode ? (
            <>
              <View style={styles.emergencyBadgeRow}>
                <AlertTriangle size={13} color="#EF4444" />
                <Text style={[styles.emergencyBadge, { fontFamily: MONO }]}>
                  {activeEmergency?.is_drill ? 'DRILL' : 'EMERGENCY'} — {activeEmergency?.event_type?.replace(/_/g,' ').toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: '#EF4444' }]}>Emergency Roll Call</Text>
            </>
          ) : (
            <>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Roll Call</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {checkedInEmployees.length} checked in · {unassignedCount} unassigned
              </Text>
            </>
          )}
        </View>
        {isEmergencyMode && (
          <View style={[styles.emergencyStats, { borderColor: '#EF444440' }]}>
            <View style={styles.emergencyStatItem}>
              <Text style={[styles.emergencyStatNum, { color: '#10B981' }]}>{safeCount}</Text>
              <Text style={[styles.emergencyStatLabel, { color: colors.textSecondary, fontFamily: MONO }]}>SAFE</Text>
            </View>
            <View style={[styles.emergencyStatDivider, { backgroundColor: '#EF444440' }]} />
            <View style={styles.emergencyStatItem}>
              <Text style={[styles.emergencyStatNum, { color: '#EF4444' }]}>{missingCount}</Text>
              <Text style={[styles.emergencyStatLabel, { color: colors.textSecondary, fontFamily: MONO }]}>MISSING</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Room strip (shift mode) ──────────────────────────── */}
      {!isEmergencyMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.roomStrip, { borderBottomColor: bdr }]}
          contentContainerStyle={styles.roomStripContent}
        >
          {ALL_ROOMS.map(room => {
            const count = (entriesByLocationCode[room.code] || []).length;
            return (
              <View
                key={room.code}
                style={[
                  styles.roomChip,
                  { borderColor: count > 0 ? room.color : bdr, backgroundColor: count > 0 ? room.color + '18' : 'transparent' }
                ]}
              >
                <Text style={[styles.roomChipCode, { color: count > 0 ? room.color : colors.textSecondary, fontFamily: MONO }]}>
                  {room.code}
                </Text>
                <Text style={[styles.roomChipCount, { color: count > 0 ? room.color : colors.textSecondary }]}>
                  {count}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Search ──────────────────────────────────────────── */}
      <View style={[styles.searchRow, { backgroundColor: surf, borderBottomColor: bdr }]}>
        <Search size={15} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <X size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* ── Employee list ────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.employeeList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={cyan} />}
      >
        {filteredEmployees.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No employees checked in</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Employees appear here after checking in via Check In / Check Out
            </Text>
          </View>
        ) : (
          filteredEmployees.map(emp => {
            const entry  = entryByEmployee[emp.id];
            const isSafe = safeIds.has(emp.id);
            const room   = entry ? ALL_ROOMS.find(r => r.code === entry.location_code) : null;
            const empName = `${emp.first_name} ${emp.last_name}`;

            return (
              <View
                key={emp.id}
                style={[
                  styles.empRow,
                  { backgroundColor: surf, borderColor: bdr },
                  isEmergencyMode && isSafe  && { borderColor: '#10B98140', backgroundColor: '#10B98108' },
                  isEmergencyMode && !isSafe && { borderColor: '#EF444440', backgroundColor: '#EF444408' },
                ]}
              >
                {/* Avatar */}
                <View style={[
                  styles.empAvatar,
                  { backgroundColor: isEmergencyMode
                      ? (isSafe ? '#10B98125' : '#EF444420')
                      : (room ? room.color + '20' : bdr + '60') }
                ]}>
                  <Text style={[
                    styles.empAvatarText,
                    { color: isEmergencyMode
                        ? (isSafe ? '#10B981' : '#EF4444')
                        : (room ? room.color : colors.textSecondary) }
                  ]}>
                    {emp.first_name[0]}{emp.last_name[0]}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.empName, { color: colors.text }]}>{empName}</Text>
                  <Text style={[styles.empPosition, { color: colors.textSecondary }]}>
                    {emp.position || 'No position'}
                  </Text>
                  {entry && room && (
                    <View style={styles.empRoomBadge}>
                      <View style={[styles.empRoomDot, { backgroundColor: room.color }]} />
                      <Text style={[styles.empRoomText, { color: room.color, fontFamily: MONO }]}>
                        {entry.location_code} — {entry.location_name}
                      </Text>
                    </View>
                  )}
                  {!entry && !isEmergencyMode && (
                    <Text style={[styles.empUnassigned, { color: colors.textSecondary, fontFamily: MONO }]}>
                      UNASSIGNED
                    </Text>
                  )}
                </View>

                {/* Actions */}
                {isEmergencyMode ? (
                  isSafe ? (
                    <View style={[styles.safeBtn, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
                      <Check size={14} color="#10B981" />
                      <Text style={[styles.safeBtnText, { color: '#10B981', fontFamily: MONO }]}>SAFE</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}
                      onPress={() => markSafe.mutate(emp)}
                      disabled={markSafe.isPending}
                    >
                      {markSafe.isPending
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : <>
                            <Shield size={13} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: '#EF4444', fontFamily: MONO }]}>MARK SAFE</Text>
                          </>
                      }
                    </Pressable>
                  )
                ) : (
                  <View style={styles.empActions}>
                    {entry && (
                      <Pressable
                        style={[styles.removeBtn, { borderColor: bdr }]}
                        onPress={() => Alert.alert(
                          'Remove from Room',
                          `Remove ${empName} from ${entry.location_name}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Remove', style: 'destructive', onPress: () => removeFromRoom.mutate(entry) },
                          ]
                        )}
                      >
                        <X size={13} color={colors.error || '#EF4444'} />
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: cyan + '18', borderColor: cyan + '40' }]}
                      onPress={() => openAssignModal(emp)}
                    >
                      <ArrowRight size={13} color={cyan} />
                      <Text style={[styles.actionBtnText, { color: cyan, fontFamily: MONO }]}>
                        {entry ? 'MOVE' : 'ASSIGN'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* ── Room summary (shift mode) ──────────────────────── */}
        {!isEmergencyMode && activeEntries.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: MONO, marginTop: 16 }]}>
              ROOM ASSIGNMENTS
            </Text>
            {ALL_ROOMS.filter(room => (entriesByLocationCode[room.code] || []).length > 0).map(room => (
              <View
                key={room.code}
                style={[styles.roomSummaryCard, { backgroundColor: surf, borderColor: bdr, borderLeftColor: room.color }]}
              >
                <View style={styles.roomSummaryHeader}>
                  <Text style={[styles.roomSummaryCode, { color: room.color, fontFamily: MONO }]}>{room.code}</Text>
                  <Text style={[styles.roomSummaryName, { color: colors.text }]}>{room.name}</Text>
                  <Text style={[styles.roomSummaryCount, { color: colors.textSecondary }]}>
                    {entriesByLocationCode[room.code].length} assigned
                  </Text>
                </View>
                {entriesByLocationCode[room.code].map(e => (
                  <View key={e.id} style={styles.roomSummaryEmp}>
                    <UserCheck size={11} color={room.color} />
                    <Text style={[styles.roomSummaryEmpName, { color: colors.text }]}>{e.employee_name}</Text>
                    <Text style={[styles.roomSummaryTime, { color: colors.textSecondary }]}>
                      {new Date(e.entered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Assign Room Modal ────────────────────────────────── */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: surf, borderTopColor: bdr }]}>
            <View style={[styles.modalHeader, { borderBottomColor: bdr }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Assign to Room</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setShowAssignModal(false)} hitSlop={12}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {['Support', 'Line 1', 'Line 2', 'Line 3'].map(line => {
                const lineRooms = ALL_ROOMS.filter(r => r.line === line);
                return (
                  <View key={line} style={styles.roomGroup}>
                    <Text style={[styles.roomGroupLabel, { color: colors.textSecondary, fontFamily: MONO }]}>
                      {line.toUpperCase()}
                    </Text>
                    {lineRooms.map(room => {
                      const isSelected     = selectedLocationCode === room.code;
                      const currentCount   = (entriesByLocationCode[room.code] || []).length;
                      const locExists      = !!locationByCode[room.code];
                      return (
                        <Pressable
                          key={room.code}
                          style={[
                            styles.roomOption,
                            { backgroundColor: isSelected ? room.color + '20' : bg, borderColor: isSelected ? room.color : bdr },
                            !locExists && { opacity: 0.4 },
                          ]}
                          onPress={() => locExists && setSelectedLocationCode(room.code)}
                          disabled={!locExists}
                        >
                          <View style={[styles.roomOptionDot, { backgroundColor: room.color }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.roomOptionCode, { color: isSelected ? room.color : colors.text, fontFamily: MONO }]}>
                              {room.code}
                            </Text>
                            <Text style={[styles.roomOptionName, { color: colors.textSecondary }]}>{room.name}</Text>
                          </View>
                          <Text style={[styles.roomOptionCount, { color: colors.textSecondary }]}>
                            {currentCount} here
                          </Text>
                          {isSelected && <Check size={16} color={room.color} />}
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: bdr }]}>
              <Pressable
                style={[styles.cancelBtn, { borderColor: bdr }]}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmBtn,
                  { backgroundColor: !selectedLocationCode ? bdr : cyan, opacity: !selectedLocationCode ? 0.5 : 1 }
                ]}
                onPress={() => {
                  if (!selectedEmployee || !selectedLocationCode) return;
                  assignToRoom.mutate({ employee: selectedEmployee, locationCode: selectedLocationCode });
                }}
                disabled={!selectedLocationCode || assignToRoom.isPending}
              >
                {assignToRoom.isPending
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={[styles.confirmBtnText, { color: isHUD ? '#000' : '#fff' }]}>
                      {entryByEmployee[selectedEmployee?.id || ''] ? 'Move to Room' : 'Assign to Room'}
                    </Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  backBtn:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub:   { fontSize: 12, marginTop: 2 },

  emergencyBadgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  emergencyBadge:       { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#EF4444' },
  emergencyStats:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  emergencyStatItem:    { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  emergencyStatNum:     { fontSize: 18, fontWeight: '800' },
  emergencyStatLabel:   { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  emergencyStatDivider: { width: 1, alignSelf: 'stretch' },

  roomStrip:        { borderBottomWidth: 1, maxHeight: 52 },
  roomStripContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  roomChip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roomChipCode:     { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  roomChipCount:    { fontSize: 12, fontWeight: '700' },

  searchRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },

  employeeList: { padding: 12, gap: 8 },

  empRow:        { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  empAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empAvatarText: { fontSize: 14, fontWeight: '700' },
  empName:       { fontSize: 14, fontWeight: '600' },
  empPosition:   { fontSize: 11, marginTop: 1 },
  empRoomBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  empRoomDot:    { width: 6, height: 6, borderRadius: 3 },
  empRoomText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  empUnassigned: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 4 },
  empActions:    { flexDirection: 'row', alignItems: 'center', gap: 6 },

  removeBtn:     { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  safeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  safeBtnText:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },

  roomSummaryCard:    { borderRadius: 10, borderWidth: 1, borderLeftWidth: 3, padding: 12, gap: 6, marginBottom: 8 },
  roomSummaryHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roomSummaryCode:    { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  roomSummaryName:    { flex: 1, fontSize: 13, fontWeight: '600' },
  roomSummaryCount:   { fontSize: 11 },
  roomSummaryEmp:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 },
  roomSummaryEmpName: { flex: 1, fontSize: 12 },
  roomSummaryTime:    { fontSize: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySub:   { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, maxHeight: '85%' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  modalTitle:   { fontSize: 17, fontWeight: '700' },
  modalSub:     { fontSize: 12, marginTop: 2 },
  modalScroll:  { maxHeight: 440, padding: 16 },

  roomGroup:      { marginBottom: 16 },
  roomGroupLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  roomOption:     { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 10 },
  roomOptionDot:  { width: 10, height: 10, borderRadius: 5 },
  roomOptionCode: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  roomOptionName: { fontSize: 11, marginTop: 1 },
  roomOptionCount:{ fontSize: 11, marginRight: 4 },

  modalFooter:    { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1 },
  cancelBtn:      { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelBtnText:  { fontSize: 15, fontWeight: '600' },
  confirmBtn:     { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700' },
});
