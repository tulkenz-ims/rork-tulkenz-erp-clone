import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Briefcase } from 'lucide-react-native';

export default function TreasuryScreen() {
  return (
    <FinancePlaceholder
      title="Treasury"
      description="Manage debt, investments, and treasury operations."
      icon={Briefcase}
      color="#155E75"
      category="Cash Management"
      features={[
        { title: 'Debt Management', description: 'Track loans and credit facilities' },
        { title: 'Investment Tracking', description: 'Monitor short-term investments' },
        { title: 'Interest Calculations', description: 'Calculate interest income and expense' },
        { title: 'Line of Credit', description: 'Manage revolving credit lines' },
        { title: 'Covenant Tracking', description: 'Monitor debt covenant compliance' },
        { title: 'Maturity Calendar', description: 'Track debt maturity dates' },
      ]}
    />
  );
}
