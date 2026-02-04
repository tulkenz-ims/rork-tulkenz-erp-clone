import QualityPlaceholder from '@/components/QualityPlaceholder';
import { HelpCircle } from 'lucide-react-native';

export default function FiveWhysScreen() {
  return (
    <QualityPlaceholder
      title="5 Whys Worksheet"
      description="Structured 5 Whys root cause analysis worksheet"
      icon={HelpCircle}
      color="#14B8A6"
      category="Non-Conformance"
      features={[
        { title: 'Problem Statement', description: 'Define the initial problem' },
        { title: 'Why 1', description: 'First level why question and answer' },
        { title: 'Why 2', description: 'Second level why question and answer' },
        { title: 'Why 3', description: 'Third level why question and answer' },
        { title: 'Why 4', description: 'Fourth level why question and answer' },
        { title: 'Why 5', description: 'Fifth level - root cause identified' },
      ]}
    />
  );
}
