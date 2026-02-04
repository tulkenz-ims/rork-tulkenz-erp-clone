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
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Building2,
  Users,
  Calendar,
  CheckCircle,
  FileText,
  ChevronDown,
  Info,
  Save,
  Send,
  AlertTriangle,
  DollarSign,
  Landmark,
  Cpu,
  HardHat,
  Truck,
  Armchair,
  Wrench,
  Factory,
  Clock,
  FileCheck,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useProcurementVendorsQuery,
  useCreateProcurementPurchaseOrder,
  useSubmitPOWithApprovalChain,
  useMarkRequisitionConverted,
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

interface AssetCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  capexGLPrefix: string;
  defaultUsefulLife: number;
}

const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'equipment', name: 'Equipment', icon: null, color: '#3B82F6', capexGLPrefix: '150', defaultUsefulLife: 7 },
  { id: 'machinery', name: 'Machinery', icon: null, color: '#8B5CF6', capexGLPrefix: '151', defaultUsefulLife: 10 },
  { id: 'building', name: 'Building Improvement', icon: null, color: '#F59E0B', capexGLPrefix: '152', defaultUsefulLife: 20 },
  { id: 'technology', name: 'Technology', icon: null, color: '#06B6D4', capexGLPrefix: '153', defaultUsefulLife: 5 },
  { id: 'furniture', name: 'Furniture', icon: null, color: '#10B981', capexGLPrefix: '154', defaultUsefulLife: 7 },
  { id: 'vehicles', name: 'Vehicles', icon: null, color: '#EF4444', capexGLPrefix: '155', defaultUsefulLife: 5 },
];

const USEFUL_LIFE_GUIDANCE = [
  { category: 'Equipment', range: '5-7 years' },
  { category: 'Machinery', range: '10-15 years' },
  { category: 'Building Improvements', range: '20-30 years' },
  { category: 'Technology', range: '3-5 years' },
  { category: 'Furniture', range: '5-7 years' },
  { category: 'Vehicles', range: '5-7 years' },
];

const MIN_JUSTIFICATION_CHARS = 50;

const generateCapexPONumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `PO-CAPEX-${year}${month}${day}-${random}`;
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

const getCategoryIcon = (categoryId: string, size: number, color: string) => {
  switch (categoryId) {
    case 'equipment':
      return <Wrench size={size} color={color} />;
    case 'machinery':
      return <Factory size={size} color={color} />;
    case 'building':
      return <Landmark size={size} color={color} />;
    case 'technology':
      return <Cpu size={size} color={color} />;
    case 'furniture':
      return <Armchair size={size} color={color} />;
    case 'vehicles':
      return <Truck size={size} color={color} />;
    default:
      return <HardHat size={size} color={color} />;
  }
};

interface SelectedVendor {
  id: string;
  vendor_id?: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
}

