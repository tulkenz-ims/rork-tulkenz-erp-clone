import CompliancePlaceholder from '@/components/CompliancePlaceholder';
import { Truck } from 'lucide-react-native';

export default function ShippingKDEScreen() {
  return (
    <CompliancePlaceholder
      title="Shipping KDE Record"
      description="Document Key Data Elements for shipping Critical Tracking Events"
      icon={Truck}
      color="#3B82F6"
      category="FSMA 204 / Traceability"
      features={[
        { title: 'Customer Information', description: 'Document immediate subsequent recipient' },
        { title: 'Ship Date/Time', description: 'Record shipment date and time' },
        { title: 'Product & Lot Info', description: 'Capture product description and lot codes' },
        { title: 'Quantity Shipped', description: 'Document quantity and unit of measure' },
        { title: 'Reference Documents', description: 'Link to BOL, invoice, or shipping docs' },
      ]}
    />
  );
}
