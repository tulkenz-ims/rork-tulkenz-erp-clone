import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Share2,
  Link,
  ArrowRightLeft,
  Package,
  Building2,
  DollarSign,
  Clock,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  MapPin,
  Star,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import {
  SharedMaterialGroup,
  SharedMaterialEntry,
  InterUnitTransfer,
  INVENTORY_DEPARTMENTS,
  getDepartmentColor,
  getTransferStatusColor,
  getTransferStatusLabel,
} from '@/constants/inventoryDepartmentCodes';
import {
  useSharedMaterialGroupsQuery,
  useInterUnitTransfersQuery,
  useSharedMaterialsStats,
  usePendingTransfers,
  useTransfersForGroup,
  useCreateInterUnitTransfer,
  useMaterialByMaterialNumber,
} from '@/hooks/useSupabaseSharedMaterials';
import { useMaterialsQuery } from '@/hooks/useSupabaseMaterials';
import { useQueryClient } from '@tanstack/react-query';

interface TransferModalProps {
  visible: boolean;
  group: SharedMaterialGroup | null;
  onClose: () => void;
  onSubmit: (transfer: Partial<InterUnitTransfer>) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({
  visible,
  group,
  onClose,
  onSubmit,
}) => {
  const { colors } = useTheme();
  const [fromMaterial, setFromMaterial] = useState<SharedMaterialEntry | null>(null);
  const [toMaterial, setToMaterial] = useState<SharedMaterialEntry | null>(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = useCallback(() => {
    if (!fromMaterial || !toMaterial || !quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (qty > fromMaterial.onHand) {
      Alert.alert('Error', 'Insufficient quantity available');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({
      sharedGroupId: group?.id,
      fromMaterialNumber: fromMaterial.materialNumber,
      toMaterialNumber: toMaterial.materialNumber,
      fromDepartment: fromMaterial.departmentCode,
      toDepartment: toMaterial.departmentCode,
      quantity: qty,
      unitCost: fromMaterial.unitCost,
      totalValue: qty * fromMaterial.unitCost,
      notes,
    });

    setFromMaterial(null);
    setToMaterial(null);
    setQuantity('');
    setNotes('');
    onClose();
  }, [fromMaterial, toMaterial, quantity, notes, group, onSubmit, onClose]);

  if (!group) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Inter-Unit Transfer
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {group.name} ({group.oemPartNumber})
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>From Department</Text>
            <View style={styles.materialSelectGrid}>
              {group.linkedMaterials.map((mat) => (
                <Pressable
                  key={mat.materialNumber}
                  style={[
                    styles.materialSelectItem,
                    {
                      backgroundColor: fromMaterial?.materialNumber === mat.materialNumber
                        ? `${getDepartmentColor(mat.departmentCode)}20`
                        : colors.backgroundSecondary,
                      borderColor: fromMaterial?.materialNumber === mat.materialNumber
                        ? getDepartmentColor(mat.departmentCode)
                        : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFromMaterial(mat);
                    if (toMaterial?.materialNumber === mat.materialNumber) {
                      setToMaterial(null);
                    }
                  }}
                >
                  <View style={[styles.deptDot, { backgroundColor: getDepartmentColor(mat.departmentCode) }]} />
                  <View style={styles.materialSelectInfo}>
                    <Text style={[styles.materialSelectDept, { color: colors.text }]}>
                      {mat.departmentName}
                    </Text>
                    <Text style={[styles.materialSelectNum, { color: colors.textSecondary }]}>
                      {mat.materialNumber} • {mat.onHand} on hand
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>To Department</Text>
            <View style={styles.materialSelectGrid}>
              {group.linkedMaterials
                .filter((mat) => mat.materialNumber !== fromMaterial?.materialNumber)
                .map((mat) => (
                  <Pressable
                    key={mat.materialNumber}
                    style={[
                      styles.materialSelectItem,
                      {
                        backgroundColor: toMaterial?.materialNumber === mat.materialNumber
                          ? `${getDepartmentColor(mat.departmentCode)}20`
                          : colors.backgroundSecondary,
                        borderColor: toMaterial?.materialNumber === mat.materialNumber
                          ? getDepartmentColor(mat.departmentCode)
                          : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setToMaterial(mat);
                    }}
                  >
                    <View style={[styles.deptDot, { backgroundColor: getDepartmentColor(mat.departmentCode) }]} />
                    <View style={styles.materialSelectInfo}>
                      <Text style={[styles.materialSelectDept, { color: colors.text }]}>
                        {mat.departmentName}
                      </Text>
                      <Text style={[styles.materialSelectNum, { color: colors.textSecondary }]}>
                        {mat.materialNumber} • {mat.onHand} on hand
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
            />
            {fromMaterial && (
              <Text style={[styles.availableText, { color: colors.textSecondary }]}>
                Available: {fromMaterial.onHand} @ ${fromMaterial.unitCost.toFixed(2)} each
              </Text>
            )}

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter transfer notes..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />

            {fromMaterial && toMaterial && quantity && (
              <View style={[styles.transferSummary, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>Transfer Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>From:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {fromMaterial.departmentName} ({fromMaterial.materialNumber})
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>To:</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {toMaterial.departmentName} ({toMaterial.materialNumber})
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Value:</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981', fontWeight: '700' as const }]}>
                    ${(parseInt(quantity, 10) * fromMaterial.unitCost).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: fromMaterial && toMaterial && quantity ? '#8B5CF6' : colors.border },
              ]}
              onPress={handleSubmit}
              disabled={!fromMaterial || !toMaterial || !quantity}
            >
              <ArrowRightLeft size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Request Transfer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface SharedGroupCardProps {
  group: SharedMaterialGroup;
  expanded: boolean;
  onToggle: () => void;
  onTransfer: () => void;
  transfers: InterUnitTransfer[];
}

const SharedGroupCard: React.FC<SharedGroupCardProps> = ({
  group,
  expanded,
  onToggle,
  onTransfer,
  transfers,
}) => {
  const { colors } = useTheme();
  const pendingCount = transfers.filter((t) => t.status === 'pending').length;

  return (
    <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable style={styles.groupHeader} onPress={onToggle}>
        <View style={[styles.groupIcon, { backgroundColor: '#8B5CF620' }]}>
          <Share2 size={22} color="#8B5CF6" />
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupTitleRow}>
            <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
              {group.name}
            </Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.groupOem, { color: colors.textSecondary }]}>
            OEM: {group.oemPartNumber} • {group.manufacturer}
          </Text>
          <View style={styles.groupStats}>
            <View style={styles.groupStat}>
              <Link size={12} color={colors.textTertiary} />
              <Text style={[styles.groupStatText, { color: colors.textTertiary }]}>
                {group.linkedMaterials.length} depts
              </Text>
            </View>
            <View style={styles.groupStat}>
              <Package size={12} color={colors.textTertiary} />
              <Text style={[styles.groupStatText, { color: colors.textTertiary }]}>
                {group.totalOnHand} total
              </Text>
            </View>
            <View style={styles.groupStat}>
              <DollarSign size={12} color="#10B981" />
              <Text style={[styles.groupStatText, { color: '#10B981' }]}>
                ${group.totalValue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.groupExpanded}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Linked Department Materials
          </Text>
          {group.linkedMaterials.map((mat) => (
            <View
              key={mat.materialNumber}
              style={[styles.linkedMaterialRow, { backgroundColor: colors.backgroundSecondary }]}
            >
              <View
                style={[
                  styles.deptIndicator,
                  { backgroundColor: getDepartmentColor(mat.departmentCode) },
                ]}
              />
              <View style={styles.linkedMaterialInfo}>
                <View style={styles.linkedMaterialHeader}>
                  <Text style={[styles.linkedMaterialDept, { color: colors.text }]}>
                    {mat.departmentName}
                  </Text>
                  {mat.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Star size={10} color="#F59E0B" />
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.linkedMaterialNumber, { color: colors.textSecondary }]}>
                  {mat.materialNumber}
                </Text>
              </View>
              <View style={styles.linkedMaterialStats}>
                <View style={styles.linkedMaterialStatRow}>
                  <Package size={12} color={colors.textTertiary} />
                  <Text style={[styles.linkedMaterialStatValue, { color: colors.text }]}>
                    {mat.onHand}
                  </Text>
                </View>
                <View style={styles.linkedMaterialStatRow}>
                  <MapPin size={12} color={colors.textTertiary} />
                  <Text style={[styles.linkedMaterialStatValue, { color: colors.textSecondary }]}>
                    {mat.location}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {transfers.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                Recent Transfers
              </Text>
              {transfers.slice(0, 3).map((transfer) => (
                <View
                  key={transfer.id}
                  style={[styles.transferRow, { backgroundColor: colors.backgroundSecondary }]}
                >
                  <View
                    style={[
                      styles.transferStatusDot,
                      { backgroundColor: getTransferStatusColor(transfer.status) },
                    ]}
                  />
                  <View style={styles.transferInfo}>
                    <Text style={[styles.transferText, { color: colors.text }]}>
                      {INVENTORY_DEPARTMENTS[transfer.fromDepartment]?.shortName} →{' '}
                      {INVENTORY_DEPARTMENTS[transfer.toDepartment]?.shortName}
                    </Text>
                    <Text style={[styles.transferMeta, { color: colors.textSecondary }]}>
                      {transfer.quantity} units • {getTransferStatusLabel(transfer.status)}
                    </Text>
                  </View>
                  <Text style={[styles.transferValue, { color: colors.text }]}>
                    ${transfer.totalValue.toFixed(2)}
                  </Text>
                </View>
              ))}
            </>
          )}

          <Pressable
            style={[styles.transferButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onTransfer();
            }}
          >
            <ArrowRightLeft size={18} color="#FFFFFF" />
            <Text style={styles.transferButtonText}>Create Inter-Unit Transfer</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default function SharedMaterialsManager() {
  const { colors } = useTheme();
  const { userProfile } = useUser();
  const queryClient = useQueryClient();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SharedMaterialGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'transfers'>('groups');
  const [refreshing, setRefreshing] = useState(false);

  const { data: sharedGroups = [], isLoading: groupsLoading, refetch: refetchGroups } = useSharedMaterialGroupsQuery();
  const { data: allTransfers = [], isLoading: transfersLoading, refetch: refetchTransfers } = useInterUnitTransfersQuery();
  const { data: allMaterials = [] } = useMaterialsQuery({ filters: [{ column: 'classification', operator: 'eq', value: 'shared' }] });
  const stats = useSharedMaterialsStats();
  const pendingTransfers = usePendingTransfers();

  const createTransferMutation = useCreateInterUnitTransfer({
    onSuccess: (transfer) => {
      Alert.alert(
        'Transfer Requested',
        `Inter-unit transfer request created.\nReference: ${transfer.referenceNumber}`,
        [{ text: 'OK' }]
      );
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to create transfer request');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGroups(), refetchTransfers()]);
    setRefreshing(false);
  }, [refetchGroups, refetchTransfers]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return sharedGroups;
    const query = searchQuery.toLowerCase();
    return sharedGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.oemPartNumber.toLowerCase().includes(query) ||
        g.manufacturer?.toLowerCase().includes(query)
    );
  }, [searchQuery, sharedGroups]);

  const getTransfersForGroupFn = useCallback((groupId: string) => {
    return allTransfers.filter((t) => t.sharedGroupId === groupId);
  }, [allTransfers]);

  const handleToggleGroup = useCallback((groupId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  }, []);

  const handleOpenTransfer = useCallback((group: SharedMaterialGroup) => {
    setSelectedGroup(group);
    setTransferModalVisible(true);
  }, []);

  const handleSubmitTransfer = useCallback(async (transfer: Partial<InterUnitTransfer>) => {
    if (!transfer.sharedGroupId || !transfer.fromMaterialNumber || !transfer.toMaterialNumber) {
      Alert.alert('Error', 'Missing required transfer information');
      return;
    }

    const fromMat = allMaterials.find(m => m.material_number === transfer.fromMaterialNumber);
    if (!fromMat) {
      Alert.alert('Error', 'Source material not found');
      return;
    }

    const toMat = allMaterials.find(m => m.material_number === transfer.toMaterialNumber);
    if (!toMat) {
      Alert.alert('Error', 'Destination material not found');
      return;
    }

    createTransferMutation.mutate({
      sharedGroupId: transfer.sharedGroupId,
      fromMaterial: {
        id: fromMat.id,
        materialNumber: fromMat.material_number,
        name: fromMat.name,
        sku: fromMat.sku,
        onHand: Number(fromMat.on_hand) || 0,
      },
      toMaterial: {
        id: toMat.id,
        materialNumber: toMat.material_number,
        departmentCode: toMat.inventory_department,
      },
      quantity: transfer.quantity || 0,
      unitCost: transfer.unitCost || 0,
      requestedBy: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Current User',
      notes: transfer.notes,
    });
  }, [allMaterials, createTransferMutation, userProfile]);

  const isLoading = groupsLoading || transfersLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Share2 size={18} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalGroups}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Groups</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Link size={18} color="#3B82F6" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalLinkedMaterials}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Linked</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Building2 size={18} color="#10B981" />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.departmentsInvolved}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Depts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Clock size={18} color="#F59E0B" />
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.pendingTransfers}</Text>
          <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Pending</Text>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search shared materials..."
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'groups' && { borderBottomColor: '#8B5CF6', borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('groups')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'groups' ? '#8B5CF6' : colors.textSecondary },
            ]}
          >
            Shared Groups
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tab,
            activeTab === 'transfers' && { borderBottomColor: '#8B5CF6', borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('transfers')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'transfers' ? '#8B5CF6' : colors.textSecondary },
            ]}
          >
            Transfers
          </Text>
          {pendingTransfers.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingTransfers.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, marginTop: 12 }]}>
              Loading shared materials...
            </Text>
          </View>
        ) : activeTab === 'groups' ? (
          <>
            {filteredGroups.map((group) => (
              <SharedGroupCard
                key={group.id}
                group={group}
                expanded={expandedGroup === group.id}
                onToggle={() => handleToggleGroup(group.id)}
                onTransfer={() => handleOpenTransfer(group)}
                transfers={getTransfersForGroupFn(group.id)}
              />
            ))}
            {filteredGroups.length === 0 && (
              <View style={styles.emptyState}>
                <Share2 size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {sharedGroups.length === 0
                    ? 'No shared material groups found. Mark materials as "shared" with matching OEM part numbers to create groups.'
                    : 'No shared material groups match your search'}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {allTransfers.map((transfer) => {
              const group = sharedGroups.find(
                (g) => g.id === transfer.sharedGroupId
              );
              return (
                <View
                  key={transfer.id}
                  style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.transferCardHeader}>
                    <View style={styles.transferCardLeft}>
                      <View
                        style={[
                          styles.transferStatusBadge,
                          { backgroundColor: `${getTransferStatusColor(transfer.status)}20` },
                        ]}
                      >
                        {transfer.status === 'completed' ? (
                          <Check size={14} color={getTransferStatusColor(transfer.status)} />
                        ) : transfer.status === 'rejected' ? (
                          <X size={14} color={getTransferStatusColor(transfer.status)} />
                        ) : transfer.status === 'pending' ? (
                          <Clock size={14} color={getTransferStatusColor(transfer.status)} />
                        ) : (
                          <AlertCircle size={14} color={getTransferStatusColor(transfer.status)} />
                        )}
                        <Text
                          style={[
                            styles.transferStatusText,
                            { color: getTransferStatusColor(transfer.status) },
                          ]}
                        >
                          {getTransferStatusLabel(transfer.status)}
                        </Text>
                      </View>
                      <Text style={[styles.transferRef, { color: colors.textTertiary }]}>
                        {transfer.referenceNumber}
                      </Text>
                    </View>
                    <Text style={[styles.transferCardValue, { color: colors.text }]}>
                      ${transfer.totalValue.toFixed(2)}
                    </Text>
                  </View>

                  <Text style={[styles.transferCardItem, { color: colors.text }]}>
                    {group?.name || 'Unknown Item'}
                  </Text>

                  <View style={styles.transferCardFlow}>
                    <View style={styles.transferDept}>
                      <View
                        style={[
                          styles.deptDotLarge,
                          { backgroundColor: getDepartmentColor(transfer.fromDepartment) },
                        ]}
                      />
                      <View>
                        <Text style={[styles.transferDeptName, { color: colors.text }]}>
                          {INVENTORY_DEPARTMENTS[transfer.fromDepartment]?.name}
                        </Text>
                        <Text style={[styles.transferMatNum, { color: colors.textSecondary }]}>
                          {transfer.fromMaterialNumber}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.transferArrow}>
                      <ArrowRightLeft size={16} color={colors.textTertiary} />
                      <Text style={[styles.transferQty, { color: colors.text }]}>
                        {transfer.quantity} units
                      </Text>
                    </View>
                    <View style={styles.transferDept}>
                      <View
                        style={[
                          styles.deptDotLarge,
                          { backgroundColor: getDepartmentColor(transfer.toDepartment) },
                        ]}
                      />
                      <View>
                        <Text style={[styles.transferDeptName, { color: colors.text }]}>
                          {INVENTORY_DEPARTMENTS[transfer.toDepartment]?.name}
                        </Text>
                        <Text style={[styles.transferMatNum, { color: colors.textSecondary }]}>
                          {transfer.toMaterialNumber}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {transfer.notes && (
                    <Text style={[styles.transferNotes, { color: colors.textSecondary }]}>
                      {transfer.notes}
                    </Text>
                  )}

                  <View style={styles.transferCardFooter}>
                    <Text style={[styles.transferMeta, { color: colors.textTertiary }]}>
                      Requested by {transfer.requestedBy}
                    </Text>
                    <Text style={[styles.transferMeta, { color: colors.textTertiary }]}>
                      {new Date(transfer.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TransferModal
        visible={transferModalVisible}
        group={selectedGroup}
        onClose={() => setTransferModalVisible(false)}
        onSubmit={handleSubmitTransfer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
    marginBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  tabBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  groupIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  groupOem: {
    fontSize: 12,
    marginTop: 2,
  },
  groupStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  groupStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupStatText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  groupExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkedMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  deptIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  linkedMaterialInfo: {
    flex: 1,
  },
  linkedMaterialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedMaterialDept: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  primaryText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  linkedMaterialNumber: {
    fontSize: 11,
    marginTop: 2,
  },
  linkedMaterialStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  linkedMaterialStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkedMaterialStatValue: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    gap: 10,
  },
  transferStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  transferInfo: {
    flex: 1,
  },
  transferText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  transferMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  transferValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  transferButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  transferCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  transferCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  transferCardLeft: {
    gap: 4,
  },
  transferStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  transferStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  transferRef: {
    fontSize: 10,
    marginLeft: 2,
  },
  transferCardValue: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  transferCardItem: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  transferCardFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transferDept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  deptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deptDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  transferDeptName: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  transferMatNum: {
    fontSize: 10,
  },
  transferArrow: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  transferQty: {
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  transferNotes: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  transferCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalBody: {
    paddingHorizontal: 20,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 12,
  },
  materialSelectGrid: {
    gap: 8,
  },
  materialSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  materialSelectInfo: {
    flex: 1,
  },
  materialSelectDept: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  materialSelectNum: {
    fontSize: 11,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top' as const,
  },
  availableText: {
    fontSize: 11,
    marginTop: 6,
    marginLeft: 2,
  },
  transferSummary: {
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
