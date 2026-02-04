import FinancePlaceholder from '@/components/FinancePlaceholder';
import { DollarSign } from 'lucide-react-native';

export default function CashPositionScreen() {
  return (
    <FinancePlaceholder
      title="Cash Position"
      description="Real-time dashboard showing cash position across all accounts."
      icon={DollarSign}
      color="#22D3EE"
      category="Cash Management"
      features={[
        { title: 'Daily Position', description: 'Current cash across all accounts' },
        { title: 'Incoming Cash', description: 'Expected receipts and deposits' },
        { title: 'Outgoing Cash', description: 'Scheduled payments and disbursements' },
        { title: 'Net Position', description: 'Calculate net cash position' },
        { title: 'Multi-Currency', description: 'View positions in multiple currencies' },
        { title: 'Historical Trends', description: 'Track cash position over time' },
      ]}
    />
  );
}
