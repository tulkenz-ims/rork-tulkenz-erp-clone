import { ClipboardCheck } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function LockerRoomInspectionScreen() {
  return (
    <SanitationPlaceholder
      title="Locker Room Inspection Log"
      description="Regular inspection log for locker room cleanliness and maintenance"
      icon={ClipboardCheck}
      color="#F59E0B"
      category="Break Room / Locker Room"
      features={[
        { title: 'Cleanliness Rating', description: 'Overall cleanliness assessment' },
        { title: 'Maintenance Issues', description: 'Document any repair needs' },
        { title: 'Safety Hazards', description: 'Identify safety concerns' },
        { title: 'Supply Status', description: 'Check supply levels' },
        { title: 'Corrective Actions', description: 'Assign follow-up tasks' },
      ]}
    />
  );
}
