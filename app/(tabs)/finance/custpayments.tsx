import FinancePlaceholder from '@/components/FinancePlaceholder';
import { HandCoins } from 'lucide-react-native';

export default function CustomerPaymentsScreen() {
  return (
    <FinancePlaceholder
      title="Customer Payments"
      description="Record and apply customer payments to open invoices."
      icon={HandCoins}
      color="#1E40AF"
      category="Accounts Receivable"
      features={[
        { title: 'Payment Entry', description: 'Record customer payments' },
        { title: 'Auto-Match', description: 'Automatically match payments to invoices' },
        { title: 'Payment Application', description: 'Apply payments to specific invoices' },
        { title: 'Deposit Batching', description: 'Group payments for bank deposit' },
        { title: 'Unapplied Payments', description: 'Track payments pending application' },
        { title: 'Payment History', description: 'View customer payment history' },
      ]}
    />
  );
}
