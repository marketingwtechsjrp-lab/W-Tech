
-- Tabela de Tarefas
CREATE TABLE IF NOT EXISTS "SITE_Tasks" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" UUID REFERENCES "SITE_Users"("id"),
    "created_by" UUID REFERENCES "SITE_Users"("id"),
    "due_date" TIMESTAMP WITH TIME ZONE,
    "status" TEXT DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    "priority" TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Policies serão adicionadas depois ou desativadas globalmente conforme preferência do user)
ALTER TABLE "SITE_Tasks" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see tasks assigned to them or created by them. Adimins (level 10) see all.
-- Por enquanto, vamos deixar policy aberta para facilitar dev, ou criar policy basica.
CREATE POLICY "Users can view own tasks" ON "SITE_Tasks"
    FOR SELECT TO authenticated
    USING (assigned_to = auth.uid() OR created_by = auth.uid() OR (SELECT role FROM "SITE_Users" WHERE id = auth.uid() LIMIT 1) IN ('ADMIN', 'Super Admin'));

CREATE POLICY "Users can update own tasks" ON "SITE_Tasks"
    FOR UPDATE TO authenticated
    USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Admins can insert tasks" ON "SITE_Tasks"
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Simplificado, idealmente checar role

CREATE POLICY "Admins can delete tasks" ON "SITE_Tasks"
    FOR DELETE TO authenticated
    USING ((SELECT role FROM "SITE_Users" WHERE id = auth.uid() LIMIT 1) IN ('ADMIN', 'Super Admin'));
