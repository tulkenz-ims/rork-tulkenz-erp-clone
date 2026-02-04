import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Package,
  Plus,
  Calendar,
  User,
  X,
  Check,
  ChevronDown,
  History,
  HardHat,
  Eye,
  Ear,
  Wind,
  Hand,
  Footprints,
  Shield,
  Trash2,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  Hash,
  Building2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

interface PPEItem {
  id: string;
  category: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  sizes: string[];
}

const PPE_ITEMS: PPEItem[] = [
  { id: 'hardhat', category: 'head', name: 'Hard Hat', icon: HardHat, color: '#F59E0B', sizes: ['S', 'M', 'L', 'XL', 'Adjustable'] },
  { id: 'safetyglasses', category: 'eye', name: 'Safety Glasses', icon: Eye, color: '#3B82F6', sizes: ['Universal', 'Small', 'Large'] },
  { id: 'faceshield', category: 'eye', name: 'Face Shield', icon: Eye, color: '#3B82F6', sizes: ['Universal'] },
  { id: 'goggles', category: 'eye', name: 'Safety Goggles', icon: Eye, color: '#3B82F6', sizes: ['Universal', 'Over-glasses'] },
  { id: 'earplugs', category: 'hearing', name: 'Ear Plugs', icon: Ear, color: '#8B5CF6', sizes: ['Universal', 'S/M', 'M/L'] },
  { id: 'earmuffs', category: 'hearing', name: 'Ear Muffs', icon: Ear, color: '#8B5CF6', sizes: ['Universal', 'Low Profile', 'High NRR'] },
  { id: 'n95', category: 'respiratory', name: 'N95 Respirator', icon: Wind, color: '#EF4444', sizes: ['S', 'M', 'L'] },
  { id: 'halfmask', category: 'respiratory', name: 'Half-Face Respirator', icon: Wind, color: '#EF4444', sizes: ['S', 'M', 'L'] },
  { id: 'fullmask', category: 'respiratory', name: 'Full-Face Respirator', icon: Wind, color: '#EF4444', sizes: ['S', 'M', 'L'] },
  { id: 'leathergloves', category: 'hand', name: 'Leather Gloves', icon: Hand, color: '#10B981', sizes: ['S', 'M', 'L', 'XL', '2XL'] },
  { id: 'nitrilegloves', category: 'hand', name: 'Nitrile Gloves', icon: Hand, color: '#10B981', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'cutgloves', category: 'hand', name: 'Cut-Resistant Gloves', icon: Hand, color: '#10B981', sizes: ['S', 'M', 'L', 'XL', '2XL'] },
  { id: 'chemgloves', category: 'hand', name: 'Chemical Gloves', icon: Hand, color: '#10B981', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'safetyboots', category: 'foot', name: 'Safety Boots', icon: Footprints, color: '#06B6D4', sizes: ['6', '7', '8', '9', '10', '11', '12', '13', '14'] },
  { id: 'metatarsals', category: 'foot', name: 'Metatarsal Guards', icon: Footprints, color: '#06B6D4', sizes: ['S', 'M', 'L', 'XL'] },
  { id: 'safetyvest', category: 'body', name: 'Safety Vest', icon: Shield, color: '#F97316', sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'] },
  { id: 'frclothing', category: 'body', name: 'FR Clothing', icon: Shield, color: '#F97316', sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'] },
  { id: 'apron', category: 'body', name: 'Protective Apron', icon: Shield, color: '#F97316', sizes: ['Universal', 'Long'] },
];

interface IssuedItem {
  id: string;
  ppeItemId: string;
  size: string;
  quantity: number;
  serialNumber: string;
  condition: 'new' | 'good' | 'fair';
}

interface IssueFormData {
  issueDate: string;
  issuedBy: string;
  employeeName: string;
  employeeId: string;
  department: string;
  jobTitle: string;
  issuedItems: IssuedItem[];
  reason: 'new_hire' | 'replacement' | 'upgrade' | 'additional' | 'other';
  reasonDetails: string;
  employeeAcknowledged: boolean;
  trainingProvided: boolean;
  notes: string;
}

interface IssueRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  issueDate: string;
  itemCount: number;
  issuedBy: string;
  acknowledged: boolean;
  createdAt: string;
}

const ISSUE_REASONS = [
  { id: 'new_hire', label: 'New Hire', color: '#10B981' },
  { id: 'replacement', label: 'Replacement (Worn/Damaged)', color: '#F59E0B' },
  { id: 'upgrade', label: 'Upgrade', color: '#3B82F6' },
  { id: 'additional', label: 'Additional Equipment', color: '#8B5CF6' },
  { id: 'other', label: 'Other', color: '#64748B' },
];

const initialFormData: IssueFormData = {
  issueDate: new Date().toISOString().split('T')[0],
  issuedBy: '',
  employeeName: '',
  employeeId: '',
  department: '',
  jobTitle: '',
  issuedItems: [],
  reason: 'new_hire',
  reasonDetails: '',
  employeeAcknowledged: false,
  trainingProvided: false,
  notes: '',
};

export default function PPEIssueScreen() {
  const { colors } = useTheme();
  useAuth();

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState<IssueFormData>(initialFormData);
  const [showPPEPicker, setShowPPEPicker] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [selectedItemForSize, setSelectedItemForSize] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const [issueHistory, setIssueHistory] = useState<IssueRecord[]>([
    {
      id: '1',
      employeeName: 'John Smith',
      employeeId: 'EMP001',
      department: 'Manufacturing',
      issueDate: '2024-01-20',
      itemCount: 5,
      issuedBy: 'Safety Manager',
      acknowledged: true,
      createdAt: '2024-01-20T09:00:00Z',
    },
    {
      id: '2',
      employeeName: 'Jane Doe',
      employeeId: 'EMP042',
      department: 'Warehouse',
      issueDate: '2024-01-18',
      itemCount: 3,
      issuedBy: 'HR Coordinator',
      acknowledged: true,
      createdAt: '2024-01-18T14:00:00Z',
    },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const updateFormData = useCallback((key: keyof IssueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const addPPEItem = useCallback((ppeItem: PPEItem) => {
    const newItem: IssuedItem = {
      id: Date.now().toString(),
      ppeItemId: ppeItem.id,
      size: ppeItem.sizes[0],
      quantity: 1,
      serialNumber: '',
      condition: 'new',
    };
    setFormData(prev => ({
      ...prev,
      issuedItems: [...prev.issuedItems, newItem],
    }));
    setShowPPEPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const updateIssuedItem = useCallback((itemId: string, key: keyof IssuedItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      issuedItems: prev.issuedItems.map(i =>
        i.id === itemId ? { ...i, [key]: value } : i
      ),
    }));
  }, []);

  const removeIssuedItem = useCallback((itemId: string) => {
    setFormData(prev => ({
      ...prev,
      issuedItems: prev.issuedItems.filter(i => i.id !== itemId),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const canSubmit = formData.issuedBy.trim().length > 0 &&
    formData.employeeName.trim().length > 0 &&
    formData.issuedItems.length > 0 &&
    formData.employeeAcknowledged;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete:\n• Issued By\n• Employee Name\n• At least one PPE item\n• Employee Acknowledgment');
      return;
    }

    Alert.alert(
      'Submit PPE Issue Record',
      `Issue ${formData.issuedItems.length} item(s) to ${formData.employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await new Promise(resolve => setTimeout(resolve, 1500));

              const newRecord: IssueRecord = {
                id: Date.now().toString(),
                employeeName: formData.employeeName,
                employeeId: formData.employeeId,
                department: formData.department,
                issueDate: formData.issueDate,
                itemCount: formData.issuedItems.length,
                issuedBy: formData.issuedBy,
                acknowledged: formData.employeeAcknowledged,
                createdAt: new Date().toISOString(),
              };

              setIssueHistory(prev => [newRecord, ...prev]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'PPE issue record submitted successfully.');
              setFormData(initialFormData);
              setActiveTab('history');
            } catch (error) {
              console.error('[PPEIssue] Submit error:', error);
              Alert.alert('Error', 'Failed to submit. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, formData]);

  const getReasonColor = (reasonId: string) => {
    return ISSUE_REASONS.find(r => r.id === reasonId)?.color || colors.textSecondary;
  };

  const renderNewTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
          <Package size={32} color="#10B981" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>PPE Issue/Distribution</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Document PPE issuance with employee acknowledgment for compliance tracking
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Issue Information</Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Issue Date *</Text>
          <View style={[styles.dateField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.dateInput, { color: colors.text }]}
              value={formData.issueDate}
              onChangeText={(text) => updateFormData('issueDate', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Issued By *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, marginBottom: 0 }]}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            value={formData.issuedBy}
            onChangeText={(text) => updateFormData('issuedBy', text)}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Employee Information</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Employee Name *</Text>
      <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <User size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.inputField, { color: colors.text }]}
          placeholder="Full name of employee receiving PPE"
          placeholderTextColor={colors.textSecondary}
          value={formData.employeeName}
          onChangeText={(text) => updateFormData('employeeName', text)}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Employee ID</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 0 }]}>
            <Hash size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="ID Number"
              placeholderTextColor={colors.textSecondary}
              value={formData.employeeId}
              onChangeText={(text) => updateFormData('employeeId', text)}
            />
          </View>
        </View>
        <View style={styles.halfField}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 0 }]}>
            <Building2 size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.inputField, { color: colors.text }]}
              placeholder="Department"
              placeholderTextColor={colors.textSecondary}
              value={formData.department}
              onChangeText={(text) => updateFormData('department', text)}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Job Title</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Employee's job title"
        placeholderTextColor={colors.textSecondary}
        value={formData.jobTitle}
        onChangeText={(text) => updateFormData('jobTitle', text)}
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Reason for Issue</Text>
      <Pressable
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowReasonPicker(true)}
      >
        <View style={[styles.reasonDot, { backgroundColor: getReasonColor(formData.reason) }]} />
        <Text style={[styles.selectorText, { color: colors.text }]}>
          {ISSUE_REASONS.find(r => r.id === formData.reason)?.label}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </Pressable>

      {formData.reason === 'other' && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Specify reason..."
          placeholderTextColor={colors.textSecondary}
          value={formData.reasonDetails}
          onChangeText={(text) => updateFormData('reasonDetails', text)}
        />
      )}

      <View style={styles.itemsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
          PPE Items ({formData.issuedItems.length})
        </Text>
        <Pressable
          style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowPPEPicker(true)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.addItemBtnText}>Add Item</Text>
        </Pressable>
      </View>

      {formData.issuedItems.length === 0 ? (
        <View style={[styles.emptyItems, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Package size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>
            No items added yet
          </Text>
          <Text style={[styles.emptyItemsSubtext, { color: colors.textSecondary }]}>
            Tap Add Item to add PPE items
          </Text>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {formData.issuedItems.map((item) => {
            const ppeItem = PPE_ITEMS.find(p => p.id === item.ppeItemId);
            if (!ppeItem) return null;
            const ItemIcon = ppeItem.icon;

            return (
              <View
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.itemCardHeader}>
                  <View style={[styles.itemIcon, { backgroundColor: ppeItem.color + '15' }]}>
                    <ItemIcon size={20} color={ppeItem.color} />
                  </View>
                  <View style={styles.itemTitleContainer}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{ppeItem.name}</Text>
                  </View>
                  <Pressable onPress={() => removeIssuedItem(item.id)}>
                    <Trash2 size={18} color="#EF4444" />
                  </Pressable>
                </View>

                <View style={styles.itemDetailsRow}>
                  <View style={styles.itemDetailField}>
                    <Text style={[styles.itemDetailLabel, { color: colors.textSecondary }]}>Size</Text>
                    <Pressable
                      style={[styles.sizeSelector, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => {
                        setSelectedItemForSize(item.id);
                        setShowSizePicker(true);
                      }}
                    >
                      <Text style={[styles.sizeSelectorText, { color: colors.text }]}>{item.size}</Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={styles.itemDetailField}>
                    <Text style={[styles.itemDetailLabel, { color: colors.textSecondary }]}>Qty</Text>
                    <View style={styles.quantityControl}>
                      <Pressable
                        style={[styles.qtyBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => updateIssuedItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                      >
                        <Text style={[styles.qtyBtnText, { color: colors.text }]}>-</Text>
                      </Pressable>
                      <Text style={[styles.qtyValue, { color: colors.text }]}>{item.quantity}</Text>
                      <Pressable
                        style={[styles.qtyBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => updateIssuedItem(item.id, 'quantity', item.quantity + 1)}
                      >
                        <Text style={[styles.qtyBtnText, { color: colors.text }]}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.itemDetailField}>
                    <Text style={[styles.itemDetailLabel, { color: colors.textSecondary }]}>Condition</Text>
                    <View style={[styles.conditionBadge, { backgroundColor: item.condition === 'new' ? '#10B98115' : '#F59E0B15' }]}>
                      <Text style={[styles.conditionText, { color: item.condition === 'new' ? '#10B981' : '#F59E0B' }]}>
                        {item.condition.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <TextInput
                  style={[styles.serialInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  placeholder="Serial/Lot # (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={item.serialNumber}
                  onChangeText={(text) => updateIssuedItem(item.id, 'serialNumber', text)}
                />
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Acknowledgment</Text>

      <Pressable
        style={[
          styles.checkboxRow,
          { backgroundColor: colors.surface, borderColor: formData.employeeAcknowledged ? '#10B981' : colors.border },
        ]}
        onPress={() => {
          updateFormData('employeeAcknowledged', !formData.employeeAcknowledged);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={[
          styles.checkbox,
          { backgroundColor: formData.employeeAcknowledged ? '#10B981' : colors.background, borderColor: formData.employeeAcknowledged ? '#10B981' : colors.border },
        ]}>
          {formData.employeeAcknowledged && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.checkboxContent}>
          <Text style={[styles.checkboxTitle, { color: colors.text }]}>Employee Acknowledgment *</Text>
          <Text style={[styles.checkboxSubtitle, { color: colors.textSecondary }]}>
            Employee confirms receipt of PPE and understands proper use, care, and maintenance requirements
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[
          styles.checkboxRow,
          { backgroundColor: colors.surface, borderColor: formData.trainingProvided ? '#3B82F6' : colors.border },
        ]}
        onPress={() => {
          updateFormData('trainingProvided', !formData.trainingProvided);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <View style={[
          styles.checkbox,
          { backgroundColor: formData.trainingProvided ? '#3B82F6' : colors.background, borderColor: formData.trainingProvided ? '#3B82F6' : colors.border },
        ]}>
          {formData.trainingProvided && <Check size={14} color="#fff" />}
        </View>
        <View style={styles.checkboxContent}>
          <Text style={[styles.checkboxTitle, { color: colors.text }]}>Training Provided</Text>
          <Text style={[styles.checkboxSubtitle, { color: colors.textSecondary }]}>
            Employee received training on proper use, limitations, and care of issued PPE
          </Text>
        </View>
      </Pressable>

      <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>Notes</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Any additional notes..."
        placeholderTextColor={colors.textSecondary}
        value={formData.notes}
        onChangeText={(text) => updateFormData('notes', text)}
        multiline
        numberOfLines={3}
      />

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={() => setFormData(initialFormData)}
        >
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.submitButton, { backgroundColor: canSubmit ? '#10B981' : colors.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <ClipboardCheck size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Issue Record</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {issueHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Package size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Issue Records</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Submit your first PPE issue record to see it here
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>Issue Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: colors.primary }]}>{issueHistory.length}</Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Records</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#10B981' }]}>
                  {issueHistory.reduce((sum, r) => sum + r.itemCount, 0)}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Items Issued</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: '#3B82F6' }]}>
                  {issueHistory.filter(r => r.acknowledged).length}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>Acknowledged</Text>
              </View>
            </View>
          </View>

          {issueHistory.map((record) => (
            <Pressable
              key={record.id}
              style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setExpandedRecord(expandedRecord === record.id ? null : record.id);
              }}
            >
              <View style={styles.historyHeader}>
                <View style={styles.historyHeaderLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: '#10B98120' }]}>
                    <Package size={20} color="#10B981" />
                  </View>
                  <View style={styles.historyTitleContainer}>
                    <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
                      {record.employeeName}
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                      {new Date(record.issueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyHeaderRight}>
                  {record.acknowledged && (
                    <View style={[styles.ackBadge, { backgroundColor: '#10B98115' }]}>
                      <FileSignature size={12} color="#10B981" />
                      <Text style={[styles.ackText, { color: '#10B981' }]}>ACK</Text>
                    </View>
                  )}
                  <ChevronRight
                    size={18}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: expandedRecord === record.id ? '90deg' : '0deg' }] }}
                  />
                </View>
              </View>

              <View style={styles.historyMeta}>
                <View style={styles.historyMetaItem}>
                  <Hash size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {record.employeeId || 'N/A'}
                  </Text>
                </View>
                <View style={styles.historyMetaItem}>
                  <Package size={14} color={colors.textSecondary} />
                  <Text style={[styles.historyMetaText, { color: colors.textSecondary }]}>
                    {record.itemCount} item(s)
                  </Text>
                </View>
              </View>

              {expandedRecord === record.id && (
                <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Department</Text>
                      <Text style={[styles.expandedValue, { color: colors.text }]}>{record.department || 'N/A'}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Issued By</Text>
                      <Text style={[styles.expandedValue, { color: colors.text }]}>{record.issuedBy}</Text>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>
          ))}
        </>
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const selectedItem = formData.issuedItems.find(i => i.id === selectedItemForSize);
  const selectedPPE = selectedItem ? PPE_ITEMS.find(p => p.id === selectedItem.ppeItemId) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'new' && { borderBottomColor: '#10B981', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('new')}
        >
          <Plus size={18} color={activeTab === 'new' ? '#10B981' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'new' ? '#10B981' : colors.textSecondary }]}>
            New Issue
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: '#10B981', borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? '#10B981' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#10B981' : colors.textSecondary }]}>
            History ({issueHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'new' ? renderNewTab() : renderHistoryTab()}

      <Modal
        visible={showPPEPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPPEPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select PPE Item</Text>
              <Pressable onPress={() => setShowPPEPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {PPE_ITEMS.map((ppeItem) => {
                const ItemIcon = ppeItem.icon;
                return (
                  <Pressable
                    key={ppeItem.id}
                    style={[styles.ppeOption, { borderBottomColor: colors.border }]}
                    onPress={() => addPPEItem(ppeItem)}
                  >
                    <View style={[styles.ppeOptionIcon, { backgroundColor: ppeItem.color + '20' }]}>
                      <ItemIcon size={20} color={ppeItem.color} />
                    </View>
                    <View style={styles.ppeOptionContent}>
                      <Text style={[styles.ppeOptionName, { color: colors.text }]}>{ppeItem.name}</Text>
                      <Text style={[styles.ppeOptionSizes, { color: colors.textSecondary }]}>
                        Sizes: {ppeItem.sizes.join(', ')}
                      </Text>
                    </View>
                    <Plus size={18} color={colors.textSecondary} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReasonPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReasonPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReasonPicker(false)}>
          <View style={[styles.reasonModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.reasonModalTitle, { color: colors.text }]}>Issue Reason</Text>
            {ISSUE_REASONS.map((reason) => (
              <Pressable
                key={reason.id}
                style={[styles.reasonOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  updateFormData('reason', reason.id as any);
                  setShowReasonPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.reasonDot, { backgroundColor: reason.color }]} />
                <Text style={[styles.reasonOptionText, { color: colors.text }]}>{reason.label}</Text>
                {formData.reason === reason.id && <Check size={18} color={reason.color} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showSizePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSizePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSizePicker(false)}>
          <View style={[styles.sizeModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sizeModalTitle, { color: colors.text }]}>Select Size</Text>
            <View style={styles.sizeGrid}>
              {selectedPPE?.sizes.map((size) => (
                <Pressable
                  key={size}
                  style={[
                    styles.sizeOption,
                    { backgroundColor: selectedItem?.size === size ? colors.primary : colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    if (selectedItemForSize) {
                      updateIssuedItem(selectedItemForSize, 'size', size);
                    }
                    setShowSizePicker(false);
                    setSelectedItemForSize(null);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.sizeOptionText, { color: selectedItem?.size === size ? '#fff' : colors.text }]}>
                    {size}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  tabBar: { flexDirection: 'row' as const, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 12, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' as const },
  headerCard: { borderRadius: 16, padding: 24, alignItems: 'center' as const, borderWidth: 1, marginBottom: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 13, textAlign: 'center' as const, lineHeight: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 12 },
  textArea: { borderRadius: 10, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' as const, marginBottom: 12 },
  row: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  halfField: { flex: 1 },
  dateField: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, gap: 10 },
  dateInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  inputWithIcon: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12, gap: 10 },
  inputField: { flex: 1, paddingVertical: 14, fontSize: 15 },
  selector: { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12, gap: 10 },
  selectorText: { flex: 1, fontSize: 15 },
  reasonDot: { width: 10, height: 10, borderRadius: 5 },
  itemsHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginTop: 16, marginBottom: 12 },
  addItemBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addItemBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' as const },
  emptyItems: { borderRadius: 12, padding: 32, alignItems: 'center' as const, borderWidth: 1, borderStyle: 'dashed' as const, marginBottom: 16 },
  emptyItemsText: { fontSize: 16, fontWeight: '600' as const, marginTop: 12 },
  emptyItemsSubtext: { fontSize: 14, marginTop: 4 },
  itemsList: { gap: 12, marginBottom: 16 },
  itemCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  itemCardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
  itemTitleContainer: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600' as const },
  itemDetailsRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 10 },
  itemDetailField: { flex: 1 },
  itemDetailLabel: { fontSize: 11, marginBottom: 4 },
  sizeSelector: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 8, borderRadius: 6, borderWidth: 1 },
  sizeSelectorText: { fontSize: 13, fontWeight: '500' as const },
  quantityControl: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  qtyBtnText: { fontSize: 16, fontWeight: '600' as const },
  qtyValue: { fontSize: 15, fontWeight: '600' as const, minWidth: 20, textAlign: 'center' as const },
  conditionBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignItems: 'center' as const },
  conditionText: { fontSize: 10, fontWeight: '600' as const },
  serialInput: { borderRadius: 8, borderWidth: 1, padding: 10, fontSize: 13 },
  checkboxRow: { flexDirection: 'row' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12, marginTop: 2 },
  checkboxContent: { flex: 1 },
  checkboxTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 2 },
  checkboxSubtitle: { fontSize: 12, lineHeight: 16 },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 16 },
  resetButton: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  resetButtonText: { fontSize: 15, fontWeight: '600' as const },
  submitButton: { flex: 2, flexDirection: 'row' as const, paddingVertical: 14, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  emptyState: { borderRadius: 16, padding: 48, alignItems: 'center' as const, borderWidth: 1, marginTop: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' as const },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, textAlign: 'center' as const },
  summaryStats: { flexDirection: 'row' as const, alignItems: 'center' as const },
  summaryStatItem: { flex: 1, alignItems: 'center' as const },
  summaryStatValue: { fontSize: 22, fontWeight: '700' as const },
  summaryStatLabel: { fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 30 },
  historyCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  historyHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 8 },
  historyHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1 },
  historyIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
  historyTitleContainer: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  historyDate: { fontSize: 12 },
  historyHeaderRight: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  ackBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 4 },
  ackText: { fontSize: 10, fontWeight: '600' as const },
  historyMeta: { flexDirection: 'row' as const, gap: 16 },
  historyMetaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  historyMetaText: { fontSize: 12 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  expandedRow: { flexDirection: 'row' as const, gap: 20 },
  expandedItem: { flex: 1 },
  expandedLabel: { fontSize: 11, marginBottom: 2 },
  expandedValue: { fontSize: 14, fontWeight: '500' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  modalList: { padding: 8 },
  ppeOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 12, borderBottomWidth: 1 },
  ppeOptionIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
  ppeOptionContent: { flex: 1 },
  ppeOptionName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  ppeOptionSizes: { fontSize: 12 },
  reasonModal: { position: 'absolute' as const, top: '30%', left: 40, right: 40, borderRadius: 12, padding: 16 },
  reasonModalTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, textAlign: 'center' as const },
  reasonOption: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  reasonOptionText: { flex: 1, fontSize: 15 },
  sizeModal: { position: 'absolute' as const, top: '30%', left: 40, right: 40, borderRadius: 12, padding: 16 },
  sizeModalTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 12, textAlign: 'center' as const },
  sizeGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  sizeOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, minWidth: 50, alignItems: 'center' as const },
  sizeOptionText: { fontSize: 14, fontWeight: '500' as const },
  bottomPadding: { height: 32 },
});
