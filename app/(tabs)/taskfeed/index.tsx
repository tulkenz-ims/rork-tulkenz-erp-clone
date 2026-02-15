import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  MapPin,
  User,
  Camera,
  ChevronDown,
  ChevronRight,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Send,
  Flag,
  Search,
  ClipboardList,
  Calendar,
  Wrench,
  Link2,
  FileText,
  Shield,
  ArrowRight,
  ShoppingCart,
  Trash2,
  MoreVertical,
  HardHat,
  Eye,
  Siren,
  CheckCircle,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { DEPARTMENT_CODES, getDepartmentColor, getDepartmentName, DEPARTMENTS } from '@/constants/organizationCodes';
import { useRouter } from 'expo-router';
import {
  type TaskVerification as LocalTaskVerification,
  type TaskLocation as LocalTaskLocation,
  type TaskCategory,
  getCategoriesForLocation,
  getActionsForCategory,
  TASK_CATEGORIES,
} from '@/constants/taskVerificationConstants';
import {
  useTaskVerificationsQuery,
  useTaskVerificationStats,
  useTaskLocationsQuery,
  useTaskCategoriesQuery,
  useCreateTaskVerification,
  useUpdateTaskVerification,
  useLinkWorkOrderToVerification,
  useTaskVerificationHelpers,
  type TaskVerificationFilters,
} from '@/hooks/useSupabaseTaskVerifications';
import { useCreateWorkOrder, useWorkOrdersQuery } from '@/hooks/useSupabaseWorkOrders';
import { useEquipmentQuery } from '@/hooks/useSupabaseEquipment';
import { useFacilities } from '@/hooks/useFacilities';
import { useLocations } from '@/hooks/useLocations';
import { PurchaseRequestLineItem } from '@/hooks/useSupabaseProcurement';
import { useTaskFeedTemplatesQuery, useCreateTaskFeedPost, useTaskFeedPostsWithTasksQuery, useDeleteTaskFeedPost, useCanDeleteTaskFeedPost, useCreateManualTaskFeedPost } from '@/hooks/useTaskFeedTemplates';
import { TaskFeedTemplate, FormField, ButtonType } from '@/types/taskFeedTemplates';
import DynamicFormRenderer from '@/components/DynamicFormRenderer';
import DatePickerModal from '@/components/DatePickerModal';
import DepartmentStatusBadges, { DepartmentTaskBadge, DepartmentStatusBadgesCompact } from '@/components/DepartmentStatusBadges';
import { CompactDepartmentBadges } from '@/components/DepartmentCompletionBadges';
import { TaskFeedDepartmentTask } from '@/types/taskFeedTemplates';
import { Tables, supabase } from '@/lib/supabase';
import PurchaseRequestForm from '@/components/PurchaseRequestForm';
import ProductionStoppedBanner from '@/components/ProductionStoppedBanner';
import { usePushNotifications } from '@/contexts/PushNotificationsContext';

type SupabaseTaskVerification = Tables['task_verifications'];
type SupabaseTaskLocation = Tables['task_locations'];

const ISSUE_TYPE_OPTIONS = [
  { id: 'equipment_down', label: 'Equipment Down', icon: 'wrench', color: '#EF4444' },
  { id: 'safety_hazard', label: 'Safety Hazard', icon: 'alert', color: '#F59E0B' },
  { id: 'spill', label: 'Spill Reported', icon: 'droplet', color: '#3B82F6' },
  { id: 'maintenance', label: 'Called Maintenance', icon: 'tool', color: '#8B5CF6' },
  { id: 'sanitation', label: 'Called Sanitation', icon: 'sparkles', color: '#10B981' },
  { id: 'other', label: 'Other Issue', icon: 'help', color: '#6B7280' },
];

const ROOM_LINE_OPTIONS = [
  'Production Line 1',
  'Production Line 2',
  'Production Line 3',
  'Packaging Line 1',
  'Packaging Line 2',
  'Cooler Area',
  'Freezer Area',
  'Warehouse',
  'Loading Dock',
  'Other',
];

