import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Wind } from 'lucide-react-native';

export default function RespiratoryProgramScreen() {
  return (
    <CompliancePlaceholder
      title="Respiratory Protection Program"
      description="Document respiratory protection program requirements"
      icon={Wind}
      color="#0EA5E9"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Written Program', description: 'Store respiratory protection program' },
        { title: 'Hazard Assessment', description: 'Document respiratory hazards' },
        { title: 'Respirator Selection', description: 'Track respirator assignments' },
        { title: 'Fit Test Records', description: 'Document annual fit testing' },
        { title: 'Medical Evaluations', description: 'Track medical clearances' },
      ]}
    />
  );
}
