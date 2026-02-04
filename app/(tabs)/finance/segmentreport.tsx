import FinancePlaceholder from '@/components/FinancePlaceholder';
import { PieChart } from 'lucide-react-native';

export default function SegmentReportingScreen() {
  return (
    <FinancePlaceholder
      title="Segment Reporting"
      description="Financial analysis by business segment, geography, or product line."
      icon={PieChart}
      color="#34D399"
      category="Financial Statements"
      features={[
        { title: 'Segment Definition', description: 'Define reporting segments for your business' },
        { title: 'Revenue by Segment', description: 'Track revenue across segments' },
        { title: 'Expense Allocation', description: 'Allocate expenses to segments' },
        { title: 'Profitability Analysis', description: 'Segment-level profit margins' },
        { title: 'Inter-Segment Eliminations', description: 'Handle internal transactions' },
        { title: 'GAAP Compliance', description: 'Meet segment reporting requirements' },
      ]}
    />
  );
}
