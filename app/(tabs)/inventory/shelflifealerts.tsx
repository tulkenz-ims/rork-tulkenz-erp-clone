import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function ShelfLifeAlertsScreen() {
  return (
    <InventoryPlaceholder
      title="Shelf Life Alerts"
      description="Configure alerts for items approaching expiration"
      icon={AlertTriangle}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Alert Configuration', description: 'Set alert thresholds' },
        { title: 'Email Notifications', description: 'Send expiration alerts' },
        { title: 'Dashboard Alerts', description: 'Display alerts on dashboard' },
        { title: 'Alert History', description: 'Track alert history' },
      ]}
    />
  );
}
