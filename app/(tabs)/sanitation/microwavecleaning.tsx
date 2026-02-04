import { Microwave } from 'lucide-react-native';
import SanitationPlaceholder from '@/components/SanitationPlaceholder';

export default function MicrowaveCleaningScreen() {
  return (
    <SanitationPlaceholder
      title="Microwave/Appliance Cleaning"
      description="Cleaning log for break room microwaves and appliances"
      icon={Microwave}
      color="#F59E0B"
      category="Break Room / Locker Room"
      features={[
        { title: 'Microwave Interior', description: 'Clean interior surfaces and turntable' },
        { title: 'Microwave Exterior', description: 'Wipe down exterior and controls' },
        { title: 'Coffee Maker', description: 'Clean and descale coffee equipment' },
        { title: 'Toaster/Other', description: 'Clean other small appliances' },
        { title: 'Sanitization', description: 'Sanitize high-touch surfaces' },
      ]}
    />
  );
}
