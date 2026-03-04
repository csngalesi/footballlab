/**
 * Football Lab — SPA Controller (app.js)
 * Roteamento, gestão de sessão, utilitários globais de UI.
 */
(function () {
    'use strict';

    // ----------------------------------------------------------
    // Utilitários de UI globais
    // ----------------------------------------------------------

    /**
     * Exibe um toast de notificação.
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     */
    window.showToast = function (message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: 'fa-circle-check',
            error:   'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info:    'fa-circle-info',
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon"><i class="fa-solid ${icons[type] || icons.info}"></i></span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Auto-remove after 3.6s (matches CSS animation)
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 3700);
    };

    /** Exibe o overlay de loading global. */
    window.showLoading = function () {
        const el = document.getElementById('global-loader');
        if (el) el.classList.remove('hidden');
    };

    /** Oculta o overlay de loading global. */
    window.hideLoading = function () {
        const el = document.getElementById('global-loader');
        if (el) el.classList.add('hidden');
    };

    // ----------------------------------------------------------
    // Roteamento de módulos
    // ----------------------------------------------------------
    const ROUTES = {
        students: window.StudentsComponent,
        finance:  window.FinanceComponent,
        schedule: window.ScheduleComponent,
    };

    // ----------------------------------------------------------
    // App Controller
    // ----------------------------------------------------------
    const App = {
        _currentRoute: null,

        /**
         * Inicializa a SPA: verifica sessão e direciona para a tela correta.
         */
        init: async function () {
            window.showLoading();

            try {
                const session = await window.Auth.getSession();
                if (session) {
                    App._showApp(session.user);
                } else {
                    App._showLogin();
                }
            } catch (err) {
                console.error('[App] Erro ao verificar sessão:', err);
                App._showLogin();
            } finally {
                window.hideLoading();
            }

            // Reage a mudanças de estado de autenticação (login / logout externos)
            window.Auth.onAuthStateChange(function (event, session) {
                if (event === 'SIGNED_IN' && session) {
                    App._showApp(session.user);
                } else if (event === 'SIGNED_OUT') {
                    App._showLogin();
                }
            });
        },

        // ----------------------------------------------------------
        // Telas
        // ----------------------------------------------------------
        _showLogin: function () {
            document.getElementById('app-screen').classList.add('hidden');
            const loginScreen = document.getElementById('login-screen');
            loginScreen.classList.remove('hidden');
            loginScreen.style.display = 'flex';

            window.LoginComponent.render();
            App._currentRoute = null;
        },

        _showApp: function (user) {
            document.getElementById('login-screen').classList.add('hidden');
            const appScreen = document.getElementById('app-screen');
            appScreen.classList.remove('hidden');
            appScreen.style.display = 'flex';

            // E-mail do usuário na sidebar
            const emailEl = document.getElementById('user-email');
            if (emailEl && user) emailEl.textContent = user.email || 'Usuário';

            App._setupSidebar();
            App.navigate('students');
        },

        // ----------------------------------------------------------
        // Sidebar
        // ----------------------------------------------------------
        _setupSidebar: function () {
            // Toggle collapse
            const toggleBtn = document.getElementById('sidebar-toggle');
            const sidebar   = document.getElementById('sidebar');
            if (toggleBtn && sidebar) {
                toggleBtn.addEventListener('click', function () {
                    sidebar.classList.toggle('collapsed');
                });
            }

            // Nav links
            document.querySelectorAll('.nav-link[data-route]').forEach(link => {
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    App.navigate(this.dataset.route);
                });
            });

            // Logout
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', App._handleLogout);
            }
        },

        // ----------------------------------------------------------
        // Navigation
        // ----------------------------------------------------------
        navigate: function (route) {
            if (!ROUTES[route]) {
                console.warn('[App] Rota desconhecida:', route);
                return;
            }

            if (App._currentRoute === route) return;
            App._currentRoute = route;

            // Atualiza nav links ativos
            document.querySelectorAll('.nav-link[data-route]').forEach(link => {
                link.classList.toggle('active', link.dataset.route === route);
            });

            // Renderiza o componente
            ROUTES[route].render();
        },

        // ----------------------------------------------------------
        // Logout
        // ----------------------------------------------------------
        _handleLogout: async function () {
            if (!confirm('Deseja sair do sistema?')) return;

            try {
                window.showLoading();
                await window.Auth.logout();
                // onAuthStateChange cuida da transição
            } catch (err) {
                window.showToast('Erro ao sair: ' + err.message, 'error');
                window.hideLoading();
            }
        },

        // ----------------------------------------------------------
        // Modal helpers (usados pelos componentes)
        // ----------------------------------------------------------
        openModal: function (htmlContent) {
            const overlay   = document.getElementById('modal-overlay');
            const container = document.getElementById('modal-container');
            if (!overlay || !container) return;

            container.innerHTML = htmlContent;
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';

            // Fechar ao clicar no overlay (fora do container)
            overlay.addEventListener('click', App._overlayClickHandler);
        },

        closeModal: function () {
            const overlay = document.getElementById('modal-overlay');
            if (!overlay) return;
            overlay.classList.add('hidden');
            overlay.style.display = '';
            overlay.removeEventListener('click', App._overlayClickHandler);
            const container = document.getElementById('modal-container');
            if (container) container.innerHTML = '';
        },

        _overlayClickHandler: function (e) {
            if (e.target === document.getElementById('modal-overlay')) {
                App.closeModal();
            }
        },
    };

    window.App = App;

    // ----------------------------------------------------------
    // Bootstrap — inicia quando o DOM estiver pronto
    // ----------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { App.init(); });
    } else {
        App.init();
    }

    console.info('[FootballLab] App controller carregado.');
})();
