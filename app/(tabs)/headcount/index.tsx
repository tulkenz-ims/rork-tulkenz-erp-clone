import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  Platform,
  Animated,
  Vibration,
} from 'react-native';
import {
  Search,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  Coffee,
  Clock,
  MapPin,
  QrCode,
  Shield,
  ChevronRight,
  X,
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  Square,
  History,
  Radio,
  Navigation,
  Smartphone,
  Scan,
  CircleDot,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  type EmployeePresence,
} from '@/hooks/useSupabaseHeadcount';
import {
  MOCK_EMERGENCY_ROLLS,
  MOCK_GEOFENCE_SETTINGS,
  MOCK_FACILITY_LOCATIONS,
  type EmergencyRoll,
  getPresenceStatusColor,
  getPresenceStatusLabel,
  getEmergencyTypeLabel,
  getEmergencyTypeColor,
  getAbsenceReasonLabel,
  getAbsenceReasonColor,
} from '@/constants/headcountConstants';
import {
  MOCK_EMERGENCY_EMPLOYEES,
  type EmergencyEmployee,
} from '@/mocks/emergencyEmployees';
import { useRouter } from 'expo-router';

type ViewMode = 'realtime' | 'departments' | 'emergency' | 'history' | 'clockin';

const convertToPresenceFormat = (emp: EmergencyEmployee): EmployeePresence => {
  const statusOptions: ('clocked_in' | 'on_break' | 'clocked_out')[] = ['clocked_in', 'on_break', 'clocked_out'];
  const randomStatus = statusOptions[Math.floor(Math.random() * 3)];
  const isOnsite = randomStatus === 'clocked_in' || randomStatus === 'on_break';
  
  return {
    employeeId: emp.id,
    employeeCode: emp.employeeCode,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    departmentCode: emp.department,
    departmentName: emp.department,
    facilityId: 'fac-001',
    employeeType: emp.isKioskUser ? 'hourly' : 'salaried',
    position: emp.position,
    managerId: null,
    managerName: null,
    presenceStatus: randomStatus,
    lastClockIn: isOnsite ? new Date(Date.now() - Math.random() * 3600000).toISOString() : null,
    lastClockOut: null,
    lastBreakStart: randomStatus === 'on_break' ? new Date().toISOString() : null,
    lastBreakEnd: null,
    currentShiftStart: '07:00',
    currentShiftEnd: '15:30',
    hoursToday: Math.random() * 6 + 2,
    isOnsite,
    accountabilityStatus: isOnsite ? 'accounted' : 'unaccounted',
    absenceReason: null,
  };
};

