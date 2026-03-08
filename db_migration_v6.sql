-- ============================================================
-- Football Lab — Migration v6
-- • students: adiciona billing_day (dia do mês para cobrança)
-- • parameters: garante chaves monthly_fee e days_to_due
-- • finance: colunas preparatórias para Pix Itaú
-- • pg_cron: recria jobs e cria generate_monthly_bills()
-- Execute no SQL Editor do dashboard do Supabase.
-- ============================================================

-- 1. students: billing_day
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS billing_day INTEGER NOT NULL DEFAULT 10
        CHECK (billing_day BETWEEN 1 AND 28);

-- 2. parameters: garantir chaves essenciais
INSERT INTO public.parameters (key, value)
VALUES ('monthly_fee', '0')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.parameters (key, value)
VALUES ('days_to_due', '5')
ON CONFLICT (key) DO NOTHING;

-- 3. finance: colunas preparatórias para Pix Itaú
ALTER TABLE public.finance
    ADD COLUMN IF NOT EXISTS pix_code     TEXT,
    ADD COLUMN IF NOT EXISTS gateway_id   TEXT,
    ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

-- 4. Função generate_monthly_bills()
CREATE OR REPLACE FUNCTION public.generate_monthly_bills()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fee      NUMERIC;
    v_days     INTEGER;
    v_due_date DATE;
    r          RECORD;
BEGIN
    -- Lê parâmetros do sistema
    SELECT COALESCE(value::NUMERIC, 0)
      INTO v_fee
      FROM public.parameters
     WHERE key = 'monthly_fee';

    SELECT COALESCE(value::INTEGER, 5)
      INTO v_days
      FROM public.parameters
     WHERE key = 'days_to_due';

    v_due_date := CURRENT_DATE + v_days;

    -- Para cada aluno cujo billing_day coincide com o dia de hoje
    FOR r IN
        SELECT id
          FROM public.students
         WHERE billing_day = EXTRACT(DAY FROM CURRENT_DATE)::INTEGER
    LOOP
        -- Insere apenas se ainda não existe Receita para este aluno no mês/ano corrente
        IF NOT EXISTS (
            SELECT 1
              FROM public.finance
             WHERE type       = 'Receita'
               AND student_id = r.id
               AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM CURRENT_DATE)
               AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)
        ) THEN
            INSERT INTO public.finance (type, student_id, amount, status, due_date)
            VALUES ('Receita', r.id, v_fee, 'Pendente', v_due_date);
        END IF;
    END LOOP;
END;
$$;

-- 5. Recria jobs pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5a. Remove jobs anteriores (se existirem)
SELECT cron.unschedule('marcar-pagamentos-atrasados')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'marcar-pagamentos-atrasados'
);

SELECT cron.unschedule('gerar-mensalidades')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'gerar-mensalidades'
);

-- 5b. Job: Pendente → Atrasado (04:00 UTC = 01:00 BRT)
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

-- 5c. Job: gerar mensalidades automáticas (04:00 UTC = 01:00 BRT)
SELECT cron.schedule(
    'gerar-mensalidades',
    '0 4 * * *',
    $$ SELECT public.generate_monthly_bills(); $$
);
