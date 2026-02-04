import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { TrendingUp } from 'lucide-react-native';

export default function OverstockAlertsScreen() {
  return (
    <InventoryPlaceholder
      title="Overstock Alerts"
      description="Alerts for items exceeding maximum levels"
      icon={TrendingUp}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Overstock Detection', description: 'Detect excess inventory' },
        { title: 'Alert Thresholds', description: 'Configure max level alerts' },
        { title: 'Alert Notifications', description: 'Send overstock alerts' },
        { title: 'Overstock Reports', description: 'Overstock analysis' },
      ]}
    />
  );
}
