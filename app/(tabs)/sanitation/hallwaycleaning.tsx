import { ArrowRight } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function HallwayCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Hallway/Corridor Cleaning"
      description="Cleaning log for hallways and corridors"
      icon={ArrowRight}
      color="#10B981"
      category="Office & Common Areas"
      features={[
        { title: 'Floor Care', description: 'Sweep, mop, or vacuum hallways' },
        { title: 'Wall Spot Cleaning', description: 'Remove marks and stains from walls' },
        { title: 'Light Fixtures', description: 'Dust light fixtures and covers' },
        { title: 'Baseboards', description: 'Clean baseboards as needed' },
        { title: 'Signage', description: 'Clean signs and bulletin boards' },
      ]}
    />
  );
}
