/**
 * Football Lab — Finance Component
 * Gerencia mensalidades: cadastro, listagem e resumo financeiro.
 * Exposto via window.FinanceComponent
 */
(function () {
    'use strict';

    // Estado local do módulo
    let _state = {
        payments:  [],
        students:  [],
        filterStudentId: '',
        filterMonth: new Date().getMonth() + 1,
        filterYear:  new Date().getFullYear(),
    };

    const BRL = (v) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    const FinanceComponent = {
        /**
         * Renderiza o módulo financeiro no #main-content.
         */
        render: async function () {
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <div class="page-title-icon">
                            <i class="fa-solid fa-wallet"></i>
                        </div>
                        <div>
                            <h2>Financeiro</h2>
                            <p>Controle de mensalidades e pagamentos</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" id="btn-new-payment">
                        <i class="fa-solid fa-plus"></i> Registrar Pagamento
                    </button>
                </div>

                <!-- Summary Cards -->
                <div class="stats-grid" id="finance-summary">
                    <div class="content-loader" style="grid-column:1/-1;padding:30px 0;">
                        <div class="loader-spinner"></div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="filter-bar mb-2">
                    <label>Mês:</label>
                    <select id="filter-month">
                        ${FinanceComponent._monthOptions()}
                    </select>
                    <label>Ano:</label>
                    <input type="number" id="filter-year" value="${_state.filterYear}"
                        min="2020" max="2099" style="width:90px;" />
                    <label>Aluno:</label>
                    <select id="filter-student" style="min-width:180px;">
                        <option value="">Todos os alunos</option>
                    </select>
                    <button class="btn btn-secondary" id="btn-filter-apply">
                        <i class="fa-solid fa-filter"></i> Filtrar
                    </button>
                </div>

                <!-- Payments Table -->
                <div class="table-wrapper">
                    <div class="table-toolbar">
                        <span class="table-toolbar-title">Pagamentos</span>
                    </div>
                    <div id="payments-table-body">
                        <div class="content-loader">
                            <div class="loader-spinner"></div>
                            <p>Carregando pagamentos…</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('btn-new-payment').addEventListener('click', () => {
                FinanceComponent.openPaymentModal(null);
            });

            document.getElementById('btn-filter-apply').addEventListener('click', () => {
                _state.filterMonth     = parseInt(document.getElementById('filter-month').value) || (new Date().getMonth()+1);
                _state.filterYear      = parseInt(document.getElementById('filter-year').value)  || new Date().getFullYear();
                _state.filterStudentId = document.getElementById('filter-student').value;
                FinanceComponent._loadData();
            });

            // Pre-select current month
            document.getElementById('filter-month').value = _state.filterMonth;

            await FinanceComponent._loadStudentsSelect();
            await FinanceComponent._loadData();
        },

        // ----------------------------------------------------------
        // Data
        // ----------------------------------------------------------
        _loadStudentsSelect: async function () {
            try {
                _state.students = await window.API.Students.getAll();
                const sel = document.getElementById('filter-student');
                if (!sel) return;

                _state.students.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.full_name;
                    sel.appendChild(opt);
                });
            } catch (_) {}
        },

        _loadData: async function () {
            try {
                const opts = {
                    month:     _state.filterMonth,
                    year:      _state.filterYear,
                    studentId: _state.filterStudentId || undefined,
                };

                _state.payments = await window.API.Payments.getAll(opts);
                FinanceComponent._renderSummary();
                FinanceComponent._renderTable();
            } catch (err) {
                window.showToast('Erro ao carregar pagamentos: ' + err.message, 'error');
            }
        },

        // ----------------------------------------------------------
        // Summary
        // ----------------------------------------------------------
        _renderSummary: function () {
            const summary = { totalPago: 0, totalPendente: 0, totalAtrasado: 0 };
            _state.payments.forEach(p => {
                const v = parseFloat(p.amount) || 0;
                if (p.status === 'Pago')      summary.totalPago      += v;
                if (p.status === 'Pendente')  summary.totalPendente  += v;
                if (p.status === 'Atrasado')  summary.totalAtrasado  += v;
            });

            const el = document.getElementById('finance-summary');
            if (!el) return;

            el.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${BRL(summary.totalPago)}</div>
                        <div class="stat-label">Total Pago</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon yellow"><i class="fa-solid fa-clock"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${BRL(summary.totalPendente)}</div>
                        <div class="stat-label">Pendente</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon red"><i class="fa-solid fa-circle-xmark"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${BRL(summary.totalAtrasado)}</div>
                        <div class="stat-label">Atrasado</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fa-solid fa-receipt"></i></div>
                    <div class="stat-info">
                        <div class="stat-value">${_state.payments.length}</div>
                        <div class="stat-label">Lançamentos</div>
                    </div>
                </div>
            `;
        },

        // ----------------------------------------------------------
        // Table
        // ----------------------------------------------------------
        _renderTable: function () {
            const body = document.getElementById('payments-table-body');
            if (!body) return;

            if (_state.payments.length === 0) {
                body.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-receipt"></i>
                        <p>Nenhum pagamento encontrado para o período selecionado.</p>
                    </div>
                `;
                return;
            }

            const rows = _state.payments.map(p => {
                const name    = p.students ? FinanceComponent._escape(p.students.full_name) : '—';
                const dueDate = FinanceComponent._formatDate(p.due_date);
                const badge   = FinanceComponent._statusBadge(p.status);

                return `
                    <tr>
                        <td class="td-name">${name}</td>
                        <td>${BRL(p.amount)}</td>
                        <td>${badge}</td>
                        <td>${dueDate}</td>
                        <td>
                            <div style="display:flex;gap:6px;">
                                <button class="btn-icon edit" data-action="edit" data-id="${p.id}" title="Editar">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="btn-icon delete" data-action="delete" data-id="${p.id}" title="Excluir">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            body.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Aluno</th>
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
                if (action === 'edit')   FinanceComponent.openPaymentModal(id);
                if (action === 'delete') FinanceComponent._handleDelete(id);
            });
        },

        // ----------------------------------------------------------
        // Modal
        // ----------------------------------------------------------
        openPaymentModal: function (paymentId) {
            const payment = paymentId ? _state.payments.find(p => p.id === paymentId) : null;
            const isEdit  = !!payment;

            const studentOptions = _state.students.map(s =>
                `<option value="${s.id}" ${payment && payment.student_id === s.id ? 'selected' : ''}>
                    ${FinanceComponent._escape(s.full_name)}
                </option>`
            ).join('');

            const today = new Date().toISOString().split('T')[0];

            window.App.openModal(`
                <div class="modal-header">
                    <h3>
                        <i class="fa-solid fa-${isEdit ? 'pen-to-square' : 'receipt'}"></i>
                        ${isEdit ? 'Editar Pagamento' : 'Registrar Pagamento'}
                    </h3>
                    <button class="modal-close" id="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="payment-form" novalidate>
                        <div class="form-grid">
                            <div class="form-group form-group-full">
                                <label class="form-label">Aluno *</label>
                                <select id="pf-student" class="form-select" ${isEdit ? 'disabled' : ''}>
                                    <option value="">Selecione o aluno…</option>
                                    ${studentOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Valor (R$) *</label>
                                <input type="number" id="pf-amount" class="form-input"
                                    placeholder="0,00" min="0" step="0.01"
                                    value="${isEdit ? payment.amount : ''}" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Vencimento *</label>
                                <input type="date" id="pf-due-date" class="form-input"
                                    value="${isEdit ? payment.due_date : today}" />
                            </div>
                            <div class="form-group form-group-full">
                                <label class="form-label">Status *</label>
                                <select id="pf-status" class="form-select">
                                    <option value="Pendente" ${!isEdit || payment.status === 'Pendente'  ? 'selected' : ''}>Pendente</option>
                                    <option value="Pago"     ${isEdit  && payment.status === 'Pago'      ? 'selected' : ''}>Pago</option>
                                    <option value="Atrasado" ${isEdit  && payment.status === 'Atrasado'  ? 'selected' : ''}>Atrasado</option>
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
                await FinanceComponent._handleSave(paymentId);
            });
        },

        // ----------------------------------------------------------
        // CRUD handlers
        // ----------------------------------------------------------
        _handleSave: async function (editId) {
            const studentId = document.getElementById('pf-student').value;
            const amount    = parseFloat(document.getElementById('pf-amount').value);
            const dueDate   = document.getElementById('pf-due-date').value;
            const status    = document.getElementById('pf-status').value;

            if (!studentId && !editId) {
                window.showToast('Selecione um aluno.', 'warning');
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
                    await window.API.Payments.update(editId, { amount, due_date: dueDate, status });
                    window.showToast('Pagamento atualizado!', 'success');
                } else {
                    await window.API.Payments.create({
                        student_id: studentId, amount, due_date: dueDate, status
                    });
                    window.showToast('Pagamento registrado!', 'success');
                }
                window.App.closeModal();
                await FinanceComponent._loadData();
            } catch (err) {
                window.showToast('Erro ao salvar: ' + err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${editId ? 'Salvar Alterações' : 'Registrar'}`;
            }
        },

        _handleDelete: async function (id) {
            const payment = _state.payments.find(p => p.id === id);
            if (!payment) return;
            const name = payment.students ? payment.students.full_name : 'este pagamento';

            if (!confirm(`Deseja excluir o pagamento de "${name}"?`)) return;

            try {
                window.showLoading();
                await window.API.Payments.delete(id);
                window.showToast('Pagamento removido.', 'success');
                await FinanceComponent._loadData();
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
                'Pago':      '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Pago</span>',
                'Pendente':  '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pendente</span>',
                'Atrasado':  '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Atrasado</span>',
            };
            return map[status] || `<span class="badge">${status}</span>`;
        },

        _monthOptions: function () {
            const months = [
                'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
            ];
            return months.map((m, i) =>
                `<option value="${i + 1}">${m}</option>`
            ).join('');
        },

        _formatDate: function (str) {
            if (!str) return '—';
            const [y, mo, d] = str.split('-');
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

    window.FinanceComponent = FinanceComponent;

    console.info('[FootballLab] FinanceComponent carregado.');
})();