export default function TaskFeedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const orgContext = useOrganization();
  const organizationId = orgContext?.organizationId || '';
  const { sendTaskFeedNotification } = usePushNotifications();
  const router = useRouter();
  
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string | null>(null);
  
  const [supabaseFilters, setSupabaseFilters] = useState<TaskVerificationFilters>({});
  
  const { 
    data: taskVerificationsData, 
    isLoading: isLoadingVerifications,
    refetch: refetchVerifications,
  } = useTaskVerificationsQuery({ filters: supabaseFilters });
  
  const { 
    data: statsData,
    refetch: refetchStats,
  } = useTaskVerificationStats();
  
  const { 
    data: taskLocationsData,
    isLoading: isLoadingLocations,
  } = useTaskLocationsQuery();
  
  const { 
    data: taskCategoriesData,
  } = useTaskCategoriesQuery();
  
  const {
    data: equipmentData,
    isLoading: isLoadingEquipment,
  } = useEquipmentQuery();
  
  const {
    data: facilitiesData,
    isLoading: isLoadingFacilities,
  } = useFacilities();
  
  const {
    data: locationsData,
    isLoading: isLoadingLocations2,
  } = useLocations();
  
  const createVerificationMutation = useCreateTaskVerification({
    onSuccess: () => {
      console.log('[TaskFeed] Task verification created successfully');
    },
    onError: (error) => {
      console.error('[TaskFeed] Error creating task verification:', error);
      Alert.alert('Error', 'Failed to create task verification. Please try again.');
    },
  });
  
  const updateVerificationMutation = useUpdateTaskVerification({
    onSuccess: () => {
      console.log('[TaskFeed] Task verification updated successfully');
    },
    onError: (error) => {
      console.error('[TaskFeed] Error updating task verification:', error);
    },
  });
  
  const linkWorkOrderMutation = useLinkWorkOrderToVerification();
  
  const createWorkOrderMutation = useCreateWorkOrder({
    onSuccess: (data) => {
      console.log('[TaskFeed] Work order created successfully:', data.id);
    },
    onError: (error) => {
      console.error('[TaskFeed] Error creating work order:', error);
      Alert.alert('Error', 'Failed to create work order. Please try again.');
    },
  });

  // Fetch work orders to get work order numbers for linked WOs
  const { data: workOrdersData } = useWorkOrdersQuery({ enabled: true });

  // Create a map of work order IDs to work order numbers
  const workOrderNumberMap = useMemo(() => {
    const map = new Map<string, string>();
    if (workOrdersData) {
      workOrdersData.forEach((wo) => {
        if (wo.id && wo.work_order_number) {
          map.set(wo.id, wo.work_order_number);
        }
      });
    }
    return map;
  }, [workOrdersData]);
  
  const helpers = useTaskVerificationHelpers();

  const {
    data: postsWithTasksData,
    refetch: refetchPostsWithTasks,
  } = useTaskFeedPostsWithTasksQuery({ limit: 100 });

  const departmentTasksByPostId = useMemo(() => {
    const map = new Map<string, TaskFeedDepartmentTask[]>();
    if (postsWithTasksData) {
      postsWithTasksData.forEach((post: any) => {
        if (post.departmentTasks && post.departmentTasks.length > 0) {
          map.set(post.id, post.departmentTasks.map((t: any) => ({
            id: t.id || `${post.id}-${t.departmentCode}`,
            organizationId: post.organizationId || '',
            postId: post.id,
            postNumber: post.postNumber || '',
            departmentCode: t.departmentCode,
            departmentName: t.departmentName,
            status: t.status,
            completedById: t.completedById,
            completedByName: t.completedByName,
            completedAt: t.completedAt,
            completionNotes: t.completionNotes,
            assignedAt: t.assignedAt || post.createdAt,
            createdAt: t.createdAt || post.createdAt,
            updatedAt: t.updatedAt || post.createdAt,
          })));
        }
      });
    }
    return map;
  }, [postsWithTasksData]);

  // Map post IDs to hold/production data for banner display
  const postHoldDataMap = useMemo(() => {
    const map = new Map<string, {
      isProductionHold: boolean;
      holdStatus: string;
      holdClearedAt?: string;
      productionLine?: string;
      createdAt: string;
      locationName?: string;
    }>();
    if (postsWithTasksData) {
      postsWithTasksData.forEach((post: any) => {
        if (post.isProductionHold) {
          map.set(post.id, {
            isProductionHold: post.isProductionHold,
            holdStatus: post.holdStatus || 'none',
            holdClearedAt: post.holdClearedAt,
            productionLine: post.productionLine,
            createdAt: post.createdAt,
            locationName: post.locationName,
          });
        }
      });
    }
    return map;
  }, [postsWithTasksData]);

  const additionalPhotosByPostId = useMemo(() => {
    const map = new Map<string, string[]>();
    if (postsWithTasksData) {
      postsWithTasksData.forEach((post: any) => {
        if (post.additionalPhotos && post.additionalPhotos.length > 0) {
          map.set(post.id, post.additionalPhotos);
        }
      });
    }
    return map;
  }, [postsWithTasksData]);
  
  const createTaskFeedPostMutation = useCreateTaskFeedPost({
    onSuccess: async (data) => {
      console.log('[TaskFeed] Task feed post created:', data.postNumber);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (selectedTemplate && selectedTemplate.assignedDepartments && selectedTemplate.assignedDepartments.length > 0) {
        try {
          await sendTaskFeedNotification({
            departmentCodes: selectedTemplate.assignedDepartments,
            title: `New Task: ${selectedTemplate.name}`,
            message: `${data.postNumber} requires action. ${templateFormValues['location'] ? `Location: ${templateFormValues['location']}` : ''}`,
            postId: data.id,
            postNumber: data.postNumber,
            buttonType: selectedTemplate.buttonType,
            priority: selectedTemplate.buttonType === 'report_issue' ? 'high' : 'normal',
          });
          console.log('[TaskFeed] Push notifications sent to assigned departments');
        } catch (pushError) {
          console.error('[TaskFeed] Error sending push notifications:', pushError);
        }
      }
      
      Alert.alert(
        'Task Created',
        `Task ${data.postNumber} has been created successfully.${data.totalDepartments > 0 ? ` ${data.totalDepartments} department(s) have been assigned and notified.` : ''}`,
        [{ text: 'OK' }]
      );
      resetTemplateFlow();
    },
    onError: (error) => {
      console.error('[TaskFeed] Error creating task feed post:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    },
  });
  
  const canDeletePost = useCanDeleteTaskFeedPost();

  const deletePostMutation = useDeleteTaskFeedPost({
    onSuccess: () => {
      console.log('[TaskFeed] Post deleted successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Deleted', 'The post has been deleted successfully.');
    },
    onError: (error) => {
      console.error('[TaskFeed] Error deleting post:', error);
      Alert.alert('Error', error.message || 'Failed to delete post. Please try again.');
    },
  });

  const handleDeletePost = useCallback((postId: string, postNumber: string) => {
    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete ${postNumber}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePostMutation.mutate(postId);
          },
        },
      ]
    );
  }, [deletePostMutation]);

  

  const createManualPostMutation = useCreateManualTaskFeedPost({
    onSuccess: async (data) => {
      console.log('[TaskFeed] Manual task feed post created:', data.postNumber);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (data.totalDepartments > 0 && issueDepartment) {
        try {
          await sendTaskFeedNotification({
            departmentCodes: [issueDepartment],
            title: `New Issue Reported`,
            message: `${data.postNumber} requires action. ${issueLocation?.name ? `Location: ${issueLocation.name}` : ''}`,
            postId: data.id,
            postNumber: data.postNumber,
            buttonType: 'report_issue',
            priority: 'high',
          });
          console.log('[TaskFeed] Push notifications sent to assigned department');
        } catch (pushError) {
          console.error('[TaskFeed] Error sending push notifications:', pushError);
        }
      }
    },
    onError: (error) => {
      console.error('[TaskFeed] Error creating manual task feed post:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    },
  });
  
  const taskVerifications = useMemo(() => {
    return (taskVerificationsData || []).map((tv): LocalTaskVerification => ({
      id: tv.id,
      departmentCode: tv.department_code || '',
      departmentName: tv.department_name || '',
      facilityCode: tv.facility_code || '',
      locationId: tv.location_id || '',
      locationName: tv.location_name || '',
      categoryId: tv.category_id || '',
      categoryName: tv.category_name || '',
      action: tv.action,
      notes: tv.notes || undefined,
      photoUri: tv.photo_uri || undefined,
      employeeId: tv.employee_id,
      employeeName: tv.employee_name,
      status: tv.status as 'verified' | 'flagged' | 'pending_review',
      sourceType: tv.source_type || undefined,
      sourceId: tv.source_id || undefined,
      sourceNumber: tv.source_number || undefined,
      linkedWorkOrderId: tv.linked_work_order_id || undefined,
      reviewedAt: tv.reviewed_at || undefined,
      createdAt: tv.created_at,
    }));
  }, [taskVerificationsData]);
  
  const taskLocations = useMemo(() => {
    return (taskLocationsData || []).map((loc): LocalTaskLocation => ({
      id: loc.id,
      code: loc.code,
      name: loc.name,
      departmentCode: loc.department_code || '',
      facilityCode: loc.facility_code || '',
      active: loc.active,
    }));
  }, [taskLocationsData]);

  const [refreshing, setRefreshing] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [showActionTypeModal, setShowActionTypeModal] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<'task' | 'issue' | 'purchase' | 'service' | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [issueDepartment, setIssueDepartment] = useState<string | null>(null);
  const [purchaseDepartment, setPurchaseDepartment] = useState<string | null>(null);
  const [serviceDepartment, setServiceDepartment] = useState<string | null>(null);

  const templateButtonType: ButtonType | undefined = selectedActionType === 'task' 
    ? 'add_task' 
    : selectedActionType === 'issue' 
      ? 'report_issue' 
      : selectedActionType === 'purchase'
        ? 'request_purchase'
        : selectedActionType === 'service'
          ? 'request_service'
          : undefined;

  const currentTriggeringDepartment = selectedActionType === 'task' 
    ? selectedDepartment 
    : selectedActionType === 'issue' 
      ? issueDepartment 
      : selectedActionType === 'purchase'
        ? purchaseDepartment
        : serviceDepartment;

  const { data: templatesData, isLoading: isLoadingTemplates } = useTaskFeedTemplatesQuery({
    buttonType: templateButtonType,
    triggeringDepartment: currentTriggeringDepartment || undefined,
    enabled: !!(templateButtonType && currentTriggeringDepartment),
  });
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [selectedVerificationForWO, setSelectedVerificationForWO] = useState<LocalTaskVerification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null);
  const [filterSourceType, setFilterSourceType] = useState<string | null>(null);
  const [expandedFilterSection, setExpandedFilterSection] = useState<string | null>('department');
  const [showSearchDateFromPicker, setShowSearchDateFromPicker] = useState(false);
  const [showSearchDateToPicker, setShowSearchDateToPicker] = useState(false);
  const [searchDateFrom, setSearchDateFrom] = useState<string | null>(null);
  const [searchDateTo, setSearchDateTo] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<LocalTaskLocation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showActionPicker, setShowActionPicker] = useState(false);

  const [workOrderTitle, setWorkOrderTitle] = useState('');
  const [issueLocation, setIssueLocation] = useState<LocalTaskLocation | null>(null);
  const [issueType, setIssueType] = useState<string>('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotoUri, setIssuePhotoUri] = useState<string | null>(null);
  const [showIssueLocationPicker, setShowIssueLocationPicker] = useState(false);
  const [issueStoppedProduction, setIssueStoppedProduction] = useState(false);
  const [issueRoomLine, setIssueRoomLine] = useState('');
  const [workOrderDescription, setWorkOrderDescription] = useState('');
  const [workOrderPriority, setWorkOrderPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  const [showPurchaseRequestModal, setShowPurchaseRequestModal] = useState(false);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [purchaseNeededBy, setPurchaseNeededBy] = useState<string | null>(null);

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskFeedTemplate | null>(null);
  const [templateFormValues, setTemplateFormValues] = useState<Record<string, any>>({});
  const [templateFormErrors, setTemplateFormErrors] = useState<Record<string, string>>({});
  const [templatePhotoUris, setTemplatePhotoUris] = useState<string[]>([]);
  const [templateNotes, setTemplateNotes] = useState('');
  const [showFieldOptionsPicker, setShowFieldOptionsPicker] = useState(false);
  const [activeDropdownField, setActiveDropdownField] = useState<FormField | null>(null);
  const [templatePhotoError, setTemplatePhotoError] = useState(false);

  const stats = useMemo(() => {
    if (statsData) {
      return {
        totalToday: statsData.totalToday,
        totalWeek: statsData.totalWeek,
        totalAll: statsData.total,
        flagged: statsData.flagged,
        verified: statsData.verified,
      };
    }
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const verifications = taskVerifications || [];
    const todayCount = verifications.filter(tv => tv.createdAt.startsWith(today)).length;
    const weekCount = verifications.filter(tv => tv.createdAt >= weekAgoStr).length;
    const flaggedCount = verifications.filter(tv => tv.status === 'flagged').length;
    const verifiedCount = verifications.filter(tv => tv.status === 'verified').length;

    return {
      totalToday: todayCount,
      totalWeek: weekCount,
      totalAll: verifications.length,
      flagged: flaggedCount,
      verified: verifiedCount,
    };
  }, [taskVerifications, statsData]);

  const categoriesForDepartment = useMemo(() => {
    if (!filterDepartment) return TASK_CATEGORIES.filter(c => c.active);
    return TASK_CATEGORIES.filter(c => c.active && c.departmentCode === filterDepartment);
  }, [filterDepartment]);

  const filteredVerifications = useMemo(() => {
    let result = [...(taskVerifications || [])];

    // Filter out work order entries - they should only exist in their respective modules
    result = result.filter(tv => 
      tv.sourceType !== 'work_order' && 
      tv.sourceType !== 'pm_work_order'
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        tv =>
          tv.locationName.toLowerCase().includes(query) ||
          tv.categoryName.toLowerCase().includes(query) ||
          tv.action.toLowerCase().includes(query) ||
          tv.employeeName.toLowerCase().includes(query) ||
          tv.notes?.toLowerCase().includes(query) ||
          tv.sourceNumber?.toLowerCase().includes(query) ||
          tv.departmentName.toLowerCase().includes(query)
      );
    }

    // Apply search date range (from main search area)
    if (searchDateFrom) {
      result = result.filter(tv => tv.createdAt.split('T')[0] >= searchDateFrom);
    }

    if (searchDateTo) {
      result = result.filter(tv => tv.createdAt.split('T')[0] <= searchDateTo);
    }

    // Apply quick department filter first
    if (selectedDepartmentFilter) {
      result = result.filter(tv => tv.departmentCode === selectedDepartmentFilter);
    }

    if (filterDepartment) {
      result = result.filter(tv => tv.departmentCode === filterDepartment);
    }

    if (filterCategory) {
      result = result.filter(tv => tv.categoryId === filterCategory);
    }

    if (filterSourceType) {
      result = result.filter(tv => tv.sourceType === filterSourceType);
    }

    if (filterDateFrom) {
      result = result.filter(tv => tv.createdAt.split('T')[0] >= filterDateFrom);
    }

    if (filterDateTo) {
      result = result.filter(tv => tv.createdAt.split('T')[0] <= filterDateTo);
    }

    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [taskVerifications, searchQuery, searchDateFrom, searchDateTo, selectedDepartmentFilter, filterDepartment, filterCategory, filterSourceType, filterDateFrom, filterDateTo]);

  const availableCategories = useMemo(() => {
    if (!selectedLocation) return [];
    return getCategoriesForLocation(selectedLocation.id);
  }, [selectedLocation]);

  const availableActions = useMemo(() => {
    if (!selectedCategory) return [];
    return getActionsForCategory(selectedCategory.id);
  }, [selectedCategory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchVerifications(),
        refetchStats(),
        refetchPostsWithTasks(),
      ]);
      console.log('[TaskFeed] Refresh completed');
    } catch (error) {
      console.error('[TaskFeed] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchVerifications, refetchStats]);

  const handlePickImage = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleTakeIssuePhoto = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      setIssuePhotoUri(result.assets[0].uri);
    }
  }, []);

  const handlePickIssueImage = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      setIssuePhotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSubmitIssue = useCallback(async () => {
    if (!issueLocation) {
      Alert.alert('Missing Information', 'Please select a location.');
      return;
    }

    if (!issueType) {
      Alert.alert('Missing Information', 'Please select an issue type.');
      return;
    }

    if (!issueDescription.trim()) {
      Alert.alert('Missing Information', 'Please describe the issue.');
      return;
    }

    if (!issuePhotoUri) {
      Alert.alert('Photo Required', 'Please attach a photo of the issue.');
      return;
    }

    if (issueStoppedProduction && !issueRoomLine) {
      Alert.alert('Missing Information', 'Please select which room/line stopped.');
      return;
    }

    const issueTypeLabel = ISSUE_TYPE_OPTIONS.find(t => t.id === issueType)?.label || 'Other Issue';
    
    // Determine which department should handle this issue
    const targetDepartment = issueDepartment || issueLocation.departmentCode || '1001';
    const issueNotes = `${issueDescription}${issueStoppedProduction ? `\n\n⚠️ PRODUCTION STOPPED\nRoom/Line: ${issueRoomLine}\nStopped at: ${new Date().toLocaleTimeString()}` : ''}`;

    try {
      // Create a proper task feed post with department assignment
      const postResult = await createManualPostMutation.mutateAsync({
        buttonType: 'report_issue',
        title: issueTypeLabel,
        description: issueDescription,
        departmentCode: targetDepartment,
        assignedDepartments: [targetDepartment],
        locationId: issueLocation.id,
        locationName: issueLocation.name,
        facilityId: issueLocation.facilityCode || undefined,
        photoUrl: issuePhotoUri,
        notes: issueNotes,
        formData: {
          issueType: issueTypeLabel,
          location: issueLocation.name,
          description: issueDescription,
          productionStopped: issueStoppedProduction ? 'Yes' : 'No',
          roomLine: issueRoomLine || undefined,
        },
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Determine if we should create a work order
      const shouldCreateWorkOrder = issueStoppedProduction || 
        issueType === 'maintenance' || 
        issueType === 'equipment_down';

      if (shouldCreateWorkOrder) {
        try {
          const isProductionStopped = issueStoppedProduction;
          const priority = isProductionStopped ? 'critical' : (issueType === 'equipment_down' ? 'high' : 'medium');
          const urgencyPrefix = isProductionStopped ? 'URGENT: ' : '';
          
          const newWorkOrder = await createWorkOrderMutation.mutateAsync({
            title: `${urgencyPrefix}${issueTypeLabel} at ${issueLocation.name}`,
            description: `${issueDescription}${isProductionStopped ? `\n\n⚠️ PRODUCTION STOPPED\nRoom/Line: ${issueRoomLine}` : ''}\nReported by: ${user ? `${user.first_name} ${user.last_name}` : 'System'}\nReported at: ${new Date().toLocaleString()}\nIssue Type: ${issueTypeLabel}\nTask Feed Post: ${postResult.postNumber}`,
            priority: priority,
            status: 'open',
            facility_id: issueLocation.facilityCode || null,
            assigned_to: null,
            due_date: new Date(Date.now() + (isProductionStopped ? 0 : 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            department: targetDepartment,
            department_name: getDepartmentName(targetDepartment),
            source: 'request' as const,
            source_id: postResult.id,
          });

          // Link the task_verification back to the WO so completion can resolve it
          if (newWorkOrder?.id) {
            try {
              await supabase
                .from('task_verifications')
                .update({ linked_work_order_id: newWorkOrder.id })
                .eq('source_id', postResult.id)
                .eq('organization_id', organizationId);
              console.log('[TaskFeed] Linked task_verification to WO:', newWorkOrder.id);
            } catch (linkErr) {
              console.warn('[TaskFeed] Could not link verification to WO:', linkErr);
            }
          }

          const priorityLabel = isProductionStopped ? 'CRITICAL' : (priority === 'high' ? 'HIGH priority' : '');
          Alert.alert(
            'Issue Reported & Work Order Created',
            `Your issue ${postResult.postNumber} has been logged and a ${priorityLabel} work order ${newWorkOrder.work_order_number || newWorkOrder.id} has been created.${isProductionStopped ? ' Production stoppage flagged.' : ''} ${getDepartmentName(targetDepartment)} has been notified.`,
            [{ text: 'OK' }]
          );
        } catch (woError) {
          console.error('[TaskFeed] Error creating work order (issue still reported):', woError);
          Alert.alert(
            'Issue Reported',
            `Your issue ${postResult.postNumber} has been logged and ${getDepartmentName(targetDepartment)} has been notified. Note: Auto work order creation failed — you can create one manually.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Issue Reported',
          `Your issue ${postResult.postNumber} has been logged and ${getDepartmentName(targetDepartment)} has been notified.`,
          [{ text: 'OK' }]
        );
      }

      setIssueLocation(null);
      setIssueType('');
      setIssueDescription('');
      setIssuePhotoUri(null);
      setIssueStoppedProduction(false);
      setIssueRoomLine('');
      setIssueDepartment(null);
      setShowReportIssueModal(false);
    } catch (error: any) {
      console.error('[TaskFeed] Error submitting issue:', error?.message || error);
      Alert.alert('Error', `Failed to submit issue: ${error?.message || 'Unknown error'}. Please try again.`);
    }
  }, [issueLocation, issueType, issueDescription, issuePhotoUri, issueStoppedProduction, issueRoomLine, issueDepartment, user, organizationId, createManualPostMutation, createWorkOrderMutation, sendTaskFeedNotification]);

  const handleSubmitPost = useCallback(async () => {
    if (!selectedLocation || !selectedCategory || !selectedAction) {
      Alert.alert('Missing Information', 'Please select location, task type, and action.');
      return;
    }

    if (!photoUri) {
      Alert.alert('Photo Required', 'Photo is required for this action.');
      return;
    }

    if (selectedCategory.requiresNotes && !notes.trim()) {
      Alert.alert('Notes Required', 'This task type requires notes.');
      return;
    }

    const isIssueReport = selectedCategory.id === 'cat-issue-report';

    try {
      await createVerificationMutation.mutateAsync({
        department_code: selectedLocation.departmentCode,
        department_name: getDepartmentName(selectedLocation.departmentCode),
        facility_code: selectedLocation.facilityCode,
        location_id: selectedLocation.id,
        location_name: selectedLocation.name,
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
        action: selectedAction,
        notes: notes.trim() || null,
        photo_uri: photoUri || null,
        employee_id: user?.id || 'emp-001',
        employee_name: user ? `${user.first_name} ${user.last_name}` : 'Current User',
        status: isIssueReport ? 'flagged' : 'verified',
        source_type: isIssueReport ? 'issue_report' : 'manual',
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setSelectedLocation(null);
      setSelectedCategory(null);
      setSelectedAction('');
      setNotes('');
      setPhotoUri(null);
      setShowNewPostModal(false);

      Alert.alert('Success', 'Task verification posted successfully!');
    } catch (error) {
      console.error('[TaskFeed] Error creating verification:', error);
      Alert.alert('Error', 'Failed to create task verification. Please try again.');
    }
  }, [selectedLocation, selectedCategory, selectedAction, notes, photoUri, user, createVerificationMutation]);

  const handleCreateWorkOrder = useCallback((verification: LocalTaskVerification) => {
    setSelectedVerificationForWO(verification);
    setWorkOrderTitle(`Issue at ${verification.locationName}: ${verification.action}`);
    setWorkOrderDescription(verification.notes || '');
    setWorkOrderPriority('medium');
    setShowWorkOrderModal(true);
  }, []);

  const handleSubmitWorkOrder = useCallback(async () => {
    if (!workOrderTitle.trim()) {
      Alert.alert('Missing Information', 'Please enter a title for the work order.');
      return;
    }

    try {
      const newWorkOrder = await createWorkOrderMutation.mutateAsync({
        title: workOrderTitle,
        description: `${workOrderDescription}\n\nCreated by: ${user ? `${user.first_name} ${user.last_name}` : 'System'}\nSource: Task Feed Issue Report\nDepartment: ${selectedVerificationForWO?.departmentName || 'Maintenance'}`,
        priority: workOrderPriority,
        status: 'open',
        facility_id: selectedVerificationForWO?.facilityCode || null,
        assigned_to: null,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        department: selectedVerificationForWO?.departmentCode || '1001',
        department_name: selectedVerificationForWO?.departmentName || 'Maintenance',
      });

      const woNumber = newWorkOrder.work_order_number || `WO-${newWorkOrder.id.slice(0, 8)}`;

      if (selectedVerificationForWO) {
        await linkWorkOrderMutation.mutateAsync({
          verificationId: selectedVerificationForWO.id,
          workOrderId: newWorkOrder.id,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowWorkOrderModal(false);
      setSelectedVerificationForWO(null);
      setWorkOrderTitle('');
      setWorkOrderDescription('');

      Alert.alert('Work Order Created', `Work Order ${woNumber} has been created.`);
    } catch (error) {
      console.error('[TaskFeed] Error creating work order:', error);
      Alert.alert('Error', 'Failed to create work order. Please try again.');
    }
  }, [workOrderTitle, workOrderDescription, workOrderPriority, selectedVerificationForWO, user, createWorkOrderMutation, linkWorkOrderMutation, createVerificationMutation]);

  const formatTime = useCallback((dateString: string) => {
    return helpers.formatTime(dateString);
  }, [helpers]);

  const parseFormData = useCallback((notes: string | undefined): Record<string, string> | null => {
    if (!notes) return null;
    
    // Check if notes contains "Form Data:" prefix
    const formDataMatch = notes.match(/Form Data:\s*({.*})/s);
    if (formDataMatch) {
      try {
        return JSON.parse(formDataMatch[1]);
      } catch (e) {
        console.log('[TaskFeed] Failed to parse form data from notes');
        return null;
      }
    }
    return null;
  }, []);

  const getCleanNotes = useCallback((notes: string | undefined): string | null => {
    if (!notes) return null;
    
    // Remove "Form Data: {...}" from notes
    const cleaned = notes.replace(/Form Data:\s*{.*}/s, '').trim();
    return cleaned || null;
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilterDepartment(null);
    setFilterCategory(null);
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setFilterSourceType(null);
    setSearchQuery('');
    setSelectedDepartmentFilter(null);
    setSearchDateFrom(null);
    setSearchDateTo(null);
  };

  const hasSearchDateRange = searchDateFrom || searchDateTo;

  const handlePurchaseRequestSuccess = useCallback((requestNumber: string) => {
    console.log('[TaskFeed] Purchase request submitted:', requestNumber);
    setPurchaseDepartment(null);
    setShowPurchaseRequestModal(false);
  }, []);

  const handleActionTypeSelect = useCallback((type: 'task' | 'issue' | 'purchase' | 'service') => {
    setSelectedActionType(type);
    setShowActionTypeModal(false);
    setShowDepartmentPicker(true);
  }, []);

  const handleDepartmentSelect = useCallback((deptCode: string) => {
    setShowDepartmentPicker(false);
    
    if (selectedActionType === 'task') {
      setSelectedDepartment(deptCode);
      setShowTemplatePicker(true);
    } else if (selectedActionType === 'issue') {
      setIssueDepartment(deptCode);
      setShowTemplatePicker(true);
    } else if (selectedActionType === 'purchase') {
      setPurchaseDepartment(deptCode);
      setShowPurchaseRequestModal(true);
    } else if (selectedActionType === 'service') {
      setServiceDepartment(deptCode);
      setShowTemplatePicker(true);
    }
  }, [selectedActionType]);

  const filteredTaskLocations = useMemo(() => {
    // First try to use locations from Settings (areas/rooms)
    if (locationsData && locationsData.length > 0) {
      const activeLocations = locationsData.filter(loc => loc.status === 'active');
      if (activeLocations.length > 0) {
        console.log('[TaskFeed] Using locations (areas/rooms) from Settings for Add Task picker, count:', activeLocations.length);
        return activeLocations.map(loc => ({
          id: loc.id,
          code: loc.location_code || '',
          name: loc.name,
          departmentCode: selectedDepartment || '',
          facilityCode: loc.facility_id || '',
          active: true,
        }));
      }
    }
    
    // Fall back to task_locations
    if (!selectedDepartment) return taskLocations.filter(loc => loc.active);
    const filtered = taskLocations.filter(loc => loc.active && loc.departmentCode === selectedDepartment);
    
    // If no task_locations for this department, return all active locations
    if (filtered.length === 0) {
      console.log('[TaskFeed] No task_locations for department, returning all active task locations');
      return taskLocations.filter(loc => loc.active);
    }
    
    return filtered;
  }, [taskLocations, selectedDepartment, locationsData]);

  const filteredIssueLocations = useMemo(() => {
    // First try to use locations from Settings (areas/rooms)
    if (locationsData && locationsData.length > 0) {
      const activeLocations = locationsData.filter(loc => loc.status === 'active');
      if (activeLocations.length > 0) {
        console.log('[TaskFeed] Using locations (areas/rooms) from Settings for issue picker, count:', activeLocations.length);
        return activeLocations.map(loc => ({
          id: loc.id,
          code: loc.location_code || '',
          name: loc.name,
          departmentCode: issueDepartment || '',
          facilityCode: loc.facility_id || '',
          active: true,
        }));
      }
    }
    
    // Fall back to task_locations
    if (!issueDepartment) return taskLocations.filter(loc => loc.active);
    const filtered = taskLocations.filter(loc => loc.active && loc.departmentCode === issueDepartment);
    
    // If no task_locations for this department, return all active locations
    if (filtered.length === 0) {
      console.log('[TaskFeed] No task_locations for department, returning all active locations');
      return taskLocations.filter(loc => loc.active);
    }
    
    return filtered;
  }, [taskLocations, issueDepartment, locationsData]);

  const resetActionFlow = useCallback(() => {
    setSelectedActionType(null);
    setSelectedDepartment(null);
    setIssueDepartment(null);
    setPurchaseDepartment(null);
    setServiceDepartment(null);
  }, []);

  const resetTemplateFlow = useCallback(() => {
    setSelectedTemplate(null);
    setTemplateFormValues({});
    setTemplateFormErrors({});
    setTemplatePhotoUris([]);
    setTemplatePhotoError(false);
    setTemplateNotes('');
    setShowNewPostModal(false);
    setShowTemplatePicker(false);
    resetActionFlow();
  }, [resetActionFlow]);

  const availableTemplates = useMemo(() => {
    if (!templatesData) return [];
    return templatesData.filter(t => t.isActive);
  }, [templatesData]);

  const handleTemplateSelect = useCallback((template: TaskFeedTemplate) => {
    console.log('[TaskFeed] Template selected:', template.name);
    setSelectedTemplate(template);
    setShowTemplatePicker(false);
    setShowNewPostModal(true);
    
    const defaultValues: Record<string, any> = {};
    template.formFields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultValues[field.id] = field.defaultValue;
      }
    });
    setTemplateFormValues(defaultValues);
  }, []);

  const handleTemplateFormChange = useCallback((fieldId: string, value: any) => {
    setTemplateFormValues(prev => ({ ...prev, [fieldId]: value }));
    setTemplateFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  const isLocationFieldCheck = useCallback((field: FormField) => {
    return field.id === 'location' || 
      field.id === 'area' || 
      field.id === 'room' ||
      field.id === 'where' ||
      (field.fieldType === 'dropdown' && (
        field.label?.toLowerCase().includes('location') ||
        field.label?.toLowerCase().includes('area') ||
        field.label?.toLowerCase().includes('room') ||
        field.label?.toLowerCase().includes('where')
      ));
  }, []);

  const isEquipmentFieldCheck = useCallback((field: FormField) => {
    return field.id === 'equipment' ||
      field.id === 'asset' ||
      field.id === 'machine' ||
      (field.fieldType === 'dropdown' && (
        field.label?.toLowerCase().includes('equipment') ||
        field.label?.toLowerCase().includes('asset') ||
        field.label?.toLowerCase().includes('machine')
      ));
  }, []);

  const getEnhancedFieldOptions = useCallback((field: FormField) => {
    const isLocationField = isLocationFieldCheck(field);
    const isEquipmentField = isEquipmentFieldCheck(field);
    
    if (isLocationField) {
      // First try to use locations from Settings (areas/rooms)
      if (locationsData && locationsData.length > 0) {
        const activeLocations = locationsData.filter(loc => loc.status === 'active');
        if (activeLocations.length > 0) {
          console.log('[TaskFeed] Using locations (areas/rooms) from Settings for field:', field.id, 'count:', activeLocations.length);
          return activeLocations.map(loc => ({ 
            value: loc.name, 
            label: loc.location_code ? `${loc.name} (${loc.location_code})` : loc.name 
          }));
        }
      }
      
      // Then try task_locations
      const dept = selectedDepartment || issueDepartment;
      const locs = dept 
        ? taskLocations.filter(loc => loc.active && loc.departmentCode === dept)
        : taskLocations.filter(loc => loc.active);
      
      if (locs.length > 0) {
        console.log('[TaskFeed] Using task_locations from database for field:', field.id, 'count:', locs.length);
        return locs.map(loc => ({ value: loc.name, label: loc.name }));
      }
      
      // Fall back to facilities only if no locations at all
      if (facilitiesData && facilitiesData.length > 0) {
        console.log('[TaskFeed] Using facilities as location fallback, count:', facilitiesData.length);
        return facilitiesData
          .filter(f => f.active)
          .map(f => ({ value: f.name, label: f.name }));
      }
      
      console.log('[TaskFeed] No locations found in database, using template options');
    }
    
    if (isEquipmentField) {
      // Use real equipment from CMMS database
      if (equipmentData && equipmentData.length > 0) {
        console.log('[TaskFeed] Using real equipment from database for field:', field.id, 'count:', equipmentData.length);
        return equipmentData
          .filter(eq => eq.status !== 'retired')
          .map(eq => ({ 
            value: eq.name,
            label: eq.equipment_tag ? `${eq.name} (${eq.equipment_tag})` : eq.name 
          }));
      }
      console.log('[TaskFeed] No equipment found in database, using template options');
    }
    
    return field.options || [];
  }, [taskLocations, selectedDepartment, issueDepartment, equipmentData, facilitiesData, locationsData, isLocationFieldCheck, isEquipmentFieldCheck]);

  // Create enhanced form fields with database options for rendering
  const enhancedFormFields = useMemo(() => {
    if (!selectedTemplate?.formFields) return [];
    
    return selectedTemplate.formFields.map(field => {
      if (field.fieldType === 'dropdown') {
        const enhancedOptions = getEnhancedFieldOptions(field);
        return {
          ...field,
          options: enhancedOptions.length > 0 ? enhancedOptions : field.options,
        };
      }
      return field;
    });
  }, [selectedTemplate?.formFields, getEnhancedFieldOptions]);

  const handleDropdownFieldPress = useCallback((field: FormField) => {
    const enhancedField = {
      ...field,
      options: getEnhancedFieldOptions(field),
    };
    setActiveDropdownField(enhancedField);
    setShowFieldOptionsPicker(true);
  }, [getEnhancedFieldOptions]);

  const MAX_PHOTOS = 10;

  const handleTakeTemplatePhoto = useCallback(async () => {
    if (templatePhotoUris.length >= MAX_PHOTOS) {
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
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets[0]) {
      setTemplatePhotoUris(prev => [...prev, result.assets[0].uri]);
      setTemplatePhotoError(false);
    }
  }, [templatePhotoUris.length]);

  const handlePickTemplateImage = useCallback(async () => {
    if (templatePhotoUris.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Photos', `You can only add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const remainingSlots = MAX_PHOTOS - templatePhotoUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.5,
      exif: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setTemplatePhotoUris(prev => [...prev, ...newUris].slice(0, MAX_PHOTOS));
      setTemplatePhotoError(false);
    }
  }, [templatePhotoUris.length]);

  const handleRemoveTemplatePhoto = useCallback((index: number) => {
    setTemplatePhotoUris(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validateTemplateForm = useCallback(() => {
    if (!selectedTemplate) return false;
    
    const errors: Record<string, string> = {};
    
    selectedTemplate.formFields.forEach(field => {
      if (field.required) {
        const value = templateFormValues[field.id];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors[field.id] = `${field.label} is required`;
        }
      }
    });
    
    setTemplateFormErrors(errors);
    
    if (templatePhotoUris.length === 0) {
      setTemplatePhotoError(true);
      return false;
    }
    
    setTemplatePhotoError(false);
    return Object.keys(errors).length === 0;
  }, [selectedTemplate, templateFormValues, templatePhotoUris.length]);

  const handleSubmitTemplatePost = useCallback(async () => {
    if (!selectedTemplate) return;
    
    if (!validateTemplateForm()) {
      return;
    }
    
    // Try to find location from form values - check multiple possible field names
    const locationValue = 
      templateFormValues['location'] || 
      templateFormValues['area'] || 
      templateFormValues['room'] || 
      templateFormValues['where'] ||
      selectedLocation?.name;
    
    // Also try to find location ID if a location object was selected
    const matchingLocation = taskLocations.find(loc => loc.name === locationValue);
    
    console.log('[TaskFeed] Submitting with location:', locationValue, 'matchingLocation:', matchingLocation?.id);
    
    try {
      const primaryPhoto = templatePhotoUris[0] || undefined;
      const additionalPhotos = templatePhotoUris.slice(1);
      
      await createTaskFeedPostMutation.mutateAsync({
        templateId: selectedTemplate.id,
        locationId: matchingLocation?.id || selectedLocation?.id,
        locationName: locationValue || 'Not Specified',
        formData: templateFormValues,
        photoUrl: primaryPhoto,
        additionalPhotos: additionalPhotos.length > 0 ? additionalPhotos : undefined,
        notes: templateNotes.trim() || undefined,
      });
    } catch (error) {
      console.error('[TaskFeed] Error submitting template post:', error);
    }
  }, [selectedTemplate, templateFormValues, templatePhotoUris, templateNotes, selectedLocation, taskLocations, validateTemplateForm, createTaskFeedPostMutation]);

  const hasActiveFilters = filterDepartment || filterCategory || filterDateFrom || filterDateTo || filterSourceType || searchDateFrom || searchDateTo;

  const activeFilterCount = [filterDepartment, filterCategory, filterDateFrom, filterDateTo, filterSourceType].filter(Boolean).length;

  const getSourceTypeLabel = useCallback((sourceType?: string) => {
    return helpers.getSourceTypeLabel(sourceType);
  }, [helpers]);

  const getSourceTypeColor = useCallback((sourceType?: string) => {
    const color = helpers.getSourceTypeColor(sourceType);
    return color || colors.textSecondary;
  }, [helpers, colors.textSecondary]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search keywords (preop, cleaning, etc.)..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={hasActiveFilters ? '#fff' : colors.text} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Range Search Row */}
        <View style={styles.dateSearchRow}>
          <TouchableOpacity
            style={[styles.dateSearchButton, { backgroundColor: colors.surface }, searchDateFrom && styles.dateSearchButtonActive]}
            onPress={() => setShowSearchDateFromPicker(true)}
          >
            <Calendar size={14} color={searchDateFrom ? colors.primary : colors.textTertiary} />
            <Text style={[styles.dateSearchText, { color: searchDateFrom ? colors.text : colors.textTertiary }]}>
              {searchDateFrom ? formatDate(searchDateFrom) : 'From Date'}
            </Text>
            {searchDateFrom && (
              <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); setSearchDateFrom(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.dateSearchSeparator, { color: colors.textTertiary }]}>to</Text>
          
          <TouchableOpacity
            style={[styles.dateSearchButton, { backgroundColor: colors.surface }, searchDateTo && styles.dateSearchButtonActive]}
            onPress={() => setShowSearchDateToPicker(true)}
          >
            <Calendar size={14} color={searchDateTo ? colors.primary : colors.textTertiary} />
            <Text style={[styles.dateSearchText, { color: searchDateTo ? colors.text : colors.textTertiary }]}>
              {searchDateTo ? formatDate(searchDateTo) : 'To Date'}
            </Text>
            {searchDateTo && (
              <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); setSearchDateTo(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Search Indicators */}
        {(searchQuery || hasSearchDateRange) && (
          <View style={styles.activeSearchRow}>
            {searchQuery && (
              <View style={[styles.searchChip, { backgroundColor: colors.primary + '15' }]}>
                <Search size={12} color={colors.primary} />
                <Text style={[styles.searchChipText, { color: colors.primary }]} numberOfLines={1}>
                  {`"${searchQuery}"`}
                </Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {hasSearchDateRange && (
              <View style={[styles.searchChip, { backgroundColor: '#10B981' + '15' }]}>
                <Calendar size={12} color="#10B981" />
                <Text style={[styles.searchChipText, { color: '#10B981' }]}>
                  {searchDateFrom && searchDateTo 
                    ? `${formatDate(searchDateFrom)} - ${formatDate(searchDateTo)}`
                    : searchDateFrom 
                      ? `From ${formatDate(searchDateFrom)}`
                      : `To ${formatDate(searchDateTo!)}`
                  }
                </Text>
                <TouchableOpacity onPress={() => { setSearchDateFrom(null); setSearchDateTo(null); }}>
                  <X size={12} color="#10B981" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalToday}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#10B981' + '20' }]}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.verified}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verified</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F59E0B' + '20' }]}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.flagged}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Flagged</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#8B5CF6' + '20' }]}>
          <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>{stats.totalWeek}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Week</Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => handleActionTypeSelect('task')}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Add Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
          onPress={() => handleActionTypeSelect('issue')}
          activeOpacity={0.8}
        >
          <AlertTriangle size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Report Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
          onPress={() => setShowActionTypeModal(true)}
          activeOpacity={0.8}
        >
          <ShoppingCart size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Purchase/Service</Text>
        </TouchableOpacity>
      </View>

      {/* Purchase/Service Type Selection Modal */}
      <Modal visible={showActionTypeModal} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.departmentPickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Request Type</Text>
              <TouchableOpacity onPress={() => setShowActionTypeModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.departmentPickerSubtitle, { color: colors.textSecondary }]}>
              What type of request do you need?
            </Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.departmentPickerItem, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowActionTypeModal(false);
                  handleActionTypeSelect('purchase');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.departmentPickerDot, { backgroundColor: '#8B5CF6' }]} />
                <View style={styles.departmentPickerInfo}>
                  <Text style={[styles.departmentPickerName, { color: colors.text }]}>Purchase Materials</Text>
                  <Text style={[styles.departmentPickerCode, { color: colors.textSecondary }]}>Stock, Non-Stock, or Capex items</Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.departmentPickerItem, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowActionTypeModal(false);
                  handleActionTypeSelect('service');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.departmentPickerDot, { backgroundColor: '#F97316' }]} />
                <View style={styles.departmentPickerInfo}>
                  <Text style={[styles.departmentPickerName, { color: colors.text }]}>Request Service</Text>
                  <Text style={[styles.departmentPickerCode, { color: colors.textSecondary }]}>Plumbers, electricians, contractors, etc.</Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Department Quick Filter Tabs */}
      <View style={styles.departmentFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.departmentFilterContent}
        >
          <TouchableOpacity
            style={[
              styles.departmentChip,
              !selectedDepartmentFilter && styles.departmentChipActive,
              { backgroundColor: !selectedDepartmentFilter ? colors.primary : colors.surface },
            ]}
            onPress={() => setSelectedDepartmentFilter(null)}
          >
            <Text
              style={[
                styles.departmentChipText,
                { color: !selectedDepartmentFilter ? '#fff' : colors.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {Object.values(DEPARTMENT_CODES).map(dept => (
            <TouchableOpacity
              key={dept.code}
              style={[
                styles.departmentChip,
                selectedDepartmentFilter === dept.code && styles.departmentChipActive,
                {
                  backgroundColor:
                    selectedDepartmentFilter === dept.code ? dept.color : colors.surface,
                  borderColor: dept.color,
                  borderWidth: selectedDepartmentFilter === dept.code ? 0 : 1,
                },
              ]}
              onPress={() =>
                setSelectedDepartmentFilter(
                  selectedDepartmentFilter === dept.code ? null : dept.code
                )
              }
            >
              <View
                style={[
                  styles.departmentChipDot,
                  {
                    backgroundColor:
                      selectedDepartmentFilter === dept.code ? '#fff' : dept.color,
                  },
                ]}
              />
              <Text
                style={[
                  styles.departmentChipText,
                  {
                    color: selectedDepartmentFilter === dept.code ? '#fff' : colors.text,
                  },
                ]}
              >
                {dept.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {hasActiveFilters && (
        <View style={styles.activeFiltersRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
            {filterDepartment && (
              <View style={[styles.filterChip, { backgroundColor: getDepartmentColor(filterDepartment) + '20' }]}>
                <Text style={[styles.filterChipText, { color: getDepartmentColor(filterDepartment) }]}>
                  {getDepartmentName(filterDepartment)}
                </Text>
                <TouchableOpacity onPress={() => { setFilterDepartment(null); setFilterCategory(null); }}>
                  <X size={14} color={getDepartmentColor(filterDepartment)} />
                </TouchableOpacity>
              </View>
            )}
            {filterCategory && (
              <View style={[styles.filterChip, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.filterChipText, { color: colors.primary }]}>
                  {TASK_CATEGORIES.find(c => c.id === filterCategory)?.name || 'Task Type'}
                </Text>
                <TouchableOpacity onPress={() => setFilterCategory(null)}>
                  <X size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            {(filterDateFrom || filterDateTo) && (
              <View style={[styles.filterChip, { backgroundColor: '#10B981' + '20' }]}>
                <Calendar size={12} color="#10B981" />
                <Text style={[styles.filterChipText, { color: '#10B981' }]}>
                  {filterDateFrom && filterDateTo 
                    ? `${formatDate(filterDateFrom)} - ${formatDate(filterDateTo)}`
                    : filterDateFrom 
                      ? `From ${formatDate(filterDateFrom)}`
                      : `To ${formatDate(filterDateTo!)}`
                  }
                </Text>
                <TouchableOpacity onPress={() => { setFilterDateFrom(null); setFilterDateTo(null); }}>
                  <X size={14} color="#10B981" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity onPress={clearFilters} style={styles.clearAllButton}>
            <Text style={[styles.clearFiltersText, { color: colors.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.feedContainer}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredVerifications.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Verifications</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {hasActiveFilters || searchQuery
                ? 'No results match your filters'
                : 'Start logging task completions'}
            </Text>
          </View>
        ) : (
          filteredVerifications.map(verification => {
            const hasDepartmentTasks = verification.sourceId && departmentTasksByPostId.has(verification.sourceId);
            const departmentTasks = hasDepartmentTasks ? departmentTasksByPostId.get(verification.sourceId) : [];
            const formData = parseFormData(verification.notes);
            const cleanNotes = getCleanNotes(verification.notes);
            const additionalPhotos = verification.sourceId ? additionalPhotosByPostId.get(verification.sourceId) : [];
            const allPhotos = [verification.photoUri, ...(additionalPhotos || [])].filter(
              (url): url is string => !!url && !url.startsWith('blob:')
            );
            
            const canNavigateToDetail = verification.sourceType === 'task_feed_post' && verification.sourceId;
            
            const handleCardPress = () => {
              if (canNavigateToDetail) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/taskfeed/${verification.sourceId}`);
              }
            };
            
            return (
              <TouchableOpacity 
                key={verification.id} 
                style={[styles.postCard, { backgroundColor: colors.surface }]}
                onPress={handleCardPress}
                activeOpacity={canNavigateToDetail ? 0.7 : 1}
                disabled={!canNavigateToDetail}
              >
                {/* Compact Header Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.avatarSmall,
                        { backgroundColor: getDepartmentColor(verification.departmentCode) + '20' },
                      ]}
                    >
                      <User size={12} color={getDepartmentColor(verification.departmentCode)} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.cardHeaderTopRow}>
                        <Text style={[styles.cardUserName, { color: colors.text }]} numberOfLines={1}>
                          {verification.employeeName}
                        </Text>
                        <View
                          style={[
                            styles.cardDeptBadge,
                            { backgroundColor: getDepartmentColor(verification.departmentCode) + '20' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardDeptText,
                              { color: getDepartmentColor(verification.departmentCode) },
                            ]}
                          >
                            {verification.departmentName}
                          </Text>
                        </View>
                        <Text style={[styles.cardTime, { color: colors.textTertiary }]}>
                          {formatTime(verification.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.cardLocationRow}>
                        <MapPin size={10} color={colors.textTertiary} />
                        <Text style={[styles.cardLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {verification.locationName}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {verification.sourceType && verification.sourceType !== 'manual' && (
                      <View style={[styles.cardSourceBadge, { backgroundColor: getSourceTypeColor(verification.sourceType) + '15' }]}>
                        <Text style={[styles.cardSourceText, { color: getSourceTypeColor(verification.sourceType) }]}>
                          {getSourceTypeLabel(verification.sourceType)}
                        </Text>
                      </View>
                    )}
                    {verification.sourceNumber && (
                      <View style={[styles.cardRefBadge, { backgroundColor: colors.primary + '15' }]}>
                        <FileText size={9} color={colors.primary} />
                        <Text style={[styles.cardRefText, { color: colors.primary }]}>
                          {verification.sourceNumber}
                        </Text>
                      </View>
                    )}
                    {verification.sourceId && verification.sourceType === 'task_feed_post' && canDeletePost({ createdById: verification.employeeId }) && (
                      <TouchableOpacity
                        style={[styles.cardDeleteBtn, { backgroundColor: colors.error + '10' }]}
                        onPress={() => handleDeletePost(verification.sourceId!, verification.sourceNumber || verification.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={12} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Action Title with Status - Compact */}
                <View style={styles.cardTitleRow}>
                  <View
                    style={[
                      styles.cardStatusIndicator,
                      {
                        backgroundColor:
                          verification.status === 'verified'
                            ? '#10B981'
                            : verification.status === 'flagged'
                            ? '#EF4444'
                            : '#F59E0B',
                      },
                    ]}
                  />
                  <Text style={[styles.cardActionTitle, { color: verification.status === 'flagged' ? '#EF4444' : colors.text }]} numberOfLines={1}>
                    {verification.action}
                  </Text>
                  <Text style={[styles.cardCategoryLabel, { color: colors.textTertiary }]}>
                    {verification.categoryName}
                  </Text>
                </View>

                {/* Form Data Display - Inline compact style */}
                {formData && Object.keys(formData).length > 0 && (
                  <View style={styles.cardFormDataInline}>
                    {Object.entries(formData).slice(0, 4).map(([key, value], idx) => (
                      <Text key={key} style={[styles.cardFormInlineText, { color: colors.textSecondary }]} numberOfLines={1}>
                        <Text style={{ fontWeight: '500' as const }}>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}: </Text>
                        <Text style={{ color: colors.text }}>{String(value)}</Text>
                        {idx < Math.min(Object.keys(formData).length - 1, 3) && '  •  '}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Production Stopped Banner with Timer */}
                {verification.notes && verification.notes.includes('PRODUCTION STOPPED') && (
                  <ProductionStoppedBanner
                    notes={verification.notes}
                    status={verification.status}
                    createdAt={verification.createdAt}
                    resolvedAt={verification.reviewedAt}
                  />
                )}

                {/* Template-based Production Hold Banner */}
                {verification.sourceId && 
                 postHoldDataMap.has(verification.sourceId) && 
                 !(verification.notes && verification.notes.includes('PRODUCTION STOPPED')) && (() => {
                  const holdData = postHoldDataMap.get(verification.sourceId!);
                  if (!holdData) return null;
                  const roomLine = holdData.productionLine || holdData.locationName || '';
                  const holdNotes = roomLine ? `Room/Line: ${roomLine}` : '';
                  const holdBannerStatus = (holdData.holdStatus === 'active' || holdData.holdStatus === 'reinstated') ? 'flagged' : 'verified';
                  return (
                    <ProductionStoppedBanner
                      notes={holdNotes}
                      status={holdBannerStatus}
                      createdAt={holdData.createdAt}
                      resolvedAt={holdData.holdClearedAt}
                    />
                  );
                })()}

                {/* Clean Notes - Compact */}
                {cleanNotes && (
                  <Text style={[styles.cardNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                    {cleanNotes}
                  </Text>
                )}

                {/* Photo Gallery + Actions Row */}
                <View style={styles.cardBottomRow}>
                  {/* Photos - Compact thumbnails */}
                  {allPhotos.length > 0 && (
                    <View style={styles.cardPhotoRow}>
                      {allPhotos.slice(0, 3).map((photoUrl, idx) => (
                        <Image
                          key={`photo-${idx}`}
                          source={{ uri: photoUrl }}
                          style={styles.cardPhotoThumb}
                        />
                      ))}
                      {allPhotos.length > 3 && (
                        <View style={[styles.cardPhotoMore, { backgroundColor: colors.background }]}>
                          <Text style={[styles.cardPhotoMoreText, { color: colors.textSecondary }]}>+{allPhotos.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Linked Work Order Badge - Compact */}
                  {verification.linkedWorkOrderId && (
                    <TouchableOpacity
                      style={[styles.cardLinkedWOCompact, { backgroundColor: '#EF4444' + '10' }]}
                      onPress={() => {
                        router.push(`/cmms/work-orders/${verification.linkedWorkOrderId}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Link2 size={10} color="#EF4444" />
                      <Text style={styles.cardLinkedWOTextCompact} numberOfLines={1}>
                        WO: {workOrderNumberMap.get(verification.linkedWorkOrderId) || verification.linkedWorkOrderId.slice(0, 8)}
                      </Text>
                      <ChevronRight size={12} color="#EF4444" />
                    </TouchableOpacity>
                  )}

                  {/* Work orders are auto-created by Report Issue - no manual button needed */}
                </View>

                {/* Department Completion Badges - Compact footer */}
                {hasDepartmentTasks && departmentTasks && departmentTasks.length > 0 && (
                  <View style={styles.cardDeptBadgesCompact}>
                    <CompactDepartmentBadges departmentTasks={departmentTasks} maxVisible={6} />
                  </View>
                )}

                {/* View Details Footer */}
                {canNavigateToDetail && (
                  <View style={[styles.cardViewDetailFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.cardViewDetailRow}>
                      <Eye size={14} color={colors.primary} />
                      <Text style={[styles.cardViewDetailText, { color: colors.primary }]}>View Post & Linked Work Orders</Text>
                    </View>
                    <ChevronRight size={16} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      

      {/* Department Picker Modal */}
      <Modal visible={showDepartmentPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.departmentPickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Department</Text>
              <TouchableOpacity onPress={() => { setShowDepartmentPicker(false); resetActionFlow(); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.departmentPickerSubtitle, { color: colors.textSecondary }]}>
              {selectedActionType === 'task' 
                ? 'Which department is this task for?' 
                : selectedActionType === 'issue'
                  ? 'Which department should handle this issue?'
                  : selectedActionType === 'purchase'
                    ? 'Which department is this purchase for?'
                    : 'Which department is this service request for?'}
            </Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {Object.values(DEPARTMENT_CODES).map(dept => (
                <TouchableOpacity
                  key={dept.code}
                  style={[styles.departmentPickerItem, { backgroundColor: colors.background }]}
                  onPress={() => handleDepartmentSelect(dept.code)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.departmentPickerDot, { backgroundColor: dept.color }]} />
                  <View style={styles.departmentPickerInfo}>
                    <Text style={[styles.departmentPickerName, { color: colors.text }]}>{dept.name}</Text>
                    <Text style={[styles.departmentPickerCode, { color: colors.textSecondary }]}>{dept.code}</Text>
                  </View>
                  <ChevronRight size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New Post Modal - Manual Entry (no template) */}
      <Modal visible={showNewPostModal && selectedTemplate === null} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => { setShowNewPostModal(false); resetActionFlow(); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Verification</Text>
            <TouchableOpacity
              onPress={handleSubmitPost}
              disabled={!selectedLocation || !selectedCategory || !selectedAction || !photoUri}
            >
              <Send
                size={24}
                color={
                  selectedLocation && selectedCategory && selectedAction && photoUri
                    ? colors.primary
                    : colors.textTertiary
                }
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedDepartment && (
              <View style={[styles.selectedDepartmentBanner, { backgroundColor: getDepartmentColor(selectedDepartment) + '15' }]}>
                <View style={[styles.selectedDeptDot, { backgroundColor: getDepartmentColor(selectedDepartment) }]} />
                <Text style={[styles.selectedDepartmentText, { color: getDepartmentColor(selectedDepartment) }]}>
                  {getDepartmentName(selectedDepartment)}
                </Text>
                <TouchableOpacity 
                  onPress={() => { setShowNewPostModal(false); setShowDepartmentPicker(true); }}
                  style={styles.changeDeptButton}
                >
                  <Text style={[styles.changeDeptText, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowLocationPicker(true)}
            >
              <View style={styles.selectButtonContent}>
                <MapPin size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.selectButtonText,
                    { color: selectedLocation ? colors.text : colors.textTertiary },
                  ]}
                >
                  {selectedLocation ? selectedLocation.name : 'Select Location'}
                </Text>
              </View>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.surface, opacity: selectedLocation ? 1 : 0.5 },
              ]}
              onPress={() => selectedLocation && setShowCategoryPicker(true)}
              disabled={!selectedLocation}
            >
              <View style={styles.selectButtonContent}>
                <ClipboardList size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.selectButtonText,
                    { color: selectedCategory ? colors.text : colors.textTertiary },
                  ]}
                >
                  {selectedCategory ? selectedCategory.name : 'Select Task Type'}
                </Text>
              </View>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.surface, opacity: selectedCategory ? 1 : 0.5 },
              ]}
              onPress={() => selectedCategory && setShowActionPicker(true)}
              disabled={!selectedCategory}
            >
              <View style={styles.selectButtonContent}>
                <CheckCircle2 size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.selectButtonText,
                    { color: selectedAction ? colors.text : colors.textTertiary },
                  ]}
                >
                  {selectedAction || 'Select Action'}
                </Text>
              </View>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                placeholder="Add notes (optional)"
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.photoSection}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Photo (Required)
              </Text>
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.surface }]}
                  onPress={handleTakePhoto}
                >
                  <Camera size={24} color={colors.primary} />
                  <Text style={[styles.photoButtonText, { color: colors.text }]}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.surface }]}
                  onPress={handlePickImage}
                >
                  <ImageIcon size={24} color={colors.primary} />
                  <Text style={[styles.photoButtonText, { color: colors.text }]}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {photoUri && (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <X size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Location Picker */}
      <Modal visible={showLocationPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {filteredTaskLocations.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.pickerItem,
                      selectedLocation?.id === location.id && {
                        backgroundColor: colors.primary + '15',
                      },
                    ]}
                    onPress={() => {
                      setSelectedLocation(location);
                      setSelectedCategory(null);
                      setSelectedAction('');
                      setShowLocationPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text style={[styles.pickerItemCode, { color: colors.primary }]}>
                        {location.code}
                      </Text>
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>
                        {location.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pickerItemDept,
                        { backgroundColor: getDepartmentColor(location.departmentCode || '') + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerItemDeptText,
                          { color: getDepartmentColor(location.departmentCode || '') },
                        ]}
                      >
                        {getDepartmentName(location.departmentCode || '')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Picker */}
      <Modal visible={showCategoryPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Task Type</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {availableCategories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.pickerItem,
                    selectedCategory?.id === category.id && {
                      backgroundColor: colors.primary + '15',
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(category);
                    setSelectedAction('');
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={styles.pickerItemContent}>
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>
                      {category.name}
                    </Text>
                    <View style={styles.categoryMeta}>
                      {category.requires_photo && (
                        <View style={[styles.requiresBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                          <Camera size={10} color="#F59E0B" />
                          <Text style={[styles.requiresBadgeText, { color: '#F59E0B' }]}>Photo</Text>
                        </View>
                      )}
                      {category.requires_notes && (
                        <View style={[styles.requiresBadge, { backgroundColor: '#8B5CF6' + '20' }]}>
                          <Text style={[styles.requiresBadgeText, { color: '#8B5CF6' }]}>Notes</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Action Picker */}
      <Modal visible={showActionPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Action</Text>
              <TouchableOpacity onPress={() => setShowActionPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {availableActions.map(action => (
                <TouchableOpacity
                  key={action}
                  style={[
                    styles.pickerItem,
                    selectedAction === action && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    setSelectedAction(action);
                    setShowActionPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{action}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Enhanced Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.filterModalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Filter Task Feed</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {/* Department Filter Section */}
              <TouchableOpacity
                style={styles.filterSectionHeader}
                onPress={() => setExpandedFilterSection(expandedFilterSection === 'department' ? null : 'department')}
              >
                <View style={styles.filterSectionHeaderLeft}>
                  <Shield size={18} color={colors.primary} />
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Department</Text>
                  {filterDepartment && (
                    <View style={[styles.activeFilterDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <ChevronRight
                  size={20}
                  color={colors.textSecondary}
                  style={{ transform: [{ rotate: expandedFilterSection === 'department' ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>
              
              {expandedFilterSection === 'department' && (
                <View style={styles.filterSectionContent}>
                  <TouchableOpacity
                    style={[
                      styles.filterItem,
                      !filterDepartment && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => { setFilterDepartment(null); setFilterCategory(null); }}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>All Departments</Text>
                    {!filterDepartment && <CheckCircle2 size={18} color={colors.primary} />}
                  </TouchableOpacity>
                  {Object.values(DEPARTMENT_CODES).map(dept => (
                    <TouchableOpacity
                      key={dept.code}
                      style={[
                        styles.filterItem,
                        filterDepartment === dept.code && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => { setFilterDepartment(dept.code); setFilterCategory(null); }}
                    >
                      <View style={styles.filterItemLeft}>
                        <View style={[styles.deptDot, { backgroundColor: dept.color }]} />
                        <Text style={[styles.filterItemText, { color: colors.text }]}>{dept.name}</Text>
                      </View>
                      {filterDepartment === dept.code && <CheckCircle2 size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Task Type Filter Section */}
              <TouchableOpacity
                style={styles.filterSectionHeader}
                onPress={() => setExpandedFilterSection(expandedFilterSection === 'category' ? null : 'category')}
              >
                <View style={styles.filterSectionHeaderLeft}>
                  <ClipboardList size={18} color={colors.primary} />
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Task Type</Text>
                  {filterCategory && (
                    <View style={[styles.activeFilterDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <ChevronRight
                  size={20}
                  color={colors.textSecondary}
                  style={{ transform: [{ rotate: expandedFilterSection === 'category' ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {expandedFilterSection === 'category' && (
                <View style={styles.filterSectionContent}>
                  <TouchableOpacity
                    style={[
                      styles.filterItem,
                      !filterCategory && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setFilterCategory(null)}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>All Task Types</Text>
                    {!filterCategory && <CheckCircle2 size={18} color={colors.primary} />}
                  </TouchableOpacity>
                  {categoriesForDepartment.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.filterItem,
                        filterCategory === cat.id && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setFilterCategory(cat.id)}
                    >
                      <Text style={[styles.filterItemText, { color: colors.text }]}>{cat.name}</Text>
                      {filterCategory === cat.id && <CheckCircle2 size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Date Filter Section */}
              <TouchableOpacity
                style={styles.filterSectionHeader}
                onPress={() => setExpandedFilterSection(expandedFilterSection === 'date' ? null : 'date')}
              >
                <View style={styles.filterSectionHeaderLeft}>
                  <Calendar size={18} color={colors.primary} />
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Date Range</Text>
                  {(filterDateFrom || filterDateTo) && (
                    <View style={[styles.activeFilterDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <ChevronRight
                  size={20}
                  color={colors.textSecondary}
                  style={{ transform: [{ rotate: expandedFilterSection === 'date' ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {expandedFilterSection === 'date' && (
                <View style={styles.filterSectionContent}>
                  <TouchableOpacity
                    style={[
                      styles.filterItem,
                      !filterDateFrom && !filterDateTo && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => { setFilterDateFrom(null); setFilterDateTo(null); }}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>All Time</Text>
                    {!filterDateFrom && !filterDateTo && <CheckCircle2 size={18} color={colors.primary} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterItem,
                      filterDateFrom === new Date().toISOString().split('T')[0] && filterDateTo === new Date().toISOString().split('T')[0] && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setFilterDateFrom(today);
                      setFilterDateTo(today);
                    }}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filterItem}
                    onPress={() => {
                      const today = new Date();
                      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                      setFilterDateFrom(weekAgo.toISOString().split('T')[0]);
                      setFilterDateTo(today.toISOString().split('T')[0]);
                    }}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>Last 7 Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filterItem}
                    onPress={() => {
                      const today = new Date();
                      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                      setFilterDateFrom(monthAgo.toISOString().split('T')[0]);
                      setFilterDateTo(today.toISOString().split('T')[0]);
                    }}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>Last 30 Days</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Source Type Filter Section */}
              <TouchableOpacity
                style={styles.filterSectionHeader}
                onPress={() => setExpandedFilterSection(expandedFilterSection === 'source' ? null : 'source')}
              >
                <View style={styles.filterSectionHeaderLeft}>
                  <FileText size={18} color={colors.primary} />
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Source Type</Text>
                  {filterSourceType && (
                    <View style={[styles.activeFilterDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <ChevronRight
                  size={20}
                  color={colors.textSecondary}
                  style={{ transform: [{ rotate: expandedFilterSection === 'source' ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>

              {expandedFilterSection === 'source' && (
                <View style={styles.filterSectionContent}>
                  <TouchableOpacity
                    style={[
                      styles.filterItem,
                      !filterSourceType && { backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setFilterSourceType(null)}
                  >
                    <Text style={[styles.filterItemText, { color: colors.text }]}>All Sources</Text>
                    {!filterSourceType && <CheckCircle2 size={18} color={colors.primary} />}
                  </TouchableOpacity>
                  {[
                    { key: 'manual', label: 'Manual Entry' },
                    { key: 'work_order', label: 'Work Orders' },
                    { key: 'pm_work_order', label: 'PM Work Orders' },
                    { key: 'inspection', label: 'Inspections' },
                    { key: 'permit', label: 'Permits' },
                    { key: 'work_request', label: 'Work Requests' },
                    { key: 'issue_report', label: 'Issue Reports' },
                  ].map(source => (
                    <TouchableOpacity
                      key={source.key}
                      style={[
                        styles.filterItem,
                        filterSourceType === source.key && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setFilterSourceType(source.key)}
                    >
                      <View style={styles.filterItemLeft}>
                        <View style={[styles.sourceDot, { backgroundColor: getSourceTypeColor(source.key) }]} />
                        <Text style={[styles.filterItemText, { color: colors.text }]}>{source.label}</Text>
                      </View>
                      {filterSourceType === source.key && <CheckCircle2 size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: colors.error + '15' }]}
                onPress={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.clearFiltersButtonText, { color: colors.error }]}>
                  Clear All Filters
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.applyFiltersButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Issue Modal */}
      <Modal visible={showReportIssueModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => { setShowReportIssueModal(false); resetActionFlow(); }}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.issueModalTitleContainer}>
              <AlertTriangle size={20} color="#EF4444" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Report Issue</Text>
            </View>
            <TouchableOpacity
              onPress={handleSubmitIssue}
              disabled={!issueLocation || !issueType || !issueDescription.trim() || !issuePhotoUri}
            >
              <Send
                size={24}
                color={
                  issueLocation && issueType && issueDescription.trim() && issuePhotoUri
                    ? '#EF4444'
                    : colors.textTertiary
                }
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {issueDepartment && (
              <View style={[styles.selectedDepartmentBanner, { backgroundColor: getDepartmentColor(issueDepartment) + '15', marginBottom: 12 }]}>
                <View style={[styles.selectedDeptDot, { backgroundColor: getDepartmentColor(issueDepartment) }]} />
                <Text style={[styles.selectedDepartmentText, { color: getDepartmentColor(issueDepartment) }]}>
                  {getDepartmentName(issueDepartment)}
                </Text>
                <TouchableOpacity 
                  onPress={() => { setShowReportIssueModal(false); setShowDepartmentPicker(true); }}
                  style={styles.changeDeptButton}
                >
                  <Text style={[styles.changeDeptText, { color: colors.primary }]}>Change</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.urgentBanner, { backgroundColor: '#EF4444' + '15' }]}>
              <AlertTriangle size={18} color="#EF4444" />
              <Text style={[styles.urgentBannerText, { color: '#EF4444' }]}>
                Report equipment failures, safety hazards, spills, or other urgent issues
              </Text>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Location *</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowIssueLocationPicker(true)}
            >
              <View style={styles.selectButtonContent}>
                <MapPin size={20} color="#EF4444" />
                <Text
                  style={[
                    styles.selectButtonText,
                    { color: issueLocation ? colors.text : colors.textTertiary },
                  ]}
                >
                  {issueLocation ? issueLocation.name : 'Where is the issue?'}
                </Text>
              </View>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Issue Type *</Text>
            <View style={styles.issueTypeGrid}>
              {ISSUE_TYPE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.issueTypeButton,
                    {
                      backgroundColor: issueType === option.id ? option.color + '20' : colors.surface,
                      borderColor: issueType === option.id ? option.color : 'transparent',
                      borderWidth: issueType === option.id ? 2 : 0,
                    },
                  ]}
                  onPress={() => setIssueType(option.id)}
                >
                  <View style={[styles.issueTypeIcon, { backgroundColor: option.color + '20' }]}>
                    {option.id === 'equipment_down' && <Wrench size={18} color={option.color} />}
                    {option.id === 'safety_hazard' && <AlertTriangle size={18} color={option.color} />}
                    {option.id === 'spill' && <Flag size={18} color={option.color} />}
                    {option.id === 'maintenance' && <Wrench size={18} color={option.color} />}
                    {option.id === 'sanitation' && <CheckCircle2 size={18} color={option.color} />}
                    {option.id === 'other' && <Flag size={18} color={option.color} />}
                  </View>
                  <Text style={[styles.issueTypeLabel, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.productionStopSection, { backgroundColor: '#EF4444' + '10', borderColor: '#EF4444' }]}>
              <View style={styles.productionStopHeader}>
                <Text style={[styles.productionStopTitle, { color: '#EF4444' }]}>Has production stopped?</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { backgroundColor: issueStoppedProduction ? '#EF4444' : colors.surface },
                  ]}
                  onPress={() => setIssueStoppedProduction(!issueStoppedProduction)}
                >
                  <Text style={[styles.toggleButtonText, { color: issueStoppedProduction ? '#fff' : colors.text }]}>
                    {issueStoppedProduction ? 'YES' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>
              {issueStoppedProduction && (
                <View style={styles.roomLineSection}>
                  <Text style={[styles.roomLineLabel, { color: colors.text }]}>Which room/line? *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roomLineScroll}>
                    {ROOM_LINE_OPTIONS.map(room => (
                      <TouchableOpacity
                        key={room}
                        style={[
                          styles.roomLineChip,
                          {
                            backgroundColor: issueRoomLine === room ? '#EF4444' : colors.surface,
                          },
                        ]}
                        onPress={() => setIssueRoomLine(room)}
                      >
                        <Text
                          style={[
                            styles.roomLineChipText,
                            { color: issueRoomLine === room ? '#fff' : colors.text },
                          ]}
                        >
                          {room}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={[styles.downtimeWarning, { backgroundColor: '#EF4444' + '20' }]}>
                    <AlertTriangle size={14} color="#EF4444" />
                    <Text style={[styles.downtimeWarningText, { color: '#EF4444' }]}>
                      A CRITICAL work order will be created automatically
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Describe the Issue *</Text>
            <View style={[styles.notesContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                placeholder="What happened? Be specific about the problem..."
                placeholderTextColor={colors.textTertiary}
                value={issueDescription}
                onChangeText={setIssueDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Photo * (Required)</Text>
            <View style={styles.photoButtons}>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: colors.surface }]}
                onPress={handleTakeIssuePhoto}
              >
                <Camera size={24} color="#EF4444" />
                <Text style={[styles.photoButtonText, { color: colors.text }]}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoButton, { backgroundColor: colors.surface }]}
                onPress={handlePickIssueImage}
              >
                <ImageIcon size={24} color="#EF4444" />
                <Text style={[styles.photoButtonText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {issuePhotoUri && (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: issuePhotoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => setIssuePhotoUri(null)}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitIssueButton,
                {
                  backgroundColor:
                    issueLocation && issueType && issueDescription.trim() && issuePhotoUri
                      ? '#EF4444'
                      : colors.border,
                },
              ]}
              onPress={handleSubmitIssue}
              disabled={!issueLocation || !issueType || !issueDescription.trim() || !issuePhotoUri}
            >
              <AlertTriangle size={20} color="#fff" />
              <Text style={styles.submitIssueButtonText}>Submit Issue Report</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Issue Location Picker */}
      <Modal visible={showIssueLocationPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowIssueLocationPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {filteredIssueLocations.map(location => (
                  <TouchableOpacity
                    key={location.id}
                    style={[
                      styles.pickerItem,
                      issueLocation?.id === location.id && {
                        backgroundColor: '#EF4444' + '15',
                      },
                    ]}
                    onPress={() => {
                      setIssueLocation(location);
                      setShowIssueLocationPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemContent}>
                      <Text style={[styles.pickerItemCode, { color: '#EF4444' }]}>
                        {location.code}
                      </Text>
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>
                        {location.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pickerItemDept,
                        { backgroundColor: getDepartmentColor(location.departmentCode) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerItemDeptText,
                          { color: getDepartmentColor(location.departmentCode) },
                        ]}
                      >
                        {getDepartmentName(location.departmentCode)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Purchase Request Form Component */}
      <PurchaseRequestForm
        visible={showPurchaseRequestModal}
        onClose={() => { setShowPurchaseRequestModal(false); resetActionFlow(); }}
        departmentCode={purchaseDepartment}
        onSuccess={handlePurchaseRequestSuccess}
      />

      {/* Template Picker Modal - Action Selection after Department */}
      <Modal visible={showTemplatePicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.templatePickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Action</Text>
              <TouchableOpacity onPress={() => { setShowTemplatePicker(false); resetActionFlow(); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {/* Show selected department context */}
            {currentTriggeringDepartment && (
              <View style={[styles.templatePickerDeptBanner, { backgroundColor: getDepartmentColor(currentTriggeringDepartment) + '15' }]}>
                <View style={[styles.templatePickerDeptDot, { backgroundColor: getDepartmentColor(currentTriggeringDepartment) }]} />
                <Text style={[styles.templatePickerDeptText, { color: getDepartmentColor(currentTriggeringDepartment) }]}>
                  {getDepartmentName(currentTriggeringDepartment)}
                </Text>
                <View style={[styles.templatePickerTypeBadge, { 
                  backgroundColor: selectedActionType === 'task' ? '#3B82F6' : selectedActionType === 'issue' ? '#EF4444' : selectedActionType === 'purchase' ? '#8B5CF6' : '#F97316' 
                }]}>
                  <Text style={styles.templatePickerTypeText}>
                    {selectedActionType === 'task' ? 'Add Task' : selectedActionType === 'issue' ? 'Report Issue' : selectedActionType === 'purchase' ? 'Purchase' : 'Service'}
                  </Text>
                </View>
              </View>
            )}
            
            <Text style={[styles.templatePickerSubtitle, { color: colors.textSecondary }]}>
              Choose the action template for this task
            </Text>
            
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {isLoadingTemplates ? (
                <View style={styles.loadingTemplatesContainer}>
                  <Text style={[styles.loadingTemplatesText, { color: colors.textSecondary }]}>Loading templates...</Text>
                </View>
              ) : availableTemplates.length === 0 ? (
                <View style={styles.noTemplatesContainer}>
                  <ClipboardList size={48} color={colors.textTertiary} />
                  <Text style={[styles.noTemplatesTitle, { color: colors.text }]}>No Templates Available</Text>
                  <Text style={[styles.noTemplatesSubtitle, { color: colors.textSecondary }]}>
                    No action templates have been configured for {getDepartmentName(currentTriggeringDepartment || '')} yet.{' '}
                    Contact your administrator to set up templates in Settings → Task Feed Templates.
                  </Text>
                  <TouchableOpacity
                    style={[styles.fallbackButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setShowTemplatePicker(false);
                      if (selectedActionType === 'task') {
                        setShowNewPostModal(true);
                      } else if (selectedActionType === 'issue') {
                        setShowReportIssueModal(true);
                      }
                    }}
                  >
                    <Text style={styles.fallbackButtonText}>Use Manual Entry Instead</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {availableTemplates.map(template => {
                    const iconColor = selectedActionType === 'task' ? '#3B82F6' : selectedActionType === 'issue' ? '#EF4444' : selectedActionType === 'purchase' ? '#8B5CF6' : '#F97316';
                    return (
                      <TouchableOpacity
                        key={template.id}
                        style={[styles.templatePickerItem, { backgroundColor: colors.background }]}
                        onPress={() => handleTemplateSelect(template)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.templateIconContainer, { backgroundColor: iconColor + '15' }]}>
                          {selectedActionType === 'task' && <ClipboardList size={20} color={iconColor} />}
                          {selectedActionType === 'issue' && <AlertTriangle size={20} color={iconColor} />}
                          {selectedActionType === 'purchase' && <ShoppingCart size={20} color={iconColor} />}
                          {selectedActionType === 'service' && <HardHat size={20} color={iconColor} />}
                        </View>
                        <View style={styles.templatePickerInfo}>
                          <Text style={[styles.templatePickerName, { color: colors.text }]}>{template.name}</Text>
                          {template.description && (
                            <Text style={[styles.templatePickerDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                              {template.description}
                            </Text>
                          )}
                          <View style={styles.templateMetaRow}>
                            {template.photoRequired && (
                              <View style={[styles.templateMetaBadge, { backgroundColor: '#F59E0B' + '20' }]}>
                                <Camera size={10} color="#F59E0B" />
                                <Text style={[styles.templateMetaText, { color: '#F59E0B' }]}>Photo Required</Text>
                              </View>
                            )}
                            {template.assignedDepartments && template.assignedDepartments.length > 0 && (
                              <View style={[styles.templateMetaBadge, { backgroundColor: '#8B5CF6' + '20' }]}>
                                <Text style={[styles.templateMetaText, { color: '#8B5CF6' }]}>
                                  → {template.assignedDepartments.length} dept{template.assignedDepartments.length > 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                            {template.formFields && template.formFields.length > 0 && (
                              <View style={[styles.templateMetaBadge, { backgroundColor: '#10B981' + '20' }]}>
                                <Text style={[styles.templateMetaText, { color: '#10B981' }]}>
                                  {template.formFields.length} field{template.formFields.length > 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <ChevronRight size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    );
                  })}
                  
                  {/* Option to use manual entry even when templates exist */}
                  <TouchableOpacity
                    style={[styles.manualEntryOption, { borderColor: colors.border }]}
                    onPress={() => {
                      setShowTemplatePicker(false);
                      if (selectedActionType === 'task') {
                        setShowNewPostModal(true);
                      } else if (selectedActionType === 'issue') {
                        setShowReportIssueModal(true);
                      }
                    }}
                  >
                    <Text style={[styles.manualEntryText, { color: colors.textSecondary }]}>
                      Or use manual entry without template
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Template Form Modal */}
      <Modal visible={showNewPostModal && selectedTemplate !== null} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={resetTemplateFlow}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.templateModalTitleContainer}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedTemplate?.name || 'New Task'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSubmitTemplatePost}
              disabled={createTaskFeedPostMutation.isPending || templatePhotoUris.length === 0}
            >
              <Send
                size={24}
                color={createTaskFeedPostMutation.isPending || templatePhotoUris.length === 0 ? colors.textTertiary : colors.primary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {(selectedDepartment || issueDepartment) && (
              <View style={[styles.selectedDepartmentBanner, { backgroundColor: getDepartmentColor(selectedDepartment || issueDepartment || '') + '15' }]}>
                <View style={[styles.selectedDeptDot, { backgroundColor: getDepartmentColor(selectedDepartment || issueDepartment || '') }]} />
                <Text style={[styles.selectedDepartmentText, { color: getDepartmentColor(selectedDepartment || issueDepartment || '') }]}>
                  {getDepartmentName(selectedDepartment || issueDepartment || '')}
                </Text>
              </View>
            )}

            {selectedTemplate?.description && (
              <View style={[styles.templateDescriptionBanner, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.templateDescriptionText, { color: colors.primary }]}>
                  {selectedTemplate.description}
                </Text>
              </View>
            )}

            {selectedTemplate?.assignedDepartments && selectedTemplate.assignedDepartments.length > 0 && (
              <View style={[styles.assignedDeptsBanner, { backgroundColor: '#8B5CF6' + '10' }]}>
                <Text style={[styles.assignedDeptsLabel, { color: '#8B5CF6' }]}>Assigned to:</Text>
                <View style={styles.assignedDeptsRow}>
                  {selectedTemplate.assignedDepartments.map(deptCode => (
                    <View key={deptCode} style={[styles.assignedDeptChip, { backgroundColor: getDepartmentColor(deptCode) + '20' }]}>
                      <View style={[styles.assignedDeptDot, { backgroundColor: getDepartmentColor(deptCode) }]} />
                      <Text style={[styles.assignedDeptText, { color: getDepartmentColor(deptCode) }]}>
                        {getDepartmentName(deptCode)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {selectedTemplate && enhancedFormFields.length > 0 && (
              <DynamicFormRenderer
                fields={enhancedFormFields}
                values={templateFormValues}
                onChange={handleTemplateFormChange}
                errors={templateFormErrors}
                onDropdownPress={handleDropdownFieldPress}
              />
            )}

            <View style={[styles.notesContainer, { backgroundColor: colors.surface, marginTop: 16 }]}>
              <TextInput
                style={[styles.notesInput, { color: colors.text }]}
                placeholder="Additional notes (optional)"
                placeholderTextColor={colors.textTertiary}
                value={templateNotes}
                onChangeText={setTemplateNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.photoSection}>
              <View style={styles.photoSectionHeader}>
                <Text style={[styles.sectionLabel, { color: templatePhotoError ? '#EF4444' : colors.text }]}>
                  Photos (Required) {templatePhotoError && '*'}
                </Text>
                <Text style={[styles.photoCountLabel, { color: colors.textSecondary }]}>
                  {templatePhotoUris.length}/{MAX_PHOTOS}
                </Text>
              </View>
              
              {templatePhotoUris.length < MAX_PHOTOS && (
                <View style={[styles.photoButtons, templatePhotoError && styles.photoButtonsError]}>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: templatePhotoError ? '#EF4444' : 'transparent', borderWidth: templatePhotoError ? 1 : 0 }]}
                    onPress={handleTakeTemplatePhoto}
                  >
                    <Camera size={24} color={templatePhotoError ? '#EF4444' : colors.primary} />
                    <Text style={[styles.photoButtonText, { color: colors.text }]}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: templatePhotoError ? '#EF4444' : 'transparent', borderWidth: templatePhotoError ? 1 : 0 }]}
                    onPress={handlePickTemplateImage}
                  >
                    <ImageIcon size={24} color={templatePhotoError ? '#EF4444' : colors.primary} />
                    <Text style={[styles.photoButtonText, { color: colors.text }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
              {templatePhotoError && (
                <Text style={styles.photoErrorText}>At least one photo is required</Text>
              )}

              {templatePhotoUris.length > 0 && (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.multiPhotoScroll}
                  contentContainerStyle={styles.multiPhotoScrollContent}
                >
                  {templatePhotoUris.map((uri, index) => (
                    <View key={`photo-${index}`} style={styles.multiPhotoContainer}>
                      <Image source={{ uri }} style={styles.multiPhotoPreview} />
                      <TouchableOpacity
                        style={styles.removeMultiPhotoButton}
                        onPress={() => handleRemoveTemplatePhoto(index)}
                      >
                        <X size={14} color="#fff" />
                      </TouchableOpacity>
                      {index === 0 && (
                        <View style={styles.primaryPhotoBadge}>
                          <Text style={styles.primaryPhotoBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {templatePhotoUris.length < MAX_PHOTOS && (
                    <TouchableOpacity
                      style={[styles.addMorePhotoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={handlePickTemplateImage}
                    >
                      <Plus size={24} color={colors.textSecondary} />
                      <Text style={[styles.addMorePhotoText, { color: colors.textSecondary }]}>Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitTemplateButton,
                { backgroundColor: createTaskFeedPostMutation.isPending ? colors.border : colors.primary },
              ]}
              onPress={handleSubmitTemplatePost}
              disabled={createTaskFeedPostMutation.isPending}
            >
              {createTaskFeedPostMutation.isPending ? (
                <Text style={styles.submitTemplateButtonText}>Submitting...</Text>
              ) : (
                <>
                  <Send size={20} color="#fff" />
                  <Text style={styles.submitTemplateButtonText}>Submit Task</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Field Options Picker Modal */}
      <Modal visible={showFieldOptionsPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {activeDropdownField?.label || 'Select Option'}
              </Text>
              <TouchableOpacity onPress={() => setShowFieldOptionsPicker(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {activeDropdownField?.options?.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerItem,
                    templateFormValues[activeDropdownField.id] === option.value && {
                      backgroundColor: colors.primary + '15',
                    },
                  ]}
                  onPress={() => {
                    if (activeDropdownField) {
                      handleTemplateFormChange(activeDropdownField.id, option.value);
                    }
                    setShowFieldOptionsPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{option.label}</Text>
                  {templateFormValues[activeDropdownField?.id] === option.value && (
                    <CheckCircle2 size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Work Order Creation Modal */}
      <Modal visible={showWorkOrderModal} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.workOrderModalContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.pickerHeader}>
              <View style={styles.woModalHeaderLeft}>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Create Work Order</Text>
                <View style={[styles.mandatoryBadge, { backgroundColor: '#EF4444' + '20' }]}>
                  <Text style={[styles.mandatoryBadgeText, { color: '#EF4444' }]}>MANDATORY</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => { setShowWorkOrderModal(false); setSelectedVerificationForWO(null); }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.woWarningBanner, { backgroundColor: '#EF4444' + '10' }]}>
                <AlertTriangle size={18} color="#EF4444" />
                <Text style={[styles.woWarningText, { color: '#EF4444' }]}>
                  Work Orders are mandatory and cannot be ignored. This will create an actionable task that must be completed.
                </Text>
              </View>

              {selectedVerificationForWO && (
                <View style={[styles.linkedIssueCard, { backgroundColor: colors.background }]}>
                  <Text style={[styles.linkedIssueLabel, { color: colors.textSecondary }]}>Source Issue:</Text>
                  <Text style={[styles.linkedIssueText, { color: colors.text }]}>
                    {selectedVerificationForWO.locationName} - {selectedVerificationForWO.action}
                  </Text>
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Work order title"
                placeholderTextColor={colors.textTertiary}
                value={workOrderTitle}
                onChangeText={setWorkOrderTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Describe the work needed"
                placeholderTextColor={colors.textTertiary}
                value={workOrderDescription}
                onChangeText={setWorkOrderDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Priority</Text>
              <View style={styles.priorityButtonsRow}>
                {(['low', 'medium', 'high', 'critical'] as const).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      { 
                        backgroundColor: workOrderPriority === priority 
                          ? priority === 'low' ? '#10B981' 
                            : priority === 'medium' ? '#F59E0B'
                            : priority === 'high' ? '#EF4444'
                            : '#7C3AED'
                          : colors.background,
                        borderColor: priority === 'low' ? '#10B981' 
                          : priority === 'medium' ? '#F59E0B'
                          : priority === 'high' ? '#EF4444'
                          : '#7C3AED',
                      },
                    ]}
                    onPress={() => setWorkOrderPriority(priority)}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        { 
                          color: workOrderPriority === priority 
                            ? '#fff' 
                            : priority === 'low' ? '#10B981' 
                              : priority === 'medium' ? '#F59E0B'
                              : priority === 'high' ? '#EF4444'
                              : '#7C3AED',
                        },
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitWOButton, { backgroundColor: '#EF4444' }]}
                onPress={handleSubmitWorkOrder}
              >
                <Wrench size={20} color="#fff" />
                <Text style={styles.submitWOButtonText}>Create Work Order</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Purchase Date Picker Modal */}
      <DatePickerModal
        visible={showPurchaseDatePicker}
        onClose={() => setShowPurchaseDatePicker(false)}
        onSelect={(date) => setPurchaseNeededBy(date)}
        selectedDate={purchaseNeededBy || undefined}
        minDate={new Date().toISOString().split('T')[0]}
        title="Select Needed By Date"
      />

      {/* Search Date From Picker Modal */}
      <DatePickerModal
        visible={showSearchDateFromPicker}
        onClose={() => setShowSearchDateFromPicker(false)}
        onSelect={(date) => setSearchDateFrom(date)}
        selectedDate={searchDateFrom || undefined}
        title="Search From Date"
      />

      {/* Search Date To Picker Modal */}
      <DatePickerModal
        visible={showSearchDateToPicker}
        onClose={() => setShowSearchDateToPicker(false)}
        onSelect={(date) => setSearchDateTo(date)}
        selectedDate={searchDateTo || undefined}
        title="Search To Date"
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchSection: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateSearchButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      gap: 6,
    },
    dateSearchButtonActive: {
      borderWidth: 1,
      borderColor: colors.primary,
    },
    dateSearchText: {
      flex: 1,
      fontSize: 13,
    },
    dateSearchSeparator: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    activeSearchRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    searchChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 6,
      maxWidth: '100%',
    },
    searchChipText: {
      fontSize: 12,
      fontWeight: '500' as const,
      flexShrink: 1,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#fff',
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    statLabel: {
      fontSize: 11,
      marginTop: 2,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: '#fff',
    },
    departmentFilterContainer: {
      marginBottom: 8,
    },
    departmentFilterContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    departmentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 6,
    },
    departmentChipActive: {
      borderWidth: 0,
    },
    departmentChipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    departmentChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    activeFiltersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 8,
      gap: 8,
    },
    filterChipsScroll: {
      flex: 1,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      gap: 6,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    clearAllButton: {
      paddingHorizontal: 8,
    },
    clearFiltersText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    feedContainer: {
      flex: 1,
    },
    feedContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    postCard: {
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    postUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    userInfoText: {
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userName: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    postMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    deptBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    deptBadgeText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    timeText: {
      fontSize: 12,
    },
    postHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sourceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    sourceBadgeText: {
      fontSize: 10,
      fontWeight: '600' as const,
    },
    statusBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    postContent: {
      marginTop: 12,
    },
    taskInfo: {
      gap: 6,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    taskText: {
      fontSize: 14,
    },
    actionBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 12,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    notesText: {
      fontSize: 14,
      marginTop: 10,
      lineHeight: 20,
    },
    postImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginTop: 12,
    },
    linkedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 12,
      gap: 6,
    },
    linkedBadgeText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    createWOButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginTop: 12,
      gap: 8,
    },
    createWOButtonText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#fff',
    },
    
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    modalContent: {
      flex: 1,
      padding: 16,
    },
    selectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 12,
    },
    selectButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    selectButtonText: {
      fontSize: 15,
    },
    notesContainer: {
      borderRadius: 12,
      marginBottom: 16,
    },
    notesInput: {
      padding: 16,
      fontSize: 15,
      minHeight: 100,
    },
    photoSection: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600' as const,
      marginBottom: 12,
    },
    photoButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    photoButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    photoButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    photoButtonsError: {
      marginBottom: 0,
    },
    photoErrorText: {
      color: '#EF4444',
      fontSize: 12,
      marginTop: 8,
      fontWeight: '500' as const,
    },
    photoSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    photoCountLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    multiPhotoScroll: {
      marginTop: 12,
    },
    multiPhotoScrollContent: {
      gap: 10,
      paddingRight: 16,
    },
    multiPhotoContainer: {
      position: 'relative',
    },
    multiPhotoPreview: {
      width: 100,
      height: 100,
      borderRadius: 10,
    },
    removeMultiPhotoButton: {
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
    primaryPhotoBadge: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    primaryPhotoBadgeText: {
      fontSize: 9,
      fontWeight: '600' as const,
      color: '#fff',
    },
    addMorePhotoButton: {
      width: 100,
      height: 100,
      borderRadius: 10,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    addMorePhotoText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    photoPreviewContainer: {
      marginTop: 16,
      position: 'relative',
    },
    photoPreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
    },
    removePhotoButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    pickerContainer: {
      maxHeight: '70%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    departmentPickerContainer: {
      maxHeight: '80%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    departmentPickerSubtitle: {
      fontSize: 14,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    departmentPickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      gap: 14,
    },
    departmentPickerDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    departmentPickerInfo: {
      flex: 1,
    },
    departmentPickerName: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    departmentPickerCode: {
      fontSize: 12,
      marginTop: 2,
    },
    selectedDepartmentBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
      gap: 10,
    },
    selectedDeptDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    selectedDepartmentText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    changeDeptButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    changeDeptText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    filterModalContainer: {
      maxHeight: '85%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    workOrderModalContainer: {
      maxHeight: '85%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    woModalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    mandatoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    mandatoryBadgeText: {
      fontSize: 10,
      fontWeight: '700' as const,
    },
    woWarningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
      gap: 10,
    },
    woWarningText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
    },
    pickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerTitle: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    pickerList: {
      padding: 16,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 4,
    },
    pickerItemContent: {
      flex: 1,
    },
    pickerItemCode: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    pickerItemText: {
      fontSize: 15,
    },
    pickerItemDept: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    pickerItemDeptText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    categoryMeta: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    requiresBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    requiresBadgeText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    filterSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterSectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    activeFilterDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    filterSectionContent: {
      paddingVertical: 8,
      paddingLeft: 8,
    },
    filterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 4,
    },
    filterItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterItemText: {
      fontSize: 15,
    },
    deptDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    sourceDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    clearFiltersButton: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    clearFiltersButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    applyFiltersButton: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 24,
    },
    applyFiltersButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#fff',
    },
    linkedIssueCard: {
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    linkedIssueLabel: {
      fontSize: 12,
      marginBottom: 4,
    },
    linkedIssueText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 8,
      marginTop: 12,
    },
    textInput: {
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    textAreaInput: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    priorityButtonsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    priorityButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
    },
    priorityButtonText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    submitWOButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 24,
      marginBottom: 24,
      gap: 8,
    },
    submitWOButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#fff',
    },
    issueModalTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    urgentBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: 12,
      marginBottom: 20,
      gap: 10,
    },
    urgentBannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
    },
    issueTypeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    issueTypeButton: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 10,
    },
    issueTypeIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    issueTypeLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500' as const,
    },
    productionStopSection: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
    },
    productionStopHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    productionStopTitle: {
      fontSize: 15,
      fontWeight: '600' as const,
    },
    toggleButton: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    toggleButtonText: {
      fontSize: 13,
      fontWeight: '700' as const,
    },
    roomLineSection: {
      marginTop: 16,
    },
    roomLineLabel: {
      fontSize: 13,
      fontWeight: '500' as const,
      marginBottom: 10,
    },
    roomLineScroll: {
      marginBottom: 12,
    },
    roomLineChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginRight: 8,
    },
    roomLineChipText: {
      fontSize: 13,
      fontWeight: '500' as const,
    },
    downtimeWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      gap: 8,
    },
    downtimeWarningText: {
      flex: 1,
      fontSize: 12,
      fontWeight: '500' as const,
    },
    submitIssueButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 12,
      marginBottom: 40,
      gap: 10,
    },
    submitIssueButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#fff',
    },
    purchaseModalTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    purchaseInfoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      borderRadius: 12,
      marginBottom: 20,
      gap: 10,
    },
    purchaseInfoText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as const,
    },
    purchaseRowInputs: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    purchaseHalfInput: {
      flex: 1,
    },
    estimatedTotalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 10,
      marginBottom: 16,
    },
    estimatedTotalLabel: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    estimatedTotalValue: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    submitPurchaseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 12,
      marginBottom: 40,
      gap: 10,
    },
    submitPurchaseButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#fff',
    },
    templatePickerContainer: {
      maxHeight: '80%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    templatePickerSubtitle: {
      fontSize: 14,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    templatePickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
    },
    templateIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templatePickerInfo: {
      flex: 1,
    },
    templatePickerName: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    templatePickerDesc: {
      fontSize: 13,
      marginTop: 2,
    },
    templateMetaRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 6,
    },
    templateMetaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      gap: 4,
    },
    templateMetaText: {
      fontSize: 10,
      fontWeight: '500' as const,
    },
    noTemplatesContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    noTemplatesTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 16,
    },
    noTemplatesSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    fallbackButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      marginTop: 20,
    },
    fallbackButtonText: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: '#fff',
    },
    templatePickerDeptBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 8,
    },
    templatePickerDeptDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    templatePickerDeptText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    templatePickerTypeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    templatePickerTypeText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#fff',
    },
    loadingTemplatesContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingTemplatesText: {
      fontSize: 14,
    },
    manualEntryOption: {
      alignItems: 'center',
      paddingVertical: 16,
      marginTop: 12,
      borderTopWidth: 1,
    },
    manualEntryText: {
      fontSize: 14,
    },
    templateModalTitleContainer: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    templateDescriptionBanner: {
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    templateDescriptionText: {
      fontSize: 13,
      lineHeight: 18,
    },
    assignedDeptsBanner: {
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
    },
    assignedDeptsLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    assignedDeptsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    assignedDeptChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    assignedDeptDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    assignedDeptText: {
      fontSize: 11,
      fontWeight: '500' as const,
    },
    submitTemplateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginTop: 12,
      marginBottom: 40,
      gap: 10,
    },
    submitTemplateButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#fff',
    },
    // Redesigned Card Styles
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      flex: 1,
      alignItems: 'center',
      gap: 8,
    },
    cardHeaderInfo: {
      flex: 1,
    },
    cardHeaderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      gap: 4,
    },
    cardUserName: {
      fontSize: 12,
      fontWeight: '600' as const,
      maxWidth: 100,
    },
    cardDeptBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 3,
    },
    cardDeptText: {
      fontSize: 9,
      fontWeight: '600' as const,
    },
    cardTime: {
      fontSize: 10,
    },
    cardLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      marginTop: 1,
    },
    cardLocationText: {
      fontSize: 10,
      flex: 1,
    },
    cardRefBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3,
      gap: 2,
    },
    cardRefText: {
      fontSize: 9,
      fontWeight: '600' as const,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardSourceBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 3,
    },
    cardSourceText: {
      fontSize: 9,
      fontWeight: '600' as const,
    },
    cardDeleteBtn: {
      width: 22,
      height: 22,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarSmall: {
      width: 26,
      height: 26,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 6,
    },
    cardStatusIndicator: {
      width: 3,
      height: 14,
      borderRadius: 2,
    },
    cardActionTitle: {
      fontSize: 13,
      fontWeight: '600' as const,
      flex: 1,
    },
    cardCategoryLabel: {
      fontSize: 10,
    },
    cardFormDataInline: {
      marginTop: 6,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cardFormInlineText: {
      fontSize: 11,
      lineHeight: 16,
    },
    productionStoppedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#DC2626',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 8,
      gap: 10,
    },
    productionStoppedPulse: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#B91C1C',
      justifyContent: 'center',
      alignItems: 'center',
    },
    productionStoppedContent: {
      flex: 1,
    },
    productionStoppedTitle: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800' as const,
      letterSpacing: 1,
    },
    productionStoppedLine: {
      color: '#FECACA',
      fontSize: 11,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    productionActiveBadge: {
      backgroundColor: '#FFFFFF20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#FFFFFF40',
    },
    productionActiveText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700' as const,
      letterSpacing: 0.5,
    },
    productionResolvedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#10B98120',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      gap: 4,
    },
    productionResolvedText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '600' as const,
    },
    cardFormData: {
      marginTop: 6,
      padding: 8,
      borderRadius: 6,
      gap: 4,
    },
    cardFormRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardFormLabel: {
      fontSize: 10,
      fontWeight: '500' as const,
      flex: 1,
      textTransform: 'capitalize',
    },
    cardFormValue: {
      fontSize: 10,
      fontWeight: '600' as const,
      flex: 2,
      textAlign: 'right',
    },
    cardNotes: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 15,
    },
    cardBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
      flexWrap: 'wrap',
    },
    cardPhotoRow: {
      flexDirection: 'row',
      gap: 4,
    },
    cardPhotoThumb: {
      width: 48,
      height: 48,
      borderRadius: 6,
    },
    cardPhotoMore: {
      width: 48,
      height: 48,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardPhotoMoreText: {
      fontSize: 11,
      fontWeight: '600' as const,
    },
    cardPhotoGallery: {
      marginTop: 8,
      marginHorizontal: -2,
    },
    cardPhotoGalleryContent: {
      paddingHorizontal: 2,
      gap: 6,
    },
    cardPhoto: {
      width: 70,
      height: 70,
      borderRadius: 8,
    },
    cardPhotoSingle: {
      width: '100%',
      height: 120,
    },
    cardLinkedWOCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      gap: 4,
    },
    cardLinkedWOTextCompact: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: '#EF4444',
    },
    cardLinkedWO: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    cardLinkedWOText: {
      fontSize: 11,
      fontWeight: '600' as const,
      color: '#EF4444',
      flex: 1,
    },
    cardCreateWOBtnCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 4,
      gap: 4,
    },
    cardCreateWOTextCompact: {
      fontSize: 10,
      fontWeight: '700' as const,
      color: '#fff',
    },
    cardCreateWOBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      paddingVertical: 8,
      borderRadius: 6,
      gap: 4,
    },
    cardCreateWOText: {
      fontSize: 11,
      fontWeight: '700' as const,
      color: '#fff',
    },
    cardDeptBadgesCompact: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cardViewDetailFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    cardViewDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cardViewDetailText: {
      fontSize: 12,
      fontWeight: '500' as const,
    },
    cardDeptBadges: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cardDeptBadgesLabel: {
      fontSize: 9,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 10,
      gap: 10,
    },
    datePickerText: {
      flex: 1,
      fontSize: 15,
    },
    clearDateButton: {
      padding: 4,
    },
    linkInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      gap: 10,
    },
    linkInput: {
      flex: 1,
      fontSize: 15,
    },
    purchasePhotoSection: {
      marginTop: 8,
    },
    purchasePhotoButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    purchasePhotoButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 10,
      gap: 8,
    },
    purchasePhotoButtonText: {
      fontSize: 14,
      fontWeight: '500' as const,
    },
    purchasePhotoPreviewContainer: {
      position: 'relative',
    },
    purchasePhotoPreview: {
      width: '100%',
      height: 150,
      borderRadius: 10,
    },
  });
