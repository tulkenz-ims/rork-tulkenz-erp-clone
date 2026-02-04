import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  ChevronDown,
  Package,
  Wrench,
  Building2,
  Calendar,
  DollarSign,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { getDepartmentColor, getDepartmentName } from '@/constants/organizationCodes';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { useProcurementVendorsQuery, useCreatePurchaseRequest, useSubmitPurchaseRequest, PurchaseRequestLineItem } from '@/hooks/useSupabaseProcurement';
import DatePickerModal from '@/components/DatePickerModal';
import { Tables } from '@/lib/supabase';

type Material = Tables['materials'];
type Vendor = Tables['procurement_vendors'];

export type ItemType = 'stock' | 'non_stock' | 'capex';

export interface PurchaseLineItem {
  id: string;
  itemType: ItemType;
  materialId?: string;
  materialNumber: string;
  description: string;
  vendorSku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes?: string;
}

interface PurchaseRequestFormProps {
  visible: boolean;
  onClose: () => void;
  departmentCode: string | null;
  onSuccess?: (requestNumber: string) => void;
}

const ITEM_TYPE_OPTIONS: { value: ItemType; label: string; color: string; icon: React.ReactNode }[] = [
  { value: 'stock', label: 'Stock Material', color: '#10B981', icon: <Package size={18} color="#10B981" /> },
  { value: 'non_stock', label: 'Non-Stock Material', color: '#3B82F6', icon: <ShoppingCart size={18} color="#3B82F6" /> },
  { value: 'capex', label: 'CapEx / Project', color: '#F59E0B', icon: <Wrench size={18} color="#F59E0B" /> },
];

let nsCounter = 1;
let capexCounter = 1;

function generateMaterialNumber(type: ItemType): string {
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  if (type === 'non_stock') {
    return `NS-${timestamp}${(nsCounter++).toString().padStart(3, '0')}`;
  } else if (type === 'capex') {
    return `CAPEX-${timestamp}${(capexCounter++).toString().padStart(3, '0')}`;
  }
  return '';
}

