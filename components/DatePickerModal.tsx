import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  selectedDate?: string;
  minDate?: string;
  maxDate?: string;
  title?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Format a local Date to YYYY-MM-DD without UTC conversion */
function toLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse a YYYY-MM-DD string as local midnight (not UTC) */
function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  selectedDate,
  minDate,
  maxDate,
  title = 'Select Date',
}: DatePickerModalProps) {
  const { colors } = useTheme();
  
  const initialDate = selectedDate ? parseLocalDate(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const minDateObj = useMemo(() => minDate ? parseLocalDate(minDate) : null, [minDate]);
  const maxDateObj = useMemo(() => maxDate ? parseLocalDate(maxDate) : null, [maxDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (number | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    
    const remainingSlots = 42 - days.length;
    for (let i = 0; i < remainingSlots; i++) {
      days.push(null);
    }

    return days;
  }, [viewYear, viewMonth]);

  const isDateDisabled = useCallback((day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    
    if (minDateObj) {
      const min = new Date(minDateObj);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    
    if (maxDateObj) {
      const max = new Date(maxDateObj);
      max.setHours(0, 0, 0, 0);
      if (date > max) return true;
    }
    
    return false;
  }, [viewYear, viewMonth, minDateObj, maxDateObj]);

  const isDateSelected = useCallback((day: number) => {
    if (!selectedDate) return false;
    const selected = parseLocalDate(selectedDate);
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  }, [selectedDate, viewYear, viewMonth]);

  const isToday = useCallback((day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  }, [viewYear, viewMonth]);

  const handlePrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }, [viewMonth, viewYear]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }, [viewMonth, viewYear]);

  const handleSelectDate = useCallback((day: number) => {
    if (isDateDisabled(day)) return;
    
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${viewYear}-${mm}-${dd}`;
    onSelect(formatted);
    onClose();
  }, [viewYear, viewMonth, isDateDisabled, onSelect, onClose]);

  const handleSelectYear = useCallback((year: number) => {
    setViewYear(year);
    setShowYearPicker(false);
  }, []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearList: number[] = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      yearList.push(i);
    }
    return yearList;
  }, []);

  const quickSelectOptions = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Next Week', date: nextWeek },
      { label: 'Next Month', date: nextMonth },
    ].filter(opt => {
      const d = opt.date;
      d.setHours(0, 0, 0, 0);
      if (minDateObj && d < minDateObj) return false;
      if (maxDateObj && d > maxDateObj) return false;
      return true;
    });
  }, [minDateObj, maxDateObj]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Calendar size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {quickSelectOptions.length > 0 && (
            <View style={styles.quickSelectContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {quickSelectOptions.map((opt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.quickSelectButton, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => {
                      const formatted = toLocalDateString(opt.date);
                      onSelect(formatted);
                      onClose();
                    }}
                  >
                    <Text style={[styles.quickSelectText, { color: colors.primary }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.monthYearButton}
              onPress={() => setShowYearPicker(!showYearPicker)}
            >
              <Text style={[styles.monthYearText, { color: colors.text }]}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <ChevronRight size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {showYearPicker ? (
            <ScrollView style={styles.yearPicker} showsVerticalScrollIndicator={false}>
              <View style={styles.yearGrid}>
                {years.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearItem,
                      { backgroundColor: colors.background },
                      viewYear === year && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handleSelectYear(year)}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        { color: viewYear === year ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={styles.daysHeader}>
                {DAYS_OF_WEEK.map(day => (
                  <View key={day} style={styles.dayHeaderCell}>
                    <Text style={[styles.dayHeaderText, { color: colors.textSecondary }]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }

                  const disabled = isDateDisabled(day);
                  const selected = isDateSelected(day);
                  const today = isToday(day);

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayCell,
                        today && !selected && [styles.todayCell, { borderColor: colors.primary }],
                        selected && [styles.selectedCell, { backgroundColor: colors.primary }],
                        disabled && styles.disabledCell,
                      ]}
                      onPress={() => handleSelectDate(day)}
                      disabled={disabled}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: colors.text },
                          today && !selected && { color: colors.primary },
                          selected && styles.selectedDayText,
                          disabled && { color: colors.textSecondary + '50' },
                        ]}
                      >
                        {day}
                      </Text>
                      {selected && (
                        <View style={styles.selectedIndicator}>
                          <Check size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {selectedDate && (
            <View style={[styles.selectedDateBar, { backgroundColor: colors.background }]}>
              <Text style={[styles.selectedDateLabel, { color: colors.textSecondary }]}>
                Selected:
              </Text>
              <Text style={[styles.selectedDateValue, { color: colors.text }]}>
                {parseLocalDate(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  quickSelectContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickSelectButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  monthYearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  monthYearText: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  yearPicker: {
    maxHeight: 240,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  yearItem: {
    width: 70,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  yearText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  daysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayCell: {
    borderWidth: 2,
    borderRadius: 20,
  },
  selectedCell: {
    borderRadius: 20,
  },
  disabledCell: {
    opacity: 0.4,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 4,
  },
  selectedDateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  selectedDateLabel: {
    fontSize: 13,
  },
  selectedDateValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
