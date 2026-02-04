import { Cigarette } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SmokingAreaCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Smoking Area Cleaning"
      description="Log for designated smoking area cleaning"
      icon={Cigarette}
      color="#22C55E"
      category="Exterior/Grounds"
      features={[
        { title: 'Butt Receptacle', description: 'Empty cigarette receptacles' },
        { title: 'Ground Cleaning', description: 'Clean ground area' },
        { title: 'Furniture', description: 'Clean benches/seating' },
        { title: 'Signage', description: 'Clean area signage' },
        { title: 'Odor Control', description: 'Address lingering odors' },
      ]}
    />
  );
}
