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
  Building2,
  Users,
  Calendar,
  Wrench,
  CheckCircle,
  FileText,
  ChevronDown,
  Info,
  Save,
  Send,
  AlertTriangle,
  Clock,
  ClipboardCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useProcurementVendorsQuery,
  useCreateProcurementPurchaseOrder,
  useSubmitPurchaseOrder,
  POLineItem,
} from '@/hooks/useSupabaseProcurement';

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

const SERVICE_CATEGORIES = [
  { id: 'repair', name: 'Repair', color: '#EF4444' },
  { id: 'maintenance', name: 'Maintenance', color: '#F59E0B' },
  { id: 'calibration', name: 'Calibration', color: '#3B82F6' },
  { id: 'consulting', name: 'Consulting', color: '#8B5CF6' },
  { id: 'installation', name: 'Installation', color: '#10B981' },
  { id: 'inspection', name: 'Inspection', color: '#06B6D4' },
  { id: 'training', name: 'Training', color: '#EC4899' },
  { id: 'cleaning', name: 'Cleaning', color: '#14B8A6' },
  { id: 'other', name: 'Other', color: '#6B7280' },
];

interface ServiceLineItemDraft {
  id: string;
  lineNumber: number;
  description: string;
  category: string;
  isPlanned: boolean;
  quantity: number;
  rate: number;
  rateTBD: boolean;
  maxAmount: number;
  lineTotal: number;
  isDeleted: boolean;
}

const generateServicePONumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `PO-SVC-${year}${month}${day}-${random}`;
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

interface SelectedVendor {
  id: string;
  vendor_id?: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
}

