import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Settings } from 'lucide-react-native';

export default function PayrollConfigScreen() {
  return (
    <FinancePlaceholder
      title="Pay Configuration"
      description="Configure pay rates, schedules, and payroll rules."
      icon={Settings}
      color="#14B8A6"
      category="Payroll"
      features={[
        { title: 'Pay Schedules', description: 'Weekly, biweekly, semi-monthly, monthly' },
        { title: 'Pay Rates', description: 'Configure hourly and salary rates' },
        { title: 'Overtime Rules', description: 'Define overtime calculation rules' },
        { title: 'Shift Differentials', description: 'Configure shift premium pay' },
        { title: 'Pay Codes', description: 'Set up earnings and deduction codes' },
        { title: 'Tax Configuration', description: 'Federal, state, local tax setup' },
      ]}
    />
  );
}
