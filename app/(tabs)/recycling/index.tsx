import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';

import {
  Recycle,
  Plus,
  Lightbulb,
  Battery,
  Package,
  FileText,
  Printer,
  Scale,
  X,
  TrendingUp,
  Sparkles,
  Droplet,
  Wrench,
  Wind,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseRecycling, type RecyclingCategory, type CategoryAggregation } from '@/hooks/useSupabaseRecycling';


const BULB_SIZES = ['2ft', '4ft', '8ft', 'U-Tube', 'Circular', 'CFL', 'HID', 'LED Tube'];
const BULB_TYPES = ['Fluorescent', 'LED', 'HID', 'Mercury Vapor', 'Sodium', 'Metal Halide', 'CFL'];
const BATTERY_TYPES = ['Lead-Acid', 'Lithium-Ion', 'NiCad', 'NiMH', 'Alkaline', 'Button Cell', 'Car Battery', 'UPS Battery'];
const METAL_TYPES = ['Steel', 'Aluminum', 'Copper', 'Brass', 'Stainless Steel', 'Iron', 'Mixed Metals'];
const CARTRIDGE_TYPES = ['Toner', 'Ink Jet', 'Laser', 'Drum Unit', 'Fuser', 'Transfer Belt'];
const OIL_TYPES = ['Motor Oil', 'Hydraulic Oil', 'Gear Oil', 'Transmission Fluid', 'Cutting Oil', 'Compressor Oil', 'Mixed Used Oil'];
const GREASE_TYPES = ['Lithium Grease', 'Calcium Grease', 'Synthetic Grease', 'Food Grade Grease', 'High-Temp Grease', 'Multi-Purpose Grease', 'Mixed Lubricants'];
const AEROSOL_TYPES = ['Paint', 'Lubricant', 'Cleaner/Degreaser', 'Pesticide', 'Adhesive', 'Starting Fluid', 'Refrigerant', 'Other Aerosol'];
const SOLVENT_TYPES = ['Acetone', 'MEK', 'Toluene', 'Xylene', 'Mineral Spirits', 'Lacquer Thinner', 'Degreaser', 'Parts Washer Solvent', 'Mixed Solvents'];
const CONTAINER_TYPES = ['55-Gallon Drum', '30-Gallon Drum', '5-Gallon Pail', 'Tote (275-330 gal)', 'Bulk Tank', 'Other'];
const DISPOSAL_METHODS = ['Recycling/Re-refining', 'Fuel Blending', 'Incineration', 'Licensed Hauler Pickup', 'On-site Treatment'];
const HAZARD_CLASSES = ['Flammable', 'Corrosive', 'Toxic', 'Reactive', 'Non-Hazardous', 'Unknown'];



const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Lightbulb,
  Battery,
  Package,
  FileText,
  Printer,
  Hammer: Scale,
  Droplet,
  Wrench,
  Wind,
  FlaskConical,
};

