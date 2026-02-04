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
  Truck,
  CheckCircle,
  Clock,
  Search,
  ChevronRight,
  Building2,
  FileText,
  Calendar,
  AlertTriangle,
  Shield,
  MapPin,
  Star,
  ClipboardCheck,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type SupplierStatus = 'approved' | 'conditional' | 'pending' | 'suspended' | 'rejected';
type VerificationActivity = 'audit' | 'coa_review' | 'testing' | 'questionnaire' | 'certification_review';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface VerificationRecord {
  id: string;
  activityType: VerificationActivity;
  date: string;
  result: 'pass' | 'fail' | 'conditional';
  findings?: string;
  performedBy: string;
  nextDue?: string;
}

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  materialSupplied: string[];
  hazardsControlled: string[];
  riskLevel: RiskLevel;
  status: SupplierStatus;
  approvalDate: string;
  lastAuditDate?: string;
  nextAuditDate?: string;
  certifications: string[];
  verificationActivities: VerificationRecord[];
  coaRequired: boolean;
  coaFrequency?: string;
  notes?: string;
  scorecard: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<SupplierStatus, { label: string; color: string }> = {
  approved: { label: 'Approved', color: '#10B981' },
  conditional: { label: 'Conditional', color: '#F59E0B' },
  pending: { label: 'Pending', color: '#6B7280' },
  suspended: { label: 'Suspended', color: '#EF4444' },
  rejected: { label: 'Rejected', color: '#DC2626' },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: 'Low Risk', color: '#10B981' },
  medium: { label: 'Medium Risk', color: '#F59E0B' },
  high: { label: 'High Risk', color: '#EF4444' },
  critical: { label: 'Critical Risk', color: '#DC2626' },
};

const VERIFICATION_CONFIG: Record<VerificationActivity, { label: string; color: string }> = {
  audit: { label: 'On-Site Audit', color: '#6366F1' },
  coa_review: { label: 'COA Review', color: '#3B82F6' },
  testing: { label: 'Product Testing', color: '#10B981' },
  questionnaire: { label: 'Questionnaire', color: '#F59E0B' },
  certification_review: { label: 'Certification Review', color: '#8B5CF6' },
};

