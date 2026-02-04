import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Award } from 'lucide-react-native';

export default function SQFPractitionerScreen() {
  return (
    <CompliancePlaceholder
      title="SQF Practitioner Designation"
      description="Document SQF Practitioner qualifications and responsibilities"
      icon={Award}
      color="#F59E0B"
      category="SQF / GFSI Certification"
      features={[
        { title: 'Practitioner Info', description: 'Document practitioner name and role' },
        { title: 'Training Records', description: 'Track SQF practitioner training' },
        { title: 'HACCP Certification', description: 'Document HACCP certification' },
        { title: 'Responsibilities', description: 'Define practitioner responsibilities' },
        { title: 'Backup Personnel', description: 'Identify backup practitioners' },
      ]}
    />
  );
}