export default function RecyclingScreen() {
  const { colors } = useTheme();
  const {
    categories,
    categoryAggregations,
    metrics,
    createBulb,
    createBattery,
    createMetal,
    createCardboard,
    createPaper,
    createToner,
    createOil,
    createGrease,
    createAerosol,
    createSolvent,
    refetch,
  } = useSupabaseRecycling();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RecyclingCategory | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number>>({});

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);



  const handleAddRecord = useCallback((category: RecyclingCategory) => {
    setSelectedCategory(category);
    setFormData({});
    setShowAddModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedCategory) return;

    try {
      switch (selectedCategory) {
        case 'bulb':
          if (!formData.bulbSize || !formData.bulbType || !formData.trackingNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createBulb({
            date_shipped: new Date().toISOString().split('T')[0],
            bulb_size: formData.bulbSize as string,
            bulb_type: formData.bulbType as string,
            quantity: Number(formData.quantity) || 1,
            tracking_number: formData.trackingNumber as string,
            certificate_number: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'battery':
          if (!formData.batteryType || !formData.trackingNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createBattery({
            date: new Date().toISOString().split('T')[0],
            battery_type: formData.batteryType as string,
            weight: Number(formData.weight) || null,
            quantity: Number(formData.quantity) || 1,
            pickup_delivery: 'pickup',
            vendor_name: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'metal':
          if (!formData.metalType || !formData.trackingNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createMetal({
            date: new Date().toISOString().split('T')[0],
            metal_type: formData.metalType as string,
            weight: Number(formData.weight) || 0,
            receipt_number: null,
            amount_received: 0,
            vendor_name: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'cardboard':
          if (!formData.weight || !formData.trackingNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createCardboard({
            date_picked_up: new Date().toISOString().split('T')[0],
            weight: Number(formData.weight) || 0,
            receipt_number: null,
            vendor_name: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'paper':
          if (!formData.weight || !formData.trackingNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createPaper({
            date_picked_up: new Date().toISOString().split('T')[0],
            weight: Number(formData.weight) || 0,
            company_name: null,
            certificate_number: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'toner':
          if (!formData.cartridgeType || !formData.trackingNumber) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createToner({
            date_shipped: new Date().toISOString().split('T')[0],
            cartridge_type: formData.cartridgeType as string,
            quantity: Number(formData.quantity) || 1,
            tracking_number: formData.trackingNumber as string,
            certificate_number: null,
            vendor_name: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'oil':
          if (!formData.oilType || !formData.quantityGallons || !formData.disposalMethod) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createOil({
            date: new Date().toISOString().split('T')[0],
            oil_type: formData.oilType as string,
            quantity_gallons: Number(formData.quantityGallons) || 0,
            container_type: (formData.containerType as string) || '55-Gallon Drum',
            manifest_number: (formData.manifestNumber as string) || null,
            vendor_name: (formData.vendorName as string) || null,
            disposal_method: formData.disposalMethod as string,
            certificate_number: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'grease':
          if (!formData.greaseType || !formData.weight || !formData.disposalMethod) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createGrease({
            date: new Date().toISOString().split('T')[0],
            grease_type: formData.greaseType as string,
            weight: Number(formData.weight) || 0,
            container_type: (formData.containerType as string) || '5-Gallon Pail',
            manifest_number: (formData.manifestNumber as string) || null,
            vendor_name: (formData.vendorName as string) || null,
            disposal_method: formData.disposalMethod as string,
            certificate_number: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'aerosol':
          if (!formData.aerosolType || !formData.quantity || !formData.hazardClass) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createAerosol({
            date: new Date().toISOString().split('T')[0],
            aerosol_type: formData.aerosolType as string,
            quantity: Number(formData.quantity) || 0,
            hazard_class: formData.hazardClass as string,
            manifest_number: (formData.manifestNumber as string) || null,
            vendor_name: (formData.vendorName as string) || null,
            disposal_method: (formData.disposalMethod as string) || 'Licensed Hauler Pickup',
            certificate_number: null,
            notes: (formData.notes as string) || null,
          });
          break;
        case 'solvent':
          if (!formData.solventType || !formData.quantityGallons || !formData.hazardClass) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
          }
          await createSolvent({
            date: new Date().toISOString().split('T')[0],
            solvent_type: formData.solventType as string,
            quantity_gallons: Number(formData.quantityGallons) || 0,
            hazard_class: formData.hazardClass as string,
            manifest_number: (formData.manifestNumber as string) || null,
            vendor_name: (formData.vendorName as string) || null,
            disposal_method: (formData.disposalMethod as string) || 'Licensed Hauler Pickup',
            certificate_number: null,
            notes: (formData.notes as string) || null,
          });
          break;
      }
      setShowAddModal(false);
      Alert.alert('Success', 'Record added successfully');
    } catch (error) {
      console.error('[RecyclingScreen] Error creating record:', error);
      Alert.alert('Error', 'Failed to add record');
    }
  }, [selectedCategory, formData, createBulb, createBattery, createMetal, createCardboard, createPaper, createToner, createOil, createGrease, createAerosol, createSolvent]);

  const totalWeight = metrics.totalMetalWeight + metrics.totalCardboardWeight + metrics.totalPaperWeight;
  const totalItems = metrics.bulbsShipped + metrics.totalBatteries + metrics.totalTonerCartridges;
  const totalRecords = categoryAggregations.reduce((sum, cat) => sum + cat.recordCount, 0);
  const totalCertificates = categoryAggregations.reduce((sum, cat) => sum + cat.certificateCount, 0);

  const stats = [
    { label: 'Total Weight (lbs)', value: totalWeight.toLocaleString(), icon: Scale, color: '#10B981' },
    { label: 'Items Recycled', value: totalItems.toLocaleString(), icon: Recycle, color: '#3B82F6' },
    { label: 'Total Records', value: totalRecords.toString(), icon: Package, color: '#F59E0B' },
    { label: 'Certificates', value: totalCertificates.toString(), icon: TrendingUp, color: '#8B5CF6' },
  ];

  const getCategoryStatLabel = (agg: CategoryAggregation): string => {
    if (agg.category === 'metal' || agg.category === 'cardboard' || agg.category === 'paper') {
      return `${agg.totalWeight.toLocaleString()} lbs`;
    }
    return `${agg.totalQuantity.toLocaleString()} items`;
  };

  const renderDashboard = () => (
    <>
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
          <Sparkles size={32} color="#8B5CF6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Recycling Hub</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track recycling, waste disposal, and environmental compliance
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <View 
              key={index} 
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                <IconComponent size={18} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recycling Categories</Text>

      <View style={styles.categoriesGrid}>
        {categoryAggregations.map((agg) => {
          const IconComponent = ICON_MAP[agg.icon] || Package;
          return (
            <TouchableOpacity
              key={agg.category}
              style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => handleAddRecord(agg.category)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: agg.color + '15' }]}>
                <IconComponent size={24} color={agg.color} />
              </View>
              <Text style={[styles.categoryName, { color: colors.text }]}>{agg.label}</Text>
              <View style={styles.categoryStats}>
                <Text style={[styles.categoryStatValue, { color: agg.color }]}>
                  {agg.recordCount}
                </Text>
                <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                  records
                </Text>
              </View>
              {agg.recordCount > 0 && (
                <Text style={[styles.categoryTotal, { color: colors.textSecondary }]}>
                  {getCategoryStatLabel(agg)}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: agg.color }]}
                onPress={() => handleAddRecord(agg.category)}
              >
                <Plus size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {renderDashboard()}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add {selectedCategory ? categories.find(c => c.key === selectedCategory)?.label : ''} Record
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCategory === 'bulb' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Bulb Size *</Text>
                <View style={styles.optionsRow}>
                  {BULB_SIZES.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.bulbSize === size && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, bulbSize: size })}
                    >
                      <Text style={[styles.optionText, { color: formData.bulbSize === size ? '#FFFFFF' : colors.text }]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Bulb Type *</Text>
                <View style={styles.optionsRow}>
                  {BULB_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.bulbType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, bulbType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.bulbType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.quantity?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'battery' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Battery Type *</Text>
                <View style={styles.optionsRow}>
                  {BATTERY_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.batteryType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, batteryType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.batteryType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Weight (lbs)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.weight?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.quantity?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'metal' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Metal Type *</Text>
                <View style={styles.optionsRow}>
                  {METAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.metalType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, metalType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.metalType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Weight (lbs) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.weight?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.description?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Item description"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {(selectedCategory === 'cardboard' || selectedCategory === 'paper') && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Weight (lbs) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.weight?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {selectedCategory === 'cardboard' ? 'Bale Count' : 'Box Count'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={(selectedCategory === 'cardboard' ? formData.baleCount : formData.boxCount)?.toString() || ''}
                  onChangeText={(text) => setFormData({ 
                    ...formData, 
                    [selectedCategory === 'cardboard' ? 'baleCount' : 'boxCount']: text 
                  })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'toner' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Cartridge Type *</Text>
                <View style={styles.optionsRow}>
                  {CARTRIDGE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.cartridgeType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, cartridgeType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.cartridgeType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.quantity?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'oil' && (
              <>
                <View style={[styles.envWarningBanner, { backgroundColor: '#1A1A1A' + '15' }]}>
                  <AlertTriangle size={16} color="#1A1A1A" />
                  <Text style={[styles.envWarningText, { color: '#1A1A1A' }]}>Environmental Waste - Proper disposal required</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Oil Type *</Text>
                <View style={styles.optionsRow}>
                  {OIL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.oilType === type && { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
                      ]}
                      onPress={() => setFormData({ ...formData, oilType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.oilType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity (Gallons) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.quantityGallons?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, quantityGallons: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Container Type</Text>
                <View style={styles.optionsRow}>
                  {CONTAINER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.containerType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, containerType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.containerType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Disposal Method *</Text>
                <View style={styles.optionsRow}>
                  {DISPOSAL_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.disposalMethod === method && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, disposalMethod: method })}
                    >
                      <Text style={[styles.optionText, { color: formData.disposalMethod === method ? '#FFFFFF' : colors.text }]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Manifest Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.manifestNumber?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, manifestNumber: text })}
                  placeholder="EPA manifest number"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Vendor/Hauler</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.vendorName?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, vendorName: text })}
                  placeholder="Disposal company name"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'grease' && (
              <>
                <View style={[styles.envWarningBanner, { backgroundColor: '#6B7280' + '15' }]}>
                  <AlertTriangle size={16} color="#6B7280" />
                  <Text style={[styles.envWarningText, { color: '#6B7280' }]}>Environmental Waste - Proper disposal required</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Grease/Lubricant Type *</Text>
                <View style={styles.optionsRow}>
                  {GREASE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.greaseType === type && { backgroundColor: '#6B7280', borderColor: '#6B7280' },
                      ]}
                      onPress={() => setFormData({ ...formData, greaseType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.greaseType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Weight (lbs) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.weight?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Container Type</Text>
                <View style={styles.optionsRow}>
                  {CONTAINER_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.containerType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, containerType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.containerType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Disposal Method *</Text>
                <View style={styles.optionsRow}>
                  {DISPOSAL_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.disposalMethod === method && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, disposalMethod: method })}
                    >
                      <Text style={[styles.optionText, { color: formData.disposalMethod === method ? '#FFFFFF' : colors.text }]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Manifest Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.manifestNumber?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, manifestNumber: text })}
                  placeholder="EPA manifest number"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Vendor/Hauler</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.vendorName?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, vendorName: text })}
                  placeholder="Disposal company name"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'aerosol' && (
              <>
                <View style={[styles.envWarningBanner, { backgroundColor: '#EF4444' + '15' }]}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <Text style={[styles.envWarningText, { color: '#EF4444' }]}>Hazardous Waste - Handle with care</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Aerosol Type *</Text>
                <View style={styles.optionsRow}>
                  {AEROSOL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.aerosolType === type && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                      ]}
                      onPress={() => setFormData({ ...formData, aerosolType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.aerosolType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity (cans) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.quantity?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Class *</Text>
                <View style={styles.optionsRow}>
                  {HAZARD_CLASSES.map((hc) => (
                    <TouchableOpacity
                      key={hc}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.hazardClass === hc && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                      ]}
                      onPress={() => setFormData({ ...formData, hazardClass: hc })}
                    >
                      <Text style={[styles.optionText, { color: formData.hazardClass === hc ? '#FFFFFF' : colors.text }]}>
                        {hc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Disposal Method</Text>
                <View style={styles.optionsRow}>
                  {DISPOSAL_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.disposalMethod === method && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, disposalMethod: method })}
                    >
                      <Text style={[styles.optionText, { color: formData.disposalMethod === method ? '#FFFFFF' : colors.text }]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Manifest Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.manifestNumber?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, manifestNumber: text })}
                  placeholder="EPA manifest number"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Vendor/Hauler</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.vendorName?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, vendorName: text })}
                  placeholder="Disposal company name"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {selectedCategory === 'solvent' && (
              <>
                <View style={[styles.envWarningBanner, { backgroundColor: '#F59E0B' + '15' }]}>
                  <AlertTriangle size={16} color="#F59E0B" />
                  <Text style={[styles.envWarningText, { color: '#F59E0B' }]}>Hazardous Waste - Follow RCRA guidelines</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Solvent/Chemical Type *</Text>
                <View style={styles.optionsRow}>
                  {SOLVENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.solventType === type && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                      ]}
                      onPress={() => setFormData({ ...formData, solventType: type })}
                    >
                      <Text style={[styles.optionText, { color: formData.solventType === type ? '#FFFFFF' : colors.text }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Quantity (Gallons) *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.quantityGallons?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, quantityGallons: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Class *</Text>
                <View style={styles.optionsRow}>
                  {HAZARD_CLASSES.map((hc) => (
                    <TouchableOpacity
                      key={hc}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.hazardClass === hc && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
                      ]}
                      onPress={() => setFormData({ ...formData, hazardClass: hc })}
                    >
                      <Text style={[styles.optionText, { color: formData.hazardClass === hc ? '#FFFFFF' : colors.text }]}>
                        {hc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Disposal Method</Text>
                <View style={styles.optionsRow}>
                  {DISPOSAL_METHODS.map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.optionButton,
                        { borderColor: colors.border },
                        formData.disposalMethod === method && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setFormData({ ...formData, disposalMethod: method })}
                    >
                      <Text style={[styles.optionText, { color: formData.disposalMethod === method ? '#FFFFFF' : colors.text }]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: colors.text }]}>Manifest Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.manifestNumber?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, manifestNumber: text })}
                  placeholder="EPA manifest number"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: colors.text }]}>Vendor/Hauler</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  value={formData.vendorName?.toString() || ''}
                  onChangeText={(text) => setFormData({ ...formData, vendorName: text })}
                  placeholder="Disposal company name"
                  placeholderTextColor={colors.textSecondary}
                />
              </>
            )}

            {!['oil', 'grease', 'aerosol', 'solvent'].includes(selectedCategory || '') && (
              <>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Tracking Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.trackingNumber?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, trackingNumber: text })}
              placeholder="Enter tracking number"
              placeholderTextColor={colors.textSecondary}
            />

              </>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={formData.notes?.toString() || ''}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Additional notes"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Add Record</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  modulesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  moduleCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    minHeight: 130,
  },
  moduleHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  categoriesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  categoryCard: {
    width: '30%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 100,
    minHeight: 160,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  categoryStats: {
    flexDirection: 'row' as const,
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 2,
  },
  categoryStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  categoryStatLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  categoryTotal: {
    fontSize: 10,
    marginBottom: 8,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top' as const,
  },
  optionsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  envWarningBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  envWarningText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
});
