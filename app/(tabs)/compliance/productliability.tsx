import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Package } from 'lucide-react-native';

export default function ProductLiabilityScreen() {
  return (
    <CompliancePlaceholder
      title="Product Liability Insurance"
      description="Track product liability insurance certificate and coverage"
      icon={Package}
      color="#10B981"
      category="Insurance & Liability"
      features={[
        { title: 'Policy Details', description: 'Document policy information' },
        { title: 'Coverage Limits', description: 'Track liability limits' },
        { title: 'Certificate', description: 'Store current certificate' },
        { title: 'Renewal Tracking', description: 'Monitor expiration dates' },
        { title: 'Claims History', description: 'Track claims if any' },
      ]}
    />
  );
}
