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
  Plus,
  Trash2,
  Search,
  Users,
  Calendar,
  CheckCircle,
  FileText,
  ChevronDown,
  Info,
  Send,
  HardHat,
  Wrench,
  ClipboardList,
  Phone,
  AlertCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useProcurementVendorsQuery, useCreateProcurementPurchaseOrder, useSubmitPurchaseOrder, POLineItem } from '@/hooks/useSupabaseProcurement';
import { Tables } from '@/lib/supabase';

type ProcurementVendor = Tables['procurement_vendors'];

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
  { id: 'electrical', name: 'Electrical', icon: 'zap' },
  { id: 'plumbing', name: 'Plumbing', icon: 'droplet' },
  { id: 'hvac', name: 'HVAC', icon: 'thermometer' },
  { id: 'mechanical', name: 'Mechanical', icon: 'cog' },
  { id: 'refrigeration', name: 'Refrigeration', icon: 'snowflake' },
  { id: 'janitorial', name: 'Janitorial', icon: 'sparkles' },
  { id: 'pest_control', name: 'Pest Control', icon: 'bug' },
  { id: 'landscaping', name: 'Landscaping', icon: 'trees' },
  { id: 'security', name: 'Security', icon: 'shield' },
  { id: 'it_services', name: 'IT Services', icon: 'monitor' },
  { id: 'construction', name: 'Construction', icon: 'hard-hat' },
  { id: 'consulting', name: 'Consulting', icon: 'users' },
  { id: 'other', name: 'Other', icon: 'more-horizontal' },
];

interface ServiceLineItem {
  id: string;
  lineNumber: number;
  description: string;
  serviceCategory: string;
  estimatedHours: number;
  hourlyRate: number;
  estimatedTotal: number;
  isDeleted: boolean;
  notes: string;
}

const generateServicePONumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `SVC-PO-${year}${month}${day}-${random}`;
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

