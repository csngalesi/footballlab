/**
 * Football Lab — PreCadastroComponent
 * Gerencia pré-cadastro de potenciais alunos.
 * Campos idênticos a Alunos, sem Sit.Fin. e Horários,
 * com o campo "Dia e horário de preferência".
 * Exposto via window.PreCadastroComponent
 */
(function () {
    'use strict';

    let _leads     = [];
    let _searchTerm = '';

    const PreCadastroComponent = {

        render: async function () {
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <div class="page-title-icon">
                            <i class="fa-solid fa-user-clock"></i>
                        </div>
                        <div>
                            <h2>Pré-Cadastro</h2>
                            <p>Interessados aguardando matrícula</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="btn-new-lead">
                        <i class="fa-solid fa-plus"></i> Novo Pré-Cadastro
                    </button>
                </div>

                <div class="stats-grid" id="leads-stats">
                    <div class="stat-card">
                        <div class="stat-icon blue"><i class="fa-solid fa-user-clock"></i></div>
                        <div class="stat-info">
                            <div class="stat-value" id="stat-leads-total">—</div>
                            <div class="stat-label">Pré-Cadastros</div>
                        </div>
                    </div>
                </div>

                <div class="table-wrapper">
                    <div class="table-toolbar">
                        <span class="table-toolbar-title">Lista de Pré-Cadastros</span>
                        <div class="search-input-wrapper">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="text"
                                id="lead-search"
                                class="search-input"
                                placeholder="Buscar…"
                            />
                        </div>
                    </div>
                    <div id="leads-table-body">
                        <div class="content-loader">
                            <div class="loader-spinner"></div>
                            <p>Carregando…</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-new-lead').addEventListener('click', () => {
                PreCadastroComponent.openModal(null);
            });

            document.getElementById('lead-search').addEventListener('input', function () {
                _searchTerm = this.value.toLowerCase();
                PreCadastroComponent._renderTable();
            });

            await PreCadastroComponent._loadLeads();
        },

        // ----------------------------------------------------------
        // Data loading
        // ----------------------------------------------------------
        _loadLeads: async function () {
            try {
                _leads = await window.API.Students.getAll('pre-cadastro');
                const statEl = document.getElementById('stat-leads-total');
                if (statEl) statEl.textContent = _leads.length;
                PreCadastroComponent._renderTable();
            } catch (err) {
                window.showToast('Erro ao carregar pré-cadastros: ' + err.message, 'error');
                const body = document.getElementById('leads-table-body');
                if (body) body.innerHTML = `<div class="empty-state">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>Erro ao carregar dados.</p>
                </div>`;
            }
        },

        // ----------------------------------------------------------
        // Table rendering
        // ----------------------------------------------------------
        _renderTable: function () {
            const body = document.getElementById('leads-table-body');
            if (!body) return;

            const filtered = _searchTerm
                ? _leads.filter(s =>
                    s.full_name.toLowerCase().includes(_searchTerm) ||
                    (s.phone || '').toLowerCase().includes(_searchTerm)
                  )
                : _leads;

            if (filtered.length === 0) {
                body.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-user-slash"></i>
                        <p>${_searchTerm ? 'Nenhum resultado para esta busca.' : 'Nenhum pré-cadastro ainda.'}</p>
                    </div>
                `;
                return;
            }

            const rows = filtered.map(s => `
                <tr>
                    <td class="td-name">${PreCadastroComponent._escape(s.full_name)}</td>
                    <td>${PreCadastroComponent._escape(s.phone || '—')}</td>
                    <td>${PreCadastroComponent._formatDateBR(s.birth_date)}</td>
                    <td>${PreCadastroComponent._calcAge(s.birth_date)}</td>
                    <td>${PreCadastroComponent._escape(s.preferred_schedule || '—')}</td>
                    <td class="td-actions">
                        <div style="display:flex;gap:6px;">
                            <button class="btn btn-sm btn-success" data-action="promote" data-id="${s.id}" title="Promover para aluno">
                                <i class="fa-solid fa-user-check"></i> Promover
                            </button>
                            <button class="btn-icon edit" data-action="edit" data-id="${s.id}" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-icon delete" data-action="delete" data-id="${s.id}" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`
            ).join('');

            body.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Nome Completo</th>
                            <th>Telefone</th>
                            <th>Nasc.</th>
                            <th>Idade</th>
                            <th>Preferência de Horário</th>
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
                if (action === 'edit')    PreCadastroComponent._handleEdit(id);
                if (action === 'delete')  PreCadastroComponent._handleDelete(id);
                if (action === 'promote') PreCadastroComponent._handlePromote(id);
            });
        },

        // ----------------------------------------------------------
        // Modal (create / edit)
        // ----------------------------------------------------------
        openModal: function (leadId) {
            const lead   = leadId ? _leads.find(s => s.id === leadId) : null;
            const isEdit = !!lead;
            const title  = isEdit ? 'Editar Pré-Cadastro' : 'Novo Pré-Cadastro';

            const v = (field) => isEdit ? PreCadastroComponent._escape(lead[field] || '') : '';

            const phoneTypeOpts = ['Próprio', 'Responsável'].map(o =>
                `<option value="${o}" ${isEdit && lead.phone_type === o ? 'selected' : ''}>${o}</option>`
            ).join('');

            const emailTypeOpts = ['Próprio', 'Responsável'].map(o =>
                `<option value="${o}" ${isEdit && lead.email_type === o ? 'selected' : ''}>${o}</option>`
            ).join('');

            window.App.openModal(`
                <div class="modal-header">
                    <h3>
                        <i class="fa-solid fa-user-clock"></i>
                        ${title}
                    </h3>
                    <button class="modal-close" id="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="lead-form" novalidate>
                        <div class="form-grid">
                            <div class="form-group form-group-full">
                                <label class="form-label">Nome Completo *</label>
                                <input type="text" id="lf-full-name" class="form-input"
                                    placeholder="Digite o nome completo"
                                    value="${v('full_name')}" required />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome do Pai</label>
                                <input type="text" id="lf-father-name" class="form-input"
                                    placeholder="Nome do pai"
                                    value="${v('father_name')}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nome da Mãe</label>
                                <input type="text" id="lf-mother-name" class="form-input"
                                    placeholder="Nome da mãe"
                                    value="${v('mother_name')}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Telefone</label>
                                <input type="tel" id="lf-phone" class="form-input"
                                    placeholder="(00) 00000-0000"
                                    value="${v('phone')}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tipo do Telefone</label>
                                <select id="lf-phone-type" class="form-input form-select">
                                    <option value="">— selecione —</option>
                                    ${phoneTypeOpts}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">E-mail</label>
                                <input type="email" id="lf-email" class="form-input"
                                    placeholder="email@exemplo.com"
                                    value="${v('email')}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Tipo do E-mail</label>
                                <select id="lf-email-type" class="form-input form-select">
                                    <option value="">— selecione —</option>
                                    ${emailTypeOpts}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Data de Nascimento</label>
                                <input type="date" id="lf-birth-date" class="form-input"
                                    value="${isEdit && lead.birth_date ? lead.birth_date.substring(0,10) : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Idade</label>
                                <input type="text" id="lf-age" class="form-input form-input-readonly"
                                    placeholder="Calculada automaticamente" readonly
                                    value="${isEdit && lead.birth_date ? PreCadastroComponent._calcAge(lead.birth_date) : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Data de Início</label>
                                <input type="date" id="lf-start-date" class="form-input"
                                    value="${isEdit && lead.start_date ? lead.start_date.substring(0,10) : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Dia de Cobrança</label>
                                <input type="number" id="lf-billing-day" class="form-input"
                                    placeholder="1 – 28" min="1" max="28"
                                    value="${isEdit ? (lead.billing_day || 10) : 10}" />
                                <span class="form-hint">Dia do mês para geração da mensalidade ao promover para aluno.</span>
                            </div>
                            <div class="form-group form-group-full">
                                <label class="form-label">
                                    <i class="fa-solid fa-calendar-days" style="color:var(--brand-green);margin-right:5px;"></i>
                                    Dia e Horário de Preferência
                                </label>
                                <input type="text" id="lf-preferred-schedule" class="form-input"
                                    placeholder="Ex: Segunda e Quarta às 18h"
                                    value="${v('preferred_schedule')}" />
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary" id="modal-save-btn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        ${isEdit ? 'Salvar Alterações' : 'Cadastrar'}
                    </button>
                </div>
            `);

            document.getElementById('modal-close-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-cancel-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-save-btn').addEventListener('click', async () => {
                await PreCadastroComponent._handleSave(leadId);
            });

            document.getElementById('lf-birth-date').addEventListener('change', function () {
                const ageEl = document.getElementById('lf-age');
                if (ageEl) ageEl.value = PreCadastroComponent._calcAge(this.value);
            });

            document.getElementById('lf-full-name').focus();
        },

        // ----------------------------------------------------------
        // CRUD handlers
        // ----------------------------------------------------------
        _handleEdit: function (id) {
            PreCadastroComponent.openModal(id);
        },

        _handleDelete: async function (id) {
            const lead = _leads.find(s => s.id === id);
            if (!lead) return;
            if (!confirm(`Deseja excluir o pré-cadastro de "${lead.full_name}"?`)) return;
            try {
                window.showLoading();
                await window.API.Students.delete(id);
                window.showToast(`Pré-cadastro "${lead.full_name}" removido.`, 'success');
                await PreCadastroComponent._loadLeads();
            } catch (err) {
                window.showToast('Erro ao excluir: ' + err.message, 'error');
            } finally {
                window.hideLoading();
            }
        },

        _handlePromote: async function (id) {
            const lead = _leads.find(s => s.id === id);
            if (!lead) return;
            if (!confirm(`Promover "${lead.full_name}" para Aluno?\nEle aparecerá na lista de Alunos.`)) return;
            try {
                window.showLoading();
                await window.API.Students.promote(id);
                window.showToast(`"${lead.full_name}" promovido para Aluno!`, 'success');
                await PreCadastroComponent._loadLeads();
            } catch (err) {
                window.showToast('Erro ao promover: ' + err.message, 'error');
            } finally {
                window.hideLoading();
            }
        },

        _handleSave: async function (editId) {
            const fullName          = (document.getElementById('lf-full-name').value          || '').trim();
            const fatherName        = (document.getElementById('lf-father-name').value        || '').trim();
            const motherName        = (document.getElementById('lf-mother-name').value        || '').trim();
            const phone             = (document.getElementById('lf-phone').value              || '').trim();
            const phoneType         = document.getElementById('lf-phone-type').value          || null;
            const email             = (document.getElementById('lf-email').value              || '').trim() || null;
            const emailType         = document.getElementById('lf-email-type').value          || null;
            const birthDate         = document.getElementById('lf-birth-date').value          || null;
            const startDate         = document.getElementById('lf-start-date').value          || null;
            const billingDay        = parseInt(document.getElementById('lf-billing-day').value) || 10;
            const preferredSchedule = (document.getElementById('lf-preferred-schedule').value || '').trim() || null;

            if (!fullName) {
                window.showToast('O nome completo é obrigatório.', 'warning');
                document.getElementById('lf-full-name').focus();
                return;
            }

            const payload = {
                full_name:          fullName,
                father_name:        fatherName  || null,
                mother_name:        motherName  || null,
                phone:              phone       || null,
                phone_type:         phoneType,
                email:              email,
                email_type:         emailType,
                birth_date:         birthDate,
                start_date:         startDate,
                billing_day:        billingDay,
                preferred_schedule: preferredSchedule,
                student_type:       'pre-cadastro',
            };

            const saveBtn = document.getElementById('modal-save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="btn-spinner"></span> Salvando…';

            try {
                if (editId) {
                    await window.API.Students.update(editId, payload);
                    window.showToast('Pré-cadastro atualizado!', 'success');
                } else {
                    await window.API.Students.create(payload);
                    window.showToast('Pré-cadastro criado!', 'success');
                }
                window.App.closeModal();
                await PreCadastroComponent._loadLeads();
            } catch (err) {
                window.showToast('Erro ao salvar: ' + err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${editId ? 'Salvar Alterações' : 'Cadastrar'}`;
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
            const str   = String(val).substring(0, 10);
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
    };

    window.PreCadastroComponent = PreCadastroComponent;

    console.info('[FootballLab] PreCadastroComponent carregado.');
})();
