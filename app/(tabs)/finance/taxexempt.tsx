import FinancePlaceholder from '@/components/FinancePlaceholder';
import { FileQuestion } from 'lucide-react-native';

export default function TaxExemptionsScreen() {
  return (
    <FinancePlaceholder
      title="Tax Exemptions"
      description="Manage tax exemption certificates and tracking."
      icon={FileQuestion}
      color="#EC4899"
      category="Tax Management"
      features={[
        { title: 'Certificate Collection', description: 'Collect exemption certificates' },
        { title: 'Certificate Storage', description: 'Digital document management' },
        { title: 'Expiration Tracking', description: 'Monitor certificate expiration' },
        { title: 'Renewal Alerts', description: 'Notify before certificates expire' },
        { title: 'Exemption Types', description: 'Resale, manufacturing, non-profit' },
        { title: 'Audit Support', description: 'Certificate retrieval for audits' },
      ]}
    />
  );
}
