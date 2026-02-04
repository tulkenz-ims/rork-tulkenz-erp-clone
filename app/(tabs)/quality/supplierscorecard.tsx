import QualityPlaceholder from '@/components/QualityPlaceholder';
import { BarChart2 } from 'lucide-react-native';

export default function SupplierScorecardScreen() {
  return (
    <QualityPlaceholder
      title="Supplier Scorecard"
      description="Track supplier performance metrics"
      icon={BarChart2}
      color="#8B5CF6"
      category="Supplier Quality"
      features={[
        { title: 'Supplier Selection', description: 'Select supplier to review' },
        { title: 'Quality Metrics', description: 'Defect rates, NCRs' },
        { title: 'Delivery Metrics', description: 'On-time delivery' },
        { title: 'Service Metrics', description: 'Responsiveness' },
        { title: 'Overall Score', description: 'Combined rating' },
      ]}
    />
  );
}
