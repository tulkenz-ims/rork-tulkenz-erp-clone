import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrganization } from '@/contexts/OrganizationContext';

export type ReviewCycle = 'annual' | 'semi-annual' | 'quarterly' | 'probationary';
export type ReviewStatus = 'not-started' | 'in-progress' | 'pending-review' | 'completed' | 'overdue';
export type GoalStatus = 'not-started' | 'on-track' | 'at-risk' | 'completed' | 'cancelled';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'pending' | 'in-progress' | 'completed';
export type TalentCategory = 'high-performer' | 'solid-performer' | 'needs-improvement' | 'critical-talent';
export type FlightRisk = 'low' | 'medium' | 'high';
export type SuccessionReadiness = 'ready-now' | 'ready-1-year' | 'ready-2-years' | 'needs-development';

export interface ReviewCompetency {
  id: string;
  name: string;
  category: string;
  rating: number;
  comments?: string;
}

export interface ReviewGoal {
  id: string;
  description: string;
  achieved: boolean;
  rating?: number;
  comments?: string;
}

export interface PerformanceReview {
  id: string;
  organization_id: string;
  employee_id: string;
  reviewer_id: string;
  review_cycle: ReviewCycle;
  review_period: string;
  status: ReviewStatus;
  due_date: string;
  completed_date: string | null;
  overall_rating: number | null;
  competencies: ReviewCompetency[];
  goals: ReviewGoal[];
  strengths: string[];
  areas_for_improvement: string[];
  development_plan: string[];
  comments: string | null;
  manager_comments: string | null;
  employee_comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  id: string;
  description: string;
  targetDate: string;
  completed: boolean;
  completedDate?: string;
}

export interface EmployeeGoal {
  id: string;
  organization_id: string;
  employee_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  start_date: string;
  target_date: string;
  completed_date: string | null;
  milestones: GoalMilestone[];
  aligned_to: string | null;
  metrics: string[];
  created_by: string;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackRating {
  competency: string;
  rating: number;
  comments?: string;
}

export interface FeedbackResponse {
  id: string;
  respondentId: string;
  respondentType: 'peer' | 'manager' | 'direct-report' | 'self';
  submittedDate?: string;
  status: 'pending' | 'in-progress' | 'submitted';
  ratings: FeedbackRating[];
  strengths: string[];
  developmentAreas: string[];
  comments?: string;
  anonymous: boolean;
}

export interface Feedback360 {
  id: string;
  organization_id: string;
  employee_id: string;
  review_cycle: string;
  requested_by: string;
  requested_by_id: string | null;
  requested_date: string;
  due_date: string;
  status: FeedbackStatus;
  responses: FeedbackResponse[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Successor {
  id: string;
  employeeId: string;
  readiness: SuccessionReadiness;
  developmentNeeds: string[];
  strengths: string[];
  developmentPlan?: string;
  targetDate?: string;
}

export interface SuccessionPlan {
  id: string;
  organization_id: string;
  position_id: string;
  position_title: string;
  department: string;
  incumbent_id: string | null;
  critical_role: boolean;
  retirement_risk: boolean;
  successors: Successor[];
  competencies: string[];
  development_actions: string[];
  last_reviewed: string | null;
  next_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface TalentProfile {
  id: string;
  organization_id: string;
  employee_id: string;
  category: TalentCategory;
  potential_rating: number | null;
  performance_rating: number | null;
  flight_risk: FlightRisk;
  key_strengths: string[];
  development_areas: string[];
  career_aspirations: string[];
  ready_for_promotion: boolean;
  successor_for: string[];
  last_review_date: string | null;
  created_at: string;
  updated_at: string;
}

type CreateReviewInput = Omit<PerformanceReview, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateGoalInput = Omit<EmployeeGoal, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateFeedback360Input = Omit<Feedback360, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateSuccessionPlanInput = Omit<SuccessionPlan, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;
type CreateTalentProfileInput = Omit<TalentProfile, 'id' | 'organization_id' | 'created_at' | 'updated_at'>;

export function useSupabasePerformance() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  // Performance Reviews
  const reviewsQuery = useQuery({
    queryKey: ['performance', 'reviews', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePerformance] Fetching performance reviews');

      const { data, error } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return (data || []) as PerformanceReview[];
    },
    enabled: !!organizationId,
  });

  // Employee Goals
  const goalsQuery = useQuery({
    queryKey: ['performance', 'goals', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePerformance] Fetching employee goals');

      const { data, error } = await supabase
        .from('employee_goals')
        .select('*')
        .eq('organization_id', organizationId)
        .order('target_date', { ascending: true });

      if (error) throw error;
      return (data || []) as EmployeeGoal[];
    },
    enabled: !!organizationId,
  });

