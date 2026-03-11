-- ============================================================
-- Football Lab — Migration v7
-- • Corrige generate_monthly_bills(): billing_day <= hoje
--   para pegar todos os alunos cujo dia de cobrança já passou
--   no mês corrente e ainda não têm Receita gerada.
-- • due_date calculado pelo billing_day do aluno (não por hoje).
-- Execute no SQL Editor do dashboard do Supabase.
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
        -- Só insere se ainda não existe Receita para este aluno no mês/ano corrente
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
                -- due_date = dia de cobrança do aluno neste mês + days_to_due
                (DATE_TRUNC('month', CURRENT_DATE)
                    + ((r.billing_day - 1) || ' days')::INTERVAL
                    + (v_days           || ' days')::INTERVAL
                )::DATE
            );
        END IF;
    END LOOP;
END;
$$;
