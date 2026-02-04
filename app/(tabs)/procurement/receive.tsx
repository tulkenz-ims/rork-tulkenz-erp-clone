import React, { useState, useMemo, useCallback } from 'react';
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
import { Stack } from 'expo-router';
import {
  X,
  Package,
  Wrench,
  Building2,
  ChevronDown,
  CheckCircle,
  Calendar,
  FileText,
  Truck,
  ClipboardCheck,
  AlertCircle,
  MapPin,
  Tag,
  Clock,
  DollarSign,
  Paperclip,
  Send,
  Check,
  Archive,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  useProcurementPurchaseOrdersQuery,
  useCreateMaterialReceipt,
  useUpdateProcurementPurchaseOrder,
  POLineItem,
  ReceiptLineItem,
} from '@/hooks/useSupabaseProcurement';
import { Tables } from '@/lib/supabase';

type ProcurementPurchaseOrder = Tables['procurement_purchase_orders'];

type ReceiveTab = 'migo' | 'ses' | 'capex';

interface ReceivingLineItem {
  line_id: string;
  line_number: number;
  material_id?: string;
  material_sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_stock: boolean;
  is_deleted: boolean;
  received_qty: number;
  uom?: string;
  notes?: string;
  previouslyReceived: number;
  remaining: number;
  receivedQtyInput: string;
}

interface SESLineInput {
  lineId: string;
  poLineId: string;
  description: string;
  orderedQty: number;
  actualQty: string;
  rate: number;
  lineTotal: number;
  notes: string;
}

const LOCATIONS = [
  { id: 'loc-001', name: 'Main Plant - Production Floor' },
  { id: 'loc-002', name: 'Main Plant - Warehouse' },
  { id: 'loc-003', name: 'Main Plant - Office Building' },
  { id: 'loc-004', name: 'Main Plant - Maintenance Shop' },
  { id: 'loc-005', name: 'Distribution Center A' },
  { id: 'loc-006', name: 'Distribution Center B' },
  { id: 'loc-007', name: 'Corporate Office' },
  { id: 'loc-008', name: 'R&D Facility' },
];

const generateSESNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `SES-${year}${month}${day}-${random}`;
};

