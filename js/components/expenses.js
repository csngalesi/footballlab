/**
 * Football Lab — Expenses Component (Despesas)
 * Exclusivo para lançamentos do tipo 'Despesa'.
 * Exposto via window.ExpensesComponent
 */
(function () {
    'use strict';

    let _state = {
        records:     [],
        filterMonth: new Date().getMonth() + 1,
        filterYear:  new Date().getFullYear(),
    };

    const BRL = (v) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    const ExpensesComponent = {

        render: async function () {
            window.API.Finance.syncOverdue().catch(() => {});

            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <div class="page-title-icon">
                            <i class="fa-solid fa-circle-minus"></i>
                        </div>
                        <div>
                            <h2>Despesas</h2>
                            <p>Controle de despesas e saídas</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="btn-new-expense">
                        <i class="fa-solid fa-plus"></i> Nova Despesa
                    </button>
                </div>

                <div class="stats-grid" id="expenses-summary">
                    <div class="content-loader" style="grid-column:1/-1;padding:30px 0;">
                        <div class="loader-spinner"></div>
                    </div>
                </div>

                <div class="filter-bar mb-2">
                    <label>Mês:</label>
                    <select id="filter-month">${ExpensesComponent._monthOptions()}</select>
                    <label>Ano:</label>
                    <input type="number" id="filter-year" value="${_state.filterYear}"
                        min="2020" max="2099" style="width:90px;" />
                    <button class="btn btn-secondary" id="btn-filter-apply">
                        <i class="fa-solid fa-filter"></i> Filtrar
                    </button>
                </div>

                <div class="table-wrapper">
                    <div class="table-toolbar">
                        <span class="table-toolbar-title">Despesas</span>
                    </div>
                    <div id="expenses-table-body">
                        <div class="content-loader">
                            <div class="loader-spinner"></div>
                            <p>Carregando…</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-new-expense').addEventListener('click', () => {
                ExpensesComponent.openModal(null);
            });

            document.getElementById('btn-filter-apply').addEventListener('click', () => {
                _state.filterMonth = parseInt(document.getElementById('filter-month').value) || (new Date().getMonth() + 1);
                _state.filterYear  = parseInt(document.getElementById('filter-year').value)  || new Date().getFullYear();
                ExpensesComponent._loadData();
            });

            document.getElementById('filter-month').value = _state.filterMonth;

            await ExpensesComponent._loadData();
        },

        // ----------------------------------------------------------
        // Data
        // ----------------------------------------------------------
        _loadData: async function () {
            try {
                _state.records = await window.API.Finance.getAll({
                    type:  'Despesa',
                    month: _state.filterMonth,
                    year:  _state.filterYear,
                });
                ExpensesComponent._renderSummary();
                ExpensesComponent._renderTable();
            } catch (err) {
                window.showToast('Erro ao carregar despesas: ' + err.message, 'error');
            }
        },

        // ----------------------------------------------------------
        // Summary
        // ----------------------------------------------------------
        _renderSummary: function () {
            const s = { totalPago: 0, totalPendente: 0, totalAtrasado: 0 };
            _state.records.forEach(r => {
                const v = parseFloat(r.amount) || 0;
                if (r.status === 'Pago')     s.totalPago     += v;
                if (r.status === 'Pendente') s.totalPendente += v;
                if (r.status === 'Atrasado') s.totalAtrasado += v;
            });

            const el = document.getElementById('expenses-summary');
            if (!el) return;

            el.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon red"><i class="fa-solid fa-circle-minus"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${BRL(s.totalPago + s.totalPendente + s.totalAtrasado)}</div>
                        <div class="stat-label">Total do Período</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${BRL(s.totalPago)}</div>
                        <div class="stat-label">Pago</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${BRL(s.totalPendente)}</div>
                        <div class="stat-label">Pendente</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fa-solid fa-list"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${_state.records.length}</div>
                        <div class="stat-label">Lançamentos</div>
                    </div>
                </div>
            `;
        },

        // ----------------------------------------------------------
        // Table
        // ----------------------------------------------------------
        _renderTable: function () {
            const body = document.getElementById('expenses-table-body');
            if (!body) return;

            if (_state.records.length === 0) {
                body.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-circle-minus"></i>
                        <p>Nenhuma despesa encontrada para o período selecionado.</p>
                    </div>
                `;
                return;
            }

            const rows = _state.records.map(r => `
                <tr>
                    <td class="td-name">${ExpensesComponent._escape(r.description || '—')}</td>
                    <td>${BRL(r.amount)}</td>
                    <td>${ExpensesComponent._statusBadge(r.status)}</td>
                    <td>${ExpensesComponent._formatDate(r.due_date)}</td>
                    <td>
                        <div style="display:flex;gap:6px;">
                            <button class="btn-icon edit" data-action="edit" data-id="${r.id}" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-icon delete" data-action="delete" data-id="${r.id}" title="Excluir">
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
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Vencimento</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;

            body.querySelector('table').addEventListener('click', function (e) {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const { action, id } = btn.dataset;
                if (action === 'edit')   ExpensesComponent.openModal(id);
                if (action === 'delete') ExpensesComponent._handleDelete(id);
            });
        },

        // ----------------------------------------------------------
        // Modal
        // ----------------------------------------------------------
        openModal: function (recordId) {
            const record = recordId ? _state.records.find(r => r.id === recordId) : null;
            const isEdit = !!record;
            const today  = new Date().toISOString().split('T')[0];

            window.App.openModal(`
                <div class="modal-header">
                    <h3>
                        <i class="fa-solid fa-${isEdit ? 'pen-to-square' : 'circle-minus'}"></i>
                        ${isEdit ? 'Editar Despesa' : 'Nova Despesa'}
                    </h3>
                    <button class="modal-close" id="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="expense-form" novalidate>
                        <div class="form-grid">
                            <div class="form-group form-group-full">
                                <label class="form-label">Descrição *</label>
                                <input type="text" id="ef-description" class="form-input"
                                    placeholder="Ex: Aluguel do campo, Material esportivo…"
                                    value="${isEdit ? ExpensesComponent._escape(record.description || '') : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Valor (R$) *</label>
                                <input type="number" id="ef-amount" class="form-input"
                                    placeholder="0,00" min="0" step="0.01"
                                    value="${isEdit ? record.amount : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Vencimento *</label>
                                <input type="date" id="ef-due-date" class="form-input"
                                    value="${isEdit ? record.due_date.substring(0, 10) : today}" />
                            </div>
                            <div class="form-group form-group-full">
                                <label class="form-label">Status *</label>
                                <select id="ef-status" class="form-input form-select">
                                    <option value="Pendente" ${!isEdit || record.status === 'Pendente'  ? 'selected' : ''}>Pendente</option>
                                    <option value="Pago"     ${isEdit  && record.status === 'Pago'      ? 'selected' : ''}>Pago</option>
                                    <option value="Atrasado" ${isEdit  && record.status === 'Atrasado'  ? 'selected' : ''}>Atrasado</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-cancel-btn">Cancelar</button>
                    <button class="btn btn-primary" id="modal-save-btn">
                        <i class="fa-solid fa-floppy-disk"></i>
                        ${isEdit ? 'Salvar Alterações' : 'Registrar'}
                    </button>
                </div>
            `);

            document.getElementById('modal-close-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-cancel-btn').addEventListener('click', window.App.closeModal);
            document.getElementById('modal-save-btn').addEventListener('click', async () => {
                await ExpensesComponent._handleSave(recordId);
            });

            document.getElementById('ef-description').focus();
        },

        // ----------------------------------------------------------
        // CRUD handlers
        // ----------------------------------------------------------
        _handleSave: async function (editId) {
            const description = (document.getElementById('ef-description').value || '').trim();
            const amount      = parseFloat(document.getElementById('ef-amount').value);
            const dueDate     = document.getElementById('ef-due-date').value;
            const status      = document.getElementById('ef-status').value;

            if (!description) {
                window.showToast('Informe a descrição.', 'warning');
                document.getElementById('ef-description').focus();
                return;
            }
            if (!amount || amount <= 0) {
                window.showToast('Informe um valor válido.', 'warning');
                return;
            }
            if (!dueDate) {
                window.showToast('Informe a data de vencimento.', 'warning');
                return;
            }

            const saveBtn = document.getElementById('modal-save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="btn-spinner"></span> Salvando…';

            try {
                if (editId) {
                    await window.API.Finance.update(editId, { description, amount, due_date: dueDate, status });
                    window.showToast('Despesa atualizada!', 'success');
                } else {
                    await window.API.Finance.create({
                        type: 'Despesa', description, amount, due_date: dueDate, status,
                    });
                    window.showToast('Despesa registrada!', 'success');
                }
                window.App.closeModal();
                await ExpensesComponent._loadData();
            } catch (err) {
                window.showToast('Erro ao salvar: ' + err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${editId ? 'Salvar Alterações' : 'Registrar'}`;
            }
        },

        _handleDelete: async function (id) {
            const record = _state.records.find(r => r.id === id);
            if (!record) return;
            if (!confirm(`Deseja excluir a despesa "${record.description || ''}"?`)) return;

            try {
                window.showLoading();
                await window.API.Finance.delete(id);
                window.showToast('Despesa removida.', 'success');
                await ExpensesComponent._loadData();
            } catch (err) {
                window.showToast('Erro ao excluir: ' + err.message, 'error');
            } finally {
                window.hideLoading();
            }
        },

        // ----------------------------------------------------------
        // Utilities
        // ----------------------------------------------------------
        _statusBadge: function (status) {
            const map = {
                'Pago':     '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Pago</span>',
                'Pendente': '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pendente</span>',
                'Atrasado': '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Atrasado</span>',
            };
            return map[status] || `<span class="badge">${status}</span>`;
        },

        _monthOptions: function () {
            const months = [
                'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
            ];
            return months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
        },

        _formatDate: function (str) {
            if (!str) return '—';
            const s = String(str).substring(0, 10);
            const [y, mo, d] = s.split('-');
            return `${d}/${mo}/${y}`;
        },

        _escape: function (str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },
    };

    window.ExpensesComponent = ExpensesComponent;

    console.info('[FootballLab] ExpensesComponent carregado.');
})();
