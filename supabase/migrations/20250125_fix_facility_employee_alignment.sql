-- Fix facility/employee data alignment
-- The prepopulated employees are assigned to facilities that don't belong to their organization

-- Option 1: Reassign employees to a valid facility within their org
-- Org 74ce281d-5630-422d-8326-e5d36cfc1d5e has these valid facilities:
-- - f0000000-0000-0000-0000-000000000003 (Headquarters)
-- - 32e5177f-8cc1-4bbd-a323-6cbd0cc1f9ca (West Facility)
-- - fde3b458-e4ce-4416-b4fb-dfb7ee262685 (East Facility)

-- Update ADMIN001 to Headquarters (was pointing to Main Office which belongs to different org)
UPDATE employees 
SET facility_id = 'f0000000-0000-0000-0000-000000000003'
WHERE id = '00000000-0000-0000-0000-000000000003'
  AND organization_id = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

-- Update MGR001 to West Facility (was pointing to ACME Plant 1 which belongs to different org)
UPDATE employees 
SET facility_id = '32e5177f-8cc1-4bbd-a323-6cbd0cc1f9ca'
WHERE id = 'e0000000-0000-0000-0000-000000000001'
  AND organization_id = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

-- Update TECH001 to West Facility (same issue as MGR001)
UPDATE employees 
SET facility_id = '32e5177f-8cc1-4bbd-a323-6cbd0cc1f9ca'
WHERE id = 'e0000000-0000-0000-0000-000000000002'
  AND organization_id = '74ce281d-5630-422d-8326-e5d36cfc1d5e';

-- Clean up orphaned prepopulated facilities that don't belong to any real org
-- (Only run if you want to remove demo data for non-existent orgs)
-- DELETE FROM facilities WHERE organization_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM facilities WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
