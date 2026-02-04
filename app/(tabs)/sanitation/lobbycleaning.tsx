import { DoorOpen } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function LobbyCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Reception/Lobby Cleaning"
      description="Cleaning log for reception and lobby areas"
      icon={DoorOpen}
      color="#10B981"
      category="Office & Common Areas"
      features={[
        { title: 'Reception Desk', description: 'Clean and organize reception area' },
        { title: 'Seating Area', description: 'Clean waiting area furniture' },
        { title: 'Floor Care', description: 'Vacuum, mop, or polish floors' },
        { title: 'Glass/Windows', description: 'Clean entrance glass and windows' },
        { title: 'Plant Care', description: 'Maintain lobby plants if applicable' },
      ]}
    />
  );
}
