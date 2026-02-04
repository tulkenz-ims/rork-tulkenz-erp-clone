import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Accessibility } from 'lucide-react-native';

export default function ADAAccommodationScreen() {
  return (
    <CompliancePlaceholder
      title="ADA Accommodation Request"
      description="Track ADA accommodation requests and interactive process"
      icon={Accessibility}
      color="#6366F1"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Request Documentation', description: 'Document accommodation requests' },
        { title: 'Interactive Process', description: 'Track interactive process steps' },
        { title: 'Medical Documentation', description: 'Store supporting documentation' },
        { title: 'Accommodation Provided', description: 'Document accommodations made' },
        { title: 'Follow-Up', description: 'Track accommodation effectiveness' },
      ]}
    />
  );
}
