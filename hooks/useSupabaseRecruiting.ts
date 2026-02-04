import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type JobStatus = 'draft' | 'open' | 'on_hold' | 'filled' | 'cancelled';
export type ApplicationStatus = 'new' | 'screening' | 'phone_screen' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewType = 'phone' | 'video' | 'in_person' | 'panel' | 'technical';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
export type EmploymentType = 'exempt' | 'non_exempt';
export type CandidateSource = 'job_board' | 'referral' | 'career_site' | 'linkedin' | 'agency' | 'direct' | 'other';

export interface JobRequisition {
  id: string;
  organization_id: string;
  requisition_number: string;
  job_title: string;
  department: string;
  location: string | null;
  job_type: JobType;
  employment_type: EmploymentType;
  open_positions: number;
  filled_positions: number;
  status: JobStatus;
  hiring_manager: string | null;
  hiring_manager_id: string | null;
  recruiter: string | null;
  recruiter_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  salary_min: number | null;
  salary_max: number | null;
  job_description: string | null;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  posted_date: string | null;
  target_start_date: string | null;
  closing_date: string | null;
  is_remote: boolean;
  experience_years: number | null;
  education_required: string | null;
  skills_required: string[];
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateEducation {
  degree: string;
  field: string;
  institution: string;
  graduationYear: number;
}

export interface Candidate {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  current_company: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  resume_url: string | null;
  cover_letter_url: string | null;
  years_of_experience: number;
  education: CandidateEducation[];
  skills: string[];
  source: CandidateSource;
  referred_by: string | null;
  desired_salary: number | null;
  available_start_date: string | null;
  is_willing_to_relocate: boolean;
  tags: string[];
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  organization_id: string;
  candidate_id: string;
  job_requisition_id: string;
  status: ApplicationStatus;
  applied_date: string;
  current_stage: string | null;
  overall_score: number | null;
  screening_score: number | null;
  interview_score: number | null;
  technical_score: number | null;
  culture_fit_score: number | null;
  assigned_recruiter: string | null;
  assigned_recruiter_id: string | null;
  last_activity_date: string;
  disqualification_reason: string | null;
  withdrawal_reason: string | null;
  is_starred: boolean;
  rejection_email_sent: boolean;
  source_detail: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewFeedback {
  interviewerId: string;
  interviewerName: string;
  rating: number;
  technicalSkills?: number;
  communication?: number;
  cultureFit?: number;
  problemSolving?: number;
  enthusiasm?: number;
  comments: string;
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire';
  submittedAt: string;
}

export interface Interview {
  id: string;
  organization_id: string;
  application_id: string;
  candidate_id: string;
  job_requisition_id: string;
  interview_type: InterviewType;
  status: InterviewStatus;
  scheduled_date: string;
  duration: number;
  location: string | null;
  meeting_link: string | null;
  interviewers: string[];
  panel_members: string[];
  scheduled_by: string;
  scheduled_by_id: string | null;
  round: number;
  notes: string | null;
  feedback: InterviewFeedback[];
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobOffer {
  id: string;
  organization_id: string;
  application_id: string;
  candidate_id: string;
  job_requisition_id: string;
  status: OfferStatus;
  job_title: string;
  department: string;
  start_date: string;
  salary: number;
  bonus: number | null;
  equity: string | null;
  benefits: string[];
  offer_letter_url: string | null;
  sent_date: string | null;
  expiration_date: string | null;
  accepted_date: string | null;
  declined_date: string | null;
  decline_reason: string | null;
  signed_offer_url: string | null;
  prepared_by: string;
  prepared_by_id: string | null;
  approved_by: string | null;
  approved_by_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateNote {
  id: string;
  organization_id: string;
  candidate_id: string;
  application_id: string | null;
  content: string;
  created_by: string;
  created_by_id: string | null;
  is_private: boolean;
  note_type: 'general' | 'interview' | 'screening' | 'reference' | 'background_check';
  created_at: string;
}

type CreateJobRequisitionInput = Omit<JobRequisition, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateCandidateInput = Omit<Candidate, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateApplicationInput = Omit<Application, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateInterviewInput = Omit<Interview, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateOfferInput = Omit<JobOffer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateNoteInput = Omit<CandidateNote, 'id' | 'organization_id' | 'created_at'>;

export function useSupabaseRecruiting() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Job Requisitions
  const jobRequisitionsQuery = useQuery({
    queryKey: ['recruiting', 'job-requisitions', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecruiting] Fetching job requisitions');

      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as JobRequisition[];
    },
    enabled: !!organizationId,
  });

