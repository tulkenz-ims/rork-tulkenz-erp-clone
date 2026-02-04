import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { MapPin } from 'lucide-react-native';

export default function ZoningPermitScreen() {
  return (
    <CompliancePlaceholder
      title="Zoning/Occupancy Permit"
      description="Track zoning compliance and occupancy permits"
      icon={MapPin}
      color="#3B82F6"
      category="State & Local Permits"
      features={[
        { title: 'Zoning Classification', description: 'Document zoning designation' },
        { title: 'Permitted Use', description: 'Track approved uses' },
        { title: 'Occupancy Limits', description: 'Document occupancy capacity' },
        { title: 'Variance Records', description: 'Track any variances granted' },
        { title: 'Permit Status', description: 'Monitor permit validity' },
      ]}
    />
  );
}
