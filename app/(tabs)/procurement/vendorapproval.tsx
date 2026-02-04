import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useProcurementVendorsQuery, useUpdateProcurementVendor } from '@/hooks/useSupabaseProcurement';
import { useVendorOnboardingQuery, useUpdateVendorOnboarding } from '@/hooks/useSupabaseProcurementExtended';
import { CheckCircle, Search, Clock, XCircle, AlertTriangle, Building, ChevronRight, Filter, Star, ThumbsUp, ThumbsDown, Eye, FileText, Shield } from 'lucide-react-native';

const APPROVAL_STATUS = {
  pending: { label: 'Pending', color: '#F59E0B', icon: Clock },
  approved: { label: 'Approved', color: '#10B981', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#EF4444', icon: XCircle },
  conditional: { label: 'Conditional', color: '#8B5CF6', icon: AlertTriangle },
};

export default function VendorApprovalScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>('pending');
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const { data: vendors = [], isLoading: vendorsLoading, refetch: refetchVendors } = useProcurementVendorsQuery();
  const { data: onboardingRecords = [], isLoading: onboardingLoading, refetch: refetchOnboarding } = useVendorOnboardingQuery();
  const updateVendor = useUpdateProcurementVendor({
    onSuccess: () => {
      Alert.alert('Success', 'Vendor status updated');
      refetchVendors();
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateOnboarding = useUpdateVendorOnboarding({
    onSuccess: () => {
      Alert.alert('Success', 'Onboarding status updated');
      refetchOnboarding();
    },
    onError: (error) => Alert.alert('Error', error.message),
  });

  const pendingApprovals = useMemo(() => {
    const pendingVendors = vendors.filter((v) => v.active === false || !v.active);
    const pendingOnboarding = onboardingRecords.filter((o) => o.status === 'under_review');

    const combined = [
      ...pendingOnboarding.map((o) => ({
        id: o.id,
        type: 'onboarding' as const,
        name: o.vendor_name,
        contactName: o.contact_name,
        vendorType: o.vendor_type,
        status: o.status,
        createdAt: o.created_at,
        data: o,
      })),
      ...pendingVendors
        .filter((v) => !pendingOnboarding.some((o) => o.vendor_id === v.id))
        .map((v) => ({
          id: v.id,
          type: 'vendor' as const,
          name: v.name,
          contactName: v.contact_name,
          vendorType: v.vendor_type,
          status: 'pending_approval',
          createdAt: v.created_at,
          data: v,
        })),
    ];

    let filtered = combined;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.contactName || '').toLowerCase().includes(query)
      );
    }

    if (filterStatus === 'pending') {
      filtered = filtered.filter((item) => 
        item.status === 'under_review' || item.status === 'pending_approval'
      );
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [vendors, onboardingRecords, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = pendingApprovals.length;
    const pending = pendingApprovals.filter((p) => 
      p.status === 'under_review' || p.status === 'pending_approval'
    ).length;
    const approvedThisMonth = vendors.filter((v) => {
      if (!v.active) return false;
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(v.updated_at) >= monthAgo;
    }).length;
    const onboardingCount = onboardingRecords.filter((o) => 
      ['initiated', 'documents_pending', 'under_review'].includes(o.status)
    ).length;

    return { total, pending, approvedThisMonth, onboardingCount };
  }, [pendingApprovals, vendors, onboardingRecords]);

  const handleApprove = (item: typeof pendingApprovals[0]) => {
    Alert.alert(
      'Approve Vendor',
      `Are you sure you want to approve "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            if (item.type === 'onboarding') {
              updateOnboarding.mutate({
                id: item.id,
                updates: {
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                  approved_by: 'Current User',
                },
              });
            } else {
              updateVendor.mutate({
                id: item.id,
                updates: {
                  active: true,
                },
              });
            }
          },
        },
      ]
    );
  };

  const handleReject = (item: typeof pendingApprovals[0]) => {
    Alert.alert(
      'Reject Vendor',
      `Are you sure you want to reject "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            if (item.type === 'onboarding') {
              updateOnboarding.mutate({
                id: item.id,
                updates: {
                  status: 'rejected',
                  rejected_at: new Date().toISOString(),
                  rejected_by: 'Current User',
                },
              });
            } else {
              updateVendor.mutate({
                id: item.id,
                updates: {
                  active: false,
                },
              });
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getVendorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      supplier: 'Supplier',
      service: 'Service',
      contractor: 'Contractor',
      distributor: 'Distributor',
    };
    return labels[type] || type;
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
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    titleIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#8B5CF615',
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: '#8B5CF6',
      borderColor: '#8B5CF6',
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
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    statPending: {
      backgroundColor: '#FEF3C7',
    },
    statValuePending: {
      color: '#D97706',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
      marginBottom: 12,
    },
    approvalCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    cardIcon: {
      width: 52,
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardInitial: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    cardInfo: {
      flex: 1,
    },
    vendorName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    contactName: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 6,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
    },
    typeText: {
      fontSize: 11,
      color: '#6B7280',
    },
    sourceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#8B5CF615',
      gap: 4,
    },
    sourceText: {
      fontSize: 10,
      color: '#8B5CF6',
      fontWeight: '500' as const,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cardDetails: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    detailText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    cardActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      gap: 8,
    },
    actionButtonBorder: {
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    approveButton: {
      backgroundColor: '#10B98110',
    },
    rejectButton: {
      backgroundColor: '#EF444410',
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
    recentSection: {
      marginTop: 24,
    },
    recentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      gap: 12,
    },
    recentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentInfo: {
      flex: 1,
    },
    recentName: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.text,
    },
    recentDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    recentStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    recentStatusText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
  });

  const recentlyApproved = vendors
    .filter((v) => v.active)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.titleIcon}>
            <CheckCircle size={24} color="#8B5CF6" />
          </View>
          <View>
            <Text style={styles.title}>Vendor Approvals</Text>
            <Text style={styles.subtitle}>Review and approve vendors</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search vendors..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === 'pending' ? null : 'pending')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextActive]}>
              Pending Review
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === null && styles.filterChipActive]}
            onPress={() => setFilterStatus(null)}
          >
            <Text style={[styles.filterChipText, filterStatus === null && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={vendorsLoading || onboardingLoading}
            onRefresh={() => {
              refetchVendors();
              refetchOnboarding();
            }}
          />
        }
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, stats.pending > 0 && styles.statPending]}>
            <Text style={[styles.statValue, stats.pending > 0 && styles.statValuePending]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.onboardingCount}</Text>
            <Text style={styles.statLabel}>Onboarding</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.approvedThisMonth}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{vendors.filter((v) => v.active).length}</Text>
            <Text style={styles.statLabel}>Total Active</Text>
          </View>
        </View>

        {pendingApprovals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Approvals ({pendingApprovals.length})</Text>
            {pendingApprovals.map((item) => {
              const typeColor = item.vendorType === 'service' ? '#8B5CF6' : item.vendorType === 'contractor' ? '#F59E0B' : '#3B82F6';
              
              return (
                <View key={`${item.type}-${item.id}`} style={styles.approvalCard}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: typeColor }]}>
                      <Text style={styles.cardInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.vendorName}>{item.name}</Text>
                      {item.contactName && <Text style={styles.contactName}>{item.contactName}</Text>}
                      <View style={styles.cardMeta}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeText}>{getVendorTypeLabel(item.vendorType)}</Text>
                        </View>
                        <View style={styles.sourceBadge}>
                          {item.type === 'onboarding' ? (
                            <>
                              <FileText size={10} color="#8B5CF6" />
                              <Text style={styles.sourceText}>Onboarding</Text>
                            </>
                          ) : (
                            <>
                              <Building size={10} color="#8B5CF6" />
                              <Text style={styles.sourceText}>Direct</Text>
                            </>
                          )}
                        </View>
                        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonBorder, styles.approveButton]}
                      onPress={() => handleApprove(item)}
                    >
                      <ThumbsUp size={18} color="#10B981" />
                      <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleReject(item)}
                    >
                      <ThumbsDown size={18} color="#EF4444" />
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {pendingApprovals.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <CheckCircle size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No vendors pending approval</Text>
          </View>
        )}

        {recentlyApproved.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recently Approved</Text>
            {recentlyApproved.map((vendor) => (
              <View key={vendor.id} style={styles.recentCard}>
                <View style={[styles.recentIcon, { backgroundColor: '#10B98115' }]}>
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName}>{vendor.name}</Text>
                  <Text style={styles.recentDate}>{formatDate(vendor.updated_at)}</Text>
                </View>
                <View style={styles.recentStatus}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={[styles.recentStatusText, { color: '#10B981' }]}>Active</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
