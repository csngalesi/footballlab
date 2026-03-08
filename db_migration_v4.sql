-- ============================================================
-- Football Lab — Migration v4
-- Agendamento automático: Pendente → Atrasado via pg_cron
--
-- ATENÇÃO: pg_cron requer plano Pro ou superior no Supabase.
-- Execute no SQL Editor do dashboard do Supabase.
--
-- Horário: 01:00 BRT (04:00 UTC, pois BRT = UTC-3)
-- ============================================================

-- 1. Habilitar extensão pg_cron (se ainda não estiver ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Remover agendamento anterior (idempotente — evita duplicatas)
SELECT cron.unschedule('marcar-pagamentos-atrasados')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'marcar-pagamentos-atrasados'
);

-- 3. Criar o agendamento: todo dia às 04:00 UTC (= 01:00 BRT)
SELECT cron.schedule(
    'marcar-pagamentos-atrasados',  -- nome do job
    '0 4 * * *',                    -- cron: todo dia às 04:00 UTC
    $$
    UPDATE public.payments
    SET status = 'Atrasado'
    WHERE status = 'Pendente'
      AND due_date < CURRENT_DATE;
    $$
);

-- 4. (Opcional) Verificar jobs agendados
-- SELECT * FROM cron.job;
