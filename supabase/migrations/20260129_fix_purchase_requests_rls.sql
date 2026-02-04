-- Fix RLS policy for purchase_requests table
-- The INSERT policy needs a proper WITH CHECK clause

-- Drop the existing INSERT policy that has null qual
DROP POLICY IF EXISTS "Allow authenticated insert for purchase_requests" ON purchase_requests;

-- Create a new INSERT policy with proper WITH CHECK clause
CREATE POLICY "Allow authenticated insert for purchase_requests"
ON purchase_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also fix the other procurement tables that may have the same issue

-- Fix material_receipts
DROP POLICY IF EXISTS "Allow authenticated insert for material_receipts" ON material_receipts;
CREATE POLICY "Allow authenticated insert for material_receipts"
ON material_receipts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix po_approvals
DROP POLICY IF EXISTS "Allow authenticated insert for po_approvals" ON po_approvals;
CREATE POLICY "Allow authenticated insert for po_approvals"
ON po_approvals
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix procurement_purchase_orders
DROP POLICY IF EXISTS "Allow authenticated insert for procurement_purchase_orders" ON procurement_purchase_orders;
CREATE POLICY "Allow authenticated insert for procurement_purchase_orders"
ON procurement_purchase_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix procurement_vendors
DROP POLICY IF EXISTS "Allow authenticated insert for procurement_vendors" ON procurement_vendors;
CREATE POLICY "Allow authenticated insert for procurement_vendors"
ON procurement_vendors
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix purchase_requisitions
DROP POLICY IF EXISTS "Allow authenticated insert for purchase_requisitions" ON purchase_requisitions;
CREATE POLICY "Allow authenticated insert for purchase_requisitions"
ON purchase_requisitions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
