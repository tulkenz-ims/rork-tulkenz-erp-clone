import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Thermometer } from 'lucide-react-native';

export default function RefrigerantTrackingScreen() {
  return (
    <CompliancePlaceholder
      title="Refrigerant Tracking Log"
      description="Track refrigerant usage for EPA 608 compliance"
      icon={Thermometer}
      color="#3B82F6"
      category="Environmental Compliance (EPA)"
      features={[
        { title: 'Equipment Inventory', description: 'List refrigerant-containing equipment' },
        { title: 'Refrigerant Type', description: 'Document refrigerant types used' },
        { title: 'Service Records', description: 'Track service and leak repairs' },
        { title: 'Additions/Recoveries', description: 'Log refrigerant additions and recoveries' },
        { title: 'Technician Certification', description: 'Verify technician 608 certification' },
      ]}
    />
  );
}
