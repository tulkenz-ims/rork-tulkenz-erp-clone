import FinancePlaceholder from '@/components/FinancePlaceholder';
import { TrendingUp } from 'lucide-react-native';

export default function FinancialRatiosScreen() {
  return (
    <FinancePlaceholder
      title="Financial Ratios"
      description="Key financial ratios and trend analysis for performance monitoring."
      icon={TrendingUp}
      color="#6EE7B7"
      category="Financial Statements"
      features={[
        { title: 'Liquidity Ratios', description: 'Current ratio, quick ratio, cash ratio' },
        { title: 'Profitability Ratios', description: 'Gross margin, net margin, ROA, ROE' },
        { title: 'Efficiency Ratios', description: 'Asset turnover, inventory turnover, DSO' },
        { title: 'Leverage Ratios', description: 'Debt-to-equity, interest coverage' },
        { title: 'Trend Analysis', description: 'Track ratios over time' },
        { title: 'Industry Benchmarks', description: 'Compare against industry standards' },
      ]}
    />
  );
}
