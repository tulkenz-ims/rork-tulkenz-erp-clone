import QualityPlaceholder from '@/components/QualityPlaceholder';
import { RefreshCw } from 'lucide-react-native';

export default function ReworkAuthScreen() {
  return (
    <QualityPlaceholder
      title="Rework Authorization Form"
      description="Authorize product rework with defined procedures"
      icon={RefreshCw}
      color="#F59E0B"
      category="Hold & Release"
      features={[
        { title: 'Product Details', description: 'Product, lot, quantity to rework' },
        { title: 'Rework Reason', description: 'Document reason for rework' },
        { title: 'Rework Procedure', description: 'Define rework instructions' },
        { title: 'Quality Criteria', description: 'Acceptance criteria after rework' },
        { title: 'Authorization', description: 'QA approval for rework' },
      ]}
    />
  );
}
