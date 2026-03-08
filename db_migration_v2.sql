-- ============================================================
-- Football Lab — Migration v2
-- Adiciona data de nascimento e data de início na tabela students
-- Execute no SQL Editor do dashboard do Supabase
-- ============================================================

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS start_date DATE;
