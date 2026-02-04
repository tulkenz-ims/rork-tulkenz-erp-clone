import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Flame } from 'lucide-react-native';

export default function FireMarshalScreen() {
  return (
    <CompliancePlaceholder
      title="Fire Marshal Inspection"
      description="Track fire marshal inspection records and compliance"
      icon={Flame}
      color="#EF4444"
      category="State & Local Permits"
      features={[
        { title: 'Inspection Reports', description: 'Store inspection records' },
        { title: 'Occupancy Permit', description: 'Document occupancy limits' },
        { title: 'Violations', description: 'Track any violations found' },
        { title: 'Corrective Actions', description: 'Document corrections made' },
        { title: 'Certificate Status', description: 'Monitor certificate validity' },
      ]}
    />
  );
}
