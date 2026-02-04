export type EquipmentStatus = 'operational' | 'down' | 'maintenance' | 'idle' | 'needs_maintenance';
export type EquipmentCriticality = 'critical' | 'essential' | 'standard' | 'non_critical';
export type EquipmentHierarchyLevel = 'facility' | 'area' | 'line' | 'equipment' | 'component';

export interface Equipment {
  id: string;
  name: string;
  tag: string;
  asset_tag: string;
  location: string;
  department: string;
  status: EquipmentStatus;
  criticality: EquipmentCriticality;
  hierarchy_level: EquipmentHierarchyLevel;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  lastPMDate?: string;
  nextPMDate?: string;
  parent_id?: string;
}

export const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: 'eq-001',
    name: 'Mixer #1',
    tag: 'MIX-001',
    asset_tag: 'MIX-001',
    location: 'Production Line 1',
    department: 'Production',
    status: 'operational',
    criticality: 'critical',
    hierarchy_level: 'equipment',
    manufacturer: 'Hobart',
    model: 'HL1400',
    serialNumber: 'HB-2019-001',
    installDate: '2019-03-15',
    lastPMDate: '2024-01-10',
    nextPMDate: '2024-02-10',
  },
  {
    id: 'eq-002',
    name: 'Conveyor Belt A',
    tag: 'CONV-001',
    asset_tag: 'CONV-001',
    location: 'Production Line 1',
    department: 'Production',
    status: 'operational',
    criticality: 'essential',
    hierarchy_level: 'equipment',
    manufacturer: 'Dorner',
    model: '2200 Series',
    serialNumber: 'DR-2020-045',
    installDate: '2020-06-20',
    lastPMDate: '2024-01-05',
    nextPMDate: '2024-02-05',
  },
  {
    id: 'eq-003',
    name: 'Packaging Machine',
    tag: 'PKG-001',
    asset_tag: 'PKG-001',
    location: 'Packaging Area',
    department: 'Packaging',
    status: 'maintenance',
    criticality: 'critical',
    hierarchy_level: 'equipment',
    manufacturer: 'Bosch',
    model: 'SVE 2520',
    serialNumber: 'BS-2018-112',
    installDate: '2018-09-01',
    lastPMDate: '2024-01-15',
    nextPMDate: '2024-02-15',
  },
  {
    id: 'eq-004',
    name: 'Refrigeration Unit #2',
    tag: 'REF-002',
    asset_tag: 'REF-002',
    location: 'Cold Storage',
    department: 'Warehouse',
    status: 'operational',
    criticality: 'critical',
    hierarchy_level: 'equipment',
    manufacturer: 'Carrier',
    model: '30XA',
    serialNumber: 'CR-2017-089',
    installDate: '2017-11-10',
    lastPMDate: '2024-01-08',
    nextPMDate: '2024-02-08',
  },
  {
    id: 'eq-005',
    name: 'Forklift #3',
    tag: 'FLT-003',
    asset_tag: 'FLT-003',
    location: 'Warehouse',
    department: 'Warehouse',
    status: 'down',
    criticality: 'essential',
    hierarchy_level: 'equipment',
    manufacturer: 'Toyota',
    model: '8FGCU25',
    serialNumber: 'TY-2021-033',
    installDate: '2021-02-28',
    lastPMDate: '2024-01-12',
    nextPMDate: '2024-02-12',
  },
];

export type PMFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export const FREQUENCY_LABELS: Record<PMFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
};

export const getEquipmentStatusColor = (status: EquipmentStatus): string => {
  const colors: Record<EquipmentStatus, string> = {
    operational: '#10B981',
    down: '#EF4444',
    maintenance: '#F59E0B',
    idle: '#6B7280',
  };
  return colors[status] || '#6B7280';
};

export const getCriticalityColor = (criticality: EquipmentCriticality): string => {
  const colors: Record<EquipmentCriticality, string> = {
    critical: '#DC2626',
    essential: '#F59E0B',
    standard: '#3B82F6',
    non_critical: '#6B7280',
  };
  return colors[criticality] || '#6B7280';
};