const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: '1',
    name: 'Fresh Farms Produce Co.',
    supplierCode: 'SUP-001',
    address: '123 Agricultural Way, Salinas, CA 93901',
    contactName: 'Maria Rodriguez',
    contactEmail: 'maria@freshfarms.com',
    contactPhone: '(831) 555-0123',
    materialSupplied: ['Romaine Lettuce', 'Iceberg Lettuce', 'Spring Mix'],
    hazardsControlled: ['Pathogenic bacteria (E. coli, Salmonella)', 'Physical hazards', 'Pesticide residues'],
    riskLevel: 'high',
    status: 'approved',
    approvalDate: '2024-03-15',
    lastAuditDate: '2025-09-20',
    nextAuditDate: '2026-09-20',
    certifications: ['GFSI Certified', 'LGMA Compliant', 'Organic (USDA)'],
    verificationActivities: [
      { id: 'v1', activityType: 'audit', date: '2025-09-20', result: 'pass', performedBy: 'QA Team', nextDue: '2026-09-20' },
      { id: 'v2', activityType: 'coa_review', date: '2026-01-25', result: 'pass', performedBy: 'Receiving', nextDue: 'Each shipment' },
    ],
    coaRequired: true,
    coaFrequency: 'Each shipment',
    scorecard: 92,
    createdAt: '2024-01-10',
    updatedAt: '2026-01-25',
  },
  {
    id: '2',
    name: 'Premium Protein Inc.',
    supplierCode: 'SUP-002',
    address: '456 Meat Processing Blvd, Omaha, NE 68102',
    contactName: 'John Smith',
    contactEmail: 'john.smith@premiumprotein.com',
    contactPhone: '(402) 555-0456',
    materialSupplied: ['Ground Beef', 'Chicken Breast', 'Turkey'],
    hazardsControlled: ['Pathogenic bacteria', 'Allergens', 'Foreign material'],
    riskLevel: 'critical',
    status: 'approved',
    approvalDate: '2023-11-01',
    lastAuditDate: '2025-11-15',
    nextAuditDate: '2026-05-15',
    certifications: ['SQF Level 2', 'USDA Inspected'],
    verificationActivities: [
      { id: 'v3', activityType: 'audit', date: '2025-11-15', result: 'pass', performedBy: 'External Auditor', nextDue: '2026-05-15' },
      { id: 'v4', activityType: 'testing', date: '2026-01-20', result: 'pass', performedBy: 'Lab', nextDue: '2026-02-20' },
    ],
    coaRequired: true,
    coaFrequency: 'Each lot',
    scorecard: 88,
    createdAt: '2023-10-15',
    updatedAt: '2026-01-20',
  },
  {
    id: '3',
    name: 'Global Spice Trading',
    supplierCode: 'SUP-003',
    address: '789 Import Ave, Long Beach, CA 90802',
    contactName: 'Aisha Patel',
    contactEmail: 'apatel@globalspice.com',
    contactPhone: '(562) 555-0789',
    materialSupplied: ['Black Pepper', 'Cumin', 'Paprika', 'Turmeric'],
    hazardsControlled: ['Salmonella', 'Heavy metals', 'Pesticide residues', 'Allergen cross-contact'],
    riskLevel: 'high',
    status: 'conditional',
    approvalDate: '2025-06-01',
    lastAuditDate: '2025-06-01',
    nextAuditDate: '2026-03-01',
    certifications: ['FSSC 22000'],
    verificationActivities: [
      { id: 'v5', activityType: 'audit', date: '2025-06-01', result: 'conditional', findings: 'Minor NC on allergen control documentation', performedBy: 'QA Manager', nextDue: '2026-03-01' },
    ],
    coaRequired: true,
    coaFrequency: 'Each lot',
    notes: 'Follow-up audit scheduled to verify corrective actions',
    scorecard: 75,
    createdAt: '2025-05-01',
    updatedAt: '2025-12-15',
  },
];

