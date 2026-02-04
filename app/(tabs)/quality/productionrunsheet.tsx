import QualityPlaceholder from '@/components/QualityPlaceholder';
import { Activity } from 'lucide-react-native';

export default function ProductionRunSheetScreen() {
  return (
    <QualityPlaceholder
      title="Production Run Sheet"
      description="Document production run details"
      icon={Activity}
      color="#8B5CF6"
      category="Traceability"
      features={[
        { title: 'Run Information', description: 'Product, line, date, shift' },
        { title: 'Start/End Times', description: 'Production duration' },
        { title: 'Personnel', description: 'Operators and supervisors' },
        { title: 'Equipment Used', description: 'Equipment identification' },
        { title: 'Output Quantities', description: 'Good and reject counts' },
      ]}
    />
  );
}
