/**
 * Football Lab — Supabase Client
 * Inicializa e expõe o cliente globalmente via window.supabaseClient
 */
(function () {
    'use strict';

    const SUPABASE_URL = 'https://negipnauepyeztarwvye.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ2lwbmF1ZXB5ZXp0YXJ3dnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTMyNjMsImV4cCI6MjA4ODIyOTI2M30.GZ49uxi39X6RSDHdyksAw8XnKxwvvq_QvH5WCNi0NGg';

    // O bundle UMD expõe o objeto global como window.supabase
    if (typeof window.supabase === 'undefined') {
        console.error(
            '[FootballLab] ERRO CRÍTICO: SDK do Supabase não foi carregado.\n' +
            'Verifique se o arquivo está sendo servido via HTTP (não file://) ' +
            'e se o script CDN foi carregado corretamente.'
        );
        window.supabaseClient = null;
        return;
    }

    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    console.info('[FootballLab] Supabase client inicializado com sucesso.');
})();
