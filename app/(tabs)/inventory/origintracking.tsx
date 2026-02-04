import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Globe } from 'lucide-react-native';

export default function OriginTrackingScreen() {
  return (
    <InventoryPlaceholder
      title="Country of Origin"
      description="Track country of origin for compliance and reporting"
      icon={Globe}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Origin Tracking', description: 'Track country of origin' },
        { title: 'Origin Rules', description: 'Configure origin requirements' },
        { title: 'Origin Certificates', description: 'Manage origin certificates' },
        { title: 'Origin Reports', description: 'Generate origin reports' },
      ]}
    />
  );
}
