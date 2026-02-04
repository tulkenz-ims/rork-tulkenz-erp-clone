// =============================================================================
// GLOBAL MATERIAL NUMBERING SYSTEM
// =============================================================================
// Materials are GLOBAL (organization-wide) - same number across ALL facilities
// Format: [DepartmentPrefix 0-9][6-digit sequence] = 7 digits total
// Example: 1000001 = First Maintenance part (Dept 1), same in all facilities
//
// Facility Stock is FACILITY-SPECIFIC:
// Format: [FacilityNumber]-[MaterialNumber]
// Example: 1-1000001 = Facility 1's stock of material 1000001
//          2-1000001 = Facility 2's stock of material 1000001
// =============================================================================

// Material Classification Types
export type MaterialClassificationType = 'stock' | 'consumable' | 'chargeable' | 'shared';

export interface MaterialClassification {
  type: MaterialClassificationType;
  description: string;
  color: string;
  icon: string;
  affectsShelfInventory: boolean;
  requiresChargeAccount: boolean;
  canBeTransferred: boolean;
}

export const MATERIAL_CLASSIFICATIONS: Record<MaterialClassificationType, MaterialClassification> = {
  stock: {
    type: 'stock',
    description: 'Regular inventory items held on shelf',
    color: '#3B82F6',
    icon: 'Package',
    affectsShelfInventory: true,
    requiresChargeAccount: false,
    canBeTransferred: true,
  },
  consumable: {
    type: 'consumable',
    description: 'Immediate consumption items - charged at issue, not held on shelf',
    color: '#10B981',
    icon: 'Zap',
    affectsShelfInventory: false,
    requiresChargeAccount: true,
    canBeTransferred: false,
  },
  chargeable: {
    type: 'chargeable',
    description: 'Items that can be issued and charged to other departments',
    color: '#F59E0B',
    icon: 'CreditCard',
    affectsShelfInventory: true,
    requiresChargeAccount: true,
    canBeTransferred: true,
  },
  shared: {
    type: 'shared',
    description: 'Materials with same OEM# across departments - each dept has own material number',
    color: '#8B5CF6',
    icon: 'Share2',
    affectsShelfInventory: true,
    requiresChargeAccount: false,
    canBeTransferred: true,
  },
};

