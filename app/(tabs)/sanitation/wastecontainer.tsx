import { Trash } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function WasteContainerScreen() {
  return (
    <SanitationPlaceholder
      title="Waste Container Cleaning"
      description="Log for cleaning and sanitizing waste containers"
      icon={Trash}
      color="#6366F1"
      category="Waste & Trash Management"
      features={[
        { title: 'Container ID', description: 'Identify container cleaned' },
        { title: 'Cleaning Method', description: 'Interior and exterior cleaning' },
        { title: 'Sanitization', description: 'Disinfection applied' },
        { title: 'Condition Check', description: 'Note any damage' },
        { title: 'Deodorization', description: 'Odor control applied' },
      ]}
    />
  );
}
