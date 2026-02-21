import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ComplianceLayout() {
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
          title: 'Compliance',
          headerShown: true,
        }} 
      />
      <Stack.Screen name="masterpolicies" options={{ title: 'Master Policy Program' }} />
      {/* FDA / FSMA Regulatory */}
      <Stack.Screen name="foodsafetyplan" options={{ title: 'Food Safety Plan' }} />
      <Stack.Screen name="hazardanalysis" options={{ title: 'Hazard Analysis' }} />
      <Stack.Screen name="preventivecontrols" options={{ title: 'Preventive Controls' }} />
      <Stack.Screen name="supplychainverification" options={{ title: 'Supply Chain Verification' }} />
      <Stack.Screen name="recallplan" options={{ title: 'Recall Plan' }} />
      <Stack.Screen name="fdaregistration" options={{ title: 'FDA Registration' }} />
      <Stack.Screen name="priornotice" options={{ title: 'Prior Notice' }} />
      <Stack.Screen name="reportablefood" options={{ title: 'Reportable Food Registry' }} />
      <Stack.Screen name="fda483response" options={{ title: 'FDA 483 Response' }} />
      <Stack.Screen name="iaassessment" options={{ title: 'IA Vulnerability Assessment' }} />
      
      {/* FSMA 204 / Traceability Rule */}
      <Stack.Screen name="kdelog" options={{ title: 'KDE Log' }} />
      <Stack.Screen name="cterecord" options={{ title: 'CTE Record' }} />
      <Stack.Screen name="lotcodeassignment" options={{ title: 'Lot Code Assignment' }} />
      <Stack.Screen name="receivingkde" options={{ title: 'Receiving KDE' }} />
      <Stack.Screen name="shippingkde" options={{ title: 'Shipping KDE' }} />
      <Stack.Screen name="transformationkde" options={{ title: 'Transformation KDE' }} />
      <Stack.Screen name="traceabilityplan" options={{ title: 'Traceability Plan' }} />
      <Stack.Screen name="fsma204assessment" options={{ title: 'FSMA 204 Assessment' }} />
      
      {/* SQF / GFSI Certification */}
      <Stack.Screen name="sqfelements" options={{ title: 'SQF System Elements' }} />
      <Stack.Screen name="mgmtreviewminutes" options={{ title: 'Management Review Minutes' }} />
      <Stack.Screen name="foodsafetyculture" options={{ title: 'Food Safety Culture' }} />
      <Stack.Screen name="sqfpractitioner" options={{ title: 'SQF Practitioner' }} />
      <Stack.Screen name="sqfverification" options={{ title: 'SQF Verification' }} />
      <Stack.Screen name="preauditassessment" options={{ title: 'Pre-Audit Assessment' }} />
      <Stack.Screen name="certificationscope" options={{ title: 'Certification Scope' }} />
      <Stack.Screen name="auditncresponse" options={{ title: 'Audit NC Response' }} />
      <Stack.Screen name="carcloseout" options={{ title: 'CAR Close-Out' }} />
      <Stack.Screen name="continualimprovement" options={{ title: 'Continual Improvement' }} />
      <Stack.Screen name="auditsessions" options={{ title: 'Auditor Portal Sessions' }} />
      
      {/* Environmental Compliance (EPA) */}
      <Stack.Screen name="wastewaterpermit" options={{ title: 'Wastewater Permit' }} />
      <Stack.Screen name="wastewatermonitoring" options={{ title: 'Wastewater Monitoring' }} />
      <Stack.Screen name="airemissions" options={{ title: 'Air Emissions' }} />
      <Stack.Screen name="refrigeranttracking" options={{ title: 'Refrigerant Tracking' }} />
      <Stack.Screen name="hazwastmanifest" options={{ title: 'Hazardous Waste Manifest' }} />
      <Stack.Screen name="wastedisposalcert" options={{ title: 'Waste Disposal Cert' }} />
      <Stack.Screen name="stormwaterplan" options={{ title: 'Stormwater Plan' }} />
      <Stack.Screen name="spccplan" options={{ title: 'SPCC Plan' }} />
      <Stack.Screen name="tieriireport" options={{ title: 'Tier II Report' }} />
      <Stack.Screen name="envincident" options={{ title: 'Environmental Incident' }} />
      
      {/* OSHA Regulatory Compliance */}
      <Stack.Screen name="lotoprogram" options={{ title: 'LOTO Program' }} />
      <Stack.Screen name="confinedspaceprogram" options={{ title: 'Confined Space Program' }} />
      <Stack.Screen name="hazcomprogram" options={{ title: 'HazCom Program' }} />
      <Stack.Screen name="emergencyactionplan" options={{ title: 'Emergency Action Plan' }} />
      <Stack.Screen name="firepreventionplan" options={{ title: 'Fire Prevention Plan' }} />
      <Stack.Screen name="respiratoryprogram" options={{ title: 'Respiratory Program' }} />
      <Stack.Screen name="hearingconservationprogram" options={{ title: 'Hearing Conservation' }} />
      <Stack.Screen name="bloodborneprogram" options={{ title: 'Bloodborne Pathogen' }} />
      <Stack.Screen name="psmdocumentation" options={{ title: 'PSM Documentation' }} />
      <Stack.Screen name="annualprogramreview" options={{ title: 'Annual Program Review' }} />
      
      {/* Labor / Employment Compliance */}
      <Stack.Screen name="i9verification" options={{ title: 'I-9 Verification' }} />
      <Stack.Screen name="everifydoc" options={{ title: 'E-Verify Documentation' }} />
      <Stack.Screen name="minorworkpermit" options={{ title: 'Minor Work Permit' }} />
      <Stack.Screen name="wagehourcompliance" options={{ title: 'Wage & Hour Compliance' }} />
      <Stack.Screen name="fmladoc" options={{ title: 'FMLA Documentation' }} />
      <Stack.Screen name="adaaccommodation" options={{ title: 'ADA Accommodation' }} />
      <Stack.Screen name="eeo1report" options={{ title: 'EEO-1 Report' }} />
      <Stack.Screen name="workerscompolicy" options={{ title: 'Workers Comp Policy' }} />
      <Stack.Screen name="handbookack" options={{ title: 'Handbook Acknowledgment' }} />
      <Stack.Screen name="antiharassmenttraining" options={{ title: 'Anti-Harassment Training' }} />
      
      {/* State & Local Permits */}
      <Stack.Screen name="businesslicense" options={{ title: 'Business License' }} />
      <Stack.Screen name="manufacturinglicense" options={{ title: 'Manufacturing License' }} />
      <Stack.Screen name="healthinspection" options={{ title: 'Health Inspection' }} />
      <Stack.Screen name="firemarshal" options={{ title: 'Fire Marshal Inspection' }} />
      <Stack.Screen name="boilerinspection" options={{ title: 'Boiler Inspection' }} />
      <Stack.Screen name="elevatorinspection" options={{ title: 'Elevator Inspection' }} />
      <Stack.Screen name="backflowtest" options={{ title: 'Backflow Test' }} />
      <Stack.Screen name="greasetraplog" options={{ title: 'Grease Trap Log' }} />
      <Stack.Screen name="pestcontrollicense" options={{ title: 'Pest Control License' }} />
      <Stack.Screen name="zoningpermit" options={{ title: 'Zoning Permit' }} />
      
      {/* Third-Party Certifications */}
      <Stack.Screen name="organiccert" options={{ title: 'Organic Certification' }} />
      <Stack.Screen name="organicaudit" options={{ title: 'Organic Audit' }} />
      <Stack.Screen name="koshercert" options={{ title: 'Kosher Certification' }} />
      <Stack.Screen name="halalcert" options={{ title: 'Halal Certification' }} />
      <Stack.Screen name="nongmocert" options={{ title: 'Non-GMO Certification' }} />
      <Stack.Screen name="glutenfreecert" options={{ title: 'Gluten-Free Certification' }} />
      <Stack.Screen name="fairtradecert" options={{ title: 'Fair Trade Certification' }} />
      <Stack.Screen name="customeraudits" options={{ title: 'Customer Audits' }} />
      <Stack.Screen name="certrenewaltracker" options={{ title: 'Cert Renewal Tracker' }} />
      <Stack.Screen name="logousage" options={{ title: 'Logo Usage Authorization' }} />
      
      {/* Food Defense (FSMA IA) */}
      <Stack.Screen name="fooddefenseplan" options={{ title: 'Food Defense Plan' }} />
      <Stack.Screen name="vulnerabilityassessment" options={{ title: 'Vulnerability Assessment' }} />
      <Stack.Screen name="mitigationstrategies" options={{ title: 'Mitigation Strategies' }} />
      <Stack.Screen name="fooddefensemonitoring" options={{ title: 'Food Defense Monitoring' }} />
      <Stack.Screen name="fooddefenseca" options={{ title: 'Food Defense CA' }} />
      <Stack.Screen name="broadmitigation" options={{ title: 'Broad Mitigation' }} />
      <Stack.Screen name="fooddefensetraining" options={{ title: 'Food Defense Training' }} />
      <Stack.Screen name="fooddefensereanalysis" options={{ title: 'Food Defense Reanalysis' }} />
      
      {/* Import / Export Compliance */}
      <Stack.Screen name="countryoforigin" options={{ title: 'Country of Origin' }} />
      <Stack.Screen name="importalert" options={{ title: 'Import Alert Monitoring' }} />
      <Stack.Screen name="fsvpprogram" options={{ title: 'FSVP Program' }} />
      <Stack.Screen name="fsvpevaluation" options={{ title: 'FSVP Evaluation' }} />
      <Stack.Screen name="customsentry" options={{ title: 'Customs Entry' }} />
      <Stack.Screen name="phytosanitary" options={{ title: 'Phytosanitary Certificate' }} />
      <Stack.Screen name="exportcert" options={{ title: 'Export Certificate' }} />
      <Stack.Screen name="tariffclassification" options={{ title: 'Tariff Classification' }} />
      
      {/* Weights & Measures */}
      <Stack.Screen name="weightsmeasuresinspection" options={{ title: 'Weights & Measures Inspection' }} />
      <Stack.Screen name="netcontentsverification" options={{ title: 'Net Contents Verification' }} />
      <Stack.Screen name="tareweight" options={{ title: 'Tare Weight' }} />
      <Stack.Screen name="netweightcompliance" options={{ title: 'Net Weight Compliance' }} />
      <Stack.Screen name="scalecertification" options={{ title: 'Scale Certification' }} />
      
      {/* Insurance & Liability */}
      <Stack.Screen name="generalliability" options={{ title: 'General Liability' }} />
      <Stack.Screen name="productliability" options={{ title: 'Product Liability' }} />
      <Stack.Screen name="workerscompinsurance" options={{ title: 'Workers Comp Insurance' }} />
      <Stack.Screen name="propertyinsurance" options={{ title: 'Property Insurance' }} />
      <Stack.Screen name="coitracker" options={{ title: 'COI Tracker' }} />
      <Stack.Screen name="insurancerenewal" options={{ title: 'Insurance Renewal' }} />
      
      {/* Record Retention & Document Control */}
      <Stack.Screen name="retentionschedule" options={{ title: 'Retention Schedule' }} />
      <Stack.Screen name="destructionlog" options={{ title: 'Destruction Log' }} />
      <Stack.Screen name="regulatoryindex" options={{ title: 'Regulatory Index' }} />
      <Stack.Screen name="compliancecalendar" options={{ title: 'Compliance Calendar' }} />
      <Stack.Screen name="versioncontrol" options={{ title: 'Version Control' }} />
      <Stack.Screen name="backupverification" options={{ title: 'Backup Verification' }} />
      
      {/* Customer & Contract Compliance */}
      <Stack.Screen name="customerspec" options={{ title: 'Customer Specification' }} />
      <Stack.Screen name="customerconduct" options={{ title: 'Customer Code of Conduct' }} />
      <Stack.Screen name="vendoragreement" options={{ title: 'Vendor Agreement' }} />
      <Stack.Screen name="ndalog" options={{ title: 'NDA Log' }} />
      <Stack.Screen name="contractcompliance" options={{ title: 'Contract Compliance' }} />
      <Stack.Screen name="customerauditschedule" options={{ title: 'Customer Audit Schedule' }} />
    </Stack>
  );
}
