import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ROLE_TYPES, isSuperAdminRole, getRoleDisplayName, type RoleType } from '@/constants/roles';

const ORG_STORAGE_KEY = 'tulkenz_organization';

// Types derived from Supabase schema
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'enterprise_plus';
export type EmployeeRole = 'default' | 'technician' | 'mechanic' | 'procurement' | 'planner' | 'manager' | 'supervisor';

export interface Company {
  id: string;
  name: string;
  code: string;
  subscription_tier: SubscriptionTier;
}

export interface Facility {
  id: string;
  name: string;
  organization_id: string;
  facility_code: string;
  address?: string | null;
  active?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position?: string;
  company_id: string;
  is_platform_admin?: boolean;
}

const AUTH_STORAGE_KEY = 'tulkenz_auth';
const AUTH_TYPE_KEY = 'tulkenz_auth_type';

interface AuthData {
  userId: string;
  isEmployee: boolean;
}

export type ModuleKey = 
  | 'dashboard' 
  | 'inventory' 
  | 'employees' 
  | 'service' 
  | 'planner' 
  | 'procurement' 
  | 'approvals' 
  | 'inspections'
  | 'recycling'
  | 'taskfeed'
  | 'finance'
  | 'onboarding'
  | 'offboarding'
  | 'recruiting'
  | 'performance'
  | 'goals'
  | 'succession'
  | 'lms'
  | 'surveys'
  | 'overtime'
  | 'fmla'
  | 'attendance'
  | 'headcount'
  | 'timeclock'
  | 'hr'
  | 'system' 
  | 'settings';

export interface ModuleConfig {
  key: ModuleKey;
  name: string;
  path: string;
  color: string;
}

const ALL_MODULES: ModuleConfig[] = [
  { key: 'dashboard', name: 'Dashboard', path: '(dashboard)', color: '#3B82F6' },
  { key: 'inventory', name: 'Inventory', path: 'inventory', color: '#10B981' },
  { key: 'employees', name: 'Employees', path: 'employees', color: '#8B5CF6' },
  { key: 'service', name: 'Service', path: 'service', color: '#EF4444' },
  { key: 'planner', name: 'Planner', path: 'planner', color: '#8B5CF6' },
  { key: 'procurement', name: 'Procurement', path: 'procurement', color: '#F59E0B' },
  { key: 'approvals', name: 'Approvals', path: 'approvals', color: '#8B5CF6' },
  { key: 'inspections', name: 'Inspections', path: 'inspections', color: '#27AE60' },
  { key: 'recycling', name: 'Recycling', path: 'recycling', color: '#27AE60' },
  { key: 'taskfeed', name: 'Task Feed', path: 'taskfeed', color: '#EC4899' },
  { key: 'finance', name: 'Finance', path: 'finance', color: '#059669' },
  { key: 'onboarding', name: 'Onboarding', path: 'onboarding', color: '#14B8A6' },
  { key: 'offboarding', name: 'Offboarding', path: 'offboarding', color: '#EF4444' },
  { key: 'recruiting', name: 'Recruiting', path: 'recruiting', color: '#6366F1' },
  { key: 'performance', name: 'Performance', path: 'performance', color: '#F59E0B' },
  { key: 'goals', name: 'Goals', path: 'goals', color: '#10B981' },
  { key: 'succession', name: 'Succession', path: 'succession', color: '#8B5CF6' },
  { key: 'lms', name: 'Learning', path: 'lms', color: '#14B8A6' },
  { key: 'surveys', name: 'Surveys', path: 'surveys', color: '#EC4899' },
  { key: 'overtime', name: 'Overtime', path: 'overtime', color: '#F59E0B' },
  { key: 'fmla', name: 'FMLA', path: 'fmla', color: '#6366F1' },
  { key: 'attendance', name: 'Attendance', path: 'attendance', color: '#EC4899' },
  { key: 'headcount', name: 'Headcount', path: 'headcount', color: '#DC2626' },
  { key: 'timeclock', name: 'Time Clock', path: 'timeclock', color: '#0EA5E9' },
  { key: 'hr', name: 'Human Resources', path: 'hr', color: '#8B5CF6' },
  { key: 'system', name: 'System', path: 'system', color: '#C084FC' },
  { key: 'settings', name: 'Settings', path: 'settings', color: '#6B7280' },
];

