// contexts/EmergencyRollCallContext.tsx
// Bridge between the AI assistant and the active emergency roll call screen.
// EmergencyProtocolScreen registers all its callbacks here when active.

import React, { createContext, useContext, useRef, useCallback } from 'react';

export interface RollCallEmployee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  status: 'pending' | 'safe';
}

export interface EmergencyProtocolActions {
  initiateEmergency: () => void;
  handleEndProtocol: () => void;
  handleCancelEvent: () => void;
  handleSaveDetails: () => void;
  handleViewLog: () => void;
  handleClose: () => void;
  setLocationDetails: (v: string) => void;
  setDescription: (v: string) => void;
  setSeverity: (v: 'critical' | 'high' | 'medium' | 'low') => void;
  setEmergencyServicesCalled: (v: boolean) => void;
}

export interface RollCallStatus {
  active: boolean;
  rollCallLive: boolean;
  isDrill: boolean;
  emergencyType: string;
  total: number;
  safe: number;
  pending: number;
  pendingNames: string[];
}

interface EmergencyRollCallContextValue {
  registerRollCall: (
    employees: RollCallEmployee[],
    markSafeFn: (employeeId: string) => void,
    isDrill: boolean,
    emergencyType: string,
    actions: EmergencyProtocolActions,
  ) => void;
  unregisterRollCall: () => void;
  markSafeByName: (name: string) => { success: boolean; message: string };
  markMultipleSafeByName: (names: string[]) => { success: boolean; message: string };
  getRollCallStatus: () => RollCallStatus | null;
  initiateRollCall: () => { success: boolean; message: string };
  endProtocol: () => { success: boolean; message: string };
  cancelEvent: () => { success: boolean; message: string };
  saveDetails: (opts?: { severity?: string; location?: string; notes?: string; emergencyServicesCalled?: boolean }) => { success: boolean; message: string };
  viewEventLog: () => { success: boolean; message: string };
  closeProtocol: () => { success: boolean; message: string };
}

const EmergencyRollCallContext = createContext<EmergencyRollCallContextValue | null>(null);

