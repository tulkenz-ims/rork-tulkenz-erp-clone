import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  X,
  Plus,
  Trash2,
  Search,
  Building2,
  Users,
  Calendar,
  Package,
  CheckCircle,
  FileText,
  ChevronDown,
  Tag,
  Info,
  Save,
  Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useProcurementVendorsQuery, useCreateProcurementPurchaseOrder, useSubmitPurchaseOrder, POLineItem } from '@/hooks/useSupabaseProcurement';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { Tables } from '@/lib/supabase';

type ProcurementVendor = Tables['procurement_vendors'];
type Material = Tables['materials'];

interface DepartmentGLMapping {
  id: string;
  name: string;
  glAccount: string;
  glDescription: string;
}

const DEPARTMENT_GL_ACCOUNTS: DepartmentGLMapping[] = [
  { id: '1001', name: 'Maintenance', glAccount: '530300', glDescription: 'Maintenance Expense' },
  { id: '1002', name: 'Sanitation', glAccount: '560600', glDescription: 'Sanitation Expense' },
  { id: '1003', name: 'Production', glAccount: '540400', glDescription: 'Production Expense' },
  { id: '1004', name: 'Quality', glAccount: '520200', glDescription: 'Quality Expense' },
  { id: '1005', name: 'Safety', glAccount: '550500', glDescription: 'Safety Expense' },
  { id: '1006', name: 'IT', glAccount: '580800', glDescription: 'IT Expense' },
  { id: '1007', name: 'Warehouse', glAccount: '570700', glDescription: 'Warehouse Expense' },
  { id: '1008', name: 'Facilities', glAccount: '590900', glDescription: 'Facilities Expense' },
  { id: '1009', name: 'Projects/Office', glAccount: '510100', glDescription: 'Projects/Office Expense' },
];

const MATERIAL_CATEGORY_BY_PREFIX: Record<string, string> = {
  '1': 'Projects/Office Items',
  '2': 'Quality Items',
  '3': 'Maintenance Items',
  '4': 'Production Items',
  '5': 'Safety Items',
  '6': 'Sanitation Items',
  '7': 'Warehouse Items',
  '8': 'IT Items',
  '9': 'Facilities Items',
};

interface POLineItemDraft {
  id: string;
  lineNumber: number;
  materialNumber: string;
  materialId?: string;
  description: string;
  isStock: boolean;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isDeleted: boolean;
  uom: string;
}

const generatePONumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `PO-${year}${month}${day}-${random}`;
};

