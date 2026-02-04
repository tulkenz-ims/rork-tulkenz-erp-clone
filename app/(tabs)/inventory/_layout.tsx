import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function InventoryLayout() {
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
      {/* Dashboard */}
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Inventory',
          headerLargeTitle: true,
        }} 
      />
      
      {/* Items */}
      <Stack.Screen name="itemrecords" options={{ title: 'Item Records' }} />
      <Stack.Screen name="subcategories" options={{ title: 'Subcategories' }} />
      <Stack.Screen name="sharedmaterials" options={{ title: 'Shared Materials' }} />
      
      {/* Stock Management */}
      <Stack.Screen name="onhand" options={{ title: 'On-Hand View' }} />
      <Stack.Screen name="inventorycount" options={{ title: 'Inventory Count' }} />
      <Stack.Screen name="lowstockalerts" options={{ title: 'Stock Alerts' }} />
      
      {/* Tracking */}
      <Stack.Screen name="lottracking" options={{ title: 'Lot Tracking' }} />
      <Stack.Screen name="lotnumbers" options={{ title: 'Lot Numbers' }} />
      <Stack.Screen name="expirationtracking" options={{ title: 'Expiration Tracking' }} />
      <Stack.Screen name="transactionhistory" options={{ title: 'Transaction History' }} />
      <Stack.Screen name="audittrail" options={{ title: 'Audit Trail' }} />
      
      {/* Operations */}
      <Stack.Screen name="iut" options={{ title: 'Inter-Unit Transfers' }} />
      <Stack.Screen name="glcharging" options={{ title: 'G/L Charging' }} />
      <Stack.Screen name="weeklyreplenishment" options={{ title: 'Weekly Replenishment' }} />
      <Stack.Screen name="labelprinting" options={{ title: 'Label Printing' }} />
      
      {/* ============================================
          VAULTED SCREENS - Files kept, hidden from nav
          ============================================ */}
      
      {/* Item Master - VAULTED */}
      <Stack.Screen name="itemskus" options={{ title: 'Item Numbers/SKUs' }} />
      <Stack.Screen name="itemcategories" options={{ title: 'Item Categories' }} />
      <Stack.Screen name="itemtypes" options={{ title: 'Item Types' }} />
      <Stack.Screen name="uom" options={{ title: 'Unit of Measure' }} />
      <Stack.Screen name="uomconversions" options={{ title: 'UOM Conversions' }} />
      <Stack.Screen name="itemcosting" options={{ title: 'Item Costing' }} />
      <Stack.Screen name="itempricing" options={{ title: 'Item Pricing' }} />
      <Stack.Screen name="itemspecs" options={{ title: 'Item Specifications' }} />
      <Stack.Screen name="itemattributes" options={{ title: 'Item Attributes' }} />
      <Stack.Screen name="itemaliases" options={{ title: 'Item Aliases' }} />
      <Stack.Screen name="crossreference" options={{ title: 'Cross-Reference Parts' }} />
      <Stack.Screen name="substituteitems" options={{ title: 'Substitute Items' }} />
      <Stack.Screen name="itemlifecycle" options={{ title: 'Item Lifecycle Status' }} />
      <Stack.Screen name="itemapproval" options={{ title: 'Item Approval Workflow' }} />
      <Stack.Screen name="itemmassupdate" options={{ title: 'Item Mass Update' }} />
      
      {/* Traceability Advanced - VAULTED */}
      <Stack.Screen name="lotattributes" options={{ title: 'Lot Attributes' }} />
      <Stack.Screen name="lotstatus" options={{ title: 'Lot Status Management' }} />
      <Stack.Screen name="serialtracking" options={{ title: 'Serial Number Tracking' }} />
      <Stack.Screen name="serialassignment" options={{ title: 'Serial Number Assignment' }} />
      <Stack.Screen name="serialhistory" options={{ title: 'Serial Number History' }} />
      <Stack.Screen name="shelflife" options={{ title: 'Shelf Life Management' }} />
      <Stack.Screen name="shelflifealerts" options={{ title: 'Shelf Life Alerts' }} />
      <Stack.Screen name="fefo" options={{ title: 'FEFO Enforcement' }} />
      <Stack.Screen name="fifo" options={{ title: 'FIFO Enforcement' }} />
      <Stack.Screen name="lotgenealogy" options={{ title: 'Lot Genealogy' }} />
      <Stack.Screen name="forwardtrace" options={{ title: 'Forward Traceability' }} />
      <Stack.Screen name="backwardtrace" options={{ title: 'Backward Traceability' }} />
      <Stack.Screen name="recallmgmt" options={{ title: 'Recall Management' }} />
      <Stack.Screen name="mockrecall" options={{ title: 'Mock Recall Testing' }} />
      <Stack.Screen name="origintracking" options={{ title: 'Country of Origin' }} />
      <Stack.Screen name="supplierlot" options={{ title: 'Supplier Lot Tracking' }} />
      
      {/* Operations Advanced - VAULTED */}
      <Stack.Screen name="multiwarehouse" options={{ title: 'Multi-Warehouse' }} />
      <Stack.Screen name="multilocation" options={{ title: 'Multi-Location' }} />
      <Stack.Screen name="binmgmt" options={{ title: 'Bin Management' }} />
      <Stack.Screen name="binsetup" options={{ title: 'Bin Setup' }} />
      <Stack.Screen name="bintypes" options={{ title: 'Bin Types' }} />
      <Stack.Screen name="bincapacity" options={{ title: 'Bin Capacity' }} />
      <Stack.Screen name="binrestrictions" options={{ title: 'Bin Restrictions' }} />
      <Stack.Screen name="adjustmentreasons" options={{ title: 'Adjustment Reasons' }} />
      <Stack.Screen name="adjustmentapproval" options={{ title: 'Adjustment Approval' }} />
      <Stack.Screen name="transfers" options={{ title: 'Inventory Transfers' }} />
      <Stack.Screen name="warehousetransfers" options={{ title: 'Warehouse Transfers' }} />
      <Stack.Screen name="bintransfers" options={{ title: 'Bin Transfers' }} />
      <Stack.Screen name="intransit" options={{ title: 'In-Transit Tracking' }} />
      <Stack.Screen name="cyclecounting" options={{ title: 'Cycle Counting' }} />
      <Stack.Screen name="cycleschedule" options={{ title: 'Cycle Count Scheduling' }} />
      <Stack.Screen name="cyclesessions" options={{ title: 'Cycle Count Sessions' }} />
      <Stack.Screen name="countentry" options={{ title: 'Count Entry' }} />
      <Stack.Screen name="variancereview" options={{ title: 'Variance Review' }} />
      <Stack.Screen name="varianceapproval" options={{ title: 'Variance Approval' }} />
      <Stack.Screen name="abcclassification" options={{ title: 'ABC Classification' }} />
      <Stack.Screen name="physicalinventory" options={{ title: 'Physical Inventory' }} />
      <Stack.Screen name="inventoryfreeze" options={{ title: 'Inventory Freeze' }} />
      <Stack.Screen name="tagcounting" options={{ title: 'Tag Counting' }} />
      
      {/* Levels Advanced - VAULTED */}
      <Stack.Screen name="available" options={{ title: 'Available Quantity' }} />
      <Stack.Screen name="allocated" options={{ title: 'Allocated Quantity' }} />
      <Stack.Screen name="onorder" options={{ title: 'On-Order Quantity' }} />
      <Stack.Screen name="intransitqty" options={{ title: 'In-Transit Quantity' }} />
      <Stack.Screen name="minmax" options={{ title: 'Min/Max Levels' }} />
      <Stack.Screen name="reorderpoints" options={{ title: 'Reorder Points' }} />
      <Stack.Screen name="reorderqty" options={{ title: 'Reorder Quantity' }} />
      <Stack.Screen name="safetystock" options={{ title: 'Safety Stock' }} />
      <Stack.Screen name="leadtimes" options={{ title: 'Lead Time Tracking' }} />
      <Stack.Screen name="vendorleadtime" options={{ title: 'Lead Time by Vendor' }} />
      <Stack.Screen name="eoq" options={{ title: 'Economic Order Quantity' }} />
      <Stack.Screen name="replenishment" options={{ title: 'Replenishment Suggestions' }} />
      <Stack.Screen name="autoreplenish" options={{ title: 'Auto-Replenishment' }} />
      <Stack.Screen name="stockoutalerts" options={{ title: 'Stockout Alerts' }} />
      <Stack.Screen name="overstockalerts" options={{ title: 'Overstock Alerts' }} />
      <Stack.Screen name="deadstock" options={{ title: 'Dead Stock' }} />
      <Stack.Screen name="slowmoving" options={{ title: 'Slow-Moving Inventory' }} />
      <Stack.Screen name="obsolete" options={{ title: 'Obsolete Inventory' }} />
      
      {/* Valuation - VAULTED */}
      <Stack.Screen name="inventoryvaluation" options={{ title: 'Inventory Valuation' }} />
      <Stack.Screen name="valuationbylocation" options={{ title: 'Valuation by Location' }} />
      <Stack.Screen name="valuationmethods" options={{ title: 'Valuation Methods' }} />
      <Stack.Screen name="inventoryvalue" options={{ title: 'Inventory Value Report' }} />
      <Stack.Screen name="valuebycategory" options={{ title: 'Value by Category' }} />
      <Stack.Screen name="landedcost" options={{ title: 'Landed Cost Calculation' }} />
      <Stack.Screen name="freightallocation" options={{ title: 'Freight Allocation' }} />
      <Stack.Screen name="dutyallocation" options={{ title: 'Duty Allocation' }} />
      <Stack.Screen name="costadjustments" options={{ title: 'Cost Adjustments' }} />
      <Stack.Screen name="standardcostupdates" options={{ title: 'Standard Cost Updates' }} />
      <Stack.Screen name="costvariance" options={{ title: 'Cost Variance Tracking' }} />
      <Stack.Screen name="inventoryreserve" options={{ title: 'Inventory Reserve' }} />
      <Stack.Screen name="writeoffs" options={{ title: 'Write-Off Processing' }} />
      <Stack.Screen name="writedowns" options={{ title: 'Write-Down Processing' }} />
      
      {/* Consignment & Special - VAULTED */}
      <Stack.Screen name="consignment" options={{ title: 'Consignment Inventory' }} />
      <Stack.Screen name="consignmenttracking" options={{ title: 'Consignment Tracking' }} />
      <Stack.Screen name="consignmentconsumption" options={{ title: 'Consignment Consumption' }} />
      <Stack.Screen name="consignmentrecon" options={{ title: 'Consignment Reconciliation' }} />
      <Stack.Screen name="customerowned" options={{ title: 'Customer-Owned Inventory' }} />
      <Stack.Screen name="thirdparty" options={{ title: 'Third-Party Inventory' }} />
      <Stack.Screen name="bonded" options={{ title: 'Bonded Inventory' }} />
      <Stack.Screen name="quarantine" options={{ title: 'Quarantine Inventory' }} />
      <Stack.Screen name="qualityhold" options={{ title: 'Quality Hold Inventory' }} />
      <Stack.Screen name="sample" options={{ title: 'Sample Inventory' }} />
      <Stack.Screen name="demo" options={{ title: 'Demo Inventory' }} />
    </Stack>
  );
}
