import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Gauge } from 'lucide-react-native';

export default function PSMDocumentationScreen() {
  return (
    <CompliancePlaceholder
      title="PSM Documentation"
      description="Process Safety Management documentation for ammonia systems"
      icon={Gauge}
      color="#6366F1"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Process Safety Info', description: 'Document process hazard information' },
        { title: 'PHA Records', description: 'Store process hazard analyses' },
        { title: 'Operating Procedures', description: 'Track operating procedures' },
        { title: 'Mechanical Integrity', description: 'Document MI program' },
        { title: 'MOC Records', description: 'Track management of change' },
      ]}
    />
  );
}
