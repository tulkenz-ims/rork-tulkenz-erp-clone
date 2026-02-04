import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  SafetyProgramDocument,
  CreateSafetyDocumentInput,
  UpdateSafetyDocumentInput,
  SafetyProgramType,
  SafetyDocumentSection,
} from '@/types/safetyProgram';

const QUERY_KEY = 'safety_program_documents';

export function useSafetyProgramDocuments(programType?: SafetyProgramType) {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, organizationId, programType],
    queryFn: async () => {
      if (!organizationId) {
        console.log('[SafetyDocs] No organization ID, returning empty array');
        return [];
      }

      console.log('[SafetyDocs] Fetching documents for program type:', programType);

      let query = supabase
        .from('safety_program_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('document_type', { ascending: true })
        .order('title', { ascending: true });

      if (programType) {
        query = query.eq('program_type', programType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SafetyDocs] Error fetching documents:', error);
        throw error;
      }

      console.log('[SafetyDocs] Fetched documents:', data?.length || 0);
      return (data || []) as SafetyProgramDocument[];
    },
    enabled: !!organizationId,
  });
}

export function useSafetyProgramDocument(documentId: string | null) {
  const { organizationId } = useAuth();

  return useQuery({
    queryKey: [QUERY_KEY, 'detail', documentId, organizationId],
    queryFn: async () => {
      if (!documentId || !organizationId) return null;

      console.log('[SafetyDocs] Fetching document:', documentId);

      const { data, error } = await supabase
        .from('safety_program_documents')
        .select('*')
        .eq('id', documentId)
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.error('[SafetyDocs] Error fetching document:', error);
        throw error;
      }

      return data as SafetyProgramDocument;
    },
    enabled: !!documentId && !!organizationId,
  });
}

export function useCreateSafetyDocument() {
  const queryClient = useQueryClient();
  const { organizationId, employee } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSafetyDocumentInput) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('[SafetyDocs] Creating document:', input.title);

      const { data, error } = await supabase
        .from('safety_program_documents')
        .insert({
          organization_id: organizationId,
          document_number: input.document_number,
          title: input.title,
          description: input.description || null,
          document_type: input.document_type,
          program_type: input.program_type,
          version: input.version || '1.0',
          revision_number: 1,
          status: input.status || 'active',
          content: input.content || {},
          sections: input.sections || [],
          applicable_levels: input.applicable_levels || [],
          tags: input.tags || [],
          keywords: input.keywords || [],
          effective_date: input.effective_date || null,
          expiration_date: input.expiration_date || null,
          last_reviewed: input.last_reviewed || null,
          next_review: input.next_review || null,
          author: input.author || employee?.first_name + ' ' + employee?.last_name,
          author_id: input.author_id || employee?.id,
          owner: input.owner || null,
          owner_id: input.owner_id || null,
          approver: input.approver || null,
          approver_id: input.approver_id || null,
          access_level: input.access_level || 'internal',
          requires_acknowledgment: input.requires_acknowledgment || false,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[SafetyDocs] Error creating document:', error);
        throw error;
      }

      console.log('[SafetyDocs] Document created:', data.id);
      return data as SafetyProgramDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateSafetyDocument() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSafetyDocumentInput & { id: string }) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('[SafetyDocs] Updating document:', id);

      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.sections !== undefined) updateData.sections = input.sections;
      if (input.applicable_levels !== undefined) updateData.applicable_levels = input.applicable_levels;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.keywords !== undefined) updateData.keywords = input.keywords;
      if (input.effective_date !== undefined) updateData.effective_date = input.effective_date;
      if (input.expiration_date !== undefined) updateData.expiration_date = input.expiration_date;
      if (input.last_reviewed !== undefined) updateData.last_reviewed = input.last_reviewed;
      if (input.next_review !== undefined) updateData.next_review = input.next_review;
      if (input.author !== undefined) updateData.author = input.author;
      if (input.owner !== undefined) updateData.owner = input.owner;
      if (input.approver !== undefined) updateData.approver = input.approver;
      if (input.access_level !== undefined) updateData.access_level = input.access_level;
      if (input.requires_acknowledgment !== undefined) updateData.requires_acknowledgment = input.requires_acknowledgment;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const { data, error } = await supabase
        .from('safety_program_documents')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('[SafetyDocs] Error updating document:', error);
        throw error;
      }

      console.log('[SafetyDocs] Document updated:', data.id);
      return data as SafetyProgramDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', data.id] });
    },
  });
}

