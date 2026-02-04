import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Lock,
  Shield,
  HardHat,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  MapPin,
  Wrench,
  Plus,
  Trash2,
  Camera,
  FileText,
  Image as ImageIcon,
  Zap,
  Edit3,
  Save,
  Play,
  CheckSquare,
  Package,
  Scan,
  DollarSign,
  Minus,
  Search,
  Cog,
  Droplets,
  Wind,
  Gauge,
  Box,
  GitBranch,
  User,
  Cloud,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DetailedWorkOrder,
  PERMIT_TYPES,
  PPE_ITEMS,
  PPE_CATEGORIES,
  LOCK_COLORS,
  DEFAULT_LOTO_STEPS,
  DepartmentType,
  DepartmentWorkflow,
  CompletedDocumentationSection,
  PermitType,
  PermitSubmission,
  generatePermitId,
} from '@/mocks/workOrderData';
import DepartmentDocumentation from '@/components/DepartmentDocumentation';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Material } from '@/mocks/inventoryData';
import {
  WorkOrderPartLine,
  WorkOrderPartSummary,
  getWorkOrderPartSummary,
  getPartRequestsByWorkOrder,
} from '@/mocks/partsToWorkOrderData';
import {
  useWorkOrderStockWarnings,
  getPartStockSeverityColor,
  getPartStockSeverityLabel,
} from '@/hooks/useWorkOrderStockWarnings';
import {
  FailureCode,
  FailureCodeCategory,
  FAILURE_CODE_CATEGORIES,
} from '@/mocks/failureCodesData';
import { DowntimeEvent as MockDowntimeEvent } from '@/mocks/downtimeData';
import { useWorkOrderDowntimeQuery, useResolveDowntimeEvent, DowntimeEvent } from '@/hooks/useSupabaseDowntime';
import { useMaterialsQuery, MaterialWithLabels } from '@/hooks/useSupabaseMaterials';
import { useFailureCodesQuery, useFailureCodeCategories } from '@/hooks/useSupabaseFailureCodes';
import { useUpdateWorkOrderDetail, useUploadAttachment, useDeleteAttachment, useWorkOrderParts, useStartWorkOrder, useCompleteWorkOrder } from '@/hooks/useSupabaseWorkOrders';

export interface DowntimeCompletionData {
  downtimeId: string;
  resumed_at: string;
  duration_minutes: number;
  status: 'completed';
  notes?: string;
}


interface WorkOrderDetailProps {
  workOrder: DetailedWorkOrder;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DetailedWorkOrder>) => void;
  onStartWork?: (id: string) => void;
  onCompleteWork?: (id: string, downtimeData?: DowntimeCompletionData) => void;
  canEdit?: boolean;
  userId?: string;
  userName?: string;
  userDepartment?: DepartmentType;
  onSubmitPermit?: (permit: PermitSubmission) => void;
  downtimeEvent?: DowntimeEvent | MockDowntimeEvent | null;
  onUpdateDowntime?: (downtimeId: string, updates: Partial<DowntimeEvent | MockDowntimeEvent>) => void;
}

type SectionType = 'info' | 'loto' | 'permits' | 'ppe' | 'tasks' | 'attachments' | 'parts';

const priorityColors: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

const statusColors: Record<string, string> = {
  open: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#10B981',
  on_hold: '#6B7280',
  cancelled: '#EF4444',
};

const typeColors: Record<string, string> = {
  corrective: '#EF4444',
  preventive: '#3B82F6',
  emergency: '#DC2626',
  request: '#8B5CF6',
};

const DEFAULT_LABOR_RATE = 75.00;

