import { ShoppingBag } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function VendingAreaScreen() {
  return (
    <SanitationPlaceholder
      title="Vending Area Cleaning Log"
      description="Cleaning log for vending machine areas"
      icon={ShoppingBag}
      color="#F59E0B"
      category="Break Room / Locker Room"
      features={[
        { title: 'Machine Exterior', description: 'Clean vending machine exteriors' },
        { title: 'Surrounding Area', description: 'Clean floor and walls around machines' },
        { title: 'Spill Cleanup', description: 'Address any spills or debris' },
        { title: 'Trash Removal', description: 'Empty nearby trash cans' },
        { title: 'High-Touch Sanitize', description: 'Sanitize buttons and handles' },
      ]}
    />
  );
}
