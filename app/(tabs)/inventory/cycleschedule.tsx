import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Calendar } from 'lucide-react-native';

export default function CycleScheduleScreen() {
  return (
    <InventoryPlaceholder
      title="Cycle Count Scheduling"
      description="Schedule and plan cycle count activities"
      icon={Calendar}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Schedule Setup', description: 'Create count schedules' },
        { title: 'Frequency Rules', description: 'Set count frequencies' },
        { title: 'Calendar View', description: 'View count calendar' },
        { title: 'Resource Planning', description: 'Plan count resources' },
      ]}
    />
  );
}
