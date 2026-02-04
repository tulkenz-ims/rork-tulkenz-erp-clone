import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  type Material, 
  type InventoryLabel,
  type InventoryHistory,
  type CountSession,
  type CountSessionItem,
  type Asset,
  type PartUsage,
} from '@/mocks/inventoryData';
import {
  DEFAULT_APPROVAL_SETTINGS,
  DEFAULT_TIME_OFF_SETTINGS,
  type WorkOrder,
  type PurchaseOrder,
  type Approval,
  type PurchaseApproval,
  type TimeApproval,
  type PermitApproval,
  type ApprovalSettings,
  type TimeOffSettings,
  type TimeOffBalances,
  type Task,
  type Employee,
  type Shift,
  type TimeEntry,
  type TimeOffRequest,
  type ShiftSwapRequest,
  type TimePunch,
  type EmployeeAvailability,
  type BulletinPost,
  type EmployeeProfile,
} from '@/mocks/dashboardData';
import {
  FREQUENCY_DAYS,
  type Equipment,
  type PMSchedule,
  type PMWorkOrder,
  type PMTaskCompletion,
  type PMPartUsed,
} from '@/mocks/maintenanceData';
import {
  FREQUENCY_DAYS as INSPECTION_FREQUENCY_DAYS,
  type InspectionTemplate,
  type TrackedItem,
  type InspectionRecord,
  type TrackedItemChange,
  type InspectionSchedule,
  type InspectionAttachment,
  type InspectionFrequency,
} from '@/mocks/inspectionData';
import {
  type BulbRecord,
  type BatteryRecord,
  type MetalRecord,
  type CardboardRecord,
  type PaperRecord,
  type TonerRecord,
  type RecyclingFile,
  type RecyclingCategory,
} from '@/mocks/recyclingData';
import {
  TASK_LOCATIONS,
  TASK_CATEGORIES,
  type TaskVerification,
  type TaskLocation,
  type TaskCategory,
} from '@/mocks/taskVerificationData';
import {
  type Vendor,
  type VendorPriceAgreement,
} from '@/mocks/vendorsData';
import { getDepartmentName } from '@/constants/organizationCodes';
import { getNextMaterialNumber } from '@/constants/inventoryDepartmentCodes';
import {
  type JobRequisition,
  type Candidate,
  type Application,
  type Interview,
  type Offer,
  type CandidateNote,
} from '@/mocks/recruitingData';
import {
  type WorkOrderPartRequest,
  type PartIssueRecord,
  type PartReturnRecord,
  type PartRequestStatus,
  type LowStockAlert,
  type AlertAction,
  type LowStockAlertStatus,
  type LowStockAlertSeverity,
  type LowStockAlertSummary,
  generatePartRequestNumber,
  generateIssueNumber,
} from '@/mocks/partsToWorkOrderData';
import {
  type PerformanceReview,
  type Goal,
  type Feedback360,
  type SuccessionPlan,
  type TalentProfile,
} from '@/mocks/performanceData';
import {
  type AlertPreferences,
  DEFAULT_ALERT_PREFERENCES,
} from '@/types/alertPreferences';

const ERP_STORAGE_KEY = 'tulkenz_erp_data';

interface ERPData {
  materials: Material[];
  inventoryLabels: InventoryLabel[];
  inventoryHistory: InventoryHistory[];
  countSessions: CountSession[];
  assets: Asset[];
  partUsage: PartUsage[];
  workOrders: WorkOrder[];
  purchaseOrders: PurchaseOrder[];
  approvals: Approval[];
  tasks: Task[];
  employees: Employee[];
  approvalSettings: ApprovalSettings;
  timeOffSettings: TimeOffSettings;
  shifts: Shift[];
  timeEntries: TimeEntry[];
  timeOffRequests: TimeOffRequest[];
  shiftSwapRequests: ShiftSwapRequest[];
  timePunches: TimePunch[];
  bulletinPosts: BulletinPost[];
  equipment: Equipment[];
  pmSchedules: PMSchedule[];
  pmWorkOrders: PMWorkOrder[];
  inspectionTemplates: InspectionTemplate[];
  trackedItems: TrackedItem[];
  inspectionRecords: InspectionRecord[];
  trackedItemChanges: TrackedItemChange[];
  inspectionSchedules: InspectionSchedule[];
  inspectionAttachments: InspectionAttachment[];
  bulbRecords: BulbRecord[];
  batteryRecords: BatteryRecord[];
  metalRecords: MetalRecord[];
  cardboardRecords: CardboardRecord[];
  paperRecords: PaperRecord[];
  tonerRecords: TonerRecord[];
  recyclingFiles: RecyclingFile[];
  taskVerifications: TaskVerification[];
  taskLocations: TaskLocation[];
  taskCategories: TaskCategory[];
  vendors: Vendor[];
  priceAgreements: VendorPriceAgreement[];
  jobRequisitions: JobRequisition[];
  candidates: Candidate[];
  applications: Application[];
  interviews: Interview[];
  offers: Offer[];
  candidateNotes: CandidateNote[];
  performanceReviews: PerformanceReview[];
  goals: Goal[];
  feedback360: Feedback360[];
  successionPlans: SuccessionPlan[];
  talentProfiles: TalentProfile[];
  partRequests: WorkOrderPartRequest[];
  partIssues: PartIssueRecord[];
  partReturns: PartReturnRecord[];
  lowStockAlerts: LowStockAlert[];
  alertActions: AlertAction[];
  alertPreferences: AlertPreferences;
}

const defaultData: ERPData = {
  materials: [],
  inventoryLabels: [],
  inventoryHistory: [],
  countSessions: [],
  assets: [],
  partUsage: [],
  workOrders: [],
  purchaseOrders: [],
  approvals: [],
  tasks: [],
  employees: [],
  approvalSettings: DEFAULT_APPROVAL_SETTINGS,
  timeOffSettings: DEFAULT_TIME_OFF_SETTINGS,
  shifts: [],
  timeEntries: [],
  timeOffRequests: [],
  shiftSwapRequests: [],
  timePunches: [],
  bulletinPosts: [],
  equipment: [],
  pmSchedules: [],
  pmWorkOrders: [],
  inspectionTemplates: [],
  trackedItems: [],
  inspectionRecords: [],
  trackedItemChanges: [],
  inspectionSchedules: [],
  inspectionAttachments: [],
  bulbRecords: [],
  batteryRecords: [],
  metalRecords: [],
  cardboardRecords: [],
  paperRecords: [],
  tonerRecords: [],
  recyclingFiles: [],
  taskVerifications: [],
  taskLocations: TASK_LOCATIONS,
  taskCategories: TASK_CATEGORIES,
  vendors: [],
  priceAgreements: [],
  jobRequisitions: [],
  candidates: [],
  applications: [],
  interviews: [],
  offers: [],
  candidateNotes: [],
  performanceReviews: [],
  goals: [],
  feedback360: [],
  successionPlans: [],
  talentProfiles: [],
  partRequests: [],
  partIssues: [],
  partReturns: [],
  lowStockAlerts: [],
  alertActions: [],
  alertPreferences: DEFAULT_ALERT_PREFERENCES,
};

