import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Gauge } from 'lucide-react-native';

export default function BoilerInspectionScreen() {
  return (
    <CompliancePlaceholder
      title="Boiler/Pressure Vessel Inspection"
      description="Track boiler and pressure vessel inspection certificates"
      icon={Gauge}
      color="#F59E0B"
      category="State & Local Permits"
      features={[
        { title: 'Equipment Inventory', description: 'List registered equipment' },
        { title: 'Inspection Certificates', description: 'Store current certificates' },
        { title: 'Expiration Dates', description: 'Track certificate expiration' },
        { title: 'Inspector Information', description: 'Document inspector details' },
        { title: 'Findings', description: 'Track inspection findings' },
      ]}
    />
  );
}
