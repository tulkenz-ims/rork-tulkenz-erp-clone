import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Hash } from 'lucide-react-native';

export default function TariffClassificationScreen() {
  return (
    <CompliancePlaceholder
      title="Tariff Classification Record"
      description="Track HTS tariff classification for imported products"
      icon={Hash}
      color="#F59E0B"
      category="Import / Export Compliance"
      features={[
        { title: 'HTS Codes', description: 'Document product HTS codes' },
        { title: 'Classification Basis', description: 'Document classification rationale' },
        { title: 'Ruling Records', description: 'Store binding rulings' },
        { title: 'Duty Rates', description: 'Track applicable duty rates' },
        { title: 'Review Schedule', description: 'Monitor classification reviews' },
      ]}
    />
  );
}
