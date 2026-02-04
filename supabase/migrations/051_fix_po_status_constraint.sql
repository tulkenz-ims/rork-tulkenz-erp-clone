-- Fix procurement_purchase_orders status constraint to include all valid statuses
-- Run this in Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE procurement_purchase_orders DROP CONSTRAINT IF EXISTS procurement_purchase_orders_status_check;

-- Add the updated constraint with all valid statuses
ALTER TABLE procurement_purchase_orders 
ADD CONSTRAINT procurement_purchase_orders_status_check 
CHECK (status IN (
  'draft', 
  'pending_approval', 
  'approved', 
  'rejected', 
  'submitted', 
  'ordered', 
  'partial_received', 
  'received', 
  'pending_service',
  'service_complete',
  'pending_invoice',
  'closed', 
  'cancelled'
));

-- Also fix the po_approvals status constraint to include 'waiting' status
ALTER TABLE po_approvals DROP CONSTRAINT IF EXISTS po_approvals_status_check;

ALTER TABLE po_approvals 
ADD CONSTRAINT po_approvals_status_check 
CHECK (status IN ('pending', 'waiting', 'approved', 'rejected', 'skipped'));

-- Verify the constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('procurement_purchase_orders', 'po_approvals')
  AND tc.constraint_type = 'CHECK';