const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function POCreateMaterialScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();

  const { data: vendors = [], isLoading: vendorsLoading } = useProcurementVendorsQuery({ activeOnly: true });
  const { data: allMaterials = [], isLoading: materialsLoading } = useMaterialsQuery();
  
  const createPOMutation = useCreateProcurementPurchaseOrder({
    onSuccess: (data) => {
      console.log('[POCreateMaterial] PO created:', data.id);
    },
    onError: (error) => {
      console.error('[POCreateMaterial] Create error:', error);
      Alert.alert('Error', 'Failed to create purchase order');
    },
  });

  const submitPOMutation = useSubmitPurchaseOrder({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Purchase order submitted for approval', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error) => {
      console.error('[POCreateMaterial] Submit error:', error);
      Alert.alert('Error', 'Failed to submit purchase order');
    },
  });

  const [poNumber] = useState(generatePONumber());
  const [poDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendor, setSelectedVendor] = useState<ProcurementVendor | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentGLMapping | null>(null);
  const [lineItems, setLineItems] = useState<POLineItemDraft[]>([]);
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [shippingAmount, setShippingAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showMaterialSearch, setShowMaterialSearch] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const activeVendors = useMemo(() => vendors, [vendors]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return [];
    const query = materialSearchQuery.toLowerCase();
    return (allMaterials || [])
      .filter((m: Material) => 
        m.sku?.toLowerCase().includes(query) ||
        m.name?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [materialSearchQuery, allMaterials]);

  const subtotal = useMemo(() => {
    return lineItems
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + item.lineTotal, 0);
  }, [lineItems]);

  const total = useMemo(() => {
    const tax = parseFloat(taxAmount) || 0;
    const shipping = parseFloat(shippingAmount) || 0;
    return subtotal + tax + shipping;
  }, [subtotal, taxAmount, shippingAmount]);

  const getCategoryFromMaterialNumber = (materialNumber: string): string => {
    if (!materialNumber || materialNumber.length < 1) return 'Unknown';
    const prefix = materialNumber.charAt(0);
    return MATERIAL_CATEGORY_BY_PREFIX[prefix] || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAddLineItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLine: POLineItemDraft = {
      id: `line-${Date.now()}`,
      lineNumber: lineItems.length + 1,
      materialNumber: '',
      description: '',
      isStock: true,
      quantity: 1,
      unitPrice: 0,
      lineTotal: 0,
      isDeleted: false,
      uom: 'EA',
    };
    setLineItems(prev => [...prev, newLine]);
    setEditingLineIndex(lineItems.length);
    setShowMaterialSearch(true);
  };

  const handleSelectMaterial = (material: Material) => {
    Haptics.selectionAsync();
    if (editingLineIndex !== null) {
      setLineItems(prev => {
        const updated = [...prev];
        updated[editingLineIndex] = {
          ...updated[editingLineIndex],
          materialNumber: material.sku || '',
          materialId: material.id,
          description: material.name,
          unitPrice: material.unit_price || 0,
          lineTotal: (material.unit_price || 0) * updated[editingLineIndex].quantity,
          uom: material.unit_of_measure || 'EA',
        };
        return updated;
      });
    }
    setShowMaterialSearch(false);
    setMaterialSearchQuery('');
  };

  const handleUpdateLineItem = (index: number, field: keyof POLineItemDraft, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? value : updated[index].quantity;
        const price = field === 'unitPrice' ? value : updated[index].unitPrice;
        updated[index].lineTotal = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
      }
      
      return updated;
    });
  };

  const handleDeleteLineItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isDeleted: true };
      return updated;
    });
  };

  const handleSaveDraft = async () => {
    if (!selectedVendor) {
      Alert.alert('Error', 'Please select a vendor');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const activeLines = lineItems.filter(item => !item.isDeleted);
      const poLineItems: POLineItem[] = activeLines.map(line => ({
        line_id: line.id,
        line_number: line.lineNumber,
        material_id: line.materialId,
        material_sku: line.materialNumber,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.lineTotal,
        is_stock: line.isStock,
        is_deleted: false,
        received_qty: 0,
        uom: line.uom,
      }));

      await createPOMutation.mutateAsync({
        po_type: 'material',
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.name,
        department_id: selectedDepartment.id,
        department_name: selectedDepartment.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id,
        subtotal,
        tax: parseFloat(taxAmount) || 0,
        shipping: parseFloat(shippingAmount) || 0,
        notes: notes || undefined,
        line_items: poLineItems,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Purchase order saved as draft', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[POCreateMaterial] Save draft error:', error);
      Alert.alert('Error', 'Failed to save purchase order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForApproval = () => {
    const activeLines = lineItems.filter(item => !item.isDeleted);
    
    if (!selectedVendor) {
      Alert.alert('Validation Error', 'Please select a vendor');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Validation Error', 'Please select a department');
      return;
    }
    if (activeLines.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one line item');
      return;
    }

    const invalidLines = activeLines.filter(
      line => !line.materialNumber || !line.description || line.quantity <= 0 || line.unitPrice <= 0
    );

    if (invalidLines.length > 0) {
      Alert.alert('Validation Error', 'Please complete all line item fields (Material#, Description, Quantity, and Unit Price)');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReviewModal(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const activeLines = lineItems.filter(item => !item.isDeleted);
      const poLineItems: POLineItem[] = activeLines.map(line => ({
        line_id: line.id,
        line_number: line.lineNumber,
        material_id: line.materialId,
        material_sku: line.materialNumber,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.lineTotal,
        is_stock: line.isStock,
        is_deleted: false,
        received_qty: 0,
        uom: line.uom,
      }));

      const createdPO = await createPOMutation.mutateAsync({
        po_type: 'material',
        vendor_id: selectedVendor!.id,
        vendor_name: selectedVendor!.name,
        department_id: selectedDepartment!.id,
        department_name: selectedDepartment!.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id,
        subtotal,
        tax: parseFloat(taxAmount) || 0,
        shipping: parseFloat(shippingAmount) || 0,
        notes: notes || undefined,
        line_items: poLineItems,
      });

      await submitPOMutation.mutateAsync(createdPO.id);
      setShowReviewModal(false);
    } catch (error) {
      console.error('[POCreateMaterial] Submit error:', error);
      Alert.alert('Error', 'Failed to submit purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderVendorPicker = () => (
    <Modal
      visible={showVendorPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowVendorPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowVendorPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Vendor</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {vendorsLoading ? (
            <View style={styles.searchHint}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>Loading vendors...</Text>
            </View>
          ) : activeVendors.length === 0 ? (
            <View style={styles.searchHint}>
              <Building2 size={32} color={colors.textTertiary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>No active vendors found</Text>
            </View>
          ) : activeVendors.map(vendor => (
            <TouchableOpacity
              key={vendor.id}
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedVendor(vendor);
                setShowVendorPicker(false);
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: '#3B82F615' }]}>
                <Building2 size={18} color="#3B82F6" />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{vendor.name}</Text>
                <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                  {vendor.contact_name} • {vendor.phone}
                </Text>
              </View>
              {selectedVendor?.id === vendor.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderDepartmentPicker = () => (
    <Modal
      visible={showDepartmentPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDepartmentPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowDepartmentPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Department</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.glInfoBanner, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
          <Info size={16} color={colors.primary} />
          <Text style={[styles.glInfoText, { color: colors.primary }]}>
            Department selection determines the G/L account for this purchase
          </Text>
        </View>
        <ScrollView style={styles.modalContent}>
          {DEPARTMENT_GL_ACCOUNTS.map(dept => (
            <TouchableOpacity
              key={dept.id}
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedDepartment(dept);
                setShowDepartmentPicker(false);
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: '#10B98115' }]}>
                <Users size={18} color="#10B981" />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{dept.name}</Text>
                <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                  G/L: {dept.glAccount} - {dept.glDescription}
                </Text>
              </View>
              {selectedDepartment?.id === dept.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderMaterialSearch = () => (
    <Modal
      visible={showMaterialSearch}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setShowMaterialSearch(false);
        setMaterialSearchQuery('');
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => {
            setShowMaterialSearch(false);
            setMaterialSearchQuery('');
          }}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Search Materials</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by material #, name, or SKU..."
              placeholderTextColor={colors.textSecondary}
              value={materialSearchQuery}
              onChangeText={setMaterialSearchQuery}
              autoFocus
            />
            {materialSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setMaterialSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {materialSearchQuery.length < 2 ? (
            <View style={styles.searchHint}>
              <Package size={32} color={colors.textTertiary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>
                Enter at least 2 characters to search materials
              </Text>
            </View>
          ) : materialsLoading ? (
            <View style={styles.searchHint}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>Searching materials...</Text>
            </View>
          ) : filteredMaterials.length === 0 ? (
            <View style={styles.searchHint}>
              <Package size={32} color={colors.textTertiary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>
                No materials found
              </Text>
            </View>
          ) : (
            filteredMaterials.map((material: Material) => (
              <TouchableOpacity
                key={material.id}
                style={[styles.materialOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectMaterial(material)}
              >
                <View style={styles.materialOptionHeader}>
                  <Text style={[styles.materialNumber, { color: colors.primary }]}>
                    {material.sku}
                  </Text>
                  <View style={[styles.categoryBadge, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.categoryBadgeText, { color: colors.primary }]}>
                      {getCategoryFromMaterialNumber(material.sku || '')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.materialName, { color: colors.text }]}>{material.name}</Text>
                <View style={styles.materialMeta}>
                  <Text style={[styles.materialMetaText, { color: colors.textSecondary }]}>
                    On Hand: {material.on_hand} {material.unit_of_measure}
                  </Text>
                  <Text style={[styles.materialMetaText, { color: colors.textSecondary }]}>
                    {formatCurrency(material.unit_price || 0)} / {material.unit_of_measure}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderReviewModal = () => {
    const activeLines = lineItems.filter(item => !item.isDeleted);
    
    return (
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)} disabled={isSubmitting}>
              <X size={24} color={isSubmitting ? colors.textTertiary : colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Review & Submit</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>PO Summary</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>PO Number</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{poNumber}</Text>
              </View>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Vendor</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedVendor?.name}</Text>
              </View>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedDepartment?.name}</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>G/L Account & Category</Text>
              
              <View style={[styles.glHighlight, { backgroundColor: '#10B98115' }]}>
                <Text style={[styles.glHighlightLabel, { color: '#10B981' }]}>G/L ACCOUNT (Department Charge)</Text>
                <Text style={[styles.glHighlightValue, { color: '#10B981' }]}>
                  {selectedDepartment?.glAccount} - {selectedDepartment?.glDescription}
                </Text>
              </View>

              <Text style={[styles.categoryListTitle, { color: colors.text }]}>Material Categories (for reporting):</Text>
              {Array.from(new Set(activeLines.map(line => getCategoryFromMaterialNumber(line.materialNumber)))).map((category, idx) => (
                <View key={idx} style={styles.categoryItem}>
                  <Tag size={14} color={colors.textSecondary} />
                  <Text style={[styles.categoryItemText, { color: colors.textSecondary }]}>{category}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Line Items ({activeLines.length})</Text>
              
              {activeLines.map((line, idx) => (
                <View key={line.id} style={[styles.reviewLineItem, idx < activeLines.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                  <View style={styles.reviewLineHeader}>
                    <Text style={[styles.reviewLineNumber, { color: colors.textSecondary }]}>#{line.lineNumber}</Text>
                    <View style={[styles.stockBadge, { backgroundColor: line.isStock ? '#3B82F615' : '#F59E0B15' }]}>
                      <Text style={[styles.stockBadgeText, { color: line.isStock ? '#3B82F6' : '#F59E0B' }]}>
                        {line.isStock ? 'Stock' : 'Consumable'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.reviewLineMaterial, { color: colors.primary }]}>{line.materialNumber}</Text>
                  <Text style={[styles.reviewLineDescription, { color: colors.text }]}>{line.description}</Text>
                  <View style={styles.reviewLineFooter}>
                    <Text style={[styles.reviewLineQty, { color: colors.textSecondary }]}>
                      {line.quantity} {line.uom} × {formatCurrency(line.unitPrice)}
                    </Text>
                    <Text style={[styles.reviewLineTotal, { color: colors.text }]}>{formatCurrency(line.lineTotal)}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Totals</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Tax</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(parseFloat(taxAmount) || 0)}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Shipping</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(parseFloat(shippingAmount) || 0)}</Text>
              </View>
              <View style={[styles.reviewRow, styles.grandTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
              </View>
            </View>

            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={confirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit for Approval</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalBottomPadding} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderLineItem = (item: POLineItemDraft, index: number) => {
    if (item.isDeleted) {
      return (
        <View
          key={item.id}
          style={[styles.lineItemCard, styles.lineItemDeleted, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.lineItemHeader}>
            <Text style={[styles.lineNumber, { color: colors.textTertiary }]}>#{item.lineNumber}</Text>
            <View style={[styles.deletedBadge, { backgroundColor: '#EF444415' }]}>
              <Trash2 size={12} color="#EF4444" />
              <Text style={[styles.deletedBadgeText, { color: '#EF4444' }]}>Deleted</Text>
            </View>
          </View>
          <Text style={[styles.deletedDescription, { color: colors.textTertiary }]}>
            {item.materialNumber ? `${item.materialNumber} - ${item.description}` : 'No material selected'}
          </Text>
        </View>
      );
    }

    return (
      <View
        key={item.id}
        style={[styles.lineItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.lineItemHeader}>
          <Text style={[styles.lineNumber, { color: colors.textSecondary }]}>Line #{item.lineNumber}</Text>
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#EF444415' }]}
            onPress={() => handleDeleteLineItem(index)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.materialSelector, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => {
            setEditingLineIndex(index);
            setShowMaterialSearch(true);
          }}
        >
          {item.materialNumber ? (
            <View style={styles.selectedMaterial}>
              <Text style={[styles.selectedMaterialNumber, { color: colors.primary }]}>{item.materialNumber}</Text>
              <Text style={[styles.selectedMaterialName, { color: colors.text }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          ) : (
            <View style={styles.materialPlaceholder}>
              <Search size={16} color={colors.textSecondary} />
              <Text style={[styles.materialPlaceholderText, { color: colors.textSecondary }]}>
                Tap to search materials...
              </Text>
            </View>
          )}
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {item.materialNumber && (
          <View style={styles.categoryRow}>
            <Tag size={12} color={colors.textSecondary} />
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
              Category: {getCategoryFromMaterialNumber(item.materialNumber)}
            </Text>
          </View>
        )}

        <View style={styles.lineItemRow}>
          <View style={[styles.stockToggle, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[
                styles.stockToggleOption,
                item.isStock && { backgroundColor: '#3B82F6' },
              ]}
              onPress={() => handleUpdateLineItem(index, 'isStock', true)}
            >
              <Text style={[styles.stockToggleText, { color: item.isStock ? '#fff' : colors.textSecondary }]}>
                Stock
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.stockToggleOption,
                !item.isStock && { backgroundColor: '#F59E0B' },
              ]}
              onPress={() => handleUpdateLineItem(index, 'isStock', false)}
            >
              <Text style={[styles.stockToggleText, { color: !item.isStock ? '#fff' : colors.textSecondary }]}>
                Consumable
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.lineItemRow}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Qty</Text>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={item.quantity.toString()}
              onChangeText={(text) => handleUpdateLineItem(index, 'quantity', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unit Price</Text>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={item.unitPrice.toFixed(2)}
              onChangeText={(text) => handleUpdateLineItem(index, 'unitPrice', parseFloat(text) || 0)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Line Total</Text>
            <View style={[styles.readOnlyInput, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.readOnlyText, { color: colors.text }]}>
                {formatCurrency(item.lineTotal)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Create Material PO' }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>PO Header</Text>
            </View>

            <View style={styles.headerGrid}>
              <View style={styles.headerField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PO Number</Text>
                <View style={[styles.readOnlyField, { backgroundColor: colors.backgroundTertiary }]}>
                  <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>{poNumber}</Text>
                </View>
              </View>
              <View style={styles.headerField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
                <View style={[styles.readOnlyField, { backgroundColor: colors.backgroundTertiary }]}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>{formatDisplayDate(poDate)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Vendor *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowVendorPicker(true)}
              >
                {selectedVendor ? (
                  <View style={styles.selectedValue}>
                    <Building2 size={16} color={colors.primary} />
                    <Text style={[styles.selectedValueText, { color: colors.text }]}>{selectedVendor.name}</Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select a vendor...
                  </Text>
                )}
                <ChevronDown size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Department (G/L Account) *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowDepartmentPicker(true)}
              >
                {selectedDepartment ? (
                  <View style={styles.selectedValue}>
                    <Users size={16} color="#10B981" />
                    <View style={styles.departmentValue}>
                      <Text style={[styles.selectedValueText, { color: colors.text }]}>{selectedDepartment.name}</Text>
                      <Text style={[styles.glAccountText, { color: colors.textSecondary }]}>
                        G/L: {selectedDepartment.glAccount}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select a department...
                  </Text>
                )}
                <ChevronDown size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Line Items Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Package size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items</Text>
              <TouchableOpacity
                style={[styles.addLineButton, { backgroundColor: colors.primary }]}
                onPress={handleAddLineItem}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addLineButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {lineItems.length === 0 ? (
              <View style={styles.emptyLines}>
                <Package size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyLinesText, { color: colors.textSecondary }]}>
                  No line items yet. Tap &quot;Add Item&quot; to begin.
                </Text>
              </View>
            ) : (
              lineItems.map((item, index) => renderLineItem(item, index))
            )}
          </View>

          {/* Totals Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>PO Totals</Text>

            <View style={styles.totalsRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
            </View>

            <View style={styles.totalsInputRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Tax</Text>
              <View style={styles.currencyInput}>
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.totalsInput, { color: colors.text, borderColor: colors.border }]}
                  value={taxAmount}
                  onChangeText={setTaxAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.totalsInputRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Shipping</Text>
              <View style={styles.currencyInput}>
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.totalsInput, { color: colors.text, borderColor: colors.border }]}
                  value={shippingAmount}
                  onChangeText={setShippingAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={[styles.grandTotal, { borderTopColor: colors.border }]}>
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
            </View>
          </View>

          {/* Notes Section */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes for this purchase order..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.draftButton, { borderColor: colors.border, opacity: isSaving ? 0.7 : 1 }]}
              onPress={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Save size={18} color={colors.text} />
                  <Text style={[styles.draftButtonText, { color: colors.text }]}>Save as Draft</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitActionButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmitForApproval}
            >
              <Send size={18} color="#fff" />
              <Text style={styles.submitActionButtonText}>Submit for Approval</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>

      {renderVendorPicker()}
      {renderDepartmentPicker()}
      {renderMaterialSearch()}
      {renderReviewModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },
  headerGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  headerField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  readOnlyFieldText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  formField: {
    marginBottom: 14,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  selectorPlaceholder: {
    fontSize: 15,
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedValueText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  departmentValue: {
    flex: 1,
  },
  glAccountText: {
    fontSize: 12,
    marginTop: 2,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addLineButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyLines: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyLinesText: {
    fontSize: 14,
    textAlign: 'center',
  },
  lineItemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  lineItemDeleted: {
    opacity: 0.6,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineNumber: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
  },
  deletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deletedBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  deletedDescription: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  materialSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  selectedMaterial: {
    flex: 1,
  },
  selectedMaterialNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  selectedMaterialName: {
    fontSize: 14,
  },
  materialPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  materialPlaceholderText: {
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryText: {
    fontSize: 12,
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  stockToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    flex: 1,
  },
  stockToggleOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  stockToggleText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  numberInput: {
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  readOnlyInput: {
    height: 40,
    borderRadius: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalsInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 14,
    marginRight: 4,
  },
  totalsInput: {
    width: 100,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'right',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  draftButton: {
    borderWidth: 1,
  },
  draftButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitActionButton: {},
  submitActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  modalBottomPadding: {
    height: 40,
  },
  glInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  glInfoText: {
    fontSize: 13,
    flex: 1,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  pickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionContent: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  pickerOptionSubtitle: {
    fontSize: 13,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchHint: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  searchHintText: {
    fontSize: 14,
    textAlign: 'center',
  },
  materialOption: {
    padding: 14,
    borderBottomWidth: 1,
  },
  materialOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  materialNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  materialName: {
    fontSize: 15,
    marginBottom: 4,
  },
  materialMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  materialMetaText: {
    fontSize: 12,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reviewLabel: {
    fontSize: 14,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  glHighlight: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  glHighlightLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  glHighlightValue: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  categoryListTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  categoryItemText: {
    fontSize: 13,
  },
  reviewLineItem: {
    paddingVertical: 12,
  },
  reviewLineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewLineNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  reviewLineMaterial: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  reviewLineDescription: {
    fontSize: 14,
    marginBottom: 6,
  },
  reviewLineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLineQty: {
    fontSize: 12,
  },
  reviewLineTotal: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  grandTotalRow: {
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
  },
  submitSection: {
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
