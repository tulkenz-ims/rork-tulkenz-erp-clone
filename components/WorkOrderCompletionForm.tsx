import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Wrench,
  Camera,
  Image as ImageIcon,
  X,
  Plus,
  Clock,
  Package,
  FileText,
  CheckCircle2,
  MapPin,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';

interface PostDetails {
  id: string;
  post_number: string;
  template_name: string;
  form_data: Record<string, any>;
  photo_url?: string;
  notes?: string;
  status: string;
  created_at: string;
  created_by_name: string;
  location_name?: string;
}

interface WorkOrderCompletionData {
  workPerformed: string;
  actionTaken: string;
  completionPhotos: string[];
  partsUsed: string;
  laborHours: string;
  additionalNotes: string;
  rootCause?: string;
  preventiveAction?: string;
}

interface WorkOrderCompletionFormProps {
  task: TaskFeedDepartmentTask & { post?: PostDetails };
  onComplete: (data: WorkOrderCompletionData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  accentColor?: string;
}

export default function WorkOrderCompletionForm({
  task,
  onComplete,
  onCancel,
  isSubmitting,
  accentColor = '#3B82F6',
}: WorkOrderCompletionFormProps) {
  const { colors } = useTheme();

  const [workPerformed, setWorkPerformed] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);
  const [partsUsed, setPartsUsed] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [photoError, setPhotoError] = useState(false);

  const MAX_PHOTOS = 5;

