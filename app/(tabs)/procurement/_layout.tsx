import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function ProcurementLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Main Hub */}
      <Stack.Screen name="index" options={{ title: 'Procurement' }} />
      
      {/* Active Screens */}
      <Stack.Screen name="requests" options={{ title: 'Purchase Requests' }} />
      <Stack.Screen name="requisitions" options={{ title: 'Purchase Requisitions' }} />
      <Stack.Screen name="purchaseorders" options={{ title: 'Purchase Orders' }} />
      <Stack.Screen name="polist" options={{ title: 'Purchase Orders' }} />
      <Stack.Screen name="poapproval" options={{ title: 'My Approvals' }} />
      <Stack.Screen name="poreceiving" options={{ title: 'Receiving' }} />
      <Stack.Screen name="vendors" options={{ title: 'Vendors' }} />
      <Stack.Screen name="vendordetail" options={{ title: 'Vendor Details' }} />
      <Stack.Screen name="pocreate-material" options={{ title: 'Create Material PO' }} />
      <Stack.Screen name="pocreate-service" options={{ title: 'Create Service PO' }} />
      <Stack.Screen name="pocreate-capex" options={{ title: 'Create CapEx PO' }} />
      <Stack.Screen name="poapprovals" options={{ title: 'Approvals' }} />
      <Stack.Screen name="receive" options={{ title: 'Receiving' }} />
      
      {/* ============================================
          VAULTED SCREENS - Files kept, hidden from nav
          ============================================ */}
      
      {/* Requisitions - VAULTED */}
      <Stack.Screen name="reqapproval" options={{ title: 'Requisition Approvals' }} />
      <Stack.Screen name="blanketreq" options={{ title: 'Blanket Requisitions' }} />
      <Stack.Screen name="reqtemplates" options={{ title: 'Requisition Templates' }} />
      <Stack.Screen name="reqtracking" options={{ title: 'Requisition Tracking' }} />
      <Stack.Screen name="reqreports" options={{ title: 'Requisition Reports' }} />
      
      {/* Purchase Orders Advanced - VAULTED */}
      <Stack.Screen name="porevisions" options={{ title: 'PO Revisions' }} />
      <Stack.Screen name="potemplates" options={{ title: 'PO Templates' }} />
      <Stack.Screen name="blanketpo" options={{ title: 'Blanket POs' }} />
      <Stack.Screen name="contractpo" options={{ title: 'Contract POs' }} />
      <Stack.Screen name="servicepo" options={{ title: 'Service POs' }} />
      <Stack.Screen name="dropshippo" options={{ title: 'Drop Ship POs' }} />
      <Stack.Screen name="potracking" options={{ title: 'PO Tracking' }} />
      <Stack.Screen name="pohistory" options={{ title: 'PO History' }} />
      <Stack.Screen name="poreports" options={{ title: 'PO Reports' }} />
      
      {/* Vendor Management - VAULTED */}
      <Stack.Screen name="vendormaster" options={{ title: 'Vendor Master' }} />
      <Stack.Screen name="vendoronboarding" options={{ title: 'Vendor Onboarding' }} />
      <Stack.Screen name="vendorapproval" options={{ title: 'Vendor Approvals' }} />
      <Stack.Screen name="vendorqual" options={{ title: 'Vendor Qualification' }} />
      <Stack.Screen name="vendorrisk" options={{ title: 'Vendor Risk' }} />
      <Stack.Screen name="vendorscorecard" options={{ title: 'Vendor Scorecards' }} />
      <Stack.Screen name="vendorportal" options={{ title: 'Vendor Portal' }} />
      <Stack.Screen name="vendorcompliance" options={{ title: 'Vendor Compliance' }} />
      <Stack.Screen name="diversevendors" options={{ title: 'Diverse Vendors' }} />
      
      {/* Strategic Sourcing - VAULTED */}
      <Stack.Screen name="rfq" options={{ title: 'Request for Quote' }} />
      <Stack.Screen name="rfp" options={{ title: 'Request for Proposal' }} />
      <Stack.Screen name="rfi" options={{ title: 'Request for Information' }} />
      <Stack.Screen name="bidmgmt" options={{ title: 'Bid Management' }} />
      <Stack.Screen name="spendanalysis" options={{ title: 'Spend Analysis' }} />
      <Stack.Screen name="categorymgmt" options={{ title: 'Category Management' }} />
      
      {/* Contract Management - VAULTED */}
      <Stack.Screen name="contracts" options={{ title: 'Vendor Contracts' }} />
      <Stack.Screen name="contracttemplates" options={{ title: 'Contract Templates' }} />
      <Stack.Screen name="contractapproval" options={{ title: 'Contract Approvals' }} />
      <Stack.Screen name="contractrenewal" options={{ title: 'Contract Renewals' }} />
      <Stack.Screen name="contractcompliance" options={{ title: 'Contract Compliance' }} />
      <Stack.Screen name="slatracking" options={{ title: 'SLA Tracking' }} />
    </Stack>
  );
}
