import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Calendar } from 'lucide-react-native';

export default function InsuranceRenewalScreen() {
  return (
    <CompliancePlaceholder
      title="Insurance Renewal Calendar"
      description="Track insurance policy renewal dates and deadlines"
      icon={Calendar}
      color="#EC4899"
      category="Insurance & Liability"
      features={[
        { title: 'Policy List', description: 'List all insurance policies' },
        { title: 'Renewal Dates', description: 'Track upcoming renewals' },
        { title: 'Renewal Status', description: 'Monitor renewal progress' },
        { title: 'Premium History', description: 'Track premium changes' },
        { title: 'Broker Contact', description: 'Document broker information' },
      ]}
    />
  );
}
