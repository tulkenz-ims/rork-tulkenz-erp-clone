import { Package } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function RestroomSupplyScreen() {
  return (
    <SanitationPlaceholder
      title="Restroom Supply Check Log"
      description="Track restroom supply levels and restocking needs"
      icon={Package}
      color="#3B82F6"
      category="Restroom Sanitation"
      features={[
        { title: 'Supply Inventory', description: 'Current supply levels by item' },
        { title: 'Restock Alerts', description: 'Low supply notifications' },
        { title: 'Usage Tracking', description: 'Monitor supply consumption rates' },
        { title: 'Reorder Points', description: 'Automatic reorder triggers' },
        { title: 'Vendor Information', description: 'Supply vendor details' },
      ]}
    />
  );
}
