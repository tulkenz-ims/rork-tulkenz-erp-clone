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
  Footprints,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ClipboardCheck,
  History,
  Plus,
  Camera,
  Calendar,
  MapPin,
  User,
  Clock,
  FileText,
  Trash2,
  X,
  Check,
  ChevronRight,
  Shield,
  Flame,
  Zap,
  Settings,
  FlaskConical,
  Siren,
  Move,
  Eye,
  HardHat,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseSafety, SafetyInspection } from '@/hooks/useSupabaseSafety';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

type ChecklistItemStatus = 'pass' | 'fail' | 'na' | 'unchecked';

interface ChecklistItem {
  id: string;
  text: string;
  status: ChecklistItemStatus;
  notes: string;
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
  photo?: string;
}

const INSPECTION_AREAS = [
  { id: 'production', name: 'Production Floor', icon: Settings },
  { id: 'warehouse', name: 'Warehouse', icon: Move },
  { id: 'shipping', name: 'Shipping/Receiving', icon: Move },
  { id: 'offices', name: 'Offices', icon: FileText },
  { id: 'breakroom', name: 'Break Room/Cafeteria', icon: User },
  { id: 'restrooms', name: 'Restrooms', icon: MapPin },
  { id: 'exterior', name: 'Exterior/Parking', icon: MapPin },
  { id: 'maintenance', name: 'Maintenance Shop', icon: Settings },
  { id: 'lab', name: 'Lab/QC Area', icon: FlaskConical },
  { id: 'all', name: 'Facility-Wide', icon: Eye },
];