export function useDeleteSafetyDocument() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('[SafetyDocs] Deleting document:', documentId);

      const { error } = await supabase
        .from('safety_program_documents')
        .delete()
        .eq('id', documentId)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('[SafetyDocs] Error deleting document:', error);
        throw error;
      }

      console.log('[SafetyDocs] Document deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useCreateNewVersion() {
  const queryClient = useQueryClient();
  const { organizationId, employee } = useAuth();

  return useMutation({
    mutationFn: async ({
      documentId,
      changeSummary,
      newContent,
      newSections,
    }: {
      documentId: string;
      changeSummary: string;
      newContent?: Record<string, unknown>;
      newSections?: SafetyDocumentSection[];
    }) => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('[SafetyDocs] Creating new version for document:', documentId);

      // Get current document
      const { data: currentDoc, error: fetchError } = await supabase
        .from('safety_program_documents')
        .select('*')
        .eq('id', documentId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError) throw fetchError;

      const doc = currentDoc as SafetyProgramDocument;

      // Save current version to history
      const { error: versionError } = await supabase
        .from('safety_program_document_versions')
        .insert({
          organization_id: organizationId,
          document_id: documentId,
          version: doc.version,
          revision_number: doc.revision_number,
          content: doc.content,
          sections: doc.sections,
          change_summary: changeSummary,
          changed_by: employee?.first_name + ' ' + employee?.last_name,
          changed_by_id: employee?.id,
          effective_date: doc.effective_date,
        });

      if (versionError) {
        console.error('[SafetyDocs] Error saving version history:', versionError);
        throw versionError;
      }

      // Increment version
      const currentVersion = parseFloat(doc.version) || 1.0;
      const newVersion = (currentVersion + 0.1).toFixed(1);

      // Update document with new version
      const { data: updatedDoc, error: updateError } = await supabase
        .from('safety_program_documents')
        .update({
          version: newVersion,
          revision_number: doc.revision_number + 1,
          content: newContent || doc.content,
          sections: newSections || doc.sections,
          last_reviewed: new Date().toISOString().split('T')[0],
        })
        .eq('id', documentId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('[SafetyDocs] New version created:', newVersion);
      return updatedDoc as SafetyProgramDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', data.id] });
    },
  });
}