export default function WorkOrderDetail({
  workOrder,
  onClose,
  onUpdate,
  onStartWork,
  onCompleteWork,
  canEdit = true,
  userId = 'current-user',
  userName = 'Current User',
  userDepartment = 'maintenance',
  onSubmitPermit,
  downtimeEvent,
  onUpdateDowntime,
}: WorkOrderDetailProps) {
  const { colors } = useTheme();

  // Supabase data hooks
  const { data: materialsData = [] } = useMaterialsQuery();
  const [failureCodeCategoryFilter, setFailureCodeCategoryFilter] = useState<FailureCodeCategory | 'all'>('all');
  
  // Pass category filter to Supabase query for server-side filtering
  const { data: failureCodesData = [], isLoading: isLoadingFailureCodes } = useFailureCodesQuery({ 
    isActive: true,
    category: failureCodeCategoryFilter !== 'all' ? failureCodeCategoryFilter : undefined,
  });
  const { data: failureCodeCategoriesData = FAILURE_CODE_CATEGORIES } = useFailureCodeCategories();
  
  // Fetch parts assigned to this work order from Supabase
  const { data: supabasePartsData, isLoading: isLoadingParts, error: partsError, refetch: refetchParts } = useWorkOrderParts(workOrder.id);
  console.log('[WorkOrderDetail] Supabase parts data:', supabasePartsData?.length || 0, 'part requests');

  // Fetch downtime data for this work order from Supabase
  const { data: supabaseDowntimeData } = useWorkOrderDowntimeQuery(workOrder.id);
  
  // Use Supabase downtime data if available, fallback to prop
  const activeDowntimeEvent = supabaseDowntimeData || downtimeEvent;
  console.log('[WorkOrderDetail] Downtime event:', activeDowntimeEvent?.id || 'none', 'status:', activeDowntimeEvent?.status || 'N/A');

  // Flatten all part request lines from Supabase into linkedParts format
  const supabaseLinkedParts = useMemo(() => {
    if (!supabasePartsData || supabasePartsData.length === 0) return [];
    return supabasePartsData.flatMap(request => request.lines);
  }, [supabasePartsData]);
  
  // Mutation for updating work order (notes, etc.)
  const updateWorkOrderMutation = useUpdateWorkOrderDetail({
    onSuccess: (data) => {
      console.log('[WorkOrderDetail] Notes saved successfully:', data.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to save notes:', error);
      Alert.alert('Error', 'Failed to save notes. Please try again.');
    },
  });

  // Mutation for uploading attachments to Supabase Storage
  const uploadAttachmentMutation = useUploadAttachment({
    onSuccess: (attachment) => {
      console.log('[WorkOrderDetail] Attachment uploaded:', attachment.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate(workOrder.id, {
        attachments: [...workOrder.attachments, attachment],
      });
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to upload attachment:', error);
      Alert.alert('Upload Failed', 'Could not upload attachment. Please try again.');
    },
  });

  // Mutation for deleting attachments from Supabase Storage
  const deleteAttachmentMutation = useDeleteAttachment();

  // Mutation for starting work on work order
  const startWorkMutation = useStartWorkOrder({
    onSuccess: (data) => {
      console.log('[WorkOrderDetail] Work started successfully:', data.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate(workOrder.id, { status: 'in_progress', started_at: new Date().toISOString() });
      onStartWork?.(workOrder.id);
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to start work:', error);
      Alert.alert('Error', 'Failed to start work. Please try again.');
    },
  });

  // Mutation for completing work order
  const completeWorkOrderMutation = useCompleteWorkOrder({
    onSuccess: (data) => {
      console.log('[WorkOrderDetail] Work order completed successfully:', data.id);
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to complete work order:', error);
    },
  });

  // Mutation for resolving downtime event
  const resolveDowntimeMutation = useResolveDowntimeEvent({
    onSuccess: (data) => {
      console.log('[WorkOrderDetail] Downtime resolved successfully:', data.id, 'duration:', data.duration_minutes, 'min');
    },
    onError: (error) => {
      console.error('[WorkOrderDetail] Failed to resolve downtime:', error);
    },
  });
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set(['info', 'tasks'])
  );
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(workOrder.notes);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [showPPEModal, setShowPPEModal] = useState(false);
  const [showLOTOModal, setShowLOTOModal] = useState(false);
  const [editingLotoStep, setEditingLotoStep] = useState<{
    id: string;
    description: string;
    lockColor?: string;
    energySource?: string;
    location?: string;
  } | null>(null);
  const [newLotoStep, setNewLotoStep] = useState({
    description: '',
    lockColor: '',
    energySource: '',
    location: '',
  });
  const [showPermitFormModal, setShowPermitFormModal] = useState(false);
  const [selectedPermitType, setSelectedPermitType] = useState<PermitType | null>(null);
  const [permitFormData, setPermitFormData] = useState<Record<string, any>>({});
  const [permitSubmissions, setPermitSubmissions] = useState<PermitSubmission[]>([]);

  // Initialize permit submissions from persisted work order data
  useEffect(() => {
    const persistedPermits: PermitSubmission[] = [];
    const permitNumbers = workOrder.safety.permitNumbers || {};
    const permitExpiry = workOrder.safety.permitExpiry || {};
    
    Object.entries(permitNumbers).forEach(([permitTypeId, permitId]) => {
      const permitType = PERMIT_TYPES.find(p => p.id === permitTypeId);
      if (permitType && permitId) {
        const expiresAt = permitExpiry[permitTypeId];
        const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
        
        persistedPermits.push({
          id: permitId,
          permitTypeId,
          workOrderId: workOrder.id,
          workOrderNumber: workOrder.workOrderNumber,
          submittedBy: workOrder.requestedBy || userId,
          submittedByName: workOrder.assignedName || userName,
          submittedAt: workOrder.created_at,
          status: isExpired ? 'expired' : 'approved',
          expiresAt: expiresAt || undefined,
          formData: {},
          location: workOrder.location,
          equipment: workOrder.equipment,
        });
      }
    });
    
    if (persistedPermits.length > 0) {
      console.log('[WorkOrderDetail] Initialized permit submissions from persisted data:', persistedPermits.length);
      setPermitSubmissions(persistedPermits);
    }
  }, [workOrder.id, workOrder.safety.permitNumbers, workOrder.safety.permitExpiry, workOrder.workOrderNumber, workOrder.requestedBy, workOrder.assignedName, workOrder.created_at, workOrder.location, workOrder.equipment, userId, userName]);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [partsSearchQuery, setPartsSearchQuery] = useState('');
  
  // Modal inventory query with search params
  const { data: modalMaterialsData = [], isLoading: isLoadingModalMaterials } = useMaterialsQuery({
    filters: partsSearchQuery.trim() ? [{ column: 'name', operator: 'ilike', value: `%${partsSearchQuery.trim()}%` }] : undefined,
    limit: 50,
  });
  const [linkedParts, setLinkedParts] = useState<WorkOrderPartLine[]>([]);
  const [partsInitialized, setPartsInitialized] = useState(false);

  // Initialize linkedParts from Supabase data when it loads
  useEffect(() => {
    if (supabaseLinkedParts.length > 0 && !partsInitialized) {
      console.log('[WorkOrderDetail] Initializing parts from Supabase:', supabaseLinkedParts.length, 'lines');
      setLinkedParts(supabaseLinkedParts);
      setPartsInitialized(true);
    }
  }, [supabaseLinkedParts, partsInitialized]);
  const [partQuantities, setPartQuantities] = useState<Record<string, number>>({});
  const [showFailureCodeModal, setShowFailureCodeModal] = useState(false);
  const [failureCodeSearch, setFailureCodeSearch] = useState('');
  const [selectedFailureCode, setSelectedFailureCode] = useState<FailureCode | null>(null);
  const [linkedFailureCode, setLinkedFailureCode] = useState<FailureCode | null>(null);
  const [expandedFailureCodeCategories, setExpandedFailureCodeCategories] = useState<Set<FailureCodeCategory>>(new Set());

  // Initialize expanded categories when data loads
  useEffect(() => {
    if (failureCodeCategoriesData.length > 0 && expandedFailureCodeCategories.size === 0) {
      setExpandedFailureCodeCategories(new Set(failureCodeCategoriesData.map(c => c.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failureCodeCategoriesData]);

  // Downtime completion state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [resumedAt, setResumedAt] = useState<Date>(new Date());
  const [completionNotes, setCompletionNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Live downtime timer
  const [downtimeDuration, setDowntimeDuration] = useState<string>('');

  useEffect(() => {
    if (!activeDowntimeEvent || activeDowntimeEvent.status !== 'ongoing' || !activeDowntimeEvent.stopped_at) {
      setDowntimeDuration('');
      return;
    }

    const calculateDuration = () => {
      const startTime = new Date(activeDowntimeEvent.stopped_at!).getTime();
      const now = Date.now();
      const diffMs = now - startTime;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      const seconds = Math.floor((diffMs / 1000) % 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    };

    setDowntimeDuration(calculateDuration());
    const interval = setInterval(() => {
      setDowntimeDuration(calculateDuration());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeDowntimeEvent]);

  const { getWorkOrderLowStockWarnings, checkPartStockStatus } = useWorkOrderStockWarnings();

  const stockWarnings = useMemo(() => {
    const partsToCheck = supabaseLinkedParts.length > 0 ? supabaseLinkedParts : linkedParts;
    const additionalParts = partsToCheck.map(p => ({
      materialId: p.materialId,
      quantity: p.quantityRequested,
    }));
    console.log('[WorkOrderDetail] Checking stock warnings for', additionalParts.length, 'parts');
    return getWorkOrderLowStockWarnings(workOrder.id, additionalParts);
  }, [workOrder.id, supabaseLinkedParts, linkedParts, getWorkOrderLowStockWarnings]);

  const toggleSection = useCallback((section: SectionType) => {
    Haptics.selectionAsync();
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleToggleTask = useCallback((taskId: string) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const updatedTasks = workOrder.tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          completed: !task.completed,
          completedAt: !task.completed ? new Date().toISOString() : undefined,
          completedBy: !task.completed ? userName : undefined,
        };
      }
      return task;
    });
    
    // Update local state immediately for responsive UI
    onUpdate(workOrder.id, { tasks: updatedTasks });
    
    // Persist to Supabase
    console.log('[WorkOrderDetail] Toggling task:', taskId, 'Total tasks:', updatedTasks.length);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { tasks: updatedTasks } },
      {
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to update task:', error);
          // Revert on error
          onUpdate(workOrder.id, { tasks: workOrder.tasks });
          Alert.alert('Error', 'Failed to update task. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, userName, updateWorkOrderMutation]);

  const handleToggleLOTO = useCallback((enabled: boolean) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const previousSafety = workOrder.safety;
    const updatedSafety = {
      ...workOrder.safety,
      lotoRequired: enabled,
      lotoSteps: enabled && workOrder.safety.lotoSteps.length === 0 
        ? DEFAULT_LOTO_STEPS 
        : workOrder.safety.lotoSteps,
    };
    
    // Update local state immediately for responsive UI
    onUpdate(workOrder.id, { safety: updatedSafety });
    
    // Persist to Supabase
    console.log('[WorkOrderDetail] Toggling LOTO:', enabled);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] LOTO updated successfully');
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to update LOTO:', error);
          // Revert on error
          onUpdate(workOrder.id, { safety: previousSafety });
          Alert.alert('Error', 'Failed to update LOTO setting. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, updateWorkOrderMutation]);

  const handleAddLotoStep = useCallback(() => {
    if (!canEdit || !newLotoStep.description.trim()) {
      Alert.alert('Required', 'Please enter a step description.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const previousSafety = workOrder.safety;
    const newStep = {
      id: `loto-${Date.now()}`,
      order: workOrder.safety.lotoSteps.length + 1,
      description: newLotoStep.description.trim(),
      lockColor: newLotoStep.lockColor || undefined,
      energySource: newLotoStep.energySource || undefined,
      location: newLotoStep.location || undefined,
    };
    
    const updatedSafety = {
      ...workOrder.safety,
      lotoSteps: [...workOrder.safety.lotoSteps, newStep],
    };
    
    onUpdate(workOrder.id, { safety: updatedSafety });
    setNewLotoStep({ description: '', lockColor: '', energySource: '', location: '' });
    
    console.log('[WorkOrderDetail] Adding LOTO step:', newStep.id);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] LOTO step added successfully');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to add LOTO step:', error);
          onUpdate(workOrder.id, { safety: previousSafety });
          Alert.alert('Error', 'Failed to add LOTO step. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, newLotoStep, updateWorkOrderMutation]);

  const handleUpdateLotoStep = useCallback(() => {
    if (!canEdit || !editingLotoStep) return;
    if (!editingLotoStep.description.trim()) {
      Alert.alert('Required', 'Please enter a step description.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const previousSafety = workOrder.safety;
    const updatedSteps = workOrder.safety.lotoSteps.map(step => {
      if (step.id === editingLotoStep.id) {
        return {
          ...step,
          description: editingLotoStep.description.trim(),
          lockColor: editingLotoStep.lockColor || undefined,
          energySource: editingLotoStep.energySource || undefined,
          location: editingLotoStep.location || undefined,
        };
      }
      return step;
    });
    
    const updatedSafety = {
      ...workOrder.safety,
      lotoSteps: updatedSteps,
    };
    
    onUpdate(workOrder.id, { safety: updatedSafety });
    setEditingLotoStep(null);
    
    console.log('[WorkOrderDetail] Updating LOTO step:', editingLotoStep.id);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] LOTO step updated successfully');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to update LOTO step:', error);
          onUpdate(workOrder.id, { safety: previousSafety });
          Alert.alert('Error', 'Failed to update LOTO step. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, editingLotoStep, updateWorkOrderMutation]);

  const handleRemoveLotoStep = useCallback((stepId: string) => {
    if (!canEdit) return;
    
    Alert.alert(
      'Remove Step',
      'Are you sure you want to remove this LOTO step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            const previousSafety = workOrder.safety;
            const updatedSteps = workOrder.safety.lotoSteps
              .filter(step => step.id !== stepId)
              .map((step, index) => ({ ...step, order: index + 1 }));
            
            const updatedSafety = {
              ...workOrder.safety,
              lotoSteps: updatedSteps,
            };
            
            onUpdate(workOrder.id, { safety: updatedSafety });
            
            console.log('[WorkOrderDetail] Removing LOTO step:', stepId);
            updateWorkOrderMutation.mutate(
              { id: workOrder.id, updates: { safety: updatedSafety } },
              {
                onSuccess: () => {
                  console.log('[WorkOrderDetail] LOTO step removed successfully');
                },
                onError: (error) => {
                  console.error('[WorkOrderDetail] Failed to remove LOTO step:', error);
                  onUpdate(workOrder.id, { safety: previousSafety });
                  Alert.alert('Error', 'Failed to remove LOTO step. Please try again.');
                },
              }
            );
          },
        },
      ]
    );
  }, [workOrder, onUpdate, canEdit, updateWorkOrderMutation]);

  const handleReorderLotoStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const previousSafety = workOrder.safety;
    const steps = [...workOrder.safety.lotoSteps];
    const currentIndex = steps.findIndex(s => s.id === stepId);
    
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === steps.length - 1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const [movedStep] = steps.splice(currentIndex, 1);
    steps.splice(newIndex, 0, movedStep);
    
    const reorderedSteps = steps.map((step, index) => ({ ...step, order: index + 1 }));
    
    const updatedSafety = {
      ...workOrder.safety,
      lotoSteps: reorderedSteps,
    };
    
    onUpdate(workOrder.id, { safety: updatedSafety });
    
    console.log('[WorkOrderDetail] Reordering LOTO step:', stepId, direction);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to reorder LOTO step:', error);
          onUpdate(workOrder.id, { safety: previousSafety });
          Alert.alert('Error', 'Failed to reorder LOTO step. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, updateWorkOrderMutation]);

  const handleTogglePermit = useCallback((permitId: string) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const previousSafety = workOrder.safety;
    const currentPermits = workOrder.safety.permits;
    const updatedPermits = currentPermits.includes(permitId)
      ? currentPermits.filter(p => p !== permitId)
      : [...currentPermits, permitId];
    
    const updatedSafety = {
      ...workOrder.safety,
      permits: updatedPermits,
    };
    
    // Update local state immediately for responsive UI
    onUpdate(workOrder.id, { safety: updatedSafety });
    
    // Persist to Supabase
    console.log('[WorkOrderDetail] Toggling permit:', permitId, 'Total permits:', updatedPermits.length);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] Permit toggled successfully');
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to toggle permit:', error);
          // Revert on error
          onUpdate(workOrder.id, { safety: previousSafety });
          Alert.alert('Error', 'Failed to update permit. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, updateWorkOrderMutation]);

  const handleOpenPermitForm = useCallback((permit: PermitType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPermitType(permit);
    const initialData: Record<string, any> = {};
    permit.formFields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        initialData[field.id] = false;
      } else if (field.type === 'date') {
        initialData[field.id] = new Date().toISOString().split('T')[0];
      } else if (field.type === 'time') {
        const now = new Date();
        initialData[field.id] = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      } else {
        initialData[field.id] = '';
      }
    });
    setPermitFormData(initialData);
    setShowPermitFormModal(true);
  }, []);

  const handleClosePermitForm = useCallback(() => {
    setShowPermitFormModal(false);
    setSelectedPermitType(null);
    setPermitFormData({});
  }, []);

  const handlePermitFormChange = useCallback((fieldId: string, value: any) => {
    setPermitFormData(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const validatePermitForm = useCallback(() => {
    if (!selectedPermitType) return false;
    for (const field of selectedPermitType.formFields) {
      if (field.required) {
        const value = permitFormData[field.id];
        if (field.type === 'checkbox' && !value) {
          Alert.alert('Required Field', `Please check: ${field.label}`);
          return false;
        } else if (field.type !== 'checkbox' && (!value || value === '')) {
          Alert.alert('Required Field', `Please fill in: ${field.label}`);
          return false;
        }
      }
    }
    return true;
  }, [selectedPermitType, permitFormData]);

  const handleSubmitPermitForm = useCallback(() => {
    if (!selectedPermitType) return;
    if (!validatePermitForm()) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + selectedPermitType.expirationHours);
    
    const submission: PermitSubmission = {
      id: generatePermitId(),
      permitTypeId: selectedPermitType.id,
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber,
      submittedBy: userId,
      submittedByName: userName,
      submittedAt: new Date().toISOString(),
      status: selectedPermitType.approvalRequired ? 'pending' : 'approved',
      expiresAt: expiresAt.toISOString(),
      formData: permitFormData,
      location: workOrder.location,
      equipment: workOrder.equipment,
    };
    
    // Update local state
    setPermitSubmissions(prev => [...prev, submission]);
    
    // Update work order safety with permit numbers and expiry
    const previousSafety = workOrder.safety;
    const updatedSafety = {
      ...workOrder.safety,
      permitNumbers: {
        ...workOrder.safety.permitNumbers,
        [selectedPermitType.id]: submission.id,
      },
      permitExpiry: {
        ...workOrder.safety.permitExpiry,
        [selectedPermitType.id]: expiresAt.toISOString(),
      },
    };
    
    // Update local state immediately
    onUpdate(workOrder.id, { safety: updatedSafety });
    
    // Persist to Supabase
    console.log('[WorkOrderDetail] Submitting permit form:', selectedPermitType.id, 'Submission ID:', submission.id);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] Permit form submitted successfully');
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to submit permit form:', error);
          // Revert on error
          onUpdate(workOrder.id, { safety: previousSafety });
          setPermitSubmissions(prev => prev.filter(p => p.id !== submission.id));
          Alert.alert('Error', 'Failed to submit permit. Please try again.');
          return;
        },
      }
    );
    
    if (onSubmitPermit) {
      onSubmitPermit(submission);
    }
    
    handleClosePermitForm();
    
    if (selectedPermitType.approvalRequired) {
      Alert.alert(
        'Permit Submitted',
        `Your ${selectedPermitType.name} permit request has been submitted for manager approval. You will be notified once it is approved.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Permit Approved',
        `Your ${selectedPermitType.name} permit has been automatically approved and is valid for ${selectedPermitType.expirationHours} hours.`,
        [{ text: 'OK' }]
      );
    }
  }, [selectedPermitType, permitFormData, workOrder, userId, userName, validatePermitForm, onSubmitPermit, handleClosePermitForm, onUpdate, updateWorkOrderMutation]);

  const getPermitSubmissionStatus = useCallback((permitTypeId: string): PermitSubmission | undefined => {
    // First check local state (for newly submitted permits)
    const localSubmission = permitSubmissions.find(s => s.permitTypeId === permitTypeId);
    if (localSubmission) {
      // Check if it's expired
      if (localSubmission.expiresAt && new Date(localSubmission.expiresAt) < new Date()) {
        return { ...localSubmission, status: 'expired' };
      }
      return localSubmission;
    }
    
    // Fallback: check persisted data directly from work order
    const permitNumber = workOrder.safety.permitNumbers?.[permitTypeId];
    const permitExpiry = workOrder.safety.permitExpiry?.[permitTypeId];
    
    if (permitNumber) {
      const isExpired = permitExpiry ? new Date(permitExpiry) < new Date() : false;
      return {
        id: permitNumber,
        permitTypeId,
        workOrderId: workOrder.id,
        workOrderNumber: workOrder.workOrderNumber,
        submittedBy: workOrder.requestedBy || userId,
        submittedByName: workOrder.assignedName || userName,
        submittedAt: workOrder.created_at,
        status: isExpired ? 'expired' : 'approved',
        expiresAt: permitExpiry,
        formData: {},
        location: workOrder.location,
        equipment: workOrder.equipment,
      };
    }
    
    return undefined;
  }, [permitSubmissions, workOrder.safety.permitNumbers, workOrder.safety.permitExpiry, workOrder.id, workOrder.workOrderNumber, workOrder.requestedBy, workOrder.assignedName, workOrder.created_at, workOrder.location, workOrder.equipment, userId, userName]);

  const handleTogglePPE = useCallback((ppeId: string) => {
    if (!canEdit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const previousSafety = workOrder.safety;
    const currentPPE = workOrder.safety.ppeRequired;
    const updatedPPE = currentPPE.includes(ppeId)
      ? currentPPE.filter(p => p !== ppeId)
      : [...currentPPE, ppeId];
    
    const updatedSafety = {
      ...workOrder.safety,
      ppeRequired: updatedPPE,
    };
    
    // Update local state immediately for responsive UI
    onUpdate(workOrder.id, { safety: updatedSafety });
    
    // Persist to Supabase
    console.log('[WorkOrderDetail] Toggling PPE:', ppeId, 'Total PPE:', updatedPPE.length);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { safety: updatedSafety } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] PPE toggled successfully');
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to toggle PPE:', error);
          // Revert on error
          onUpdate(workOrder.id, { safety: previousSafety });
          Alert.alert('Error', 'Failed to update PPE. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, canEdit, updateWorkOrderMutation]);

  const handleSaveNotes = useCallback(() => {
    console.log('[WorkOrderDetail] Saving notes for work order:', workOrder.id);
    
    // Use Supabase mutation to persist notes
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { notes } },
      {
        onSuccess: () => {
          setEditingNotes(false);
          // Also call parent callback to update local state
          onUpdate(workOrder.id, { notes });
        },
      }
    );
  }, [workOrder.id, notes, onUpdate, updateWorkOrderMutation]);

  const handleAddPhoto = useCallback(async () => {
    if (!canEdit) return;
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.fileName || `Photo_${Date.now()}.jpg`;
      
      console.log('[WorkOrderDetail] Uploading photo from library:', filename);
      
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        uploadAttachmentMutation.mutate({
          workOrderId: workOrder.id,
          file: blob,
          filename,
          type: 'image',
          uploadedBy: userName,
        });
      } catch (error) {
        console.error('[WorkOrderDetail] Failed to process image:', error);
        Alert.alert('Error', 'Failed to process image. Please try again.');
      }
    }
  }, [workOrder.id, canEdit, userName, uploadAttachmentMutation]);

  const handleTakePhoto = useCallback(async () => {
    if (!canEdit) return;
    
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = `Camera_${Date.now()}.jpg`;
      
      console.log('[WorkOrderDetail] Uploading camera photo:', filename);
      
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        
        uploadAttachmentMutation.mutate({
          workOrderId: workOrder.id,
          file: blob,
          filename,
          type: 'image',
          uploadedBy: userName,
        });
      } catch (error) {
        console.error('[WorkOrderDetail] Failed to process camera image:', error);
        Alert.alert('Error', 'Failed to process image. Please try again.');
      }
    }
  }, [workOrder.id, canEdit, userName, uploadAttachmentMutation]);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    if (!canEdit) return;
    
    const attachmentToRemove = workOrder.attachments.find(a => a.id === attachmentId);
    if (!attachmentToRemove) return;
    
    Alert.alert('Remove Attachment', 'Are you sure you want to remove this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const previousAttachments = [...workOrder.attachments];
          
          // Optimistic update
          onUpdate(workOrder.id, {
            attachments: workOrder.attachments.filter(a => a.id !== attachmentId),
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          
          try {
            // Delete from Storage (attachmentId is the storage path)
            await deleteAttachmentMutation.mutateAsync(attachmentId);
            
            // Persist the updated attachments to Supabase
            await updateWorkOrderMutation.mutateAsync({
              id: workOrder.id,
              updates: {
                attachments: previousAttachments.filter(a => a.id !== attachmentId),
              },
            });
            
            console.log('[WorkOrderDetail] Attachment removed successfully:', attachmentId);
          } catch (error) {
            console.error('[WorkOrderDetail] Failed to remove attachment:', error);
            // Rollback on error
            onUpdate(workOrder.id, { attachments: previousAttachments });
            Alert.alert('Error', 'Failed to remove attachment. Please try again.');
          }
        },
      },
    ]);
  }, [workOrder, onUpdate, canEdit, deleteAttachmentMutation, updateWorkOrderMutation]);

  const handleAddDocumentation = useCallback((section: CompletedDocumentationSection) => {
    const currentWorkflow = workOrder.workflow || {
      id: `wf-${Date.now()}`,
      workOrderId: workOrder.id,
      currentDepartment: userDepartment,
      departmentQueue: [],
      completedDepartments: [],
      routingHistory: [],
      documentationSections: [],
    };

    onUpdate(workOrder.id, {
      workflow: {
        ...currentWorkflow,
        documentationSections: [...currentWorkflow.documentationSections, section],
      },
    });
  }, [workOrder, onUpdate, userDepartment]);

  const handleSendToDepartment = useCallback((department: DepartmentType, notes?: string) => {
    const currentWorkflow = workOrder.workflow || {
      id: `wf-${Date.now()}`,
      workOrderId: workOrder.id,
      currentDepartment: userDepartment,
      departmentQueue: [],
      completedDepartments: [],
      routingHistory: [],
      documentationSections: [],
    };

    const newRoutingEntry = {
      department,
      sentBy: userName,
      sentAt: new Date().toISOString(),
      notes,
    };

    const updatedWorkflow = {
      ...currentWorkflow,
      currentDepartment: department,
      completedDepartments: currentWorkflow.currentDepartment 
        ? [...currentWorkflow.completedDepartments, currentWorkflow.currentDepartment]
        : currentWorkflow.completedDepartments,
      routingHistory: [...currentWorkflow.routingHistory, newRoutingEntry],
    };

    // Update local state immediately
    onUpdate(workOrder.id, {
      currentDepartment: department,
      workflow: updatedWorkflow,
    });

    // Persist to Supabase
    console.log('[WorkOrderDetail] Sending work order to department:', department);
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { currentDepartment: department, workflow: updatedWorkflow } },
      {
        onSuccess: () => {
          console.log('[WorkOrderDetail] Work order sent to department successfully');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Sent', `Work order sent to ${department.charAt(0).toUpperCase() + department.slice(1)} department`);
        },
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to send work order to department:', error);
          // Revert on error
          onUpdate(workOrder.id, { currentDepartment: workOrder.currentDepartment, workflow: currentWorkflow });
          Alert.alert('Error', 'Failed to send work order. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, userName, userDepartment, updateWorkOrderMutation]);

  const handleUpdateWorkflow = useCallback((updates: Partial<DepartmentWorkflow>) => {
    const currentWorkflow = workOrder.workflow || {
      id: `wf-${Date.now()}`,
      workOrderId: workOrder.id,
      currentDepartment: userDepartment,
      departmentQueue: [],
      completedDepartments: [],
      routingHistory: [],
      documentationSections: [],
    };

    const updatedWorkflow = {
      ...currentWorkflow,
      ...updates,
    };

    // Update local state immediately
    onUpdate(workOrder.id, { workflow: updatedWorkflow });

    // Persist to Supabase
    console.log('[WorkOrderDetail] Updating workflow');
    updateWorkOrderMutation.mutate(
      { id: workOrder.id, updates: { workflow: updatedWorkflow } },
      {
        onError: (error) => {
          console.error('[WorkOrderDetail] Failed to update workflow:', error);
          // Revert on error
          onUpdate(workOrder.id, { workflow: currentWorkflow });
          Alert.alert('Error', 'Failed to update workflow. Please try again.');
        },
      }
    );
  }, [workOrder, onUpdate, userDepartment, updateWorkOrderMutation]);

  const completedTasksCount = useMemo(() => 
    workOrder.tasks.filter(t => t.completed).length,
    [workOrder.tasks]
  );

  const selectedPermits = useMemo(() =>
    PERMIT_TYPES.filter(p => workOrder.safety.permits.includes(p.id)),
    [workOrder.safety.permits]
  );

  const selectedPPE = useMemo(() =>
    PPE_ITEMS.filter(p => workOrder.safety.ppeRequired.includes(p.id)),
    [workOrder.safety.ppeRequired]
  );

  const partsSummary = useMemo(() => {
    const existingSummary = getWorkOrderPartSummary(workOrder.id);
    if (existingSummary) return existingSummary;
    
    const totalCost = linkedParts.reduce((sum, part) => sum + part.totalCost, 0);
    return {
      workOrderId: workOrder.id,
      workOrderNumber: workOrder.workOrderNumber,
      totalPartRequests: linkedParts.length > 0 ? 1 : 0,
      pendingRequests: 0,
      approvedRequests: linkedParts.length > 0 ? 1 : 0,
      totalLinesRequested: linkedParts.length,
      totalLinesIssued: linkedParts.filter(p => p.status === 'issued' || p.status === 'consumed').length,
      totalLinesReturned: 0,
      totalQuantityRequested: linkedParts.reduce((sum, p) => sum + p.quantityRequested, 0),
      totalQuantityIssued: linkedParts.reduce((sum, p) => sum + p.quantityIssued, 0),
      totalQuantityReturned: linkedParts.reduce((sum, p) => sum + p.quantityReturned, 0),
      totalQuantityConsumed: linkedParts.reduce((sum, p) => sum + p.quantityConsumed, 0),
      totalEstimatedCost: totalCost,
      totalIssuedCost: totalCost,
      totalReturnCredit: 0,
      totalActualCost: totalCost,
      overBudget: false,
    } as WorkOrderPartSummary;
  }, [workOrder.id, workOrder.workOrderNumber, linkedParts]);

  const costSummary = useMemo(() => {
    const laborHours = workOrder.actualHours ?? workOrder.estimatedHours ?? 0;
    const laborCost = laborHours * DEFAULT_LABOR_RATE;
    const partsCost = partsSummary.totalActualCost;
    const totalCost = laborCost + partsCost;
    
    console.log('[WorkOrderDetail] Cost summary - Labor:', laborHours, 'hrs @', DEFAULT_LABOR_RATE, '=', laborCost, ', Parts:', partsCost, ', Total:', totalCost);
    
    return {
      laborHours,
      laborRate: DEFAULT_LABOR_RATE,
      laborCost,
      partsCost,
      totalCost,
    };
  }, [workOrder.actualHours, workOrder.estimatedHours, partsSummary.totalActualCost]);

  // Wire modal query results to filtered list - query handles search/filters server-side
  const filteredMaterials = useMemo(() => {
    // Use modalMaterialsData from query (already filtered by search)
    // Fall back to first 20 materials if no search query
    if (modalMaterialsData.length > 0) return modalMaterialsData;
    if (!partsSearchQuery.trim()) return materialsData.slice(0, 20);
    return [];
  }, [modalMaterialsData, partsSearchQuery, materialsData]);

  const filteredFailureCodes = useMemo(() => {
    let codes = failureCodesData.map(fc => ({
      ...fc,
      isActive: (fc as any).is_active ?? (fc as any).isActive ?? true,
      commonCauses: (fc as any).common_causes ?? (fc as any).commonCauses ?? [],
      suggestedActions: (fc as any).suggested_actions ?? (fc as any).suggestedActions ?? [],
    }));
    
    // Category filtering is now done server-side via useFailureCodesQuery
    
    if (failureCodeSearch.trim()) {
      const query = failureCodeSearch.toLowerCase();
      codes = codes.filter(
        fc => fc.name.toLowerCase().includes(query) ||
              fc.code.toLowerCase().includes(query) ||
              fc.description.toLowerCase().includes(query)
      );
    }
    
    return codes;
  }, [failureCodeSearch, failureCodesData]);

  const groupedFailureCodes = useMemo(() => {
    const groups: Record<FailureCodeCategory, FailureCode[]> = {} as any;
    filteredFailureCodes.forEach(fc => {
      if (!groups[fc.category]) {
        groups[fc.category] = [];
      }
      groups[fc.category].push(fc);
    });
    return groups;
  }, [filteredFailureCodes]);

  const sortedCategories = useMemo(() => {
    return failureCodeCategoriesData.filter(cat => groupedFailureCodes[cat.id]?.length > 0);
  }, [groupedFailureCodes, failureCodeCategoriesData]);

  const toggleFailureCodeCategory = useCallback((categoryId: FailureCodeCategory) => {
    Haptics.selectionAsync();
    setExpandedFailureCodeCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const expandAllFailureCodeCategories = useCallback(() => {
    Haptics.selectionAsync();
    setExpandedFailureCodeCategories(new Set(failureCodeCategoriesData.map(c => c.id)));
  }, [failureCodeCategoriesData]);

  const collapseAllFailureCodeCategories = useCallback(() => {
    Haptics.selectionAsync();
    setExpandedFailureCodeCategories(new Set());
  }, []);

  const handleAddPartFromInventory = useCallback((material: Material | MaterialWithLabels, quantity: number) => {
    if (quantity <= 0) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const existingPartIndex = linkedParts.findIndex(p => p.materialId === material.id);
    
    if (existingPartIndex >= 0) {
      const updatedParts = [...linkedParts];
      updatedParts[existingPartIndex] = {
        ...updatedParts[existingPartIndex],
        quantityRequested: updatedParts[existingPartIndex].quantityRequested + quantity,
        quantityApproved: updatedParts[existingPartIndex].quantityApproved + quantity,
        quantityIssued: updatedParts[existingPartIndex].quantityIssued + quantity,
        quantityConsumed: updatedParts[existingPartIndex].quantityConsumed + quantity,
        totalCost: (updatedParts[existingPartIndex].quantityConsumed + quantity) * updatedParts[existingPartIndex].unitCost,
      };
      setLinkedParts(updatedParts);
    } else {
      const unitOfMeasure = (material as any).unit_of_measure ?? (material as any).unitOfMeasure ?? 'EA';
      const unitPrice = (material as any).unit_price ?? (material as any).unitPrice ?? 0;
      const facilityName = (material as any).facility_name ?? (material as any).facilityName ?? '';
      const location = (material as any).location ?? '';
      
      const newPart: WorkOrderPartLine = {
        id: `prl-${Date.now()}`,
        materialId: material.id,
        materialName: material.name,
        materialSku: material.sku,
        quantityRequested: quantity,
        quantityApproved: quantity,
        quantityIssued: quantity,
        quantityReturned: 0,
        quantityConsumed: quantity,
        unitOfMeasure,
        unitCost: unitPrice,
        totalCost: quantity * unitPrice,
        warehouseLocation: facilityName,
        binLocation: location,
        isSubstitute: false,
        status: 'issued',
      };
      setLinkedParts([...linkedParts, newPart]);
    }
    
    setPartQuantities(prev => ({ ...prev, [material.id]: 1 }));
  }, [linkedParts]);

  const handleRemovePart = useCallback((partId: string) => {
    Alert.alert('Remove Part', 'Are you sure you want to remove this part from the work order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setLinkedParts(linkedParts.filter(p => p.id !== partId));
        },
      },
    ]);
  }, [linkedParts]);

  const handleBarcodeScan = useCallback((data: string, type: string) => {
    console.log('[WorkOrderDetail] Barcode scanned:', data, type);
    setShowBarcodeScanner(false);
    
    // Search for material by barcode or SKU in loaded materials data
    const material = materialsData.find(
      m => m.barcode === data || m.sku.toLowerCase() === data.toLowerCase()
    );
    
    if (material) {
      // Auto-add the scanned part to work order
      handleAddPartFromInventory(material as any, 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Part Added', `${material.name} (${material.sku}) has been added to the work order.`);
    } else {
      // Part not found - open modal with barcode as search query to help user find it
      console.log('[WorkOrderDetail] Part not found by barcode, opening modal with search:', data);
      setPartsSearchQuery(data);
      setShowPartsModal(true);
      Alert.alert(
        'Part Not Found',
        `No exact match for barcode/SKU: ${data}\n\nThe parts modal has been opened with this search term.`,
        [{ text: 'OK' }]
      );
    }
  }, [handleAddPartFromInventory, materialsData]);

  const handleCreatePOSuggestion = useCallback((materialName: string, materialSku: string, suggestedQty: number, vendor: string | null) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Create Purchase Order',
      `Would you like to create a PO for ${materialName}?\n\nSuggested Qty: ${suggestedQty}${vendor ? `\nVendor: ${vendor}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Go to Procurement', 
          onPress: () => {
            Alert.alert('Navigation', 'This would navigate to the Procurement module to create a PO.');
          }
        },
      ]
    );
  }, []);

  const getPartStockStatusForModal = useCallback((materialId: string) => {
    return checkPartStockStatus(materialId);
  }, [checkPartStockStatus]);

  const handleUpdatePartQuantity = useCallback((partId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemovePart(partId);
      return;
    }
    
    setLinkedParts(prev => prev.map(part => {
      if (part.id === partId) {
        return {
          ...part,
          quantityRequested: newQuantity,
          quantityApproved: newQuantity,
          quantityIssued: newQuantity,
          quantityConsumed: newQuantity,
          totalCost: newQuantity * part.unitCost,
        };
      }
      return part;
    }));
  }, [handleRemovePart]);

  const styles = createStyles(colors);

  const renderSectionHeader = (
    title: string,
    section: SectionType,
    icon: React.ReactNode,
    badge?: string | number,
    badgeColor?: string
  ) => (
    <Pressable
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
    >
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {badge !== undefined && (
          <View style={[styles.sectionBadge, { backgroundColor: (badgeColor || colors.primary) + '20' }]}>
            <Text style={[styles.sectionBadgeText, { color: badgeColor || colors.primary }]}>
              {badge}
            </Text>
          </View>
        )}
      </View>
      {expandedSections.has(section) ? (
        <ChevronDown size={20} color={colors.textSecondary} />
      ) : (
        <ChevronRight size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );

  const renderInfoSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {renderSectionHeader('Work Order Info', 'info', <Wrench size={18} color={colors.primary} />)}
      {expandedSections.has('info') && (
        <View style={styles.sectionContent}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>WO Number</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.workOrderNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColors[workOrder.type] + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: typeColors[workOrder.type] }]}>
                {workOrder.type.charAt(0).toUpperCase() + workOrder.type.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Priority</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColors[workOrder.priority] + '20' }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColors[workOrder.priority] }]} />
              <Text style={[styles.priorityText, { color: priorityColors[workOrder.priority] }]}>
                {workOrder.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors[workOrder.status] + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors[workOrder.status] }]}>
                {workOrder.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          {workOrder.equipment && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Equipment</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.equipment}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Location</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.location || 'Not specified'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Due Date</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.due_date}</Text>
          </View>
          {workOrder.assignedName && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Assigned To</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.assignedName}</Text>
            </View>
          )}
          {workOrder.estimatedHours && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Est. Hours</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{workOrder.estimatedHours} hrs</Text>
            </View>
          )}
          
          <View style={styles.descriptionContainer}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Description</Text>
            <Text style={[styles.description, { color: colors.text }]}>{workOrder.description}</Text>
          </View>

          {activeDowntimeEvent && activeDowntimeEvent.status === 'ongoing' && (
            <View style={[styles.downtimeInfoContainer, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <View style={styles.downtimeInfoHeader}>
                <View style={[styles.downtimeStatusBadge, { backgroundColor: '#DC2626' }]}>
                  <AlertTriangle size={12} color="#FFFFFF" />
                  <Text style={styles.downtimeStatusText}>PRODUCTION STOPPED</Text>
                </View>
              </View>
              <View style={styles.downtimeInfoGrid}>
                {activeDowntimeEvent.room_line_name && (
                  <View style={styles.downtimeInfoRow}>
                    <MapPin size={14} color="#991B1B" />
                    <View style={styles.downtimeInfoContent}>
                      <Text style={[styles.downtimeInfoLabel, { color: '#991B1B' }]}>Room/Line</Text>
                      <Text style={[styles.downtimeInfoValue, { color: '#7F1D1D' }]}>
                        {activeDowntimeEvent.room_line_name}
                      </Text>
                    </View>
                  </View>
                )}
                {activeDowntimeEvent.stopped_at && (
                  <View style={styles.downtimeInfoRow}>
                    <Clock size={14} color="#991B1B" />
                    <View style={styles.downtimeInfoContent}>
                      <Text style={[styles.downtimeInfoLabel, { color: '#991B1B' }]}>Stopped At</Text>
                      <Text style={[styles.downtimeInfoValue, { color: '#7F1D1D' }]}>
                        {new Date(activeDowntimeEvent.stopped_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              {downtimeDuration && (
                <View style={[styles.downtimeDurationContainer, { backgroundColor: '#DC262620' }]}>
                  <Text style={[styles.downtimeDurationLabel, { color: '#991B1B' }]}>Duration</Text>
                  <Text style={[styles.downtimeDurationValue, { color: '#DC2626' }]}>
                    {downtimeDuration}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Notes</Text>
              {canEdit && (
                <Pressable onPress={() => setEditingNotes(!editingNotes)}>
                  {editingNotes ? (
                    <Save size={18} color={colors.primary} />
                  ) : (
                    <Edit3 size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
            </View>
            {editingNotes ? (
              <View style={styles.notesEditContainer}>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  placeholder="Add notes..."
                  placeholderTextColor={colors.textTertiary}
                />
                <Pressable
                  style={[styles.saveNotesButton, { backgroundColor: colors.primary, opacity: updateWorkOrderMutation.isPending ? 0.7 : 1 }]}
                  onPress={handleSaveNotes}
                  disabled={updateWorkOrderMutation.isPending}
                >
                  {updateWorkOrderMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveNotesText}>Save Notes</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.notesText, { color: colors.text }]}>
                {workOrder.notes || 'No notes added'}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const renderLOTOSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {renderSectionHeader(
        'LOTO Procedure',
        'loto',
        <Lock size={18} color="#EF4444" />,
        workOrder.safety.lotoRequired ? 'REQUIRED' : 'OFF',
        workOrder.safety.lotoRequired ? '#EF4444' : colors.textTertiary
      )}
      {expandedSections.has('loto') && (
        <View style={styles.sectionContent}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>LOTO Required</Text>
            <Pressable
              style={[
                styles.toggle,
                {
                  backgroundColor: workOrder.safety.lotoRequired ? '#EF4444' : colors.border,
                },
              ]}
              onPress={() => handleToggleLOTO(!workOrder.safety.lotoRequired)}
              disabled={!canEdit}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: workOrder.safety.lotoRequired ? 20 : 0 }],
                  },
                ]}
              />
            </Pressable>
          </View>

          {workOrder.safety.lotoRequired && (
            <>
              <View style={[styles.lotoWarning, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={[styles.lotoWarningText, { color: '#B91C1C' }]}>
                  Lock Out / Tag Out must be completed before work begins
                </Text>
              </View>

              <View style={styles.lockColorsContainer}>
                <Text style={[styles.subSectionTitle, { color: colors.text }]}>Lock Colors</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lockColorsScroll}>
                  {LOCK_COLORS.map(lock => (
                    <View key={lock.id} style={styles.lockColorItem}>
                      <View style={[styles.lockColorDot, { backgroundColor: lock.hex, borderColor: lock.id === 'white' ? colors.border : lock.hex }]} />
                      <Text style={[styles.lockColorName, { color: colors.text }]}>{lock.name}</Text>
                      <Text style={[styles.lockColorDesc, { color: colors.textTertiary }]} numberOfLines={1}>
                        {lock.description}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <Text style={[styles.subSectionTitle, { color: colors.text }]}>Lockout Steps</Text>
              {workOrder.safety.lotoSteps.map((step, index) => (
                <View key={step.id} style={[styles.lotoStep, { borderColor: colors.border }]}>
                  <View style={[styles.lotoStepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.lotoStepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.lotoStepContent}>
                    <Text style={[styles.lotoStepText, { color: colors.text }]}>{step.description}</Text>
                    <View style={styles.lotoStepMeta}>
                      {step.energySource && (
                        <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <Zap size={12} color={colors.textSecondary} />
                          <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>
                            {step.energySource}
                          </Text>
                        </View>
                      )}
                      {step.lockColor && (
                        <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <View
                            style={[
                              styles.miniLockDot,
                              { backgroundColor: LOCK_COLORS.find(l => l.id === step.lockColor)?.hex || colors.textSecondary },
                            ]}
                          />
                          <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>
                            {step.lockColor} lock
                          </Text>
                        </View>
                      )}
                      {step.location && (
                        <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <MapPin size={12} color={colors.textSecondary} />
                          <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>
                            {step.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {canEdit && (
                <Pressable
                  style={[styles.editLotoButton, { borderColor: colors.primary }]}
                  onPress={() => setShowLOTOModal(true)}
                >
                  <Edit3 size={16} color={colors.primary} />
                  <Text style={[styles.editLotoText, { color: colors.primary }]}>Edit LOTO Procedure</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderPermitsSection = () => {
    return (
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {renderSectionHeader(
          'Permits Required',
          'permits',
          <Shield size={18} color="#8B5CF6" />,
          selectedPermits.length,
          selectedPermits.length > 0 ? '#8B5CF6' : colors.textTertiary
        )}
        {expandedSections.has('permits') && (
          <View style={styles.sectionContent}>
            {selectedPermits.length > 0 ? (
              <View style={styles.selectedPermits}>
                {selectedPermits.map(permit => {
                  const submission = getPermitSubmissionStatus(permit.id);
                  return (
                    <View
                      key={permit.id}
                      style={[styles.permitCard, { backgroundColor: permit.color + '15', borderColor: permit.color + '40' }]}
                    >
                      <View style={styles.permitHeader}>
                        <View style={[styles.permitCode, { backgroundColor: permit.color }]}>
                          <Text style={styles.permitCodeText}>{permit.code}</Text>
                        </View>
                        <Text style={[styles.permitName, { color: colors.text }]}>{permit.name}</Text>
                        {canEdit && !submission && (
                          <Pressable onPress={() => handleTogglePermit(permit.id)}>
                            <X size={18} color={colors.textSecondary} />
                          </Pressable>
                        )}
                      </View>
                      <Text style={[styles.permitDesc, { color: colors.textSecondary }]}>{permit.description}</Text>
                      
                      {submission ? (
                        <View style={styles.permitStatusContainer}>
                          <View style={[
                            styles.permitStatusBadge,
                            { 
                              backgroundColor: submission.status === 'approved' ? '#10B98120' : 
                                submission.status === 'pending' ? '#F59E0B20' : 
                                submission.status === 'rejected' ? '#EF444420' : '#6B728020'
                            }
                          ]}>
                            <View style={[
                              styles.permitStatusDot,
                              { 
                                backgroundColor: submission.status === 'approved' ? '#10B981' : 
                                  submission.status === 'pending' ? '#F59E0B' : 
                                  submission.status === 'rejected' ? '#EF4444' : '#6B7280'
                              }
                            ]} />
                            <Text style={[
                              styles.permitStatusText,
                              { 
                                color: submission.status === 'approved' ? '#10B981' : 
                                  submission.status === 'pending' ? '#F59E0B' : 
                                  submission.status === 'rejected' ? '#EF4444' : '#6B7280'
                              }
                            ]}>
                              {submission.status === 'approved' ? 'APPROVED' : 
                               submission.status === 'pending' ? 'PENDING APPROVAL' : 
                               submission.status === 'rejected' ? 'REJECTED' : 'EXPIRED'}
                            </Text>
                          </View>
                          {submission.status === 'approved' && submission.expiresAt && (
                            <Text style={[styles.permitExpiryText, { color: colors.textTertiary }]}>
                              Expires: {new Date(submission.expiresAt).toLocaleString()}
                            </Text>
                          )}
                          {submission.status === 'pending' && (
                            <Text style={[styles.permitPendingText, { color: colors.textSecondary }]}>
                              Awaiting manager approval
                            </Text>
                          )}
                        </View>
                      ) : (
                        <>
                          <View style={styles.permitMeta}>
                            <Clock size={12} color={colors.textTertiary} />
                            <Text style={[styles.permitMetaText, { color: colors.textTertiary }]}>
                              Valid for {permit.expirationHours} hours
                            </Text>
                            {permit.approvalRequired && (
                              <View style={[styles.approvalRequiredBadge, { backgroundColor: '#F59E0B20' }]}>
                                <Text style={styles.approvalRequiredText}>Approval Required</Text>
                              </View>
                            )}
                          </View>
                          {canEdit && (
                            <Pressable
                              style={[styles.fillPermitButton, { backgroundColor: permit.color, marginTop: 10 }]}
                              onPress={() => handleOpenPermitForm(permit)}
                            >
                              <FileText size={16} color="#FFFFFF" />
                              <Text style={styles.fillPermitButtonText}>Fill Out Permit Form</Text>
                            </Pressable>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
                No permits required
              </Text>
            )}
            
            {canEdit && (
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                onPress={() => setShowPermitModal(true)}
              >
                <Plus size={18} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>Add Permit</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPPESection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {renderSectionHeader(
        'PPE Required',
        'ppe',
        <HardHat size={18} color="#F59E0B" />,
        selectedPPE.length,
        selectedPPE.length > 0 ? '#F59E0B' : colors.textTertiary
      )}
      {expandedSections.has('ppe') && (
        <View style={styles.sectionContent}>
          {selectedPPE.length > 0 ? (
            <View style={styles.ppeGrid}>
              {selectedPPE.map(ppe => (
                <View
                  key={ppe.id}
                  style={[styles.ppeItem, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                >
                  <HardHat size={20} color="#F59E0B" />
                  <Text style={[styles.ppeName, { color: colors.text }]} numberOfLines={2}>
                    {ppe.name}
                  </Text>
                  {canEdit && (
                    <Pressable
                      style={styles.ppeRemove}
                      onPress={() => handleTogglePPE(ppe.id)}
                    >
                      <X size={14} color={colors.textTertiary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
              No PPE specified
            </Text>
          )}
          
          {canEdit && (
            <Pressable
              style={[styles.addButton, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}
              onPress={() => setShowPPEModal(true)}
            >
              <Plus size={18} color="#F59E0B" />
              <Text style={[styles.addButtonText, { color: '#F59E0B' }]}>Add PPE</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  const renderTasksSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {renderSectionHeader(
        'Tasks',
        'tasks',
        <CheckSquare size={18} color="#10B981" />,
        `${completedTasksCount}/${workOrder.tasks.length}`,
        completedTasksCount === workOrder.tasks.length ? '#10B981' : colors.textSecondary
      )}
      {expandedSections.has('tasks') && (
        <View style={styles.sectionContent}>
          {workOrder.tasks.length > 0 ? (
            <View style={styles.tasksList}>
              {workOrder.tasks.map((task, index) => (
                <Pressable
                  key={task.id}
                  style={[styles.taskItem, { borderColor: colors.border }]}
                  onPress={() => handleToggleTask(task.id)}
                  disabled={!canEdit}
                >
                  <View
                    style={[
                      styles.taskCheckbox,
                      {
                        backgroundColor: task.completed ? '#10B981' : 'transparent',
                        borderColor: task.completed ? '#10B981' : colors.border,
                      },
                    ]}
                  >
                    {task.completed && <CheckCircle2 size={14} color="#FFFFFF" />}
                  </View>
                  <View style={styles.taskContent}>
                    <Text
                      style={[
                        styles.taskText,
                        {
                          color: task.completed ? colors.textTertiary : colors.text,
                          textDecorationLine: task.completed ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {index + 1}. {task.description}
                    </Text>
                    {task.completedAt && (
                      <Text style={[styles.taskCompletedAt, { color: colors.textTertiary }]}>
                        Completed: {new Date(task.completedAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
              No tasks defined
            </Text>
          )}

          <View style={[styles.progressContainer, { backgroundColor: colors.backgroundSecondary }]}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: '#10B981',
                  width: `${workOrder.tasks.length > 0 ? (completedTasksCount / workOrder.tasks.length) * 100 : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {completedTasksCount} of {workOrder.tasks.length} tasks completed
          </Text>
        </View>
      )}
    </View>
  );

  const renderAttachmentsSection = () => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {renderSectionHeader(
        'Attachments',
        'attachments',
        <ImageIcon size={18} color="#3B82F6" />,
        workOrder.attachments.length,
        workOrder.attachments.length > 0 ? '#3B82F6' : colors.textTertiary
      )}
      {expandedSections.has('attachments') && (
        <View style={styles.sectionContent}>
          {workOrder.attachments.length > 0 ? (
            <View style={styles.attachmentsGrid}>
              {workOrder.attachments.map(attachment => (
                <View key={attachment.id} style={[styles.attachmentItem, { borderColor: colors.border }]}>
                  {attachment.type === 'image' ? (
                    <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
                  ) : (
                    <View style={[styles.attachmentDoc, { backgroundColor: colors.backgroundSecondary }]}>
                      <FileText size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.attachmentInfo}>
                    <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <Text style={[styles.attachmentMeta, { color: colors.textTertiary }]}>
                      {new Date(attachment.uploadedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {canEdit && (
                    <Pressable
                      style={styles.attachmentRemove}
                      onPress={() => handleRemoveAttachment(attachment.id)}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
              No attachments
            </Text>
          )}
          
          {uploadAttachmentMutation.isPending && (
            <View style={[styles.uploadingIndicator, { backgroundColor: colors.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>Uploading attachment...</Text>
            </View>
          )}
          
          {canEdit && (
            <View style={styles.attachmentActions}>
              <Pressable
                style={[
                  styles.attachButton, 
                  { 
                    backgroundColor: colors.primary + '15', 
                    borderColor: colors.primary,
                    opacity: uploadAttachmentMutation.isPending ? 0.5 : 1,
                  }
                ]}
                onPress={handleTakePhoto}
                disabled={uploadAttachmentMutation.isPending}
              >
                <Camera size={18} color={colors.primary} />
                <Text style={[styles.attachButtonText, { color: colors.primary }]}>Take Photo</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.attachButton, 
                  { 
                    backgroundColor: colors.primary + '15', 
                    borderColor: colors.primary,
                    opacity: uploadAttachmentMutation.isPending ? 0.5 : 1,
                  }
                ]}
                onPress={handleAddPhoto}
                disabled={uploadAttachmentMutation.isPending}
              >
                <ImageIcon size={18} color={colors.primary} />
                <Text style={[styles.attachButtonText, { color: colors.primary }]}>Add Photo</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderPermitModal = () => (
    <Modal visible={showPermitModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Permits</Text>
          <Pressable onPress={() => setShowPermitModal(false)}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.modalContent}>
          {PERMIT_TYPES.map(permit => {
            const isSelected = workOrder.safety.permits.includes(permit.id);
            return (
              <Pressable
                key={permit.id}
                style={[
                  styles.permitSelectItem,
                  {
                    backgroundColor: isSelected ? permit.color + '15' : colors.surface,
                    borderColor: isSelected ? permit.color : colors.border,
                  },
                ]}
                onPress={() => handleTogglePermit(permit.id)}
              >
                <View style={[styles.permitCode, { backgroundColor: permit.color }]}>
                  <Text style={styles.permitCodeText}>{permit.code}</Text>
                </View>
                <View style={styles.permitSelectContent}>
                  <Text style={[styles.permitName, { color: colors.text }]}>{permit.name}</Text>
                  <Text style={[styles.permitDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {permit.description}
                  </Text>
                </View>
                {isSelected ? (
                  <CheckCircle2 size={24} color={permit.color} />
                ) : (
                  <Circle size={24} color={colors.border} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderPPEModal = () => (
    <Modal visible={showPPEModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select PPE</Text>
          <Pressable onPress={() => setShowPPEModal(false)}>
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.modalContent}>
          {PPE_CATEGORIES.map(category => {
            const categoryItems = PPE_ITEMS.filter(p => p.category === category.id);
            return (
              <View key={category.id} style={styles.ppeCategorySection}>
                <Text style={[styles.ppeCategoryTitle, { color: colors.text }]}>{category.name}</Text>
                {categoryItems.map(ppe => {
                  const isSelected = workOrder.safety.ppeRequired.includes(ppe.id);
                  return (
                    <Pressable
                      key={ppe.id}
                      style={[
                        styles.ppeSelectItem,
                        {
                          backgroundColor: isSelected ? '#F59E0B15' : colors.surface,
                          borderColor: isSelected ? '#F59E0B' : colors.border,
                        },
                      ]}
                      onPress={() => handleTogglePPE(ppe.id)}
                    >
                      <HardHat size={20} color={isSelected ? '#F59E0B' : colors.textSecondary} />
                      <View style={styles.ppeSelectContent}>
                        <Text style={[styles.ppeSelectName, { color: colors.text }]}>{ppe.name}</Text>
                        <Text style={[styles.ppeSelectDesc, { color: colors.textTertiary }]}>{ppe.description}</Text>
                      </View>
                      {isSelected ? (
                        <CheckCircle2 size={22} color="#F59E0B" />
                      ) : (
                        <Circle size={22} color={colors.border} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderPermitFormModal = () => {
    if (!selectedPermitType) return null;
    
    return (
      <Modal visible={showPermitFormModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.permitFormHeader, { backgroundColor: selectedPermitType.color, borderBottomColor: colors.border }]}>
            <View style={styles.permitFormHeaderContent}>
              <View style={styles.permitFormHeaderLeft}>
                <View style={[styles.permitFormCodeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={styles.permitFormCode}>{selectedPermitType.code}</Text>
                </View>
                <View>
                  <Text style={styles.permitFormTitle}>{selectedPermitType.name}</Text>
                  <Text style={styles.permitFormSubtitle}>Permit Request Form</Text>
                </View>
              </View>
              <Pressable onPress={handleClosePermitForm} style={styles.permitFormCloseBtn}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          
          <ScrollView style={styles.permitFormContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.permitFormWorkOrderInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.permitFormInfoLabel, { color: colors.textSecondary }]}>Work Order</Text>
              <Text style={[styles.permitFormInfoValue, { color: colors.text }]}>{workOrder.workOrderNumber}</Text>
              <Text style={[styles.permitFormInfoTitle, { color: colors.text }]}>{workOrder.title}</Text>
            </View>
            
            {selectedPermitType.approvalRequired && (
              <View style={[styles.approvalNotice, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <AlertTriangle size={18} color="#D97706" />
                <Text style={[styles.approvalNoticeText, { color: '#92400E' }]}>
                  This permit requires manager approval before work can begin
                </Text>
              </View>
            )}
            
            <View style={styles.permitFormFields}>
              {selectedPermitType.formFields.map(field => {
                if (field.type === 'signature') {
                  return (
                    <View key={field.id} style={styles.permitFormField}>
                      <Text style={[styles.permitFormFieldLabel, { color: colors.text }]}>
                        {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                      </Text>
                      <Pressable
                        style={[
                          styles.signatureBox,
                          { 
                            backgroundColor: permitFormData[field.id] ? '#10B98115' : colors.backgroundSecondary,
                            borderColor: permitFormData[field.id] ? '#10B981' : colors.border 
                          }
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          handlePermitFormChange(field.id, permitFormData[field.id] ? '' : userName);
                        }}
                      >
                        {permitFormData[field.id] ? (
                          <View style={styles.signedContainer}>
                            <CheckCircle2 size={24} color="#10B981" />
                            <View>
                              <Text style={[styles.signedName, { color: colors.text }]}>{permitFormData[field.id]}</Text>
                              <Text style={[styles.signedDate, { color: colors.textSecondary }]}>
                                {new Date().toLocaleString()}
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <Text style={[styles.signaturePlaceholder, { color: colors.textTertiary }]}>
                            Tap to sign
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                }
                
                if (field.type === 'checkbox') {
                  return (
                    <Pressable
                      key={field.id}
                      style={[
                        styles.checkboxField,
                        { 
                          backgroundColor: permitFormData[field.id] ? '#10B98110' : colors.surface,
                          borderColor: permitFormData[field.id] ? '#10B981' : colors.border 
                        }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        handlePermitFormChange(field.id, !permitFormData[field.id]);
                      }}
                    >
                      <View style={[
                        styles.checkbox,
                        { 
                          backgroundColor: permitFormData[field.id] ? '#10B981' : 'transparent',
                          borderColor: permitFormData[field.id] ? '#10B981' : colors.border 
                        }
                      ]}>
                        {permitFormData[field.id] && <CheckCircle2 size={16} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                        {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                      </Text>
                    </Pressable>
                  );
                }
                
                if (field.type === 'select') {
                  return (
                    <View key={field.id} style={styles.permitFormField}>
                      <Text style={[styles.permitFormFieldLabel, { color: colors.text }]}>
                        {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectScroll}>
                        {field.options?.map(option => (
                          <Pressable
                            key={option}
                            style={[
                              styles.selectOption,
                              {
                                backgroundColor: permitFormData[field.id] === option ? selectedPermitType.color : colors.backgroundSecondary,
                                borderColor: permitFormData[field.id] === option ? selectedPermitType.color : colors.border,
                              }
                            ]}
                            onPress={() => handlePermitFormChange(field.id, option)}
                          >
                            <Text style={[
                              styles.selectOptionText,
                              { color: permitFormData[field.id] === option ? '#FFFFFF' : colors.text }
                            ]}>
                              {option}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  );
                }
                
                if (field.type === 'textarea') {
                  return (
                    <View key={field.id} style={styles.permitFormField}>
                      <Text style={[styles.permitFormFieldLabel, { color: colors.text }]}>
                        {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                      </Text>
                      <TextInput
                        style={[
                          styles.permitFormTextarea,
                          { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }
                        ]}
                        value={permitFormData[field.id] || ''}
                        onChangeText={(text) => handlePermitFormChange(field.id, text)}
                        placeholder={field.placeholder}
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  );
                }
                
                return (
                  <View key={field.id} style={styles.permitFormField}>
                    <Text style={[styles.permitFormFieldLabel, { color: colors.text }]}>
                      {field.label} {field.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                    </Text>
                    <TextInput
                      style={[
                        styles.permitFormInput,
                        { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }
                      ]}
                      value={permitFormData[field.id] || ''}
                      onChangeText={(text) => handlePermitFormChange(field.id, text)}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textTertiary}
                      keyboardType={field.type === 'date' || field.type === 'time' ? 'default' : 'default'}
                    />
                  </View>
                );
              })}
            </View>
            
            <View style={styles.permitFormActions}>
              <Pressable
                style={[styles.permitFormCancelBtn, { borderColor: colors.border }]}
                onPress={handleClosePermitForm}
              >
                <Text style={[styles.permitFormCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.permitFormSubmitBtn, { backgroundColor: selectedPermitType.color }]}
                onPress={handleSubmitPermitForm}
              >
                <Text style={styles.permitFormSubmitText}>
                  {selectedPermitType.approvalRequired ? 'Submit for Approval' : 'Submit Permit'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {workOrder.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {workOrder.workOrderNumber}
          </Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: statusColors[workOrder.status] }]} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderInfoSection()}
        {renderLOTOSection()}
        {renderPermitsSection()}
        {renderPPESection()}
        {renderTasksSection()}
        {renderAttachmentsSection()}
        {renderPartsSection()}
        
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DepartmentDocumentation
            workflow={workOrder.workflow}
            currentDepartment={workOrder.currentDepartment || userDepartment}
            requiredDepartments={workOrder.requiredDepartments}
            userDepartment={userDepartment}
            userId={userId}
            userName={userName}
            canEdit={canEdit}
            onAddDocumentation={handleAddDocumentation}
            onSendToDepartment={handleSendToDepartment}
            onUpdateWorkflow={handleUpdateWorkflow}
          />
        </View>
      </ScrollView>

      {canEdit && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {workOrder.status === 'open' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }, startWorkMutation.isPending && { opacity: 0.6 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                console.log('[WorkOrderDetail] Starting work on:', workOrder.id);
                startWorkMutation.mutate(workOrder.id);
              }}
              disabled={startWorkMutation.isPending}
            >
              {startWorkMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Play size={20} color="#FFFFFF" />
              )}
              <Text style={styles.actionButtonText}>{startWorkMutation.isPending ? 'Starting...' : 'Start Work'}</Text>
            </Pressable>
          )}
          {workOrder.status === 'in_progress' && onCompleteWork && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Use Supabase downtime data for checking ongoing downtime
                const hasOngoingDowntime = activeDowntimeEvent && activeDowntimeEvent.production_stopped === true && activeDowntimeEvent.status === 'ongoing';
                
                if (hasOngoingDowntime) {
                  setResumedAt(new Date());
                  setShowCompletionModal(true);
                } else {
                  onCompleteWork(workOrder.id);
                }
              }}
            >
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Complete Work Order</Text>
            </Pressable>
          )}
        </View>
      )}

      {renderPermitModal()}
      {renderPPEModal()}
      {renderPermitFormModal()}
      {renderPartsModal()}
      {renderFailureCodeModal()}
      {renderCompletionModal()}
      {renderLOTOModal()}
      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
        title="Scan Part Barcode"
      />
    </View>
  );

  function renderPartsSection() {
    const existingRequests = getPartRequestsByWorkOrder(workOrder.id);
    const allParts = [
      ...linkedParts,
      ...(existingRequests.flatMap(r => r.lines) || []),
    ];
    const uniqueParts = allParts.filter((part, index, self) =>
      index === self.findIndex(p => p.id === part.id)
    );

    const getPartWarning = (materialId: string) => {
      return stockWarnings.warnings.find(w => w.materialId === materialId);
    };

    return (
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {renderSectionHeader(
          'Parts & Materials',
          'parts',
          <Package size={18} color="#06B6D4" />,
          uniqueParts.length,
          uniqueParts.length > 0 ? '#06B6D4' : colors.textTertiary
        )}
        {expandedSections.has('parts') && (
          <View style={styles.sectionContent}>
            {isLoadingParts ? (
              <ActivityIndicator size="small" color="#06B6D4" style={{ marginVertical: 20 }} />
            ) : partsError ? (
              <View style={styles.partsErrorContainer}>
                <AlertTriangle size={24} color={colors.error} />
                <Text style={[styles.partsErrorText, { color: colors.error }]}>Failed to load parts</Text>
                <Pressable style={[styles.retryButton, { borderColor: colors.primary }]} onPress={() => refetchParts()}>
                  <Text style={[styles.retryButtonText, { color: colors.primary }]}>Retry</Text>
                </Pressable>
              </View>
            ) : (
            <>
            {stockWarnings.hasWarnings && (
              <View style={[
                styles.stockWarningBanner,
                { 
                  backgroundColor: stockWarnings.hasCritical ? '#FEE2E2' : '#FEF3C7',
                  borderColor: stockWarnings.hasCritical ? '#FECACA' : '#FDE68A',
                }
              ]}>
                <AlertTriangle 
                  size={18} 
                  color={stockWarnings.hasCritical ? '#DC2626' : '#D97706'} 
                />
                <View style={styles.stockWarningContent}>
                  <Text style={[
                    styles.stockWarningTitle,
                    { color: stockWarnings.hasCritical ? '#991B1B' : '#92400E' }
                  ]}>
                    {stockWarnings.hasCritical 
                      ? `${stockWarnings.outOfStockCount} part(s) out of stock` 
                      : `${stockWarnings.totalWarnings} part(s) low on stock`
                    }
                  </Text>
                  <Text style={[
                    styles.stockWarningSubtitle,
                    { color: stockWarnings.hasCritical ? '#B91C1C' : '#B45309' }
                  ]}>
                    {stockWarnings.willCauseStockoutCount > 0 
                      ? `Using these parts will cause ${stockWarnings.willCauseStockoutCount} stockout(s)`
                      : 'Consider reordering before using these parts'
                    }
                  </Text>
                </View>
              </View>
            )}
            {uniqueParts.length > 0 ? (
              <>
                <View style={styles.partsList}>
                  {uniqueParts.map(part => (
                    <View
                      key={part.id}
                      style={[
                        styles.partItem, 
                        { 
                          backgroundColor: colors.backgroundSecondary, 
                          borderColor: getPartWarning(part.materialId) 
                            ? getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) + '40'
                            : colors.border,
                          borderLeftWidth: getPartWarning(part.materialId) ? 3 : 1,
                          borderLeftColor: getPartWarning(part.materialId) 
                            ? getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null)
                            : colors.border,
                        }
                      ]}
                    >
                      <View style={styles.partInfo}>
                        <View style={styles.partHeader}>
                          <Text style={[styles.partName, { color: colors.text }]} numberOfLines={1}>
                            {part.materialName}
                          </Text>
                          {getPartWarning(part.materialId) ? (
                            <View style={[
                              styles.partStockWarningBadge, 
                              { backgroundColor: getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) + '20' }
                            ]}>
                              <AlertTriangle 
                                size={10} 
                                color={getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null)} 
                              />
                              <Text style={[
                                styles.partStockWarningText, 
                                { color: getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) }
                              ]}>
                                {getPartStockSeverityLabel(getPartWarning(part.materialId)?.severity || null)}
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.partStatusBadge, { backgroundColor: getPartStatusColor(part.status) + '20' }]}>
                              <Text style={[styles.partStatusText, { color: getPartStatusColor(part.status) }]}>
                                {part.status.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.partSku, { color: colors.textSecondary }]}>
                          SKU: {part.materialSku}
                        </Text>
                        <View style={styles.partDetails}>
                          <View style={styles.partQuantity}>
                            <Text style={[styles.partDetailLabel, { color: colors.textTertiary }]}>Qty:</Text>
                            <View style={styles.quantityControls}>
                              {canEdit && linkedParts.some(p => p.id === part.id) && (
                                <Pressable
                                  style={[styles.quantityButton, { backgroundColor: colors.border }]}
                                  onPress={() => handleUpdatePartQuantity(part.id, part.quantityConsumed - 1)}
                                >
                                  <Minus size={14} color={colors.text} />
                                </Pressable>
                              )}
                              <Text style={[styles.partDetailValue, { color: colors.text }]}>
                                {part.quantityConsumed} {part.unitOfMeasure}
                              </Text>
                              {canEdit && linkedParts.some(p => p.id === part.id) && (
                                <Pressable
                                  style={[styles.quantityButton, { backgroundColor: colors.border }]}
                                  onPress={() => handleUpdatePartQuantity(part.id, part.quantityConsumed + 1)}
                                >
                                  <Plus size={14} color={colors.text} />
                                </Pressable>
                              )}
                            </View>
                          </View>
                          <View style={styles.partCost}>
                            <Text style={[styles.partDetailLabel, { color: colors.textTertiary }]}>Cost:</Text>
                            <Text style={[styles.partCostValue, { color: '#10B981' }]}>
                              ${part.totalCost.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        {part.binLocation && (
                          <Text style={[styles.partLocation, { color: colors.textTertiary }]}>
                            Location: {part.binLocation}
                          </Text>
                        )}
                        {getPartWarning(part.materialId) && (
                          <View style={[
                            styles.partStockWarningDetail,
                            { backgroundColor: getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) + '10' }
                          ]}>
                            <Text style={[
                              styles.partStockWarningDetailText,
                              { color: getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) }
                            ]}>
                              Stock: {getPartWarning(part.materialId)?.currentStock} / Min: {getPartWarning(part.materialId)?.minLevel}
                              {getPartWarning(part.materialId)?.willCauseStockout && ' • Will cause stockout'}
                            </Text>
                            <Pressable
                              style={[styles.createPOButton, { borderColor: getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) }]}
                              onPress={() => handleCreatePOSuggestion(
                                part.materialName,
                                part.materialSku,
                                getPartWarning(part.materialId)?.suggestedReorderQty || 0,
                                getPartWarning(part.materialId)?.vendor || null
                              )}
                            >
                              <Package size={12} color={getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null)} />
                              <Text style={[styles.createPOButtonText, { color: getPartStockSeverityColor(getPartWarning(part.materialId)?.severity || null) }]}>
                                Create PO
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                      {canEdit && linkedParts.some(p => p.id === part.id) && (
                        <Pressable
                          style={styles.partRemove}
                          onPress={() => handleRemovePart(part.id)}
                        >
                          <Trash2 size={18} color={colors.error} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>

                <View style={[styles.costSummary, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <View style={styles.costSummaryHeader}>
                    <DollarSign size={18} color="#10B981" />
                    <Text style={[styles.costSummaryTitle, { color: colors.text }]}>Cost Summary</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Labor Hours</Text>
                    <Text style={[styles.costValue, { color: colors.text }]}>{costSummary.laborHours.toFixed(1)} hrs</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Labor Cost</Text>
                    <Text style={[styles.costValue, { color: colors.text }]}>${costSummary.laborCost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Parts ({uniqueParts.length})</Text>
                    <Text style={[styles.costValue, { color: colors.text }]}>${costSummary.partsCost.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.costRow, styles.costTotalRow]}>
                    <Text style={[styles.costTotalLabel, { color: colors.text }]}>Total Cost</Text>
                    <Text style={[styles.costTotalValue, { color: '#10B981' }]}>
                      ${costSummary.totalCost.toFixed(2)}
                    </Text>
                  </View>
                  {partsSummary.budgetAllocated && (
                    <View style={styles.costRow}>
                      <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Budget Remaining</Text>
                      <Text style={[
                        styles.costValue,
                        { color: partsSummary.overBudget ? '#EF4444' : '#10B981' }
                      ]}>
                        ${(partsSummary.budgetRemaining || 0).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <Text style={[styles.noItemsText, { color: colors.textSecondary }]}>
                No parts linked to this work order
              </Text>
            )}

            {canEdit && (
              <View style={styles.partsActions}>
                <Pressable
                  style={[styles.partsActionButton, { backgroundColor: '#06B6D415', borderColor: '#06B6D4' }]}
                  onPress={() => setShowPartsModal(true)}
                >
                  <Plus size={18} color="#06B6D4" />
                  <Text style={[styles.partsActionText, { color: '#06B6D4' }]}>Add Parts</Text>
                </Pressable>
                <Pressable
                  style={[styles.partsActionButton, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF6' }]}
                  onPress={() => setShowBarcodeScanner(true)}
                >
                  <Scan size={18} color="#8B5CF6" />
                  <Text style={[styles.partsActionText, { color: '#8B5CF6' }]}>Scan Barcode</Text>
                </Pressable>
              </View>
            )}
            </>
            )}
          </View>
        )}
      </View>
    );
  }

  function renderLOTOModal() {
    return (
      <Modal visible={showLOTOModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.lotoModalHeader, { backgroundColor: '#EF4444' }]}>
            <View style={styles.lotoModalHeaderContent}>
              <View style={styles.lotoModalHeaderLeft}>
                <View style={[styles.lotoModalIconBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Lock size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.lotoModalTitle}>LOTO Procedure</Text>
                  <Text style={styles.lotoModalSubtitle}>{workOrder.safety.lotoSteps.length} steps</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setShowLOTOModal(false);
                  setEditingLotoStep(null);
                  setNewLotoStep({ description: '', lockColor: '', energySource: '', location: '' });
                }}
                style={styles.lotoModalCloseBtn}
              >
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Existing Steps */}
            {workOrder.safety.lotoSteps.map((step, index) => (
              <View
                key={step.id}
                style={[
                  styles.lotoEditStep,
                  {
                    backgroundColor: editingLotoStep?.id === step.id ? '#EF444410' : colors.surface,
                    borderColor: editingLotoStep?.id === step.id ? '#EF4444' : colors.border,
                  },
                ]}
              >
                {editingLotoStep?.id === step.id ? (
                  <View style={styles.lotoEditForm}>
                    <View style={styles.lotoEditFormHeader}>
                      <View style={[styles.lotoStepNumber, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.lotoStepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={[styles.lotoEditFormTitle, { color: colors.text }]}>Editing Step {index + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.lotoEditInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                      value={editingLotoStep.description}
                      onChangeText={(text) => setEditingLotoStep({ ...editingLotoStep, description: text })}
                      placeholder="Step description *"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                    />
                    <View style={styles.lotoEditRow}>
                      <View style={styles.lotoEditField}>
                        <Text style={[styles.lotoEditFieldLabel, { color: colors.textSecondary }]}>Lock Color</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lockColorPickerScroll}>
                          {LOCK_COLORS.map(lock => (
                            <Pressable
                              key={lock.id}
                              style={[
                                styles.lockColorPickerItem,
                                {
                                  backgroundColor: editingLotoStep.lockColor === lock.id ? lock.hex + '30' : 'transparent',
                                  borderColor: editingLotoStep.lockColor === lock.id ? lock.hex : colors.border,
                                },
                              ]}
                              onPress={() => setEditingLotoStep({ ...editingLotoStep, lockColor: lock.id })}
                            >
                              <View style={[styles.lockColorPickerDot, { backgroundColor: lock.hex, borderColor: lock.id === 'white' ? colors.border : lock.hex }]} />
                              <Text style={[styles.lockColorPickerName, { color: colors.text }]}>{lock.name}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                    <View style={styles.lotoEditRow}>
                      <TextInput
                        style={[styles.lotoEditInputSmall, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={editingLotoStep.energySource || ''}
                        onChangeText={(text) => setEditingLotoStep({ ...editingLotoStep, energySource: text })}
                        placeholder="Energy source"
                        placeholderTextColor={colors.textTertiary}
                      />
                      <TextInput
                        style={[styles.lotoEditInputSmall, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                        value={editingLotoStep.location || ''}
                        onChangeText={(text) => setEditingLotoStep({ ...editingLotoStep, location: text })}
                        placeholder="Location"
                        placeholderTextColor={colors.textTertiary}
                      />
                    </View>
                    <View style={styles.lotoEditActions}>
                      <Pressable
                        style={[styles.lotoEditCancelBtn, { borderColor: colors.border }]}
                        onPress={() => setEditingLotoStep(null)}
                      >
                        <Text style={[styles.lotoEditCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.lotoEditSaveBtn, { backgroundColor: '#EF4444' }]}
                        onPress={handleUpdateLotoStep}
                      >
                        <Save size={16} color="#FFFFFF" />
                        <Text style={styles.lotoEditSaveText}>Save Changes</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.lotoStepRow}>
                    <View style={styles.lotoStepReorderBtns}>
                      <Pressable
                        style={[styles.lotoReorderBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                        onPress={() => handleReorderLotoStep(step.id, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronDown size={16} color={colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
                      </Pressable>
                      <Pressable
                        style={[styles.lotoReorderBtn, { opacity: index === workOrder.safety.lotoSteps.length - 1 ? 0.3 : 1 }]}
                        onPress={() => handleReorderLotoStep(step.id, 'down')}
                        disabled={index === workOrder.safety.lotoSteps.length - 1}
                      >
                        <ChevronDown size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                    <View style={[styles.lotoStepNumber, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.lotoStepNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.lotoStepContent}>
                      <Text style={[styles.lotoStepText, { color: colors.text }]}>{step.description}</Text>
                      <View style={styles.lotoStepMeta}>
                        {step.energySource && (
                          <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <Zap size={12} color={colors.textSecondary} />
                            <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>{step.energySource}</Text>
                          </View>
                        )}
                        {step.lockColor && (
                          <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <View style={[styles.miniLockDot, { backgroundColor: LOCK_COLORS.find(l => l.id === step.lockColor)?.hex || colors.textSecondary }]} />
                            <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>{step.lockColor}</Text>
                          </View>
                        )}
                        {step.location && (
                          <View style={[styles.lotoMetaBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <MapPin size={12} color={colors.textSecondary} />
                            <Text style={[styles.lotoMetaText, { color: colors.textSecondary }]}>{step.location}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.lotoStepActions}>
                      <Pressable
                        style={styles.lotoStepActionBtn}
                        onPress={() => setEditingLotoStep({
                          id: step.id,
                          description: step.description,
                          lockColor: step.lockColor,
                          energySource: step.energySource,
                          location: step.location,
                        })}
                      >
                        <Edit3 size={16} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        style={styles.lotoStepActionBtn}
                        onPress={() => handleRemoveLotoStep(step.id)}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))}

            {/* Add New Step Form */}
            <View style={[styles.lotoAddStepForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.lotoAddStepHeader}>
                <Plus size={18} color="#EF4444" />
                <Text style={[styles.lotoAddStepTitle, { color: colors.text }]}>Add New Step</Text>
              </View>
              <TextInput
                style={[styles.lotoEditInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                value={newLotoStep.description}
                onChangeText={(text) => setNewLotoStep({ ...newLotoStep, description: text })}
                placeholder="Step description *"
                placeholderTextColor={colors.textTertiary}
                multiline
              />
              <View style={styles.lotoEditRow}>
                <View style={styles.lotoEditField}>
                  <Text style={[styles.lotoEditFieldLabel, { color: colors.textSecondary }]}>Lock Color</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lockColorPickerScroll}>
                    {LOCK_COLORS.map(lock => (
                      <Pressable
                        key={lock.id}
                        style={[
                          styles.lockColorPickerItem,
                          {
                            backgroundColor: newLotoStep.lockColor === lock.id ? lock.hex + '30' : 'transparent',
                            borderColor: newLotoStep.lockColor === lock.id ? lock.hex : colors.border,
                          },
                        ]}
                        onPress={() => setNewLotoStep({ ...newLotoStep, lockColor: lock.id })}
                      >
                        <View style={[styles.lockColorPickerDot, { backgroundColor: lock.hex, borderColor: lock.id === 'white' ? colors.border : lock.hex }]} />
                        <Text style={[styles.lockColorPickerName, { color: colors.text }]}>{lock.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View style={styles.lotoEditRow}>
                <TextInput
                  style={[styles.lotoEditInputSmall, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={newLotoStep.energySource}
                  onChangeText={(text) => setNewLotoStep({ ...newLotoStep, energySource: text })}
                  placeholder="Energy source"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={[styles.lotoEditInputSmall, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border }]}
                  value={newLotoStep.location}
                  onChangeText={(text) => setNewLotoStep({ ...newLotoStep, location: text })}
                  placeholder="Location"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <Pressable
                style={[
                  styles.lotoAddStepBtn,
                  {
                    backgroundColor: newLotoStep.description.trim() ? '#EF4444' : colors.border,
                    opacity: newLotoStep.description.trim() ? 1 : 0.6,
                  },
                ]}
                onPress={handleAddLotoStep}
                disabled={!newLotoStep.description.trim()}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.lotoAddStepBtnText}>Add Step</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.lotoModalDoneBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => {
                setShowLOTOModal(false);
                setEditingLotoStep(null);
                setNewLotoStep({ description: '', lockColor: '', energySource: '', location: '' });
              }}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.lotoModalDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCompletionModal() {
    
    const handleCloseCompletionModal = () => {
      setShowCompletionModal(false);
      setResumedAt(new Date());
      setCompletionNotes('');
      setIsCompleting(false);
    };

    const handleConfirmCompletion = async () => {
      setIsCompleting(true);
      console.log('[WorkOrderDetail] Starting work order completion for:', workOrder.id);
      
      try {
        let downtimeCompletionData: DowntimeCompletionData | undefined;

        // Handle downtime resolution if there's an active downtime event
        if (activeDowntimeEvent && activeDowntimeEvent.status === 'ongoing') {
          const stoppedTime = new Date(activeDowntimeEvent.stopped_at!).getTime();
          const resumedTime = resumedAt.getTime();
          
          if (resumedTime < stoppedTime) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Invalid Time', 'Resumed time cannot be before stopped time.');
            setIsCompleting(false);
            return;
          }

          const durationMinutes = Math.round((resumedTime - stoppedTime) / (1000 * 60));

          downtimeCompletionData = {
            downtimeId: activeDowntimeEvent.id,
            resumed_at: resumedAt.toISOString(),
            duration_minutes: durationMinutes,
            status: 'completed' as const,
            notes: completionNotes || activeDowntimeEvent.notes,
          };

          // Resolve downtime in Supabase
          console.log('[WorkOrderDetail] Resolving downtime event:', activeDowntimeEvent.id, 'duration:', durationMinutes, 'min');
          await resolveDowntimeMutation.mutateAsync({
            id: activeDowntimeEvent.id,
            resolvedBy: userId,
            resolvedByName: userName,
            endTime: resumedAt.toISOString(),
            notes: completionNotes || activeDowntimeEvent.notes || undefined,
          });

          // Also call legacy callback if provided
          if (onUpdateDowntime) {
            onUpdateDowntime(activeDowntimeEvent.id, {
              resumed_at: downtimeCompletionData.resumed_at,
              duration_minutes: downtimeCompletionData.duration_minutes,
              status: downtimeCompletionData.status,
              notes: downtimeCompletionData.notes,
            });
          }
        }

        // Complete work order in Supabase
        console.log('[WorkOrderDetail] Completing work order in Supabase:', workOrder.id);
        const actualHours = workOrder.actualHours ?? workOrder.estimatedHours ?? undefined;
        await completeWorkOrderMutation.mutateAsync({
          workOrderId: workOrder.id,
          completionNotes: completionNotes || undefined,
          actualHours: actualHours,
          completedBy: userName,
        });

        // Update local state
        onUpdate(workOrder.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completionNotes: completionNotes || undefined,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const durationText = downtimeCompletionData 
          ? `Downtime recorded: ${downtimeCompletionData.duration_minutes} minutes`
          : '';
        
        Alert.alert(
          'Work Order Completed',
          `Work order ${workOrder.workOrderNumber} has been successfully completed.${durationText ? '\n\n' + durationText : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                handleCloseCompletionModal();
                if (onCompleteWork) {
                  onCompleteWork(workOrder.id, downtimeCompletionData);
                }
              },
            },
          ]
        );
      } catch (error) {
        console.error('[WorkOrderDetail] Error completing work order:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to complete work order. Please try again.');
        setIsCompleting(false);
      }
    };

    const formatDateTime = (isoString: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return date.toLocaleString();
    };

    const adjustResumedTime = (minutes: number) => {
      const current = new Date(resumedAt);
      current.setMinutes(current.getMinutes() + minutes);
      setResumedAt(current);
    };

    const calculateDurationPreview = () => {
      if (!activeDowntimeEvent?.stopped_at) return null;
      const stoppedTime = new Date(activeDowntimeEvent.stopped_at).getTime();
      const resumedTime = resumedAt.getTime();
      const diffMs = resumedTime - stoppedTime;
      if (diffMs < 0) return null;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    const isResumedTimeValid = () => {
      if (!activeDowntimeEvent?.stopped_at) return true;
      const stoppedTime = new Date(activeDowntimeEvent.stopped_at).getTime();
      const resumedTime = resumedAt.getTime();
      return resumedTime >= stoppedTime;
    };

    const timeIsValid = isResumedTimeValid();

    // Check if WO has ongoing downtime with production stopped (using Supabase data)
    const hasOngoingDowntime = activeDowntimeEvent && activeDowntimeEvent.production_stopped === true && activeDowntimeEvent.status === 'ongoing';

    return (
      <Modal visible={showCompletionModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.completionModalHeader, { backgroundColor: '#10B981' }]}>
            <View style={styles.completionModalHeaderContent}>
              <View style={styles.completionModalHeaderLeft}>
                <View style={[styles.completionModalIconBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <CheckCircle2 size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.completionModalTitle}>Complete Work Order</Text>
                  <Text style={styles.completionModalSubtitle}>{workOrder.workOrderNumber}</Text>
                </View>
              </View>
              <Pressable 
                onPress={handleCloseCompletionModal} 
                style={styles.completionModalCloseBtn}
              >
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          
          <ScrollView style={styles.completionModalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.completionModalWorkOrderInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.completionModalInfoLabel, { color: colors.textSecondary }]}>Work Order</Text>
              <Text style={[styles.completionModalInfoValue, { color: colors.text }]}>{workOrder.title}</Text>
            </View>

            {hasOngoingDowntime && (
              <View style={[styles.completionDowntimeSection, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <View style={styles.completionDowntimeHeader}>
                  <View style={[styles.completionDowntimeBadge, { backgroundColor: '#DC2626' }]}>
                    <AlertTriangle size={14} color="#FFFFFF" />
                    <Text style={styles.completionDowntimeBadgeText}>DOWNTIME LOGGED</Text>
                  </View>
                </View>

                <View style={styles.completionDowntimeInfo}>
                  <View style={styles.completionDowntimeRow}>
                    <Text style={[styles.completionDowntimeLabel, { color: '#991B1B' }]}>Room/Line</Text>
                    <Text style={[styles.completionDowntimeValue, { color: '#7F1D1D' }]}>
                      {activeDowntimeEvent?.room_line_name || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.completionDowntimeRow}>
                    <Text style={[styles.completionDowntimeLabel, { color: '#991B1B' }]}>Stopped At</Text>
                    <Text style={[styles.completionDowntimeValue, { color: '#7F1D1D' }]}>
                      {activeDowntimeEvent?.stopped_at ? formatDateTime(activeDowntimeEvent.stopped_at) : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.completionResumedSection, { backgroundColor: '#FFFFFF', borderColor: '#FECACA' }]}>
                  <Text style={[styles.completionResumedTitle, { color: '#991B1B' }]}>Production Resumed At *</Text>
                  
                  <View style={[styles.completionResumedDisplay, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                    <Clock size={18} color="#DC2626" />
                    <Text style={[styles.completionResumedTime, { color: '#7F1D1D' }]}>
                      {formatDateTime(resumedAt.toISOString())}
                    </Text>
                  </View>

                  <View style={styles.completionTimeAdjustButtons}>
                    <Pressable
                      style={[styles.completionTimeAdjustBtn, { backgroundColor: colors.backgroundSecondary, opacity: isCompleting ? 0.5 : 1 }]}
                      onPress={() => adjustResumedTime(-30)}
                      disabled={isCompleting}
                    >
                      <Text style={[styles.completionTimeAdjustText, { color: colors.text }]}>-30m</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.completionTimeAdjustBtn, { backgroundColor: colors.backgroundSecondary, opacity: isCompleting ? 0.5 : 1 }]}
                      onPress={() => adjustResumedTime(-5)}
                      disabled={isCompleting}
                    >
                      <Text style={[styles.completionTimeAdjustText, { color: colors.text }]}>-5m</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.completionTimeAdjustBtn, { backgroundColor: '#10B981', opacity: isCompleting ? 0.5 : 1 }]}
                      onPress={() => setResumedAt(new Date())}
                      disabled={isCompleting}
                    >
                      <Text style={[styles.completionTimeAdjustText, { color: '#FFFFFF' }]}>Now</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.completionTimeAdjustBtn, { backgroundColor: colors.backgroundSecondary, opacity: isCompleting ? 0.5 : 1 }]}
                      onPress={() => adjustResumedTime(5)}
                      disabled={isCompleting}
                    >
                      <Text style={[styles.completionTimeAdjustText, { color: colors.text }]}>+5m</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.completionTimeAdjustBtn, { backgroundColor: colors.backgroundSecondary, opacity: isCompleting ? 0.5 : 1 }]}
                      onPress={() => adjustResumedTime(30)}
                      disabled={isCompleting}
                    >
                      <Text style={[styles.completionTimeAdjustText, { color: colors.text }]}>+30m</Text>
                    </Pressable>
                  </View>

                  <DateTimePicker
                    value={resumedAt}
                    mode="datetime"
                    display="default"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        setResumedAt(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                    style={styles.completionDateTimePicker}
                  />

                  {!timeIsValid && (
                    <View style={[styles.completionTimeError, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                      <AlertTriangle size={16} color="#DC2626" />
                      <Text style={[styles.completionTimeErrorText, { color: '#DC2626' }]}>
                        Resume time must be after stop time
                      </Text>
                    </View>
                  )}

                  {timeIsValid && calculateDurationPreview() && (
                    <View style={[styles.completionDurationPreview, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
                      <Text style={[styles.completionDurationLabel, { color: '#166534' }]}>Total Downtime</Text>
                      <Text style={[styles.completionDurationValue, { color: '#15803D' }]}>
                        {calculateDurationPreview()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.completionNotesSection}>
              <Text style={[styles.completionNotesLabel, { color: colors.text }]}>Completion Notes</Text>
              <TextInput
                style={[styles.completionNotesInput, { backgroundColor: colors.backgroundSecondary, color: colors.text, borderColor: colors.border, opacity: isCompleting ? 0.5 : 1 }]}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Add any notes about the completed work..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                editable={!isCompleting}
              />
            </View>

            <View style={styles.completionModalActions}>
              <Pressable
                style={[styles.completionCancelBtn, { borderColor: colors.border, opacity: isCompleting ? 0.5 : 1 }]}
                onPress={handleCloseCompletionModal}
                disabled={isCompleting}
              >
                <Text style={[styles.completionCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.completionConfirmBtn, 
                  { 
                    backgroundColor: (timeIsValid && !isCompleting) ? '#10B981' : '#9CA3AF',
                    opacity: (timeIsValid && !isCompleting) ? 1 : 0.6,
                  }
                ]}
                onPress={handleConfirmCompletion}
                disabled={!timeIsValid || isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CheckCircle2 size={18} color="#FFFFFF" />
                )}
                <Text style={styles.completionConfirmText}>{isCompleting ? 'Completing...' : 'Complete Work Order'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  function renderFailureCodeModal() {
    const getCategoryColor = (categoryId: FailureCodeCategory) => {
      const category = FAILURE_CODE_CATEGORIES.find(c => c.id === categoryId);
      return category?.color || '#6B7280';
    };

    const getCategoryIcon = (categoryId: FailureCodeCategory, size: number = 16, color: string = '#FFFFFF') => {
      switch (categoryId) {
        case 'mechanical': return <Cog size={size} color={color} />;
        case 'electrical': return <Zap size={size} color={color} />;
        case 'hydraulic': return <Droplets size={size} color={color} />;
        case 'pneumatic': return <Wind size={size} color={color} />;
        case 'instrumentation': return <Gauge size={size} color={color} />;
        case 'structural': return <Box size={size} color={color} />;
        case 'process': return <GitBranch size={size} color={color} />;
        case 'operator': return <User size={size} color={color} />;
        case 'external': return <Cloud size={size} color={color} />;
        default: return <AlertTriangle size={size} color={color} />;
      }
    };

    const getSeverityColor = (severity: string) => {
      switch (severity) {
        case 'critical': return '#DC2626';
        case 'major': return '#EF4444';
        case 'moderate': return '#F59E0B';
        case 'minor': return '#10B981';
        default: return '#6B7280';
      }
    };

    return (
      <Modal visible={showFailureCodeModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Link Failure Code</Text>
            <Pressable onPress={() => {
              setShowFailureCodeModal(false);
              setFailureCodeSearch('');
              setFailureCodeCategoryFilter('all');
            }}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          
          <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={failureCodeSearch}
              onChangeText={setFailureCodeSearch}
              placeholder="Search by code, name, or description..."
              placeholderTextColor={colors.textTertiary}
            />
            {failureCodeSearch.length > 0 && (
              <Pressable onPress={() => setFailureCodeSearch('')}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <View style={styles.failureCodeFilterContainer}>
            <View style={styles.failureCodeFilterRow}>
              <Text style={[styles.failureCodeFilterLabel, { color: colors.textSecondary }]}>Category:</Text>
              <View style={styles.failureCodeExpandCollapseButtons}>
                <Pressable
                  style={[styles.failureCodeExpandCollapseBtn, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={expandAllFailureCodeCategories}
                >
                  <Text style={[styles.failureCodeExpandCollapseBtnText, { color: colors.textSecondary }]}>Expand All</Text>
                </Pressable>
                <Pressable
                  style={[styles.failureCodeExpandCollapseBtn, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={collapseAllFailureCodeCategories}
                >
                  <Text style={[styles.failureCodeExpandCollapseBtnText, { color: colors.textSecondary }]}>Collapse All</Text>
                </Pressable>
              </View>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.failureCodeFilterScroll}
              contentContainerStyle={styles.failureCodeFilterContent}
            >
              <Pressable
                style={[
                  styles.failureCodeFilterChip,
                  {
                    backgroundColor: failureCodeCategoryFilter === 'all' ? colors.primary : colors.backgroundSecondary,
                    borderColor: failureCodeCategoryFilter === 'all' ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFailureCodeCategoryFilter('all');
                }}
              >
                <Text style={[
                  styles.failureCodeFilterChipText,
                  { color: failureCodeCategoryFilter === 'all' ? '#FFFFFF' : colors.text }
                ]}>
                  All
                </Text>
              </Pressable>
              {failureCodeCategoriesData.map(category => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.failureCodeFilterChip,
                    {
                      backgroundColor: failureCodeCategoryFilter === category.id ? category.color : colors.backgroundSecondary,
                      borderColor: failureCodeCategoryFilter === category.id ? category.color : colors.border,
                    }
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFailureCodeCategoryFilter(category.id);
                  }}
                >
                  <View style={[
                    styles.failureCodeCategoryDot,
                    { backgroundColor: failureCodeCategoryFilter === category.id ? '#FFFFFF' : category.color }
                  ]} />
                  <Text style={[
                    styles.failureCodeFilterChipText,
                    { color: failureCodeCategoryFilter === category.id ? '#FFFFFF' : colors.text }
                  ]}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.modalContent}>
            {filteredFailureCodes.length > 0 ? (
              sortedCategories.map(category => {
                const isCategoryExpanded = expandedFailureCodeCategories.has(category.id);
                return (
                <View key={category.id} style={styles.failureCodeCategorySection}>
                  <Pressable 
                    style={[styles.failureCodeCategorySectionHeader, { backgroundColor: category.color + '15', borderLeftColor: category.color }]}
                    onPress={() => toggleFailureCodeCategory(category.id)}
                  >
                    <View style={[styles.failureCodeCategorySectionIcon, { backgroundColor: category.color }]}>
                      {getCategoryIcon(category.id, 16, '#FFFFFF')}
                    </View>
                    <View style={styles.failureCodeCategorySectionInfo}>
                      <Text style={[styles.failureCodeCategorySectionTitle, { color: category.color }]}>
                        {category.name}
                      </Text>
                      <Text style={[styles.failureCodeCategorySectionCount, { color: colors.textTertiary }]}>
                        {groupedFailureCodes[category.id].length} code{groupedFailureCodes[category.id].length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {isCategoryExpanded ? (
                      <ChevronDown size={20} color={category.color} />
                    ) : (
                      <ChevronRight size={20} color={category.color} />
                    )}
                  </Pressable>
                  {isCategoryExpanded && groupedFailureCodes[category.id].map(fc => {
                    const isSelected = selectedFailureCode?.id === fc.id;
                    const categoryColor = getCategoryColor(fc.category);
                    
                    return (
                      <Pressable
                        key={fc.id}
                        style={[
                          styles.failureCodeItem,
                          {
                            backgroundColor: isSelected ? categoryColor + '15' : colors.surface,
                            borderColor: isSelected ? categoryColor : colors.border,
                            borderLeftWidth: 4,
                            borderLeftColor: categoryColor,
                          }
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedFailureCode(isSelected ? null : fc);
                        }}
                      >
                        <View style={styles.failureCodeItemHeader}>
                          <View style={[styles.failureCodeBadge, { backgroundColor: categoryColor }]}>
                            <Text style={styles.failureCodeBadgeText}>{fc.code}</Text>
                          </View>
                          <View style={styles.failureCodeItemInfo}>
                            <Text style={[styles.failureCodeItemName, { color: colors.text }]} numberOfLines={1}>
                              {fc.name}
                            </Text>
                            <View style={styles.failureCodeItemMeta}>
                              <View style={[styles.failureCodeCategoryBadge, { backgroundColor: categoryColor + '20', borderColor: categoryColor + '40' }]}>
                                {getCategoryIcon(fc.category, 10, categoryColor)}
                                <Text style={[styles.failureCodeCategoryText, { color: categoryColor }]}>
                                  {failureCodeCategoriesData.find(c => c.id === fc.category)?.name || fc.category}
                                </Text>
                              </View>
                              <View style={[styles.failureCodeSeverityBadge, { backgroundColor: getSeverityColor(fc.severity) + '20' }]}>
                                <Text style={[styles.failureCodeSeverityText, { color: getSeverityColor(fc.severity) }]}>
                                  {fc.severity.toUpperCase()}
                                </Text>
                              </View>
                              {fc.mttrHours && (
                                <View style={[styles.failureCodeMttrBadge, { backgroundColor: colors.backgroundSecondary }]}>
                                  <Clock size={10} color={colors.textTertiary} />
                                  <Text style={[styles.failureCodeMttrText, { color: colors.textTertiary }]}>
                                    ~{fc.mttrHours}h MTTR
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                          {isSelected ? (
                            <CheckCircle2 size={22} color={categoryColor} />
                          ) : (
                            <Circle size={22} color={colors.border} />
                          )}
                        </View>
                        <Text style={[styles.failureCodeItemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {fc.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                );
              })
            ) : (
              <View style={styles.failureCodeEmptyState}>
                <AlertTriangle size={32} color={colors.textTertiary} />
                <Text style={[styles.failureCodeEmptyText, { color: colors.textSecondary }]}>
                  No failure codes found
                </Text>
                <Text style={[styles.failureCodeEmptySubtext, { color: colors.textTertiary }]}>
                  Try adjusting your search or filter
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Pressable
              style={[
                styles.failureCodeConfirmBtn,
                { 
                  backgroundColor: selectedFailureCode ? colors.primary : colors.border,
                  opacity: selectedFailureCode ? 1 : 0.5,
                }
              ]}
              onPress={() => {
                if (selectedFailureCode) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  
                  // Link failure code to work order via mutation
                  const updatedSafety = {
                    ...workOrder.safety,
                    failureCodeId: selectedFailureCode.id,
                    failureCode: selectedFailureCode.code,
                    failureCodeName: selectedFailureCode.name,
                    failureCodeCategory: selectedFailureCode.category,
                  };
                  
                  console.log('[WorkOrderDetail] Linking failure code:', selectedFailureCode.code, 'to work order:', workOrder.id);
                  
                  // Update local state immediately
                  onUpdate(workOrder.id, { safety: updatedSafety });
                  setLinkedFailureCode(selectedFailureCode);
                  
                  // Persist to Supabase
                  updateWorkOrderMutation.mutate(
                    { id: workOrder.id, updates: { safety: updatedSafety } },
                    {
                      onSuccess: () => {
                        console.log('[WorkOrderDetail] Failure code linked successfully');
                      },
                      onError: (error) => {
                        console.error('[WorkOrderDetail] Failed to link failure code:', error);
                        Alert.alert('Error', 'Failed to link failure code. Please try again.');
                        // Revert on error
                        onUpdate(workOrder.id, { safety: workOrder.safety });
                        setLinkedFailureCode(null);
                      },
                    }
                  );
                  
                  setShowFailureCodeModal(false);
                  setFailureCodeSearch('');
                  setFailureCodeCategoryFilter('all');
                  setSelectedFailureCode(null);
                }
              }}
              disabled={!selectedFailureCode || updateWorkOrderMutation.isPending}
            >
              <Text style={styles.failureCodeConfirmBtnText}>
                {selectedFailureCode ? `Link: ${selectedFailureCode.code}` : 'Select a Failure Code'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  function renderPartsModal() {
    return (
      <Modal visible={showPartsModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Parts from Inventory</Text>
            <Pressable onPress={() => {
              setShowPartsModal(false);
              setPartsSearchQuery('');
            }}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          
          <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={partsSearchQuery}
              onChangeText={setPartsSearchQuery}
              placeholder="Search by name, SKU, or barcode..."
              placeholderTextColor={colors.textTertiary}
            />
            {partsSearchQuery.length > 0 && (
              <Pressable onPress={() => setPartsSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.modalContent}>
            {isLoadingModalMaterials ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Loading inventory...</Text>
              </View>
            ) : filteredMaterials.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Package size={48} color={colors.textTertiary} />
                <Text style={[styles.modalEmptyText, { color: colors.textSecondary }]}>
                  {partsSearchQuery.trim() ? 'No parts found matching your search' : 'No parts available'}
                </Text>
              </View>
            ) : filteredMaterials.map(material => {
              const quantity = partQuantities[material.id] || 1;
              const isLinked = linkedParts.some(p => p.materialId === material.id);
              const stockStatus = getPartStockStatusForModal(material.id);
              const isLowOrOutOfStock = stockStatus?.isLowStock || stockStatus?.isOutOfStock;
              
              return (
                <View
                  key={material.id}
                  style={[
                    styles.inventoryItem,
                    {
                      backgroundColor: isLinked ? '#06B6D410' : isLowOrOutOfStock ? getPartStockSeverityColor(stockStatus?.severity || null) + '08' : colors.surface,
                      borderColor: isLinked ? '#06B6D4' : isLowOrOutOfStock ? getPartStockSeverityColor(stockStatus?.severity || null) + '40' : colors.border,
                      borderLeftWidth: isLowOrOutOfStock ? 3 : 1,
                      borderLeftColor: isLowOrOutOfStock ? getPartStockSeverityColor(stockStatus?.severity || null) : colors.border,
                    },
                  ]}
                >
                  <View style={styles.inventoryItemInfo}>
                    <View style={styles.inventoryItemHeader}>
                      <Text style={[styles.inventoryItemName, { color: colors.text }]} numberOfLines={1}>
                        {material.name}
                      </Text>
                      {isLinked && (
                        <View style={[styles.linkedBadge, { backgroundColor: '#06B6D4' }]}>
                          <Text style={styles.linkedBadgeText}>LINKED</Text>
                        </View>
                      )}
                      {isLowOrOutOfStock && !isLinked && (
                        <View style={[styles.lowStockModalBadge, { backgroundColor: getPartStockSeverityColor(stockStatus?.severity || null) + '20' }]}>
                          <AlertTriangle size={10} color={getPartStockSeverityColor(stockStatus?.severity || null)} />
                          <Text style={[styles.lowStockModalBadgeText, { color: getPartStockSeverityColor(stockStatus?.severity || null) }]}>
                            {getPartStockSeverityLabel(stockStatus?.severity || null)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.inventoryItemSku, { color: colors.textSecondary }]}>
                      SKU: {material.sku}
                    </Text>
                    <View style={styles.inventoryItemMeta}>
                      <Text style={[styles.inventoryItemStock, { color: (material.on_hand ?? 0) <= (material.min_level ?? 0) ? '#EF4444' : '#10B981' }]}>
                        {material.on_hand ?? 0} in stock
                      </Text>
                      <Text style={[styles.inventoryItemPrice, { color: colors.textSecondary }]}>
                        ${(material.unit_price ?? 0).toFixed(2)} / {material.unit_of_measure ?? 'EA'}
                      </Text>
                    </View>
                    {isLowOrOutOfStock && (
                      <Pressable
                        style={[styles.modalCreatePOSuggestion, { backgroundColor: getPartStockSeverityColor(stockStatus?.severity || null) + '15', borderColor: getPartStockSeverityColor(stockStatus?.severity || null) + '40' }]}
                        onPress={() => handleCreatePOSuggestion(
                          material.name,
                          material.sku,
                          stockStatus?.suggestedReorderQty || (material.max_level ?? 0) - (material.on_hand ?? 0),
                          stockStatus?.vendor || null
                        )}
                      >
                        <Package size={14} color={getPartStockSeverityColor(stockStatus?.severity || null)} />
                        <View style={styles.modalCreatePOContent}>
                          <Text style={[styles.modalCreatePOText, { color: getPartStockSeverityColor(stockStatus?.severity || null) }]}>
                            Reorder suggested: {stockStatus?.suggestedReorderQty || material.max_level - material.on_hand} units
                          </Text>
                          <Text style={[styles.modalCreatePOAction, { color: getPartStockSeverityColor(stockStatus?.severity || null) }]}>
                            Tap to create PO
                          </Text>
                        </View>
                        <ChevronRight size={16} color={getPartStockSeverityColor(stockStatus?.severity || null)} />
                      </Pressable>
                    )}
                  </View>
                  
                  <View style={styles.inventoryItemActions}>
                    <View style={styles.quantitySelector}>
                      <Pressable
                        style={[styles.quantitySelectorBtn, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => setPartQuantities(prev => ({
                          ...prev,
                          [material.id]: Math.max(1, (prev[material.id] || 1) - 1)
                        }))}
                      >
                        <Minus size={16} color={colors.text} />
                      </Pressable>
                      <Text style={[styles.quantitySelectorValue, { color: colors.text }]}>
                        {quantity}
                      </Text>
                      <Pressable
                        style={[styles.quantitySelectorBtn, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => setPartQuantities(prev => ({
                          ...prev,
                          [material.id]: (prev[material.id] || 1) + 1
                        }))}
                      >
                        <Plus size={16} color={colors.text} />
                      </Pressable>
                    </View>
                    <Pressable
                      style={[styles.addPartBtn, { backgroundColor: '#06B6D4' }]}
                      onPress={() => handleAddPartFromInventory(material as any, quantity)}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.addPartBtnText}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          
          <View style={[styles.modalFooter, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.scanFromModalBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => {
                setShowPartsModal(false);
                setShowBarcodeScanner(true);
              }}
            >
              <Scan size={18} color="#FFFFFF" />
              <Text style={styles.scanFromModalBtnText}>Scan Barcode Instead</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  function getPartStatusColor(status: string): string {
    switch (status) {
      case 'issued':
      case 'consumed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'partial_return':
        return '#3B82F6';
      case 'full_return':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  }
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      gap: 12,
    },
    closeButton: {
      padding: 4,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    headerSubtitle: {
      fontSize: 13,
      marginTop: 2,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
      gap: 12,
    },
    section: {
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    sectionBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    sectionBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    sectionContent: {
      padding: 14,
      paddingTop: 0,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    typeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    typeBadgeText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    priorityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    priorityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    priorityText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    descriptionContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },
    notesContainer: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    notesText: {
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },
    notesEditContainer: {
      marginTop: 8,
      gap: 10,
    },
    notesInput: {
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      borderWidth: 1,
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
    saveNotesButton: {
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    saveNotesText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    toggleLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    toggle: {
      width: 48,
      height: 28,
      borderRadius: 14,
      padding: 4,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    lotoWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    lotoWarningText: {
      fontSize: 13,
      fontWeight: '500' as const,
      flex: 1,
    },
    subSectionTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 10,
      marginTop: 8,
    },
    lockColorsContainer: {
      marginBottom: 16,
    },
    lockColorsScroll: {
      marginTop: 8,
    },
    lockColorItem: {
      alignItems: 'center',
      marginRight: 16,
      width: 70,
    },
    lockColorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      marginBottom: 4,
    },
    lockColorName: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    lockColorDesc: {
      fontSize: 9,
      textAlign: 'center' as const,
    },
    lotoStep: {
      flexDirection: 'row',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    lotoStepNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lotoStepNumberText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700' as const,
    },
    lotoStepContent: {
      flex: 1,
    },
    lotoStepText: {
      fontSize: 14,
      lineHeight: 20,
    },
    lotoStepMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
    },
    lotoMetaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    lotoMetaText: {
      fontSize: 11,
    },
    miniLockDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    editLotoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      marginTop: 12,
    },
    editLotoText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    selectedPermits: {
      gap: 10,
    },
    permitCard: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    permitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    permitCode: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    permitCodeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700' as const,
    },
    permitName: {
      fontSize: 14,
      fontWeight: '600' as const,
      flex: 1,
    },
    permitDesc: {
      fontSize: 12,
      marginTop: 6,
      lineHeight: 18,
    },
    permitMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    permitMetaText: {
      fontSize: 11,
    },
    noItemsText: {
      fontSize: 14,
      fontStyle: 'italic' as const,
      textAlign: 'center' as const,
      paddingVertical: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      marginTop: 12,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    ppeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    ppeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    ppeName: {
      fontSize: 12,
      fontWeight: '500' as const,
      maxWidth: 100,
    },
    ppeRemove: {
      padding: 2,
    },
    tasksList: {
      gap: 0,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    taskCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskContent: {
      flex: 1,
    },
    taskText: {
      fontSize: 14,
      lineHeight: 20,
    },
    taskCompletedAt: {
      fontSize: 11,
      marginTop: 4,
    },
    progressContainer: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginTop: 16,
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 12,
      marginTop: 6,
      textAlign: 'center' as const,
    },
    attachmentsGrid: {
      gap: 10,
    },
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    attachmentImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
    },
    attachmentDoc: {
      width: 60,
      height: 60,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentInfo: {
      flex: 1,
    },
    attachmentName: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    attachmentMeta: {
      fontSize: 12,
      marginTop: 2,
    },
    attachmentRemove: {
      padding: 8,
    },
    attachmentActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    attachButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    attachButtonText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    uploadingIndicator: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 10,
      padding: 14,
      borderRadius: 10,
      marginBottom: 12,
    },
    uploadingText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    footer: {
      padding: 16,
      paddingBottom: 34,
      borderTopWidth: 1,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 16,
      borderRadius: 12,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    permitSelectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    permitSelectContent: {
      flex: 1,
    },
    ppeCategorySection: {
      marginBottom: 20,
    },
    ppeCategoryTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 10,
    },
    ppeSelectItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
    },
    ppeSelectContent: {
      flex: 1,
    },
    ppeSelectName: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    ppeSelectDesc: {
      fontSize: 12,
      marginTop: 2,
    },
    partsList: {
      gap: 10,
    },
    partItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    partInfo: {
      flex: 1,
    },
    partHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    partName: {
      fontSize: 14,
      fontWeight: '600' as const,
      flex: 1,
    },
    partStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    partStatusText: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
    partSku: {
      fontSize: 12,
      marginBottom: 6,
    },
    partDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    partQuantity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quantityButton: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    partCost: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    partDetailLabel: {
      fontSize: 12,
    },
    partDetailValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    partCostValue: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    partLocation: {
      fontSize: 11,
      marginTop: 6,
    },
    partRemove: {
      padding: 8,
    },
    costSummary: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 12,
    },
    costSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    costSummaryTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    costLabel: {
      fontSize: 13,
    },
    costValue: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    costTotalRow: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.1)',
      marginTop: 8,
      paddingTop: 12,
    },
    costTotalLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    costTotalValue: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    partsActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    partsActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    partsActionText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      margin: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      padding: 0,
    },
    inventoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    inventoryItemInfo: {
      flex: 1,
    },
    inventoryItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    inventoryItemName: {
      fontSize: 14,
      fontWeight: '600' as const,
      flex: 1,
    },
    linkedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    linkedBadgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700' as const,
    },
    inventoryItemSku: {
      fontSize: 12,
      marginBottom: 4,
    },
    inventoryItemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    inventoryItemStock: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    inventoryItemPrice: {
      fontSize: 12,
    },
    inventoryItemActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    quantitySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    quantitySelectorBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantitySelectorValue: {
      fontSize: 16,
      fontWeight: '600' as const,
      minWidth: 30,
      textAlign: 'center' as const,
    },
    addPartBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    addPartBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    modalFooter: {
      padding: 16,
      paddingBottom: 34,
      borderTopWidth: 1,
    },
    scanFromModalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 16,
      borderRadius: 12,
    },
    scanFromModalBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    permitStatusContainer: {
      marginTop: 10,
      gap: 6,
    },
    permitStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    permitStatusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    permitStatusText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    permitExpiryText: {
      fontSize: 11,
    },
    permitPendingText: {
      fontSize: 12,
      fontStyle: 'italic' as const,
    },
    approvalRequiredBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    approvalRequiredText: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: '#D97706',
    },
    fillPermitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 8,
    },
    fillPermitButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    permitFormHeader: {
      padding: 16,
      paddingTop: 20,
    },
    permitFormHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    permitFormHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    permitFormCodeBadge: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permitFormCode: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700' as const,
    },
    permitFormTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600' as const,
    },
    permitFormSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 13,
    },
    permitFormCloseBtn: {
      padding: 4,
    },
    permitFormContent: {
      flex: 1,
      padding: 16,
    },
    permitFormWorkOrderInfo: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    permitFormInfoLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    permitFormInfoValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    permitFormInfoTitle: {
      fontSize: 13,
      marginTop: 4,
    },
    approvalNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 16,
    },
    approvalNoticeText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500' as const,
    },
    permitFormFields: {
      gap: 16,
    },
    permitFormField: {
      gap: 8,
    },
    permitFormFieldLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    permitFormInput: {
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      borderWidth: 1,
    },
    permitFormTextarea: {
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      borderWidth: 1,
      minHeight: 80,
      textAlignVertical: 'top' as const,
    },
    selectScroll: {
      flexDirection: 'row',
    },
    selectOption: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 8,
      marginRight: 8,
      borderWidth: 1,
    },
    selectOptionText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    checkboxField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxLabel: {
      flex: 1,
      fontSize: 14,
    },
    signatureBox: {
      padding: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 80,
    },
    signedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    signedName: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    signedDate: {
      fontSize: 12,
    },
    signaturePlaceholder: {
      fontSize: 14,
    },
    permitFormActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
      marginBottom: 40,
    },
    permitFormCancelBtn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    permitFormCancelText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    permitFormSubmitBtn: {
      flex: 2,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    permitFormSubmitText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    stockWarningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 12,
    },
    stockWarningContent: {
      flex: 1,
    },
    stockWarningTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    stockWarningSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    partStockWarningBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    partStockWarningText: {
      fontSize: 9,
      fontWeight: '600' as const,
    },
    partStockWarningDetail: {
      marginTop: 8,
      padding: 8,
      borderRadius: 6,
    },
    partStockWarningDetailText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    createPOButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    createPOButtonText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    lowStockModalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    lowStockModalBadgeText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    modalCreatePOSuggestion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 8,
    },
    modalCreatePOContent: {
      flex: 1,
    },
    modalCreatePOText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    modalCreatePOAction: {
      fontSize: 11,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    failureCodeFilterContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    failureCodeFilterLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginBottom: 8,
    },
    failureCodeFilterScroll: {
      flexGrow: 0,
    },
    failureCodeFilterContent: {
      gap: 8,
    },
    failureCodeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    failureCodeFilterChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    failureCodeCategoryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    failureCodeItem: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    failureCodeItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
    },
    failureCodeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    failureCodeBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700' as const,
    },
    failureCodeItemInfo: {
      flex: 1,
    },
    failureCodeItemName: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 4,
    },
    failureCodeItemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    failureCodeCategoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
    },
    failureCodeCategoryIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    failureCodeCategoryText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    failureCodeSeverityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    failureCodeSeverityText: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
    failureCodeMttrBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    failureCodeMttrText: {
      fontSize: 10,
    },
    failureCodeItemDesc: {
      fontSize: 13,
      lineHeight: 18,
    },
    failureCodeEmptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      gap: 8,
    },
    failureCodeEmptyText: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    failureCodeEmptySubtext: {
      fontSize: 13,
    },
    failureCodeConfirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 12,
    },
    failureCodeConfirmBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    failureCodeCategorySection: {
      marginBottom: 16,
    },
    failureCodeCategorySectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
      padding: 12,
      borderRadius: 10,
      borderLeftWidth: 4,
      marginBottom: 10,
    },
    failureCodeCategorySectionIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    failureCodeCategorySectionInfo: {
      flex: 1,
    },
    failureCodeCategorySectionTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    failureCodeCategorySectionCount: {
      fontSize: 12,
      marginTop: 2,
    },
    failureCodeFilterRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    failureCodeExpandCollapseButtons: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    failureCodeExpandCollapseBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
    },
    failureCodeExpandCollapseBtnText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    downtimeInfoContainer: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    downtimeInfoHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    downtimeStatusBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    downtimeStatusText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700' as const,
    },
    downtimeInfoGrid: {
      gap: 10,
    },
    downtimeInfoRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 10,
    },
    downtimeInfoContent: {
      flex: 1,
    },
    downtimeInfoLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    downtimeInfoValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    downtimeDurationContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
    },
    downtimeDurationLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    downtimeDurationValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      fontVariant: ['tabular-nums'] as any,
    },
    completionModalHeader: {
      padding: 16,
      paddingTop: 20,
    },
    completionModalHeaderContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    completionModalHeaderLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    completionModalIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    completionModalTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600' as const,
    },
    completionModalSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 13,
    },
    completionModalCloseBtn: {
      padding: 4,
    },
    completionModalContent: {
      flex: 1,
      padding: 16,
    },
    completionModalWorkOrderInfo: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    completionModalInfoLabel: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    completionModalInfoValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: 2,
    },
    completionDowntimeSection: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
    },
    completionDowntimeHeader: {
      marginBottom: 12,
    },
    completionDowntimeBadge: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      alignSelf: 'flex-start' as const,
    },
    completionDowntimeBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700' as const,
    },
    completionDowntimeInfo: {
      gap: 8,
      marginBottom: 12,
    },
    completionDowntimeRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    completionDowntimeLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    completionDowntimeValue: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    completionResumedSection: {
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    completionResumedTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 10,
    },
    completionResumedDisplay: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    completionResumedTime: {
      fontSize: 15,
      fontWeight: '600' as const,
      flex: 1,
    },
    completionTimeAdjustButtons: {
      flexDirection: 'row' as const,
      gap: 8,
      marginBottom: 12,
    },
    completionTimeAdjustBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center' as const,
    },
    completionTimeAdjustText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    completionDurationPreview: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
    },
    completionDurationLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    completionDurationValue: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    completionNotesSection: {
      marginBottom: 16,
    },
    completionNotesLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
      marginBottom: 8,
    },
    completionNotesInput: {
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      borderWidth: 1,
      minHeight: 100,
      textAlignVertical: 'top' as const,
    },
    completionModalActions: {
      flexDirection: 'row' as const,
      gap: 12,
      marginBottom: 40,
    },
    completionCancelBtn: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center' as const,
      borderWidth: 1,
    },
    completionCancelText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    completionConfirmBtn: {
      flex: 2,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      padding: 16,
      borderRadius: 12,
    },
    completionConfirmText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    completionDateTimePicker: {
      marginBottom: 12,
    },
    completionTimeError: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 8,
    },
    completionTimeErrorText: {
      fontSize: 13,
      fontWeight: '500' as const,
      flex: 1,
    },
    lotoModalHeader: {
      padding: 16,
      paddingTop: 20,
    },
    lotoModalHeaderContent: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    lotoModalHeaderLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    lotoModalIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    lotoModalTitle: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600' as const,
    },
    lotoModalSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 13,
    },
    lotoModalCloseBtn: {
      padding: 4,
    },
    lotoEditStep: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    lotoStepRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 10,
    },
    lotoStepReorderBtns: {
      flexDirection: 'column' as const,
      gap: 4,
    },
    lotoReorderBtn: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    lotoStepActions: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    lotoStepActionBtn: {
      padding: 8,
    },
    lotoEditForm: {
      gap: 12,
    },
    lotoEditFormHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
      marginBottom: 4,
    },
    lotoEditFormTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    lotoEditInput: {
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      borderWidth: 1,
      minHeight: 50,
      textAlignVertical: 'top' as const,
    },
    lotoEditInputSmall: {
      flex: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      borderWidth: 1,
    },
    lotoEditRow: {
      flexDirection: 'row' as const,
      gap: 10,
    },
    lotoEditField: {
      flex: 1,
    },
    lotoEditFieldLabel: {
      fontSize: 12,
      fontWeight: '500' as const,
      marginBottom: 8,
    },
    lockColorPickerScroll: {
      flexGrow: 0,
    },
    lockColorPickerItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginRight: 8,
    },
    lockColorPickerDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
    },
    lockColorPickerName: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    lotoEditActions: {
      flexDirection: 'row' as const,
      gap: 10,
      marginTop: 4,
    },
    lotoEditCancelBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center' as const,
      borderWidth: 1,
    },
    lotoEditCancelText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    lotoEditSaveBtn: {
      flex: 2,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      padding: 12,
      borderRadius: 10,
    },
    lotoEditSaveText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    lotoAddStepForm: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed' as const,
      gap: 12,
    },
    lotoAddStepHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
    },
    lotoAddStepTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    lotoAddStepBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      padding: 14,
      borderRadius: 10,
    },
    lotoAddStepBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600' as const,
    },
    lotoModalDoneBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      padding: 16,
      borderRadius: 12,
    },
    lotoModalDoneBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600' as const,
    },
    partsErrorContainer: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 24,
      gap: 10,
    },
    modalLoadingContainer: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 60,
      gap: 12,
    },
    modalLoadingText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    modalEmptyContainer: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: 60,
      gap: 12,
    },
    modalEmptyText: {
      fontSize: 14,
      textAlign: 'center' as const,
      paddingHorizontal: 20,
    },
    partsErrorText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 4,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
  });
