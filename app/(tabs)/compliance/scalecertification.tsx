import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Award } from 'lucide-react-native';

export default function ScaleCertificationScreen() {
  return (
    <CompliancePlaceholder
      title="Scale Certification Record"
      description="Track scale certification and legal metrology compliance"
      icon={Award}
      color="#8B5CF6"
      category="Weights & Measures"
      features={[
        { title: 'Scale Inventory', description: 'List certified scales' },
        { title: 'Certificates', description: 'Store certification records' },
        { title: 'Certification Dates', description: 'Track certification expiration' },
        { title: 'Service Provider', description: 'Document certifying company' },
        { title: 'Renewal Schedule', description: 'Monitor renewal dates' },
      ]}
    />
  );
}