export interface SharedMaterialLink {
  sharedGroupId: string;
  oemPartNumber: string;
  linkedMaterialNumbers: string[];
  primaryMaterialNumber?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface SharedMaterialGroup {
  id: string;
  name: string;
  description?: string;
  oemPartNumber: string;
  manufacturer?: string;
  manufacturerPartNumber?: string;
  linkedMaterials: SharedMaterialEntry[];
  totalOnHand: number;
  totalValue: number;
  status: 'active' | 'inactive';
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface SharedMaterialEntry {
  materialNumber: string;
  departmentCode: number;
  departmentName: string;
  onHand: number;
  location: string;
  unitCost: number;
  isPrimary: boolean;
}

export interface InterUnitTransfer {
  id: string;
  timestamp: string;
  sharedGroupId: string;
  fromMaterialNumber: string;
  toMaterialNumber: string;
  fromDepartment: number;
  toDepartment: number;
  quantity: number;
  unitCost: number;
  totalValue: number;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  completedAt?: string;
  notes?: string;
  referenceNumber?: string;
}

export interface ChargeRecord {
  id: string;
  timestamp: string;
  fromDepartment: number;
  toDepartment: number;
  materialNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  chargeGLAccount: string;
  issuedBy: string;
  receivedBy?: string;
  notes?: string;
}

export interface DepartmentSubCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  departmentCode: number;
  parentCategoryId?: string;
  sortOrder: number;
  isActive: boolean;
  itemCount?: number;
  icon?: string;
}

export interface InventoryDepartment {
  code: number;
  baseCode: number;
  name: string;
  shortName: string;
  color: string;
  description: string;
  skuPrefix: string;
  glCodePrefix: string;
  lastAssignedNumber: number;
  subCategories: DepartmentSubCategory[];
}

export const INVENTORY_DEPARTMENTS: Record<number, InventoryDepartment> = {
  0: {
    code: 0,
    baseCode: 0,
    name: 'Projects / Offices',
    shortName: 'PROJ',
    color: '#6B7280',
    description: 'Office supplies, project materials, administrative items',
    skuPrefix: '0',
    glCodePrefix: '5800',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '0-01', code: '0-01', name: 'Office Supplies', description: 'Pens, paper, staplers, general office items', departmentCode: 0, sortOrder: 1, isActive: true, icon: 'Pencil' },
      { id: '0-02', code: '0-02', name: 'Furniture', description: 'Desks, chairs, filing cabinets, shelving', departmentCode: 0, sortOrder: 2, isActive: true, icon: 'Armchair' },
      { id: '0-03', code: '0-03', name: 'Office Equipment', description: 'Printers, copiers, shredders, projectors', departmentCode: 0, sortOrder: 3, isActive: true, icon: 'Printer' },
      { id: '0-04', code: '0-04', name: 'Project Materials', description: 'Project-specific supplies and materials', departmentCode: 0, sortOrder: 4, isActive: true, icon: 'FolderKanban' },
      { id: '0-05', code: '0-05', name: 'Presentation Supplies', description: 'Whiteboards, markers, display boards', departmentCode: 0, sortOrder: 5, isActive: true, icon: 'Presentation' },
    ],
  },
  1: {
    code: 1,
    baseCode: 1,
    name: 'Maintenance',
    shortName: 'MAINT',
    color: '#3B82F6',
    description: 'MRO parts, tools, equipment repair supplies',
    skuPrefix: '1',
    glCodePrefix: '5000',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '1-01', code: '1-01', name: 'Mechanical Parts', description: 'Bearings, belts, seals, gaskets, couplings', departmentCode: 1, sortOrder: 1, isActive: true, icon: 'Cog' },
      { id: '1-02', code: '1-02', name: 'Electrical Parts', description: 'Motors, starters, contactors, switches, fuses', departmentCode: 1, sortOrder: 2, isActive: true, icon: 'Zap' },
      { id: '1-03', code: '1-03', name: 'Lubricants & Fluids', description: 'Oils, greases, hydraulic fluids, coolants', departmentCode: 1, sortOrder: 3, isActive: true, icon: 'Droplets' },
      { id: '1-04', code: '1-04', name: 'Tools & Equipment', description: 'Hand tools, power tools, diagnostic equipment', departmentCode: 1, sortOrder: 4, isActive: true, icon: 'Wrench' },
      { id: '1-05', code: '1-05', name: 'Fasteners & Hardware', description: 'Bolts, nuts, screws, washers, anchors', departmentCode: 1, sortOrder: 5, isActive: true, icon: 'Grip' },
      { id: '1-06', code: '1-06', name: 'Pneumatic Components', description: 'Cylinders, valves, fittings, tubing', departmentCode: 1, sortOrder: 6, isActive: true, icon: 'Wind' },
      { id: '1-07', code: '1-07', name: 'Hydraulic Components', description: 'Pumps, valves, hoses, cylinders', departmentCode: 1, sortOrder: 7, isActive: true, icon: 'CircleDot' },
      { id: '1-08', code: '1-08', name: 'Welding Supplies', description: 'Welding rods, wire, gas, accessories', departmentCode: 1, sortOrder: 8, isActive: true, icon: 'Flame' },
      { id: '1-09', code: '1-09', name: 'Raw Materials', description: 'Steel, aluminum, copper, pipe, tubing', departmentCode: 1, sortOrder: 9, isActive: true, icon: 'Layers' },
      { id: '1-10', code: '1-10', name: 'Critical Spares', description: 'High-value critical equipment spares', departmentCode: 1, sortOrder: 10, isActive: true, icon: 'AlertTriangle' },
    ],
  },
  2: {
    code: 2,
    baseCode: 2,
    name: 'Sanitation',
    shortName: 'SANI',
    color: '#10B981',
    description: 'Cleaning supplies, chemicals, sanitation equipment',
    skuPrefix: '2',
    glCodePrefix: '5100',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '2-01', code: '2-01', name: 'Cleaning Chemicals', description: 'Detergents, degreasers, acids, alkalis', departmentCode: 2, sortOrder: 1, isActive: true, icon: 'FlaskConical' },
      { id: '2-02', code: '2-02', name: 'Sanitizers & Disinfectants', description: 'Quaternary, chlorine, peracetic, alcohol-based', departmentCode: 2, sortOrder: 2, isActive: true, icon: 'SprayCan' },
      { id: '2-03', code: '2-03', name: 'Cleaning Equipment', description: 'Pressure washers, scrubbers, foggers', departmentCode: 2, sortOrder: 3, isActive: true, icon: 'Waves' },
      { id: '2-04', code: '2-04', name: 'Cleaning Tools', description: 'Brushes, mops, squeegees, scrapers', departmentCode: 2, sortOrder: 4, isActive: true, icon: 'Brush' },
      { id: '2-05', code: '2-05', name: 'Sanitation PPE', description: 'Chemical resistant gloves, boots, aprons', departmentCode: 2, sortOrder: 5, isActive: true, icon: 'ShieldCheck' },
      { id: '2-06', code: '2-06', name: 'Disposables', description: 'Wipes, towels, disposable covers', departmentCode: 2, sortOrder: 6, isActive: true, icon: 'Trash2' },
      { id: '2-07', code: '2-07', name: 'Pest Control', description: 'Traps, baits, monitoring devices', departmentCode: 2, sortOrder: 7, isActive: true, icon: 'Bug' },
      { id: '2-08', code: '2-08', name: 'Waste Management', description: 'Trash bags, bins, waste containers', departmentCode: 2, sortOrder: 8, isActive: true, icon: 'Trash' },
    ],
  },
  3: {
    code: 3,
    baseCode: 3,
    name: 'Production',
    shortName: 'PROD',
    color: '#F59E0B',
    description: 'Raw materials, consumables, production supplies',
    skuPrefix: '3',
    glCodePrefix: '5200',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '3-01', code: '3-01', name: 'Raw Materials', description: 'Primary ingredients and materials for production', departmentCode: 3, sortOrder: 1, isActive: true, icon: 'Wheat' },
      { id: '3-02', code: '3-02', name: 'Production Consumables', description: 'Gloves, hairnets, tape, disposable items', departmentCode: 3, sortOrder: 2, isActive: true, icon: 'Package' },
      { id: '3-03', code: '3-03', name: 'Packaging Materials', description: 'Boxes, bags, containers, film, wrap', departmentCode: 3, sortOrder: 3, isActive: true, icon: 'Box' },
      { id: '3-04', code: '3-04', name: 'Labels & Tags', description: 'Product labels, tags, stickers, barcodes', departmentCode: 3, sortOrder: 4, isActive: true, icon: 'Tag' },
      { id: '3-05', code: '3-05', name: 'Production Chemicals', description: 'Process chemicals, additives, treatments', departmentCode: 3, sortOrder: 5, isActive: true, icon: 'FlaskConical' },
      { id: '3-06', code: '3-06', name: 'Line Supplies', description: 'Line-specific consumables and supplies', departmentCode: 3, sortOrder: 6, isActive: true, icon: 'Factory' },
    ],
  },
  4: {
    code: 4,
    baseCode: 4,
    name: 'Quality',
    shortName: 'QUAL',
    color: '#8B5CF6',
    description: 'Testing supplies, lab equipment, swab kits, calibration tools',
    skuPrefix: '4',
    glCodePrefix: '5300',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '4-01', code: '4-01', name: 'Testing Supplies', description: 'Swab kits, test strips, reagents, sampling containers', departmentCode: 4, sortOrder: 1, isActive: true, icon: 'TestTube2' },
      { id: '4-02', code: '4-02', name: 'Lab Equipment', description: 'Microscopes, scales, meters, analyzers', departmentCode: 4, sortOrder: 2, isActive: true, icon: 'Microscope' },
      { id: '4-03', code: '4-03', name: 'Calibration Tools', description: 'Calibration standards, reference materials', departmentCode: 4, sortOrder: 3, isActive: true, icon: 'Gauge' },
      { id: '4-04', code: '4-04', name: 'Documentation', description: 'COA forms, test records, certificates', departmentCode: 4, sortOrder: 4, isActive: true, icon: 'FileCheck' },
      { id: '4-05', code: '4-05', name: 'Lab Consumables', description: 'Gloves, pipettes, petri dishes, sample cups', departmentCode: 4, sortOrder: 5, isActive: true, icon: 'Beaker' },
      { id: '4-06', code: '4-06', name: 'Reference Standards', description: 'pH buffers, conductivity standards, certified materials', departmentCode: 4, sortOrder: 6, isActive: true, icon: 'Target' },
    ],
  },
  5: {
    code: 5,
    baseCode: 5,
    name: 'Safety',
    shortName: 'SAFE',
    color: '#EF4444',
    description: 'PPE, safety equipment, emergency supplies',
    skuPrefix: '5',
    glCodePrefix: '5400',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '5-01', code: '5-01', name: 'PPE - Head', description: 'Hard hats, bump caps, hair nets, beard nets', departmentCode: 5, sortOrder: 1, isActive: true, icon: 'HardHat' },
      { id: '5-02', code: '5-02', name: 'PPE - Eyes & Face', description: 'Safety glasses, goggles, face shields', departmentCode: 5, sortOrder: 2, isActive: true, icon: 'Eye' },
      { id: '5-03', code: '5-03', name: 'PPE - Hearing', description: 'Ear plugs, ear muffs, hearing protection', departmentCode: 5, sortOrder: 3, isActive: true, icon: 'Ear' },
      { id: '5-04', code: '5-04', name: 'PPE - Hands', description: 'Gloves - cut resistant, chemical, thermal', departmentCode: 5, sortOrder: 4, isActive: true, icon: 'Hand' },
      { id: '5-05', code: '5-05', name: 'PPE - Body', description: 'Aprons, smocks, coveralls, vests', departmentCode: 5, sortOrder: 5, isActive: true, icon: 'Shirt' },
      { id: '5-06', code: '5-06', name: 'PPE - Feet', description: 'Safety boots, shoe covers, metatarsal guards', departmentCode: 5, sortOrder: 6, isActive: true, icon: 'Footprints' },
      { id: '5-07', code: '5-07', name: 'Respiratory Protection', description: 'Masks, respirators, SCBA, filters', departmentCode: 5, sortOrder: 7, isActive: true, icon: 'Wind' },
      { id: '5-08', code: '5-08', name: 'Fall Protection', description: 'Harnesses, lanyards, anchors, lifelines', departmentCode: 5, sortOrder: 8, isActive: true, icon: 'ArrowDown' },
      { id: '5-09', code: '5-09', name: 'Emergency Equipment', description: 'Fire extinguishers, AEDs, spill kits', departmentCode: 5, sortOrder: 9, isActive: true, icon: 'Siren' },
      { id: '5-10', code: '5-10', name: 'First Aid', description: 'First aid kits, bandages, medications', departmentCode: 5, sortOrder: 10, isActive: true, icon: 'Heart' },
      { id: '5-11', code: '5-11', name: 'Safety Signage', description: 'Signs, tags, barricades, floor marking', departmentCode: 5, sortOrder: 11, isActive: true, icon: 'AlertTriangle' },
      { id: '5-12', code: '5-12', name: 'Lockout/Tagout', description: 'Locks, tags, hasps, lockout stations', departmentCode: 5, sortOrder: 12, isActive: true, icon: 'Lock' },
    ],
  },
  6: {
    code: 6,
    baseCode: 6,
    name: 'HR',
    shortName: 'HR',
    color: '#EC4899',
    description: 'HR supplies, office materials, training materials',
    skuPrefix: '6',
    glCodePrefix: '5500',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '6-01', code: '6-01', name: 'Office Supplies', description: 'HR-specific office supplies', departmentCode: 6, sortOrder: 1, isActive: true, icon: 'Pencil' },
      { id: '6-02', code: '6-02', name: 'Training Materials', description: 'Training manuals, handbooks, guides', departmentCode: 6, sortOrder: 2, isActive: true, icon: 'BookOpen' },
      { id: '6-03', code: '6-03', name: 'Onboarding Kits', description: 'New employee kits, welcome packages', departmentCode: 6, sortOrder: 3, isActive: true, icon: 'Package' },
      { id: '6-04', code: '6-04', name: 'Recognition Items', description: 'Awards, certificates, recognition materials', departmentCode: 6, sortOrder: 4, isActive: true, icon: 'Award' },
    ],
  },
  7: {
    code: 7,
    baseCode: 7,
    name: 'Warehouse',
    shortName: 'WARE',
    color: '#84CC16',
    description: 'Packaging, shipping supplies, storage materials',
    skuPrefix: '7',
    glCodePrefix: '5700',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '7-01', code: '7-01', name: 'Corrugated Packaging', description: 'Boxes, cartons, pads, dividers', departmentCode: 7, sortOrder: 1, isActive: true, icon: 'Box' },
      { id: '7-02', code: '7-02', name: 'Stretch & Shrink Film', description: 'Stretch wrap, shrink film, pallet wrap', departmentCode: 7, sortOrder: 2, isActive: true, icon: 'Layers' },
      { id: '7-03', code: '7-03', name: 'Strapping & Banding', description: 'Strapping, buckles, tensioners, tools', departmentCode: 7, sortOrder: 3, isActive: true, icon: 'Link' },
      { id: '7-04', code: '7-04', name: 'Tape & Adhesives', description: 'Packaging tape, dispensers, labels', departmentCode: 7, sortOrder: 4, isActive: true, icon: 'Paperclip' },
      { id: '7-05', code: '7-05', name: 'Pallets & Skids', description: 'Wood pallets, plastic pallets, slip sheets', departmentCode: 7, sortOrder: 5, isActive: true, icon: 'LayoutGrid' },
      { id: '7-06', code: '7-06', name: 'Shipping Labels', description: 'Address labels, shipping tags, packing lists', departmentCode: 7, sortOrder: 6, isActive: true, icon: 'Tag' },
      { id: '7-07', code: '7-07', name: 'Protective Packaging', description: 'Bubble wrap, foam, packing peanuts', departmentCode: 7, sortOrder: 7, isActive: true, icon: 'Shield' },
      { id: '7-08', code: '7-08', name: 'Storage Containers', description: 'Bins, totes, containers, crates', departmentCode: 7, sortOrder: 8, isActive: true, icon: 'Archive' },
    ],
  },
  8: {
    code: 8,
    baseCode: 8,
    name: 'IT / Technology',
    shortName: 'IT',
    color: '#06B6D4',
    description: 'Computer equipment, cables, tech supplies',
    skuPrefix: '8',
    glCodePrefix: '5850',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '8-01', code: '8-01', name: 'Computer Hardware', description: 'Desktops, laptops, tablets, monitors', departmentCode: 8, sortOrder: 1, isActive: true, icon: 'Monitor' },
      { id: '8-02', code: '8-02', name: 'Networking Equipment', description: 'Switches, routers, access points, cables', departmentCode: 8, sortOrder: 2, isActive: true, icon: 'Network' },
      { id: '8-03', code: '8-03', name: 'Cables & Connectors', description: 'Network cables, USB, HDMI, adapters', departmentCode: 8, sortOrder: 3, isActive: true, icon: 'Cable' },
      { id: '8-04', code: '8-04', name: 'Peripherals', description: 'Keyboards, mice, webcams, headsets', departmentCode: 8, sortOrder: 4, isActive: true, icon: 'Keyboard' },
      { id: '8-05', code: '8-05', name: 'Storage Devices', description: 'Hard drives, SSDs, USB drives, memory cards', departmentCode: 8, sortOrder: 5, isActive: true, icon: 'HardDrive' },
      { id: '8-06', code: '8-06', name: 'Printers & Supplies', description: 'Printers, toner, ink, paper for printers', departmentCode: 8, sortOrder: 6, isActive: true, icon: 'Printer' },
      { id: '8-07', code: '8-07', name: 'Mobile Devices', description: 'Smartphones, tablets, cases, chargers', departmentCode: 8, sortOrder: 7, isActive: true, icon: 'Smartphone' },
      { id: '8-08', code: '8-08', name: 'Server Equipment', description: 'Servers, racks, UPS, cooling', departmentCode: 8, sortOrder: 8, isActive: true, icon: 'Server' },
    ],
  },
  9: {
    code: 9,
    baseCode: 9,
    name: 'Facilities',
    shortName: 'FAC',
    color: '#A855F7',
    description: 'Building materials, HVAC, plumbing, electrical',
    skuPrefix: '9',
    glCodePrefix: '5900',
    lastAssignedNumber: 0,
    subCategories: [
      { id: '9-01', code: '9-01', name: 'Plumbing', description: 'Pipes, fittings, valves, fixtures', departmentCode: 9, sortOrder: 1, isActive: true, icon: 'Droplet' },
      { id: '9-02', code: '9-02', name: 'HVAC', description: 'Filters, belts, refrigerant, ductwork', departmentCode: 9, sortOrder: 2, isActive: true, icon: 'Thermometer' },
      { id: '9-03', code: '9-03', name: 'Electrical', description: 'Wire, conduit, panels, breakers, outlets', departmentCode: 9, sortOrder: 3, isActive: true, icon: 'Plug' },
      { id: '9-04', code: '9-04', name: 'Lighting', description: 'Bulbs, fixtures, ballasts, emergency lights', departmentCode: 9, sortOrder: 4, isActive: true, icon: 'Lightbulb' },
      { id: '9-05', code: '9-05', name: 'Building Materials', description: 'Drywall, paint, flooring, ceiling tiles', departmentCode: 9, sortOrder: 5, isActive: true, icon: 'Building' },
      { id: '9-06', code: '9-06', name: 'Doors & Hardware', description: 'Doors, locks, hinges, closers, handles', departmentCode: 9, sortOrder: 6, isActive: true, icon: 'DoorOpen' },
      { id: '9-07', code: '9-07', name: 'Grounds & Exterior', description: 'Landscaping, signage, parking, fencing', departmentCode: 9, sortOrder: 7, isActive: true, icon: 'TreePine' },
      { id: '9-08', code: '9-08', name: 'Fire Protection', description: 'Sprinkler parts, alarms, extinguishers', departmentCode: 9, sortOrder: 8, isActive: true, icon: 'Flame' },
      { id: '9-09', code: '9-09', name: 'Roofing', description: 'Roofing materials, sealants, flashings', departmentCode: 9, sortOrder: 9, isActive: true, icon: 'Home' },
    ],
  },
};

