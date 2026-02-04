import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDropShipOrdersQuery, useCreateDropShipOrder, useUpdateDropShipOrder, DropShipOrder } from '@/hooks/useSupabaseProcurementExtended';
import { useProcurementVendorsQuery } from '@/hooks/useSupabaseProcurement';
import { Truck, Search, Plus, MapPin, Package, Clock, CheckCircle, XCircle, User, Building, ChevronRight, X, Eye, EyeOff } from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  pending: { label: 'Pending', color: '#F59E0B', icon: Clock },
  ordered: { label: 'Ordered', color: '#3B82F6', icon: Package },
  shipped: { label: 'Shipped', color: '#8B5CF6', icon: Truck },
  delivered: { label: 'Delivered', color: '#10B981', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: XCircle },
};

export default function DropShipPOScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: dropShipOrders = [], isLoading, refetch } = useDropShipOrdersQuery();
  const { data: vendors = [] } = useProcurementVendorsQuery({ activeOnly: true });
  const createDropShip = useCreateDropShipOrder({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Drop ship order created');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateDropShip = useUpdateDropShipOrder({
    onSuccess: () => Alert.alert('Success', 'Order updated'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredOrders = useMemo(() => {
    let filtered = dropShipOrders;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.drop_ship_number.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.vendor_name.toLowerCase().includes(query)
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((order) => order.status === filterStatus);
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [dropShipOrders, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = dropShipOrders.length;
    const pending = dropShipOrders.filter((o) => o.status === 'pending').length;
    const inTransit = dropShipOrders.filter((o) => o.status === 'shipped').length;
    const delivered = dropShipOrders.filter((o) => o.status === 'delivered').length;
    const totalValue = dropShipOrders.reduce((sum, o) => sum + o.total_amount, 0);

    return { total, pending, inTransit, delivered, totalValue };
  }, [dropShipOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUpdateStatus = (order: DropShipOrder, newStatus: string) => {
    const updates: Partial<DropShipOrder> = { status: newStatus as DropShipOrder['status'] };
    if (newStatus === 'shipped') {
      updates.shipped_date = new Date().toISOString();
    } else if (newStatus === 'delivered') {
      updates.delivered_date = new Date().toISOString();
    }
    updateDropShip.mutate({ id: order.id, updates });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    titleIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#14B8A615',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#14B8A6',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 8,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontWeight: '600' as const,
      fontSize: 14,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      marginLeft: 8,
      color: colors.text,
      fontSize: 15,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: '#14B8A6',
      borderColor: '#14B8A6',
    },
    filterChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    orderCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    orderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    orderIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderInfo: {
      flex: 1,
    },
    orderNumber: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    customerName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    orderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      gap: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    blindBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#6366F115',
      gap: 4,
    },
    blindText: {
      fontSize: 10,
      color: '#6366F1',
      fontWeight: '500' as const,
    },
    orderAmount: {
      alignItems: 'flex-end',
    },
    amountValue: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    amountLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    shippingInfo: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    shippingLabel: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      marginBottom: 6,
    },
    addressText: {
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    trackingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    trackingLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    trackingNumber: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: '#14B8A6',
    },
    orderFooter: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 6,
    },
    actionButtonBorder: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.text,
    },
    modalBody: {
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
      marginBottom: 8,
    },
    formInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formTextArea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    vendorSelector: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 120,
    },
    vendorOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    vendorOptionSelected: {
      backgroundColor: '#14B8A615',
    },
    vendorOptionText: {
      fontSize: 14,
      color: colors.text,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#14B8A6',
      borderColor: '#14B8A6',
    },
    checkboxLabel: {
      fontSize: 14,
      color: colors.text,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: '#14B8A6',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const CreateDropShipModal = () => {
    const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [customerCompany, setCustomerCompany] = useState('');
    const [shipToAddress, setShipToAddress] = useState('');
    const [shipToCity, setShipToCity] = useState('');
    const [shipToState, setShipToState] = useState('');
    const [shipToZip, setShipToZip] = useState('');
    const [salesOrderNumber, setSalesOrderNumber] = useState('');
    const [blindShip, setBlindShip] = useState(false);
    const [totalAmount, setTotalAmount] = useState('');

    const selectedVendorData = vendors.find((v) => v.id === selectedVendor);

    const handleSubmit = () => {
      if (!selectedVendor || !customerName || !shipToAddress) {
        Alert.alert('Error', 'Please fill in required fields');
        return;
      }

      createDropShip.mutate({
        po_id: null,
        po_number: null,
        vendor_id: selectedVendor,
        vendor_name: selectedVendorData?.name || 'Unknown',
        customer_name: customerName,
        customer_company: customerCompany || null,
        ship_to_address: shipToAddress,
        ship_to_city: shipToCity || null,
        ship_to_state: shipToState || null,
        ship_to_zip: shipToZip || null,
        ship_to_country: 'USA',
        ship_to_phone: null,
        ship_to_email: null,
        sales_order_number: salesOrderNumber || null,
        status: 'pending',
        blind_ship: blindShip,
        tracking_number: null,
        carrier: null,
        shipped_date: null,
        delivered_date: null,
        total_amount: parseFloat(totalAmount) || 0,
        line_items: [],
        created_by: 'Current User',
        created_by_id: null,
        notes: null,
      });
    };

    return (
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Drop Ship Order</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select Vendor *</Text>
                <ScrollView style={styles.vendorSelector}>
                  {vendors.map((vendor) => (
                    <TouchableOpacity
                      key={vendor.id}
                      style={[styles.vendorOption, selectedVendor === vendor.id && styles.vendorOptionSelected]}
                      onPress={() => setSelectedVendor(vendor.id)}
                    >
                      <Text style={styles.vendorOptionText}>{vendor.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Company</Text>
                <TextInput
                  style={styles.formInput}
                  value={customerCompany}
                  onChangeText={setCustomerCompany}
                  placeholder="Enter company name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ship To Address *</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={shipToAddress}
                  onChangeText={setShipToAddress}
                  placeholder="Enter street address"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>City, State, ZIP</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 2 }]}
                    value={shipToCity}
                    onChangeText={setShipToCity}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={shipToState}
                    onChangeText={setShipToState}
                    placeholder="State"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={shipToZip}
                    onChangeText={setShipToZip}
                    placeholder="ZIP"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sales Order #</Text>
                <TextInput
                  style={styles.formInput}
                  value={salesOrderNumber}
                  onChangeText={setSalesOrderNumber}
                  placeholder="Enter sales order number"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Total Amount</Text>
                <TextInput
                  style={styles.formInput}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setBlindShip(!blindShip)}>
                  <View style={[styles.checkbox, blindShip && styles.checkboxChecked]}>
                    {blindShip && <CheckCircle size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Blind Ship (hide vendor info from customer)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={createDropShip.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createDropShip.isPending ? 'Creating...' : 'Create Order'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitle}>
            <View style={styles.titleIcon}>
              <Truck size={24} color="#14B8A6" />
            </View>
            <View>
              <Text style={styles.title}>Drop Ship</Text>
              <Text style={styles.subtitle}>Direct-to-customer orders</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search orders..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {[
            { key: null, label: 'All' },
            ...Object.entries(STATUS_CONFIG).map(([key, config]) => ({ key, label: config.label })),
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key || 'all'}
              style={[styles.filterChip, filterStatus === filter.key && styles.filterChipActive]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text style={[styles.filterChipText, filterStatus === filter.key && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.inTransit}</Text>
            <Text style={styles.statLabel}>In Transit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
        </View>

        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Truck size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Drop Ship Orders</Text>
            <Text style={styles.emptyText}>Create orders to ship directly to customers</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={[styles.orderIconContainer, { backgroundColor: `${statusConfig.color}15` }]}>
                    <StatusIcon size={24} color={statusConfig.color} />
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{order.drop_ship_number}</Text>
                    <Text style={styles.customerName}>{order.customer_name}</Text>
                    <View style={styles.orderMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                      </View>
                      {order.blind_ship && (
                        <View style={styles.blindBadge}>
                          <EyeOff size={10} color="#6366F1" />
                          <Text style={styles.blindText}>Blind</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.orderAmount}>
                    <Text style={styles.amountValue}>{formatCurrency(order.total_amount)}</Text>
                    <Text style={styles.amountLabel}>{order.vendor_name}</Text>
                  </View>
                </View>

                <View style={styles.shippingInfo}>
                  <Text style={styles.shippingLabel}>Ship To</Text>
                  <Text style={styles.addressText}>
                    {order.customer_company ? `${order.customer_company}\n` : ''}
                    {order.ship_to_address}
                    {order.ship_to_city && `\n${order.ship_to_city}, ${order.ship_to_state} ${order.ship_to_zip}`}
                  </Text>
                  {order.tracking_number && (
                    <View style={styles.trackingRow}>
                      <Text style={styles.trackingLabel}>Tracking:</Text>
                      <Text style={styles.trackingNumber}>{order.tracking_number}</Text>
                    </View>
                  )}
                </View>

                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <View style={styles.orderFooter}>
                    {order.status === 'pending' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonBorder]}
                        onPress={() => handleUpdateStatus(order, 'ordered')}
                      >
                        <Package size={16} color="#3B82F6" />
                        <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Mark Ordered</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'ordered' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonBorder]}
                        onPress={() => handleUpdateStatus(order, 'shipped')}
                      >
                        <Truck size={16} color="#8B5CF6" />
                        <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>Mark Shipped</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'shipped' && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpdateStatus(order, 'delivered')}
                      >
                        <CheckCircle size={16} color="#10B981" />
                        <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Mark Delivered</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <CreateDropShipModal />
    </View>
  );
}
