export interface Material {
  id: string;
  materialNumber: string;
  name: string;
  description?: string;
  category: string;
  unitOfMeasure: string;
  unit_of_measure: string;
  unitPrice: number;
  onHand: number;
  on_hand: number;
  reorderPoint: number;
  min_level: number;
  max_level: number;
  reorderQty: number;
  location?: string;
  vendorId?: string;
  vendorName?: string;
  vendor?: string;
  isActive: boolean;
  inventoryDepartment: number;
  avg_daily_usage?: number;
  suggested_reorder_qty?: number;
  lead_time_days?: number;
}

export const MOCK_MATERIALS: Material[] = [
  {
    id: 'mat-001',
    materialNumber: '3000001',
    name: 'Flour - All Purpose',
    description: 'All purpose flour, 50lb bag',
    category: 'Dry Goods',
    unitOfMeasure: 'BAG',
    unit_of_measure: 'BAG',
    unitPrice: 18.50,
    onHand: 150,
    on_hand: 150,
    reorderPoint: 50,
    min_level: 50,
    max_level: 200,
    reorderQty: 100,
    location: 'DG-A-01',
    vendorId: 'v-001',
    vendorName: 'ABC Ingredients',
    vendor: 'ABC Ingredients',
    isActive: true,
    inventoryDepartment: 3,
    avg_daily_usage: 5,
    suggested_reorder_qty: 100,
    lead_time_days: 3,
  },
  {
    id: 'mat-002',
    materialNumber: '3000002',
    name: 'Sugar - Granulated',
    description: 'Granulated sugar, 50lb bag',
    category: 'Dry Goods',
    unitOfMeasure: 'BAG',
    unit_of_measure: 'BAG',
    unitPrice: 24.00,
    onHand: 25,
    on_hand: 25,
    reorderPoint: 30,
    min_level: 30,
    max_level: 100,
    reorderQty: 50,
    location: 'DG-A-02',
    vendorId: 'v-001',
    vendorName: 'ABC Ingredients',
    vendor: 'ABC Ingredients',
    isActive: true,
    inventoryDepartment: 3,
    avg_daily_usage: 3,
    suggested_reorder_qty: 50,
    lead_time_days: 3,
  },
  {
    id: 'mat-003',
    materialNumber: '7000001',
    name: 'Packaging Film',
    description: 'Clear packaging film, 18" roll',
    category: 'Packaging',
    unitOfMeasure: 'ROLL',
    unit_of_measure: 'ROLL',
    unitPrice: 45.00,
    onHand: 0,
    on_hand: 0,
    reorderPoint: 20,
    min_level: 20,
    max_level: 60,
    reorderQty: 30,
    location: 'PK-B-01',
    vendorId: 'v-004',
    vendorName: 'Premium Packaging',
    vendor: 'Premium Packaging',
    isActive: true,
    inventoryDepartment: 7,
    avg_daily_usage: 2,
    suggested_reorder_qty: 30,
    lead_time_days: 5,
  },
  {
    id: 'mat-004',
    materialNumber: '3000003',
    name: 'Salt - Iodized',
    description: 'Iodized salt, 25lb bag',
    category: 'Dry Goods',
    unitOfMeasure: 'BAG',
    unit_of_measure: 'BAG',
    unitPrice: 12.00,
    onHand: 18,
    on_hand: 18,
    reorderPoint: 15,
    min_level: 15,
    max_level: 50,
    reorderQty: 25,
    location: 'DG-A-03',
    vendorId: 'v-001',
    vendorName: 'ABC Ingredients',
    vendor: 'ABC Ingredients',
    isActive: true,
    inventoryDepartment: 3,
    avg_daily_usage: 1,
    suggested_reorder_qty: 25,
    lead_time_days: 3,
  },
  {
    id: 'mat-005',
    materialNumber: '1000001',
    name: 'Bearing - 6205-2RS',
    description: 'Deep groove ball bearing, sealed',
    category: 'MRO',
    unitOfMeasure: 'EA',
    unit_of_measure: 'EA',
    unitPrice: 12.50,
    onHand: 24,
    on_hand: 24,
    reorderPoint: 10,
    min_level: 10,
    max_level: 50,
    reorderQty: 20,
    location: 'MRO-A-01',
    vendorId: 'v-002',
    vendorName: 'Industrial Supply Co',
    vendor: 'Industrial Supply Co',
    isActive: true,
    inventoryDepartment: 1,
    avg_daily_usage: 1,
    suggested_reorder_qty: 20,
    lead_time_days: 7,
  },
  {
    id: 'mat-006',
    materialNumber: '2000001',
    name: 'Degreaser - Industrial',
    description: 'Heavy duty degreaser, 5 gallon',
    category: 'Chemicals',
    unitOfMeasure: 'PAL',
    unit_of_measure: 'PAL',
    unitPrice: 85.00,
    onHand: 8,
    on_hand: 8,
    reorderPoint: 5,
    min_level: 5,
    max_level: 20,
    reorderQty: 10,
    location: 'CHEM-B-02',
    vendorId: 'v-003',
    vendorName: 'ChemSupply Inc',
    vendor: 'ChemSupply Inc',
    isActive: true,
    inventoryDepartment: 2,
    avg_daily_usage: 0.5,
    suggested_reorder_qty: 10,
    lead_time_days: 5,
  },
  {
    id: 'mat-007',
    materialNumber: '5000001',
    name: 'Safety Glasses - Clear',
    description: 'ANSI Z87.1 safety glasses, clear lens',
    category: 'Supplies',
    unitOfMeasure: 'EA',
    unit_of_measure: 'EA',
    unitPrice: 8.50,
    onHand: 100,
    on_hand: 100,
    reorderPoint: 50,
    min_level: 50,
    max_level: 200,
    reorderQty: 100,
    location: 'PPE-A-01',
    vendorId: 'v-005',
    vendorName: 'Safety First Supply',
    vendor: 'Safety First Supply',
    isActive: true,
    inventoryDepartment: 5,
    avg_daily_usage: 3,
    suggested_reorder_qty: 100,
    lead_time_days: 3,
  },
];

export type MaterialCategory = 
  | 'Dry Goods'
  | 'Refrigerated'
  | 'Frozen'
  | 'Packaging'
  | 'Chemicals'
  | 'MRO'
  | 'Supplies'
  | 'Equipment';

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Dry Goods',
  'Refrigerated',
  'Frozen',
  'Packaging',
  'Chemicals',
  'MRO',
  'Supplies',
  'Equipment',
];