export interface MaterialNumber {
  fullNumber: string;
  departmentCode: number;
  sequenceNumber: number;
  formatted: string;
}

export const generateMaterialNumber = (
  departmentCode: number,
  sequenceNumber: number
): MaterialNumber => {
  const paddedSequence = sequenceNumber.toString().padStart(6, '0');
  const fullNumber = `${departmentCode}${paddedSequence}`;
  
  return {
    fullNumber,
    departmentCode,
    sequenceNumber,
    formatted: fullNumber,
  };
};

export const parseMaterialNumber = (materialNumber: string): MaterialNumber | null => {
  if (!materialNumber || materialNumber.length !== 7) {
    console.log('Invalid material number length:', materialNumber);
    return null;
  }

  const departmentCode = parseInt(materialNumber.charAt(0), 10);
  const sequenceNumber = parseInt(materialNumber.substring(1), 10);

  if (isNaN(departmentCode) || isNaN(sequenceNumber)) {
    console.log('Invalid material number format:', materialNumber);
    return null;
  }

  if (departmentCode < 0 || departmentCode > 9) {
    console.log('Invalid department code:', departmentCode);
    return null;
  }

  return {
    fullNumber: materialNumber,
    departmentCode,
    sequenceNumber,
    formatted: materialNumber,
  };
};

