/**
 * Football Lab — Data Access Layer (API)
 * Todas as operações com o Supabase ficam centralizadas aqui.
 * Expostas via window.API
 */
(function () {
    'use strict';

    const db = () => window.supabaseClient;

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------
    function handleError(context, error) {
        console.error(`[API:${context}]`, error);
        throw error;
    }

    // ----------------------------------------------------------
    // STUDENTS
    // ----------------------------------------------------------
    const Students = {
        /**
         * Busca todos os alunos, ordenados por nome.
         */
        getAll: async function () {
            const { data, error } = await db()
                .from('students')
                .select('*')
                .order('full_name');
            if (error) handleError('Students.getAll', error);
            return data;
        },

        /**
         * Busca um aluno pelo ID.
         */
        getById: async function (id) {
            const { data, error } = await db()
                .from('students')
                .select('*')
                .eq('id', id)
                .single();
            if (error) handleError('Students.getById', error);
            return data;
        },

        /**
         * Cria um novo aluno.
         * @param {{ full_name: string, father_name: string, mother_name: string, phone: string }} payload
         */
        create: async function (payload) {
            const { data, error } = await db()
                .from('students')
                .insert(payload)
                .select()
                .single();
            if (error) handleError('Students.create', error);
            return data;
        },

        /**
         * Atualiza um aluno existente.
         */
        update: async function (id, payload) {
            const { data, error } = await db()
                .from('students')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) handleError('Students.update', error);
            return data;
        },

        /**
         * Remove um aluno (cascade deleta pagamentos e matrículas).
         */
        delete: async function (id) {
            const { error } = await db()
                .from('students')
                .delete()
                .eq('id', id);
            if (error) handleError('Students.delete', error);
        },
    };

    // ----------------------------------------------------------
    // PAYMENTS
    // ----------------------------------------------------------
    const Payments = {
        /**
         * Busca pagamentos com nome do aluno, com filtros opcionais.
         * @param {{ studentId?: string, month?: number, year?: number }} opts
         */
        getAll: async function (opts = {}) {
            let query = db()
                .from('payments')
                .select(`
                    id,
                    amount,
                    status,
                    due_date,
                    created_at,
                    student_id,
                    students ( full_name )
                `)
                .order('due_date', { ascending: false });

            if (opts.studentId) {
                query = query.eq('student_id', opts.studentId);
            }

            if (opts.month && opts.year) {
                // Filtra pelo mês/ano da due_date
                const startDate = `${opts.year}-${String(opts.month).padStart(2, '0')}-01`;
                const endDate   = new Date(opts.year, opts.month, 0);
                const endStr    = `${opts.year}-${String(opts.month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
                query = query.gte('due_date', startDate).lte('due_date', endStr);
            }

            const { data, error } = await query;
            if (error) handleError('Payments.getAll', error);
            return data;
        },

        /**
         * Cria um registro de pagamento.
         * @param {{ student_id: string, amount: number, status: string, due_date: string }} payload
         */
        create: async function (payload) {
            const { data, error } = await db()
                .from('payments')
                .insert(payload)
                .select(`
                    id, amount, status, due_date, created_at, student_id,
                    students ( full_name )
                `)
                .single();
            if (error) handleError('Payments.create', error);
            return data;
        },

        /**
         * Atualiza o status / valor de um pagamento.
         */
        update: async function (id, payload) {
            const { data, error } = await db()
                .from('payments')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) handleError('Payments.update', error);
            return data;
        },

        /**
         * Remove um pagamento.
         */
        delete: async function (id) {
            const { error } = await db()
                .from('payments')
                .delete()
                .eq('id', id);
            if (error) handleError('Payments.delete', error);
        },

        /**
         * Resumo financeiro de um mês/ano específico.
         * Retorna { totalPago, totalPendente, totalAtrasado, totalGeral }
         */
        getSummary: async function (month, year) {
            const payments = await Payments.getAll({ month, year });
            const summary = { totalPago: 0, totalPendente: 0, totalAtrasado: 0, totalGeral: 0 };

            payments.forEach(p => {
                const val = parseFloat(p.amount) || 0;
                summary.totalGeral += val;
                if (p.status === 'Pago')      summary.totalPago      += val;
                if (p.status === 'Pendente')  summary.totalPendente  += val;
                if (p.status === 'Atrasado')  summary.totalAtrasado  += val;
            });

            return summary;
        },
    };

    // ----------------------------------------------------------
    // SCHEDULE
    // ----------------------------------------------------------
    const Schedule = {
        /**
         * Busca ou cria uma aula (slot) baseado no dia/hora.
         * Usa upsert para garantir idempotência.
         */
        getOrCreateClass: async function (dayOfWeek, startTime) {
            // Tenta buscar primeiro
            const { data: existing, error: fetchErr } = await db()
                .from('schedule_classes')
                .select('id')
                .eq('day_of_week', dayOfWeek)
                .eq('start_time', startTime)
                .maybeSingle();

            if (fetchErr) handleError('Schedule.getOrCreateClass', fetchErr);

            if (existing) return existing;

            // Cria se não existir
            const { data, error } = await db()
                .from('schedule_classes')
                .insert({ day_of_week: dayOfWeek, start_time: startTime })
                .select('id')
                .single();

            if (error) handleError('Schedule.getOrCreateClass (insert)', error);
            return data;
        },

        /**
         * Busca todas as matrículas com info do aluno e do horário.
         * Retorna um map: { "day_startTime": [ { enrollmentId, studentId, studentName } ] }
         */
        getAllEnrollments: async function () {
            const { data, error } = await db()
                .from('class_enrollments')
                .select(`
                    id,
                    student_id,
                    schedule_class_id,
                    students ( full_name ),
                    schedule_classes ( day_of_week, start_time )
                `);

            if (error) handleError('Schedule.getAllEnrollments', error);

            // Converte para map indexado por "day_startTime"
            const map = {};
            (data || []).forEach(enr => {
                const sc = enr.schedule_classes;
                if (!sc) return;
                const key = `${sc.day_of_week}_${sc.start_time.substring(0, 5)}`;
                if (!map[key]) map[key] = [];
                map[key].push({
                    enrollmentId:    enr.id,
                    scheduleClassId: enr.schedule_class_id,
                    studentId:       enr.student_id,
                    studentName:     enr.students ? enr.students.full_name : '?',
                });
            });

            return map;
        },

        /**
         * Matricula um aluno em um slot (cria enrollment).
         */
        enroll: async function (scheduleClassId, studentId) {
            const { data, error } = await db()
                .from('class_enrollments')
                .insert({ schedule_class_id: scheduleClassId, student_id: studentId })
                .select('id')
                .single();

            if (error) handleError('Schedule.enroll', error);
            return data;
        },

        /**
         * Remove uma matrícula pelo ID de enrollment.
         */
        removeEnrollment: async function (enrollmentId) {
            const { error } = await db()
                .from('class_enrollments')
                .delete()
                .eq('id', enrollmentId);

            if (error) handleError('Schedule.removeEnrollment', error);
        },
    };

    // ----------------------------------------------------------
    // Expõe globalmente
    // ----------------------------------------------------------
    window.API = {
        Students,
        Payments,
        Schedule,
    };

    console.info('[FootballLab] API layer carregado.');
})();
