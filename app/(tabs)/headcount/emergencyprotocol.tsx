import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Flame,
  AlertTriangle,
  Users,
  CheckCircle,
  ArrowLeft,
  Shield,
  Timer,
  UserCheck,
  Info,
  X,
  Phone,
  Tornado,
  ShieldAlert,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  MOCK_EMERGENCY_EMPLOYEES,
  EmergencyEmployee,
} from '@/mocks/emergencyEmployees';
import { EMERGENCY_EVENT_TYPE_CONFIG, EmergencyEventType } from '@/types/emergencyEvents';

type EmployeeStatus = 'pending' | 'safe';

interface EmployeeRollCall {
  employee: EmergencyEmployee;
  status: EmployeeStatus;
  markedAt: number | null;
}

interface EmergencyState {
  isActive: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  employees: EmployeeRollCall[];
}

const TYPE_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  fire: Flame,
  tornado: Tornado,
  active_shooter: ShieldAlert,
};

const TYPE_HEADERS: Record<string, { title: string; instruction: string; headerBg: string }> = {
  fire: { title: 'FIRE EVACUATION', instruction: 'EVACUATE IMMEDIATELY • ACCOUNT FOR ALL PERSONNEL', headerBg: '#B91C1C' },
  tornado: { title: 'TORNADO SHELTER', instruction: 'MOVE TO SHELTER AREAS • ACCOUNT FOR ALL PERSONNEL', headerBg: '#5B21B6' },
  active_shooter: { title: 'ACTIVE SHOOTER', instruction: 'RUN • HIDE • FIGHT • ACCOUNT FOR ALL PERSONNEL', headerBg: '#991B1B' },
};

