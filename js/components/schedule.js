/**
 * Football Lab — Schedule Component
 * Grade horária interativa (Segunda–Sábado, 08:00–22:00).
 * Exposto via window.ScheduleComponent
 */
(function () {
    'use strict';

    const DAYS = [
        { label: 'Segunda', value: 1 },
        { label: 'Terça',   value: 2 },
        { label: 'Quarta',  value: 3 },
        { label: 'Quinta',  value: 4 },
        { label: 'Sexta',   value: 5 },
        { label: 'Sábado',  value: 6 },
    ];

    // Horários: 08:00 até 21:00 (14 slots de 1h)
    const HOURS = Array.from({ length: 14 }, (_, i) => {
        const h = 8 + i;
        return `${String(h).padStart(2, '0')}:00`;
    });

    let _enrollmentMap = {};  // { "1_08:00": [ { enrollmentId, studentId, studentName } ] }
    let _students      = [];

    const ScheduleComponent = {
        /**
         * Renderiza o módulo de grade horária.
         */
        render: async function () {
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <div class="page-title-icon">
                            <i class="fa-solid fa-calendar-days"></i>
                        </div>
                        <div>
                            <h2>Grade Horária</h2>
                            <p>Clique em um horário para gerenciar matrículas</p>
                        </div>
                    </div>
                    <button class="btn btn-secondary" id="btn-refresh-schedule">
                        <i class="fa-solid fa-rotate"></i> Atualizar
                    </button>
                </div>

                <div class="schedule-wrapper" id="schedule-container">
                    <div class="content-loader">
                        <div class="loader-spinner"></div>
                        <p>Carregando grade horária…</p>
                    </div>
                </div>
            `;

            document.getElementById('btn-refresh-schedule').addEventListener('click', async () => {
                await ScheduleComponent._loadAndRender();
            });

            await ScheduleComponent._loadAndRender();
        },

        // ----------------------------------------------------------
        // Data + Render
        // ----------------------------------------------------------
        _loadAndRender: async function () {
            try {
                [_enrollmentMap, _students] = await Promise.all([
                    window.API.Schedule.getAllEnrollments(),
                    window.API.Students.getAll(),
                ]);
                ScheduleComponent._renderGrid();
            } catch (err) {
                window.showToast('Erro ao carregar grade: ' + err.message, 'error');
                const container = document.getElementById('schedule-container');
                if (container) {
                    container.innerHTML = `<div class="empty-state">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <p>Erro ao carregar a grade horária.</p>
                    </div>`;
                }
            }
        },

        _renderGrid: function () {
            const container = document.getElementById('schedule-container');
            if (!container) return;

            // Build header row
            let html = '<div class="schedule-grid">';

            // Corner cell
            html += '<div class="sched-header" style="background:var(--bg-sidebar);">Horário</div>';
            DAYS.forEach(d => {
                html += `<div class="sched-header">${d.label}</div>`;
            });

            // Body rows — one per hour
            HOURS.forEach(hour => {
                // Time label cell
                html += `<div class="sched-time">${hour}</div>`;

                // One cell per day
                DAYS.forEach(day => {
                    const key      = `${day.value}_${hour}`;
                    const enrolled = _enrollmentMap[key] || [];
                    const hasKids  = enrolled.length > 0;

                    html += `<div class="sched-cell ${hasKids ? 'has-students' : ''}"
                                  data-day="${day.value}"
                                  data-time="${hour}"
                                  data-key="${key}">`;

                    enrolled.forEach(enr => {
                        html += `
                            <div class="sched-student-chip" data-enrollment-id="${enr.enrollmentId}">
                                <span title="${ScheduleComponent._escape(enr.studentName)}">${ScheduleComponent._escape(enr.studentName)}</span>
                                <button class="remove-chip" data-action="remove-enrollment"
                                    data-enrollment-id="${enr.enrollmentId}"
                                    title="Remover matrícula"
                                    aria-label="Remover ${ScheduleComponent._escape(enr.studentName)}">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        `;
                    });

                    html += `
                        <button class="sched-add-btn" data-action="open-enroll"
                            data-day="${day.value}" data-time="${hour}" data-key="${key}">
                            <i class="fa-solid fa-plus"></i> Matricular
                        </button>
                    </div>`;
                });
            });

            html += '</div>';
            container.innerHTML = html;

            // Delegated events
            container.addEventListener('click', function (e) {
                const removeBtn = e.target.closest('[data-action="remove-enrollment"]');
                if (removeBtn) {
                    e.stopPropagation();
                    ScheduleComponent._handleRemoveEnrollment(removeBtn.dataset.enrollmentId);
                    return;
                }

                const addBtn = e.target.closest('[data-action="open-enroll"]');
                if (addBtn) {
                    const { day, time, key } = addBtn.dataset;
                    ScheduleComponent._openEnrollModal(parseInt(day), time, key);
                    return;
                }

                // Click anywhere else on cell also opens modal
                const cell = e.target.closest('.sched-cell');
                if (cell && !e.target.closest('.sched-student-chip')) {
                    const { day, time, key } = cell.dataset;
                    ScheduleComponent._openEnrollModal(parseInt(day), time, key);
                }
            });
        },

        // ----------------------------------------------------------
        // Enroll modal
        // ----------------------------------------------------------
        _openEnrollModal: function (dayValue, timeStr, key) {
            const dayLabel  = DAYS.find(d => d.value === dayValue)?.label || '';
            const enrolled  = _enrollmentMap[key] || [];
            const enrolledIds = new Set(enrolled.map(e => e.studentId));

            const availableStudents = _students.filter(s => !enrolledIds.has(s.id));

            const studentOptions = availableStudents.map(s =>
                `<option value="${s.id}">${ScheduleComponent._escape(s.full_name)}</option>`
            ).join('');

            const enrolledListHtml = enrolled.length > 0
                ? enrolled.map(enr => `
                    <div class="enroll-student-item" data-enrollment-id="${enr.enrollmentId}">
                        <span>${ScheduleComponent._escape(enr.studentName)}</span>
                        <button class="btn btn-danger" style="padding:5px 10px;font-size:0.8rem;"
                            data-action="modal-remove" data-enrollment-id="${enr.enrollmentId}">
                            <i class="fa-solid fa-trash"></i> Remover
                        </button>
                    </div>
                `).join('')
                : '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:12px 0;">Nenhum aluno matriculado neste horário.</p>';

            window.App.openModal(`
                <div class="modal-header">
                    <h3>
                        <i class="fa-solid fa-calendar-day"></i>
                        ${dayLabel} — ${timeStr}
                    </h3>
                    <button class="modal-close" id="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">
                        Alunos Matriculados
                    </p>
                    <div class="enroll-student-list" id="modal-enrolled-list">
                        ${enrolledListHtml}
                    </div>

                    ${availableStudents.length > 0 ? `
                    <div class="add-enrollment-row">
                        <select id="enroll-student-select" class="form-select">
                            <option value="">Selecione um aluno para matricular…</option>
                            ${studentOptions}
                        </select>
                        <button class="btn btn-primary" id="btn-do-enroll" style="white-space:nowrap;">
                            <i class="fa-solid fa-user-plus"></i> Matricular
                        </button>
                    </div>
                    ` : `
                    <p style="color:var(--text-muted);font-size:0.85rem;margin-top:12px;">
                        <i class="fa-solid fa-info-circle"></i>
                        Todos os alunos já estão matriculados neste horário.
                    </p>
                    `}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-close-btn-2">Fechar</button>
                </div>
            `);

            document.getElementById('modal-close-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-close-btn-2').addEventListener('click', window.App.closeModal);

            // Remove from modal list
            const modalBody = document.querySelector('.modal-body');
            modalBody.addEventListener('click', async function (e) {
                const btn = e.target.closest('[data-action="modal-remove"]');
                if (!btn) return;
                await ScheduleComponent._handleRemoveEnrollment(btn.dataset.enrollmentId, true, dayValue, timeStr, key);
            });

            // Add enrollment
            const enrollBtn = document.getElementById('btn-do-enroll');
            if (enrollBtn) {
                enrollBtn.addEventListener('click', async () => {
                    const sel = document.getElementById('enroll-student-select');
                    const studentId = sel ? sel.value : '';
                    if (!studentId) {
                        window.showToast('Selecione um aluno.', 'warning');
                        return;
                    }
                    await ScheduleComponent._handleEnroll(dayValue, timeStr, key, studentId);
                });
            }
        },

        // ----------------------------------------------------------
        // Enroll handler
        // ----------------------------------------------------------
        _handleEnroll: async function (dayValue, timeStr, key, studentId) {
            const enrollBtn = document.getElementById('btn-do-enroll');
            if (enrollBtn) {
                enrollBtn.disabled = true;
                enrollBtn.innerHTML = '<span class="btn-spinner"></span>';
            }

            try {
                // Busca ou cria o schedule_class
                const sc = await window.API.Schedule.getOrCreateClass(dayValue, timeStr + ':00');
                // Matricula o aluno
                await window.API.Schedule.enroll(sc.id, studentId);

                window.showToast('Aluno matriculado com sucesso!', 'success');
                window.App.closeModal();
                // Recarrega a grade
                await ScheduleComponent._loadAndRender();
            } catch (err) {
                if (err.code === '23505') {
                    window.showToast('Este aluno já está matriculado neste horário.', 'warning');
                } else {
                    window.showToast('Erro ao matricular: ' + err.message, 'error');
                }
                if (enrollBtn) {
                    enrollBtn.disabled = false;
                    enrollBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Matricular';
                }
            }
        },

        // ----------------------------------------------------------
        // Remove enrollment handler
        // ----------------------------------------------------------
        _handleRemoveEnrollment: async function (enrollmentId, fromModal, dayValue, timeStr, key) {
            if (!confirm('Remover esta matrícula?')) return;

            try {
                if (!fromModal) window.showLoading();
                await window.API.Schedule.removeEnrollment(enrollmentId);
                window.showToast('Matrícula removida.', 'success');

                if (fromModal) {
                    window.App.closeModal();
                } else {
                    window.hideLoading();
                }

                await ScheduleComponent._loadAndRender();
            } catch (err) {
                window.showToast('Erro ao remover matrícula: ' + err.message, 'error');
                if (!fromModal) window.hideLoading();
            }
        },

        // ----------------------------------------------------------
        // Utilities
        // ----------------------------------------------------------
        _escape: function (str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },
    };

    window.ScheduleComponent = ScheduleComponent;

    console.info('[FootballLab] ScheduleComponent carregado.');
})();
