import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { FlaskConical } from 'lucide-react-native';

export default function HazComProgramScreen() {
  return (
    <CompliancePlaceholder
      title="Hazard Communication Program"
      description="Document hazard communication program and chemical safety"
      icon={FlaskConical}
      color="#8B5CF6"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Written Program', description: 'Store HazCom written program' },
        { title: 'Chemical Inventory', description: 'List of hazardous chemicals' },
        { title: 'SDS Management', description: 'Track SDS availability' },
        { title: 'Label Compliance', description: 'Document labeling procedures' },
        { title: 'Training Records', description: 'Track HazCom training' },
      ]}
    />
  );
}
