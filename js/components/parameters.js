/**
 * Football Lab — Parameters Component
 * Configurações e parâmetros do sistema.
 * Exposto via window.ParametersComponent
 */
(function () {
    'use strict';

    const ParametersComponent = {

        render: async function () {
            const content = document.getElementById('main-content');
            content.innerHTML = `
                <div class="page-header">
                    <div class="page-title">
                        <div class="page-title-icon">
                            <i class="fa-solid fa-sliders"></i>
                        </div>
                        <div>
                            <h2>Parâmetros</h2>
                            <p>Configurações gerais do sistema</p>
                        </div>
                    </div>
                </div>

                <div class="params-card">
                    <div class="params-card-header">
                        <i class="fa-solid fa-coins"></i>
                        Valores Padrão
                    </div>
                    <div class="params-card-body" id="params-body">
                        <div class="content-loader">
                            <div class="loader-spinner"></div>
                            <p>Carregando parâmetros…</p>
                        </div>
                    </div>
                </div>
            `;

            await ParametersComponent._loadParams();
        },

        _loadParams: async function () {
            try {
                const [fee, days] = await Promise.all([
                    window.API.Parameters.get('monthly_fee'),
                    window.API.Parameters.get('days_to_due'),
                ]);
                ParametersComponent._renderForm(parseFloat(fee) || 0, parseInt(days) || 5);
            } catch (err) {
                window.showToast('Erro ao carregar parâmetros: ' + err.message, 'error');
            }
        },

        _renderForm: function (monthlyFee, daysToDue) {
            const body = document.getElementById('params-body');
            if (!body) return;

            body.innerHTML = `
                <form id="params-form" novalidate>
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fa-solid fa-tag" style="color:var(--brand-green);margin-right:4px;"></i>
                                Valor da Mensalidade (R$)
                            </label>
                            <input type="number" id="param-monthly-fee" class="form-input"
                                placeholder="0,00" min="0" step="0.01"
                                value="${monthlyFee}" />
                            <span class="form-hint">
                                Valor pré-carregado ao registrar uma nova receita no módulo Financeiro.
                            </span>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fa-solid fa-calendar-day" style="color:var(--brand-green);margin-right:4px;"></i>
                                Prazo de Vencimento (dias)
                            </label>
                            <input type="number" id="param-days-to-due" class="form-input"
                                placeholder="5" min="1" step="1"
                                value="${daysToDue}" />
                            <span class="form-hint">
                                Dias adicionados ao dia de cobrança do aluno para calcular o vencimento da mensalidade.
                            </span>
                        </div>
                    </div>
                    <div style="margin-top:24px;">
                        <button type="submit" class="btn btn-primary" id="params-save-btn">
                            <i class="fa-solid fa-floppy-disk"></i>
                            Salvar Parâmetros
                        </button>
                    </div>
                </form>
            `;

            document.getElementById('params-form').addEventListener('submit', async function (e) {
                e.preventDefault();
                await ParametersComponent._handleSave();
            });
        },

        _handleSave: async function () {
            const fee  = parseFloat(document.getElementById('param-monthly-fee').value);
            const days = parseInt(document.getElementById('param-days-to-due').value);

            if (isNaN(fee) || fee < 0) {
                window.showToast('Informe um valor válido para a mensalidade.', 'warning');
                return;
            }
            if (isNaN(days) || days < 1) {
                window.showToast('Informe um prazo de vencimento válido (mínimo 1 dia).', 'warning');
                return;
            }

            const saveBtn = document.getElementById('params-save-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="btn-spinner"></span> Salvando…';

            try {
                await Promise.all([
                    window.API.Parameters.set('monthly_fee', String(fee)),
                    window.API.Parameters.set('days_to_due', String(days)),
                ]);
                window.showToast('Parâmetros salvos com sucesso!', 'success');
            } catch (err) {
                window.showToast('Erro ao salvar: ' + err.message, 'error');
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Parâmetros';
            }
        },
    };

    window.ParametersComponent = ParametersComponent;

    console.info('[FootballLab] ParametersComponent carregado.');
})();
