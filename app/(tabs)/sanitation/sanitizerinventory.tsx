import { Droplets } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SanitizerInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Hand Sanitizer Inventory"
      description="Inventory tracking for hand sanitizer supplies"
      icon={Droplets}
      color="#14B8A6"
      category="Facility Consumable Supplies"
      features={[
        { title: 'Current Stock', description: 'Track sanitizer inventory' },
        { title: 'Station Locations', description: 'Map sanitizer stations' },
        { title: 'Refill Tracking', description: 'Monitor refill needs' },
        { title: 'Expiration Dates', description: 'Track product expiration' },
        { title: 'Usage Analytics', description: 'Monitor consumption patterns' },
      ]}
    />
  );
}
