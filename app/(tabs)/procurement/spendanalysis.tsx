import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { PieChart } from 'lucide-react-native';

export default function SpendAnalysisScreen() {
  return (
    <ProcurementPlaceholder
      title="Spend Analysis"
      description="Analyze procurement spending patterns and opportunities"
      icon={PieChart}
      color="#EC4899"
      category="Strategic Sourcing"
      features={[
        { title: 'Spend by Category', description: 'Analyze spending by category' },
        { title: 'Spend by Vendor', description: 'Track spending with each vendor' },
        { title: 'Spend by Department', description: 'View departmental procurement' },
        { title: 'Savings Tracking', description: 'Track realized cost savings' },
        { title: 'Opportunity Analysis', description: 'Identify consolidation opportunities' },
      ]}
    />
  );
}
