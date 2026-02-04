import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function QualityLayout() {
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
          title: 'Quality',
          headerShown: true,
        }} 
      />
      {/* Daily Monitoring Forms */}
      <Stack.Screen name="temperaturelog" options={{ title: 'Temperature Log' }} />
      <Stack.Screen name="ccplog" options={{ title: 'CCP Monitoring Log' }} />
      <Stack.Screen name="productionlinecheck" options={{ title: 'Production Line Check' }} />
      <Stack.Screen name="cookingtemplog" options={{ title: 'Cooking Temperature Log' }} />
      <Stack.Screen name="coolingtemplog" options={{ title: 'Cooling Temperature Log' }} />
      <Stack.Screen name="metaldetectorlog" options={{ title: 'Metal Detector Log' }} />
      <Stack.Screen name="scalecalibration" options={{ title: 'Scale Calibration Check' }} />
      <Stack.Screen name="weightverification" options={{ title: 'Weight Verification' }} />
      <Stack.Screen name="phtestinglog" options={{ title: 'pH/Brix/Moisture Testing' }} />
      <Stack.Screen name="visualinspection" options={{ title: 'Visual Inspection' }} />
      
      {/* Pre-Operational Forms */}
      <Stack.Screen name="preopinspection" options={{ title: 'Pre-Op Inspection' }} />
      <Stack.Screen name="sanitationverification" options={{ title: 'Sanitation Verification' }} />
      <Stack.Screen name="allergenchangeover" options={{ title: 'Allergen Changeover' }} />
      <Stack.Screen name="linerelease" options={{ title: 'Line Release' }} />
      <Stack.Screen name="equipmentreadiness" options={{ title: 'Equipment Readiness' }} />
      
      {/* In-Process Quality Forms */}
      <Stack.Screen name="firstarticle" options={{ title: 'First Article Inspection' }} />
      <Stack.Screen name="hourlylinechecks" options={{ title: 'Hourly Line Checks' }} />
      <Stack.Screen name="tasksetup" options={{ title: 'Task Schedule Setup' }} />
      <Stack.Screen name="equipmenthygiene" options={{ title: 'Equipment Hygiene Sign-off' }} />
      <Stack.Screen name="labelverification" options={{ title: 'Label Verification' }} />
      <Stack.Screen name="datecodeverification" options={{ title: 'Date Code Verification' }} />
      <Stack.Screen name="packagingintegrity" options={{ title: 'Packaging Integrity' }} />
      <Stack.Screen name="sealstrengthlog" options={{ title: 'Seal Strength Test' }} />
      <Stack.Screen name="foreignmateriallog" options={{ title: 'Foreign Material Check' }} />
      <Stack.Screen name="organoleptic" options={{ title: 'Organoleptic Evaluation' }} />
      
      {/* Receiving & Supplier Forms */}
      <Stack.Screen name="incominginspection" options={{ title: 'Incoming Inspection' }} />
      <Stack.Screen name="ingredientreceiving" options={{ title: 'Ingredient Receiving' }} />
      <Stack.Screen name="coareview" options={{ title: 'COA Review' }} />
      <Stack.Screen name="receivingtemp" options={{ title: 'Receiving Temperature' }} />
      <Stack.Screen name="supplierapproval" options={{ title: 'Supplier Approval' }} />
      <Stack.Screen name="suppliercorrectiveaction" options={{ title: 'Supplier SCAR' }} />
      <Stack.Screen name="rejectedmateriallog" options={{ title: 'Rejected Material Log' }} />
      
      {/* Non-Conformance & Corrective Action */}
      <Stack.Screen name="ncr" options={{ title: 'NCR' }} />
      <Stack.Screen name="capa" options={{ title: 'CAPA' }} />
      <Stack.Screen name="deviation" options={{ title: 'Deviation Report' }} />
      <Stack.Screen name="customercomplaint" options={{ title: 'Customer Complaint' }} />
      <Stack.Screen name="internalcomplaint" options={{ title: 'Internal Complaint' }} />
      <Stack.Screen name="rootcause" options={{ title: 'Root Cause Analysis' }} />
      <Stack.Screen name="fivewhys" options={{ title: '5 Whys Worksheet' }} />
      
      {/* Hold & Release Forms */}
      <Stack.Screen name="holdtag" options={{ title: 'Quality Hold Tag' }} />
      <Stack.Screen name="holdrelease" options={{ title: 'Hold Release' }} />
      <Stack.Screen name="disposition" options={{ title: 'Disposition Form' }} />
      <Stack.Screen name="reworkauth" options={{ title: 'Rework Authorization' }} />
      <Stack.Screen name="reworklog" options={{ title: 'Rework Tracking' }} />
      
      {/* Testing & Laboratory Forms */}
      <Stack.Screen name="microtest" options={{ title: 'Micro Testing Request' }} />
      <Stack.Screen name="envswablog" options={{ title: 'Environmental Swab Log' }} />
      <Stack.Screen name="atplog" options={{ title: 'ATP Testing Log' }} />
      <Stack.Screen name="allergenswablog" options={{ title: 'Allergen Swab Log' }} />
      <Stack.Screen name="watertestlog" options={{ title: 'Water Testing Log' }} />
      <Stack.Screen name="samplecoc" options={{ title: 'Sample Chain of Custody' }} />
      <Stack.Screen name="shelflifelog" options={{ title: 'Shelf Life Testing' }} />
      <Stack.Screen name="retainedsamplelog" options={{ title: 'Retained Sample Log' }} />
      
      {/* Traceability Forms */}
      <Stack.Screen name="batchlotrecord" options={{ title: 'Batch/Lot Record' }} />
      <Stack.Screen name="ingredienttrace" options={{ title: 'Ingredient Traceability' }} />
      <Stack.Screen name="productionrunsheet" options={{ title: 'Production Run Sheet' }} />
      <Stack.Screen name="finishedproductrelease" options={{ title: 'Finished Product Release' }} />
      <Stack.Screen name="mockrecallexercise" options={{ title: 'Mock Recall Exercise' }} />
      <Stack.Screen name="traceabilitytest" options={{ title: 'Traceability Test' }} />
      
      {/* Calibration & Verification */}
      <Stack.Screen name="thermometercalibration" options={{ title: 'Thermometer Calibration' }} />
      <Stack.Screen name="scalecalibrationlog" options={{ title: 'Scale Calibration Log' }} />
      <Stack.Screen name="metaldetectorcalibration" options={{ title: 'Metal Detector Calibration' }} />
      <Stack.Screen name="phmetercalibration" options={{ title: 'pH Meter Calibration' }} />
      <Stack.Screen name="equipmentverification" options={{ title: 'Equipment Verification' }} />
      
      {/* Allergen Management */}
      <Stack.Screen name="allergenmatrix" options={{ title: 'Allergen Matrix' }} />
      <Stack.Screen name="allergenchangechecklist" options={{ title: 'Allergen Changeover Checklist' }} />
      <Stack.Screen name="allergencleaningverification" options={{ title: 'Allergen Cleaning Verification' }} />
      <Stack.Screen name="allergenlabelreview" options={{ title: 'Allergen Label Review' }} />
      
      {/* Environmental Monitoring */}
      <Stack.Screen name="envmonitorschedule" options={{ title: 'Environmental Monitoring Schedule' }} />
      <Stack.Screen name="listerialog" options={{ title: 'Listeria Sampling Log' }} />
      <Stack.Screen name="salmonellalog" options={{ title: 'Salmonella Sampling Log' }} />
      <Stack.Screen name="zonemapping" options={{ title: 'Zone Mapping' }} />
      <Stack.Screen name="positivecorrectiveaction" options={{ title: 'Positive Result CA' }} />
      
      {/* GMP & Hygiene Forms */}
      <Stack.Screen name="gmpinspection" options={{ title: 'GMP Inspection' }} />
      <Stack.Screen name="employeehygiene" options={{ title: 'Employee Hygiene Check' }} />
      <Stack.Screen name="handwashinglog" options={{ title: 'Handwashing Verification' }} />
      <Stack.Screen name="illnessreport" options={{ title: 'Illness/Injury Report' }} />
      <Stack.Screen name="visitorlog" options={{ title: 'Visitor Log' }} />
      <Stack.Screen name="glassregister" options={{ title: 'Glass & Brittle Register' }} />
      <Stack.Screen name="glassbreakage" options={{ title: 'Glass Breakage Report' }} />
      
      {/* Document Control */}
      <Stack.Screen name="docchangerequest" options={{ title: 'Document Change Request' }} />
      <Stack.Screen name="docreviewapproval" options={{ title: 'Document Review/Approval' }} />
      <Stack.Screen name="controlleddoclog" options={{ title: 'Controlled Document Log' }} />
      <Stack.Screen name="obsoletedoc" options={{ title: 'Obsolete Document Disposal' }} />
      <Stack.Screen name="trainingsignoff" options={{ title: 'Training Sign-Off' }} />
      
      {/* Audit Forms */}
      <Stack.Screen name="internalauditchecklist" options={{ title: 'Internal Audit Checklist' }} />
      <Stack.Screen name="internalauditreport" options={{ title: 'Internal Audit Report' }} />
      <Stack.Screen name="auditfindingtracking" options={{ title: 'Audit Finding Tracking' }} />
      <Stack.Screen name="externalauditprep" options={{ title: 'External Audit Prep' }} />
      <Stack.Screen name="auditcalog" options={{ title: 'Audit CA Log' }} />
      
      {/* Shipping & Distribution */}
      <Stack.Screen name="finishedproductinspection" options={{ title: 'Finished Product Inspection' }} />
      <Stack.Screen name="shippingtemplog" options={{ title: 'Shipping Temperature Log' }} />
      <Stack.Screen name="loadinspection" options={{ title: 'Load Inspection' }} />
      <Stack.Screen name="trailerinspection" options={{ title: 'Trailer Inspection' }} />
      <Stack.Screen name="coc" options={{ title: 'Certificate of Conformance' }} />
      
      {/* Recall & Crisis */}
      <Stack.Screen name="recallinitiation" options={{ title: 'Recall Initiation' }} />
      <Stack.Screen name="recalleffectiveness" options={{ title: 'Recall Effectiveness' }} />
      <Stack.Screen name="consumerinvestigation" options={{ title: 'Consumer Investigation' }} />
      <Stack.Screen name="crisiscommlog" options={{ title: 'Crisis Communication Log' }} />
      
      {/* Supplier Quality */}
      <Stack.Screen name="approvedsupplierlist" options={{ title: 'Approved Supplier List' }} />
      <Stack.Screen name="supplieraudit" options={{ title: 'Supplier Audit' }} />
      <Stack.Screen name="supplierscorecard" options={{ title: 'Supplier Scorecard' }} />
      <Stack.Screen name="supplierperformance" options={{ title: 'Supplier Performance' }} />
    </Stack>
  );
}
