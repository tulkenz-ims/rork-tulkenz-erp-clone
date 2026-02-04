import ProcurementPlaceholder from '@/components/ProcurementPlaceholder';
import { Users } from 'lucide-react-native';

export default function DiverseVendorsScreen() {
  return (
    <ProcurementPlaceholder
      title="Diverse Vendor Tracking"
      description="Track minority, women-owned, and diverse supplier programs"
      icon={Users}
      color="#A855F7"
      category="Vendor Management"
      features={[
        { title: 'Diversity Categories', description: 'Track MBE, WBE, SDVOB certifications' },
        { title: 'Certification Verification', description: 'Verify diverse vendor certifications' },
        { title: 'Spend Tracking', description: 'Track spend with diverse suppliers' },
        { title: 'Goal Setting', description: 'Set diversity spend targets' },
        { title: 'Compliance Reporting', description: 'Generate diversity spend reports' },
      ]}
    />
  );
}