  // 360 Feedback
  const feedback360Query = useQuery({
    queryKey: ['performance', 'feedback360', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePerformance] Fetching 360 feedback');

      const { data, error } = await supabase
        .from('feedback_360')
        .select('*')
        .eq('organization_id', organizationId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return (data || []) as Feedback360[];
    },
    enabled: !!organizationId,
  });

  // Succession Plans
  const successionPlansQuery = useQuery({
    queryKey: ['performance', 'succession', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePerformance] Fetching succession plans');

      const { data, error } = await supabase
        .from('succession_plans')
        .select('*')
        .eq('organization_id', organizationId)
        .order('position_title', { ascending: true });

      if (error) throw error;
      return (data || []) as SuccessionPlan[];
    },
    enabled: !!organizationId,
  });

  // Talent Profiles
  const talentProfilesQuery = useQuery({
    queryKey: ['performance', 'talent', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      console.log('[useSupabasePerformance] Fetching talent profiles');

      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('category', { ascending: true });

      if (error) throw error;
      return (data || []) as TalentProfile[];
    },
    enabled: !!organizationId,
  });

  // Mutations - Performance Reviews
  const createReviewMutation = useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePerformance] Creating review:', input);

      const { data, error } = await supabase
        .from('performance_reviews')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as PerformanceReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceReview> & { id: string }) => {
      console.log('[useSupabasePerformance] Updating review:', id);

      const { data, error } = await supabase
        .from('performance_reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PerformanceReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
    },
  });

  const completeReviewMutation = useMutation({
    mutationFn: async ({ id, overallRating, managerComments }: { id: string; overallRating: number; managerComments?: string }) => {
      console.log('[useSupabasePerformance] Completing review:', id);

      const { data, error } = await supabase
        .from('performance_reviews')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          overall_rating: overallRating,
          manager_comments: managerComments,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PerformanceReview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePerformance] Deleting review:', id);

      const { error } = await supabase
        .from('performance_reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'reviews'] });
    },
  });

  // Mutations - Goals
  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePerformance] Creating goal:', input);

      const { data, error } = await supabase
        .from('employee_goals')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeGoal> & { id: string }) => {
      console.log('[useSupabasePerformance] Updating goal:', id);

      const { data, error } = await supabase
        .from('employee_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
    },
  });

  const updateGoalProgressMutation = useMutation({
    mutationFn: async ({ id, progress, status }: { id: string; progress: number; status?: GoalStatus }) => {
      console.log('[useSupabasePerformance] Updating goal progress:', id, progress);

      const updates: Partial<EmployeeGoal> = { progress };
      if (status) updates.status = status;
      if (progress >= 100) {
        updates.status = 'completed';
        updates.completed_date = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('employee_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
    },
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: async ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) => {
      console.log('[useSupabasePerformance] Completing milestone:', goalId, milestoneId);

      const { data: goal } = await supabase
        .from('employee_goals')
        .select('milestones')
        .eq('id', goalId)
        .single();

      const milestones = (goal?.milestones || []) as GoalMilestone[];
      const updatedMilestones = milestones.map(m => 
        m.id === milestoneId 
          ? { ...m, completed: true, completedDate: new Date().toISOString().split('T')[0] }
          : m
      );

      const { data, error } = await supabase
        .from('employee_goals')
        .update({ milestones: updatedMilestones })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePerformance] Deleting goal:', id);

      const { error } = await supabase
        .from('employee_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'goals'] });
    },
  });

  // Mutations - 360 Feedback
  const createFeedback360Mutation = useMutation({
    mutationFn: async (input: CreateFeedback360Input) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePerformance] Creating 360 feedback:', input);

      const { data, error } = await supabase
        .from('feedback_360')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as Feedback360;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'feedback360'] });
    },
  });

  const addFeedbackResponseMutation = useMutation({
    mutationFn: async ({ feedbackId, response }: { feedbackId: string; response: FeedbackResponse }) => {
      console.log('[useSupabasePerformance] Adding feedback response:', feedbackId);

      const { data: existing } = await supabase
        .from('feedback_360')
        .select('responses')
        .eq('id', feedbackId)
        .single();

      const existingResponses = (existing?.responses || []) as FeedbackResponse[];
      const updatedResponses = existingResponses.map(r => 
        r.id === response.id ? response : r
      );

      if (!existingResponses.find(r => r.id === response.id)) {
        updatedResponses.push(response);
      }

      const allSubmitted = updatedResponses.every(r => r.status === 'submitted');

      const { data, error } = await supabase
        .from('feedback_360')
        .update({ 
          responses: updatedResponses,
          status: allSubmitted ? 'completed' : 'in-progress',
        })
        .eq('id', feedbackId)
        .select()
        .single();

      if (error) throw error;
      return data as Feedback360;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'feedback360'] });
    },
  });

  const deleteFeedback360Mutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePerformance] Deleting 360 feedback:', id);

      const { error } = await supabase
        .from('feedback_360')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'feedback360'] });
    },
  });

  // Mutations - Succession Plans
  const createSuccessionPlanMutation = useMutation({
    mutationFn: async (input: CreateSuccessionPlanInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePerformance] Creating succession plan:', input);

      const { data, error } = await supabase
        .from('succession_plans')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as SuccessionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'succession'] });
    },
  });

  const updateSuccessionPlanMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SuccessionPlan> & { id: string }) => {
      console.log('[useSupabasePerformance] Updating succession plan:', id);

      const { data, error } = await supabase
        .from('succession_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SuccessionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'succession'] });
    },
  });

  const addSuccessorMutation = useMutation({
    mutationFn: async ({ planId, successor }: { planId: string; successor: Successor }) => {
      console.log('[useSupabasePerformance] Adding successor:', planId);

      const { data: existing } = await supabase
        .from('succession_plans')
        .select('successors')
        .eq('id', planId)
        .single();

      const existingSuccessors = (existing?.successors || []) as Successor[];

      const { data, error } = await supabase
        .from('succession_plans')
        .update({ successors: [...existingSuccessors, successor] })
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;
      return data as SuccessionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'succession'] });
    },
  });

  const deleteSuccessionPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePerformance] Deleting succession plan:', id);

      const { error } = await supabase
        .from('succession_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'succession'] });
    },
  });

  // Mutations - Talent Profiles
  const createTalentProfileMutation = useMutation({
    mutationFn: async (input: CreateTalentProfileInput) => {
      if (!organizationId) throw new Error('No organization selected');
      console.log('[useSupabasePerformance] Creating talent profile:', input);

      const { data, error } = await supabase
        .from('talent_profiles')
        .insert({ organization_id: organizationId, ...input })
        .select()
        .single();

      if (error) throw error;
      return data as TalentProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'talent'] });
    },
  });

  const updateTalentProfileMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TalentProfile> & { id: string }) => {
      console.log('[useSupabasePerformance] Updating talent profile:', id);

      const { data, error } = await supabase
        .from('talent_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TalentProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'talent'] });
    },
  });

  const deleteTalentProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[useSupabasePerformance] Deleting talent profile:', id);

      const { error } = await supabase
        .from('talent_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance', 'talent'] });
    },
  });

  // Helper functions
  const getReviewsForEmployee = (employeeId: string) => {
    return reviewsQuery.data?.filter(r => r.employee_id === employeeId) || [];
  };

  const getGoalsForEmployee = (employeeId: string) => {
    return goalsQuery.data?.filter(g => g.employee_id === employeeId) || [];
  };

  const getTalentProfileForEmployee = (employeeId: string) => {
    return talentProfilesQuery.data?.find(p => p.employee_id === employeeId);
  };

  const getSuccessionPlansForIncumbent = (employeeId: string) => {
    return successionPlansQuery.data?.filter(p => p.incumbent_id === employeeId) || [];
  };

  return {
    reviews: reviewsQuery.data || [],
    goals: goalsQuery.data || [],
    feedback360: feedback360Query.data || [],
    successionPlans: successionPlansQuery.data || [],
    talentProfiles: talentProfilesQuery.data || [],

    isLoading: reviewsQuery.isLoading || goalsQuery.isLoading || 
               feedback360Query.isLoading || successionPlansQuery.isLoading || 
               talentProfilesQuery.isLoading,

    // Reviews
    createReview: createReviewMutation.mutateAsync,
    updateReview: updateReviewMutation.mutateAsync,
    completeReview: completeReviewMutation.mutateAsync,
    deleteReview: deleteReviewMutation.mutateAsync,

    // Goals
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    updateGoalProgress: updateGoalProgressMutation.mutateAsync,
    completeMilestone: completeMilestoneMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,

    // 360 Feedback
    createFeedback360: createFeedback360Mutation.mutateAsync,
    addFeedbackResponse: addFeedbackResponseMutation.mutateAsync,
    deleteFeedback360: deleteFeedback360Mutation.mutateAsync,

    // Succession Plans
    createSuccessionPlan: createSuccessionPlanMutation.mutateAsync,
    updateSuccessionPlan: updateSuccessionPlanMutation.mutateAsync,
    addSuccessor: addSuccessorMutation.mutateAsync,
    deleteSuccessionPlan: deleteSuccessionPlanMutation.mutateAsync,

    // Talent Profiles
    createTalentProfile: createTalentProfileMutation.mutateAsync,
    updateTalentProfile: updateTalentProfileMutation.mutateAsync,
    deleteTalentProfile: deleteTalentProfileMutation.mutateAsync,

    // Helpers
    getReviewsForEmployee,
    getGoalsForEmployee,
    getTalentProfileForEmployee,
    getSuccessionPlansForIncumbent,

    refetch: () => {
      reviewsQuery.refetch();
      goalsQuery.refetch();
      feedback360Query.refetch();
      successionPlansQuery.refetch();
      talentProfilesQuery.refetch();
    },
  };
}