export const getDepartmentFromMaterialNumber = (materialNumber: string): InventoryDepartment | null => {
  const parsed = parseMaterialNumber(materialNumber);
  if (!parsed) return null;
  
  return INVENTORY_DEPARTMENTS[parsed.departmentCode] || null;
};

export const validateMaterialNumber = (materialNumber: string): { valid: boolean; error?: string } => {
  if (!materialNumber) {
    return { valid: false, error: 'Material number is required' };
  }

  if (materialNumber.length !== 7) {
    return { valid: false, error: 'Material number must be exactly 7 digits' };
  }

  if (!/^\d{7}$/.test(materialNumber)) {
    return { valid: false, error: 'Material number must contain only digits' };
  }

  const departmentCode = parseInt(materialNumber.charAt(0), 10);
  if (departmentCode < 0 || departmentCode > 9) {
    return { valid: false, error: 'First digit must be between 0-9 (department code)' };
  }

  return { valid: true };
};

export const getNextMaterialNumber = (
  departmentCode: number,
  existingNumbers: string[]
): string => {
  const deptNumbers = existingNumbers
    .filter(num => num.startsWith(departmentCode.toString()))
    .map(num => parseInt(num.substring(1), 10))
    .filter(num => !isNaN(num));

  const maxSequence = deptNumbers.length > 0 ? Math.max(...deptNumbers) : 0;
  const nextSequence = maxSequence + 1;

  return generateMaterialNumber(departmentCode, nextSequence).fullNumber;
};

