import FinancePlaceholder from '@/components/FinancePlaceholder';
import { ArrowUpDown } from 'lucide-react-native';

export default function FXManagementScreen() {
  return (
    <FinancePlaceholder
      title="FX Management"
      description="Foreign exchange rate management and currency hedging."
      icon={ArrowUpDown}
      color="#164E63"
      category="Cash Management"
      features={[
        { title: 'Exchange Rates', description: 'Maintain currency exchange rates' },
        { title: 'Rate Updates', description: 'Automatic rate feeds from providers' },
        { title: 'FX Transactions', description: 'Record currency conversions' },
        { title: 'Gain/Loss Tracking', description: 'Calculate realized and unrealized FX gains' },
        { title: 'Hedging Instruments', description: 'Track forward contracts and options' },
        { title: 'Exposure Reports', description: 'Analyze currency exposure' },
      ]}
    />
  );
}
