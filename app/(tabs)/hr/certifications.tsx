import { Award } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function CertificationsScreen() {
  return (
    <HRPlaceholder
      title="Certification Tracking"
      description="Track employee certifications, licenses, and expiration dates with renewal alerts."
      icon={Award}
      color="#0F766E"
      category="Learning & Development"
      features={[
        { title: 'Certification Records', description: 'Track all credentials' },
        { title: 'Expiration Alerts', description: 'Renewal notifications' },
        { title: 'Document Upload', description: 'Store certificate copies' },
        { title: 'Compliance Matrix', description: 'Role-required certifications' },
        { title: 'Recertification Workflow', description: 'Renewal process management' },
      ]}
    />
  );
}