export const getAllDepartments = (): InventoryDepartment[] => {
  return Object.values(INVENTORY_DEPARTMENTS).sort((a, b) => a.code - b.code);
};

export const getDepartmentByCode = (code: number): InventoryDepartment | undefined => {
  return INVENTORY_DEPARTMENTS[code];
};

export const getDepartmentByName = (name: string): InventoryDepartment | undefined => {
  return Object.values(INVENTORY_DEPARTMENTS).find(
    dept => dept.name.toLowerCase() === name.toLowerCase() ||
            dept.shortName.toLowerCase() === name.toLowerCase()
  );
};

export const getDepartmentColor = (code: number): string => {
  return INVENTORY_DEPARTMENTS[code]?.color || '#6B7280';
};

export const formatMaterialNumberDisplay = (materialNumber: string): string => {
  const parsed = parseMaterialNumber(materialNumber);
  if (!parsed) return materialNumber;
  
  const dept = INVENTORY_DEPARTMENTS[parsed.departmentCode];
  return `${materialNumber} (${dept?.shortName || 'UNK'})`;
};

export const getMaterialNumbersByDepartment = (
  departmentCode: number,
  allMaterialNumbers: string[]
): string[] => {
  return allMaterialNumbers.filter(num => 
    num.startsWith(departmentCode.toString()) && num.length === 7
  );
};

