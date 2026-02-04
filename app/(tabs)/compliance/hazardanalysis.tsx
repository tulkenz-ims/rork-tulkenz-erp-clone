import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Search,
  ChevronRight,
  ChevronDown,
  Bug,
  Droplets,
  Package,
  Thermometer,
  Wheat,
  Filter,
  BarChart3,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type HazardCategory = 'biological' | 'chemical' | 'physical' | 'allergen' | 'radiological';
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
type LikelihoodLevel = 'rare' | 'unlikely' | 'possible' | 'likely' | 'certain';
type ControlStatus = 'controlled' | 'partially_controlled' | 'uncontrolled' | 'monitoring';

interface HazardAnalysis {
  id: string;
  processStep: string;
  stepNumber: number;
  hazardCategory: HazardCategory;
  hazardDescription: string;
  hazardSource: string;
  severity: SeverityLevel;
  likelihood: LikelihoodLevel;
  riskScore: number;
  requiresPreventiveControl: boolean;
  justification: string;
  controlMeasures: string[];
  controlStatus: ControlStatus;
  verificationMethod: string;
  createdAt: string;
  updatedAt: string;
}

const HAZARD_CONFIG: Record<HazardCategory, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  biological: { label: 'Biological', color: '#DC2626', icon: Bug },
  chemical: { label: 'Chemical', color: '#7C3AED', icon: Droplets },
  physical: { label: 'Physical', color: '#F59E0B', icon: Package },
  allergen: { label: 'Allergen', color: '#EC4899', icon: Wheat },
  radiological: { label: 'Radiological', color: '#0891B2', icon: Thermometer },
};

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; value: number; color: string }> = {
  low: { label: 'Low', value: 1, color: '#10B981' },
  medium: { label: 'Medium', value: 2, color: '#F59E0B' },
  high: { label: 'High', value: 3, color: '#EF4444' },
  critical: { label: 'Critical', value: 4, color: '#DC2626' },
};

const LIKELIHOOD_CONFIG: Record<LikelihoodLevel, { label: string; value: number; color: string }> = {
  rare: { label: 'Rare', value: 1, color: '#10B981' },
  unlikely: { label: 'Unlikely', value: 2, color: '#3B82F6' },
  possible: { label: 'Possible', value: 3, color: '#F59E0B' },
  likely: { label: 'Likely', value: 4, color: '#EF4444' },
  certain: { label: 'Almost Certain', value: 5, color: '#DC2626' },
};

const CONTROL_STATUS_CONFIG: Record<ControlStatus, { label: string; color: string }> = {
  controlled: { label: 'Controlled', color: '#10B981' },
  partially_controlled: { label: 'Partially Controlled', color: '#F59E0B' },
  uncontrolled: { label: 'Uncontrolled', color: '#EF4444' },
  monitoring: { label: 'Monitoring', color: '#3B82F6' },
};

const PROCESS_STEPS = [
  'Receiving', 'Storage - Refrigerated', 'Storage - Frozen', 'Storage - Dry',
  'Thawing', 'Preparation', 'Mixing/Blending', 'Cooking', 'Cooling',
  'Hot Holding', 'Cold Holding', 'Portioning', 'Packaging', 'Labeling',
  'Metal Detection', 'Shipping', 'Display'
];

