// Recycling Record Types
export type RecyclingRecordType = 'bulb' | 'battery' | 'metal' | 'cardboard' | 'paper' | 'toner';
export type PickupDeliveryType = 'pickup' | 'delivery';

// Bulb Recycling
export interface RecyclingBulb {
  id: string;
  organization_id: string;
  date_shipped: string;
  bulb_size: string;
  bulb_type: string;
  quantity: number;
  tracking_number: string | null;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

// Battery Recycling
export interface RecyclingBattery {
  id: string;
  organization_id: string;
  date: string;
  battery_type: string;
  quantity: number;
  weight: number | null;
  pickup_delivery: PickupDeliveryType;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

// Metal Recycling
export interface RecyclingMetal {
  id: string;
  organization_id: string;
  date: string;
  metal_type: string;
  weight: number;
  receipt_number: string | null;
  amount_received: number;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

// Cardboard Recycling
export interface RecyclingCardboard {
  id: string;
  organization_id: string;
  date_picked_up: string;
  weight: number;
  receipt_number: string | null;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

// Paper Recycling
export interface RecyclingPaper {
  id: string;
  organization_id: string;
  date_picked_up: string;
  weight: number;
  company_name: string | null;
  certificate_number: string | null;
  notes: string | null;
  created_at: string;
}

// Toner Recycling
export interface RecyclingToner {
  id: string;
  organization_id: string;
  date_shipped: string;
  cartridge_type: string;
  quantity: number;
  tracking_number: string | null;
  certificate_number: string | null;
  vendor_name: string | null;
  notes: string | null;
  created_at: string;
}

// Recycling Files
export interface RecyclingFile {
  id: string;
  organization_id: string;
  record_type: RecyclingRecordType;
  record_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url: string | null;
  notes: string | null;
  created_at: string;
}

// Form Data Types
export interface RecyclingBulbFormData {
  date_shipped: string;
  bulb_size: string;
  bulb_type: string;
  quantity: number;
  tracking_number?: string;
  certificate_number?: string;
  notes?: string;
}

export interface RecyclingBatteryFormData {
  date: string;
  battery_type: string;
  quantity: number;
  weight?: number;
  pickup_delivery: PickupDeliveryType;
  vendor_name?: string;
  notes?: string;
}

export interface RecyclingMetalFormData {
  date: string;
  metal_type: string;
  weight: number;
  receipt_number?: string;
  amount_received?: number;
  vendor_name?: string;
  notes?: string;
}

export interface RecyclingCardboardFormData {
  date_picked_up: string;
  weight: number;
  receipt_number?: string;
  vendor_name?: string;
  notes?: string;
}

export interface RecyclingPaperFormData {
  date_picked_up: string;
  weight: number;
  company_name?: string;
  certificate_number?: string;
  notes?: string;
}

export interface RecyclingTonerFormData {
  date_shipped: string;
  cartridge_type: string;
  quantity: number;
  tracking_number?: string;
  certificate_number?: string;
  vendor_name?: string;
  notes?: string;
}

// Labels
export const RECYCLING_RECORD_TYPE_LABELS: Record<RecyclingRecordType, string> = {
  bulb: 'Bulbs',
  battery: 'Batteries',
  metal: 'Metal',
  cardboard: 'Cardboard',
  paper: 'Paper',
  toner: 'Toner',
};

export const RECYCLING_RECORD_TYPE_COLORS: Record<RecyclingRecordType, string> = {
  bulb: '#F59E0B',
  battery: '#10B981',
  metal: '#6B7280',
  cardboard: '#8B5CF6',
  paper: '#3B82F6',
  toner: '#EC4899',
};

export const BULB_TYPES = [
  'Fluorescent T8',
  'Fluorescent T12',
  'Fluorescent U-Tube',
  'CFL',
  'HID',
  'Mercury Vapor',
  'Sodium',
  'Metal Halide',
  'LED',
  'Other',
] as const;

export const BULB_SIZES = [
  '2ft',
  '4ft',
  '8ft',
  'U-Tube',
  'Circular',
  'Standard',
  'Other',
] as const;

export const BATTERY_TYPES = [
  'Alkaline',
  'Lead Acid',
  'Lithium Ion',
  'Lithium',
  'NiCd',
  'NiMH',
  'Button Cell',
  'Car Battery',
  'UPS Battery',
  'Other',
] as const;

export const METAL_TYPES = [
  'Aluminum',
  'Copper',
  'Steel',
  'Stainless Steel',
  'Brass',
  'Bronze',
  'Iron',
  'Mixed Metals',
  'Other',
] as const;

export const TONER_CARTRIDGE_TYPES = [
  'HP',
  'Canon',
  'Epson',
  'Brother',
  'Lexmark',
  'Xerox',
  'Samsung',
  'Dell',
  'Ricoh',
  'Other',
] as const;
