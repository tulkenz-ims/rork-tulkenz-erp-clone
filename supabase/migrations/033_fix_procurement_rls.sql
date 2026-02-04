-- Fix Procurement RLS Policies
-- Run this in Supabase SQL Editor

-- ============================================
-- Purchase Requests RLS Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon select for purchase_requests" ON purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated select for purchase_requests" ON purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated insert for purchase_requests" ON purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated update for purchase_requests" ON purchase_requests;
DROP POLICY IF EXISTS "Allow authenticated delete for purchase_requests" ON purchase_requests;

-- Create SELECT policy
CREATE POLICY "Allow anon select for purchase_requests"
ON purchase_requests FOR SELECT
TO anon, authenticated
USING (true);

-- Create INSERT policy
CREATE POLICY "Allow authenticated insert for purchase_requests"
ON purchase_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Create UPDATE policy
CREATE POLICY "Allow authenticated update for purchase_requests"
ON purchase_requests FOR UPDATE
TO anon, authenticated
USING (true);

-- Create DELETE policy
CREATE POLICY "Allow authenticated delete for purchase_requests"
ON purchase_requests FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- Purchase Requisitions RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for purchase_requisitions" ON purchase_requisitions;
DROP POLICY IF EXISTS "Allow authenticated select for purchase_requisitions" ON purchase_requisitions;
DROP POLICY IF EXISTS "Allow authenticated insert for purchase_requisitions" ON purchase_requisitions;
DROP POLICY IF EXISTS "Allow authenticated update for purchase_requisitions" ON purchase_requisitions;
DROP POLICY IF EXISTS "Allow authenticated delete for purchase_requisitions" ON purchase_requisitions;

CREATE POLICY "Allow anon select for purchase_requisitions"
ON purchase_requisitions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for purchase_requisitions"
ON purchase_requisitions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for purchase_requisitions"
ON purchase_requisitions FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated delete for purchase_requisitions"
ON purchase_requisitions FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- Procurement Purchase Orders RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for procurement_purchase_orders" ON procurement_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated select for procurement_purchase_orders" ON procurement_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated insert for procurement_purchase_orders" ON procurement_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated update for procurement_purchase_orders" ON procurement_purchase_orders;
DROP POLICY IF EXISTS "Allow authenticated delete for procurement_purchase_orders" ON procurement_purchase_orders;

CREATE POLICY "Allow anon select for procurement_purchase_orders"
ON procurement_purchase_orders FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for procurement_purchase_orders"
ON procurement_purchase_orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for procurement_purchase_orders"
ON procurement_purchase_orders FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated delete for procurement_purchase_orders"
ON procurement_purchase_orders FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- PO Approvals RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for po_approvals" ON po_approvals;
DROP POLICY IF EXISTS "Allow authenticated select for po_approvals" ON po_approvals;
DROP POLICY IF EXISTS "Allow authenticated insert for po_approvals" ON po_approvals;
DROP POLICY IF EXISTS "Allow authenticated update for po_approvals" ON po_approvals;
DROP POLICY IF EXISTS "Allow authenticated delete for po_approvals" ON po_approvals;

CREATE POLICY "Allow anon select for po_approvals"
ON po_approvals FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for po_approvals"
ON po_approvals FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for po_approvals"
ON po_approvals FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated delete for po_approvals"
ON po_approvals FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- Material Receipts RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for material_receipts" ON material_receipts;
DROP POLICY IF EXISTS "Allow authenticated select for material_receipts" ON material_receipts;
DROP POLICY IF EXISTS "Allow authenticated insert for material_receipts" ON material_receipts;
DROP POLICY IF EXISTS "Allow authenticated update for material_receipts" ON material_receipts;
DROP POLICY IF EXISTS "Allow authenticated delete for material_receipts" ON material_receipts;

CREATE POLICY "Allow anon select for material_receipts"
ON material_receipts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for material_receipts"
ON material_receipts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for material_receipts"
ON material_receipts FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated delete for material_receipts"
ON material_receipts FOR DELETE
TO anon, authenticated
USING (true);

-- ============================================
-- Procurement Vendors RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Allow anon select for procurement_vendors" ON procurement_vendors;
DROP POLICY IF EXISTS "Allow authenticated select for procurement_vendors" ON procurement_vendors;
DROP POLICY IF EXISTS "Allow authenticated insert for procurement_vendors" ON procurement_vendors;
DROP POLICY IF EXISTS "Allow authenticated update for procurement_vendors" ON procurement_vendors;
DROP POLICY IF EXISTS "Allow authenticated delete for procurement_vendors" ON procurement_vendors;

CREATE POLICY "Allow anon select for procurement_vendors"
ON procurement_vendors FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated insert for procurement_vendors"
ON procurement_vendors FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update for procurement_vendors"
ON procurement_vendors FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated delete for procurement_vendors"
ON procurement_vendors FOR DELETE
TO anon, authenticated
USING (true);

-- Verify the policies were created
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('purchase_requests', 'purchase_requisitions', 'procurement_purchase_orders', 'po_approvals', 'material_receipts', 'procurement_vendors')
ORDER BY tablename, policyname;
