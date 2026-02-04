import InventoryPlaceholder from '@/components/InventoryPlaceholder';
import { FileText } from 'lucide-react-native';

export default function InventoryValueScreen() {
  return (
    <InventoryPlaceholder
      title="Inventory Value Report"
      description="Detailed inventory value reports and analysis"
      icon={FileText}
      color="#EF4444"
      category="Inventory Valuation"
      features={[
        { title: 'Value Reports', description: 'Generate value reports' },
        { title: 'Detail Levels', description: 'Summary and detail views' },
        { title: 'Export Options', description: 'Export to Excel/PDF' },
        { title: 'Scheduled Reports', description: 'Schedule report generation' },
      ]}
    />
  );
}
