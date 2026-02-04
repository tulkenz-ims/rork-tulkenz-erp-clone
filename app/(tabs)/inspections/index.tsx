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
  RefreshControl,
} from 'react-native';
import { 
  ClipboardCheck, 
  Search, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Scissors,
  Truck,
  Flame,
  HardHat,
  Shield,
  Award,
  FileCheck,
  PlusCircle,
  X,
  User,
  MapPin,
  History,
  Package,
  Calendar,
  Clock,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  Wrench,
  Eye,
  Lock,
  Zap,
  Gauge,
  Thermometer,

} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useERP } from '@/contexts/ERPContext';
import {
  type InspectionTemplate,
  type InspectionField,
  type TrackedItem,
  type InspectionSchedule,
  INSPECTION_CATEGORIES,
  FREQUENCY_OPTIONS,
  DAYS_OF_WEEK,
  type InspectionFrequency,
  type DayOfWeek,
} from '@/constants/inspectionConstants';

type ViewMode = 'alerts' | 'templates' | 'compliance' | 'history' | 'manage';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Scissors,
  Truck,
  Flame,
  HardHat,
  ClipboardCheck,
  Shield,
  Award,
  FileCheck,
  Settings,
  PlusCircle,
  Package,
  Wrench,
  Eye,
  Lock,
  Zap,
  Gauge,
  Thermometer,
};

