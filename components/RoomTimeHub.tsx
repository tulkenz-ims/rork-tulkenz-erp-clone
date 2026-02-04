import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  MapPin,
  Clock,
  Play,
  Square,
  Users,
  Search,
  Filter,
  X,
  CheckCircle,
  Building2,
  Wrench,
  Package,
  ClipboardCheck,
  FileText,
  ChevronRight,
  Timer,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useProductionRooms,
  useActiveRoomSessions,
  useRoomSessionHistory,
  useStartRoomSession,
  useEndRoomSession,
  useRoomSessionsRealtime,
  useRoomTimeSummary,
  type ProductionRoom,
  type RoomSession,
} from '@/hooks/useSupabaseTimeClock';

interface AssignmentHubProps {
  currentEmployeeId?: string;
  currentEmployeeName?: string;
  facilityId?: string;
}

type RoomCategory = 'production' | 'warehouse' | 'quality' | 'maintenance' | 'office';

const getRoomCategoryColor = (category: RoomCategory): string => {
  const colors: Record<RoomCategory, string> = {
    production: '#3B82F6',
    warehouse: '#8B5CF6',
    quality: '#10B981',
    maintenance: '#F59E0B',
    office: '#6B7280',
  };
  return colors[category] || '#6B7280';
};

const getRoomCategoryLabel = (category: RoomCategory): string => {
  const labels: Record<RoomCategory, string> = {
    production: 'Production',
    warehouse: 'Warehouse',
    quality: 'Quality',
    maintenance: 'Maintenance',
    office: 'Office',
  };
  return labels[category] || 'Other';
};

