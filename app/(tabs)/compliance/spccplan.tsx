import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Fuel } from 'lucide-react-native';

export default function SPCCPlanScreen() {
  return (
    <CompliancePlaceholder
      title="Spill Prevention Control Plan"
      description="Document SPCC plan for oil storage and spill prevention"
      icon={Fuel}
      color="#F59E0B"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Plan Documentation', description: 'Store current SPCC plan' },
        { title: 'Tank Inventory', description: 'List oil storage tanks and capacity' },
        { title: 'Secondary Containment', description: 'Document containment measures' },
        { title: 'Inspection Records', description: 'Track tank inspections' },
        { title: 'Training Records', description: 'Document spill response training' },
      ]}
    />
  );
}
