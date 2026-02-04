import FinancePlaceholder from '@/components/FinancePlaceholder';
import { BarChart3 } from 'lucide-react-native';

export default function ManagementReportingScreen() {
  return (
    <FinancePlaceholder
      title="Management Reports"
      description="Custom financial reports for management decision-making and analysis."
      icon={BarChart3}
      color="#10B981"
      category="Financial Statements"
      features={[
        { title: 'Departmental P&L', description: 'Profit and loss by department or cost center' },
        { title: 'Custom Report Builder', description: 'Create tailored reports with drag-and-drop' },
        { title: 'KPI Dashboards', description: 'Visual dashboards with key metrics' },
        { title: 'Report Scheduling', description: 'Automated report generation and delivery' },
        { title: 'Comparative Analysis', description: 'Period-over-period comparisons' },
        { title: 'Export & Distribution', description: 'Share reports via email or portal' },
      ]}
    />
  );
}
