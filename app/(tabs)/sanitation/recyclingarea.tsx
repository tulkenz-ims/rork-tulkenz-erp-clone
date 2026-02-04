import { Recycle } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function RecyclingAreaScreen() {
  return (
    <SanitationPlaceholder
      title="Recycling Area Cleaning"
      description="Cleaning log for recycling collection areas"
      icon={Recycle}
      color="#6366F1"
      category="Waste & Trash Management"
      features={[
        { title: 'Bin Cleaning', description: 'Clean recycling bins' },
        { title: 'Sorting Area', description: 'Clean sorting area if applicable' },
        { title: 'Contamination Check', description: 'Remove contaminated items' },
        { title: 'Signage', description: 'Verify recycling signs are clean' },
        { title: 'Floor Cleaning', description: 'Clean surrounding floor area' },
      ]}
    />
  );
}
