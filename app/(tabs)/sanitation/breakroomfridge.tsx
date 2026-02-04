import { Refrigerator } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function BreakRoomFridgeScreen() {
  return (
    <SanitationPlaceholder
      title="Break Room Refrigerator Cleaning"
      description="Periodic cleaning log for break room refrigerators"
      icon={Refrigerator}
      color="#F59E0B"
      category="Break Room / Locker Room"
      features={[
        { title: 'Interior Cleaning', description: 'Clean shelves and compartments' },
        { title: 'Expired Item Removal', description: 'Remove old/expired items' },
        { title: 'Odor Control', description: 'Deodorize and freshen' },
        { title: 'Temperature Check', description: 'Verify proper temperature' },
        { title: 'Exterior Wipe-down', description: 'Clean exterior surfaces' },
      ]}
    />
  );
}
