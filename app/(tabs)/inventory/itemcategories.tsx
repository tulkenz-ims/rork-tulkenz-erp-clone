import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { Layers } from 'lucide-react-native';

export default function ItemCategoriesScreen() {
  return (
    <InventoryPlaceholder
      title="Item Categories"
      description="Organize items into hierarchical categories for better management"
      icon={Layers}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Category Hierarchy', description: 'Create multi-level category structures' },
        { title: 'Category Attributes', description: 'Define category-specific attributes' },
        { title: 'Bulk Categorization', description: 'Assign multiple items to categories at once' },
        { title: 'Category Reports', description: 'Generate reports by category breakdown' },
      ]}
    />
  );
}