export default function EmergencyProtocolScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string; drill?: string }>();
  const emergencyType = (params.type || 'fire') as EmergencyEventType;
  const isDrill = params.drill === 'true';
  const typeConfig = EMERGENCY_EVENT_TYPE_CONFIG[emergencyType] || EMERGENCY_EVENT_TYPE_CONFIG.fire;
  const headerConfig = TYPE_HEADERS[emergencyType] || TYPE_HEADERS.fire;
  const TypeIcon = TYPE_ICONS[emergencyType] || Flame;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [emergency, setEmergency] = useState<EmergencyState>({
    isActive: false,
    startTime: null,
    elapsedSeconds: 0,
    employees: [],
  });

  const [showInstructions, setShowInstructions] = useState(false);
  const [allSafe, setAllSafe] = useState(false);

  const pendingEmployees = emergency.employees.filter(e => e.status === 'pending');
  const safeEmployees = emergency.employees.filter(e => e.status === 'safe');

  useEffect(() => {
    if (emergency.isActive && !allSafe) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      const flash = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(flashAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ])
      );
      flash.start();

      return () => {
        pulse.stop();
        flash.stop();
      };
    }
  }, [emergency.isActive, allSafe, pulseAnim, flashAnim]);

  useEffect(() => {
    if (emergency.isActive && emergency.startTime && !allSafe) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setEmergency(prev => ({
          ...prev,
          elapsedSeconds: Math.floor((now - prev.startTime!) / 1000),
        }));
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [emergency.isActive, emergency.startTime, allSafe]);

  useEffect(() => {
    if (emergency.isActive && pendingEmployees.length === 0 && emergency.employees.length > 0) {
      setAllSafe(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Vibration.vibrate([100, 100, 100, 100, 500]);
      }

      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();

      console.log('[EmergencyProtocol] All employees safe! Emergency auto-ended.');
    }
  }, [pendingEmployees.length, emergency.employees.length, emergency.isActive, successAnim]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initiateEmergency = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([200, 100, 200, 100, 200, 100, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    const employees: EmployeeRollCall[] = MOCK_EMERGENCY_EMPLOYEES.map(emp => ({
      employee: emp,
      status: 'pending',
      markedAt: null,
    }));

    setEmergency({
      isActive: true,
      startTime: Date.now(),
      elapsedSeconds: 0,
      employees,
    });

    setAllSafe(false);
    successAnim.setValue(0);

    console.log('[EmergencyProtocol] Emergency initiated with', employees.length, 'employees');
  }, [successAnim]);

  const markEmployeeSafe = useCallback((employeeId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setEmergency(prev => ({
      ...prev,
      employees: prev.employees.map(emp =>
        emp.employee.id === employeeId
          ? { ...emp, status: 'safe' as EmployeeStatus, markedAt: Date.now() }
          : emp
      ),
    }));

    console.log('[EmergencyProtocol] Employee marked safe:', employeeId);
  }, []);

  const resetEmergency = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setEmergency({
      isActive: false,
      startTime: null,
      elapsedSeconds: 0,
      employees: [],
    });
    setAllSafe(false);
    successAnim.setValue(0);
    console.log('[EmergencyProtocol] Emergency reset');
  }, [successAnim]);

  const backgroundColor = allSafe
    ? successAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#1C1C1E', '#064E3B'],
      })
    : flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#1C1C1E', '#2C2C2E'],
      });

  if (!emergency.isActive) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: 'Emergency Protocol',
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.headerButton}
              >
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.iconCircle, { backgroundColor: '#EF444420' }]}>
              <Shield size={48} color="#EF4444" />
            </View>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              {isDrill ? `${typeConfig.label} Drill` : `${typeConfig.label} Emergency Protocol`}
            </Text>
            <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
              {isDrill
                ? `Start a ${typeConfig.label.toLowerCase()} drill to practice evacuation and track all personnel.`
                : `Initiate ${typeConfig.label.toLowerCase()} emergency protocol to begin procedures and track all personnel until everyone is accounted for.`}
            </Text>
            {isDrill && (
              <View style={[styles.drillBadge, { backgroundColor: '#3B82F620' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700' as const, color: '#3B82F6', letterSpacing: 1 }}>DRILL MODE</Text>
              </View>
            )}
          </View>

          <View style={[styles.employeesPreview, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              On-Site Personnel ({MOCK_EMERGENCY_EMPLOYEES.length})
            </Text>
            <View style={styles.employeeChips}>
              {MOCK_EMERGENCY_EMPLOYEES.map(emp => (
                <View 
                  key={emp.id} 
                  style={[
                    styles.employeeChip, 
                    { 
                      backgroundColor: emp.isKioskUser ? '#3B82F620' : colors.border,
                      borderColor: emp.isKioskUser ? '#3B82F6' : 'transparent',
                      borderWidth: emp.isKioskUser ? 1 : 0,
                    }
                  ]}
                >
                  <Text style={[styles.employeeChipText, { color: emp.isKioskUser ? '#3B82F6' : colors.text }]}>
                    {emp.firstName} {emp.lastName[0]}.
                  </Text>
                  {emp.isKioskUser && (
                    <View style={styles.kioskBadge}>
                      <Text style={styles.kioskBadgeText}>K</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendItem, { backgroundColor: '#3B82F620' }]}>
                <Text style={[styles.legendText, { color: '#3B82F6' }]}>K = Kiosk User</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.initiateButton, isDrill && { backgroundColor: '#3B82F6' }]}
            onPress={initiateEmergency}
          >
            <TypeIcon size={24} color="#FFFFFF" />
            <Text style={styles.initiateButtonText}>
              {isDrill ? `START ${typeConfig.label.toUpperCase()} DRILL` : `INITIATE ${typeConfig.label.toUpperCase()} PROTOCOL`}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            {isDrill
              ? `This will start a ${typeConfig.label.toLowerCase()} drill and begin personnel roll call.`
              : `This will activate ${typeConfig.label.toLowerCase()} emergency mode and begin personnel roll call.`}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.emergencyContainer, { backgroundColor }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={[styles.emergencyHeader, { backgroundColor: allSafe ? '#065F46' : headerConfig.headerBg }, isDrill && !allSafe && { backgroundColor: '#1E40AF' }]}>
        {allSafe ? (
          <>
            <View style={styles.successTitleRow}>
              <CheckCircle size={32} color="#10B981" />
              <Text style={styles.successTitle}>ALL PERSONNEL SAFE</Text>
              <CheckCircle size={32} color="#10B981" />
            </View>
            <Text style={styles.successSubtitle}>
              {isDrill ? 'Drill' : 'Emergency'} protocol complete • All {emergency.employees.length} employees accounted for
            </Text>
          </>
        ) : (
          <>
            <Animated.View style={[styles.emergencyTitleRow, { transform: [{ scale: pulseAnim }] }]}>
              <TypeIcon size={32} color="#FFFFFF" />
              <Text style={styles.emergencyTitle}>
                {isDrill ? `${typeConfig.label.toUpperCase()} DRILL` : headerConfig.title}
              </Text>
              <TypeIcon size={32} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.emergencyInstructions}>
              {headerConfig.instruction}
            </Text>
          </>
        )}

        <View style={styles.overallTimerRow}>
          <View style={[styles.overallTimer, allSafe && styles.overallTimerSuccess]}>
            <Timer size={20} color="#FFFFFF" />
            <Text style={styles.overallTimerText}>{formatTime(emergency.elapsedSeconds)}</Text>
          </View>
          {!allSafe && (
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowInstructions(true)}
            >
              <Info size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Users size={16} color="#FFFFFF" />
          <Text style={styles.statValue}>{emergency.employees.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statItem, styles.statItemDivider]}>
          <AlertTriangle size={16} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingEmployees.length}</Text>
          <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Not Logged</Text>
        </View>
        <View style={[styles.statItem, styles.statItemDivider]}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={[styles.statValue, { color: '#10B981' }]}>{safeEmployees.length}</Text>
          <Text style={[styles.statLabel, { color: '#10B981' }]}>Safe</Text>
        </View>
      </View>

      {allSafe ? (
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <CheckCircle size={80} color="#10B981" />
          </View>
          <Text style={styles.successMessage}>Everyone is accounted for!</Text>
          <Text style={styles.successTime}>
            Completed in {formatTime(emergency.elapsedSeconds)}
          </Text>
          
          <View style={styles.safeListContainer}>
            <Text style={styles.safeListTitle}>All Personnel ({safeEmployees.length})</Text>
            <ScrollView style={styles.safeList}>
              {safeEmployees.map(emp => (
                <View key={emp.employee.id} style={styles.safeEmployeeRow}>
                  <View style={styles.hereBadgeSmall}>
                    <Text style={styles.hereBadgeTextSmall}>HERE</Text>
                  </View>
                  <Text style={styles.safeEmployeeName}>
                    {emp.employee.firstName} {emp.employee.lastName}
                  </Text>
                  {emp.employee.isKioskUser && (
                    <View style={styles.kioskTagSmall}>
                      <Text style={styles.kioskTagText}>KIOSK</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetEmergency}
          >
            <X size={20} color="#FFFFFF" />
            <Text style={styles.resetButtonText}>CLOSE & RESET</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.splitContainer}>
          <View style={styles.splitPane}>
            <View style={[styles.paneHeader, { backgroundColor: '#F59E0B' }]}>
              <AlertTriangle size={18} color="#FFFFFF" />
              <Text style={styles.paneHeaderText}>NOT LOGGED ({pendingEmployees.length})</Text>
            </View>
            <ScrollView style={styles.paneContent}>
              {pendingEmployees.map(emp => (
                <TouchableOpacity
                  key={emp.employee.id}
                  style={styles.employeeCard}
                  onPress={() => markEmployeeSafe(emp.employee.id)}
                >
                  <View style={styles.employeeCardInfo}>
                    <View style={styles.employeeNameRow}>
                      <Text style={styles.employeeCardName}>
                        {emp.employee.firstName} {emp.employee.lastName}
                      </Text>
                      {emp.employee.isKioskUser && (
                        <View style={styles.kioskTagSmall}>
                          <Text style={styles.kioskTagText}>KIOSK</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.employeeCardDetails}>
                      {emp.employee.department} • {emp.employee.position}
                    </Text>
                    {emp.employee.specialNeeds && (
                      <View style={styles.specialNeedsTag}>
                        <AlertTriangle size={10} color="#F59E0B" />
                        <Text style={styles.specialNeedsText}>{emp.employee.specialNeeds}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.markSafeButton}>
                    <Text style={styles.markSafeButtonText}>HERE</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {pendingEmployees.length === 0 && (
                <View style={styles.emptyPane}>
                  <CheckCircle size={40} color="#10B981" />
                  <Text style={styles.emptyPaneText}>All clear!</Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.splitPane}>
            <View style={[styles.paneHeader, { backgroundColor: '#10B981' }]}>
              <UserCheck size={18} color="#FFFFFF" />
              <Text style={styles.paneHeaderText}>HERE ({safeEmployees.length})</Text>
            </View>
            <ScrollView style={styles.paneContent}>
              {safeEmployees.map(emp => (
                <View key={emp.employee.id} style={styles.safeCard}>
                  <View style={styles.hereBadge}>
                    <Text style={styles.hereBadgeText}>HERE</Text>
                  </View>
                  <View style={styles.safeCardInfo}>
                    <View style={styles.employeeNameRow}>
                      <Text style={styles.safeCardName}>
                        {emp.employee.firstName} {emp.employee.lastName}
                      </Text>
                      {emp.employee.isKioskUser && (
                        <View style={styles.kioskTagSmall}>
                          <Text style={styles.kioskTagText}>KIOSK</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.safeCardDetails}>
                      {emp.employee.department}
                    </Text>
                  </View>
                </View>
              ))}
              {safeEmployees.length === 0 && (
                <View style={styles.emptyPane}>
                  <Users size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyPaneText}>No one marked safe yet</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {!allSafe && (
        <TouchableOpacity
          style={styles.endEmergencyButton}
          onPress={resetEmergency}
        >
          <X size={18} color="#FFFFFF" />
          <Text style={styles.endEmergencyText}>END PROTOCOL</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showInstructions}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.instructionsModal}>
            <View style={styles.instructionsHeader}>
              <Text style={styles.instructionsTitle}>Fire Evacuation Instructions</Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.instructionsContent}>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>
                  STOP all work immediately and secure hazardous materials if safe
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>
                  ALERT others in your area and assist anyone who needs help
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>
                  EVACUATE via the nearest safe exit - DO NOT use elevators
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>4</Text>
                </View>
                <Text style={styles.instructionText}>
                  REPORT to the person taking roll call to be marked safe
                </Text>
              </View>
              
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>5</Text>
                </View>
                <Text style={styles.instructionText}>
                  REMAIN at assembly point until ALL CLEAR is given
                </Text>
              </View>

              <View style={styles.emergencyContacts}>
                <Text style={styles.emergencyContactsTitle}>Emergency Contacts</Text>
                <View style={styles.contactRow}>
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.contactText}>Emergency: 911</Text>
                </View>
                <View style={styles.contactRow}>
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.contactText}>Security: ext. 5555</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  infoDesc: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  employeesPreview: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  employeeChips: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  employeeChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  employeeChipText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  kioskBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  kioskBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row' as const,
  },
  legendItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  initiateButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 18,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  initiateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  emergencyContainer: {
    flex: 1,
  },
  drillBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emergencyHeader: {
    backgroundColor: '#B91C1C',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center' as const,
  },
  emergencyHeaderSuccess: {},
  emergencyTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  emergencyInstructions: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FEE2E2',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  successTitleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  successSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#D1FAE5',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  overallTimerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  overallTimer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  overallTimerSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  overallTimerText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statsBar: {
    flexDirection: 'row' as const,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
  },
  statItemDivider: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row' as const,
  },
  splitPane: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  paneHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    gap: 8,
  },
  paneHeaderText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  paneContent: {
    flex: 1,
    padding: 8,
  },
  employeeCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  employeeCardInfo: {
    flex: 1,
  },
  employeeNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flexWrap: 'wrap' as const,
  },
  employeeCardName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  employeeCardDetails: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  kioskTagSmall: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kioskTagText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  specialNeedsTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
  },
  specialNeedsText: {
    fontSize: 9,
    color: '#F59E0B',
    fontWeight: '500' as const,
  },
  markSafeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 8,
  },
  markSafeButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  safeCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    gap: 10,
  },
  safeCardInfo: {
    flex: 1,
  },
  safeCardName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  safeCardDetails: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  emptyPane: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
  },
  emptyPaneText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  endEmergencyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    gap: 8,
  },
  endEmergencyText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center' as const,
    padding: 20,
  },
  successIconContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  successTime: {
    fontSize: 16,
    color: '#D1FAE5',
    marginBottom: 24,
  },
  safeListContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  safeListTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  safeList: {
    flex: 1,
  },
  safeEmployeeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  hereBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  hereBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  hereBadgeSmall: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  hereBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  safeEmployeeName: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  resetButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end' as const,
  },
  instructionsModal: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  instructionsHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  instructionsContent: {
    padding: 20,
  },
  instructionItem: {
    flexDirection: 'row' as const,
    marginBottom: 20,
    gap: 14,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  emergencyContacts: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  emergencyContactsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});
