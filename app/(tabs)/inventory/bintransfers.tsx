import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { MoveHorizontal } from 'lucide-react-native';

export default function BinTransfersScreen() {
  return (
    <InventoryPlaceholder
      title="Bin Transfers"
      description="Move inventory between bins within a location"
      icon={MoveHorizontal}
      color="#10B981"
      category="Inventory Operations"
      features={[
        { title: 'Bin-to-Bin', description: 'Transfer between bins' },
        { title: 'Replenishment', description: 'Replenish pick bins' },
        { title: 'Consolidation', description: 'Consolidate inventory' },
        { title: 'Move History', description: 'Track bin movements' },
      ]}
    />
  );
}
