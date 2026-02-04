import React, { useState, useCallback, useMemo } from 'react';
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
  BriefcaseMedical,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ClipboardCheck,
  History,
  MapPin,
  User,
  Trash2,
  X,
  Check,
  Package,
  Calendar,
  AlertCircle,
  Pill,
  Bandage,
  Scissors,
  ThermometerSun,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSafety } from '@/hooks/useSupabaseSafety';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type ChecklistItemStatus = 'pass' | 'fail' | 'na' | 'unchecked';

interface ChecklistItem {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  notes: string;
  minQty?: number;
}

interface ChecklistCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  items: ChecklistItem[];
  expanded: boolean;
}

interface Finding {
  id: string;
  categoryId: string;
  categoryName: string;
  itemId: string;
  itemText: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notes: string;
  correctiveAction: string;
}

interface KitLocation {
  id: string;
  name: string;
  kitType: 'A' | 'B' | 'C';
  area: string;
}

const KIT_LOCATIONS: KitLocation[] = [
  { id: 'prod-main', name: 'Production - Main Floor', kitType: 'B', area: 'Production' },
  { id: 'prod-pack', name: 'Production - Packaging', kitType: 'B', area: 'Production' },
  { id: 'warehouse', name: 'Warehouse Office', kitType: 'A', area: 'Warehouse' },
  { id: 'shipping', name: 'Shipping/Receiving', kitType: 'A', area: 'Warehouse' },
  { id: 'maintenance', name: 'Maintenance Shop', kitType: 'B', area: 'Maintenance' },
  { id: 'breakroom', name: 'Break Room', kitType: 'A', area: 'Common' },
  { id: 'office-main', name: 'Main Office', kitType: 'A', area: 'Office' },
  { id: 'lab', name: 'QC Laboratory', kitType: 'B', area: 'Laboratory' },
  { id: 'guard', name: 'Security/Guard Station', kitType: 'A', area: 'Common' },
  { id: 'vehicle', name: 'Company Vehicle', kitType: 'C', area: 'Mobile' },
  { id: 'custom', name: 'Other Location', kitType: 'A', area: 'Specify' },
];

