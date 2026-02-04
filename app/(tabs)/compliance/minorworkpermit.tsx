import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Baby } from 'lucide-react-native';

export default function MinorWorkPermitScreen() {
  return (
    <CompliancePlaceholder
      title="Minor Work Permit"
      description="Track work permits for minor employees"
      icon={Baby}
      color="#F59E0B"
      category="Labor / Employment Compliance"
      features={[
        { title: 'Permit Documentation', description: 'Store work permit copies' },
        { title: 'Age Verification', description: 'Document age verification' },
        { title: 'Hour Restrictions', description: 'Track work hour limitations' },
        { title: 'Job Restrictions', description: 'Document prohibited tasks' },
        { title: 'School Verification', description: 'Track school attendance' },
      ]}
    />
  );
}
