import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { CloudRain } from 'lucide-react-native';

export default function StormwaterPlanScreen() {
  return (
    <CompliancePlaceholder
      title="Stormwater Pollution Prevention Plan"
      description="Document SWPPP compliance and best management practices"
      icon={CloudRain}
      color="#6366F1"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Plan Documentation', description: 'Store current SWPPP document' },
        { title: 'Site Map', description: 'Document drainage areas and outfalls' },
        { title: 'BMPs', description: 'Track best management practices' },
        { title: 'Inspection Records', description: 'Document routine inspections' },
        { title: 'Annual Reports', description: 'Track annual report submissions' },
      ]}
    />
  );
}
