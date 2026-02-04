import { Square } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function FloorMatCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Floor Mat Cleaning/Replacement"
      description="Log for floor mat cleaning and replacement"
      icon={Square}
      color="#EC4899"
      category="Floor Care"
      features={[
        { title: 'Mat Locations', description: 'Document all mat locations' },
        { title: 'Cleaning Schedule', description: 'Regular cleaning frequency' },
        { title: 'Condition Check', description: 'Assess mat condition' },
        { title: 'Replacement Needs', description: 'Identify mats needing replacement' },
        { title: 'Service Provider', description: 'Mat service vendor tracking' },
      ]}
    />
  );
}
