import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { BarChart2 } from 'lucide-react-native';

export default function VendorScorecardScreen() {
  return (
    <ProcurementPlaceholder
      title="Vendor Scorecards"
      description="Track and measure vendor performance metrics"
      icon={BarChart2}
      color="#06B6D4"
      category="Vendor Management"
      features={[
        { title: 'Performance Metrics', description: 'Track quality, delivery, and price metrics' },
        { title: 'Scorecard Templates', description: 'Create standardized scorecard templates' },
        { title: 'Trend Analysis', description: 'View performance trends over time' },
        { title: 'Comparative Analysis', description: 'Compare vendors side by side' },
        { title: 'Action Plans', description: 'Create improvement action plans' },
      ]}
    />
  );
}
