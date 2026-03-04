/**
 * Football Lab — Students Component
 * Gerencia o CRUD de alunos com listagem e modal de edição.
 * Exposto via window.StudentsComponent
 */
(function () {
    'use strict';

    // Cache local para evitar múltiplos fetches
    let _students = [];
    let _searchTerm = '';

    const StudentsComponent = {
        /**
         * Renderiza o módulo de alunos no #main-content.
         */
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

                <!-- Stats -->
                <div class="stats-grid" id="students-stats">
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fa-solid fa-users"></i></div>
                        <div class="stat-info">
                            <div class="stat-value" id="stat-total">—</div>
                            <div class="stat-label">Total de Alunos</div>
                        </div>
                    </div>
                </div>

                <!-- Table -->
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
                _students = await window.API.Students.getAll();
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
                    (s.phone || '').toLowerCase().includes(_searchTerm)
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

            const rows = filtered.map(s => `
                <tr>
                    <td class="td-name">${StudentsComponent._escape(s.full_name)}</td>
                    <td>${StudentsComponent._escape(s.father_name || '—')}</td>
                    <td>${StudentsComponent._escape(s.mother_name || '—')}</td>
                    <td>${StudentsComponent._escape(s.phone || '—')}</td>
                    <td>${StudentsComponent._formatDate(s.created_at)}</td>
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
                </tr>
            `).join('');

            body.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Nome Completo</th>
                            <th>Nome do Pai</th>
                            <th>Nome da Mãe</th>
                            <th>Telefone</th>
                            <th>Cadastrado em</th>
                            <th class="td-actions">Ações</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;

            // Delegated events
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
                                    value="${isEdit ? StudentsComponent._escape(student.full_name) : ''}"
                                    required />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome do Pai</label>
                                <input type="text" id="sf-father-name" class="form-input"
                                    placeholder="Nome do pai"
                                    value="${isEdit ? StudentsComponent._escape(student.father_name || '') : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome da Mãe</label>
                                <input type="text" id="sf-mother-name" class="form-input"
                                    placeholder="Nome da mãe"
                                    value="${isEdit ? StudentsComponent._escape(student.mother_name || '') : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Telefone</label>
                                <input type="tel" id="sf-phone" class="form-input"
                                    placeholder="(00) 00000-0000"
                                    value="${isEdit ? StudentsComponent._escape(student.phone || '') : ''}" />
                            </div>
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

            document.getElementById('sf-full-name').focus();
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
            const fullName   = (document.getElementById('sf-full-name').value  || '').trim();
            const fatherName = (document.getElementById('sf-father-name').value || '').trim();
            const motherName = (document.getElementById('sf-mother-name').value || '').trim();
            const phone      = (document.getElementById('sf-phone').value       || '').trim();

            if (!fullName) {
                window.showToast('O nome completo é obrigatório.', 'warning');
                document.getElementById('sf-full-name').focus();
                return;
            }

            const payload = {
                full_name:   fullName,
                father_name: fatherName || null,
                mother_name: motherName || null,
                phone:       phone       || null,
            };

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

        _formatDate: function (iso) {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('pt-BR');
        },

        /**
         * Retorna os alunos em cache (usados por outros componentes).
         */
        getStudentsCache: function () {
            return _students;
        },

        /**
         * Recarrega a lista de alunos e atualiza o cache.
         */
        refreshCache: async function () {
            try {
                _students = await window.API.Students.getAll();
            } catch (_) {}
        },
    };

    window.StudentsComponent = StudentsComponent;

    console.info('[FootballLab] StudentsComponent carregado.');
})();
