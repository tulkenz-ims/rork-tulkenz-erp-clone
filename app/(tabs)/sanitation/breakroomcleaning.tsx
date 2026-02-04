import { Coffee } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function BreakRoomCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Break Room Cleaning Checklist"
      description="Daily cleaning checklist for employee break room areas"
      icon={Coffee}
      color="#F59E0B"
      category="Break Room / Locker Room"
      features={[
        { title: 'Surface Cleaning', description: 'Tables, counters, and surfaces' },
        { title: 'Appliance Exterior', description: 'Clean appliance exteriors' },
        { title: 'Floor Care', description: 'Sweep and mop floors' },
        { title: 'Trash Removal', description: 'Empty trash and recycling' },
        { title: 'Supply Restock', description: 'Restock break room supplies' },
      ]}
    />
  );
}
