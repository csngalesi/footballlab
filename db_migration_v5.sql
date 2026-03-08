-- ============================================================
-- Football Lab — Migration v5
-- Cria tabela parameters, tabela finance (unificada),
-- migra dados de payments → finance e atualiza pg_cron.
-- Execute no SQL Editor do dashboard do Supabase.
-- ============================================================

-- 1. Tabela parameters
CREATE TABLE IF NOT EXISTS public.parameters (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key        TEXT NOT NULL UNIQUE,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON public.parameters
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.parameters (key, value)
VALUES ('monthly_fee', '0')
ON CONFLICT (key) DO NOTHING;

-- 2. Tabela finance (unificada)
CREATE TABLE IF NOT EXISTS public.finance (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL CHECK (type IN ('Receita', 'Despesa')),
    student_id  UUID REFERENCES public.students(id) ON DELETE CASCADE,
    description TEXT,
    amount      NUMERIC(10, 2) NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Pendente'
                    CHECK (status IN ('Pago', 'Pendente', 'Atrasado')),
    due_date    DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access" ON public.finance
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_finance_student   ON public.finance(student_id);
CREATE INDEX IF NOT EXISTS idx_finance_due_date  ON public.finance(due_date);
CREATE INDEX IF NOT EXISTS idx_finance_type      ON public.finance(type);

-- 3. Migrar dados de payments → finance (se a tabela payments existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'payments') THEN
        INSERT INTO public.finance (id, type, student_id, amount, status, due_date, created_at)
        SELECT id, 'Receita', student_id, amount, status, due_date, created_at
        FROM public.payments
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 4. Atualizar pg_cron para usar tabela finance
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('marcar-pagamentos-atrasados')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'marcar-pagamentos-atrasados'
);

SELECT cron.schedule(
    'marcar-pagamentos-atrasados',
    '0 4 * * *',
    $$
    UPDATE public.finance
    SET status = 'Atrasado'
    WHERE status = 'Pendente'
      AND due_date < CURRENT_DATE;
    $$
);

-- 5. (Opcional) Remover tabela antiga após verificar a migração
-- DROP TABLE IF EXISTS public.payments;
