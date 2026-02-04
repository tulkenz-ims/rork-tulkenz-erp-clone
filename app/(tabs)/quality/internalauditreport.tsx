import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileText } from 'lucide-react-native';

export default function InternalAuditReportScreen() {
  return (
    <QualityPlaceholder
      title="Internal Audit Report"
      description="Document internal audit findings and conclusions"
      icon={FileText}
      color="#10B981"
      category="Audit"
      features={[
        { title: 'Audit Details', description: 'Date, scope, auditor' },
        { title: 'Executive Summary', description: 'Overview of findings' },
        { title: 'Non-Conformances', description: 'List of findings' },
        { title: 'Observations', description: 'Opportunities for improvement' },
        { title: 'Recommendations', description: 'Suggested actions' },
      ]}
    />
  );
}