export default function HeadcountScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('realtime');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePresence | null>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<EmergencyRoll | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyPulse] = useState(new Animated.Value(1));

  const mockEmployeePresence = useMemo(() => {
    return MOCK_EMERGENCY_EMPLOYEES.map(convertToPresenceFormat);
  }, []);

  const mockDepartmentHeadcount = useMemo(() => {
    const deptMap = new Map<string, { employees: typeof mockEmployeePresence; }>(); 
    mockEmployeePresence.forEach(emp => {
      const existing = deptMap.get(emp.departmentName) || { employees: [] };
      existing.employees.push(emp);
      deptMap.set(emp.departmentName, existing);
    });

    return Array.from(deptMap.entries()).map(([deptName, data]) => {
      const clockedIn = data.employees.filter(e => e.presenceStatus === 'clocked_in').length;
      const onBreak = data.employees.filter(e => e.presenceStatus === 'on_break').length;
      const clockedOut = data.employees.filter(e => e.presenceStatus === 'clocked_out').length;
      return {
        departmentCode: deptName,
        departmentName: deptName,
        managerId: null,
        managerName: 'Team Lead',
        totalEmployees: data.employees.length,
        clockedIn,
        onBreak,
        clockedOut,
        notArrived: 0,
        absentKnown: 0,
        accountedFor: clockedIn + onBreak + clockedOut,
        unaccounted: 0,
        complianceRate: 100,
      };
    });
  }, [mockEmployeePresence]);

  const mockStats = useMemo(() => {
    const onsite = mockEmployeePresence.filter(e => e.isOnsite).length;
    const clockedIn = mockEmployeePresence.filter(e => e.presenceStatus === 'clocked_in').length;
    const onBreak = mockEmployeePresence.filter(e => e.presenceStatus === 'on_break').length;
    const clockedOut = mockEmployeePresence.filter(e => e.presenceStatus === 'clocked_out').length;
    return { onsite, clockedIn, onBreak, expected: 0, clockedOut, absentKnown: 0 };
  }, [mockEmployeePresence]);

  const employeePresence = selectedDepartment 
    ? mockEmployeePresence.filter(e => e.departmentCode === selectedDepartment)
    : mockEmployeePresence;
  const departmentHeadcount = mockDepartmentHeadcount;
  const presenceStats = mockStats;

  const refetchStats = useCallback(() => Promise.resolve(), []);
  const refetchPresence = useCallback(() => Promise.resolve(), []);
  const refetchDepartments = useCallback(() => Promise.resolve(), []);

  useEffect(() => {
    if (activeEmergency) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(emergencyPulse, {
            toValue: 1.05,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(emergencyPulse, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [activeEmergency, emergencyPulse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchPresence(),
        refetchDepartments(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchStats, refetchPresence, refetchDepartments]);

  const filteredEmployees = useMemo(() => {
    return employeePresence.filter((emp) => {
      const matchesSearch =
        searchQuery === '' ||
        emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.departmentName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [searchQuery, employeePresence]);

  const stats = useMemo(() => {
    return presenceStats || {
      onsite: 0,
      clockedIn: 0,
      onBreak: 0,
      expected: 0,
      clockedOut: 0,
      absentKnown: 0,
    };
  }, [presenceStats]);

  const getOriginalEmployee = (employeeId: string): EmergencyEmployee | undefined => {
    return MOCK_EMERGENCY_EMPLOYEES.find(e => e.id === employeeId);
  };

  const handleStartEmergency = (type: EmergencyRoll['type']) => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([100, 200, 100, 200, 100]);
    }
    
    const newEmergency: EmergencyRoll = {
      id: `roll-${Date.now()}`,
      facilityId: 'fac-001',
      facilityName: 'Main Manufacturing Plant',
      initiatedBy: 'current-user',
      initiatedByName: 'Current User',
      type,
      status: 'active',
      startTime: new Date().toISOString(),
      totalOnsite: stats.onsite,
      accountedFor: 0,
      unaccounted: stats.onsite,
      evacuated: 0,
      departments: departmentHeadcount.map((dept) => ({
        departmentCode: dept.departmentCode,
        departmentName: dept.departmentName,
        managerName: dept.managerName,
        total: dept.clockedIn + dept.onBreak,
        accounted: 0,
        unaccounted: dept.clockedIn + dept.onBreak,
        absentKnown: dept.absentKnown,
        evacuated: 0,
      })),
    };
    
    setActiveEmergency(newEmergency);
    setShowEmergencyModal(false);
    setViewMode('emergency');
  };

  const handleEndEmergency = () => {
    Alert.alert(
      'End Emergency Roll Call',
      'Are you sure you want to end this emergency roll call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            setActiveEmergency(null);
            setViewMode('realtime');
          },
        },
      ]
    );
  };

  const handleMarkAccountable = (employeeId: string) => {
    if (!activeEmergency) return;
    
    if (Platform.OS !== 'web') {
      Vibration.vibrate(50);
    }
    
    setActiveEmergency((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        accountedFor: prev.accountedFor + 1,
        unaccounted: prev.unaccounted - 1,
        departments: prev.departments.map((dept) => {
          const emp = employeePresence.find((e) => e.employeeId === employeeId);
          if (emp && emp.departmentCode === dept.departmentCode) {
            return {
              ...dept,
              accounted: dept.accounted + 1,
              unaccounted: dept.unaccounted - 1,
            };
          }
          return dept;
        }),
      };
    });
  };

  const renderViewTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {[
        { key: 'realtime', label: 'Real-Time', icon: Radio },
        { key: 'departments', label: 'Departments', icon: Building2 },
        { key: 'emergency', label: 'Emergency', icon: Shield, alert: !!activeEmergency },
        { key: 'clockin', label: 'Clock In', icon: QrCode },
        { key: 'history', label: 'History', icon: History },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            { 
              backgroundColor: viewMode === tab.key ? colors.primary : colors.surface,
              borderWidth: tab.alert ? 2 : 0,
              borderColor: tab.alert ? '#EF4444' : 'transparent',
            },
          ]}
          onPress={() => setViewMode(tab.key as ViewMode)}
        >
          <tab.icon
            size={18}
            color={viewMode === tab.key ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: viewMode === tab.key ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {tab.label}
          </Text>
          {tab.alert && (
            <View style={styles.alertDot} />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderRealtime = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity
        style={styles.emergencyProtocolButton}
        onPress={() => router.push('/headcount/emergencyprotocol')}
      >
        <View style={styles.emergencyProtocolLeft}>
          <View style={styles.emergencyProtocolIcon}>
            <AlertTriangle size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.emergencyProtocolTitle}>EMERGENCY INITIATION</Text>
            <Text style={styles.emergencyProtocolSubtitle}>Fire evacuation with sector roll calls</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {activeEmergency && (
        <Animated.View
          style={[
            styles.emergencyBanner,
            { transform: [{ scale: emergencyPulse }] },
          ]}
        >
          <View style={styles.emergencyBannerContent}>
            <AlertTriangle size={24} color="#FFFFFF" />
            <View style={styles.emergencyBannerText}>
              <Text style={styles.emergencyBannerTitle}>
                EMERGENCY ACTIVE
              </Text>
              <Text style={styles.emergencyBannerSubtitle}>
                {getEmergencyTypeLabel(activeEmergency.type)} - {activeEmergency.accountedFor}/{activeEmergency.totalOnsite} accounted
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.emergencyBannerButton}
            onPress={() => setViewMode('emergency')}
          >
            <Text style={styles.emergencyBannerButtonText}>View</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardLarge, { backgroundColor: '#10B98115' }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#10B98130' }]}>
            <UserCheck size={28} color="#10B981" />
          </View>
          <Text style={[styles.statValueLarge, { color: '#10B981' }]}>{stats.onsite}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>On Site</Text>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCardSmall, { backgroundColor: colors.surface }]}>
            <Clock size={20} color="#3B82F6" />
            <Text style={[styles.statValueSmall, { color: colors.text }]}>{stats.clockedIn}</Text>
            <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>Working</Text>
          </View>

          <View style={[styles.statCardSmall, { backgroundColor: colors.surface }]}>
            <Coffee size={20} color="#F59E0B" />
            <Text style={[styles.statValueSmall, { color: colors.text }]}>{stats.onBreak}</Text>
            <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>On Break</Text>
          </View>

          <View style={[styles.statCardSmall, { backgroundColor: colors.surface }]}>
            <UserX size={20} color="#6B7280" />
            <Text style={[styles.statValueSmall, { color: colors.text }]}>{stats.expected}</Text>
            <Text style={[styles.statLabelSmall, { color: colors.textSecondary }]}>Expected</Text>
          </View>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterChips}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            { backgroundColor: !selectedDepartment ? colors.primary : colors.surface },
          ]}
          onPress={() => setSelectedDepartment(null)}
        >
          <Text
            style={[
              styles.filterChipText,
              { color: !selectedDepartment ? '#FFFFFF' : colors.text },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {departmentHeadcount.map((dept) => (
          <TouchableOpacity
            key={dept.departmentCode}
            style={[
              styles.filterChip,
              { backgroundColor: selectedDepartment === dept.departmentCode ? colors.primary : colors.surface },
            ]}
            onPress={() => setSelectedDepartment(dept.departmentCode)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedDepartment === dept.departmentCode ? '#FFFFFF' : colors.text },
              ]}
            >
              {dept.departmentName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Employee Presence ({filteredEmployees.length})
          </Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>On Site</Text>
          </View>
        </View>

        {filteredEmployees.map((employee) => (
          <TouchableOpacity
            key={employee.employeeId}
            style={styles.employeeRow}
            onPress={() => setSelectedEmployee(employee)}
          >
            <View style={styles.employeeInfo}>
              <View
                style={[
                  styles.presenceIndicator,
                  { backgroundColor: getPresenceStatusColor(employee.presenceStatus) },
                ]}
              />
              <View style={styles.employeeDetails}>
                <View style={styles.employeeNameRow}>
                  <Text style={[styles.employeeName, { color: colors.text }]}>
                    {employee.employeeName}
                  </Text>
                  {getOriginalEmployee(employee.employeeId)?.isKioskUser && (
                    <View style={[styles.kioskBadge, { backgroundColor: '#3B82F6' }]}>
                      <Text style={styles.kioskBadgeText}>KIOSK</Text>
                    </View>
                  )}
                  {employee.employeeType === 'salaried' && (
                    <View style={[styles.salaryBadge, { backgroundColor: '#8B5CF620' }]}>
                      <Text style={[styles.salaryBadgeText, { color: '#8B5CF6' }]}>S</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.employeeCode, { color: colors.textSecondary }]}>
                  {employee.employeeCode} • {employee.departmentName}
                </Text>
              </View>
            </View>
            <View style={styles.employeeRight}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getPresenceStatusColor(employee.presenceStatus) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getPresenceStatusColor(employee.presenceStatus) },
                  ]}
                >
                  {getPresenceStatusLabel(employee.presenceStatus)}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderDepartments = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.geofenceStatus, { backgroundColor: colors.surface }]}>
        <View style={styles.geofenceHeader}>
          <MapPin size={20} color="#10B981" />
          <Text style={[styles.geofenceTitle, { color: colors.text }]}>Geofence Active</Text>
          <View style={[styles.geofenceActive, { backgroundColor: '#10B98120' }]}>
            <CircleDot size={14} color="#10B981" />
            <Text style={[styles.geofenceActiveText, { color: '#10B981' }]}>Required</Text>
          </View>
        </View>
        <Text style={[styles.geofenceInfo, { color: colors.textSecondary }]}>
          {MOCK_FACILITY_LOCATIONS[0].name} • {MOCK_GEOFENCE_SETTINGS.radiusMeters}m radius
        </Text>
      </View>

      {departmentHeadcount.map((dept) => (
        <View key={dept.departmentCode} style={[styles.deptCard, { backgroundColor: colors.surface }]}>
          <View style={styles.deptHeader}>
            <View style={styles.deptTitle}>
              <Building2 size={20} color={colors.primary} />
              <View>
                <Text style={[styles.deptName, { color: colors.text }]}>{dept.departmentName}</Text>
                <Text style={[styles.deptManager, { color: colors.textSecondary }]}>
                  {dept.managerName}
                </Text>
              </View>
            </View>
            <View style={styles.deptAccountability}>
              <Text style={[styles.deptAccountedText, { color: colors.text }]}>
                {dept.accountedFor}/{dept.totalEmployees}
              </Text>
              <Text style={[styles.deptAccountedLabel, { color: colors.textSecondary }]}>
                accounted
              </Text>
            </View>
          </View>

          <View style={styles.deptStats}>
            <View style={[styles.deptStat, { backgroundColor: '#10B98115' }]}>
              <UserCheck size={16} color="#10B981" />
              <Text style={[styles.deptStatValue, { color: '#10B981' }]}>{dept.clockedIn}</Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Working</Text>
            </View>
            <View style={[styles.deptStat, { backgroundColor: '#F59E0B15' }]}>
              <Coffee size={16} color="#F59E0B" />
              <Text style={[styles.deptStatValue, { color: '#F59E0B' }]}>{dept.onBreak}</Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Break</Text>
            </View>
            <View style={[styles.deptStat, { backgroundColor: '#3B82F615' }]}>
              <Clock size={16} color="#3B82F6" />
              <Text style={[styles.deptStatValue, { color: '#3B82F6' }]}>{dept.notArrived}</Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Expected</Text>
            </View>
            <View style={[styles.deptStat, { backgroundColor: '#EF444415' }]}>
              <UserX size={16} color="#EF4444" />
              <Text style={[styles.deptStatValue, { color: '#EF4444' }]}>{dept.unaccounted}</Text>
              <Text style={[styles.deptStatLabel, { color: colors.textSecondary }]}>Missing</Text>
            </View>
          </View>

          <View style={styles.deptCompliance}>
            <Text style={[styles.deptComplianceLabel, { color: colors.textSecondary }]}>
              Compliance Rate
            </Text>
            <View style={[styles.complianceBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.complianceFill,
                  {
                    backgroundColor: dept.complianceRate >= 90 ? '#10B981' : dept.complianceRate >= 70 ? '#F59E0B' : '#EF4444',
                    width: `${dept.complianceRate}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.deptComplianceValue,
                {
                  color: dept.complianceRate >= 90 ? '#10B981' : dept.complianceRate >= 70 ? '#F59E0B' : '#EF4444',
                },
              ]}
            >
              {dept.complianceRate}%
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderEmergency = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {!activeEmergency ? (
        <>
          <View style={[styles.emergencyStart, { backgroundColor: colors.surface }]}>
            <Shield size={48} color={colors.primary} />
            <Text style={[styles.emergencyStartTitle, { color: colors.text }]}>
              Emergency Roll Call
            </Text>
            <Text style={[styles.emergencyStartDesc, { color: colors.textSecondary }]}>
              Start an emergency roll call to account for all on-site employees.
              Department managers will be notified immediately.
            </Text>
            <TouchableOpacity
              style={[styles.emergencyButton, { backgroundColor: '#EF4444' }]}
              onPress={() => setShowEmergencyModal(true)}
            >
              <AlertTriangle size={20} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>Start Emergency Roll</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Start</Text>
            <View style={styles.quickStartGrid}>
              {[
                { type: 'fire_drill' as const, label: 'Fire Drill', color: '#F59E0B' },
                { type: 'evacuation' as const, label: 'Evacuation', color: '#3B82F6' },
                { type: 'tornado' as const, label: 'Tornado', color: '#8B5CF6' },
                { type: 'shelter_in_place' as const, label: 'Shelter', color: '#6366F1' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[styles.quickStartItem, { backgroundColor: item.color + '15' }]}
                  onPress={() => handleStartEmergency(item.type)}
                >
                  <Shield size={24} color={item.color} />
                  <Text style={[styles.quickStartLabel, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.activeEmergencyCard, { backgroundColor: '#EF444415' }]}>
            <View style={styles.activeEmergencyHeader}>
              <View style={styles.activeEmergencyType}>
                <AlertTriangle size={24} color="#EF4444" />
                <View>
                  <Text style={[styles.activeEmergencyTitle, { color: '#EF4444' }]}>
                    {getEmergencyTypeLabel(activeEmergency.type)}
                  </Text>
                  <Text style={[styles.activeEmergencyTime, { color: colors.textSecondary }]}>
                    Started: {new Date(activeEmergency.startTime).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.endButton, { backgroundColor: '#EF4444' }]}
                onPress={handleEndEmergency}
              >
                <Square size={16} color="#FFFFFF" />
                <Text style={styles.endButtonText}>End</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accountabilityStatsThreeCol}>
              <View style={[styles.accountabilityStatCol, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}>
                <View style={styles.colHeader}>
                  <XCircle size={18} color="#EF4444" />
                  <Text style={[styles.colHeaderText, { color: '#EF4444' }]}>NOT ACCOUNTED</Text>
                </View>
                <Text style={[styles.accountabilityValueLarge, { color: '#EF4444' }]}>
                  {activeEmergency.unaccounted}
                </Text>
                <Text style={[styles.colSubtext, { color: colors.textSecondary }]}>Need to find</Text>
              </View>
              <View style={[styles.accountabilityStatCol, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
                <View style={styles.colHeader}>
                  <Calendar size={18} color="#F59E0B" />
                  <Text style={[styles.colHeaderText, { color: '#F59E0B' }]}>ABSENT (KNOWN)</Text>
                </View>
                <Text style={[styles.accountabilityValueLarge, { color: '#F59E0B' }]}>
                  {stats.absentKnown}
                </Text>
                <Text style={[styles.colSubtext, { color: colors.textSecondary }]}>Vacation/Sick/FMLA</Text>
              </View>
              <View style={[styles.accountabilityStatCol, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
                <View style={styles.colHeader}>
                  <CheckCircle size={18} color="#10B981" />
                  <Text style={[styles.colHeaderText, { color: '#10B981' }]}>ACCOUNTED FOR</Text>
                </View>
                <Text style={[styles.accountabilityValueLarge, { color: '#10B981' }]}>
                  {activeEmergency.accountedFor}
                </Text>
                <Text style={[styles.colSubtext, { color: colors.textSecondary }]}>Confirmed safe</Text>
              </View>
            </View>
            <View style={styles.totalRow}>
              <Users size={16} color={colors.textSecondary} />
              <Text style={[styles.totalText, { color: colors.textSecondary }]}>
                Total on-site: {activeEmergency.totalOnsite}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginHorizontal: 16, marginTop: 16 }]}>
            Department Status
          </Text>

          {activeEmergency.departments.map((dept) => (
            <View key={dept.departmentCode} style={[styles.emergencyDeptCard, { backgroundColor: colors.surface }]}>
              <View style={styles.emergencyDeptHeader}>
                <View>
                  <Text style={[styles.emergencyDeptName, { color: colors.text }]}>{dept.departmentName}</Text>
                  <Text style={[styles.emergencyDeptManager, { color: colors.textSecondary }]}>
                    {dept.managerName}
                  </Text>
                </View>
                <View style={styles.emergencyDeptStats}>
                  <View style={[styles.miniStat, { backgroundColor: '#EF444420' }]}>
                    <Text style={{ color: '#EF4444', fontWeight: '600' as const, fontSize: 12 }}>{dept.unaccounted}</Text>
                  </View>
                  <View style={[styles.miniStat, { backgroundColor: '#F59E0B20' }]}>
                    <Text style={{ color: '#F59E0B', fontWeight: '600' as const, fontSize: 12 }}>{dept.absentKnown}</Text>
                  </View>
                  <View style={[styles.miniStat, { backgroundColor: '#10B98120' }]}>
                    <Text style={{ color: '#10B981', fontWeight: '600' as const, fontSize: 12 }}>{dept.accounted}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.emergencyEmployeeList}>
                {employeePresence.filter(
                  (e) => e.departmentCode === dept.departmentCode && e.accountabilityStatus === 'unaccounted'
                ).length > 0 && (
                  <Text style={[styles.employeeGroupLabel, { color: '#EF4444' }]}>Not Accounted For</Text>
                )}
                {employeePresence.filter(
                  (e) => e.departmentCode === dept.departmentCode && e.accountabilityStatus === 'unaccounted'
                ).map((emp) => (
                  <TouchableOpacity
                    key={emp.employeeId}
                    style={[
                      styles.emergencyEmployeeRow,
                      { backgroundColor: '#EF444410', borderLeftWidth: 3, borderLeftColor: '#EF4444' },
                    ]}
                    onPress={() => handleMarkAccountable(emp.employeeId)}
                  >
                    <View style={styles.emergencyEmployeeInfo}>
                      <Text style={[styles.emergencyEmployeeName, { color: colors.text }]}>
                        {emp.employeeName}
                      </Text>
                      <Text style={[styles.emergencyEmployeeCode, { color: colors.textSecondary }]}>
                        {emp.employeeCode} • {emp.position}
                      </Text>
                    </View>
                    <View style={[styles.markButton, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.markButtonText}>Mark Safe</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {employeePresence.filter(
                  (e) => e.departmentCode === dept.departmentCode && e.accountabilityStatus === 'absent_known'
                ).length > 0 && (
                  <Text style={[styles.employeeGroupLabel, { color: '#F59E0B', marginTop: 8 }]}>Absent (Known Reason)</Text>
                )}
                {employeePresence.filter(
                  (e) => e.departmentCode === dept.departmentCode && e.accountabilityStatus === 'absent_known'
                ).map((emp) => (
                  <View
                    key={emp.employeeId}
                    style={[
                      styles.emergencyEmployeeRow,
                      { backgroundColor: '#F59E0B10', borderLeftWidth: 3, borderLeftColor: '#F59E0B' },
                    ]}
                  >
                    <View style={styles.emergencyEmployeeInfo}>
                      <Text style={[styles.emergencyEmployeeName, { color: colors.text }]}>
                        {emp.employeeName}
                      </Text>
                      <Text style={[styles.emergencyEmployeeCode, { color: colors.textSecondary }]}>
                        {emp.employeeCode} • {emp.absenceReason ? getAbsenceReasonLabel(emp.absenceReason as any) : 'Absent'}
                      </Text>
                    </View>
                    <View style={[styles.absenceBadge, { backgroundColor: emp.absenceReason ? getAbsenceReasonColor(emp.absenceReason as any) + '20' : '#F59E0B20' }]}>
                      <Text style={{ color: emp.absenceReason ? getAbsenceReasonColor(emp.absenceReason as any) : '#F59E0B', fontSize: 11, fontWeight: '600' as const }}>
                        {emp.absenceReason ? getAbsenceReasonLabel(emp.absenceReason as any).toUpperCase() : 'ABSENT'}
                      </Text>
                    </View>
                  </View>
                ))}

                {employeePresence.filter(
                  (e) => e.departmentCode === dept.departmentCode && e.accountabilityStatus === 'accounted' && e.isOnsite
                ).length > 0 && (
                  <Text style={[styles.employeeGroupLabel, { color: '#10B981', marginTop: 8 }]}>Accounted For</Text>
                )}
                {employeePresence.filter(
                  (e) => e.departmentCode === dept.departmentCode && e.accountabilityStatus === 'accounted' && e.isOnsite
                ).map((emp) => (
                  <View
                    key={emp.employeeId}
                    style={[
                      styles.emergencyEmployeeRow,
                      { backgroundColor: '#10B98110', borderLeftWidth: 3, borderLeftColor: '#10B981' },
                    ]}
                  >
                    <View style={styles.emergencyEmployeeInfo}>
                      <Text style={[styles.emergencyEmployeeName, { color: colors.text }]}>
                        {emp.employeeName}
                      </Text>
                      <Text style={[styles.emergencyEmployeeCode, { color: colors.textSecondary }]}>
                        {emp.employeeCode} • {emp.position}
                      </Text>
                    </View>
                    <CheckCircle size={24} color="#10B981" />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  const renderClockIn = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.clockInHeader, { backgroundColor: colors.surface }]}>
        <View style={styles.clockInIconContainer}>
          <MapPin size={32} color={colors.primary} />
        </View>
        <Text style={[styles.clockInTitle, { color: colors.text }]}>
          Geo-Verified Clock In
        </Text>
        <Text style={[styles.clockInDesc, { color: colors.textSecondary }]}>
          Employees must be within facility boundaries to clock in/out.
          Geofencing is always required.
        </Text>
      </View>

      <View style={[styles.geoRequirement, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
        <Navigation size={20} color="#10B981" />
        <View style={styles.geoRequirementText}>
          <Text style={[styles.geoRequirementTitle, { color: '#10B981' }]}>
            Geofencing Required
          </Text>
          <Text style={[styles.geoRequirementDesc, { color: colors.textSecondary }]}>
            All employees must clock in within {MOCK_GEOFENCE_SETTINGS.radiusMeters}m of facility
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Clock-In Methods</Text>

        <TouchableOpacity
          style={[styles.clockInMethod, { borderColor: colors.border }]}
          onPress={() => setShowQRScanner(true)}
        >
          <View style={[styles.clockInMethodIcon, { backgroundColor: '#3B82F620' }]}>
            <QrCode size={28} color="#3B82F6" />
          </View>
          <View style={styles.clockInMethodInfo}>
            <Text style={[styles.clockInMethodTitle, { color: colors.text }]}>
              QR Code Scan
            </Text>
            <Text style={[styles.clockInMethodDesc, { color: colors.textSecondary }]}>
              Scan QR code at facility kiosk with phone
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.clockInMethod, { borderColor: colors.border }]}>
          <View style={[styles.clockInMethodIcon, { backgroundColor: '#8B5CF620' }]}>
            <Smartphone size={28} color="#8B5CF6" />
          </View>
          <View style={styles.clockInMethodInfo}>
            <Text style={[styles.clockInMethodTitle, { color: colors.text }]}>
              Kiosk Entry
            </Text>
            <Text style={[styles.clockInMethodDesc, { color: colors.textSecondary }]}>
              Enter employee code and PIN at facility kiosk
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.clockInMethod, { borderColor: colors.border }]}>
          <View style={[styles.clockInMethodIcon, { backgroundColor: '#10B98120' }]}>
            <Navigation size={28} color="#10B981" />
          </View>
          <View style={styles.clockInMethodInfo}>
            <Text style={[styles.clockInMethodTitle, { color: colors.text }]}>
              Geo Auto Clock
            </Text>
            <Text style={[styles.clockInMethodDesc, { color: colors.textSecondary }]}>
              Automatic clock when entering geofence
            </Text>
          </View>
          <View style={[styles.comingSoonBadge, { backgroundColor: '#F59E0B20' }]}>
            <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '600' as const }}>SOON</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Facility Location</Text>
        <View style={styles.facilityInfo}>
          <MapPin size={20} color={colors.primary} />
          <View style={styles.facilityDetails}>
            <Text style={[styles.facilityName, { color: colors.text }]}>
              {MOCK_FACILITY_LOCATIONS[0].name}
            </Text>
            <Text style={[styles.facilityAddress, { color: colors.textSecondary }]}>
              {MOCK_FACILITY_LOCATIONS[0].address}
            </Text>
          </View>
        </View>
        <View style={[styles.radiusInfo, { backgroundColor: colors.border + '50' }]}>
          <CircleDot size={16} color={colors.primary} />
          <Text style={[styles.radiusText, { color: colors.textSecondary }]}>
            {MOCK_GEOFENCE_SETTINGS.radiusMeters}m geofence radius
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Past Emergency Rolls</Text>

        {MOCK_EMERGENCY_ROLLS.map((roll) => (
          <View key={roll.id} style={[styles.historyCard, { borderColor: colors.border }]}>
            <View style={styles.historyHeader}>
              <View
                style={[
                  styles.historyTypeBadge,
                  { backgroundColor: getEmergencyTypeColor(roll.type) + '20' },
                ]}
              >
                <Shield size={14} color={getEmergencyTypeColor(roll.type)} />
                <Text style={[styles.historyTypeText, { color: getEmergencyTypeColor(roll.type) }]}>
                  {getEmergencyTypeLabel(roll.type)}
                </Text>
              </View>
              <View style={[styles.historyStatusBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '500' as const }}>
                  {roll.status}
                </Text>
              </View>
            </View>

            <View style={styles.historyDetails}>
              <Text style={[styles.historyDate, { color: colors.text }]}>
                {new Date(roll.startTime).toLocaleDateString()} at{' '}
                {new Date(roll.startTime).toLocaleTimeString()}
              </Text>
              <Text style={[styles.historyDuration, { color: colors.textSecondary }]}>
                Duration: {roll.endTime ? Math.round((new Date(roll.endTime).getTime() - new Date(roll.startTime).getTime()) / 60000) : 0} minutes
              </Text>
            </View>

            <View style={styles.historyStats}>
              <View style={styles.historyStat}>
                <Text style={[styles.historyStatValue, { color: '#10B981' }]}>
                  {roll.accountedFor}
                </Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>
                  Accounted
                </Text>
              </View>
              <View style={styles.historyStat}>
                <Text style={[styles.historyStatValue, { color: '#3B82F6' }]}>
                  {roll.totalOnsite}
                </Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
              <View style={styles.historyStat}>
                <Text style={[styles.historyStatValue, { color: colors.text }]}>
                  {Math.round((roll.accountedFor / roll.totalOnsite) * 100)}%
                </Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>Rate</Text>
              </View>
            </View>

            {roll.notes && (
              <Text style={[styles.historyNotes, { color: colors.textSecondary }]}>
                {roll.notes}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderEmployeeModal = () => (
    <Modal
      visible={!!selectedEmployee}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setSelectedEmployee(null)}
    >
      {selectedEmployee && (
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Employee Details</Text>
            <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.employeeProfileHeader, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.largeAvatar,
                  { backgroundColor: getPresenceStatusColor(selectedEmployee.presenceStatus) + '30' },
                ]}
              >
                <Text
                  style={[
                    styles.largeAvatarText,
                    { color: getPresenceStatusColor(selectedEmployee.presenceStatus) },
                  ]}
                >
                  {selectedEmployee.employeeName.charAt(0)}
                </Text>
              </View>
              <Text style={[styles.employeeProfileName, { color: colors.text }]}>
                {selectedEmployee.employeeName}
              </Text>
              <Text style={[styles.employeeProfileCode, { color: colors.textSecondary }]}>
                {selectedEmployee.employeeCode} • {selectedEmployee.position}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: getPresenceStatusColor(selectedEmployee.presenceStatus) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: getPresenceStatusColor(selectedEmployee.presenceStatus) },
                  ]}
                >
                  {getPresenceStatusLabel(selectedEmployee.presenceStatus)}
                </Text>
              </View>
            </View>

            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Work Info</Text>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedEmployee.departmentName}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedEmployee.employeeType === 'salaried' ? 'Salaried' : 'Hourly'}
                </Text>
              </View>
              {selectedEmployee.managerName && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Manager</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {selectedEmployee.managerName}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Today&apos;s Activity</Text>
              {selectedEmployee.lastClockIn && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Clock In</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedEmployee.lastClockIn).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              {selectedEmployee.lastClockOut && (
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Clock Out</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {new Date(selectedEmployee.lastClockOut).toLocaleTimeString()}
                  </Text>
                </View>
              )}
              <View style={styles.modalRow}>
                <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Hours Today</Text>
                <Text style={[styles.modalValue, { color: colors.text }]}>
                  {selectedEmployee.hoursToday.toFixed(2)} hrs
                </Text>
              </View>
            </View>

            {(selectedEmployee as any).emergencyContact && (
              <View style={[styles.modalSection, { backgroundColor: colors.surface }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                  Emergency Contact
                </Text>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Name</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    {(selectedEmployee as any).emergencyContact}
                  </Text>
                </View>
                {(selectedEmployee as any).emergencyPhone && (
                  <TouchableOpacity style={styles.callButton}>
                    <Phone size={16} color="#FFFFFF" />
                    <Text style={styles.callButtonText}>{(selectedEmployee as any).emergencyPhone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </Modal>
  );

  const renderEmergencyTypeModal = () => (
    <Modal
      visible={showEmergencyModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEmergencyModal(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Emergency Type</Text>
          <TouchableOpacity onPress={() => setShowEmergencyModal(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {(
            [
              { type: 'fire', label: 'Fire Emergency', desc: 'Immediate evacuation required' },
              { type: 'fire_drill', label: 'Fire Drill', desc: 'Scheduled practice evacuation' },
              { type: 'tornado', label: 'Tornado', desc: 'Shelter in place' },
              { type: 'active_shooter', label: 'Active Shooter', desc: 'Lockdown procedure' },
              { type: 'chemical_spill', label: 'Chemical Spill', desc: 'Hazmat response' },
              { type: 'evacuation', label: 'General Evacuation', desc: 'Leave building immediately' },
              { type: 'shelter_in_place', label: 'Shelter in Place', desc: 'Stay indoors' },
              { type: 'other', label: 'Other', desc: 'Custom emergency type' },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[styles.emergencyTypeOption, { backgroundColor: colors.surface }]}
              onPress={() => handleStartEmergency(item.type)}
            >
              <View
                style={[
                  styles.emergencyTypeIcon,
                  { backgroundColor: getEmergencyTypeColor(item.type) + '20' },
                ]}
              >
                <Shield size={24} color={getEmergencyTypeColor(item.type)} />
              </View>
              <View style={styles.emergencyTypeInfo}>
                <Text style={[styles.emergencyTypeLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.emergencyTypeDesc, { color: colors.textSecondary }]}>
                  {item.desc}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderQRScannerModal = () => (
    <Modal
      visible={showQRScanner}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => setShowQRScanner(false)}
    >
      <View style={[styles.scannerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.scannerHeader, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={() => setShowQRScanner(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.scannerTitle, { color: colors.text }]}>Scan QR Code</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.scannerBody}>
          <View style={[styles.scannerPlaceholder, { backgroundColor: colors.surface }]}>
            <Scan size={64} color={colors.textSecondary} />
            <Text style={[styles.scannerPlaceholderText, { color: colors.textSecondary }]}>
              Position QR code within the frame
            </Text>
            <Text style={[styles.scannerNote, { color: colors.textSecondary }]}>
              Camera access required for scanning
            </Text>
          </View>
        </View>

        <View style={[styles.scannerFooter, { backgroundColor: colors.surface }]}>
          <Text style={[styles.scannerFooterText, { color: colors.textSecondary }]}>
            Scan the QR code displayed at the facility kiosk
          </Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderViewTabs()}
      {viewMode === 'realtime' && renderRealtime()}
      {viewMode === 'departments' && renderDepartments()}
      {viewMode === 'emergency' && renderEmergency()}
      {viewMode === 'clockin' && renderClockIn()}
      {viewMode === 'history' && renderHistory()}
      {renderEmployeeModal()}
      {renderEmergencyTypeModal()}
      {renderQRScannerModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  emergencyBanner: {
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emergencyBannerText: {},
  emergencyBannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emergencyBannerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
  },
  emergencyBannerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emergencyBannerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  statsGrid: {
    padding: 16,
    gap: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statCardLarge: {
    padding: 24,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardSmall: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValueLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
  },
  statValueSmall: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 14,
  },
  statLabelSmall: {
    fontSize: 11,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  employeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  presenceIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  salaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  salaryBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  kioskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kioskBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  emergencyProtocolButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: '#DC2626',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  emergencyProtocolLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  emergencyProtocolIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emergencyProtocolTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emergencyProtocolSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  employeeCode: {
    fontSize: 12,
    marginTop: 2,
  },
  employeeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  geofenceStatus: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  geofenceTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  geofenceActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  geofenceActiveText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  geofenceInfo: {
    fontSize: 13,
    marginLeft: 28,
  },
  deptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deptTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deptName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deptManager: {
    fontSize: 13,
    marginTop: 2,
  },
  deptAccountability: {
    alignItems: 'flex-end',
  },
  deptAccountedText: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  deptAccountedLabel: {
    fontSize: 11,
  },
  deptStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  deptStat: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  deptStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  deptStatLabel: {
    fontSize: 10,
  },
  deptCompliance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deptComplianceLabel: {
    fontSize: 12,
    width: 90,
  },
  complianceBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  complianceFill: {
    height: '100%',
    borderRadius: 4,
  },
  deptComplianceValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    width: 45,
    textAlign: 'right' as const,
  },
  emergencyStart: {
    margin: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emergencyStartTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emergencyStartDesc: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 24,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  quickStartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quickStartItem: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickStartLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  activeEmergencyCard: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  activeEmergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  activeEmergencyType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeEmergencyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  activeEmergencyTime: {
    fontSize: 13,
    marginTop: 2,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  accountabilityStats: {
    flexDirection: 'row',
    gap: 12,
  },
  accountabilityStatsThreeCol: {
    flexDirection: 'row',
    gap: 8,
  },
  accountabilityStatCol: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  colHeaderText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  accountabilityValueLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  colSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  totalText: {
    fontSize: 13,
  },
  accountabilityStat: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  accountabilityValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  accountabilityLabel: {
    fontSize: 11,
  },
  emergencyDeptCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  emergencyDeptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyDeptName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emergencyDeptManager: {
    fontSize: 12,
    marginTop: 2,
  },
  emergencyDeptStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStat: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emergencyEmployeeList: {
    gap: 6,
  },
  employeeGroupLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  absenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emergencyEmployeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  emergencyEmployeeInfo: {},
  emergencyEmployeeName: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emergencyEmployeeCode: {
    fontSize: 12,
    marginTop: 2,
  },
  markButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  clockInHeader: {
    margin: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  clockInIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  clockInTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  clockInDesc: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  geoRequirement: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  geoRequirementText: {
    flex: 1,
  },
  geoRequirementTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  geoRequirementDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  clockInMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
  },
  clockInMethodIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockInMethodInfo: {
    flex: 1,
  },
  clockInMethodTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  clockInMethodDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  facilityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  facilityDetails: {
    flex: 1,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  facilityAddress: {
    fontSize: 13,
    marginTop: 2,
  },
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  radiusText: {
    fontSize: 13,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  historyTypeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  historyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyDetails: {
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  historyDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  historyStat: {
    alignItems: 'center',
  },
  historyStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  historyStatLabel: {
    fontSize: 11,
  },
  historyNotes: {
    fontSize: 13,
    fontStyle: 'italic' as const,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  modalSection: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 14,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  employeeProfileHeader: {
    alignItems: 'center',
    padding: 24,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '600' as const,
  },
  employeeProfileName: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  employeeProfileCode: {
    fontSize: 14,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emergencyTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 16,
  },
  emergencyTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTypeInfo: {
    flex: 1,
  },
  emergencyTypeLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emergencyTypeDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  scannerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  scannerPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scannerPlaceholderText: {
    fontSize: 16,
  },
  scannerNote: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  scannerFooter: {
    padding: 24,
    alignItems: 'center',
  },
  scannerFooterText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
