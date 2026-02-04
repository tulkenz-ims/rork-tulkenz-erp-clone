import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { FileText } from 'lucide-react-native';

export default function ItemSpecsScreen() {
  return (
    <InventoryPlaceholder
      title="Item Specifications"
      description="Define detailed item specifications and technical requirements"
      icon={FileText}
      color="#3B82F6"
      category="Item Master"
      features={[
        { title: 'Technical Specs', description: 'Define technical specifications' },
        { title: 'Spec Templates', description: 'Create specification templates by category' },
        { title: 'Spec Documents', description: 'Attach specification documents' },
        { title: 'Spec Versioning', description: 'Track specification changes' },
      ]}
    />
  );
}