export default function SupplyChainVerificationScreen() {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'verification' | 'materials'>('info');

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    supplierCode: '',
    address: '',
    contactName: '',
    contactEmail: '',
    materialSupplied: '',
    riskLevel: '' as RiskLevel | '',
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchQuery ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.supplierCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = !statusFilter || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: suppliers.length,
    approved: suppliers.filter(s => s.status === 'approved').length,
    conditional: suppliers.filter(s => s.status === 'conditional').length,
    highRisk: suppliers.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length,
  }), [suppliers]);

  const handleAddSupplier = useCallback(() => {
    if (!newSupplier.name || !newSupplier.supplierCode || !newSupplier.riskLevel) {
      Alert.alert('Required Fields', 'Please fill in name, supplier code, and risk level.');
      return;
    }

    const supplier: Supplier = {
      id: Date.now().toString(),
      name: newSupplier.name,
      supplierCode: newSupplier.supplierCode,
      address: newSupplier.address,
      contactName: newSupplier.contactName,
      contactEmail: newSupplier.contactEmail,
      contactPhone: '',
      materialSupplied: newSupplier.materialSupplied.split(',').map(s => s.trim()).filter(Boolean),
      hazardsControlled: [],
      riskLevel: newSupplier.riskLevel as RiskLevel,
      status: 'pending',
      approvalDate: '',
      certifications: [],
      verificationActivities: [],
      coaRequired: true,
      scorecard: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setSuppliers(prev => [supplier, ...prev]);
    setShowAddModal(false);
    setNewSupplier({ name: '', supplierCode: '', address: '', contactName: '', contactEmail: '', materialSupplied: '', riskLevel: '' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newSupplier]);

  const openDetail = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setActiveTab('info');
    setShowDetailModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const getScorecardColor = (score: number) => {
    if (score >= 90) return '#10B981';
    if (score >= 80) return '#3B82F6';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

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
          <View style={[styles.iconContainer, { backgroundColor: '#F59E0B' + '20' }]}>
            <Truck size={28} color="#F59E0B" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Supply Chain Verification</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            FSMA supply chain program for raw material suppliers
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Suppliers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.approved}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.conditional}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Conditional</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.highRisk}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>High Risk</Text>
          </View>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search suppliers..."
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
              { borderColor: !statusFilter ? colors.primary : colors.border },
              !statusFilter && { backgroundColor: colors.primary + '15' },
            ]}
            onPress={() => setStatusFilter(null)}
          >
            <Text style={[styles.filterText, { color: !statusFilter ? colors.primary : colors.text }]}>All</Text>
          </Pressable>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Pressable
              key={key}
              style={[
                styles.filterChip,
                { borderColor: statusFilter === key ? config.color : colors.border },
                statusFilter === key && { backgroundColor: config.color + '15' },
              ]}
              onPress={() => setStatusFilter(statusFilter === key ? null : key as SupplierStatus)}
            >
              <Text style={[styles.filterText, { color: statusFilter === key ? config.color : colors.text }]}>
                {config.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Approved Suppliers ({filteredSuppliers.length})
          </Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {filteredSuppliers.map(supplier => {
          const statusConfig = STATUS_CONFIG[supplier.status];
          const riskConfig = RISK_CONFIG[supplier.riskLevel];

          return (
            <Pressable
              key={supplier.id}
              style={({ pressed }) => [
                styles.supplierCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftWidth: 3,
                  borderLeftColor: statusConfig.color,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => openDetail(supplier)}
            >
              <View style={styles.supplierHeader}>
                <View style={styles.supplierInfo}>
                  <Text style={[styles.supplierCode, { color: colors.textSecondary }]}>{supplier.supplierCode}</Text>
                  <Text style={[styles.supplierName, { color: colors.text }]}>{supplier.name}</Text>
                </View>
                <View style={styles.supplierBadges}>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.supplierMeta}>
                <View style={styles.metaItem}>
                  <MapPin size={12} color={colors.textTertiary} />
                  <Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
                    {supplier.address.split(',')[1]?.trim() || supplier.address}
                  </Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: riskConfig.color + '15' }]}>
                  <AlertTriangle size={12} color={riskConfig.color} />
                  <Text style={[styles.riskText, { color: riskConfig.color }]}>{riskConfig.label}</Text>
                </View>
              </View>

              <View style={styles.materialsRow}>
                {supplier.materialSupplied.slice(0, 3).map((material, index) => (
                  <View key={index} style={[styles.materialChip, { backgroundColor: colors.background }]}>
                    <Text style={[styles.materialText, { color: colors.text }]}>{material}</Text>
                  </View>
                ))}
                {supplier.materialSupplied.length > 3 && (
                  <Text style={[styles.moreText, { color: colors.textSecondary }]}>
                    +{supplier.materialSupplied.length - 3} more
                  </Text>
                )}
              </View>

              <View style={styles.supplierFooter}>
                <View style={styles.scoreSection}>
                  <Star size={14} color={getScorecardColor(supplier.scorecard)} />
                  <Text style={[styles.scoreText, { color: getScorecardColor(supplier.scorecard) }]}>
                    Score: {supplier.scorecard}%
                  </Text>
                </View>
                {supplier.nextAuditDate && (
                  <View style={styles.auditInfo}>
                    <Calendar size={12} color={colors.textTertiary} />
                    <Text style={[styles.auditText, { color: colors.textSecondary }]}>
                      Next Audit: {supplier.nextAuditDate}
                    </Text>
                  </View>
                )}
              </View>

              <ChevronRight size={18} color={colors.textTertiary} style={styles.chevron} />
            </Pressable>
          );
        })}

        {filteredSuppliers.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Truck size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Suppliers Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add suppliers to your approved supplier list
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Supplier</Text>
            <Pressable onPress={handleAddSupplier}>
              <Text style={[styles.saveButton, { color: '#F59E0B' }]}>Save</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Supplier Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Company name"
              placeholderTextColor={colors.textTertiary}
              value={newSupplier.name}
              onChangeText={(text) => setNewSupplier(prev => ({ ...prev, name: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Supplier Code *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., SUP-001"
              placeholderTextColor={colors.textTertiary}
              value={newSupplier.supplierCode}
              onChangeText={(text) => setNewSupplier(prev => ({ ...prev, supplierCode: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Address</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Full address"
              placeholderTextColor={colors.textTertiary}
              value={newSupplier.address}
              onChangeText={(text) => setNewSupplier(prev => ({ ...prev, address: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Contact Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Primary contact"
              placeholderTextColor={colors.textTertiary}
              value={newSupplier.contactName}
              onChangeText={(text) => setNewSupplier(prev => ({ ...prev, contactName: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Contact Email</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="email@supplier.com"
              placeholderTextColor={colors.textTertiary}
              value={newSupplier.contactEmail}
              onChangeText={(text) => setNewSupplier(prev => ({ ...prev, contactEmail: text }))}
              keyboardType="email-address"
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Materials Supplied (comma separated)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Lettuce, Tomatoes, Onions"
              placeholderTextColor={colors.textTertiary}
              value={newSupplier.materialSupplied}
              onChangeText={(text) => setNewSupplier(prev => ({ ...prev, materialSupplied: text }))}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>Risk Level *</Text>
            <View style={styles.riskOptions}>
              {Object.entries(RISK_CONFIG).map(([key, config]) => (
                <Pressable
                  key={key}
                  style={[
                    styles.riskOption,
                    { borderColor: newSupplier.riskLevel === key ? config.color : colors.border },
                    newSupplier.riskLevel === key && { backgroundColor: config.color + '15' },
                  ]}
                  onPress={() => setNewSupplier(prev => ({ ...prev, riskLevel: key as RiskLevel }))}
                >
                  <Text style={[styles.riskOptionText, { color: newSupplier.riskLevel === key ? config.color : colors.text }]}>
                    {config.label}
                  </Text>
                </Pressable>
              ))}
            </View>

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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Supplier Details</Text>
            <View style={{ width: 40 }} />
          </View>

          {selectedSupplier && (() => {
            const statusConfig = STATUS_CONFIG[selectedSupplier.status];
            const riskConfig = RISK_CONFIG[selectedSupplier.riskLevel];

            return (
              <>
                <View style={styles.tabBar}>
                  {(['info', 'verification', 'materials'] as const).map(tab => (
                    <Pressable
                      key={tab}
                      style={[
                        styles.tab,
                        activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text style={[
                        styles.tabText,
                        { color: activeTab === tab ? colors.primary : colors.textSecondary },
                      ]}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <ScrollView style={styles.modalContent}>
                  {activeTab === 'info' && (
                    <>
                      <View style={[styles.detailHeader, { backgroundColor: statusConfig.color + '15' }]}>
                        <View style={[styles.detailIcon, { backgroundColor: statusConfig.color + '30' }]}>
                          <Building2 size={28} color={statusConfig.color} />
                        </View>
                        <Text style={[styles.detailCode, { color: colors.textSecondary }]}>{selectedSupplier.supplierCode}</Text>
                        <Text style={[styles.detailName, { color: colors.text }]}>{selectedSupplier.name}</Text>
                        <View style={styles.detailBadges}>
                          <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                          </View>
                          <View style={[styles.riskBadge, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.riskText, { color: riskConfig.color }]}>{riskConfig.label}</Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.scoreCard, { backgroundColor: getScorecardColor(selectedSupplier.scorecard) + '15', borderColor: getScorecardColor(selectedSupplier.scorecard) }]}>
                        <Star size={24} color={getScorecardColor(selectedSupplier.scorecard)} />
                        <View style={styles.scoreInfo}>
                          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Supplier Scorecard</Text>
                          <Text style={[styles.scoreValue, { color: getScorecardColor(selectedSupplier.scorecard) }]}>
                            {selectedSupplier.scorecard}%
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Contact Information</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Contact</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.contactName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Email</Text>
                          <Text style={[styles.detailValue, { color: colors.primary }]}>{selectedSupplier.contactEmail}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Phone</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.contactPhone}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Address</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.address}</Text>
                        </View>
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Certifications</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedSupplier.certifications.map((cert, index) => (
                          <View key={index} style={styles.certItem}>
                            <Shield size={14} color="#10B981" />
                            <Text style={[styles.certText, { color: colors.text }]}>{cert}</Text>
                          </View>
                        ))}
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Audit Schedule</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Audit</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.lastAuditDate || 'Not audited'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next Audit</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.nextAuditDate || 'Not scheduled'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Approval Date</Text>
                          <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.approvalDate || 'Pending'}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {activeTab === 'verification' && (
                    <>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Verification Activities</Text>
                      {selectedSupplier.verificationActivities.map(activity => {
                        const actConfig = VERIFICATION_CONFIG[activity.activityType];
                        return (
                          <View
                            key={activity.id}
                            style={[
                              styles.verificationCard,
                              {
                                backgroundColor: colors.surface,
                                borderColor: colors.border,
                                borderLeftWidth: 3,
                                borderLeftColor: activity.result === 'pass' ? '#10B981' : activity.result === 'conditional' ? '#F59E0B' : '#EF4444',
                              },
                            ]}
                          >
                            <View style={styles.verificationHeader}>
                              <View style={[styles.activityBadge, { backgroundColor: actConfig.color + '15' }]}>
                                <Text style={[styles.activityText, { color: actConfig.color }]}>{actConfig.label}</Text>
                              </View>
                              <View style={[
                                styles.resultBadge,
                                { backgroundColor: activity.result === 'pass' ? '#10B981' + '15' : activity.result === 'conditional' ? '#F59E0B' + '15' : '#EF4444' + '15' }
                              ]}>
                                {activity.result === 'pass' ? (
                                  <CheckCircle size={12} color="#10B981" />
                                ) : (
                                  <AlertTriangle size={12} color={activity.result === 'conditional' ? '#F59E0B' : '#EF4444'} />
                                )}
                                <Text style={[
                                  styles.resultText,
                                  { color: activity.result === 'pass' ? '#10B981' : activity.result === 'conditional' ? '#F59E0B' : '#EF4444' }
                                ]}>
                                  {activity.result.charAt(0).toUpperCase() + activity.result.slice(1)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.verificationDetails}>
                              <Text style={[styles.verificationDate, { color: colors.text }]}>Date: {activity.date}</Text>
                              <Text style={[styles.verificationBy, { color: colors.textSecondary }]}>By: {activity.performedBy}</Text>
                            </View>
                            {activity.findings && (
                              <Text style={[styles.findingsText, { color: colors.text }]}>Findings: {activity.findings}</Text>
                            )}
                            {activity.nextDue && (
                              <View style={[styles.nextDueBox, { backgroundColor: colors.background }]}>
                                <Clock size={12} color={colors.primary} />
                                <Text style={[styles.nextDueText, { color: colors.text }]}>Next Due: {activity.nextDue}</Text>
                              </View>
                            )}
                          </View>
                        );
                      })}

                      <View style={[styles.coaSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.coaHeader}>
                          <FileText size={18} color={colors.primary} />
                          <Text style={[styles.coaTitle, { color: colors.text }]}>COA Requirements</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>COA Required</Text>
                          <Text style={[styles.detailValue, { color: selectedSupplier.coaRequired ? '#10B981' : '#EF4444' }]}>
                            {selectedSupplier.coaRequired ? 'Yes' : 'No'}
                          </Text>
                        </View>
                        {selectedSupplier.coaFrequency && (
                          <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Frequency</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSupplier.coaFrequency}</Text>
                          </View>
                        )}
                      </View>
                    </>
                  )}

                  {activeTab === 'materials' && (
                    <>
                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Materials Supplied</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedSupplier.materialSupplied.map((material, index) => (
                          <View key={index} style={styles.materialItem}>
                            <CheckCircle size={14} color="#10B981" />
                            <Text style={[styles.materialItemText, { color: colors.text }]}>{material}</Text>
                          </View>
                        ))}
                      </View>

                      <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Hazards Controlled by Supplier</Text>
                      <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {selectedSupplier.hazardsControlled.map((hazard, index) => (
                          <View key={index} style={styles.hazardItem}>
                            <AlertTriangle size={14} color="#F59E0B" />
                            <Text style={[styles.hazardItemText, { color: colors.text }]}>{hazard}</Text>
                          </View>
                        ))}
                      </View>

                      {selectedSupplier.notes && (
                        <>
                          <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Notes</Text>
                          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={[styles.notesText, { color: colors.text }]}>{selectedSupplier.notes}</Text>
                          </View>
                        </>
                      )}
                    </>
                  )}

                  <View style={styles.bottomPadding} />
                </ScrollView>
              </>
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
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
  supplierCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  supplierHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 8,
  },
  supplierInfo: { flex: 1 },
  supplierCode: { fontSize: 11, marginBottom: 2 },
  supplierName: { fontSize: 15, fontWeight: '600' as const },
  supplierBadges: { flexDirection: 'row' as const, gap: 6 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontWeight: '600' as const },
  riskBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  riskText: { fontSize: 10, fontWeight: '600' as const },
  supplierMeta: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  metaItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, flex: 1 },
  metaText: { fontSize: 11 },
  materialsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginBottom: 10,
  },
  materialChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  materialText: { fontSize: 11 },
  moreText: { fontSize: 11, alignSelf: 'center' as const },
  supplierFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  scoreSection: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  scoreText: { fontSize: 12, fontWeight: '600' as const },
  auditInfo: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  auditText: { fontSize: 11 },
  chevron: { position: 'absolute' as const, right: 14, top: 14 },
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
  riskOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  riskOption: {
    flex: 1,
    minWidth: '45%' as const,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center' as const,
  },
  riskOptionText: { fontSize: 12, fontWeight: '500' as const },
  tabBar: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  tabText: { fontSize: 14, fontWeight: '600' as const },
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
  detailCode: { fontSize: 12 },
  detailName: { fontSize: 18, fontWeight: '700' as const, textAlign: 'center' as const, marginTop: 4 },
  detailBadges: { flexDirection: 'row' as const, gap: 8, marginTop: 10 },
  scoreCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: 12 },
  scoreValue: { fontSize: 24, fontWeight: '700' as const },
  detailSectionTitle: { fontSize: 15, fontWeight: '600' as const, marginTop: 8, marginBottom: 10 },
  detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '500' as const },
  certItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  certText: { fontSize: 13 },
  verificationCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  verificationHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activityText: { fontSize: 11, fontWeight: '600' as const },
  resultBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  resultText: { fontSize: 11, fontWeight: '600' as const },
  verificationDetails: { marginBottom: 6 },
  verificationDate: { fontSize: 13, fontWeight: '500' as const },
  verificationBy: { fontSize: 12 },
  findingsText: { fontSize: 12, fontStyle: 'italic' as const, marginBottom: 8 },
  nextDueBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginTop: 4,
  },
  nextDueText: { fontSize: 12 },
  coaSection: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  coaHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 10,
  },
  coaTitle: { fontSize: 14, fontWeight: '600' as const },
  materialItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  materialItemText: { fontSize: 13 },
  hazardItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 8,
  },
  hazardItemText: { flex: 1, fontSize: 13 },
  notesText: { fontSize: 14, lineHeight: 20 },
});
