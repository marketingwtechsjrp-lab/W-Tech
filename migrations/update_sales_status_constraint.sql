-- Drop the old constraint
ALTER TABLE "SITE_Sales" DROP CONSTRAINT IF EXISTS "SITE_Sales_status_check";

-- Add the new constraint with 'negotiation' and 'approved'
ALTER TABLE "SITE_Sales" ADD CONSTRAINT "SITE_Sales_status_check" 
CHECK (status IN ('negotiation', 'approved', 'pending', 'paid', 'producing', 'shipped', 'delivered', 'cancelled'));
