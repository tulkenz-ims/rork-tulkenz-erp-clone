import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import {
  User,
  Clock,
  Calendar,
  CalendarDays,
  Play,
  Square,
  Coffee,
  ArrowRightLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronDown,
  History,
  Palmtree,
  Thermometer,
  Gift,
  Home,
  LogIn,
  LogOut,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useEmployees, SupabaseEmployee } from '@/hooks/useSupabaseEmployees';
import {
  useActiveTimeEntry,
  useIsOnBreak,
  useTimeEntries,
  useClockIn,
  useClockOut,
  useStartBreak,
  useEndBreak,
  useBreakHistory,
  useApproveTimeEntry,
  useApproveAllTimeEntries,
  useCreateTimeAdjustmentRequest,
  TimePunch,
  TimeEntryWithBreaks,
} from '@/hooks/useSupabaseTimeClock';
import { useEmployeeShifts } from '@/hooks/useSupabaseShifts';
import { useShiftSwaps, type ShiftSwap } from '@/hooks/useSupabaseShiftSwaps';
import { useTimeOffRequests, useCreateTimeOffRequest } from '@/hooks/useSupabaseTimeOff';
import { Edit3, CheckSquare, FileText } from 'lucide-react-native';

type PortalTab = 'clock' | 'schedule' | 'requests' | 'history';
type TimeOffType = 'vacation' | 'sick' | 'personal' | 'unpaid';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PortalScreen() {
  const { colors } = useTheme();
  const { userProfile, company, signOut } = useUser();

  const { data: supabaseEmployees = [] } = useEmployees({ status: 'active' });

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>('clock');
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [timeOffModalVisible, setTimeOffModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  const currentEmployee = useMemo((): SupabaseEmployee | null => {
    if (!userProfile || supabaseEmployees.length === 0) return supabaseEmployees[0] || null;
    return supabaseEmployees.find(e => e.email === userProfile.email) || supabaseEmployees[0] || null;
  }, [userProfile, supabaseEmployees]);

  const employeeId = currentEmployee?.id;

  const { data: activeTimeEntryData } = useActiveTimeEntry(employeeId);
  const { data: onBreakData } = useIsOnBreak(employeeId);
  const { data: breakHistory = [] } = useBreakHistory(employeeId);
  
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const startBreakMutation = useStartBreak();
  const endBreakMutation = useEndBreak();

  const { data: recentEntriesData = [] } = useTimeEntries(employeeId, { limit: 7 });
  
  const [timeEntriesWeekFilter, setTimeEntriesWeekFilter] = useState<'this_week' | 'last_week'>('this_week');
  
  const timeEntriesDateRange = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calculate this week's Sunday (start of week)
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - dayOfWeek);
    thisWeekStart.setHours(0, 0, 0, 0);
    
    // Calculate this week's Saturday (end of week)
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    
    // Calculate last week's Sunday and Saturday
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    
    if (timeEntriesWeekFilter === 'this_week') {
      return {
        startDate: thisWeekStart.toISOString().split('T')[0],
        endDate: thisWeekEnd.toISOString().split('T')[0],
      };
    } else {
      return {
        startDate: lastWeekStart.toISOString().split('T')[0],
        endDate: lastWeekEnd.toISOString().split('T')[0],
      };
    }
  }, [timeEntriesWeekFilter]);
  
  const { data: recentTimeEntriesRaw = [] } = useTimeEntries(employeeId, { 
    startDate: timeEntriesDateRange.startDate, 
    endDate: timeEntriesDateRange.endDate,
    limit: 20 
  });
  
  const weekTimeEntries = useMemo(() => {
    return recentTimeEntriesRaw.map(entry => ({
      ...entry,
      paid_break_minutes: (entry as any).paid_break_minutes || 0,
      unpaid_break_minutes: (entry as any).unpaid_break_minutes || 0,
      employee_approved: (entry as any).employee_approved || false,
      employee_approved_at: (entry as any).employee_approved_at || null,
    }));
  }, [recentTimeEntriesRaw]);
  
  const approveEntryMutation = useApproveTimeEntry();
  const approveAllMutation = useApproveAllTimeEntries();
  const createAdjustmentMutation = useCreateTimeAdjustmentRequest();
  
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
  const [selectedEntryForAdjustment, setSelectedEntryForAdjustment] = useState<TimeEntryWithBreaks | null>(null);
  
  const { data: shiftsData = [] } = useEmployeeShifts(employeeId, { includeCompleted: true });
  const { data: shiftSwapRequestsData = [] } = useShiftSwaps();
  const { data: timeOffRequestsData = [] } = useTimeOffRequests(employeeId);
  const createTimeOffMutation = useCreateTimeOffRequest();

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

  const breakDetails = useMemo(() => {
    if (!breakHistory || breakHistory.length === 0) return null;
    
    const breaks: { startTime: string; endTime: string | null; duration: number }[] = [];
    let currentBreakStart: TimePunch | null = null;
    
    for (const punch of breakHistory) {
      if (punch.type === 'break_start') {
        currentBreakStart = punch;
      } else if (punch.type === 'break_end' && currentBreakStart) {
        const startTime = new Date(currentBreakStart.timestamp);
        const endTime = new Date(punch.timestamp);
        const durationMs = endTime.getTime() - startTime.getTime();
        breaks.push({
          startTime: currentBreakStart.timestamp,
          endTime: punch.timestamp,
          duration: Math.round(durationMs / (1000 * 60)),
        });
        currentBreakStart = null;
      }
    }
    
    if (currentBreakStart) {
      const startTime = new Date(currentBreakStart.timestamp);
      const now = new Date();
      const durationMs = now.getTime() - startTime.getTime();
      breaks.push({
        startTime: currentBreakStart.timestamp,
        endTime: null,
        duration: Math.round(durationMs / (1000 * 60)),
      });
    }
    
    const totalBreakMinutes = breaks.reduce((sum, b) => sum + b.duration, 0);
    
    return {
      breaks,
      totalBreakMinutes,
      currentBreakStart: currentBreakStart?.timestamp || null,
    };
  }, [breakHistory]);

  const recentTimeEntries = useMemo(() => {
    return recentEntriesData.map(e => ({
      id: e.id,
      date: e.date,
      clockIn: e.clock_in,
      clockOut: e.clock_out,
      totalHours: e.total_hours,
      breakMinutes: e.break_minutes,
      status: e.status,
    }));
  }, [recentEntriesData]);

  const [historyFilter, setHistoryFilter] = useState<'all' | 'week' | 'month' | 'year'>('month');

  const daysMap: Record<'all' | 'week' | 'month' | 'year', number | undefined> = {
    week: 7,
    month: 30,
    year: 365,
    all: undefined,
  };
  const historyLimit = daysMap[historyFilter];
  const { data: filteredEntriesData = [] } = useTimeEntries(employeeId, { limit: historyLimit || 500 });

  const filteredTimeEntries = useMemo(() => {
    return filteredEntriesData.map(e => ({
      id: e.id,
      date: e.date,
      clockIn: e.clock_in,
      clockOut: e.clock_out,
      totalHours: e.total_hours,
      breakMinutes: e.break_minutes,
      status: e.status,
    }));
  }, [filteredEntriesData]);

  const totalHoursInPeriod = useMemo(() => {
    return filteredTimeEntries.reduce((acc, entry) => acc + entry.totalHours, 0);
  }, [filteredTimeEntries]);

  const timeOffBalances = useMemo(() => {
    const balances = currentEmployee?.time_off_balances as Record<string, number> | null;
    if (!balances) {
      return {
        vacation: currentEmployee?.pto_balance || 0,
        sick: 0,
        pto: currentEmployee?.pto_balance || 0,
        vacationUsed: 0,
        sickUsed: 0,
        ptoUsed: 0,
      };
    }
    return {
      vacation: balances.vacation || 0,
      sick: balances.sick || 0,
      pto: balances.pto || 0,
      vacationUsed: balances.vacationUsed || 0,
      sickUsed: balances.sickUsed || 0,
      ptoUsed: balances.ptoUsed || 0,
    };
  }, [currentEmployee]);

  const myTimeOffRequests = useMemo(() => {
    return timeOffRequestsData.map(r => ({
      id: r.id,
      type: r.type as TimeOffType,
      startDate: r.start_date,
      endDate: r.end_date,
      totalDays: r.total_days || 1,
      reason: r.reason || '',
      status: r.status as 'pending' | 'approved' | 'rejected',
    }));
  }, [timeOffRequestsData]);

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(selectedWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [selectedWeekStart]);

  const weekShifts = useMemo(() => {
    const startStr = selectedWeekStart.toISOString().split('T')[0];
    const endDate = new Date(selectedWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const endStr = endDate.toISOString().split('T')[0];
    return shiftsData.filter(s => s.date >= startStr && s.date <= endStr).map(s => ({
      id: s.id,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      status: s.status,
    }));
  }, [shiftsData, selectedWeekStart]);

  const openSwapRequests = useMemo(() => {
    if (!currentEmployee) return [];
    return shiftSwapRequestsData
      .filter((s: ShiftSwap) => s.status === 'pending' && s.requester_id !== currentEmployee.id)
      .map((s: ShiftSwap) => ({
        id: s.id,
        requesterId: s.requester_id,
        requesterName: s.requester_name || 'Unknown',
        originalShiftId: s.requester_shift_id,
        originalShiftDate: s.requester_date,
        reason: s.reason || '',
        status: s.status,
      }));
  }, [currentEmployee, shiftSwapRequestsData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleClockIn = useCallback((goHome?: boolean) => {
    if (!currentEmployee) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    clockInMutation.mutate(
      { employeeId: currentEmployee.id },
      {
        onSuccess: () => {
          if (goHome) {
            router.replace('/(tabs)/(dashboard)');
          } else {
            Alert.alert('Clocked In', `You clocked in at ${new Date().toLocaleTimeString()}`);
          }
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to clock in');
        },
      }
    );
  }, [currentEmployee, clockInMutation, router]);

  const handleGoHome = useCallback(() => {
    router.replace('/(tabs)/(dashboard)');
  }, [router]);

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

  const handleClockOut = useCallback(() => {
    if (!currentEmployee) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    clockOutMutation.mutate(
      { employeeId: currentEmployee.id },
      {
        onSuccess: () => {
          Alert.alert('Clocked Out', `You clocked out at ${new Date().toLocaleTimeString()}`);
        },
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to clock out');
        },
      }
    );
  }, [currentEmployee, clockOutMutation]);

  const handleStartBreak = useCallback(() => {
    if (!currentEmployee) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    startBreakMutation.mutate(
      { employeeId: currentEmployee.id },
      {
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to start break');
        },
      }
    );
  }, [currentEmployee, startBreakMutation]);

  const handleEndBreak = useCallback(() => {
    if (!currentEmployee) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    endBreakMutation.mutate(
      { employeeId: currentEmployee.id },
      {
        onError: (error) => {
          Alert.alert('Error', error.message || 'Failed to end break');
        },
      }
    );
  }, [currentEmployee, endBreakMutation]);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setSelectedWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  }, []);

  const formatTime = useCallback((date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  const formatDuration = useCallback((clockIn: string, breakMinutes: number = 0) => {
    const start = new Date(clockIn);
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

  const displayName = currentEmployee
    ? `${currentEmployee.first_name} ${currentEmployee.last_name}`
    : 'Employee';

  const renderClockTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.clockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.payrollClockBadge}>
          <Text style={[styles.payrollClockLabel, { color: colors.success }]}>Payroll Time Clock</Text>
        </View>
        <Text style={[styles.currentTimeLabel, { color: colors.textSecondary }]}>Current Time</Text>
        <Text style={[styles.currentTime, { color: colors.text }]}>{formatTime(currentTime)}</Text>
        <Text style={[styles.currentDate, { color: colors.textTertiary }]}>
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {activeTimeEntry ? (
          <View style={styles.activeShiftContainer}>
            <View style={styles.activeShiftInfo}>
              <View style={[styles.activeIndicator, { backgroundColor: onBreak ? colors.warning : colors.success }]} />
              <Text style={[styles.activeShiftText, { color: onBreak ? colors.warning : colors.success }]}>
                {onBreak ? 'On Break' : 'Clocked In'}
              </Text>
            </View>
            
            <View style={styles.timeDetailsGrid}>
              <View style={styles.timeDetailItem}>
                <Text style={[styles.timeDetailLabel, { color: colors.textTertiary }]}>Shift Started</Text>
                <Text style={[styles.timeDetailValue, { color: colors.text }]}>
                  {new Date(activeTimeEntry.clockIn || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.timeDetailDivider, { backgroundColor: colors.border }]} />
              <View style={styles.timeDetailItem}>
                <Text style={[styles.timeDetailLabel, { color: colors.textTertiary }]}>Break</Text>
                <Text style={[styles.timeDetailValue, { color: colors.warning }]}>
                  {formatBreakDuration(breakDetails?.totalBreakMinutes || activeTimeEntry.breakMinutes || 0)}
                </Text>
              </View>
              <View style={[styles.timeDetailDivider, { backgroundColor: colors.border }]} />
              <View style={styles.timeDetailItem}>
                <Text style={[styles.timeDetailLabel, { color: colors.textTertiary }]}>Working</Text>
                <Text style={[styles.timeDetailValue, { color: colors.primary }]}>
                  {formatDuration(activeTimeEntry.clockIn || '', breakDetails?.totalBreakMinutes || activeTimeEntry.breakMinutes || 0)}
                </Text>
              </View>
            </View>
            
            {breakDetails && breakDetails.breaks.length > 0 && (
              <View style={[styles.breakHistorySection, { borderTopColor: colors.border }]}>
                <Text style={[styles.breakHistoryTitle, { color: colors.textSecondary }]}>Today&apos;s Breaks</Text>
                <View style={styles.breakHistoryList}>
                  {breakDetails.breaks.map((brk, idx) => (
                    <View key={idx} style={[styles.breakHistoryItem, { backgroundColor: colors.warning + '10' }]}>
                      <Text style={[styles.breakHistoryLabel, { color: colors.warning }]}>Break {idx + 1}</Text>
                      <Text style={[styles.breakHistoryTime, { color: colors.text }]}>
                        {new Date(brk.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {brk.endTime ? (
                          ` - ${new Date(brk.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                        ) : (
                          ' (active)'
                        )}
                      </Text>
                      <Text style={[styles.breakHistoryDuration, { color: colors.textSecondary }]}>
                        {formatBreakDuration(brk.duration)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.activeShiftInfo}>
            <View style={[styles.activeIndicator, { backgroundColor: colors.textTertiary }]} />
            <Text style={[styles.activeShiftText, { color: colors.textTertiary }]}>Not clocked in</Text>
          </View>
        )}

        <View style={styles.clockActions}>
          {!activeTimeEntry ? (
            <Pressable
              style={[styles.clockButton, styles.clockInButton, { backgroundColor: colors.success }]}
              onPress={() => handleClockIn(false)}
            >
              <Play size={24} color="#FFFFFF" />
              <Text style={styles.clockButtonText}>Clock In</Text>
            </Pressable>
          ) : onBreak ? (
            <Pressable
              style={[styles.clockButton, styles.breakButton, { backgroundColor: colors.info }]}
              onPress={handleEndBreak}
            >
              <Coffee size={20} color="#FFFFFF" />
              <Text style={styles.clockButtonText}>End Break</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={[styles.clockButton, styles.breakButton, { backgroundColor: colors.warning }]}
                onPress={handleStartBreak}
              >
                <Coffee size={20} color="#FFFFFF" />
                <Text style={styles.clockButtonText}>Start Break</Text>
              </Pressable>
              <Pressable
                style={[styles.clockButton, styles.clockOutButton, { backgroundColor: colors.error }]}
                onPress={handleClockOut}
              >
                <Square size={20} color="#FFFFFF" />
                <Text style={styles.clockButtonText}>Clock Out</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week&apos;s Hours</Text>
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Timer size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {recentTimeEntries.reduce((acc, te) => acc + te.totalHours, 0).toFixed(1)}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Worked</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <TrendingUp size={20} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {((currentEmployee?.profile as Record<string, unknown>)?.totalHoursWorked as number)?.toFixed(1) || '0'}h
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Hours</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Calendar size={20} color={colors.purple} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {weekShifts.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shifts</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Benefit Balances</Text>
        
        <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.benefitHeader}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.primary + '20' }]}>
              <Palmtree size={20} color={colors.primary} />
            </View>
            <Text style={[styles.benefitTitle, { color: colors.text }]}>Vacation Time</Text>
          </View>
          <View style={styles.benefitStats}>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Accrued</Text>
              <Text style={[styles.benefitStatValue, { color: colors.text }]}>
                {(timeOffBalances.vacation + timeOffBalances.vacationUsed).toFixed(1)}h
              </Text>
            </View>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Used</Text>
              <Text style={[styles.benefitStatValue, { color: colors.error }]}>
                {timeOffBalances.vacationUsed.toFixed(1)}h
              </Text>
            </View>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Remaining</Text>
              <Text style={[styles.benefitStatValueLarge, { color: colors.primary }]}>
                {timeOffBalances.vacation.toFixed(1)}h
              </Text>
            </View>
          </View>
          <View style={[styles.benefitProgressBg, { backgroundColor: colors.border }]}>
            <View style={[
              styles.benefitProgressFill,
              { 
                backgroundColor: colors.primary,
                width: `${Math.min(100, (timeOffBalances.vacation / Math.max(1, timeOffBalances.vacation + timeOffBalances.vacationUsed)) * 100)}%`
              }
            ]} />
          </View>
        </View>

        <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.benefitHeader}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.error + '20' }]}>
              <Thermometer size={20} color={colors.error} />
            </View>
            <Text style={[styles.benefitTitle, { color: colors.text }]}>Sick Days</Text>
          </View>
          <View style={styles.benefitStats}>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Accrued</Text>
              <Text style={[styles.benefitStatValue, { color: colors.text }]}>
                {(timeOffBalances.sick + timeOffBalances.sickUsed).toFixed(1)}h
              </Text>
            </View>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Used</Text>
              <Text style={[styles.benefitStatValue, { color: colors.error }]}>
                {timeOffBalances.sickUsed.toFixed(1)}h
              </Text>
            </View>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Remaining</Text>
              <Text style={[styles.benefitStatValueLarge, { color: colors.error }]}>
                {timeOffBalances.sick.toFixed(1)}h
              </Text>
            </View>
          </View>
          <View style={[styles.benefitProgressBg, { backgroundColor: colors.border }]}>
            <View style={[
              styles.benefitProgressFill,
              { 
                backgroundColor: colors.error,
                width: `${Math.min(100, (timeOffBalances.sick / Math.max(1, timeOffBalances.sick + timeOffBalances.sickUsed)) * 100)}%`
              }
            ]} />
          </View>
        </View>

        <View style={[styles.benefitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.benefitHeader}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.success + '20' }]}>
              <Gift size={20} color={colors.success} />
            </View>
            <Text style={[styles.benefitTitle, { color: colors.text }]}>PTO (Personal Time)</Text>
          </View>
          <View style={styles.benefitStats}>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Accrued</Text>
              <Text style={[styles.benefitStatValue, { color: colors.text }]}>
                {(timeOffBalances.pto + timeOffBalances.ptoUsed).toFixed(1)}h
              </Text>
            </View>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Used</Text>
              <Text style={[styles.benefitStatValue, { color: colors.error }]}>
                {timeOffBalances.ptoUsed.toFixed(1)}h
              </Text>
            </View>
            <View style={styles.benefitStatItem}>
              <Text style={[styles.benefitStatLabel, { color: colors.textTertiary }]}>Remaining</Text>
              <Text style={[styles.benefitStatValueLarge, { color: colors.success }]}>
                {timeOffBalances.pto.toFixed(1)}h
              </Text>
            </View>
          </View>
          <View style={[styles.benefitProgressBg, { backgroundColor: colors.border }]}>
            <View style={[
              styles.benefitProgressFill,
              { 
                backgroundColor: colors.success,
                width: `${Math.min(100, (timeOffBalances.pto / Math.max(1, timeOffBalances.pto + timeOffBalances.ptoUsed)) * 100)}%`
              }
            ]} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Entries</Text>
          {weekTimeEntries.filter(e => !e.employee_approved && e.status === 'completed').length > 0 && (
            <Pressable
              style={[styles.approveAllButton, { backgroundColor: colors.success }]}
              onPress={() => {
                if (!currentEmployee) return;
                const unapprovedIds = weekTimeEntries
                  .filter(e => !e.employee_approved && e.status === 'completed')
                  .map(e => e.id);
                if (unapprovedIds.length === 0) return;
                approveAllMutation.mutate(
                  { employeeId: currentEmployee.id, entryIds: unapprovedIds },
                  {
                    onSuccess: () => {
                      Alert.alert('Approved', `${unapprovedIds.length} entries approved`);
                    },
                    onError: (err) => {
                      Alert.alert('Error', err.message || 'Failed to approve entries');
                    },
                  }
                );
              }}
            >
              <CheckSquare size={14} color="#FFFFFF" />
              <Text style={styles.approveAllButtonText}>Approve All</Text>
            </Pressable>
          )}
        </View>
        
        <View style={styles.weekFilterRow}>
          <Pressable
            style={[
              styles.weekFilterButton,
              { borderColor: colors.border },
              timeEntriesWeekFilter === 'this_week' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setTimeEntriesWeekFilter('this_week')}
          >
            <Text style={[
              styles.weekFilterText,
              { color: timeEntriesWeekFilter === 'this_week' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              This Week
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.weekFilterButton,
              { borderColor: colors.border },
              timeEntriesWeekFilter === 'last_week' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setTimeEntriesWeekFilter('last_week')}
          >
            <Text style={[
              styles.weekFilterText,
              { color: timeEntriesWeekFilter === 'last_week' ? '#FFFFFF' : colors.textSecondary }
            ]}>
              Last Week
            </Text>
          </Pressable>
          <Text style={[styles.weekFilterDateRange, { color: colors.textTertiary }]}>
            {new Date(timeEntriesDateRange.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(timeEntriesDateRange.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        
        {weekTimeEntries.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Clock size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No time entries for {timeEntriesWeekFilter === 'this_week' ? 'this week' : 'last week'}
            </Text>
          </View>
        ) : (
          weekTimeEntries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.weekEntryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.weekEntryHeader}>
                <Text style={[styles.weekEntryDate, { color: colors.text }]}>
                  {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.weekEntryBadges}>
                  {entry.employee_approved ? (
                    <View style={[styles.approvedBadge, { backgroundColor: colors.success + '20' }]}>
                      <CheckCircle2 size={12} color={colors.success} />
                      <Text style={[styles.approvedBadgeText, { color: colors.success }]}>Approved</Text>
                    </View>
                  ) : entry.status === 'completed' ? (
                    <View style={[styles.pendingApprovalBadge, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.pendingApprovalText, { color: colors.warning }]}>Needs Approval</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: colors.info + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: colors.info }]}>{entry.status}</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.weekEntryTimesRow}>
                <View style={styles.weekEntryTimeBlock}>
                  <Text style={[styles.weekEntryTimeLabel, { color: colors.textTertiary }]}>Clock In</Text>
                  <Text style={[styles.weekEntryTimeValue, { color: colors.success }]}>
                    {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </Text>
                </View>
                <View style={[styles.weekEntryTimeDivider, { backgroundColor: colors.border }]} />
                <View style={styles.weekEntryTimeBlock}>
                  <Text style={[styles.weekEntryTimeLabel, { color: colors.textTertiary }]}>Clock Out</Text>
                  <Text style={[styles.weekEntryTimeValue, { color: colors.error }]}>
                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </Text>
                </View>
                <View style={[styles.weekEntryTimeDivider, { backgroundColor: colors.border }]} />
                <View style={styles.weekEntryTimeBlock}>
                  <Text style={[styles.weekEntryTimeLabel, { color: colors.textTertiary }]}>Hours</Text>
                  <Text style={[styles.weekEntryTimeValue, { color: colors.primary }]}>
                    {entry.total_hours.toFixed(2)}h
                  </Text>
                </View>
              </View>
              
              <View style={[styles.weekEntryBreaksRow, { borderTopColor: colors.border }]}>
                <View style={styles.weekEntryBreakItem}>
                  <View style={[styles.breakTypeDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.breakTypeLabel, { color: colors.textSecondary }]}>Paid Break:</Text>
                  <Text style={[styles.breakTypeValue, { color: colors.text }]}>
                    {entry.paid_break_minutes > 0 ? `${entry.paid_break_minutes}m` : '0m'}
                  </Text>
                </View>
                <View style={styles.weekEntryBreakItem}>
                  <View style={[styles.breakTypeDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.breakTypeLabel, { color: colors.textSecondary }]}>Unpaid Break:</Text>
                  <Text style={[styles.breakTypeValue, { color: colors.text }]}>
                    {entry.unpaid_break_minutes > 0 ? `${entry.unpaid_break_minutes}m` : '0m'}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.weekEntryActions, { borderTopColor: colors.border }]}>
                <Pressable
                  style={[styles.weekEntryActionButton, { backgroundColor: colors.info + '15' }]}
                  onPress={() => {
                    setSelectedEntryForAdjustment(entry);
                    setAdjustmentModalVisible(true);
                  }}
                >
                  <Edit3 size={14} color={colors.info} />
                  <Text style={[styles.weekEntryActionText, { color: colors.info }]}>Request Change</Text>
                </Pressable>
                
                {!entry.employee_approved && entry.status === 'completed' && (
                  <Pressable
                    style={[styles.weekEntryActionButton, { backgroundColor: colors.success + '15' }]}
                    onPress={() => {
                      if (!currentEmployee) return;
                      approveEntryMutation.mutate(
                        { entryId: entry.id, employeeId: currentEmployee.id },
                        {
                          onSuccess: () => {
                            Alert.alert('Approved', 'Time entry approved successfully');
                          },
                          onError: (err) => {
                            Alert.alert('Error', err.message || 'Failed to approve entry');
                          },
                        }
                      );
                    }}
                  >
                    <CheckSquare size={14} color={colors.success} />
                    <Text style={[styles.weekEntryActionText, { color: colors.success }]}>Approve</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderScheduleTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.weekNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable onPress={() => navigateWeek('prev')} style={styles.weekNavButton}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.weekNavText, { color: colors.text }]}>
          {selectedWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' - '}
          {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => navigateWeek('next')} style={styles.weekNavButton}>
          <ChevronRight size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekGrid}>
        {weekDates.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayShifts = weekShifts.filter(s => s.date === dateStr);
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <View
              key={dateStr}
              style={[
                styles.dayCard,
                { backgroundColor: colors.surface, borderColor: isToday ? colors.primary : colors.border },
                isToday && { borderWidth: 2 },
              ]}
            >
              <View style={[styles.dayHeader, isToday && { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.dayName, { color: isToday ? colors.primary : colors.textSecondary }]}>
                  {DAYS_OF_WEEK[index]}
                </Text>
                <Text style={[styles.dayNumber, { color: isToday ? colors.primary : colors.text }]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={styles.dayContent}>
                {dayShifts.length === 0 ? (
                  <Text style={[styles.noShiftText, { color: colors.textTertiary }]}>Off</Text>
                ) : (
                  dayShifts.map(shift => (
                    <View key={shift.id} style={[styles.shiftItem, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.shiftTime, { color: colors.primary }]}>
                        {shift.startTime} - {shift.endTime}
                      </Text>
                      <View style={[
                        styles.shiftStatusDot,
                        { backgroundColor: shift.status === 'confirmed' ? colors.success : colors.warning }
                      ]} />
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}
      </View>

      {openSwapRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Shift Swaps</Text>
          {openSwapRequests.map((swap: { id: string; requesterId: string; requesterName: string; originalShiftId: string; originalShiftDate: string; reason: string; status: string }) => {
            const shift = weekShifts.find(s => s.id === swap.originalShiftId);
            return (
              <Pressable
                key={swap.id}
                style={[styles.swapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <ArrowRightLeft size={20} color={colors.warning} />
                <View style={styles.swapInfo}>
                  <Text style={[styles.swapRequester, { color: colors.text }]}>{swap.requesterName}</Text>
                  <Text style={[styles.swapDetails, { color: colors.textSecondary }]}>
                    {swap.originalShiftDate} • {shift?.startTime} - {shift?.endTime}
                  </Text>
                  <Text style={[styles.swapReason, { color: colors.textTertiary }]}>{swap.reason}</Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.historyHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.historyStats}>
          <Text style={[styles.historyStatsLabel, { color: colors.textSecondary }]}>Total Hours ({historyFilter})</Text>
          <Text style={[styles.historyStatsValue, { color: colors.primary }]}>
            {totalHoursInPeriod.toFixed(1)}h
          </Text>
        </View>
        <View style={styles.historyFilters}>
          {(['week', 'month', 'year', 'all'] as const).map(filter => (
            <Pressable
              key={filter}
              style={[
                styles.historyFilterButton,
                { borderColor: colors.border },
                historyFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setHistoryFilter(filter)}
            >
              <Text style={[
                styles.historyFilterText,
                { color: historyFilter === filter ? '#FFFFFF' : colors.textSecondary }
              ]}>
                {filter === 'week' ? '7D' : filter === 'month' ? '30D' : filter === 'year' ? '1Y' : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Time Entries</Text>
          <Text style={[styles.entryCount, { color: colors.textSecondary }]}>
            {filteredTimeEntries.length} entries
          </Text>
        </View>
        {filteredTimeEntries.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <History size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No time entries for this period</Text>
          </View>
        ) : (
          filteredTimeEntries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.historyEntryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.historyEntryMain}>
                <View style={styles.historyEntryLeft}>
                  <Text style={[styles.historyEntryDate, { color: colors.text }]}>
                    {new Date(entry.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                  <View style={styles.historyEntryTimes}>
                    <View style={styles.historyTimeBlock}>
                      <Text style={[styles.historyTimeLabel, { color: colors.textTertiary }]}>In</Text>
                      <Text style={[styles.historyTimeValue, { color: colors.success }]}>
                        {entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                    </View>
                    <View style={[styles.historyTimeDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.historyTimeBlock}>
                      <Text style={[styles.historyTimeLabel, { color: colors.textTertiary }]}>Out</Text>
                      <Text style={[styles.historyTimeValue, { color: colors.error }]}>
                        {entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                    </View>
                    <View style={[styles.historyTimeDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.historyTimeBlock}>
                      <Text style={[styles.historyTimeLabel, { color: colors.textTertiary }]}>Break</Text>
                      <Text style={[styles.historyTimeValue, { color: colors.warning }]}>
                        {entry.breakMinutes}m
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.historyEntryRight}>
                  <Text style={[styles.historyEntryHours, { color: colors.primary }]}>
                    {entry.totalHours.toFixed(2)}h
                  </Text>
                  <View style={[
                    styles.historyStatusBadge,
                    { 
                      backgroundColor: entry.status === 'approved' ? colors.success + '20' : 
                        entry.status === 'completed' ? colors.info + '20' :
                        entry.status === 'active' ? colors.warning + '20' : colors.textTertiary + '20' 
                    }
                  ]}>
                    <Text style={[
                      styles.historyStatusText,
                      { 
                        color: entry.status === 'approved' ? colors.success : 
                          entry.status === 'completed' ? colors.info :
                          entry.status === 'active' ? colors.warning : colors.textTertiary 
                      }
                    ]}>
                      {entry.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  const renderRequestsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.requestActionButton, { backgroundColor: colors.primary }]}
          onPress={() => setTimeOffModalVisible(true)}
        >
          <Calendar size={20} color="#FFFFFF" />
          <Text style={styles.requestActionText}>Request Time Off</Text>
        </Pressable>
        <Pressable
          style={[styles.requestActionButton, { backgroundColor: colors.warning }]}
          onPress={() => setSwapModalVisible(true)}
        >
          <ArrowRightLeft size={20} color="#FFFFFF" />
          <Text style={styles.requestActionText}>Request Swap</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Time Off Requests</Text>
        {myTimeOffRequests.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={32} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No time off requests yet</Text>
          </View>
        ) : (
          myTimeOffRequests.map(request => (
            <View
              key={request.id}
              style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.requestHeader}>
                <View style={[styles.requestTypeBadge, {
                  backgroundColor: request.type === 'vacation' ? colors.primary + '20' :
                    request.type === 'sick' ? colors.error + '20' :
                      request.type === 'personal' ? colors.purple + '20' : colors.warning + '20'
                }]}>
                  <Text style={[styles.requestTypeText, {
                    color: request.type === 'vacation' ? colors.primary :
                      request.type === 'sick' ? colors.error :
                        request.type === 'personal' ? colors.purple : colors.warning
                  }]}>
                    {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                  </Text>
                </View>
                <View style={[styles.requestStatusBadge, {
                  backgroundColor: request.status === 'approved' ? colors.success + '20' :
                    request.status === 'rejected' ? colors.error + '20' : colors.warning + '20'
                }]}>
                  {request.status === 'approved' && <CheckCircle2 size={14} color={colors.success} />}
                  {request.status === 'rejected' && <XCircle size={14} color={colors.error} />}
                  {request.status === 'pending' && <AlertCircle size={14} color={colors.warning} />}
                  <Text style={[styles.requestStatusText, {
                    color: request.status === 'approved' ? colors.success :
                      request.status === 'rejected' ? colors.error : colors.warning
                  }]}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.requestDates}>
                <CalendarDays size={16} color={colors.textSecondary} />
                <Text style={[styles.requestDateText, { color: colors.text }]}>
                  {new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {request.startDate !== request.endDate && (
                    <> - {new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                  )}
                </Text>
                <Text style={[styles.requestDays, { color: colors.textSecondary }]}>
                  ({request.totalDays} {request.totalDays === 1 ? 'day' : 'days'})
                </Text>
              </View>
              <Text style={[styles.requestReason, { color: colors.textTertiary }]}>{request.reason}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={28} color="#FFFFFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>
            <Text style={[styles.profileRole, { color: colors.textSecondary }]}>
              {currentEmployee?.position || 'Employee'}
            </Text>
            <Text style={[styles.companyName, { color: colors.textTertiary }]}>
              {company?.name || 'Company'}
            </Text>
          </View>
          <View style={styles.profileActions}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: activeTimeEntry ? colors.success : colors.textTertiary }
            ]} />
            <Pressable
              style={[styles.logoutButton, { backgroundColor: colors.error + '15' }]}
              onPress={handleLogout}
            >
              <LogOut size={18} color={colors.error} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.homeButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
          onPress={handleGoHome}
        >
          <Home size={18} color={colors.primary} />
          <Text style={[styles.homeButtonText, { color: colors.primary }]}>Go to Employee Dashboard</Text>
          <ChevronRight size={18} color={colors.primary} />
        </Pressable>

        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['clock', 'schedule', 'history', 'requests'] as PortalTab[]).map(tab => (
            <Pressable
              key={tab}
              style={[styles.tabButton, activeTab === tab && { backgroundColor: colors.primary + '15' }]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'clock' && <Clock size={18} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
              {tab === 'schedule' && <CalendarDays size={18} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
              {tab === 'history' && <History size={18} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
              {tab === 'requests' && <Calendar size={18} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
              <Text style={[
                styles.tabButtonText,
                { color: activeTab === tab ? colors.primary : colors.textSecondary }
              ]}>
                {tab === 'clock' ? 'Clock' : tab === 'schedule' ? 'Schedule' : tab === 'history' ? 'History' : 'Requests'}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'clock' && renderClockTab()}
        {activeTab === 'schedule' && renderScheduleTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'requests' && renderRequestsTab()}
      </ScrollView>

      <TimeOffRequestModal
        visible={timeOffModalVisible}
        onClose={() => setTimeOffModalVisible(false)}
        onSubmit={(type, startDate, endDate, reason) => {
          if (!currentEmployee) return;
          const start = new Date(startDate);
          const end = new Date(endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          createTimeOffMutation.mutate({
            employee_id: currentEmployee.id,
            employee_name: `${currentEmployee.first_name} ${currentEmployee.last_name}`,
            type,
            start_date: startDate,
            end_date: endDate,
            total_days: totalDays,
            reason,
          });
          setTimeOffModalVisible(false);
          Alert.alert('Request Submitted', 'Your time off request has been submitted for approval.');
        }}
        colors={colors}
      />

      <ShiftSwapModal
        visible={swapModalVisible}
        onClose={() => setSwapModalVisible(false)}
        shifts={weekShifts}
        onSubmit={(shiftId, reason) => {
          if (!currentEmployee) return;
          const shift = weekShifts.find(s => s.id === shiftId);
          if (!shift) return;
          
          Alert.alert('Swap Posted', 'Your shift swap request has been posted.');
          setSwapModalVisible(false);
        }}
        colors={colors}
      />

      <TimeAdjustmentModal
        visible={adjustmentModalVisible}
        onClose={() => {
          setAdjustmentModalVisible(false);
          setSelectedEntryForAdjustment(null);
        }}
        entry={selectedEntryForAdjustment}
        employeeId={currentEmployee?.id || ''}
        employeeName={displayName}
        onSubmit={(adjustmentData) => {
          createAdjustmentMutation.mutate(adjustmentData, {
            onSuccess: () => {
              Alert.alert('Request Submitted', 'Your time adjustment request has been submitted for review.');
              setAdjustmentModalVisible(false);
              setSelectedEntryForAdjustment(null);
            },
            onError: (err) => {
              Alert.alert('Error', err.message || 'Failed to submit request');
            },
          });
        }}
        colors={colors}
      />
    </View>
  );
}

interface TimeOffModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (type: TimeOffType, startDate: string, endDate: string, reason: string) => void;
  colors: any;
}

function TimeOffRequestModal({ visible, onClose, onSubmit, colors }: TimeOffModalProps) {
  const [type, setType] = useState<TimeOffType>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const handleSubmit = () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    onSubmit(type, startDate, endDate, reason);
    setType('vacation');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const styles = createModalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Request Time Off</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
          <Pressable
            style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
            <ChevronDown size={20} color={colors.textSecondary} />
          </Pressable>
          {typeDropdownOpen && (
            <View style={[styles.dropdownList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {(['vacation', 'sick', 'personal', 'unpaid'] as TimeOffType[]).map(t => (
                <Pressable
                  key={t}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                  onPress={() => { setType(t); setTypeDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="2026-01-15"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>End Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-01-16"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Reason</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter reason for time off..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />

          <Pressable style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

interface ShiftSwapModalProps {
  visible: boolean;
  onClose: () => void;
  shifts: any[];
  onSubmit: (shiftId: string, reason: string) => void;
  colors: any;
}

interface TimeAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  entry: TimeEntryWithBreaks | null;
  employeeId: string;
  employeeName: string;
  onSubmit: (data: {
    employee_id: string;
    employee_name: string;
    time_entry_id: string;
    request_type: 'modify_entry';
    original_date: string;
    original_clock_in: string;
    original_clock_out: string;
    requested_clock_in: string;
    requested_clock_out: string;
    reason: string;
    employee_notes?: string;
  }) => void;
  colors: any;
}

function TimeAdjustmentModal({ visible, onClose, entry, employeeId, employeeName, onSubmit, colors }: TimeAdjustmentModalProps) {
  const [requestedClockIn, setRequestedClockIn] = useState('');
  const [requestedClockOut, setRequestedClockOut] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (entry) {
      setRequestedClockIn(entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
      setRequestedClockOut(entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    }
  }, [entry]);

  const handleSubmit = () => {
    if (!entry || !reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for the change');
      return;
    }
    
    onSubmit({
      employee_id: employeeId,
      employee_name: employeeName,
      time_entry_id: entry.id,
      request_type: 'modify_entry',
      original_date: entry.date,
      original_clock_in: entry.clock_in || '',
      original_clock_out: entry.clock_out || '',
      requested_clock_in: requestedClockIn,
      requested_clock_out: requestedClockOut,
      reason: reason.trim(),
      employee_notes: notes.trim() || undefined,
    });
    
    setReason('');
    setNotes('');
  };

  const styles = createModalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Request Time Change</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          {entry && (
            <View style={[styles.entryPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.entryPreviewTitle, { color: colors.textSecondary }]}>Entry Date</Text>
              <Text style={[styles.entryPreviewValue, { color: colors.text }]}>
                {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <View style={styles.entryPreviewRow}>
                <View style={styles.entryPreviewItem}>
                  <Text style={[styles.entryPreviewLabel, { color: colors.textTertiary }]}>Current Clock In</Text>
                  <Text style={[styles.entryPreviewCurrent, { color: colors.success }]}>
                    {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </Text>
                </View>
                <View style={styles.entryPreviewItem}>
                  <Text style={[styles.entryPreviewLabel, { color: colors.textTertiary }]}>Current Clock Out</Text>
                  <Text style={[styles.entryPreviewCurrent, { color: colors.error }]}>
                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Requested Clock In (HH:MM)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={requestedClockIn}
            onChangeText={setRequestedClockIn}
            placeholder="08:00"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Requested Clock Out (HH:MM)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={requestedClockOut}
            onChangeText={setRequestedClockOut}
            placeholder="17:00"
            placeholderTextColor={colors.textTertiary}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Reason for Change *</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why you need this time adjustment..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional information..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={2}
          />

          <Pressable style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <FileText size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ShiftSwapModal({ visible, onClose, shifts, onSubmit, colors }: ShiftSwapModalProps) {
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!selectedShift || !reason) {
      Alert.alert('Error', 'Please select a shift and enter a reason');
      return;
    }
    onSubmit(selectedShift, reason);
    setSelectedShift(null);
    setReason('');
  };

  const styles = createModalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Request Shift Swap</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Select Shift to Swap</Text>
          {shifts.length === 0 ? (
            <View style={[styles.emptyShifts, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyShiftsText, { color: colors.textSecondary }]}>
                No upcoming shifts to swap
              </Text>
            </View>
          ) : (
            shifts.map(shift => (
              <Pressable
                key={shift.id}
                style={[
                  styles.shiftOption,
                  { backgroundColor: colors.surface, borderColor: selectedShift === shift.id ? colors.primary : colors.border },
                  selectedShift === shift.id && { borderWidth: 2 },
                ]}
                onPress={() => setSelectedShift(shift.id)}
              >
                <View style={styles.shiftOptionInfo}>
                  <Text style={[styles.shiftOptionDate, { color: colors.text }]}>
                    {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[styles.shiftOptionTime, { color: colors.textSecondary }]}>
                    {shift.startTime} - {shift.endTime}
                  </Text>
                </View>
                {selectedShift === shift.id && (
                  <CheckCircle2 size={20} color={colors.primary} />
                )}
              </Pressable>
            ))
          )}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Reason</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Enter reason for swap request..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />

          <Pressable
            style={[styles.submitButton, { backgroundColor: colors.warning }]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Post Swap Request</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 16,
      gap: 14,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    profileRole: {
      fontSize: 14,
      marginTop: 2,
    },
    companyName: {
      fontSize: 12,
      marginTop: 2,
    },
    profileActions: {
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    logoutButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    clockInBanner: {
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 16,
      gap: 14,
    },
    clockInBannerContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    clockInBannerText: {
      flex: 1,
    },
    clockInBannerTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    clockInBannerSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    clockInBannerActions: {
      flexDirection: 'row' as const,
      gap: 10,
    },
    clockInBannerButton: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 12,
      borderRadius: 10,
      gap: 8,
    },
    clockInBannerButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    clockInBannerButtonSecondary: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      gap: 8,
    },
    clockInBannerButtonTextSecondary: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    homeButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
      gap: 10,
    },
    homeButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      flex: 1,
    },
    tabBar: {
      flexDirection: 'row',
      borderRadius: 12,
      borderWidth: 1,
      padding: 4,
      marginBottom: 16,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    tabContent: {
      gap: 16,
    },
    clockCard: {
      padding: 24,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
    },
    payrollClockBadge: {
      marginBottom: 12,
      backgroundColor: colors.success + '15',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    payrollClockLabel: {
      fontSize: 11,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
    },
    currentTimeLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginBottom: 4,
    },
    currentTime: {
      fontSize: 48,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums'],
    },
    currentDate: {
      fontSize: 14,
      marginTop: 4,
    },
    activeShiftContainer: {
      width: '100%',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    activeShiftInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      marginBottom: 16,
    },
    activeIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    activeShiftText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    timeDetailsGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    timeDetailItem: {
      flex: 1,
      alignItems: 'center',
    },
    timeDetailLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    timeDetailValue: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    timeDetailDivider: {
      width: 1,
      height: 30,
    },
    breakHistorySection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
    },
    breakHistoryTitle: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 8,
      textAlign: 'center' as const,
    },
    breakHistoryList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    breakHistoryItem: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 110,
      alignItems: 'center',
    },
    breakHistoryLabel: {
      fontSize: 10,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
      marginBottom: 2,
    },
    breakHistoryTime: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    breakHistoryDuration: {
      fontSize: 11,
      marginTop: 2,
    },
    clockActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      width: '100%',
    },
    clockButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    clockInButton: {},
    clockOutButton: {},
    breakButton: {},
    clockButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600' as const,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    statsRow: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    statLabel: {
      fontSize: 11,
    },
    statDivider: {
      width: 1,
      marginVertical: 4,
    },
    emptyState: {
      padding: 32,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
    },
    timeEntryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    timeEntryLeft: {},
    timeEntryDate: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    timeEntryTime: {
      fontSize: 12,
      marginTop: 2,
    },
    timeEntryRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    timeEntryHours: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
    approveAllButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    approveAllButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600' as const,
    },
    weekFilterRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      marginBottom: 12,
    },
    weekFilterButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    weekFilterText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    weekFilterDateRange: {
      fontSize: 12,
      marginLeft: 'auto' as const,
    },
    weekEntryCard: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    weekEntryHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    weekEntryDate: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    weekEntryBadges: {
      flexDirection: 'row' as const,
      gap: 6,
    },
    approvedBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      gap: 4,
    },
    approvedBadgeText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    pendingApprovalBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    pendingApprovalText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    weekEntryTimesRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-around' as const,
      marginBottom: 12,
    },
    weekEntryTimeBlock: {
      alignItems: 'center' as const,
      flex: 1,
    },
    weekEntryTimeLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
      marginBottom: 2,
    },
    weekEntryTimeValue: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    weekEntryTimeDivider: {
      width: 1,
      height: 28,
    },
    weekEntryBreaksRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-around' as const,
      paddingTop: 10,
      paddingBottom: 10,
      borderTopWidth: 1,
    },
    weekEntryBreakItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
    },
    breakTypeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    breakTypeLabel: {
      fontSize: 12,
    },
    breakTypeValue: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    weekEntryActions: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      gap: 10,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    weekEntryActionButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 6,
    },
    weekEntryActionText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    weekNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    weekNavButton: {
      padding: 4,
    },
    weekNavText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    weekGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    dayCard: {
      width: '31%',
      borderRadius: 10,
      borderWidth: 1,
      overflow: 'hidden',
      minHeight: 100,
    },
    dayHeader: {
      padding: 8,
      alignItems: 'center',
    },
    dayName: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    dayNumber: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    dayContent: {
      padding: 6,
      flex: 1,
    },
    noShiftText: {
      fontSize: 11,
      textAlign: 'center' as const,
    },
    shiftItem: {
      padding: 6,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    shiftTime: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    shiftStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    swapCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      gap: 12,
    },
    swapInfo: {
      flex: 1,
    },
    swapRequester: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    swapDetails: {
      fontSize: 12,
      marginTop: 2,
    },
    swapReason: {
      fontSize: 11,
      marginTop: 4,
      fontStyle: 'italic' as const,
    },
    requestActions: {
      flexDirection: 'row',
      gap: 12,
    },
    requestActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    requestActionText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    requestCard: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      gap: 10,
    },
    requestHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    requestTypeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    requestTypeText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    requestStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    requestStatusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    requestDates: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    requestDateText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    requestDays: {
      fontSize: 12,
    },
    requestReason: {
      fontSize: 13,
    },
    benefitCard: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    benefitHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      marginBottom: 16,
    },
    benefitIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    benefitTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    benefitStats: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      marginBottom: 12,
    },
    benefitStatItem: {
      alignItems: 'center' as const,
      flex: 1,
    },
    benefitStatLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
      marginBottom: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    benefitStatValue: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    benefitStatValueLarge: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    benefitProgressBg: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden' as const,
    },
    benefitProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    historyHeader: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      gap: 12,
    },
    historyStats: {
      alignItems: 'center' as const,
    },
    historyStatsLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    historyStatsValue: {
      fontSize: 32,
      fontWeight: '700' as const,
    },
    historyFilters: {
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      gap: 8,
    },
    historyFilterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    historyFilterText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    sectionHeaderRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    entryCount: {
      fontSize: 13,
    },
    historyEntryCard: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    historyEntryMain: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'flex-start' as const,
    },
    historyEntryLeft: {
      flex: 1,
    },
    historyEntryDate: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    historyEntryTimes: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    historyTimeBlock: {
      alignItems: 'center' as const,
    },
    historyTimeLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    historyTimeValue: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    historyTimeDivider: {
      width: 1,
      height: 24,
    },
    historyEntryRight: {
      alignItems: 'flex-end' as const,
      gap: 6,
    },
    historyEntryHours: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    historyStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    historyStatusText: {
      fontSize: 10,
      fontWeight: '600' as const,
      textTransform: 'uppercase' as const,
    },
  });

const createModalStyles = (colors: any) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      marginBottom: 8,
      marginTop: 12,
    },
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    dropdownText: {
      fontSize: 15,
    },
    dropdownList: {
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      overflow: 'hidden',
    },
    dropdownItem: {
      padding: 14,
      borderBottomWidth: 1,
    },
    dropdownItemText: {
      fontSize: 15,
    },
    input: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      fontSize: 15,
    },
    textArea: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      fontSize: 15,
      minHeight: 100,
      textAlignVertical: 'top' as const,
    },
    submitButton: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 40,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    emptyShifts: {
      padding: 24,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    emptyShiftsText: {
      fontSize: 14,
    },
    shiftOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
    },
    shiftOptionInfo: {},
    shiftOptionDate: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    shiftOptionTime: {
      fontSize: 12,
      marginTop: 2,
    },
    entryPreview: {
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    entryPreviewTitle: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginBottom: 4,
    },
    entryPreviewValue: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 12,
    },
    entryPreviewRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
    },
    entryPreviewItem: {
      flex: 1,
    },
    entryPreviewLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
      marginBottom: 2,
    },
    entryPreviewCurrent: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
  });
