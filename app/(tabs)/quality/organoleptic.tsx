import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Coffee } from 'lucide-react-native';

export default function OrganolepticScreen() {
  return (
    <QualityPlaceholder
      title="Organoleptic (Taste/Smell) Evaluation"
      description="Document sensory evaluation of products"
      icon={Coffee}
      color="#8B5CF6"
      category="In-Process Quality"
      features={[
        { title: 'Product Sample', description: 'Identify sample being evaluated' },
        { title: 'Appearance Rating', description: 'Score visual appearance' },
        { title: 'Aroma Rating', description: 'Score smell/aroma' },
        { title: 'Taste Rating', description: 'Score taste and flavor' },
        { title: 'Texture Rating', description: 'Score texture and mouthfeel' },
        { title: 'Overall Acceptance', description: 'Accept/reject decision' },
      ]}
    />
  );
}
