import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Percent } from 'lucide-react-native';

export default function SalesTaxScreen() {
  return (
    <FinancePlaceholder
      title="Sales Tax"
      description="Calculate, track, and file sales tax returns."
      icon={Percent}
      color="#DB2777"
      category="Tax Management"
      features={[
        { title: 'Tax Rate Setup', description: 'Configure rates by jurisdiction' },
        { title: 'Tax Calculation', description: 'Automatic tax on transactions' },
        { title: 'Tax Collection', description: 'Track collected sales tax' },
        { title: 'Filing Schedules', description: 'Monthly, quarterly, annual filings' },
        { title: 'Return Preparation', description: 'Generate sales tax returns' },
        { title: 'Payment Processing', description: 'Remit taxes to authorities' },
      ]}
    />
  );
}
