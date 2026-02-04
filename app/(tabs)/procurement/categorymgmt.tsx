import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Folder } from 'lucide-react-native';

export default function CategoryMgmtScreen() {
  return (
    <ProcurementPlaceholder
      title="Category Management"
      description="Strategic management of procurement categories"
      icon={Folder}
      color="#06B6D4"
      category="Strategic Sourcing"
      features={[
        { title: 'Category Structure', description: 'Define procurement category hierarchy' },
        { title: 'Category Strategies', description: 'Develop category-level strategies' },
        { title: 'Preferred Vendors', description: 'Assign preferred vendors by category' },
        { title: 'Commodity Tracking', description: 'Track commodity prices and trends' },
        { title: 'Category Reports', description: 'Category performance analytics' },
      ]}
    />
  );
}
