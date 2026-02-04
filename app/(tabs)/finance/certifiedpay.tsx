import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Award } from 'lucide-react-native';

export default function CertifiedPayrollScreen() {
  return (
    <FinancePlaceholder
      title="Certified Payroll"
      description="Track prevailing wage and generate certified payroll reports."
      icon={Award}
      color="#5EEAD4"
      category="Payroll"
      features={[
        { title: 'Prevailing Wage Rates', description: 'Configure prevailing wage by trade' },
        { title: 'Project Tracking', description: 'Assign employees to projects' },
        { title: 'WH-347 Reports', description: 'Generate certified payroll reports' },
        { title: 'Fringe Benefits', description: 'Track fringe benefit payments' },
        { title: 'Compliance Monitoring', description: 'Ensure prevailing wage compliance' },
        { title: 'Audit Support', description: 'Documentation for audits' },
      ]}
    />
  );
}
