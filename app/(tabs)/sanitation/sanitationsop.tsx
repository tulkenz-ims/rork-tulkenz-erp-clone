import { FileText } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function SanitationSOPScreen() {
  return (
    <SanitationPlaceholder
      title="Sanitation SOP Acknowledgment"
      description="Employee acknowledgment of sanitation procedures"
      icon={FileText}
      color="#A855F7"
      category="Training & Personnel"
      features={[
        { title: 'SOP Document', description: 'Standard operating procedure' },
        { title: 'Employee Review', description: 'Confirm SOP review' },
        { title: 'Understanding', description: 'Verify comprehension' },
        { title: 'Signature', description: 'Employee acknowledgment signature' },
        { title: 'Annual Review', description: 'Schedule re-acknowledgment' },
      ]}
    />
  );
}
