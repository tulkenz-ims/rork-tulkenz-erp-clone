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
  ActivityIndicator,
  Platform,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  FileText,
  Camera,
  ChevronRight,
  ChevronDown,
  Save,
  Send,
  Eye,
  Trash2,
  Edit3,
  List,
  Clock,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import PinSignatureCapture from '@/components/PinSignatureCapture';
import { SignatureVerification } from '@/hooks/usePinSignature';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

// ─── COLORS matching the paper form ────────────────────────────
const FORM_BLUE = '#4A90D9';
const FORM_HEADER_BG = '#D6E9F8';
const FORM_BORDER = '#000000';
const FORM_SECTION_BG = '#5B9BD5';
const FORM_LABEL_BG = '#E8F0FE';
const FORM_WHITE = '#FFFFFF';
const FORM_GRAY_TEXT = '#444444';

// ─── NCR Categories ────────────────────────────────────────────
const NCR_CATEGORIES = [
  'Product Non-Conformance',
  'Process Non-Conformance',
  'Supplier Non-Conformance',
  'Material Non-Conformance',
  'Equipment Non-Conformance',
  'Documentation Non-Conformance',
  'Regulatory Non-Conformance',
  'Completely Remove',
  'Other',
];

// ─── Form Data Interface ───────────────────────────────────────
interface NCRFormData {
  // Section 1: Project Info
  project_package: string;
  item_component_no: string;
  specification_reference_no: string;
  // Contractor Info
  contractor_location: string;
  contractor_person_in_charge: string;
  contractor_phone: string;
  contractor_email: string;
  // Supplier Info
  supplier_location: string;
  supplier_person_in_charge: string;
  supplier_phone: string;
  supplier_email: string;
  // Section 2
  description_of_non_conformity: string;
  non_conformity_category: string;
  recommendation_by_originator: string;
  project_time_delay: boolean;
  expected_delay_estimate: string;
  contractors_involved: string;
  // Section 3
  outcome_of_investigation: string;
}

const EMPTY_FORM: NCRFormData = {
  project_package: '',
  item_component_no: '',
  specification_reference_no: '',
  contractor_location: '',
  contractor_person_in_charge: '',
  contractor_phone: '',
  contractor_email: '',
  supplier_location: '',
  supplier_person_in_charge: '',
  supplier_phone: '',
  supplier_email: '',
  description_of_non_conformity: '',
  non_conformity_category: '',
  recommendation_by_originator: '',
  project_time_delay: false,
  expected_delay_estimate: '',
  contractors_involved: '',
  outcome_of_investigation: '',
};

