import { Users } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ConferenceRoomScreen() {
  return (
    <SanitationPlaceholder
      title="Conference Room Cleaning"
      description="Cleaning log for conference and meeting rooms"
      icon={Users}
      color="#10B981"
      category="Office & Common Areas"
      features={[
        { title: 'Table Cleaning', description: 'Clean and sanitize conference tables' },
        { title: 'Chair Cleaning', description: 'Wipe down chairs' },
        { title: 'Technology', description: 'Clean screens, phones, remotes' },
        { title: 'Floor Care', description: 'Vacuum or mop floors' },
        { title: 'Whiteboard', description: 'Clean whiteboards and markers area' },
      ]}
    />
  );
}
