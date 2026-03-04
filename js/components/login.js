/**
 * Football Lab — Login Component
 * Renderiza a tela de login e gerencia o fluxo de autenticação.
 * Exposto via window.LoginComponent
 */
(function () {
    'use strict';

    const LoginComponent = {
        /**
         * Renderiza o HTML da tela de login no #login-screen.
         */
        render: function () {
            const screen = document.getElementById('login-screen');
            screen.innerHTML = `
                <div class="login-card">
                    <div class="login-brand">
                        <div class="login-brand-icon">
                            <i class="fa-solid fa-futbol"></i>
                        </div>
                        <h1>Football<strong>Lab</strong></h1>
                        <p>Sistema de Gestão Esportiva</p>
                    </div>

                    <form class="login-form" id="login-form" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="login-email">E-mail</label>
                            <input
                                type="email"
                                id="login-email"
                                class="form-input"
                                placeholder="seu@email.com"
                                autocomplete="email"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="login-password">Senha</label>
                            <input
                                type="password"
                                id="login-password"
                                class="form-input"
                                placeholder="••••••••"
                                autocomplete="current-password"
                                required
                            />
                        </div>

                        <div id="login-error" class="hidden" style="
                            background: rgba(239,68,68,0.1);
                            border: 1px solid rgba(239,68,68,0.3);
                            border-radius: 6px;
                            padding: 10px 14px;
                            font-size: 0.86rem;
                            color: #f87171;
                            display: flex; align-items: center; gap: 8px;
                        ">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            <span id="login-error-msg"></span>
                        </div>

                        <button type="submit" class="btn-primary" id="login-btn">
                            <i class="fa-solid fa-right-to-bracket"></i>
                            Entrar
                        </button>
                    </form>
                </div>
            `;

            LoginComponent._attachEvents();
        },

        /**
         * Anexa os listeners ao formulário de login.
         */
        _attachEvents: function () {
            const form     = document.getElementById('login-form');
            const emailEl  = document.getElementById('login-email');
            const passEl   = document.getElementById('login-password');
            const btnEl    = document.getElementById('login-btn');
            const errorBox = document.getElementById('login-error');
            const errorMsg = document.getElementById('login-error-msg');

            form.addEventListener('submit', async function (e) {
                e.preventDefault();

                const email    = emailEl.value.trim();
                const password = passEl.value;

                if (!email || !password) {
                    LoginComponent._showError('Preencha e-mail e senha.');
                    return;
                }

                // Loading state
                btnEl.disabled = true;
                btnEl.innerHTML = '<span class="btn-spinner"></span> Entrando…';
                errorBox.classList.add('hidden');

                try {
                    await window.Auth.login(email, password);
                    // App.js ouve onAuthStateChange e faz a transição
                } catch (err) {
                    let msg = 'Credenciais inválidas. Verifique e-mail e senha.';
                    if (err && err.message) {
                        if (err.message.includes('Email not confirmed')) {
                            msg = 'E-mail não confirmado. Verifique sua caixa de entrada.';
                        } else if (err.message.includes('Invalid login')) {
                            msg = 'E-mail ou senha incorretos.';
                        } else {
                            msg = err.message;
                        }
                    }
                    LoginComponent._showError(msg);
                } finally {
                    btnEl.disabled = false;
                    btnEl.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
                }
            });
        },

        _showError: function (msg) {
            const errorBox = document.getElementById('login-error');
            const errorMsg = document.getElementById('login-error-msg');
            if (errorBox && errorMsg) {
                errorMsg.textContent = msg;
                errorBox.classList.remove('hidden');
                errorBox.style.display = 'flex';
            }
        },
    };

    window.LoginComponent = LoginComponent;

    console.info('[FootballLab] LoginComponent carregado.');
})();