export default function InspectionsScreen() {
  const { colors } = useTheme();
  const {
    inspectionTemplates,
    trackedItems,
    inspectionRecords,
    inspectionSchedules,
    addInspectionRecord,

    addTrackedItem,
    updateTrackedItem,
    deleteTrackedItem,
    addInspectionSchedule,
    updateInspectionSchedule,
    deleteInspectionSchedule,
    completeInspectionSchedule,
    getInspectionCompliance,
    getTrackedItemsForTemplate,
    getUpcomingInspections,
    getOverdueInspections,
    getDueToday,
    getInspectionAlerts,
  } = useERP();

  const [viewMode, setViewMode] = useState<ViewMode>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate | null>(null);
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | number | boolean>>({});
  

  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<InspectionSchedule | null>(null);
  
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);
  const [selectedTemplateForItem, setSelectedTemplateForItem] = useState<string>('');
  
  const [manageTab, setManageTab] = useState<'templates' | 'schedules' | 'items'>('schedules');

  const activeTemplates = useMemo(() => 
    inspectionTemplates.filter(t => t.active),
  [inspectionTemplates]);

  const filteredTemplates = useMemo(() => {
    let filtered = activeTemplates;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query)
      );
    }
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    return filtered;
  }, [activeTemplates, searchQuery, selectedCategory]);

  const alerts = useMemo(() => getInspectionAlerts(), [getInspectionAlerts]);
  const overdueInspections = useMemo(() => getOverdueInspections(), [getOverdueInspections]);
  const dueTodayInspections = useMemo(() => getDueToday(), [getDueToday]);
  const upcomingInspections = useMemo(() => getUpcomingInspections(7), [getUpcomingInspections]);

  const complianceData = useMemo(() => {
    return activeTemplates.map(template => {
      const compliance = getInspectionCompliance(template.id);
      return { template, compliance };
    }).filter(d => d.compliance !== null);
  }, [activeTemplates, getInspectionCompliance]);

  const recentInspections = useMemo(() => {
    return [...inspectionRecords]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 50);
  }, [inspectionRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleStartInspection = useCallback((template: InspectionTemplate) => {
    setSelectedTemplate(template);
    setFormValues({});
    setSelectedItem(null);
    setShowInspectionModal(true);
  }, []);

  const handleSelectTrackedItem = useCallback((item: TrackedItem) => {
    setSelectedItem(item);
    setFormValues(prev => ({
      ...prev,
      location: item.location,
      operator: item.assigned_to,
    }));
  }, []);

  const handleSubmitInspection = useCallback(() => {
    if (!selectedTemplate) return;

    const requiredFields = selectedTemplate.fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !formValues[f.name]);

    if (missingFields.length > 0) {
      Alert.alert('Missing Fields', `Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    const result = formValues.result as string || formValues.overall_result as string || 'pass';
    const inspectionResult = result === 'pass' ? 'pass' : result === 'fail' ? 'fail' : 'needs_attention';

    addInspectionRecord({
      template_id: selectedTemplate.id,
      template_name: selectedTemplate.name,
      tracked_item_id: selectedItem?.id,
      tracked_item_number: selectedItem?.item_number,
      inspector_id: 'current-user',
      inspector_name: 'Current Inspector',
      inspection_date: new Date().toISOString().split('T')[0],
      result: inspectionResult as 'pass' | 'fail' | 'needs_attention' | 'n/a',
      field_values: formValues,
      notes: formValues.notes as string,
      corrective_action: formValues.corrective_action as string,
      follow_up_required: inspectionResult === 'fail',
      follow_up_date: inspectionResult === 'fail' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
        : undefined,
      location: formValues.location as string || selectedItem?.location,
    });

    const schedule = inspectionSchedules.find(s => s.template_id === selectedTemplate.id);
    if (schedule) {
      completeInspectionSchedule(schedule.id);
    }

    Alert.alert('Success', 'Inspection recorded successfully!');
    setShowInspectionModal(false);
    setSelectedTemplate(null);
    setSelectedItem(null);
    setFormValues({});
  }, [selectedTemplate, selectedItem, formValues, addInspectionRecord, inspectionSchedules, completeInspectionSchedule]);

  const handleSaveSchedule = useCallback(() => {
    const name = formValues.scheduleName as string;
    const templateId = formValues.scheduleTemplateId as string;
    const frequency = formValues.scheduleFrequency as InspectionFrequency;
    const dayOfWeek = formValues.scheduleDayOfWeek as DayOfWeek;
    const dayOfMonth = formValues.scheduleDayOfMonth as number;
    const notifyBefore = formValues.scheduleNotifyBefore as number || 1;
    
    if (!name || !templateId || !frequency) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const template = inspectionTemplates.find(t => t.id === templateId);
    if (!template) return;

    const nextDue = new Date();
    const freqOption = FREQUENCY_OPTIONS.find(f => f.key === frequency);
    if (freqOption && freqOption.days > 0) {
      nextDue.setDate(nextDue.getDate() + freqOption.days);
    }

    const scheduleData = {
      template_id: templateId,
      template_name: template.name,
      name,
      description: formValues.scheduleDescription as string || '',
      frequency,
      day_of_week: frequency === 'weekly' ? dayOfWeek : undefined,
      day_of_month: (frequency === 'monthly' || frequency === 'quarterly') ? dayOfMonth : undefined,
      next_due: nextDue.toISOString().split('T')[0],
      notify_before_days: notifyBefore,
      active: true,
    };

    if (editingSchedule) {
      updateInspectionSchedule(editingSchedule.id, scheduleData);
      Alert.alert('Success', 'Schedule updated!');
    } else {
      addInspectionSchedule(scheduleData);
      Alert.alert('Success', 'Schedule created!');
    }

    setShowScheduleModal(false);
    setEditingSchedule(null);
    setFormValues({});
  }, [formValues, editingSchedule, inspectionTemplates, addInspectionSchedule, updateInspectionSchedule]);

  const handleSaveItem = useCallback(() => {
    const name = formValues.itemName as string;
    const itemNumber = formValues.itemNumber as string;
    const location = formValues.itemLocation as string;
    const assignedTo = formValues.itemAssignedTo as string;
    const itemType = formValues.itemType as string;
    const templateId = selectedTemplateForItem;

    if (!name || !itemNumber || !templateId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const itemData = {
      template_id: templateId,
      item_number: itemNumber,
      name,
      location: location || '',
      assigned_to: assignedTo || '',
      item_type: itemType || '',
      status: 'active' as const,
      date_assigned: new Date().toISOString().split('T')[0],
    };

    if (editingItem) {
      updateTrackedItem(editingItem.id, itemData);
      Alert.alert('Success', 'Item updated!');
    } else {
      addTrackedItem(itemData);
      Alert.alert('Success', 'Item added!');
    }

    setShowItemModal(false);
    setEditingItem(null);
    setSelectedTemplateForItem('');
    setFormValues({});
  }, [formValues, editingItem, selectedTemplateForItem, addTrackedItem, updateTrackedItem]);

  const handleEditSchedule = useCallback((schedule: InspectionSchedule) => {
    setEditingSchedule(schedule);
    setFormValues({
      scheduleName: schedule.name,
      scheduleDescription: schedule.description,
      scheduleTemplateId: schedule.template_id,
      scheduleFrequency: schedule.frequency,
      scheduleDayOfWeek: schedule.day_of_week || '',
      scheduleDayOfMonth: schedule.day_of_month || 1,
      scheduleNotifyBefore: schedule.notify_before_days,
    });
    setShowScheduleModal(true);
  }, []);

  const handleDeleteSchedule = useCallback((id: string) => {
    Alert.alert('Delete Schedule', 'Are you sure you want to delete this schedule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteInspectionSchedule(id) },
    ]);
  }, [deleteInspectionSchedule]);

  const handleEditItem = useCallback((item: TrackedItem) => {
    setEditingItem(item);
    setSelectedTemplateForItem(item.template_id);
    setFormValues({
      itemName: item.name,
      itemNumber: item.item_number,
      itemLocation: item.location,
      itemAssignedTo: item.assigned_to,
      itemType: item.item_type,
    });
    setShowItemModal(true);
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTrackedItem(id) },
    ]);
  }, [deleteTrackedItem]);

  const renderFieldInput = (field: InspectionField) => {
    if (field.conditionalOn) {
      const conditionValue = formValues[field.conditionalOn.fieldId];
      if (conditionValue !== field.conditionalOn.value) {
        return null;
      }
    }

    const value = formValues[field.name];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textTertiary}
              value={String(value || '')}
              onChangeText={(text) => setFormValues(prev => ({ ...prev, [field.name]: field.type === 'number' ? Number(text) : text }))}
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
            />
          </View>
        );

      case 'textarea':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={field.placeholder}
              placeholderTextColor={colors.textTertiary}
              value={String(value || '')}
              onChangeText={(text) => setFormValues(prev => ({ ...prev, [field.name]: text }))}
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    { 
                      backgroundColor: value === option ? colors.primary : colors.surface,
                      borderColor: value === option ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setFormValues(prev => ({ ...prev, [field.name]: option }))}
                >
                  <Text style={[styles.optionText, { color: value === option ? '#FFF' : colors.text }]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'pass_fail':
        return (
          <View key={field.id} style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {field.label} {field.required && <Text style={{ color: colors.error }}>*</Text>}
            </Text>
            <View style={styles.passFailContainer}>
              <TouchableOpacity
                style={[
                  styles.passFailButton,
                  { 
                    backgroundColor: value === 'pass' ? '#27AE60' : colors.surface,
                    borderColor: value === 'pass' ? '#27AE60' : colors.border,
                  }
                ]}
                onPress={() => setFormValues(prev => ({ ...prev, [field.name]: 'pass' }))}
              >
                <CheckCircle size={24} color={value === 'pass' ? '#FFF' : '#27AE60'} />
                <Text style={[styles.passFailText, { color: value === 'pass' ? '#FFF' : colors.text }]}>Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.passFailButton,
                  { 
                    backgroundColor: value === 'fail' ? '#E74C3C' : colors.surface,
                    borderColor: value === 'fail' ? '#E74C3C' : colors.border,
                  }
                ]}
                onPress={() => setFormValues(prev => ({ ...prev, [field.name]: 'fail' }))}
              >
                <XCircle size={24} color={value === 'fail' ? '#FFF' : '#E74C3C'} />
                <Text style={[styles.passFailText, { color: value === 'fail' ? '#FFF' : colors.text }]}>Fail</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'checkbox':
        return (
          <TouchableOpacity
            key={field.id}
            style={styles.checkboxContainer}
            onPress={() => setFormValues(prev => ({ ...prev, [field.name]: !value }))}
          >
            <View style={[
              styles.checkbox,
              { 
                backgroundColor: value ? colors.primary : colors.surface,
                borderColor: value ? colors.primary : colors.border,
              }
            ]}>
              {value && <CheckCircle size={16} color="#FFF" />}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>{field.label}</Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || ClipboardCheck;
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search inspections..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.tabBar}>
        {(['alerts', 'templates', 'compliance', 'history', 'manage'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.tab, viewMode === mode && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setViewMode(mode)}
          >
            {mode === 'alerts' && alerts.total > 0 && (
              <View style={[styles.alertBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.alertBadgeText}>{alerts.total}</Text>
              </View>
            )}
            <Text style={[styles.tabText, { color: viewMode === mode ? colors.primary : colors.textSecondary }]}>
              {mode === 'templates' ? 'Forms' : mode === 'manage' ? 'Setup' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {viewMode === 'alerts' && (
          <View style={styles.alertsContainer}>
            {alerts.total === 0 ? (
              <View style={styles.emptyState}>
                <CheckCircle size={48} color="#27AE60" />
                <Text style={[styles.emptyText, { color: colors.text }]}>All caught up!</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>No inspections due or overdue</Text>
              </View>
            ) : (
              <>
                {overdueInspections.length > 0 && (
                  <View style={styles.alertSection}>
                    <View style={styles.alertSectionHeader}>
                      <AlertCircle size={20} color="#E74C3C" />
                      <Text style={[styles.alertSectionTitle, { color: '#E74C3C' }]}>
                        Overdue ({overdueInspections.length})
                      </Text>
                    </View>
                    {overdueInspections.map((schedule) => {
                      const template = inspectionTemplates.find(t => t.id === schedule.template_id);
                      const IconComponent = template ? getIconComponent(template.icon) : ClipboardCheck;
                      return (
                        <TouchableOpacity
                          key={schedule.id}
                          style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: '#E74C3C' }]}
                          onPress={() => {
                            if (template) handleStartInspection(template);
                          }}
                        >
                          <View style={[styles.alertIcon, { backgroundColor: '#E74C3C20' }]}>
                            <IconComponent size={24} color="#E74C3C" />
                          </View>
                          <View style={styles.alertInfo}>
                            <Text style={[styles.alertName, { color: colors.text }]}>{schedule.name}</Text>
                            <Text style={[styles.alertMeta, { color: colors.textSecondary }]}>
                              Due: {schedule.next_due} • {schedule.daysOverdue} days overdue
                            </Text>
                            <Text style={[styles.alertItems, { color: colors.textTertiary }]}>
                              {schedule.trackedItemsCount} items to inspect
                            </Text>
                          </View>
                          <ChevronRight size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {dueTodayInspections.length > 0 && (
                  <View style={styles.alertSection}>
                    <View style={styles.alertSectionHeader}>
                      <Clock size={20} color="#F39C12" />
                      <Text style={[styles.alertSectionTitle, { color: '#F39C12' }]}>
                        Due Today ({dueTodayInspections.length})
                      </Text>
                    </View>
                    {dueTodayInspections.map((schedule) => {
                      const template = inspectionTemplates.find(t => t.id === schedule.template_id);
                      const IconComponent = template ? getIconComponent(template.icon) : ClipboardCheck;
                      return (
                        <TouchableOpacity
                          key={schedule.id}
                          style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: '#F39C12' }]}
                          onPress={() => {
                            if (template) handleStartInspection(template);
                          }}
                        >
                          <View style={[styles.alertIcon, { backgroundColor: '#F39C1220' }]}>
                            <IconComponent size={24} color="#F39C12" />
                          </View>
                          <View style={styles.alertInfo}>
                            <Text style={[styles.alertName, { color: colors.text }]}>{schedule.name}</Text>
                            <Text style={[styles.alertMeta, { color: colors.textSecondary }]}>
                              {schedule.completedCount}/{schedule.trackedItemsCount} completed today
                            </Text>
                          </View>
                          <ChevronRight size={20} color={colors.textTertiary} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {upcomingInspections.filter(s => s.alertType === 'upcoming').length > 0 && (
                  <View style={styles.alertSection}>
                    <View style={styles.alertSectionHeader}>
                      <Calendar size={20} color="#3498DB" />
                      <Text style={[styles.alertSectionTitle, { color: '#3498DB' }]}>
                        Upcoming (Next 7 Days)
                      </Text>
                    </View>
                    {upcomingInspections.filter(s => s.alertType === 'upcoming').map((schedule) => {
                      const template = inspectionTemplates.find(t => t.id === schedule.template_id);
                      const IconComponent = template ? getIconComponent(template.icon) : ClipboardCheck;
                      return (
                        <View
                          key={schedule.id}
                          style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: '#3498DB' }]}
                        >
                          <View style={[styles.alertIcon, { backgroundColor: '#3498DB20' }]}>
                            <IconComponent size={24} color="#3498DB" />
                          </View>
                          <View style={styles.alertInfo}>
                            <Text style={[styles.alertName, { color: colors.text }]}>{schedule.name}</Text>
                            <Text style={[styles.alertMeta, { color: colors.textSecondary }]}>
                              Due: {schedule.next_due} • In {schedule.daysUntilDue} days
                            </Text>
                            <Text style={[styles.alertItems, { color: colors.textTertiary }]}>
                              {schedule.trackedItemsCount} items
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {viewMode === 'templates' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              <TouchableOpacity
                style={[styles.categoryChip, !selectedCategory && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={[styles.categoryText, { color: !selectedCategory ? '#FFF' : colors.text }]}>All</Text>
              </TouchableOpacity>
              {INSPECTION_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.key && { backgroundColor: cat.color }
                  ]}
                  onPress={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                >
                  <Text style={[styles.categoryText, { color: selectedCategory === cat.key ? '#FFF' : colors.text }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.templatesGrid}>
              {filteredTemplates.map((template) => {
                const IconComponent = getIconComponent(template.icon);
                const category = INSPECTION_CATEGORIES.find(c => c.key === template.category);
                const itemCount = getTrackedItemsForTemplate(template.id).filter(i => i.status === 'active').length;
                
                return (
                  <TouchableOpacity
                    key={template.id}
                    style={[styles.templateCard, { backgroundColor: colors.surface }]}
                    onPress={() => handleStartInspection(template)}
                  >
                    <View style={[styles.templateIconContainer, { backgroundColor: template.color + '20' }]}>
                      <IconComponent size={28} color={template.color} />
                    </View>
                    <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={1}>
                      {template.name}
                    </Text>
                    <Text style={[styles.templateDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {template.description}
                    </Text>
                    <View style={styles.templateMeta}>
                      <View style={[styles.templateBadge, { backgroundColor: category?.color + '20' }]}>
                        <Text style={[styles.templateBadgeText, { color: category?.color }]}>
                          {category?.label}
                        </Text>
                      </View>
                      {template.trackedItemType && (
                        <Text style={[styles.itemCount, { color: colors.textTertiary }]}>
                          {itemCount} items
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {viewMode === 'compliance' && (
          <View style={styles.complianceContainer}>
            {complianceData.map(({ template, compliance }) => {
              if (!compliance) return null;
              const IconComponent = getIconComponent(template.icon);
              const complianceRate = compliance.complianceRate;
              const isGood = complianceRate >= 80;
              const isWarning = complianceRate >= 50 && complianceRate < 80;
              
              return (
                <View key={template.id} style={[styles.complianceCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.complianceHeader}>
                    <View style={[styles.complianceIcon, { backgroundColor: template.color + '20' }]}>
                      <IconComponent size={24} color={template.color} />
                    </View>
                    <View style={styles.complianceInfo}>
                      <Text style={[styles.complianceName, { color: colors.text }]}>{template.name}</Text>
                      <Text style={[styles.compliancePeriod, { color: colors.textTertiary }]}>
                        Since {compliance.periodStart}
                      </Text>
                    </View>
                    <View style={[
                      styles.complianceRateBadge,
                      { backgroundColor: isGood ? '#27AE6020' : isWarning ? '#F39C1220' : '#E74C3C20' }
                    ]}>
                      <Text style={[
                        styles.complianceRateText,
                        { color: isGood ? '#27AE60' : isWarning ? '#F39C12' : '#E74C3C' }
                      ]}>
                        {complianceRate.toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.complianceStats}>
                    <View style={styles.complianceStat}>
                      <Text style={[styles.complianceStatValue, { color: colors.text }]}>
                        {compliance.inspectedCount}/{compliance.totalActive}
                      </Text>
                      <Text style={[styles.complianceStatLabel, { color: colors.textTertiary }]}>Inspected</Text>
                    </View>
                    <View style={styles.complianceStat}>
                      <Text style={[styles.complianceStatValue, { color: '#27AE60' }]}>{compliance.passCount}</Text>
                      <Text style={[styles.complianceStatLabel, { color: colors.textTertiary }]}>Passed</Text>
                    </View>
                    <View style={styles.complianceStat}>
                      <Text style={[styles.complianceStatValue, { color: '#E74C3C' }]}>{compliance.failCount}</Text>
                      <Text style={[styles.complianceStatLabel, { color: colors.textTertiary }]}>Failed</Text>
                    </View>
                  </View>

                  {compliance.uninspectedItems.length > 0 && (
                    <View style={styles.uninspectedSection}>
                      <Text style={[styles.uninspectedTitle, { color: colors.warning }]}>
                        <AlertTriangle size={14} color={colors.warning} /> {compliance.uninspectedItems.length} items need inspection
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {viewMode === 'history' && (
          <View style={styles.historyContainer}>
            {recentInspections.length === 0 ? (
              <View style={styles.emptyState}>
                <History size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No inspection records yet</Text>
              </View>
            ) : (
              recentInspections.map((record) => (
                <View key={record.id} style={[styles.historyCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.historyHeader}>
                    <View style={[
                      styles.resultBadge,
                      { backgroundColor: record.result === 'pass' ? '#27AE6020' : record.result === 'fail' ? '#E74C3C20' : '#F39C1220' }
                    ]}>
                      {record.result === 'pass' ? (
                        <CheckCircle size={16} color="#27AE60" />
                      ) : record.result === 'fail' ? (
                        <XCircle size={16} color="#E74C3C" />
                      ) : (
                        <AlertTriangle size={16} color="#F39C12" />
                      )}
                      <Text style={[
                        styles.resultText,
                        { color: record.result === 'pass' ? '#27AE60' : record.result === 'fail' ? '#E74C3C' : '#F39C12' }
                      ]}>
                        {record.result.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.historyDate, { color: colors.textTertiary }]}>
                      {new Date(record.inspection_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.historyTemplate, { color: colors.text }]}>{record.template_name}</Text>
                  {record.tracked_item_number && (
                    <Text style={[styles.historyItem, { color: colors.textSecondary }]}>
                      Item #{record.tracked_item_number}
                    </Text>
                  )}
                  <View style={styles.historyMeta}>
                    <User size={14} color={colors.textTertiary} />
                    <Text style={[styles.historyMetaText, { color: colors.textTertiary }]}>{record.inspector_name}</Text>
                    {record.location && (
                      <>
                        <MapPin size={14} color={colors.textTertiary} style={{ marginLeft: 12 }} />
                        <Text style={[styles.historyMetaText, { color: colors.textTertiary }]}>{record.location}</Text>
                      </>
                    )}
                  </View>
                  {record.notes && (
                    <Text style={[styles.historyNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                      {record.notes}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {viewMode === 'manage' && (
          <View style={styles.manageContainer}>
            <View style={styles.manageTabBar}>
              {(['schedules', 'items', 'templates'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.manageTab, manageTab === tab && { backgroundColor: colors.primary }]}
                  onPress={() => setManageTab(tab)}
                >
                  <Text style={[styles.manageTabText, { color: manageTab === tab ? '#FFF' : colors.text }]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {manageTab === 'schedules' && (
              <>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setEditingSchedule(null);
                    setFormValues({});
                    setShowScheduleModal(true);
                  }}
                >
                  <Plus size={20} color="#FFF" />
                  <Text style={styles.addButtonText}>Add Schedule</Text>
                </TouchableOpacity>

                {inspectionSchedules.map((schedule) => {
                  const template = inspectionTemplates.find(t => t.id === schedule.template_id);
                  const freq = FREQUENCY_OPTIONS.find(f => f.key === schedule.frequency);
                  return (
                    <View key={schedule.id} style={[styles.manageCard, { backgroundColor: colors.surface }]}>
                      <View style={styles.manageCardHeader}>
                        <View>
                          <Text style={[styles.manageCardTitle, { color: colors.text }]}>{schedule.name}</Text>
                          <Text style={[styles.manageCardSub, { color: colors.textSecondary }]}>
                            {template?.name} • {freq?.label}
                            {schedule.day_of_week && ` (${schedule.day_of_week})`}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: schedule.active ? '#27AE6020' : '#9B9B9B20' }]}>
                          <Text style={{ color: schedule.active ? '#27AE60' : '#9B9B9B', fontSize: 12 }}>
                            {schedule.active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.manageCardMeta}>
                        <Text style={[styles.manageCardMetaText, { color: colors.textTertiary }]}>
                          Next Due: {schedule.next_due}
                        </Text>
                        <Text style={[styles.manageCardMetaText, { color: colors.textTertiary }]}>
                          Notify: {schedule.notify_before_days} day(s) before
                        </Text>
                      </View>
                      <View style={styles.manageCardActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleEditSchedule(schedule)}
                        >
                          <Edit size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#E74C3C20' }]}
                          onPress={() => handleDeleteSchedule(schedule.id)}
                        >
                          <Trash2 size={16} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {manageTab === 'items' && (
              <>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setEditingItem(null);
                    setSelectedTemplateForItem('');
                    setFormValues({});
                    setShowItemModal(true);
                  }}
                >
                  <Plus size={20} color="#FFF" />
                  <Text style={styles.addButtonText}>Add Tracked Item</Text>
                </TouchableOpacity>

                {trackedItems.map((item) => {
                  const template = inspectionTemplates.find(t => t.id === item.template_id);
                  const IconComponent = template ? getIconComponent(template.icon) : Package;
                  return (
                    <View key={item.id} style={[styles.manageCard, { backgroundColor: colors.surface }]}>
                      <View style={styles.manageCardRow}>
                        <View style={[styles.itemIconSmall, { backgroundColor: template?.color + '20' || colors.border }]}>
                          <IconComponent size={20} color={template?.color || colors.textTertiary} />
                        </View>
                        <View style={styles.manageCardContent}>
                          <Text style={[styles.manageCardTitle, { color: colors.text }]}>{item.name}</Text>
                          <Text style={[styles.manageCardSub, { color: colors.textSecondary }]}>
                            #{item.item_number} • {item.item_type}
                          </Text>
                          <View style={styles.manageCardMeta}>
                            <MapPin size={12} color={colors.textTertiary} />
                            <Text style={[styles.manageCardMetaText, { color: colors.textTertiary, marginLeft: 4 }]}>
                              {item.location}
                            </Text>
                            <User size={12} color={colors.textTertiary} style={{ marginLeft: 8 }} />
                            <Text style={[styles.manageCardMetaText, { color: colors.textTertiary, marginLeft: 4 }]}>
                              {item.assigned_to}
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#27AE6020' : '#F39C1220' }]}>
                          <Text style={{ color: item.status === 'active' ? '#27AE60' : '#F39C12', fontSize: 11 }}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.manageCardActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => handleEditItem(item)}
                        >
                          <Edit size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#E74C3C20' }]}
                          onPress={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 size={16} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {manageTab === 'templates' && (
              <>
                <Text style={[styles.manageNote, { color: colors.textSecondary }]}>
                  Inspection form templates. Contact admin to create custom templates.
                </Text>
                {inspectionTemplates.map((template) => {
                  const IconComponent = getIconComponent(template.icon);
                  const category = INSPECTION_CATEGORIES.find(c => c.key === template.category);
                  return (
                    <View key={template.id} style={[styles.manageCard, { backgroundColor: colors.surface }]}>
                      <View style={styles.manageCardRow}>
                        <View style={[styles.itemIconSmall, { backgroundColor: template.color + '20' }]}>
                          <IconComponent size={20} color={template.color} />
                        </View>
                        <View style={styles.manageCardContent}>
                          <Text style={[styles.manageCardTitle, { color: colors.text }]}>{template.name}</Text>
                          <Text style={[styles.manageCardSub, { color: colors.textSecondary }]} numberOfLines={1}>
                            {template.description}
                          </Text>
                          <View style={styles.manageCardMeta}>
                            <View style={[styles.miniTag, { backgroundColor: category?.color + '20' }]}>
                              <Text style={{ color: category?.color, fontSize: 10 }}>{category?.label}</Text>
                            </View>
                            <Text style={[styles.manageCardMetaText, { color: colors.textTertiary, marginLeft: 8 }]}>
                              {template.fields.length} fields
                            </Text>
                            {template.frequencyRequired && (
                              <Text style={[styles.manageCardMetaText, { color: colors.textTertiary, marginLeft: 8 }]}>
                                {FREQUENCY_OPTIONS.find(f => f.key === template.frequencyRequired)?.label}
                              </Text>
                            )}
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: template.active ? '#27AE6020' : '#9B9B9B20' }]}>
                          <Text style={{ color: template.active ? '#27AE60' : '#9B9B9B', fontSize: 11 }}>
                            {template.active ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Inspection Modal */}
      <Modal
        visible={showInspectionModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInspectionModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowInspectionModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedTemplate?.name || 'Inspection'}
            </Text>
            <TouchableOpacity onPress={handleSubmitInspection}>
              <Text style={[styles.submitText, { color: colors.primary }]}>Submit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedTemplate?.trackedItemType && (
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Select Item to Inspect</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {getTrackedItemsForTemplate(selectedTemplate.id)
                    .filter(i => i.status === 'active')
                    .map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.itemSelectCard,
                          {
                            backgroundColor: selectedItem?.id === item.id ? colors.primary + '20' : colors.surface,
                            borderColor: selectedItem?.id === item.id ? colors.primary : colors.border,
                          }
                        ]}
                        onPress={() => handleSelectTrackedItem(item)}
                      >
                        <Text style={[styles.itemSelectNumber, { color: selectedItem?.id === item.id ? colors.primary : colors.text }]}>
                          #{item.item_number}
                        </Text>
                        <Text style={[styles.itemSelectLocation, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.location}
                        </Text>
                        <Text style={[styles.itemSelectAssigned, { color: colors.textTertiary }]} numberOfLines={1}>
                          {item.assigned_to}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            {selectedTemplate?.fields.map((field) => renderFieldInput(field))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
            </Text>
            <TouchableOpacity onPress={handleSaveSchedule}>
              <Text style={[styles.submitText, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Schedule Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Weekly Blade Inspection"
                placeholderTextColor={colors.textTertiary}
                value={formValues.scheduleName as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, scheduleName: text }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Optional description..."
                placeholderTextColor={colors.textTertiary}
                value={formValues.scheduleDescription as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, scheduleDescription: text }))}
                multiline
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Inspection Form *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {activeTemplates.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: formValues.scheduleTemplateId === t.id ? colors.primary : colors.surface,
                        borderColor: formValues.scheduleTemplateId === t.id ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setFormValues(prev => ({ ...prev, scheduleTemplateId: t.id }))}
                  >
                    <Text style={{ color: formValues.scheduleTemplateId === t.id ? '#FFF' : colors.text }}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Frequency *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FREQUENCY_OPTIONS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: formValues.scheduleFrequency === f.key ? colors.primary : colors.surface,
                        borderColor: formValues.scheduleFrequency === f.key ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setFormValues(prev => ({ ...prev, scheduleFrequency: f.key }))}
                  >
                    <Text style={{ color: formValues.scheduleFrequency === f.key ? '#FFF' : colors.text }}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {formValues.scheduleFrequency === 'weekly' && (
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Day of Week</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {DAYS_OF_WEEK.map((d) => (
                    <TouchableOpacity
                      key={d.key}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: formValues.scheduleDayOfWeek === d.key ? colors.primary : colors.surface,
                          borderColor: formValues.scheduleDayOfWeek === d.key ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => setFormValues(prev => ({ ...prev, scheduleDayOfWeek: d.key }))}
                    >
                      <Text style={{ color: formValues.scheduleDayOfWeek === d.key ? '#FFF' : colors.text }}>
                        {d.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {(formValues.scheduleFrequency === 'monthly' || formValues.scheduleFrequency === 'quarterly') && (
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Day of Month</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="1-31"
                  placeholderTextColor={colors.textTertiary}
                  value={String(formValues.scheduleDayOfMonth || '')}
                  onChangeText={(text) => setFormValues(prev => ({ ...prev, scheduleDayOfMonth: Number(text) }))}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Notify Before (days)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="1"
                placeholderTextColor={colors.textTertiary}
                value={String(formValues.scheduleNotifyBefore || '')}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, scheduleNotifyBefore: Number(text) }))}
                keyboardType="numeric"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Item Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingItem ? 'Edit Item' : 'Add Tracked Item'}
            </Text>
            <TouchableOpacity onPress={handleSaveItem}>
              <Text style={[styles.submitText, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Inspection Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {activeTemplates.filter(t => t.trackedItemType).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selectedTemplateForItem === t.id ? colors.primary : colors.surface,
                        borderColor: selectedTemplateForItem === t.id ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedTemplateForItem(t.id)}
                  >
                    <Text style={{ color: selectedTemplateForItem === t.id ? '#FFF' : colors.text }}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Item Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Blade #5"
                placeholderTextColor={colors.textTertiary}
                value={formValues.itemName as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, itemName: text }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Item Number *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., 5 or FL-006"
                placeholderTextColor={colors.textTertiary}
                value={formValues.itemNumber as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, itemNumber: text }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Production Floor A"
                placeholderTextColor={colors.textTertiary}
                value={formValues.itemLocation as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, itemLocation: text }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Assigned To</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., John Smith"
                placeholderTextColor={colors.textTertiary}
                value={formValues.itemAssignedTo as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, itemAssignedTo: text }))}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Item Type</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Circular 12 inch"
                placeholderTextColor={colors.textTertiary}
                value={formValues.itemType as string || ''}
                onChangeText={(text) => setFormValues(prev => ({ ...prev, itemType: text }))}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  alertBadge: {
    position: 'absolute',
    top: 4,
    right: '20%',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  alertBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  alertsContainer: {
    padding: 16,
  },
  alertSection: {
    marginBottom: 20,
  },
  alertSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertName: {
    fontSize: 15,
    fontWeight: '600',
  },
  alertMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  alertItems: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  templateCard: {
    width: '47%',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  templateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  templateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  templateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemCount: {
    fontSize: 11,
  },
  complianceContainer: {
    padding: 16,
    gap: 12,
  },
  complianceCard: {
    padding: 16,
    borderRadius: 16,
  },
  complianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  complianceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  complianceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  compliancePeriod: {
    fontSize: 12,
    marginTop: 2,
  },
  complianceRateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  complianceRateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  complianceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  complianceStat: {
    alignItems: 'center',
  },
  complianceStatValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  complianceStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  uninspectedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  uninspectedTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyContainer: {
    padding: 16,
    gap: 12,
  },
  historyCard: {
    padding: 16,
    borderRadius: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 12,
  },
  historyTemplate: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    fontSize: 13,
    marginTop: 2,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  historyMetaText: {
    fontSize: 12,
  },
  historyNotes: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
  },
  manageContainer: {
    padding: 16,
  },
  manageTabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  manageTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  manageTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manageCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  manageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  manageCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  manageCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  manageCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  manageCardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  manageCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  manageCardMetaText: {
    fontSize: 12,
  },
  manageCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manageNote: {
    fontSize: 13,
    marginBottom: 16,
    fontStyle: 'italic',
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
    fontSize: 18,
    fontWeight: '600',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsScroll: {
    flexDirection: 'row',
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  passFailContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  passFailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  passFailText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    marginLeft: 12,
  },
  itemSelectCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  itemSelectNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSelectLocation: {
    fontSize: 12,
    marginTop: 4,
  },
  itemSelectAssigned: {
    fontSize: 11,
    marginTop: 2,
  },
});
