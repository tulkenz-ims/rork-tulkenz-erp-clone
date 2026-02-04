import QualityPlaceholder from '@/components/QualityPlaceholder';
import { FileText } from 'lucide-react-native';

export default function GlassRegisterScreen() {
  return (
    <QualityPlaceholder
      title="Glass & Brittle Plastic Register"
      description="Maintain register of glass and brittle plastic items"
      icon={FileText}
      color="#F59E0B"
      category="GMP & Hygiene"
      features={[
        { title: 'Item Inventory', description: 'List all glass/brittle items' },
        { title: 'Location', description: 'Item location in facility' },
        { title: 'Condition Check', description: 'Periodic condition review' },
        { title: 'Replacement', description: 'Track replacements' },
        { title: 'Audit Trail', description: 'History of changes' },
      ]}
    />
  );
}
