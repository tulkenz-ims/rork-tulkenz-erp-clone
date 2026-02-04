import { Shield } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function LifeInsuranceScreen() {
  return (
    <HRPlaceholder
      title="Life & Disability Insurance"
      description="Manage life insurance, short-term, and long-term disability coverage enrollments."
      icon={Shield}
      color="#831843"
      category="Benefits Administration"
      features={[
        { title: 'Life Insurance', description: 'Basic and supplemental coverage' },
        { title: 'AD&D Coverage', description: 'Accidental death benefits' },
        { title: 'Short-Term Disability', description: 'STD enrollment' },
        { title: 'Long-Term Disability', description: 'LTD coverage management' },
        { title: 'Evidence of Insurability', description: 'EOI requirements' },
      ]}
    />
  );
}
