-- ============================================================
-- Football Lab — Schema SQL v6
-- Execute no SQL Editor do dashboard do Supabase
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

-- Alunos
CREATE TABLE IF NOT EXISTS public.students (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    phone       TEXT,
    phone_type  TEXT CHECK (phone_type IN ('Próprio', 'Responsável')),
    email       TEXT,
    email_type  TEXT CHECK (email_type IN ('Próprio', 'Responsável')),
    birth_date   DATE,
    start_date   DATE,
    billing_day  INTEGER NOT NULL DEFAULT 10
                     CHECK (billing_day BETWEEN 1 AND 28),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parâmetros do Sistema
CREATE TABLE IF NOT EXISTS public.parameters (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key        TEXT NOT NULL UNIQUE,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valores padrão
INSERT INTO public.parameters (key, value)
VALUES ('monthly_fee', '0')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.parameters (key, value)
VALUES ('days_to_due', '5')
ON CONFLICT (key) DO NOTHING;

-- Financeiro Unificado (Receitas e Despesas)
CREATE TABLE IF NOT EXISTS public.finance (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        TEXT NOT NULL CHECK (type IN ('Receita', 'Despesa')),
    student_id  UUID REFERENCES public.students(id) ON DELETE CASCADE,
    description TEXT,
    amount      NUMERIC(10, 2) NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Pendente'
                    CHECK (status IN ('Pago', 'Pendente', 'Atrasado')),
    due_date      DATE NOT NULL,
    pix_code      TEXT,
    gateway_id    TEXT,
    payment_date  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aulas (slots da grade horária)
CREATE TABLE IF NOT EXISTS public.schedule_classes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Segunda, 6=Sábado
    start_time   TIME NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (day_of_week, start_time)
);

-- Matrículas em aulas (aluno <-> aula)
CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_class_id   UUID NOT NULL REFERENCES public.schedule_classes(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (schedule_class_id, student_id)
);

-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_classes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas usuários autenticados têm acesso total
CREATE POLICY "auth_full_access" ON public.students
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.parameters
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.finance
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.schedule_classes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.class_enrollments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ÍNDICES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_finance_student    ON public.finance(student_id);
CREATE INDEX IF NOT EXISTS idx_finance_due_date   ON public.finance(due_date);
CREATE INDEX IF NOT EXISTS idx_finance_type       ON public.finance(type);
CREATE INDEX IF NOT EXISTS idx_enrollments_class  ON public.class_enrollments(schedule_class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day_time  ON public.schedule_classes(day_of_week, start_time);

-- ============================================================
-- 4. FUNÇÃO generate_monthly_bills()
-- Gera Receitas automáticas para alunos cujo billing_day = hoje
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_monthly_bills()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fee  NUMERIC;
    v_days INTEGER;
    r      RECORD;
BEGIN
    SELECT COALESCE(value::NUMERIC, 0)
      INTO v_fee
      FROM public.parameters
     WHERE key = 'monthly_fee';

    SELECT COALESCE(value::INTEGER, 5)
      INTO v_days
      FROM public.parameters
     WHERE key = 'days_to_due';

    -- Todos os alunos cujo billing_day já chegou (ou passou) este mês
    FOR r IN
        SELECT id, billing_day
          FROM public.students
         WHERE billing_day <= EXTRACT(DAY FROM CURRENT_DATE)::INTEGER
    LOOP
        IF NOT EXISTS (
            SELECT 1
              FROM public.finance
             WHERE type       = 'Receita'
               AND student_id = r.id
               AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM CURRENT_DATE)
               AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        ) THEN
            INSERT INTO public.finance (type, student_id, amount, status, due_date)
            VALUES (
                'Receita',
                r.id,
                v_fee,
                'Pendente',
                (DATE_TRUNC('month', CURRENT_DATE)
                    + ((r.billing_day - 1) || ' days')::INTERVAL
                    + (v_days           || ' days')::INTERVAL
                )::DATE
            );
        END IF;
    END LOOP;
END;
$$;

-- ============================================================
-- 5. CRON JOBS — pg_cron (requer plano Pro ou superior no Supabase)
-- Executam todo dia às 04:00 UTC (= 01:00 BRT)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('marcar-pagamentos-atrasados')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'marcar-pagamentos-atrasados'
);

SELECT cron.unschedule('gerar-mensalidades')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'gerar-mensalidades'
);

-- Job: Pendente → Atrasado
SELECT cron.schedule(
    'marcar-pagamentos-atrasados',
    '0 4 * * *',
    $$
    UPDATE public.finance
       SET status = 'Atrasado'
     WHERE status   = 'Pendente'
       AND due_date < CURRENT_DATE;
    $$
);

-- Job: gerar mensalidades automáticas
SELECT cron.schedule(
    'gerar-mensalidades',
    '0 4 * * *',
    $$ SELECT public.generate_monthly_bills(); $$
);
