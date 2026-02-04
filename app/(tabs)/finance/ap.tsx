import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  X,
  ChevronRight,
  CreditCard,
  LinkIcon,
  Building2,
  Truck,
  XCircle,
  ArrowRight,
  Search,
  Send,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAPInvoicesQuery,
  useCreateAPInvoiceMutation,
  useUpdateAPInvoiceMutation,
  type APInvoice,
} from '@/hooks/useSupabaseFinance';
import { MOCK_VENDORS } from '@/constants/vendorsConstants';
import { getDepartmentName, DEPARTMENT_CODES } from '@/constants/organizationCodes';

type InvoiceFilter = 'all' | 'pending' | 'approved' | 'paid' | 'overdue' | 'disputed';
type MatchStatus = 'matched' | 'variance' | 'pending' | 'exception';

interface InvoiceDetailProps {
  invoice: APInvoice;
  visible: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onPayment: (invoice: APInvoice) => void;
}

function InvoiceDetailModal({ invoice, visible, onClose, onApprove, onReject, onPayment }: InvoiceDetailProps) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'details' | 'lines' | 'match'>('details');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#22C55E';
      case 'approved': return '#3B82F6';
      case 'pending': return '#F59E0B';
      case 'overdue': return '#EF4444';
      case 'disputed': return '#DC2626';
      default: return colors.textSecondary;
    }
  };

  const getMatchStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'matched': return '#22C55E';
      case 'variance': return '#F59E0B';
      case 'pending': return '#6B7280';
      case 'exception': return '#EF4444';
    }
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(invoice.id, rejectReason);
      setRejectReason('');
      setShowRejectInput(false);
      onClose();
    }
  };

  const renderDetailsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.detailSection}>
        <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Invoice Information</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Invoice Number</Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Invoice Date</Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>{invoice.invoiceDate}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Due Date</Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>{invoice.dueDate}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Received Date</Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>{invoice.receivedDate}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailItemLabel, { color: colors.textSecondary }]}>Payment Terms</Text>
            <Text style={[styles.detailItemValue, { color: colors.text }]}>{invoice.paymentTerms}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Vendor</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.vendorRow}>
            <View style={[styles.vendorIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Building2 size={20} color={colors.primary} />
            </View>
            <View style={styles.vendorInfo}>
              <Text style={[styles.vendorName, { color: colors.text }]}>{invoice.vendorName}</Text>
              <Text style={[styles.vendorId, { color: colors.textSecondary }]}>ID: {invoice.vendorId}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Amount Summary</Text>
        <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Tax</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(invoice.taxAmount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Shipping</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(invoice.shippingAmount)}</Text>
          </View>
          {invoice.otherCharges > 0 && (
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Other Charges</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(invoice.otherCharges)}</Text>
            </View>
          )}
          <View style={[styles.amountDivider, { backgroundColor: colors.border }]} />
          <View style={styles.amountRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
          {invoice.amountPaid > 0 && (
            <>
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, { color: '#22C55E' }]}>Amount Paid</Text>
                <Text style={[styles.amountValue, { color: '#22C55E' }]}>-{formatCurrency(invoice.amountPaid)}</Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={[styles.totalLabel, { color: colors.error }]}>Balance Due</Text>
                <Text style={[styles.totalValue, { color: colors.error }]}>{formatCurrency(invoice.balanceDue)}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {invoice.purchaseOrderNumber && (
        <View style={styles.detailSection}>
          <Text style={[styles.detailSectionTitle, { color: colors.textSecondary }]}>Related Documents</Text>
          <View style={[styles.relatedDoc, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.relatedDocIcon, { backgroundColor: `${colors.primary}15` }]}>
              <FileText size={18} color={colors.primary} />
            </View>
            <View style={styles.relatedDocInfo}>
              <Text style={[styles.relatedDocLabel, { color: colors.textSecondary }]}>Purchase Order</Text>
              <Text style={[styles.relatedDocValue, { color: colors.text }]}>{invoice.purchaseOrderNumber}</Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderLinesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {invoice.lineItems.map((item, index) => (
        <View key={item.id} style={[styles.lineItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.lineItemHeader}>
            <View style={[styles.lineNumber, { backgroundColor: colors.primary }]}>
              <Text style={styles.lineNumberText}>{index + 1}</Text>
            </View>
            <Text style={[styles.lineDescription, { color: colors.text }]} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          <View style={styles.lineItemDetails}>
            <View style={styles.lineDetail}>
              <Text style={[styles.lineDetailLabel, { color: colors.textSecondary }]}>Qty</Text>
              <Text style={[styles.lineDetailValue, { color: colors.text }]}>{item.quantity}</Text>
            </View>
            <View style={styles.lineDetail}>
              <Text style={[styles.lineDetailLabel, { color: colors.textSecondary }]}>Unit Price</Text>
              <Text style={[styles.lineDetailValue, { color: colors.text }]}>{formatCurrency(item.unitPrice)}</Text>
            </View>
            <View style={styles.lineDetail}>
              <Text style={[styles.lineDetailLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.lineDetailValue, { color: colors.text, fontWeight: '600' as const }]}>{formatCurrency(item.amount)}</Text>
            </View>
          </View>
          <View style={styles.lineItemFooter}>
            <Text style={[styles.glAccount, { color: colors.textSecondary }]}>
              GL: {item.glAccountName}
            </Text>
            {item.poLineNumber && (
              <Text style={[styles.poLine, { color: colors.textTertiary }]}>
                PO Line: {item.poLineNumber}
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderMatchTab = () => {
    const match = invoice.threeWayMatch;
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.matchHeader, { backgroundColor: `${getMatchStatusColor(match.matchStatus)}15` }]}>
          {match.matchStatus === 'matched' ? (
            <CheckCircle size={24} color={getMatchStatusColor(match.matchStatus)} />
          ) : match.matchStatus === 'exception' ? (
            <XCircle size={24} color={getMatchStatusColor(match.matchStatus)} />
          ) : (
            <Clock size={24} color={getMatchStatusColor(match.matchStatus)} />
          )}
          <Text style={[styles.matchHeaderText, { color: getMatchStatusColor(match.matchStatus) }]}>
            {match.matchStatus === 'matched' ? '3-Way Match Complete' :
             match.matchStatus === 'variance' ? 'Variance Detected' :
             match.matchStatus === 'pending' ? 'Match Pending' : 'Match Exception'}
          </Text>
        </View>

        <View style={styles.matchFlow}>
          <View style={[styles.matchStep, { backgroundColor: colors.surface, borderColor: match.poMatched ? '#22C55E' : colors.border }]}>
            <View style={[styles.matchStepIcon, { backgroundColor: match.poMatched ? '#22C55E15' : `${colors.textSecondary}15` }]}>
              <FileText size={20} color={match.poMatched ? '#22C55E' : colors.textSecondary} />
            </View>
            <Text style={[styles.matchStepTitle, { color: colors.text }]}>Purchase Order</Text>
            {match.poMatched ? (
              <>
                <Text style={[styles.matchStepValue, { color: colors.text }]}>{match.poNumber}</Text>
                <Text style={[styles.matchStepAmount, { color: colors.textSecondary }]}>{formatCurrency(match.poAmount || 0)}</Text>
                <CheckCircle size={16} color="#22C55E" style={styles.matchStepCheck} />
              </>
            ) : (
              <Text style={[styles.matchStepPending, { color: colors.textSecondary }]}>No PO Required</Text>
            )}
          </View>

          <View style={styles.matchArrow}>
            <ArrowRight size={20} color={colors.textTertiary} />
          </View>

          <View style={[styles.matchStep, { backgroundColor: colors.surface, borderColor: match.receiptMatched ? '#22C55E' : colors.border }]}>
            <View style={[styles.matchStepIcon, { backgroundColor: match.receiptMatched ? '#22C55E15' : `${colors.textSecondary}15` }]}>
              <Truck size={20} color={match.receiptMatched ? '#22C55E' : colors.textSecondary} />
            </View>
            <Text style={[styles.matchStepTitle, { color: colors.text }]}>Goods Receipt</Text>
            {match.receiptMatched ? (
              <>
                <Text style={[styles.matchStepValue, { color: colors.text }]}>{match.receiptNumber}</Text>
                <Text style={[styles.matchStepAmount, { color: colors.textSecondary }]}>{formatCurrency(match.receiptAmount || 0)}</Text>
                <CheckCircle size={16} color="#22C55E" style={styles.matchStepCheck} />
              </>
            ) : (
              <Text style={[styles.matchStepPending, { color: colors.textSecondary }]}>Pending Receipt</Text>
            )}
          </View>

          <View style={styles.matchArrow}>
            <ArrowRight size={20} color={colors.textTertiary} />
          </View>

          <View style={[styles.matchStep, { backgroundColor: colors.surface, borderColor: '#3B82F6' }]}>
            <View style={[styles.matchStepIcon, { backgroundColor: '#3B82F615' }]}>
              <CreditCard size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.matchStepTitle, { color: colors.text }]}>Invoice</Text>
            <Text style={[styles.matchStepValue, { color: colors.text }]}>{invoice.invoiceNumber}</Text>
            <Text style={[styles.matchStepAmount, { color: colors.textSecondary }]}>{formatCurrency(match.invoiceAmount)}</Text>
          </View>
        </View>

        {match.varianceAmount !== 0 && (
          <View style={[styles.varianceCard, { backgroundColor: `${colors.warning}10`, borderColor: colors.warning }]}>
            <AlertTriangle size={18} color={colors.warning} />
            <View style={styles.varianceInfo}>
              <Text style={[styles.varianceLabel, { color: colors.text }]}>Variance Detected</Text>
              <Text style={[styles.varianceAmount, { color: colors.warning }]}>
                {formatCurrency(match.varianceAmount)} ({match.variancePercent.toFixed(1)}%)
              </Text>
            </View>
          </View>
        )}

        {match.notes && (
          <View style={[styles.matchNotes, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.matchNotesLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.matchNotesText, { color: colors.text }]}>{match.notes}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.modalHeaderCenter}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Invoice Details</Text>
            <View style={[styles.statusBadgeLarge, { backgroundColor: `${getStatusColor(invoice.status)}15` }]}>
              <Text style={[styles.statusTextLarge, { color: getStatusColor(invoice.status) }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {(['details', 'lines', 'match'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>
                {tab === 'details' ? 'Details' : tab === 'lines' ? `Lines (${invoice.lineItems.length})` : '3-Way Match'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'lines' && renderLinesTab()}
        {activeTab === 'match' && renderMatchTab()}

        {invoice.status === 'pending' && (
          <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            {showRejectInput ? (
              <View style={styles.rejectInputContainer}>
                <TextInput
                  style={[styles.rejectInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter rejection reason..."
                  placeholderTextColor={colors.textTertiary}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                />
                <View style={styles.rejectButtons}>
                  <TouchableOpacity
                    style={[styles.cancelRejectBtn, { borderColor: colors.border }]}
                    onPress={() => { setShowRejectInput(false); setRejectReason(''); }}
                  >
                    <Text style={[styles.cancelRejectText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmRejectBtn, { backgroundColor: colors.error }]}
                    onPress={handleReject}
                  >
                    <Text style={styles.confirmRejectText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.rejectButton, { borderColor: colors.error }]}
                  onPress={() => setShowRejectInput(true)}
                >
                  <XCircle size={18} color={colors.error} />
                  <Text style={[styles.rejectButtonText, { color: colors.error }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveButton, { backgroundColor: colors.success }]}
                  onPress={() => { onApprove(invoice.id); onClose(); }}
                >
                  <CheckCircle size={18} color="#FFFFFF" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {invoice.status === 'approved' && invoice.balanceDue > 0 && (
          <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: colors.primary }]}
              onPress={() => { onPayment(invoice); onClose(); }}
            >
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Create Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

interface AddInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (invoice: Partial<APInvoice>) => void;
}

function AddInvoiceModal({ visible, onClose, onAdd }: AddInvoiceModalProps) {
  const { colors } = useTheme();
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');

  const vendors = MOCK_VENDORS.filter(v => v.status === 'active');

  const handleSubmit = () => {
    if (!vendorId || !invoiceNumber || !amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const vendor = vendors.find(v => v.id === vendorId);
    const subtotal = parseFloat(amount);
    const taxAmount = subtotal * 0.0825;
    const totalAmount = subtotal + taxAmount;

    const newInvoice: Partial<APInvoice> = {
      invoiceNumber,
      vendorId,
      vendorName: vendor?.name || '',
      departmentCode: department || '1001',
      departmentName: getDepartmentName(department || '1001'),
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      subtotal,
      taxAmount,
      shippingAmount: 0,
      otherCharges: 0,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      currency: 'USD',
      status: 'pending',
      paymentTerms: 'Net 30',
      lineItems: [{
        id: `li-${Date.now()}`,
        description: description || 'Invoice item',
        quantity: 1,
        unitPrice: subtotal,
        amount: subtotal,
        glAccountId: 'gl-6400',
        glAccountName: 'Maintenance & Repairs',
        taxable: true,
      }],
      threeWayMatch: {
        poMatched: false,
        receiptMatched: false,
        invoiceAmount: subtotal,
        varianceAmount: 0,
        variancePercent: 0,
        matchStatus: 'pending',
      },
      attachments: [],
    };

    onAdd(newInvoice);
    setVendorId('');
    setInvoiceNumber('');
    setInvoiceDate('');
    setDueDate('');
    setAmount('');
    setDepartment('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New AP Invoice</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Vendor *</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {vendors.map((vendor) => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={[
                      styles.vendorChip,
                      { 
                        backgroundColor: vendorId === vendor.id ? colors.primary : colors.background,
                        borderColor: vendorId === vendor.id ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setVendorId(vendor.id)}
                  >
                    <Text style={[styles.vendorChipText, { color: vendorId === vendor.id ? '#FFFFFF' : colors.text }]}>
                      {vendor.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Invoice Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="Enter invoice number"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Invoice Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={invoiceDate}
                onChangeText={setInvoiceDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={[styles.formSection, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Due Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Amount *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Department</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {Object.entries(DEPARTMENT_CODES).map(([code, dept]) => (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.deptChip,
                      { 
                        backgroundColor: department === code ? colors.primary : colors.background,
                        borderColor: department === code ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setDepartment(code)}
                  >
                    <Text style={[styles.deptChipText, { color: department === code ? '#FFFFFF' : colors.text }]}>
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Invoice description..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>

        <View style={[styles.formActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function AccountsPayableScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<InvoiceFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<APInvoice | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    data: invoices = [],
    isLoading,
    refetch,
    isRefetching,
  } = useAPInvoicesQuery();

  const createInvoiceMutation = useCreateAPInvoiceMutation();
  const updateInvoiceMutation = useUpdateAPInvoiceMutation();

  const onRefresh = useCallback(() => {
    console.log('[AP] Refreshing invoices');
    refetch();
  }, [refetch]);

  const filteredInvoices = useMemo(() => {
    let result = invoices;
    
    if (filter !== 'all') {
      result = result.filter(inv => inv.status === filter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.vendorName.toLowerCase().includes(query) ||
        inv.departmentName.toLowerCase().includes(query)
      );
    }
    
    return result.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }, [invoices, filter, searchQuery]);

  const stats = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'pending');
    const approved = invoices.filter(i => i.status === 'approved');
    const paid = invoices.filter(i => i.status === 'paid');
    const overdue = invoices.filter(i => i.status === 'overdue');
    
    return {
      total: invoices.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, i) => sum + i.balanceDue, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((sum, i) => sum + i.balanceDue, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, i) => sum + i.totalAmount, 0),
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, i) => sum + i.balanceDue, 0),
    };
  }, [invoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#22C55E';
      case 'approved': return '#3B82F6';
      case 'pending': return '#F59E0B';
      case 'overdue': return '#EF4444';
      case 'disputed': return '#DC2626';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={16} color="#22C55E" />;
      case 'approved': return <FileText size={16} color="#3B82F6" />;
      case 'pending': return <Clock size={16} color="#F59E0B" />;
      case 'overdue': return <AlertTriangle size={16} color="#EF4444" />;
      default: return null;
    }
  };

  const handleApprove = useCallback((invoiceId: string) => {
    console.log('[AP] Approving invoice:', invoiceId);
    updateInvoiceMutation.mutate(
      {
        id: invoiceId,
        updates: {
          status: 'approved',
          approvedBy: 'Current User',
          approvedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Invoice approved successfully');
          refetch();
        },
        onError: (error) => {
          console.error('[AP] Error approving invoice:', error);
          Alert.alert('Error', 'Failed to approve invoice');
        },
      }
    );
  }, [updateInvoiceMutation, refetch]);

  const handleReject = useCallback((invoiceId: string, reason: string) => {
    console.log('[AP] Rejecting invoice:', invoiceId, reason);
    updateInvoiceMutation.mutate(
      {
        id: invoiceId,
        updates: {
          status: 'disputed',
          notes: `Rejected: ${reason}`,
        },
      },
      {
        onSuccess: () => {
          Alert.alert('Rejected', 'Invoice has been rejected');
          refetch();
        },
        onError: (error) => {
          console.error('[AP] Error rejecting invoice:', error);
          Alert.alert('Error', 'Failed to reject invoice');
        },
      }
    );
  }, [updateInvoiceMutation, refetch]);

  const handlePayment = useCallback((invoice: APInvoice) => {
    Alert.alert(
      'Create Payment',
      `Create payment of ${formatCurrency(invoice.balanceDue)} to ${invoice.vendorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            console.log('[AP] Creating payment for invoice:', invoice.id);
            updateInvoiceMutation.mutate(
              {
                id: invoice.id,
                updates: {
                  status: 'paid',
                  amountPaid: invoice.totalAmount,
                  balanceDue: 0,
                  paidAt: new Date().toISOString(),
                },
              },
              {
                onSuccess: () => {
                  Alert.alert('Success', 'Payment created successfully');
                  refetch();
                },
                onError: (error) => {
                  console.error('[AP] Error creating payment:', error);
                  Alert.alert('Error', 'Failed to create payment');
                },
              }
            );
          },
        },
      ]
    );
  }, [updateInvoiceMutation, refetch]);

  const handleAddInvoice = useCallback((newInvoice: Partial<APInvoice>) => {
    console.log('[AP] Creating new invoice:', newInvoice);
    createInvoiceMutation.mutate(newInvoice, {
      onSuccess: (data) => {
        console.log('[AP] Invoice created:', data.id);
        Alert.alert('Success', 'Invoice created successfully');
        refetch();
      },
      onError: (error) => {
        console.error('[AP] Error creating invoice:', error);
        Alert.alert('Error', 'Failed to create invoice');
      },
    });
  }, [createInvoiceMutation, refetch]);

  const renderInvoice = (invoice: APInvoice) => (
    <TouchableOpacity
      key={invoice.id}
      style={[styles.invoiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => setSelectedInvoice(invoice)}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceHeaderLeft}>
          <Text style={[styles.invoiceNumber, { color: colors.text }]}>{invoice.invoiceNumber}</Text>
          <Text style={[styles.vendorNameText, { color: colors.textSecondary }]}>{invoice.vendorName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(invoice.status)}15` }]}>
          {getStatusIcon(invoice.status)}
          <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.invoiceDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Department</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.departmentName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due Date</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{invoice.dueDate}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount</Text>
          <Text style={[styles.amountText, { color: colors.text }]}>{formatCurrency(invoice.totalAmount)}</Text>
        </View>
        {invoice.balanceDue > 0 && invoice.balanceDue !== invoice.totalAmount && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Balance Due</Text>
            <Text style={[styles.amountText, { color: colors.error }]}>{formatCurrency(invoice.balanceDue)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.invoiceFooter}>
        {invoice.threeWayMatch.matchStatus === 'matched' && (
          <View style={[styles.matchBadge, { backgroundColor: `${colors.success}15` }]}>
            <CheckCircle size={14} color={colors.success} />
            <Text style={[styles.matchText, { color: colors.success }]}>3-Way Matched</Text>
          </View>
        )}
        {invoice.purchaseOrderNumber && (
          <View style={[styles.poBadge, { backgroundColor: `${colors.primary}10` }]}>
            <LinkIcon size={12} color={colors.primary} />
            <Text style={[styles.poText, { color: colors.primary }]}>{invoice.purchaseOrderNumber}</Text>
          </View>
        )}
        <View style={styles.viewDetailsContainer}>
          <Text style={[styles.viewDetailsText, { color: colors.primary }]}>View Details</Text>
          <ChevronRight size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading invoices...</Text>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Accounts Payable</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage vendor invoices & payments
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
              <Clock size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            <Text style={[styles.statAmount, { color: colors.text }]}>{formatCurrency(stats.pendingAmount)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F615' }]}>
              <FileText size={18} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.approvedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
            <Text style={[styles.statAmount, { color: colors.text }]}>{formatCurrency(stats.approvedAmount)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: '#22C55E15' }]}>
              <CheckCircle size={18} color="#22C55E" />
            </View>
            <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.paidCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
            <Text style={[styles.statAmount, { color: colors.text }]}>{formatCurrency(stats.paidAmount)}</Text>
          </View>
          {stats.overdueCount > 0 && (
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.error }]}>
              <View style={[styles.statIcon, { backgroundColor: '#EF444415' }]}>
                <AlertTriangle size={18} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.overdueCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
              <Text style={[styles.statAmount, { color: colors.error }]}>{formatCurrency(stats.overdueAmount)}</Text>
            </View>
          )}
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search invoices..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterRow}
        >
          {(['all', 'pending', 'approved', 'paid', 'overdue'] as InvoiceFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterButton,
                { 
                  backgroundColor: filter === f ? colors.primary : colors.surface, 
                  borderColor: filter === f ? colors.primary : colors.border 
                },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: filter === f ? '#FFFFFF' : colors.text }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Invoices ({filteredInvoices.length})
            </Text>
          </View>
          {filteredInvoices.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FileText size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No invoices found</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {searchQuery ? 'Try adjusting your search' : 'Create your first AP invoice'}
              </Text>
            </View>
          ) : (
            filteredInvoices.map(renderInvoice)
          )}
        </View>
      </ScrollView>
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
        disabled={createInvoiceMutation.isPending}
      >
        {createInvoiceMutation.isPending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Plus size={24} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          visible={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onPayment={handlePayment}
        />
      )}

      <AddInvoiceModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddInvoice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, paddingTop: 100 },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '700' as const },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  statsGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10, marginBottom: 16 },
  statCard: { width: '31%' as any, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '700' as const },
  statLabel: { fontSize: 11, marginTop: 2 },
  statAmount: { fontSize: 12, fontWeight: '600' as const, marginTop: 4 },
  searchContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  filterScrollView: { marginBottom: 16 },
  filterRow: { gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const },
  invoiceCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  invoiceHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 12 },
  invoiceHeaderLeft: { flex: 1 },
  invoiceNumber: { fontSize: 16, fontWeight: '600' as const },
  vendorNameText: { fontSize: 14, marginTop: 2 },
  statusBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '500' as const },
  invoiceDetails: { gap: 8 },
  detailRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  amountText: { fontSize: 15, fontWeight: '600' as const },
  invoiceFooter: { flexDirection: 'row' as const, alignItems: 'center' as const, marginTop: 12, gap: 8, flexWrap: 'wrap' as const },
  matchBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  matchText: { fontSize: 11, fontWeight: '500' as const },
  poBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  poText: { fontSize: 11, fontWeight: '500' as const },
  viewDetailsContainer: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'flex-end' as const },
  viewDetailsText: { fontSize: 13, fontWeight: '500' as const },
  emptyState: { padding: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const },
  emptyStateTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptyStateText: { fontSize: 14, marginTop: 8, textAlign: 'center' as const },
  fab: { position: 'absolute' as const, right: 16, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center' as const, justifyContent: 'center' as const, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  closeButton: { padding: 8 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalHeaderCenter: { alignItems: 'center' as const },
  statusBadgeLarge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  statusTextLarge: { fontSize: 11, fontWeight: '600' as const },
  tabBar: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' as const, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '500' as const },
  tabContent: { flex: 1, padding: 16 },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 13, fontWeight: '500' as const, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  detailCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  detailItem: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 8 },
  detailItemLabel: { fontSize: 14 },
  detailItemValue: { fontSize: 14, fontWeight: '500' as const },
  vendorRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  vendorIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 16, fontWeight: '600' as const },
  vendorId: { fontSize: 13, marginTop: 2 },
  amountRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 6 },
  amountLabel: { fontSize: 14 },
  amountValue: { fontSize: 14, fontWeight: '500' as const },
  amountDivider: { height: 1, marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '600' as const },
  totalValue: { fontSize: 17, fontWeight: '700' as const },
  relatedDoc: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderRadius: 10, borderWidth: 1 },
  relatedDocIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const },
  relatedDocInfo: { flex: 1, marginLeft: 12 },
  relatedDocLabel: { fontSize: 12 },
  relatedDocValue: { fontSize: 14, fontWeight: '500' as const, marginTop: 2 },
  lineItem: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  lineItemHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, marginBottom: 12 },
  lineNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const },
  lineNumberText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' as const },
  lineDescription: { flex: 1, fontSize: 14, fontWeight: '500' as const },
  lineItemDetails: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 10 },
  lineDetail: { alignItems: 'center' as const },
  lineDetailLabel: { fontSize: 11, marginBottom: 2 },
  lineDetailValue: { fontSize: 13 },
  lineItemFooter: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  glAccount: { fontSize: 12 },
  poLine: { fontSize: 12 },
  matchHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, padding: 16, borderRadius: 10, marginBottom: 20 },
  matchHeaderText: { fontSize: 16, fontWeight: '600' as const },
  matchFlow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 20 },
  matchStep: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 2, alignItems: 'center' as const },
  matchStepIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 8 },
  matchStepTitle: { fontSize: 12, fontWeight: '500' as const, marginBottom: 4 },
  matchStepValue: { fontSize: 11, fontWeight: '600' as const },
  matchStepAmount: { fontSize: 10, marginTop: 2 },
  matchStepPending: { fontSize: 10, fontStyle: 'italic' as const },
  matchStepCheck: { position: 'absolute' as const, top: 8, right: 8 },
  matchArrow: { paddingHorizontal: 4 },
  varianceCard: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  varianceInfo: { flex: 1 },
  varianceLabel: { fontSize: 14, fontWeight: '500' as const },
  varianceAmount: { fontSize: 16, fontWeight: '700' as const, marginTop: 2 },
  matchNotes: { padding: 14, borderRadius: 10, borderWidth: 1 },
  matchNotesLabel: { fontSize: 12, marginBottom: 4 },
  matchNotesText: { fontSize: 14 },
  actionBar: { flexDirection: 'row' as const, padding: 16, gap: 12, borderTopWidth: 1 },
  rejectButton: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  rejectButtonText: { fontSize: 15, fontWeight: '600' as const },
  approveButton: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 14, borderRadius: 10 },
  approveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
  payButton: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 14, borderRadius: 10 },
  payButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
  rejectInputContainer: { flex: 1 },
  rejectInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 60 },
  rejectButtons: { flexDirection: 'row' as const, gap: 10, marginTop: 10 },
  cancelRejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' as const },
  cancelRejectText: { fontSize: 14, fontWeight: '500' as const },
  confirmRejectBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' as const },
  confirmRejectText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' as const },
  formContent: { flex: 1, padding: 16 },
  formSection: { marginBottom: 20 },
  formLabel: { fontSize: 13, fontWeight: '500' as const, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' as const },
  formRow: { flexDirection: 'row' as const, gap: 12 },
  pickerContainer: { borderWidth: 1, borderRadius: 10, padding: 10 },
  vendorChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  vendorChipText: { fontSize: 13, fontWeight: '500' as const },
  deptChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  deptChipText: { fontSize: 12, fontWeight: '500' as const },
  formActions: { flexDirection: 'row' as const, padding: 16, gap: 12, borderTopWidth: 1 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  cancelButtonText: { fontSize: 15, fontWeight: '600' as const },
  submitButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' as const },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' as const },
});
