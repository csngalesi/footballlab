-- Football Lab — Migration v8
-- Adiciona suporte a pré-cadastro na tabela students
-- Execute no SQL Editor do Supabase

-- Tipo do cadastro: 'aluno' (padrão) ou 'pre-cadastro'
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS student_type TEXT NOT NULL DEFAULT 'aluno'
        CHECK (student_type IN ('aluno', 'pre-cadastro'));

-- Dia e horário de preferência (usado apenas no pré-cadastro)
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS preferred_schedule TEXT;
