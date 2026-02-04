import QualityPlaceholder from '@/components/QualityPlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function RecallInitiationScreen() {
  return (
    <QualityPlaceholder
      title="Recall Initiation Form"
      description="Initiate product recall process"
      icon={AlertTriangle}
      color="#DC2626"
      category="Recall & Crisis"
      features={[
        { title: 'Recall Classification', description: 'Class I, II, or III' },
        { title: 'Product Details', description: 'Products and lots affected' },
        { title: 'Reason', description: 'Reason for recall' },
        { title: 'Distribution', description: 'Where product was shipped' },
        { title: 'Notifications', description: 'Required notifications' },
      ]}
    />
  );
}
