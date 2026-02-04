import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Modal,
  Image,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Lock,
  ChevronRight,
  Shield,
  FileText,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  X,
  Zap,
  Users,
  Clock,
  ClipboardCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  Trash2,
  Save,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  LOTO_LEVELS,
  PERMIT_OPTIONS,
  LOTO_OPL_DOCUMENTS,
  LOTOLevelDefinition,
  LOTOOPLDocument,
} from '@/constants/lotoProgram';
import {
  useSafetyProgramDocuments,
  useUpdateSafetyDocument,
  useDeleteSafetyDocument,
  useSeedLOTODocuments,
} from '@/hooks/useSafetyProgramDocuments';
import {
  SafetyProgramDocument,
  SafetyDocumentSection,
  SAFETY_DOCUMENT_TYPE_INFO,
} from '@/types/safetyProgram';

export default function LOTOProgramScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<LOTOLevelDefinition | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['levels']));
  const [selectedOPL, setSelectedOPL] = useState<LOTOOPLDocument | null>(null);
  const [showOPLModal, setShowOPLModal] = useState(false);
  
  const [selectedDocument, setSelectedDocument] = useState<SafetyProgramDocument | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [editedDocument, setEditedDocument] = useState<Partial<SafetyProgramDocument>>({});
  const [editedSections, setEditedSections] = useState<SafetyDocumentSection[]>([]);
  const [expandedDocSections, setExpandedDocSections] = useState<Set<string>>(new Set());

  const { data: lotoDocuments, isLoading: loadingDocs, refetch } = useSafetyProgramDocuments('loto');
  const seedMutation = useSeedLOTODocuments();
  const updateMutation = useUpdateSafetyDocument();
  const deleteMutation = useDeleteSafetyDocument();

  useEffect(() => {
    if (!loadingDocs && lotoDocuments && lotoDocuments.length === 0) {
      console.log('[LOTOProgram] No documents found, seeding initial data...');
      seedMutation.mutate();
    }
  }, [loadingDocs, lotoDocuments, seedMutation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const toggleSection = useCallback((sectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const openLevelDetail = useCallback((level: LOTOLevelDefinition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLevel(level);
    setShowLevelModal(true);
  }, []);

  const openOPLDetail = useCallback((opl: LOTOOPLDocument) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOPL(opl);
    setShowOPLModal(true);
  }, []);

  

  const openOPLImage = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const openDocumentDetail = useCallback((doc: SafetyProgramDocument) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDocument(doc);
    setEditedDocument(doc);
    setEditedSections(doc.sections || []);
    setIsEditingDocument(false);
    setExpandedDocSections(new Set());
    setShowDocumentModal(true);
  }, []);

  const handleEditDocument = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditingDocument(true);
  }, []);

  const handleSaveDocument = useCallback(async () => {
    if (!selectedDocument) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await updateMutation.mutateAsync({
        id: selectedDocument.id,
        title: editedDocument.title,
        description: editedDocument.description,
        sections: editedSections,
        notes: editedDocument.notes,
      });
      
      setIsEditingDocument(false);
      setShowDocumentModal(false);
      Alert.alert('Success', 'Document updated successfully');
    } catch (error) {
      console.error('[LOTOProgram] Error updating document:', error);
      Alert.alert('Error', 'Failed to update document');
    }
  }, [selectedDocument, editedDocument, editedSections, updateMutation]);

  const handleDeleteDocument = useCallback(() => {
    if (!selectedDocument) return;
    
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${selectedDocument.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(selectedDocument.id);
              setShowDocumentModal(false);
              Alert.alert('Success', 'Document deleted');
            } catch (error) {
              console.error('[LOTOProgram] Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  }, [selectedDocument, deleteMutation]);

  const updateSectionContent = useCallback((sectionId: string, content: string) => {
    setEditedSections(prev => 
      prev.map(s => s.id === sectionId ? { ...s, content } : s)
    );
  }, []);

  const updateSubsectionContent = useCallback((sectionId: string, subIndex: number, content: string) => {
    setEditedSections(prev => 
      prev.map(s => {
        if (s.id === sectionId && s.subsections) {
          const newSubs = [...s.subsections];
          newSubs[subIndex] = { ...newSubs[subIndex], content };
          return { ...s, subsections: newSubs };
        }
        return s;
      })
    );
  }, []);

  const toggleDocSection = useCallback((sectionId: string) => {
    setExpandedDocSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const policyDocument = lotoDocuments?.find(d => d.document_type === 'policy');

  const renderLevelRow = (level: LOTOLevelDefinition) => (
    <Pressable
      key={level.level}
      style={({ pressed }) => [
        styles.levelRow,
        { backgroundColor: pressed ? colors.surface : 'transparent' },
      ]}
      onPress={() => openLevelDetail(level)}
    >
      <View style={[styles.levelBadgeSmall, { backgroundColor: level.color + '20' }]}>
        <Text style={[styles.levelNumberSmall, { color: level.color }]}>{level.level}</Text>
      </View>
      <View style={styles.levelRowContent}>
        <Text style={[styles.levelRowName, { color: colors.text }]} numberOfLines={1}>
          {level.name}
        </Text>
        <View style={styles.levelRowDetails}>
          <Text style={[styles.levelRowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
            {level.energyHazard}
          </Text>
          <Text style={[styles.levelRowSeparator, { color: colors.border }]}>•</Text>
          <Text style={[styles.levelRowDetail, { color: colors.textSecondary }]} numberOfLines={1}>
            {level.procedureComplexity}
          </Text>
        </View>
      </View>
      <View style={styles.levelRowMeta}>
        <Users size={12} color={colors.textSecondary} />
        <Text style={[styles.levelRowMetaText, { color: colors.textSecondary }]}>
          {level.minAuthorizedPersonnel}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.textSecondary} />
    </Pressable>
  );

  const renderLevelsTable = () => (
    <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.tableHeaderLevel}>
          <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>LVL</Text>
        </View>
        <View style={styles.tableHeaderName}>
          <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>HAZARD / COMPLEXITY</Text>
        </View>
        <View style={styles.tableHeaderMeta}>
          <Users size={12} color={colors.textSecondary} />
        </View>
        <View style={styles.tableHeaderAction} />
      </View>
      {Object.values(LOTO_LEVELS).map((level, index) => (
        <View key={level.level}>
          {index > 0 && <View style={[styles.tableDivider, { backgroundColor: colors.border }]} />}
          {renderLevelRow(level)}
        </View>
      ))}
    </View>
  );

  const renderDocumentRow = (doc: SafetyProgramDocument) => {
    const typeInfo = SAFETY_DOCUMENT_TYPE_INFO[doc.document_type] || { label: 'Document', color: '#6B7280' };
    return (
      <Pressable
        key={doc.id}
        style={({ pressed }) => [
          styles.docRow,
          { backgroundColor: pressed ? colors.surface : 'transparent' },
        ]}
        onPress={() => openDocumentDetail(doc)}
      >
        <View style={[styles.docTypeIconSmall, { backgroundColor: typeInfo.color + '15' }]}>
          {doc.document_type === 'policy' && <Shield size={14} color={typeInfo.color} />}
          {doc.document_type === 'procedure' && <FileText size={14} color={typeInfo.color} />}
          {doc.document_type === 'form' && <ClipboardCheck size={14} color={typeInfo.color} />}
          {doc.document_type === 'training' && <GraduationCap size={14} color={typeInfo.color} />}
          {doc.document_type === 'reference' && <BookOpen size={14} color={typeInfo.color} />}
        </View>
        <View style={styles.docRowContent}>
          <Text style={[styles.docRowTitle, { color: colors.text }]} numberOfLines={1}>
            {doc.title}
          </Text>
          <Text style={[styles.docRowDescription, { color: colors.textSecondary }]} numberOfLines={1}>
            {doc.description}
          </Text>
        </View>
        <View style={styles.docRowMeta}>
          <View style={[styles.docTypeBadgeSmall, { backgroundColor: typeInfo.color + '15' }]}>
            <Text style={[styles.docTypeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
          </View>
          {doc.version && (
            <Text style={[styles.docVersionSmall, { color: colors.textSecondary }]}>v{doc.version}</Text>
          )}
        </View>
        <ChevronRight size={16} color={colors.textSecondary} />
      </Pressable>
    );
  };

  const renderDocumentsTable = () => {
    if (loadingDocs) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading documents...</Text>
        </View>
      );
    }

    const documentsByType: Record<string, SafetyProgramDocument[]> = {
      policy: lotoDocuments?.filter(d => d.document_type === 'policy') || [],
      procedure: lotoDocuments?.filter(d => d.document_type === 'procedure') || [],
      form: lotoDocuments?.filter(d => d.document_type === 'form') || [],
      training: lotoDocuments?.filter(d => d.document_type === 'training') || [],
      reference: lotoDocuments?.filter(d => d.document_type === 'reference') || [],
    };

    return (
      <View style={[styles.tableContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.docTableHeaderIcon} />
          <View style={styles.docTableHeaderName}>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>DOCUMENT</Text>
          </View>
          <View style={styles.docTableHeaderType}>
            <Text style={[styles.tableHeaderText, { color: colors.textSecondary }]}>TYPE</Text>
          </View>
          <View style={styles.tableHeaderAction} />
        </View>
        
        {Object.entries(documentsByType).map(([type, docs]) => {
          if (docs.length === 0) return null;
          const typeInfo = SAFETY_DOCUMENT_TYPE_INFO[type as keyof typeof SAFETY_DOCUMENT_TYPE_INFO] || { label: type, color: '#6B7280' };
          return (
            <View key={type}>
              <View style={[styles.docTypeGroupHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.docTypeGroupTitle, { color: typeInfo.color }]}>
                  {typeInfo.label.toUpperCase()}S ({docs.length})
                </Text>
              </View>
              {docs.map((doc, index) => (
                <View key={doc.id}>
                  {index > 0 && <View style={[styles.tableDivider, { backgroundColor: colors.border }]} />}
                  {renderDocumentRow(doc)}
                </View>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPermitCard = (permit: typeof PERMIT_OPTIONS[0]) => (
    <View
      key={permit.id}
      style={[styles.permitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.permitIcon, { backgroundColor: permit.color + '15' }]}>
        <FileText size={18} color={permit.color} />
      </View>
      <View style={styles.permitContent}>
        <Text style={[styles.permitTitle, { color: colors.text }]}>{permit.label}</Text>
        <Text style={[styles.permitDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {permit.description}
        </Text>
        <View style={styles.permitMeta}>
          <View style={styles.permitMetaItem}>
            <Clock size={12} color={colors.textSecondary} />
            <Text style={[styles.permitMetaText, { color: colors.textSecondary }]}>
              Valid {permit.validHours}h
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderLevelDetailModal = () => {
    if (!selectedLevel) return null;

    return (
      <Modal visible={showLevelModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalLevelBadge, { backgroundColor: selectedLevel.color + '20' }]}>
                <Text style={[styles.modalLevelNumber, { color: selectedLevel.color }]}>
                  {selectedLevel.level}
                </Text>
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Level {selectedLevel.level}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedLevel.name}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setShowLevelModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Zap size={18} color={selectedLevel.color} />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Energy Hazard</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLevel.energyHazard}</Text>
                  <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                    {selectedLevel.energyDescription}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.detailRow}>
                <ClipboardCheck size={18} color={selectedLevel.color} />
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Procedure Complexity</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedLevel.procedureComplexity}</Text>
                  <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                    {selectedLevel.procedureDescription}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <Users size={16} color={colors.primary} />
                  <Text style={[styles.requirementText, { color: colors.text }]}>
                    Minimum {selectedLevel.minAuthorizedPersonnel} authorized person{selectedLevel.minAuthorizedPersonnel > 1 ? 'nel' : ''}
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  {selectedLevel.requiresSupervisorApproval ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <X size={16} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.requirementText, { color: colors.text }]}>
                    Supervisor approval {selectedLevel.requiresSupervisorApproval ? 'required' : 'not required'}
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  {selectedLevel.requiresSafetyOfficerApproval ? (
                    <CheckCircle2 size={16} color="#10B981" />
                  ) : (
                    <X size={16} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.requirementText, { color: colors.text }]}>
                    Safety Officer approval {selectedLevel.requiresSafetyOfficerApproval ? 'required' : 'not required'}
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Clock size={16} color={colors.primary} />
                  <Text style={[styles.requirementText, { color: colors.text }]}>
                    {selectedLevel.maxDurationHours 
                      ? `Maximum duration: ${selectedLevel.maxDurationHours} hours`
                      : 'No maximum duration limit'}
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <FileText size={16} color={colors.primary} />
                  <Text style={[styles.requirementText, { color: colors.text }]}>
                    Review frequency: Every {selectedLevel.reviewFrequencyDays} days
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Required Training</Text>
              <View style={styles.trainingList}>
                {selectedLevel.requiredTraining.map((training, index) => (
                  <View key={index} style={[styles.trainingItem, { backgroundColor: colors.background }]}>
                    <GraduationCap size={14} color={colors.primary} />
                    <Text style={[styles.trainingText, { color: colors.text }]}>{training}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Typical Examples</Text>
              <View style={styles.examplesList}>
                {selectedLevel.typicalExamples.map((example, index) => (
                  <View key={index} style={styles.exampleItem}>
                    <View style={[styles.exampleBullet, { backgroundColor: selectedLevel.color }]} />
                    <Text style={[styles.exampleText, { color: colors.text }]}>{example}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderDocumentModal = () => {
    if (!selectedDocument) return null;

    const typeInfo = SAFETY_DOCUMENT_TYPE_INFO[selectedDocument.document_type] || { label: 'Document', color: '#6B7280' };

    return (
      <Modal visible={showDocumentModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.policyIconContainer, { backgroundColor: typeInfo.color + '20' }]}>
                {selectedDocument.document_type === 'policy' ? (
                  <Shield size={24} color={typeInfo.color} />
                ) : (
                  <FileText size={24} color={typeInfo.color} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                {isEditingDocument ? (
                  <TextInput
                    style={[styles.editTitleInput, { color: colors.text, borderColor: colors.border }]}
                    value={editedDocument.title}
                    onChangeText={(text) => setEditedDocument(prev => ({ ...prev, title: text }))}
                    placeholder="Document Title"
                    placeholderTextColor={colors.textSecondary}
                  />
                ) : (
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedDocument.title}</Text>
                )}
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Version {selectedDocument.version} • {selectedDocument.document_number}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setShowDocumentModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.documentActions, { borderBottomColor: colors.border }]}>
            {isEditingDocument ? (
              <>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setIsEditingDocument(false);
                    setEditedDocument(selectedDocument);
                    setEditedSections(selectedDocument.sections || []);
                  }}
                >
                  <X size={18} color={colors.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                  onPress={handleSaveDocument}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Save size={18} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Save</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                  onPress={handleEditDocument}
                >
                  <Edit3 size={18} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
                  onPress={handleDeleteDocument}
                >
                  <Trash2 size={18} color="#EF4444" />
                  <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                </Pressable>
              </>
            )}
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <View style={[styles.policyMeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.policyMetaRow}>
                <Text style={[styles.policyMetaLabel, { color: colors.textSecondary }]}>Status:</Text>
                <Text style={[styles.policyMetaValue, { color: colors.text }]}>{selectedDocument.status}</Text>
              </View>
              {selectedDocument.effective_date && (
                <View style={styles.policyMetaRow}>
                  <Text style={[styles.policyMetaLabel, { color: colors.textSecondary }]}>Effective Date:</Text>
                  <Text style={[styles.policyMetaValue, { color: colors.text }]}>{selectedDocument.effective_date}</Text>
                </View>
              )}
              {selectedDocument.last_reviewed && (
                <View style={styles.policyMetaRow}>
                  <Text style={[styles.policyMetaLabel, { color: colors.textSecondary }]}>Last Reviewed:</Text>
                  <Text style={[styles.policyMetaValue, { color: colors.text }]}>{selectedDocument.last_reviewed}</Text>
                </View>
              )}
              {selectedDocument.next_review && (
                <View style={styles.policyMetaRow}>
                  <Text style={[styles.policyMetaLabel, { color: colors.textSecondary }]}>Next Review:</Text>
                  <Text style={[styles.policyMetaValue, { color: colors.text }]}>{selectedDocument.next_review}</Text>
                </View>
              )}
              {selectedDocument.approver && (
                <View style={styles.policyMetaRow}>
                  <Text style={[styles.policyMetaLabel, { color: colors.textSecondary }]}>Approved By:</Text>
                  <Text style={[styles.policyMetaValue, { color: colors.text }]}>{selectedDocument.approver}</Text>
                </View>
              )}
            </View>

            {isEditingDocument && (
              <View style={[styles.editDescSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.descriptionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={editedDocument.description || ''}
                  onChangeText={(text) => setEditedDocument(prev => ({ ...prev, description: text }))}
                  placeholder="Document description..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {editedSections.map((section) => (
              <View key={section.id} style={[styles.policySectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Pressable
                  style={styles.policySectionHeader}
                  onPress={() => toggleDocSection(section.id)}
                >
                  <Text style={[styles.policySectionTitle, { color: colors.text }]}>{section.title}</Text>
                  {expandedDocSections.has(section.id) ? (
                    <ChevronUp size={18} color={colors.textSecondary} />
                  ) : (
                    <ChevronDown size={18} color={colors.textSecondary} />
                  )}
                </Pressable>
                {expandedDocSections.has(section.id) && (
                  <View style={styles.policySectionContent}>
                    {isEditingDocument ? (
                      <TextInput
                        style={[styles.sectionContentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={section.content}
                        onChangeText={(text) => updateSectionContent(section.id, text)}
                        placeholder="Section content..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                      />
                    ) : (
                      section.content && (
                        <Text style={[styles.policySectionText, { color: colors.textSecondary }]}>
                          {section.content}
                        </Text>
                      )
                    )}
                    {section.subsections && section.subsections.map((sub, idx) => (
                      <View key={idx} style={styles.policySubsection}>
                        <Text style={[styles.policySubsectionTitle, { color: colors.text }]}>{sub.title}</Text>
                        {isEditingDocument ? (
                          <TextInput
                            style={[styles.subsectionContentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                            value={sub.content}
                            onChangeText={(text) => updateSubsectionContent(section.id, idx, text)}
                            placeholder="Subsection content..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                          />
                        ) : (
                          <Text style={[styles.policySubsectionText, { color: colors.textSecondary }]}>{sub.content}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: '#DC262620' }]}>
          <Lock size={32} color="#DC2626" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>LOTO Program</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Lockout/Tagout energy control program with hazard levels 0-5
        </Text>
      </View>

      <View style={[styles.alertCard, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
        <AlertTriangle size={20} color="#F59E0B" />
        <View style={styles.alertContent}>
          <Text style={[styles.alertTitle, { color: '#F59E0B' }]}>Important Safety Program</Text>
          <Text style={[styles.alertText, { color: colors.text }]}>
            All maintenance work must be assessed for LOTO requirements. Select the appropriate level based on energy hazards and procedure complexity.
          </Text>
        </View>
      </View>

      {policyDocument && (
        <Pressable
          style={[styles.masterPolicyCard, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED40' }]}
          onPress={() => openDocumentDetail(policyDocument)}
        >
          <View style={[styles.policyIcon, { backgroundColor: '#7C3AED25' }]}>
            <Shield size={28} color="#7C3AED" />
          </View>
          <View style={styles.policyContent}>
            <Text style={[styles.policyTitle, { color: colors.text }]}>{policyDocument.title}</Text>
            <Text style={[styles.policySubtitle, { color: colors.textSecondary }]}>
              Version {policyDocument.version} • {policyDocument.sections?.length || 0} sections
            </Text>
          </View>
          <ChevronRight size={20} color="#7C3AED" />
        </Pressable>
      )}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('levels')}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: '#DC262615' }]}>
            <Zap size={20} color="#DC2626" />
          </View>
          <View>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>LOTO Levels (0-5)</Text>
            <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
              Energy hazard & procedure complexity
            </Text>
          </View>
        </View>
        {expandedSections.has('levels') ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </Pressable>

      {expandedSections.has('levels') && renderLevelsTable()}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('documents')}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: '#3B82F615' }]}>
            <FileText size={20} color="#3B82F6" />
          </View>
          <View>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Program Documents</Text>
            <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
              {lotoDocuments?.length || 0} documents
            </Text>
          </View>
        </View>
        {expandedSections.has('documents') ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </Pressable>

      {expandedSections.has('documents') && renderDocumentsTable()}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('opls')}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: '#10B98115' }]}>
            <BookOpen size={20} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>LOTO Level OPLs</Text>
            <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
              {LOTO_OPL_DOCUMENTS.length} One Point Lessons
            </Text>
          </View>
        </View>
        {expandedSections.has('opls') ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </Pressable>

      {expandedSections.has('opls') && renderOPLsSection()}

      <Pressable
        style={[styles.sectionHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => toggleSection('permits')}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: '#10B98115' }]}>
            <ClipboardCheck size={20} color="#10B981" />
          </View>
          <View>
            <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>Related Permits</Text>
            <Text style={[styles.sectionHeaderSubtitle, { color: colors.textSecondary }]}>
              {PERMIT_OPTIONS.length} permit types
            </Text>
          </View>
        </View>
        {expandedSections.has('permits') ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </Pressable>

      {expandedSections.has('permits') && (
        <View style={styles.permitsList}>
          {PERMIT_OPTIONS.map(renderPermitCard)}
        </View>
      )}

      <Pressable
        style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/safety/lotopermit');
        }}
      >
        <Lock size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Create LOTO Permit</Text>
      </Pressable>

      <View style={styles.bottomPadding} />

      {renderLevelDetailModal()}
      {renderOPLDetailModal()}
      {renderDocumentModal()}
    </ScrollView>
  );

  function renderOPLsSection() {
    return (
      <View style={[styles.oplsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {LOTO_OPL_DOCUMENTS.map((opl, index) => (
          <View key={opl.id}>
            {index > 0 && <View style={[styles.tableDivider, { backgroundColor: colors.border }]} />}
            <Pressable
              style={({ pressed }) => [
                styles.oplRow,
                { backgroundColor: pressed ? colors.background : 'transparent' },
              ]}
              onPress={() => openOPLDetail(opl)}
            >
              <View style={[styles.oplLevelBadge, { backgroundColor: opl.color + '20' }]}>
                <Text style={[styles.oplLevelNumber, { color: opl.color }]}>{opl.level}</Text>
              </View>
              <View style={styles.oplContent}>
                <Text style={[styles.oplTitle, { color: colors.text }]} numberOfLines={1}>
                  {opl.title}
                </Text>
                <Text style={[styles.oplSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {opl.subtitle}
                </Text>
              </View>
              <View style={[styles.oplImagePreview, { borderColor: colors.border }]}>
                <Image
                  source={{ uri: opl.imageUrl }}
                  style={styles.oplThumbnail}
                  resizeMode="cover"
                />
              </View>
              <ChevronRight size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    );
  }

  function renderOPLDetailModal() {
    if (!selectedOPL) return null;

    return (
      <Modal visible={showOPLModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.modalLevelBadge, { backgroundColor: selectedOPL.color + '20' }]}>
                <Text style={[styles.modalLevelNumber, { color: selectedOPL.color }]}>
                  {selectedOPL.level}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedOPL.title}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {selectedOPL.subtitle}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setShowOPLModal(false)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentContainer}>
            <Pressable
              style={[styles.oplImageContainer, { borderColor: colors.border }]}
              onPress={() => openOPLImage(selectedOPL.imageUrl)}
            >
              <Image
                source={{ uri: selectedOPL.imageUrl }}
                style={styles.oplFullImage}
                resizeMode="contain"
              />
              <View style={[styles.viewFullOverlay, { backgroundColor: colors.primary + '90' }]}>
                <Eye size={16} color="#fff" />
                <Text style={styles.viewFullText}>Tap to view full size</Text>
              </View>
            </Pressable>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>
                {selectedOPL.description}
              </Text>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Typical Examples</Text>
              <View style={styles.bulletList}>
                {selectedOPL.typicalExamples.map((item, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <View style={[styles.bullet, { backgroundColor: selectedOPL.color }]} />
                    <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
              <View style={styles.bulletList}>
                {selectedOPL.requirements.map((item, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <CheckCircle2 size={14} color="#10B981" />
                    <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={[styles.halfSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>Training Required</Text>
                {selectedOPL.trainingRequired.map((item, idx) => (
                  <View key={idx} style={styles.smallBulletItem}>
                    <GraduationCap size={12} color={colors.primary} />
                    <Text style={[styles.smallBulletText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.halfSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>Approval Required</Text>
                {selectedOPL.approvalRequired.map((item, idx) => (
                  <View key={idx} style={styles.smallBulletItem}>
                    <Shield size={12} color={colors.primary} />
                    <Text style={[styles.smallBulletText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.twoColumnRow}>
              <View style={[styles.halfSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>PPE Requirements</Text>
                {selectedOPL.ppeRequirements.map((item, idx) => (
                  <View key={idx} style={styles.smallBulletItem}>
                    <AlertTriangle size={12} color="#F59E0B" />
                    <Text style={[styles.smallBulletText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.halfSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>Permits Required</Text>
                {selectedOPL.permitsRequired.map((item, idx) => (
                  <View key={idx} style={styles.smallBulletItem}>
                    <FileText size={12} color="#3B82F6" />
                    <Text style={[styles.smallBulletText, { color: colors.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.detailSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Steps</Text>
              <View style={styles.bulletList}>
                {selectedOPL.keySteps.map((item, idx) => (
                  <View key={idx} style={styles.stepItem}>
                    <Text style={[styles.stepText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
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
  alertCard: {
    flexDirection: 'row' as const,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  sectionHeaderSubtitle: {
    fontSize: 13,
  },
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden' as const,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderLevel: {
    width: 36,
    alignItems: 'center' as const,
  },
  tableHeaderName: {
    flex: 1,
    paddingLeft: 10,
  },
  tableHeaderMeta: {
    width: 32,
    alignItems: 'center' as const,
  },
  tableHeaderAction: {
    width: 20,
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tableDivider: {
    height: 1,
    marginLeft: 12,
  },
  levelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  levelBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  levelNumberSmall: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  levelRowContent: {
    flex: 1,
    paddingLeft: 10,
  },
  levelRowName: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  levelRowDetails: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flexWrap: 'wrap' as const,
  },
  levelRowDetail: {
    fontSize: 11,
  },
  levelRowSeparator: {
    fontSize: 11,
    marginHorizontal: 4,
  },
  levelRowMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    width: 32,
    justifyContent: 'center' as const,
  },
  levelRowMetaText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  docRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingLeft: 24,
  },
  docTypeIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  docRowContent: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 8,
  },
  docRowTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  docRowDescription: {
    fontSize: 11,
  },
  docRowMeta: {
    alignItems: 'flex-end' as const,
    marginRight: 8,
  },
  docTypeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  docTypeBadgeText: {
    fontSize: 9,
    fontWeight: '600' as const,
  },
  docVersionSmall: {
    fontSize: 10,
  },
  docTableHeaderIcon: {
    width: 28,
  },
  docTableHeaderName: {
    flex: 1,
    paddingLeft: 10,
  },
  docTableHeaderType: {
    width: 60,
    alignItems: 'flex-end' as const,
    marginRight: 8,
  },
  docTypeGroupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  docTypeGroupTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  permitsList: {
    gap: 10,
    marginBottom: 16,
  },
  permitCard: {
    flexDirection: 'row' as const,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  permitIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  permitContent: {
    flex: 1,
  },
  permitTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  permitDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  permitMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  permitMetaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  permitMetaText: {
    fontSize: 11,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  bottomPadding: {
    height: 32,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  modalLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  modalLevelNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    gap: 12,
  },
  detailSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  detailDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  requirementsList: {
    gap: 10,
  },
  requirementItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  requirementText: {
    fontSize: 14,
    flex: 1,
  },
  trainingList: {
    gap: 8,
  },
  trainingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  trainingText: {
    fontSize: 14,
    flex: 1,
  },
  examplesList: {
    gap: 8,
  },
  exampleItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  exampleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  exampleText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  masterPolicyCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 14,
  },
  policyIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  policySubtitle: {
    fontSize: 13,
  },
  oplsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden' as const,
  },
  oplRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    gap: 10,
  },
  oplLevelBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  oplLevelNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  oplContent: {
    flex: 1,
  },
  oplTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  oplSubtitle: {
    fontSize: 12,
  },
  oplImagePreview: {
    width: 50,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  oplThumbnail: {
    width: '100%',
    height: '100%',
  },
  oplImageContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden' as const,
    marginBottom: 16,
    position: 'relative' as const,
  },
  oplFullImage: {
    width: '100%',
    height: 280,
  },
  viewFullOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 8,
  },
  viewFullText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500' as const,
  },
  bulletList: {
    gap: 8,
  },
  bulletItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  twoColumnRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 12,
  },
  halfSection: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  sectionTitleSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 10,
  },
  smallBulletItem: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    marginBottom: 6,
  },
  smallBulletText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  stepItem: {
    paddingVertical: 6,
    paddingLeft: 4,
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
  },
  policyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  policyMeta: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  policyMetaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 6,
  },
  policyMetaLabel: {
    fontSize: 13,
  },
  policyMetaValue: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  policySectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden' as const,
  },
  policySectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 14,
  },
  policySectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    flex: 1,
  },
  policySectionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  policySectionText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  policySubsection: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#7C3AED40',
  },
  policySubsectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  policySubsectionText: {
    fontSize: 12,
    lineHeight: 18,
  },
  loadingContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 16,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  documentActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  editTitleInput: {
    fontSize: 18,
    fontWeight: '700' as const,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editDescSection: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  descriptionInput: {
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  sectionContentInput: {
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top' as const,
    marginBottom: 10,
  },
  subsectionContentInput: {
    fontSize: 12,
    lineHeight: 18,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
});