export function EmergencyRollCallProvider({ children }: { children: React.ReactNode }) {
  const employeesRef = useRef<RollCallEmployee[]>([]);
  const markSafeFnRef = useRef<((id: string) => void) | null>(null);
  const actionsRef = useRef<EmergencyProtocolActions | null>(null);
  const isDrillRef = useRef(false);
  const emergencyTypeRef = useRef('');
  const isScreenActiveRef = useRef(false);
  const isRollCallLiveRef = useRef(false);

  const registerRollCall = useCallback((
    employees: RollCallEmployee[],
    markSafeFn: (employeeId: string) => void,
    isDrill: boolean,
    emergencyType: string,
    actions: EmergencyProtocolActions,
  ) => {
    employeesRef.current = employees;
    markSafeFnRef.current = markSafeFn;
    actionsRef.current = actions;
    isDrillRef.current = isDrill;
    emergencyTypeRef.current = emergencyType;
    isScreenActiveRef.current = true;
    isRollCallLiveRef.current = employees.length > 0;
    console.log('[EmergencyRollCallContext] Registered:', employees.length, 'employees, live:', isRollCallLiveRef.current);
  }, []);

  const unregisterRollCall = useCallback(() => {
    employeesRef.current = [];
    markSafeFnRef.current = null;
    actionsRef.current = null;
    isScreenActiveRef.current = false;
    isRollCallLiveRef.current = false;
    console.log('[EmergencyRollCallContext] Unregistered');
  }, []);

  const findEmployee = (name: string): RollCallEmployee | null => {
    const input = name.toLowerCase().trim();
    const pending = employeesRef.current.filter(e => e.status === 'pending');
    if (!pending.length) return null;
    const scored = pending.map(emp => {
      const full = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const first = emp.firstName.toLowerCase();
      const last = emp.lastName.toLowerCase();
      let score = 0;
      if (full === input) score = 100;
      else if (input.includes(first) && input.includes(last)) score = 90;
      else if (full.includes(input) || input.includes(full)) score = 80;
      else if (last === input) score = 60;
      else if (first === input) score = 50;
      else if (full.split(' ').some((w: string) => input.includes(w) && w.length > 2)) score = 30;
      return { emp, score };
    });
    const best = scored.sort((a, b) => b.score - a.score)[0];
    return best.score >= 30 ? best.emp : null;
  };

  const markSafeByName = useCallback((name: string): { success: boolean; message: string } => {
    if (!isRollCallLiveRef.current || !markSafeFnRef.current) {
      return { success: false, message: 'Roll call is not active yet. Start the protocol first.' };
    }
    const match = findEmployee(name);
    if (!match) {
      const pending = employeesRef.current.filter(e => e.status === 'pending');
      if (!pending.length) return { success: false, message: 'Everyone is already accounted for.' };
      return { success: false, message: `Couldn't find "${name}". Still pending: ${pending.map(e => `${e.firstName} ${e.lastName}`).join(', ')}` };
    }
    markSafeFnRef.current(match.id);
    employeesRef.current = employeesRef.current.map(e =>
      e.id === match.id ? { ...e, status: 'safe' as const } : e
    );
    const remaining = employeesRef.current.filter(e => e.status === 'pending');
    const fullName = `${match.firstName} ${match.lastName}`;
    if (!remaining.length) return { success: true, message: `✅ ${fullName} marked safe. That's everyone — all personnel accounted for!` };
    return { success: true, message: `✅ ${fullName} marked safe. ${remaining.length} still pending: ${remaining.map(e => `${e.firstName} ${e.lastName}`).join(', ')}` };
  }, []);

  const markMultipleSafeByName = useCallback((names: string[]): { success: boolean; message: string } => {
    if (!isRollCallLiveRef.current) return { success: false, message: 'Roll call is not active.' };
    const marked: string[] = [];
    const notFound: string[] = [];
    for (const name of names) {
      const match = findEmployee(name);
      if (match) {
        markSafeFnRef.current!(match.id);
        employeesRef.current = employeesRef.current.map(e =>
          e.id === match.id ? { ...e, status: 'safe' as const } : e
        );
        marked.push(`${match.firstName} ${match.lastName}`);
      } else {
        notFound.push(name);
      }
    }
    const remaining = employeesRef.current.filter(e => e.status === 'pending');
    let msg = marked.length ? `✅ Marked safe: ${marked.join(', ')}. ` : '';
    if (notFound.length) msg += `Couldn't find: ${notFound.join(', ')}. `;
    if (!remaining.length) msg += 'Everyone is accounted for!';
    else msg += `${remaining.length} still pending: ${remaining.map(e => `${e.firstName} ${e.lastName}`).join(', ')}`;
    return { success: marked.length > 0, message: msg };
  }, []);

  const getRollCallStatus = useCallback((): RollCallStatus | null => {
    if (!isScreenActiveRef.current) return null;
    const safe = employeesRef.current.filter(e => e.status === 'safe');
    const pending = employeesRef.current.filter(e => e.status === 'pending');
    return {
      active: isScreenActiveRef.current,
      rollCallLive: isRollCallLiveRef.current,
      isDrill: isDrillRef.current,
      emergencyType: emergencyTypeRef.current,
      total: employeesRef.current.length,
      safe: safe.length,
      pending: pending.length,
      pendingNames: pending.map(e => `${e.firstName} ${e.lastName}`),
    };
  }, []);

  const initiateRollCall = useCallback((): { success: boolean; message: string } => {
    if (!isScreenActiveRef.current || !actionsRef.current) {
      return { success: false, message: 'Emergency protocol screen is not open.' };
    }
    if (isRollCallLiveRef.current) return { success: false, message: 'Roll call is already active.' };
    actionsRef.current.initiateEmergency();
    const label = emergencyTypeRef.current.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return { success: true, message: `${label} ${isDrillRef.current ? 'drill' : 'emergency'} initiated. Roll call is now live.` };
  }, []);

  const endProtocol = useCallback((): { success: boolean; message: string } => {
    if (!isRollCallLiveRef.current || !actionsRef.current) return { success: false, message: 'No active protocol to end.' };
    actionsRef.current.handleEndProtocol();
    return { success: true, message: 'Protocol ended and event marked resolved.' };
  }, []);

  const cancelEvent = useCallback((): { success: boolean; message: string } => {
    if (!isScreenActiveRef.current || !actionsRef.current) return { success: false, message: 'No active event to cancel.' };
    actionsRef.current.handleCancelEvent();
    return { success: true, message: 'Event cancelled.' };
  }, []);

  const saveDetails = useCallback((opts?: {
    severity?: string;
    location?: string;
    notes?: string;
    emergencyServicesCalled?: boolean;
  }): { success: boolean; message: string } => {
    if (!actionsRef.current) return { success: false, message: 'No active protocol.' };
    if (opts?.severity && ['critical','high','medium','low'].includes(opts.severity)) {
      actionsRef.current.setSeverity(opts.severity as any);
    }
    if (opts?.location) actionsRef.current.setLocationDetails(opts.location);
    if (opts?.notes) actionsRef.current.setDescription(opts.notes);
    if (opts?.emergencyServicesCalled !== undefined) actionsRef.current.setEmergencyServicesCalled(opts.emergencyServicesCalled);
    actionsRef.current.handleSaveDetails();
    return { success: true, message: 'Event details saved and closed.' };
  }, []);

  const viewEventLog = useCallback((): { success: boolean; message: string } => {
    if (!actionsRef.current) return { success: false, message: 'No active protocol.' };
    actionsRef.current.handleViewLog();
    return { success: true, message: 'Opening event log.' };
  }, []);

  const closeProtocol = useCallback((): { success: boolean; message: string } => {
    if (!actionsRef.current) return { success: false, message: 'No active protocol.' };
    actionsRef.current.handleClose();
    return { success: true, message: 'Protocol screen closed.' };
  }, []);

  return (
    <EmergencyRollCallContext.Provider value={{
      registerRollCall, unregisterRollCall,
      markSafeByName, markMultipleSafeByName, getRollCallStatus,
      initiateRollCall, endProtocol, cancelEvent,
      saveDetails, viewEventLog, closeProtocol,
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
