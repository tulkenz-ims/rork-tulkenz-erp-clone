import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { GitBranch } from 'lucide-react-native';

export default function LotGenealogyScreen() {
  return (
    <InventoryPlaceholder
      title="Lot Genealogy"
      description="Track parent-child relationships between lots"
      icon={GitBranch}
      color="#8B5CF6"
      category="Tracking & Traceability"
      features={[
        { title: 'Parent-Child Links', description: 'Link parent and child lots' },
        { title: 'Genealogy Tree', description: 'View lot genealogy tree' },
        { title: 'Source Tracking', description: 'Track lot sources' },
        { title: 'Genealogy Reports', description: 'Generate genealogy reports' },
      ]}
    />
  );
}
