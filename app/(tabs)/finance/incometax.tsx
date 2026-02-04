import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Coins } from 'lucide-react-native';

export default function IncomeTaxScreen() {
  return (
    <FinancePlaceholder
      title="Income Tax"
      description="Manage income tax provisions and estimated tax payments."
      icon={Coins}
      color="#831843"
      category="Tax Management"
      features={[
        { title: 'Tax Provision', description: 'Calculate income tax provision' },
        { title: 'Estimated Payments', description: 'Track quarterly estimated taxes' },
        { title: 'Deferred Taxes', description: 'Manage deferred tax assets/liabilities' },
        { title: 'Book vs Tax', description: 'Track book-tax differences' },
        { title: 'Tax Return Support', description: 'Data for tax return preparation' },
        { title: 'Effective Rate', description: 'Calculate effective tax rate' },
      ]}
    />
  );
}
