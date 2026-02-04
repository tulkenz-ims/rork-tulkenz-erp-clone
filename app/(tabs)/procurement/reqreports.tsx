import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { BarChart3 } from 'lucide-react-native';

export default function ReqReportsScreen() {
  return (
    <ProcurementPlaceholder
      title="Requisition Reports"
      description="Analytics and reporting for purchase requisitions"
      icon={BarChart3}
      color="#EC4899"
      category="Requisitions"
      features={[
        { title: 'Volume Analysis', description: 'Track requisition volumes by department and time' },
        { title: 'Approval Metrics', description: 'Measure approval cycle times and bottlenecks' },
        { title: 'Spend Trends', description: 'Analyze spending patterns and trends' },
        { title: 'Custom Reports', description: 'Build custom reports with filters' },
        { title: 'Export Options', description: 'Export reports to Excel, PDF, or CSV' },
      ]}
    />
  );
}
