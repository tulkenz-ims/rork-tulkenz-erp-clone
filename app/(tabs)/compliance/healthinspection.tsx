import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Stethoscope } from 'lucide-react-native';

export default function HealthInspectionScreen() {
  return (
    <CompliancePlaceholder
      title="Health Department Inspection"
      description="Track health department inspection records and scores"
      icon={Stethoscope}
      color="#0EA5E9"
      category="State & Local Permits"
      features={[
        { title: 'Inspection Reports', description: 'Store inspection reports' },
        { title: 'Scores/Grades', description: 'Track inspection scores' },
        { title: 'Violations', description: 'Document any violations' },
        { title: 'Corrective Actions', description: 'Track violation corrections' },
        { title: 'Inspection Schedule', description: 'Monitor inspection frequency' },
      ]}
    />
  );
}