const DEFAULT_CHECKLIST: Omit<ChecklistCategory, 'expanded'>[] = [
  {
    id: 'general',
    name: 'General Condition',
    icon: BriefcaseMedical,
    color: '#EC4899',
    items: [
      { id: 'gen1', text: 'Kit container clean and in good condition', status: 'unchecked', notes: '' },
      { id: 'gen2', text: 'Kit easily accessible and visible', status: 'unchecked', notes: '' },
      { id: 'gen3', text: 'First aid signage posted at kit location', status: 'unchecked', notes: '' },
      { id: 'gen4', text: 'Kit seal intact (if applicable)', status: 'unchecked', notes: '' },
      { id: 'gen5', text: 'Contents list/inventory sheet present', status: 'unchecked', notes: '' },
      { id: 'gen6', text: 'Emergency contact numbers posted', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'bandages',
    name: 'Bandages & Dressings',
    icon: Bandage,
    color: '#F97316',
    items: [
      { id: 'band1', text: 'Adhesive bandages (assorted sizes) - adequate supply', status: 'unchecked', notes: '', minQty: 16 },
      { id: 'band2', text: 'Gauze pads (3x3" or 4x4") - adequate supply', status: 'unchecked', notes: '', minQty: 4 },
      { id: 'band3', text: 'Gauze roll bandage - adequate supply', status: 'unchecked', notes: '', minQty: 2 },
      { id: 'band4', text: 'Triangular bandage/sling', status: 'unchecked', notes: '', minQty: 1 },
      { id: 'band5', text: 'Elastic wrap bandage', status: 'unchecked', notes: '', minQty: 1 },
      { id: 'band6', text: 'Butterfly closures/wound closure strips', status: 'unchecked', notes: '' },
      { id: 'band7', text: 'Eye pads/patches', status: 'unchecked', notes: '', minQty: 2 },
      { id: 'band8', text: 'Knuckle/fingertip bandages', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'antiseptic',
    name: 'Antiseptic & Medications',
    icon: Pill,
    color: '#10B981',
    items: [
      { id: 'anti1', text: 'Antiseptic wipes/swabs - adequate supply', status: 'unchecked', notes: '', minQty: 10 },
      { id: 'anti2', text: 'Antibiotic ointment packets', status: 'unchecked', notes: '', minQty: 6 },
      { id: 'anti3', text: 'Burn cream/gel packets', status: 'unchecked', notes: '', minQty: 6 },
      { id: 'anti4', text: 'Hydrocortisone cream packets', status: 'unchecked', notes: '' },
      { id: 'anti5', text: 'Eye wash solution (saline)', status: 'unchecked', notes: '' },
      { id: 'anti6', text: 'Pain reliever (aspirin/ibuprofen) - not expired', status: 'unchecked', notes: '' },
      { id: 'anti7', text: 'All medications within expiration date', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'tools',
    name: 'Tools & Instruments',
    icon: Scissors,
    color: '#3B82F6',
    items: [
      { id: 'tool1', text: 'Scissors (medical grade)', status: 'unchecked', notes: '', minQty: 1 },
      { id: 'tool2', text: 'Tweezers', status: 'unchecked', notes: '', minQty: 1 },
      { id: 'tool3', text: 'Medical tape (cloth/paper)', status: 'unchecked', notes: '', minQty: 1 },
      { id: 'tool4', text: 'Safety pins (assorted)', status: 'unchecked', notes: '' },
      { id: 'tool5', text: 'Splinter removal tool/needle', status: 'unchecked', notes: '' },
      { id: 'tool6', text: 'Instant cold pack', status: 'unchecked', notes: '', minQty: 2 },
      { id: 'tool7', text: 'Disposable thermometer', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'protection',
    name: 'Protection & PPE',
    icon: Package,
    color: '#8B5CF6',
    items: [
      { id: 'prot1', text: 'Disposable gloves (nitrile/latex) - adequate pairs', status: 'unchecked', notes: '', minQty: 4 },
      { id: 'prot2', text: 'CPR breathing barrier/pocket mask', status: 'unchecked', notes: '', minQty: 1 },
      { id: 'prot3', text: 'Biohazard waste bag', status: 'unchecked', notes: '' },
      { id: 'prot4', text: 'Hand sanitizer', status: 'unchecked', notes: '' },
      { id: 'prot5', text: 'Absorbent compress/blood stopper', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'specialty',
    name: 'Specialty Items',
    icon: ThermometerSun,
    color: '#06B6D4',
    items: [
      { id: 'spec1', text: 'First aid instruction manual/guide', status: 'unchecked', notes: '' },
      { id: 'spec2', text: 'Emergency blanket (mylar)', status: 'unchecked', notes: '' },
      { id: 'spec3', text: 'Tourniquet (for severe bleeding)', status: 'unchecked', notes: '' },
      { id: 'spec4', text: 'Flashlight with batteries', status: 'unchecked', notes: '' },
      { id: 'spec5', text: 'Accident report forms', status: 'unchecked', notes: '' },
    ],
  },
];

const SEVERITY_OPTIONS = [
  { id: 'low', name: 'Low', color: '#10B981' },
  { id: 'medium', name: 'Medium', color: '#F59E0B' },
  { id: 'high', name: 'High', color: '#F97316' },
  { id: 'critical', name: 'Critical', color: '#EF4444' },
] as const;

export default function FirstAidKitInspectionScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { inspections, createInspection, generateInspectionNumber, refetch, isLoading } = useSupabaseSafety();
  
  const [activeTab, setActiveTab] = useState<'inspection' | 'history'>('inspection');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKit, setSelectedKit] = useState<string | null>(null);
  const [customLocation, setCustomLocation] = useState('');
  const [showKitPicker, setShowKitPicker] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(() => 
    DEFAULT_CHECKLIST.map(cat => ({ ...cat, expanded: false }))
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [currentFinding, setCurrentFinding] = useState<Partial<Finding> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inspectorName, setInspectorName] = useState('');
  const [itemsRestocked, setItemsRestocked] = useState('');

  const kitHistory = useMemo(() => {
    return inspections
      .filter(i => i.inspection_type === 'first_aid_kit')
      .sort((a, b) => new Date(b.inspection_date || b.created_at).getTime() - new Date(a.inspection_date || a.created_at).getTime());
  }, [inspections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const toggleCategory = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklist(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
    ));
  }, []);

  const updateItemStatus = useCallback((categoryId: string, itemId: string, status: ChecklistItemStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecklist(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item => 
          item.id === itemId ? { ...item, status } : item
        ),
      };
    }));

    if (status === 'fail') {
      const category = checklist.find(c => c.id === categoryId);
      const item = category?.items.find(i => i.id === itemId);
      if (category && item) {
        setCurrentFinding({
          categoryId,
          categoryName: category.name,
          itemId,
          itemText: item.text,
          severity: 'medium',
          notes: '',
          correctiveAction: 'Restock/replace item',
        });
        setShowFindingModal(true);
      }
    }
  }, [checklist]);

  const updateItemNotes = useCallback((categoryId: string, itemId: string, notes: string) => {
    setChecklist(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item => 
          item.id === itemId ? { ...item, notes } : item
        ),
      };
    }));
  }, []);

  const saveFinding = useCallback(() => {
    if (!currentFinding?.categoryId || !currentFinding?.itemId) return;
    
    const newFinding: Finding = {
      id: `finding-${Date.now()}`,
      categoryId: currentFinding.categoryId,
      categoryName: currentFinding.categoryName || '',
      itemId: currentFinding.itemId,
      itemText: currentFinding.itemText || '',
      severity: currentFinding.severity || 'medium',
      notes: currentFinding.notes || '',
      correctiveAction: currentFinding.correctiveAction || '',
    };

    setFindings(prev => [...prev, newFinding]);
    setShowFindingModal(false);
    setCurrentFinding(null);
  }, [currentFinding]);

  const removeFinding = useCallback((findingId: string) => {
    setFindings(prev => prev.filter(f => f.id !== findingId));
  }, []);

  const stats = useMemo(() => {
    let totalItems = 0;
    let passCount = 0;
    let failCount = 0;
    let naCount = 0;
    let uncheckedCount = 0;

    checklist.forEach(cat => {
      cat.items.forEach(item => {
        totalItems++;
        switch (item.status) {
          case 'pass': passCount++; break;
          case 'fail': failCount++; break;
          case 'na': naCount++; break;
          default: uncheckedCount++;
        }
      });
    });

    const checkedItems = totalItems - uncheckedCount - naCount;
    const score = checkedItems > 0 ? Math.round((passCount / checkedItems) * 100) : 0;
    const progress = totalItems > 0 ? Math.round(((totalItems - uncheckedCount) / totalItems) * 100) : 0;

    return { totalItems, passCount, failCount, naCount, uncheckedCount, score, progress };
  }, [checklist]);

  const getKitName = useCallback(() => {
    if (selectedKit === 'custom') return customLocation || 'Custom Location';
    return KIT_LOCATIONS.find(k => k.id === selectedKit)?.name || '';
  }, [selectedKit, customLocation]);

  const selectedKitData = useMemo(() => {
    return KIT_LOCATIONS.find(k => k.id === selectedKit);
  }, [selectedKit]);

  const canSubmit = stats.uncheckedCount === 0 && selectedKit && inspectorName.trim() && (selectedKit !== 'custom' || customLocation.trim());

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all checklist items, select a kit location, and enter inspector name.');
      return;
    }

    const kitName = getKitName();

    Alert.alert(
      'Submit Inspection',
      `Kit: ${kitName}\nScore: ${stats.score}%\nFindings: ${findings.length}\n\nAre you sure you want to submit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              const inspectionNumber = generateInspectionNumber();
              const kit = KIT_LOCATIONS.find(k => k.id === selectedKit);
              
              await createInspection({
                inspection_number: inspectionNumber,
                inspection_type: 'first_aid_kit',
                status: 'completed',
                result: stats.score >= 90 ? 'pass' : stats.score >= 70 ? 'conditional' : 'fail',
                facility_id: null,
                location: kitName,
                area_inspected: kit?.area || 'Unknown',
                scheduled_date: null,
                inspection_date: new Date().toISOString().split('T')[0],
                inspector_name: inspectorName,
                inspector_id: user?.id || null,
                checklist_items: checklist.map(cat => ({
                  categoryId: cat.id,
                  categoryName: cat.name,
                  items: cat.items.map(item => ({
                    id: item.id,
                    text: item.text,
                    status: item.status,
                    notes: item.notes,
                  })),
                })),
                findings: findings,
                deficiencies_found: findings.length,
                corrective_actions_required: findings.length > 0,
                corrective_actions: findings.map(f => `${f.itemText}: ${f.correctiveAction}`).filter(Boolean).join('\n'),
                follow_up_date: findings.length > 0 
                  ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                  : null,
                follow_up_completed: false,
                score: stats.score,
                attachments: [],
                notes: `Kit Type: ${kit?.kitType || 'A'}\nItems Restocked: ${itemsRestocked || 'None'}\n${generalNotes || ''}`.trim(),
                reviewed_by: null,
                reviewed_by_id: null,
                reviewed_at: null,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'First aid kit inspection submitted successfully!');
              
              setSelectedKit(null);
              setCustomLocation('');
              setChecklist(DEFAULT_CHECKLIST.map(cat => ({ ...cat, expanded: false })));
              setFindings([]);
              setGeneralNotes('');
              setInspectorName('');
              setItemsRestocked('');
              setActiveTab('history');
              refetch();
            } catch (error) {
              console.error('[FirstAidKit] Submit error:', error);
              Alert.alert('Error', 'Failed to submit inspection. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, stats, findings, checklist, selectedKit, customLocation, generalNotes, inspectorName, itemsRestocked, user, createInspection, generateInspectionNumber, refetch, getKitName]);

  const resetForm = useCallback(() => {
    Alert.alert(
      'Reset Form',
      'Are you sure you want to clear all entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSelectedKit(null);
            setCustomLocation('');
            setChecklist(DEFAULT_CHECKLIST.map(cat => ({ ...cat, expanded: false })));
            setFindings([]);
            setGeneralNotes('');
            setInspectorName('');
            setItemsRestocked('');
          },
        },
      ]
    );
  }, []);

  const getResultColor = (result: string | null) => {
    switch (result) {
      case 'pass': return '#10B981';
      case 'conditional': return '#F59E0B';
      case 'fail': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const renderInspectionTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#EC4899' + '20' }]}>
          <BriefcaseMedical size={32} color="#EC4899" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>First Aid Kit Inspection</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Monthly inspection and inventory check
        </Text>
      </View>

      <View style={[styles.tipBanner, { backgroundColor: '#EC489915', borderColor: '#EC489930' }]}>
        <AlertCircle size={20} color="#EC4899" />
        <View style={styles.tipContent}>
          <Text style={[styles.tipTitle, { color: '#EC4899' }]}>OSHA Requirement</Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            First aid supplies must be readily available per OSHA 1910.151(b). Check expiration dates and restock depleted items.
          </Text>
        </View>
      </View>

      <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Inspector Name *</Text>
        <TextInput
          style={[styles.infoInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Enter your name"
          placeholderTextColor={colors.textSecondary}
          value={inspectorName}
          onChangeText={setInspectorName}
        />

        <Text style={[styles.infoLabel, { color: colors.textSecondary, marginTop: 12 }]}>Items Restocked Today</Text>
        <TextInput
          style={[styles.infoInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="List any items restocked during inspection..."
          placeholderTextColor={colors.textSecondary}
          value={itemsRestocked}
          onChangeText={setItemsRestocked}
          multiline
        />
      </View>

      <Pressable
        style={[styles.kitSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowKitPicker(true)}
      >
        <View style={styles.kitSelectorLeft}>
          <MapPin size={20} color={colors.primary} />
          <View>
            <Text style={[styles.kitSelectorText, { color: selectedKit ? colors.text : colors.textSecondary }]}>
              {selectedKit ? getKitName() : 'Select Kit Location *'}
            </Text>
            {selectedKitData && (
              <Text style={[styles.kitTypeText, { color: colors.textSecondary }]}>
                Type {selectedKitData.kitType} Kit • {selectedKitData.area}
              </Text>
            )}
          </View>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </Pressable>

      {selectedKit === 'custom' && (
        <TextInput
          style={[styles.customInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Enter custom kit location..."
          placeholderTextColor={colors.textSecondary}
          value={customLocation}
          onChangeText={setCustomLocation}
        />
      )}

      <View style={[styles.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Progress</Text>
          <Text style={[styles.progressPercent, { color: colors.primary }]}>{stats.progress}%</Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${stats.progress}%`, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={[styles.statText, { color: colors.text }]}>{stats.passCount} Pass</Text>
          </View>
          <View style={styles.statItem}>
            <XCircle size={16} color="#EF4444" />
            <Text style={[styles.statText, { color: colors.text }]}>{stats.failCount} Fail</Text>
          </View>
          <View style={styles.statItem}>
            <MinusCircle size={16} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.text }]}>{stats.naCount} N/A</Text>
          </View>
        </View>
        {stats.uncheckedCount === 0 && (
          <View style={[styles.scoreContainer, { backgroundColor: stats.score >= 90 ? '#10B98120' : stats.score >= 70 ? '#F59E0B20' : '#EF444420' }]}>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Final Score</Text>
            <Text style={[styles.scoreValue, { color: stats.score >= 90 ? '#10B981' : stats.score >= 70 ? '#F59E0B' : '#EF4444' }]}>
              {stats.score}%
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Inventory Checklist</Text>

      {checklist.map((category) => {
        const IconComponent = category.icon;
        const categoryStats = {
          pass: category.items.filter(i => i.status === 'pass').length,
          fail: category.items.filter(i => i.status === 'fail').length,
          na: category.items.filter(i => i.status === 'na').length,
          total: category.items.length,
        };

        return (
          <View key={category.id} style={styles.categoryContainer}>
            <Pressable
              style={[styles.categoryHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => toggleCategory(category.id)}
            >
              <View style={styles.categoryHeaderLeft}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                  <IconComponent size={20} color={category.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                  <Text style={[styles.categoryProgress, { color: colors.textSecondary }]}>
                    {categoryStats.pass}/{categoryStats.total - categoryStats.na} stocked
                    {categoryStats.fail > 0 && ` • ${categoryStats.fail} needs restock`}
                  </Text>
                </View>
              </View>
              {category.expanded ? (
                <ChevronUp size={20} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={colors.textSecondary} />
              )}
            </Pressable>

            {category.expanded && (
              <View style={[styles.itemsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {category.items.map((item, index) => (
                  <View 
                    key={item.id} 
                    style={[
                      styles.checklistItem,
                      index < category.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemText, { color: colors.text }]}>{item.text}</Text>
                      {item.minQty && (
                        <Text style={[styles.minQtyText, { color: colors.textSecondary }]}>
                          Min: {item.minQty}
                        </Text>
                      )}
                    </View>
                    <View style={styles.statusButtons}>
                      <Pressable
                        style={[
                          styles.statusButton,
                          item.status === 'pass' && { backgroundColor: '#10B98120' },
                        ]}
                        onPress={() => updateItemStatus(category.id, item.id, 'pass')}
                      >
                        <CheckCircle2 size={20} color={item.status === 'pass' ? '#10B981' : colors.textSecondary} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.statusButton,
                          item.status === 'fail' && { backgroundColor: '#EF444420' },
                        ]}
                        onPress={() => updateItemStatus(category.id, item.id, 'fail')}
                      >
                        <XCircle size={20} color={item.status === 'fail' ? '#EF4444' : colors.textSecondary} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.statusButton,
                          item.status === 'na' && { backgroundColor: colors.border },
                        ]}
                        onPress={() => updateItemStatus(category.id, item.id, 'na')}
                      >
                        <MinusCircle size={20} color={item.status === 'na' ? colors.text : colors.textSecondary} />
                      </Pressable>
                    </View>
                    {item.status !== 'unchecked' && item.status !== 'na' && (
                      <TextInput
                        style={[styles.itemNotes, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="Qty on hand or notes..."
                        placeholderTextColor={colors.textSecondary}
                        value={item.notes}
                        onChangeText={(text) => updateItemNotes(category.id, item.id, text)}
                        multiline
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {findings.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Items Needing Restock ({findings.length})
          </Text>
          {findings.map((finding) => (
            <View 
              key={finding.id} 
              style={[styles.findingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.findingHeader}>
                <View style={[styles.severityBadge, { backgroundColor: SEVERITY_OPTIONS.find(s => s.id === finding.severity)?.color + '20' }]}>
                  <AlertTriangle size={14} color={SEVERITY_OPTIONS.find(s => s.id === finding.severity)?.color} />
                  <Text style={[styles.severityText, { color: SEVERITY_OPTIONS.find(s => s.id === finding.severity)?.color }]}>
                    {finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}
                  </Text>
                </View>
                <Pressable onPress={() => removeFinding(finding.id)} hitSlop={8}>
                  <Trash2 size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={[styles.findingCategory, { color: colors.textSecondary }]}>{finding.categoryName}</Text>
              <Text style={[styles.findingItem, { color: colors.text }]}>{finding.itemText}</Text>
              {finding.notes && (
                <Text style={[styles.findingNotes, { color: colors.textSecondary }]}>{finding.notes}</Text>
              )}
              {finding.correctiveAction && (
                <View style={[styles.correctiveAction, { backgroundColor: colors.background }]}>
                  <Text style={[styles.correctiveLabel, { color: colors.textSecondary }]}>Action Needed:</Text>
                  <Text style={[styles.correctiveText, { color: colors.text }]}>{finding.correctiveAction}</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>General Notes</Text>
      <TextInput
        style={[styles.generalNotes, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        placeholder="Additional observations or supply requests..."
        placeholderTextColor={colors.textSecondary}
        value={generalNotes}
        onChangeText={setGeneralNotes}
        multiline
        numberOfLines={4}
      />

      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={resetForm}
        >
          <Text style={[styles.resetButtonText, { color: colors.text }]}>Reset</Text>
        </Pressable>
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? colors.primary : colors.border },
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Inspection</Text>
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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : kitHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <History size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspections Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Complete your first inspection to see it here
          </Text>
        </View>
      ) : (
        kitHistory.map((inspection) => (
          <Pressable
            key={inspection.id}
            style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.historyHeader}>
              <View style={styles.historyDate}>
                <Calendar size={16} color={colors.primary} />
                <Text style={[styles.historyDateText, { color: colors.text }]}>
                  {new Date(inspection.inspection_date || inspection.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={[styles.resultBadge, { backgroundColor: getResultColor(inspection.result) + '20' }]}>
                <Text style={[styles.resultText, { color: getResultColor(inspection.result) }]}>
                  {inspection.result?.toUpperCase() || 'N/A'}
                </Text>
              </View>
            </View>
            
            <View style={styles.historyDetails}>
              <View style={styles.historyRow}>
                <BriefcaseMedical size={14} color={colors.textSecondary} />
                <Text style={[styles.historyRowText, { color: colors.textSecondary }]}>
                  {inspection.location || 'Unknown Kit'}
                </Text>
              </View>
              <View style={styles.historyRow}>
                <User size={14} color={colors.textSecondary} />
                <Text style={[styles.historyRowText, { color: colors.textSecondary }]}>
                  {inspection.inspector_name || 'Unknown'}
                </Text>
              </View>
            </View>

            <View style={styles.historyStats}>
              <View style={styles.historyStatItem}>
                <Text style={[styles.historyStatValue, { color: colors.text }]}>{inspection.score ?? 0}%</Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>Score</Text>
              </View>
              <View style={[styles.historyStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.historyStatItem}>
                <Text style={[styles.historyStatValue, { color: colors.text }]}>{inspection.deficiencies_found}</Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>Restocks</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, activeTab === 'inspection' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('inspection')}
        >
          <ClipboardCheck size={18} color={activeTab === 'inspection' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'inspection' ? colors.primary : colors.textSecondary }]}>
            New Inspection
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'history' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('history')}
        >
          <History size={18} color={activeTab === 'history' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? colors.primary : colors.textSecondary }]}>
            History ({kitHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'inspection' ? renderInspectionTab() : renderHistoryTab()}

      <Modal
        visible={showKitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKitPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Kit Location</Text>
              <Pressable onPress={() => setShowKitPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.kitList}>
              {KIT_LOCATIONS.map((kit) => (
                <Pressable
                  key={kit.id}
                  style={[
                    styles.kitOption,
                    { borderBottomColor: colors.border },
                    selectedKit === kit.id && { backgroundColor: colors.primary + '10' },
                  ]}
                  onPress={() => {
                    setSelectedKit(kit.id);
                    setShowKitPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.kitOptionContent}>
                    <Text style={[styles.kitOptionText, { color: selectedKit === kit.id ? colors.primary : colors.text }]}>
                      {kit.name}
                    </Text>
                    <Text style={[styles.kitOptionType, { color: colors.textSecondary }]}>
                      Type {kit.kitType} • {kit.area}
                    </Text>
                  </View>
                  {selectedKit === kit.id && <Check size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFindingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFindingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Item Needs Restock</Text>
              <Pressable onPress={() => setShowFindingModal(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.findingForm}>
              <Text style={[styles.findingFormLabel, { color: colors.textSecondary }]}>Item</Text>
              <Text style={[styles.findingFormValue, { color: colors.text }]}>{currentFinding?.itemText}</Text>

              <Text style={[styles.findingFormLabel, { color: colors.textSecondary, marginTop: 16 }]}>Priority</Text>
              <View style={styles.severityOptions}>
                {SEVERITY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[
                      styles.severityOption,
                      { borderColor: option.color },
                      currentFinding?.severity === option.id && { backgroundColor: option.color + '20' },
                    ]}
                    onPress={() => setCurrentFinding(prev => prev ? { ...prev, severity: option.id } : null)}
                  >
                    <Text style={[styles.severityOptionText, { color: option.color }]}>{option.name}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.findingFormLabel, { color: colors.textSecondary, marginTop: 16 }]}>Notes</Text>
              <TextInput
                style={[styles.findingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Current quantity, condition, expiration..."
                placeholderTextColor={colors.textSecondary}
                value={currentFinding?.notes || ''}
                onChangeText={(text) => setCurrentFinding(prev => prev ? { ...prev, notes: text } : null)}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.findingFormLabel, { color: colors.textSecondary, marginTop: 16 }]}>Action Needed</Text>
              <TextInput
                style={[styles.findingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Restock, replace expired, order more..."
                placeholderTextColor={colors.textSecondary}
                value={currentFinding?.correctiveAction || ''}
                onChangeText={(text) => setCurrentFinding(prev => prev ? { ...prev, correctiveAction: text } : null)}
                multiline
                numberOfLines={2}
              />

              <View style={styles.findingButtons}>
                <Pressable
                  style={[styles.findingCancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowFindingModal(false);
                    setCurrentFinding(null);
                  }}
                >
                  <Text style={[styles.findingCancelText, { color: colors.text }]}>Skip</Text>
                </Pressable>
                <Pressable
                  style={[styles.findingSaveButton, { backgroundColor: colors.primary }]}
                  onPress={saveFinding}
                >
                  <Text style={styles.findingSaveText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
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
  title: { fontSize: 24, fontWeight: '700' as const, marginBottom: 4, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const },
  tipBanner: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '600' as const, marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 18 },
  infoSection: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  infoLabel: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  infoInput: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 15 },
  kitSelector: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  kitSelectorLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  kitSelectorText: { fontSize: 15, fontWeight: '500' as const },
  kitTypeText: { fontSize: 12, marginTop: 2 },
  customInput: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 15, marginBottom: 16, marginTop: -8 },
  progressCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 16 },
  progressHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 8 },
  progressTitle: { fontSize: 15, fontWeight: '600' as const },
  progressPercent: { fontSize: 15, fontWeight: '700' as const },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' as const, marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const },
  statItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  statText: { fontSize: 13, fontWeight: '500' as const },
  scoreContainer: { marginTop: 12, padding: 12, borderRadius: 8, alignItems: 'center' as const },
  scoreLabel: { fontSize: 12, marginBottom: 4 },
  scoreValue: { fontSize: 32, fontWeight: '700' as const },
  sectionTitle: { fontSize: 17, fontWeight: '600' as const, marginBottom: 12, marginTop: 8 },
  categoryContainer: { marginBottom: 12 },
  categoryHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: 14, borderRadius: 12, borderWidth: 1 },
  categoryHeaderLeft: { flexDirection: 'row' as const, alignItems: 'center' as const, flex: 1 },
  categoryIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: 12 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 15, fontWeight: '600' as const, marginBottom: 2 },
  categoryProgress: { fontSize: 12 },
  itemsContainer: { marginTop: 4, borderRadius: 12, borderWidth: 1, overflow: 'hidden' as const },
  checklistItem: { padding: 14 },
  itemHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'flex-start' as const, marginBottom: 10 },
  itemText: { fontSize: 14, lineHeight: 20, flex: 1, marginRight: 8 },
  minQtyText: { fontSize: 11, fontWeight: '500' as const },
  statusButtons: { flexDirection: 'row' as const, gap: 8 },
  statusButton: { width: 44, height: 44, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  itemNotes: { marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, fontSize: 13, minHeight: 40 },
  findingCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  findingHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 8 },
  severityBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4 },
  severityText: { fontSize: 12, fontWeight: '600' as const },
  findingCategory: { fontSize: 12, marginBottom: 4 },
  findingItem: { fontSize: 14, fontWeight: '500' as const, marginBottom: 8 },
  findingNotes: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  correctiveAction: { padding: 10, borderRadius: 8 },
  correctiveLabel: { fontSize: 11, fontWeight: '500' as const, marginBottom: 4 },
  correctiveText: { fontSize: 13, lineHeight: 18 },
  generalNotes: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 14, minHeight: 100, textAlignVertical: 'top' as const },
  actionButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 20 },
  resetButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' as const },
  resetButtonText: { fontSize: 15, fontWeight: '600' as const },
  submitButton: { flex: 2, flexDirection: 'row' as const, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
  bottomPadding: { height: 32 },
  loadingContainer: { padding: 40, alignItems: 'center' as const },
  emptyState: { borderRadius: 16, padding: 40, alignItems: 'center' as const, borderWidth: 1 },
  emptyTitle: { fontSize: 18, fontWeight: '600' as const, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' as const },
  historyCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginBottom: 12 },
  historyHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 12 },
  historyDate: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  historyDateText: { fontSize: 15, fontWeight: '600' as const },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  resultText: { fontSize: 12, fontWeight: '700' as const },
  historyDetails: { gap: 6, marginBottom: 12 },
  historyRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  historyRowText: { fontSize: 13 },
  historyStats: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-around' as const, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'transparent' },
  historyStatItem: { alignItems: 'center' as const },
  historyStatValue: { fontSize: 18, fontWeight: '700' as const },
  historyStatLabel: { fontSize: 11, marginTop: 2 },
  historyStatDivider: { width: 1, height: 30 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' as const },
  kitList: { padding: 8 },
  kitOption: { flexDirection: 'row' as const, alignItems: 'center' as const, padding: 14, borderBottomWidth: 1 },
  kitOptionContent: { flex: 1 },
  kitOptionText: { fontSize: 15, fontWeight: '500' as const },
  kitOptionType: { fontSize: 12, marginTop: 2 },
  findingForm: { padding: 16 },
  findingFormLabel: { fontSize: 13, fontWeight: '500' as const, marginBottom: 6 },
  findingFormValue: { fontSize: 15, fontWeight: '500' as const },
  severityOptions: { flexDirection: 'row' as const, gap: 8 },
  severityOption: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' as const },
  severityOptionText: { fontSize: 12, fontWeight: '600' as const },
  findingInput: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 14, minHeight: 80, textAlignVertical: 'top' as const },
  findingButtons: { flexDirection: 'row' as const, gap: 12, marginTop: 20, marginBottom: 20 },
  findingCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' as const },
  findingCancelText: { fontSize: 15, fontWeight: '500' as const },
  findingSaveButton: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center' as const },
  findingSaveText: { color: '#fff', fontSize: 15, fontWeight: '600' as const },
});
