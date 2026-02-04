import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { ShieldCheck } from 'lucide-react-native';

export default function WorkersCompPolicyScreen() {
  return (
    <CompliancePlaceholder
      title="Workers Compensation Policy"
      description="Track workers compensation policy and compliance"
      icon={ShieldCheck}
      color="#0EA5E9"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Policy Documentation', description: 'Store current policy' },
        { title: 'Coverage Details', description: 'Document coverage limits' },
        { title: 'Posting Requirements', description: 'Track posting compliance' },
        { title: 'Claims Procedures', description: 'Document claims process' },
        { title: 'Renewal Tracking', description: 'Monitor policy renewal' },
      ]}
    />
  );
}
