import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Leaf } from 'lucide-react-native';

export default function PhytosanitaryScreen() {
  return (
    <CompliancePlaceholder
      title="Phytosanitary Certificate"
      description="Track phytosanitary certificates for plant products"
      icon={Leaf}
      color="#22C55E"
      category="Import / Export Compliance"
      features={[
        { title: 'Certificate Records', description: 'Store phytosanitary certificates' },
        { title: 'Product Coverage', description: 'Document covered products' },
        { title: 'Origin Country', description: 'Track issuing country' },
        { title: 'Inspection Records', description: 'Document inspection results' },
        { title: 'Validity Period', description: 'Track certificate validity' },
      ]}
    />
  );
}