  const handleTakePhoto = useCallback(async () => {
    if (completionPhotos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Photos', `You can only add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCompletionPhotos(prev => [...prev, result.assets[0].uri]);
      setPhotoError(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [completionPhotos.length]);

  const handlePickImage = useCallback(async () => {
    if (completionPhotos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Photos', `You can only add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const remainingSlots = MAX_PHOTOS - completionPhotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setCompletionPhotos(prev => [...prev, ...newUris].slice(0, MAX_PHOTOS));
      setPhotoError(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [completionPhotos.length]);

  const handleRemovePhoto = useCallback((index: number) => {
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!workPerformed.trim()) {
      Alert.alert('Required Field', 'Please describe the work performed.');
      return;
    }

    if (!actionTaken.trim()) {
      Alert.alert('Required Field', 'Please describe the action taken.');
      return;
    }

    if (completionPhotos.length === 0) {
      setPhotoError(true);
      Alert.alert('Photos Required', 'Please add at least one completion photo.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await onComplete({
      workPerformed: workPerformed.trim(),
      actionTaken: actionTaken.trim(),
      completionPhotos,
      partsUsed: partsUsed.trim(),
      laborHours: laborHours.trim(),
      additionalNotes: additionalNotes.trim(),
      rootCause: rootCause.trim() || undefined,
      preventiveAction: preventiveAction.trim() || undefined,
    });
  }, [workPerformed, actionTaken, completionPhotos, partsUsed, laborHours, additionalNotes, rootCause, preventiveAction, onComplete]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Task Summary Header */}
      <View style={[styles.taskSummaryCard, { backgroundColor: colors.background }]}>
        <View style={[styles.taskSummaryHeader, { borderBottomColor: colors.border }]}>
          <View style={[styles.woIconContainer, { backgroundColor: accentColor + '15' }]}>
            <Wrench size={20} color={accentColor} />
          </View>
          <View style={styles.taskSummaryInfo}>
            <Text style={[styles.taskPostNumber, { color: accentColor }]}>
              {task.postNumber}
            </Text>
            <Text style={[styles.taskTemplateName, { color: colors.text }]}>
              {task.post?.template_name || 'Maintenance Task'}
            </Text>
          </View>
        </View>

        <View style={styles.taskDetailsGrid}>
          {task.post?.location_name && (
            <View style={styles.taskDetailItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={[styles.taskDetailText, { color: colors.textSecondary }]}>
                {task.post.location_name}
              </Text>
            </View>
          )}
          {task.post?.created_by_name && (
            <View style={styles.taskDetailItem}>
              <User size={14} color={colors.textSecondary} />
              <Text style={[styles.taskDetailText, { color: colors.textSecondary }]}>
                {task.post.created_by_name}
              </Text>
            </View>
          )}
          {task.post?.created_at && (
            <View style={styles.taskDetailItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={[styles.taskDetailText, { color: colors.textSecondary }]}>
                {formatDate(task.post.created_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Original Photo if exists */}
        {task.post?.photo_url && (
          <View style={styles.originalPhotoSection}>
            <Text style={[styles.originalPhotoLabel, { color: colors.textSecondary }]}>
              Original Issue Photo:
            </Text>
            <Image
              source={{ uri: task.post.photo_url }}
              style={styles.originalPhoto}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Form Data from original post */}
        {task.post?.form_data && Object.keys(task.post.form_data).length > 0 && (
          <View style={[styles.formDataSection, { backgroundColor: colors.surface }]}>
            <Text style={[styles.formDataTitle, { color: colors.textSecondary }]}>
              Request Details:
            </Text>
            {Object.entries(task.post.form_data).map(([key, value]) => (
              <View key={key} style={styles.formDataRow}>
                <Text style={[styles.formDataKey, { color: colors.textTertiary }]}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                </Text>
                <Text style={[styles.formDataValue, { color: colors.text }]}>
                  {String(value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Work Order Completion Form */}
      <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.formHeader}>
          <FileText size={18} color={accentColor} />
          <Text style={[styles.formTitle, { color: colors.text }]}>Work Order Completion</Text>
        </View>

        {/* Work Performed */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Work Performed <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Describe what work was performed..."
            placeholderTextColor={colors.textTertiary}
            value={workPerformed}
            onChangeText={setWorkPerformed}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Taken */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>
            Action Taken <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="What corrective action was taken?"
            placeholderTextColor={colors.textTertiary}
            value={actionTaken}
            onChangeText={setActionTaken}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Completion Photos */}
        <View style={styles.fieldContainer}>
          <View style={styles.photoHeaderRow}>
            <Text style={[styles.fieldLabel, { color: photoError ? '#EF4444' : colors.text }]}>
              Completion Photos <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
              {completionPhotos.length}/{MAX_PHOTOS}
            </Text>
          </View>

          {completionPhotos.length < MAX_PHOTOS && (
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: colors.background, borderColor: photoError ? '#EF4444' : colors.border }]}
                onPress={handleTakePhoto}
              >
                <Camera size={20} color={photoError ? '#EF4444' : accentColor} />
                <Text style={[styles.photoButtonText, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: colors.background, borderColor: photoError ? '#EF4444' : colors.border }]}
                onPress={handlePickImage}
              >
                <ImageIcon size={20} color={photoError ? '#EF4444' : accentColor} />
                <Text style={[styles.photoButtonText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {photoError && (
            <Text style={styles.photoErrorText}>At least one completion photo is required</Text>
          )}

          {completionPhotos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
              contentContainerStyle={styles.photosScrollContent}
            >
              {completionPhotos.map((uri, index) => (
                <View key={`photo-${index}`} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {completionPhotos.length < MAX_PHOTOS && (
                <TouchableOpacity
                  style={[styles.addMorePhoto, { borderColor: colors.border }]}
                  onPress={handlePickImage}
                >
                  <Plus size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>

        {/* Labor Hours and Parts Row */}
        <View style={styles.rowFields}>
          <View style={[styles.halfField]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Labor Hours</Text>
            <View style={[styles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Clock size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.inputText, { color: colors.text }]}
                placeholder="0.0"
                placeholderTextColor={colors.textTertiary}
                value={laborHours}
                onChangeText={setLaborHours}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={[styles.halfField]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Parts Used</Text>
            <View style={[styles.inputWithIcon, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Package size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.inputText, { color: colors.text }]}
                placeholder="None"
                placeholderTextColor={colors.textTertiary}
                value={partsUsed}
                onChangeText={setPartsUsed}
              />
            </View>
          </View>
        </View>

        {/* Root Cause (Optional) */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Root Cause (Optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="What caused the issue?"
            placeholderTextColor={colors.textTertiary}
            value={rootCause}
            onChangeText={setRootCause}
          />
        </View>

        {/* Preventive Action (Optional) */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Preventive Action (Optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Recommendations to prevent recurrence"
            placeholderTextColor={colors.textTertiary}
            value={preventiveAction}
            onChangeText={setPreventiveAction}
          />
        </View>

        {/* Additional Notes */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: colors.text }]}>Additional Notes</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Any other relevant information..."
            placeholderTextColor={colors.textTertiary}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: accentColor + '10' }]}>
        <AlertTriangle size={16} color={accentColor} />
        <Text style={[styles.infoBannerText, { color: accentColor }]}>
          This will create a completed work order in CMMS history and mark the Task Feed task as complete.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: isSubmitting ? colors.border : accentColor }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#fff" />
              <Text style={styles.submitButtonText}>Complete Work Order</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  taskSummaryCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  taskSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  woIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskSummaryInfo: {
    flex: 1,
  },
  taskPostNumber: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  taskTemplateName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  taskDetailsGrid: {
    padding: 14,
    gap: 8,
  },
  taskDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskDetailText: {
    fontSize: 13,
  },
  originalPhotoSection: {
    padding: 14,
    paddingTop: 0,
  },
  originalPhotoLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginBottom: 8,
  },
  originalPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  formDataSection: {
    margin: 14,
    marginTop: 0,
    padding: 12,
    borderRadius: 10,
  },
  formDataTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  formDataRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  formDataKey: {
    fontSize: 12,
    fontWeight: '500' as const,
    marginRight: 6,
  },
  formDataValue: {
    fontSize: 12,
    flex: 1,
  },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    borderWidth: 1,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoCount: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  photoErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  photosScroll: {
    marginTop: 8,
  },
  photosScrollContent: {
    gap: 10,
  },
  photoContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMorePhoto: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
  },
  inputText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  bottomPadding: {
    height: 40,
  },
});