export default function AssignmentHub({
  currentEmployeeId,
  currentEmployeeName,
  facilityId,
}: AssignmentHubProps) {
  const { colors } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ProductionRoom | null>(null);
  const [selectedSession, setSelectedSession] = useState<RoomSession | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'rooms' | 'active' | 'history'>('rooms');

  const historyOptions = useMemo(() => ({ limit: 50 }), []);
  const summaryOptions = useMemo(() => ({ facilityId }), [facilityId]);

  const { data: rooms = [], isLoading: roomsLoading, refetch: refetchRooms } = useProductionRooms(facilityId);
  const { data: activeSessions = [], isLoading: sessionsLoading, refetch: refetchActiveSessions } = useActiveRoomSessions();
  const { data: sessionHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useRoomSessionHistory(historyOptions);
  const { data: roomSummaries = [] } = useRoomTimeSummary(summaryOptions);

  const startSessionMutation = useStartRoomSession();
  const endSessionMutation = useEndRoomSession();

  const { isSubscribed } = useRoomSessionsRealtime();

  useEffect(() => {
    console.log('[AssignmentHub] Real-time subscription status:', isSubscribed);
  }, [isSubscribed]);

  const myActiveSessions = useMemo(() => {
    if (!currentEmployeeId) return [];
    return activeSessions.filter(s => s.employee_id === currentEmployeeId);
  }, [activeSessions, currentEmployeeId]);

  const completedSessions = useMemo(() => {
    return sessionHistory.filter(s => s.status === 'completed').slice(0, 20);
  }, [sessionHistory]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch =
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || room.category === categoryFilter;
      return matchesSearch && matchesCategory && room.is_active;
    });
  }, [rooms, searchQuery, categoryFilter]);

  const getActiveSessionsForRoom = useCallback((roomId: string) => {
    return activeSessions.filter(s => s.room_id === roomId);
  }, [activeSessions]);

  const handleClockIn = useCallback(async () => {
    if (!selectedRoom || !currentEmployeeId) {
      Alert.alert('Error', 'Unable to check in. Please try again.');
      return;
    }

    console.log('[AssignmentHub] Starting assignment session:', selectedRoom.id);

    startSessionMutation.mutate(
      {
        employeeId: currentEmployeeId,
        roomId: selectedRoom.id,
        notes: sessionNotes || undefined,
      },
      {
        onSuccess: () => {
          console.log('[AssignmentHub] Session started successfully');
          setShowClockInModal(false);
          setSelectedRoom(null);
          setSessionNotes('');
          Alert.alert('Checked In', `You are now checked into ${selectedRoom.name}`);
        },
        onError: (error) => {
          console.error('[AssignmentHub] Start session error:', error);
          Alert.alert('Error', error.message || 'Failed to check in. Please try again.');
        },
      }
    );
  }, [selectedRoom, currentEmployeeId, sessionNotes, startSessionMutation]);

  const handleClockOut = useCallback(async () => {
    if (!selectedSession) {
      Alert.alert('Error', 'Unable to check out. Please try again.');
      return;
    }

    console.log('[AssignmentHub] Ending assignment session:', selectedSession.id);

    endSessionMutation.mutate(
      {
        sessionId: selectedSession.id,
      },
      {
        onSuccess: (data) => {
          console.log('[AssignmentHub] Session ended successfully');
          const duration = data?.duration || 0;
          setShowClockOutModal(false);
          setSelectedSession(null);
          Alert.alert(
            'Clocked Out',
            `Session ended. Duration: ${Math.floor(duration / 60)}h ${duration % 60}m`
          );
        },
        onError: (error) => {
          console.error('[AssignmentHub] End session error:', error);
          Alert.alert('Error', error.message || 'Failed to check out. Please try again.');
        },
      }
    );
  }, [selectedSession, endSessionMutation]);

  const handleRefresh = useCallback(() => {
    refetchRooms();
    refetchActiveSessions();
    refetchHistory();
  }, [refetchRooms, refetchActiveSessions, refetchHistory]);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getElapsedTime = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    return formatDuration(minutes);
  };

  const getCategoryIcon = (category: RoomCategory) => {
    const iconProps = { size: 18, color: getRoomCategoryColor(category) };
    switch (category) {
      case 'production':
        return <Building2 {...iconProps} />;
      case 'warehouse':
        return <Package {...iconProps} />;
      case 'quality':
        return <ClipboardCheck {...iconProps} />;
      case 'maintenance':
        return <Wrench {...iconProps} />;
      case 'office':
        return <FileText {...iconProps} />;
      default:
        return <Building2 {...iconProps} />;
    }
  };

  const renderRoomCard = (room: ProductionRoom) => {
    const activeCount = getActiveSessionsForRoom(room.id).length;
    const summary = roomSummaries.find(s => s.room_id === room.id);
    const categoryColor = getRoomCategoryColor(room.category as RoomCategory);
    const isUserInRoom = myActiveSessions.some(s => s.room_id === room.id);

    return (
      <TouchableOpacity
        key={room.id}
        style={[
          styles.roomCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isUserInRoom && { borderColor: '#10B981', borderWidth: 2 },
        ]}
        onPress={() => {
          if (isUserInRoom) {
            const session = myActiveSessions.find(s => s.room_id === room.id);
            if (session) {
              setSelectedSession(session);
              setShowClockOutModal(true);
            }
          } else {
            setSelectedRoom(room);
            setShowClockInModal(true);
          }
        }}
      >
        <View style={styles.roomHeader}>
          <View style={[styles.roomIcon, { backgroundColor: `${categoryColor}20` }]}>
            {getCategoryIcon(room.category as RoomCategory)}
          </View>
          <View style={styles.roomInfo}>
            <Text style={[styles.roomName, { color: colors.text }]}>{room.name}</Text>
            <Text style={[styles.roomCode, { color: colors.textSecondary }]}>
              {room.code} • {getRoomCategoryLabel(room.category as RoomCategory)}
            </Text>
          </View>
          {isUserInRoom ? (
            <View style={[styles.activeIndicator, { backgroundColor: '#10B981' }]}>
              <Text style={styles.activeIndicatorText}>Active</Text>
            </View>
          ) : (
            <ChevronRight size={20} color={colors.textSecondary} />
          )}
        </View>

        <View style={styles.roomStats}>
          <View style={styles.roomStat}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.roomStatText, { color: colors.textSecondary }]}>
              {activeCount} active
            </Text>
          </View>
          <View style={styles.roomStat}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={[styles.roomStatText, { color: colors.textSecondary }]}>
              {summary ? summary.total_hours.toFixed(1) : 0}h today
            </Text>
          </View>
          <View style={styles.roomStat}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={[styles.roomStatText, { color: colors.textSecondary }]}>
              Cap: {room.capacity}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderActiveSession = (session: RoomSession) => {
    const isMySession = currentEmployeeId && session.employee_id === currentEmployeeId;

    return (
      <TouchableOpacity
        key={session.id}
        style={[
          styles.sessionCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isMySession && { borderColor: '#10B981', borderWidth: 2 },
        ]}
        onPress={() => {
          if (isMySession) {
            setSelectedSession(session);
            setShowClockOutModal(true);
          }
        }}
        disabled={!isMySession}
      >
        <View style={styles.sessionHeader}>
          <View style={[styles.sessionIcon, { backgroundColor: '#10B98120' }]}>
            <Timer size={18} color="#10B981" />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionEmployee, { color: colors.text }]}>
              {session.employee_name || 'Unknown Employee'}
            </Text>
            <Text style={[styles.sessionRoom, { color: colors.textSecondary }]}>
              {session.room_name} ({session.room_code})
            </Text>
          </View>
          <View style={styles.sessionTime}>
            <Text style={[styles.elapsedTime, { color: '#10B981' }]}>
              {getElapsedTime(session.start_time)}
            </Text>
            <Text style={[styles.startTime, { color: colors.textSecondary }]}>
              Started {formatTime(session.start_time)}
            </Text>
          </View>
        </View>

        {session.notes && (
          <Text style={[styles.sessionNotes, { color: colors.textSecondary }]}>
            {session.notes}
          </Text>
        )}

        {session.linked_work_order_number && (
          <View style={[styles.linkedBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Wrench size={12} color={colors.primary} />
            <Text style={[styles.linkedText, { color: colors.primary }]}>
              {session.linked_work_order_number}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHistorySession = (session: RoomSession) => {
    return (
      <View
        key={session.id}
        style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.historyHeader}>
          <View>
            <Text style={[styles.historyEmployee, { color: colors.text }]}>
              {session.employee_name || 'Unknown Employee'}
            </Text>
            <Text style={[styles.historyRoom, { color: colors.textSecondary }]}>
              {session.room_name}
            </Text>
          </View>
          <View style={styles.historyTime}>
            <Text style={[styles.historyDuration, { color: colors.text }]}>
              {session.duration ? formatDuration(session.duration) : '-'}
            </Text>
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              {new Date(session.start_time).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const isLoading = roomsLoading || sessionsLoading;
  const isRefreshing = roomsLoading && rooms.length > 0;

  if (isLoading && rooms.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading assignments...
        </Text>
      </View>
    );
  }

  if (!currentEmployeeId) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <AlertCircle size={48} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Not Signed In</Text>
        <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
          Please sign in to view your assignments
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Real-time Status Indicator */}
      <View style={[styles.realtimeIndicator, { backgroundColor: isSubscribed ? '#10B98120' : '#EF444420' }]}>
        {isSubscribed ? (
          <Wifi size={14} color="#10B981" />
        ) : (
          <WifiOff size={14} color="#EF4444" />
        )}
        <Text style={[styles.realtimeText, { color: isSubscribed ? '#10B981' : '#EF4444' }]}>
          {isSubscribed ? 'Live updates' : 'Reconnecting...'}
        </Text>
      </View>

      {/* My Active Sessions Banner */}
      {myActiveSessions.length > 0 && (
        <View style={[styles.mySessionsBanner, { backgroundColor: '#10B98115' }]}>
          <View style={styles.bannerContent}>
            <Timer size={20} color="#10B981" />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: '#10B981' }]}>
                Checked into {myActiveSessions.length} assignment{myActiveSessions.length > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: '#10B981' }]}>
                {myActiveSessions.map(s => s.room_code).join(', ')}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['rooms', 'active', 'history'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              {tab === 'rooms' ? 'Assignments' : tab === 'active' ? `Active (${activeSessions.length})` : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search & Filter */}
      {activeTab === 'rooms' && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search assignments..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'rooms' && (
          <View style={styles.roomsList}>
            {filteredRooms.map(renderRoomCard)}
            {filteredRooms.length === 0 && (
              <View style={styles.emptyState}>
                <MapPin size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Assignments Found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  No assignments available for today
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'active' && (
          <View style={styles.sessionsList}>
            {activeSessions.map(renderActiveSession)}
            {activeSessions.length === 0 && (
              <View style={styles.emptyState}>
                <Clock size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Sessions</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Check into an assignment to start tracking
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyList}>
            {historyLoading && completedSessions.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <>
                {completedSessions.map(renderHistorySession)}
                {completedSessions.length === 0 && (
                  <View style={styles.emptyState}>
                    <FileText size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No History</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                      Completed sessions will appear here
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Clock In Modal */}
      <Modal visible={showClockInModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Check In</Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowClockInModal(false);
                  setSelectedRoom(null);
                  setSessionNotes('');
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedRoom && (
              <>
                <View style={[styles.selectedRoomCard, { backgroundColor: colors.background }]}>
                  <View style={[styles.roomIcon, { backgroundColor: `${getRoomCategoryColor(selectedRoom.category as RoomCategory)}20` }]}>
                    {getCategoryIcon(selectedRoom.category as RoomCategory)}
                  </View>
                  <View style={styles.selectedRoomInfo}>
                    <Text style={[styles.selectedRoomName, { color: colors.text }]}>
                      {selectedRoom.name}
                    </Text>
                    <Text style={[styles.selectedRoomCode, { color: colors.textSecondary }]}>
                      {selectedRoom.code} • {getRoomCategoryLabel(selectedRoom.category as RoomCategory)}
                    </Text>
                  </View>
                </View>

                <View style={styles.notesSection}>
                  <Text style={[styles.notesLabel, { color: colors.text }]}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Add notes (optional)"
                    placeholderTextColor={colors.textSecondary}
                    value={sessionNotes}
                    onChangeText={setSessionNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.clockInButton, startSessionMutation.isPending && styles.disabledButton]}
                  onPress={handleClockIn}
                  disabled={startSessionMutation.isPending}
                >
                  {startSessionMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Play size={20} color="#FFFFFF" />
                      <Text style={styles.clockInButtonText}>Check In</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Clock Out Modal */}
      <Modal visible={showClockOutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Check Out</Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowClockOutModal(false);
                  setSelectedSession(null);
                }}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <>
                <View style={[styles.sessionSummary, { backgroundColor: colors.background }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Assignment</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {selectedSession.room_name}
                  </Text>

                  <Text style={[styles.summaryLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                    Duration
                  </Text>
                  <Text style={[styles.summaryValueLarge, { color: '#10B981' }]}>
                    {getElapsedTime(selectedSession.start_time)}
                  </Text>

                  <Text style={[styles.summaryLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                    Started
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {formatTime(selectedSession.start_time)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.clockOutButton, endSessionMutation.isPending && styles.disabledButton]}
                  onPress={handleClockOut}
                  disabled={endSessionMutation.isPending}
                >
                  {endSessionMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Square size={20} color="#FFFFFF" />
                      <Text style={styles.clockOutButtonText}>Check Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filter by Category</Text>
            {(['all', 'production', 'warehouse', 'quality', 'maintenance', 'office'] as const).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterOption,
                  categoryFilter === cat && { backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => {
                  setCategoryFilter(cat);
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    { color: categoryFilter === cat ? colors.primary : colors.text },
                  ]}
                >
                  {cat === 'all' ? 'All Categories' : getRoomCategoryLabel(cat)}
                </Text>
                {categoryFilter === cat && <CheckCircle size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  realtimeText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  mySessionsBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  roomsList: {
    gap: 12,
    paddingBottom: 20,
  },
  roomCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  roomCode: {
    fontSize: 13,
    marginTop: 2,
  },
  activeIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  roomStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 16,
  },
  roomStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomStatText: {
    fontSize: 12,
  },
  sessionsList: {
    gap: 12,
    paddingBottom: 20,
  },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionEmployee: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sessionRoom: {
    fontSize: 12,
    marginTop: 2,
  },
  sessionTime: {
    alignItems: 'flex-end',
  },
  elapsedTime: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  startTime: {
    fontSize: 11,
    marginTop: 2,
  },
  sessionNotes: {
    fontSize: 12,
    marginTop: 10,
    fontStyle: 'italic',
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 10,
  },
  linkedText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  historyList: {
    gap: 8,
    paddingBottom: 20,
  },
  historyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyEmployee: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  historyRoom: {
    fontSize: 12,
    marginTop: 2,
  },
  historyTime: {
    alignItems: 'flex-end',
  },
  historyDuration: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  selectedRoomInfo: {
    flex: 1,
  },
  selectedRoomName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  selectedRoomCode: {
    fontSize: 13,
    marginTop: 2,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clockInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  clockInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  clockOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  clockOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sessionSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  summaryValueLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterOptionText: {
    fontSize: 14,
  },
});