export default function PurchaseRequestForm({
  visible,
  onClose,
  departmentCode,
  onSuccess,
}: PurchaseRequestFormProps) {
  const { colors } = useTheme();
  const { user, userProfile } = useUser();

  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [neededByDate, setNeededByDate] = useState('');
  const [notes, setNotes] = useState('');

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [currentItemType, setCurrentItemType] = useState<ItemType>('stock');
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [currentMaterialNumber, setCurrentMaterialNumber] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentVendorSku, setCurrentVendorSku] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState('');
  const [currentUnitPrice, setCurrentUnitPrice] = useState('');
  const [currentNotes, setCurrentNotes] = useState('');
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  const { data: materials = [], isLoading: materialsLoading } = useMaterialsQuery({ enabled: visible });
  const { data: vendors = [], isLoading: vendorsLoading } = useProcurementVendorsQuery({ activeOnly: true, enabled: visible });

  const createPurchaseRequest = useCreatePurchaseRequest({
    onSuccess: (data) => {
      console.log('[PurchaseRequestForm] Request created:', data.request_number);
    },
    onError: (error) => {
      console.error('[PurchaseRequestForm] Error creating request:', error);
      Alert.alert('Error', 'Failed to create purchase request. Please try again.');
    },
  });

  const submitPurchaseRequest = useSubmitPurchaseRequest({
    onSuccess: (data) => {
      console.log('[PurchaseRequestForm] Request submitted:', data.request_number);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Request Submitted',
        `Your purchase request ${data.request_number} has been submitted for review.`,
        [{ text: 'OK' }]
      );
      onSuccess?.(data.request_number);
      handleClose();
    },
    onError: (error) => {
      console.error('[PurchaseRequestForm] Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit purchase request. Please try again.');
    },
  });

  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery) return materials.slice(0, 50);
    const query = materialSearchQuery.toLowerCase();
    return materials.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.sku?.toLowerCase().includes(query) ||
      m.description?.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [materials, materialSearchQuery]);

  const filteredVendors = useMemo(() => {
    if (!vendorSearchQuery) return vendors;
    const query = vendorSearchQuery.toLowerCase();
    return vendors.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.vendor_code?.toLowerCase().includes(query)
    );
  }, [vendors, vendorSearchQuery]);

  const totalEstimated = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }, [lineItems]);

  const handleClose = useCallback(() => {
    setLineItems([]);
    setSelectedVendorId(null);
    setSelectedVendor(null);
    setPriority('normal');
    setNeededByDate('');
    setNotes('');
    resetCurrentItem();
    onClose();
  }, [onClose]);

  const resetCurrentItem = useCallback(() => {
    setCurrentItemType('stock');
    setCurrentMaterialId(null);
    setCurrentMaterialNumber('');
    setCurrentDescription('');
    setCurrentVendorSku('');
    setCurrentQuantity('');
    setCurrentUnitPrice('');
    setCurrentNotes('');
    setMaterialSearchQuery('');
  }, []);

  const handleItemTypeSelect = useCallback((type: ItemType) => {
    Haptics.selectionAsync();
    setCurrentItemType(type);
    setCurrentMaterialId(null);
    setCurrentMaterialNumber('');
    setCurrentDescription('');

    if (type === 'non_stock' || type === 'capex') {
      setCurrentMaterialNumber(generateMaterialNumber(type));
    }
  }, []);

  const handleMaterialSelect = useCallback((material: Material) => {
    Haptics.selectionAsync();
    setCurrentMaterialId(material.id);
    setCurrentMaterialNumber(material.sku || '');
    setCurrentDescription(material.name);
    setCurrentUnitPrice(material.unit_cost?.toString() || '');
    setShowMaterialPicker(false);
    setMaterialSearchQuery('');
  }, []);

  const handleVendorSelect = useCallback((vendor: Vendor) => {
    Haptics.selectionAsync();
    setSelectedVendorId(vendor.id);
    setSelectedVendor(vendor);
    setShowVendorPicker(false);
    setVendorSearchQuery('');
  }, []);

  const handleAddLineItem = useCallback(() => {
    if (!currentDescription.trim()) {
      Alert.alert('Missing Information', 'Please enter an item description.');
      return;
    }

    const qty = parseInt(currentQuantity, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Missing Information', 'Please enter a valid quantity.');
      return;
    }

    const price = parseFloat(currentUnitPrice);
    if (!price || price <= 0) {
      Alert.alert('Missing Information', 'Please enter a valid unit price.');
      return;
    }

    const newItem: PurchaseLineItem = {
      id: `item-${Date.now()}`,
      itemType: currentItemType,
      materialId: currentMaterialId || undefined,
      materialNumber: currentMaterialNumber || generateMaterialNumber(currentItemType),
      description: currentDescription.trim(),
      vendorSku: currentVendorSku.trim() || undefined,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
      notes: currentNotes.trim() || undefined,
    };

    setLineItems(prev => [...prev, newItem]);
    resetCurrentItem();
    setShowAddItemModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentItemType, currentMaterialId, currentMaterialNumber, currentDescription, currentVendorSku, currentQuantity, currentUnitPrice, currentNotes]);

  const handleRemoveLineItem = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLineItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const handleSubmitRequest = useCallback(async () => {
    if (lineItems.length === 0) {
      Alert.alert('Missing Items', 'Please add at least one line item to the request.');
      return;
    }

    if (!selectedVendor) {
      Alert.alert('Missing Vendor', 'Please select a vendor for this request.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const requestLineItems: PurchaseRequestLineItem[] = lineItems.map((item, index) => ({
      line_id: item.id,
      line_number: index + 1,
      material_id: item.materialId,
      material_sku: item.materialNumber,
      description: item.description,
      quantity: item.quantity,
      estimated_unit_price: item.unitPrice,
      estimated_total: item.total,
      suggested_vendor_id: selectedVendor.id,
      suggested_vendor_name: selectedVendor.name,
      is_stock: item.itemType === 'stock',
      notes: item.notes,
    }));

    try {
      const newRequest = await createPurchaseRequest.mutateAsync({
        requester_id: user?.id || userProfile?.id || 'emp-001',
        requester_name: user 
          ? `${user.first_name} ${user.last_name}`
          : userProfile 
            ? `${userProfile.first_name} ${userProfile.last_name}`
            : 'Current User',
        department_id: departmentCode || undefined,
        department_name: departmentCode ? getDepartmentName(departmentCode) : undefined,
        priority,
        needed_by_date: neededByDate || undefined,
        notes: notes.trim() || undefined,
        line_items: requestLineItems,
      });

      await submitPurchaseRequest.mutateAsync(newRequest.id);
    } catch (error) {
      console.error('[PurchaseRequestForm] Error in submit flow:', error);
    }
  }, [lineItems, selectedVendor, departmentCode, priority, neededByDate, notes, user, userProfile, createPurchaseRequest, submitPurchaseRequest]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getItemTypeColor = (type: ItemType) => {
    return ITEM_TYPE_OPTIONS.find(t => t.value === type)?.color || '#6B7280';
  };

  

  const isSubmitting = createPurchaseRequest.isPending || submitPurchaseRequest.isPending;

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <ShoppingCart size={20} color="#8B5CF6" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Purchase Request</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {departmentCode && (
              <View style={[styles.deptBanner, { backgroundColor: getDepartmentColor(departmentCode) + '15' }]}>
                <View style={[styles.deptDot, { backgroundColor: getDepartmentColor(departmentCode) }]} />
                <Text style={[styles.deptText, { color: getDepartmentColor(departmentCode) }]}>
                  {getDepartmentName(departmentCode)}
                </Text>
              </View>
            )}

            <View style={[styles.infoBanner, { backgroundColor: '#8B5CF615' }]}>
              <ShoppingCart size={18} color="#8B5CF6" />
              <Text style={[styles.infoBannerText, { color: '#8B5CF6' }]}>
                Create a purchase request with multiple line items. Select a vendor first, then add items.
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vendor *</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowVendorPicker(true)}
            >
              <View style={styles.selectButtonContent}>
                <Building2 size={18} color={selectedVendor ? colors.text : colors.textTertiary} />
                <Text style={[styles.selectButtonText, { color: selectedVendor ? colors.text : colors.textTertiary }]}>
                  {selectedVendor ? selectedVendor.name : 'Select a vendor...'}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.lineItemsSection}>
              <View style={styles.lineItemsHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  Line Items ({lineItems.length})
                </Text>
                <TouchableOpacity
                  style={[styles.addItemButton, { backgroundColor: '#8B5CF6' }]}
                  onPress={() => setShowAddItemModal(true)}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {lineItems.length === 0 ? (
                <View style={[styles.emptyItems, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Package size={32} color={colors.textTertiary} />
                  <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
                    No items added yet. Tap Add Item to start.
                  </Text>
                </View>
              ) : (
                <View style={styles.lineItemsList}>
                  {lineItems.map((item, index) => (
                    <View
                      key={item.id}
                      style={[styles.lineItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <View style={styles.lineItemHeader}>
                        <View style={styles.lineItemTitleRow}>
                          <Text style={[styles.lineItemNumber, { color: colors.textSecondary }]}>
                            #{index + 1}
                          </Text>
                          <View style={[styles.itemTypeBadge, { backgroundColor: getItemTypeColor(item.itemType) + '20' }]}>
                            <Text style={[styles.itemTypeBadgeText, { color: getItemTypeColor(item.itemType) }]}>
                              {item.itemType === 'stock' ? 'Stock' : item.itemType === 'non_stock' ? 'Non-Stock' : 'CapEx'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.removeItemButton, { backgroundColor: colors.error + '15' }]}
                          onPress={() => handleRemoveLineItem(item.id)}
                        >
                          <Trash2 size={14} color={colors.error} />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.lineItemMaterial, { color: colors.textSecondary }]}>
                        {item.materialNumber}
                      </Text>
                      <Text style={[styles.lineItemDescription, { color: colors.text }]}>
                        {item.description}
                      </Text>

                      <View style={styles.lineItemFooter}>
                        <Text style={[styles.lineItemQty, { color: colors.textSecondary }]}>
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </Text>
                        <Text style={[styles.lineItemTotal, { color: colors.text }]}>
                          {formatCurrency(item.total)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {lineItems.length > 0 && (
              <View style={[styles.totalBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Estimated Total:</Text>
                <Text style={[styles.totalValue, { color: '#8B5CF6' }]}>{formatCurrency(totalEstimated)}</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Needed By Date (Optional)</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.selectButtonContent}>
                <Calendar size={18} color={neededByDate ? colors.text : colors.textTertiary} />
                <Text style={[styles.selectButtonText, { color: neededByDate ? colors.text : colors.textTertiary }]}>
                  {neededByDate 
                    ? new Date(neededByDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Select date...'
                  }
                </Text>
              </View>
              {neededByDate ? (
                <TouchableOpacity onPress={() => setNeededByDate('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {(['low', 'normal', 'high', 'urgent'] as const).map(p => {
                const pColor = p === 'low' ? '#6B7280' : p === 'normal' ? '#3B82F6' : p === 'high' ? '#F59E0B' : '#EF4444';
                const isActive = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      {
                        backgroundColor: isActive ? pColor : colors.surface,
                        borderColor: pColor,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPriority(p);
                    }}
                  >
                    <Text style={[styles.priorityButtonText, { color: isActive ? '#fff' : pColor }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes (Optional)</Text>
            <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                placeholder="Any additional details or justification..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: lineItems.length > 0 && selectedVendor && !isSubmitting ? '#8B5CF6' : colors.border,
                },
              ]}
              onPress={handleSubmitRequest}
              disabled={lineItems.length === 0 || !selectedVendor || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ShoppingCart size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Purchase Request</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showVendorPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Vendor</Text>
              <TouchableOpacity onPress={() => { setShowVendorPicker(false); setVendorSearchQuery(''); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search vendors..."
                placeholderTextColor={colors.textTertiary}
                value={vendorSearchQuery}
                onChangeText={setVendorSearchQuery}
              />
              {vendorSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setVendorSearchQuery('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {vendorsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : filteredVendors.length === 0 ? (
                <View style={styles.emptyPickerState}>
                  <Building2 size={32} color={colors.textTertiary} />
                  <Text style={[styles.emptyPickerText, { color: colors.textSecondary }]}>
                    No vendors found
                  </Text>
                </View>
              ) : (
                filteredVendors.map(vendor => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={[
                      styles.pickerItem,
                      { backgroundColor: selectedVendorId === vendor.id ? colors.primary + '15' : colors.background },
                    ]}
                    onPress={() => handleVendorSelect(vendor)}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text style={[styles.pickerItemTitle, { color: colors.text }]}>{vendor.name}</Text>
                      {vendor.vendor_code && (
                        <Text style={[styles.pickerItemSubtitle, { color: colors.textSecondary }]}>
                          {vendor.vendor_code}
                        </Text>
                      )}
                    </View>
                    {selectedVendorId === vendor.id && <Check size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddItemModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setShowAddItemModal(false); resetCurrentItem(); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Line Item</Text>
            <TouchableOpacity
              onPress={handleAddLineItem}
              disabled={!currentDescription.trim() || !currentQuantity || !currentUnitPrice}
            >
              <Check
                size={24}
                color={currentDescription.trim() && currentQuantity && currentUnitPrice ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Item Type *</Text>
            <View style={styles.itemTypeGrid}>
              {ITEM_TYPE_OPTIONS.map(option => {
                const isActive = currentItemType === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.itemTypeButton,
                      {
                        backgroundColor: isActive ? option.color + '15' : colors.surface,
                        borderColor: isActive ? option.color : colors.border,
                      },
                    ]}
                    onPress={() => handleItemTypeSelect(option.value)}
                  >
                    {option.icon}
                    <Text style={[styles.itemTypeLabel, { color: isActive ? option.color : colors.text }]}>
                      {option.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.itemTypeCheck, { backgroundColor: option.color }]}>
                        <Check size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {currentItemType === 'stock' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Material *</Text>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowMaterialPicker(true)}
                >
                  <View style={styles.selectButtonContent}>
                    <Package size={18} color={currentMaterialId ? colors.text : colors.textTertiary} />
                    <Text style={[styles.selectButtonText, { color: currentMaterialId ? colors.text : colors.textTertiary }]}>
                      {currentMaterialId ? currentDescription : 'Select from inventory...'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                {currentMaterialNumber && (
                  <Text style={[styles.materialNumberHint, { color: colors.textSecondary }]}>
                    SKU: {currentMaterialNumber}
                  </Text>
                )}
              </>
            )}

            {(currentItemType === 'non_stock' || currentItemType === 'capex') && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Material Number</Text>
                <View style={[styles.materialNumberBanner, { backgroundColor: getItemTypeColor(currentItemType) + '15' }]}>
                  <Text style={[styles.materialNumberValue, { color: getItemTypeColor(currentItemType) }]}>
                    {currentMaterialNumber || 'Will be auto-generated'}
                  </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Description *</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter item description..."
                    placeholderTextColor={colors.textTertiary}
                    value={currentDescription}
                    onChangeText={setCurrentDescription}
                    multiline
                  />
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vendor SKU (Optional)</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Vendor's product code..."
                placeholderTextColor={colors.textTertiary}
                value={currentVendorSku}
                onChangeText={setCurrentVendorSku}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quantity *</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={currentQuantity}
                    onChangeText={setCurrentQuantity}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Unit Price *</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <DollarSign size={16} color={colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text, paddingLeft: 28 }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                    value={currentUnitPrice}
                    onChangeText={setCurrentUnitPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            {currentQuantity && currentUnitPrice && (
              <View style={[styles.lineTotalBanner, { backgroundColor: colors.surface }]}>
                <Text style={[styles.lineTotalLabel, { color: colors.textSecondary }]}>Line Total:</Text>
                <Text style={[styles.lineTotalValue, { color: colors.text }]}>
                  {formatCurrency((parseFloat(currentQuantity) || 0) * (parseFloat(currentUnitPrice) || 0))}
                </Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes (Optional)</Text>
            <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                placeholder="Additional notes for this item..."
                placeholderTextColor={colors.textTertiary}
                value={currentNotes}
                onChangeText={setCurrentNotes}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addItemConfirmButton,
                {
                  backgroundColor: currentDescription.trim() && currentQuantity && currentUnitPrice ? '#8B5CF6' : colors.border,
                },
              ]}
              onPress={handleAddLineItem}
              disabled={!currentDescription.trim() || !currentQuantity || !currentUnitPrice}
            >
              <Plus size={20} color="#fff" />
              <Text style={styles.addItemConfirmButtonText}>Add to Request</Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showMaterialPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Material</Text>
              <TouchableOpacity onPress={() => { setShowMaterialPicker(false); setMaterialSearchQuery(''); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search materials..."
                placeholderTextColor={colors.textTertiary}
                value={materialSearchQuery}
                onChangeText={setMaterialSearchQuery}
              />
              {materialSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMaterialSearchQuery('')}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {materialsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : filteredMaterials.length === 0 ? (
                <View style={styles.emptyPickerState}>
                  <Package size={32} color={colors.textTertiary} />
                  <Text style={[styles.emptyPickerText, { color: colors.textSecondary }]}>
                    No materials found
                  </Text>
                </View>
              ) : (
                filteredMaterials.map(material => (
                  <TouchableOpacity
                    key={material.id}
                    style={[
                      styles.pickerItem,
                      { backgroundColor: currentMaterialId === material.id ? colors.primary + '15' : colors.background },
                    ]}
                    onPress={() => handleMaterialSelect(material)}
                  >
                    <View style={styles.pickerItemContent}>
                      <View style={styles.materialItemHeader}>
                        <Text style={[styles.pickerItemTitle, { color: colors.text }]}>{material.name}</Text>
                        {material.on_hand !== undefined && (
                          <View style={[styles.stockBadge, { backgroundColor: material.on_hand > 0 ? '#10B98115' : '#EF444415' }]}>
                            <Text style={[styles.stockBadgeText, { color: material.on_hand > 0 ? '#10B981' : '#EF4444' }]}>
                              {material.on_hand} in stock
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.pickerItemSubtitle, { color: colors.textSecondary }]}>
                        {material.sku} {material.unit_cost ? `• ${formatCurrency(material.unit_cost)}` : ''}
                      </Text>
                    </View>
                    {currentMaterialId === material.id && <Check size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => setNeededByDate(date)}
        selectedDate={neededByDate || undefined}
        minDate={new Date().toISOString().split('T')[0]}
        title="Select Needed By Date"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  deptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  deptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deptText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectButtonText: {
    fontSize: 15,
    flex: 1,
  },
  lineItemsSection: {
    marginTop: 16,
  },
  lineItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addItemButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyItems: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyItemsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  lineItemsList: {
    gap: 10,
  },
  lineItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  lineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lineItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineItemNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  itemTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  removeItemButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineItemMaterial: {
    fontSize: 12,
    marginBottom: 2,
  },
  lineItemDescription: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  lineItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  lineItemQty: {
    fontSize: 13,
  },
  lineItemTotal: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  totalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  priorityButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  notesContainer: {
    borderRadius: 10,
    marginBottom: 8,
  },
  notesInput: {
    padding: 14,
    fontSize: 15,
    minHeight: 80,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  pickerList: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPickerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyPickerText: {
    fontSize: 14,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  pickerItemContent: {
    flex: 1,
  },
  pickerItemTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  pickerItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  materialItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  itemTypeGrid: {
    gap: 10,
  },
  itemTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  itemTypeLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  itemTypeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialNumberHint: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  materialNumberBanner: {
    padding: 12,
    borderRadius: 10,
  },
  materialNumberValue: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  inputContainer: {
    borderRadius: 10,
    position: 'relative',
  },
  textInput: {
    padding: 14,
    fontSize: 15,
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  lineTotalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  lineTotalLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  lineTotalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addItemConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  addItemConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