export const getClassificationInfo = (type: MaterialClassificationType): MaterialClassification => {
  return MATERIAL_CLASSIFICATIONS[type];
};

export const getAllClassifications = (): MaterialClassification[] => {
  return Object.values(MATERIAL_CLASSIFICATIONS);
};

export const getClassificationColor = (type: MaterialClassificationType): string => {
  return MATERIAL_CLASSIFICATIONS[type]?.color || '#6B7280';
};

export const isConsumableAtIssue = (classification: MaterialClassificationType): boolean => {
  return classification === 'consumable';
};

export const requiresChargeAccount = (classification: MaterialClassificationType): boolean => {
  return MATERIAL_CLASSIFICATIONS[classification]?.requiresChargeAccount || false;
};

export const affectsShelfInventory = (classification: MaterialClassificationType): boolean => {
  return MATERIAL_CLASSIFICATIONS[classification]?.affectsShelfInventory ?? true;
};

export const canMaterialBeTransferred = (classification: MaterialClassificationType): boolean => {
  return MATERIAL_CLASSIFICATIONS[classification]?.canBeTransferred ?? true;
};

export const createSharedMaterialLink = (
  oemPartNumber: string,
  materialNumbers: string[],
  primaryMaterialNumber?: string,
  createdBy?: string
): SharedMaterialLink => {
  return {
    sharedGroupId: `SHARED-${oemPartNumber}-${Date.now()}`,
    oemPartNumber,
    linkedMaterialNumbers: materialNumbers,
    primaryMaterialNumber: primaryMaterialNumber || materialNumbers[0],
    createdAt: new Date().toISOString(),
    createdBy,
  };
};

export const createInterUnitTransfer = (
  sharedGroupId: string,
  fromMaterialNumber: string,
  toMaterialNumber: string,
  quantity: number,
  unitCost: number,
  requestedBy: string,
  notes?: string
): InterUnitTransfer => {
  const fromDept = parseInt(fromMaterialNumber.charAt(0), 10);
  const toDept = parseInt(toMaterialNumber.charAt(0), 10);
  
  return {
    id: `IUT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sharedGroupId,
    fromMaterialNumber,
    toMaterialNumber,
    fromDepartment: fromDept,
    toDepartment: toDept,
    quantity,
    unitCost,
    totalValue: quantity * unitCost,
    status: 'pending',
    requestedBy,
    notes,
    referenceNumber: `IUT-${fromDept}${toDept}-${Date.now().toString().slice(-6)}`,
  };
};

export const findSharedMaterialsByOEM = (
  oemPartNumber: string,
  allMaterialNumbers: { materialNumber: string; oemPartNumber?: string }[]
): string[] => {
  return allMaterialNumbers
    .filter(m => m.oemPartNumber === oemPartNumber)
    .map(m => m.materialNumber);
};

export const getSharedGroupDepartments = (
  linkedMaterialNumbers: string[]
): { code: number; name: string; color: string }[] => {
  const departments: { code: number; name: string; color: string }[] = [];
  
  linkedMaterialNumbers.forEach(matNum => {
    const deptCode = parseInt(matNum.charAt(0), 10);
    const dept = INVENTORY_DEPARTMENTS[deptCode];
    if (dept && !departments.find(d => d.code === deptCode)) {
      departments.push({
        code: deptCode,
        name: dept.name,
        color: dept.color,
      });
    }
  });
  
  return departments.sort((a, b) => a.code - b.code);
};

export const canTransferBetweenShared = (
  fromMaterialNumber: string,
  toMaterialNumber: string,
  sharedLink: SharedMaterialLink
): boolean => {
  return (
    sharedLink.linkedMaterialNumbers.includes(fromMaterialNumber) &&
    sharedLink.linkedMaterialNumbers.includes(toMaterialNumber) &&
    fromMaterialNumber !== toMaterialNumber
  );
};

export const generateSharedMaterialNumber = (
  departmentCode: number,
  existingNumbers: string[],
  oemPartNumber: string
): string => {
  const deptNumbers = existingNumbers
    .filter(num => num.startsWith(departmentCode.toString()))
    .map(num => parseInt(num.substring(1), 10))
    .filter(num => !isNaN(num));

  const maxSequence = deptNumbers.length > 0 ? Math.max(...deptNumbers) : 0;
  const nextSequence = maxSequence + 1;

  console.log(`Generated shared material number for dept ${departmentCode}, OEM: ${oemPartNumber}, sequence: ${nextSequence}`);
  
  return generateMaterialNumber(departmentCode, nextSequence).fullNumber;
};

export const validateInterUnitTransfer = (
  fromOnHand: number,
  quantity: number,
  sharedLink: SharedMaterialLink,
  fromMaterialNumber: string,
  toMaterialNumber: string
): { valid: boolean; error?: string } => {
  if (quantity <= 0) {
    return { valid: false, error: 'Transfer quantity must be greater than zero' };
  }
  
  if (quantity > fromOnHand) {
    return { valid: false, error: 'Insufficient quantity available for transfer' };
  }
  
  if (!canTransferBetweenShared(fromMaterialNumber, toMaterialNumber, sharedLink)) {
    return { valid: false, error: 'Materials are not in the same shared group' };
  }
  
  return { valid: true };
};

export const getTransferStatusColor = (status: InterUnitTransfer['status']): string => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'approved': return '#3B82F6';
    case 'completed': return '#10B981';
    case 'rejected': return '#EF4444';
    case 'cancelled': return '#6B7280';
    default: return '#6B7280';
  }
};

export const getTransferStatusLabel = (status: InterUnitTransfer['status']): string => {
  switch (status) {
    case 'pending': return 'Pending Approval';
    case 'approved': return 'Approved';
    case 'completed': return 'Completed';
    case 'rejected': return 'Rejected';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

export const createChargeRecord = (
  fromDepartment: number,
  toDepartment: number,
  materialNumber: string,
  quantity: number,
  unitCost: number,
  chargeGLAccount: string,
  issuedBy: string,
  notes?: string
): ChargeRecord => {
  return {
    id: `CHG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    fromDepartment,
    toDepartment,
    materialNumber,
    quantity,
    unitCost,
    totalCost: quantity * unitCost,
    chargeGLAccount,
    issuedBy,
    notes,
  };
};

