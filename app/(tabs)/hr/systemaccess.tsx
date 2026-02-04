import { Settings } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function SystemAccessScreen() {
  return (
    <HRPlaceholder
      title="System Access Requests"
      description="Manage IT provisioning workflows and system access for new employees."
      icon={Settings}
      color="#047857"
      category="Onboarding"
      features={[
        { title: 'Access Templates', description: 'Role-based access profiles' },
        { title: 'Approval Routing', description: 'IT and manager approvals' },
        { title: 'Account Creation', description: 'Email and system accounts' },
        { title: 'Application Access', description: 'Software and tool permissions' },
        { title: 'Access Audit', description: 'Track provisioning status' },
      ]}
    />
  );
}
