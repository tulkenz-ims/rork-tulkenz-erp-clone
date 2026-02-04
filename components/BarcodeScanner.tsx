import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { X, Flashlight, FlashlightOff, Keyboard, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string, type: string) => void;
  title?: string;
}

export default function BarcodeScanner({ visible, onClose, onScan, title = 'Scan Barcode' }: BarcodeScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleBarCodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('Barcode scanned:', result.type, result.data);
    onScan(result.data, result.type);
  }, [scanned, onScan]);

  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onScan(manualCode.trim(), 'manual');
    setManualCode('');
    setManualEntry(false);
  }, [manualCode, onScan]);

  const handleClose = useCallback(() => {
    setScanned(false);
    setTorch(false);
    setManualEntry(false);
    setManualCode('');
    onClose();
  }, [onClose]);

  const resetScanner = useCallback(() => {
    setScanned(false);
  }, []);

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.permissionContainer}>
            <Camera size={64} color={colors.textSecondary} />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>Camera Permission Required</Text>
            <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
              We need camera access to scan barcodes and QR codes.
            </Text>
            <Pressable
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
            <Pressable
              style={[styles.manualButton, { borderColor: colors.border }]}
              onPress={() => setManualEntry(true)}
            >
              <Keyboard size={18} color={colors.primary} />
              <Text style={[styles.manualButtonText, { color: colors.primary }]}>Enter Manually</Text>
            </Pressable>
            <Pressable style={styles.closeTextButton} onPress={handleClose}>
              <Text style={[styles.closeTextButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  if (manualEntry) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Manual Entry</Text>
            <Pressable style={styles.headerButton} onPress={handleClose}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>
          
          <View style={styles.manualEntryContainer}>
            <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>
              Enter barcode, SKU, or asset tag:
            </Text>
            <TextInput
              style={[styles.manualInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="e.g., 1234567890123 or STL-001"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
            />
            <Pressable
              style={[styles.submitButton, { backgroundColor: colors.primary, opacity: manualCode.trim() ? 1 : 0.5 }]}
              onPress={handleManualSubmit}
              disabled={!manualCode.trim()}
            >
              <Text style={styles.submitButtonText}>Look Up</Text>
            </Pressable>
            <Pressable
              style={[styles.switchButton, { borderColor: colors.border }]}
              onPress={() => setManualEntry(false)}
            >
              <Camera size={18} color={colors.primary} />
              <Text style={[styles.switchButtonText, { color: colors.primary }]}>Use Camera</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'codabar', 'itf14'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        
        <View style={styles.overlay}>
          <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitleLight}>{title}</Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                style={styles.headerButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTorch(!torch);
                }}
              >
                {torch ? (
                  <FlashlightOff size={24} color="#FFFFFF" />
                ) : (
                  <Flashlight size={24} color="#FFFFFF" />
                )}
              </Pressable>
              <Pressable style={styles.headerButton} onPress={handleClose}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanHint}>
              {scanned ? 'Barcode detected!' : 'Position barcode within frame'}
            </Text>
          </View>

          <View style={[styles.footer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            {scanned ? (
              <Pressable
                style={[styles.footerButton, { backgroundColor: colors.primary }]}
                onPress={resetScanner}
              >
                <Text style={styles.footerButtonText}>Scan Another</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.footerButton, { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}
                onPress={() => setManualEntry(true)}
              >
                <Keyboard size={18} color="#FFFFFF" />
                <Text style={styles.footerButtonText}>Enter Manually</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  closeTextButton: {
    marginTop: 24,
    padding: 12,
  },
  closeTextButtonText: {
    fontSize: 14,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  headerTitleLight: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanHint: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  manualEntryContainer: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  manualLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  manualInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 2,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