const DEFAULT_CHECKLIST: Omit<ChecklistCategory, 'expanded'>[] = [
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    icon: ClipboardCheck,
    color: '#3B82F6',
    items: [
      { id: 'hk1', text: 'Aisles and walkways clear of obstructions', status: 'unchecked', notes: '' },
      { id: 'hk2', text: 'Work areas clean and organized', status: 'unchecked', notes: '' },
      { id: 'hk3', text: 'Spills cleaned up promptly', status: 'unchecked', notes: '' },
      { id: 'hk4', text: 'Trash receptacles not overflowing', status: 'unchecked', notes: '' },
      { id: 'hk5', text: 'Materials stored properly', status: 'unchecked', notes: '' },
      { id: 'hk6', text: 'No trip hazards present', status: 'unchecked', notes: '' },
      { id: 'hk7', text: 'Floor markings visible and intact', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'ppe',
    name: 'PPE Compliance',
    icon: HardHat,
    color: '#8B5CF6',
    items: [
      { id: 'ppe1', text: 'All employees wearing required PPE', status: 'unchecked', notes: '' },
      { id: 'ppe2', text: 'PPE in good condition', status: 'unchecked', notes: '' },
      { id: 'ppe3', text: 'Safety glasses worn where required', status: 'unchecked', notes: '' },
      { id: 'ppe4', text: 'Hearing protection worn in designated areas', status: 'unchecked', notes: '' },
      { id: 'ppe5', text: 'Proper footwear being worn', status: 'unchecked', notes: '' },
      { id: 'ppe6', text: 'Gloves worn for appropriate tasks', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'fire',
    name: 'Fire Safety',
    icon: Flame,
    color: '#EF4444',
    items: [
      { id: 'fire1', text: 'Fire extinguishers accessible and unobstructed', status: 'unchecked', notes: '' },
      { id: 'fire2', text: 'Fire extinguisher inspection tags current', status: 'unchecked', notes: '' },
      { id: 'fire3', text: 'Emergency exits clear and unlocked', status: 'unchecked', notes: '' },
      { id: 'fire4', text: 'Exit signs illuminated', status: 'unchecked', notes: '' },
      { id: 'fire5', text: 'No combustibles near heat sources', status: 'unchecked', notes: '' },
      { id: 'fire6', text: 'Sprinkler heads unobstructed (18" clearance)', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical Safety',
    icon: Zap,
    color: '#F59E0B',
    items: [
      { id: 'elec1', text: 'Electrical panels accessible (36" clearance)', status: 'unchecked', notes: '' },
      { id: 'elec2', text: 'No damaged cords or plugs', status: 'unchecked', notes: '' },
      { id: 'elec3', text: 'No overloaded outlets/power strips', status: 'unchecked', notes: '' },
      { id: 'elec4', text: 'Junction boxes properly covered', status: 'unchecked', notes: '' },
      { id: 'elec5', text: 'GFCIs tested and functional', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'machine',
    name: 'Machine Guarding',
    icon: Shield,
    color: '#10B981',
    items: [
      { id: 'mach1', text: 'Machine guards in place and secure', status: 'unchecked', notes: '' },
      { id: 'mach2', text: 'Emergency stops functional and accessible', status: 'unchecked', notes: '' },
      { id: 'mach3', text: 'Lockout/tagout devices available', status: 'unchecked', notes: '' },
      { id: 'mach4', text: 'No bypassed safety interlocks', status: 'unchecked', notes: '' },
      { id: 'mach5', text: 'Light curtains/sensors functional', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'chemical',
    name: 'Chemical Safety',
    icon: FlaskConical,
    color: '#06B6D4',
    items: [
      { id: 'chem1', text: 'Chemicals properly labeled', status: 'unchecked', notes: '' },
      { id: 'chem2', text: 'Secondary containment in place', status: 'unchecked', notes: '' },
      { id: 'chem3', text: 'SDS sheets accessible', status: 'unchecked', notes: '' },
      { id: 'chem4', text: 'Incompatible chemicals stored separately', status: 'unchecked', notes: '' },
      { id: 'chem5', text: 'Spill kits available and stocked', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'emergency',
    name: 'Emergency Equipment',
    icon: Siren,
    color: '#DC2626',
    items: [
      { id: 'emerg1', text: 'First aid kits stocked and accessible', status: 'unchecked', notes: '' },
      { id: 'emerg2', text: 'AED accessible and indicator green', status: 'unchecked', notes: '' },
      { id: 'emerg3', text: 'Eyewash stations functional', status: 'unchecked', notes: '' },
      { id: 'emerg4', text: 'Emergency shower functional', status: 'unchecked', notes: '' },
      { id: 'emerg5', text: 'Emergency phone numbers posted', status: 'unchecked', notes: '' },
      { id: 'emerg6', text: 'Assembly point signs visible', status: 'unchecked', notes: '' },
    ],
  },
  {
    id: 'ergonomics',
    name: 'Ergonomics',
    icon: User,
    color: '#6366F1',
    items: [
      { id: 'ergo1', text: 'Proper lifting techniques observed', status: 'unchecked', notes: '' },
      { id: 'ergo2', text: 'Anti-fatigue mats in standing areas', status: 'unchecked', notes: '' },
      { id: 'ergo3', text: 'Workstations at proper height', status: 'unchecked', notes: '' },
      { id: 'ergo4', text: 'Mechanical aids available for heavy items', status: 'unchecked', notes: '' },
    ],
  },
];

const SEVERITY_OPTIONS = [
  { id: 'low', name: 'Low', color: '#10B981' },
  { id: 'medium', name: 'Medium', color: '#F59E0B' },
  { id: 'high', name: 'High', color: '#F97316' },
  { id: 'critical', name: 'Critical', color: '#EF4444' },
] as const;

export default function DailySafetyWalkScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { inspections, createInspection, generateInspectionNumber, refetch, isLoading } = useSupabaseSafety();
  
  const [activeTab, setActiveTab] = useState<'inspection' | 'history'>('inspection');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>(() => 
    DEFAULT_CHECKLIST.map(cat => ({ ...cat, expanded: false }))
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [currentFinding, setCurrentFinding] = useState<Partial<Finding> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dailyWalkHistory = useMemo(() => {
    return inspections
      .filter(i => i.inspection_type === 'daily_walk')
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
          correctiveAction: '',
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

  const canSubmit = stats.uncheckedCount === 0 && selectedArea;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Please complete all checklist items and select an area before submitting.');
      return;
    }

    Alert.alert(
      'Submit Inspection',
      `Score: ${stats.score}%\nFindings: ${findings.length}\n\nAre you sure you want to submit this inspection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              const inspectionNumber = generateInspectionNumber();
              const area = INSPECTION_AREAS.find(a => a.id === selectedArea);
              
              await createInspection({
                inspection_number: inspectionNumber,
                inspection_type: 'daily_walk',
                status: 'completed',
                result: stats.score >= 90 ? 'pass' : stats.score >= 70 ? 'conditional' : 'fail',
                facility_id: null,
                location: null,
                area_inspected: area?.name || 'Unknown',
                scheduled_date: null,
                inspection_date: new Date().toISOString().split('T')[0],
                inspector_name: user?.email || 'Unknown',
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
                corrective_actions: findings.map(f => f.correctiveAction).filter(Boolean).join('\n'),
                follow_up_date: findings.length > 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
                follow_up_completed: false,
                score: stats.score,
                attachments: [],
                notes: generalNotes || null,
                reviewed_by: null,
                reviewed_by_id: null,
                reviewed_at: null,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Daily safety walk submitted successfully!');
              
              setSelectedArea(null);
              setChecklist(DEFAULT_CHECKLIST.map(cat => ({ ...cat, expanded: false })));
              setFindings([]);
              setGeneralNotes('');
              setActiveTab('history');
              refetch();
            } catch (error) {
              console.error('[DailySafetyWalk] Submit error:', error);
              Alert.alert('Error', 'Failed to submit inspection. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  }, [canSubmit, stats, findings, checklist, selectedArea, generalNotes, user, createInspection, generateInspectionNumber, refetch]);

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
            setSelectedArea(null);
            setChecklist(DEFAULT_CHECKLIST.map(cat => ({ ...cat, expanded: false })));
            setFindings([]);
            setGeneralNotes('');
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
        <View style={[styles.iconContainer, { backgroundColor: '#3B82F6' + '20' }]}>
          <Footprints size={32} color="#3B82F6" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Daily Safety Walk</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      <Pressable
        style={[styles.areaSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setShowAreaPicker(true)}
      >
        <View style={styles.areaSelectorLeft}>
          <MapPin size={20} color={colors.primary} />
          <Text style={[styles.areaSelectorText, { color: selectedArea ? colors.text : colors.textSecondary }]}>
            {selectedArea ? INSPECTION_AREAS.find(a => a.id === selectedArea)?.name : 'Select Inspection Area'}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </Pressable>

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

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Inspection Checklist</Text>

      {checklist.map((category) => {
        const IconComponent = category.icon;
        const categoryStats = {
          pass: category.items.filter(i => i.status === 'pass').length,
          fail: category.items.filter(i => i.status === 'fail').length,
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
                    {categoryStats.pass}/{categoryStats.total - category.items.filter(i => i.status === 'na').length} passed
                    {categoryStats.fail > 0 && ` • ${categoryStats.fail} failed`}
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
                    <Text style={[styles.itemText, { color: colors.text }]}>{item.text}</Text>
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
                        placeholder="Add notes (optional)"
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
            Findings ({findings.length})
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
                  <Text style={[styles.correctiveLabel, { color: colors.textSecondary }]}>Corrective Action:</Text>
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
        placeholder="Additional observations, comments, or follow-up items..."
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
      ) : dailyWalkHistory.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <History size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Inspections Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Complete your first daily safety walk to see it here
          </Text>
        </View>
      ) : (
        dailyWalkHistory.map((inspection) => (
          <Pressable
            key={inspection.id}
            style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.historyHeader}>
              <View style={styles.historyDate}>
                <Calendar size={16} color={colors.primary} />
                <Text style={[styles.historyDateText, { color: colors.text }]}>
                  {new Date(inspection.inspection_date || inspection.created_at).toLocaleDateString('en-US', {
                    weekday: 'short',
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
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.historyRowText, { color: colors.textSecondary }]}>
                  {inspection.area_inspected || 'Unknown Area'}
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
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>Findings</Text>
              </View>
              <View style={[styles.historyStatDivider, { backgroundColor: colors.border }]} />
              <View style={styles.historyStatItem}>
                <Text style={[styles.historyStatValue, { color: inspection.follow_up_completed ? '#10B981' : '#F59E0B' }]}>
                  {inspection.follow_up_completed ? 'Done' : inspection.corrective_actions_required ? 'Pending' : 'N/A'}
                </Text>
                <Text style={[styles.historyStatLabel, { color: colors.textSecondary }]}>Follow-up</Text>
              </View>
            </View>

            {inspection.notes && (
              <Text style={[styles.historyNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                {inspection.notes}
              </Text>
            )}
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
            History ({dailyWalkHistory.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'inspection' ? renderInspectionTab() : renderHistoryTab()}

      <Modal
        visible={showAreaPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAreaPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Inspection Area</Text>
              <Pressable onPress={() => setShowAreaPicker(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.areaList}>
              {INSPECTION_AREAS.map((area) => {
                const AreaIcon = area.icon;
                return (
                  <Pressable
                    key={area.id}
                    style={[
                      styles.areaOption,
                      { borderBottomColor: colors.border },
                      selectedArea === area.id && { backgroundColor: colors.primary + '10' },
                    ]}
                    onPress={() => {
                      setSelectedArea(area.id);
                      setShowAreaPicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <AreaIcon size={20} color={selectedArea === area.id ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.areaOptionText, { color: selectedArea === area.id ? colors.primary : colors.text }]}>
                      {area.name}
                    </Text>
                    {selectedArea === area.id && <Check size={20} color={colors.primary} />}
                  </Pressable>
                );
              })}
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
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Finding</Text>
              <Pressable onPress={() => setShowFindingModal(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.findingForm}>
              <Text style={[styles.findingFormLabel, { color: colors.textSecondary }]}>Failed Item</Text>
              <Text style={[styles.findingFormValue, { color: colors.text }]}>{currentFinding?.itemText}</Text>

              <Text style={[styles.findingFormLabel, { color: colors.textSecondary, marginTop: 16 }]}>Severity</Text>
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

              <Text style={[styles.findingFormLabel, { color: colors.textSecondary, marginTop: 16 }]}>Description</Text>
              <TextInput
                style={[styles.findingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Describe the issue found..."
                placeholderTextColor={colors.textSecondary}
                value={currentFinding?.notes || ''}
                onChangeText={(text) => setCurrentFinding(prev => prev ? { ...prev, notes: text } : null)}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.findingFormLabel, { color: colors.textSecondary, marginTop: 16 }]}>Corrective Action</Text>
              <TextInput
                style={[styles.findingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Required corrective action..."
                placeholderTextColor={colors.textSecondary}
                value={currentFinding?.correctiveAction || ''}
                onChangeText={(text) => setCurrentFinding(prev => prev ? { ...prev, correctiveAction: text } : null)}
                multiline
                numberOfLines={3}
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
                  <Text style={styles.findingSaveText}>Save Finding</Text>
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
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  headerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  areaSelector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  areaSelectorLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  areaSelectorText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  progressCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
  },
  statItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  scoreContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  scoreLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  categoryProgress: {
    fontSize: 12,
  },
  itemsContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  checklistItem: {
    padding: 14,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  statusButtons: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  statusButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemNotes: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    minHeight: 40,
  },
  findingCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  findingHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  severityBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  findingCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  findingItem: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
  },
  findingNotes: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  correctiveAction: {
    padding: 10,
    borderRadius: 8,
  },
  correctiveLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  correctiveText: {
    fontSize: 13,
  },
  generalNotes: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row' as const,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyState: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  historyCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  historyDate: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  historyDateText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  historyDetails: {
    gap: 6,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  historyRowText: {
    fontSize: 13,
  },
  historyStats: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  historyStatItem: {
    alignItems: 'center' as const,
  },
  historyStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  historyStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  historyStatDivider: {
    width: 1,
    height: 30,
  },
  historyNotes: {
    fontSize: 13,
    marginTop: 12,
    fontStyle: 'italic' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  areaList: {
    padding: 16,
  },
  areaOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  areaOptionText: {
    fontSize: 15,
    flex: 1,
  },
  findingForm: {
    padding: 16,
  },
  findingFormLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  findingFormValue: {
    fontSize: 15,
  },
  severityOptions: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  severityOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  findingInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  findingButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  findingCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  findingCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  findingSaveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center' as const,
  },
  findingSaveText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
