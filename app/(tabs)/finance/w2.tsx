import FinancePlaceholder from '@/components/FinancePlaceholder';
import { FileCheck } from 'lucide-react-native';

export default function W2ProcessingScreen() {
  return (
    <FinancePlaceholder
      title="W-2 Processing"
      description="Generate and distribute annual W-2 forms to employees."
      icon={FileCheck}
      color="#134E4A"
      category="Payroll"
      features={[
        { title: 'W-2 Generation', description: 'Create W-2 forms for all employees' },
        { title: 'Data Verification', description: 'Verify wages and withholdings' },
        { title: 'Electronic Filing', description: 'Submit W-2s to SSA electronically' },
        { title: 'Employee Distribution', description: 'Print or email W-2s to employees' },
        { title: 'Corrections', description: 'Process W-2c corrections' },
        { title: 'Year-End Reconciliation', description: 'Reconcile annual totals' },
      ]}
    />
  );
}
