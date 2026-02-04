import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { AlertOctagon } from 'lucide-react-native';

export default function StockoutAlertsScreen() {
  return (
    <InventoryPlaceholder
      title="Stockout Alerts"
      description="Alerts for items that are out of stock"
      icon={AlertOctagon}
      color="#F59E0B"
      category="Levels & Replenishment"
      features={[
        { title: 'Stockout Detection', description: 'Detect zero inventory' },
        { title: 'Alert Notifications', description: 'Send stockout alerts' },
        { title: 'Impact Analysis', description: 'Analyze stockout impact' },
        { title: 'Stockout Reports', description: 'Stockout history reports' },
      ]}
    />
  );
}
