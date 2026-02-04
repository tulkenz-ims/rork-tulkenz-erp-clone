import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Truck } from 'lucide-react-native';

export default function IncomingInspectionScreen() {
  return (
    <QualityPlaceholder
      title="Incoming Material Inspection"
      description="Inspect and document incoming materials and ingredients"
      icon={Truck}
      color="#3B82F6"
      category="Receiving & Supplier"
      features={[
        { title: 'Shipment Details', description: 'PO number, supplier, carrier' },
        { title: 'Material Identification', description: 'Item, lot, quantity received' },
        { title: 'Condition Check', description: 'Inspect packaging and condition' },
        { title: 'Specification Verification', description: 'Verify meets specifications' },
        { title: 'Accept/Reject Decision', description: 'Document disposition' },
      ]}
    />
  );
}
