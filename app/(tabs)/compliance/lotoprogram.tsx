import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Lock } from 'lucide-react-native';

export default function LOTOProgramScreen() {
  return (
    <CompliancePlaceholder
      title="Written LOTO Program"
      description="Document lockout/tagout program for hazardous energy control"
      icon={Lock}
      color="#EF4444"
      category="OSHA Regulatory Compliance"
      features={[
        { title: 'Program Documentation', description: 'Store written LOTO procedures' },
        { title: 'Equipment Procedures', description: 'Machine-specific LOTO procedures' },
        { title: 'Authorized Employees', description: 'List of authorized LOTO personnel' },
        { title: 'Annual Review', description: 'Track annual program review' },
        { title: 'Training Records', description: 'Document LOTO training' },
      ]}
    />
  );
}
