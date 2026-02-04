import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Calculator } from 'lucide-react-native';

export default function PayrollTaxScreen() {
  return (
    <FinancePlaceholder
      title="Payroll Taxes"
      description="Calculate and manage payroll tax withholding and deposits."
      icon={Calculator}
      color="#115E59"
      category="Payroll"
      features={[
        { title: 'Tax Calculation', description: 'Federal, state, local tax calculations' },
        { title: 'FICA Taxes', description: 'Social Security and Medicare' },
        { title: 'Tax Deposits', description: 'Schedule and track tax deposits' },
        { title: 'Quarterly Returns', description: 'Form 941 preparation' },
        { title: 'State Unemployment', description: 'SUTA tax management' },
        { title: 'Tax Liability', description: 'Monitor tax liability balances' },
      ]}
    />
  );
}
