-- Create a function to check and update overdue invoices
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update invoices that are overdue based on payment terms
    UPDATE "SalesInvoice" si
    SET 
        "Status" = 'Overdue'
    FROM "Customer" c
    WHERE 
        si."Customer_name" = c."Customer_name"
        AND si."Status" = 'Pending'
        AND c."Customer_PaymentTerms" IS NOT NULL
        AND si."InvoiceDate" + (c."Customer_PaymentTerms" || ' days')::interval < NOW()
        AND si."OutstandingAmount" > 0;
END;
$$;

-- Create a scheduled job to run every hour
SELECT cron.schedule(
    'check-overdue-invoices',  -- job name
    '0 * * * *',              -- cron schedule (every hour at minute 0)
    $$SELECT check_overdue_invoices()$$
); 