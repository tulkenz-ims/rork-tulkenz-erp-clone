import { Footprints } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SidewalkCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Sidewalk Cleaning"
      description="Log for sidewalk and walkway cleaning"
      icon={Footprints}
      color="#22C55E"
      category="Exterior/Grounds"
      features={[
        { title: 'Areas Cleaned', description: 'Document walkways cleaned' },
        { title: 'Method', description: 'Sweeping, pressure washing, etc.' },
        { title: 'Stain Removal', description: 'Address stains and marks' },
        { title: 'Gum Removal', description: 'Track gum removal efforts' },
        { title: 'Safety Check', description: 'Identify trip hazards' },
      ]}
    />
  );
}
