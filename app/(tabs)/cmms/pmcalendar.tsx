import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Cog,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  usePMSchedulesQuery,
  usePMWorkOrdersQuery,
  type ExtendedPMSchedule,
  type PMWorkOrder,
  type PMPriority,
  type PMFrequency,
} from '@/hooks/useSupabasePMSchedules';
import * as Haptics from 'expo-haptics';

const FREQUENCY_LABELS: Record<PMFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

const PRIORITY_COLORS: Record<PMPriority, string> = {
  low: '#10B981',
  medium: '#3B82F6',
  high: '#F59E0B',
  critical: '#EF4444',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  pms: ExtendedPMSchedule[];
  workOrders: PMWorkOrder[];
}

export default function PMCalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const { data: pmSchedules = [], refetch: refetchSchedules } = usePMSchedulesQuery({ active: true });
  const { data: pmWorkOrders = [], refetch: refetchWorkOrders } = usePMWorkOrdersQuery();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchSchedules(), refetchWorkOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSchedules, refetchWorkOrders]);

  const calendarDays = useMemo(() => {
    const getPMsForDate = (date: Date): ExtendedPMSchedule[] => {
      const dateStr = date.toISOString().split('T')[0];
      return pmSchedules.filter(pm => pm.next_due === dateStr && pm.active);
    };

    const getWorkOrdersForDate = (date: Date): PMWorkOrder[] => {
      const dateStr = date.toISOString().split('T')[0];
      return pmWorkOrders.filter(wo => wo.scheduled_date === dateStr);
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        pms: getPMsForDate(date),
        workOrders: getWorkOrdersForDate(date),
      });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateOnly = new Date(year, month, day);
      dateOnly.setHours(0, 0, 0, 0);
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: dateOnly.getTime() === today.getTime(),
        pms: getPMsForDate(date),
        workOrders: getWorkOrdersForDate(date),
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        pms: getPMsForDate(date),
        workOrders: getWorkOrdersForDate(date),
      });
    }
    
    return days;
  }, [currentDate, pmSchedules, pmWorkOrders]);

  const selectedDayData = useMemo(() => {
    if (!selectedDate) return null;
    return calendarDays.find(d => 
      d.date.toDateString() === selectedDate.toDateString()
    );
  }, [selectedDate, calendarDays]);

  const goToPreviousMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }, [currentDate]);

  const goToNextMonth = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }, [currentDate]);

  const goToToday = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  }, []);

  const handleDayPress = useCallback((day: CalendarDay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(day.date);
  }, []);

  const handlePMPress = useCallback((pmId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/cmms/pmtemplates?id=${pmId}&mode=edit`);
  }, [router]);

  const renderCalendarDay = useCallback((day: CalendarDay, index: number) => {
    const hasItems = day.pms.length > 0 || day.workOrders.length > 0;
    const isSelected = selectedDate?.toDateString() === day.date.toDateString();
    const hasOverdue = day.workOrders.some(wo => {
      const isOverdue = wo.scheduled_date < new Date().toISOString().split('T')[0] && wo.status !== 'completed';
      return isOverdue;
    });
    const hasCritical = day.pms.some(pm => (pm.priority as PMPriority) === 'critical') || 
                        day.workOrders.some(wo => (wo.priority as PMPriority) === 'critical');
    
    return (
      <Pressable
        key={index}
        style={[
          styles.dayCell,
          { 
            backgroundColor: isSelected 
              ? colors.primary 
              : day.isToday 
                ? colors.primary + '20' 
                : 'transparent',
            borderColor: day.isToday ? colors.primary : 'transparent',
          },
        ]}
        onPress={() => handleDayPress(day)}
      >
        <Text style={[
          styles.dayNumber,
          { 
            color: isSelected 
              ? '#FFFFFF' 
              : day.isCurrentMonth 
                ? colors.text 
                : colors.textSecondary + '60',
          },
        ]}>
          {day.date.getDate()}
        </Text>
        {hasItems && (
          <View style={styles.dayIndicators}>
            {hasOverdue && (
              <View style={[styles.indicator, { backgroundColor: '#EF4444' }]} />
            )}
            {hasCritical && !hasOverdue && (
              <View style={[styles.indicator, { backgroundColor: '#F59E0B' }]} />
            )}
            {!hasOverdue && !hasCritical && hasItems && (
              <View style={[styles.indicator, { backgroundColor: '#10B981' }]} />
            )}
          </View>
        )}
      </Pressable>
    );
  }, [colors, selectedDate, handleDayPress]);

  const renderPMItem = useCallback((pm: ExtendedPMSchedule) => (
    <Pressable
      key={pm.id}
      style={({ pressed }) => [
        styles.pmItem,
        { 
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: PRIORITY_COLORS[pm.priority as PMPriority] || '#3B82F6',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={() => handlePMPress(pm.id)}
    >
      <View style={styles.pmItemHeader}>
        <Calendar size={16} color={PRIORITY_COLORS[pm.priority as PMPriority] || '#3B82F6'} />
        <Text style={[styles.pmItemTitle, { color: colors.text }]} numberOfLines={1}>
          {pm.name}
        </Text>
      </View>
      <View style={styles.pmItemDetails}>
        <Cog size={12} color={colors.textSecondary} />
        <Text style={[styles.pmItemText, { color: colors.textSecondary }]} numberOfLines={1}>
          {pm.equipment_name}
        </Text>
      </View>
      <View style={styles.pmItemDetails}>
        <Clock size={12} color={colors.textSecondary} />
        <Text style={[styles.pmItemText, { color: colors.textSecondary }]}>
          {FREQUENCY_LABELS[pm.frequency as PMFrequency] || pm.frequency} • Est. {pm.estimated_hours || 1}h
        </Text>
      </View>
    </Pressable>
  ), [colors, handlePMPress]);

  const renderWorkOrderItem = useCallback((wo: PMWorkOrder) => {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = wo.scheduled_date < today && wo.status !== 'completed';
    const isCompleted = wo.status === 'completed';
    
    return (
      <Pressable
        key={wo.id}
        style={({ pressed }) => [
          styles.pmItem,
          { 
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: isOverdue ? '#EF4444' : isCompleted ? '#10B981' : (PRIORITY_COLORS[wo.priority as PMPriority] || '#3B82F6'),
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        onPress={() => handlePMPress(wo.pm_schedule_id)}
      >
        <View style={styles.pmItemHeader}>
          {isOverdue ? (
            <AlertTriangle size={16} color="#EF4444" />
          ) : isCompleted ? (
            <CheckCircle size={16} color="#10B981" />
          ) : (
            <Clock size={16} color={PRIORITY_COLORS[wo.priority as PMPriority] || '#3B82F6'} />
          )}
          <Text style={[styles.pmItemTitle, { color: colors.text }]} numberOfLines={1}>
            PM Work Order
          </Text>
        </View>
        <View style={styles.pmItemDetails}>
          <Cog size={12} color={colors.textSecondary} />
          <Text style={[styles.pmItemText, { color: colors.textSecondary }]} numberOfLines={1}>
            {wo.notes || 'No description'}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isOverdue ? '#EF444415' : isCompleted ? '#10B98115' : '#3B82F615' },
        ]}>
          <Text style={[
            styles.statusText,
            { color: isOverdue ? '#EF4444' : isCompleted ? '#10B981' : '#3B82F6' },
          ]}>
            {wo.status.charAt(0).toUpperCase() + wo.status.slice(1).replace('_', ' ')}
          </Text>
        </View>
      </Pressable>
    );
  }, [colors, handlePMPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.calendarHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable style={styles.navButton} onPress={goToPreviousMonth}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={goToToday}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={goToNextMonth}>
          <ChevronRight size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.weekHeader, { backgroundColor: colors.surface }]}>
        {DAYS_OF_WEEK.map(day => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.calendarGrid, { backgroundColor: colors.surface }]}>
        {calendarDays.map((day, index) => renderCalendarDay(day, index))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Overdue</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Critical</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Scheduled</Text>
        </View>
      </View>

      <ScrollView
        style={styles.detailsContainer}
        contentContainerStyle={styles.detailsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {selectedDayData ? (
          <>
            <Text style={[styles.selectedDateTitle, { color: colors.text }]}>
              {selectedDate?.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            
            {selectedDayData.pms.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  PM Schedules Due ({selectedDayData.pms.length})
                </Text>
                {selectedDayData.pms.map(renderPMItem)}
              </View>
            )}

            {selectedDayData.workOrders.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Work Orders ({selectedDayData.workOrders.length})
                </Text>
                {selectedDayData.workOrders.map(renderWorkOrderItem)}
              </View>
            )}

            {selectedDayData.pms.length === 0 && selectedDayData.workOrders.length === 0 && (
              <View style={styles.emptyState}>
                <Calendar size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No PM activities scheduled for this day
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Select a day to view PM activities
            </Text>
          </View>
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center' as const,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 8,
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  dayIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    padding: 16,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  pmItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  pmItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pmItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  pmItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  pmItemText: {
    fontSize: 12,
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
