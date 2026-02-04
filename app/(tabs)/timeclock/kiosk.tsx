import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import {
  MapPin,
  Users,
  X,
  ChevronRight,
  LogIn,
  LogOut,
  Search,
  Clock,
  Building2,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProductionRooms,
  useActiveRoomSessions,
  useStartRoomSession,
  useEndRoomSession,
  useRoomSessionsRealtime,
  type ProductionRoom,
  type RoomSession,
} from '@/hooks/useSupabaseTimeClock';
import { useAllEmployeesClockStatus, type EmployeeClockStatus } from '@/hooks/useSupabaseTimeClock';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LocationKioskScreen() {
  const { colors } = useTheme();
  
  const [selectedLocation, setSelectedLocation] = useState<ProductionRoom | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeClockStatus | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: locations = [], isLoading: locationsLoading, refetch: refetchLocations } = useProductionRooms();
  const { data: activeSessions = [], refetch: refetchSessions } = useActiveRoomSessions();
  const { data: employees = [], isLoading: employeesLoading } = useAllEmployeesClockStatus();
  const { isSubscribed } = useRoomSessionsRealtime();

  const startSessionMutation = useStartRoomSession();
  const endSessionMutation = useEndRoomSession();

  const activeLocations = useMemo(() => {
    return locations.filter(loc => loc.is_active);
  }, [locations]);

  const getSessionsForLocation = useCallback((locationId: string) => {
    return activeSessions.filter(s => s.room_id === locationId);
  }, [activeSessions]);

  const getEmployeeSessionAtLocation = useCallback((employeeId: string, locationId: string) => {
    return activeSessions.find(s => s.employee_id === employeeId && s.room_id === locationId);
  }, [activeSessions]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const query = employeeSearch.toLowerCase();
    return employees.filter(emp =>
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(query) ||
      emp.employee_code?.toLowerCase().includes(query)
    );
  }, [employees, employeeSearch]);

  const handleLocationPress = useCallback((location: ProductionRoom) => {
    console.log('[LocationKiosk] Selected location:', location.name);
    setSelectedLocation(location);
    setShowLocationModal(true);
  }, []);

  const handleEmployeeSelect = useCallback((employee: EmployeeClockStatus) => {
    console.log('[LocationKiosk] Selected employee:', employee.first_name, employee.last_name);
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    setEmployeeSearch('');
  }, []);

  const handleClockIn = useCallback(async () => {
    if (!selectedLocation || !selectedEmployee) return;

    console.log('[LocationKiosk] Clocking in:', selectedEmployee.first_name, 'to', selectedLocation.name);

    startSessionMutation.mutate(
      {
        employeeId: selectedEmployee.employee_id,
        roomId: selectedLocation.id,
      },
      {
        onSuccess: () => {
          Alert.alert(
            'Clocked In',
            `${selectedEmployee.first_name} ${selectedEmployee.last_name} is now clocked into ${selectedLocation.name}`,
            [{ text: 'OK', onPress: () => {
              setShowEmployeeModal(false);
              setSelectedEmployee(null);
              refetchSessions();
            }}]
          );
        },
        onError: (error) => {
          console.error('[LocationKiosk] Clock in error:', error);
          Alert.alert('Error', error.message || 'Failed to clock in');
        },
      }
    );
  }, [selectedLocation, selectedEmployee, startSessionMutation, refetchSessions]);

  const handleClockOut = useCallback(async () => {
    if (!selectedLocation || !selectedEmployee) return;

    const session = getEmployeeSessionAtLocation(selectedEmployee.employee_id, selectedLocation.id);
    if (!session) {
      Alert.alert('Error', 'No active session found');
      return;
    }

    console.log('[LocationKiosk] Clocking out:', selectedEmployee.first_name, 'from', selectedLocation.name);

    endSessionMutation.mutate(
      { sessionId: session.id },
      {
        onSuccess: (data) => {
          const duration = data?.duration || 0;
          Alert.alert(
            'Clocked Out',
            `${selectedEmployee.first_name} ${selectedEmployee.last_name} clocked out from ${selectedLocation.name}\nDuration: ${Math.floor(duration / 60)}h ${duration % 60}m`,
            [{ text: 'OK', onPress: () => {
              setShowEmployeeModal(false);
              setSelectedEmployee(null);
              refetchSessions();
            }}]
          );
        },
        onError: (error) => {
          console.error('[LocationKiosk] Clock out error:', error);
          Alert.alert('Error', error.message || 'Failed to clock out');
        },
      }
    );
  }, [selectedLocation, selectedEmployee, endSessionMutation, getEmployeeSessionAtLocation, refetchSessions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchLocations(), refetchSessions()]);
    setRefreshing(false);
  }, [refetchLocations, refetchSessions]);

  const renderLocationCard = (location: ProductionRoom) => {
    const sessions = getSessionsForLocation(location.id);
    const clockedInCount = sessions.length;
    const hasActivity = clockedInCount > 0;

    return (
      <TouchableOpacity
        key={location.id}
        style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleLocationPress(location)}
        activeOpacity={0.7}
      >
        <View style={styles.locationHeader}>
          <Text style={[styles.locationName, { color: colors.text }]} numberOfLines={2}>
            {location.name.toUpperCase()}
          </Text>
          <View style={[styles.clockedInBadge, { backgroundColor: hasActivity ? '#10B98120' : '#6B728020' }]}>
            <Text style={[styles.clockedInText, { color: hasActivity ? '#10B981' : '#6B7280' }]}>
              {clockedInCount} clocked in
            </Text>
          </View>
        </View>

        <Text style={[styles.locationStatus, { color: colors.textSecondary }]}>
          {hasActivity ? `${sessions.map(s => s.employee_name?.split(' ')[0]).slice(0, 2).join(', ')}${clockedInCount > 2 ? ` +${clockedInCount - 2} more` : ''}` : 'No one clocked in'}
        </Text>

        <View style={styles.locationFooter}>
          <View style={[styles.activityIndicator, { backgroundColor: hasActivity ? '#10B98115' : colors.background }]}>
            <View style={[styles.activityDot, { backgroundColor: hasActivity ? '#10B981' : '#6B7280' }]} />
            <Text style={[styles.activityText, { color: hasActivity ? '#10B981' : '#6B7280' }]}>
              {hasActivity ? 'Active' : 'No Activity'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocationModal = () => {
    if (!selectedLocation) return null;

    const sessions = getSessionsForLocation(selectedLocation.id);
    const clockedInEmployeeIds = sessions.map(s => s.employee_id);

    return (
      <Modal visible={showLocationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedLocation.name}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {sessions.length} currently clocked in
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowLocationModal(false);
                  setSelectedLocation(null);
                  setEmployeeSearch('');
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {sessions.length > 0 && (
              <View style={styles.currentlyClocked}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Currently Clocked In</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clockedInList}>
                  {sessions.map((session) => (
                    <View key={session.id} style={[styles.clockedInChip, { backgroundColor: '#10B98115' }]}>
                      <View style={styles.clockedInAvatar}>
                        <Text style={styles.clockedInAvatarText}>
                          {session.employee_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </Text>
                      </View>
                      <Text style={[styles.clockedInName, { color: '#10B981' }]}>
                        {session.employee_name?.split(' ')[0] || 'Unknown'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search employee name..."
                placeholderTextColor={colors.textSecondary}
                value={employeeSearch}
                onChangeText={setEmployeeSearch}
              />
              {employeeSearch.length > 0 && (
                <TouchableOpacity onPress={() => setEmployeeSearch('')}>
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Your Name</Text>

            {employeesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.employeeList} showsVerticalScrollIndicator={true}>
                {filteredEmployees.map((employee) => {
                  const isClockedIn = clockedInEmployeeIds.includes(employee.employee_id);
                  return (
                    <TouchableOpacity
                      key={employee.id}
                      style={[
                        styles.employeeItem,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        isClockedIn && { borderColor: '#10B981', borderWidth: 2 }
                      ]}
                      onPress={() => handleEmployeeSelect(employee)}
                    >
                      <View style={[styles.employeeAvatar, { backgroundColor: isClockedIn ? '#10B98115' : `${colors.primary}15` }]}>
                        <Text style={[styles.employeeAvatarText, { color: isClockedIn ? '#10B981' : colors.primary }]}>
                          {employee.first_name[0]}{employee.last_name[0]}
                        </Text>
                      </View>
                      <View style={styles.employeeInfo}>
                        <Text style={[styles.employeeName, { color: colors.text }]}>
                          {employee.first_name} {employee.last_name}
                        </Text>
                        <Text style={[styles.employeeDept, { color: colors.textSecondary }]}>
                          {employee.department || 'No Department'}
                        </Text>
                      </View>
                      {isClockedIn ? (
                        <View style={[styles.statusBadge, { backgroundColor: '#10B98115' }]}>
                          <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Clocked In</Text>
                        </View>
                      ) : (
                        <ChevronRight size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <View style={styles.emptyState}>
                    <Users size={40} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No employees found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmployeeActionModal = () => {
    if (!selectedEmployee || !selectedLocation) return null;

    const session = getEmployeeSessionAtLocation(selectedEmployee.employee_id, selectedLocation.id);
    const isClockedIn = !!session;

    return (
      <Modal visible={showEmployeeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModalContent, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.closeBtn, styles.actionCloseBtn, { backgroundColor: colors.background }]}
              onPress={() => {
                setShowEmployeeModal(false);
                setSelectedEmployee(null);
              }}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>

            <View style={[styles.employeeCard, { backgroundColor: colors.background }]}>
              <View style={[styles.largeAvatar, { backgroundColor: isClockedIn ? '#10B98120' : `${colors.primary}20` }]}>
                <Text style={[styles.largeAvatarText, { color: isClockedIn ? '#10B981' : colors.primary }]}>
                  {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                </Text>
              </View>
              <Text style={[styles.cardName, { color: colors.text }]}>
                {selectedEmployee.first_name} {selectedEmployee.last_name}
              </Text>
              <Text style={[styles.cardLocation, { color: colors.textSecondary }]}>
                {selectedLocation.name}
              </Text>

              {isClockedIn && session && (
                <View style={[styles.sessionInfo, { borderTopColor: colors.border }]}>
                  <Clock size={16} color="#10B981" />
                  <Text style={[styles.sessionText, { color: '#10B981' }]}>
                    Clocked in since {new Date(session.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtons}>
              {isClockedIn ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.clockOutBtn]}
                  onPress={handleClockOut}
                  disabled={endSessionMutation.isPending}
                >
                  {endSessionMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <LogOut size={24} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Clock Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.clockInBtn]}
                  onPress={handleClockIn}
                  disabled={startSessionMutation.isPending}
                >
                  {startSessionMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <LogIn size={24} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Clock In</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => {
                setShowEmployeeModal(false);
                setSelectedEmployee(null);
              }}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (locationsLoading && activeLocations.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Location Hub', headerShown: true }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading locations...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Location Hub', headerShown: true }} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Location Hub</Text>
          <Text style={[styles.headerTime, { color: colors.textSecondary }]}>
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.liveIndicator, { backgroundColor: isSubscribed ? '#10B98120' : '#EF444420' }]}>
          {isSubscribed ? <Wifi size={14} color="#10B981" /> : <WifiOff size={14} color="#EF4444" />}
          <Text style={[styles.liveText, { color: isSubscribed ? '#10B981' : '#EF4444' }]}>
            {isSubscribed ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {activeSessions.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Clocked In</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {activeLocations.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Locations</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text }]}>Select a Location</Text>

      <ScrollView
        style={styles.locationsGrid}
        contentContainerStyle={styles.locationsContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.gridContainer}>
          {activeLocations.map(renderLocationCard)}
        </View>

        {activeLocations.length === 0 && (
          <View style={styles.emptyState}>
            <MapPin size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Locations Available</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Contact your administrator to set up locations
            </Text>
          </View>
        )}
      </ScrollView>

      {renderLocationModal()}
      {renderEmployeeActionModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  headerTime: {
    fontSize: 14,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  locationsGrid: {
    flex: 1,
  },
  locationsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  locationHeader: {
    marginBottom: 8,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 6,
    lineHeight: 18,
  },
  clockedInBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  clockedInText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  locationStatus: {
    fontSize: 12,
    marginBottom: 10,
  },
  locationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentlyClocked: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  clockedInList: {
    flexDirection: 'row',
  },
  clockedInChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  clockedInAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockedInAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600' as const,
  },
  clockedInName: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  employeeList: {
    maxHeight: 300,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeAvatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  employeeDept: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  actionModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  actionCloseBtn: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 1,
  },
  employeeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  cardName: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 14,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sessionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  actionButtons: {
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700' as const,
  },
  clockInBtn: {
    backgroundColor: '#10B981',
  },
  clockOutBtn: {
    backgroundColor: '#EF4444',
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
});
