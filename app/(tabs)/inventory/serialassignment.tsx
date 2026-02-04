import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Tag } from 'lucide-react-native';

export default function SerialAssignmentScreen() {
  return (
    <InventoryPlaceholder
      title="Serial Number Assignment"
      description="Assign serial numbers during receipt or production"
      icon={Tag}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Auto Assignment', description: 'Automatic serial number generation' },
        { title: 'Manual Entry', description: 'Enter vendor serial numbers' },
        { title: 'Bulk Assignment', description: 'Assign serials in bulk' },
        { title: 'Assignment Rules', description: 'Configure assignment rules' },
      ]}
    />
  );
}
