import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function COITrackerScreen() {
  return (
    <CompliancePlaceholder
      title="Certificate of Insurance Tracker"
      description="Track all certificates of insurance and expiration dates"
      icon={FileCheck}
      color="#0EA5E9"
      category="Insurance & Liability"
      features={[
        { title: 'COI List', description: 'List all insurance certificates' },
        { title: 'Expiration Dates', description: 'Track certificate expiration' },
        { title: 'Coverage Types', description: 'Document coverage types' },
        { title: 'Alerts', description: 'Set renewal reminders' },
        { title: 'Vendor COIs', description: 'Track vendor insurance' },
      ]}
    />
  );
}