export interface ConsumableChargeConfig {
  materialNumber: string;
  chargeableToDepartments: number[];
  defaultChargeType: 'consumable_issue' | 'chargeback' | 'interdepartmental';
  requiresApproval: boolean;
  approvalThreshold?: number;
  autoPostBelow?: number;
}

export const getConsumableChargeConfig = (
  classification: MaterialClassificationType,
  isChargeableTo?: number[]
): ConsumableChargeConfig | null => {
  if (classification !== 'chargeable' && classification !== 'consumable') {
    return null;
  }
  
  return {
    materialNumber: '',
    chargeableToDepartments: isChargeableTo || [],
    defaultChargeType: classification === 'consumable' ? 'consumable_issue' : 'chargeback',
    requiresApproval: true,
    approvalThreshold: 500,
    autoPostBelow: 50,
  };
};

export const calculateChargeAmount = (
  quantity: number,
  unitCost: number,
  classification: MaterialClassificationType
): { subtotal: number; affectsInventory: boolean; immediateExpense: boolean } => {
  const subtotal = quantity * unitCost;
  const config = MATERIAL_CLASSIFICATIONS[classification];
  
  return {
    subtotal,
    affectsInventory: config.affectsShelfInventory,
    immediateExpense: !config.affectsShelfInventory,
  };
};

export const isChargeableToDepart = (
  isChargeableTo: number[] | undefined,
  targetDepartment: number
): boolean => {
  if (!isChargeableTo || isChargeableTo.length === 0) {
    return true;
  }
  return isChargeableTo.includes(targetDepartment);
};

export const DEPARTMENT_EXAMPLES: Record<number, string[]> = {
  0: ['Office Chairs', 'Desk Lamps', 'Filing Cabinets', 'Whiteboards'],
  1: ['Bearings', 'Motors', 'Belts', 'Lubricants', 'Filters'],
  2: ['Cleaning Chemicals', 'Mops', 'Sanitizers', 'Pressure Washers'],
  3: ['Raw Materials', 'Packaging Film', 'Labels', 'Containers'],
  4: ['Swab Kits', 'Test Tubes', 'pH Meters', 'Calibration Standards'],
  5: ['Safety Glasses', 'Hard Hats', 'Gloves', 'Fire Extinguishers'],
  6: ['Training Manuals', 'Onboarding Kits', 'Recognition Items'],
  7: ['Boxes', 'Pallets', 'Shrink Wrap', 'Strapping'],
  8: ['Keyboards', 'Monitors', 'Network Cables', 'USB Drives'],
  9: ['Light Bulbs', 'HVAC Filters', 'Door Hardware', 'Paint'],
};

