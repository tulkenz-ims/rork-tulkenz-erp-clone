import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LICENSE_STORAGE_KEY = 'tulkenz_license_type';

export type LicenseType = 'OPS' | 'ERP';

export type ModuleVisibilityKey =
  | 'taskFeed'
  | 'dashboard'
  | 'cmms'
  | 'service'
  | 'inspections'
  | 'parts'
  | 'inventory'
  | 'procurement'
  | 'planner'
  | 'approvals'
  | 'settings'
  | 'timeclock'
  | 'timeclockReports'
  | 'sanitation'
  | 'quality'
  | 'safety'
  | 'compliance'
  | 'recycling'
  | 'hr'
  | 'finance'
  | 'payroll'
  | 'benefits'
  | 'recruiting'
  | 'production'
  | 'onboarding'
  | 'offboarding'
  | 'performance'
  | 'goals'
  | 'succession'
  | 'lms'
  | 'surveys'
  | 'overtime'
  | 'fmla'
  | 'attendance'
  | 'headcount'
  | 'eeoc'
  | 'i9everify'
  | 'disciplinary'
  | 'grievance'
  | 'employees'
  | 'portal';

export type ModuleVisibility = Record<ModuleVisibilityKey, boolean>;

export const [LicenseProvider, useLicense] = createContextHook(() => {
  const [licenseType, setLicenseTypeState] = useState<LicenseType>('OPS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLicense = async () => {
      try {
        const stored = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
        if (stored === 'OPS' || stored === 'ERP') {
          setLicenseTypeState(stored);
        }
        console.log('License type loaded:', stored || 'OPS (default)');
      } catch (error) {
        console.error('Error loading license type:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLicense();
  }, []);

  const setLicenseType = useCallback(async (type: LicenseType) => {
    try {
      await AsyncStorage.setItem(LICENSE_STORAGE_KEY, type);
      setLicenseTypeState(type);
      console.log('License type updated to:', type);
    } catch (error) {
      console.error('Error saving license type:', error);
    }
  }, []);

  const isOPS = licenseType === 'OPS';
  const isERP = licenseType === 'ERP';

  const moduleVisibility = useMemo<ModuleVisibility>(() => ({
    // Always visible (OPS + ERP)
    taskFeed: true,
    dashboard: true,
    cmms: true,
    service: true,
    inspections: true,
    parts: true,
    inventory: true,
    procurement: true,
    planner: true,
    approvals: true,
    settings: true,
    timeclock: true,
    timeclockReports: true,
    portal: true,
    
    // OPS License additions (visible in OPS + ERP)
    sanitation: true,
    quality: true,
    safety: true,
    compliance: true,
    recycling: true,
    
    // ERP Only (hidden in OPS, visible in ERP)
    hr: isERP,
    finance: isERP,
    payroll: isERP,
    benefits: isERP,
    recruiting: isERP,
    production: isERP,
    onboarding: isERP,
    offboarding: isERP,
    performance: isERP,
    goals: isERP,
    succession: isERP,
    lms: isERP,
    surveys: isERP,
    overtime: isERP,
    fmla: isERP,
    attendance: isERP,
    headcount: isERP,
    eeoc: isERP,
    i9everify: isERP,
    disciplinary: isERP,
    grievance: isERP,
    employees: isERP,
  }), [isERP]);

  const isModuleVisibleByLicense = useCallback((key: ModuleVisibilityKey): boolean => {
    return moduleVisibility[key] ?? false;
  }, [moduleVisibility]);

  return {
    licenseType,
    setLicenseType,
    isOPS,
    isERP,
    loading,
    moduleVisibility,
    isModuleVisibleByLicense,
  };
});
