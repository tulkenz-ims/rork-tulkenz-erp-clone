import { DoorOpen } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function EntranceCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Entrance/Exit Area Cleaning"
      description="Cleaning log for building entrances and exits"
      icon={DoorOpen}
      color="#10B981"
      category="Office & Common Areas"
      features={[
        { title: 'Door Cleaning', description: 'Clean doors and glass panels' },
        { title: 'Floor Mats', description: 'Clean and maintain entry mats' },
        { title: 'High-Touch Surfaces', description: 'Sanitize handles and push plates' },
        { title: 'Surrounding Floor', description: 'Clean floor around entrances' },
        { title: 'Weather Protection', description: 'Clean vestibules if applicable' },
      ]}
    />
  );
}
