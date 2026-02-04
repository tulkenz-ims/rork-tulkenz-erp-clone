import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Camera,
  CheckCircle,
  LogIn,
  LogOut,
  Coffee,
  X,
  Keyboard,
  QrCode,
} from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useAllEmployeesClockStatus,
  useClockInWithLocation,
  useClockOutWithLocation,
  useStartBreak,
  useEndBreak,
} from '@/hooks/useSupabaseTimeClock';
import { getStatusColor, getStatusLabel } from '@/constants/timeclockConstants';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ScanMethod = 'camera' | 'manual';

export default function ScanQRScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  
  const [scanMethod, setScanMethod] = useState<ScanMethod>('manual');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedRef = useRef<string>('');

  const { data: employees = [] } = useAllEmployeesClockStatus();
  
  const currentEmployee = employees.find(e => e.employee_id === user?.id) || employees[0];

  const clockInMutation = useClockInWithLocation();
  const clockOutMutation = useClockOutWithLocation();
  const startBreakMutation = useStartBreak();
  const endBreakMutation = useEndBreak();

  const isProcessing = clockInMutation.isPending || clockOutMutation.isPending || 
    startBreakMutation.isPending || endBreakMutation.isPending;

  const validateQRCode = useCallback((code: string): boolean => {
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length !== 8) return false;
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    return validChars.test(cleanCode);
  }, []);

  const handleCodeVerified = useCallback((code: string) => {
    console.log('[ScanQR] Code verified:', code);
    setVerifiedCode(code);
    setShowActions(true);
    setIsScanning(false);
  }, []);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (!isScanning || data === lastScannedRef.current) return;
    
    lastScannedRef.current = data;
    console.log('[ScanQR] Scanned:', data);

    if (validateQRCode(data)) {
      handleCodeVerified(data.toUpperCase());
    } else {
      Alert.alert('Invalid Code', 'This QR code is not valid for time clock.');
      setTimeout(() => {
        lastScannedRef.current = '';
      }, 2000);
    }
  }, [isScanning, validateQRCode, handleCodeVerified]);

  const handleManualSubmit = useCallback(() => {
    const cleanCode = manualCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (!validateQRCode(cleanCode)) {
      Alert.alert('Invalid Code', 'Please enter the 8-character code shown on the kiosk.');
      return;
    }

    handleCodeVerified(cleanCode);
  }, [manualCode, validateQRCode, handleCodeVerified]);

  const handleClockAction = useCallback(
    async (action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') => {
      if (!currentEmployee || !verifiedCode) return;

      try {
        const actionLabels = {
          clock_in: 'Clock In',
          clock_out: 'Clock Out',
          break_start: 'Break Start',
          break_end: 'Break End',
        };

        if (action === 'clock_in') {
          await clockInMutation.mutateAsync({
            employeeId: currentEmployee.employee_id,
            method: 'qr_code',
            notes: `QR: ${verifiedCode}`,
          });
        } else if (action === 'clock_out') {
          await clockOutMutation.mutateAsync({
            employeeId: currentEmployee.employee_id,
            method: 'qr_code',
            notes: `QR: ${verifiedCode}`,
          });
        } else if (action === 'break_start') {
          await startBreakMutation.mutateAsync({
            employeeId: currentEmployee.employee_id,
            notes: `QR: ${verifiedCode}`,
          });
        } else if (action === 'break_end') {
          await endBreakMutation.mutateAsync({
            employeeId: currentEmployee.employee_id,
            notes: `QR: ${verifiedCode}`,
          });
        }

        Alert.alert(
          'Success',
          `${actionLabels[action]} recorded!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (error) {
        console.error('[handleClockAction] Error:', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to process action');
      }
    },
    [currentEmployee, verifiedCode, clockInMutation, clockOutMutation, startBreakMutation, endBreakMutation, router]
  );

  const handleReset = useCallback(() => {
    setVerifiedCode(null);
    setShowActions(false);
    setManualCode('');
    setIsScanning(true);
    lastScannedRef.current = '';
  }, []);

  const renderCameraScanner = () => {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Camera size={48} color={colors.textSecondary} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Permission Required
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Allow camera access to scan QR codes
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.manualBtn, { borderColor: colors.border }]}
            onPress={() => setScanMethod('manual')}
          >
            <Text style={[styles.manualBtnText, { color: colors.text }]}>Enter Code Manually</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.cornerTL, { borderColor: colors.primary }]} />
            <View style={[styles.cornerTR, { borderColor: colors.primary }]} />
            <View style={[styles.cornerBL, { borderColor: colors.primary }]} />
            <View style={[styles.cornerBR, { borderColor: colors.primary }]} />
          </View>
          <Text style={styles.scanHint}>Point camera at the kiosk QR code</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.switchMethodBtn, { backgroundColor: colors.surface }]}
          onPress={() => setScanMethod('manual')}
        >
          <Keyboard size={20} color={colors.text} />
          <Text style={[styles.switchMethodText, { color: colors.text }]}>Enter Manually</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderManualEntry = () => (
    <View style={styles.manualContainer}>
      <View style={[styles.codeInputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <QrCode size={48} color={colors.primary} />
        <Text style={[styles.manualTitle, { color: colors.text }]}>Enter Kiosk Code</Text>
        <Text style={[styles.manualSubtitle, { color: colors.textSecondary }]}>
          Type the 8-character code shown on the time clock kiosk
        </Text>

        <TextInput
          style={[styles.codeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={manualCode}
          onChangeText={(text) => setManualCode(text.toUpperCase())}
          placeholder="XXXXXXXX"
          placeholderTextColor={colors.textSecondary}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
        />

        <TouchableOpacity
          style={[
            styles.verifyBtn,
            { backgroundColor: manualCode.length === 8 ? colors.primary : colors.border }
          ]}
          onPress={handleManualSubmit}
          disabled={manualCode.length !== 8}
        >
          <Text style={[styles.verifyBtnText, { color: manualCode.length === 8 ? '#FFFFFF' : colors.textSecondary }]}>
            Verify Code
          </Text>
        </TouchableOpacity>
      </View>

      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={[styles.switchMethodBtn, { backgroundColor: colors.surface, marginTop: 16 }]}
          onPress={() => setScanMethod('camera')}
        >
          <Camera size={20} color={colors.text} />
          <Text style={[styles.switchMethodText, { color: colors.text }]}>Scan with Camera</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderClockActions = () => {
    if (!currentEmployee) {
      return (
        <View style={styles.noEmployeeContainer}>
          <Text style={[styles.noEmployeeText, { color: colors.text }]}>
            No employee profile found. Please contact your administrator.
          </Text>
        </View>
      );
    }

    const status = currentEmployee.status;

    return (
      <View style={styles.actionsContainer}>
        <View style={[styles.verifiedCard, { backgroundColor: '#10B98115' }]}>
          <CheckCircle size={24} color="#10B981" />
          <Text style={styles.verifiedText}>Code Verified: {verifiedCode}</Text>
        </View>

        <View style={[styles.employeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: `${getStatusColor(status)}15` }]}>
            <Text style={[styles.avatarText, { color: getStatusColor(status) }]}>
              {currentEmployee.first_name[0]}{currentEmployee.last_name[0]}
            </Text>
          </View>
          <Text style={[styles.employeeName, { color: colors.text }]}>
            {currentEmployee.first_name} {currentEmployee.last_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(status)}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {getStatusLabel(status)}
            </Text>
          </View>

          <View style={styles.hoursRow}>
            <View style={styles.hoursItem}>
              <Text style={[styles.hoursValue, { color: colors.text }]}>
                {currentEmployee.today_hours.toFixed(1)}h
              </Text>
              <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Today</Text>
            </View>
            <View style={[styles.hoursDivider, { backgroundColor: colors.border }]} />
            <View style={styles.hoursItem}>
              <Text style={[styles.hoursValue, { color: colors.text }]}>
                {currentEmployee.week_hours.toFixed(1)}h
              </Text>
              <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Week</Text>
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
                  <LogIn size={24} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Clock In</Text>
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
                    <Coffee size={24} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Break</Text>
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
                    <LogOut size={24} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Clock Out</Text>
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
                    <Coffee size={24} color="#FFFFFF" />
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
                    <LogOut size={24} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Clock Out</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={handleReset}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Scan Different Code</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Scan QR Code',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {showActions ? (
        renderClockActions()
      ) : scanMethod === 'camera' && Platform.OS !== 'web' ? (
        renderCameraScanner()
      ) : (
        renderManualEntry()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanHint: {
    marginTop: 24,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  switchMethodBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  switchMethodText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 20,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  manualBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  manualBtnText: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  manualContainer: {
    flex: 1,
    padding: 16,
  },
  codeInputCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  manualSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  codeInput: {
    width: '100%',
    fontSize: 32,
    fontWeight: '700' as const,
    textAlign: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    letterSpacing: 8,
    marginBottom: 20,
  },
  verifyBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  actionsContainer: {
    flex: 1,
    padding: 16,
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  verifiedText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  employeeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500' as const,
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
    fontSize: 24,
    fontWeight: '700' as const,
  },
  hoursLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  hoursDivider: {
    width: 1,
    height: 36,
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
    paddingVertical: 20,
    borderRadius: 14,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
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
  noEmployeeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noEmployeeText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
