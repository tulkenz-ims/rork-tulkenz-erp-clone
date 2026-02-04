import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Percent } from 'lucide-react-native';

export default function DeductionsScreen() {
  return (
    <FinancePlaceholder
      title="Deductions"
      description="Manage employee deductions, benefits, and garnishments."
      icon={Percent}
      color="#2DD4BF"
      category="Payroll"
      features={[
        { title: 'Benefits Deductions', description: 'Health, dental, vision premiums' },
        { title: 'Retirement Deductions', description: '401k, pension contributions' },
        { title: 'Pre-Tax Deductions', description: 'FSA, HSA, transit benefits' },
        { title: 'Garnishments', description: 'Court-ordered wage garnishments' },
        { title: 'Child Support', description: 'Child support withholding' },
        { title: 'Voluntary Deductions', description: 'Union dues, charitable giving' },
      ]}
    />
  );
}
