export type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'enterprise_plus';

export interface Organization {
  id: string;
  name: string;
  code: string;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
}

export interface OrganizationFormData {
  name: string;
  code: string;
  subscription_tier?: SubscriptionTier;
}

export interface OrganizationCreateInput extends OrganizationFormData {
  // No additional fields needed for creation
}

export interface OrganizationUpdateInput extends Partial<OrganizationFormData> {
  id: string;
}

export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  enterprise_plus: 'Enterprise Plus',
};

export const SUBSCRIPTION_TIER_COLORS: Record<SubscriptionTier, string> = {
  starter: '#6B7280',
  professional: '#3B82F6',
  enterprise: '#8B5CF6',
  enterprise_plus: '#F59E0B',
};
