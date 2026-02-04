import { DoorOpen } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function DoorGlassCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Door Glass Cleaning"
      description="Log for cleaning glass doors and door panels"
      icon={DoorOpen}
      color="#0EA5E9"
      category="Window & Glass Cleaning"
      features={[
        { title: 'Entry Doors', description: 'Clean main entry door glass' },
        { title: 'Interior Doors', description: 'Clean interior glass doors' },
        { title: 'Sidelights', description: 'Clean door sidelights' },
        { title: 'Both Sides', description: 'Clean interior and exterior' },
        { title: 'Fingerprint Removal', description: 'Remove fingerprints and smudges' },
      ]}
    />
  );
}
