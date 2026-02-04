import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Shield } from 'lucide-react-native';

export default function EVerifyDocScreen() {
  return (
    <CompliancePlaceholder
      title="E-Verify Documentation"
      description="Document E-Verify case submissions and results"
      icon={Shield}
      color="#3B82F6"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Case Numbers', description: 'Track E-Verify case numbers' },
        { title: 'Submission Dates', description: 'Document case submission dates' },
        { title: 'Results', description: 'Record verification results' },
        { title: 'TNC Resolution', description: 'Track TNC case resolutions' },
        { title: 'Compliance Reports', description: 'Generate compliance reports' },
      ]}
    />
  );
}