export const getSubCategoriesByDepartment = (departmentCode: number): DepartmentSubCategory[] => {
  const dept = INVENTORY_DEPARTMENTS[departmentCode];
  if (!dept) return [];
  return dept.subCategories.filter(sc => sc.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getSubCategoryById = (subCategoryId: string): DepartmentSubCategory | undefined => {
  for (const dept of Object.values(INVENTORY_DEPARTMENTS)) {
    const subCat = dept.subCategories.find(sc => sc.id === subCategoryId);
    if (subCat) return subCat;
  }
  return undefined;
};

export const getSubCategoryByCode = (code: string): DepartmentSubCategory | undefined => {
  for (const dept of Object.values(INVENTORY_DEPARTMENTS)) {
    const subCat = dept.subCategories.find(sc => sc.code === code);
    if (subCat) return subCat;
  }
  return undefined;
};

export const getAllSubCategories = (): DepartmentSubCategory[] => {
  const allSubCats: DepartmentSubCategory[] = [];
  for (const dept of Object.values(INVENTORY_DEPARTMENTS)) {
    allSubCats.push(...dept.subCategories);
  }
  return allSubCats.sort((a, b) => {
    if (a.departmentCode !== b.departmentCode) {
      return a.departmentCode - b.departmentCode;
    }
    return a.sortOrder - b.sortOrder;
  });
};

export const getSubCategoryDisplayName = (subCategoryId: string): string => {
  const subCat = getSubCategoryById(subCategoryId);
  if (!subCat) return 'Unknown';
  const dept = INVENTORY_DEPARTMENTS[subCat.departmentCode];
  return `${dept?.shortName || ''} - ${subCat.name}`;
};

export const validateSubCategory = (
  materialDepartment: number,
  subCategoryId: string
): { valid: boolean; error?: string } => {
  const subCat = getSubCategoryById(subCategoryId);
  if (!subCat) {
    return { valid: false, error: 'Sub-category not found' };
  }
  if (subCat.departmentCode !== materialDepartment) {
    return { valid: false, error: 'Sub-category does not belong to material department' };
  }
  if (!subCat.isActive) {
    return { valid: false, error: 'Sub-category is not active' };
  }
  return { valid: true };
};

export const getSubCategorySummary = (departmentCode: number): {
  total: number;
  active: number;
  inactive: number;
} => {
  const dept = INVENTORY_DEPARTMENTS[departmentCode];
  if (!dept) return { total: 0, active: 0, inactive: 0 };
  
  const total = dept.subCategories.length;
  const active = dept.subCategories.filter(sc => sc.isActive).length;
  return { total, active, inactive: total - active };
};

// =============================================================================
// FACILITY STOCK HELPERS
// =============================================================================

export interface FacilityStockId {
  facilityNumber: number;
  materialNumber: string;
  stockId: string;
}

export const generateFacilityStockId = (
  facilityNumber: number,
  materialNumber: string
): FacilityStockId => {
  if (facilityNumber < 1 || facilityNumber > 99) {
    throw new Error('Facility number must be between 1 and 99');
  }
  const validation = validateMaterialNumber(materialNumber);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid material number');
  }
  
  return {
    facilityNumber,
    materialNumber,
    stockId: `${facilityNumber}-${materialNumber}`,
  };
};

export const parseFacilityStockId = (stockId: string): FacilityStockId | null => {
  const match = stockId.match(/^(\d{1,2})-(\d{7})$/);
  if (!match) {
    console.log('Invalid facility stock ID format:', stockId);
    return null;
  }
  
  const facilityNumber = parseInt(match[1], 10);
  const materialNumber = match[2];
  
  if (facilityNumber < 1 || facilityNumber > 99) {
    console.log('Invalid facility number in stock ID:', facilityNumber);
    return null;
  }
  
  return {
    facilityNumber,
    materialNumber,
    stockId,
  };
};

export const validateFacilityStockId = (stockId: string): { valid: boolean; error?: string } => {
  if (!stockId) {
    return { valid: false, error: 'Stock ID is required' };
  }
  
  const parsed = parseFacilityStockId(stockId);
  if (!parsed) {
    return { valid: false, error: 'Stock ID must be format: [FacilityNumber 1-99]-[MaterialNumber 7 digits]' };
  }
  
  return { valid: true };
};

export const getFacilityFromStockId = (stockId: string): number | null => {
  const parsed = parseFacilityStockId(stockId);
  return parsed?.facilityNumber || null;
};

export const getMaterialFromStockId = (stockId: string): string | null => {
  const parsed = parseFacilityStockId(stockId);
  return parsed?.materialNumber || null;
};

export const getAllFacilityStockIds = (
  materialNumber: string,
  facilityNumbers: number[]
): FacilityStockId[] => {
  return facilityNumbers.map(fn => generateFacilityStockId(fn, materialNumber));
};

export const formatStockIdDisplay = (stockId: string): string => {
  const parsed = parseFacilityStockId(stockId);
  if (!parsed) return stockId;
  
  const dept = getDepartmentFromMaterialNumber(parsed.materialNumber);
  return `F${parsed.facilityNumber} - ${parsed.materialNumber} (${dept?.shortName || 'UNK'})`;
};

// =============================================================================
// INTER-FACILITY TRANSFER HELPERS
// =============================================================================

export interface InterFacilityTransfer {
  id: string;
  timestamp: string;
  materialNumber: string; // Global material being transferred
  fromFacility: number;
  toFacility: number;
  fromStockId: string;
  toStockId: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  shippedAt?: string;
  receivedAt?: string;
  receivedBy?: string;
  trackingNumber?: string;
  notes?: string;
}

export const createInterFacilityTransfer = (
  materialNumber: string,
  fromFacility: number,
  toFacility: number,
  quantity: number,
  unitCost: number,
  requestedBy: string,
  notes?: string
): InterFacilityTransfer => {
  if (fromFacility === toFacility) {
    throw new Error('Cannot transfer to the same facility');
  }
  
  const fromStockId = generateFacilityStockId(fromFacility, materialNumber).stockId;
  const toStockId = generateFacilityStockId(toFacility, materialNumber).stockId;
  
  return {
    id: `IFT-${Date.now()}`,
    timestamp: new Date().toISOString(),
    materialNumber,
    fromFacility,
    toFacility,
    fromStockId,
    toStockId,
    quantity,
    unitCost,
    totalValue: quantity * unitCost,
    status: 'pending',
    requestedBy,
    notes,
  };
};

export const getInterFacilityTransferStatusColor = (status: InterFacilityTransfer['status']): string => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'in_transit': return '#3B82F6';
    case 'received': return '#10B981';
    case 'cancelled': return '#6B7280';
    default: return '#6B7280';
  }
};

export const getInterFacilityTransferStatusLabel = (status: InterFacilityTransfer['status']): string => {
  switch (status) {
    case 'pending': return 'Pending Approval';
    case 'in_transit': return 'In Transit';
    case 'received': return 'Received';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};
