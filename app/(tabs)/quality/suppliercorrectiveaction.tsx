import QualityPlaceholder from '@/components/QualityPlaceholder';
import { AlertCircle } from 'lucide-react-native';

export default function SupplierCorrectiveActionScreen() {
  return (
    <QualityPlaceholder
      title="Supplier Corrective Action Request"
      description="Issue and track supplier corrective action requests"
      icon={AlertCircle}
      color="#EF4444"
      category="Receiving & Supplier"
      features={[
        { title: 'Supplier Selection', description: 'Select supplier for SCAR' },
        { title: 'Issue Description', description: 'Document non-conformance' },
        { title: 'Root Cause Request', description: 'Request supplier root cause' },
        { title: 'Corrective Action', description: 'Document supplier response' },
        { title: 'Verification', description: 'Verify effectiveness of action' },
      ]}
    />
  );
}