export default function NCRFormScreen() {
  const { colors } = useTheme();
  const { user } = useUser();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId;
  const facilityId = orgContext?.facilityId;
  const queryClient = useQueryClient();

  const userName = user
    ? `${user.first_name} ${user.last_name}`.trim()
    : 'Unknown';

  // ── State ──
  const [mode, setMode] = useState<'list' | 'new' | 'view'>('list');
  const [formData, setFormData] = useState<NCRFormData>({ ...EMPTY_FORM });
  const [signatureVerification, setSignatureVerification] = useState<SignatureVerification | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [photos, setPhotos] = useState<{ uri: string; uploading?: boolean }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ── Photo upload to Supabase Storage ──
  const uploadPhoto = useCallback(async (uri: string): Promise<string> => {
    if (!organizationId) throw new Error('No organization');

    const timestamp = Date.now();
    const fileName = `ncr-forms/${organizationId}/${timestamp}-${Math.random().toString(36).substring(2, 7)}.jpg`;

    try {
      // Web platform
      if (Platform.OS === 'web') {
        let dataUrl = uri;

        // If blob URL, convert to data URL
        if (uri.startsWith('blob:')) {
          const response = await fetch(uri);
          const blob = await response.blob();
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        // If already a data URL, use it
        if (dataUrl.startsWith('data:')) {
          const base64 = dataUrl.split(',')[1];
          const { error: uploadError } = await supabase.storage
            .from('ncr-photos')
            .upload(fileName, decode(base64), { contentType: 'image/jpeg', upsert: true });

          if (uploadError) {
            console.log('[NCR Photos] Storage not available, using base64 fallback');
            return dataUrl;
          }

          const { data: urlData } = supabase.storage.from('ncr-photos').getPublicUrl(fileName);
          return urlData?.publicUrl || dataUrl;
        }

        return uri;
      }

      // Native platform - compress and upload
      try {
        const ImageManipulator = await import('expo-image-manipulator');
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manipulated.base64) {
          const { error: uploadError } = await supabase.storage
            .from('ncr-photos')
            .upload(fileName, decode(manipulated.base64), { contentType: 'image/jpeg', upsert: true });

          if (uploadError) {
            console.log('[NCR Photos] Storage not available, using base64 fallback');
            return `data:image/jpeg;base64,${manipulated.base64}`;
          }

          const { data: urlData } = supabase.storage.from('ncr-photos').getPublicUrl(fileName);
          return urlData?.publicUrl || `data:image/jpeg;base64,${manipulated.base64}`;
        }
      } catch (manipError) {
        console.warn('[NCR Photos] Compression failed:', manipError);
      }

      // Native fallback - read raw
      const FileSystem = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const { error: uploadError } = await supabase.storage
        .from('ncr-photos')
        .upload(fileName, decode(base64), { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        return `data:image/jpeg;base64,${base64}`;
      }

      const { data: urlData } = supabase.storage.from('ncr-photos').getPublicUrl(fileName);
      return urlData?.publicUrl || `data:image/jpeg;base64,${base64}`;
    } catch (err) {
      console.error('[NCR Photos] Upload failed:', err);
      return uri; // fallback to local URI
    }
  }, [organizationId]);

  // ── Pick from camera ──
  const takePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      setPhotos(prev => [...prev, { uri, uploading: true }]);

      const uploadedUrl = await uploadPhoto(uri);
      setPhotos(prev => prev.map(p => p.uri === uri ? { uri: uploadedUrl, uploading: false } : p));
    } catch (err) {
      console.error('[NCR Photos] Camera error:', err);
      Alert.alert('Error', 'Could not take photo.');
    }
  }, [uploadPhoto]);

  // ── Pick from gallery ──
  const pickFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Photo library access is needed.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (result.canceled || !result.assets?.length) return;

      for (const asset of result.assets) {
        const uri = asset.uri;
        setPhotos(prev => [...prev, { uri, uploading: true }]);

        const uploadedUrl = await uploadPhoto(uri);
        setPhotos(prev => prev.map(p => p.uri === uri ? { uri: uploadedUrl, uploading: false } : p));
      }
    } catch (err) {
      console.error('[NCR Photos] Gallery error:', err);
      Alert.alert('Error', 'Could not select photos.');
    }
  }, [uploadPhoto]);

  // ── Remove photo ──
  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Fetch existing NCR forms ──
  const { data: ncrForms = [], isLoading, refetch } = useQuery({
    queryKey: ['ncr_paper_forms', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('ncr_paper_forms')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('[NCRForm] Fetch error:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!organizationId,
  });

  // ── Generate form number ──
  const generateFormNumber = useCallback(() => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const seq = String((ncrForms?.length || 0) + 1).padStart(4, '0');
    return `NCR-${y}${m}-${seq}`;
  }, [ncrForms]);

  // ── Save / Submit ──
  const handleSubmit = useCallback(async (asDraft: boolean) => {
    if (!organizationId) return;

    // Validate required fields (unless draft)
    if (!asDraft) {
      const requiredFields: (keyof NCRFormData)[] = [
        'project_package', 'item_component_no', 'specification_reference_no',
        'contractor_location', 'contractor_person_in_charge', 'contractor_phone', 'contractor_email',
        'supplier_location', 'supplier_person_in_charge', 'supplier_phone', 'supplier_email',
        'description_of_non_conformity', 'non_conformity_category', 'recommendation_by_originator',
      ];

      const missing = requiredFields.filter(f => !formData[f]?.toString().trim());
      if (missing.length > 0) {
        Alert.alert('Required Fields', `Please fill in all required fields.\n\nMissing: ${missing.length} field(s)`);
        return;
      }

      if (!signatureVerification?.verifiedAt) {
        Alert.alert('Signature Required', 'Please verify your PIN signature before submitting.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const record = {
        organization_id: organizationId,
        facility_id: facilityId || null,
        form_number: generateFormNumber(),
        form_version: '1.0',
        ...formData,
        project_time_delay: formData.project_time_delay,
        expected_delay_estimate: formData.project_time_delay ? formData.expected_delay_estimate : null,
        photos_and_videos: photos.filter(p => !p.uploading).map(p => p.uri),
        contractors_involved: formData.contractors_involved
          ? formData.contractors_involved.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        originator_name: signatureVerification?.employeeName || userName,
        originator_employee_id: signatureVerification?.employeeId || null,
        originator_signed_at: signatureVerification?.verifiedAt || null,
        originator_pin_verified: !!signatureVerification?.verifiedAt,
        status: asDraft ? 'draft' : 'submitted',
        created_by: userName,
        created_by_id: user?.id || null,
      };

      const { error } = await supabase.from('ncr_paper_forms').insert(record);

      if (error) {
        console.error('[NCRForm] Submit error:', error.message);
        Alert.alert('Error', error.message);
        return;
      }

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['ncr_paper_forms'] });
      setFormData({ ...EMPTY_FORM });
      setSignatureVerification(null);
      setPhotos([]);
      setMode('list');
      Alert.alert('Success', asDraft ? 'NCR draft saved.' : 'NCR submitted successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save NCR.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, signatureVerification, organizationId, facilityId, userName, user, generateFormNumber]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateField = useCallback((field: keyof NCRFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const openViewMode = useCallback((record: any) => {
    setSelectedRecord(record);
    setMode('view');
  }, []);

  const openNewForm = useCallback(() => {
    setFormData({ ...EMPTY_FORM });
    setSignatureVerification(null);
    setPhotos([]);
    setMode('new');
  }, []);

  // ── Current date/time ──
  const nowStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const orgName = orgContext?.organization?.name || 'Organization';
  const facilityName = orgContext?.facility?.name || 'Facility';

  // ═══════════════════════════════════════════════════════════════
  //  LIST VIEW
  // ═══════════════════════════════════════════════════════════════
  if (mode === 'list') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {/* New Form Button */}
          <Pressable
            style={[styles.newFormBtn, { backgroundColor: FORM_BLUE }]}
            onPress={openNewForm}
          >
            <Plus size={20} color="#FFF" />
            <Text style={styles.newFormBtnText}>New Non-Conformance Report</Text>
          </Pressable>

          {isLoading ? (
            <ActivityIndicator size="large" color={FORM_BLUE} style={{ marginTop: 40 }} />
          ) : ncrForms.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No NCR Forms</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Tap the button above to create your first Non-Conformance Report
              </Text>
            </View>
          ) : (
            ncrForms.map((ncr: any) => (
              <Pressable
                key={ncr.id}
                style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => openViewMode(ncr)}
              >
                <View style={styles.listCardHeader}>
                  <Text style={[styles.listCardNumber, { color: FORM_BLUE }]}>{ncr.form_number}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: ncr.status === 'submitted' ? '#10B981' : ncr.status === 'draft' ? '#F59E0B' : '#6B7280' }
                  ]}>
                    <Text style={styles.statusBadgeText}>{ncr.status?.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={[styles.listCardDesc, { color: colors.text }]} numberOfLines={2}>
                  {ncr.description_of_non_conformity || 'No description'}
                </Text>
                <View style={styles.listCardMeta}>
                  <Text style={[styles.listCardMetaText, { color: colors.textSecondary }]}>
                    Package: {ncr.project_package}
                  </Text>
                  <Text style={[styles.listCardMetaText, { color: colors.textSecondary }]}>
                    {new Date(ncr.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.listCardMetaText, { color: colors.textSecondary, marginTop: 2 }]}>
                  Originator: {ncr.originator_name}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  VIEW MODE (read-only look at a submitted form)
  // ═══════════════════════════════════════════════════════════════
  if (mode === 'view' && selectedRecord) {
    const r = selectedRecord;
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F0F0F0' }]} edges={['bottom']}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
          <Pressable style={styles.backBtn} onPress={() => { setMode('list'); setSelectedRecord(null); }}>
            <X size={18} color={FORM_BLUE} />
            <Text style={[styles.backBtnText, { color: FORM_BLUE }]}>Back to List</Text>
          </Pressable>

          <View style={styles.paper}>
            {/* Header */}
            <View style={styles.formHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>{orgName.substring(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.headerOrg}>{orgName}</Text>
                  <Text style={styles.headerFacility}>{facilityName}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.headerMeta}>Form: {r.form_number}</Text>
                <Text style={styles.headerMeta}>Version: {r.form_version}</Text>
                <Text style={styles.headerMeta}>Created: {new Date(r.created_at).toLocaleDateString()}</Text>
              </View>
            </View>

            {/* Title Bar */}
            <View style={styles.titleBar}>
              <Text style={styles.titleText}>Non-Conformance Report (NCR)</Text>
            </View>
            <View style={styles.formNumberRow}>
              <Text style={styles.formNumberLabel}>Form Number:</Text>
              <Text style={styles.formNumberValue}>{r.form_number}</Text>
            </View>

            {/* Section 1 */}
            <View style={styles.sectionBar}>
              <Text style={styles.sectionText}>Section 1:    General Information</Text>
            </View>

            <Text style={styles.subHeader}>Project Information:</Text>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}><Text style={styles.labelText}>Package</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.project_package}</Text></View>
              <View style={[styles.tableCell, styles.labelCell, { flex: 1.2 }]}><Text style={styles.labelText}>Item / Component No:</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.item_component_no}</Text></View>
              <View style={[styles.tableCell, styles.labelCell, { flex: 1.3 }]}><Text style={styles.labelText}>Specification Ref No:</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.specification_reference_no}</Text></View>
            </View>

            <Text style={styles.subHeader}>Contractor Information:</Text>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.labelCell, { flex: 0.6 }]}><Text style={styles.labelText}>Location:</Text></View>
              <View style={[styles.tableCell, { flex: 1.4 }]}><Text style={styles.valueText}>{r.contractor_location}</Text></View>
              <View style={[styles.tableCell, styles.labelCell, { flex: 0.9 }]}><Text style={styles.labelText}>Person in charge:</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.contractor_person_in_charge}</Text></View>
              <View style={[styles.tableCell, styles.labelCell, { flex: 0.5 }]}><Text style={styles.labelText}>Phone:</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.contractor_phone}</Text></View>
            </View>

            <Text style={styles.subHeader}>Supplier Information:</Text>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, styles.labelCell, { flex: 0.6 }]}><Text style={styles.labelText}>Location:</Text></View>
              <View style={[styles.tableCell, { flex: 1.4 }]}><Text style={styles.valueText}>{r.supplier_location}</Text></View>
              <View style={[styles.tableCell, styles.labelCell, { flex: 0.9 }]}><Text style={styles.labelText}>Person in charge:</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.supplier_person_in_charge}</Text></View>
              <View style={[styles.tableCell, styles.labelCell, { flex: 0.5 }]}><Text style={styles.labelText}>Phone:</Text></View>
              <View style={[styles.tableCell, { flex: 1 }]}><Text style={styles.valueText}>{r.supplier_phone}</Text></View>
            </View>

            {/* Section 2 */}
            <View style={styles.sectionBar}>
              <Text style={styles.sectionText}>Section 2:    Non-Conformity Details</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Description of{'\n'}non conformity</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65 }]}><Text style={styles.valueText}>{r.description_of_non_conformity}</Text></View>
            </View>

            {/* Photos */}
            {r.photos_and_videos?.length > 0 && (
              <View style={styles.fieldRow}>
                <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Photos and{'\n'}videos</Text></View>
                <View style={[styles.fieldValue, { flex: 0.65 }]}>
                  <View style={styles.photoGrid}>
                    {r.photos_and_videos.map((url: string, idx: number) => (
                      <Image key={idx} source={{ uri: url }} style={styles.photoThumb} />
                    ))}
                  </View>
                  <Text style={styles.photoCount}>{r.photos_and_videos.length} photo{r.photos_and_videos.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            )}

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Non-Conformity{'\n'}Category</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65 }]}><Text style={styles.valueText}>{r.non_conformity_category}</Text></View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Recommendation{'\n'}by Originator</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65 }]}><Text style={styles.valueText}>{r.recommendation_by_originator}</Text></View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Question:</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65 }]}>
                <Text style={styles.valueText}>
                  Project time delay: {r.project_time_delay ? 'Yes' : 'No'}
                  {r.project_time_delay && r.expected_delay_estimate ? `  •  Estimate: ${r.expected_delay_estimate}` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Originator{'\n'}Signature</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65 }]}>
                <Text style={styles.valueText}>
                  {r.originator_name}{r.originator_pin_verified ? '  ✓ PIN Verified' : ''}
                </Text>
                {r.originator_signed_at && (
                  <Text style={[styles.valueText, { fontSize: 10, color: '#888' }]}>
                    {new Date(r.originator_signed_at).toLocaleString()}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Contractors{'\n'}involved</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65 }]}>
                <Text style={styles.valueText}>{Array.isArray(r.contractors_involved) ? r.contractors_involved.join(', ') : r.contractors_involved}</Text>
              </View>
            </View>

            {/* Section 3 */}
            <View style={styles.sectionBar}>
              <Text style={styles.sectionText}>Section 3:    Response by contractors involved</Text>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldLabel, { flex: 0.35 }]}><Text style={styles.labelText}>Outcome of{'\n'}investigation into{'\n'}cause of non-{'\n'}conformance</Text></View>
              <View style={[styles.fieldValue, { flex: 0.65, minHeight: 80 }]}>
                <Text style={styles.valueText}>{r.outcome_of_investigation || '—'}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  NEW FORM (editable - looks like the paper)
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F0F0F0' }]} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top actions */}
        <View style={styles.topActions}>
          <Pressable style={styles.backBtn} onPress={() => setMode('list')}>
            <X size={18} color={FORM_BLUE} />
            <Text style={[styles.backBtnText, { color: FORM_BLUE }]}>Cancel</Text>
          </Pressable>
          <View style={styles.topActionsBtns}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
              onPress={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              <Save size={14} color="#FFF" />
              <Text style={styles.actionBtnText}>Save Draft</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: FORM_BLUE }]}
              onPress={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Send size={14} color="#FFF" />
                  <Text style={styles.actionBtnText}>Submit</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── THE PAPER FORM ── */}
        <View style={styles.paper}>

          {/* ── HEADER ── */}
          <View style={styles.formHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>{orgName.substring(0, 2).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.headerOrg}>{orgName}</Text>
                <Text style={styles.headerFacility}>{facilityName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerMeta}>Form: {generateFormNumber()}</Text>
              <Text style={styles.headerMeta}>Version: 1.0</Text>
              <Text style={styles.headerMeta}>Date: {nowStr}</Text>
            </View>
          </View>

          {/* ── TITLE BAR ── */}
          <View style={styles.titleBar}>
            <Text style={styles.titleText}>Non-Conformance Report (NCR)</Text>
          </View>

          <View style={styles.formNumberRow}>
            <Text style={styles.formNumberLabel}>Automated Form Number:</Text>
            <Text style={styles.formNumberValue}>{generateFormNumber()}</Text>
          </View>

          {/* ════════════════════════════════════════════════════════
              SECTION 1: GENERAL INFORMATION
             ════════════════════════════════════════════════════════ */}
          <View style={styles.sectionBar}>
            <Text style={styles.sectionText}>Section 1:    General Information</Text>
          </View>

          {/* Project Information */}
          <Text style={styles.subHeader}>Project Information:</Text>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Package</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1.2 }]}>
              <Text style={styles.labelText}>Item / Component No:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1.3 }]}>
              <Text style={styles.labelText}>Specification Reference No:</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput
                style={styles.cellInput}
                value={formData.project_package}
                onChangeText={v => updateField('project_package', v)}
                placeholder="e.g. 12-8"
                placeholderTextColor="#BBB"
              />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1.2 }]}>
              <TextInput
                style={styles.cellInput}
                value={formData.item_component_no}
                onChangeText={v => updateField('item_component_no', v)}
                placeholder="e.g. C1.2"
                placeholderTextColor="#BBB"
              />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1.3 }]}>
              <TextInput
                style={styles.cellInput}
                value={formData.specification_reference_no}
                onChangeText={v => updateField('specification_reference_no', v)}
                placeholder="e.g. C76567"
                placeholderTextColor="#BBB"
              />
            </View>
          </View>

          {/* Contractor Information */}
          <Text style={styles.subHeader}>Contractor Information:</Text>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Location:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Person in charge:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 0.8 }]}>
              <Text style={styles.labelText}>Phone:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Email:</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput style={styles.cellInput} value={formData.contractor_location} onChangeText={v => updateField('contractor_location', v)} placeholder="Location" placeholderTextColor="#BBB" />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput style={styles.cellInput} value={formData.contractor_person_in_charge} onChangeText={v => updateField('contractor_person_in_charge', v)} placeholder="Name" placeholderTextColor="#BBB" />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 0.8 }]}>
              <TextInput style={styles.cellInput} value={formData.contractor_phone} onChangeText={v => updateField('contractor_phone', v)} placeholder="Phone" placeholderTextColor="#BBB" keyboardType="phone-pad" />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput style={styles.cellInput} value={formData.contractor_email} onChangeText={v => updateField('contractor_email', v)} placeholder="Email" placeholderTextColor="#BBB" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          {/* Supplier Information */}
          <Text style={styles.subHeader}>Supplier Information:</Text>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Location:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Person in charge:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 0.8 }]}>
              <Text style={styles.labelText}>Phone:</Text>
            </View>
            <View style={[styles.tableCell, styles.labelCell, { flex: 1 }]}>
              <Text style={styles.labelText}>Email:</Text>
            </View>
          </View>
          <View style={styles.tableRow}>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput style={styles.cellInput} value={formData.supplier_location} onChangeText={v => updateField('supplier_location', v)} placeholder="Location" placeholderTextColor="#BBB" />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput style={styles.cellInput} value={formData.supplier_person_in_charge} onChangeText={v => updateField('supplier_person_in_charge', v)} placeholder="Name" placeholderTextColor="#BBB" />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 0.8 }]}>
              <TextInput style={styles.cellInput} value={formData.supplier_phone} onChangeText={v => updateField('supplier_phone', v)} placeholder="Phone" placeholderTextColor="#BBB" keyboardType="phone-pad" />
            </View>
            <View style={[styles.tableCell, styles.inputCell, { flex: 1 }]}>
              <TextInput style={styles.cellInput} value={formData.supplier_email} onChangeText={v => updateField('supplier_email', v)} placeholder="Email" placeholderTextColor="#BBB" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════
              SECTION 2: NON-CONFORMITY DETAILS
             ════════════════════════════════════════════════════════ */}
          <View style={styles.sectionBar}>
            <Text style={styles.sectionText}>Section 2:    Non-Conformity Details</Text>
          </View>

          {/* Description */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Description of{'\n'}non conformity</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <TextInput
                style={[styles.cellInput, { minHeight: 100, textAlignVertical: 'top' }]}
                value={formData.description_of_non_conformity}
                onChangeText={v => updateField('description_of_non_conformity', v)}
                placeholder="Describe the non-conformity in detail..."
                placeholderTextColor="#BBB"
                multiline
              />
            </View>
          </View>

          {/* Photos */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Photos and{'\n'}videos</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              {/* Photo thumbnails */}
              {photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {photos.map((photo, idx) => (
                    <View key={idx} style={styles.photoThumbWrap}>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                      {photo.uploading && (
                        <View style={styles.photoUploading}>
                          <ActivityIndicator size="small" color="#FFF" />
                        </View>
                      )}
                      {!photo.uploading && (
                        <Pressable style={styles.photoRemoveBtn} onPress={() => removePhoto(idx)}>
                          <X size={12} color="#FFF" />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
              {/* Camera + Gallery buttons */}
              <View style={styles.photoActions}>
                <Pressable style={styles.photoActionBtn} onPress={takePhoto}>
                  <Camera size={18} color={FORM_BLUE} />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </Pressable>
                <Pressable style={styles.photoActionBtn} onPress={pickFromGallery}>
                  <ImageIcon size={18} color={FORM_BLUE} />
                  <Text style={styles.photoActionText}>Choose from Gallery</Text>
                </Pressable>
              </View>
              {photos.length > 0 && (
                <Text style={styles.photoCount}>{photos.length} photo{photos.length !== 1 ? 's' : ''} attached</Text>
              )}
            </View>
          </View>

          {/* Non-Conformity Category */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Non-Conformity{'\n'}Category</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <Pressable style={styles.pickerBtn} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
                <Text style={[styles.cellInput, { color: formData.non_conformity_category ? '#000' : '#BBB', paddingVertical: 8 }]}>
                  {formData.non_conformity_category || 'Select category...'}
                </Text>
                <ChevronDown size={16} color="#888" />
              </Pressable>
              {showCategoryPicker && (
                <View style={styles.pickerDropdown}>
                  {NCR_CATEGORIES.map(cat => (
                    <Pressable
                      key={cat}
                      style={[styles.pickerOption, formData.non_conformity_category === cat && { backgroundColor: FORM_HEADER_BG }]}
                      onPress={() => { updateField('non_conformity_category', cat); setShowCategoryPicker(false); }}
                    >
                      <Text style={styles.pickerOptionText}>{cat}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Recommendation */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Recommend-{'\n'}ation by{'\n'}Originator</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <TextInput
                style={[styles.cellInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={formData.recommendation_by_originator}
                onChangeText={v => updateField('recommendation_by_originator', v)}
                placeholder="Provide recommendation..."
                placeholderTextColor="#BBB"
                multiline
              />
            </View>
          </View>

          {/* Time Delay Question */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Question:</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <Text style={[styles.questionText, { marginBottom: 8 }]}>
                Is there a project time delay caused by non-conformance?
              </Text>
              <View style={styles.yesNoRow}>
                <Pressable
                  style={[styles.yesNoBtn, formData.project_time_delay && styles.yesNoBtnActive]}
                  onPress={() => updateField('project_time_delay', true)}
                >
                  <Text style={[styles.yesNoText, formData.project_time_delay && { color: '#FFF' }]}>Yes</Text>
                </Pressable>
                <Pressable
                  style={[styles.yesNoBtn, !formData.project_time_delay && styles.yesNoBtnActiveNo]}
                  onPress={() => updateField('project_time_delay', false)}
                >
                  <Text style={[styles.yesNoText, !formData.project_time_delay && { color: '#FFF' }]}>No</Text>
                </Pressable>
              </View>
              {formData.project_time_delay && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.labelText, { marginBottom: 4 }]}>If yes, expected estimate:</Text>
                  <TextInput
                    style={styles.cellInput}
                    value={formData.expected_delay_estimate}
                    onChangeText={v => updateField('expected_delay_estimate', v)}
                    placeholder="e.g. 1 day"
                    placeholderTextColor="#BBB"
                  />
                </View>
              )}
            </View>
          </View>

          {/* Originator Signature */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Originator{'\n'}Signature</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <PinSignatureCapture
                onVerified={(v) => setSignatureVerification(v)}
                onCleared={() => setSignatureVerification(null)}
                formLabel="NCR Form"
                required={true}
                existingVerification={signatureVerification}
                accentColor={FORM_BLUE}
              />
            </View>
          </View>

          {/* Contractors Involved */}
          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Select{'\n'}contractors{'\n'}involved:</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <TextInput
                style={[styles.cellInput, { minHeight: 40, textAlignVertical: 'top' }]}
                value={formData.contractors_involved}
                onChangeText={v => updateField('contractors_involved', v)}
                placeholder="Contractor names (comma separated)"
                placeholderTextColor="#BBB"
                multiline
              />
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════
              SECTION 3: RESPONSE BY CONTRACTORS
             ════════════════════════════════════════════════════════ */}
          <View style={styles.sectionBar}>
            <Text style={styles.sectionText}>Section 3:    Response by contractors involved</Text>
          </View>

          <View style={styles.fieldRow}>
            <View style={[styles.fieldLabel, { flex: 0.3 }]}>
              <Text style={styles.labelText}>Outcome of{'\n'}investigation{'\n'}into cause of{'\n'}non-conformance</Text>
            </View>
            <View style={[styles.fieldValue, { flex: 0.7 }]}>
              <TextInput
                style={[styles.cellInput, { minHeight: 120, textAlignVertical: 'top' }]}
                value={formData.outcome_of_investigation}
                onChangeText={v => updateField('outcome_of_investigation', v)}
                placeholder="Investigation outcome and findings..."
                placeholderTextColor="#BBB"
                multiline
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.formFooter}>
            <Text style={styles.footerText}>Generated by TulKenz OPS</Text>
            <Text style={styles.footerText}>Page 1 of 1</Text>
          </View>
        </View>

        {/* Bottom action buttons */}
        <View style={styles.bottomActions}>
          <Pressable
            style={[styles.bottomBtn, { backgroundColor: '#6B7280' }]}
            onPress={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            <Save size={18} color="#FFF" />
            <Text style={styles.bottomBtnText}>Save as Draft</Text>
          </Pressable>
          <Pressable
            style={[styles.bottomBtn, { backgroundColor: FORM_BLUE }]}
            onPress={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Send size={18} color="#FFF" />
                <Text style={styles.bottomBtnText}>Submit NCR</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES - matching the paper form aesthetic
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  // ── Paper container ──
  paper: {
    backgroundColor: FORM_WHITE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCC',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } : { elevation: 3 }),
  },

  // ── Header ──
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    backgroundColor: FORM_HEADER_BG,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: FORM_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerOrg: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  headerFacility: {
    fontSize: 12,
    color: '#555',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerMeta: {
    fontSize: 10,
    color: '#555',
    lineHeight: 16,
  },

  // ── Title ──
  titleBar: {
    backgroundColor: FORM_BLUE,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  titleText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formNumberRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
    backgroundColor: '#F9F9F9',
  },
  formNumberLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginRight: 6,
  },
  formNumberValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111',
  },

  // ── Section bars ──
  sectionBar: {
    backgroundColor: FORM_SECTION_BG,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 0,
  },
  sectionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Sub headers ──
  subHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDD',
  },

  // ── Table rows ──
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: FORM_BORDER,
    justifyContent: 'center',
  },
  labelCell: {
    backgroundColor: FORM_LABEL_BG,
  },
  inputCell: {
    backgroundColor: FORM_WHITE,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  valueText: {
    fontSize: 11,
    color: '#111',
  },
  cellInput: {
    fontSize: 11,
    color: '#111',
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },

  // ── Field rows (label left, input right) ──
  fieldRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: FORM_BORDER,
  },
  fieldLabel: {
    backgroundColor: FORM_LABEL_BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: FORM_BORDER,
    justifyContent: 'center',
  },
  fieldValue: {
    backgroundColor: FORM_WHITE,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  // ── Question / Yes-No ──
  questionText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yesNoBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCC',
    backgroundColor: '#F5F5F5',
  },
  yesNoBtnActive: {
    backgroundColor: FORM_BLUE,
    borderColor: FORM_BLUE,
  },
  yesNoBtnActiveNo: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  yesNoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  // ── Photo grid & actions ──
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  photoThumbWrap: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 6,
  },
  photoUploading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(220,38,38,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: FORM_BLUE,
    borderRadius: 6,
    backgroundColor: '#F0F7FF',
  },
  photoActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: FORM_BLUE,
  },
  photoCount: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },

  // ── Category picker ──
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    backgroundColor: '#FFF',
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EEE',
  },
  pickerOptionText: {
    fontSize: 11,
    color: '#333',
  },

  // ── Footer ──
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    backgroundColor: '#F9F9F9',
  },
  footerText: {
    fontSize: 9,
    color: '#999',
  },

  // ── Top / Bottom actions ──
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topActionsBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
  },
  bottomBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── List view ──
  newFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  newFormBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  listCardNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  listCardDesc: {
    fontSize: 13,
    marginBottom: 6,
  },
  listCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listCardMetaText: {
    fontSize: 11,
  },
});
