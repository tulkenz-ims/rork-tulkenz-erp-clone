-- Clear all procurement data to start fresh
-- Run this in Supabase SQL Editor

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- Clear PO related tables first (due to foreign key constraints)
DELETE FROM po_revisions;
DELETE FROM blanket_po_releases;
DELETE FROM drop_ship_orders;
DELETE FROM service_purchase_orders;

-- Clear PO approvals
DELETE FROM po_approvals;

-- Clear material receipts
DELETE FROM material_receipts;

-- Clear procurement PO line items and POs
DELETE FROM procurement_po_line_items;
DELETE FROM procurement_purchase_orders;

-- Clear blanket POs
DELETE FROM blanket_purchase_orders;

-- Clear requisition line items and requisitions
DELETE FROM purchase_requisition_line_items;
DELETE FROM purchase_requisitions;

-- Clear request line items and requests
DELETE FROM purchase_request_line_items;
DELETE FROM purchase_requests;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify all tables are empty
SELECT 'purchase_requests' as table_name, COUNT(*) as count FROM purchase_requests
UNION ALL
SELECT 'purchase_request_line_items', COUNT(*) FROM purchase_request_line_items
UNION ALL
SELECT 'purchase_requisitions', COUNT(*) FROM purchase_requisitions
UNION ALL
SELECT 'purchase_requisition_line_items', COUNT(*) FROM purchase_requisition_line_items
UNION ALL
SELECT 'procurement_purchase_orders', COUNT(*) FROM procurement_purchase_orders
UNION ALL
SELECT 'procurement_po_line_items', COUNT(*) FROM procurement_po_line_items
UNION ALL
SELECT 'po_approvals', COUNT(*) FROM po_approvals
UNION ALL
SELECT 'material_receipts', COUNT(*) FROM material_receipts;