  // Candidates
  const candidatesQuery = useQuery({
    queryKey: ['recruiting', 'candidates', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecruiting] Fetching candidates');

      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Candidate[];
    },
    enabled: !!organizationId,
  });

  // Applications
  const applicationsQuery = useQuery({
    queryKey: ['recruiting', 'applications', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecruiting] Fetching applications');

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('organization_id', organizationId)
        .order('applied_date', { ascending: false });

      if (error) throw error;
      return (data || []) as Application[];
    },
    enabled: !!organizationId,
  });

  // Interviews
  const interviewsQuery = useQuery({
    queryKey: ['recruiting', 'interviews', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecruiting] Fetching interviews');

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('organization_id', organizationId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      return (data || []) as Interview[];
    },
    enabled: !!organizationId,
  });

  // Job Offers
  const offersQuery = useQuery({
    queryKey: ['recruiting', 'offers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecruiting] Fetching job offers');

      const { data, error } = await supabase
        .from('job_offers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as JobOffer[];
    },
    enabled: !!organizationId,
  });

  // Candidate Notes
  const notesQuery = useQuery({
    queryKey: ['recruiting', 'notes', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabaseRecruiting] Fetching candidate notes');

      const { data, error } = await supabase
        .from('candidate_notes')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CandidateNote[];
    },
    enabled: !!organizationId,
  });

  // Mutations - Job Requisitions
  const createJobRequisitionMutation = useMutation({
    mutationFn: async (input: CreateJobRequisitionInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecruiting] Creating job requisition:', input);

      const { data, error } = await supabase
        .from('job_requisitions')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as JobRequisition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'job-requisitions'] });
    },
  });

  const updateJobRequisitionMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobRequisition> & { id: string }) => {
      console.log('[useSupabaseRecruiting] Updating job requisition:', id);

      const { data, error } = await supabase
        .from('job_requisitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as JobRequisition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'job-requisitions'] });
    },
  });

  const deleteJobRequisitionMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseRecruiting] Deleting job requisition:', id);

      const { error } = await supabase
        .from('job_requisitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'job-requisitions'] });
    },
  });

  // Mutations - Candidates
  const createCandidateMutation = useMutation({
    mutationFn: async (input: CreateCandidateInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecruiting] Creating candidate:', input);

      const { data, error } = await supabase
        .from('candidates')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as Candidate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'candidates'] });
    },
  });

  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidate> & { id: string }) => {
      console.log('[useSupabaseRecruiting] Updating candidate:', id);

      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Candidate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'candidates'] });
    },
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseRecruiting] Deleting candidate:', id);

      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'candidates'] });
    },
  });

  // Mutations - Applications
  const createApplicationMutation = useMutation({
    mutationFn: async (input: CreateApplicationInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecruiting] Creating application:', input);

      const { data, error } = await supabase
        .from('applications')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as Application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'applications'] });
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Application> & { id: string }) => {
      console.log('[useSupabaseRecruiting] Updating application:', id);

      const { data, error } = await supabase
        .from('applications')
        .update({ ...updates, last_activity_date: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'applications'] });
    },
  });

  const deleteApplicationMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabaseRecruiting] Deleting application:', id);

      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'applications'] });
    },
  });

  // Mutations - Interviews
  const createInterviewMutation = useMutation({
    mutationFn: async (input: CreateInterviewInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecruiting] Creating interview:', input);

      const { data, error } = await supabase
        .from('interviews')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as Interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'interviews'] });
    },
  });

  const updateInterviewMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Interview> & { id: string }) => {
      console.log('[useSupabaseRecruiting] Updating interview:', id);

      const { data, error } = await supabase
        .from('interviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'interviews'] });
    },
  });

  const addInterviewFeedbackMutation = useMutation({
    mutationFn: async ({ interviewId, feedback }: { interviewId: string; feedback: InterviewFeedback }) => {
      console.log('[useSupabaseRecruiting] Adding interview feedback:', interviewId);

      const { data: existing } = await supabase
        .from('interviews')
        .select('feedback')
        .eq('id', interviewId)
        .single();

      const existingFeedback = (existing?.feedback || []) as InterviewFeedback[];

      const { data, error } = await supabase
        .from('interviews')
        .update({ feedback: [...existingFeedback, feedback] })
        .eq('id', interviewId)
        .select()
        .single();

      if (error) throw error;
      return data as Interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'interviews'] });
    },
  });

  const cancelInterviewMutation = useMutation({
    mutationFn: async ({ interviewId, reason }: { interviewId: string; reason: string }) => {
      console.log('[useSupabaseRecruiting] Cancelling interview:', interviewId);

      const { data, error } = await supabase
        .from('interviews')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq('id', interviewId)
        .select()
        .single();

      if (error) throw error;
      return data as Interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'interviews'] });
    },
  });

  // Mutations - Offers
  const createOfferMutation = useMutation({
    mutationFn: async (input: CreateOfferInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecruiting] Creating offer:', input);

      const { data, error } = await supabase
        .from('job_offers')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as JobOffer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'offers'] });
    },
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobOffer> & { id: string }) => {
      console.log('[useSupabaseRecruiting] Updating offer:', id);

      const { data, error } = await supabase
        .from('job_offers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as JobOffer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'offers'] });
    },
  });

  const sendOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      console.log('[useSupabaseRecruiting] Sending offer:', offerId);

      const { data, error } = await supabase
        .from('job_offers')
        .update({
          status: 'sent',
          sent_date: new Date().toISOString(),
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) throw error;
      return data as JobOffer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'offers'] });
    },
  });

  const acceptOfferMutation = useMutation({
    mutationFn: async (offerId: string) => {
      console.log('[useSupabaseRecruiting] Accepting offer:', offerId);

      const { data, error } = await supabase
        .from('job_offers')
        .update({
          status: 'accepted',
          accepted_date: new Date().toISOString(),
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) throw error;
      return data as JobOffer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'offers'] });
    },
  });

  const declineOfferMutation = useMutation({
    mutationFn: async ({ offerId, reason }: { offerId: string; reason: string }) => {
      console.log('[useSupabaseRecruiting] Declining offer:', offerId);

      const { data, error } = await supabase
        .from('job_offers')
        .update({
          status: 'declined',
          declined_date: new Date().toISOString(),
          decline_reason: reason,
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) throw error;
      return data as JobOffer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'offers'] });
    },
  });

  // Mutations - Notes
  const createNoteMutation = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabaseRecruiting] Creating note:', input);

      const { data, error } = await supabase
        .from('candidate_notes')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as CandidateNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      console.log('[useSupabaseRecruiting] Deleting note:', noteId);

      const { error } = await supabase
        .from('candidate_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiting', 'notes'] });
    },
  });

  // Helper functions
  const getApplicationsForJob = (jobId: string) => {
    return applicationsQuery.data?.filter(app => app.job_requisition_id === jobId) || [];
  };

  const getInterviewsForApplication = (applicationId: string) => {
    return interviewsQuery.data?.filter(int => int.application_id === applicationId) || [];
  };

  const getNotesForCandidate = (candidateId: string) => {
    return notesQuery.data?.filter(note => note.candidate_id === candidateId) || [];
  };

  return {
    jobRequisitions: jobRequisitionsQuery.data || [],
    candidates: candidatesQuery.data || [],
    applications: applicationsQuery.data || [],
    interviews: interviewsQuery.data || [],
    offers: offersQuery.data || [],
    notes: notesQuery.data || [],

    isLoading: jobRequisitionsQuery.isLoading || candidatesQuery.isLoading || applicationsQuery.isLoading,

    // Job Requisitions
    createJobRequisition: createJobRequisitionMutation.mutateAsync,
    updateJobRequisition: updateJobRequisitionMutation.mutateAsync,
    deleteJobRequisition: deleteJobRequisitionMutation.mutateAsync,

    // Candidates
    createCandidate: createCandidateMutation.mutateAsync,
    updateCandidate: updateCandidateMutation.mutateAsync,
    deleteCandidate: deleteCandidateMutation.mutateAsync,

    // Applications
    createApplication: createApplicationMutation.mutateAsync,
    updateApplication: updateApplicationMutation.mutateAsync,
    deleteApplication: deleteApplicationMutation.mutateAsync,

    // Interviews
    createInterview: createInterviewMutation.mutateAsync,
    updateInterview: updateInterviewMutation.mutateAsync,
    addInterviewFeedback: addInterviewFeedbackMutation.mutateAsync,
    cancelInterview: cancelInterviewMutation.mutateAsync,

    // Offers
    createOffer: createOfferMutation.mutateAsync,
    updateOffer: updateOfferMutation.mutateAsync,
    sendOffer: sendOfferMutation.mutateAsync,
    acceptOffer: acceptOfferMutation.mutateAsync,
    declineOffer: declineOfferMutation.mutateAsync,

    // Notes
    createNote: createNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutateAsync,

    // Helpers
    getApplicationsForJob,
    getInterviewsForApplication,
    getNotesForCandidate,

    refetch: () => {
      jobRequisitionsQuery.refetch();
      candidatesQuery.refetch();
      applicationsQuery.refetch();
      interviewsQuery.refetch();
      offersQuery.refetch();
      notesQuery.refetch();
    },
  };
}
