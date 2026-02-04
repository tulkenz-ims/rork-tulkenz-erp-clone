import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Package,
  Wrench,
  Clock,
  ChevronRight,
  Target,
  ShoppingCart,
  CheckSquare,
  Megaphone,
  Users,
  LogOut,
  ClipboardList,
  Timer,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useEmployees, SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import {
  useActiveTimeEntry,
  useIsOnBreak,
  useBreakHistory,
  useActiveBreak,
  TimePunch,
} from '@/hooks/useSupabaseTimeClock';

interface ModuleCardData {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  route: string;
  requiresClockIn?: boolean;
}

export default function EmployeeHome() {
  const { colors } = useTheme();
  const { userProfile, signOut } = useUser();
  const { hasAnyPermission } = usePermissions();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: supabaseEmployees = [] } = useEmployees({ status: 'active' });

  const currentEmployee = useMemo((): SupabaseEmployee | null => {
    if (!userProfile || supabaseEmployees.length === 0) return supabaseEmployees[0] || null;
    return supabaseEmployees.find(e => e.email === userProfile.email) || supabaseEmployees[0] || null;
  }, [userProfile, supabaseEmployees]);

  const employeeId = currentEmployee?.id;

  const { data: activeTimeEntryData, refetch: refetchTimeEntry } = useActiveTimeEntry(employeeId);
  const { data: onBreakData, refetch: refetchBreakStatus } = useIsOnBreak(employeeId);
  const { data: breakHistory = [], refetch: refetchBreakHistory } = useBreakHistory(employeeId);
  const { data: activeBreakData } = useActiveBreak(employeeId);



  const activeTimeEntry = useMemo(() => {
    if (!activeTimeEntryData) return null;
    return {
      id: activeTimeEntryData.id,
      clockIn: activeTimeEntryData.clock_in,
      clockOut: activeTimeEntryData.clock_out,
      totalHours: activeTimeEntryData.total_hours,
      breakMinutes: activeTimeEntryData.break_minutes,
      status: activeTimeEntryData.status,
      date: activeTimeEntryData.date,
    };
  }, [activeTimeEntryData]);

  const onBreak = onBreakData ?? false;
  const isClockedIn = !!activeTimeEntry;

  const breakDetails = useMemo(() => {
    if (!breakHistory || breakHistory.length === 0) return null;
    
    const breaks: { 
      startTime: string; 
      endTime: string | null; 
      duration: number;
      breakType: 'paid' | 'unpaid';
      scheduledMinutes: number;
    }[] = [];
    let currentBreakStart: (TimePunch & { break_type?: string; scheduled_minutes?: number }) | null = null;
    let paidBreakMinutes = 0;
    let unpaidBreakMinutes = 0;
    
    for (const punch of breakHistory as (TimePunch & { break_type?: string; scheduled_minutes?: number })[]) {
      if (punch.type === 'break_start') {
        currentBreakStart = punch;
      } else if (punch.type === 'break_end' && currentBreakStart) {
        const startTime = new Date(currentBreakStart.timestamp);
        const endTime = new Date(punch.timestamp);
        const durationMs = endTime.getTime() - startTime.getTime();
        const duration = Math.round(durationMs / (1000 * 60));
        const breakType = (currentBreakStart.break_type || 'unpaid') as 'paid' | 'unpaid';
        
        if (breakType === 'paid') {
          paidBreakMinutes += duration;
        } else {
          unpaidBreakMinutes += duration;
        }
        
        breaks.push({
          startTime: currentBreakStart.timestamp,
          endTime: punch.timestamp,
          duration,
          breakType,
          scheduledMinutes: currentBreakStart.scheduled_minutes || 30,
        });
        currentBreakStart = null;
      }
    }
    
    if (currentBreakStart) {
      const startTime = new Date(currentBreakStart.timestamp);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      const duration = Math.round(durationMs / (1000 * 60));
      const breakType = (currentBreakStart.break_type || 'unpaid') as 'paid' | 'unpaid';
      
      breaks.push({
        startTime: currentBreakStart.timestamp,
        endTime: null,
        duration,
        breakType,
        scheduledMinutes: currentBreakStart.scheduled_minutes || 30,
      });
    }
    
    // Only unpaid breaks deduct from working hours
    const totalDeductibleBreakMinutes = unpaidBreakMinutes;
    const totalBreakMinutes = paidBreakMinutes + unpaidBreakMinutes;
    const lastBreak = breaks[breaks.length - 1];
    
    return {
      breaks,
      totalBreakMinutes,
      totalDeductibleBreakMinutes,
      paidBreakMinutes,
      unpaidBreakMinutes,
      currentBreakStart: currentBreakStart?.timestamp || null,
      lastBreak,
    };
  }, [breakHistory]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName = userProfile
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : 'Employee';

  const quickAccessCards = useMemo<ModuleCardData[]>(() => [
    {
      key: 'taskfeed',
      title: 'Task Feed',
      description: 'View and log task verifications',
      icon: ClipboardList,
      color: '#10B981',
      route: '/(tabs)/taskfeed',
      requiresClockIn: false,
    },
    {
      key: 'bulletin',
      title: 'Bulletin Board',
      description: 'Company announcements and updates',
      icon: Megaphone,
      color: '#F59E0B',
      route: '/(tabs)/portal/bulletin',
      requiresClockIn: false,
    },
    {
      key: 'directory',
      title: 'Company Directory',
      description: 'Find employees by name or department',
      icon: Users,
      color: '#8B5CF6',
      route: '/(tabs)/portal/directory',
      requiresClockIn: false,
    },
  ], []);

  const moduleCards = useMemo<ModuleCardData[]>(() => {
    const cards: ModuleCardData[] = [];

    if (hasAnyPermission('inventory')) {
      cards.push({
        key: 'inventory',
        title: 'Inventory',
        description: 'View materials, stock levels, and manage inventory items',
        icon: Package,
        color: '#10B981',
        route: '/(tabs)/inventory',
        requiresClockIn: true,
      });
    }

    if (hasAnyPermission('work_orders')) {
      cards.push({
        key: 'service',
        title: 'Service',
        description: 'View and manage work orders',
        icon: Wrench,
        color: '#F97316',
        route: '/(tabs)/service',
        requiresClockIn: true,
      });
    }

    if (hasAnyPermission('preventive_maintenance')) {
      cards.push({
        key: 'planner',
        title: 'Planner',
        description: 'View PM schedules and tasks',
        icon: Target,
        color: '#8B5CF6',
        route: '/(tabs)/planner',
        requiresClockIn: true,
      });
    }

    if (hasAnyPermission('procurement')) {
      cards.push({
        key: 'procurement',
        title: 'Procurement',
        description: 'View and manage purchase orders',
        icon: ShoppingCart,
        color: '#F59E0B',
        route: '/(tabs)/procurement',
        requiresClockIn: true,
      });
    }

    if (hasAnyPermission('approvals')) {
      cards.push({
        key: 'approvals',
        title: 'Approvals',
        description: 'View and manage approval requests',
        icon: CheckSquare,
        color: '#8B5CF6',
        route: '/(tabs)/approvals',
        requiresClockIn: true,
      });
    }

    return cards;
  }, [hasAnyPermission]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTimeEntry(),
      refetchBreakStatus(),
      refetchBreakHistory(),
    ]);
    setRefreshing(false);
  }, [refetchTimeEntry, refetchBreakStatus, refetchBreakHistory]);



  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  }, [signOut, router]);

  const handleModulePress = useCallback((card: ModuleCardData) => {
    if (card.requiresClockIn && !isClockedIn) {
      Alert.alert(
        'Clock In Required',
        'You must clock in to perform job related duties. Go to the Time Clock to clock in.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Time Clock', onPress: () => router.push('/(tabs)/portal' as any) },
        ]
      );
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(card.route as any);
  }, [router, isClockedIn]);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const formatDuration = useCallback((clockInTime: string, breakMinutes: number = 0) => {
    const start = new Date(clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60)) - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }, []);

  const formatBreakDuration = useCallback((minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, []);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                Welcome back,
              </Text>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              {(userProfile?.position || currentEmployee?.position) ? (
                <Text style={[styles.companyName, { color: colors.textTertiary }]}>
                  {userProfile?.position || currentEmployee?.position}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.logoutButton, { backgroundColor: colors.error + '15' }]}
              onPress={handleLogout}
            >
              <LogOut size={20} color={colors.error} />
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Timer size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Time Tracking
          </Text>
        </View>

        <View style={[styles.timeTrackingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.timeTrackingHeader}>
            <View style={styles.timeDisplay}>
              <Text style={[styles.currentTime, { color: colors.text }]}>
                {formatTime(currentTime)}
              </Text>
              <Text style={[styles.currentDate, { color: colors.textSecondary }]}>
                {formatDate(currentTime)}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              {isClockedIn ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    {onBreak ? 'On Break' : 'Clocked In'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: colors.textTertiary + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: colors.textTertiary }]} />
                  <Text style={[styles.statusText, { color: colors.textTertiary }]}>Not Clocked In</Text>
                </View>
              )}
            </View>
          </View>

          {isClockedIn && activeTimeEntry?.clockIn && (
            <View style={[styles.timeDetailsContainer, { borderTopColor: colors.border }]}>
              <View style={styles.durationRow}>
                <View style={styles.durationItem}>
                  <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>Shift Started</Text>
                  <Text style={[styles.durationValue, { color: colors.text }]}>
                    {new Date(activeTimeEntry.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.durationDivider, { backgroundColor: colors.border }]} />
                <View style={styles.durationItem}>
                  <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>Break</Text>
                  <Text style={[styles.durationValue, { color: colors.warning }]}>
                    {formatBreakDuration(breakDetails?.totalBreakMinutes || activeTimeEntry.breakMinutes || 0)}
                  </Text>
                  {breakDetails && (breakDetails.paidBreakMinutes > 0 || breakDetails.unpaidBreakMinutes > 0) && (
                    <Text style={[styles.breakTypeHint, { color: colors.textTertiary }]}>
                      {breakDetails.paidBreakMinutes > 0 && `${breakDetails.paidBreakMinutes}m paid`}
                      {breakDetails.paidBreakMinutes > 0 && breakDetails.unpaidBreakMinutes > 0 && ' • '}
                      {breakDetails.unpaidBreakMinutes > 0 && `${breakDetails.unpaidBreakMinutes}m unpaid`}
                    </Text>
                  )}
                </View>
                <View style={[styles.durationDivider, { backgroundColor: colors.border }]} />
                <View style={styles.durationItem}>
                  <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>Working</Text>
                  <Text style={[styles.durationValue, { color: colors.primary }]}>
                    {formatDuration(activeTimeEntry.clockIn, breakDetails?.totalDeductibleBreakMinutes || activeTimeEntry.breakMinutes || 0)}
                  </Text>
                </View>
              </View>
              
              {breakDetails && breakDetails.breaks.length > 0 && (
                <View style={[styles.breakHistoryRow, { borderTopColor: colors.border }]}>
                  {breakDetails.breaks.map((brk, idx) => {
                    const isPaid = brk.breakType === 'paid';
                    const bgColor = isPaid ? colors.success + '10' : colors.warning + '10';
                    const labelColor = isPaid ? colors.success : colors.warning;
                    return (
                      <View key={idx} style={[styles.breakEntry, { backgroundColor: bgColor }]}>
                        <View style={styles.breakEntryHeader}>
                          <Text style={[styles.breakEntryLabel, { color: labelColor }]}>
                            {isPaid ? 'Paid' : 'Unpaid'} Break
                          </Text>
                          <Text style={[styles.breakScheduled, { color: colors.textTertiary }]}>
                            ({brk.scheduledMinutes}m)
                          </Text>
                        </View>
                        <Text style={[styles.breakEntryTime, { color: colors.text }]}>
                          {new Date(brk.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {brk.endTime ? (
                            <> - {new Date(brk.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                          ) : (
                            <Text style={{ color: labelColor }}> (active)</Text>
                          )}
                        </Text>
                        <Text style={[styles.breakEntryDuration, { color: colors.textSecondary }]}>
                          {formatBreakDuration(brk.duration)}{!isPaid && ' deducted'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <Pressable
            style={[styles.viewHistoryLink, { borderTopColor: colors.border }]}
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.push('/(tabs)/portal' as any);
            }}
          >
            <Clock size={16} color={colors.primary} />
            <Text style={[styles.viewHistoryText, { color: colors.primary }]}>
              {isClockedIn ? 'View Time History & Schedule' : 'Clock In / View Schedule'}
            </Text>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Access
          </Text>
        </View>

        <View style={styles.quickAccessList}>
          {quickAccessCards.map((card) => {
            const CardIcon = card.icon;
            return (
              <Pressable
                key={card.key}
                style={({ pressed }) => [
                  styles.quickAccessItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && styles.moduleCardPressed,
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  router.push(card.route as any);
                }}
              >
                <View style={[styles.quickAccessItemIcon, { backgroundColor: card.color + '15' }]}>
                  <CardIcon size={22} color={card.color} />
                </View>
                <View style={styles.quickAccessItemContent}>
                  <Text style={[styles.quickAccessItemTitle, { color: colors.text }]}>
                    {card.title}
                  </Text>
                  <Text style={[styles.quickAccessItemDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {card.description}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>

        {moduleCards.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Work Modules
              </Text>
              {!isClockedIn && (
                <View style={[styles.clockInHint, { backgroundColor: colors.warning + '15' }]}>
                  <Clock size={12} color={colors.warning} />
                  <Text style={[styles.clockInHintText, { color: colors.warning }]}>
                    Clock in required
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.moduleList}>
              {moduleCards.map((card) => {
                const CardIcon = card.icon;
                const isLocked = card.requiresClockIn && !isClockedIn;
                return (
                  <Pressable
                    key={card.key}
                    style={({ pressed }) => [
                      styles.moduleItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.moduleCardPressed,
                      isLocked && styles.moduleItemLocked,
                    ]}
                    onPress={() => handleModulePress(card)}
                  >
                    <View style={[styles.moduleItemIcon, { backgroundColor: isLocked ? colors.textTertiary + '15' : card.color + '15' }]}>
                      <CardIcon size={22} color={isLocked ? colors.textTertiary : card.color} />
                    </View>
                    <View style={styles.moduleItemContent}>
                      <Text style={[styles.moduleItemTitle, { color: isLocked ? colors.textTertiary : colors.text }]}>
                        {card.title}
                      </Text>
                      <Text style={[styles.moduleItemDesc, { color: isLocked ? colors.textTertiary : colors.textSecondary }]} numberOfLines={1}>
                        {card.description}
                      </Text>
                    </View>
                    {isLocked ? (
                      <View style={[styles.lockBadge, { backgroundColor: colors.warning + '20' }]}>
                        <Clock size={12} color={colors.warning} />
                      </View>
                    ) : (
                      <ChevronRight size={18} color={colors.textTertiary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 60,
    },
    header: {
      marginBottom: 24,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerInfo: {
      flex: 1,
      marginRight: 12,
    },
    greeting: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    userName: {
      fontSize: 26,
      fontWeight: '700' as const,
      marginTop: 4,
    },
    companyName: {
      fontSize: 14,
      marginTop: 4,
    },
    logoutButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 8,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
      flex: 1,
    },
    clockInHint: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      gap: 5,
    },
    clockInHintText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    timeTrackingCard: {
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 20,
      overflow: 'hidden',
    },
    timeTrackingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 16,
    },
    timeDisplay: {},
    currentTime: {
      fontSize: 32,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums'],
    },
    currentDate: {
      fontSize: 14,
      marginTop: 2,
    },
    statusContainer: {},
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    timeDetailsContainer: {
      borderTopWidth: 1,
      marginHorizontal: 16,
    },
    durationRow: {
      flexDirection: 'row',
      paddingVertical: 12,
    },
    durationItem: {
      flex: 1,
      alignItems: 'center',
    },
    durationLabel: {
      fontSize: 11,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    durationValue: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    durationDivider: {
      width: 1,
      marginVertical: 4,
    },
    breakHistoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 10,
      borderTopWidth: 1,
    },
    breakEntry: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 100,
    },
    breakEntryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
    },
    breakEntryLabel: {
      fontSize: 10,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
    breakScheduled: {
      fontSize: 9,
    },
    breakTypeHint: {
      fontSize: 9,
      marginTop: 2,
    },
    breakEntryTime: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    breakEntryDuration: {
      fontSize: 11,
      marginTop: 2,
    },
    viewHistoryLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderTopWidth: 1,
      gap: 8,
    },
    viewHistoryText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    quickAccessList: {
      gap: 10,
      marginBottom: 8,
    },
    quickAccessItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    quickAccessItemIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickAccessItemContent: {
      flex: 1,
    },
    quickAccessItemTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    quickAccessItemDesc: {
      fontSize: 12,
      marginTop: 2,
    },
    moduleList: {
      gap: 10,
    },
    moduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    moduleItemLocked: {
      opacity: 0.7,
    },
    moduleItemIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moduleItemContent: {
      flex: 1,
    },
    moduleItemTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    moduleItemDesc: {
      fontSize: 12,
      marginTop: 2,
    },
    moduleCardPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    lockBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomPadding: {
      height: 40,
    },
  });
