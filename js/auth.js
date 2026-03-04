/**
 * Football Lab — Auth Layer
 * Gerencia sessão, login e logout via Supabase Auth.
 * Exposto via window.Auth
 */
(function () {
    'use strict';

    function getClient() {
        if (!window.supabaseClient) {
            throw new Error(
                'Supabase não inicializado. Verifique se a página está sendo ' +
                'servida via HTTP (não file://) e se o CDN carregou corretamente.'
            );
        }
        return window.supabaseClient;
    }

    const Auth = {
        getSession: async function () {
            try {
                const { data, error } = await getClient().auth.getSession();
                if (error) {
                    console.error('[Auth] getSession error:', error);
                    return null;
                }
                return data.session;
            } catch (err) {
                console.error('[Auth] getSession exception:', err);
                return null;
            }
        },

        login: async function (email, password) {
            const { data, error } = await getClient().auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data;
        },

        logout: async function () {
            const { error } = await getClient().auth.signOut();
            if (error) throw error;
        },

        onAuthStateChange: function (callback) {
            if (!window.supabaseClient) return;
            window.supabaseClient.auth.onAuthStateChange(callback);
        },

        getCurrentUser: async function () {
            const session = await Auth.getSession();
            return session ? session.user : null;
        },
    };

    window.Auth = Auth;

    console.info('[FootballLab] Auth layer carregado.');
})();
