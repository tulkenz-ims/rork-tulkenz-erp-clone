import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type SanitationTaskType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'deep_clean' | 'special';
export type SanitationTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue';
export type SanitationArea = 'restroom' | 'break_room' | 'locker_room' | 'office' | 'common_area' | 'floor' | 'exterior' | 'production' | 'warehouse' | 'other';
export type SanitationResult = 'pass' | 'fail' | 'needs_attention' | 'not_applicable';

export type SupplyCategory = 'facility' | 'production' | 'cleaning_chemical' | 'equipment' | 'ppe';
export type SupplyStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';

export type SanitationInspectionType = 'routine' | 'pre_shift' | 'post_shift' | 'deep_clean_verification' | 'audit' | 'customer' | 'regulatory';
export type SanitationInspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface SanitationTask {
  id: string;
  organization_id: string;
  task_number: string;
  task_type: SanitationTaskType;
  status: SanitationTaskStatus;
  area: SanitationArea;
  location: string;
  facility_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  assigned_crew: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  completed_by_id: string | null;
  duration_minutes: number | null;
  result: SanitationResult | null;
  checklist_items: any[];
  supplies_used: any[];
  issues_found: string | null;
  corrective_action: string | null;
  photos: any[];
  notes: string | null;
  verified_by: string | null;
  verified_by_id: string | null;
  verified_at: string | null;
  recurring: boolean;
  recurrence_pattern: string | null;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitationSchedule {
  id: string;
  organization_id: string;
  schedule_name: string;
  schedule_type: SanitationTaskType;
  area: SanitationArea;
  location: string | null;
  facility_id: string | null;
  description: string | null;
  tasks: any[];
  frequency: string;
  day_of_week: number[] | null;
  day_of_month: number[] | null;
  start_time: string | null;
  estimated_duration_minutes: number | null;
  assigned_crew: string | null;
  is_active: boolean;
  last_generated_date: string | null;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitationSupply {
  id: string;
  organization_id: string;
  item_code: string;
  item_name: string;
  category: SupplyCategory;
  status: SupplyStatus;
  facility_id: string | null;
  location: string | null;
  unit_of_measure: string;
  quantity_on_hand: number;
  minimum_quantity: number;
  reorder_quantity: number;
  unit_cost: number | null;
  supplier_name: string | null;
  supplier_id: string | null;
  last_ordered_date: string | null;
  last_received_date: string | null;
  expiration_date: string | null;
  sds_required: boolean;
  sds_document_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitationInspection {
  id: string;
  organization_id: string;
  inspection_number: string;
  inspection_type: SanitationInspectionType;
  status: SanitationInspectionStatus;
  result: SanitationResult | null;
  facility_id: string | null;
  area: SanitationArea | null;
  location: string | null;
  scheduled_date: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspector_id: string | null;
  checklist_items: any[];
  findings: any[];
  deficiencies_found: number;
  score: number | null;
  corrective_actions_required: boolean;
  corrective_actions: string | null;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  photos: any[];
  notes: string | null;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SanitationNCR {
  id: string;
  organization_id: string;
  ncr_number: string;
  status: 'open' | 'investigation' | 'corrective_action' | 'verification' | 'closed';
  severity: 'minor' | 'major' | 'critical';
  facility_id: string | null;
  area: SanitationArea | null;
  location: string | null;
  discovered_date: string;
  discovered_by: string;
  discovered_by_id: string | null;
  description: string;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  due_date: string | null;
  closed_date: string | null;
  closed_by: string | null;
  closed_by_id: string | null;
  repeat_occurrence: boolean;
  related_ncr_ids: string[];
  attachments: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type CreateTaskInput = Omit<SanitationTask, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateScheduleInput = Omit<SanitationSchedule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

type CreateInspectionInput = Omit<SanitationInspection, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

const MOCK_TASKS: SanitationTask[] = [
  {
    id: 'SANT001',
    organization_id: 'org1',
    task_number: 'SAN-2501-0001',
    task_type: 'daily',
    status: 'completed',
    area: 'restroom',
    location: 'Building A - 1st Floor Restroom',
    facility_id: 'FAC001',
    title: 'Morning Restroom Cleaning',
    description: 'Complete cleaning of all restroom facilities',
    instructions: 'Clean toilets, sinks, mirrors, mop floors, restock supplies',
    scheduled_date: '2025-01-18',
    scheduled_time: '06:00',
    due_date: '2025-01-18',
    assigned_to: 'Maria Garcia',
    assigned_to_id: 'EMP020',
    assigned_crew: 'Day Shift Sanitation',
    started_at: '2025-01-18T06:05:00Z',
    completed_at: '2025-01-18T06:45:00Z',
    completed_by: 'Maria Garcia',
    completed_by_id: 'EMP020',
    duration_minutes: 40,
    result: 'pass',
    checklist_items: [
      { item: 'Clean toilets', completed: true },
      { item: 'Clean sinks', completed: true },
      { item: 'Mop floors', completed: true },
      { item: 'Restock paper products', completed: true },
    ],
    supplies_used: [
      { item: 'Toilet cleaner', quantity: 1 },
      { item: 'Paper towels', quantity: 2 },
    ],
    issues_found: null,
    corrective_action: null,
    photos: [],
    notes: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    recurring: true,
    recurrence_pattern: 'daily',
    parent_task_id: null,
    created_at: '2025-01-18T05:00:00Z',
    updated_at: '2025-01-18T06:45:00Z',
  },
  {
    id: 'SANT002',
    organization_id: 'org1',
    task_number: 'SAN-2501-0002',
    task_type: 'daily',
    status: 'in_progress',
    area: 'break_room',
    location: 'Building A - Break Room',
    facility_id: 'FAC001',
    title: 'Break Room Cleaning',
    description: 'Clean and sanitize break room',
    instructions: 'Wipe tables, clean microwave, empty trash, mop floor',
    scheduled_date: '2025-01-18',
    scheduled_time: '10:00',
    due_date: '2025-01-18',
    assigned_to: 'Maria Garcia',
    assigned_to_id: 'EMP020',
    assigned_crew: 'Day Shift Sanitation',
    started_at: '2025-01-18T10:05:00Z',
    completed_at: null,
    completed_by: null,
    completed_by_id: null,
    duration_minutes: null,
    result: null,
    checklist_items: [
      { item: 'Wipe tables', completed: true },
      { item: 'Clean microwave', completed: false },
      { item: 'Empty trash', completed: true },
      { item: 'Mop floor', completed: false },
    ],
    supplies_used: [],
    issues_found: null,
    corrective_action: null,
    photos: [],
    notes: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    recurring: true,
    recurrence_pattern: 'daily',
    parent_task_id: null,
    created_at: '2025-01-18T05:00:00Z',
    updated_at: '2025-01-18T10:15:00Z',
  },
  {
    id: 'SANT003',
    organization_id: 'org1',
    task_number: 'SAN-2501-0003',
    task_type: 'weekly',
    status: 'pending',
    area: 'floor',
    location: 'Building A - All Hallways',
    facility_id: 'FAC001',
    title: 'Weekly Floor Scrubbing',
    description: 'Deep scrub all hallway floors',
    instructions: 'Use floor scrubber on all hallways, apply floor finish',
    scheduled_date: '2025-01-20',
    scheduled_time: '18:00',
    due_date: '2025-01-20',
    assigned_to: null,
    assigned_to_id: null,
    assigned_crew: 'Night Shift Sanitation',
    started_at: null,
    completed_at: null,
    completed_by: null,
    completed_by_id: null,
    duration_minutes: null,
    result: null,
    checklist_items: [],
    supplies_used: [],
    issues_found: null,
    corrective_action: null,
    photos: [],
    notes: null,
    verified_by: null,
    verified_by_id: null,
    verified_at: null,
    recurring: true,
    recurrence_pattern: 'weekly',
    parent_task_id: null,
    created_at: '2025-01-15T08:00:00Z',
    updated_at: '2025-01-15T08:00:00Z',
  },
];

const MOCK_SCHEDULES: SanitationSchedule[] = [
  {
    id: 'SCHED001',
    organization_id: 'org1',
    schedule_name: 'Daily Restroom Cleaning',
    schedule_type: 'daily',
    area: 'restroom',
    location: 'All Buildings',
    facility_id: 'FAC001',
    description: 'Daily cleaning of all restroom facilities',
    tasks: [],
    frequency: 'daily',
    day_of_week: null,
    day_of_month: null,
    start_time: '06:00',
    estimated_duration_minutes: 45,
    assigned_crew: 'Day Shift Sanitation',
    is_active: true,
    last_generated_date: '2025-01-18',
    next_due_date: '2025-01-19',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-18T06:00:00Z',
  },
];

const MOCK_SUPPLIES: SanitationSupply[] = [
  {
    id: 'SUP001',
    organization_id: 'org1',
    item_code: '6100001',
    item_name: 'Multi-Surface Cleaner',
    category: 'cleaning_chemical',
    status: 'in_stock',
    facility_id: 'FAC001',
    location: 'Janitor Closet A',
    unit_of_measure: 'gallon',
    quantity_on_hand: 12,
    minimum_quantity: 6,
    reorder_quantity: 12,
    unit_cost: 15.99,
    supplier_name: 'CleanCo Supplies',
    supplier_id: 'VEND001',
    last_ordered_date: '2025-01-05',
    last_received_date: '2025-01-08',
    expiration_date: '2026-01-08',
    sds_required: true,
    sds_document_id: 'SDS001',
    notes: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2025-01-08T10:00:00Z',
  },
  {
    id: 'SUP002',
    organization_id: 'org1',
    item_code: '6100002',
    item_name: 'Paper Towels',
    category: 'facility',
    status: 'low_stock',
    facility_id: 'FAC001',
    location: 'Janitor Closet A',
    unit_of_measure: 'case',
    quantity_on_hand: 3,
    minimum_quantity: 5,
    reorder_quantity: 10,
    unit_cost: 45.00,
    supplier_name: 'Office Essentials',
    supplier_id: 'VEND002',
    last_ordered_date: '2025-01-10',
    last_received_date: null,
    expiration_date: null,
    sds_required: false,
    sds_document_id: null,
    notes: 'Order placed, awaiting delivery',
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2025-01-15T14:00:00Z',
  },
  {
    id: 'SUP003',
    organization_id: 'org1',
    item_code: '6200001',
    item_name: 'Nitrile Gloves (Medium)',
    category: 'ppe',
    status: 'in_stock',
    facility_id: 'FAC001',
    location: 'PPE Storage',
    unit_of_measure: 'box',
    quantity_on_hand: 25,
    minimum_quantity: 10,
    reorder_quantity: 20,
    unit_cost: 12.50,
    supplier_name: 'Safety First Supply',
    supplier_id: 'VEND003',
    last_ordered_date: '2025-01-02',
    last_received_date: '2025-01-05',
    expiration_date: '2027-01-05',
    sds_required: false,
    sds_document_id: null,
    notes: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2025-01-05T09:00:00Z',
  },
];

const MOCK_INSPECTIONS: SanitationInspection[] = [
  {
    id: 'SANI001',
    organization_id: 'org1',
    inspection_number: 'SANI-2501-0001',
    inspection_type: 'routine',
    status: 'completed',
    result: 'pass',
    facility_id: 'FAC001',
    area: 'restroom',
    location: 'Building A - All Restrooms',
    scheduled_date: '2025-01-17',
    inspection_date: '2025-01-17',
    inspector_name: 'Quality Supervisor',
    inspector_id: 'EMP004',
    checklist_items: [
      { item: 'Floors clean', result: 'pass' },
      { item: 'Fixtures clean', result: 'pass' },
      { item: 'Supplies stocked', result: 'pass' },
      { item: 'No odors', result: 'pass' },
    ],
    findings: [],
    deficiencies_found: 0,
    score: 100,
    corrective_actions_required: false,
    corrective_actions: null,
    follow_up_date: null,
    follow_up_completed: false,
    photos: [],
    notes: 'All areas passed inspection',
    reviewed_by: null,
    reviewed_by_id: null,
    reviewed_at: null,
    created_at: '2025-01-17T10:00:00Z',
    updated_at: '2025-01-17T10:30:00Z',
  },
];

export function useSupabaseSanitation() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const tasksQuery = useQuery({
    queryKey: ['sanitation_tasks', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_TASKS;
      console.log('[useSupabaseSanitation] Fetching sanitation tasks');

      const { data, error } = await supabase
        .from('sanitation_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.log('[useSupabaseSanitation] Using mock data - table may not exist yet');
        return MOCK_TASKS;
      }
      return (data?.length ? data : MOCK_TASKS) as SanitationTask[];
    },
    enabled: true,
  });

  const pendingTasksQuery = useQuery({
    queryKey: ['sanitation_tasks', 'pending', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_TASKS.filter(t => t.status === 'pending' || t.status === 'in_progress');
      console.log('[useSupabaseSanitation] Fetching pending sanitation tasks');

      const { data, error } = await supabase
        .from('sanitation_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      if (error) {
        return MOCK_TASKS.filter(t => t.status === 'pending' || t.status === 'in_progress');
      }
      const result = data?.length ? data : MOCK_TASKS.filter(t => t.status === 'pending' || t.status === 'in_progress');
      return result as SanitationTask[];
    },
    enabled: true,
  });

  const schedulesQuery = useQuery({
    queryKey: ['sanitation_schedules', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_SCHEDULES;
      console.log('[useSupabaseSanitation] Fetching sanitation schedules');

      const { data, error } = await supabase
        .from('sanitation_schedules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('schedule_name', { ascending: true });

      if (error) {
        console.log('[useSupabaseSanitation] Using mock schedules data');
        return MOCK_SCHEDULES;
      }
      return (data?.length ? data : MOCK_SCHEDULES) as SanitationSchedule[];
    },
    enabled: true,
  });

  const suppliesQuery = useQuery({
    queryKey: ['sanitation_supplies', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_SUPPLIES;
      console.log('[useSupabaseSanitation] Fetching sanitation supplies');

      const { data, error } = await supabase
        .from('sanitation_supplies')
        .select('*')
        .eq('organization_id', organizationId)
        .order('item_name', { ascending: true });

      if (error) {
        console.log('[useSupabaseSanitation] Using mock supplies data');
        return MOCK_SUPPLIES;
      }
      return (data?.length ? data : MOCK_SUPPLIES) as SanitationSupply[];
    },
    enabled: true,
  });

  const lowStockSuppliesQuery = useQuery({
    queryKey: ['sanitation_supplies', 'low_stock', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_SUPPLIES.filter(s => s.status === 'low_stock' || s.status === 'out_of_stock');
      console.log('[useSupabaseSanitation] Fetching low stock supplies');

      const { data, error } = await supabase
        .from('sanitation_supplies')
        .select('*')
        .eq('organization_id', organizationId)
        .in('status', ['low_stock', 'out_of_stock'])
        .order('status', { ascending: true });

      if (error) {
        return MOCK_SUPPLIES.filter(s => s.status === 'low_stock' || s.status === 'out_of_stock');
      }
      const result = data?.length ? data : MOCK_SUPPLIES.filter(s => s.status === 'low_stock' || s.status === 'out_of_stock');
      return result as SanitationSupply[];
    },
    enabled: true,
  });

  const inspectionsQuery = useQuery({
    queryKey: ['sanitation_inspections', organizationId],
    queryFn: async () => {
      if (!organizationId) return MOCK_INSPECTIONS;
      console.log('[useSupabaseSanitation] Fetching sanitation inspections');

      const { data, error } = await supabase
        .from('sanitation_inspections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('inspection_date', { ascending: false });

      if (error) {
        console.log('[useSupabaseSanitation] Using mock inspections data');
        return MOCK_INSPECTIONS;
      }
      return (data?.length ? data : MOCK_INSPECTIONS) as SanitationInspection[];
    },
    enabled: true,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSanitation] Creating task:', input.task_number);

      const { data, error } = await supabase
        .from('sanitation_tasks')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SanitationTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitation_tasks'] });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SanitationTask> & { id: string }) => {
      console.log('[useSupabaseSanitation] Updating task:', id);

      const { data, error } = await supabase
        .from('sanitation_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SanitationTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitation_tasks'] });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, completedBy, completedById, result, notes }: { id: string; completedBy: string; completedById?: string; result: SanitationResult; notes?: string }) => {
      console.log('[useSupabaseSanitation] Completing task:', id);

      const { data, error } = await supabase
        .from('sanitation_tasks')
        .update({
          status: 'completed' as SanitationTaskStatus,
          completed_at: new Date().toISOString(),
          completed_by: completedBy,
          completed_by_id: completedById || null,
          result,
          notes: notes || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SanitationTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitation_tasks'] });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (input: CreateScheduleInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSanitation] Creating schedule:', input.schedule_name);

      const { data, error } = await supabase
        .from('sanitation_schedules')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SanitationSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitation_schedules'] });
    },
  });

  const updateSupplyMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SanitationSupply> & { id: string }) => {
      console.log('[useSupabaseSanitation] Updating supply:', id);

      const { data, error } = await supabase
        .from('sanitation_supplies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SanitationSupply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitation_supplies'] });
    },
  });

  const createInspectionMutation = useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseSanitation] Creating inspection:', input.inspection_number);

      const { data, error } = await supabase
        .from('sanitation_inspections')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SanitationInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sanitation_inspections'] });
    },
  });

  const generateTaskNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SAN-${year}${month}-${random}`;
  };

  const generateInspectionNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SANI-${year}${month}-${random}`;
  };

  const getTasksByArea = (area: SanitationArea) => {
    return tasksQuery.data?.filter(task => task.area === area) || [];
  };

  const getTasksByStatus = (status: SanitationTaskStatus) => {
    return tasksQuery.data?.filter(task => task.status === status) || [];
  };

  const getTodaysTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasksQuery.data?.filter(task => task.scheduled_date === today) || [];
  };

  const getOverdueTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasksQuery.data?.filter(task => 
      task.due_date && 
      task.due_date < today &&
      task.status !== 'completed' &&
      task.status !== 'skipped'
    ) || [];
  };

  const getComplianceRate = () => {
    const tasks = tasksQuery.data || [];
    const completedOnTime = tasks.filter(t => 
      t.status === 'completed' && 
      t.completed_at && 
      t.due_date &&
      t.completed_at.split('T')[0] <= t.due_date
    ).length;
    const totalCompleted = tasks.filter(t => t.status === 'completed').length;
    return totalCompleted > 0 ? Math.round((completedOnTime / totalCompleted) * 100) : 100;
  };

  return {
    tasks: tasksQuery.data || [],
    pendingTasks: pendingTasksQuery.data || [],
    schedules: schedulesQuery.data || [],
    supplies: suppliesQuery.data || [],
    lowStockSupplies: lowStockSuppliesQuery.data || [],
    inspections: inspectionsQuery.data || [],
    isLoading: tasksQuery.isLoading || suppliesQuery.isLoading,

    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    completeTask: completeTaskMutation.mutateAsync,
    createSchedule: createScheduleMutation.mutateAsync,
    updateSupply: updateSupplyMutation.mutateAsync,
    createInspection: createInspectionMutation.mutateAsync,

    generateTaskNumber,
    generateInspectionNumber,
    getTasksByArea,
    getTasksByStatus,
    getTodaysTasks,
    getOverdueTasks,
    getComplianceRate,

    refetch: () => {
      tasksQuery.refetch();
      pendingTasksQuery.refetch();
      schedulesQuery.refetch();
      suppliesQuery.refetch();
      lowStockSuppliesQuery.refetch();
      inspectionsQuery.refetch();
    },
  };
}
