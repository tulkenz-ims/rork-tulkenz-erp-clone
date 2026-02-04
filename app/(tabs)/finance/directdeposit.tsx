import FinancePlaceholder from '@/components/FinancePlaceholder';
import { CreditCard } from 'lucide-react-native';

export default function DirectDepositScreen() {
  return (
    <FinancePlaceholder
      title="Direct Deposit"
      description="Manage employee direct deposit and pay card setup."
      icon={CreditCard}
      color="#0F766E"
      category="Payroll"
      features={[
        { title: 'Bank Account Setup', description: 'Configure employee bank accounts' },
        { title: 'Split Deposits', description: 'Multiple account distributions' },
        { title: 'Pay Cards', description: 'Payroll debit card setup' },
        { title: 'ACH File Generation', description: 'Create NACHA files for banks' },
        { title: 'Prenote Processing', description: 'Verify account information' },
        { title: 'Deposit History', description: 'Track deposit transactions' },
      ]}
    />
  );
}
