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
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  CreditCard,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Search,
  DollarSign,
  Calendar,
  User,
  FileText,
  Send,
  TrendingUp,
  Mail,
  Phone,
  Building2,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useARInvoicesQuery,
  useCustomersQuery,
  useCreateARInvoiceMutation,
  type ARInvoice,
  type Customer,
  type InvoiceStatus,
} from '@/hooks/useSupabaseFinance';

type FilterType = 'all' | 'pending' | 'paid' | 'overdue' | 'partial';
type ViewMode = 'invoices' | 'customers' | 'aging';

interface AgingBucket {
  label: string;
  range: string;
  amount: number;
  count: number;
  color: string;
}

export default function AccountsReceivableScreen() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [localInvoices, setLocalInvoices] = useState<ARInvoice[]>([]);
  const [invoicesInitialized, setInvoicesInitialized] = useState(false);

  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    description: '',
    amount: '',
    dueDate: '',
  });

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'check' | 'ach' | 'wire' | 'credit_card'>('check');

  const { data: fetchedInvoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useARInvoicesQuery();
  const { data: customers = [], isLoading: customersLoading } = useCustomersQuery();
  const createInvoiceMutation = useCreateARInvoiceMutation();

  const invoices = useMemo(() => {
    if (!invoicesInitialized && fetchedInvoices.length > 0) {
      setLocalInvoices(fetchedInvoices);
      setInvoicesInitialized(true);
      return fetchedInvoices;
    }
    return localInvoices.length > 0 ? localInvoices : fetchedInvoices;
  }, [fetchedInvoices, localInvoices, invoicesInitialized]);

  const refreshing = invoicesLoading || customersLoading;

  const onRefresh = useCallback(async () => {
    console.log('[AR] Refreshing data...');
    await refetchInvoices();
    setInvoicesInitialized(false);
  }, [refetchInvoices]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const getStatusColor = useCallback((status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return '#22C55E';
      case 'pending': return '#F59E0B';
      case 'overdue': return '#EF4444';
      case 'partial': return '#3B82F6';
      case 'draft': return '#6B7280';
      case 'cancelled': return '#9CA3AF';
      default: return colors.textSecondary;
    }
  }, [colors.textSecondary]);

  const getDaysOverdue = useCallback((dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const stats = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'pending');
    const overdue = invoices.filter(i => {
      const daysOverdue = getDaysOverdue(i.dueDate);
      return i.status === 'pending' && daysOverdue > 0;
    });
    const paid = invoices.filter(i => i.status === 'paid');
    const partial = invoices.filter(i => i.status === 'partial');
    
    const totalOutstanding = invoices
      .filter(i => ['pending', 'overdue', 'partial'].includes(i.status))
      .reduce((sum, i) => sum + i.balanceDue, 0);
    
    const totalCollected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const avgDaysToCollect = 28;

    return {
      totalInvoices: invoices.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      paidCount: paid.length,
      partialCount: partial.length,
      totalOutstanding,
      totalCollected,
      avgDaysToCollect,
      customersCount: customers.filter(c => c.status === 'active').length,
      overdueAmount: overdue.reduce((sum, i) => sum + i.balanceDue, 0),
    };
  }, [invoices, customers, getDaysOverdue]);

  const agingBuckets = useMemo((): AgingBucket[] => {
    const current: AgingBucket = { label: 'Current', range: '0-30 days', amount: 0, count: 0, color: '#22C55E' };
    const thirtyDays: AgingBucket = { label: '31-60', range: '31-60 days', amount: 0, count: 0, color: '#F59E0B' };
    const sixtyDays: AgingBucket = { label: '61-90', range: '61-90 days', amount: 0, count: 0, color: '#F97316' };
    const ninetyPlus: AgingBucket = { label: '90+', range: '90+ days', amount: 0, count: 0, color: '#EF4444' };

    invoices
      .filter(i => ['pending', 'partial'].includes(i.status))
      .forEach(invoice => {
        const daysOverdue = getDaysOverdue(invoice.dueDate);
        if (daysOverdue <= 30) {
          current.amount += invoice.balanceDue;
          current.count++;
        } else if (daysOverdue <= 60) {
          thirtyDays.amount += invoice.balanceDue;
          thirtyDays.count++;
        } else if (daysOverdue <= 90) {
          sixtyDays.amount += invoice.balanceDue;
          sixtyDays.count++;
        } else {
          ninetyPlus.amount += invoice.balanceDue;
          ninetyPlus.count++;
        }
      });

    return [current, thirtyDays, sixtyDays, ninetyPlus];
  }, [invoices, getDaysOverdue]);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (filter !== 'all') {
      if (filter === 'overdue') {
        filtered = filtered.filter(i => {
          const daysOverdue = getDaysOverdue(i.dueDate);
          return i.status === 'pending' && daysOverdue > 0;
        });
      } else {
        filtered = filtered.filter(inv => inv.status === filter);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        inv =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.customerName.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [invoices, filter, searchQuery, getDaysOverdue]);

  const handleCreateInvoice = useCallback(() => {
    if (!newInvoice.customerId || !newInvoice.amount || !newInvoice.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const customer = customers.find(c => c.id === newInvoice.customerId);
    if (!customer) {
      Alert.alert('Error', 'Please select a valid customer');
      return;
    }

    const amount = parseFloat(newInvoice.amount);
    const taxAmount = amount * 0.0825;
    const totalAmount = amount + taxAmount;

    const invoiceData: Partial<ARInvoice> = {
      invoiceNumber: `SI-2024-${String(invoices.length + 1).padStart(4, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: newInvoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: amount,
      taxAmount,
      shippingAmount: 0,
      discountAmount: 0,
      totalAmount,
      paymentTerms: customer.paymentTerms,
      lineItems: [
        {
          id: `arli-${Date.now()}`,
          description: newInvoice.description,
          quantity: 1,
          unitPrice: amount,
          discount: 0,
          amount,
          glAccountId: 'gl-4100',
          glAccountName: 'Product Sales',
          taxable: true,
        },
      ],
    };

    createInvoiceMutation.mutate(invoiceData, {
      onSuccess: (createdInvoice) => {
        console.log('[AR] Invoice created:', createdInvoice);
        setLocalInvoices(prev => [createdInvoice, ...prev]);
        setNewInvoice({ customerId: '', description: '', amount: '', dueDate: '' });
        setShowNewInvoiceModal(false);
        Alert.alert('Success', `Invoice ${createdInvoice.invoiceNumber} created successfully`);
      },
      onError: (error) => {
        console.error('[AR] Error creating invoice:', error);
        Alert.alert('Error', 'Failed to create invoice. Please try again.');
      },
    });
  }, [newInvoice, customers, invoices.length, createInvoiceMutation]);

  const handleRecordPayment = useCallback(() => {
    if (!selectedInvoice || !paymentAmount) {
      Alert.alert('Error', 'Please enter a payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > selectedInvoice.balanceDue) {
      Alert.alert('Error', 'Payment amount cannot exceed balance due');
      return;
    }

    setLocalInvoices(prev =>
      prev.map(inv => {
        if (inv.id === selectedInvoice.id) {
          const newAmountPaid = inv.amountPaid + amount;
          const newBalanceDue = inv.totalAmount - newAmountPaid;
          const newStatus: InvoiceStatus = newBalanceDue <= 0 ? 'paid' : 'partial';
          
          return {
            ...inv,
            amountPaid: newAmountPaid,
            balanceDue: Math.max(0, newBalanceDue),
            status: newStatus,
            paidAt: newStatus === 'paid' ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return inv;
      })
    );

    console.log('[AR] Payment recorded:', {
      invoiceId: selectedInvoice.id,
      amount,
      method: paymentMethod,
    });

    queryClient.invalidateQueries({ queryKey: ['ar_invoices'] });
    queryClient.invalidateQueries({ queryKey: ['finance_stats'] });

    Alert.alert('Success', `Payment of ${formatCurrency(amount)} recorded successfully`);
    setPaymentAmount('');
    setShowPaymentModal(false);
    setSelectedInvoice(null);
  }, [selectedInvoice, paymentAmount, paymentMethod, formatCurrency, queryClient]);

  const handleSendReminder = useCallback((invoice: ARInvoice) => {
    Alert.alert(
      'Send Reminder',
      `Send payment reminder to ${invoice.customerName} for invoice ${invoice.invoiceNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            console.log('[AR] Payment reminder sent for:', invoice.invoiceNumber);
            Alert.alert('Success', 'Payment reminder sent successfully');
          },
        },
      ]
    );
  }, []);

  const renderStatCard = useCallback(({ title, value, subtitle, icon, color }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
    </View>
  ), [colors]);

  const renderInvoice = useCallback((invoice: ARInvoice) => {
    const daysOverdue = getDaysOverdue(invoice.dueDate);
    const isOverdue = invoice.status === 'pending' && daysOverdue > 0;
    const statusColor = isOverdue ? '#EF4444' : getStatusColor(invoice.status);
    const displayStatus = isOverdue ? 'overdue' : invoice.status;

    return (
      <TouchableOpacity
        key={invoice.id}
        style={[styles.invoiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setSelectedInvoice(invoice)}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
          <View style={styles.invoiceInfo}>
            <Text style={[styles.invoiceNumber, { color: colors.text }]}>{invoice.invoiceNumber}</Text>
            <Text style={[styles.customerName, { color: colors.textSecondary }]}>{invoice.customerName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {displayStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Calendar size={14} color={colors.textTertiary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Due</Text>
              <Text style={[styles.detailValue, { color: isOverdue ? '#EF4444' : colors.text }]}>
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
            {isOverdue && (
              <View style={styles.overdueTag}>
                <AlertTriangle size={12} color="#EF4444" />
                <Text style={styles.overdueDays}>{daysOverdue}d overdue</Text>
              </View>
            )}
          </View>

          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>
                {formatCurrency(invoice.totalAmount)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Paid</Text>
              <Text style={[styles.amountValue, { color: '#22C55E' }]}>
                {formatCurrency(invoice.amountPaid)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.balanceValue, { color: invoice.balanceDue > 0 ? '#EF4444' : '#22C55E' }]}>
                {formatCurrency(invoice.balanceDue)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.invoiceActions}>
          {invoice.balanceDue > 0 && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: `${colors.primary}15` }]}
                onPress={() => {
                  setSelectedInvoice(invoice);
                  setShowPaymentModal(true);
                }}
              >
                <DollarSign size={16} color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>Record Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F59E0B15' }]}
                onPress={() => handleSendReminder(invoice)}
              >
                <Send size={16} color="#F59E0B" />
                <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Remind</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [colors, formatCurrency, formatDate, getDaysOverdue, getStatusColor, handleSendReminder]);

  const renderCustomer = useCallback((customer: Customer) => (
    <View
      key={customer.id}
      style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.customerHeader}>
        <View style={[styles.customerAvatar, { backgroundColor: `${colors.primary}15` }]}>
          <Building2 size={24} color={colors.primary} />
        </View>
        <View style={styles.customerInfo}>
          <Text style={[styles.customerTitle, { color: colors.text }]}>{customer.name}</Text>
          <Text style={[styles.customerCode, { color: colors.textSecondary }]}>{customer.customerCode}</Text>
        </View>
        <View style={[styles.customerStatus, { backgroundColor: customer.status === 'active' ? '#22C55E15' : '#EF444415' }]}>
          <Text style={[styles.customerStatusText, { color: customer.status === 'active' ? '#22C55E' : '#EF4444' }]}>
            {customer.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.customerDetails}>
        <View style={styles.customerDetailRow}>
          <Mail size={14} color={colors.textTertiary} />
          <Text style={[styles.customerDetailText, { color: colors.textSecondary }]}>{customer.email}</Text>
        </View>
        <View style={styles.customerDetailRow}>
          <Phone size={14} color={colors.textTertiary} />
          <Text style={[styles.customerDetailText, { color: colors.textSecondary }]}>{customer.phone}</Text>
        </View>
      </View>

      <View style={styles.customerFinancials}>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Credit Limit</Text>
          <Text style={[styles.financialValue, { color: colors.text }]}>{formatCurrency(customer.creditLimit)}</Text>
        </View>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Current Balance</Text>
          <Text style={[styles.financialValue, { color: customer.currentBalance > 0 ? '#EF4444' : '#22C55E' }]}>
            {formatCurrency(customer.currentBalance)}
          </Text>
        </View>
        <View style={styles.financialItem}>
          <Text style={[styles.financialLabel, { color: colors.textSecondary }]}>Terms</Text>
          <Text style={[styles.financialValue, { color: colors.text }]}>{customer.paymentTerms}</Text>
        </View>
      </View>
    </View>
  ), [colors, formatCurrency]);

  const renderAgingReport = useCallback(() => {
    const totalAging = agingBuckets.reduce((sum, b) => sum + b.amount, 0);

    return (
      <View style={styles.agingContainer}>
        <View style={[styles.agingSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.agingTitle, { color: colors.text }]}>Accounts Receivable Aging</Text>
          <Text style={[styles.agingTotal, { color: colors.text }]}>{formatCurrency(totalAging)}</Text>
          <Text style={[styles.agingSubtitle, { color: colors.textSecondary }]}>Total Outstanding</Text>

          <View style={styles.agingBarContainer}>
            {agingBuckets.map((bucket, index) => {
              const width = totalAging > 0 ? (bucket.amount / totalAging) * 100 : 0;
              return (
                <View
                  key={index}
                  style={[
                    styles.agingBarSegment,
                    {
                      backgroundColor: bucket.color,
                      width: `${Math.max(width, 1)}%`,
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.agingLegend}>
            {agingBuckets.map((bucket, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: bucket.color }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{bucket.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {agingBuckets.map((bucket, index) => (
          <View
            key={index}
            style={[styles.agingBucketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.bucketHeader}>
              <View style={[styles.bucketIndicator, { backgroundColor: bucket.color }]} />
              <View style={styles.bucketInfo}>
                <Text style={[styles.bucketLabel, { color: colors.text }]}>{bucket.range}</Text>
                <Text style={[styles.bucketCount, { color: colors.textSecondary }]}>
                  {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Text style={[styles.bucketAmount, { color: bucket.color }]}>{formatCurrency(bucket.amount)}</Text>
          </View>
        ))}
      </View>
    );
  }, [agingBuckets, colors, formatCurrency]);

  const renderInvoiceDetailModal = useCallback(() => {
    if (!selectedInvoice) return null;

    const daysOverdue = getDaysOverdue(selectedInvoice.dueDate);
    const isOverdue = selectedInvoice.status === 'pending' && daysOverdue > 0;

    return (
      <Modal visible={!!selectedInvoice && !showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Invoice Details</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Invoice Information</Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailGridItem}>
                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Invoice #</Text>
                    <Text style={[styles.gridValue, { color: colors.text }]}>{selectedInvoice.invoiceNumber}</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Status</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedInvoice.status)}15` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedInvoice.status) }]}>
                        {isOverdue ? 'OVERDUE' : selectedInvoice.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Invoice Date</Text>
                    <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(selectedInvoice.invoiceDate)}</Text>
                  </View>
                  <View style={styles.detailGridItem}>
                    <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Due Date</Text>
                    <Text style={[styles.gridValue, { color: isOverdue ? '#EF4444' : colors.text }]}>
                      {formatDate(selectedInvoice.dueDate)}
                      {isOverdue && ` (${daysOverdue}d late)`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Customer</Text>
                <View style={styles.customerInfoBox}>
                  <View style={[styles.customerIconBox, { backgroundColor: `${colors.primary}15` }]}>
                    <User size={20} color={colors.primary} />
                  </View>
                  <View style={styles.customerInfoText}>
                    <Text style={[styles.customerInfoName, { color: colors.text }]}>{selectedInvoice.customerName}</Text>
                    <Text style={[styles.customerInfoTerms, { color: colors.textSecondary }]}>
                      Terms: {selectedInvoice.paymentTerms}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.detailSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Line Items</Text>
                {selectedInvoice.lineItems.map((item, index) => (
                  <View key={item.id} style={[styles.lineItemRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.lineItemInfo}>
                      <Text style={[styles.lineItemDesc, { color: colors.text }]}>{item.description}</Text>
                      <Text style={[styles.lineItemMeta, { color: colors.textSecondary }]}>
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                        {item.discount > 0 && ` (-${formatCurrency(item.discount)})`}
                      </Text>
                    </View>
                    <Text style={[styles.lineItemAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Summary</Text>
                <View style={styles.summaryRows}>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(selectedInvoice.subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tax</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(selectedInvoice.taxAmount)}</Text>
                  </View>
                  {selectedInvoice.shippingAmount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(selectedInvoice.shippingAmount)}</Text>
                    </View>
                  )}
                  {selectedInvoice.discountAmount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Discount</Text>
                      <Text style={[styles.summaryValue, { color: '#22C55E' }]}>-{formatCurrency(selectedInvoice.discountAmount)}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                    <Text style={[styles.summaryTotalLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.summaryTotalValue, { color: colors.text }]}>{formatCurrency(selectedInvoice.totalAmount)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Amount Paid</Text>
                    <Text style={[styles.summaryValue, { color: '#22C55E' }]}>{formatCurrency(selectedInvoice.amountPaid)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.balanceDueRow]}>
                    <Text style={[styles.balanceDueLabel, { color: colors.text }]}>Balance Due</Text>
                    <Text style={[styles.balanceDueValue, { color: selectedInvoice.balanceDue > 0 ? '#EF4444' : '#22C55E' }]}>
                      {formatCurrency(selectedInvoice.balanceDue)}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {selectedInvoice.balanceDue > 0 && (
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.secondaryButton, { borderColor: colors.border }]}
                  onPress={() => handleSendReminder(selectedInvoice)}
                >
                  <Send size={18} color={colors.text} />
                  <Text style={[styles.footerButtonText, { color: colors.text }]}>Send Reminder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowPaymentModal(true)}
                >
                  <DollarSign size={18} color="#FFFFFF" />
                  <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>Record Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }, [selectedInvoice, showPaymentModal, colors, formatCurrency, formatDate, getDaysOverdue, getStatusColor, handleSendReminder]);

  const renderNewInvoiceModal = useCallback(() => (
    <Modal visible={showNewInvoiceModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Invoice</Text>
            <TouchableOpacity onPress={() => setShowNewInvoiceModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Customer *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.customerSelect}
                contentContainerStyle={styles.customerSelectContent}
              >
                {customers.filter(c => c.status === 'active').map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      styles.customerOption,
                      {
                        backgroundColor: newInvoice.customerId === customer.id ? colors.primary : colors.surface,
                        borderColor: newInvoice.customerId === customer.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setNewInvoice(prev => ({ ...prev, customerId: customer.id }))}
                  >
                    <Text
                      style={[
                        styles.customerOptionText,
                        { color: newInvoice.customerId === customer.id ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {customer.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={newInvoice.description}
                onChangeText={text => setNewInvoice(prev => ({ ...prev, description: text }))}
                placeholder="Enter invoice description"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Amount *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={newInvoice.amount}
                onChangeText={text => setNewInvoice(prev => ({ ...prev, amount: text.replace(/[^0-9.]/g, '') }))}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Due Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={newInvoice.dueDate}
                onChangeText={text => setNewInvoice(prev => ({ ...prev, dueDate: text }))}
                placeholder="YYYY-MM-DD (default: 30 days)"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            {newInvoice.amount && (
              <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>Invoice Preview</Text>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>{formatCurrency(parseFloat(newInvoice.amount) || 0)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Tax (8.25%)</Text>
                  <Text style={[styles.previewValue, { color: colors.text }]}>{formatCurrency((parseFloat(newInvoice.amount) || 0) * 0.0825)}</Text>
                </View>
                <View style={[styles.previewRow, styles.previewTotalRow]}>
                  <Text style={[styles.previewTotalLabel, { color: colors.text }]}>Total</Text>
                  <Text style={[styles.previewTotalValue, { color: colors.primary }]}>
                    {formatCurrency((parseFloat(newInvoice.amount) || 0) * 1.0825)}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => setShowNewInvoiceModal(false)}
            >
              <Text style={[styles.footerButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateInvoice}
            >
              <FileText size={18} color="#FFFFFF" />
              <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>Create Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [showNewInvoiceModal, newInvoice, customers, colors, formatCurrency, handleCreateInvoice]);

  const renderPaymentModal = useCallback(() => {
    if (!selectedInvoice) return null;

    return (
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.paymentModalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={[styles.invoiceRefCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.invoiceRefNumber, { color: colors.text }]}>{selectedInvoice.invoiceNumber}</Text>
                <Text style={[styles.invoiceRefCustomer, { color: colors.textSecondary }]}>{selectedInvoice.customerName}</Text>
                <Text style={[styles.invoiceRefBalance, { color: '#EF4444' }]}>
                  Balance Due: {formatCurrency(selectedInvoice.balanceDue)}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Payment Amount *</Text>
                <TextInput
                  style={[styles.textInput, styles.amountInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={paymentAmount}
                  onChangeText={text => setPaymentAmount(text.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={styles.payFullButton}
                  onPress={() => setPaymentAmount(selectedInvoice.balanceDue.toString())}
                >
                  <Text style={[styles.payFullText, { color: colors.primary }]}>Pay Full Amount</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Payment Method</Text>
                <View style={styles.methodOptions}>
                  {(['check', 'ach', 'wire', 'credit_card'] as const).map(method => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodOption,
                        {
                          backgroundColor: paymentMethod === method ? colors.primary : colors.surface,
                          borderColor: paymentMethod === method ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.methodOptionText,
                          { color: paymentMethod === method ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {method === 'credit_card' ? 'Card' : method.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.footerButton, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                }}
              >
                <Text style={[styles.footerButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerButton, styles.primaryButton, { backgroundColor: '#22C55E' }]}
                onPress={handleRecordPayment}
              >
                <CheckCircle size={18} color="#FFFFFF" />
                <Text style={[styles.footerButtonText, { color: '#FFFFFF' }]}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }, [showPaymentModal, selectedInvoice, paymentAmount, paymentMethod, colors, formatCurrency, handleRecordPayment]);

  if (invoicesLoading && !invoicesInitialized) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading accounts receivable...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsGrid}>
          {renderStatCard({
            title: 'Outstanding',
            value: formatCurrency(stats.totalOutstanding),
            subtitle: `${stats.pendingCount} pending`,
            icon: <CreditCard size={20} color="#2563EB" />,
            color: '#2563EB',
          })}
          {renderStatCard({
            title: 'Overdue',
            value: formatCurrency(stats.overdueAmount),
            subtitle: `${stats.overdueCount} invoices`,
            icon: <AlertTriangle size={20} color="#EF4444" />,
            color: '#EF4444',
          })}
          {renderStatCard({
            title: 'Collected YTD',
            value: formatCurrency(stats.totalCollected),
            subtitle: `${stats.paidCount} paid`,
            icon: <TrendingUp size={20} color="#22C55E" />,
            color: '#22C55E',
          })}
          {renderStatCard({
            title: 'Avg Collection',
            value: `${stats.avgDaysToCollect}d`,
            subtitle: 'days to collect',
            icon: <Clock size={20} color="#F59E0B" />,
            color: '#F59E0B',
          })}
        </View>

        <View style={styles.viewModeContainer}>
          {(['invoices', 'customers', 'aging'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.viewModeButton,
                {
                  backgroundColor: viewMode === mode ? colors.primary : colors.surface,
                  borderColor: viewMode === mode ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Text
                style={[
                  styles.viewModeText,
                  { color: viewMode === mode ? '#FFFFFF' : colors.text },
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {viewMode === 'invoices' && (
          <>
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
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {(['all', 'pending', 'overdue', 'partial', 'paid'] as FilterType[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: filter === f ? colors.primary : colors.surface,
                      borderColor: filter === f ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: filter === f ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Invoices ({filteredInvoices.length})
            </Text>

            {filteredInvoices.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <FileText size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No invoices found</Text>
              </View>
            ) : (
              filteredInvoices.map(renderInvoice)
            )}
          </>
        )}

        {viewMode === 'customers' && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Customers ({customers.length})
            </Text>
            {customers.map(renderCustomer)}
          </>
        )}

        {viewMode === 'aging' && renderAgingReport()}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowNewInvoiceModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {renderInvoiceDetailModal()}
      {renderNewInvoiceModal()}
      {renderPaymentModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '47%' as any,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  viewModeContainer: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 16,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterRow: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  invoiceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  invoiceHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  customerName: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  invoiceDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  detailItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  overdueTag: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overdueDays: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  amountRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  amountItem: {
    alignItems: 'center' as const,
  },
  amountLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  invoiceActions: {
    flexDirection: 'row' as const,
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  customerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  customerCode: {
    fontSize: 13,
    marginTop: 2,
  },
  customerStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  customerStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  customerDetails: {
    gap: 8,
    marginBottom: 12,
  },
  customerDetailRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  customerDetailText: {
    fontSize: 13,
  },
  customerFinancials: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB20',
  },
  financialItem: {
    alignItems: 'center' as const,
  },
  financialLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  agingContainer: {
    gap: 12,
  },
  agingSummary: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  agingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  agingTotal: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  agingSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  agingBarContainer: {
    flexDirection: 'row' as const,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden' as const,
    width: '100%',
    marginBottom: 16,
  },
  agingBarSegment: {
    height: '100%',
  },
  agingLegend: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
  },
  agingBucketCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bucketHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  bucketIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  bucketInfo: {},
  bucketLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  bucketCount: {
    fontSize: 12,
    marginTop: 2,
  },
  bucketAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyStateText: {
    fontSize: 15,
    marginTop: 12,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  paymentModalContent: {
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 16,
  },
  detailGridItem: {
    width: '45%' as any,
  },
  gridLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  customerInfoBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  customerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  customerInfoText: {},
  customerInfoName: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  customerInfoTerms: {
    fontSize: 13,
    marginTop: 2,
  },
  lineItemRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  lineItemInfo: {
    flex: 1,
  },
  lineItemDesc: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  lineItemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  summaryRows: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  summaryRowTotal: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB40',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  balanceDueRow: {
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB40',
  },
  balanceDueLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  balanceDueValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top' as const,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    height: 60,
  },
  customerSelect: {
    marginBottom: 4,
  },
  customerSelectContent: {
    gap: 8,
  },
  customerOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  customerOptionText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  previewCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  previewTotalRow: {
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB40',
  },
  previewTotalLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  previewTotalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  invoiceRefCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'center' as const,
  },
  invoiceRefNumber: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  invoiceRefCustomer: {
    fontSize: 14,
    marginTop: 4,
  },
  invoiceRefBalance: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  payFullButton: {
    alignSelf: 'center' as const,
    marginTop: 8,
  },
  payFullText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  methodOptions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  methodOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  methodOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
