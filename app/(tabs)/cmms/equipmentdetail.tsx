import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  Cog,
  MapPin,
  Tag,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  Save,
  X,
  Wrench,
  FileText,
  ChevronRight,
  Shield,
  Building,
  Building2,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  useEquipmentById, 
  useUpdateEquipment, 
  useDeleteEquipment,
  useUpdateEquipmentStatus,
  ExtendedEquipment,
  EquipmentStatus,
} from '@/hooks/useSupabaseEquipment';
import { usePMSchedulesQuery, ExtendedPMSchedule } from '@/hooks/useSupabasePMSchedules';
import * as Haptics from 'expo-haptics';

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  operational: { label: 'Operational', color: '#10B981', icon: CheckCircle },
  needs_maintenance: { label: 'Needs Maintenance', color: '#F59E0B', icon: Clock },
  down: { label: 'Down', color: '#EF4444', icon: XCircle },
  retired: { label: 'Retired', color: '#6B7280', icon: AlertTriangle },
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
};

export default function EquipmentDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: equipmentItem } = useEquipmentById(id);
  const updateEquipmentMutation = useUpdateEquipment();
  const deleteEquipmentMutation = useDeleteEquipment();
  const updateStatusMutation = useUpdateEquipmentStatus();
  const { data: allPMSchedules = [] } = usePMSchedulesQuery();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ExtendedEquipment>>({});
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const equipmentPMSchedules = useMemo(() => {
    if (!id) return [];
    return allPMSchedules.filter((pm: ExtendedPMSchedule) => pm.equipment_id === id && pm.active);
  }, [id, allPMSchedules]);

  

  const startEditing = useCallback(() => {
    if (!equipmentItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditData({
      name: equipmentItem.name,
      location: equipmentItem.location || undefined,
      serial_number: equipmentItem.serial_number || undefined,
      manufacturer: equipmentItem.manufacturer || undefined,
      model: equipmentItem.model || undefined,
    });
    setIsEditing(true);
  }, [equipmentItem]);

  const cancelEditing = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    setEditData({});
  }, []);

  const saveChanges = useCallback(async () => {
    if (!id || !editData.name?.trim()) {
      Alert.alert('Error', 'Equipment name is required');
      return;
    }
    try {
      await updateEquipmentMutation.mutateAsync({ id, updates: editData });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      setEditData({});
    } catch (error) {
      console.error('[EquipmentDetail] Save error:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  }, [id, editData, updateEquipmentMutation]);

  const handleStatusChange = useCallback(async (newStatus: EquipmentStatus) => {
    if (!id) return;
    try {
      await updateStatusMutation.mutateAsync({ equipmentId: id, status: newStatus });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowStatusModal(false);
    } catch (error) {
      console.error('[EquipmentDetail] Status change error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  }, [id, updateStatusMutation]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    try {
      await deleteEquipmentMutation.mutateAsync(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.back();
    } catch (error) {
      console.error('[EquipmentDetail] Delete error:', error);
      Alert.alert('Error', 'Failed to delete equipment');
    }
  }, [id, deleteEquipmentMutation, router]);

  if (!equipmentItem) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Equipment Not Found' }} />
        <View style={styles.notFound}>
          <AlertTriangle size={48} color={colors.textSecondary} />
          <Text style={[styles.notFoundText, { color: colors.text }]}>Equipment not found</Text>
          <Pressable style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[equipmentItem.status as EquipmentStatus] || STATUS_CONFIG.operational;
  const StatusIcon = statusConfig.icon;
  const criticalityColor = CRITICALITY_COLORS[equipmentItem.criticality || 'medium'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: equipmentItem.equipment_tag || 'Equipment',
          headerRight: () => (
            <View style={styles.headerActions}>
              {isEditing ? (
                <>
                  <Pressable onPress={cancelEditing} style={styles.headerButton}>
                    <X size={22} color={colors.text} />
                  </Pressable>
                  <Pressable onPress={saveChanges} style={styles.headerButton}>
                    <Save size={22} color={colors.primary} />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={startEditing} style={styles.headerButton}>
                    <Edit3 size={22} color={colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => setShowDeleteConfirm(true)} style={styles.headerButton}>
                    <Trash2 size={22} color="#EF4444" />
                  </Pressable>
                </>
              )}
            </View>
          ),
        }} 
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.equipmentIcon, { backgroundColor: statusConfig.color + '20' }]}>
            <Cog size={40} color={statusConfig.color} />
          </View>
          
          {isEditing ? (
            <TextInput
              style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
              value={editData.name}
              onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
              placeholder="Equipment Name"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={[styles.equipmentName, { color: colors.text }]}>{equipmentItem.name}</Text>
          )}
          
          <View style={styles.tagContainer}>
            <Tag size={14} color={colors.textSecondary} />
            <Text style={[styles.assetTag, { color: colors.textSecondary }]}>{equipmentItem.equipment_tag}</Text>
          </View>

          <View style={styles.badgeRow}>
            <Pressable 
              style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}
              onPress={() => !isEditing && setShowStatusModal(true)}
              disabled={isEditing}
            >
              <StatusIcon size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              {!isEditing && <ChevronRight size={14} color={statusConfig.color} />}
            </Pressable>
            
            <View style={[styles.criticalityBadge, { backgroundColor: criticalityColor + '15' }]}>
              <Shield size={14} color={criticalityColor} />
              <Text style={[styles.criticalityText, { color: criticalityColor }]}>
                {(equipmentItem.criticality || 'medium').charAt(0).toUpperCase() + (equipmentItem.criticality || 'medium').slice(1)} Criticality
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location & Assignment</Text>
          
          {equipmentItem.facility_data && (
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Building2 size={16} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Facility</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {equipmentItem.facility_data.name} ({equipmentItem.facility_data.facility_code})
                </Text>
              </View>
            </View>
          )}

          {equipmentItem.location_data && (
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Layers size={16} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Area/Location</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {equipmentItem.location_data.name} ({equipmentItem.location_data.location_code})
                </Text>
                <Text style={[styles.detailSubValue, { color: colors.textSecondary }]}>
                  {equipmentItem.location_data.location_type.charAt(0).toUpperCase() + equipmentItem.location_data.location_type.slice(1)}
                  {equipmentItem.location_data.building && ` • ${equipmentItem.location_data.building}`}
                  {equipmentItem.location_data.floor_number && ` • Floor ${equipmentItem.location_data.floor_number}`}
                </Text>
              </View>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <MapPin size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.detailInput, { color: colors.text, borderColor: colors.border }]}
                  value={editData.location ?? undefined}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, location: text }))}
                  placeholder="Location description"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={[styles.detailValue, { color: colors.text }]}>{equipmentItem.location || 'Not specified'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment Details</Text>
          
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Cog size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Category</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{equipmentItem.category}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <FileText size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Serial Number</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.detailInput, { color: colors.text, borderColor: colors.border }]}
                  value={editData.serial_number ?? ''}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, serial_number: text }))}
                  placeholder="Serial Number"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={[styles.detailValue, { color: colors.text }]}>{equipmentItem.serial_number || 'N/A'}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Building size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Manufacturer</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.detailInput, { color: colors.text, borderColor: colors.border }]}
                  value={editData.manufacturer ?? ''}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, manufacturer: text }))}
                  placeholder="Manufacturer"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={[styles.detailValue, { color: colors.text }]}>{equipmentItem.manufacturer || 'N/A'}</Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Tag size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Model</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.detailInput, { color: colors.text, borderColor: colors.border }]}
                  value={editData.model ?? ''}
                  onChangeText={(text) => setEditData(prev => ({ ...prev, model: text }))}
                  placeholder="Model"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={[styles.detailValue, { color: colors.text }]}>{equipmentItem.model || 'N/A'}</Text>
              )}
            </View>
          </View>

        </View>

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dates & Warranty</Text>
          
          {equipmentItem.install_date && (
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Calendar size={16} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Install Date</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(equipmentItem.install_date).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {equipmentItem.warranty_expiry && (
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Shield size={16} color={new Date(equipmentItem.warranty_expiry) > new Date() ? '#10B981' : '#EF4444'} />
              </View>
              <View style={styles.detailContent}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Warranty Expiry</Text>
                <Text style={[styles.detailValue, { color: new Date(equipmentItem.warranty_expiry) > new Date() ? '#10B981' : '#EF4444' }]}>
                  {new Date(equipmentItem.warranty_expiry).toLocaleDateString()}
                  {new Date(equipmentItem.warranty_expiry) > new Date() ? ' (Active)' : ' (Expired)'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Wrench size={16} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last PM</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {equipmentItem.last_pm_date ? new Date(equipmentItem.last_pm_date).toLocaleDateString() : 'Never'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Clock size={16} color={equipmentItem.next_pm_date && new Date(equipmentItem.next_pm_date) < new Date() ? '#EF4444' : colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next PM Due</Text>
              <Text style={[styles.detailValue, { color: equipmentItem.next_pm_date && new Date(equipmentItem.next_pm_date) < new Date() ? '#EF4444' : colors.text }]}>
                {equipmentItem.next_pm_date ? new Date(equipmentItem.next_pm_date).toLocaleDateString() : 'Not scheduled'}
              </Text>
            </View>
          </View>
        </View>

        

        {equipmentPMSchedules.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>PM Schedules ({equipmentPMSchedules.length})</Text>
            {equipmentPMSchedules.map((pm: ExtendedPMSchedule) => (
              <View key={pm.id} style={[styles.pmItem, { borderColor: colors.border }]}>
                <View style={styles.pmHeader}>
                  <Text style={[styles.pmName, { color: colors.text }]}>{pm.name}</Text>
                  <Text style={[styles.pmFrequency, { color: colors.primary }]}>
                    {pm.frequency.charAt(0).toUpperCase() + pm.frequency.slice(1)}
                  </Text>
                </View>
                <Text style={[styles.pmNextDue, { color: colors.textSecondary }]}>
                  Next Due: {new Date(pm.next_due).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowStatusModal(false)}>
          <View style={[styles.statusModalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.statusModalTitle, { color: colors.text }]}>Change Status</Text>
            {(Object.keys(STATUS_CONFIG) as EquipmentStatus[]).map(status => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              return (
                <Pressable
                  key={status}
                  style={[
                    styles.statusOption,
                    equipmentItem.status === status && { backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <Icon size={20} color={config.color} />
                  <Text style={[styles.statusOptionText, { color: colors.text }]}>{config.label}</Text>
                  {equipmentItem.status === status && (
                    <CheckCircle size={18} color={config.color} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.surface }]}>
            <AlertTriangle size={48} color="#EF4444" />
            <Text style={[styles.deleteTitle, { color: colors.text }]}>Delete Equipment?</Text>
            <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
              This will permanently delete this equipment. This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <Pressable 
                style={[styles.deleteButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={[styles.deleteButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
                onPress={handleDelete}
              >
                <Text style={[styles.deleteButtonText, { color: '#FFFFFF' }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  content: {
    padding: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  equipmentIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  equipmentName: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 6,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  assetTag: {
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  criticalityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  criticalityText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  detailSubValue: {
    fontSize: 12,
    marginTop: 2,
  },
  detailInput: {
    fontSize: 14,
    fontWeight: '500' as const,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  specKey: {
    fontSize: 13,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pmItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pmName: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  pmFrequency: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pmNextDue: {
    fontSize: 12,
  },
  historyItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
    marginRight: 8,
  },
  historyStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  historyDate: {
    fontSize: 12,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: '500' as const,
    flex: 1,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
