import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { ArrowUpDown } from 'lucide-react-native';

export default function ElevatorInspectionScreen() {
  return (
    <CompliancePlaceholder
      title="Elevator Inspection Certificate"
      description="Track elevator inspection and certification compliance"
      icon={ArrowUpDown}
      color="#8B5CF6"
      category="State & Local Permits"
      features={[
        { title: 'Equipment List', description: 'Document elevator inventory' },
        { title: 'Certificates', description: 'Store inspection certificates' },
        { title: 'Expiration Tracking', description: 'Monitor certificate dates' },
        { title: 'Maintenance Records', description: 'Track maintenance history' },
        { title: 'Posting Compliance', description: 'Verify certificate posting' },
      ]}
    />
  );
}
