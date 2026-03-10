// contexts/EmergencyRollCallContext.tsx
// Bridge between the AI assistant and the active emergency roll call screen.
// EmergencyProtocolScreen registers its state here when a roll call is active.
// useAIActions reads from here to mark employees safe by voice.

import React, { createContext, useContext, useRef, useCallback } from 'react';
import { EmergencyEmployee } from '@/mocks/emergencyEmployees';

export interface RollCallEmployee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  status: 'pending' | 'safe';
}

interface EmergencyRollCallContextValue {
  // Called by EmergencyProtocolScreen to register itself as active
  registerRollCall: (
    employees: RollCallEmployee[],
    markSafeFn: (employeeId: string) => void,
    isDrill: boolean,
    emergencyType: string,
  ) => void;
  // Called by EmergencyProtocolScreen when it unmounts / closes
  unregisterRollCall: () => void;
  // Called by useAIActions to mark an employee safe by name
  markSafeByName: (name: string) => { success: boolean; message: string };
  // Called by useAIActions to get current roll call status
  getRollCallStatus: () => {
    active: boolean;
    isDrill: boolean;
    emergencyType: string;
    total: number;
    safe: number;
    pending: number;
    pendingNames: string[];
  } | null;
}

const EmergencyRollCallContext = createContext<EmergencyRollCallContextValue | null>(null);

export function EmergencyRollCallProvider({ children }: { children: React.ReactNode }) {
  const employeesRef = useRef<RollCallEmployee[]>([]);
  const markSafeFnRef = useRef<((id: string) => void) | null>(null);
  const isDrillRef = useRef(false);
  const emergencyTypeRef = useRef('');
  const isActiveRef = useRef(false);

  const registerRollCall = useCallback((
    employees: RollCallEmployee[],
    markSafeFn: (employeeId: string) => void,
    isDrill: boolean,
    emergencyType: string,
  ) => {
    employeesRef.current = employees;
    markSafeFnRef.current = markSafeFn;
    isDrillRef.current = isDrill;
    emergencyTypeRef.current = emergencyType;
    isActiveRef.current = true;
    console.log('[EmergencyRollCallContext] Roll call registered:', employees.length, 'employees');
  }, []);

  const unregisterRollCall = useCallback(() => {
    employeesRef.current = [];
    markSafeFnRef.current = null;
    isActiveRef.current = false;
    console.log('[EmergencyRollCallContext] Roll call unregistered');
  }, []);

  // Fuzzy name matcher — handles "John Smith", "john smith", "John S.", first name only
  const markSafeByName = useCallback((name: string): { success: boolean; message: string } => {
    if (!isActiveRef.current || !markSafeFnRef.current) {
      return { success: false, message: 'No active roll call. Start an emergency protocol first.' };
    }

    const input = name.toLowerCase().trim();
    const pending = employeesRef.current.filter(e => e.status === 'pending');

    if (pending.length === 0) {
      return { success: false, message: 'Everyone is already accounted for.' };
    }

    // Score each pending employee against the input
    const scored = pending.map(emp => {
      const full = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const first = emp.firstName.toLowerCase();
      const last = emp.lastName.toLowerCase();
      const lastInitial = `${first} ${last[0]}`.toLowerCase();

      let score = 0;
      if (full === input) score = 100;                          // exact full name
      else if (full.includes(input) || input.includes(full)) score = 80; // substring
      else if (input.includes(first) && input.includes(last)) score = 90; // both names present
      else if (input.startsWith(first) && input.includes(last[0])) score = 70; // first + last initial
      else if (last === input) score = 60;                      // last name only
      else if (first === input) score = 50;                     // first name only
      else if (full.split(' ').some(w => input.includes(w) && w.length > 2)) score = 30; // partial word

      return { emp, score };
    });

    const best = scored.sort((a, b) => b.score - a.score)[0];

    if (best.score < 30) {
      const pendingNames = pending.map(e => `${e.firstName} ${e.lastName}`).join(', ');
      return {
        success: false,
        message: `Couldn't find "${name}" in the pending list. Still waiting on: ${pendingNames}`,
      };
    }

    // Mark them safe
    markSafeFnRef.current(best.emp.id);

    // Update local ref so subsequent calls in same session are accurate
    employeesRef.current = employeesRef.current.map(e =>
      e.id === best.emp.id ? { ...e, status: 'safe' as const } : e
    );

    const remaining = employeesRef.current.filter(e => e.status === 'pending');
    const name_ = `${best.emp.firstName} ${best.emp.lastName}`;

    if (remaining.length === 0) {
      return {
        success: true,
        message: `✅ ${name_} marked safe. That's everyone — all personnel accounted for!`,
      };
    }

    return {
      success: true,
      message: `✅ ${name_} marked safe. ${remaining.length} still pending: ${remaining.map(e => `${e.firstName} ${e.lastName}`).join(', ')}`,
    };
  }, []);

  const getRollCallStatus = useCallback(() => {
    if (!isActiveRef.current) return null;
    const safe = employeesRef.current.filter(e => e.status === 'safe');
    const pending = employeesRef.current.filter(e => e.status === 'pending');
    return {
      active: true,
      isDrill: isDrillRef.current,
      emergencyType: emergencyTypeRef.current,
      total: employeesRef.current.length,
      safe: safe.length,
      pending: pending.length,
      pendingNames: pending.map(e => `${e.firstName} ${e.lastName}`),
    };
  }, []);

  return (
    <EmergencyRollCallContext.Provider value={{
      registerRollCall,
      unregisterRollCall,
      markSafeByName,
      getRollCallStatus,
    }}>
      {children}
    </EmergencyRollCallContext.Provider>
  );
}

export function useEmergencyRollCall() {
  const ctx = useContext(EmergencyRollCallContext);
  if (!ctx) throw new Error('useEmergencyRollCall must be used inside EmergencyRollCallProvider');
  return ctx;
}