export default function POCreateServiceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();

  const [poNumber] = useState(generateServicePONumber());
  const [poDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendor, setSelectedVendor] = useState<SelectedVendor | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentGLMapping | null>(null);
  const [lineItems, setLineItems] = useState<ServiceLineItemDraft[]>([]);
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [shippingAmount, setShippingAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const { data: vendorsData = [], isLoading: isLoadingVendors } = useProcurementVendorsQuery({
    activeOnly: true,
  });

  const createPOMutation = useCreateProcurementPurchaseOrder({
    onSuccess: (data) => {
      console.log('[POCreateService] PO created:', data.id);
    },
    onError: (error) => {
      console.error('[POCreateService] Error creating PO:', error);
      Alert.alert('Error', 'Failed to create purchase order. Please try again.');
    },
  });

  const submitPOMutation = useSubmitPurchaseOrder({
    onSuccess: (data) => {
      console.log('[POCreateService] PO submitted:', data.id);
    },
    onError: (error) => {
      console.error('[POCreateService] Error submitting PO:', error);
      Alert.alert('Error', 'Failed to submit purchase order. Please try again.');
    },
  });

  const activeVendors = useMemo(() => vendorsData, [vendorsData]);

  const activeLines = useMemo(() => 
    lineItems.filter(item => !item.isDeleted),
    [lineItems]
  );

  const hasTBDRates = useMemo(() => 
    activeLines.some(item => item.rateTBD),
    [activeLines]
  );

  const subtotal = useMemo(() => {
    return activeLines
      .filter(item => !item.rateTBD)
      .reduce((sum, item) => sum + item.lineTotal, 0);
  }, [activeLines]);

  const maxPossibleTotal = useMemo(() => {
    return activeLines.reduce((sum, item) => {
      if (item.rateTBD) {
        return sum + item.maxAmount;
      }
      return sum + item.lineTotal;
    }, 0);
  }, [activeLines]);

  const total = useMemo(() => {
    const tax = parseFloat(taxAmount) || 0;
    const shipping = parseFloat(shippingAmount) || 0;
    return subtotal + tax + shipping;
  }, [subtotal, taxAmount, shippingAmount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getCategoryInfo = (categoryId: string) => {
    return SERVICE_CATEGORIES.find(c => c.id === categoryId) || SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1];
  };

  const handleAddLineItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLine: ServiceLineItemDraft = {
      id: `svc-line-${Date.now()}`,
      lineNumber: lineItems.length + 1,
      description: '',
      category: 'other',
      isPlanned: true,
      quantity: 1,
      rate: 0,
      rateTBD: false,
      maxAmount: 0,
      lineTotal: 0,
      isDeleted: false,
    };
    setLineItems(prev => [...prev, newLine]);
  };

  const handleUpdateLineItem = (index: number, field: keyof ServiceLineItemDraft, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'isPlanned') {
        if (value === true) {
          updated[index].rateTBD = false;
          updated[index].maxAmount = 0;
          const qty = updated[index].quantity;
          const rate = updated[index].rate;
          updated[index].lineTotal = qty * rate;
        } else {
          updated[index].rateTBD = true;
          updated[index].lineTotal = 0;
        }
      }
      
      if (field === 'quantity' || field === 'rate') {
        if (!updated[index].rateTBD) {
          const qty = field === 'quantity' ? value : updated[index].quantity;
          const rate = field === 'rate' ? value : updated[index].rate;
          updated[index].lineTotal = (parseFloat(qty) || 0) * (parseFloat(rate) || 0);
        }
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
      const poLineItems: POLineItem[] = activeLines.map((line) => ({
        line_id: line.id,
        line_number: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.rateTBD ? 0 : line.rate,
        line_total: line.rateTBD ? line.maxAmount : line.lineTotal,
        is_stock: false,
        is_deleted: false,
        received_qty: 0,
        notes: line.rateTBD ? `Rate TBD - Max Amount: ${line.maxAmount.toFixed(2)}` : undefined,
      }));

      await createPOMutation.mutateAsync({
        po_type: 'service',
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.name,
        department_name: selectedDepartment.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown User',
        created_by_id: user?.id,
        subtotal: subtotal,
        tax: parseFloat(taxAmount) || 0,
        shipping: parseFloat(shippingAmount) || 0,
        notes: notes || `G/L Account: ${selectedDepartment.glAccount} - ${selectedDepartment.glDescription}${hasTBDRates ? '\nContains services with TBD rates' : ''}`,
        line_items: poLineItems,
      });

      setIsSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Service PO saved as draft', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      setIsSaving(false);
      console.error('[POCreateService] Save draft error:', error);
    }
  };

  const handleSubmitForApproval = () => {
    if (!selectedVendor) {
      Alert.alert('Validation Error', 'Please select a vendor');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Validation Error', 'Please select a department');
      return;
    }
    if (activeLines.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one service line item');
      return;
    }

    const invalidLines = activeLines.filter(
      line => !line.description.trim()
    );

    if (invalidLines.length > 0) {
      Alert.alert('Validation Error', 'Please add a description for all service lines');
      return;
    }

    const plannedWithoutRate = activeLines.filter(
      line => line.isPlanned && line.rate <= 0
    );

    if (plannedWithoutRate.length > 0) {
      Alert.alert('Validation Error', 'All planned services must have a rate specified');
      return;
    }

    const unplannedWithoutMax = activeLines.filter(
      line => !line.isPlanned && line.maxAmount <= 0
    );

    if (unplannedWithoutMax.length > 0) {
      Alert.alert('Validation Error', 'All unplanned services must have a max amount specified');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReviewModal(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const poLineItems: POLineItem[] = activeLines.map((line) => ({
        line_id: line.id,
        line_number: line.lineNumber,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.rateTBD ? 0 : line.rate,
        line_total: line.rateTBD ? line.maxAmount : line.lineTotal,
        is_stock: false,
        is_deleted: false,
        received_qty: 0,
        notes: line.rateTBD ? `Rate TBD - Max Amount: ${line.maxAmount.toFixed(2)}` : undefined,
      }));

      const createdPO = await createPOMutation.mutateAsync({
        po_type: 'service',
        vendor_id: selectedVendor!.id,
        vendor_name: selectedVendor!.name,
        department_name: selectedDepartment!.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown User',
        created_by_id: user?.id,
        subtotal: subtotal,
        tax: parseFloat(taxAmount) || 0,
        shipping: parseFloat(shippingAmount) || 0,
        notes: notes || `G/L Account: ${selectedDepartment!.glAccount} - ${selectedDepartment!.glDescription}${hasTBDRates ? '\nContains services with TBD rates' : ''}`,
        line_items: poLineItems,
      });

      await submitPOMutation.mutateAsync(createdPO.id);

      setIsSubmitting(false);
      setShowReviewModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Service PO submitted for approval\n\nNote: Services require approval before SES creation', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      setIsSubmitting(false);
      console.error('[POCreateService] Submit error:', error);
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
          {isLoadingVendors ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading vendors...</Text>
            </View>
          ) : activeVendors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Building2 size={32} color={colors.textTertiary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active vendors found</Text>
            </View>
          ) : (
            activeVendors.map(vendor => (
              <TouchableOpacity
                key={vendor.id}
                style={[styles.pickerOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedVendor({
                    id: vendor.id,
                    name: vendor.name,
                    contact_name: vendor.contact_name,
                    phone: vendor.phone,
                  });
                  setShowVendorPicker(false);
                }}
              >
                <View style={[styles.pickerIcon, { backgroundColor: '#3B82F615' }]}>
                  <Building2 size={18} color="#3B82F6" />
                </View>
                <View style={styles.pickerOptionContent}>
                  <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{vendor.name}</Text>
                  <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                    {vendor.contact_name || 'No contact'} • {vendor.phone || 'No phone'}
                  </Text>
                </View>
                {selectedVendor?.id === vendor.id && (
                  <CheckCircle size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
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
            Department selection determines the G/L account for this service
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

  const renderCategoryPicker = () => (
    <Modal
      visible={showCategoryPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Service Category</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {SERVICE_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                if (editingLineIndex !== null) {
                  handleUpdateLineItem(editingLineIndex, 'category', category.id);
                }
                setShowCategoryPicker(false);
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: `${category.color}15` }]}>
                <Wrench size={18} color={category.color} />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{category.name}</Text>
              </View>
              {editingLineIndex !== null && lineItems[editingLineIndex]?.category === category.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderReviewModal = () => {
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
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Service PO Summary</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>PO Number</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{poNumber}</Text>
              </View>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Type</Text>
                <View style={[styles.typeBadge, { backgroundColor: '#10B98115' }]}>
                  <Text style={[styles.typeBadgeText, { color: '#10B981' }]}>SERVICE</Text>
                </View>
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
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>G/L Account</Text>
              
              <View style={[styles.glHighlight, { backgroundColor: '#10B98115' }]}>
                <Text style={[styles.glHighlightLabel, { color: '#10B981' }]}>G/L ACCOUNT (Department Charge)</Text>
                <Text style={[styles.glHighlightValue, { color: '#10B981' }]}>
                  {selectedDepartment?.glAccount} - {selectedDepartment?.glDescription}
                </Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Service Lines ({activeLines.length})</Text>
              
              {activeLines.map((line, idx) => {
                const categoryInfo = getCategoryInfo(line.category);
                return (
                  <View key={line.id} style={[styles.reviewLineItem, idx < activeLines.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    <View style={styles.reviewLineHeader}>
                      <Text style={[styles.reviewLineNumber, { color: colors.textSecondary }]}>#{line.lineNumber}</Text>
                      <View style={styles.reviewLineBadges}>
                        <View style={[styles.categoryBadgeSmall, { backgroundColor: `${categoryInfo.color}15` }]}>
                          <Text style={[styles.categoryBadgeSmallText, { color: categoryInfo.color }]}>
                            {categoryInfo.name}
                          </Text>
                        </View>
                        <View style={[styles.plannedBadge, { backgroundColor: line.isPlanned ? '#3B82F615' : '#F59E0B15' }]}>
                          <Text style={[styles.plannedBadgeText, { color: line.isPlanned ? '#3B82F6' : '#F59E0B' }]}>
                            {line.isPlanned ? 'Planned' : 'Unplanned'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.reviewLineDescription, { color: colors.text }]}>{line.description}</Text>
                    <View style={styles.reviewLineFooter}>
                      {line.isPlanned ? (
                        <>
                          <Text style={[styles.reviewLineQty, { color: colors.textSecondary }]}>
                            {line.quantity} × {formatCurrency(line.rate)}
                          </Text>
                          <Text style={[styles.reviewLineTotal, { color: colors.text }]}>{formatCurrency(line.lineTotal)}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.reviewLineQty, { color: colors.textSecondary }]}>
                            Rate: TBD
                          </Text>
                          <Text style={[styles.reviewLineTotal, { color: '#F59E0B' }]}>
                            Max: {formatCurrency(line.maxAmount)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Totals</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Known Subtotal</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
              </View>
              
              {hasTBDRates && (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Max Possible Total</Text>
                  <Text style={[styles.reviewValue, { color: '#F59E0B' }]}>{formatCurrency(maxPossibleTotal)}</Text>
                </View>
              )}
              
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
                {hasTBDRates ? (
                  <View style={styles.pendingTotal}>
                    <Clock size={16} color="#F59E0B" />
                    <Text style={[styles.pendingTotalText, { color: '#F59E0B' }]}>Pending</Text>
                  </View>
                ) : (
                  <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
                )}
              </View>
            </View>

            <View style={[styles.approvalNotice, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Text style={[styles.approvalNoticeText, { color: '#F59E0B' }]}>
                Services require approval before SES (Service Entry Sheet) creation
              </Text>
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

  const renderLineItem = (item: ServiceLineItemDraft, index: number) => {
    const categoryInfo = getCategoryInfo(item.category);
    
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
            {item.description || 'No description'}
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

        <View style={styles.formField}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Service Description *</Text>
          <TextInput
            style={[styles.descriptionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={item.description}
            onChangeText={(text) => handleUpdateLineItem(index, 'description', text)}
            placeholder="Enter service description..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.formField}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
          <TouchableOpacity
            style={[styles.categorySelector, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => {
              setEditingLineIndex(index);
              setShowCategoryPicker(true);
            }}
          >
            <View style={styles.categoryDisplay}>
              <View style={[styles.categoryDot, { backgroundColor: categoryInfo.color }]} />
              <Text style={[styles.categoryText, { color: colors.text }]}>{categoryInfo.name}</Text>
            </View>
            <ChevronDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.plannedToggleContainer}>
          <View style={[styles.plannedToggle, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[
                styles.plannedToggleOption,
                item.isPlanned && { backgroundColor: '#3B82F6' },
              ]}
              onPress={() => handleUpdateLineItem(index, 'isPlanned', true)}
            >
              <ClipboardCheck size={14} color={item.isPlanned ? '#fff' : colors.textSecondary} />
              <Text style={[styles.plannedToggleText, { color: item.isPlanned ? '#fff' : colors.textSecondary }]}>
                Planned
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.plannedToggleOption,
                !item.isPlanned && { backgroundColor: '#F59E0B' },
              ]}
              onPress={() => handleUpdateLineItem(index, 'isPlanned', false)}
            >
              <Clock size={14} color={!item.isPlanned ? '#fff' : colors.textSecondary} />
              <Text style={[styles.plannedToggleText, { color: !item.isPlanned ? '#fff' : colors.textSecondary }]}>
                Unplanned
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.isPlanned ? (
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
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Rate</Text>
              <TextInput
                style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={item.rate > 0 ? item.rate.toFixed(2) : ''}
                onChangeText={(text) => handleUpdateLineItem(index, 'rate', parseFloat(text) || 0)}
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
        ) : (
          <View style={styles.unplannedSection}>
            <View style={[styles.tbdRateBanner, { backgroundColor: '#F59E0B15' }]}>
              <Clock size={14} color="#F59E0B" />
              <Text style={[styles.tbdRateText, { color: '#F59E0B' }]}>
                Rate TBD - Specify max amount for approval
              </Text>
            </View>
            <View style={styles.maxAmountRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Max Amount *</Text>
              <View style={styles.currencyInputSmall}>
                <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.maxAmountInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={item.maxAmount > 0 ? item.maxAmount.toFixed(2) : ''}
                  onChangeText={(text) => handleUpdateLineItem(index, 'maxAmount', parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Create Service PO' }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>PO Header</Text>
              <View style={[styles.typeBadge, { backgroundColor: '#10B98115' }]}>
                <Wrench size={12} color="#10B981" />
                <Text style={[styles.typeBadgeText, { color: '#10B981' }]}>SERVICE</Text>
              </View>
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

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Wrench size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Lines</Text>
              <TouchableOpacity
                style={[styles.addLineButton, { backgroundColor: colors.primary }]}
                onPress={handleAddLineItem}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.addLineButtonText}>Add Service</Text>
              </TouchableOpacity>
            </View>

            {lineItems.length === 0 ? (
              <View style={styles.emptyLines}>
                <Wrench size={32} color={colors.textTertiary} />
                <Text style={[styles.emptyLinesText, { color: colors.textSecondary }]}>
                  No service lines yet. Tap &quot;Add Service&quot; to begin.
                </Text>
              </View>
            ) : (
              lineItems.map((item, index) => renderLineItem(item, index))
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>PO Totals</Text>

            <View style={styles.totalsRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Known Subtotal</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(subtotal)}</Text>
            </View>

            {hasTBDRates && (
              <View style={[styles.tbdTotalRow, { backgroundColor: '#F59E0B10' }]}>
                <View style={styles.tbdTotalInfo}>
                  <Clock size={14} color="#F59E0B" />
                  <Text style={[styles.tbdTotalLabel, { color: '#F59E0B' }]}>Max Possible Total</Text>
                </View>
                <Text style={[styles.tbdTotalValue, { color: '#F59E0B' }]}>{formatCurrency(maxPossibleTotal)}</Text>
              </View>
            )}

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
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Shipping (if applicable)</Text>
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
              {hasTBDRates ? (
                <View style={styles.pendingTotal}>
                  <Clock size={18} color="#F59E0B" />
                  <Text style={[styles.pendingTotalText, { color: '#F59E0B' }]}>Pending</Text>
                </View>
              ) : (
                <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
              )}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes for this service PO..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.approvalNotice, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={[styles.approvalNoticeText, { color: '#F59E0B' }]}>
              All service POs require approval before SES creation
            </Text>
          </View>

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
      {renderCategoryPicker()}
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
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
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
  descriptionInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  categoryDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  plannedToggleContainer: {
    marginBottom: 12,
  },
  plannedToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  plannedToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
  },
  plannedToggleText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
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
  unplannedSection: {
    gap: 10,
  },
  tbdRateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  tbdRateText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  maxAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyInputSmall: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maxAmountInput: {
    width: 120,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    textAlign: 'right',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tbdTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  tbdTotalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tbdTotalLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  tbdTotalValue: {
    fontSize: 14,
    fontWeight: '600' as const,
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
  pendingTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingTotalText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  approvalNoticeText: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
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
  reviewLineItem: {
    paddingVertical: 12,
  },
  reviewLineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewLineNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reviewLineBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  plannedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  plannedBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
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