export function useSeedLOTODocuments() {
  const queryClient = useQueryClient();
  const { organizationId, employee } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No organization ID');

      console.log('[SafetyDocs] Seeding LOTO documents...');

      // Check if documents already exist
      const { data: existing } = await supabase
        .from('safety_program_documents')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('program_type', 'loto')
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('[SafetyDocs] LOTO documents already exist, skipping seed');
        return;
      }

      const authorName = employee ? `${employee.first_name} ${employee.last_name}` : 'System';

      const lotoDocuments: CreateSafetyDocumentInput[] = [
        {
          document_number: 'LOTO-POL-001',
          title: 'LOTO Program Policy',
          description: 'Master policy document for the Lockout/Tagout program covering scope, responsibilities, and requirements',
          document_type: 'policy',
          program_type: 'loto',
          version: '3.0',
          status: 'active',
          applicable_levels: [0, 1, 2, 3, 4, 5],
          tags: ['loto', 'policy', 'safety', 'master'],
          effective_date: '2024-01-01',
          last_reviewed: '2024-12-01',
          next_review: '2025-06-01',
          author: authorName,
          author_id: employee?.id,
          approver: 'Safety Director',
          sections: [
            {
              id: 'purpose',
              title: '1. Purpose',
              content: 'This Lockout/Tagout (LOTO) Program establishes the minimum requirements for the control of hazardous energy during servicing and maintenance of machines and equipment. This program is designed to prevent unexpected energization, start-up, or release of stored energy that could cause injury to employees.',
              order: 1,
            },
            {
              id: 'scope',
              title: '2. Scope',
              content: 'This program applies to all employees who service or maintain machines and equipment where the unexpected energization, start-up, or release of stored energy could cause injury. This includes, but is not limited to: electrical, mechanical, hydraulic, pneumatic, chemical, thermal, gravitational, and other forms of hazardous energy.',
              order: 2,
            },
            {
              id: 'definitions',
              title: '3. Definitions',
              content: '',
              subsections: [
                { title: 'Affected Employee', content: 'An employee whose job requires them to operate or use a machine or equipment on which servicing or maintenance is being performed under lockout/tagout, or whose job requires them to work in an area in which such servicing or maintenance is being performed.' },
                { title: 'Authorized Employee', content: 'A person who locks out or tags out machines or equipment in order to perform servicing or maintenance on that machine or equipment. An authorized employee must be trained and authorized to perform LOTO procedures.' },
                { title: 'Energy Isolating Device', content: 'A mechanical device that physically prevents the transmission or release of energy, including but not limited to: manually operated electrical circuit breakers, disconnect switches, line valves, and blocks.' },
                { title: 'Lockout', content: 'The placement of a lockout device on an energy isolating device, ensuring that the energy isolating device and the equipment being controlled cannot be operated until the lockout device is removed.' },
                { title: 'Tagout', content: 'The placement of a tagout device on an energy isolating device to indicate that the energy isolating device and the equipment being controlled may not be operated until the tagout device is removed.' },
                { title: 'LOTO Level', content: 'A classification (0-5) that indicates the energy hazard level and procedure complexity required for a specific lockout/tagout situation.' },
              ],
              order: 3,
            },
            {
              id: 'responsibilities',
              title: '4. Responsibilities',
              content: '',
              subsections: [
                { title: 'Management', content: 'Ensure adequate resources for LOTO program implementation, enforce compliance with LOTO procedures, ensure proper training is provided, and conduct periodic program audits.' },
                { title: 'Safety Department', content: 'Develop and maintain LOTO procedures, conduct training, perform periodic inspections, investigate incidents, and maintain program documentation.' },
                { title: 'Supervisors', content: 'Ensure employees are trained before performing LOTO, verify LOTO procedures are followed, approve LOTO permits as required, and coordinate group lockout activities.' },
                { title: 'Authorized Employees', content: 'Apply personal locks and tags, follow established procedures, verify zero energy state, coordinate with affected employees, and maintain control of personal lock keys.' },
                { title: 'Affected Employees', content: 'Recognize when LOTO is in effect, not attempt to operate locked/tagged equipment, notify authorized employees of work status, and report any concerns or violations.' },
              ],
              order: 4,
            },
            {
              id: 'loto-levels',
              title: '5. LOTO Levels (0-5)',
              content: 'All maintenance and servicing activities must be assessed for LOTO requirements and assigned an appropriate level based on energy hazard and procedure complexity. Refer to the LOTO Level One Point Lessons (OPLs) for detailed requirements at each level.',
              subsections: [
                { title: 'Level 0 - Zero Energy', content: 'Equipment with no energy sources. No lockout required. Visual verification only.' },
                { title: 'Level 1 - Minimal Energy', content: 'Single energy source, single person lockout. Standard personal lockout procedures apply.' },
                { title: 'Level 2 - Low Energy', content: 'Multiple energy sources requiring multiple isolation points. Energy source inventory required.' },
                { title: 'Level 3 - Moderate Energy', content: 'Group lockout required with multiple workers. Designated LOTO coordinator assigned.' },
                { title: 'Level 4 - High Energy', content: 'Extended work spanning multiple shifts. Formal shift transfer procedures required.' },
                { title: 'Level 5 - Extreme/Complex', content: 'Contractor involvement, multiple trades, high-hazard work. Maximum documentation and oversight required.' },
              ],
              order: 5,
            },
            {
              id: 'procedures',
              title: '6. General LOTO Procedures',
              content: '',
              subsections: [
                { title: 'Preparation', content: 'Identify all energy sources, notify affected employees, gather required locks/tags/devices, review equipment-specific procedures.' },
                { title: 'Shutdown', content: 'Shut down equipment using normal operating procedures. Do not use emergency stops unless necessary.' },
                { title: 'Isolation', content: 'Locate and operate all energy isolating devices to isolate equipment from energy sources.' },
                { title: 'Lockout/Tagout', content: 'Apply locks and tags to each energy isolating device. Each authorized employee applies their own lock.' },
                { title: 'Stored Energy', content: 'Release, restrain, or otherwise render safe all potentially hazardous stored or residual energy.' },
                { title: 'Verification', content: 'Verify isolation by attempting to operate equipment controls. Ensure all personnel are clear before testing.' },
                { title: 'Release from LOTO', content: 'Ensure work is complete, remove tools, reinstall guards, verify personnel are clear, remove locks in reverse order, notify affected employees.' },
              ],
              order: 6,
            },
            {
              id: 'training',
              title: '7. Training Requirements',
              content: 'All employees must receive LOTO training appropriate to their role and authorization level. Training must be conducted before initial assignment and whenever there is a change in job assignments, machines, equipment, or processes that present new hazards. Retraining is required whenever periodic inspection reveals inadequacies.',
              subsections: [
                { title: 'Authorized Employee Training', content: 'Recognition of hazardous energy sources, type and magnitude of energy, methods and means of energy isolation, purpose and use of LOTO procedures.' },
                { title: 'Affected Employee Training', content: 'Purpose and use of LOTO procedures, prohibition against attempting to restart locked/tagged equipment.' },
                { title: 'Annual Refresher', content: 'All authorized and affected employees must complete annual LOTO refresher training.' },
              ],
              order: 7,
            },
            {
              id: 'inspections',
              title: '8. Periodic Inspections',
              content: 'Periodic inspections of LOTO procedures shall be conducted at least annually for each authorized employee. Inspections shall be performed by an authorized employee other than the one using the procedure and shall include a review between the inspector and authorized employee.',
              order: 8,
            },
            {
              id: 'emergency-removal',
              title: '9. Emergency Lock Removal',
              content: 'Locks may only be removed by the employee who applied them, except in emergency situations where the employee is unavailable. Emergency removal requires: verification that the authorized employee is not at the facility, all reasonable efforts to contact the employee, ensuring safe removal of the lock, and notification to the employee that their lock was removed before they return to work.',
              order: 9,
            },
            {
              id: 'documentation',
              title: '10. Documentation',
              content: 'All LOTO activities must be documented as required by the assigned LOTO level. Documentation includes LOTO permits, energy source inventories, shift transfer logs, inspection records, and training records. Records must be maintained for a minimum of three years.',
              order: 10,
            },
          ],
        },
        {
          document_number: 'LOTO-PROC-001',
          title: 'General LOTO Procedures',
          description: 'Step-by-step procedures for applying and removing locks and tags',
          document_type: 'procedure',
          program_type: 'loto',
          version: '2.1',
          status: 'active',
          applicable_levels: [1, 2, 3, 4, 5],
          tags: ['loto', 'procedure', 'general'],
          effective_date: '2024-01-01',
          author: authorName,
          sections: [
            {
              id: 'preparation',
              title: '1. Preparation',
              content: 'Before beginning any LOTO procedure:\n\n1. Identify all energy sources for the equipment\n2. Notify all affected employees of the planned shutdown\n3. Gather required locks, tags, and devices\n4. Review equipment-specific procedures if available\n5. Determine appropriate LOTO level based on hazards',
              order: 1,
            },
            {
              id: 'shutdown',
              title: '2. Equipment Shutdown',
              content: 'Follow normal shutdown procedures:\n\n1. Notify operators and affected personnel\n2. Stop equipment using normal operating controls\n3. Allow equipment to come to complete stop\n4. Do NOT use emergency stops unless necessary',
              order: 2,
            },
            {
              id: 'isolation',
              title: '3. Energy Isolation',
              content: 'Isolate all energy sources:\n\n1. Locate all energy isolating devices\n2. Operate each device to the off/safe position\n3. Verify visual indicators show isolation complete\n4. Document all isolation points',
              order: 3,
            },
            {
              id: 'lockout',
              title: '4. Lockout Application',
              content: 'Apply locks and tags:\n\n1. Apply lock to each energy isolating device\n2. Attach danger tag with your name and date\n3. Each worker applies their OWN lock\n4. Never use another person\'s lock',
              order: 4,
            },
            {
              id: 'stored-energy',
              title: '5. Stored Energy Release',
              content: 'Address all stored energy:\n\n1. Bleed pressure from pneumatic/hydraulic lines\n2. Block or lower suspended loads\n3. Release spring tension where applicable\n4. Allow capacitors to discharge\n5. Verify stored energy is released',
              order: 5,
            },
            {
              id: 'verification',
              title: '6. Zero Energy Verification',
              content: 'Verify equipment is at zero energy:\n\n1. Ensure all personnel are clear\n2. Attempt to start equipment using normal controls\n3. Check for any residual energy\n4. Return controls to off position\n5. Document verification complete',
              order: 6,
            },
            {
              id: 'release',
              title: '7. Release from LOTO',
              content: 'When work is complete:\n\n1. Verify all tools are removed\n2. Reinstall all guards and safety devices\n3. Verify all personnel are clear\n4. Remove YOUR lock (only)\n5. Notify affected employees before restart',
              order: 7,
            },
          ],
        },
        {
          document_number: 'LOTO-PROC-002',
          title: 'Group Lockout Procedures',
          description: 'Procedures for group lockout situations with multiple authorized employees',
          document_type: 'procedure',
          program_type: 'loto',
          version: '1.5',
          status: 'active',
          applicable_levels: [3, 4, 5],
          tags: ['loto', 'procedure', 'group'],
          effective_date: '2024-01-01',
          author: authorName,
          sections: [
            {
              id: 'overview',
              title: '1. Overview',
              content: 'Group lockout procedures apply when multiple workers must perform maintenance simultaneously. A designated coordinator manages the lockout process.',
              order: 1,
            },
            {
              id: 'coordinator',
              title: '2. Coordinator Responsibilities',
              content: '1. Complete energy source inventory\n2. Perform initial lockout and verification\n3. Apply coordinator lock to group lockbox\n4. Manage worker sign-in/sign-out\n5. Verify all workers removed before final release',
              order: 2,
            },
            {
              id: 'worker-procedure',
              title: '3. Worker Procedure',
              content: '1. Attend pre-job safety briefing\n2. Sign the lockout log\n3. Apply personal lock to group lockbox\n4. Verify zero energy before starting work\n5. Remove personal lock only when YOUR work is complete\n6. Sign out on the lockout log',
              order: 3,
            },
          ],
        },
        {
          document_number: 'LOTO-PROC-003',
          title: 'Shift Change Lockout Procedures',
          description: 'Procedures for transferring lockout protection between shifts',
          document_type: 'procedure',
          program_type: 'loto',
          version: '1.2',
          status: 'active',
          applicable_levels: [4, 5],
          tags: ['loto', 'procedure', 'shift'],
          effective_date: '2024-01-01',
          author: authorName,
          sections: [
            {
              id: 'overview',
              title: '1. Overview',
              content: 'Shift change procedures ensure continuous lockout protection during extended work spanning multiple shifts.',
              order: 1,
            },
            {
              id: 'end-shift',
              title: '2. End of Shift Transfer',
              content: '1. Complete shift transfer form\n2. Outgoing workers remove personal locks\n3. Shift Supervisor lock remains in place\n4. Hand off documentation to incoming shift',
              order: 2,
            },
            {
              id: 'start-shift',
              title: '3. Start of Shift Procedures',
              content: '1. Conduct pre-job safety briefing\n2. Incoming workers apply personal locks\n3. RE-VERIFY zero energy state\n4. Document verification on permit\n5. Continue work',
              order: 3,
            },
          ],
        },
        {
          document_number: 'LOTO-PROC-004',
          title: 'Contractor LOTO Requirements',
          description: 'Requirements and procedures for contractors performing work requiring LOTO',
          document_type: 'procedure',
          program_type: 'loto',
          version: '2.0',
          status: 'active',
          applicable_levels: [3, 4, 5],
          tags: ['loto', 'procedure', 'contractor'],
          effective_date: '2024-01-01',
          author: authorName,
          sections: [
            {
              id: 'requirements',
              title: '1. Contractor Requirements',
              content: '1. All contractors must be trained on site-specific LOTO procedures\n2. Contractor safety representative must be designated\n3. Daily safety coordination meetings required\n4. Multi-employer lock coordination procedures apply',
              order: 1,
            },
            {
              id: 'coordination',
              title: '2. Lockout Coordination',
              content: '1. Host employer coordinates with contractor\n2. Both parties apply locks to group lockbox\n3. Communication protocols established\n4. Emergency contact procedures documented',
              order: 2,
            },
          ],
        },
        {
          document_number: 'LOTO-PROC-005',
          title: 'Emergency Lock Removal Procedures',
          description: 'Procedures for emergency removal of locks when the authorized employee is unavailable',
          document_type: 'procedure',
          program_type: 'loto',
          version: '1.0',
          status: 'active',
          applicable_levels: [1, 2, 3, 4, 5],
          tags: ['loto', 'procedure', 'emergency'],
          effective_date: '2024-01-01',
          author: authorName,
          sections: [
            {
              id: 'when-allowed',
              title: '1. When Emergency Removal is Allowed',
              content: 'Emergency lock removal may only occur when:\n1. The employee who applied the lock is unavailable\n2. All reasonable efforts to contact the employee have failed\n3. Production or safety emergency exists',
              order: 1,
            },
            {
              id: 'procedure',
              title: '2. Emergency Removal Procedure',
              content: '1. Verify employee is not at the facility\n2. Attempt to contact employee by all available means\n3. Document all contact attempts\n4. Plant Manager authorization required\n5. Safety representative must be present\n6. Verify equipment is safe before lock removal\n7. Complete emergency removal documentation\n8. Notify employee before their next shift',
              order: 2,
            },
            {
              id: 'documentation',
              title: '3. Required Documentation',
              content: '1. Employee name and lock number\n2. Reason for emergency removal\n3. Contact attempt log\n4. Authorizing manager signature\n5. Safety representative signature\n6. Employee notification record',
              order: 3,
            },
          ],
        },
      ];

      for (const doc of lotoDocuments) {
        try {
          // Check if this specific document already exists
          const { data: existingDoc } = await supabase
            .from('safety_program_documents')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('document_number', doc.document_number)
            .maybeSingle();

          if (existingDoc) {
            console.log('[SafetyDocs] Document already exists, skipping:', doc.title);
            continue;
          }

          const { error } = await supabase
            .from('safety_program_documents')
            .insert({
              organization_id: organizationId,
              document_number: doc.document_number,
              title: doc.title,
              description: doc.description || null,
              document_type: doc.document_type,
              program_type: doc.program_type,
              version: doc.version || '1.0',
              revision_number: 1,
              status: doc.status || 'active',
              content: doc.content || {},
              sections: JSON.parse(JSON.stringify(doc.sections || [])),
              applicable_levels: doc.applicable_levels || [],
              tags: doc.tags || [],
              keywords: doc.keywords || [],
              effective_date: doc.effective_date || null,
              last_reviewed: doc.last_reviewed || null,
              next_review: doc.next_review || null,
              author: doc.author || authorName,
              author_id: employee?.id || null,
              approver: doc.approver || null,
              access_level: doc.access_level || 'internal',
              requires_acknowledgment: doc.requires_acknowledgment || false,
            });

          if (error) {
            console.error('[SafetyDocs] Error seeding document:', doc.title, 'Error:', error.message || JSON.stringify(error));
          } else {
            console.log('[SafetyDocs] Successfully seeded document:', doc.title);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
          console.error('[SafetyDocs] Exception seeding document:', doc.title, 'Error:', errorMessage);
        }
      }

      console.log('[SafetyDocs] LOTO documents seeded successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
