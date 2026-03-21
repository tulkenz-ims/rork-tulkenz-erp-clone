/**
 * components/RoomCheckInPicker.tsx
 *
 * Modal picker for selecting a production room/area to check into.
 * Shows active rooms from the locations table.
 * Used at shift check-in and as a standalone "Change Room" action.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, MapPin, LogIn, LogOut, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import {
  useActiveRoomEntry,
  useCheckIntoRoom,
  useCheckOutOfRoom,
} from '@/hooks/useRoomLaborEntries';

// ── HUD Theme ──────────────────────────────────────────────────
const HUD = {
  bg:           '#020912',
  bgCard:       '#050f1e',
  bgCardAlt:    '#071525',
  cyan:         '#00e5ff',
  cyanDim:      '#00e5ff18',
  green:        '#00ff88',
  greenDim:     '#00ff8818',
  amber:        '#ffb800',
  amberDim:     '#ffb80018',
  red:          '#ff2d55',
  redDim:       '#ff2d5518',
  teal:         '#00b894',
  text:         '#e0f4ff',
  textSec:      '#7aa8c8',
  textDim:      '#3a6080',
  border:       '#0d2840',
  borderBright: '#1a4060',
};

interface Location {
  id: string;
  location_code: string;
  room_code: string | null;
  name: string;
  location_type: string;
  is_production: boolean;
  status: string;
  max_occupancy: number | null;
  current_occupancy: number | null;
  color: string | null;
}

interface RoomCheckInPickerProps {
  visible: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  timeEntryId?: string;
}

export default function RoomCheckInPicker({
  visible,
  onClose,
  employeeId,
  employeeName,
  employeeCode,
  timeEntryId,
}: RoomCheckInPickerProps) {
  const { company } = useUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: activeEntry, isLoading: activeLoading } = useActiveRoomEntry(employeeId);
  const checkIntoRoom = useCheckIntoRoom();
  const checkOutOfRoom = useCheckOutOfRoom();

  // Load production locations
  const { data: locations = [], isLoading: locsLoading } = useQuery({
    queryKey: ['locations-production', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('locations')
        .select('id, location_code, room_code, name, location_type, is_production, status, max_occupancy, current_occupancy, color')
        .eq('organization_id', company.id)
        .eq('status', 'active')
        .order('sort_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as Location[];
    },
    enabled: !!company?.id && visible,
  });

  // Split into production and non-production
  const productionLocs = useMemo(() => locations.filter(l => l.is_production), [locations]);
  const otherLocs = useMemo(() => locations.filter(l => !l.is_production), [locations]);

  const isLoading = activeLoading || locsLoading;
  const isMutating = checkIntoRoom.isPending || checkOutOfRoom.isPending;

  const handleSelectRoom = async (loc: Location) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If already in this room — do nothing
    if (activeEntry?.location_id === loc.id) return;

    setSelectedId(loc.id);
    try {
      await checkIntoRoom.mutateAsync({
        employee_id:   employeeId,
        employee_name: employeeName,
        employee_code: employeeCode,
        location_id:   loc.id,
        location_code: loc.location_code,
        location_name: loc.name,
        time_entry_id: timeEntryId,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      console.error('[RoomCheckInPicker] Check-in error:', err);
    } finally {
      setSelectedId(null);
    }
  };

  const handleExitRoom = async () => {
    if (!activeEntry) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await checkOutOfRoom.mutateAsync({ employeeId, entryId: activeEntry.id });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      console.error('[RoomCheckInPicker] Check-out error:', err);
    }
  };

  const formatElapsed = (enteredAt: string) => {
    const mins = Math.floor((Date.now() - new Date(enteredAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const renderLocation = (loc: Location) => {
    const isActive = activeEntry?.location_id === loc.id;
    const isSelecting = selectedId === loc.id && isMutating;
    const accentColor = isActive ? HUD.green : loc.color || HUD.cyan;

    return (
      <Pressable
        key={loc.id}
        style={[
          s.locRow,
          isActive && { borderColor: HUD.green, backgroundColor: HUD.greenDim },
        ]}
        onPress={() => handleSelectRoom(loc)}
        disabled={isMutating}
      >
        <View style={[s.locCodeBox, { backgroundColor: accentColor + '20' }]}>
          <Text style={[s.locCode, { color: accentColor }]}>
            {loc.room_code || loc.location_code}
          </Text>
        </View>
        <View style={s.locInfo}>
          <Text style={[s.locName, isActive && { color: HUD.green }]}>{loc.name}</Text>
          <Text style={s.locType}>{loc.location_type}</Text>
          {isActive && activeEntry?.entered_at && (
            <Text style={[s.locActive, { color: HUD.green }]}>
              ● In here for {formatElapsed(activeEntry.entered_at)}
            </Text>
          )}
        </View>
        {isSelecting ? (
          <ActivityIndicator size="small" color={HUD.cyan} />
        ) : isActive ? (
          <CheckCircle size={18} color={HUD.green} />
        ) : (
          <LogIn size={16} color={HUD.textDim} />
        )}
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Header */}
          <View style={s.sheetHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color={HUD.cyan} />
              <Text style={s.sheetTitle}>ROOM CHECK-IN</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <X size={20} color={HUD.textSec} />
            </Pressable>
          </View>

          {/* Current room banner */}
          {activeEntry && (
            <View style={s.currentBanner}>
              <View style={{ flex: 1 }}>
                <Text style={s.currentLabel}>CURRENTLY IN</Text>
                <Text style={s.currentRoom}>{activeEntry.location_name}</Text>
                {activeEntry.entered_at && (
                  <Text style={s.currentTime}>
                    {formatElapsed(activeEntry.entered_at)} — since {new Date(activeEntry.entered_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              <Pressable style={s.exitBtn} onPress={handleExitRoom} disabled={isMutating}>
                {checkOutOfRoom.isPending
                  ? <ActivityIndicator size="small" color={HUD.red} />
                  : <>
                      <LogOut size={14} color={HUD.red} />
                      <Text style={s.exitBtnText}>EXIT</Text>
                    </>
                }
              </Pressable>
            </View>
          )}

          {isLoading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={HUD.cyan} />
              <Text style={s.loadingText}>Loading rooms...</Text>
            </View>
          ) : (
            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

              {productionLocs.length > 0 && (
                <>
                  <Text style={s.groupLabel}>PRODUCTION AREAS</Text>
                  {productionLocs.map(renderLocation)}
                </>
              )}

              {otherLocs.length > 0 && (
                <>
                  <Text style={[s.groupLabel, { marginTop: 14 }]}>OTHER AREAS</Text>
                  {otherLocs.map(renderLocation)}
                </>
              )}

              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: HUD.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderColor: HUD.borderBright, maxHeight: '80%' },
  sheetHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: HUD.border },
  sheetTitle:    { fontSize: 12, fontWeight: '800', color: HUD.cyan, letterSpacing: 2 },

  // Current room banner
  currentBanner: { flexDirection: 'row', alignItems: 'center', margin: 14, padding: 14, backgroundColor: HUD.greenDim, borderRadius: 12, borderWidth: 1, borderColor: HUD.green + '40' },
  currentLabel:  { fontSize: 9, fontWeight: '800', color: HUD.green, letterSpacing: 1.5, marginBottom: 2 },
  currentRoom:   { fontSize: 15, fontWeight: '700', color: HUD.text },
  currentTime:   { fontSize: 11, color: HUD.textSec, marginTop: 2 },
  exitBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: HUD.redDim, borderWidth: 1, borderColor: HUD.red + '40' },
  exitBtnText:   { fontSize: 11, fontWeight: '800', color: HUD.red, letterSpacing: 1 },

  // Group label
  groupLabel:    { fontSize: 9, fontWeight: '800', color: HUD.textDim, letterSpacing: 2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },

  // Location rows
  scroll:        { paddingHorizontal: 12 },
  locRow:        { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: HUD.border, backgroundColor: HUD.bg, marginBottom: 8, gap: 12 },
  locCodeBox:    { width: 52, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  locCode:       { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  locInfo:       { flex: 1 },
  locName:       { fontSize: 14, fontWeight: '600', color: HUD.text, marginBottom: 2 },
  locType:       { fontSize: 10, color: HUD.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  locActive:     { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Loading
  loadingWrap:   { padding: 40, alignItems: 'center', gap: 12 },
  loadingText:   { fontSize: 12, color: HUD.textDim },
});
