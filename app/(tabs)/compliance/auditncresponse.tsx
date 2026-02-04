import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { AlertTriangle } from 'lucide-react-native';

export default function AuditNCResponseScreen() {
  return (
    <CompliancePlaceholder
      title="Audit Non-Conformance Response"
      description="Document responses to audit non-conformances"
      icon={AlertTriangle}
      color="#EF4444"
      category="SQF / GFSI Certification"
      features={[
        { title: 'NC Description', description: 'Document non-conformance details' },
        { title: 'Root Cause', description: 'Identify root cause of NC' },
        { title: 'Corrective Action', description: 'Document corrective actions taken' },
        { title: 'Evidence', description: 'Attach supporting evidence' },
        { title: 'Response Timeline', description: 'Track response deadlines' },
      ]}
    />
  );
}