const MOCK_HAZARDS: HazardAnalysis[] = [
  {
    id: '1',
    processStep: 'Receiving',
    stepNumber: 1,
    hazardCategory: 'biological',
    hazardDescription: 'Pathogenic bacteria (Salmonella, E. coli O157:H7, Listeria monocytogenes) present on raw materials',
    hazardSource: 'Contaminated raw materials from supplier, temperature abuse during transport',
    severity: 'critical',
    likelihood: 'possible',
    riskScore: 12,
    requiresPreventiveControl: true,
    justification: 'Raw produce has historically been associated with pathogen contamination outbreaks',
    controlMeasures: ['Supplier verification program', 'Temperature monitoring at receipt', 'Certificate of Analysis review', 'Visual inspection'],
    controlStatus: 'controlled',
    verificationMethod: 'Review of receiving logs, supplier audit results',
    createdAt: '2025-01-15',
    updatedAt: '2025-12-20',
  },
  {
    id: '2',
    processStep: 'Storage - Refrigerated',
    stepNumber: 2,
    hazardCategory: 'biological',
    hazardDescription: 'Growth of Listeria monocytogenes due to temperature abuse',
    hazardSource: 'Equipment malfunction, door left open, improper temperature settings',
    severity: 'high',
    likelihood: 'unlikely',
    riskScore: 6,
    requiresPreventiveControl: true,
    justification: 'Listeria can grow at refrigeration temperatures if above 41°F',
    controlMeasures: ['Continuous temperature monitoring', 'Alarm systems', 'Preventive maintenance program'],
    controlStatus: 'controlled',
    verificationMethod: 'Daily temperature log review, calibration records',
    createdAt: '2025-01-15',
    updatedAt: '2025-12-20',
  },
  {
    id: '3',
    processStep: 'Preparation',
    stepNumber: 6,
    hazardCategory: 'physical',
    hazardDescription: 'Foreign material contamination (metal fragments, plastic pieces, glass)',
    hazardSource: 'Equipment wear, broken containers, employee personal items',
    severity: 'high',
    likelihood: 'unlikely',
    riskScore: 6,
    requiresPreventiveControl: true,
    justification: 'Physical hazards can cause injury to consumers',
    controlMeasures: ['Metal detection', 'Visual inspection', 'Equipment maintenance', 'Glass policy'],
    controlStatus: 'controlled',
    verificationMethod: 'Metal detector validation, visual inspection records',
    createdAt: '2025-01-15',
    updatedAt: '2025-12-20',
  },
  {
    id: '4',
    processStep: 'Mixing/Blending',
    stepNumber: 7,
    hazardCategory: 'allergen',
    hazardDescription: 'Undeclared allergens due to cross-contact',
    hazardSource: 'Shared equipment, improper cleaning, incorrect ingredient usage',
    severity: 'critical',
    likelihood: 'possible',
    riskScore: 12,
    requiresPreventiveControl: true,
    justification: 'Undeclared allergens are a leading cause of food recalls',
    controlMeasures: ['Allergen cleaning validation', 'Production scheduling', 'Label verification', 'Staff training'],
    controlStatus: 'controlled',
    verificationMethod: 'Allergen swab testing, cleaning verification records',
    createdAt: '2025-01-15',
    updatedAt: '2025-12-20',
  },
  {
    id: '5',
    processStep: 'Preparation',
    stepNumber: 6,
    hazardCategory: 'chemical',
    hazardDescription: 'Chemical contamination from sanitizers or cleaning agents',
    hazardSource: 'Improper rinsing, chemical storage near food, spray drift',
    severity: 'medium',
    likelihood: 'rare',
    riskScore: 2,
    requiresPreventiveControl: false,
    justification: 'Controlled through prerequisite programs (GMP)',
    controlMeasures: ['Chemical storage procedures', 'Proper rinsing protocols', 'Staff training'],
    controlStatus: 'controlled',
    verificationMethod: 'GMP audits, chemical storage inspections',
    createdAt: '2025-01-15',
    updatedAt: '2025-12-20',
  },
];

