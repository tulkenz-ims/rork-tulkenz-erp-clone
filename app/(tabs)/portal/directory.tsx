import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Filter,
  AlertCircle,
} from 'lucide-react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useEmployees, useFacilities } from '@/hooks/useSupabaseEmployees';

export default function DirectoryScreen() {
  const { colors } = useTheme();
  const { isEmployee } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { 
    data: employees = [], 
    isLoading, 
    error,
    refetch 
  } = useEmployees({ status: 'active' });
  
  const { data: facilities = [] } = useFacilities();

  const activeEmployees = useMemo(() => employees, [employees]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    activeEmployees.forEach(e => {
      if (e.department_code) {
        depts.add(e.department_code);
      } else if (e.position) {
        depts.add(e.position);
      }
    });
    return Array.from(depts).sort();
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    let filtered = activeEmployees;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.department_code?.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(e => 
        e.department_code === selectedDepartment || e.position === selectedDepartment
      );
    }

    return filtered.sort((a, b) => 
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
  }, [activeEmployees, searchQuery, selectedDepartment]);

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, typeof filteredEmployees> = {};
    filteredEmployees.forEach(emp => {
      const dept = emp.department_code || emp.position || 'Other';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(emp);
    });
    return groups;
  }, [filteredEmployees]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getFacilityName = (facilityId?: string | null) => {
    if (!facilityId) return '';
    return facilities.find(f => f.id === facilityId)?.name || '';
  };

  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ title: 'Company Directory' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading directory...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Stack.Screen options={{ title: 'Company Directory' }} />
        <AlertCircle size={48} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to Load Directory</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error.message}</Text>
        <Pressable style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Company Directory' }} />

      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search employees..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {departments.length > 0 && (
          <Pressable
            style={[
              styles.filterButton,
              { backgroundColor: selectedDepartment ? colors.primary : colors.background, borderColor: colors.border },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} color={selectedDepartment ? '#FFFFFF' : colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {showFilters && departments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <Pressable
            style={[
              styles.filterChip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !selectedDepartment && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedDepartment(null)}
          >
            <Text style={[
              styles.filterChipText,
              { color: !selectedDepartment ? '#FFFFFF' : colors.text }
            ]}>
              All
            </Text>
          </Pressable>
          {departments.map(dept => (
            <Pressable
              key={dept}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedDepartment === dept && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedDepartment(dept === selectedDepartment ? null : dept)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedDepartment === dept ? '#FFFFFF' : colors.text }
              ]} numberOfLines={1}>
                {dept}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{activeEmployees.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Employees</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Building2 size={20} color={colors.purple} />
            <Text style={[styles.statValue, { color: colors.text }]}>{departments.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Departments</Text>
          </View>
        </View>

        {activeEmployees.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Users size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Employees</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No employees have been added to the directory yet.
            </Text>
          </View>
        ) : Object.keys(groupedEmployees).length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No employees match your search criteria.
            </Text>
          </View>
        ) : (
          Object.entries(groupedEmployees).map(([department, emps]) => (
            <View key={department} style={styles.departmentSection}>
              <View style={styles.departmentHeader}>
                <Building2 size={16} color={colors.primary} />
                <Text style={[styles.departmentTitle, { color: colors.text }]}>{department}</Text>
                <Text style={[styles.departmentCount, { color: colors.textSecondary }]}>
                  {emps.length} {emps.length === 1 ? 'person' : 'people'}
                </Text>
              </View>

              <View style={styles.employeeList}>
                {emps.map((employee) => (
                  <View
                    key={employee.id}
                    style={[styles.employeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {employee.first_name[0]}{employee.last_name[0]}
                      </Text>
                    </View>
                    <View style={styles.employeeInfo}>
                      <Text style={[styles.employeeName, { color: colors.text }]}>
                        {employee.first_name} {employee.last_name}
                      </Text>
                      <View style={styles.employeeDetails}>
                        <Briefcase size={12} color={colors.textTertiary} />
                        <Text style={[styles.employeePosition, { color: colors.textSecondary }]}>
                          {employee.position}
                        </Text>
                      </View>
                      {!isEmployee && (employee.profile as any)?.phone && (
                        <View style={styles.employeeDetails}>
                          <Phone size={12} color={colors.textTertiary} />
                          <Text style={[styles.employeeContact, { color: colors.textTertiary }]}>
                            {(employee.profile as any).phone}
                          </Text>
                        </View>
                      )}
                      {!isEmployee && employee.email && (
                        <View style={styles.employeeDetails}>
                          <Mail size={12} color={colors.textTertiary} />
                          <Text style={[styles.employeeContact, { color: colors.textTertiary }]}>
                            {employee.email}
                          </Text>
                        </View>
                      )}
                      {!isEmployee && employee.facility_id && (
                        <View style={styles.employeeDetails}>
                          <Building2 size={12} color={colors.textTertiary} />
                          <Text style={[styles.employeeContact, { color: colors.textTertiary }]}>
                            {getFacilityName(employee.facility_id)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
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
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 15,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center' as const,
    },
    retryButton: {
      marginTop: 20,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
      fontSize: 15,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      marginBottom: 8,
      paddingLeft: 14,
      paddingRight: 6,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    searchInputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 6,
    },
    filterButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      maxWidth: 140,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    scrollContent: {
      padding: 16,
      paddingTop: 8,
      paddingBottom: 100,
    },
    statsRow: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 20,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    statLabel: {
      fontSize: 12,
    },
    statDivider: {
      width: 1,
      marginVertical: 4,
    },
    emptyState: {
      padding: 48,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center' as const,
    },
    departmentSection: {
      marginBottom: 24,
    },
    departmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    departmentTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      flex: 1,
    },
    departmentCount: {
      fontSize: 13,
    },
    employeeList: {
      gap: 10,
    },
    employeeCard: {
      flexDirection: 'row',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      gap: 14,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    employeeInfo: {
      flex: 1,
      gap: 4,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    employeeDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    employeePosition: {
      fontSize: 13,
    },
    employeeContact: {
      fontSize: 12,
    },
  });
