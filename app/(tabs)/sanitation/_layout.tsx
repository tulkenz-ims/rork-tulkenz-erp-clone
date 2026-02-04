import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function SanitationLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' as const },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Sanitation', headerShown: true }} />
      <Stack.Screen name="chemicals" options={{ title: 'Chemicals & Supplies' }} />
      <Stack.Screen name="mss" options={{ title: 'Master Sanitation Schedule' }} />
      <Stack.Screen name="dailytasks" options={{ title: 'Daily Sanitation Tasks' }} />
      <Stack.Screen name="weeklytasks" options={{ title: 'Weekly Sanitation Tasks' }} />
      <Stack.Screen name="monthlytasks" options={{ title: 'Monthly Sanitation Tasks' }} />
      <Stack.Screen name="deepclean" options={{ title: 'Deep Clean Schedule' }} />
      <Stack.Screen name="zonemap" options={{ title: 'Sanitation Zone Map' }} />
      <Stack.Screen name="crewassignment" options={{ title: 'Crew Assignment Log' }} />
      <Stack.Screen name="restroomcleaning" options={{ title: 'Restroom Cleaning Checklist' }} />
      <Stack.Screen name="restroominspection" options={{ title: 'Restroom Inspection Log' }} />
      <Stack.Screen name="restroomdeepclean" options={{ title: 'Restroom Deep Clean Record' }} />
      <Stack.Screen name="restroomsupply" options={{ title: 'Restroom Supply Check' }} />
      <Stack.Screen name="breakroomcleaning" options={{ title: 'Break Room Cleaning' }} />
      <Stack.Screen name="breakroomfridge" options={{ title: 'Break Room Refrigerator Cleaning' }} />
      <Stack.Screen name="microwavecleaning" options={{ title: 'Microwave/Appliance Cleaning' }} />
      <Stack.Screen name="lockerroomcleaning" options={{ title: 'Locker Room Cleaning' }} />
      <Stack.Screen name="lockerroominspection" options={{ title: 'Locker Room Inspection' }} />
      <Stack.Screen name="vendingarea" options={{ title: 'Vending Area Cleaning' }} />
      <Stack.Screen name="officecleaning" options={{ title: 'Office Cleaning Checklist' }} />
      <Stack.Screen name="conferenceroom" options={{ title: 'Conference Room Cleaning' }} />
      <Stack.Screen name="lobbycleaning" options={{ title: 'Reception/Lobby Cleaning' }} />
      <Stack.Screen name="hallwaycleaning" options={{ title: 'Hallway/Corridor Cleaning' }} />
      <Stack.Screen name="stairwellcleaning" options={{ title: 'Stairwell Cleaning' }} />
      <Stack.Screen name="entrancecleaning" options={{ title: 'Entrance/Exit Area Cleaning' }} />
      <Stack.Screen name="floormopping" options={{ title: 'Floor Mopping Log' }} />
      <Stack.Screen name="floorscrubbing" options={{ title: 'Floor Scrubbing/Buffing Schedule' }} />
      <Stack.Screen name="floorwaxing" options={{ title: 'Floor Waxing/Stripping Record' }} />
      <Stack.Screen name="carpetcleaning" options={{ title: 'Carpet Cleaning Log' }} />
      <Stack.Screen name="floormatcleaning" options={{ title: 'Floor Mat Cleaning Log' }} />
      <Stack.Screen name="trashremoval" options={{ title: 'Trash Removal Log' }} />
      <Stack.Screen name="wastecontainer" options={{ title: 'Waste Container Cleaning' }} />
      <Stack.Screen name="dumpsterarea" options={{ title: 'Dumpster Area Sanitation' }} />
      <Stack.Screen name="recyclingarea" options={{ title: 'Recycling Area Cleaning' }} />
      <Stack.Screen name="trashliner" options={{ title: 'Trash Can Liner Replacement' }} />
      <Stack.Screen name="windowcleaning" options={{ title: 'Window Cleaning Schedule' }} />
      <Stack.Screen name="glasscleaning" options={{ title: 'Interior Glass/Mirror Cleaning' }} />
      <Stack.Screen name="doorglasscleaning" options={{ title: 'Door Glass Cleaning' }} />
      <Stack.Screen name="toiletpaperinventory" options={{ title: 'Toilet Paper Inventory' }} />
      <Stack.Screen name="papertowerinventory" options={{ title: 'Paper Towel Inventory' }} />
      <Stack.Screen name="handsoapinventory" options={{ title: 'Hand Soap Inventory' }} />
      <Stack.Screen name="sanitizerinventory" options={{ title: 'Hand Sanitizer Inventory' }} />
      <Stack.Screen name="trashlinerinventory" options={{ title: 'Trash Liner Inventory' }} />
      <Stack.Screen name="airfreshenerinventory" options={{ title: 'Air Freshener Inventory' }} />
      <Stack.Screen name="gloveinventory" options={{ title: 'Glove Inventory Log' }} />
      <Stack.Screen name="gloveissuance" options={{ title: 'Glove Issuance Log' }} />
      <Stack.Screen name="hairnetinventory" options={{ title: 'Hairnet Inventory Log' }} />
      <Stack.Screen name="hairnetissuance" options={{ title: 'Hairnet Issuance Log' }} />
      <Stack.Screen name="beardnetinventory" options={{ title: 'Beard Net Inventory Log' }} />
      <Stack.Screen name="beardnetissuance" options={{ title: 'Beard Net Issuance Log' }} />
      <Stack.Screen name="shoecoverinventory" options={{ title: 'Shoe/Boot Cover Inventory' }} />
      <Stack.Screen name="shoecoverissuance" options={{ title: 'Shoe/Boot Cover Issuance' }} />
      <Stack.Screen name="towelinventory" options={{ title: 'Towel Inventory Log' }} />
      <Stack.Screen name="towelissuance" options={{ title: 'Towel Issuance Log' }} />
      <Stack.Screen name="raginventory" options={{ title: 'Rag Inventory Log' }} />
      <Stack.Screen name="ragissuance" options={{ title: 'Rag Issuance Log' }} />
      <Stack.Screen name="aproninventory" options={{ title: 'Apron/Smock Inventory' }} />
      <Stack.Screen name="apronissuance" options={{ title: 'Apron/Smock Issuance' }} />
      <Stack.Screen name="sleevecoverinventory" options={{ title: 'Sleeve Cover Inventory' }} />
      <Stack.Screen name="facemaskinventory" options={{ title: 'Face Mask Inventory' }} />
      <Stack.Screen name="consumablesreorder" options={{ title: 'Consumables Reorder List' }} />
      <Stack.Screen name="supplyroomstock" options={{ title: 'Supply Room Stock Check' }} />
      <Stack.Screen name="cleaningtoolinventory" options={{ title: 'Cleaning Tool Inventory' }} />
      <Stack.Screen name="cleaningtoolinspection" options={{ title: 'Cleaning Tool Inspection' }} />
      <Stack.Screen name="mopbucketreplacement" options={{ title: 'Mop/Bucket Replacement Log' }} />
      <Stack.Screen name="vacuummaintenance" options={{ title: 'Vacuum Maintenance Log' }} />
      <Stack.Screen name="floorscrubberpm" options={{ title: 'Floor Scrubber Maintenance' }} />
      <Stack.Screen name="cleaningcartinspection" options={{ title: 'Cleaning Cart Inspection' }} />
      <Stack.Screen name="parkingsweeping" options={{ title: 'Parking Lot Sweeping' }} />
      <Stack.Screen name="sidewalkcleaning" options={{ title: 'Sidewalk Cleaning' }} />
      <Stack.Screen name="smokingareacleaning" options={{ title: 'Smoking Area Cleaning' }} />
      <Stack.Screen name="exteriortrashcan" options={{ title: 'Exterior Trash Can Cleaning' }} />
      <Stack.Screen name="sanitationtraining" options={{ title: 'Sanitation Training Sign-In' }} />
      <Stack.Screen name="chemicalsafetytraining" options={{ title: 'Cleaning Chemical Safety Training' }} />
      <Stack.Screen name="sanitationsop" options={{ title: 'Sanitation SOP Acknowledgment' }} />
      <Stack.Screen name="newhireorientation" options={{ title: 'New Hire Sanitation Orientation' }} />
      <Stack.Screen name="sanitationncr" options={{ title: 'Sanitation Non-Conformance Report' }} />
      <Stack.Screen name="sanitationcapa" options={{ title: 'Sanitation Corrective Action' }} />
      <Stack.Screen name="repeatdeficiency" options={{ title: 'Repeat Deficiency Tracking' }} />
      <Stack.Screen name="sanitationdeviation" options={{ title: 'Sanitation Deviation Report' }} />
    </Stack>
  );
}
