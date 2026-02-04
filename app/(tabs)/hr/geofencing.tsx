import { MapPin } from 'lucide-react-native';
import HRPlaceholder from '@/components/HRPlaceholder';

export default function GeofencingScreen() {
  return (
    <HRPlaceholder
      title="Geofencing / Location"
      description="Location-based time tracking and attendance verification using GPS geofencing."
      icon={MapPin}
      color="#EF4444"
      category="Time & Attendance"
      features={[
        { title: 'Geofence Zones', description: 'Define work location boundaries' },
        { title: 'Location Verification', description: 'Verify clock-in/out locations' },
        { title: 'Remote Work Tracking', description: 'Track off-site work locations' },
        { title: 'GPS History', description: 'View location audit trail' },
        { title: 'Privacy Controls', description: 'Configurable tracking settings' },
      ]}
    />
  );
}
