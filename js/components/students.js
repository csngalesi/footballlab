/**
 * Football Lab — Students Component
 * Gerencia o CRUD de alunos com listagem e modal de edição.
 * Exposto via window.StudentsComponent
 */
(function () {
    'use strict';

    let _students      = [];
    let _enrollmentMap = {}; // { studentId: [{day, time}] }
    let _finStatusMap  = {}; // { studentId: 'Pago'|'Pendente'|'Atrasado' }
    let _searchTerm    = '';

    const DAYS = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };

    const FIN_BADGE = {
        'Pago':     '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Pago</span>',
        'Pendente': '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pendente</span>',
        'Atrasado': '<span class="badge badge-danger"><i class="fa-solid fa-circle-exclamation"></i> Atrasado</span>',
    };

    const StudentsComponent = {

        render: async function () {
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <div class="page-title-icon">
                            <i class="fa-solid fa-users"></i>
                        </div>
                        <div>
                            <h2>Alunos</h2>
                            <p>Cadastro e gerenciamento de alunos</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="btn-new-student">
                        <i class="fa-solid fa-plus"></i> Novo Aluno
                    </button>
                </div>

                <div class="stats-grid" id="students-stats">
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fa-solid fa-users"></i></div>
                        <div class="stat-info">
                            <div class="stat-value" id="stat-total">—</div>
                            <div class="stat-label">Total de Alunos</div>
                        </div>
                    </div>
                </div>

                <div class="table-wrapper">
                    <div class="table-toolbar">
                        <span class="table-toolbar-title">Lista de Alunos</span>
                        <div class="search-input-wrapper">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="text"
                                id="student-search"
                                class="search-input"
                                placeholder="Buscar aluno…"
                            />
                        </div>
                    </div>
                    <div id="students-table-body">
                        <div class="content-loader">
                            <div class="loader-spinner"></div>
                            <p>Carregando alunos…</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-new-student').addEventListener('click', () => {
                StudentsComponent.openModal(null);
            });

            document.getElementById('student-search').addEventListener('input', function () {
                _searchTerm = this.value.toLowerCase();
                StudentsComponent._renderTable();
            });

            await StudentsComponent._loadStudents();
        },

        // ----------------------------------------------------------
        // Data loading
        // ----------------------------------------------------------
        _loadStudents: async function () {
            try {
                [_students, _enrollmentMap, _finStatusMap] = await Promise.all([
                    window.API.Students.getAll('aluno'),
                    window.API.Schedule.getAllEnrollmentsIndexedByStudent(),
                    window.API.Finance.getLatestStatusByStudent(),
                ]);
                const statEl = document.getElementById('stat-total');
                if (statEl) statEl.textContent = _students.length;
                StudentsComponent._renderTable();
            } catch (err) {
                window.showToast('Erro ao carregar alunos: ' + err.message, 'error');
                const body = document.getElementById('students-table-body');
                if (body) {
                    body.innerHTML = `<div class="empty-state">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <p>Erro ao carregar dados.</p>
                    </div>`;
                }
            }
        },

        // ----------------------------------------------------------
        // Table rendering
        // ----------------------------------------------------------
        _renderTable: function () {
            const body = document.getElementById('students-table-body');
            if (!body) return;

            const filtered = _searchTerm
                ? _students.filter(s =>
                    s.full_name.toLowerCase().includes(_searchTerm) ||
                    (s.phone  || '').toLowerCase().includes(_searchTerm) ||
                    (s.email  || '').toLowerCase().includes(_searchTerm)
                  )
                : _students;

            if (filtered.length === 0) {
                body.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>${_searchTerm ? 'Nenhum aluno encontrado para esta busca.' : 'Nenhum aluno cadastrado ainda.'}</p>
                    </div>
                `;
                return;
            }

            const rows = filtered.map(s => {
                const slots    = _enrollmentMap[s.id] || [];
                const slotsHtml = slots.length
                    ? slots.map(sl =>
                        `<span class="schedule-badge">${DAYS[sl.day] || sl.day} · ${sl.time}</span>`
                      ).join('')
                    : '<span class="text-muted">—</span>';

                const finStatus = _finStatusMap[s.id];
                const finHtml   = FIN_BADGE[finStatus] || '<span class="text-muted">—</span>';

                return `
                <tr>
                    <td class="td-name">${StudentsComponent._escape(s.full_name)}</td>
                    <td>${StudentsComponent._escape(s.phone || '—')}</td>
                    <td>${StudentsComponent._formatDateBR(s.birth_date)}</td>
                    <td>${StudentsComponent._calcAge(s.birth_date)}</td>
                    <td>${finHtml}</td>
                    <td class="td-schedule">${slotsHtml}</td>
                    <td class="td-actions">
                        <div style="display:flex;gap:6px;">
                            <button class="btn-icon edit" data-action="edit" data-id="${s.id}" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-icon delete" data-action="delete" data-id="${s.id}" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            body.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Nome Completo</th>
                            <th>Telefone</th>
                            <th>Nasc.</th>
                            <th>Idade</th>
                            <th>Sit.Fin.</th>
                            <th>Horários</th>
                            <th class="td-actions">Ações</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;

            body.querySelector('table').addEventListener('click', function (e) {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const { action, id } = btn.dataset;
                if (action === 'edit')   StudentsComponent._handleEdit(id);
                if (action === 'delete') StudentsComponent._handleDelete(id);
            });
        },

        // ----------------------------------------------------------
        // Modal (create / edit)
        // ----------------------------------------------------------
        openModal: function (studentId) {
            const student = studentId ? _students.find(s => s.id === studentId) : null;
            const isEdit  = !!student;
            const title   = isEdit ? 'Editar Aluno' : 'Novo Aluno';

            const v = (field) => isEdit ? StudentsComponent._escape(student[field] || '') : '';

            const phoneTypeOpts = ['Próprio', 'Responsável'].map(o =>
                `<option value="${o}" ${isEdit && student.phone_type === o ? 'selected' : ''}>${o}</option>`
            ).join('');

            const emailTypeOpts = ['Próprio', 'Responsável'].map(o =>
                `<option value="${o}" ${isEdit && student.email_type === o ? 'selected' : ''}>${o}</option>`
            ).join('');

            const extraFields = isEdit ? `
                <div class="form-group">
                    <label class="form-label">Tipo do Telefone</label>
                    <select id="sf-phone-type" class="form-input form-select">
                        <option value="">— selecione —</option>
                        ${phoneTypeOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">E-mail</label>
                    <input type="email" id="sf-email" class="form-input"
                        placeholder="email@exemplo.com"
                        value="${v('email')}" />
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo do E-mail</label>
                    <select id="sf-email-type" class="form-input form-select">
                        <option value="">— selecione —</option>
                        ${emailTypeOpts}
                    </select>
                </div>` : '';

            const scheduleSection = isEdit ? `
                <div class="form-group form-group-full">
                    <label class="form-label">
                        <i class="fa-solid fa-calendar-days" style="color:var(--brand-green);margin-right:5px;"></i>
                        Horários Associados
                    </label>
                    <div id="sf-schedule" class="schedule-slots-display">
                        <span style="font-size:.82rem;color:var(--text-muted);">Carregando…</span>
                    </div>
                </div>` : '';

            window.App.openModal(`
                <div class="modal-header">
                    <h3>
                        <i class="fa-solid fa-${isEdit ? 'pen-to-square' : 'user-plus'}"></i>
                        ${title}
                    </h3>
                    <button class="modal-close" id="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="student-form" novalidate>
                        <div class="form-grid">
                            <div class="form-group form-group-full">
                                <label class="form-label">Nome Completo *</label>
                                <input type="text" id="sf-full-name" class="form-input"
                                    placeholder="Digite o nome completo"
                                    value="${v('full_name')}"
                                    required />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome do Pai</label>
                                <input type="text" id="sf-father-name" class="form-input"
                                    placeholder="Nome do pai"
                                    value="${v('father_name')}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome da Mãe</label>
                                <input type="text" id="sf-mother-name" class="form-input"
                                    placeholder="Nome da mãe"
                                    value="${v('mother_name')}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Telefone</label>
                                <input type="tel" id="sf-phone" class="form-input"
                                    placeholder="(00) 00000-0000"
                                    value="${v('phone')}" />
                            </div>
                            ${extraFields}
                            <div class="form-group">
                                <label class="form-label">Dia de Cobrança *</label>
                                <input type="number" id="sf-billing-day" class="form-input"
                                    placeholder="1 – 28" min="1" max="28"
                                    value="${isEdit ? (student.billing_day || 10) : 10}" />
                                <span class="form-hint">Dia do mês em que a mensalidade é gerada automaticamente.</span>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Data de Início</label>
                                <input type="date" id="sf-start-date" class="form-input"
                                    value="${isEdit && student.start_date ? student.start_date.substring(0,10) : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Data de Nascimento</label>
                                <input type="date" id="sf-birth-date" class="form-input"
                                    value="${isEdit && student.birth_date ? student.birth_date.substring(0,10) : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Idade</label>
                                <input type="text" id="sf-age" class="form-input form-input-readonly"
                                    placeholder="Calculada automaticamente" readonly
                                    value="${isEdit && student.birth_date ? StudentsComponent._calcAge(student.birth_date) : ''}" />
                            </div>
                            ${scheduleSection}
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary" id="modal-save-btn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        ${isEdit ? 'Salvar Alterações' : 'Cadastrar Aluno'}
                    </button>
                </div>
            `);

            document.getElementById('modal-close-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-cancel-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-save-btn').addEventListener('click', async () => {
                await StudentsComponent._handleSave(studentId);
            });

            document.getElementById('sf-birth-date').addEventListener('change', function () {
                const ageEl = document.getElementById('sf-age');
                if (ageEl) ageEl.value = StudentsComponent._calcAge(this.value);
            });

            document.getElementById('sf-full-name').focus();

            if (isEdit) {
                StudentsComponent._fillScheduleModal(studentId);
            }
        },

        _fillScheduleModal: function (studentId) {
            const el = document.getElementById('sf-schedule');
            if (!el) return;
            const slots = _enrollmentMap[studentId] || [];
            if (slots.length === 0) {
                el.innerHTML = '<span style="font-size:.82rem;color:var(--text-muted);">Nenhum horário associado.</span>';
            } else {
                el.innerHTML = slots
                    .map(sl => `<span class="schedule-badge schedule-badge-lg">${DAYS[sl.day] || sl.day}-feira · ${sl.time}</span>`)
                    .join('');
            }
        },

        // ----------------------------------------------------------
        // CRUD handlers
        // ----------------------------------------------------------
        _handleEdit: function (id) {
            StudentsComponent.openModal(id);
        },

        _handleDelete: async function (id) {
            const student = _students.find(s => s.id === id);
            if (!student) return;

            if (!confirm(`Deseja excluir o aluno "${student.full_name}"?\nEsta ação removerá também seus pagamentos e matrículas.`)) {
                return;
            }

            try {
                window.showLoading();
                await window.API.Students.delete(id);
                window.showToast(`Aluno "${student.full_name}" removido com sucesso.`, 'success');
                await StudentsComponent._loadStudents();
            } catch (err) {
                window.showToast('Erro ao excluir aluno: ' + err.message, 'error');
            } finally {
                window.hideLoading();
            }
        },

        _handleSave: async function (editId) {
            const fullName   = (document.getElementById('sf-full-name').value   || '').trim();
            const fatherName = (document.getElementById('sf-father-name').value || '').trim();
            const motherName = (document.getElementById('sf-mother-name').value || '').trim();
            const phone      = (document.getElementById('sf-phone').value       || '').trim();
            const birthDate   = document.getElementById('sf-birth-date').value  || null;
            const startDate   = document.getElementById('sf-start-date').value  || null;
            const billingDay  = parseInt(document.getElementById('sf-billing-day').value) || 10;

            // Campos exclusivos do modo edição
            const phoneTypeEl = document.getElementById('sf-phone-type');
            const emailEl     = document.getElementById('sf-email');
            const emailTypeEl = document.getElementById('sf-email-type');
            const phoneType   = phoneTypeEl ? (phoneTypeEl.value || null) : undefined;
            const email       = emailEl     ? (emailEl.value.trim() || null) : undefined;
            const emailType   = emailTypeEl ? (emailTypeEl.value || null) : undefined;

            if (!fullName) {
                window.showToast('O nome completo é obrigatório.', 'warning');
                document.getElementById('sf-full-name').focus();
                return;
            }

            const payload = {
                full_name:   fullName,
                father_name: fatherName  || null,
                mother_name: motherName  || null,
                phone:       phone       || null,
                birth_date:  birthDate   || null,
                start_date:  startDate   || null,
                billing_day: billingDay,
            };

            // Adiciona campos de edição apenas se presentes no DOM
            if (phoneType  !== undefined) payload.phone_type  = phoneType;
            if (email      !== undefined) payload.email       = email;
            if (emailType  !== undefined) payload.email_type  = emailType;

            const saveBtn = document.getElementById('modal-save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="btn-spinner"></span> Salvando…';

            try {
                if (editId) {
                    await window.API.Students.update(editId, payload);
                    window.showToast('Aluno atualizado com sucesso!', 'success');
                } else {
                    await window.API.Students.create(payload);
                    window.showToast('Aluno cadastrado com sucesso!', 'success');
                }
                window.App.closeModal();
                await StudentsComponent._loadStudents();
            } catch (err) {
                window.showToast('Erro ao salvar: ' + err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${editId ? 'Salvar Alterações' : 'Cadastrar Aluno'}`;
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

        _formatDateBR: function (val) {
            if (!val) return '—';
            const str = String(val).substring(0, 10);
            const parts = str.split('-');
            if (parts.length !== 3) return '—';
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        },

        _calcAge: function (birthDate) {
            if (!birthDate) return '—';
            const today = new Date();
            const birth = new Date(String(birthDate).substring(0, 10) + 'T00:00:00');
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            return age >= 0 ? `${age} anos` : '—';
        },

        getStudentsCache: function () {
            return _students;
        },

        refreshCache: async function () {
            try {
                _students = await window.API.Students.getAll('aluno');
            } catch (_) {}
        },
    };

    window.StudentsComponent = StudentsComponent;

    console.info('[FootballLab] StudentsComponent carregado.');
})();
