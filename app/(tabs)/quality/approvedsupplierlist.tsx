import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Users } from 'lucide-react-native';

export default function ApprovedSupplierListScreen() {
  return (
    <QualityPlaceholder
      title="Approved Supplier List"
      description="Maintain list of approved suppliers"
      icon={Users}
      color="#3B82F6"
      category="Supplier Quality"
      features={[
        { title: 'Supplier List', description: 'All approved suppliers' },
        { title: 'Approval Status', description: 'Approved, conditional, etc.' },
        { title: 'Approved Items', description: 'Items approved for each' },
        { title: 'Certifications', description: 'Supplier certifications' },
        { title: 'Review Schedule', description: 'Periodic review dates' },
      ]}
    />
  );
}
