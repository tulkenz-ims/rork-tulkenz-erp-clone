import QualityPlaceholder from '@/components/QualityPlaceholder';
import { XCircle } from 'lucide-react-native';

export default function RejectedMaterialLogScreen() {
  return (
    <QualityPlaceholder
      title="Rejected Material Log"
      description="Document and track rejected incoming materials"
      icon={XCircle}
      color="#DC2626"
      category="Receiving & Supplier"
      features={[
        { title: 'Material Identification', description: 'Item, lot, supplier details' },
        { title: 'Rejection Reason', description: 'Document reason for rejection' },
        { title: 'Photo Documentation', description: 'Attach photos of issue' },
        { title: 'Supplier Notification', description: 'Track supplier communication' },
        { title: 'Disposition', description: 'Return, destroy, or credit' },
      ]}
    />
  );
}