const TIER_MODULES: Record<SubscriptionTier, ModuleKey[]> = {
  starter: ['inventory', 'hr', 'settings'],
  professional: ['inventory', 'hr', 'service', 'planner', 'inspections', 'recycling', 'taskfeed', 'settings'],
  enterprise: ['dashboard', 'inventory', 'hr', 'service', 'planner', 'procurement', 'approvals', 'inspections', 'recycling', 'taskfeed', 'finance', 'settings'],
  enterprise_plus: ['dashboard', 'inventory', 'hr', 'service', 'planner', 'procurement', 'approvals', 'inspections', 'recycling', 'taskfeed', 'finance', 'system', 'settings'],
};

// Base employee access - employees get dashboard by default
// Additional modules are controlled via the Permissions system (roles)
const BASE_EMPLOYEE_MODULES: ModuleKey[] = ['dashboard', 'taskfeed', 'timeclock'];

const TIER_INFO: Record<SubscriptionTier, { name: string; color: string }> = {
  starter: { name: 'Starter', color: '#64748B' },
  professional: { name: 'Professional', color: '#3B82F6' },
  enterprise: { name: 'Enterprise', color: '#F59E0B' },
  enterprise_plus: { name: 'Enterprise Plus', color: '#EF4444' },
};



export const [UserProvider, useUser] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeRole, setEmployeeRole] = useState<EmployeeRole>('default');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const loadAuthData = useCallback(async () => {
    try {
      console.log('[UserContext] Loading auth data...');
      const authDataStr = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const authType = await AsyncStorage.getItem(AUTH_TYPE_KEY);

      if (!authDataStr) {
        console.log('[UserContext] No auth data found');
        return;
      }

      const authData: AuthData = JSON.parse(authDataStr);
      console.log('[UserContext] Auth data loaded:', authData);

      if (authType === 'employee') {
        // Fetch employee from Supabase
        let employee = null;
        let empError = null;
        
        try {
          const result = await supabase
            .from('employees')
            .select('*')
            .eq('id', authData.userId)
            .single();
          employee = result.data;
          empError = result.error;
        } catch (fetchError) {
          console.log('[UserContext] Network error during auth load - will retry on next app open');
          return;
        }

        if (empError || !employee) {
          console.error('[UserContext] Employee not found:', empError?.message || 'Unknown error');
          // Clear invalid auth data
          await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, AUTH_TYPE_KEY]);
          return;
        }

        setIsEmployee(true);
        setEmployeeRole(employee.role as EmployeeRole);
        setUserProfile({
          id: employee.id,
          email: employee.email,
          first_name: employee.first_name,
          last_name: employee.last_name,
          role: employee.role,
          position: employee.position,
          company_id: employee.organization_id,
          is_platform_admin: employee.is_platform_admin || false,
        });
        setIsPlatformAdmin(employee.is_platform_admin || false);

        // Fetch organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', employee.organization_id)
          .single();

        if (orgError || !org) {
          console.error('[UserContext] Organization not found:', orgError);
          return;
        }

        setCompany({
          id: org.id,
          name: org.name,
          code: org.code,
          subscription_tier: org.subscription_tier,
        });

        // Sync with OrganizationContext
        await AsyncStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));

        // Fetch facilities
        const { data: facs } = await supabase
          .from('facilities')
          .select('*')
          .eq('organization_id', org.id)
          .eq('active', true);

        setFacilities((facs || []).map(f => ({
          id: f.id,
          name: f.name,
          organization_id: f.organization_id,
          facility_code: f.facility_code,
          address: f.address,
          active: f.active,
        })));
      } else {
        // Company login - fetch from employees table (any role)
        let user = null;
        let userError = null;
        
        try {
          const result = await supabase
            .from('employees')
            .select('*')
            .eq('id', authData.userId)
            .single();
          user = result.data;
          userError = result.error;
        } catch (fetchError) {
          console.log('[UserContext] Network error during auth load - will retry on next app open');
          return;
        }

        if (userError || !user) {
          console.error('[UserContext] User not found:', userError?.message || 'Unknown error');
          // Clear invalid auth data
          await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, AUTH_TYPE_KEY]);
          return;
        }

        setUserProfile({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          position: user.position,
          company_id: user.organization_id,
          is_platform_admin: user.is_platform_admin || false,
        });
        setIsPlatformAdmin(user.is_platform_admin || false);

        // Fetch organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', user.organization_id)
          .single();

        if (orgError || !org) {
          console.error('[UserContext] Organization not found:', orgError);
          return;
        }

        setCompany({
          id: org.id,
          name: org.name,
          code: org.code,
          subscription_tier: org.subscription_tier,
        });

        // Sync with OrganizationContext
        await AsyncStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));

        // Fetch facilities
        const { data: facs } = await supabase
          .from('facilities')
          .select('*')
          .eq('organization_id', org.id)
          .eq('active', true);

        setFacilities((facs || []).map(f => ({
          id: f.id,
          name: f.name,
          organization_id: f.organization_id,
          facility_code: f.facility_code,
          address: f.address,
          active: f.active,
        })));
      }
    } catch (error) {
      console.log('[UserContext] Error loading auth data (may be network issue):', error);
      // Don't clear auth data on network errors - user can retry
    }
  }, []);

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    
    let isMounted = true;
    
    const initAuth = async () => {
      console.log('Starting auth initialization...');
      try {
        await loadAuthData();
        console.log('Auth data loaded successfully');
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        if (isMounted) {
          console.log('Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      }
    };

    // Force loading to false after timeout as fallback
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.log('Auth timeout - forcing loading to false');
        setLoading(false);
      }
    }, 1500);

    initAuth();
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [loadAuthData]);

  const signInCompany = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      console.log('[UserContext] Attempting company login:', email);

      try {
        // Find employee by email (allow any role)
        let user = null;
        let userError = null;
        
        try {
          const result = await supabase
            .from('employees')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
          user = result.data;
          userError = result.error;
        } catch (fetchError) {
          console.error('[UserContext] Network error:', fetchError);
          throw new Error('Unable to connect to server. Please check your internet connection.');
        }

        if (userError) {
          console.error('[UserContext] Query error:', userError.message || userError);
          if (userError.code === 'PGRST116') {
            throw new Error('Invalid email or password.');
          }
          if (userError.message?.includes('fetch') || userError.message?.includes('network')) {
            throw new Error('Unable to connect to server. Please check your internet connection.');
          }
          throw new Error('Unable to connect. Please check your connection and try again.');
        }

        if (!user) {
          throw new Error('Invalid email or password.');
        }

      // Basic password validation (in production, use proper auth)
      if (password.length < 4) {
        throw new Error('Invalid email or password');
      }

      // Fetch organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single();

      if (orgError || !org) {
        console.error('[UserContext] Organization not found:', orgError?.message || orgError);
        throw new Error('Company not found. Please contact support.');
      }

      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ userId: user.id, isEmployee: false })
      );
      await AsyncStorage.setItem(AUTH_TYPE_KEY, 'company');

      setUserProfile({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        position: user.position,
        company_id: user.organization_id,
        is_platform_admin: user.is_platform_admin || false,
      });
      setIsPlatformAdmin(user.is_platform_admin || false);

      setCompany({
        id: org.id,
        name: org.name,
        code: org.code,
        subscription_tier: org.subscription_tier,
      });

      // Sync with OrganizationContext by storing in its AsyncStorage key
      await AsyncStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));
      console.log('[UserContext] Synced organization to OrganizationContext storage');

      // Invalidate organization queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['employee-roles'] });
      console.log('[UserContext] Invalidated organization-related queries including roles');

      // Fetch facilities
      const { data: facs } = await supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', org.id)
        .eq('active', true);

      setFacilities((facs || []).map(f => ({
        id: f.id,
        name: f.name,
        organization_id: f.organization_id,
        facility_code: f.facility_code,
        address: f.address,
        active: f.active,
      })));

      setIsEmployee(false);
      setEmployeeRole(user.role as EmployeeRole || 'default');

      console.log('[UserContext] Company login successful');
      return true;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Unable to connect. Please check your internet connection.');
          }
          throw error;
        }
        throw new Error('An unexpected error occurred. Please try again.');
      }
    },
    [queryClient]
  );

  const signInEmployee = useCallback(
    async (
      facilityCode: string,
      employeeCode: string,
      pin: string
    ): Promise<boolean> => {
      console.log('[UserContext] Attempting employee login with facility:', facilityCode, 'employee:', employeeCode);

      // Find facility by facility_code
      let facility = null;
      let facilityError = null;
      
      try {
        const result = await supabase
          .from('facilities')
          .select('*')
          .eq('facility_code', facilityCode.toUpperCase())
          .eq('active', true)
          .single();
        facility = result.data;
        facilityError = result.error;
      } catch (fetchError) {
        console.error('[UserContext] Network error fetching facility:', fetchError);
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }

      if (facilityError || !facility) {
        console.error('[UserContext] Facility not found:', facilityError?.message || JSON.stringify(facilityError));
        throw new Error('Invalid facility code');
      }

      console.log('[UserContext] Found facility:', facility.id, facility.name);

      // Get organization from facility
      let org = null;
      let orgError = null;
      
      try {
        const result = await supabase
          .from('organizations')
          .select('*')
          .eq('id', facility.organization_id)
          .single();
        org = result.data;
        orgError = result.error;
      } catch (fetchError) {
        console.error('[UserContext] Network error fetching org:', fetchError);
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }

      if (orgError || !org) {
        console.error('[UserContext] Organization not found:', orgError?.message || JSON.stringify(orgError));
        throw new Error('Invalid facility configuration');
      }

      console.log('[UserContext] Found organization:', org.id, org.name);

      // Find employee by code and organization (facility is used to identify org, not restrict employee)
      let employee = null;
      let empError = null;
      
      try {
        console.log('[UserContext] Looking for employee:', employeeCode.toUpperCase(), 'in org:', org.id);
        
        // Search by organization and employee code (not facility-specific)
        const result = await supabase
          .from('employees')
          .select('*')
          .eq('organization_id', org.id)
          .eq('employee_code', employeeCode.toUpperCase())
          .single();
        employee = result.data;
        empError = result.error;
        
        // If not found, try case-insensitive search
        if (empError && empError.code === 'PGRST116') {
          console.log('[UserContext] Trying case-insensitive employee search...');
          const iresult = await supabase
            .from('employees')
            .select('*')
            .eq('organization_id', org.id)
            .ilike('employee_code', employeeCode);
          
          if (iresult.data && iresult.data.length === 1) {
            employee = iresult.data[0];
            empError = null;
            console.log('[UserContext] Found employee via case-insensitive search');
          } else if (iresult.data && iresult.data.length > 1) {
            console.error('[UserContext] Multiple employees found with similar codes');
          }
        }
      } catch (fetchError) {
        console.error('[UserContext] Network error fetching employee:', fetchError);
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }

      if (empError || !employee) {
        console.error('[UserContext] Employee not found for code:', employeeCode, 'in org:', org.id, 'Error:', empError?.message || JSON.stringify(empError));
        throw new Error('Invalid employee code');
      }
      
      console.log('[UserContext] Found employee:', employee.id, employee.first_name, employee.last_name);

      // Validate PIN
      if (employee.pin !== pin) {
        throw new Error('Invalid PIN');
      }

      // Check employee status
      if (employee.status !== 'active') {
        throw new Error('Employee account is not active');
      }

      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ userId: employee.id, isEmployee: true })
      );
      await AsyncStorage.setItem(AUTH_TYPE_KEY, 'employee');

      setUserProfile({
        id: employee.id,
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role,
        position: employee.position,
        company_id: employee.organization_id,
      });

      setCompany({
        id: org.id,
        name: org.name,
        code: org.code,
        subscription_tier: org.subscription_tier,
      });

      // Sync with OrganizationContext by storing in its AsyncStorage key
      await AsyncStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));
      console.log('[UserContext] Synced organization to OrganizationContext storage');

      // Invalidate organization queries to force refresh
      queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['employee-roles'] });
      console.log('[UserContext] Invalidated organization-related queries including roles');

      // Fetch facilities
      const { data: facs } = await supabase
        .from('facilities')
        .select('*')
        .eq('organization_id', org.id)
        .eq('active', true);

      setFacilities((facs || []).map(f => ({
        id: f.id,
        name: f.name,
        organization_id: f.organization_id,
        facility_code: f.facility_code,
        address: f.address,
        active: f.active,
      })));

      setIsEmployee(true);
      setEmployeeRole(employee.role as EmployeeRole);

      console.log('[UserContext] Employee login successful');
      return true;
    },
    [queryClient]
  );

  const signInPlatformAdmin = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      console.log('[UserContext] Attempting platform admin login:', email);

      try {
        let user = null;
        let userError = null;
        
        try {
          const result = await supabase
            .from('employees')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();
          user = result.data;
          userError = result.error;
        } catch (fetchError) {
          console.error('[UserContext] Network error:', fetchError);
          throw new Error('Unable to connect to server. Please check your internet connection.');
        }

        if (userError) {
          console.error('[UserContext] Query error:', userError.message || userError);
          if (userError.code === 'PGRST116') {
            throw new Error('Invalid credentials.');
          }
          throw new Error('Unable to connect. Please check your connection and try again.');
        }

        if (!user) {
          throw new Error('Invalid credentials.');
        }

        // Validate this is a platform admin
        if (!user.is_platform_admin) {
          console.error('[UserContext] User is not a platform admin');
          throw new Error('Access denied. This login is for platform administrators only.');
        }

        if (password.length < 4) {
          throw new Error('Invalid credentials');
        }

        // Fetch organization
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', user.organization_id)
          .single();

        if (orgError || !org) {
          console.error('[UserContext] Organization not found:', orgError?.message || orgError);
          throw new Error('Configuration error. Please contact support.');
        }

        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ userId: user.id, isEmployee: false })
        );
        await AsyncStorage.setItem(AUTH_TYPE_KEY, 'platform_admin');

        setUserProfile({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          company_id: user.organization_id,
          is_platform_admin: true,
        });
        setIsPlatformAdmin(true);

        setCompany({
          id: org.id,
          name: org.name,
          code: org.code,
          subscription_tier: org.subscription_tier,
        });

        await AsyncStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(org));

        queryClient.invalidateQueries({ queryKey: ['stored-organization'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['facilities'] });
        queryClient.invalidateQueries({ queryKey: ['organizations'] });

        // Fetch facilities
        const { data: facs } = await supabase
          .from('facilities')
          .select('*')
          .eq('organization_id', org.id)
          .eq('active', true);

        setFacilities((facs || []).map(f => ({
          id: f.id,
          name: f.name,
          organization_id: f.organization_id,
          facility_code: f.facility_code,
          address: f.address,
          active: f.active,
        })));

        setIsEmployee(false);
        setEmployeeRole(user.role as EmployeeRole || 'default');

        console.log('[UserContext] Platform admin login successful');
        return true;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error('Unable to connect. Please check your internet connection.');
          }
          throw error;
        }
        throw new Error('An unexpected error occurred. Please try again.');
      }
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    try {
      console.log('[UserContext] Signing out...');
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, AUTH_TYPE_KEY, ORG_STORAGE_KEY, 'tulkenz_facility']);
      setUserProfile(null);
      setCompany(null);
      setFacilities([]);
      setIsEmployee(false);
      setEmployeeRole('default');
      setIsPlatformAdmin(false);
      console.log('[UserContext] Sign out successful');
    } catch (error) {
      console.error('[UserContext] Sign out error:', error);
    }
  }, []);

  const isSuperAdmin = useMemo(() => {
    return isSuperAdminRole(userProfile?.role);
  }, [userProfile?.role]);

  const allowedModules = useMemo((): ModuleConfig[] => {
    if (isEmployee) {
      // All employees get base access (portal only)
      // Additional modules are controlled via Permissions system
      return ALL_MODULES.filter((m) => BASE_EMPLOYEE_MODULES.includes(m.key));
    }
    
    // SuperAdmin gets access to ALL modules regardless of tier
    if (isSuperAdmin) {
      return ALL_MODULES;
    }
    
    const tier = company?.subscription_tier || 'starter';
    const allowedKeys = TIER_MODULES[tier];
    
    // HR and Finance are now permission-based (assignable to non-Super Admins)
    // Access is controlled via the Permissions system in PermissionsContext
    // Module-level permission checks happen at the module entry points
    
    return ALL_MODULES.filter((m) => allowedKeys.includes(m.key));
  }, [isEmployee, company?.subscription_tier, isSuperAdmin]);

  const tierInfo = useMemo(() => {
    const tier = company?.subscription_tier || 'starter';
    return TIER_INFO[tier];
  }, [company?.subscription_tier]);

  const hasModuleAccess = useCallback((moduleKey: ModuleKey): boolean => {
    return allowedModules.some((m) => m.key === moduleKey);
  }, [allowedModules]);

  const defaultRoute = useMemo((): string => {
    if (isEmployee) {
      const firstModule = allowedModules[0];
      return firstModule?.path || '(dashboard)';
    }
    
    const tier = company?.subscription_tier || 'starter';
    if (tier === 'enterprise' || tier === 'enterprise_plus') {
      return '(dashboard)';
    }
    return 'inventory';
  }, [isEmployee, allowedModules, company?.subscription_tier]);

  const isAuthenticated = !!userProfile;

  return {
    user: userProfile,
    userProfile,
    company,
    facilities,
    loading,
    isEmployee,
    employeeRole,
    isAuthenticated,
    isSuperAdmin,
    isPlatformAdmin,
    signInCompany,
    signInEmployee,
    signInPlatformAdmin,
    signOut,
    allowedModules,
    tierInfo,
    hasModuleAccess,
    defaultRoute,
  };
});
