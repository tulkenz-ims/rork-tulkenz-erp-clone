import { Trash2 } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function TrashRemovalScreen() {
  return (
    <SanitationPlaceholder
      title="Trash Removal Schedule/Log"
      description="Daily trash removal documentation"
      icon={Trash2}
      color="#6366F1"
      category="Waste & Trash Management"
      features={[
        { title: 'Collection Times', description: 'Scheduled collection times' },
        { title: 'Areas Serviced', description: 'Document areas collected' },
        { title: 'Volume Estimate', description: 'Track waste volume' },
        { title: 'Completion Sign-off', description: 'Verify collection complete' },
        { title: 'Issues Noted', description: 'Report any problems' },
      ]}
    />
  );
}
