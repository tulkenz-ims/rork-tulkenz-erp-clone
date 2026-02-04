import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { AlertCircle } from 'lucide-react-native';

export default function ImportAlertScreen() {
  return (
    <CompliancePlaceholder
      title="Import Alert Monitoring"
      description="Track FDA import alerts affecting suppliers and products"
      icon={AlertCircle}
      color="#EF4444"
      category="Import / Export Compliance"
      features={[
        { title: 'Alert Monitoring', description: 'Track relevant import alerts' },
        { title: 'Supplier Impact', description: 'Identify affected suppliers' },
        { title: 'Product Impact', description: 'Track affected products' },
        { title: 'Risk Assessment', description: 'Document risk evaluations' },
        { title: 'Action Items', description: 'Track required actions' },
      ]}
    />
  );
}
