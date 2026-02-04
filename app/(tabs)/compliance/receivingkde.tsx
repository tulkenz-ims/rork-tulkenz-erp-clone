import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { PackageOpen } from 'lucide-react-native';

export default function ReceivingKDEScreen() {
  return (
    <CompliancePlaceholder
      title="Receiving KDE Record"
      description="Document Key Data Elements for receiving Critical Tracking Events"
      icon={PackageOpen}
      color="#F59E0B"
      category="FSMA 204 / Traceability"
      features={[
        { title: 'Supplier Information', description: 'Document immediate previous source' },
        { title: 'Receiving Date/Time', description: 'Record receipt date and time' },
        { title: 'Product & Lot Info', description: 'Capture product description and lot codes' },
        { title: 'Quantity Received', description: 'Document quantity and unit of measure' },
        { title: 'Reference Documents', description: 'Link to BOL, invoice, or PO' },
      ]}
    />
  );
}