export default function POCreateCapexScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{
    fromRequisition?: string;
    requisitionId?: string;
    requisitionNumber?: string;
    vendorId?: string;
    vendorName?: string;
    departmentId?: string;
    departmentName?: string;
    subtotal?: string;
    neededByDate?: string;
    notes?: string;
    lineItems?: string;
  }>();

  const isFromRequisition = params.fromRequisition === 'true';
  const sourceRequisitionId = params.requisitionId;
  const sourceRequisitionNumber = params.requisitionNumber;

  const [poNumber] = useState(generateCapexPONumber());
  const [poDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendor, setSelectedVendor] = useState<SelectedVendor | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentGLMapping | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [assetDescription, setAssetDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [shippingAmount, setShippingAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [usefulLife, setUsefulLife] = useState('');
  const [justification, setJustification] = useState('');
  const [showUsefulLifeInfo, setShowUsefulLifeInfo] = useState(false);

  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [requisitionLoaded, setRequisitionLoaded] = useState(false);

  const { data: vendorsData = [], isLoading: isLoadingVendors } = useProcurementVendorsQuery({
    activeOnly: true,
  });

  const createPOMutation = useCreateProcurementPurchaseOrder({
    onSuccess: (data) => {
      console.log('[POCreateCapex] Created PO:', data.id);
    },
    onError: (error) => {
      console.error('[POCreateCapex] Create PO error:', error);
      Alert.alert('Error', 'Failed to create purchase order');
    },
  });

  const submitPOMutation = useSubmitPOWithApprovalChain({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowReviewModal(false);
      Alert.alert('Success', `CapEx PO submitted for approval`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error) => {
      console.error('[POCreateCapex] Submit PO error:', error);
      Alert.alert('Error', 'Failed to submit purchase order for approval');
    },
  });

  const markRequisitionConvertedMutation = useMarkRequisitionConverted({
    onSuccess: () => {
      console.log('[POCreateCapex] Requisition marked as converted');
    },
    onError: (error) => {
      console.error('[POCreateCapex] Failed to mark requisition as converted:', error);
    },
  });

  const activeVendors = useMemo(() => {
    return vendorsData.map(v => ({
      id: v.id,
      vendor_id: v.vendor_code || v.id,
      name: v.name,
      contact_name: v.contact_name,
      phone: v.phone,
    }));
  }, [vendorsData]);

  React.useEffect(() => {
    if (isFromRequisition && !requisitionLoaded) {
      console.log('[POCreateCapex] Loading from requisition:', sourceRequisitionNumber);
      
      if (params.vendorId && params.vendorName) {
        const matchingVendor = vendorsData.find(v => v.id === params.vendorId);
        if (matchingVendor) {
          setSelectedVendor({
            id: matchingVendor.id,
            name: matchingVendor.name,
            contact_name: matchingVendor.contact_name,
            phone: matchingVendor.phone,
          });
        } else {
          setSelectedVendor({
            id: params.vendorId,
            name: params.vendorName,
          });
        }
      }
      
      if (params.departmentId && params.departmentName) {
        const matchingDept = DEPARTMENT_GL_ACCOUNTS.find(d => d.id === params.departmentId || d.name === params.departmentName);
        if (matchingDept) {
          setSelectedDepartment(matchingDept);
        }
      }
      
      if (params.notes) {
        setJustification(params.notes);
      }
      
      if (params.lineItems) {
        try {
          const parsedLineItems = JSON.parse(decodeURIComponent(params.lineItems));
          if (parsedLineItems.length > 0) {
            const firstItem = parsedLineItems[0];
            setAssetDescription(firstItem.description || '');
            const totalAmount = parsedLineItems.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0);
            setAmount(totalAmount.toString());
          }
          console.log('[POCreateCapex] Loaded line items from requisition');
        } catch (e) {
          console.error('[POCreateCapex] Failed to parse line items:', e);
        }
      }
      
      setRequisitionLoaded(true);
    }
  }, [isFromRequisition, requisitionLoaded, params, vendorsData, sourceRequisitionNumber]);

  const subtotal = useMemo(() => {
    return parseFloat(amount) || 0;
  }, [amount]);

  const total = useMemo(() => {
    const tax = parseFloat(taxAmount) || 0;
    const shipping = parseFloat(shippingAmount) || 0;
    return subtotal + tax + shipping;
  }, [subtotal, taxAmount, shippingAmount]);

  const capexGLAccount = useMemo(() => {
    if (!selectedCategory || !selectedDepartment) return null;
    return `${selectedCategory.capexGLPrefix}${selectedDepartment.id.slice(-3)}`;
  }, [selectedCategory, selectedDepartment]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getApprovalTier = (value: number): { tier: string; approvers: string[]; color: string } => {
    if (value >= 50000) {
      return { tier: 'Tier 3', approvers: ['Department Manager', 'Director', 'CFO/CEO'], color: '#EF4444' };
    } else if (value >= 10000) {
      return { tier: 'Tier 2', approvers: ['Department Manager', 'Director'], color: '#F59E0B' };
    } else {
      return { tier: 'Tier 1', approvers: ['Department Manager'], color: '#10B981' };
    }
  };

  const approvalInfo = useMemo(() => getApprovalTier(total), [total]);

  const handleSaveDraft = async () => {
    if (!selectedVendor) {
      Alert.alert('Error', 'Please select a vendor');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a department');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const lineItem: POLineItem = {
      line_id: `capex-${Date.now()}`,
      line_number: 1,
      description: assetDescription || 'CapEx Asset',
      quantity: 1,
      unit_price: subtotal,
      line_total: subtotal,
      is_stock: false,
      is_deleted: false,
      received_qty: 0,
      notes: `Category: ${selectedCategory?.name || 'N/A'}, Useful Life: ${usefulLife} years, Justification: ${justification}`,
    };

    try {
      await createPOMutation.mutateAsync({
        po_type: 'capex',
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.name,
        department_id: selectedDepartment.id,
        department_name: selectedDepartment.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id,
        source_requisition_id: sourceRequisitionId || undefined,
        source_requisition_number: sourceRequisitionNumber || undefined,
        subtotal,
        tax: parseFloat(taxAmount) || 0,
        shipping: parseFloat(shippingAmount) || 0,
        notes: notes || `CapEx G/L: ${capexGLAccount}`,
        line_items: [lineItem],
      });

      if (sourceRequisitionId && sourceRequisitionNumber) {
        await markRequisitionConvertedMutation.mutateAsync({
          requisitionId: sourceRequisitionId,
          poId: 'draft',
          poNumber: poNumber,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'CapEx PO saved as draft', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[POCreateCapex] Save draft error:', error);
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
    if (!selectedCategory) {
      Alert.alert('Validation Error', 'Please select an asset category');
      return;
    }
    if (!assetDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter an asset description');
      return;
    }
    if (subtotal <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }
    if (!usefulLife || parseInt(usefulLife) <= 0) {
      Alert.alert('Validation Error', 'Please enter estimated useful life in years');
      return;
    }
    if (justification.trim().length < MIN_JUSTIFICATION_CHARS) {
      Alert.alert('Validation Error', `Business justification must be at least ${MIN_JUSTIFICATION_CHARS} characters`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReviewModal(true);
  };

  const handleCategorySelect = (category: AssetCategory) => {
    Haptics.selectionAsync();
    setSelectedCategory(category);
    if (!usefulLife) {
      setUsefulLife(category.defaultUsefulLife.toString());
    }
    setShowCategoryPicker(false);
  };

  const confirmSubmit = async () => {
    const lineItem: POLineItem = {
      line_id: `capex-${Date.now()}`,
      line_number: 1,
      description: assetDescription,
      quantity: 1,
      unit_price: subtotal,
      line_total: subtotal,
      is_stock: false,
      is_deleted: false,
      received_qty: 0,
      notes: `Category: ${selectedCategory?.name}, Useful Life: ${usefulLife} years, Justification: ${justification}`,
    };

    try {
      const createdPO = await createPOMutation.mutateAsync({
        po_type: 'capex',
        vendor_id: selectedVendor!.id,
        vendor_name: selectedVendor!.name,
        department_id: selectedDepartment!.id,
        department_name: selectedDepartment!.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id,
        source_requisition_id: sourceRequisitionId || undefined,
        source_requisition_number: sourceRequisitionNumber || undefined,
        subtotal,
        tax: parseFloat(taxAmount) || 0,
        shipping: parseFloat(shippingAmount) || 0,
        notes: notes || `CapEx G/L: ${capexGLAccount}`,
        line_items: [lineItem],
      });

      if (sourceRequisitionId) {
        await markRequisitionConvertedMutation.mutateAsync({
          requisitionId: sourceRequisitionId,
          poId: createdPO.id,
          poNumber: createdPO.po_number,
        });
      }

      await submitPOMutation.mutateAsync({
        poId: createdPO.id,
        approvalTiers: approvalInfo.approvers.map((approver, idx) => ({
          tier: idx + 1,
          tier_name: approvalInfo.tier,
          approver_name: approver,
          approver_role: approver,
          amount_threshold: total,
        })),
      });
    } catch (error) {
      console.error('[POCreateCapex] Submit error:', error);
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active vendors found</Text>
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
                  {vendor.contact_name || 'No contact'} • {vendor.phone || 'No phone'}
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
            Department selection determines which budget pays for this CapEx
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
                  Budget: {dept.glAccount} - {dept.glDescription}
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Asset Category</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[styles.glInfoBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
          <Info size={16} color="#F59E0B" />
          <Text style={[styles.glInfoText, { color: '#F59E0B' }]}>
            Asset category determines the fixed asset classification and depreciation schedule
          </Text>
        </View>
        <ScrollView style={styles.modalContent}>
          {ASSET_CATEGORIES.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => handleCategorySelect(category)}
            >
              <View style={[styles.pickerIcon, { backgroundColor: `${category.color}15` }]}>
                {getCategoryIcon(category.id, 18, category.color)}
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{category.name}</Text>
                <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                  Asset G/L Prefix: {category.capexGLPrefix}XXX
                </Text>
              </View>
              {selectedCategory?.id === category.id && (
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
            <TouchableOpacity onPress={() => setShowReviewModal(false)} disabled={createPOMutation.isPending || submitPOMutation.isPending}>
              <X size={24} color={(createPOMutation.isPending || submitPOMutation.isPending) ? colors.textTertiary : colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Review & Submit</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>CapEx PO Summary</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>PO Number</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{poNumber}</Text>
              </View>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Type</Text>
                <View style={[styles.typeBadge, { backgroundColor: '#F59E0B15' }]}>
                  <Landmark size={12} color="#F59E0B" />
                  <Text style={[styles.typeBadgeText, { color: '#F59E0B' }]}>CAPEX</Text>
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

              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Date</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{formatDisplayDate(poDate)}</Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Asset Information</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Category</Text>
                <View style={[styles.categoryBadge, { backgroundColor: `${selectedCategory?.color}15` }]}>
                  {selectedCategory && getCategoryIcon(selectedCategory.id, 12, selectedCategory.color)}
                  <Text style={[styles.categoryBadgeText, { color: selectedCategory?.color }]}>
                    {selectedCategory?.name}
                  </Text>
                </View>
              </View>

              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Description</Text>
                <Text style={[styles.reviewValue, { color: colors.text, flex: 1, textAlign: 'right' as const }]} numberOfLines={2}>
                  {assetDescription}
                </Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Useful Life</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {usefulLife} years
                </Text>
              </View>

              <View style={[styles.glHighlight, { backgroundColor: '#F59E0B15' }]}>
                <Text style={[styles.glHighlightLabel, { color: '#F59E0B' }]}>CAPEX G/L ACCOUNT</Text>
                <Text style={[styles.glHighlightValue, { color: '#F59E0B' }]}>
                  {capexGLAccount} - {selectedCategory?.name} ({selectedDepartment?.name})
                </Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.reviewCardHeader}>
                <FileCheck size={16} color={colors.primary} />
                <Text style={[styles.reviewCardTitle, { color: colors.text, marginBottom: 0 }]}>Business Justification</Text>
              </View>
              <Text style={[styles.justificationText, { color: colors.text }]}>
                {justification}
              </Text>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Totals</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Asset Amount</Text>
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

            <View style={[styles.approvalTierCard, { backgroundColor: `${approvalInfo.color}10`, borderColor: approvalInfo.color }]}>
              <View style={styles.approvalTierHeader}>
                <AlertTriangle size={18} color={approvalInfo.color} />
                <Text style={[styles.approvalTierTitle, { color: approvalInfo.color }]}>
                  {approvalInfo.tier} Approval Required
                </Text>
              </View>
              <Text style={[styles.approvalTierSubtitle, { color: approvalInfo.color }]}>
                Amount: {formatCurrency(total)}
              </Text>
              <View style={styles.approversList}>
                <Text style={[styles.approversLabel, { color: colors.textSecondary }]}>Approvers:</Text>
                {approvalInfo.approvers.map((approver, idx) => (
                  <View key={idx} style={styles.approverRow}>
                    <View style={[styles.approverDot, { backgroundColor: approvalInfo.color }]} />
                    <Text style={[styles.approverText, { color: colors.text }]}>{approver}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary, opacity: (createPOMutation.isPending || submitPOMutation.isPending) ? 0.7 : 1 }]}
                onPress={confirmSubmit}
                disabled={createPOMutation.isPending || submitPOMutation.isPending}
              >
                {(createPOMutation.isPending || submitPOMutation.isPending) ? (
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Create CapEx PO' }} />

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
              <View style={[styles.typeBadge, { backgroundColor: '#F59E0B15' }]}>
                <Landmark size={12} color="#F59E0B" />
                <Text style={[styles.typeBadgeText, { color: '#F59E0B' }]}>CAPEX</Text>
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
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Department (Budget) *</Text>
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
                        Budget: {selectedDepartment.glAccount}
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
              <Landmark size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Asset Information</Text>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Asset Category *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowCategoryPicker(true)}
              >
                {selectedCategory ? (
                  <View style={styles.selectedValue}>
                    {getCategoryIcon(selectedCategory.id, 16, selectedCategory.color)}
                    <Text style={[styles.selectedValueText, { color: colors.text }]}>{selectedCategory.name}</Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select asset category...
                  </Text>
                )}
                <ChevronDown size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Asset Description *</Text>
              <TextInput
                style={[styles.descriptionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={assetDescription}
                onChangeText={setAssetDescription}
                placeholder="Enter detailed asset description..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount *</Text>
              <View style={[styles.amountInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <DollarSign size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {selectedCategory && selectedDepartment && (
              <View style={[styles.glPreview, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B' }]}>
                <Info size={14} color="#F59E0B" />
                <Text style={[styles.glPreviewText, { color: '#F59E0B' }]}>
                  CapEx G/L Account: {capexGLAccount} ({selectedCategory.name} - {selectedDepartment.name})
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Depreciation & Justification</Text>
            </View>

            <View style={styles.formField}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Estimated Useful Life (Years) *</Text>
                <TouchableOpacity onPress={() => setShowUsefulLifeInfo(!showUsefulLifeInfo)}>
                  <Info size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.usefulLifeContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Clock size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.usefulLifeInput, { color: colors.text }]}
                  value={usefulLife}
                  onChangeText={setUsefulLife}
                  placeholder="Enter years"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[styles.yearsLabel, { color: colors.textSecondary }]}>years</Text>
              </View>
              {showUsefulLifeInfo && (
                <View style={[styles.usefulLifeInfoBox, { backgroundColor: '#8B5CF610', borderColor: '#8B5CF6' }]}>
                  <Text style={[styles.usefulLifeInfoTitle, { color: '#8B5CF6' }]}>Standard Depreciation Guidelines:</Text>
                  {USEFUL_LIFE_GUIDANCE.map((item, idx) => (
                    <View key={idx} style={styles.usefulLifeInfoRow}>
                      <Text style={[styles.usefulLifeCategory, { color: colors.text }]}>{item.category}:</Text>
                      <Text style={[styles.usefulLifeRange, { color: colors.textSecondary }]}>{item.range}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formField}>
              <View style={styles.fieldLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Business Justification *</Text>
                <Text style={[
                  styles.charCounter, 
                  { color: justification.length >= MIN_JUSTIFICATION_CHARS ? '#10B981' : colors.textSecondary }
                ]}>
                  {justification.length}/{MIN_JUSTIFICATION_CHARS} min
                </Text>
              </View>
              <TextInput
                style={[styles.justificationInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={justification}
                onChangeText={setJustification}
                placeholder="Explain the business need and expected benefits of this capital expenditure..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {justification.length > 0 && justification.length < MIN_JUSTIFICATION_CHARS && (
                <View style={[styles.charWarning, { backgroundColor: '#F59E0B10' }]}>
                  <AlertTriangle size={12} color="#F59E0B" />
                  <Text style={[styles.charWarningText, { color: '#F59E0B' }]}>
                    {MIN_JUSTIFICATION_CHARS - justification.length} more characters required
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>PO Totals</Text>

            <View style={styles.totalsRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Asset Amount</Text>
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

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes for this CapEx PO..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {total > 0 && (
            <View style={[styles.approvalPreview, { backgroundColor: `${approvalInfo.color}10`, borderColor: approvalInfo.color }]}>
              <AlertTriangle size={16} color={approvalInfo.color} />
              <View style={styles.approvalPreviewContent}>
                <Text style={[styles.approvalPreviewTitle, { color: approvalInfo.color }]}>
                  {approvalInfo.tier} Approval Required
                </Text>
                <Text style={[styles.approvalPreviewText, { color: colors.textSecondary }]}>
                  {approvalInfo.approvers.join(' → ')}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.draftButton, { borderColor: colors.border, opacity: createPOMutation.isPending ? 0.7 : 1 }]}
              onPress={handleSaveDraft}
              disabled={createPOMutation.isPending}
            >
              {createPOMutation.isPending ? (
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
  descriptionInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600' as const,
  },
  glPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  glPreviewText: {
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usefulLifeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  usefulLifeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  yearsLabel: {
    fontSize: 14,
  },
  usefulLifeInfoBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  usefulLifeInfoTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  usefulLifeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  usefulLifeCategory: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  usefulLifeRange: {
    fontSize: 12,
  },
  justificationInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  charCounter: {
    fontSize: 12,
  },
  charWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  charWarningText: {
    fontSize: 12,
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
    textAlign: 'right' as const,
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
  approvalPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  approvalPreviewContent: {
    flex: 1,
  },
  approvalPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  approvalPreviewText: {
    fontSize: 12,
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
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  glHighlight: {
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  glHighlightLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  glHighlightValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  grandTotalRow: {
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
  },
  approvalTierCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  approvalTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  approvalTierTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  approvalTierSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  approversList: {
    gap: 6,
  },
  approversLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  approverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  approverText: {
    fontSize: 13,
    fontWeight: '500' as const,
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center' as const,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: 14,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  justificationText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
