import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { Employee } from '@/types/employee';

export interface OrgEmployee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  position: string | null;
  department_code: string | null;
  facility_id: string | null;
  manager_id: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string | null;
  profile: {
    avatar_url?: string;
    title?: string;
    phone?: string;
  } | null;
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    position: string | null;
  } | null;
  direct_reports_count: number;
  level: number;
}

export interface OrgNode extends OrgEmployee {
  children: OrgNode[];
  expanded?: boolean;
}

export function useOrgHierarchy(filters?: {
  facilityId?: string;
  departmentCode?: string;
  status?: string;
}) {
  const { organization } = useOrganization();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['org-hierarchy', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[useOrgHierarchy] No organization ID');
        return [];
      }

      console.log('[useOrgHierarchy] Fetching employees for org:', organizationId);

      let query = supabase
        .from('employees')
        .select(`
          id,
          employee_code,
          first_name,
          last_name,
          email,
          role,
          position,
          department_code,
          facility_id,
          manager_id,
          status,
          hire_date,
          profile
        `)
        .eq('organization_id', organizationId)
        .order('last_name', { ascending: true });

      if (filters?.facilityId) {
        query = query.eq('facility_id', filters.facilityId);
      }
      if (filters?.departmentCode) {
        query = query.eq('department_code', filters.departmentCode);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useOrgHierarchy] Error fetching employees:', error);
        throw new Error(error.message);
      }

      const employees = (data || []).map(emp => ({
        ...emp,
        full_name: `${emp.first_name} ${emp.last_name}`,
        direct_reports_count: 0,
        level: 0,
        manager: null,
      })) as OrgEmployee[];

      const employeeMap = new Map<string, OrgEmployee>();
      employees.forEach(emp => employeeMap.set(emp.id, emp));

      employees.forEach(emp => {
        if (emp.manager_id && employeeMap.has(emp.manager_id)) {
          const manager = employeeMap.get(emp.manager_id)!;
          emp.manager = {
            id: manager.id,
            first_name: manager.first_name,
            last_name: manager.last_name,
            position: manager.position,
          };
          manager.direct_reports_count++;
        }
      });

      const calculateLevel = (emp: OrgEmployee, visited: Set<string> = new Set()): number => {
        if (visited.has(emp.id)) return 0;
        visited.add(emp.id);
        
        if (!emp.manager_id) return 0;
        const manager = employeeMap.get(emp.manager_id);
        if (!manager) return 0;
        return 1 + calculateLevel(manager, visited);
      };

      employees.forEach(emp => {
        emp.level = calculateLevel(emp);
      });

      console.log('[useOrgHierarchy] Fetched', employees.length, 'employees');
      return employees;
    },
    enabled: !!organizationId,
  });
}

export function useOrgTree(employees: OrgEmployee[]) {
  const buildTree = (employees: OrgEmployee[]): OrgNode[] => {
    const nodeMap = new Map<string, OrgNode>();
    
    employees.forEach(emp => {
      nodeMap.set(emp.id, { ...emp, children: [], expanded: true });
    });

    const roots: OrgNode[] = [];

    employees.forEach(emp => {
      const node = nodeMap.get(emp.id)!;
      if (emp.manager_id && nodeMap.has(emp.manager_id)) {
        const parent = nodeMap.get(emp.manager_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes: OrgNode[]) => {
      nodes.sort((a, b) => {
        if (a.direct_reports_count !== b.direct_reports_count) {
          return b.direct_reports_count - a.direct_reports_count;
        }
        return a.last_name.localeCompare(b.last_name);
      });
      nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
  };

  return buildTree(employees);
}

export function useUpdateManager() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();

  return useMutation({
    mutationFn: async ({ employeeId, managerId }: { employeeId: string; managerId: string | null }) => {
      if (!organization?.id) {
        throw new Error('No organization selected');
      }

      console.log('[useUpdateManager] Updating manager for employee:', employeeId, 'to:', managerId);

      const { data, error } = await supabase
        .from('employees')
        .update({ manager_id: managerId })
        .eq('id', employeeId)
        .eq('organization_id', organization.id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateManager] Error:', error);
        throw new Error(error.message);
      }

      console.log('[useUpdateManager] Updated successfully');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-hierarchy'] });
    },
  });
}

export function getHierarchyStats(employees: OrgEmployee[]) {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const managers = employees.filter(e => e.direct_reports_count > 0).length;
  const topLevel = employees.filter(e => !e.manager_id).length;
  const maxLevel = Math.max(...employees.map(e => e.level), 0);
  const avgSpan = managers > 0 
    ? employees.reduce((sum, e) => sum + e.direct_reports_count, 0) / managers 
    : 0;

  return {
    totalEmployees,
    activeEmployees,
    managers,
    topLevel,
    maxLevel: maxLevel + 1,
    avgSpanOfControl: avgSpan.toFixed(1),
  };
}
