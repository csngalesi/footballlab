/**
 * Football Lab — Data Access Layer (API)
 * Todas as operações com o Supabase ficam centralizadas aqui.
 * Expostas via window.API
 */
(function () {
    'use strict';

    const db = () => window.supabaseClient;

    function handleError(context, error) {
        console.error(`[API:${context}]`, error);
        throw error;
    }

    // ----------------------------------------------------------
    // STUDENTS
    // ----------------------------------------------------------
    const Students = {
        getAll: async function () {
            const { data, error } = await db()
                .from('students')
                .select('*')
                .order('full_name');
            if (error) handleError('Students.getAll', error);
            return data;
        },

        getById: async function (id) {
            const { data, error } = await db()
                .from('students')
                .select('*')
                .eq('id', id)
                .single();
            if (error) handleError('Students.getById', error);
            return data;
        },

        create: async function (payload) {
            const { data, error } = await db()
                .from('students')
                .insert(payload)
                .select()
                .single();
            if (error) handleError('Students.create', error);
            return data;
        },

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

        delete: async function (id) {
            const { error } = await db()
                .from('students')
                .delete()
                .eq('id', id);
            if (error) handleError('Students.delete', error);
        },
    };

    // ----------------------------------------------------------
    // PARAMETERS
    // ----------------------------------------------------------
    const Parameters = {
        getAll: async function () {
            const { data, error } = await db()
                .from('parameters')
                .select('*');
            if (error) handleError('Parameters.getAll', error);
            return data || [];
        },

        get: async function (key) {
            const { data, error } = await db()
                .from('parameters')
                .select('value')
                .eq('key', key)
                .maybeSingle();
            if (error) handleError('Parameters.get', error);
            return data ? data.value : null;
        },

        set: async function (key, value) {
            const { data, error } = await db()
                .from('parameters')
                .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
                .select()
                .single();
            if (error) handleError('Parameters.set', error);
            return data;
        },
    };

    // ----------------------------------------------------------
    // FINANCE (Receitas e Despesas — tabela unificada)
    // ----------------------------------------------------------
    const Finance = {
        /**
         * Busca registros financeiros com filtros opcionais.
         * @param {{ type?: 'Receita'|'Despesa', studentId?: string, month?: number, year?: number }} opts
         */
        getAll: async function (opts = {}) {
            let query = db()
                .from('finance')
                .select(`
                    id,
                    type,
                    amount,
                    status,
                    due_date,
                    description,
                    created_at,
                    student_id,
                    students ( full_name )
                `)
                .order('due_date', { ascending: false });

            if (opts.type)      query = query.eq('type', opts.type);
            if (opts.studentId) query = query.eq('student_id', opts.studentId);

            if (opts.month && opts.year) {
                const y         = opts.year;
                const m         = String(opts.month).padStart(2, '0');
                const startDate = `${y}-${m}-01`;
                const lastDay   = new Date(y, opts.month, 0).getDate();
                const endDate   = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
                query = query.gte('due_date', startDate).lte('due_date', endDate);
            }

            const { data, error } = await query;
            if (error) handleError('Finance.getAll', error);
            return data;
        },

        create: async function (payload) {
            const { data, error } = await db()
                .from('finance')
                .insert(payload)
                .select(`
                    id, type, amount, status, due_date, description, created_at, student_id,
                    students ( full_name )
                `)
                .single();
            if (error) handleError('Finance.create', error);
            return data;
        },

        update: async function (id, payload) {
            const { data, error } = await db()
                .from('finance')
                .update(payload)
                .eq('id', id)
                .select()
                .single();
            if (error) handleError('Finance.update', error);
            return data;
        },

        delete: async function (id) {
            const { error } = await db()
                .from('finance')
                .delete()
                .eq('id', id);
            if (error) handleError('Finance.delete', error);
        },

        /**
         * Retorna map { studentId: status } do registro mais recente
         * de Receita por aluno — usado na coluna Sit.Fin. da tela de Alunos.
         */
        getLatestStatusByStudent: async function () {
            const { data, error } = await db()
                .from('finance')
                .select('student_id, status, due_date')
                .eq('type', 'Receita')
                .order('due_date', { ascending: false });
            if (error) handleError('Finance.getLatestStatusByStudent', error);
            const map = {};
            (data || []).forEach(p => {
                if (!map[p.student_id]) map[p.student_id] = p.status;
            });
            return map;
        },

        /**
         * Fallback client-side: marca Pendente → Atrasado onde due_date < hoje.
         * Complementa o pg_cron quando indisponível (plano free).
         */
        syncOverdue: async function () {
            const today = new Date().toISOString().split('T')[0];
            const { error } = await db()
                .from('finance')
                .update({ status: 'Atrasado' })
                .eq('status', 'Pendente')
                .lt('due_date', today);
            if (error) console.warn('[API] Finance.syncOverdue:', error.message);
        },
    };

    // ----------------------------------------------------------
    // SCHEDULE
    // ----------------------------------------------------------
    const Schedule = {
        getOrCreateClass: async function (dayOfWeek, startTime) {
            const { data: existing, error: fetchErr } = await db()
                .from('schedule_classes')
                .select('id')
                .eq('day_of_week', dayOfWeek)
                .eq('start_time', startTime)
                .maybeSingle();

            if (fetchErr) handleError('Schedule.getOrCreateClass', fetchErr);
            if (existing) return existing;

            const { data, error } = await db()
                .from('schedule_classes')
                .insert({ day_of_week: dayOfWeek, start_time: startTime })
                .select('id')
                .single();

            if (error) handleError('Schedule.getOrCreateClass (insert)', error);
            return data;
        },

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

        getAllEnrollmentsIndexedByStudent: async function () {
            const { data, error } = await db()
                .from('class_enrollments')
                .select(`
                    student_id,
                    schedule_classes ( day_of_week, start_time )
                `);
            if (error) handleError('Schedule.getAllEnrollmentsIndexedByStudent', error);
            const map = {};
            (data || []).forEach(enr => {
                const sc = enr.schedule_classes;
                if (!sc) return;
                const sid = enr.student_id;
                if (!map[sid]) map[sid] = [];
                map[sid].push({ day: sc.day_of_week, time: sc.start_time.substring(0, 5) });
            });
            return map;
        },

        enroll: async function (scheduleClassId, studentId) {
            const { data, error } = await db()
                .from('class_enrollments')
                .insert({ schedule_class_id: scheduleClassId, student_id: studentId })
                .select('id')
                .single();

            if (error) handleError('Schedule.enroll', error);
            return data;
        },

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
        Parameters,
        Finance,
        Schedule,
    };

    console.info('[FootballLab] API layer carregado.');
})();
