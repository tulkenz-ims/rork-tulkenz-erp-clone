import FinancePlaceholder from '@/components/FinancePlaceholder';
import { BarChart2 } from 'lucide-react-native';

export default function ProfitabilityScreen() {
  return (
    <FinancePlaceholder
      title="Profitability Analysis"
      description="Analyze profitability by product, customer, and channel."
      icon={BarChart2}
      color="#5B21B6"
      category="Cost Accounting"
      features={[
        { title: 'Product Profitability', description: 'Margin analysis by product' },
        { title: 'Customer Profitability', description: 'Profit contribution by customer' },
        { title: 'Channel Analysis', description: 'Profitability by sales channel' },
        { title: 'Gross Margin Analysis', description: 'Detailed margin breakdowns' },
        { title: 'Contribution Margin', description: 'Variable cost contribution' },
        { title: 'Trend Analysis', description: 'Track profitability trends' },
      ]}
    />
  );
}
