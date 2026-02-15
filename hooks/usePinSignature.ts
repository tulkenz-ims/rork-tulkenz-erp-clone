import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

// ── Types ─────────────────────────────────────────────────────

export interface SignatureVerification {
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  departmentCode: string;
  signatureStamp: string;
  verifiedAt: string;
}

export interface SignatureLogEntry {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName: string;
  employeeInitials: string;
  departmentCode: string;
  formType: string;
  formRoute?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  signatureStamp: string;
  verifiedAt: string;
}

// ── Verify PIN ────────────────────────────────────────────────
// Looks up employee by initials within the organization, verifies PIN match

export function useVerifySignaturePin(callbacks?: {
  onSuccess?: (data: SignatureVerification) => void;
  onError?: (error: Error) => void;
}) {
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: { initials: string; pin: string }): Promise<SignatureVerification> => {
      if (!organizationId) throw new Error('No organization context');
      if (!input.initials.trim()) throw new Error('Initials are required');
      if (!input.pin.trim()) throw new Error('PIN is required');

      const upperInitials = input.initials.trim().toUpperCase();

      // Find employee by initials in this organization
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, signature_initials, signature_pin, signature_pin_set, department_code, status')
        .eq('organization_id', organizationId)
        .eq('signature_initials', upperInitials)
        .eq('status', 'active');

      if (error) throw new Error('Failed to look up employee');

      if (!employees || employees.length === 0) {
        throw new Error(`No active employee found with initials "${upperInitials}"`);
      }

      // If multiple employees have same initials, try to match PIN against each
      let matchedEmployee = null;
      for (const emp of employees) {
        if (!emp.signature_pin_set || !emp.signature_pin) {
          continue; // Skip employees who haven't set up their signature PIN
        }
        if (emp.signature_pin === input.pin.trim()) {
          matchedEmployee = emp;
          break;
        }
      }

      if (!matchedEmployee) {
        // Check if any matched employee just hasn't set up their PIN yet
        const hasUnsetPins = employees.some(e => !e.signature_pin_set);
        if (hasUnsetPins && employees.length === 1) {
          throw new Error('Signature PIN not set up. Please contact your supervisor to set up your signature PIN.');
        }
        throw new Error('Invalid PIN. Verification failed.');
      }

      const fullName = `${matchedEmployee.first_name} ${matchedEmployee.last_name}`;
      const now = new Date();
      const timestamp = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }) + ' ' + now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const signatureStamp = `${fullName} — verified by PPN — ${timestamp}`;

      return {
        employeeId: matchedEmployee.id,
        employeeName: fullName,
        employeeInitials: upperInitials,
        departmentCode: matchedEmployee.department_code || '',
        signatureStamp,
        verifiedAt: now.toISOString(),
      };
    },
    onSuccess: (data) => callbacks?.onSuccess?.(data),
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Log Signature ─────────────────────────────────────────────
// Records the verified signature in the immutable audit log

export function useLogSignature(callbacks?: {
  onSuccess?: (data: SignatureLogEntry) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  return useMutation({
    mutationFn: async (input: {
      verification: SignatureVerification;
      formType: string;
      formRoute?: string;
      referenceType?: string;
      referenceId?: string;
      referenceNumber?: string;
    }): Promise<SignatureLogEntry> => {
      const { data, error } = await supabase
        .from('form_signatures')
        .insert({
          organization_id: organizationId,
          employee_id: input.verification.employeeId,
          employee_name: input.verification.employeeName,
          employee_initials: input.verification.employeeInitials,
          department_code: input.verification.departmentCode,
          form_type: input.formType,
          form_route: input.formRoute,
          reference_type: input.referenceType,
          reference_id: input.referenceId,
          reference_number: input.referenceNumber,
          signature_stamp: input.verification.signatureStamp,
          verified_at: input.verification.verifiedAt,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        organizationId: data.organization_id,
        employeeId: data.employee_id,
        employeeName: data.employee_name,
        employeeInitials: data.employee_initials,
        departmentCode: data.department_code,
        formType: data.form_type,
        formRoute: data.form_route,
        referenceType: data.reference_type,
        referenceId: data.reference_id,
        referenceNumber: data.reference_number,
        signatureStamp: data.signature_stamp,
        verifiedAt: data.verified_at,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['form_signatures'] });
      callbacks?.onSuccess?.(data);
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Set Signature PIN ─────────────────────────────────────────
// Admin or employee sets/resets their signature PIN

export function useSetSignaturePin(callbacks?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { employeeId: string; pin: string; initials?: string }) => {
      if (input.pin.length < 4 || input.pin.length > 6) {
        throw new Error('PIN must be 4-6 digits');
      }
      if (!/^\d+$/.test(input.pin)) {
        throw new Error('PIN must be numbers only');
      }

      const updateData: any = {
        signature_pin: input.pin,
        signature_pin_set: true,
      };

      // Allow custom initials override
      if (input.initials) {
        updateData.signature_initials = input.initials.toUpperCase();
      }

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', input.employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      callbacks?.onSuccess?.();
    },
    onError: (error: Error) => callbacks?.onError?.(error),
  });
}

// ── Auto-Generate Initials ────────────────────────────────────
// If two employees have same initials, append a number
export function generateUniqueInitials(
  firstName: string,
  lastName: string,
  existingInitials: string[]
): string {
  const base = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  if (!existingInitials.includes(base)) return base;

  // Try 3-letter: first + middle of last + last
  const three = (firstName.charAt(0) + lastName.charAt(0) + lastName.charAt(lastName.length - 1)).toUpperCase();
  if (!existingInitials.includes(three)) return three;

  // Append number
  let counter = 2;
  while (existingInitials.includes(`${base}${counter}`)) {
    counter++;
  }
  return `${base}${counter}`;
}
