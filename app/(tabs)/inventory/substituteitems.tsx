import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Repeat } from 'lucide-react-native';

export default function SubstituteItemsScreen() {
  return (
    <InventoryPlaceholder
      title="Substitute Items"
      description="Define alternate items that can be used when primary items are unavailable"
      icon={Repeat}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Substitute Definition', description: 'Define substitute items' },
        { title: 'Substitute Priority', description: 'Set priority order for substitutes' },
        { title: 'Substitute Alerts', description: 'Alert when substitutes are used' },
        { title: 'Substitute Reports', description: 'Track substitute usage' },
      ]}
    />
  );
}
