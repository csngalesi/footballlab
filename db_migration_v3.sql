-- ============================================================
-- Football Lab — Migration v3
-- Adiciona tipo de telefone, email e tipo de email na tabela students
-- Execute no SQL Editor do dashboard do Supabase
-- ============================================================

ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS phone_type TEXT CHECK (phone_type IN ('Próprio', 'Responsável')),
    ADD COLUMN IF NOT EXISTS email      TEXT,
    ADD COLUMN IF NOT EXISTS email_type TEXT CHECK (email_type IN ('Próprio', 'Responsável'));
