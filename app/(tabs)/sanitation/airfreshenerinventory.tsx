import { Wind } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function AirFreshenerInventoryScreen() {
  return (
    <SanitationPlaceholder
      title="Air Freshener Inventory"
      description="Inventory tracking for air freshener supplies"
      icon={Wind}
      color="#14B8A6"
      category="Facility Consumable Supplies"
      features={[
        { title: 'Current Stock', description: 'Track freshener inventory' },
        { title: 'Dispenser Locations', description: 'Map automatic dispensers' },
        { title: 'Refill Schedule', description: 'Plan cartridge replacements' },
        { title: 'Scent Types', description: 'Track different scent varieties' },
        { title: 'Battery Status', description: 'Monitor dispenser batteries' },
      ]}
    />
  );
}
