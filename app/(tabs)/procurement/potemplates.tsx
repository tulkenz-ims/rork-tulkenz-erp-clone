import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, RefreshControl, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { usePOTemplatesQuery, useCreatePOTemplate, useUpdatePOTemplate, useDeletePOTemplate, POTemplate } from '@/hooks/useSupabaseProcurementExtended';
import { FileText, Plus, Search, Filter, Edit2, Trash2, Copy, ChevronRight, X, Package, Wrench, Building } from 'lucide-react-native';

const PO_TYPE_CONFIG = {
  material: { label: 'Material', color: '#3B82F6', icon: Package },
  service: { label: 'Service', color: '#8B5CF6', icon: Wrench },
  capex: { label: 'CapEx', color: '#059669', icon: Building },
};

export default function POTemplatesScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<POTemplate | null>(null);

  const { data: templates = [], isLoading, refetch } = usePOTemplatesQuery({ activeOnly: false });
  const createTemplate = useCreatePOTemplate({
    onSuccess: () => {
      setShowCreateModal(false);
      Alert.alert('Success', 'Template created successfully');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const updateTemplate = useUpdatePOTemplate({
    onSuccess: () => {
      setEditingTemplate(null);
      Alert.alert('Success', 'Template updated successfully');
    },
    onError: (error) => Alert.alert('Error', error.message),
  });
  const deleteTemplate = useDeletePOTemplate({
    onSuccess: () => Alert.alert('Success', 'Template deleted successfully'),
    onError: (error) => Alert.alert('Error', error.message),
  });

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.template_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || template.po_type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = useCallback((template: POTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate.mutate(template.id) },
      ]
    );
  }, [deleteTemplate]);

  const handleToggleActive = useCallback((template: POTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      updates: { is_active: !template.is_active },
    });
  }, [updateTemplate]);

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
    title: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: colors.text,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#8B5CF6',
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
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
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    templateCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    templateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    templateIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text,
    },
    templateCode: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    templateMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    templateActions: {
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
    usageText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
      maxWidth: 280,
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
      minHeight: 80,
      textAlignVertical: 'top',
    },
    typeSelector: {
      flexDirection: 'row',
      gap: 12,
    },
    typeOption: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    typeOptionSelected: {
      borderColor: '#8B5CF6',
      backgroundColor: '#8B5CF610',
    },
    typeOptionText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.textSecondary,
      marginTop: 8,
    },
    typeOptionTextSelected: {
      color: '#8B5CF6',
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
      backgroundColor: '#8B5CF6',
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#FFFFFF',
    },
  });

  const TemplateFormModal = ({ visible, onClose, template }: { visible: boolean; onClose: () => void; template?: POTemplate | null }) => {
    const [name, setName] = useState(template?.name || '');
    const [code, setCode] = useState(template?.template_code || '');
    const [description, setDescription] = useState(template?.description || '');
    const [poType, setPoType] = useState<'material' | 'service' | 'capex'>(template?.po_type || 'material');
    const [defaultNotes, setDefaultNotes] = useState(template?.default_notes || '');

    const handleSubmit = () => {
      if (!name.trim() || !code.trim()) {
        Alert.alert('Error', 'Please fill in required fields');
        return;
      }

      if (template) {
        updateTemplate.mutate({
          id: template.id,
          updates: { name, template_code: code, description, po_type: poType, default_notes: defaultNotes },
        });
      } else {
        createTemplate.mutate({
          name,
          template_code: code,
          description,
          po_type: poType,
          default_notes: defaultNotes,
          default_vendor_id: null,
          default_vendor_name: null,
          default_department_id: null,
          default_department_name: null,
          default_terms: null,
          default_shipping_method: null,
          default_payment_terms: 'net_30',
          line_items: [],
          is_active: true,
          created_by: 'System',
          created_by_id: null,
        });
      }
    };

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{template ? 'Edit Template' : 'New PO Template'}</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Template Code *</Text>
                <TextInput
                  style={styles.formInput}
                  value={code}
                  onChangeText={setCode}
                  placeholder="e.g., TPL-001"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Template Name *</Text>
                <TextInput
                  style={styles.formInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter template name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>PO Type</Text>
                <View style={styles.typeSelector}>
                  {(['material', 'service', 'capex'] as const).map((type) => {
                    const config = PO_TYPE_CONFIG[type];
                    const IconComponent = config.icon;
                    const isSelected = poType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                        onPress={() => setPoType(type)}
                      >
                        <IconComponent size={24} color={isSelected ? config.color : colors.textSecondary} />
                        <Text style={[styles.typeOptionText, isSelected && styles.typeOptionTextSelected]}>
                          {config.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Default Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={defaultNotes}
                  onChangeText={setDefaultNotes}
                  placeholder="Notes to include on POs"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                <Text style={styles.submitButtonText}>
                  {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
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
          <Text style={styles.title}>PO Templates</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Template</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search templates..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !filterType && styles.filterChipActive]}
            onPress={() => setFilterType(null)}
          >
            <Filter size={14} color={!filterType ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.filterChipText, !filterType && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {(['material', 'service', 'capex'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, filterType === type && styles.filterChipActive]}
              onPress={() => setFilterType(filterType === type ? null : type)}
            >
              <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                {PO_TYPE_CONFIG[type].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{templates.length}</Text>
            <Text style={styles.statLabel}>Total Templates</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{templates.filter((t) => t.is_active).length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{templates.reduce((sum, t) => sum + t.usage_count, 0)}</Text>
            <Text style={styles.statLabel}>Total Uses</Text>
          </View>
        </View>

        {filteredTemplates.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={36} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Templates Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterType
                ? 'Try adjusting your search or filters'
                : 'Create your first PO template to streamline purchasing'}
            </Text>
          </View>
        ) : (
          filteredTemplates.map((template) => {
            const typeConfig = PO_TYPE_CONFIG[template.po_type];
            const TypeIcon = typeConfig.icon;
            return (
              <View key={template.id} style={styles.templateCard}>
                <View style={styles.templateHeader}>
                  <View style={[styles.templateIconContainer, { backgroundColor: `${typeConfig.color}15` }]}>
                    <TypeIcon size={24} color={typeConfig.color} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateCode}>{template.template_code}</Text>
                    <View style={styles.templateMeta}>
                      <View style={[styles.typeBadge, { backgroundColor: typeConfig.color }]}>
                        <Text style={styles.typeBadgeText}>{typeConfig.label}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: template.is_active ? '#10B98115' : '#6B728015' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: template.is_active ? '#10B981' : '#6B7280' },
                          ]}
                        >
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                      <Text style={styles.usageText}>Used {template.usage_count}x</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonBorder]}
                    onPress={() => setEditingTemplate(template)}
                  >
                    <Edit2 size={16} color="#3B82F6" />
                    <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonBorder]}
                    onPress={() => handleToggleActive(template)}
                  >
                    <Copy size={16} color="#8B5CF6" />
                    <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(template)}>
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TemplateFormModal
        visible={showCreateModal || !!editingTemplate}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        template={editingTemplate}
      />
    </View>
  );
}