export const [ERPProvider, useERP] = createContextHook(() => {
  const queryClient = useQueryClient();

  const { data: erpData = defaultData, isLoading } = useQuery({
    queryKey: ['erp-data'],
    queryFn: async (): Promise<ERPData> => {
      try {
        const stored = await AsyncStorage.getItem(ERP_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultData, ...parsed };
        }
        return defaultData;
      } catch (error) {
        console.error('Error loading ERP data:', error);
        return defaultData;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const { mutate: saveData } = useMutation({
    mutationFn: async (newData: ERPData) => {
      await AsyncStorage.setItem(ERP_STORAGE_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: (newData) => {
      queryClient.setQueryData(['erp-data'], newData);
    },
  });

  const updateData = useCallback((updates: Partial<ERPData>) => {
    const newData = { ...erpData, ...updates };
    saveData(newData);
  }, [erpData, saveData]);

  const addHistoryEntry = useCallback((entry: Omit<InventoryHistory, 'id' | 'timestamp'>) => {
    const newEntry: InventoryHistory = {
      ...entry,
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    updateData({ inventoryHistory: [newEntry, ...erpData.inventoryHistory] });
    return newEntry;
  }, [erpData.inventoryHistory, updateData]);

  const addMaterial = useCallback((material: Omit<Material, 'id'>) => {
    // Auto-generate material number based on department if not provided
    let materialNumber = material.materialNumber;
    if (!materialNumber && material.inventoryDepartment) {
      const existingNumbers = erpData.materials.map(m => m.materialNumber);
      materialNumber = getNextMaterialNumber(material.inventoryDepartment, existingNumbers);
      console.log(`Auto-generated material number for dept ${material.inventoryDepartment}: ${materialNumber}`);
    }
    
    const newMaterial: Material = {
      ...material,
      id: `mat-${Date.now()}`,
      materialNumber: materialNumber || material.materialNumber,
      createdAt: material.createdAt || new Date().toISOString().split('T')[0],
    };
    updateData({ materials: [...erpData.materials, newMaterial] });
    
    addHistoryEntry({
      material_id: newMaterial.id,
      material_name: newMaterial.name,
      material_sku: newMaterial.sku,
      action: 'create',
      quantity_before: 0,
      quantity_after: newMaterial.on_hand,
      quantity_change: newMaterial.on_hand,
      reason: 'New material created',
      performed_by: 'System User',
    });
    
    return newMaterial;
  }, [erpData.materials, updateData, addHistoryEntry]);

  const updateMaterial = useCallback((id: string, updates: Partial<Material>) => {
    const material = erpData.materials.find(m => m.id === id);
    const updated = erpData.materials.map(m => 
      m.id === id ? { ...m, ...updates } : m
    );
    updateData({ materials: updated });
    
    if (material && updates.on_hand !== undefined && updates.on_hand !== material.on_hand) {
      addHistoryEntry({
        material_id: id,
        material_name: material.name,
        material_sku: material.sku,
        action: 'adjustment',
        quantity_before: material.on_hand,
        quantity_after: updates.on_hand,
        quantity_change: updates.on_hand - material.on_hand,
        reason: 'Manual update',
        performed_by: 'System User',
      });
    }
  }, [erpData.materials, updateData, addHistoryEntry]);

  const deleteMaterial = useCallback((id: string) => {
    const material = erpData.materials.find(m => m.id === id);
    updateData({ materials: erpData.materials.filter(m => m.id !== id) });
    
    if (material) {
      addHistoryEntry({
        material_id: id,
        material_name: material.name,
        material_sku: material.sku,
        action: 'delete',
        quantity_before: material.on_hand,
        quantity_after: 0,
        quantity_change: -material.on_hand,
        reason: 'Material deleted',
        performed_by: 'System User',
      });
    }
  }, [erpData.materials, updateData, addHistoryEntry]);

  const quickAdjust = useCallback((id: string, newQuantity: number, reason: string, actionType: 'adjustment' | 'receive' | 'issue' | 'transfer' = 'adjustment') => {
    const material = erpData.materials.find(m => m.id === id);
    if (!material) return;

    const updated = erpData.materials.map(m => 
      m.id === id ? { ...m, on_hand: newQuantity, last_adjusted: new Date().toISOString().split('T')[0] } : m
    );
    updateData({ materials: updated });

    addHistoryEntry({
      material_id: id,
      material_name: material.name,
      material_sku: material.sku,
      action: actionType,
      quantity_before: material.on_hand,
      quantity_after: newQuantity,
      quantity_change: newQuantity - material.on_hand,
      reason,
      performed_by: 'System User',
    });
  }, [erpData.materials, updateData, addHistoryEntry]);

  const addLabel = useCallback((label: Omit<InventoryLabel, 'id' | 'created_at'>) => {
    const newLabel: InventoryLabel = {
      ...label,
      id: `lbl-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ inventoryLabels: [...erpData.inventoryLabels, newLabel] });
    return newLabel;
  }, [erpData.inventoryLabels, updateData]);

  const updateLabel = useCallback((id: string, updates: Partial<InventoryLabel>) => {
    const updated = erpData.inventoryLabels.map(l => 
      l.id === id ? { ...l, ...updates } : l
    );
    updateData({ inventoryLabels: updated });
  }, [erpData.inventoryLabels, updateData]);

  const deleteLabel = useCallback((id: string) => {
    const label = erpData.inventoryLabels.find(l => l.id === id);
    if (!label) return;

    const updatedMaterials = erpData.materials.map(m => ({
      ...m,
      labels: m.labels?.filter(l => l !== label.name) || [],
    }));

    updateData({ 
      inventoryLabels: erpData.inventoryLabels.filter(l => l.id !== id),
      materials: updatedMaterials,
    });
  }, [erpData.inventoryLabels, erpData.materials, updateData]);

  const assignLabel = useCallback((materialId: string, labelName: string) => {
    const updated = erpData.materials.map(m => {
      if (m.id === materialId) {
        const labels = m.labels || [];
        if (!labels.includes(labelName)) {
          return { ...m, labels: [...labels, labelName] };
        }
      }
      return m;
    });
    updateData({ materials: updated });
  }, [erpData.materials, updateData]);

  const removeLabel = useCallback((materialId: string, labelName: string) => {
    const updated = erpData.materials.map(m => {
      if (m.id === materialId) {
        return { ...m, labels: m.labels?.filter(l => l !== labelName) || [] };
      }
      return m;
    });
    updateData({ materials: updated });
  }, [erpData.materials, updateData]);

  const createCountSession = useCallback((session: Omit<CountSession, 'id' | 'created_at' | 'items' | 'total_items' | 'counted_items' | 'variance_count'>, categoryFilter?: string) => {
    let itemsToCount = erpData.materials.filter(m => m.facility_name === session.facility);
    if (categoryFilter) {
      itemsToCount = itemsToCount.filter(m => m.category === categoryFilter);
    }

    const items: CountSessionItem[] = itemsToCount.map(m => ({
      material_id: m.id,
      material_name: m.name,
      material_sku: m.sku,
      expected_quantity: m.on_hand,
      counted: false,
    }));

    const newSession: CountSession = {
      ...session,
      id: `cs-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
      items,
      total_items: items.length,
      counted_items: 0,
      variance_count: 0,
      category: categoryFilter,
    };

    updateData({ countSessions: [...erpData.countSessions, newSession] });
    return newSession;
  }, [erpData.materials, erpData.countSessions, updateData]);

  const updateCountSession = useCallback((id: string, updates: Partial<CountSession>) => {
    const updated = erpData.countSessions.map(cs => 
      cs.id === id ? { ...cs, ...updates } : cs
    );
    updateData({ countSessions: updated });
  }, [erpData.countSessions, updateData]);

  const recordCount = useCallback((sessionId: string, materialId: string, countedQuantity: number, notes?: string) => {
    const session = erpData.countSessions.find(cs => cs.id === sessionId);
    if (!session) return;

    const updatedItems = session.items.map(item => {
      if (item.material_id === materialId) {
        const variance = countedQuantity - item.expected_quantity;
        return {
          ...item,
          counted_quantity: countedQuantity,
          variance,
          counted: true,
          counted_at: new Date().toISOString(),
          counted_by: 'System User',
          notes,
        };
      }
      return item;
    });

    const countedItems = updatedItems.filter(i => i.counted).length;
    const varianceCount = updatedItems.filter(i => i.counted && i.variance !== 0).length;

    const updatedSession: CountSession = {
      ...session,
      items: updatedItems,
      counted_items: countedItems,
      variance_count: varianceCount,
      status: countedItems === session.total_items ? 'completed' : 'in_progress',
      started_at: session.started_at || new Date().toISOString(),
      completed_at: countedItems === session.total_items ? new Date().toISOString() : undefined,
    };

    updateData({ 
      countSessions: erpData.countSessions.map(cs => cs.id === sessionId ? updatedSession : cs) 
    });

    const material = erpData.materials.find(m => m.id === materialId);
    if (material) {
      addHistoryEntry({
        material_id: materialId,
        material_name: material.name,
        material_sku: material.sku,
        action: 'count',
        quantity_before: material.on_hand,
        quantity_after: countedQuantity,
        quantity_change: countedQuantity - material.on_hand,
        reason: `Count session: ${session.name}`,
        performed_by: 'System User',
        notes,
      });
    }
  }, [erpData.countSessions, erpData.materials, updateData, addHistoryEntry]);

  const applyCountVariances = useCallback((sessionId: string) => {
    const session = erpData.countSessions.find(cs => cs.id === sessionId);
    if (!session) return;

    const updatedMaterials = erpData.materials.map(m => {
      const countItem = session.items.find(i => i.material_id === m.id && i.counted);
      if (countItem && countItem.counted_quantity !== undefined) {
        return { 
          ...m, 
          on_hand: countItem.counted_quantity,
          last_counted: new Date().toISOString().split('T')[0],
        };
      }
      return m;
    });

    updateData({ materials: updatedMaterials });
  }, [erpData.countSessions, erpData.materials, updateData]);

  const deleteCountSession = useCallback((id: string) => {
    updateData({ countSessions: erpData.countSessions.filter(cs => cs.id !== id) });
  }, [erpData.countSessions, updateData]);

  const addWorkOrder = useCallback((workOrder: Omit<WorkOrder, 'id' | 'created_at'>) => {
    const newWorkOrder: WorkOrder = {
      ...workOrder,
      id: `wo-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ workOrders: [...erpData.workOrders, newWorkOrder] });
    return newWorkOrder;
  }, [erpData.workOrders, updateData]);

  const updateWorkOrder = useCallback((id: string, updates: Partial<WorkOrder>) => {
    const updated = erpData.workOrders.map(wo => 
      wo.id === id ? { ...wo, ...updates } : wo
    );
    updateData({ workOrders: updated });
  }, [erpData.workOrders, updateData]);

  const deleteWorkOrder = useCallback((id: string) => {
    updateData({ workOrders: erpData.workOrders.filter(wo => wo.id !== id) });
  }, [erpData.workOrders, updateData]);

  const completeWorkOrder = useCallback((id: string, completionData: {
    completedById?: string;
    completedByName?: string;
    laborHours?: number;
    completionNotes?: string;
    partsUsed?: { materialId: string; materialName: string; quantity: number }[];
  }) => {
    const workOrder = erpData.workOrders.find(wo => wo.id === id);
    if (!workOrder) {
      console.error('Work order not found:', id);
      return null;
    }

    const completedAt = new Date().toISOString();
    const updated = erpData.workOrders.map(wo =>
      wo.id === id ? {
        ...wo,
        status: 'completed' as const,
        completed_at: completedAt,
        completed_by: completionData.completedById,
        labor_hours: completionData.laborHours,
        completion_notes: completionData.completionNotes,
      } : wo
    );

    const locationMatch = erpData.taskLocations.find(loc =>
      workOrder.facility_id?.toLowerCase().includes(loc.facilityCode?.toLowerCase() || '') ||
      loc.name.toLowerCase().includes('maint')
    ) || erpData.taskLocations.find(loc => loc.id === 'loc-maint');

    const taskVerification: TaskVerification = {
      id: `tv-wo-${Date.now()}`,
      departmentCode: '1001',
      departmentName: getDepartmentName('1001'),
      facilityCode: workOrder.facility_id || 'FAC-001',
      locationId: locationMatch?.id || 'loc-maint',
      locationName: locationMatch?.name || 'Maintenance',
      categoryId: 'cat-wo-complete',
      categoryName: 'Work Order Completed',
      action: 'Work Order Completed',
      notes: `WO: ${workOrder.title}\nPriority: ${workOrder.priority}${completionData.laborHours ? `\nLabor Hours: ${completionData.laborHours}` : ''}${completionData.completionNotes ? `\nNotes: ${completionData.completionNotes}` : ''}`,
      employeeId: completionData.completedById || workOrder.assigned_to || 'system',
      employeeName: completionData.completedByName || 'System',
      createdAt: completedAt,
      status: 'verified',
      sourceType: 'work_order',
      sourceId: workOrder.id,
      sourceNumber: `WO-${workOrder.id.slice(-6).toUpperCase()}`,
    };

    let updatedMaterials = [...erpData.materials];
    let updatedPartRequests = [...erpData.partRequests];
    const newHistoryEntries: Omit<InventoryHistory, 'id' | 'timestamp'>[] = [];
    const consumedPartsSummary: { name: string; sku: string; quantity: number; cost: number }[] = [];

    const linkedPartRequests = erpData.partRequests.filter(
      pr => pr.workOrderId === id && (pr.status === 'approved' || pr.status === 'partially_issued' || pr.status === 'issued')
    );

    linkedPartRequests.forEach(partRequest => {
      partRequest.lines.forEach(line => {
        if (line.status === 'issued' || line.status === 'consumed') {
          const quantityToDeduct = line.quantityIssued - line.quantityReturned;
          if (quantityToDeduct > 0) {
            const material = updatedMaterials.find(m => m.id === line.materialId);
            if (material) {
              const newOnHand = Math.max(0, material.on_hand - quantityToDeduct);
              const actualDeduction = material.on_hand - newOnHand;
              
              if (actualDeduction > 0) {
                updatedMaterials = updatedMaterials.map(m =>
                  m.id === line.materialId ? { ...m, on_hand: newOnHand, last_adjusted: new Date().toISOString().split('T')[0] } : m
                );

                newHistoryEntries.push({
                  material_id: line.materialId,
                  material_name: line.materialName,
                  material_sku: line.materialSku,
                  action: 'issue',
                  quantity_before: material.on_hand,
                  quantity_after: newOnHand,
                  quantity_change: -actualDeduction,
                  reason: `Auto-deducted on WO completion: ${workOrder.title}`,
                  performed_by: completionData.completedByName || 'System',
                  notes: `Part Request: ${partRequest.requestNumber}`,
                });

                consumedPartsSummary.push({
                  name: line.materialName,
                  sku: line.materialSku,
                  quantity: actualDeduction,
                  cost: actualDeduction * line.unitCost,
                });

                console.log(`Auto-deducted ${actualDeduction} x ${line.materialName} from inventory for WO: ${workOrder.title}`);
              }
            }
          }
        }
      });

      updatedPartRequests = updatedPartRequests.map(pr =>
        pr.id === partRequest.id ? { ...pr, status: 'completed' as PartRequestStatus, updatedAt: completedAt } : pr
      );
    });

    if (completionData.partsUsed && completionData.partsUsed.length > 0) {
      completionData.partsUsed.forEach(part => {
        const alreadyDeducted = consumedPartsSummary.find(p => p.sku === erpData.materials.find(m => m.id === part.materialId)?.sku);
        if (!alreadyDeducted) {
          const material = updatedMaterials.find(m => m.id === part.materialId);
          if (material && material.on_hand >= part.quantity) {
            updatedMaterials = updatedMaterials.map(m =>
              m.id === part.materialId ? { ...m, on_hand: m.on_hand - part.quantity, last_adjusted: new Date().toISOString().split('T')[0] } : m
            );
            
            newHistoryEntries.push({
              material_id: part.materialId,
              material_name: part.materialName,
              material_sku: material.sku,
              action: 'issue',
              quantity_before: material.on_hand,
              quantity_after: material.on_hand - part.quantity,
              quantity_change: -part.quantity,
              reason: `Used on Work Order: ${workOrder.title}`,
              performed_by: completionData.completedByName || 'System',
            });

            consumedPartsSummary.push({
              name: part.materialName,
              sku: material.sku,
              quantity: part.quantity,
              cost: part.quantity * material.unit_price,
            });
          }
        }
      });
    }

    const historyWithIds: InventoryHistory[] = newHistoryEntries.map((entry, idx) => ({
      ...entry,
      id: `hist-wo-${Date.now()}-${idx}`,
      timestamp: new Date().toISOString(),
    }));

    if (consumedPartsSummary.length > 0) {
      const totalPartsCost = consumedPartsSummary.reduce((sum, p) => sum + p.cost, 0);
      taskVerification.notes += `\n\nParts Consumed (${consumedPartsSummary.length} items, ${totalPartsCost.toFixed(2)} total):\n` +
        consumedPartsSummary.map(p => `• ${p.quantity}x ${p.name} (${p.cost.toFixed(2)})`).join('\n');
    }

    updateData({
      workOrders: updated,
      materials: updatedMaterials,
      partRequests: updatedPartRequests,
      inventoryHistory: [...historyWithIds, ...erpData.inventoryHistory],
      taskVerifications: [taskVerification, ...erpData.taskVerifications],
    });

    console.log('Work Order completed and auto-posted to Task Feed:', taskVerification.id);
    if (consumedPartsSummary.length > 0) {
      console.log('Parts auto-deducted:', consumedPartsSummary);
    }
    
    return { workOrder, consumedParts: consumedPartsSummary };
  }, [erpData.workOrders, erpData.taskLocations, erpData.taskVerifications, erpData.materials, erpData.partRequests, erpData.inventoryHistory, updateData]);

  const addPurchaseOrder = useCallback((po: Omit<PurchaseOrder, 'id' | 'created_at'>) => {
    const newPO: PurchaseOrder = {
      ...po,
      id: `po-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ purchaseOrders: [...erpData.purchaseOrders, newPO] });
    return newPO;
  }, [erpData.purchaseOrders, updateData]);

  const updatePurchaseOrder = useCallback((id: string, updates: Partial<PurchaseOrder>) => {
    const updated = erpData.purchaseOrders.map(po => 
      po.id === id ? { ...po, ...updates } : po
    );
    updateData({ purchaseOrders: updated });
  }, [erpData.purchaseOrders, updateData]);

  const deletePurchaseOrder = useCallback((id: string) => {
    updateData({ purchaseOrders: erpData.purchaseOrders.filter(po => po.id !== id) });
  }, [erpData.purchaseOrders, updateData]);

  const addPurchaseApproval = useCallback((approval: Omit<PurchaseApproval, 'id' | 'created_at'>) => {
    const newApproval: PurchaseApproval = {
      ...approval,
      id: `apr-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ approvals: [...erpData.approvals, newApproval] });
    return newApproval;
  }, [erpData.approvals, updateData]);

  const addTimeApproval = useCallback((approval: Omit<TimeApproval, 'id' | 'created_at'>) => {
    const newApproval: TimeApproval = {
      ...approval,
      id: `apr-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ approvals: [...erpData.approvals, newApproval] });
    return newApproval;
  }, [erpData.approvals, updateData]);

  const updateApprovalSettings = useCallback((settings: Partial<ApprovalSettings>) => {
    updateData({ approvalSettings: { ...erpData.approvalSettings, ...settings } });
  }, [erpData.approvalSettings, updateData]);

  const calculateRequiredTier = useCallback((amount: number): 1 | 2 | 3 => {
    const { tierThresholds, purchaseApprovalTier } = erpData.approvalSettings;
    if (purchaseApprovalTier === 'none') return 1;
    if (amount <= tierThresholds.tier1Limit) return 1;
    if (purchaseApprovalTier === 'single') return 1;
    if (amount <= tierThresholds.tier2Limit) return 2;
    if (purchaseApprovalTier === 'double') return 2;
    return 3;
  }, [erpData.approvalSettings]);

  const approvePurchaseTier = useCallback((approvalId: string, tier: 1 | 2 | 3, approverName: string, approverId: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type === 'purchase') {
        const purchaseApproval = a as PurchaseApproval;
        const newChain = purchaseApproval.approvalChain.map(entry => {
          if (entry.tier === tier) {
            return { ...entry, status: 'approved' as const, approverName, approverId, approvedAt: new Date().toISOString() };
          }
          return entry;
        });
        const allApproved = newChain.every(e => e.status === 'approved');
        const anyApproved = newChain.some(e => e.status === 'approved');
        return {
          ...purchaseApproval,
          approvalChain: newChain,
          status: allApproved ? 'approved' as const : anyApproved ? 'partially_approved' as const : 'pending' as const,
        };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const rejectPurchaseTier = useCallback((approvalId: string, tier: 1 | 2 | 3, approverName: string, approverId: string, reason?: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type === 'purchase') {
        const purchaseApproval = a as PurchaseApproval;
        const newChain = purchaseApproval.approvalChain.map(entry => {
          if (entry.tier === tier) {
            return { ...entry, status: 'rejected' as const, approverName, approverId, rejectedAt: new Date().toISOString(), rejectionReason: reason };
          }
          return entry;
        });
        return { ...purchaseApproval, approvalChain: newChain, status: 'rejected' as const };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const approveTimeManager = useCallback((approvalId: string, managerName: string, managerId: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type !== 'purchase') {
        const timeApproval = a as TimeApproval;
        const newManagerApproval = { ...timeApproval.managerApproval, status: 'approved' as const, managerName, managerId, approvedAt: new Date().toISOString() };
        const hrApproved = !timeApproval.hrApproval?.required || timeApproval.hrApproval?.status === 'approved';
        return {
          ...timeApproval,
          managerApproval: newManagerApproval,
          status: hrApproved ? 'approved' as const : 'partially_approved' as const,
        };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const approveTimeHR = useCallback((approvalId: string, hrAdminName: string, hrAdminId: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type !== 'purchase') {
        const timeApproval = a as TimeApproval;
        if (!timeApproval.hrApproval) return a;
        const newHRApproval = { ...timeApproval.hrApproval, status: 'approved' as const, hrAdminName, hrAdminId, approvedAt: new Date().toISOString() };
        const managerApproved = timeApproval.managerApproval.status === 'approved';
        return {
          ...timeApproval,
          hrApproval: newHRApproval,
          status: managerApproved ? 'approved' as const : 'partially_approved' as const,
        };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const rejectTimeApproval = useCallback((approvalId: string, rejectorName: string, rejectorId: string, isHR: boolean, reason?: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type !== 'purchase' && a.type !== 'permit') {
        const timeApproval = a as TimeApproval;
        if (isHR && timeApproval.hrApproval) {
          return {
            ...timeApproval,
            hrApproval: { ...timeApproval.hrApproval, status: 'rejected' as const, hrAdminName: rejectorName, hrAdminId: rejectorId, rejectedAt: new Date().toISOString(), rejectionReason: reason },
            status: 'rejected' as const,
          };
        } else {
          return {
            ...timeApproval,
            managerApproval: { ...timeApproval.managerApproval, status: 'rejected' as const, managerName: rejectorName, managerId: rejectorId, rejectedAt: new Date().toISOString(), rejectionReason: reason },
            status: 'rejected' as const,
          };
        }
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const addPermitApproval = useCallback((approval: Omit<PermitApproval, 'id' | 'created_at'>) => {
    const newApproval: PermitApproval = {
      ...approval,
      id: `permit-apr-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    updateData({ approvals: [...erpData.approvals, newApproval] });
    return newApproval;
  }, [erpData.approvals, updateData]);

  const approvePermit = useCallback((approvalId: string, approverName: string, approverId: string, expirationHours: number = 8) => {
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();
    const permit = erpData.approvals.find(a => a.id === approvalId && a.type === 'permit') as PermitApproval | undefined;
    
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type === 'permit') {
        return {
          ...a,
          status: 'approved' as const,
          approvedBy: approverId,
          approvedByName: approverName,
          approvedAt: new Date().toISOString(),
          expiresAt,
        };
      }
      return a;
    });

    if (permit) {
      const locationMatch = erpData.taskLocations.find(loc => loc.id === 'loc-maint') || erpData.taskLocations[0];
      
      const taskVerification: TaskVerification = {
        id: `tv-permit-${Date.now()}`,
        departmentCode: '1005',
        departmentName: getDepartmentName('1005'),
        facilityCode: 'FAC-001',
        locationId: locationMatch?.id || 'loc-maint',
        locationName: locationMatch?.name || 'Maintenance Shop',
        categoryId: 'cat-permit-issued',
        categoryName: 'Permit Activity',
        action: 'Permit Approved',
        notes: `${permit.permitTypeName} approved for WO: ${permit.workOrderNumber}\nApproved by: ${approverName}\nExpires: ${new Date(expiresAt).toLocaleString()}`,
        employeeId: approverId,
        employeeName: approverName,
        createdAt: new Date().toISOString(),
        status: 'verified',
        sourceType: 'permit',
        sourceId: permit.id,
        sourceNumber: `PERMIT-${permit.id.slice(-6).toUpperCase()}`,
        permitType: permit.permitTypeName,
      };

      updateData({ 
        approvals: updated,
        taskVerifications: [taskVerification, ...erpData.taskVerifications],
      });
      
      console.log('Permit approved and auto-posted to Task Feed:', taskVerification.id);
    } else {
      updateData({ approvals: updated });
    }
  }, [erpData.approvals, erpData.taskLocations, erpData.taskVerifications, updateData]);

  const rejectPermit = useCallback((approvalId: string, rejectorName: string, rejectorId: string, reason?: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type === 'permit') {
        return {
          ...a,
          status: 'rejected' as const,
          rejectedBy: rejectorId,
          rejectedByName: rejectorName,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
        };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const resubmitPermit = useCallback((originalPermitId: string, requesterId: string, requesterName: string) => {
    const originalPermit = erpData.approvals.find(a => a.id === originalPermitId && a.type === 'permit') as PermitApproval | undefined;
    if (!originalPermit) return null;
    
    const newPermit: PermitApproval = {
      ...originalPermit,
      id: `permit-apr-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
      requesterId,
      requested_by: requesterName,
      approvedBy: undefined,
      approvedByName: undefined,
      approvedAt: undefined,
      expiresAt: undefined,
      rejectedBy: undefined,
      rejectedByName: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
    };
    updateData({ approvals: [...erpData.approvals, newPermit] });
    return newPermit;
  }, [erpData.approvals, updateData]);

  const getPermitHistory = useCallback((workOrderId?: string, permitTypeId?: string) => {
    return erpData.approvals.filter(a => {
      if (a.type !== 'permit') return false;
      const permit = a as PermitApproval;
      if (workOrderId && permit.workOrderId !== workOrderId) return false;
      if (permitTypeId && permit.permitTypeId !== permitTypeId) return false;
      return true;
    }) as PermitApproval[];
  }, [erpData.approvals]);

  const updateApprovalPONumber = useCallback((approvalId: string, poNumber: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type === 'purchase') {
        return { ...a, poNumber };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const updateApprovalMIGO = useCallback((approvalId: string, migoNumber: string) => {
    const updated = erpData.approvals.map(a => {
      if (a.id === approvalId && a.type === 'purchase') {
        return { ...a, migoNumber };
      }
      return a;
    });
    updateData({ approvals: updated });
  }, [erpData.approvals, updateData]);

  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}`,
    };
    updateData({ tasks: [...erpData.tasks, newTask] });
    return newTask;
  }, [erpData.tasks, updateData]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const updated = erpData.tasks.map(t => 
      t.id === id ? { ...t, ...updates } : t
    );
    updateData({ tasks: updated });
  }, [erpData.tasks, updateData]);

  const deleteTask = useCallback((id: string) => {
    updateData({ tasks: erpData.tasks.filter(t => t.id !== id) });
  }, [erpData.tasks, updateData]);

  const addEmployee = useCallback((employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: `emp-${Date.now()}`,
    };
    updateData({ employees: [...erpData.employees, newEmployee] });
    return newEmployee;
  }, [erpData.employees, updateData]);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    const updated = erpData.employees.map(e => 
      e.id === id ? { ...e, ...updates } : e
    );
    updateData({ employees: updated });
  }, [erpData.employees, updateData]);

  const deleteEmployee = useCallback((id: string) => {
    updateData({ employees: erpData.employees.filter(e => e.id !== id) });
  }, [erpData.employees, updateData]);

  const updateEmployeeAvailability = useCallback((employeeId: string, availability: EmployeeAvailability) => {
    const updated = erpData.employees.map(e =>
      e.id === employeeId ? { ...e, availability } : e
    );
    updateData({ employees: updated });
  }, [erpData.employees, updateData]);

  const addShift = useCallback((shift: Omit<Shift, 'id' | 'createdAt'>) => {
    const newShift: Shift = {
      ...shift,
      id: `shift-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ shifts: [...erpData.shifts, newShift] });
    return newShift;
  }, [erpData.shifts, updateData]);

  const updateShift = useCallback((id: string, updates: Partial<Shift>) => {
    const updated = erpData.shifts.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    updateData({ shifts: updated });
  }, [erpData.shifts, updateData]);

  const deleteShift = useCallback((id: string) => {
    updateData({ shifts: erpData.shifts.filter(s => s.id !== id) });
  }, [erpData.shifts, updateData]);

  const getEmployeeShifts = useCallback((employeeId: string, startDate?: string, endDate?: string) => {
    return erpData.shifts.filter(s => {
      if (s.employeeId !== employeeId) return false;
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    });
  }, [erpData.shifts]);

  const clockIn = useCallback((employeeId: string, notes?: string) => {
    const punch: TimePunch = {
      id: `punch-${Date.now()}`,
      employeeId,
      type: 'clock_in',
      timestamp: new Date().toISOString(),
      notes,
    };
    const today = new Date().toISOString().split('T')[0];
    const existingEntry = erpData.timeEntries.find(
      te => te.employeeId === employeeId && te.date === today && te.status === 'active'
    );
    if (!existingEntry) {
      const newEntry: TimeEntry = {
        id: `te-${Date.now()}`,
        employeeId,
        date: today,
        clockIn: punch.timestamp,
        breakMinutes: 0,
        totalHours: 0,
        status: 'active',
      };
      updateData({
        timePunches: [...erpData.timePunches, punch],
        timeEntries: [...erpData.timeEntries, newEntry],
      });
      return newEntry;
    }
    updateData({ timePunches: [...erpData.timePunches, punch] });
    return existingEntry;
  }, [erpData.timePunches, erpData.timeEntries, updateData]);

  const clockOut = useCallback((employeeId: string, notes?: string) => {
    const punch: TimePunch = {
      id: `punch-${Date.now()}`,
      employeeId,
      type: 'clock_out',
      timestamp: new Date().toISOString(),
      notes,
    };
    const today = new Date().toISOString().split('T')[0];
    const updatedEntries = erpData.timeEntries.map(te => {
      if (te.employeeId === employeeId && te.date === today && te.status === 'active') {
        const clockInTime = new Date(te.clockIn || punch.timestamp);
        const clockOutTime = new Date(punch.timestamp);
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        const totalHours = (diffMs / (1000 * 60 * 60)) - (te.breakMinutes / 60);
        return {
          ...te,
          clockOut: punch.timestamp,
          totalHours: Math.round(totalHours * 100) / 100,
          status: 'completed' as const,
        };
      }
      return te;
    });
    updateData({
      timePunches: [...erpData.timePunches, punch],
      timeEntries: updatedEntries,
    });
  }, [erpData.timePunches, erpData.timeEntries, updateData]);

  const startBreak = useCallback((employeeId: string) => {
    const punch: TimePunch = {
      id: `punch-${Date.now()}`,
      employeeId,
      type: 'break_start',
      timestamp: new Date().toISOString(),
    };
    updateData({ timePunches: [...erpData.timePunches, punch] });
  }, [erpData.timePunches, updateData]);

  const endBreak = useCallback((employeeId: string) => {
    const now = new Date();
    const punch: TimePunch = {
      id: `punch-${Date.now()}`,
      employeeId,
      type: 'break_end',
      timestamp: now.toISOString(),
    };
    const breakStart = [...erpData.timePunches]
      .reverse()
      .find(p => p.employeeId === employeeId && p.type === 'break_start');
    if (breakStart) {
      const breakDuration = Math.round((now.getTime() - new Date(breakStart.timestamp).getTime()) / (1000 * 60));
      const today = now.toISOString().split('T')[0];
      const updatedEntries = erpData.timeEntries.map(te => {
        if (te.employeeId === employeeId && te.date === today && te.status === 'active') {
          return { ...te, breakMinutes: te.breakMinutes + breakDuration };
        }
        return te;
      });
      updateData({
        timePunches: [...erpData.timePunches, punch],
        timeEntries: updatedEntries,
      });
    } else {
      updateData({ timePunches: [...erpData.timePunches, punch] });
    }
  }, [erpData.timePunches, erpData.timeEntries, updateData]);

  const getActiveTimeEntry = useCallback((employeeId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return erpData.timeEntries.find(
      te => te.employeeId === employeeId && te.date === today && te.status === 'active'
    );
  }, [erpData.timeEntries]);

  const isOnBreak = useCallback((employeeId: string) => {
    const punches = erpData.timePunches.filter(p => p.employeeId === employeeId);
    const lastPunch = punches[punches.length - 1];
    return lastPunch?.type === 'break_start';
  }, [erpData.timePunches]);

  const addTimeOffRequest = useCallback((request: Omit<TimeOffRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: TimeOffRequest = {
      ...request,
      id: `tor-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    updateData({ timeOffRequests: [...erpData.timeOffRequests, newRequest] });
    return newRequest;
  }, [erpData.timeOffRequests, updateData]);

  const updateTimeOffRequest = useCallback((id: string, updates: Partial<TimeOffRequest>) => {
    const updated = erpData.timeOffRequests.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    updateData({ timeOffRequests: updated });
  }, [erpData.timeOffRequests, updateData]);

  const approveTimeOff = useCallback((id: string, managerName: string) => {
    const updated = erpData.timeOffRequests.map(r => {
      if (r.id === id) {
        const request = r;
        const updatedEmployee = erpData.employees.find(e => e.id === request.employeeId);
        if (updatedEmployee && updatedEmployee.ptoBalance) {
          const ptoUsed = request.totalDays * 8;
          updateEmployee(updatedEmployee.id, { ptoBalance: updatedEmployee.ptoBalance - ptoUsed });
        }
        return {
          ...r,
          status: 'approved' as const,
          managerName,
          respondedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    updateData({ timeOffRequests: updated });
  }, [erpData.timeOffRequests, erpData.employees, updateData, updateEmployee]);

  const rejectTimeOff = useCallback((id: string, managerName: string) => {
    const updated = erpData.timeOffRequests.map(r =>
      r.id === id ? {
        ...r,
        status: 'rejected' as const,
        managerName,
        respondedAt: new Date().toISOString(),
      } : r
    );
    updateData({ timeOffRequests: updated });
  }, [erpData.timeOffRequests, updateData]);

  const addShiftSwapRequest = useCallback((request: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: ShiftSwapRequest = {
      ...request,
      id: `swap-${Date.now()}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    updateData({ shiftSwapRequests: [...erpData.shiftSwapRequests, newRequest] });
    return newRequest;
  }, [erpData.shiftSwapRequests, updateData]);

  const updateShiftSwapRequest = useCallback((id: string, updates: Partial<ShiftSwapRequest>) => {
    const updated = erpData.shiftSwapRequests.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    updateData({ shiftSwapRequests: updated });
  }, [erpData.shiftSwapRequests, updateData]);

  const acceptShiftSwap = useCallback((swapId: string, acceptorId: string, acceptorName: string) => {
    const swap = erpData.shiftSwapRequests.find(s => s.id === swapId);
    if (!swap) return;
    const updatedSwaps = erpData.shiftSwapRequests.map(s =>
      s.id === swapId ? {
        ...s,
        targetEmployeeId: acceptorId,
        targetEmployeeName: acceptorName,
        status: 'pending' as const,
        respondedAt: new Date().toISOString(),
      } : s
    );
    updateData({ shiftSwapRequests: updatedSwaps });
  }, [erpData.shiftSwapRequests, updateData]);

  const approveShiftSwap = useCallback((swapId: string) => {
    const swap = erpData.shiftSwapRequests.find(s => s.id === swapId);
    if (!swap || !swap.targetEmployeeId) return;
    const updatedShifts = erpData.shifts.map(s => {
      if (s.id === swap.originalShiftId) {
        return {
          ...s,
          employeeId: swap.targetEmployeeId!,
          employeeName: swap.targetEmployeeName!,
        };
      }
      return s;
    });
    const updatedSwaps = erpData.shiftSwapRequests.map(s =>
      s.id === swapId ? { ...s, status: 'approved' as const } : s
    );
    updateData({ shifts: updatedShifts, shiftSwapRequests: updatedSwaps });
  }, [erpData.shiftSwapRequests, erpData.shifts, updateData]);

  const getEmployeeTimeEntries = useCallback((employeeId: string, limit?: number) => {
    const entries = erpData.timeEntries
      .filter(te => te.employeeId === employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
    return limit ? entries.slice(0, limit) : entries;
  }, [erpData.timeEntries]);

  const getEmployeeTimeOffRequests = useCallback((employeeId: string) => {
    return erpData.timeOffRequests.filter(r => r.employeeId === employeeId);
  }, [erpData.timeOffRequests]);

  const updateTimeOffSettings = useCallback((settings: Partial<TimeOffSettings>) => {
    updateData({ timeOffSettings: { ...erpData.timeOffSettings, ...settings } });
  }, [erpData.timeOffSettings, updateData]);

  const updateEmployeeTimeOffBalances = useCallback((employeeId: string, balances: Partial<TimeOffBalances>) => {
    const updated = erpData.employees.map(e =>
      e.id === employeeId ? { ...e, timeOffBalances: { ...e.timeOffBalances, ...balances } as TimeOffBalances } : e
    );
    updateData({ employees: updated });
  }, [erpData.employees, updateData]);

  const getBreakHistory = useCallback((employeeId: string, date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const punches = erpData.timePunches.filter(p => {
      if (p.employeeId !== employeeId) return false;
      const punchDate = p.timestamp.split('T')[0];
      return punchDate === targetDate && (p.type === 'break_start' || p.type === 'break_end');
    });
    return punches.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [erpData.timePunches]);

  const getEmployeeTimeOffHistory = useCallback((employeeId: string) => {
    return erpData.timeOffRequests
      .filter(r => r.employeeId === employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [erpData.timeOffRequests]);

  const addBulletinPost = useCallback((post: Omit<BulletinPost, 'id' | 'createdAt'>) => {
    const newPost: BulletinPost = {
      ...post,
      id: `bulletin-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ bulletinPosts: [newPost, ...erpData.bulletinPosts] });
    return newPost;
  }, [erpData.bulletinPosts, updateData]);

  const updateBulletinPost = useCallback((id: string, updates: Partial<BulletinPost>) => {
    const updated = erpData.bulletinPosts.map(p =>
      p.id === id ? { ...p, ...updates } : p
    );
    updateData({ bulletinPosts: updated });
  }, [erpData.bulletinPosts, updateData]);

  const deleteBulletinPost = useCallback((id: string) => {
    updateData({ bulletinPosts: erpData.bulletinPosts.filter(p => p.id !== id) });
  }, [erpData.bulletinPosts, updateData]);

  const getActiveBulletinPosts = useCallback(() => {
    const now = new Date().toISOString();
    return erpData.bulletinPosts
      .filter(p => !p.expiresAt || p.expiresAt > now)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [erpData.bulletinPosts]);

  const updateEmployeeProfile = useCallback((employeeId: string, profile: Partial<EmployeeProfile>) => {
    const updated = erpData.employees.map(e =>
      e.id === employeeId ? { ...e, profile: { ...e.profile, ...profile } } : e
    );
    updateData({ employees: updated });
  }, [erpData.employees, updateData]);

  const findByBarcode = useCallback((barcode: string): { type: 'material' | 'asset'; item: Material | Asset } | null => {
    const material = erpData.materials.find(m => m.barcode === barcode || m.qrCode === barcode || m.sku === barcode);
    if (material) return { type: 'material', item: material };
    
    const asset = erpData.assets.find(a => a.barcode === barcode || a.qrCode === barcode || a.asset_tag === barcode);
    if (asset) return { type: 'asset', item: asset };
    
    return null;
  }, [erpData.materials, erpData.assets]);

  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => {
    const newAsset: Asset = {
      ...asset,
      id: `asset-${Date.now()}`,
    };
    updateData({ assets: [...erpData.assets, newAsset] });
    return newAsset;
  }, [erpData.assets, updateData]);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    const updated = erpData.assets.map(a => 
      a.id === id ? { ...a, ...updates } : a
    );
    updateData({ assets: updated });
  }, [erpData.assets, updateData]);

  const deleteAsset = useCallback((id: string) => {
    updateData({ assets: erpData.assets.filter(a => a.id !== id) });
  }, [erpData.assets, updateData]);

  const consumePart = useCallback((materialId: string, assetId: string, quantity: number, notes?: string, workOrderId?: string) => {
    const material = erpData.materials.find(m => m.id === materialId);
    const asset = erpData.assets.find(a => a.id === assetId);
    
    if (!material || !asset) {
      console.error('Material or asset not found');
      return null;
    }
    
    if (material.on_hand < quantity) {
      console.error('Insufficient stock');
      return null;
    }
    
    const newUsage: PartUsage = {
      id: `usage-${Date.now()}`,
      material_id: materialId,
      material_name: material.name,
      material_sku: material.sku,
      asset_id: assetId,
      asset_name: asset.name,
      asset_tag: asset.asset_tag,
      quantity_used: quantity,
      used_by: 'System User',
      used_at: new Date().toISOString(),
      work_order_id: workOrderId,
      notes,
    };
    
    const updatedMaterials = erpData.materials.map(m => 
      m.id === materialId ? { ...m, on_hand: m.on_hand - quantity } : m
    );
    
    updateData({ 
      partUsage: [...erpData.partUsage, newUsage],
      materials: updatedMaterials,
    });
    
    addHistoryEntry({
      material_id: materialId,
      material_name: material.name,
      material_sku: material.sku,
      action: 'issue',
      quantity_before: material.on_hand,
      quantity_after: material.on_hand - quantity,
      quantity_change: -quantity,
      reason: `Used on ${asset.name} (${asset.asset_tag})`,
      performed_by: 'System User',
      notes,
    });
    
    return newUsage;
  }, [erpData.materials, erpData.assets, erpData.partUsage, updateData, addHistoryEntry]);

  const associatePartWithAsset = useCallback((materialId: string, assetId: string | null) => {
    const updated = erpData.materials.map(m => 
      m.id === materialId ? { ...m, associated_asset_id: assetId || undefined } : m
    );
    updateData({ materials: updated });
  }, [erpData.materials, updateData]);

  const getPartUsageForAsset = useCallback((assetId: string) => {
    return erpData.partUsage.filter(pu => pu.asset_id === assetId);
  }, [erpData.partUsage]);

  const getPartUsageForMaterial = useCallback((materialId: string) => {
    return erpData.partUsage.filter(pu => pu.material_id === materialId);
  }, [erpData.partUsage]);

  const addEquipment = useCallback((equip: Omit<Equipment, 'id'>) => {
    const newEquipment: Equipment = {
      ...equip,
      id: `equip-${Date.now()}`,
    };
    updateData({ equipment: [...erpData.equipment, newEquipment] });
    return newEquipment;
  }, [erpData.equipment, updateData]);

  const updateEquipment = useCallback((id: string, updates: Partial<Equipment>) => {
    const updated = erpData.equipment.map(e =>
      e.id === id ? { ...e, ...updates } : e
    );
    updateData({ equipment: updated });
  }, [erpData.equipment, updateData]);

  const deleteEquipment = useCallback((id: string) => {
    updateData({ equipment: erpData.equipment.filter(e => e.id !== id) });
  }, [erpData.equipment, updateData]);

  const addPMSchedule = useCallback((schedule: Omit<PMSchedule, 'id' | 'created_at'>) => {
    const newSchedule: PMSchedule = {
      ...schedule,
      id: `pm-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ pmSchedules: [...erpData.pmSchedules, newSchedule] });
    return newSchedule;
  }, [erpData.pmSchedules, updateData]);

  const updatePMSchedule = useCallback((id: string, updates: Partial<PMSchedule>) => {
    const updated = erpData.pmSchedules.map(s =>
      s.id === id ? { ...s, ...updates } : s
    );
    updateData({ pmSchedules: updated });
  }, [erpData.pmSchedules, updateData]);

  const deletePMSchedule = useCallback((id: string) => {
    updateData({ pmSchedules: erpData.pmSchedules.filter(s => s.id !== id) });
  }, [erpData.pmSchedules, updateData]);

  const addPMWorkOrder = useCallback((pmwo: Omit<PMWorkOrder, 'id' | 'created_at'>) => {
    const newPMWO: PMWorkOrder = {
      ...pmwo,
      id: `pmwo-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
    };
    updateData({ pmWorkOrders: [...erpData.pmWorkOrders, newPMWO] });
    return newPMWO;
  }, [erpData.pmWorkOrders, updateData]);

  const updatePMWorkOrder = useCallback((id: string, updates: Partial<PMWorkOrder>) => {
    const updated = erpData.pmWorkOrders.map(wo =>
      wo.id === id ? { ...wo, ...updates } : wo
    );
    updateData({ pmWorkOrders: updated });
  }, [erpData.pmWorkOrders, updateData]);

  const deletePMWorkOrder = useCallback((id: string) => {
    updateData({ pmWorkOrders: erpData.pmWorkOrders.filter(wo => wo.id !== id) });
  }, [erpData.pmWorkOrders, updateData]);

  const startPMWorkOrder = useCallback((id: string, technicianId?: string, technicianName?: string) => {
    const updated = erpData.pmWorkOrders.map(wo =>
      wo.id === id ? {
        ...wo,
        status: 'in_progress' as const,
        started_at: new Date().toISOString(),
        assigned_to: technicianId || wo.assigned_to,
        assigned_name: technicianName || wo.assigned_name,
      } : wo
    );
    updateData({ pmWorkOrders: updated });
  }, [erpData.pmWorkOrders, updateData]);

  const completePMTask = useCallback((workOrderId: string, taskId: string, notes?: string) => {
    const updated = erpData.pmWorkOrders.map(wo => {
      if (wo.id === workOrderId) {
        const updatedTasks: PMTaskCompletion[] = wo.tasks.map(t =>
          t.task_id === taskId ? {
            ...t,
            completed: true,
            completed_at: new Date().toISOString(),
            notes,
          } : t
        );
        return { ...wo, tasks: updatedTasks };
      }
      return wo;
    });
    updateData({ pmWorkOrders: updated });
  }, [erpData.pmWorkOrders, updateData]);

  const completePMWorkOrder = useCallback((id: string, laborHours: number, completionNotes: string, partsUsed?: PMPartUsed[], completedById?: string, completedByName?: string) => {
    const pmwo = erpData.pmWorkOrders.find(wo => wo.id === id);
    if (!pmwo) return;

    const updated = erpData.pmWorkOrders.map(wo =>
      wo.id === id ? {
        ...wo,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        labor_hours: laborHours,
        completion_notes: completionNotes,
        parts_used: partsUsed || wo.parts_used,
        tasks: wo.tasks.map(t => ({ ...t, completed: true, completed_at: t.completed_at || new Date().toISOString() })),
      } : wo
    );

    const schedule = erpData.pmSchedules.find(s => s.id === pmwo.pm_schedule_id);
    let updatedSchedules = erpData.pmSchedules;
    let updatedEquipment = erpData.equipment;
    
    if (schedule) {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + FREQUENCY_DAYS[schedule.frequency]);
      updatedSchedules = erpData.pmSchedules.map(s =>
        s.id === schedule.id ? {
          ...s,
          last_completed: new Date().toISOString().split('T')[0],
          next_due: nextDue.toISOString().split('T')[0],
        } : s
      );

      const equip = erpData.equipment.find(e => e.id === pmwo.equipment_id);
      if (equip) {
        updatedEquipment = erpData.equipment.map(e =>
          e.id === equip.id ? {
            ...e,
            last_pm_date: new Date().toISOString().split('T')[0],
            next_pm_date: nextDue.toISOString().split('T')[0],
            status: 'operational' as const,
          } : e
        );
      }
    }

    const locationMatch = erpData.taskLocations.find(loc => 
      pmwo.equipment_name?.toLowerCase().includes(loc.name.toLowerCase()) ||
      loc.name.toLowerCase().includes('maint')
    ) || erpData.taskLocations.find(loc => loc.id === 'loc-maint');

    const taskVerification: TaskVerification = {
      id: `tv-pm-${Date.now()}`,
      departmentCode: '1001',
      departmentName: getDepartmentName('1001'),
      facilityCode: pmwo.facility_id || 'FAC-001',
      locationId: locationMatch?.id || 'loc-maint',
      locationName: locationMatch?.name || pmwo.equipment_name || 'Maintenance Shop',
      categoryId: 'cat-pm-complete',
      categoryName: 'Preventive Maintenance Completed',
      action: 'PM Completed',
      notes: `PM Work Order: ${pmwo.title}\nEquipment: ${pmwo.equipment_name} (${pmwo.equipment_tag})\nLabor Hours: ${laborHours}\n${completionNotes}`,
      employeeId: completedById || pmwo.assigned_to || 'system',
      employeeName: completedByName || pmwo.assigned_name || 'System',
      createdAt: new Date().toISOString(),
      status: 'verified',
      sourceType: 'pm_work_order',
      sourceId: pmwo.id,
      sourceNumber: pmwo.title,
    };

    updateData({ 
      pmWorkOrders: updated, 
      pmSchedules: updatedSchedules, 
      equipment: updatedEquipment,
      taskVerifications: [taskVerification, ...erpData.taskVerifications],
    });
    
    console.log('PM Work Order completed and auto-posted to Task Feed:', taskVerification.id);
  }, [erpData.pmWorkOrders, erpData.pmSchedules, erpData.equipment, erpData.taskLocations, erpData.taskVerifications, updateData]);

  const generatePMWorkOrder = useCallback((scheduleId: string) => {
    const schedule = erpData.pmSchedules.find(s => s.id === scheduleId);
    if (!schedule) return null;

    const newPMWO: PMWorkOrder = {
      id: `pmwo-${Date.now()}`,
      pm_schedule_id: schedule.id,
      equipment_id: schedule.equipment_id,
      equipment_name: schedule.equipment_name,
      equipment_tag: schedule.equipment_tag,
      title: `${schedule.name} - ${new Date().toLocaleDateString()}`,
      description: schedule.description,
      status: 'scheduled',
      priority: schedule.priority,
      scheduled_date: schedule.next_due,
      assigned_to: schedule.assigned_to,
      assigned_name: schedule.assigned_name,
      tasks: schedule.tasks.map(t => ({
        task_id: t.id,
        description: t.description,
        completed: false,
      })),
      facility_id: schedule.facility_id,
      created_at: new Date().toISOString().split('T')[0],
    };

    updateData({ pmWorkOrders: [...erpData.pmWorkOrders, newPMWO] });
    return newPMWO;
  }, [erpData.pmSchedules, erpData.pmWorkOrders, updateData]);

  const getUpcomingPMs = useCallback((days: number = 7) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    return erpData.pmWorkOrders.filter(wo =>
      wo.status === 'scheduled' &&
      wo.scheduled_date >= todayStr &&
      wo.scheduled_date <= futureStr
    ).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [erpData.pmWorkOrders]);

  const getOverduePMs = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return erpData.pmWorkOrders.filter(wo =>
      (wo.status === 'scheduled' || wo.status === 'overdue') &&
      wo.scheduled_date < today
    );
  }, [erpData.pmWorkOrders]);

  const getEquipmentPMHistory = useCallback((equipmentId: string) => {
    return erpData.pmWorkOrders
      .filter(wo => wo.equipment_id === equipmentId)
      .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
  }, [erpData.pmWorkOrders]);

  const addInspectionTemplate = useCallback((template: Omit<InspectionTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    const newTemplate: InspectionTemplate = {
      ...template,
      id: `tmpl-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    updateData({ inspectionTemplates: [...erpData.inspectionTemplates, newTemplate] });
    return newTemplate;
  }, [erpData.inspectionTemplates, updateData]);

  const updateInspectionTemplate = useCallback((id: string, updates: Partial<InspectionTemplate>) => {
    const updated = erpData.inspectionTemplates.map(t =>
      t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString().split('T')[0] } : t
    );
    updateData({ inspectionTemplates: updated });
  }, [erpData.inspectionTemplates, updateData]);

  const deleteInspectionTemplate = useCallback((id: string) => {
    updateData({ inspectionTemplates: erpData.inspectionTemplates.filter(t => t.id !== id) });
  }, [erpData.inspectionTemplates, updateData]);

  const addTrackedItem = useCallback((item: Omit<TrackedItem, 'id'>) => {
    const newItem: TrackedItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    updateData({ trackedItems: [...erpData.trackedItems, newItem] });
    return newItem;
  }, [erpData.trackedItems, updateData]);

  const updateTrackedItem = useCallback((id: string, updates: Partial<TrackedItem>, reason?: string, changedBy?: string) => {
    const existingItem = erpData.trackedItems.find(i => i.id === id);
    if (!existingItem) return;

    const changes: TrackedItemChange[] = [];
    if (updates.assigned_to && updates.assigned_to !== existingItem.assigned_to) {
      changes.push({
        id: `change-${Date.now()}-1`,
        tracked_item_id: id,
        item_number: existingItem.item_number,
        change_type: 'assignment',
        previous_value: existingItem.assigned_to,
        new_value: updates.assigned_to,
        reason: reason || 'Assignment updated',
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString(),
      });
    }
    if (updates.location && updates.location !== existingItem.location) {
      changes.push({
        id: `change-${Date.now()}-2`,
        tracked_item_id: id,
        item_number: existingItem.item_number,
        change_type: 'location',
        previous_value: existingItem.location,
        new_value: updates.location,
        reason: reason || 'Location updated',
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString(),
      });
    }
    if (updates.status && updates.status !== existingItem.status) {
      changes.push({
        id: `change-${Date.now()}-3`,
        tracked_item_id: id,
        item_number: existingItem.item_number,
        change_type: 'status',
        previous_value: existingItem.status,
        new_value: updates.status,
        reason: reason || 'Status updated',
        changed_by: changedBy || 'System',
        changed_at: new Date().toISOString(),
      });
    }

    const updated = erpData.trackedItems.map(i =>
      i.id === id ? { ...i, ...updates } : i
    );
    updateData({ 
      trackedItems: updated,
      trackedItemChanges: [...erpData.trackedItemChanges, ...changes],
    });
  }, [erpData.trackedItems, erpData.trackedItemChanges, updateData]);

  const deleteTrackedItem = useCallback((id: string) => {
    updateData({ trackedItems: erpData.trackedItems.filter(i => i.id !== id) });
  }, [erpData.trackedItems, updateData]);

  const addInspectionRecord = useCallback((record: Omit<InspectionRecord, 'id' | 'created_at'>) => {
    const newRecord: InspectionRecord = {
      ...record,
      id: `insp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const template = erpData.inspectionTemplates.find(t => t.id === record.template_id);
    const trackedItem = record.tracked_item_id ? erpData.trackedItems.find(i => i.id === record.tracked_item_id) : null;
    
    const locationMatch = erpData.taskLocations.find(loc => 
      record.location?.toLowerCase().includes(loc.name.toLowerCase()) ||
      loc.name.toLowerCase().includes('qa')
    ) || erpData.taskLocations.find(loc => loc.id === 'loc-qa-lab');

    const actionMap: Record<string, string> = {
      'pass': 'Inspection Passed',
      'fail': 'Inspection Failed',
      'needs_attention': 'Inspection Needs Attention',
      'n/a': 'Inspection Completed',
    };

    const taskVerification: TaskVerification = {
      id: `tv-insp-${Date.now()}`,
      departmentCode: template?.category === 'compliance' ? '1005' : '1004',
      departmentName: template?.category === 'compliance' ? getDepartmentName('1005') : getDepartmentName('1004'),
      facilityCode: 'FAC-001',
      locationId: locationMatch?.id || 'loc-qa-lab',
      locationName: record.location || locationMatch?.name || 'QA Lab',
      categoryId: 'cat-inspection-complete',
      categoryName: 'Inspection Completed',
      action: actionMap[record.result] || 'Inspection Completed',
      notes: `${record.template_name}${trackedItem ? ` - ${trackedItem.name} (${trackedItem.item_number})` : ''}\n${record.notes || ''}`.trim(),
      employeeId: record.inspector_id,
      employeeName: record.inspector_name,
      createdAt: new Date().toISOString(),
      status: record.result === 'fail' ? 'flagged' : 'verified',
      sourceType: 'inspection',
      sourceId: newRecord.id,
      sourceNumber: `INSP-${newRecord.id.slice(-6).toUpperCase()}`,
      inspectionResult: record.result === 'n/a' ? undefined : record.result,
    };

    updateData({ 
      inspectionRecords: [...erpData.inspectionRecords, newRecord],
      taskVerifications: [taskVerification, ...erpData.taskVerifications],
    });
    
    console.log('Inspection completed and auto-posted to Task Feed:', taskVerification.id);
    return newRecord;
  }, [erpData.inspectionRecords, erpData.inspectionTemplates, erpData.trackedItems, erpData.taskLocations, erpData.taskVerifications, updateData]);

  const updateInspectionRecord = useCallback((id: string, updates: Partial<InspectionRecord>) => {
    const updated = erpData.inspectionRecords.map(r =>
      r.id === id ? { ...r, ...updates } : r
    );
    updateData({ inspectionRecords: updated });
  }, [erpData.inspectionRecords, updateData]);

  const deleteInspectionRecord = useCallback((id: string) => {
    updateData({ inspectionRecords: erpData.inspectionRecords.filter(r => r.id !== id) });
  }, [erpData.inspectionRecords, updateData]);

  const getInspectionsByTemplate = useCallback((templateId: string) => {
    return erpData.inspectionRecords
      .filter(r => r.template_id === templateId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [erpData.inspectionRecords]);

  const getInspectionsByTrackedItem = useCallback((itemId: string) => {
    return erpData.inspectionRecords
      .filter(r => r.tracked_item_id === itemId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [erpData.inspectionRecords]);

  const getTrackedItemsForTemplate = useCallback((templateId: string) => {
    return erpData.trackedItems.filter(i => i.template_id === templateId);
  }, [erpData.trackedItems]);

  const getTrackedItemChanges = useCallback((itemId: string) => {
    return erpData.trackedItemChanges
      .filter(c => c.tracked_item_id === itemId)
      .sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  }, [erpData.trackedItemChanges]);

  const getInspectionCompliance = useCallback((templateId: string, periodDays: number = 7) => {
    const template = erpData.inspectionTemplates.find(t => t.id === templateId);
    if (!template) return null;

    const trackedItems = erpData.trackedItems.filter(i => i.template_id === templateId && i.status === 'active');
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodStartStr = periodStart.toISOString();

    const recentInspections = erpData.inspectionRecords.filter(
      r => r.template_id === templateId && r.created_at >= periodStartStr
    );

    const inspectedItemIds = new Set(recentInspections.map(r => r.tracked_item_id).filter(Boolean));
    const passCount = recentInspections.filter(r => r.result === 'pass').length;
    const failCount = recentInspections.filter(r => r.result === 'fail').length;

    const uninspectedItems = trackedItems.filter(i => !inspectedItemIds.has(i.id));

    return {
      totalActive: trackedItems.length,
      inspectedCount: inspectedItemIds.size,
      complianceRate: trackedItems.length > 0 ? (inspectedItemIds.size / trackedItems.length) * 100 : 0,
      passCount,
      failCount,
      uninspectedItems,
      periodStart: periodStart.toLocaleDateString(),
    };
  }, [erpData.inspectionTemplates, erpData.trackedItems, erpData.inspectionRecords]);

  const getInspectionHistory = useCallback((startDate: string, endDate: string, templateId?: string) => {
    return erpData.inspectionRecords.filter(r => {
      const date = r.inspection_date;
      if (date < startDate || date > endDate) return false;
      if (templateId && r.template_id !== templateId) return false;
      return true;
    }).sort((a, b) => b.inspection_date.localeCompare(a.inspection_date));
  }, [erpData.inspectionRecords]);

  const addInspectionSchedule = useCallback((schedule: Omit<InspectionSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    const newSchedule: InspectionSchedule = {
      ...schedule,
      id: `sched-${Date.now()}`,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    updateData({ inspectionSchedules: [...erpData.inspectionSchedules, newSchedule] });
    return newSchedule;
  }, [erpData.inspectionSchedules, updateData]);

  const updateInspectionSchedule = useCallback((id: string, updates: Partial<InspectionSchedule>) => {
    const updated = erpData.inspectionSchedules.map(s =>
      s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString().split('T')[0] } : s
    );
    updateData({ inspectionSchedules: updated });
  }, [erpData.inspectionSchedules, updateData]);

  const deleteInspectionSchedule = useCallback((id: string) => {
    updateData({ inspectionSchedules: erpData.inspectionSchedules.filter(s => s.id !== id) });
  }, [erpData.inspectionSchedules, updateData]);

  const completeInspectionSchedule = useCallback((scheduleId: string) => {
    const schedule = erpData.inspectionSchedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const today = new Date();
    const nextDue = new Date();
    const days = INSPECTION_FREQUENCY_DAYS[schedule.frequency as InspectionFrequency] || 0;
    
    if (days > 0) {
      nextDue.setDate(today.getDate() + days);
      if (schedule.day_of_week && schedule.frequency === 'weekly') {
        const dayMap: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
        };
        const targetDay = dayMap[schedule.day_of_week];
        while (nextDue.getDay() !== targetDay) {
          nextDue.setDate(nextDue.getDate() + 1);
        }
      }
    }

    const updated = erpData.inspectionSchedules.map(s =>
      s.id === scheduleId ? {
        ...s,
        last_completed: today.toISOString().split('T')[0],
        next_due: days > 0 ? nextDue.toISOString().split('T')[0] : s.next_due,
        updated_at: today.toISOString().split('T')[0],
      } : s
    );
    updateData({ inspectionSchedules: updated });
  }, [erpData.inspectionSchedules, updateData]);

  const getUpcomingInspections = useCallback((days: number = 7) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    return erpData.inspectionSchedules
      .filter(s => s.active && s.next_due >= todayStr && s.next_due <= futureStr)
      .map(s => {
        const dueDate = new Date(s.next_due);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const trackedItems = erpData.trackedItems.filter(i => i.template_id === s.template_id && i.status === 'active');
        return {
          ...s,
          daysUntilDue: daysUntil,
          trackedItemsCount: trackedItems.length,
          alertType: daysUntil === 0 ? 'due_today' : daysUntil < 0 ? 'overdue' : 'upcoming' as const,
        };
      })
      .sort((a, b) => a.next_due.localeCompare(b.next_due));
  }, [erpData.inspectionSchedules, erpData.trackedItems]);

  const getOverdueInspections = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return erpData.inspectionSchedules
      .filter(s => s.active && s.next_due < today)
      .map(s => {
        const dueDate = new Date(s.next_due);
        const todayDate = new Date();
        const daysOverdue = Math.ceil((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const trackedItems = erpData.trackedItems.filter(i => i.template_id === s.template_id && i.status === 'active');
        return {
          ...s,
          daysOverdue,
          trackedItemsCount: trackedItems.length,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [erpData.inspectionSchedules, erpData.trackedItems]);

  const getDueToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return erpData.inspectionSchedules
      .filter(s => s.active && s.next_due === today)
      .map(s => {
        const trackedItems = erpData.trackedItems.filter(i => i.template_id === s.template_id && i.status === 'active');
        const completedToday = erpData.inspectionRecords.filter(
          r => r.template_id === s.template_id && r.inspection_date === today
        );
        return {
          ...s,
          trackedItemsCount: trackedItems.length,
          completedCount: completedToday.length,
        };
      });
  }, [erpData.inspectionSchedules, erpData.trackedItems, erpData.inspectionRecords]);

  const addInspectionAttachment = useCallback((attachment: Omit<InspectionAttachment, 'id' | 'uploaded_at'>) => {
    const newAttachment: InspectionAttachment = {
      ...attachment,
      id: `attach-${Date.now()}`,
      uploaded_at: new Date().toISOString(),
    };
    updateData({ inspectionAttachments: [...erpData.inspectionAttachments, newAttachment] });
    return newAttachment;
  }, [erpData.inspectionAttachments, updateData]);

  const deleteInspectionAttachment = useCallback((id: string) => {
    updateData({ inspectionAttachments: erpData.inspectionAttachments.filter(a => a.id !== id) });
  }, [erpData.inspectionAttachments, updateData]);

  const getAttachmentsForRecord = useCallback((recordId: string) => {
    return erpData.inspectionAttachments.filter(a => a.inspection_record_id === recordId);
  }, [erpData.inspectionAttachments]);

  const getInspectionAlerts = useCallback(() => {
    const overdue = getOverdueInspections();
    const dueToday = getDueToday();
    const upcoming = getUpcomingInspections(7).filter(s => s.alertType === 'upcoming' && s.daysUntilDue <= (s.notify_before_days || 1));
    
    return {
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
      total: overdue.length + dueToday.length + upcoming.length,
      items: [
        ...overdue.map(s => ({ ...s, alertType: 'overdue' as const })),
        ...dueToday.map(s => ({ ...s, alertType: 'due_today' as const })),
        ...upcoming,
      ],
    };
  }, [getOverdueInspections, getDueToday, getUpcomingInspections]);

  const addBulbRecord = useCallback((record: Omit<BulbRecord, 'id' | 'createdAt'>) => {
    const newRecord: BulbRecord = {
      ...record,
      id: `bulb-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ bulbRecords: [...erpData.bulbRecords, newRecord] });
    return newRecord;
  }, [erpData.bulbRecords, updateData]);

  const updateBulbRecord = useCallback((id: string, updates: Partial<BulbRecord>) => {
    const updated = erpData.bulbRecords.map(r => r.id === id ? { ...r, ...updates } : r);
    updateData({ bulbRecords: updated });
  }, [erpData.bulbRecords, updateData]);

  const deleteBulbRecord = useCallback((id: string) => {
    updateData({ bulbRecords: erpData.bulbRecords.filter(r => r.id !== id) });
  }, [erpData.bulbRecords, updateData]);

  const addBatteryRecord = useCallback((record: Omit<BatteryRecord, 'id' | 'createdAt'>) => {
    const newRecord: BatteryRecord = {
      ...record,
      id: `batt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ batteryRecords: [...erpData.batteryRecords, newRecord] });
    return newRecord;
  }, [erpData.batteryRecords, updateData]);

  const updateBatteryRecord = useCallback((id: string, updates: Partial<BatteryRecord>) => {
    const updated = erpData.batteryRecords.map(r => r.id === id ? { ...r, ...updates } : r);
    updateData({ batteryRecords: updated });
  }, [erpData.batteryRecords, updateData]);

  const deleteBatteryRecord = useCallback((id: string) => {
    updateData({ batteryRecords: erpData.batteryRecords.filter(r => r.id !== id) });
  }, [erpData.batteryRecords, updateData]);

  const addMetalRecord = useCallback((record: Omit<MetalRecord, 'id' | 'createdAt'>) => {
    const newRecord: MetalRecord = {
      ...record,
      id: `metal-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ metalRecords: [...erpData.metalRecords, newRecord] });
    return newRecord;
  }, [erpData.metalRecords, updateData]);

  const updateMetalRecord = useCallback((id: string, updates: Partial<MetalRecord>) => {
    const updated = erpData.metalRecords.map(r => r.id === id ? { ...r, ...updates } : r);
    updateData({ metalRecords: updated });
  }, [erpData.metalRecords, updateData]);

  const deleteMetalRecord = useCallback((id: string) => {
    updateData({ metalRecords: erpData.metalRecords.filter(r => r.id !== id) });
  }, [erpData.metalRecords, updateData]);

  const addCardboardRecord = useCallback((record: Omit<CardboardRecord, 'id' | 'createdAt'>) => {
    const newRecord: CardboardRecord = {
      ...record,
      id: `card-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ cardboardRecords: [...erpData.cardboardRecords, newRecord] });
    return newRecord;
  }, [erpData.cardboardRecords, updateData]);

  const updateCardboardRecord = useCallback((id: string, updates: Partial<CardboardRecord>) => {
    const updated = erpData.cardboardRecords.map(r => r.id === id ? { ...r, ...updates } : r);
    updateData({ cardboardRecords: updated });
  }, [erpData.cardboardRecords, updateData]);

  const deleteCardboardRecord = useCallback((id: string) => {
    updateData({ cardboardRecords: erpData.cardboardRecords.filter(r => r.id !== id) });
  }, [erpData.cardboardRecords, updateData]);

  const addPaperRecord = useCallback((record: Omit<PaperRecord, 'id' | 'createdAt'>) => {
    const newRecord: PaperRecord = {
      ...record,
      id: `paper-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ paperRecords: [...erpData.paperRecords, newRecord] });
    return newRecord;
  }, [erpData.paperRecords, updateData]);

  const updatePaperRecord = useCallback((id: string, updates: Partial<PaperRecord>) => {
    const updated = erpData.paperRecords.map(r => r.id === id ? { ...r, ...updates } : r);
    updateData({ paperRecords: updated });
  }, [erpData.paperRecords, updateData]);

  const deletePaperRecord = useCallback((id: string) => {
    updateData({ paperRecords: erpData.paperRecords.filter(r => r.id !== id) });
  }, [erpData.paperRecords, updateData]);

  const addTonerRecord = useCallback((record: Omit<TonerRecord, 'id' | 'createdAt'>) => {
    const newRecord: TonerRecord = {
      ...record,
      id: `toner-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ tonerRecords: [...erpData.tonerRecords, newRecord] });
    return newRecord;
  }, [erpData.tonerRecords, updateData]);

  const updateTonerRecord = useCallback((id: string, updates: Partial<TonerRecord>) => {
    const updated = erpData.tonerRecords.map(r => r.id === id ? { ...r, ...updates } : r);
    updateData({ tonerRecords: updated });
  }, [erpData.tonerRecords, updateData]);

  const deleteTonerRecord = useCallback((id: string) => {
    updateData({ tonerRecords: erpData.tonerRecords.filter(r => r.id !== id) });
  }, [erpData.tonerRecords, updateData]);

  const addRecyclingFile = useCallback((file: Omit<RecyclingFile, 'id' | 'uploadDate'>) => {
    const newFile: RecyclingFile = {
      ...file,
      id: `rf-${Date.now()}`,
      uploadDate: new Date().toISOString(),
    };
    updateData({ recyclingFiles: [...erpData.recyclingFiles, newFile] });
    return newFile;
  }, [erpData.recyclingFiles, updateData]);

  const deleteRecyclingFile = useCallback((id: string) => {
    updateData({ recyclingFiles: erpData.recyclingFiles.filter(f => f.id !== id) });
  }, [erpData.recyclingFiles, updateData]);

  const getRecyclingFilesForRecord = useCallback((recordType: RecyclingCategory, recordId: string) => {
    return erpData.recyclingFiles.filter(f => f.recordType === recordType && f.recordId === recordId);
  }, [erpData.recyclingFiles]);

  const getRecyclingMetrics = useCallback(() => {
    const bulbsWithCert = erpData.bulbRecords.filter(r => r.certificateNumber).length;
    const batteryPickups = erpData.batteryRecords.filter(r => r.pickupDelivery === 'pickup').length;
    const batteryDeliveries = erpData.batteryRecords.filter(r => r.pickupDelivery === 'delivery').length;
    
    return {
      bulbsShipped: erpData.bulbRecords.length,
      bulbsWithCertificate: bulbsWithCert,
      bulbsPending: erpData.bulbRecords.length - bulbsWithCert,
      totalBulbQuantity: erpData.bulbRecords.reduce((sum, r) => sum + r.quantity, 0),
      batteryDisposals: erpData.batteryRecords.length,
      totalBatteries: erpData.batteryRecords.reduce((sum, r) => sum + r.quantity, 0),
      batteryPickups,
      batteryDeliveries,
      metalPickups: erpData.metalRecords.length,
      totalMetalWeight: erpData.metalRecords.reduce((sum, r) => sum + r.weight, 0),
      totalMetalRevenue: erpData.metalRecords.reduce((sum, r) => sum + r.amountReceived, 0),
      cardboardPickups: erpData.cardboardRecords.length,
      totalCardboardWeight: erpData.cardboardRecords.reduce((sum, r) => sum + r.weight, 0),
      paperPickups: erpData.paperRecords.length,
      totalPaperWeight: erpData.paperRecords.reduce((sum, r) => sum + r.weight, 0),
      tonerShipments: erpData.tonerRecords.length,
      totalTonerCartridges: erpData.tonerRecords.reduce((sum, r) => sum + r.quantity, 0),
    };
  }, [erpData.bulbRecords, erpData.batteryRecords, erpData.metalRecords, erpData.cardboardRecords, erpData.paperRecords, erpData.tonerRecords]);

  const addTaskVerification = useCallback((verification: Omit<TaskVerification, 'id' | 'createdAt'>) => {
    const newVerification: TaskVerification = {
      ...verification,
      id: `tv-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ taskVerifications: [newVerification, ...erpData.taskVerifications] });
    return newVerification;
  }, [erpData.taskVerifications, updateData]);

  const updateTaskVerification = useCallback((id: string, updates: Partial<TaskVerification>) => {
    const updated = erpData.taskVerifications.map(tv =>
      tv.id === id ? { ...tv, ...updates } : tv
    );
    updateData({ taskVerifications: updated });
  }, [erpData.taskVerifications, updateData]);

  const deleteTaskVerification = useCallback((id: string) => {
    updateData({ taskVerifications: erpData.taskVerifications.filter(tv => tv.id !== id) });
  }, [erpData.taskVerifications, updateData]);

  const getTaskVerificationsByDepartment = useCallback((departmentCode: string) => {
    return erpData.taskVerifications
      .filter(tv => tv.departmentCode === departmentCode)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [erpData.taskVerifications]);

  const getTaskVerificationsByEmployee = useCallback((employeeId: string) => {
    return erpData.taskVerifications
      .filter(tv => tv.employeeId === employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [erpData.taskVerifications]);

  const getTaskVerificationsByLocation = useCallback((locationId: string) => {
    return erpData.taskVerifications
      .filter(tv => tv.locationId === locationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [erpData.taskVerifications]);

  const getTaskVerificationsToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return erpData.taskVerifications
      .filter(tv => tv.createdAt.startsWith(today))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [erpData.taskVerifications]);

  const flagTaskVerification = useCallback((id: string, reviewNotes?: string) => {
    const updated = erpData.taskVerifications.map(tv =>
      tv.id === id ? { ...tv, status: 'flagged' as const, reviewNotes } : tv
    );
    updateData({ taskVerifications: updated });
  }, [erpData.taskVerifications, updateData]);

  const reviewTaskVerification = useCallback((id: string, reviewerName: string, status: 'verified' | 'flagged', reviewNotes?: string) => {
    const updated = erpData.taskVerifications.map(tv =>
      tv.id === id ? {
        ...tv,
        status,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        reviewNotes,
      } : tv
    );
    updateData({ taskVerifications: updated });
  }, [erpData.taskVerifications, updateData]);

  const getTaskVerificationStats = useCallback((departmentCode?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    let verifications = erpData.taskVerifications;
    if (departmentCode) {
      verifications = verifications.filter(tv => tv.departmentCode === departmentCode);
    }

    const todayCount = verifications.filter(tv => tv.createdAt.startsWith(today)).length;
    const weekCount = verifications.filter(tv => tv.createdAt >= weekAgoStr).length;
    const flaggedCount = verifications.filter(tv => tv.status === 'flagged').length;
    const verifiedCount = verifications.filter(tv => tv.status === 'verified').length;
    const pendingReviewCount = verifications.filter(tv => tv.status === 'pending_review').length;

    const byCategory: Record<string, number> = {};
    verifications.forEach(tv => {
      byCategory[tv.categoryName] = (byCategory[tv.categoryName] || 0) + 1;
    });

    const byLocation: Record<string, number> = {};
    verifications.forEach(tv => {
      byLocation[tv.locationName] = (byLocation[tv.locationName] || 0) + 1;
    });

    return {
      totalToday: todayCount,
      totalWeek: weekCount,
      totalAll: verifications.length,
      flagged: flaggedCount,
      verified: verifiedCount,
      pendingReview: pendingReviewCount,
      byCategory,
      byLocation,
    };
  }, [erpData.taskVerifications]);

  const addVendor = useCallback((vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>) => {
    const vendorCode = `VND-${String(erpData.vendors.length + 1).padStart(3, '0')}`;
    const newVendor: Vendor = {
      ...vendor,
      id: `vendor-${Date.now()}`,
      vendorCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData({ vendors: [...erpData.vendors, newVendor] });
    console.log('Vendor added:', newVendor.id, newVendor.name);
    return newVendor;
  }, [erpData.vendors, updateData]);

  const updateVendor = useCallback((id: string, updates: Partial<Vendor>) => {
    const updated = erpData.vendors.map(v =>
      v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    );
    updateData({ vendors: updated });
    console.log('Vendor updated:', id);
  }, [erpData.vendors, updateData]);

  const deleteVendor = useCallback((id: string) => {
    updateData({ vendors: erpData.vendors.filter(v => v.id !== id) });
    console.log('Vendor deleted:', id);
  }, [erpData.vendors, updateData]);

  const getVendorById = useCallback((id: string) => {
    return erpData.vendors.find(v => v.id === id);
  }, [erpData.vendors]);

  const getVendorsByDepartment = useCallback((departmentCode: string) => {
    return erpData.vendors.filter(v => v.departments.includes(departmentCode));
  }, [erpData.vendors]);

  const getVendorsByCategory = useCallback((category: string) => {
    return erpData.vendors.filter(v => v.categories.includes(category));
  }, [erpData.vendors]);

  const getActiveVendors = useCallback(() => {
    return erpData.vendors.filter(v => v.status === 'active');
  }, [erpData.vendors]);

  const approveVendor = useCallback((id: string, approverName: string) => {
    const updated = erpData.vendors.map(v =>
      v.id === id ? {
        ...v,
        status: 'active' as const,
        approvedBy: approverName,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } : v
    );
    updateData({ vendors: updated });
    console.log('Vendor approved:', id);
  }, [erpData.vendors, updateData]);

  const suspendVendor = useCallback((id: string, reason?: string) => {
    const updated = erpData.vendors.map(v =>
      v.id === id ? {
        ...v,
        status: 'suspended' as const,
        notes: reason ? `${v.notes || ''}\nSuspended: ${reason}` : v.notes,
        updatedAt: new Date().toISOString(),
      } : v
    );
    updateData({ vendors: updated });
    console.log('Vendor suspended:', id);
  }, [erpData.vendors, updateData]);

  const addPriceAgreement = useCallback((agreement: Omit<VendorPriceAgreement, 'id' | 'createdAt'>) => {
    const newAgreement: VendorPriceAgreement = {
      ...agreement,
      id: `pa-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ priceAgreements: [...erpData.priceAgreements, newAgreement] });
    console.log('Price agreement added:', newAgreement.id);
    return newAgreement;
  }, [erpData.priceAgreements, updateData]);

  const updatePriceAgreement = useCallback((id: string, updates: Partial<VendorPriceAgreement>) => {
    const updated = erpData.priceAgreements.map(pa =>
      pa.id === id ? { ...pa, ...updates } : pa
    );
    updateData({ priceAgreements: updated });
  }, [erpData.priceAgreements, updateData]);

  const deletePriceAgreement = useCallback((id: string) => {
    updateData({ priceAgreements: erpData.priceAgreements.filter(pa => pa.id !== id) });
  }, [erpData.priceAgreements, updateData]);

  const getPriceAgreementsForVendor = useCallback((vendorId: string) => {
    return erpData.priceAgreements.filter(pa => pa.vendorId === vendorId);
  }, [erpData.priceAgreements]);

  const getPriceAgreementsForMaterial = useCallback((materialId: string) => {
    return erpData.priceAgreements.filter(pa => pa.materialId === materialId);
  }, [erpData.priceAgreements]);

  const getActivePriceAgreements = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return erpData.priceAgreements.filter(pa =>
      pa.effectiveDate <= today && (!pa.expirationDate || pa.expirationDate >= today)
    );
  }, [erpData.priceAgreements]);

  const getVendorStats = useCallback(() => {
    const active = erpData.vendors.filter(v => v.status === 'active').length;
    const pending = erpData.vendors.filter(v => v.status === 'pending_approval').length;
    const suspended = erpData.vendors.filter(v => v.status === 'suspended').length;
    const suppliers = erpData.vendors.filter(v => v.type === 'supplier').length;
    const services = erpData.vendors.filter(v => v.type === 'service').length;
    const contractors = erpData.vendors.filter(v => v.type === 'contractor').length;
    const avgOnTimeDelivery = erpData.vendors.reduce((sum, v) => sum + v.performance.onTimeDeliveryRate, 0) / (erpData.vendors.length || 1);
    const avgQualityScore = erpData.vendors.reduce((sum, v) => sum + v.performance.qualityScore, 0) / (erpData.vendors.length || 1);

    return {
      total: erpData.vendors.length,
      active,
      pending,
      suspended,
      suppliers,
      services,
      contractors,
      avgOnTimeDelivery: Math.round(avgOnTimeDelivery * 10) / 10,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      activePriceAgreements: getActivePriceAgreements().length,
    };
  }, [erpData.vendors, getActivePriceAgreements]);

  const addJobRequisition = useCallback((job: Omit<JobRequisition, 'id' | 'createdAt'>) => {
    const newJob: JobRequisition = {
      ...job,
      id: `JR-${String(erpData.jobRequisitions.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ jobRequisitions: [...erpData.jobRequisitions, newJob] });
    return newJob;
  }, [erpData.jobRequisitions, updateData]);

  const updateJobRequisition = useCallback((id: string, updates: Partial<JobRequisition>) => {
    const updated = erpData.jobRequisitions.map(j =>
      j.id === id ? { ...j, ...updates } : j
    );
    updateData({ jobRequisitions: updated });
  }, [erpData.jobRequisitions, updateData]);

  const addCandidate = useCallback((candidate: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCandidate: Candidate = {
      ...candidate,
      id: `CND-${String(erpData.candidates.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData({ candidates: [...erpData.candidates, newCandidate] });
    return newCandidate;
  }, [erpData.candidates, updateData]);

  const updateCandidate = useCallback((id: string, updates: Partial<Candidate>) => {
    const updated = erpData.candidates.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    updateData({ candidates: updated });
  }, [erpData.candidates, updateData]);

  const addApplication = useCallback((application: Omit<Application, 'id' | 'appliedDate' | 'lastActivityDate'>) => {
    const newApplication: Application = {
      ...application,
      id: `APP-${String(erpData.applications.length + 1).padStart(3, '0')}`,
      appliedDate: new Date().toISOString(),
      lastActivityDate: new Date().toISOString(),
    };
    updateData({ applications: [...erpData.applications, newApplication] });
    return newApplication;
  }, [erpData.applications, updateData]);

  const updateApplication = useCallback((id: string, updates: Partial<Application>) => {
    const updated = erpData.applications.map(a =>
      a.id === id ? { ...a, ...updates, lastActivityDate: new Date().toISOString() } : a
    );
    updateData({ applications: updated });
  }, [erpData.applications, updateData]);

  const addInterview = useCallback((interview: Omit<Interview, 'id' | 'createdAt'>) => {
    const newInterview: Interview = {
      ...interview,
      id: `INT-${String(erpData.interviews.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ interviews: [...erpData.interviews, newInterview] });
    return newInterview;
  }, [erpData.interviews, updateData]);

  const updateInterview = useCallback((id: string, updates: Partial<Interview>) => {
    const updated = erpData.interviews.map(i =>
      i.id === id ? { ...i, ...updates } : i
    );
    updateData({ interviews: updated });
  }, [erpData.interviews, updateData]);

  const addOffer = useCallback((offer: Omit<Offer, 'id' | 'createdAt'>) => {
    const newOffer: Offer = {
      ...offer,
      id: `OFR-${String(erpData.offers.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ offers: [...erpData.offers, newOffer] });
    return newOffer;
  }, [erpData.offers, updateData]);

  const updateOffer = useCallback((id: string, updates: Partial<Offer>) => {
    const updated = erpData.offers.map(o =>
      o.id === id ? { ...o, ...updates } : o
    );
    updateData({ offers: updated });
  }, [erpData.offers, updateData]);

  const addCandidateNote = useCallback((note: Omit<CandidateNote, 'id' | 'createdAt'>) => {
    const newNote: CandidateNote = {
      ...note,
      id: `NOTE-${String(erpData.candidateNotes.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    updateData({ candidateNotes: [...erpData.candidateNotes, newNote] });
    return newNote;
  }, [erpData.candidateNotes, updateData]);

  const addGoal = useCallback((goal: Goal) => {
    updateData({ goals: [...erpData.goals, goal] });
  }, [erpData.goals, updateData]);

  const updateGoal = useCallback((goalId: string, updates: Partial<Goal>) => {
    const updated = erpData.goals.map(g => 
      g.id === goalId ? { ...g, ...updates } : g
    );
    updateData({ goals: updated });
  }, [erpData.goals, updateData]);

  const deleteGoal = useCallback((goalId: string) => {
    updateData({ goals: erpData.goals.filter(g => g.id !== goalId) });
  }, [erpData.goals, updateData]);

  const getPartRequestsForWorkOrder = useCallback((workOrderId: string) => {
    return erpData.partRequests.filter(pr => pr.workOrderId === workOrderId);
  }, [erpData.partRequests]);

  const getPartIssuesForWorkOrder = useCallback((workOrderId: string) => {
    return erpData.partIssues.filter(pi => pi.workOrderId === workOrderId);
  }, [erpData.partIssues]);

  const getPartReturnsForWorkOrder = useCallback((workOrderId: string) => {
    return erpData.partReturns.filter(pr => pr.workOrderId === workOrderId);
  }, [erpData.partReturns]);

  const getWorkOrderPartsSummary = useCallback((workOrderId: string) => {
    const requests = erpData.partRequests.filter(pr => pr.workOrderId === workOrderId);
    const issues = erpData.partIssues.filter(pi => pi.workOrderId === workOrderId);
    const returns = erpData.partReturns.filter(pr => pr.workOrderId === workOrderId);

    const totalEstimatedCost = requests.reduce((sum, r) => sum + r.totalEstimatedCost, 0);
    const totalIssuedCost = issues.reduce((sum, i) => sum + i.totalCost, 0);
    const totalReturnCredit = returns.reduce((sum, r) => sum + r.totalCreditAmount, 0);
    const totalActualCost = totalIssuedCost - totalReturnCredit;

    const allLines = requests.flatMap(r => r.lines);
    const totalQuantityRequested = allLines.reduce((sum, l) => sum + l.quantityRequested, 0);
    const totalQuantityIssued = allLines.reduce((sum, l) => sum + l.quantityIssued, 0);
    const totalQuantityReturned = allLines.reduce((sum, l) => sum + l.quantityReturned, 0);
    const totalQuantityConsumed = totalQuantityIssued - totalQuantityReturned;

    return {
      workOrderId,
      totalPartRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'pending_approval').length,
      approvedRequests: requests.filter(r => r.status === 'approved' || r.status === 'issued' || r.status === 'completed').length,
      totalLinesRequested: allLines.length,
      totalLinesIssued: allLines.filter(l => l.quantityIssued > 0).length,
      totalQuantityRequested,
      totalQuantityIssued,
      totalQuantityReturned,
      totalQuantityConsumed,
      totalEstimatedCost,
      totalIssuedCost,
      totalReturnCredit,
      totalActualCost,
    };
  }, [erpData.partRequests, erpData.partIssues, erpData.partReturns]);

  const addPartRequest = useCallback((request: Omit<WorkOrderPartRequest, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt'>) => {
    const newRequest: WorkOrderPartRequest = {
      ...request,
      id: `pr-${Date.now()}`,
      requestNumber: generatePartRequestNumber(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateData({ partRequests: [...erpData.partRequests, newRequest] });
    console.log('Part request created:', newRequest.requestNumber);
    return newRequest;
  }, [erpData.partRequests, updateData]);

  const updatePartRequest = useCallback((id: string, updates: Partial<WorkOrderPartRequest>) => {
    const updated = erpData.partRequests.map(pr =>
      pr.id === id ? { ...pr, ...updates, updatedAt: new Date().toISOString() } : pr
    );
    updateData({ partRequests: updated });
  }, [erpData.partRequests, updateData]);

  const approvePartRequest = useCallback((id: string, approverName: string, approverId: string) => {
    const updated = erpData.partRequests.map(pr => {
      if (pr.id === id) {
        const approvedLines = pr.lines.map(line => ({
          ...line,
          quantityApproved: line.quantityRequested,
        }));
        return {
          ...pr,
          status: 'approved' as PartRequestStatus,
          approvedBy: approverId,
          approvedByName: approverName,
          approvedAt: new Date().toISOString(),
          lines: approvedLines,
          updatedAt: new Date().toISOString(),
        };
      }
      return pr;
    });
    updateData({ partRequests: updated });
    console.log('Part request approved:', id);
  }, [erpData.partRequests, updateData]);

  const issuePartRequestLine = useCallback((requestId: string, lineId: string, quantityToIssue: number, issuedBy: string, issuedByName: string) => {
    const request = erpData.partRequests.find(pr => pr.id === requestId);
    if (!request) return null;

    const line = request.lines.find(l => l.id === lineId);
    if (!line) return null;

    const material = erpData.materials.find(m => m.id === line.materialId);
    if (!material || material.on_hand < quantityToIssue) {
      console.error('Insufficient stock for issue');
      return null;
    }

    const newIssue: PartIssueRecord = {
      id: `iss-${Date.now()}`,
      issueNumber: generateIssueNumber(),
      partRequestId: requestId,
      partRequestNumber: request.requestNumber,
      workOrderId: request.workOrderId,
      workOrderNumber: request.workOrderNumber,
      materialId: line.materialId,
      materialName: line.materialName,
      materialSku: line.materialSku,
      quantityIssued: quantityToIssue,
      unitOfMeasure: line.unitOfMeasure,
      unitCostAtIssue: line.unitCost,
      totalCost: quantityToIssue * line.unitCost,
      issuedFromWarehouse: line.warehouseLocation || 'Main Warehouse',
      issuedFromBin: line.binLocation,
      lotNumber: line.lotNumber,
      serialNumber: line.serialNumber,
      issuedBy,
      issuedByName,
      issuedAt: new Date().toISOString(),
    };

    const updatedRequests = erpData.partRequests.map(pr => {
      if (pr.id === requestId) {
        const updatedLines = pr.lines.map(l => {
          if (l.id === lineId) {
            const newQuantityIssued = l.quantityIssued + quantityToIssue;
            return {
              ...l,
              quantityIssued: newQuantityIssued,
              status: newQuantityIssued >= l.quantityApproved ? 'issued' as const : 'pending' as const,
            };
          }
          return l;
        });
        const allIssued = updatedLines.every(l => l.quantityIssued >= l.quantityApproved);
        const someIssued = updatedLines.some(l => l.quantityIssued > 0);
        return {
          ...pr,
          lines: updatedLines,
          status: allIssued ? 'issued' as PartRequestStatus : someIssued ? 'partially_issued' as PartRequestStatus : pr.status,
          totalLinesIssued: updatedLines.filter(l => l.quantityIssued > 0).length,
          totalActualCost: updatedLines.reduce((sum, l) => sum + (l.quantityIssued * l.unitCost), 0),
          updatedAt: new Date().toISOString(),
        };
      }
      return pr;
    });

    updateData({
      partRequests: updatedRequests,
      partIssues: [...erpData.partIssues, newIssue],
    });

    console.log('Part issued:', newIssue.issueNumber);
    return newIssue;
  }, [erpData.partRequests, erpData.partIssues, erpData.materials, updateData]);

  const getPartsUsageByMaterial = useCallback((materialId: string) => {
    const issues = erpData.partIssues.filter(pi => pi.materialId === materialId);
    const workOrderIds = [...new Set(issues.map(i => i.workOrderId))];
    const workOrders = workOrderIds.map(woId => {
      const wo = erpData.workOrders.find(w => w.id === woId);
      const woIssues = issues.filter(i => i.workOrderId === woId);
      return {
        workOrderId: woId,
        workOrderNumber: wo?.title || woIssues[0]?.workOrderNumber || 'Unknown',
        workOrderTitle: wo?.title || 'Unknown',
        quantityUsed: woIssues.reduce((sum, i) => sum + i.quantityIssued, 0),
        totalCost: woIssues.reduce((sum, i) => sum + i.totalCost, 0),
        issuedAt: woIssues[0]?.issuedAt || '',
      };
    });
    return workOrders.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }, [erpData.partIssues, erpData.workOrders]);

  const getLowStockAlerts = useCallback(() => {
    return erpData.materials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level).map(m => ({
      materialId: m.id,
      materialName: m.name,
      materialSku: m.sku,
      currentStock: m.on_hand,
      minLevel: m.min_level,
      percentOfMin: Math.round((m.on_hand / m.min_level) * 100),
      recentUsage: erpData.partIssues
        .filter(pi => pi.materialId === m.id)
        .slice(0, 5)
        .map(pi => ({ workOrderNumber: pi.workOrderNumber, quantity: pi.quantityIssued, date: pi.issuedAt })),
    }));
  }, [erpData.materials, erpData.partIssues]);

  const getAlertById = useCallback((alertId: string) => {
    return erpData.lowStockAlerts.find(a => a.id === alertId);
  }, [erpData.lowStockAlerts]);

  const getAlertByMaterialId = useCallback((materialId: string) => {
    return erpData.lowStockAlerts.find(a => a.materialId === materialId);
  }, [erpData.lowStockAlerts]);

  const getActiveAlerts = useCallback(() => {
    return erpData.lowStockAlerts.filter(a => a.status === 'active');
  }, [erpData.lowStockAlerts]);

  const getCriticalAlerts = useCallback(() => {
    return erpData.lowStockAlerts.filter(a => a.severity === 'critical' && a.status === 'active');
  }, [erpData.lowStockAlerts]);

  const getAlertsByStatus = useCallback((status: LowStockAlertStatus | LowStockAlertStatus[]) => {
    const statuses = Array.isArray(status) ? status : [status];
    return erpData.lowStockAlerts.filter(a => statuses.includes(a.status));
  }, [erpData.lowStockAlerts]);

  const getAlertsBySeverity = useCallback((severity: LowStockAlertSeverity | LowStockAlertSeverity[]) => {
    const severities = Array.isArray(severity) ? severity : [severity];
    return erpData.lowStockAlerts.filter(a => severities.includes(a.severity));
  }, [erpData.lowStockAlerts]);

  const getAlertsByFacility = useCallback((facilityId: string) => {
    return erpData.lowStockAlerts.filter(a => a.facilityId === facilityId);
  }, [erpData.lowStockAlerts]);

  const getAlertsByCategory = useCallback((category: string) => {
    return erpData.lowStockAlerts.filter(a => a.category === category);
  }, [erpData.lowStockAlerts]);

  const acknowledgeAlert = useCallback((alertId: string, userId: string, userName: string, comment?: string) => {
    const now = new Date().toISOString();
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'acknowledge',
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
      comment,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        status: 'acknowledged' as LowStockAlertStatus,
        acknowledgedBy: userId,
        acknowledgedByName: userName,
        acknowledgedAt: now,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
    console.log('Alert acknowledged:', alertId);
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const snoozeAlert = useCallback((alertId: string, userId: string, userName: string, snoozeUntil: string, comment?: string) => {
    const now = new Date().toISOString();
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'snooze',
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
      snoozeUntil,
      comment,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        status: 'snoozed' as LowStockAlertStatus,
        snoozedUntil: snoozeUntil,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
    console.log('Alert snoozed until:', snoozeUntil);
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const resolveAlert = useCallback((alertId: string, userId: string, userName: string, reason: string) => {
    const now = new Date().toISOString();
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'resolve',
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
      comment: reason,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        status: 'resolved' as LowStockAlertStatus,
        resolvedBy: userId,
        resolvedByName: userName,
        resolvedAt: now,
        resolvedReason: reason,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
    console.log('Alert resolved:', alertId);
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const autoResolveAlert = useCallback((alertId: string, reason: string) => {
    const now = new Date().toISOString();
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'resolve',
      performedBy: 'system',
      performedByName: 'System',
      performedAt: now,
      comment: reason,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        status: 'auto_resolved' as LowStockAlertStatus,
        resolvedBy: 'system',
        resolvedByName: 'System',
        resolvedAt: now,
        resolvedReason: reason,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
    console.log('Alert auto-resolved:', alertId);
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const escalateAlert = useCallback((alertId: string, newSeverity: LowStockAlertSeverity, reason?: string) => {
    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        severity: newSeverity,
      } : a
    );
    updateData({ lowStockAlerts: updatedAlerts });
    console.log('Alert escalated to:', newSeverity, reason);
  }, [erpData.lowStockAlerts, updateData]);

  const addAlertComment = useCallback((alertId: string, userId: string, userName: string, comment: string) => {
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'comment',
      performedBy: userId,
      performedByName: userName,
      performedAt: new Date().toISOString(),
      comment,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const linkPOToAlert = useCallback((alertId: string, userId: string, userName: string, poId: string, poNumber: string, poQty: number, expectedDate?: string) => {
    const now = new Date().toISOString();
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'create_po',
      performedBy: userId,
      performedByName: userName,
      performedAt: now,
      linkedDocumentId: poId,
      linkedDocumentNumber: poNumber,
      comment: `PO created for ${poQty} units`,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        pendingPOId: poId,
        pendingPONumber: poNumber,
        pendingPOQty: poQty,
        pendingPOExpectedDate: expectedDate,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
    console.log('PO linked to alert:', alertId, poNumber);
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const linkRequisitionToAlert = useCallback((alertId: string, userId: string, userName: string, reqId: string, reqNumber: string) => {
    const action: AlertAction = {
      id: `aa-${Date.now()}`,
      alertId,
      actionType: 'create_requisition',
      performedBy: userId,
      performedByName: userName,
      performedAt: new Date().toISOString(),
      linkedDocumentId: reqId,
      linkedDocumentNumber: reqNumber,
    };

    const updatedAlerts = erpData.lowStockAlerts.map(a =>
      a.id === alertId ? {
        ...a,
        actions: [...a.actions, action],
      } : a
    );

    updateData({
      lowStockAlerts: updatedAlerts,
      alertActions: [...erpData.alertActions, action],
    });
    console.log('Requisition linked to alert:', alertId, reqNumber);
  }, [erpData.lowStockAlerts, erpData.alertActions, updateData]);

  const updateAlertStockLevel = useCallback((alertId: string, newCurrentStock: number) => {
    const updatedAlerts = erpData.lowStockAlerts.map(a => {
      if (a.id === alertId) {
        const percentOfMin = a.minLevel > 0 ? Math.round((newCurrentStock / a.minLevel) * 100) : 0;
        const percentOfSafety = a.safetyStock && a.safetyStock > 0 
          ? Math.round((newCurrentStock / a.safetyStock) * 100) 
          : undefined;
        return {
          ...a,
          currentStock: newCurrentStock,
          percentOfMin,
          percentOfSafety,
        };
      }
      return a;
    });
    updateData({ lowStockAlerts: updatedAlerts });
  }, [erpData.lowStockAlerts, updateData]);

  const getAlertSummary = useCallback((): LowStockAlertSummary => {
    const alerts = erpData.lowStockAlerts;
    const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
    
    const categoryMap = new Map<string, number>();
    const facilityMap = new Map<string, number>();
    
    activeAlerts.forEach(a => {
      categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
      facilityMap.set(a.facilityName, (facilityMap.get(a.facilityName) || 0) + 1);
    });

    return {
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
      warningCount: alerts.filter(a => a.severity === 'warning' && a.status === 'active').length,
      infoCount: alerts.filter(a => a.severity === 'info' && a.status === 'active').length,
      acknowledgedCount: alerts.filter(a => a.status === 'acknowledged').length,
      unresolvedCount: alerts.filter(a => a.status !== 'resolved' && a.status !== 'auto_resolved').length,
      stockoutCount: alerts.filter(a => a.triggerType === 'stockout' && a.status === 'active').length,
      alertsByCategory: Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count })),
      alertsByFacility: Array.from(facilityMap.entries()).map(([facility, count]) => ({ facility, count })),
      totalEstimatedImpact: activeAlerts.reduce((sum, a) => sum + (a.estimatedStockoutCost || 0), 0),
      alertsRequiringAction: alerts.filter(a => a.status === 'active' && a.severity !== 'info').length,
    };
  }, [erpData.lowStockAlerts]);

  const getActionsForAlert = useCallback((alertId: string) => {
    return erpData.alertActions
      .filter(a => a.alertId === alertId)
      .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  }, [erpData.alertActions]);

  const checkAndReactivateSnoozedAlerts = useCallback(() => {
    const now = new Date().toISOString();
    const updatedAlerts = erpData.lowStockAlerts.map(a => {
      if (a.status === 'snoozed' && a.snoozedUntil && a.snoozedUntil <= now) {
        console.log('Reactivating snoozed alert:', a.id);
        return {
          ...a,
          status: 'active' as LowStockAlertStatus,
          snoozedUntil: undefined,
        };
      }
      return a;
    });

    const hasChanges = updatedAlerts.some((a, i) => a.status !== erpData.lowStockAlerts[i].status);
    if (hasChanges) {
      updateData({ lowStockAlerts: updatedAlerts });
    }
  }, [erpData.lowStockAlerts, updateData]);

  const getAlertStatsByTimeRange = useCallback((startDate: string, endDate: string) => {
    const alerts = erpData.lowStockAlerts.filter(a => {
      const createdAt = a.createdAt;
      return createdAt >= startDate && createdAt <= endDate;
    });

    const created = alerts.length;
    const resolved = alerts.filter(a => a.status === 'resolved' || a.status === 'auto_resolved').length;
    const avgResolutionTime = alerts
      .filter(a => a.resolvedAt && a.createdAt)
      .reduce((sum, a) => {
        const created = new Date(a.createdAt).getTime();
        const resolved = new Date(a.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0) / (resolved || 1);

    const bySeverity = {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    };

    const byTriggerType = {
      stockout: alerts.filter(a => a.triggerType === 'stockout').length,
      below_min: alerts.filter(a => a.triggerType === 'below_min').length,
      approaching_min: alerts.filter(a => a.triggerType === 'approaching_min').length,
      below_safety_stock: alerts.filter(a => a.triggerType === 'below_safety_stock').length,
      high_consumption: alerts.filter(a => a.triggerType === 'high_consumption').length,
    };

    return {
      period: { startDate, endDate },
      totalCreated: created,
      totalResolved: resolved,
      resolutionRate: created > 0 ? Math.round((resolved / created) * 100) : 0,
      avgResolutionTimeMs: Math.round(avgResolutionTime),
      avgResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60) * 10) / 10,
      bySeverity,
      byTriggerType,
      stillActive: alerts.filter(a => a.status === 'active' || a.status === 'acknowledged').length,
    };
  }, [erpData.lowStockAlerts]);

  const getAlertTrends = useCallback((days: number = 30) => {
    const now = new Date();
    const trends: { date: string; created: number; resolved: number; active: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const createdOnDay = erpData.lowStockAlerts.filter(a => 
        a.createdAt.startsWith(dateStr)
      ).length;

      const resolvedOnDay = erpData.lowStockAlerts.filter(a => 
        a.resolvedAt && a.resolvedAt.startsWith(dateStr)
      ).length;

      const activeOnDay = erpData.lowStockAlerts.filter(a => {
        const createdDate = a.createdAt.split('T')[0];
        const resolvedDate = a.resolvedAt?.split('T')[0];
        return createdDate <= dateStr && (!resolvedDate || resolvedDate > dateStr);
      }).length;

      trends.push({
        date: dateStr,
        created: createdOnDay,
        resolved: resolvedOnDay,
        active: activeOnDay,
      });
    }

    const totalCreated = trends.reduce((sum, t) => sum + t.created, 0);
    const totalResolved = trends.reduce((sum, t) => sum + t.resolved, 0);
    const avgDaily = Math.round((totalCreated / days) * 10) / 10;
    const peakDay = trends.reduce((max, t) => t.created > max.created ? t : max, trends[0]);

    return {
      days,
      trends,
      totalCreated,
      totalResolved,
      avgDailyCreated: avgDaily,
      peakDay: peakDay?.date || '',
      peakDayCount: peakDay?.created || 0,
      netChange: totalCreated - totalResolved,
    };
  }, [erpData.lowStockAlerts]);

  const getAlertMetrics = useCallback(() => {
    const alerts = erpData.lowStockAlerts;
    const actions = erpData.alertActions;

    const resolvedAlerts = alerts.filter(a => a.resolvedAt && a.createdAt);
    const avgResolutionTimeMs = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, a) => {
          const created = new Date(a.createdAt).getTime();
          const resolved = new Date(a.resolvedAt!).getTime();
          return sum + (resolved - created);
        }, 0) / resolvedAlerts.length
      : 0;

    const acknowledgedAlerts = alerts.filter(a => a.acknowledgedAt && a.createdAt);
    const avgAcknowledgeTimeMs = acknowledgedAlerts.length > 0
      ? acknowledgedAlerts.reduce((sum, a) => {
          const created = new Date(a.createdAt).getTime();
          const acknowledged = new Date(a.acknowledgedAt!).getTime();
          return sum + (acknowledged - created);
        }, 0) / acknowledgedAlerts.length
      : 0;

    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysStr = last7Days.toISOString();

    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);
    const last30DaysStr = last30Days.toISOString();

    const alertsLast7Days = alerts.filter(a => a.createdAt >= last7DaysStr).length;
    const alertsLast30Days = alerts.filter(a => a.createdAt >= last30DaysStr).length;
    const resolvedLast7Days = alerts.filter(a => a.resolvedAt && a.resolvedAt >= last7DaysStr).length;
    const resolvedLast30Days = alerts.filter(a => a.resolvedAt && a.resolvedAt >= last30DaysStr).length;

    const actionsLast7Days = actions.filter(a => a.performedAt >= last7DaysStr).length;
    const posCreated = actions.filter(a => a.actionType === 'create_po').length;
    const requisitionsCreated = actions.filter(a => a.actionType === 'create_requisition').length;

    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.status === 'active').length,
      avgResolutionTimeHours: Math.round(avgResolutionTimeMs / (1000 * 60 * 60) * 10) / 10,
      avgAcknowledgeTimeMinutes: Math.round(avgAcknowledgeTimeMs / (1000 * 60) * 10) / 10,
      resolutionRate7Days: alertsLast7Days > 0 ? Math.round((resolvedLast7Days / alertsLast7Days) * 100) : 0,
      resolutionRate30Days: alertsLast30Days > 0 ? Math.round((resolvedLast30Days / alertsLast30Days) * 100) : 0,
      alertsLast7Days,
      alertsLast30Days,
      resolvedLast7Days,
      resolvedLast30Days,
      actionsLast7Days,
      totalPOsCreated: posCreated,
      totalRequisitionsCreated: requisitionsCreated,
      autoResolvedCount: alerts.filter(a => a.status === 'auto_resolved').length,
      manuallyResolvedCount: alerts.filter(a => a.status === 'resolved').length,
      snoozedCount: alerts.filter(a => a.status === 'snoozed').length,
    };
  }, [erpData.lowStockAlerts, erpData.alertActions]);

  const updateAlertPreferences = useCallback((updates: Partial<AlertPreferences>) => {
    const updatedPrefs: AlertPreferences = {
      ...erpData.alertPreferences,
      ...updates,
      thresholds: { ...erpData.alertPreferences.thresholds, ...updates.thresholds },
      notifications: { ...erpData.alertPreferences.notifications, ...updates.notifications },
      autoEscalation: { ...erpData.alertPreferences.autoEscalation, ...updates.autoEscalation },
      snooze: { ...erpData.alertPreferences.snooze, ...updates.snooze },
      display: { ...erpData.alertPreferences.display, ...updates.display },
      updatedAt: new Date().toISOString(),
    };
    updateData({ alertPreferences: updatedPrefs });
    console.log('Alert preferences updated');
  }, [erpData.alertPreferences, updateData]);

  const resetAlertPreferences = useCallback(() => {
    updateData({ alertPreferences: DEFAULT_ALERT_PREFERENCES });
    console.log('Alert preferences reset to defaults');
  }, [updateData]);

  const saveAlertPreferences = useCallback(async (preferences: AlertPreferences): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedPrefs: AlertPreferences = {
        ...preferences,
        updatedAt: new Date().toISOString(),
      };
      updateData({ alertPreferences: updatedPrefs });
      console.log('Alert preferences saved successfully');
      return { success: true };
    } catch (error) {
      console.error('Error saving alert preferences:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save preferences' };
    }
  }, [updateData]);

  const getInventoryModuleAlertCounts = useCallback(() => {
    const materials = erpData.materials;
    const lowStockAlerts = erpData.lowStockAlerts;
    
    const lowStockCount = materials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level).length;
    const outOfStockCount = materials.filter(m => m.on_hand === 0).length;
    const overstockCount = materials.filter(m => m.max_level && m.on_hand > m.max_level).length;
    
    const activeAlerts = lowStockAlerts.filter(a => a.status === 'active' || a.status === 'acknowledged');
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning').length;
    
    const lotTrackedItems = materials.filter(m => 
      m.labels?.some(l => l.toLowerCase().includes('lot') || l.toLowerCase().includes('serial'))
    ).length;
    
    const pendingCountSessions = erpData.countSessions.filter(cs => cs.status === 'in_progress').length;
    const varianceItems = erpData.countSessions
      .filter(cs => cs.status === 'completed')
      .reduce((sum, cs) => sum + (cs.variance_count || 0), 0);
    
    const quarantineItems = materials.filter(m => 
      m.labels?.some(l => l.toLowerCase().includes('quarantine') || l.toLowerCase().includes('hold'))
    ).length;
    
    return {
      'item-master': {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
      },
      'tracking': {
        total: lotTrackedItems > 0 ? 1 : 0,
        critical: 0,
        warning: 0,
        info: lotTrackedItems > 0 ? 1 : 0,
      },
      'operations': {
        total: pendingCountSessions + (varianceItems > 0 ? 1 : 0),
        critical: 0,
        warning: pendingCountSessions,
        info: varianceItems > 0 ? 1 : 0,
      },
      'levels': {
        total: lowStockCount + outOfStockCount + overstockCount,
        critical: outOfStockCount + criticalAlerts,
        warning: lowStockCount + warningAlerts,
        info: overstockCount,
      },
      'valuation': {
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
      },
      'special': {
        total: quarantineItems,
        critical: 0,
        warning: quarantineItems,
        info: 0,
      },
    };
  }, [erpData.materials, erpData.lowStockAlerts, erpData.countSessions]);

  const stats = useMemo(() => ({
    totalMaterials: erpData.materials.length,
    lowStockCount: erpData.materials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level).length,
    outOfStockCount: erpData.materials.filter(m => m.on_hand === 0).length,
    overstockCount: erpData.materials.filter(m => m.max_level && m.on_hand > m.max_level).length,
    inventoryValue: erpData.materials.reduce((acc, m) => acc + (m.on_hand * m.unit_price), 0),
    openWorkOrders: erpData.workOrders.filter(wo => wo.status === 'open').length,
    inProgressWorkOrders: erpData.workOrders.filter(wo => wo.status === 'in_progress').length,
    overdueWorkOrders: erpData.workOrders.filter(wo => wo.status === 'overdue').length,
    completedWorkOrders: erpData.workOrders.filter(wo => wo.status === 'completed').length,
    pendingApprovals: erpData.approvals.filter(a => a.status === 'pending').length,
    pendingPOs: erpData.purchaseOrders.filter(po => po.status === 'pending').length,
    totalEmployees: erpData.employees.length,
    activeEmployees: erpData.employees.filter(e => e.status === 'active').length,
    pendingTasks: erpData.tasks.filter(t => t.status === 'pending').length,
    inProgressTasks: erpData.tasks.filter(t => t.status === 'in_progress').length,
    activeCountSessions: erpData.countSessions.filter(cs => cs.status === 'in_progress').length,
    totalLabels: erpData.inventoryLabels.length,
    totalAssets: erpData.assets.length,
    activeAssets: erpData.assets.filter(a => a.status === 'active').length,
    maintenanceAssets: erpData.assets.filter(a => a.status === 'maintenance').length,
    totalEquipment: erpData.equipment.length,
    operationalEquipment: erpData.equipment.filter(e => e.status === 'operational').length,
    downEquipment: erpData.equipment.filter(e => e.status === 'down').length,
    needsMaintenanceEquipment: erpData.equipment.filter(e => e.status === 'needs_maintenance').length,
    totalPMSchedules: erpData.pmSchedules.filter(s => s.active).length,
    upcomingPMs: erpData.pmWorkOrders.filter(wo => wo.status === 'scheduled').length,
    overduePMs: erpData.pmWorkOrders.filter(wo => wo.status === 'overdue' || (wo.status === 'scheduled' && wo.scheduled_date < new Date().toISOString().split('T')[0])).length,
    completedPMs: erpData.pmWorkOrders.filter(wo => wo.status === 'completed').length,
    inProgressPMs: erpData.pmWorkOrders.filter(wo => wo.status === 'in_progress').length,
    activeInspectionTemplates: erpData.inspectionTemplates.filter(t => t.active).length,
    totalTrackedItems: erpData.trackedItems.filter(i => i.status === 'active').length,
    recentInspections: erpData.inspectionRecords.filter(r => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.created_at) >= weekAgo;
    }).length,
    failedInspections: erpData.inspectionRecords.filter(r => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.created_at) >= weekAgo && r.result === 'fail';
    }).length,
  }), [erpData]);

  const lowStockMaterials = useMemo(() => 
    erpData.materials.filter(m => m.on_hand > 0 && m.on_hand <= m.min_level),
  [erpData.materials]);

  const overstockMaterials = useMemo(() => 
    erpData.materials.filter(m => m.max_level && m.on_hand > m.max_level),
  [erpData.materials]);

  const outOfStockMaterials = useMemo(() => 
    erpData.materials.filter(m => m.on_hand === 0),
  [erpData.materials]);

  return {
    ...erpData,
    isLoading,
    stats,
    lowStockMaterials,
    overstockMaterials,
    outOfStockMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    quickAdjust,
    addLabel,
    updateLabel,
    deleteLabel,
    assignLabel,
    removeLabel,
    addHistoryEntry,
    createCountSession,
    updateCountSession,
    recordCount,
    applyCountVariances,
    deleteCountSession,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    completeWorkOrder,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    addPurchaseApproval,
    addTimeApproval,
    updateApprovalSettings,
    calculateRequiredTier,
    approvePurchaseTier,
    rejectPurchaseTier,
    approveTimeManager,
    approveTimeHR,
    rejectTimeApproval,
    updateApprovalPONumber,
    updateApprovalMIGO,
    addPermitApproval,
    approvePermit,
    rejectPermit,
    resubmitPermit,
    getPermitHistory,
    addTask,
    updateTask,
    deleteTask,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    findByBarcode,
    addAsset,
    updateAsset,
    deleteAsset,
    consumePart,
    associatePartWithAsset,
    getPartUsageForAsset,
    getPartUsageForMaterial,
    updateEmployeeAvailability,
    addShift,
    updateShift,
    deleteShift,
    getEmployeeShifts,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    getActiveTimeEntry,
    isOnBreak,
    addTimeOffRequest,
    updateTimeOffRequest,
    approveTimeOff,
    rejectTimeOff,
    addShiftSwapRequest,
    updateShiftSwapRequest,
    acceptShiftSwap,
    approveShiftSwap,
    getEmployeeTimeEntries,
    getEmployeeTimeOffRequests,
    updateTimeOffSettings,
    updateEmployeeTimeOffBalances,
    getBreakHistory,
    getEmployeeTimeOffHistory,
    addBulletinPost,
    updateBulletinPost,
    deleteBulletinPost,
    getActiveBulletinPosts,
    updateEmployeeProfile,
    addEquipment,
    updateEquipment,
    deleteEquipment,
    addPMSchedule,
    updatePMSchedule,
    deletePMSchedule,
    addPMWorkOrder,
    updatePMWorkOrder,
    deletePMWorkOrder,
    startPMWorkOrder,
    completePMTask,
    completePMWorkOrder,
    generatePMWorkOrder,
    getUpcomingPMs,
    getOverduePMs,
    getEquipmentPMHistory,
    addInspectionTemplate,
    updateInspectionTemplate,
    deleteInspectionTemplate,
    addTrackedItem,
    updateTrackedItem,
    deleteTrackedItem,
    addInspectionRecord,
    updateInspectionRecord,
    deleteInspectionRecord,
    getInspectionsByTemplate,
    getInspectionsByTrackedItem,
    getTrackedItemsForTemplate,
    getTrackedItemChanges,
    getInspectionCompliance,
    getInspectionHistory,
    addInspectionSchedule,
    updateInspectionSchedule,
    deleteInspectionSchedule,
    completeInspectionSchedule,
    getUpcomingInspections,
    getOverdueInspections,
    getDueToday,
    addInspectionAttachment,
    deleteInspectionAttachment,
    getAttachmentsForRecord,
    getInspectionAlerts,
    addBulbRecord,
    updateBulbRecord,
    deleteBulbRecord,
    addBatteryRecord,
    updateBatteryRecord,
    deleteBatteryRecord,
    addMetalRecord,
    updateMetalRecord,
    deleteMetalRecord,
    addCardboardRecord,
    updateCardboardRecord,
    deleteCardboardRecord,
    addPaperRecord,
    updatePaperRecord,
    deletePaperRecord,
    addTonerRecord,
    updateTonerRecord,
    deleteTonerRecord,
    addRecyclingFile,
    deleteRecyclingFile,
    getRecyclingFilesForRecord,
    getRecyclingMetrics,
    addTaskVerification,
    updateTaskVerification,
    deleteTaskVerification,
    getTaskVerificationsByDepartment,
    getTaskVerificationsByEmployee,
    getTaskVerificationsByLocation,
    getTaskVerificationsToday,
    flagTaskVerification,
    reviewTaskVerification,
    getTaskVerificationStats,
    taskLocations: erpData.taskLocations,
    taskCategories: erpData.taskCategories,
    addVendor,
    updateVendor,
    deleteVendor,
    getVendorById,
    getVendorsByDepartment,
    getVendorsByCategory,
    getActiveVendors,
    approveVendor,
    suspendVendor,
    addPriceAgreement,
    updatePriceAgreement,
    deletePriceAgreement,
    getPriceAgreementsForVendor,
    getPriceAgreementsForMaterial,
    getActivePriceAgreements,
    getVendorStats,
    addJobRequisition,
    updateJobRequisition,
    addCandidate,
    updateCandidate,
    addApplication,
    updateApplication,
    addInterview,
    updateInterview,
    addOffer,
    updateOffer,
    addCandidateNote,
    performanceReviews: erpData.performanceReviews,
    goals: erpData.goals,
    feedback360: erpData.feedback360,
    successionPlans: erpData.successionPlans,
    talentProfiles: erpData.talentProfiles,
    currentUser: erpData.employees[0],
    addGoal,
    updateGoal,
    deleteGoal,
    partRequests: erpData.partRequests,
    partIssues: erpData.partIssues,
    partReturns: erpData.partReturns,
    getPartRequestsForWorkOrder,
    getPartIssuesForWorkOrder,
    getPartReturnsForWorkOrder,
    getWorkOrderPartsSummary,
    addPartRequest,
    updatePartRequest,
    approvePartRequest,
    issuePartRequestLine,
    getPartsUsageByMaterial,
    getLowStockAlerts,
    lowStockAlerts: erpData.lowStockAlerts,
    alertActions: erpData.alertActions,
    getAlertById,
    getAlertByMaterialId,
    getActiveAlerts,
    getCriticalAlerts,
    getAlertsByStatus,
    getAlertsBySeverity,
    getAlertsByFacility,
    getAlertsByCategory,
    acknowledgeAlert,
    snoozeAlert,
    resolveAlert,
    autoResolveAlert,
    escalateAlert,
    addAlertComment,
    linkPOToAlert,
    linkRequisitionToAlert,
    updateAlertStockLevel,
    getAlertSummary,
    getActionsForAlert,
    checkAndReactivateSnoozedAlerts,
    getAlertStatsByTimeRange,
    getAlertTrends,
    getAlertMetrics,
    getInventoryModuleAlertCounts,
    alertPreferences: erpData.alertPreferences,
    updateAlertPreferences,
    resetAlertPreferences,
    saveAlertPreferences,
  };
});