export default function HazardAnalysisScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [hazards, setHazards] = useState<HazardAnalysis[]>(MOCK_HAZARDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<HazardCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<HazardAnalysis | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(['Receiving', 'Preparation']));

  const [newHazard, setNewHazard] = useState({
    processStep: '',
    hazardCategory: '' as HazardCategory | '',
    hazardDescription: '',
    hazardSource: '',
    severity: '' as SeverityLevel | '',
    likelihood: '' as LikelihoodLevel | '',
    justification: '',
    controlMeasures: '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredHazards = useMemo(() => {
    return hazards.filter(hazard => {
      const matchesSearch = !searchQuery ||
        hazard.hazardDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hazard.processStep.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || hazard.hazardCategory === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [hazards, searchQuery, categoryFilter]);

  const hazardsByStep = useMemo(() => {
    const grouped: Record<string, HazardAnalysis[]> = {};
    filteredHazards.forEach(hazard => {
      if (!grouped[hazard.processStep]) {
        grouped[hazard.processStep] = [];
      }
      grouped[hazard.processStep].push(hazard);
    });
    return grouped;
  }, [filteredHazards]);

  const stats = useMemo(() => {
    const byCategory = Object.keys(HAZARD_CONFIG).reduce((acc, cat) => {
      acc[cat as HazardCategory] = hazards.filter(h => h.hazardCategory === cat).length;
      return acc;
    }, {} as Record<HazardCategory, number>);

    const requiresControl = hazards.filter(h => h.requiresPreventiveControl).length;
    const highRisk = hazards.filter(h => h.riskScore >= 9).length;

    return { total: hazards.length, byCategory, requiresControl, highRisk };
  }, [hazards]);

  const calculateRiskScore = (severity: SeverityLevel, likelihood: LikelihoodLevel): number => {
    return SEVERITY_CONFIG[severity].value * LIKELIHOOD_CONFIG[likelihood].value;
  };

  const getRiskColor = (score: number): string => {
    if (score >= 12) return '#DC2626';
    if (score >= 8) return '#EF4444';
    if (score >= 4) return '#F59E0B';
    return '#10B981';
  };

  const getRiskLabel = (score: number): string => {
    if (score >= 12) return 'Critical';
    if (score >= 8) return 'High';
    if (score >= 4) return 'Medium';
    return 'Low';
  };

  const handleAddHazard = useCallback(() => {
    if (!newHazard.processStep || !newHazard.hazardCategory || !newHazard.hazardDescription || !newHazard.severity || !newHazard.likelihood) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }

    const riskScore = calculateRiskScore(newHazard.severity as SeverityLevel, newHazard.likelihood as LikelihoodLevel);
    const stepNumber = PROCESS_STEPS.indexOf(newHazard.processStep) + 1;

    const hazard: HazardAnalysis = {
      id: Date.now().toString(),
      processStep: newHazard.processStep,
      stepNumber: stepNumber > 0 ? stepNumber : 99,
      hazardCategory: newHazard.hazardCategory as HazardCategory,
      hazardDescription: newHazard.hazardDescription,
      hazardSource: newHazard.hazardSource,
      severity: newHazard.severity as SeverityLevel,
      likelihood: newHazard.likelihood as LikelihoodLevel,
      riskScore,
      requiresPreventiveControl: riskScore >= 6,
      justification: newHazard.justification,
      controlMeasures: newHazard.controlMeasures.split(',').map(s => s.trim()).filter(Boolean),
      controlStatus: 'monitoring',
      verificationMethod: '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setHazards(prev => [...prev, hazard].sort((a, b) => a.stepNumber - b.stepNumber));
    setShowAddModal(false);
    setNewHazard({
      processStep: '',
      hazardCategory: '',
      hazardDescription: '',
      hazardSource: '',
      severity: '',
      likelihood: '',
      justification: '',
      controlMeasures: '',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newHazard]);

  const toggleStep = useCallback((step: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(step)) {
        newSet.delete(step);
      } else {
        newSet.add(step);
      }
      return newSet;
    });
  }, []);

  const openDetail = useCallback((hazard: HazardAnalysis) => {
    setSelectedHazard(hazard);
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: '#EF4444' + '20' }]}>
            <AlertTriangle size={28} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Hazard Analysis</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Systematic identification and evaluation of food safety hazards
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.highRisk}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>High Risk</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.requiresControl}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Controls</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{Object.keys(hazardsByStep).length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Steps</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search hazards..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              { borderColor: !categoryFilter ? colors.primary : colors.border },
              !categoryFilter && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setCategoryFilter(null)}
          >
            <Filter size={14} color={!categoryFilter ? colors.primary : colors.text} />
            <Text style={[styles.filterText, { color: !categoryFilter ? colors.primary : colors.text }]}>All</Text>
          </Pressable>
          {Object.entries(HAZARD_CONFIG).map(([key, config]) => {
            const IconComp = config.icon;
            return (
              <Pressable
                key={key}
                style={[
                  styles.filterChip,
                  { borderColor: categoryFilter === key ? config.color : colors.border },
                  categoryFilter === key && { backgroundColor: config.color + '15' },
                ]}
                onPress={() => setCategoryFilter(categoryFilter === key ? null : key as HazardCategory)}
              >
                <IconComp size={14} color={categoryFilter === key ? config.color : colors.text} />
                <Text style={[styles.filterText, { color: categoryFilter === key ? config.color : colors.text }]}>
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Hazard Analysis by Process Step
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {Object.entries(hazardsByStep)
          .sort(([, a], [, b]) => (a[0]?.stepNumber || 0) - (b[0]?.stepNumber || 0))
          .map(([step, stepHazards]) => {
            const isExpanded = expandedSteps.has(step);
            const stepNumber = stepHazards[0]?.stepNumber || 0;
            const maxRisk = Math.max(...stepHazards.map(h => h.riskScore));

            return (
              <View key={step} style={styles.stepContainer}>
                <Pressable
                  style={[
                    styles.stepHeader,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderLeftWidth: 3,
                      borderLeftColor: getRiskColor(maxRisk),
                    },
                  ]}
                  onPress={() => toggleStep(step)}
                >
                  <View style={styles.stepHeaderLeft}>
                    <View style={[styles.stepNumber, { backgroundColor: getRiskColor(maxRisk) + '20' }]}>
                      <Text style={[styles.stepNumberText, { color: getRiskColor(maxRisk) }]}>{stepNumber}</Text>
                    </View>
                    <View style={styles.stepInfo}>
                      <Text style={[styles.stepName, { color: colors.text }]}>{step}</Text>
                      <Text style={[styles.stepCount, { color: colors.textSecondary }]}>
                        {stepHazards.length} hazard{stepHazards.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  <ChevronDown
                    size={20}
                    color={colors.textSecondary}
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={styles.hazardsList}>
                    {stepHazards.map(hazard => {
                      const hazardConfig = HAZARD_CONFIG[hazard.hazardCategory];
                      const HazardIcon = hazardConfig.icon;
                      const controlConfig = CONTROL_STATUS_CONFIG[hazard.controlStatus];

                      return (
                        <Pressable
                          key={hazard.id}
                          style={({ pressed }) => [
                            styles.hazardCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              opacity: pressed ? 0.9 : 1,
                            },
                          ]}
                          onPress={() => openDetail(hazard)}
                        >
                          <View style={styles.hazardHeader}>
                            <View style={[styles.hazardIcon, { backgroundColor: hazardConfig.color + '20' }]}>
                              <HazardIcon size={16} color={hazardConfig.color} />
                            </View>
                            <View style={styles.hazardInfo}>
                              <Text style={[styles.hazardCategory, { color: hazardConfig.color }]}>
                                {hazardConfig.label}
                              </Text>
                              <Text style={[styles.hazardDescription, { color: colors.text }]} numberOfLines={2}>
                                {hazard.hazardDescription}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.hazardMeta}>
                            <View style={styles.riskSection}>
                              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(hazard.riskScore) + '20' }]}>
                                <BarChart3 size={12} color={getRiskColor(hazard.riskScore)} />
                                <Text style={[styles.riskText, { color: getRiskColor(hazard.riskScore) }]}>
                                  Risk: {hazard.riskScore} ({getRiskLabel(hazard.riskScore)})
                                </Text>
                              </View>
                              {hazard.requiresPreventiveControl && (
                                <View style={[styles.pcBadge, { backgroundColor: '#6366F1' + '20' }]}>
                                  <Text style={[styles.pcText, { color: '#6366F1' }]}>PC Required</Text>
                                </View>
                              )}
                            </View>
                            <View style={[styles.controlBadge, { backgroundColor: controlConfig.color + '15' }]}>
                              <CheckCircle size={12} color={controlConfig.color} />
                              <Text style={[styles.controlText, { color: controlConfig.color }]}>
                                {controlConfig.label}
                              </Text>
                            </View>
                          </View>

                          <ChevronRight size={16} color={colors.textTertiary} style={styles.chevron} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

        {filteredHazards.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AlertTriangle size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Hazards Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Start documenting hazards for each process step
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Hazard</Text>
            <Pressable onPress={handleAddHazard}>
              <Text style={[styles.saveButton, { color: '#EF4444' }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Process Step *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalOptions}>
              {PROCESS_STEPS.map(step => (
                <Pressable
                  key={step}
                  style={[
                    styles.optionButton,
                    { borderColor: newHazard.processStep === step ? colors.primary : colors.border },
                    newHazard.processStep === step && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => setNewHazard(prev => ({ ...prev, processStep: step }))}
                >
                  <Text style={[styles.optionText, { color: newHazard.processStep === step ? colors.primary : colors.text }]}>
                    {step}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Category *</Text>
            <View style={styles.categoryGrid}>
              {Object.entries(HAZARD_CONFIG).map(([key, config]) => {
                const IconComp = config.icon;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.categoryCard,
                      { borderColor: newHazard.hazardCategory === key ? config.color : colors.border },
                      newHazard.hazardCategory === key && { backgroundColor: config.color + '15' },
                    ]}
                    onPress={() => setNewHazard(prev => ({ ...prev, hazardCategory: key as HazardCategory }))}
                  >
                    <IconComp size={20} color={newHazard.hazardCategory === key ? config.color : colors.textSecondary} />
                    <Text style={[styles.categoryLabel, { color: newHazard.hazardCategory === key ? config.color : colors.text }]}>
                      {config.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Description *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe the specific hazard..."
              placeholderTextColor={colors.textTertiary}
              value={newHazard.hazardDescription}
              onChangeText={(text) => setNewHazard(prev => ({ ...prev, hazardDescription: text }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Hazard Source</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Where does this hazard originate?"
              placeholderTextColor={colors.textTertiary}
              value={newHazard.hazardSource}
              onChangeText={(text) => setNewHazard(prev => ({ ...prev, hazardSource: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Severity *</Text>
            <View style={styles.ratingRow}>
              {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.ratingOption,
                    { borderColor: newHazard.severity === key ? config.color : colors.border },
                    newHazard.severity === key && { backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => setNewHazard(prev => ({ ...prev, severity: key as SeverityLevel }))}
                >
                  <Text style={[styles.ratingValue, { color: newHazard.severity === key ? config.color : colors.text }]}>
                    {config.value}
                  </Text>
                  <Text style={[styles.ratingLabel, { color: newHazard.severity === key ? config.color : colors.textSecondary }]}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Likelihood *</Text>
            <View style={styles.ratingRow}>
              {Object.entries(LIKELIHOOD_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.ratingOption,
                    { borderColor: newHazard.likelihood === key ? config.color : colors.border },
                    newHazard.likelihood === key && { backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => setNewHazard(prev => ({ ...prev, likelihood: key as LikelihoodLevel }))}
                >
                  <Text style={[styles.ratingValue, { color: newHazard.likelihood === key ? config.color : colors.text }]}>
                    {config.value}
                  </Text>
                  <Text style={[styles.ratingLabel, { color: newHazard.likelihood === key ? config.color : colors.textSecondary }]}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {newHazard.severity && newHazard.likelihood && (
              <View style={[styles.riskPreview, { backgroundColor: getRiskColor(calculateRiskScore(newHazard.severity as SeverityLevel, newHazard.likelihood as LikelihoodLevel)) + '20' }]}>
                <Text style={[styles.riskPreviewText, { color: getRiskColor(calculateRiskScore(newHazard.severity as SeverityLevel, newHazard.likelihood as LikelihoodLevel)) }]}>
                  Risk Score: {calculateRiskScore(newHazard.severity as SeverityLevel, newHazard.likelihood as LikelihoodLevel)} - {getRiskLabel(calculateRiskScore(newHazard.severity as SeverityLevel, newHazard.likelihood as LikelihoodLevel))}
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.text }]}>Justification</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Why is this hazard significant?"
              placeholderTextColor={colors.textTertiary}
              value={newHazard.justification}
              onChangeText={(text) => setNewHazard(prev => ({ ...prev, justification: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Control Measures (comma separated)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Temperature monitoring, Supplier verification, Visual inspection"
              placeholderTextColor={colors.textTertiary}
              value={newHazard.controlMeasures}
              onChangeText={(text) => setNewHazard(prev => ({ ...prev, controlMeasures: text }))}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <X size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Hazard Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedHazard && (() => {
            const hazardConfig = HAZARD_CONFIG[selectedHazard.hazardCategory];
            const HazardIcon = hazardConfig.icon;
            const controlConfig = CONTROL_STATUS_CONFIG[selectedHazard.controlStatus];

            return (
              <ScrollView style={styles.modalContent}>
                <View style={[styles.detailHeader, { backgroundColor: hazardConfig.color + '15' }]}>
                  <View style={[styles.detailIcon, { backgroundColor: hazardConfig.color + '30' }]}>
                    <HazardIcon size={28} color={hazardConfig.color} />
                  </View>
                  <Text style={[styles.detailTitle, { color: colors.text }]}>{hazardConfig.label} Hazard</Text>
                  <Text style={[styles.detailStep, { color: colors.textSecondary }]}>
                    Step {selectedHazard.stepNumber}: {selectedHazard.processStep}
                  </Text>
                </View>

                <View style={[styles.riskCard, { backgroundColor: getRiskColor(selectedHazard.riskScore) + '15', borderColor: getRiskColor(selectedHazard.riskScore) }]}>
                  <View style={styles.riskRow}>
                    <View style={styles.riskItem}>
                      <Text style={[styles.riskItemLabel, { color: colors.textSecondary }]}>Severity</Text>
                      <Text style={[styles.riskItemValue, { color: SEVERITY_CONFIG[selectedHazard.severity].color }]}>
                        {SEVERITY_CONFIG[selectedHazard.severity].label} ({SEVERITY_CONFIG[selectedHazard.severity].value})
                      </Text>
                    </View>
                    <Text style={[styles.riskMultiply, { color: colors.textSecondary }]}>×</Text>
                    <View style={styles.riskItem}>
                      <Text style={[styles.riskItemLabel, { color: colors.textSecondary }]}>Likelihood</Text>
                      <Text style={[styles.riskItemValue, { color: LIKELIHOOD_CONFIG[selectedHazard.likelihood].color }]}>
                        {LIKELIHOOD_CONFIG[selectedHazard.likelihood].label} ({LIKELIHOOD_CONFIG[selectedHazard.likelihood].value})
                      </Text>
                    </View>
                    <Text style={[styles.riskEquals, { color: colors.textSecondary }]}>=</Text>
                    <View style={styles.riskItem}>
                      <Text style={[styles.riskItemLabel, { color: colors.textSecondary }]}>Risk Score</Text>
                      <Text style={[styles.riskItemValue, { color: getRiskColor(selectedHazard.riskScore) }]}>
                        {selectedHazard.riskScore}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Hazard Description</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.detailText, { color: colors.text }]}>{selectedHazard.hazardDescription}</Text>
                </View>

                {selectedHazard.hazardSource && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Source</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.detailText, { color: colors.text }]}>{selectedHazard.hazardSource}</Text>
                    </View>
                  </>
                )}

                {selectedHazard.justification && (
                  <>
                    <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Justification</Text>
                    <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.detailText, { color: colors.text }]}>{selectedHazard.justification}</Text>
                    </View>
                  </>
                )}

                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Control Measures</Text>
                <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {selectedHazard.controlMeasures.map((measure, index) => (
                    <View key={index} style={styles.controlMeasureItem}>
                      <CheckCircle size={14} color="#10B981" />
                      <Text style={[styles.controlMeasureText, { color: colors.text }]}>{measure}</Text>
                    </View>
                  ))}
                  <View style={[styles.controlStatusRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 }]}>
                    <Text style={[styles.controlStatusLabel, { color: colors.textSecondary }]}>Status:</Text>
                    <View style={[styles.controlBadge, { backgroundColor: controlConfig.color + '15' }]}>
                      <Text style={[styles.controlText, { color: controlConfig.color }]}>{controlConfig.label}</Text>
                    </View>
                  </View>
                </View>

                {selectedHazard.requiresPreventiveControl && (
                  <View style={[styles.pcRequired, { backgroundColor: '#6366F1' + '15', borderColor: '#6366F1' }]}>
                    <AlertTriangle size={18} color="#6366F1" />
                    <Text style={[styles.pcRequiredText, { color: '#6366F1' }]}>
                      This hazard requires a Preventive Control per FSMA
                    </Text>
                  </View>
                )}

                <View style={styles.bottomPadding} />
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center' as const,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700' as const },
  statLabel: { fontSize: 10, fontWeight: '500' as const, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  filterRow: { marginBottom: 16 },
  filterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  filterText: { fontSize: 13, fontWeight: '500' as const },
  listHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' as const },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' as const },
  stepContainer: { marginBottom: 12 },
  stepHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  stepNumberText: { fontSize: 14, fontWeight: '700' as const },
  stepInfo: { flex: 1 },
  stepName: { fontSize: 15, fontWeight: '600' as const },
  stepCount: { fontSize: 12, marginTop: 2 },
  hazardsList: { marginTop: 8, gap: 8 },
  hazardCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginLeft: 16,
  },
  hazardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 10,
  },
  hazardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 10,
  },
  hazardInfo: { flex: 1 },
  hazardCategory: { fontSize: 11, fontWeight: '600' as const, marginBottom: 2 },
  hazardDescription: { fontSize: 13, lineHeight: 18 },
  hazardMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  riskSection: { flexDirection: 'row' as const, gap: 6 },
  riskBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  riskText: { fontSize: 11, fontWeight: '600' as const },
  pcBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pcText: { fontSize: 10, fontWeight: '600' as const },
  controlBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  controlText: { fontSize: 11, fontWeight: '500' as const },
  chevron: { position: 'absolute' as const, right: 12, top: 12 },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center' as const,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, marginTop: 12, marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' as const },
  bottomPadding: { height: 32 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' as const },
  saveButton: { fontSize: 16, fontWeight: '600' as const },
  modalContent: { flex: 1, padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600' as const, marginBottom: 8, marginTop: 16 },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  horizontalOptions: { flexDirection: 'row' as const },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: { fontSize: 13, fontWeight: '500' as const },
  categoryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  categoryCard: {
    width: '48%' as const,
    flexGrow: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center' as const,
    gap: 6,
  },
  categoryLabel: { fontSize: 12, fontWeight: '500' as const },
  ratingRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  ratingOption: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  ratingValue: { fontSize: 18, fontWeight: '700' as const },
  ratingLabel: { fontSize: 10, marginTop: 2 },
  riskPreview: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center' as const,
  },
  riskPreviewText: { fontSize: 14, fontWeight: '600' as const },
  detailHeader: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 10,
  },
  detailTitle: { fontSize: 18, fontWeight: '700' as const },
  detailStep: { fontSize: 13, marginTop: 4 },
  riskCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  riskRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  riskItem: { alignItems: 'center' as const },
  riskItemLabel: { fontSize: 10 },
  riskItemValue: { fontSize: 14, fontWeight: '600' as const },
  riskMultiply: { fontSize: 16 },
  riskEquals: { fontSize: 16 },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  detailText: { fontSize: 14, lineHeight: 20 },
  controlMeasureItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 8,
  },
  controlMeasureText: { flex: 1, fontSize: 13 },
  controlStatusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  controlStatusLabel: { fontSize: 13 },
  pcRequired: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  pcRequiredText: { flex: 1, fontSize: 13, fontWeight: '500' as const },
});
