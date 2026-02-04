import { Wrench } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function CleaningToolInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Cleaning Tool Inventory"
      description="Inventory tracking for cleaning tools and equipment"
      icon={Wrench}
      color="#EF4444"
      category="Sanitation Tools & Equipment"
      features={[
        { title: 'Tool List', description: 'Complete tool inventory' },
        { title: 'Location', description: 'Track tool locations' },
        { title: 'Condition', description: 'Assess tool condition' },
        { title: 'Replacement Date', description: 'Track replacement schedules' },
        { title: 'Cost Tracking', description: 'Monitor tool costs' },
      ]}
    />
  );
}
