import { Trash2 } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function ExteriorTrashCanScreen() {
  return (
    <SanitationPlaceholder
      title="Exterior Trash Can Cleaning"
      description="Log for cleaning exterior trash receptacles"
      icon={Trash2}
      color="#22C55E"
      category="Exterior/Grounds"
      features={[
        { title: 'Can ID/Location', description: 'Identify trash can cleaned' },
        { title: 'Interior Cleaning', description: 'Clean inside of can' },
        { title: 'Exterior Wipe', description: 'Clean exterior surfaces' },
        { title: 'Deodorize', description: 'Apply deodorizer' },
        { title: 'Liner Replacement', description: 'Replace trash liner' },
      ]}
    />
  );
}