const generateAssetTag = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900) + 100;
  return `AST-${year}${month}${day}-${random}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function ReceiveScreen() {
  const { colors } = useTheme();
  const { userProfile } = useUser();

  const [activeTab, setActiveTab] = useState<ReceiveTab>('migo');

  const materialPOsQuery = useProcurementPurchaseOrdersQuery({
    poType: 'material',
    status: ['approved', 'ordered', 'partial_received'],
  });

  const servicePOsQuery = useProcurementPurchaseOrdersQuery({
    poType: 'service',
    status: ['approved'],
  });

  const capexPOsQuery = useProcurementPurchaseOrdersQuery({
    poType: 'capex',
    status: ['approved'],
  });

  const createMaterialReceipt = useCreateMaterialReceipt({
    onSuccess: (receipt) => {
      console.log('[Receive] Material receipt created:', receipt.receipt_number);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Receipt Posted',
        `Receipt ${receipt.receipt_number} has been posted successfully.\n\nStock items have been added to inventory.\nConsumables have been expensed to department G/L.`,
        [{ text: 'OK', onPress: resetMaterialForm }]
      );
    },
    onError: (error) => {
      console.error('[Receive] Error creating receipt:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to post receipt');
    },
  });

  const updatePO = useUpdateProcurementPurchaseOrder({
    onSuccess: () => {
      console.log('[Receive] PO updated successfully');
    },
    onError: (error) => {
      console.error('[Receive] Error updating PO:', error);
    },
  });

  const [selectedMaterialPO, setSelectedMaterialPO] = useState<ProcurementPurchaseOrder | null>(null);
  const [materialReceiptLines, setMaterialReceiptLines] = useState<ReceivingLineItem[]>([]);
  const [materialReceiptNotes, setMaterialReceiptNotes] = useState('');
  const [showMaterialPOPicker, setShowMaterialPOPicker] = useState(false);

  const [selectedServicePO, setSelectedServicePO] = useState<ProcurementPurchaseOrder | null>(null);
  const [sesLines, setSesLines] = useState<SESLineInput[]>([]);
  const [sesCompletionDate, setSesCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sesNotes, setSesNotes] = useState('');
  const [sesAttachments, setSesAttachments] = useState<string[]>([]);
  const [showServicePOPicker, setShowServicePOPicker] = useState(false);
  const [isSubmittingSES, setIsSubmittingSES] = useState(false);

  const [selectedCapExPO, setSelectedCapExPO] = useState<ProcurementPurchaseOrder | null>(null);
  const [assetTag] = useState(generateAssetTag());
  const [assetLocation, setAssetLocation] = useState<typeof LOCATIONS[0] | null>(null);
  const [placedInServiceDate, setPlacedInServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetNotes, setAssetNotes] = useState('');
  const [showCapExPOPicker, setShowCapExPOPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isPostingCapEx, setIsPostingCapEx] = useState(false);

  const approvedMaterialPOs = materialPOsQuery.data || [];
  const approvedServicePOs = servicePOsQuery.data || [];
  const approvedCapExPOs = capexPOsQuery.data || [];


  const resetMaterialForm = useCallback(() => {
    setSelectedMaterialPO(null);
    setMaterialReceiptLines([]);
    setMaterialReceiptNotes('');
  }, []);

  const resetServiceForm = useCallback(() => {
    setSelectedServicePO(null);
    setSesLines([]);
    setSesCompletionDate(new Date().toISOString().split('T')[0]);
    setSesNotes('');
    setSesAttachments([]);
  }, []);

  const resetCapExForm = useCallback(() => {
    setSelectedCapExPO(null);
    setAssetLocation(null);
    setPlacedInServiceDate(new Date().toISOString().split('T')[0]);
    setAssetNotes('');
  }, []);

  const handleSelectMaterialPO = useCallback((po: ProcurementPurchaseOrder) => {
    Haptics.selectionAsync();
    setSelectedMaterialPO(po);
    
    const poLineItems = (po.line_items || []) as unknown as POLineItem[];
    const lines: ReceivingLineItem[] = poLineItems
      .filter(item => !item.is_deleted)
      .map(item => {
        const remaining = item.quantity - (item.received_qty || 0);
        return {
          line_id: item.line_id,
          line_number: item.line_number,
          material_id: item.material_id,
          material_sku: item.material_sku,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
          is_stock: item.is_stock,
          is_deleted: item.is_deleted,
          received_qty: item.received_qty || 0,
          uom: item.uom,
          notes: item.notes,
          previouslyReceived: item.received_qty || 0,
          remaining,
          receivedQtyInput: remaining > 0 ? remaining.toString() : '0',
        };
      });
    
    setMaterialReceiptLines(lines);
    setShowMaterialPOPicker(false);
    console.log('[MIGO] Selected PO:', po.po_number, 'Lines:', lines.length);
  }, []);

  const handleSelectServicePO = useCallback((po: ProcurementPurchaseOrder) => {
    Haptics.selectionAsync();
    setSelectedServicePO(po);
    
    const poLineItems = (po.line_items || []) as unknown as POLineItem[];
    const lines: SESLineInput[] = poLineItems
      .filter(item => !item.is_deleted)
      .map(item => ({
        lineId: `ses-line-${item.line_id}`,
        poLineId: item.line_id,
        description: item.description,
        orderedQty: item.quantity,
        actualQty: item.quantity.toString(),
        rate: item.unit_price,
        lineTotal: item.line_total,
        notes: '',
      }));
    
    setSesLines(lines);
    setShowServicePOPicker(false);
    console.log('[SES] Selected PO:', po.po_number, 'Lines:', lines.length);
  }, []);

  const handleSelectCapExPO = useCallback((po: ProcurementPurchaseOrder) => {
    Haptics.selectionAsync();
    setSelectedCapExPO(po);
    setShowCapExPOPicker(false);
    console.log('[CapEx] Selected PO:', po.po_number);
  }, []);

  const handleUpdateReceivedQty = useCallback((index: number, value: string) => {
    setMaterialReceiptLines(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        receivedQtyInput: value,
      };
      return updated;
    });
  }, []);

  const handleUpdateSESLine = useCallback((index: number, field: keyof SESLineInput, value: string) => {
    setSesLines(prev => {
      const updated = [...prev];
      if (field === 'actualQty') {
        const qty = parseFloat(value) || 0;
        updated[index] = {
          ...updated[index],
          actualQty: value,
          lineTotal: qty * updated[index].rate,
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  }, []);

  const materialReceiptTotal = useMemo(() => {
    return materialReceiptLines.reduce((sum, line) => {
      const receivedQty = parseFloat(line.receivedQtyInput) || 0;
      return sum + (receivedQty * line.unit_price);
    }, 0);
  }, [materialReceiptLines]);

  const sesTotal = useMemo(() => {
    return sesLines.reduce((sum, line) => sum + line.lineTotal, 0);
  }, [sesLines]);

  const handlePostMaterialReceipt = async () => {
    if (!selectedMaterialPO) return;

    const invalidLines = materialReceiptLines.filter(line => {
      const receivedQty = parseFloat(line.receivedQtyInput) || 0;
      return receivedQty > line.remaining;
    });

    if (invalidLines.length > 0) {
      Alert.alert('Validation Error', 'Received quantity cannot exceed remaining quantity');
      return;
    }

    const hasAnyReceived = materialReceiptLines.some(line => {
      const receivedQty = parseFloat(line.receivedQtyInput) || 0;
      return receivedQty > 0;
    });

    if (!hasAnyReceived) {
      Alert.alert('Validation Error', 'Please enter at least one received quantity');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const receiptLineItems: ReceiptLineItem[] = materialReceiptLines
      .filter(line => {
        const receivedQty = parseFloat(line.receivedQtyInput) || 0;
        return receivedQty > 0;
      })
      .map(line => ({
        line_id: `rcv-${line.line_id}-${Date.now()}`,
        po_line_id: line.line_id,
        material_id: line.material_id,
        material_sku: line.material_sku,
        description: line.description,
        ordered_qty: line.quantity,
        previously_received: line.previouslyReceived,
        received_qty: parseFloat(line.receivedQtyInput) || 0,
        is_stock: line.is_stock,
        uom: line.uom,
      }));

    console.log('[MIGO] Posting receipt for PO:', selectedMaterialPO.po_number);
    receiptLineItems.forEach(line => {
      if (line.is_stock) {
        console.log(`[MIGO] Stock item ${line.material_sku}: +${line.received_qty} to inventory`);
      } else {
        console.log(`[MIGO] Consumable ${line.description}: received ${line.received_qty}`);
      }
    });

    createMaterialReceipt.mutate({
      po_id: selectedMaterialPO.id,
      po_number: selectedMaterialPO.po_number,
      vendor_id: selectedMaterialPO.vendor_id || undefined,
      vendor_name: selectedMaterialPO.vendor_name || undefined,
      received_by: userProfile?.id,
      received_by_name: userProfile?.first_name && userProfile?.last_name 
        ? `${userProfile.first_name} ${userProfile.last_name}` 
        : userProfile?.email || 'Unknown User',
      notes: materialReceiptNotes || undefined,
      line_items: receiptLineItems,
    });
  };

  const handleSubmitSES = async () => {
    if (!selectedServicePO) return;

    const invalidLines = sesLines.filter(line => {
      const actualQty = parseFloat(line.actualQty) || 0;
      return actualQty <= 0;
    });

    if (invalidLines.length > 0) {
      Alert.alert('Validation Error', 'All service lines must have actual quantity/hours performed');
      return;
    }

    setIsSubmittingSES(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sesNumber = generateSESNumber();
    console.log('[SES] Submitting for approval:', sesNumber);
    console.log('[SES] Completion date:', sesCompletionDate);
    console.log('[SES] Total amount:', formatCurrency(sesTotal));

    try {
      await updatePO.mutateAsync({
        id: selectedServicePO.id,
        updates: {
          status: 'received',
          received_date: new Date().toISOString(),
          notes: `SES ${sesNumber} - ${sesNotes || 'Service completed'}`,
        },
      });

      setIsSubmittingSES(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'SES Submitted',
        `Service Entry Sheet ${sesNumber} has been submitted for approval.\n\nOnce approved, the expense will be posted to the department G/L account.`,
        [{ text: 'OK', onPress: resetServiceForm }]
      );
    } catch {
      setIsSubmittingSES(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to submit SES. Please try again.');
    }
  };

  const handlePostCapExReceipt = async () => {
    if (!selectedCapExPO) return;

    if (!assetLocation) {
      Alert.alert('Validation Error', 'Please select an asset location');
      return;
    }

    setIsPostingCapEx(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    console.log('[CapEx] Creating fixed asset:', assetTag);
    console.log('[CapEx] Location:', assetLocation.name);
    console.log('[CapEx] Placed in service:', placedInServiceDate);
    console.log('[CapEx] Cost:', formatCurrency(selectedCapExPO?.total || 0));

    try {
      await updatePO.mutateAsync({
        id: selectedCapExPO.id,
        updates: {
          status: 'received',
          received_date: new Date().toISOString(),
          notes: `Asset Tag: ${assetTag} | Location: ${assetLocation.name} | In Service: ${placedInServiceDate}${assetNotes ? ` | Notes: ${assetNotes}` : ''}`,
        },
      });

      setIsPostingCapEx(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Asset Capitalized',
        `Asset ${assetTag} has been created and capitalized.\n\nThe asset has been posted to the Fixed Asset G/L account (Balance Sheet).`,
        [{ text: 'OK', onPress: resetCapExForm }]
      );
    } catch {
      setIsPostingCapEx(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to capitalize asset. Please try again.');
    }
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'migo' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveTab('migo');
        }}
      >
        <Package size={18} color={activeTab === 'migo' ? colors.primary : colors.textSecondary} />
        <Text style={[styles.tabText, { color: activeTab === 'migo' ? colors.primary : colors.textSecondary }]}>
          Material
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'ses' && { borderBottomColor: '#8B5CF6', borderBottomWidth: 2 }]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveTab('ses');
        }}
      >
        <Wrench size={18} color={activeTab === 'ses' ? '#8B5CF6' : colors.textSecondary} />
        <Text style={[styles.tabText, { color: activeTab === 'ses' ? '#8B5CF6' : colors.textSecondary }]}>
          Service
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'capex' && { borderBottomColor: '#F59E0B', borderBottomWidth: 2 }]}
        onPress={() => {
          Haptics.selectionAsync();
          setActiveTab('capex');
        }}
      >
        <Building2 size={18} color={activeTab === 'capex' ? '#F59E0B' : colors.textSecondary} />
        <Text style={[styles.tabText, { color: activeTab === 'capex' ? '#F59E0B' : colors.textSecondary }]}>
          CapEx
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMaterialPOPicker = () => (
    <Modal
      visible={showMaterialPOPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowMaterialPOPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowMaterialPOPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Material PO</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {materialPOsQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Loading POs...
              </Text>
            </View>
          ) : approvedMaterialPOs.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No approved Material POs available for receiving
              </Text>
            </View>
          ) : (
            approvedMaterialPOs.map(po => {
              const lineItems = (po.line_items || []) as unknown as POLineItem[];
              return (
                <TouchableOpacity
                  key={po.id}
                  style={[styles.poOption, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectMaterialPO(po)}
                >
                  <View style={styles.poOptionHeader}>
                    <Text style={[styles.poNumber, { color: colors.primary }]}>{po.po_number}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${po.status === 'partial_received' ? '#F97316' : '#10B981'}20` }]}>
                      <Text style={[styles.statusBadgeText, { color: po.status === 'partial_received' ? '#F97316' : '#10B981' }]}>
                        {po.status === 'partial_received' ? 'Partial' : 'Ready'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.poVendor, { color: colors.text }]}>{po.vendor_name}</Text>
                  <View style={styles.poMeta}>
                    <Text style={[styles.poMetaText, { color: colors.textSecondary }]}>
                      {po.department_name}
                    </Text>
                    <Text style={[styles.poMetaText, { color: colors.textSecondary }]}>
                      {formatCurrency(po.total || 0)}
                    </Text>
                  </View>
                  <Text style={[styles.poLines, { color: colors.textSecondary }]}>
                    {lineItems.filter(l => !l.is_deleted).length} line items
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderServicePOPicker = () => (
    <Modal
      visible={showServicePOPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowServicePOPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowServicePOPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Service PO</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {servicePOsQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Loading POs...
              </Text>
            </View>
          ) : approvedServicePOs.length === 0 ? (
            <View style={styles.emptyState}>
              <Wrench size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No approved Service POs available for SES
              </Text>
            </View>
          ) : (
            approvedServicePOs.map(po => (
              <TouchableOpacity
                key={po.id}
                style={[styles.poOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectServicePO(po)}
              >
                <View style={styles.poOptionHeader}>
                  <Text style={[styles.poNumber, { color: '#8B5CF6' }]}>{po.po_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Approved</Text>
                  </View>
                </View>
                <Text style={[styles.poVendor, { color: colors.text }]}>{po.vendor_name}</Text>
                <View style={styles.poMeta}>
                  <Text style={[styles.poMetaText, { color: colors.textSecondary }]}>
                    {po.department_name}
                  </Text>
                  <Text style={[styles.poMetaText, { color: colors.textSecondary }]}>
                    {formatCurrency(po.total || 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCapExPOPicker = () => (
    <Modal
      visible={showCapExPOPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCapExPOPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowCapExPOPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select CapEx PO</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {capexPOsQuery.isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#F59E0B" />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                Loading POs...
              </Text>
            </View>
          ) : approvedCapExPOs.length === 0 ? (
            <View style={styles.emptyState}>
              <Building2 size={40} color={colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No approved CapEx POs available for receipt
              </Text>
            </View>
          ) : (
            approvedCapExPOs.map(po => (
              <TouchableOpacity
                key={po.id}
                style={[styles.poOption, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectCapExPO(po)}
              >
                <View style={styles.poOptionHeader}>
                  <Text style={[styles.poNumber, { color: '#F59E0B' }]}>{po.po_number}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>Approved</Text>
                  </View>
                </View>
                <Text style={[styles.poVendor, { color: colors.text }]}>{po.vendor_name}</Text>
                <View style={styles.poMeta}>
                  <Text style={[styles.poMetaText, { color: colors.textSecondary }]}>
                    {po.department_name}
                  </Text>
                  <Text style={[styles.poMetaText, { color: colors.textSecondary }]}>
                    {formatCurrency(po.total || 0)}
                  </Text>
                </View>
                {po.notes && (
                  <Text style={[styles.poNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                    {po.notes}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderLocationPicker = () => (
    <Modal
      visible={showLocationPicker}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowLocationPicker(false)}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {LOCATIONS.map(loc => (
            <TouchableOpacity
              key={loc.id}
              style={[styles.locationOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.selectionAsync();
                setAssetLocation(loc);
                setShowLocationPicker(false);
              }}
            >
              <MapPin size={20} color={colors.textSecondary} />
              <Text style={[styles.locationName, { color: colors.text }]}>{loc.name}</Text>
              {assetLocation?.id === loc.id && (
                <CheckCircle size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderMIGOTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Truck size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Material Receipt (MIGO)</Text>
        </View>

        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowMaterialPOPicker(true)}
        >
          {selectedMaterialPO ? (
            <View style={styles.selectedPO}>
              <Text style={[styles.selectedPONumber, { color: colors.primary }]}>
                {selectedMaterialPO.po_number}
              </Text>
              <Text style={[styles.selectedPOVendor, { color: colors.text }]}>
                {selectedMaterialPO.vendor_name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
              Select an approved Material PO...
            </Text>
          )}
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {selectedMaterialPO && (
        <>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.poHeaderInfo}>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Vendor</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedMaterialPO.vendor_name}</Text>
              </View>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedMaterialPO.department_name}</Text>
              </View>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>PO Date</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{formatDate(selectedMaterialPO.created_at || '')}</Text>
              </View>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>PO Total</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{formatCurrency(selectedMaterialPO.total || 0)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <ClipboardCheck size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Receiving Lines</Text>
            </View>

            {materialReceiptLines.map((line, index) => (
              <View
                key={line.line_id}
                style={[styles.receivingLine, { borderBottomColor: colors.border }]}
              >
                <View style={styles.receivingLineHeader}>
                  <View>
                    <Text style={[styles.receivingLineSKU, { color: colors.primary }]}>
                      {line.material_sku || `Line ${line.line_number}`}
                    </Text>
                    <Text style={[styles.receivingLineDesc, { color: colors.text }]}>
                      {line.description}
                    </Text>
                  </View>
                  <View style={[styles.stockIndicator, { backgroundColor: line.is_stock ? '#3B82F615' : '#F59E0B15' }]}>
                    <Text style={[styles.stockIndicatorText, { color: line.is_stock ? '#3B82F6' : '#F59E0B' }]}>
                      {line.is_stock ? 'Stock' : 'Consumable'}
                    </Text>
                  </View>
                </View>

                <View style={styles.receivingQtyRow}>
                  <View style={styles.qtyColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Ordered</Text>
                    <Text style={[styles.qtyValue, { color: colors.text }]}>{line.quantity}</Text>
                  </View>
                  <View style={styles.qtyColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Prev Recv</Text>
                    <Text style={[styles.qtyValue, { color: colors.text }]}>{line.previouslyReceived}</Text>
                  </View>
                  <View style={styles.qtyColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Remaining</Text>
                    <Text style={[styles.qtyValue, { color: line.remaining > 0 ? '#F59E0B' : '#10B981' }]}>
                      {line.remaining}
                    </Text>
                  </View>
                  <View style={styles.qtyInputColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Recv Qty</Text>
                    <TextInput
                      style={[
                        styles.qtyInput,
                        { 
                          backgroundColor: colors.background, 
                          borderColor: colors.border, 
                          color: colors.text 
                        }
                      ]}
                      value={line.receivedQtyInput}
                      onChangeText={(text) => handleUpdateReceivedQty(index, text)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                </View>

                {parseFloat(line.receivedQtyInput) > line.remaining && (
                  <View style={styles.errorRow}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.errorText}>Cannot exceed remaining quantity</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={materialReceiptNotes}
              onChangeText={setMaterialReceiptNotes}
              placeholder="Add receipt notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Receipt Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(materialReceiptTotal)}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: '#3B82F615', borderColor: '#3B82F6' }]}>
            <Info size={16} color="#3B82F6" />
            <Text style={[styles.infoText, { color: '#3B82F6' }]}>
              Stock items will be added to inventory. Consumables will be expensed to the department G/L account.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, opacity: createMaterialReceipt.isPending ? 0.7 : 1 }]}
            onPress={handlePostMaterialReceipt}
            disabled={createMaterialReceipt.isPending}
          >
            {createMaterialReceipt.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Post Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderSESTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <FileText size={18} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Entry Sheet (SES)</Text>
        </View>

        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowServicePOPicker(true)}
        >
          {selectedServicePO ? (
            <View style={styles.selectedPO}>
              <Text style={[styles.selectedPONumber, { color: '#8B5CF6' }]}>
                {selectedServicePO.po_number}
              </Text>
              <Text style={[styles.selectedPOVendor, { color: colors.text }]}>
                {selectedServicePO.vendor_name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
              Select an approved Service PO...
            </Text>
          )}
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {selectedServicePO && (
        <>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.poHeaderInfo}>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Vendor</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedServicePO.vendor_name}</Text>
              </View>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedServicePO.department_name}</Text>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Service Completion Date *</Text>
              <View style={[styles.dateField, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Calendar size={18} color={colors.textSecondary} />
                <Text style={[styles.dateFieldText, { color: colors.text }]}>{formatDate(sesCompletionDate)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <ClipboardCheck size={18} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Lines</Text>
            </View>

            {sesLines.map((line, index) => (
              <View
                key={line.lineId}
                style={[styles.sesLine, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.sesLineDesc, { color: colors.text }]}>{line.description}</Text>
                
                <View style={styles.sesLineRow}>
                  <View style={styles.sesQtyColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Ordered</Text>
                    <Text style={[styles.qtyValue, { color: colors.text }]}>{line.orderedQty}</Text>
                  </View>
                  <View style={styles.sesQtyColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Rate</Text>
                    <Text style={[styles.qtyValue, { color: colors.text }]}>{formatCurrency(line.rate)}</Text>
                  </View>
                  <View style={styles.sesInputColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Actual Qty/Hrs</Text>
                    <TextInput
                      style={[
                        styles.sesQtyInput,
                        { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }
                      ]}
                      value={line.actualQty}
                      onChangeText={(text) => handleUpdateSESLine(index, 'actualQty', text)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textTertiary}
                    />
                  </View>
                  <View style={styles.sesQtyColumn}>
                    <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>Total</Text>
                    <Text style={[styles.qtyValue, { color: '#8B5CF6', fontWeight: '600' as const }]}>
                      {formatCurrency(line.lineTotal)}
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={[styles.sesLineNotes, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={line.notes}
                  onChangeText={(text) => handleUpdateSESLine(index, 'notes', text)}
                  placeholder="Line notes (optional)..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={sesNotes}
              onChangeText={setSesNotes}
              placeholder="Add SES notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.attachButton, { borderColor: colors.border }]}
              onPress={() => Alert.alert('Attachments', 'File attachment feature would open here')}
            >
              <Paperclip size={18} color={colors.textSecondary} />
              <Text style={[styles.attachButtonText, { color: colors.textSecondary }]}>
                {sesAttachments.length > 0 
                  ? `${sesAttachments.length} file(s) attached` 
                  : 'Attach Files (Photos, PDFs, Invoices)'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>SES Total</Text>
              <Text style={[styles.totalValue, { color: '#8B5CF6' }]}>{formatCurrency(sesTotal)}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF6' }]}>
            <Info size={16} color="#8B5CF6" />
            <Text style={[styles.infoText, { color: '#8B5CF6' }]}>
              Services require approval before posting. After approval, the expense will be posted to the department G/L account.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#8B5CF6', opacity: isSubmittingSES ? 0.7 : 1 }]}
            onPress={handleSubmitSES}
            disabled={isSubmittingSES}
          >
            {isSubmittingSES ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Submit for Approval</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderCapExTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Archive size={18} color="#F59E0B" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>CapEx Asset Receipt</Text>
        </View>

        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowCapExPOPicker(true)}
        >
          {selectedCapExPO ? (
            <View style={styles.selectedPO}>
              <Text style={[styles.selectedPONumber, { color: '#F59E0B' }]}>
                {selectedCapExPO.po_number}
              </Text>
              <Text style={[styles.selectedPOVendor, { color: colors.text }]}>
                {selectedCapExPO.vendor_name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
              Select an approved CapEx PO...
            </Text>
          )}
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {selectedCapExPO && (
        <>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.poHeaderInfo}>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Vendor</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedCapExPO.vendor_name}</Text>
              </View>
              <View style={styles.poHeaderRow}>
                <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Department</Text>
                <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedCapExPO.department_name}</Text>
              </View>
              {selectedCapExPO.notes && (
                <View style={styles.poHeaderRow}>
                  <Text style={[styles.poHeaderLabel, { color: colors.textSecondary }]}>Description</Text>
                  <Text style={[styles.poHeaderValue, { color: colors.text }]}>{selectedCapExPO.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.assetDetails}>
              {((selectedCapExPO.line_items || []) as unknown as POLineItem[]).filter(l => !l.is_deleted).map((item, idx) => (
                <View key={item.line_id} style={[styles.assetItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.assetItemDesc, { color: colors.text }]}>{item.description}</Text>
                  <Text style={[styles.assetItemPrice, { color: '#F59E0B' }]}>{formatCurrency(item.line_total)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Tag size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Fixed Asset Creation</Text>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Asset Tag #</Text>
              <View style={[styles.readOnlyField, { backgroundColor: colors.backgroundTertiary }]}>
                <Tag size={16} color="#F59E0B" />
                <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>{assetTag}</Text>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location *</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowLocationPicker(true)}
              >
                {assetLocation ? (
                  <View style={styles.selectedLocation}>
                    <MapPin size={16} color="#F59E0B" />
                    <Text style={[styles.selectedLocationText, { color: colors.text }]}>{assetLocation.name}</Text>
                  </View>
                ) : (
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Select asset location...
                  </Text>
                )}
                <ChevronDown size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Placed in Service Date *</Text>
              <View style={[styles.dateField, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Calendar size={18} color={colors.textSecondary} />
                <Text style={[styles.dateFieldText, { color: colors.text }]}>{formatDate(placedInServiceDate)}</Text>
              </View>
            </View>

            <View style={styles.assetReadOnlyFields}>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Cost</Text>
                <View style={[styles.readOnlyField, { backgroundColor: colors.backgroundTertiary }]}>
                  <DollarSign size={16} color={colors.textSecondary} />
                  <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>
                    {formatCurrency(selectedCapExPO.total)}
                  </Text>
                </View>
              </View>
              <View style={styles.formFieldHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Useful Life</Text>
                <View style={[styles.readOnlyField, { backgroundColor: colors.backgroundTertiary }]}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={[styles.readOnlyFieldText, { color: colors.text }]}>Auto from PO</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={assetNotes}
              onChangeText={setAssetNotes}
              placeholder="Add asset notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.infoCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
            <Info size={16} color="#F59E0B" />
            <Text style={[styles.infoText, { color: '#F59E0B' }]}>
              CapEx items are capitalized to the Fixed Asset G/L account (Balance Sheet), not expensed. Depreciation will be calculated based on useful life.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F59E0B', opacity: isPostingCapEx ? 0.7 : 1 }]}
            onPress={handlePostCapExReceipt}
            disabled={isPostingCapEx}
          >
            {isPostingCapEx ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Post to Fixed Assets</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Receiving' }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {renderTabBar()}

        {activeTab === 'migo' && renderMIGOTab()}
        {activeTab === 'ses' && renderSESTab()}
        {activeTab === 'capex' && renderCapExTab()}
      </KeyboardAvoidingView>

      {renderMaterialPOPicker()}
      {renderServicePOPicker()}
      {renderCapExPOPicker()}
      {renderLocationPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  tabContent: {
    flex: 1,
  },
  tabContentContainer: {
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    flex: 1,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  selectorPlaceholder: {
    fontSize: 15,
  },
  selectedPO: {
    flex: 1,
  },
  selectedPONumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  selectedPOVendor: {
    fontSize: 14,
  },
  poHeaderInfo: {
    marginBottom: 4,
  },
  poHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  poHeaderLabel: {
    fontSize: 13,
  },
  poHeaderValue: {
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
    textAlign: 'right' as const,
    marginLeft: 16,
  },
  receivingLine: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  receivingLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receivingLineSKU: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  receivingLineDesc: {
    fontSize: 14,
    maxWidth: 220,
  },
  stockIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockIndicatorText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  receivingQtyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qtyColumn: {
    flex: 1,
    alignItems: 'center',
  },
  qtyInputColumn: {
    flex: 1.2,
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  qtyInput: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center' as const,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  notesInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700' as const,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center' as const,
    maxWidth: 240,
  },
  poOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  poOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  poNumber: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  poVendor: {
    fontSize: 14,
    marginBottom: 4,
  },
  poMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  poMetaText: {
    fontSize: 12,
  },
  poLines: {
    fontSize: 12,
    marginTop: 4,
  },
  poNotes: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 6,
  },
  sesLine: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sesLineDesc: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 12,
  },
  sesLineRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  sesQtyColumn: {
    flex: 1,
    alignItems: 'center',
  },
  sesInputColumn: {
    flex: 1.3,
    alignItems: 'center',
  },
  sesQtyInput: {
    width: '100%',
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center' as const,
    fontSize: 14,
  },
  sesLineNotes: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    marginTop: 12,
  },
  attachButtonText: {
    fontSize: 13,
  },
  formField: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  dateFieldText: {
    fontSize: 15,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  readOnlyFieldText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  locationName: {
    fontSize: 15,
    flex: 1,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedLocationText: {
    fontSize: 15,
  },
  assetDetails: {
    marginTop: 10,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  assetItemDesc: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  assetItemPrice: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  assetReadOnlyFields: {
    flexDirection: 'row',
    gap: 12,
  },
  formFieldHalf: {
    flex: 1,
  },
});
