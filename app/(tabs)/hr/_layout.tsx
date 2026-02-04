import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function HRLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Human Resources',
        }}
      />
      <Stack.Screen name="orghierarchy" options={{ title: 'Organizational Hierarchy' }} />
      <Stack.Screen name="positions" options={{ title: 'Position Management' }} />
      <Stack.Screen name="departments" options={{ title: 'Department Management' }} />
      <Stack.Screen name="orgchart" options={{ title: 'Org Chart' }} />
      <Stack.Screen name="scheduling" options={{ title: 'Shift Scheduling' }} />
      <Stack.Screen name="pto" options={{ title: 'PTO / Leave Requests' }} />
      <Stack.Screen name="accruals" options={{ title: 'Accrual Management' }} />
      <Stack.Screen name="geofencing" options={{ title: 'Geofencing / Location' }} />
      <Stack.Screen name="requisitions" options={{ title: 'Job Requisitions' }} />
      <Stack.Screen name="jobpostings" options={{ title: 'Job Postings' }} />
      <Stack.Screen name="interviews" options={{ title: 'Interview Management' }} />
      <Stack.Screen name="offers" options={{ title: 'Offer Management' }} />
      <Stack.Screen name="bgchecks" options={{ title: 'Background Checks' }} />
      <Stack.Screen name="talentpool" options={{ title: 'Talent Pool' }} />
      <Stack.Screen name="newhireforms" options={{ title: 'New Hire Forms' }} />
      <Stack.Screen name="equipmentassign" options={{ title: 'Equipment Assignment' }} />
      <Stack.Screen name="systemaccess" options={{ title: 'System Access Requests' }} />
      <Stack.Screen name="orientation" options={{ title: 'Orientation Scheduling' }} />
      <Stack.Screen name="probation" options={{ title: 'Probation Tracking' }} />
      <Stack.Screen name="equipmentreturn" options={{ title: 'Equipment Return' }} />
      <Stack.Screen name="accessrevoke" options={{ title: 'Access Revocation' }} />
      <Stack.Screen name="finalpay" options={{ title: 'Final Pay Calculation' }} />
      <Stack.Screen name="rehireelig" options={{ title: 'Rehire Eligibility' }} />
      <Stack.Screen name="360feedback" options={{ title: '360-Degree Feedback' }} />
      <Stack.Screen name="pip" options={{ title: 'Performance Improvement' }} />
      <Stack.Screen name="recognition" options={{ title: 'Recognition & Kudos' }} />
      <Stack.Screen name="careerpath" options={{ title: 'Career Pathing' }} />
      <Stack.Screen name="coursecatalog" options={{ title: 'Course Catalog' }} />
      <Stack.Screen name="certifications" options={{ title: 'Certification Tracking' }} />
      <Stack.Screen name="compliancetraining" options={{ title: 'Compliance Training' }} />
      <Stack.Screen name="ilt" options={{ title: 'Instructor-Led Training' }} />
      <Stack.Screen name="skillsinventory" options={{ title: 'Skills Inventory' }} />
      <Stack.Screen name="dependents" options={{ title: 'Dependent Management' }} />
      <Stack.Screen name="hsa" options={{ title: 'HSA / FSA Administration' }} />
      <Stack.Screen name="401k" options={{ title: '401(k) Management' }} />
      <Stack.Screen name="cobra" options={{ title: 'COBRA Administration' }} />
      <Stack.Screen name="lifeinsurance" options={{ title: 'Life & Disability' }} />
      <Stack.Screen name="ada" options={{ title: 'ADA Accommodations' }} />
      <Stack.Screen name="aca" options={{ title: 'ACA Compliance' }} />
      <Stack.Screen name="hrcase" options={{ title: 'HR Case Management' }} />
      <Stack.Screen name="policyack" options={{ title: 'Policy Acknowledgments' }} />
      <Stack.Screen name="laborlaw" options={{ title: 'Labor Law Compliance' }} />
      <Stack.Screen name="announcements" options={{ title: 'Announcements' }} />
      <Stack.Screen name="celebrations" options={{ title: 'Milestones & Celebrations' }} />
      <Stack.Screen name="peerrecognition" options={{ title: 'Peer Recognition' }} />
      <Stack.Screen name="referrals" options={{ title: 'Employee Referrals' }} />
      <Stack.Screen name="suggestions" options={{ title: 'Suggestion Box' }} />
      <Stack.Screen name="timeadjustments" options={{ title: 'Time Adjustment Requests' }} />
      <Stack.Screen name="breakviolations" options={{ title: 'Break Violations' }} />
      <Stack.Screen name="timeeditor" options={{ title: 'Employee Time Editor' }} />
    </Stack>
  );
}
