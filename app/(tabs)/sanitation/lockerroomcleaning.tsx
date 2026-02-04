import { DoorOpen } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function LockerRoomCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Locker Room Cleaning Checklist"
      description="Daily cleaning checklist for employee locker room facilities"
      icon={DoorOpen}
      color="#F59E0B"
      category="Break Room / Locker Room"
      features={[
        { title: 'Locker Exterior', description: 'Clean locker exterior surfaces' },
        { title: 'Bench Cleaning', description: 'Clean and sanitize benches' },
        { title: 'Floor Care', description: 'Mop and sanitize floors' },
        { title: 'Shower Areas', description: 'Clean shower facilities if applicable' },
        { title: 'Trash Removal', description: 'Empty all trash receptacles' },
      ]}
    />
  );
}
