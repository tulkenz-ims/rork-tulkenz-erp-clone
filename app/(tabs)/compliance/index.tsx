import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
  Scale,
  Users,
  MapPin,
  Award,
  ShieldCheck,
  Truck,
  Weight,
  Umbrella,
  FolderArchive,
  Handshake,
  Leaf,
  Factory,
  BookOpen,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface FormItem {
  id: string;
  title: string;
  route: string;
}

interface FormCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  forms: FormItem[];
}

const MASTER_POLICY_LINK = {
  id: 'masterpolicies',
  title: 'Master Policy Program',
  description: 'Company-wide policies, procedures, and compliance requirements',
  route: '/compliance/masterpolicies',
  color: '#7C3AED',
};

const COMPLIANCE_FORM_CATEGORIES: FormCategory[] = [
  {
    id: 'fda-fsma',
    title: 'FDA / FSMA Regulatory',
    icon: Shield,
    color: '#DC2626',
    forms: [
      { id: 'foodsafetyplan', title: 'Food Safety Plan', route: '/compliance/foodsafetyplan' },
      { id: 'hazardanalysis', title: 'Hazard Analysis', route: '/compliance/hazardanalysis' },
      { id: 'preventivecontrols', title: 'Preventive Controls', route: '/compliance/preventivecontrols' },
      { id: 'supplychainverification', title: 'Supply Chain Verification', route: '/compliance/supplychainverification' },
      { id: 'recallplan', title: 'Recall Plan', route: '/compliance/recallplan' },
      { id: 'fdaregistration', title: 'FDA Registration', route: '/compliance/fdaregistration' },
      { id: 'priornotice', title: 'Prior Notice', route: '/compliance/priornotice' },
      { id: 'reportablefood', title: 'Reportable Food Registry', route: '/compliance/reportablefood' },
      { id: 'fda483response', title: 'FDA 483 Response', route: '/compliance/fda483response' },
      { id: 'iaassessment', title: 'IA Vulnerability Assessment', route: '/compliance/iaassessment' },
    ],
  },
  {
    id: 'fsma204',
    title: 'FSMA 204 / Traceability Rule',
    icon: FileText,
    color: '#F97316',
    forms: [
      { id: 'kdelog', title: 'KDE Log', route: '/compliance/kdelog' },
      { id: 'cterecord', title: 'CTE Record', route: '/compliance/cterecord' },
      { id: 'lotcodeassignment', title: 'Lot Code Assignment', route: '/compliance/lotcodeassignment' },
      { id: 'receivingkde', title: 'Receiving KDE', route: '/compliance/receivingkde' },
      { id: 'shippingkde', title: 'Shipping KDE', route: '/compliance/shippingkde' },
      { id: 'transformationkde', title: 'Transformation KDE', route: '/compliance/transformationkde' },
      { id: 'traceabilityplan', title: 'Traceability Plan', route: '/compliance/traceabilityplan' },
      { id: 'fsma204assessment', title: 'FSMA 204 Assessment', route: '/compliance/fsma204assessment' },
    ],
  },
  {
    id: 'sqf-gfsi',
    title: 'SQF / GFSI Certification',
    icon: Award,
    color: '#3B82F6',
    forms: [
      { id: 'sqfelements', title: 'SQF System Elements', route: '/compliance/sqfelements' },
      { id: 'mgmtreviewminutes', title: 'Management Review Minutes', route: '/compliance/mgmtreviewminutes' },
      { id: 'foodsafetyculture', title: 'Food Safety Culture', route: '/compliance/foodsafetyculture' },
      { id: 'sqfpractitioner', title: 'SQF Practitioner', route: '/compliance/sqfpractitioner' },
      { id: 'sqfverification', title: 'SQF Verification', route: '/compliance/sqfverification' },
      { id: 'preauditassessment', title: 'Pre-Audit Assessment', route: '/compliance/preauditassessment' },
      { id: 'certificationscope', title: 'Certification Scope', route: '/compliance/certificationscope' },
      { id: 'auditncresponse', title: 'Audit NC Response', route: '/compliance/auditncresponse' },
      { id: 'carcloseout', title: 'CAR Close-Out', route: '/compliance/carcloseout' },
      { id: 'continualimprovement', title: 'Continual Improvement', route: '/compliance/continualimprovement' },
      { id: 'auditsessions', title: 'Auditor Portal Sessions', route: '/compliance/auditsessions' },
    ],
  },
  {
    id: 'environmental',
    title: 'Environmental Compliance (EPA)',
    icon: Leaf,
    color: '#059669',
    forms: [
      { id: 'wastewaterpermit', title: 'Wastewater Permit', route: '/compliance/wastewaterpermit' },
      { id: 'wastewatermonitoring', title: 'Wastewater Monitoring', route: '/compliance/wastewatermonitoring' },
      { id: 'airemissions', title: 'Air Emissions', route: '/compliance/airemissions' },
      { id: 'refrigeranttracking', title: 'Refrigerant Tracking', route: '/compliance/refrigeranttracking' },
      { id: 'hazwastmanifest', title: 'Hazardous Waste Manifest', route: '/compliance/hazwastmanifest' },
      { id: 'wastedisposalcert', title: 'Waste Disposal Cert', route: '/compliance/wastedisposalcert' },
      { id: 'stormwaterplan', title: 'Stormwater Plan', route: '/compliance/stormwaterplan' },
      { id: 'spccplan', title: 'SPCC Plan', route: '/compliance/spccplan' },
      { id: 'tieriireport', title: 'Tier II Report', route: '/compliance/tieriireport' },
      { id: 'envincident', title: 'Environmental Incident', route: '/compliance/envincident' },
    ],
  },
  {
    id: 'osha',
    title: 'OSHA Regulatory Compliance',
    icon: Factory,
    color: '#8B5CF6',
    forms: [
      { id: 'lotoprogram', title: 'LOTO Program', route: '/compliance/lotoprogram' },
      { id: 'confinedspaceprogram', title: 'Confined Space Program', route: '/compliance/confinedspaceprogram' },
      { id: 'hazcomprogram', title: 'HazCom Program', route: '/compliance/hazcomprogram' },
      { id: 'emergencyactionplan', title: 'Emergency Action Plan', route: '/compliance/emergencyactionplan' },
      { id: 'firepreventionplan', title: 'Fire Prevention Plan', route: '/compliance/firepreventionplan' },
      { id: 'respiratoryprogram', title: 'Respiratory Program', route: '/compliance/respiratoryprogram' },
      { id: 'hearingconservationprogram', title: 'Hearing Conservation', route: '/compliance/hearingconservationprogram' },
      { id: 'bloodborneprogram', title: 'Bloodborne Pathogen', route: '/compliance/bloodborneprogram' },
      { id: 'psmdocumentation', title: 'PSM Documentation', route: '/compliance/psmdocumentation' },
      { id: 'annualprogramreview', title: 'Annual Program Review', route: '/compliance/annualprogramreview' },
    ],
  },
  {
    id: 'labor',
    title: 'Labor / Employment Compliance',
    icon: Users,
    color: '#EAB308',
    forms: [
      { id: 'i9verification', title: 'I-9 Verification', route: '/compliance/i9verification' },
      { id: 'everifydoc', title: 'E-Verify Documentation', route: '/compliance/everifydoc' },
      { id: 'minorworkpermit', title: 'Minor Work Permit', route: '/compliance/minorworkpermit' },
      { id: 'wagehourcompliance', title: 'Wage & Hour Compliance', route: '/compliance/wagehourcompliance' },
      { id: 'fmladoc', title: 'FMLA Documentation', route: '/compliance/fmladoc' },
      { id: 'adaaccommodation', title: 'ADA Accommodation', route: '/compliance/adaaccommodation' },
      { id: 'eeo1report', title: 'EEO-1 Report', route: '/compliance/eeo1report' },
      { id: 'workerscompolicy', title: 'Workers Comp Policy', route: '/compliance/workerscompolicy' },
      { id: 'handbookack', title: 'Handbook Acknowledgment', route: '/compliance/handbookack' },
      { id: 'antiharassmenttraining', title: 'Anti-Harassment Training', route: '/compliance/antiharassmenttraining' },
    ],
  },
  {
    id: 'permits',
    title: 'State & Local Permits',
    icon: MapPin,
    color: '#0891B2',
    forms: [
      { id: 'businesslicense', title: 'Business License', route: '/compliance/businesslicense' },
      { id: 'manufacturinglicense', title: 'Manufacturing License', route: '/compliance/manufacturinglicense' },
      { id: 'healthinspection', title: 'Health Inspection', route: '/compliance/healthinspection' },
      { id: 'firemarshal', title: 'Fire Marshal Inspection', route: '/compliance/firemarshal' },
      { id: 'boilerinspection', title: 'Boiler Inspection', route: '/compliance/boilerinspection' },
      { id: 'elevatorinspection', title: 'Elevator Inspection', route: '/compliance/elevatorinspection' },
      { id: 'backflowtest', title: 'Backflow Test', route: '/compliance/backflowtest' },
      { id: 'greasetraplog', title: 'Grease Trap Log', route: '/compliance/greasetraplog' },
      { id: 'pestcontrollicense', title: 'Pest Control License', route: '/compliance/pestcontrollicense' },
      { id: 'zoningpermit', title: 'Zoning Permit', route: '/compliance/zoningpermit' },
    ],
  },
  {
    id: 'certifications',
    title: 'Third-Party Certifications',
    icon: CheckSquare,
    color: '#10B981',
    forms: [
      { id: 'organiccert', title: 'Organic Certification', route: '/compliance/organiccert' },
      { id: 'organicaudit', title: 'Organic Audit', route: '/compliance/organicaudit' },
      { id: 'koshercert', title: 'Kosher Certification', route: '/compliance/koshercert' },
      { id: 'halalcert', title: 'Halal Certification', route: '/compliance/halalcert' },
      { id: 'nongmocert', title: 'Non-GMO Certification', route: '/compliance/nongmocert' },
      { id: 'glutenfreecert', title: 'Gluten-Free Certification', route: '/compliance/glutenfreecert' },
      { id: 'fairtradecert', title: 'Fair Trade Certification', route: '/compliance/fairtradecert' },
      { id: 'customeraudits', title: 'Customer Audits', route: '/compliance/customeraudits' },
      { id: 'certrenewaltracker', title: 'Cert Renewal Tracker', route: '/compliance/certrenewaltracker' },
      { id: 'logousage', title: 'Logo Usage Authorization', route: '/compliance/logousage' },
    ],
  },
  {
    id: 'fooddefense',
    title: 'Food Defense (FSMA IA)',
    icon: ShieldCheck,
    color: '#EF4444',
    forms: [
      { id: 'fooddefenseplan', title: 'Food Defense Plan', route: '/compliance/fooddefenseplan' },
      { id: 'vulnerabilityassessment', title: 'Vulnerability Assessment', route: '/compliance/vulnerabilityassessment' },
      { id: 'mitigationstrategies', title: 'Mitigation Strategies', route: '/compliance/mitigationstrategies' },
      { id: 'fooddefensemonitoring', title: 'Food Defense Monitoring', route: '/compliance/fooddefensemonitoring' },
      { id: 'fooddefenseca', title: 'Food Defense CA', route: '/compliance/fooddefenseca' },
      { id: 'broadmitigation', title: 'Broad Mitigation', route: '/compliance/broadmitigation' },
      { id: 'fooddefensetraining', title: 'Food Defense Training', route: '/compliance/fooddefensetraining' },
      { id: 'fooddefensereanalysis', title: 'Food Defense Reanalysis', route: '/compliance/fooddefensereanalysis' },
    ],
  },
  {
    id: 'importexport',
    title: 'Import / Export Compliance',
    icon: Truck,
    color: '#6366F1',
    forms: [
      { id: 'countryoforigin', title: 'Country of Origin', route: '/compliance/countryoforigin' },
      { id: 'importalert', title: 'Import Alert Monitoring', route: '/compliance/importalert' },
      { id: 'fsvpprogram', title: 'FSVP Program', route: '/compliance/fsvpprogram' },
      { id: 'fsvpevaluation', title: 'FSVP Evaluation', route: '/compliance/fsvpevaluation' },
      { id: 'customsentry', title: 'Customs Entry', route: '/compliance/customsentry' },
      { id: 'phytosanitary', title: 'Phytosanitary Certificate', route: '/compliance/phytosanitary' },
      { id: 'exportcert', title: 'Export Certificate', route: '/compliance/exportcert' },
      { id: 'tariffclassification', title: 'Tariff Classification', route: '/compliance/tariffclassification' },
    ],
  },
  {
    id: 'weights',
    title: 'Weights & Measures',
    icon: Weight,
    color: '#7C3AED',
    forms: [
      { id: 'weightsmeasuresinspection', title: 'Weights & Measures Inspection', route: '/compliance/weightsmeasuresinspection' },
      { id: 'netcontentsverification', title: 'Net Contents Verification', route: '/compliance/netcontentsverification' },
      { id: 'tareweight', title: 'Tare Weight', route: '/compliance/tareweight' },
      { id: 'netweightcompliance', title: 'Net Weight Compliance', route: '/compliance/netweightcompliance' },
      { id: 'scalecertification', title: 'Scale Certification', route: '/compliance/scalecertification' },
    ],
  },
  {
    id: 'insurance',
    title: 'Insurance & Liability',
    icon: Umbrella,
    color: '#F59E0B',
    forms: [
      { id: 'generalliability', title: 'General Liability', route: '/compliance/generalliability' },
      { id: 'productliability', title: 'Product Liability', route: '/compliance/productliability' },
      { id: 'workerscompinsurance', title: 'Workers Comp Insurance', route: '/compliance/workerscompinsurance' },
      { id: 'propertyinsurance', title: 'Property Insurance', route: '/compliance/propertyinsurance' },
      { id: 'coitracker', title: 'COI Tracker', route: '/compliance/coitracker' },
      { id: 'insurancerenewal', title: 'Insurance Renewal', route: '/compliance/insurancerenewal' },
    ],
  },
  {
    id: 'recordretention',
    title: 'Record Retention & Document Control',
    icon: FolderArchive,
    color: '#64748B',
    forms: [
      { id: 'retentionschedule', title: 'Retention Schedule', route: '/compliance/retentionschedule' },
      { id: 'destructionlog', title: 'Destruction Log', route: '/compliance/destructionlog' },
      { id: 'regulatoryindex', title: 'Regulatory Index', route: '/compliance/regulatoryindex' },
      { id: 'compliancecalendar', title: 'Compliance Calendar', route: '/compliance/compliancecalendar' },
      { id: 'versioncontrol', title: 'Version Control', route: '/compliance/versioncontrol' },
      { id: 'backupverification', title: 'Backup Verification', route: '/compliance/backupverification' },
    ],
  },
  {
    id: 'customer',
    title: 'Customer & Contract Compliance',
    icon: Handshake,
    color: '#EC4899',
    forms: [
      { id: 'customerspec', title: 'Customer Specification', route: '/compliance/customerspec' },
      { id: 'customerconduct', title: 'Customer Code of Conduct', route: '/compliance/customerconduct' },
      { id: 'vendoragreement', title: 'Vendor Agreement', route: '/compliance/vendoragreement' },
      { id: 'ndalog', title: 'NDA Log', route: '/compliance/ndalog' },
      { id: 'contractcompliance', title: 'Contract Compliance', route: '/compliance/contractcompliance' },
      { id: 'customerauditschedule', title: 'Customer Audit Schedule', route: '/compliance/customerauditschedule' },
    ],
  },
];