export default function POCreateServiceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const params = useLocalSearchParams<{
    fromTaskFeed?: string;
    taskId?: string;
    taskNumber?: string;
    departmentId?: string;
    departmentName?: string;
    serviceDescription?: string;
  }>();

  const { data: vendors = [], isLoading: vendorsLoading } = useProcurementVendorsQuery({ 
    activeOnly: true,
    vendorType: 'service',
  });
  
  const { data: allVendors = [] } = useProcurementVendorsQuery({ activeOnly: true });

  const isFromTaskFeed = params.fromTaskFeed === 'true';
  const sourceTaskNumber = params.taskNumber;

  const createPOMutation = useCreateProcurementPurchaseOrder({
    onSuccess: (data) => {
      console.log('[POCreateService] PO created:', data.id);
    },
    onError: (error) => {
      console.error('[POCreateService] Create error:', error);
      Alert.alert('Error', 'Failed to create service PO');
    },
  });

  const submitPOMutation = useSubmitPurchaseOrder({
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Service PO created and marked as ordered. Invoice will be processed when received.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error) => {
      console.error('[POCreateService] Submit error:', error);
      Alert.alert('Error', 'Failed to submit service PO');
    },
  });

  const [poNumber] = useState(generateServicePONumber());
  const [poDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendor, setSelectedVendor] = useState<ProcurementVendor | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentGLMapping | null>(null);
  const [serviceDescription, setServiceDescription] = useState(params.serviceDescription || '');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [serviceCategory, setServiceCategory] = useState<string>('');
  const [lineItems, setLineItems] = useState<ServiceLineItem[]>([]);
  const [estimatedTotal, setEstimatedTotal] = useState('0.00');
  const [notToExceed, setNotToExceed] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isFromTaskFeed && params.departmentId && params.departmentName) {
      const matchingDept = DEPARTMENT_GL_ACCOUNTS.find(
        d => d.id === params.departmentId || d.name === params.departmentName
      );
      if (matchingDept) {
        setSelectedDepartment(matchingDept);
      }
    }
  }, [isFromTaskFeed, params.departmentId, params.departmentName]);

  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  const serviceVendors = useMemo(() => {
    const svcs = vendors.length > 0 ? vendors : allVendors.filter(v => 
      v.vendor_type === 'service' || v.categories?.includes('service')
    );
    
    if (!vendorSearchQuery.trim()) return svcs;
    
    const query = vendorSearchQuery.toLowerCase();
    return svcs.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.contact_name?.toLowerCase().includes(query)
    );
  }, [vendors, allVendors, vendorSearchQuery]);

  const subtotal = useMemo(() => {
    return lineItems
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + item.estimatedTotal, 0);
  }, [lineItems]);

  const total = useMemo(() => {
    const est = parseFloat(estimatedTotal) || 0;
    return subtotal > 0 ? subtotal : est;
  }, [subtotal, estimatedTotal]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAddLineItem = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newLine: ServiceLineItem = {
      id: `svc-line-${Date.now()}`,
      lineNumber: lineItems.length + 1,
      description: '',
      serviceCategory: serviceCategory || 'other',
      estimatedHours: 0,
      hourlyRate: 0,
      estimatedTotal: 0,
      isDeleted: false,
      notes: '',
    };
    setLineItems(prev => [...prev, newLine]);
  };

  const handleUpdateLineItem = (index: number, field: keyof ServiceLineItem, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'estimatedHours' || field === 'hourlyRate') {
        const hours = field === 'estimatedHours' ? value : updated[index].estimatedHours;
        const rate = field === 'hourlyRate' ? value : updated[index].hourlyRate;
        updated[index].estimatedTotal = (parseFloat(hours) || 0) * (parseFloat(rate) || 0);
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
      Alert.alert('Error', 'Please select a service vendor');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Error', 'Please select a department');
      return;
    }
    if (!serviceDescription.trim()) {
      Alert.alert('Error', 'Please enter a service description');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const activeLines = lineItems.filter(item => !item.isDeleted);
      const poLineItems: POLineItem[] = activeLines.length > 0 
        ? activeLines.map(line => ({
            line_id: line.id,
            line_number: line.lineNumber,
            description: line.description || serviceDescription,
            quantity: line.estimatedHours || 1,
            unit_price: line.hourlyRate || 0,
            line_total: line.estimatedTotal,
            is_stock: false,
            is_deleted: false,
            received_qty: 0,
            uom: 'HR',
            notes: line.notes,
          }))
        : [{
            line_id: `svc-line-${Date.now()}`,
            line_number: 1,
            description: serviceDescription,
            quantity: 1,
            unit_price: total,
            line_total: total,
            is_stock: false,
            is_deleted: false,
            received_qty: 0,
            uom: 'JOB',
            notes: scopeOfWork,
          }];

      await createPOMutation.mutateAsync({
        po_type: 'service',
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.name,
        department_id: selectedDepartment.id,
        department_name: selectedDepartment.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id,
        subtotal: total,
        tax: 0,
        shipping: 0,
        notes: `${notes}\n\nScope of Work: ${scopeOfWork}\n\nService Category: ${serviceCategory || 'General'}\n\nNot to Exceed: ${notToExceed ? formatCurrency(parseFloat(notToExceed)) : 'N/A'}${sourceTaskNumber ? `\n\nLinked Task: ${sourceTaskNumber}` : ''}`.trim(),
        line_items: poLineItems,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Service PO saved as draft', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[POCreateService] Save draft error:', error);
      Alert.alert('Error', 'Failed to save service PO');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAndOrder = () => {
    if (!selectedVendor) {
      Alert.alert('Validation Error', 'Please select a service vendor');
      return;
    }
    if (!selectedDepartment) {
      Alert.alert('Validation Error', 'Please select a department');
      return;
    }
    if (!serviceDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter a service description');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReviewModal(true);
  };

  const confirmCreateAndOrder = async () => {
    setIsSubmitting(true);
    
    try {
      const activeLines = lineItems.filter(item => !item.isDeleted);
      const poLineItems: POLineItem[] = activeLines.length > 0 
        ? activeLines.map(line => ({
            line_id: line.id,
            line_number: line.lineNumber,
            description: line.description || serviceDescription,
            quantity: line.estimatedHours || 1,
            unit_price: line.hourlyRate || 0,
            line_total: line.estimatedTotal,
            is_stock: false,
            is_deleted: false,
            received_qty: 0,
            uom: 'HR',
            notes: line.notes,
          }))
        : [{
            line_id: `svc-line-${Date.now()}`,
            line_number: 1,
            description: serviceDescription,
            quantity: 1,
            unit_price: total,
            line_total: total,
            is_stock: false,
            is_deleted: false,
            received_qty: 0,
            uom: 'JOB',
            notes: scopeOfWork,
          }];

      const createdPO = await createPOMutation.mutateAsync({
        po_type: 'service',
        vendor_id: selectedVendor!.id,
        vendor_name: selectedVendor!.name,
        department_id: selectedDepartment!.id,
        department_name: selectedDepartment!.name,
        created_by: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Unknown',
        created_by_id: user?.id,
        subtotal: total,
        tax: 0,
        shipping: 0,
        notes: `${notes}\n\nScope of Work: ${scopeOfWork}\n\nService Category: ${serviceCategory || 'General'}\n\nNot to Exceed: ${notToExceed ? formatCurrency(parseFloat(notToExceed)) : 'N/A'}${sourceTaskNumber ? `\n\nLinked Task: ${sourceTaskNumber}` : ''}`.trim(),
        line_items: poLineItems,
      });

      await submitPOMutation.mutateAsync(createdPO.id);
      setShowReviewModal(false);
    } catch (error) {
      console.error('[POCreateService] Create and order error:', error);
      Alert.alert('Error', 'Failed to create service PO');
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Service Vendor</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search vendors..."
              placeholderTextColor={colors.textSecondary}
              value={vendorSearchQuery}
              onChangeText={setVendorSearchQuery}
            />
            {vendorSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setVendorSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {vendorsLoading ? (
            <View style={styles.searchHint}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>Loading vendors...</Text>
            </View>
          ) : serviceVendors.length === 0 ? (
            <View style={styles.searchHint}>
              <HardHat size={32} color={colors.textTertiary} />
              <Text style={[styles.searchHintText, { color: colors.textSecondary }]}>No service vendors found</Text>
              <Text style={[styles.searchHintSubtext, { color: colors.textTertiary }]}>
                Add vendors in Vendor Management
              </Text>
            </View>
          ) : serviceVendors.map(vendor => (
            <TouchableOpacity
              key={vendor.id}
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedVendor(vendor);
                setShowVendorPicker(false);
                setVendorSearchQuery('');
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: '#F9731615' }]}>
                <HardHat size={18} color="#F97316" />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{vendor.name}</Text>
                <View style={styles.vendorContactRow}>
                  {vendor.contact_name && (
                    <Text style={[styles.pickerOptionSubtitle, { color: colors.textSecondary }]}>
                      {vendor.contact_name}
                    </Text>
                  )}
                </View>
                <View style={styles.vendorContactRow}>
                  {vendor.phone && (
                    <View style={styles.vendorContactItem}>
                      <Phone size={12} color={colors.textTertiary} />
                      <Text style={[styles.vendorContactText, { color: colors.textTertiary }]}>{vendor.phone}</Text>
                    </View>
                  )}
                </View>
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
            Department selection determines the G/L account for this service expense
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
          <Text style={[styles.modalTitle, { color: colors.text }]}>Service Category</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {SERVICE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.pickerOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                setServiceCategory(cat.id);
                setShowCategoryPicker(false);
              }}
            >
              <View style={[styles.pickerIcon, { backgroundColor: '#8B5CF615' }]}>
                <Wrench size={18} color="#8B5CF6" />
              </View>
              <View style={styles.pickerOptionContent}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{cat.name}</Text>
              </View>
              {serviceCategory === cat.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Review Service PO</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.infoBanner, { backgroundColor: '#F9731615', borderColor: '#F97316' }]}>
              <AlertCircle size={18} color="#F97316" />
              <View style={styles.infoBannerContent}>
                <Text style={[styles.infoBannerTitle, { color: '#F97316' }]}>Service PO Flow</Text>
                <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                  This PO will be created and marked as Ordered. When the service is complete and 
                  you receive the invoice, a requisition will be created for approval before payment.
                </Text>
              </View>
            </View>

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

              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Category</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>
                  {SERVICE_CATEGORIES.find(c => c.id === serviceCategory)?.name || 'General'}
                </Text>
              </View>
            </View>

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Service Details</Text>
              
              <Text style={[styles.reviewDescription, { color: colors.text }]}>{serviceDescription}</Text>
              
              {scopeOfWork && (
                <View style={styles.scopeSection}>
                  <Text style={[styles.scopeLabel, { color: colors.textSecondary }]}>Scope of Work:</Text>
                  <Text style={[styles.scopeText, { color: colors.text }]}>{scopeOfWork}</Text>
                </View>
              )}
            </View>

            {activeLines.length > 0 && (
              <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Line Items ({activeLines.length})</Text>
                
                {activeLines.map((line, idx) => (
                  <View key={line.id} style={[styles.reviewLineItem, idx < activeLines.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                    <Text style={[styles.reviewLineDescription, { color: colors.text }]}>{line.description}</Text>
                    <View style={styles.reviewLineFooter}>
                      <Text style={[styles.reviewLineQty, { color: colors.textSecondary }]}>
                        {line.estimatedHours} hrs × {formatCurrency(line.hourlyRate)}/hr
                      </Text>
                      <Text style={[styles.reviewLineTotal, { color: colors.text }]}>{formatCurrency(line.estimatedTotal)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.reviewCardTitle, { color: colors.text }]}>Estimated Amounts</Text>
              
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Estimated Total</Text>
                <Text style={[styles.reviewValue, { color: colors.text }]}>{formatCurrency(total)}</Text>
              </View>
              
              {notToExceed && (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Not to Exceed</Text>
                  <Text style={[styles.reviewValue, { color: '#EF4444' }]}>{formatCurrency(parseFloat(notToExceed))}</Text>
                </View>
              )}

              <View style={[styles.noteBox, { backgroundColor: colors.backgroundTertiary }]}>
                <Info size={14} color={colors.textSecondary} />
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                  Final amount will be determined when invoice is received
                </Text>
              </View>
            </View>

            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: '#F97316', opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={confirmCreateAndOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Send size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Create & Order Service</Text>
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

  const renderLineItem = (item: ServiceLineItem, index: number) => {
    if (item.isDeleted) return null;

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
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={item.description}
            onChangeText={(text) => handleUpdateLineItem(index, 'description', text)}
            placeholder="Service line description..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.lineItemRow}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Est. Hours</Text>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={item.estimatedHours.toString()}
              onChangeText={(text) => handleUpdateLineItem(index, 'estimatedHours', parseFloat(text) || 0)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Hourly Rate</Text>
            <TextInput
              style={[styles.numberInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={item.hourlyRate.toFixed(2)}
              onChangeText={(text) => handleUpdateLineItem(index, 'hourlyRate', parseFloat(text) || 0)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Est. Total</Text>
            <View style={[styles.readOnlyInput, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.readOnlyText, { color: colors.text }]}>
                {formatCurrency(item.estimatedTotal)}
              </Text>
            </View>
          </View>
        </View>
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
          {isFromTaskFeed && sourceTaskNumber && (
            <View style={[styles.linkedTaskBanner, { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }]}>
              <ClipboardList size={18} color="#3B82F6" />
              <View style={styles.linkedTaskContent}>
                <Text style={[styles.linkedTaskLabel, { color: '#3B82F6' }]}>Linked to Task</Text>
                <Text style={[styles.linkedTaskNumber, { color: colors.text }]}>{sourceTaskNumber}</Text>
              </View>
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <HardHat size={18} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Service PO Header</Text>
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
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Vendor *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowVendorPicker(true)}
              >
                {selectedVendor ? (
                  <View style={styles.selectedValue}>
                    <HardHat size={16} color="#F97316" />
                    <Text style={[styles.selectedValueText, { color: colors.text }]}>{selectedVendor.name}</Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select a service vendor...
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

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Category</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowCategoryPicker(true)}
              >
                {serviceCategory ? (
                  <View style={styles.selectedValue}>
                    <Wrench size={16} color="#8B5CF6" />
                    <Text style={[styles.selectedValueText, { color: colors.text }]}>
                      {SERVICE_CATEGORIES.find(c => c.id === serviceCategory)?.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select a category...
                  </Text>
                )}
                <ChevronDown size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Details</Text>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Description *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={serviceDescription}
                onChangeText={setServiceDescription}
                placeholder="Brief description of the service needed..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Scope of Work</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={scopeOfWork}
                onChangeText={setScopeOfWork}
                placeholder="Detailed scope of work, expectations, requirements..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <ClipboardList size={18} color="#F97316" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Line Items (Optional)</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#F9731615' }]}
                onPress={handleAddLineItem}
              >
                <Plus size={16} color="#F97316" />
                <Text style={[styles.addButtonText, { color: '#F97316' }]}>Add Line</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.lineItemsHint, { backgroundColor: colors.backgroundTertiary }]}>
              <Info size={14} color={colors.textSecondary} />
              <Text style={[styles.lineItemsHintText, { color: colors.textSecondary }]}>
                Line items are optional. You can enter an estimated total below if you do not have line-by-line details.
              </Text>
            </View>

            {lineItems.filter(i => !i.isDeleted).map((item, index) => renderLineItem(item, index))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Estimated Costs</Text>
            </View>

            {lineItems.filter(i => !i.isDeleted).length === 0 && (
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Estimated Total</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={estimatedTotal}
                  onChangeText={setEstimatedTotal}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Not to Exceed (NTE)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={notToExceed}
                onChangeText={setNotToExceed}
                placeholder="Maximum amount (optional)"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Estimated Total</Text>
              <Text style={[styles.totalValue, { color: '#F97316' }]}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            </View>

            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes, special instructions..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <FileText size={18} color={colors.text} />
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Save Draft</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#F97316' }]}
              onPress={handleCreateAndOrder}
            >
              <Send size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Create & Order</Text>
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
  linkedTaskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  linkedTaskContent: {
    flex: 1,
  },
  linkedTaskLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  linkedTaskNumber: {
    fontSize: 14,
    fontWeight: '600',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  headerField: {
    flex: 1,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  readOnlyFieldText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorPlaceholder: {
    fontSize: 14,
  },
  selectedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedValueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  departmentValue: {
    flex: 1,
  },
  glAccountText: {
    fontSize: 12,
    marginTop: 2,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 100,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lineItemsHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  lineItemsHintText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  lineItemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineNumber: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  numberInput: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  readOnlyInput: {
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalBottomPadding: {
    height: 40,
  },
  searchSection: {
    padding: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchHint: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  searchHintText: {
    fontSize: 14,
  },
  searchHintSubtext: {
    fontSize: 12,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  pickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pickerOptionContent: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerOptionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  vendorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  vendorContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorContactText: {
    fontSize: 12,
  },
  glInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  glInfoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 12,
    lineHeight: 18,
  },
  reviewCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reviewLabel: {
    fontSize: 13,
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  reviewDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  scopeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  scopeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  scopeText: {
    fontSize: 13,
    lineHeight: 20,
  },
  reviewLineItem: {
    paddingVertical: 10,
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
    fontWeight: '600',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  noteText: {
    fontSize: 12,
    flex: 1,
  },
  submitSection: {
    padding: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
