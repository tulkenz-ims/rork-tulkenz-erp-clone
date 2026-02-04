import { Package } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function TrashLinerScreen() {
  return (
    <SanitationPlaceholder
      title="Trash Can Liner Replacement"
      description="Log for trash liner replacement tracking"
      icon={Package}
      color="#6366F1"
      category="Waste & Trash Management"
      features={[
        { title: 'Replacement Log', description: 'Track liner replacements' },
        { title: 'Liner Size', description: 'Correct liner size verification' },
        { title: 'Inventory Check', description: 'Monitor liner inventory' },
        { title: 'Quality Check', description: 'Verify liner quality/thickness' },
        { title: 'Reorder Alert', description: 'Low inventory notifications' },
      ]}
    />
  );
}
