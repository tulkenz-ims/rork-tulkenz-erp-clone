export interface Facility {
  id: string;
  organization_id: string;
  name: string;
  facility_code: string;
  facility_number: number;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  phone: string | null;
  active: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface FacilityFormData {
  name: string;
  facility_code: string;
  facility_number: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  active?: boolean;
  timezone?: string;
}

export interface FacilityCreateInput extends FacilityFormData {
  organization_id: string;
}

export interface FacilityUpdateInput extends Partial<FacilityFormData> {
  id: string;
}
