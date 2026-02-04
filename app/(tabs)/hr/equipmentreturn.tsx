import { Layers } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function EquipmentReturnScreen() {
  return (
    <HRPlaceholder
      title="Equipment Return"
      description="Track and manage the return of company assets from departing employees."
      icon={Layers}
      color="#B91C1C"
      category="Offboarding"
      features={[
        { title: 'Return Checklist', description: 'Items to be returned' },
        { title: 'Return Status', description: 'Track item return progress' },
        { title: 'Condition Assessment', description: 'Document item condition' },
        { title: 'Shipping Labels', description: 'Generate return shipping' },
        { title: 'Asset Recovery', description: 'Track outstanding items' },
      ]}
    />
  );
}
