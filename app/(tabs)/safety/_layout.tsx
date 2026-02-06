import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function SafetyLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Safety',
          headerShown: true,
        }} 
      />
      {/* Permit to Work / Job Safety Forms */}
      <Stack.Screen name="lotoprogram" options={{ title: 'LOTO Program' }} />
      <Stack.Screen name="permittowork" options={{ title: 'Permit to Work' }} />
      <Stack.Screen name="lotopermit" options={{ title: 'LOTO Permit' }} />
      <Stack.Screen name="confinedspace" options={{ title: 'Confined Space Entry' }} />
      <Stack.Screen name="hotwork" options={{ title: 'Hot Work Permit' }} />
      <Stack.Screen name="fallprotection" options={{ title: 'Fall Protection Permit' }} />
      <Stack.Screen name="electricalsafework" options={{ title: 'Electrical Safe Work' }} />
      <Stack.Screen name="linebreak" options={{ title: 'Line Break Permit' }} />
      <Stack.Screen name="excavation" options={{ title: 'Excavation Permit' }} />
      <Stack.Screen name="roofaccess" options={{ title: 'Roof Access Permit' }} />
      <Stack.Screen name="chemicalhandling" options={{ title: 'Chemical Handling Permit' }} />
      <Stack.Screen name="tempequipment" options={{ title: 'Temporary Equipment Permit' }} />
      
      {/* Incident & Investigation Hub */}
      <Stack.Screen name="incidenthub" options={{ title: 'Incident & Investigation Hub' }} />
      
      {/* Inspections & Audits Hub */}
      <Stack.Screen name="inspectionshub" options={{ title: 'Inspections & Audits' }} />
      
      {/* Incident & Investigation Forms */}
      <Stack.Screen name="incidentreport" options={{ title: 'Incident Report' }} />
      <Stack.Screen name="nearmiss" options={{ title: 'Near-Miss Report' }} />
      <Stack.Screen name="firstaidlog" options={{ title: 'First Aid Log' }} />
      <Stack.Screen name="accidentinvestigation" options={{ title: 'Accident Investigation' }} />
      <Stack.Screen name="rootcausesafety" options={{ title: 'Root Cause Analysis' }} />
      <Stack.Screen name="witnessstatement" options={{ title: 'Witness Statement' }} />
      <Stack.Screen name="propertydamage" options={{ title: 'Property Damage Report' }} />
      <Stack.Screen name="vehicleincident" options={{ title: 'Vehicle/Forklift Incident' }} />
      <Stack.Screen name="osha300" options={{ title: 'OSHA 300 Log' }} />
      <Stack.Screen name="osha301" options={{ title: 'OSHA 301 Form' }} />
      
      {/* Inspections & Audits */}
      <Stack.Screen name="dailysafetywalk" options={{ title: 'Daily Safety Walk' }} />
      <Stack.Screen name="monthlysafety" options={{ title: 'Monthly Safety Inspection' }} />
      <Stack.Screen name="fireextinguisher" options={{ title: 'Fire Extinguisher Inspection' }} />
      <Stack.Screen name="emergencyexit" options={{ title: 'Emergency Exit Inspection' }} />
      <Stack.Screen name="eyewash" options={{ title: 'Eyewash/Safety Shower' }} />
      <Stack.Screen name="firstaidkit" options={{ title: 'First Aid Kit Inspection' }} />
      <Stack.Screen name="forkliftpreshift" options={{ title: 'Forklift Pre-Shift' }} />
      <Stack.Screen name="ladderinspection" options={{ title: 'Ladder Inspection' }} />
      <Stack.Screen name="fallprotectionequip" options={{ title: 'Fall Protection Equipment' }} />
      <Stack.Screen name="electricalpanel" options={{ title: 'Electrical Panel Inspection' }} />
      <Stack.Screen name="ammoniasystem" options={{ title: 'Ammonia System Inspection' }} />
      <Stack.Screen name="compressedgas" options={{ title: 'Compressed Gas Cylinder' }} />
      
      {/* Training & Competency */}
      <Stack.Screen name="traininghub" options={{ title: 'Training & Competency' }} />
      <Stack.Screen name="trainingsignin" options={{ title: 'Training Sign-In Sheet' }} />
      <Stack.Screen name="trainingmatrix" options={{ title: 'Training Record Matrix' }} />
      <Stack.Screen name="lotoauth" options={{ title: 'LOTO Authorization OCR' }} />
      <Stack.Screen name="forkliftcert" options={{ title: 'Forklift Certification' }} />
      <Stack.Screen name="confinedspacecert" options={{ title: 'Confined Space Certification' }} />
      <Stack.Screen name="firstaidcert" options={{ title: 'First Aid/CPR Certification' }} />
      <Stack.Screen name="hazmattraining" options={{ title: 'Hazmat Training Record OCR' }} />
      <Stack.Screen name="newemployeesafety" options={{ title: 'New Employee Safety OCR' }} />
      <Stack.Screen name="annualsafetyrefresher" options={{ title: 'Annual Safety Refresher OCR' }} />
      <Stack.Screen name="jobspecificsafety" options={{ title: 'Job-Specific Safety OCR' }} />
      
      {/* PPE Management */}
      <Stack.Screen name="ppehub" options={{ title: 'PPE Management' }} />
      
      {/* Chemical Safety Hub */}
      <Stack.Screen name="chemicalhub" options={{ title: 'Chemical Safety' }} />
      <Stack.Screen name="ppehazard" options={{ title: 'PPE Hazard Assessment' }} />
      <Stack.Screen name="ppeissue" options={{ title: 'PPE Issue/Distribution' }} />
      <Stack.Screen name="ppeinspection" options={{ title: 'PPE Inspection Checklist' }} />
      <Stack.Screen name="hearingconservation" options={{ title: 'Hearing Conservation' }} />
      <Stack.Screen name="respiratorfittest" options={{ title: 'Respirator Fit Test' }} />
      <Stack.Screen name="safetyfootwear" options={{ title: 'Safety Footwear Verification' }} />
      
      {/* Chemical Safety / Hazard Communication */}
      <Stack.Screen name="sdsindex" options={{ title: 'SDS Master Index' }} />
      <Stack.Screen name="sdsreceipt" options={{ title: 'SDS Receipt Acknowledgment' }} />
      <Stack.Screen name="chemicalinventory" options={{ title: 'Chemical Inventory' }} />
      <Stack.Screen name="chemicalapproval" options={{ title: 'Chemical Approval Request' }} />
      <Stack.Screen name="hazwaste" options={{ title: 'Hazardous Waste Disposal' }} />
      <Stack.Screen name="spillreport" options={{ title: 'Spill Report' }} />
      <Stack.Screen name="chemicalexposure" options={{ title: 'Chemical Exposure Report' }} />
      
      {/* Emergency Preparedness Hub */}
      <Stack.Screen name="emergencyhub" options={{ title: 'Emergency Preparedness' }} />
      <Stack.Screen name="emergencyinitiation" options={{ title: 'Initiate Emergency' }} />
      
      {/* Emergency Preparedness Forms */}
      <Stack.Screen name="emergencyaction" options={{ title: 'Emergency Action Plan' }} />
      <Stack.Screen name="firedrilllog" options={{ title: 'Fire Drill Log' }} />
      <Stack.Screen name="evacuationdrill" options={{ title: 'Evacuation Drill Report' }} />
      <Stack.Screen name="tornadodrill" options={{ title: 'Severe Weather Drill' }} />
      <Stack.Screen name="emergencycontacts" options={{ title: 'Emergency Contacts' }} />
      <Stack.Screen name="assemblyheadcount" options={{ title: 'Assembly Headcount' }} />
      <Stack.Screen name="aedinspection" options={{ title: 'AED Inspection' }} />
      <Stack.Screen name="emergencyequipmap" options={{ title: 'Emergency Equipment Map' }} />
      
      {/* Contractor & Visitor Safety */}
      <Stack.Screen name="contractorprequal" options={{ title: 'Contractor Pre-Qualification' }} />
      <Stack.Screen name="contractororientation" options={{ title: 'Contractor Orientation' }} />
      <Stack.Screen name="contractorsignin" options={{ title: 'Contractor Sign-In/Out' }} />
      <Stack.Screen name="visitorsafety" options={{ title: 'Visitor Safety Acknowledgment' }} />
      <Stack.Screen name="contractorworkauth" options={{ title: 'Contractor Work Auth' }} />
      <Stack.Screen name="contractorinsurance" options={{ title: 'Contractor Insurance' }} />
      
      {/* Ergonomics & Industrial Hygiene */}
      <Stack.Screen name="ergonomicassessment" options={{ title: 'Ergonomic Assessment' }} />
      <Stack.Screen name="workstationevaluation" options={{ title: 'Workstation Evaluation' }} />
      <Stack.Screen name="noisemonitoring" options={{ title: 'Noise Monitoring' }} />
      <Stack.Screen name="heatstress" options={{ title: 'Heat Stress Monitoring' }} />
      <Stack.Screen name="airquality" options={{ title: 'Air Quality Check' }} />
      <Stack.Screen name="repetitivemotion" options={{ title: 'Repetitive Motion Risk' }} />
      
      {/* Behavior-Based Safety */}
      <Stack.Screen name="safetyobservation" options={{ title: 'Safety Observation Card' }} />
      <Stack.Screen name="peersafetyaudit" options={{ title: 'Peer Safety Audit' }} />
      <Stack.Screen name="safetysuggestion" options={{ title: 'Safety Suggestion' }} />
      <Stack.Screen name="safetycommittee" options={{ title: 'Safety Committee Minutes' }} />
      <Stack.Screen name="safetyrecognition" options={{ title: 'Safety Recognition' }} />
      
      {/* Regulatory Compliance */}
      <Stack.Screen name="osha300a" options={{ title: 'OSHA 300A Summary' }} />
      <Stack.Screen name="workerscomp" options={{ title: 'Workers Comp Claim' }} />
      <Stack.Screen name="returntowork" options={{ title: 'Return-to-Work Form' }} />
      <Stack.Screen name="medicalrestriction" options={{ title: 'Medical Restriction' }} />
      <Stack.Screen name="drugalcoholtest" options={{ title: 'Drug/Alcohol Test COC' }} />
      <Stack.Screen name="psmcompliance" options={{ title: 'PSM Compliance' }} />
      <Stack.Screen name="firesuppression" options={{ title: 'Fire Suppression Impairment' }} />
    </Stack>
  );
}
