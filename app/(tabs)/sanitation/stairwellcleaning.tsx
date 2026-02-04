import { ArrowUpDown } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function StairwellCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Stairwell Cleaning"
      description="Cleaning log for stairwells and stair areas"
      icon={ArrowUpDown}
      color="#10B981"
      category="Office & Common Areas"
      features={[
        { title: 'Step Cleaning', description: 'Clean and sanitize stair treads' },
        { title: 'Handrails', description: 'Sanitize handrails' },
        { title: 'Landings', description: 'Clean landing areas' },
        { title: 'Walls/Corners', description: 'Clean walls and corners' },
        { title: 'Safety Signage', description: 'Clean and verify safety signs' },
      ]}
    />
  );
}
