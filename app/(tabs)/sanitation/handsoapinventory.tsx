import { Droplets } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function HandSoapInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Hand Soap Inventory"
      description="Inventory tracking for hand soap supplies"
      icon={Droplets}
      color="#14B8A6"
      category="Facility Consumable Supplies"
      features={[
        { title: 'Current Stock', description: 'Track soap inventory levels' },
        { title: 'Soap Types', description: 'Foam, liquid, antibacterial varieties' },
        { title: 'Dispenser Tracking', description: 'Track dispenser locations' },
        { title: 'Refill Schedule', description: 'Plan refill timing' },
        { title: 'Vendor Management', description: 'Supplier information' },
      ]}
    />
  );
}
