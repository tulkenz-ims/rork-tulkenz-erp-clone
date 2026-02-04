import { Shield } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function AccessRevokeScreen() {
  return (
    <HRPlaceholder
      title="Access Revocation"
      description="Manage system deprovisioning and access removal for departing employees."
      icon={Shield}
      color="#991B1B"
      category="Offboarding"
      features={[
        { title: 'Access Checklist', description: 'Systems to deprovision' },
        { title: 'Revocation Workflow', description: 'IT and manager coordination' },
        { title: 'Email Forwarding', description: 'Configure email handling' },
        { title: 'Data Backup', description: 'Archive employee data' },
        { title: 'Compliance Audit', description: 'Track access removal' },
      ]}
    />
  );
}
