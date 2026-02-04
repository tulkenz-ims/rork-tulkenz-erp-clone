import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import {
  Printer,
  X,
  QrCode,
  Barcode,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Check,
  Settings,
  FileText,
  Package,
  Maximize2,
  RotateCcw,
  Download,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { INVENTORY_DEPARTMENTS, getDepartmentColor } from '@/constants/inventoryDepartmentCodes';

export interface LabelMaterial {
  id: string;
  materialNumber: string;
  name: string;
  sku: string;
  inventoryDepartment: number;
  location?: string;
  vendor?: string;
  description?: string;
  unit_of_measure: string;
  barcode?: string;
}

export type LabelSize = 'small' | 'medium' | 'large' | 'xlarge' | 'custom';
export type LabelLayout = '1-line' | '2-line' | '3-line' | 'custom';
export type CodeType = 'barcode' | 'qrcode' | 'both' | 'none';

export interface LabelField {
  id: string;
  label: string;
  value: string;
  enabled: boolean;
  order: number;
}

export interface LabelConfig {
  size: LabelSize;
  layout: LabelLayout;
  codeType: CodeType;
  customWidth?: number;
  customHeight?: number;
  showBorder: boolean;
  showLogo: boolean;
  showDepartmentColor: boolean;
  fields: LabelField[];
  copies: number;
}

interface LabelSizeConfig {
  name: string;
  width: number;
  height: number;
  description: string;
}

const LABEL_SIZES: Record<LabelSize, LabelSizeConfig> = {
  small: { name: 'Small (1" x 0.5")', width: 100, height: 50, description: 'Asset tags, small items' },
  medium: { name: 'Medium (2" x 1")', width: 200, height: 100, description: 'Standard inventory labels' },
  large: { name: 'Large (4" x 2")', width: 400, height: 200, description: 'Shipping, bins, large items' },
  xlarge: { name: 'Extra Large (4" x 6")', width: 400, height: 600, description: 'Pallet labels, large bins' },
  custom: { name: 'Custom Size', width: 200, height: 100, description: 'Define your own dimensions' },
};

const DEFAULT_FIELDS: LabelField[] = [
  { id: 'materialNumber', label: 'Material #', value: '', enabled: true, order: 1 },
  { id: 'name', label: 'Name', value: '', enabled: true, order: 2 },
  { id: 'sku', label: 'SKU', value: '', enabled: true, order: 3 },
  { id: 'location', label: 'Location', value: '', enabled: false, order: 4 },
  { id: 'vendor', label: 'Vendor', value: '', enabled: false, order: 5 },
  { id: 'description', label: 'Description', value: '', enabled: false, order: 6 },
  { id: 'unit', label: 'Unit', value: '', enabled: false, order: 7 },
  { id: 'barcode', label: 'Barcode', value: '', enabled: false, order: 8 },
];

interface LabelPrintingProps {
  visible: boolean;
  onClose: () => void;
  materials: LabelMaterial[];
  selectedMaterialIds?: string[];
}

const BarcodeDisplay: React.FC<{ value: string; width: number; height: number; colors: any }> = ({
  value,
  width,
  height,
  colors,
}) => {
  const barWidth = Math.max(1, Math.floor(width / (value.length * 2 + 10)));
  const bars = useMemo(() => {
    const result: { width: number; filled: boolean }[] = [];
    result.push({ width: barWidth * 2, filled: true });
    result.push({ width: barWidth, filled: false });
    result.push({ width: barWidth, filled: true });
    result.push({ width: barWidth, filled: false });
    
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      result.push({ width: barWidth, filled: charCode % 2 === 0 });
      result.push({ width: barWidth, filled: charCode % 3 !== 0 });
      result.push({ width: barWidth, filled: charCode % 5 === 0 });
      result.push({ width: barWidth, filled: true });
    }
    
    result.push({ width: barWidth, filled: false });
    result.push({ width: barWidth, filled: true });
    result.push({ width: barWidth, filled: false });
    result.push({ width: barWidth * 2, filled: true });
    
    return result;
  }, [value, barWidth]);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', height: height * 0.7, alignItems: 'flex-end' }}>
        {bars.map((bar, index) => (
          <View
            key={index}
            style={{
              width: bar.width,
              height: '100%',
              backgroundColor: bar.filled ? colors.text : 'transparent',
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: Math.max(8, height * 0.15), color: colors.text, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
        {value}
      </Text>
    </View>
  );
};

const QRCodeDisplay: React.FC<{ value: string; size: number; colors: any }> = ({
  value,
  size,
  colors,
}) => {
  const gridSize = 21;
  const cellSize = size / gridSize;
  
  const grid = useMemo(() => {
    const result: boolean[][] = [];
    for (let y = 0; y < gridSize; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < gridSize; x++) {
        if ((x < 7 && y < 7) || (x >= gridSize - 7 && y < 7) || (x < 7 && y >= gridSize - 7)) {
          const isOuter = x === 0 || x === 6 || y === 0 || y === 6 ||
                         x === gridSize - 7 || x === gridSize - 1 ||
                         y === gridSize - 7 || y === gridSize - 1;
          const isInner = (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                         (x >= gridSize - 5 && x <= gridSize - 3 && y >= 2 && y <= 4) ||
                         (x >= 2 && x <= 4 && y >= gridSize - 5 && y <= gridSize - 3);
          row.push(isOuter || isInner);
        } else {
          const charIndex = (x + y * gridSize) % value.length;
          const charCode = value.charCodeAt(charIndex);
          row.push((charCode + x + y) % 2 === 0);
        }
      }
      result.push(row);
    }
    return result;
  }, [value, gridSize]);

  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', padding: 2 }}>
      {grid.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.map((cell, x) => (
            <View
              key={x}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell ? '#000000' : '#FFFFFF',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

export default function LabelPrinting({
  visible,
  onClose,
  materials,
  selectedMaterialIds = [],
}: LabelPrintingProps) {
  const { colors } = useTheme();
  const [config, setConfig] = useState<LabelConfig>({
    size: 'medium',
    layout: '2-line',
    codeType: 'barcode',
    showBorder: true,
    showLogo: false,
    showDepartmentColor: true,
    fields: DEFAULT_FIELDS,
    copies: 1,
  });
  
  const [showSizeOptions, setShowSizeOptions] = useState(false);
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [showCodeOptions, setShowCodeOptions] = useState(false);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [customWidth, setCustomWidth] = useState('200');
  const [customHeight, setCustomHeight] = useState('100');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const selectedMaterials = useMemo(() => {
    if (selectedMaterialIds.length > 0) {
      return materials.filter(m => selectedMaterialIds.includes(m.id));
    }
    return materials.slice(0, 10);
  }, [materials, selectedMaterialIds]);

  const currentMaterial = selectedMaterials[previewIndex] || selectedMaterials[0];

  const getLabelDimensions = useCallback(() => {
    if (config.size === 'custom') {
      return {
        width: parseInt(customWidth) || 200,
        height: parseInt(customHeight) || 100,
      };
    }
    return {
      width: LABEL_SIZES[config.size].width,
      height: LABEL_SIZES[config.size].height,
    };
  }, [config.size, customWidth, customHeight]);

  const getEnabledFields = useCallback(() => {
    return config.fields
      .filter(f => f.enabled)
      .sort((a, b) => a.order - b.order);
  }, [config.fields]);

  const getFieldValue = useCallback((field: LabelField, material: LabelMaterial) => {
    switch (field.id) {
      case 'materialNumber': return material.materialNumber;
      case 'name': return material.name;
      case 'sku': return material.sku;
      case 'location': return material.location || '-';
      case 'vendor': return material.vendor || '-';
      case 'description': return material.description || '-';
      case 'unit': return material.unit_of_measure;
      case 'barcode': return material.barcode || material.materialNumber;
      default: return '-';
    }
  }, []);

  const getLayoutLineCount = useCallback(() => {
    switch (config.layout) {
      case '1-line': return 1;
      case '2-line': return 2;
      case '3-line': return 3;
      case 'custom': return getEnabledFields().length;
      default: return 2;
    }
  }, [config.layout, getEnabledFields]);

  const toggleField = useCallback((fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.map(f =>
        f.id === fieldId ? { ...f, enabled: !f.enabled } : f
      ),
    }));
  }, []);

  const moveFieldUp = useCallback((fieldId: string) => {
    setConfig(prev => {
      const fields = [...prev.fields];
      const index = fields.findIndex(f => f.id === fieldId);
      if (index > 0) {
        const currentOrder = fields[index].order;
        const prevIndex = fields.findIndex(f => f.order === currentOrder - 1);
        if (prevIndex >= 0) {
          fields[index].order = currentOrder - 1;
          fields[prevIndex].order = currentOrder;
        }
      }
      return { ...prev, fields };
    });
  }, []);

  const moveFieldDown = useCallback((fieldId: string) => {
    setConfig(prev => {
      const fields = [...prev.fields];
      const index = fields.findIndex(f => f.id === fieldId);
      const maxOrder = Math.max(...fields.map(f => f.order));
      if (fields[index].order < maxOrder) {
        const currentOrder = fields[index].order;
        const nextIndex = fields.findIndex(f => f.order === currentOrder + 1);
        if (nextIndex >= 0) {
          fields[index].order = currentOrder + 1;
          fields[nextIndex].order = currentOrder;
        }
      }
      return { ...prev, fields };
    });
  }, []);

  const handlePrint = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    const totalLabels = selectedMaterials.length * config.copies;
    Alert.alert(
      'Print Labels',
      `Ready to print ${totalLabels} label${totalLabels !== 1 ? 's' : ''} (${selectedMaterials.length} item${selectedMaterials.length !== 1 ? 's' : ''} × ${config.copies} cop${config.copies !== 1 ? 'ies' : 'y'}).\n\nSize: ${LABEL_SIZES[config.size].name}\nLayout: ${config.layout}\nCode: ${config.codeType}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Print', 
          onPress: () => {
            console.log('Printing labels:', {
              materials: selectedMaterials.map(m => m.materialNumber),
              config,
            });
            Alert.alert('Success', 'Print job sent to printer queue');
          }
        },
      ]
    );
  }, [selectedMaterials, config, scaleAnim]);

  const handleExport = useCallback(() => {
    Alert.alert(
      'Export Labels',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PDF', onPress: () => console.log('Export as PDF') },
        { text: 'PNG', onPress: () => console.log('Export as PNG') },
        { text: 'CSV Data', onPress: () => console.log('Export as CSV') },
      ]
    );
  }, []);

  const renderLabelPreview = (material: LabelMaterial, scale: number = 1) => {
    const dimensions = getLabelDimensions();
    const scaledWidth = dimensions.width * scale;
    const scaledHeight = dimensions.height * scale;
    const enabledFields = getEnabledFields();
    const lineCount = getLayoutLineCount();
    const deptColor = getDepartmentColor(material.inventoryDepartment);
    
    const displayFields = config.layout === 'custom' 
      ? enabledFields 
      : enabledFields.slice(0, lineCount);

    const codeSize = Math.min(scaledWidth * 0.35, scaledHeight * 0.6);
    const hasCode = config.codeType !== 'none';
    const textAreaWidth = hasCode ? scaledWidth * 0.6 : scaledWidth * 0.9;

    return (
      <View
        style={[
          styles.labelPreview,
          {
            width: scaledWidth,
            height: scaledHeight,
            backgroundColor: '#FFFFFF',
            borderWidth: config.showBorder ? 1 : 0,
            borderColor: config.showDepartmentColor ? deptColor : '#E5E7EB',
            borderLeftWidth: config.showDepartmentColor ? 4 : (config.showBorder ? 1 : 0),
            borderLeftColor: config.showDepartmentColor ? deptColor : '#E5E7EB',
          },
        ]}
      >
        <View style={styles.labelContent}>
          <View style={[styles.labelTextArea, { width: textAreaWidth }]}>
            {displayFields.map((field, index) => {
              const value = getFieldValue(field, material);
              const isFirst = index === 0;
              const fontSize = isFirst 
                ? Math.max(8, Math.min(14, scaledHeight * 0.15)) 
                : Math.max(6, Math.min(11, scaledHeight * 0.1));
              
              return (
                <View key={field.id} style={styles.labelFieldRow}>
                  {config.layout !== '1-line' && (
                    <Text 
                      style={[
                        styles.labelFieldLabel,
                        { 
                          fontSize: Math.max(5, fontSize * 0.7),
                          color: '#6B7280',
                        }
                      ]}
                      numberOfLines={1}
                    >
                      {field.label}:
                    </Text>
                  )}
                  <Text 
                    style={[
                      styles.labelFieldValue,
                      { 
                        fontSize,
                        fontWeight: isFirst ? '700' : '500',
                        color: '#111827',
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {value}
                  </Text>
                </View>
              );
            })}
          </View>

          {hasCode && (
            <View style={styles.labelCodeArea}>
              {(config.codeType === 'barcode' || config.codeType === 'both') && (
                <View style={styles.codeContainer}>
                  <BarcodeDisplay
                    value={material.barcode || material.materialNumber}
                    width={codeSize}
                    height={config.codeType === 'both' ? codeSize * 0.4 : codeSize * 0.7}
                    colors={{ text: '#000000' }}
                  />
                </View>
              )}
              {(config.codeType === 'qrcode' || config.codeType === 'both') && (
                <View style={styles.codeContainer}>
                  <QRCodeDisplay
                    value={material.materialNumber}
                    size={config.codeType === 'both' ? codeSize * 0.5 : codeSize * 0.8}
                    colors={{ text: '#000000' }}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {config.showDepartmentColor && (
          <View style={[styles.departmentBadge, { backgroundColor: deptColor }]}>
            <Text style={styles.departmentBadgeText}>
              {INVENTORY_DEPARTMENTS[material.inventoryDepartment]?.shortName || 'UNK'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Printer size={24} color={colors.primary} />
            <Text style={styles.headerTitle}>Label Printing</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Items</Text>
            <View style={styles.selectedCount}>
              <Package size={16} color={colors.primary} />
              <Text style={styles.selectedCountText}>
                {selectedMaterials.length} material{selectedMaterials.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preview</Text>
            <View style={styles.previewContainer}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                {currentMaterial && renderLabelPreview(currentMaterial, 1.2)}
              </Animated.View>
              
              {selectedMaterials.length > 1 && (
                <View style={styles.previewNav}>
                  <TouchableOpacity
                    style={[styles.previewNavButton, previewIndex === 0 && styles.previewNavButtonDisabled]}
                    onPress={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                    disabled={previewIndex === 0}
                  >
                    <ChevronUp size={20} color={previewIndex === 0 ? colors.textTertiary : colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.previewNavText}>
                    {previewIndex + 1} / {selectedMaterials.length}
                  </Text>
                  <TouchableOpacity
                    style={[styles.previewNavButton, previewIndex === selectedMaterials.length - 1 && styles.previewNavButtonDisabled]}
                    onPress={() => setPreviewIndex(Math.min(selectedMaterials.length - 1, previewIndex + 1))}
                    disabled={previewIndex === selectedMaterials.length - 1}
                  >
                    <ChevronDown size={20} color={previewIndex === selectedMaterials.length - 1 ? colors.textTertiary : colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Label Size</Text>
            <TouchableOpacity
              style={styles.optionSelector}
              onPress={() => setShowSizeOptions(!showSizeOptions)}
            >
              <View style={styles.optionSelectorLeft}>
                <Maximize2 size={18} color={colors.primary} />
                <View>
                  <Text style={styles.optionSelectorText}>{LABEL_SIZES[config.size].name}</Text>
                  <Text style={styles.optionSelectorSubtext}>{LABEL_SIZES[config.size].description}</Text>
                </View>
              </View>
              {showSizeOptions ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            
            {showSizeOptions && (
              <View style={styles.optionList}>
                {(Object.keys(LABEL_SIZES) as LabelSize[]).map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.optionItem, config.size === size && styles.optionItemSelected]}
                    onPress={() => {
                      setConfig(prev => ({ ...prev, size }));
                      setShowSizeOptions(false);
                    }}
                  >
                    <View style={styles.optionItemContent}>
                      <Text style={[styles.optionItemText, config.size === size && styles.optionItemTextSelected]}>
                        {LABEL_SIZES[size].name}
                      </Text>
                      <Text style={styles.optionItemSubtext}>{LABEL_SIZES[size].description}</Text>
                    </View>
                    {config.size === size && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
                
                {config.size === 'custom' && (
                  <View style={styles.customSizeInputs}>
                    <View style={styles.customSizeInput}>
                      <Text style={styles.customSizeLabel}>Width (px)</Text>
                      <TextInput
                        style={styles.customSizeTextInput}
                        value={customWidth}
                        onChangeText={setCustomWidth}
                        keyboardType="numeric"
                        placeholder="200"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <Text style={styles.customSizeSeparator}>×</Text>
                    <View style={styles.customSizeInput}>
                      <Text style={styles.customSizeLabel}>Height (px)</Text>
                      <TextInput
                        style={styles.customSizeTextInput}
                        value={customHeight}
                        onChangeText={setCustomHeight}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Layout</Text>
            <TouchableOpacity
              style={styles.optionSelector}
              onPress={() => setShowLayoutOptions(!showLayoutOptions)}
            >
              <View style={styles.optionSelectorLeft}>
                <FileText size={18} color={colors.primary} />
                <Text style={styles.optionSelectorText}>
                  {config.layout === '1-line' && '1 Line - Compact'}
                  {config.layout === '2-line' && '2 Lines - Standard'}
                  {config.layout === '3-line' && '3 Lines - Detailed'}
                  {config.layout === 'custom' && 'Custom Fields'}
                </Text>
              </View>
              {showLayoutOptions ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            
            {showLayoutOptions && (
              <View style={styles.optionList}>
                {(['1-line', '2-line', '3-line', 'custom'] as LabelLayout[]).map(layout => (
                  <TouchableOpacity
                    key={layout}
                    style={[styles.optionItem, config.layout === layout && styles.optionItemSelected]}
                    onPress={() => {
                      setConfig(prev => ({ ...prev, layout }));
                      setShowLayoutOptions(false);
                    }}
                  >
                    <Text style={[styles.optionItemText, config.layout === layout && styles.optionItemTextSelected]}>
                      {layout === '1-line' && '1 Line - Compact (Material # only)'}
                      {layout === '2-line' && '2 Lines - Standard (Material # + Name)'}
                      {layout === '3-line' && '3 Lines - Detailed (Material # + Name + SKU)'}
                      {layout === 'custom' && 'Custom - Choose your fields'}
                    </Text>
                    {config.layout === layout && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Code Type</Text>
            <TouchableOpacity
              style={styles.optionSelector}
              onPress={() => setShowCodeOptions(!showCodeOptions)}
            >
              <View style={styles.optionSelectorLeft}>
                {config.codeType === 'qrcode' ? (
                  <QrCode size={18} color={colors.primary} />
                ) : (
                  <Barcode size={18} color={colors.primary} />
                )}
                <Text style={styles.optionSelectorText}>
                  {config.codeType === 'barcode' && 'Barcode Only'}
                  {config.codeType === 'qrcode' && 'QR Code Only'}
                  {config.codeType === 'both' && 'Barcode + QR Code'}
                  {config.codeType === 'none' && 'No Code'}
                </Text>
              </View>
              {showCodeOptions ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            
            {showCodeOptions && (
              <View style={styles.optionList}>
                {(['barcode', 'qrcode', 'both', 'none'] as CodeType[]).map(codeType => (
                  <TouchableOpacity
                    key={codeType}
                    style={[styles.optionItem, config.codeType === codeType && styles.optionItemSelected]}
                    onPress={() => {
                      setConfig(prev => ({ ...prev, codeType }));
                      setShowCodeOptions(false);
                    }}
                  >
                    <View style={styles.optionItemWithIcon}>
                      {codeType === 'barcode' && <Barcode size={18} color={colors.textSecondary} />}
                      {codeType === 'qrcode' && <QrCode size={18} color={colors.textSecondary} />}
                      {codeType === 'both' && (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <Barcode size={16} color={colors.textSecondary} />
                          <QrCode size={16} color={colors.textSecondary} />
                        </View>
                      )}
                      {codeType === 'none' && <X size={18} color={colors.textSecondary} />}
                      <Text style={[styles.optionItemText, config.codeType === codeType && styles.optionItemTextSelected]}>
                        {codeType === 'barcode' && 'Barcode Only'}
                        {codeType === 'qrcode' && 'QR Code Only'}
                        {codeType === 'both' && 'Barcode + QR Code'}
                        {codeType === 'none' && 'No Code'}
                      </Text>
                    </View>
                    {config.codeType === codeType && <Check size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.fieldConfigHeader}
              onPress={() => setShowFieldConfig(!showFieldConfig)}
            >
              <View style={styles.optionSelectorLeft}>
                <Settings size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Field Configuration</Text>
              </View>
              {showFieldConfig ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            
            {showFieldConfig && (
              <View style={styles.fieldList}>
                {config.fields
                  .sort((a, b) => a.order - b.order)
                  .map(field => (
                    <View key={field.id} style={styles.fieldItem}>
                      <TouchableOpacity
                        style={[styles.fieldCheckbox, field.enabled && styles.fieldCheckboxEnabled]}
                        onPress={() => toggleField(field.id)}
                      >
                        {field.enabled && <Check size={14} color="#FFFFFF" />}
                      </TouchableOpacity>
                      <Text style={[styles.fieldLabel, !field.enabled && styles.fieldLabelDisabled]}>
                        {field.label}
                      </Text>
                      <View style={styles.fieldOrderButtons}>
                        <TouchableOpacity
                          style={styles.fieldOrderButton}
                          onPress={() => moveFieldUp(field.id)}
                        >
                          <ChevronUp size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.fieldOrderButton}
                          onPress={() => moveFieldDown(field.id)}
                        >
                          <ChevronDown size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options</Text>
            <View style={styles.optionToggles}>
              <TouchableOpacity
                style={styles.optionToggle}
                onPress={() => setConfig(prev => ({ ...prev, showBorder: !prev.showBorder }))}
              >
                <View style={[styles.optionToggleCheckbox, config.showBorder && styles.optionToggleCheckboxEnabled]}>
                  {config.showBorder && <Check size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.optionToggleText}>Show Border</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionToggle}
                onPress={() => setConfig(prev => ({ ...prev, showDepartmentColor: !prev.showDepartmentColor }))}
              >
                <View style={[styles.optionToggleCheckbox, config.showDepartmentColor && styles.optionToggleCheckboxEnabled]}>
                  {config.showDepartmentColor && <Check size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.optionToggleText}>Department Color Strip</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Copies</Text>
            <View style={styles.copiesControl}>
              <TouchableOpacity
                style={[styles.copiesButton, config.copies <= 1 && styles.copiesButtonDisabled]}
                onPress={() => setConfig(prev => ({ ...prev, copies: Math.max(1, prev.copies - 1) }))}
                disabled={config.copies <= 1}
              >
                <Minus size={20} color={config.copies <= 1 ? colors.textTertiary : colors.primary} />
              </TouchableOpacity>
              <View style={styles.copiesValue}>
                <Text style={styles.copiesValueText}>{config.copies}</Text>
                <Text style={styles.copiesValueLabel}>per item</Text>
              </View>
              <TouchableOpacity
                style={styles.copiesButton}
                onPress={() => setConfig(prev => ({ ...prev, copies: prev.copies + 1 }))}
              >
                <Plus size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.copiesTotal}>
              Total: {selectedMaterials.length * config.copies} label{selectedMaterials.length * config.copies !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
                <Download size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>Export</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setConfig(prev => ({
                  ...prev,
                  size: 'medium',
                  layout: '2-line',
                  codeType: 'barcode',
                  showBorder: true,
                  showDepartmentColor: true,
                  copies: 1,
                  fields: DEFAULT_FIELDS,
                }))}
              >
                <RotateCcw size={18} color={colors.primary} />
                <Text style={styles.actionButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
            <Printer size={20} color="#FFFFFF" />
            <Text style={styles.printButtonText}>Print Labels</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  selectedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  previewContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelPreview: {
    padding: 8,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  labelContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelTextArea: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  labelFieldRow: {
    marginBottom: 2,
  },
  labelFieldLabel: {
    fontWeight: '500',
  },
  labelFieldValue: {
    fontWeight: '600',
  },
  labelCodeArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeContainer: {
    marginVertical: 2,
  },
  departmentBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  departmentBadgeText: {
    fontSize: 6,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  previewNavButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  previewNavButtonDisabled: {
    opacity: 0.5,
  },
  previewNavText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  optionSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionSelectorText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  optionSelectorSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionList: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionItemContent: {
    flex: 1,
  },
  optionItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  optionItemTextSelected: {
    color: colors.primary,
  },
  optionItemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionItemWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customSizeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  customSizeInput: {
    flex: 1,
  },
  customSizeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  customSizeTextInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customSizeSeparator: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 16,
  },
  fieldConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  fieldList: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCheckboxEnabled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12,
  },
  fieldLabelDisabled: {
    color: colors.textTertiary,
  },
  fieldOrderButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  fieldOrderButton: {
    padding: 4,
  },
  optionToggles: {
    gap: 12,
  },
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionToggleCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionToggleCheckboxEnabled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  copiesControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copiesButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiesButtonDisabled: {
    backgroundColor: colors.border,
  },
  copiesValue: {
    alignItems: 'center',
  },
  copiesValueText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  copiesValueLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  copiesTotal: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  printButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
