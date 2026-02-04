export type RecyclingCategory = 'bulbs' | 'batteries' | 'metal' | 'cardboard' | 'paper' | 'toner';

export interface BulbRecord {
  id: string;
  shipmentDate: string;
  quantity: number;
  bulbType: 'fluorescent' | 'led' | 'hid' | 'incandescent' | 'other';
  weight?: number;
  vendorId?: string;
  vendorName?: string;
  manifestNumber?: string;
  certificateNumber?: string;
  certificateDate?: string;
  notes?: string;
  createdAt: string;
}

export interface BatteryRecord {
  id: string;
  disposalDate: string;
  quantity: number;
  batteryType: 'lead_acid' | 'lithium' | 'nicad' | 'alkaline' | 'other';
  weight: number;
  pickupDelivery: 'pickup' | 'delivery';
  vendorId?: string;
  vendorName?: string;
  manifestNumber?: string;
  certificateNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface MetalRecord {
  id: string;
  pickupDate: string;
  metalType: 'steel' | 'aluminum' | 'copper' | 'brass' | 'mixed' | 'other';
  weight: number;
  weightUnit: 'lbs' | 'tons';
  pricePerUnit: number;
  amountReceived: number;
  vendorId?: string;
  vendorName?: string;
  ticketNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface CardboardRecord {
  id: string;
  pickupDate: string;
  weight: number;
  weightUnit: 'lbs' | 'tons';
  baleCount?: number;
  vendorId?: string;
  vendorName?: string;
  ticketNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface PaperRecord {
  id: string;
  pickupDate: string;
  paperType: 'mixed' | 'white' | 'colored' | 'newspaper' | 'magazines';
  weight: number;
  weightUnit: 'lbs' | 'tons';
  vendorId?: string;
  vendorName?: string;
  ticketNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface TonerRecord {
  id: string;
  shipmentDate: string;
  quantity: number;
  tonerType: 'inkjet' | 'laser' | 'drum' | 'mixed';
  vendorId?: string;
  vendorName?: string;
  trackingNumber?: string;
  rebateAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface RecyclingFile {
  id: string;
  recordType: RecyclingCategory;
  recordId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  description?: string;
  uploadedBy: string;
  uploadDate: string;
}
