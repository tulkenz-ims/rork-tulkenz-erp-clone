export interface ProductionArea {
  id: string;
  name: string;
  type: 'room' | 'line' | 'zone';
  facility?: string;
  department?: string;
  color: string;
  active: boolean;
}

export const PRODUCTION_AREAS: ProductionArea[] = [
  // Rooms
  { id: 'room-1', name: 'Room 1 - Receiving', type: 'room', facility: 'FAC-003', department: '1008', color: '#3B82F6', active: true },
  { id: 'room-2', name: 'Room 2 - Prep Area', type: 'room', facility: 'FAC-003', department: '1003', color: '#10B981', active: true },
  { id: 'room-3', name: 'Room 3 - Processing', type: 'room', facility: 'FAC-003', department: '1003', color: '#F59E0B', active: true },
  { id: 'room-4', name: 'Room 4 - Cooking', type: 'room', facility: 'FAC-003', department: '1003', color: '#EF4444', active: true },
  { id: 'room-5', name: 'Room 5 - Cooling', type: 'room', facility: 'FAC-003', department: '1003', color: '#06B6D4', active: true },
  { id: 'room-6', name: 'Room 6 - Packaging', type: 'room', facility: 'FAC-003', department: '1003', color: '#8B5CF6', active: true },
  { id: 'room-7', name: 'Room 7 - Shipping', type: 'room', facility: 'FAC-003', department: '1008', color: '#EC4899', active: true },
  { id: 'room-8', name: 'Room 8 - Cold Storage', type: 'room', facility: 'FAC-003', department: '1008', color: '#14B8A6', active: true },
  
  // Production Lines
  { id: 'line-a', name: 'Line A - Main Production', type: 'line', facility: 'FAC-003', department: '1003', color: '#3B82F6', active: true },
  { id: 'line-b', name: 'Line B - Secondary Production', type: 'line', facility: 'FAC-003', department: '1003', color: '#10B981', active: true },
  { id: 'line-c', name: 'Line C - Specialty Products', type: 'line', facility: 'FAC-003', department: '1003', color: '#F59E0B', active: true },
  { id: 'line-d', name: 'Line D - High Volume', type: 'line', facility: 'FAC-003', department: '1003', color: '#8B5CF6', active: true },
  
  // Packaging Lines
  { id: 'pkg-1', name: 'Packaging Line 1', type: 'line', facility: 'FAC-003', department: '1003', color: '#EC4899', active: true },
  { id: 'pkg-2', name: 'Packaging Line 2', type: 'line', facility: 'FAC-003', department: '1003', color: '#06B6D4', active: true },
  
  // Zones
  { id: 'zone-qa', name: 'QA Lab', type: 'zone', facility: 'FAC-003', department: '1004', color: '#8B5CF6', active: true },
  { id: 'zone-maint', name: 'Maintenance Shop', type: 'zone', facility: 'FAC-003', department: '1001', color: '#6B7280', active: true },
  { id: 'zone-dock', name: 'Loading Dock', type: 'zone', facility: 'FAC-003', department: '1008', color: '#84CC16', active: true },
];

export const ROOM_LINE_OPTIONS = PRODUCTION_AREAS.filter(area => 
  (area.type === 'room' || area.type === 'line') && area.active
).map(area => ({
  value: area.id,
  label: area.name,
  type: area.type,
  color: area.color,
}));

export const getProductionAreaById = (id: string): ProductionArea | undefined => {
  return PRODUCTION_AREAS.find(area => area.id === id);
};

export const getProductionAreaName = (id: string): string => {
  return PRODUCTION_AREAS.find(area => area.id === id)?.name || 'Unknown Area';
};

export const getProductionAreaColor = (id: string): string => {
  return PRODUCTION_AREAS.find(area => area.id === id)?.color || '#6B7280';
};

export const getProductionAreasByType = (type: 'room' | 'line' | 'zone'): ProductionArea[] => {
  return PRODUCTION_AREAS.filter(area => area.type === type && area.active);
};

export const getProductionAreasByFacility = (facilityCode: string): ProductionArea[] => {
  return PRODUCTION_AREAS.filter(area => area.facility === facilityCode && area.active);
};
