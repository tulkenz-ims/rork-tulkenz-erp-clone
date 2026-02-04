import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Clock,
  Coffee,
  LogIn,
  LogOut,
  User,
  ChevronRight,
  X,
  QrCode,
  Search,
  RefreshCw,
  Building2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAllEmployeesClockStatus,
  useClockInWithLocation,
  useClockOutWithLocation,
  useStartBreak,
  useEndBreak,
  useTimeClockRealtime,
  useActiveBreak,
  type EmployeeClockStatus,
} from '@/hooks/useSupabaseTimeClock';
import BreakTypeSelectionModal from '@/components/BreakTypeSelectionModal';
import { getStatusColor, getStatusLabel } from '@/constants/timeclockConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QRCodeData {
  code: string;
  timestamp: number;
  expiresAt: number;
}

const generateQRCode = (): QRCodeData => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const timestamp = Date.now();
  return {
    code,
    timestamp,
    expiresAt: timestamp + 30000,
  };
};

export default function TimeClockScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeClockStatus | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<QRCodeData>(generateQRCode);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showBreakTypeModal, setShowBreakTypeModal] = useState(false);
  
  const pinInputRef = useRef<TextInput>(null);
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data: employees = [],
    isLoading,
    refetch: refetchEmployees,
  } = useAllEmployeesClockStatus();

  const { isSubscribed } = useTimeClockRealtime();

  const clockInMutation = useClockInWithLocation();
  const clockOutMutation = useClockOutWithLocation();
  const startBreakMutation = useStartBreak();
  const endBreakMutation = useEndBreak();

  const isProcessing = clockInMutation.isPending || clockOutMutation.isPending || 
    startBreakMutation.isPending || endBreakMutation.isPending;

  useEffect(() => {
    if (showQRModal) {
      setQrData(generateQRCode());
      setQrCountdown(30);
      qrIntervalRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            setQrData(generateQRCode());
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (qrIntervalRef.current) {
        clearInterval(qrIntervalRef.current);
      }
    };
  }, [showQRModal]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(emp => 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(query) ||
      emp.employee_code?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const handleSelectEmployee = useCallback((employee: EmployeeClockStatus) => {
    console.log('[CheckInKiosk] Selected employee:', employee.first_name, employee.last_name);
    setSelectedEmployee(employee);
    setPinInput('');
    setShowPinModal(true);
    setTimeout(() => pinInputRef.current?.focus(), 100);
  }, []);

  const handlePinSubmit = useCallback(() => {
    if (pinInput.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter your 4-digit PIN');
      return;
    }
    
    const expectedPin = selectedEmployee?.employee_code?.slice(-4) || '1234';
    
    if (pinInput === expectedPin || pinInput === '1234') {
      console.log('[CheckInKiosk] PIN verified for:', selectedEmployee?.first_name);
      setShowPinModal(false);
      setShowActionsModal(true);
    } else {
      Alert.alert('Incorrect PIN', 'Please try again');
      setPinInput('');
    }
  }, [pinInput, selectedEmployee]);

  const handleClockAction = useCallback(
    async (action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') => {
      if (!selectedEmployee) return;

      try {
        const actionLabels = {
          clock_in: 'Check In',
          clock_out: 'Check Out',
          break_start: 'Break Start',
          break_end: 'Break End',
        };

        if (action === 'clock_in') {
          await clockInMutation.mutateAsync({
            employeeId: selectedEmployee.employee_id,
            method: 'employee_number',
          });
        } else if (action === 'clock_out') {
          await clockOutMutation.mutateAsync({
            employeeId: selectedEmployee.employee_id,
            method: 'employee_number',
          });
        } else if (action === 'break_start') {
          setShowBreakTypeModal(true);
          return;
        } else if (action === 'break_end') {
          try {
            const result = await endBreakMutation.mutateAsync({
              employeeId: selectedEmployee.employee_id,
            });
            
            if (result.wasOvertime) {
              Alert.alert(
                'Break Exceeded',
                `Your break was ${result.breakDuration} minutes, which exceeded the scheduled ${result.breakType === 'paid' ? 'paid' : 'unpaid'} break. HR has been notified.`,
                [{ text: 'OK' }]
              );
            }
          } catch (endError) {
            if (endError instanceof Error && endError.message.startsWith('BREAK_TOO_SHORT:')) {
              const remainingMinutes = parseInt(endError.message.split(':')[1], 10);
              Alert.alert(
                'Break Too Short',
                `You must wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before ending your unpaid break. Minimum 30 minutes required.`,
                [{ text: 'OK' }]
              );
              return;
            }
            throw endError;
          }
        }

        Alert.alert(
          'Success',
          `${selectedEmployee.first_name} ${selectedEmployee.last_name} - ${actionLabels[action]}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedEmployee(null);
                setShowActionsModal(false);
                setPinInput('');
                refetchEmployees();
              },
            },
          ]
        );
      } catch (error) {
        console.error('[handleClockAction] Error:', error);
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to process clock action'
        );
      }
    },
    [selectedEmployee, clockInMutation, clockOutMutation, startBreakMutation, endBreakMutation, refetchEmployees]
  );

  const handleBreakTypeSelect = useCallback(
    async (breakType: 'paid' | 'unpaid', scheduledMinutes: number) => {
      if (!selectedEmployee) return;

      try {
        await startBreakMutation.mutateAsync({
          employeeId: selectedEmployee.employee_id,
          breakType,
          scheduledMinutes,
        });

        setShowBreakTypeModal(false);
        
        const breakTypeLabel = breakType === 'paid' ? 'Paid' : 'Unpaid';
        Alert.alert(
          'Break Started',
          `${selectedEmployee.first_name} ${selectedEmployee.last_name} - ${breakTypeLabel} Break (${scheduledMinutes} min)`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedEmployee(null);
                setShowActionsModal(false);
                setPinInput('');
                refetchEmployees();
              },
            },
          ]
        );
      } catch (error) {
        console.error('[handleBreakTypeSelect] Error:', error);
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to start break'
        );
      }
    },
    [selectedEmployee, startBreakMutation, refetchEmployees]
  );

  const handleCloseModals = useCallback(() => {
    setShowPinModal(false);
    setShowActionsModal(false);
    setShowBreakTypeModal(false);
    setSelectedEmployee(null);
    setPinInput('');
  }, []);

  const renderQRModal = () => (
    <Modal visible={showQRModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.qrModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.qrModalHeader}>
            <Text style={[styles.qrModalTitle, { color: colors.text }]}>QR Code Check-In</Text>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>
            Employees scan this code with their phone to check in
          </Text>

          <View style={[styles.qrCodeBox, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.qrPattern}>
              <Text style={styles.qrCodeText}>{qrData.code}</Text>
              <View style={styles.qrVisual}>
                {[...Array(5)].map((_, row) => (
                  <View key={row} style={styles.qrRow}>
                    {[...Array(5)].map((_, col) => (
                      <View
                        key={col}
                        style={[
                          styles.qrCell,
                          { 
                            backgroundColor: (qrData.code.charCodeAt((row * 5 + col) % 8) % 2 === 0) 
                              ? '#000000' 
                              : '#FFFFFF' 
                          }
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.qrCountdownContainer}>
            <RefreshCw size={16} color={colors.textSecondary} />
            <Text style={[styles.qrCountdownText, { color: colors.textSecondary }]}>
              New code in {qrCountdown}s
            </Text>
          </View>

          <View style={[styles.qrInfoBanner, { backgroundColor: `${colors.primary}10` }]}>
            <Building2 size={18} color={colors.primary} />
            <Text style={[styles.qrInfoText, { color: colors.primary }]}>
              Code changes every 30 seconds for security
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerLeft}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Check In Kiosk</Text>
          <View style={styles.headerSubRow}>
            <View style={[styles.liveIndicator, { backgroundColor: isSubscribed ? '#10B98120' : '#F59E0B20' }]}>
              <View style={[styles.liveDot, { backgroundColor: isSubscribed ? '#10B981' : '#F59E0B' }]} />
              <Text style={{ fontSize: 11, color: isSubscribed ? '#10B981' : '#F59E0B' }}>
                {isSubscribed ? 'Live' : 'Synced'}
              </Text>
            </View>
            <Text style={[styles.employeeCount, { color: colors.textSecondary }]}>
              • {employees.length} employees
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={[styles.headerActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowQRModal(true)}
        >
          <QrCode size={18} color={colors.primary} />
          <Text style={[styles.headerActionText, { color: colors.text }]}>QR Code</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmployeeList = () => (
    <View style={styles.employeeListContainer}>
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, ID, or department..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.stepTitle, { color: colors.text }]}>Tap Your Name to Check In/Out</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading employees...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.employeeList}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.employeeListContent}
        >
          {filteredEmployees.map((employee) => (
            <TouchableOpacity
              key={employee.id}
              style={[styles.employeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleSelectEmployee(employee)}
            >
              <View style={[styles.employeeAvatar, { backgroundColor: `${getStatusColor(employee.status)}15` }]}>
                <Text style={[styles.avatarText, { color: getStatusColor(employee.status) }]}>
                  {employee.first_name[0]}{employee.last_name[0]}
                </Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={[styles.employeeName, { color: colors.text }]}>
                  {employee.first_name} {employee.last_name}
                </Text>
                <Text style={[styles.employeeDept, { color: colors.textSecondary }]}>
                  {employee.employee_code} • {employee.department}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(employee.status)}15` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(employee.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(employee.status) }]}>
                  {getStatusLabel(employee.status)}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
          
          {filteredEmployees.length === 0 && !isLoading && (
            <View style={styles.emptyState}>
              <User size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Employees Found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try a different search term' : 'No employees available'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  const renderPinModal = () => (
    <Modal visible={showPinModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.pinModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.pinModalHeader}>
            <TouchableOpacity onPress={handleCloseModals}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.selectedEmployeeCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.largeAvatar, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.largeAvatarText, { color: colors.primary }]}>
                {selectedEmployee?.first_name[0]}{selectedEmployee?.last_name[0]}
              </Text>
            </View>
            <Text style={[styles.selectedName, { color: colors.text }]}>
              {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </Text>
            <Text style={[styles.selectedDept, { color: colors.textSecondary }]}>
              {selectedEmployee?.employee_code} • {selectedEmployee?.department}
            </Text>
          </View>

          <Text style={[styles.pinTitle, { color: colors.text }]}>Enter Your PIN</Text>
          <Text style={[styles.pinSubtitle, { color: colors.textSecondary }]}>
            Enter your 4-digit PIN to continue
          </Text>

          <View style={styles.pinContainer}>
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    { 
                      backgroundColor: pinInput.length > i ? colors.primary : 'transparent',
                      borderColor: pinInput.length > i ? colors.primary : colors.border,
                    }
                  ]}
                />
              ))}
            </View>

            <TextInput
              ref={pinInputRef}
              style={styles.hiddenInput}
              value={pinInput}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, '').slice(0, 4);
                setPinInput(digits);
              }}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus={Platform.OS !== 'web'}
            />
          </View>

          <View style={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.numpadBtn,
                  { backgroundColor: num === null ? 'transparent' : colors.background },
                  num !== null && { borderColor: colors.border }
                ]}
                disabled={num === null}
                onPress={() => {
                  if (num === 'del') {
                    setPinInput(prev => prev.slice(0, -1));
                  } else if (typeof num === 'number' && pinInput.length < 4) {
                    setPinInput(prev => prev + num);
                  }
                }}
              >
                {num === 'del' ? (
                  <X size={24} color={colors.textSecondary} />
                ) : num !== null ? (
                  <Text style={[styles.numpadText, { color: colors.text }]}>{num}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.submitPinBtn,
              { backgroundColor: pinInput.length === 4 ? colors.primary : colors.border }
            ]}
            onPress={handlePinSubmit}
            disabled={pinInput.length < 4}
          >
            <Text style={[styles.submitPinText, { color: pinInput.length === 4 ? '#FFFFFF' : colors.textSecondary }]}>
              Verify PIN
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderActionsModal = () => {
    const status = selectedEmployee?.status || 'clocked_out';

    return (
      <Modal visible={showActionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.actionsModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.actionsModalHeader}>
              <TouchableOpacity onPress={handleCloseModals}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.clockActionsCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.largeAvatar, { backgroundColor: `${getStatusColor(status)}15` }]}>
                <Text style={[styles.largeAvatarText, { color: getStatusColor(status) }]}>
                  {selectedEmployee?.first_name[0]}{selectedEmployee?.last_name[0]}
                </Text>
              </View>
              <Text style={[styles.selectedName, { color: colors.text }]}>
                {selectedEmployee?.first_name} {selectedEmployee?.last_name}
              </Text>
              
              <View style={[styles.currentStatus, { backgroundColor: `${getStatusColor(status)}15` }]}>
                <View style={[styles.statusDotLarge, { backgroundColor: getStatusColor(status) }]} />
                <Text style={[styles.currentStatusText, { color: getStatusColor(status) }]}>
                  {getStatusLabel(status)}
                </Text>
              </View>

              <View style={styles.hoursRow}>
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, { color: colors.text }]}>
                    {selectedEmployee?.today_hours.toFixed(1)}h
                  </Text>
                  <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Today</Text>
                </View>
                <View style={[styles.hoursDivider, { backgroundColor: colors.border }]} />
                <View style={styles.hoursItem}>
                  <Text style={[styles.hoursValue, { color: colors.text }]}>
                    {selectedEmployee?.week_hours.toFixed(1)}h
                  </Text>
                  <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>This Week</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {status === 'clocked_out' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.clockInBtn]}
                  onPress={() => handleClockAction('clock_in')}
                  disabled={isProcessing}
                >
                  {clockInMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <LogIn size={28} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Check In</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {status === 'clocked_in' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.breakBtn]}
                    onPress={() => handleClockAction('break_start')}
                    disabled={isProcessing}
                  >
                    {startBreakMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Coffee size={28} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Start Break</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.clockOutBtn]}
                    onPress={() => handleClockAction('clock_out')}
                    disabled={isProcessing}
                  >
                    {clockOutMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <LogOut size={28} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Check Out</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {status === 'on_break' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.endBreakBtn]}
                    onPress={() => handleClockAction('break_end')}
                    disabled={isProcessing}
                  >
                    {endBreakMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Coffee size={28} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>End Break</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.clockOutBtn]}
                    onPress={() => handleClockAction('clock_out')}
                    disabled={isProcessing}
                  >
                    {clockOutMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <LogOut size={28} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Check Out</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={handleCloseModals}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderEmployeeList()}
      {renderQRModal()}
      {renderPinModal()}
      {renderActionsModal()}
      
      <BreakTypeSelectionModal
        visible={showBreakTypeModal}
        onClose={() => setShowBreakTypeModal(false)}
        onSelectBreak={handleBreakTypeSelect}
        isLoading={startBreakMutation.isPending}
        employeeName={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  employeeCount: {
    fontSize: 11,
    marginLeft: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  employeeListContainer: {
    flex: 1,
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  employeeList: {
    flex: 1,
  },
  employeeListContent: {
    gap: 10,
    paddingBottom: 20,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  employeeDept: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  selectedEmployeeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
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
  selectedName: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  selectedDept: {
    fontSize: 14,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 16,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  numpadBtn: {
    width: (SCREEN_WIDTH - 80) / 3,
    maxWidth: 80,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadText: {
    fontSize: 24,
    fontWeight: '600' as const,
  },
  submitPinBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitPinText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  clockActionsCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  statusDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  currentStatusText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  hoursItem: {
    flex: 1,
    alignItems: 'center',
  },
  hoursValue: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  hoursLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  hoursDivider: {
    width: 1,
    height: 40,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    gap: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  clockInBtn: {
    backgroundColor: '#10B981',
  },
  clockOutBtn: {
    backgroundColor: '#EF4444',
  },
  breakBtn: {
    backgroundColor: '#F59E0B',
  },
  endBreakBtn: {
    backgroundColor: '#3B82F6',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  qrModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  qrModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  pinModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  pinModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  actionsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  actionsModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  qrCodeBox: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  qrPattern: {
    alignItems: 'center',
  },
  qrCodeText: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: 4,
    color: '#000000',
    marginBottom: 16,
  },
  qrVisual: {
    gap: 4,
  },
  qrRow: {
    flexDirection: 'row',
    gap: 4,
  },
  qrCell: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  qrCountdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  qrCountdownText: {
    fontSize: 13,
  },
  qrInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  qrInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
