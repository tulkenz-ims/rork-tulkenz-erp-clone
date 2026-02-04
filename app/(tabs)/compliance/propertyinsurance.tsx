import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Building } from 'lucide-react-native';

export default function PropertyInsuranceScreen() {
  return (
    <CompliancePlaceholder
      title="Property Insurance Documentation"
      description="Track property insurance coverage and documentation"
      icon={Building}
      color="#6366F1"
      category="Insurance & Liability"
      features={[
        { title: 'Policy Details', description: 'Document policy information' },
        { title: 'Covered Property', description: 'List insured property' },
        { title: 'Coverage Limits', description: 'Track coverage amounts' },
        { title: 'Certificate', description: 'Store insurance certificate' },
        { title: 'Renewal Schedule', description: 'Monitor renewal dates' },
      ]}
    />
  );
}