export default function ComplianceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleFormPress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  }, [router]);

  const toggleCategory = useCallback((categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const stats = [
    { label: 'Active Policies', value: '24', icon: BookOpen, color: '#6366F1' },
    { label: 'Compliance Rate', value: '96%', icon: CheckSquare, color: '#10B981' },
    { label: 'Audits Due', value: '5', icon: Clock, color: '#F59E0B' },
    { label: 'Open Findings', value: '7', icon: AlertCircle, color: '#EF4444' },
  ];

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
          <View style={[styles.iconContainer, { backgroundColor: '#6366F1' + '20' }]}>
            <Scale size={32} color="#6366F1" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Compliance Management</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track regulatory compliance, certifications, audits, and documentation
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <View 
                key={index} 
                style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                  <IconComponent size={18} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.masterPolicyCard,
            { 
              backgroundColor: colors.surface, 
              borderColor: MASTER_POLICY_LINK.color + '40',
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={() => handleFormPress(MASTER_POLICY_LINK.route)}
        >
          <View style={[styles.masterPolicyIcon, { backgroundColor: MASTER_POLICY_LINK.color + '15' }]}>
            <BookOpen size={24} color={MASTER_POLICY_LINK.color} />
          </View>
          <View style={styles.masterPolicyContent}>
            <Text style={[styles.masterPolicyTitle, { color: colors.text }]}>{MASTER_POLICY_LINK.title}</Text>
            <Text style={[styles.masterPolicyDescription, { color: colors.textSecondary }]}>{MASTER_POLICY_LINK.description}</Text>
          </View>
          <ChevronRight size={20} color={MASTER_POLICY_LINK.color} />
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Compliance Forms</Text>

        {COMPLIANCE_FORM_CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const isExpanded = expandedCategories.has(category.id);
          
          return (
            <View key={category.id} style={styles.categoryContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.categoryHeader,
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                onPress={() => toggleCategory(category.id)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: category.color + '15' }]}>
                    <IconComponent size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryTitleContainer}>
                    <Text style={[styles.categoryTitle, { color: colors.text }]}>{category.title}</Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                      {category.forms.length} forms
                    </Text>
                  </View>
                </View>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </Pressable>
              
              {isExpanded && (
                <View style={[styles.formsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {category.forms.map((form, index) => (
                    <Pressable
                      key={form.id}
                      style={({ pressed }) => [
                        styles.formItem,
                        index < category.forms.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={() => handleFormPress(form.route)}
                    >
                      <Text style={[styles.formTitle, { color: colors.text }]}>{form.title}</Text>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
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
  categoryTitleContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
  },
  formsContainer: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  formItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  bottomPadding: {
    height: 32,
  },
  masterPolicyCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 20,
    gap: 14,
  },
  masterPolicyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  masterPolicyContent: {
    flex: 1,
  },
  masterPolicyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  masterPolicyDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
