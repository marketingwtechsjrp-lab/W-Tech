-- SITE_Transactions Table (Finance Module)
CREATE TABLE IF NOT EXISTS "SITE_Transactions" (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    type TEXT CHECK (type IN ('Income', 'Expense')), -- Income (Receita), Expense (Despesa)
    category TEXT, -- e.g., 'Course Sale', 'Material', 'Marketing'
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT, -- Pix, Card, Cash, etc.
    status TEXT DEFAULT 'Completed', -- Pending, Completed
    enrollment_id UUID REFERENCES "SITE_Enrollments"(id) ON DELETE SET NULL, -- Link to student enrollment if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS for Transactions
ALTER TABLE "SITE_Transactions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "SITE_Transactions";
CREATE POLICY "Enable all access for authenticated users" ON "SITE_Transactions"
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
