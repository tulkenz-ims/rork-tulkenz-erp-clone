import FinancePlaceholder from '@/components/FinancePlaceholder';
import { Package } from 'lucide-react-native';

export default function ProductCostingScreen() {
  return (
    <FinancePlaceholder
      title="Product Costing"
      description="Calculate and track standard and actual product costs."
      icon={Package}
      color="#A78BFA"
      category="Cost Accounting"
      features={[
        { title: 'Standard Costs', description: 'Set standard costs for products' },
        { title: 'Actual Costs', description: 'Track actual production costs' },
        { title: 'Cost Components', description: 'Material, labor, overhead breakdown' },
        { title: 'Cost Variance', description: 'Analyze price and usage variances' },
        { title: 'Cost Rollup', description: 'Roll up costs through BOM' },
        { title: 'Cost Updates', description: 'Periodic standard cost updates' },
      ]}
    />
  );
}
