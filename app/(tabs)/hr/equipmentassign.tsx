import { Layers } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function EquipmentAssignScreen() {
  return (
    <HRPlaceholder
      title="Equipment Assignment"
      description="Track and manage equipment, devices, and assets assigned to new employees."
      icon={Layers}
      color="#059669"
      category="Onboarding"
      features={[
        { title: 'Asset Catalog', description: 'Available equipment inventory' },
        { title: 'Assignment Workflow', description: 'Request and approve assets' },
        { title: 'Device Tracking', description: 'Laptop, phone, badge assignment' },
        { title: 'Acknowledgment', description: 'Employee receipt confirmation' },
        { title: 'Asset History', description: 'Track assignment history' },
      ]}
    />
  );
}
