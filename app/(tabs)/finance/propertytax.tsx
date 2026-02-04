import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Home } from 'lucide-react-native';

export default function PropertyTaxScreen() {
  return (
    <FinancePlaceholder
      title="Property Tax"
      description="Track property tax assessments, payments, and appeals."
      icon={Home}
      color="#9D174D"
      category="Tax Management"
      features={[
        { title: 'Property Records', description: 'Track taxable properties' },
        { title: 'Assessment Tracking', description: 'Monitor assessed values' },
        { title: 'Payment Calendar', description: 'Schedule tax payments' },
        { title: 'Payment Processing', description: 'Record and track payments' },
        { title: 'Appeal Management', description: 'Track assessment appeals' },
        { title: 'Accrual Entries', description: 'Monthly property tax accruals' },
      ]}
    />
  );
}
