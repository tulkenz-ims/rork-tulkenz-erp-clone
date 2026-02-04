import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Landmark } from 'lucide-react-native';

export default function BankAccountsScreen() {
  return (
    <FinancePlaceholder
      title="Bank Accounts"
      description="Manage bank account setup, balances, and transaction feeds."
      icon={Landmark}
      color="#0891B2"
      category="Cash Management"
      features={[
        { title: 'Account Setup', description: 'Configure bank accounts and GL mapping' },
        { title: 'Balance Monitoring', description: 'Track real-time account balances' },
        { title: 'Bank Feeds', description: 'Import transactions from banks' },
        { title: 'Account Types', description: 'Checking, savings, money market accounts' },
        { title: 'Signatory Management', description: 'Track authorized signers' },
        { title: 'Bank Contact Info', description: 'Store bank contact details' },
      ]}
    />
  );
}
