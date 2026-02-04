import createContextHook from '@nkzw/create-context-hook';
import { useOrganization } from './OrganizationContext';
import { useUser } from './UserContext';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const orgContext = useOrganization();
  const userContext = useUser();

  const organizationId = orgContext?.organizationId || '';
  const facilityId = orgContext?.facilityId || '';
  const userId = userContext?.userProfile?.id || '';
  const userName = userContext?.userProfile 
    ? `${userContext.userProfile.first_name} ${userContext.userProfile.last_name}`.trim()
    : '';

  return {
    organizationId,
    facilityId,
    userId,
    userName,
    isLoading: orgContext?.isLoading || userContext?.loading,
  };
});
