-- ============================================================
-- Football Lab - Schema SQL
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
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pagamentos / Mensalidades
CREATE TABLE IF NOT EXISTS public.payments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount      NUMERIC(10, 2) NOT NULL,
    status      TEXT NOT NULL DEFAULT 'Pendente'
                    CHECK (status IN ('Pago', 'Pendente', 'Atrasado')),
    due_date    DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_classes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas usuários autenticados têm acesso total
CREATE POLICY "auth_full_access" ON public.students
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.schedule_classes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access" ON public.class_enrollments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ÍNDICES (performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payments_student     ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date    ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_class    ON public.class_enrollments(schedule_class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student  ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day_time    ON public.schedule_classes(day_of_week, start_time);
