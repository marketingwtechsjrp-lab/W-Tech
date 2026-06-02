import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Save, Server, AlertTriangle, Send, Image as ImageIcon, Smartphone, Banknote, CreditCard, BarChart3, Globe, ToggleLeft, ToggleRight, ShoppingCart, FlaskConical, ExternalLink, CheckCircle2, RefreshCw, Trash2, Loader2, XCircle } from 'lucide-react';
import { getGlobalWhatsAppConfig, sendWhatsAppMessage, sendWhatsAppMedia } from '../../lib/whatsapp';
import { getAsaasConfig } from '../../lib/asaas';
import { getStripeConfig } from '../../lib/stripe';
import { createMercadoPagoPreference } from '../../lib/mercadopago';

const AdminIntegrations = () => {
    const { user } = useAuth();

    // Global Config State (Admin Only)
    const [globalConfig, setGlobalConfig] = useState({
        serverUrl: '',
        apiKey: '',
        asaasKey: '',
        stripeKey: '',
        mercadoPagoKey: '',
        checkoutDiretoEnabled: false,
        googleClientId: '',
        googleClientSecret: '',
        ga4PropertyId: '',
        kiwifyClientId: '',
        kiwifyClientSecret: '',
        kiwifyAccountId: '',
        affiliatesDriveUrl: ''
    });

    const [loading, setLoading] = useState(false);

    // MP Integration Test State
    const [mpTest, setMpTest] = useState<{
        status: 'idle' | 'creating' | 'waiting' | 'confirmed' | 'error';
        enrollmentId: string | null;
        initPoint: string | null;
        isSandbox: boolean;
        amountPaid: number;
        transactionId: string | null;
        errorMsg: string | null;
    }>({ status: 'idle', enrollmentId: null, initPoint: null, isSandbox: false, amountPaid: 0, transactionId: null, errorMsg: null });
    const [mpTestPollCount, setMpTestPollCount] = useState(0);

    // Test Sending State
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Teste de mensagem do sistema W-Tech.');
    const [testImageUrl, setTestImageUrl] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    useEffect(() => {
        fetchGlobalConfig();
    }, [user]);

    // --- Global Config Logic ---

    const fetchGlobalConfig = async () => {
        const { data: configs } = await supabase.from('SITE_Config').select('*');
        
        if (configs) {
            const configMap = configs.reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg.value }), {});
            
            setGlobalConfig({
                serverUrl: configMap['evolution_api_url'] || '',
                apiKey: configMap['evolution_api_key'] || '',
                asaasKey: configMap['asaas_api_key'] || '',
                stripeKey: configMap['stripe_api_key'] || '',
                mercadoPagoKey: configMap['mercadopago_access_token'] || '',
                checkoutDiretoEnabled: configMap['checkout_direto_habilitado'] === 'true',
                googleClientId: configMap['google_oauth_client_id'] || '',
                googleClientSecret: configMap['google_oauth_client_secret'] || '',
                ga4PropertyId: configMap['ga4_property_id'] || '',
                kiwifyClientId: configMap['kiwify_client_id'] || '',
                kiwifyClientSecret: configMap['kiwify_client_secret'] || '',
                kiwifyAccountId: configMap['kiwify_account_id'] || '',
                affiliatesDriveUrl: configMap['affiliates_drive_url'] || ''
            });
        }
    };

    // Polling: verifica enrollment a cada 3s enquanto aguardando webhook (máx 2 min)
    useEffect(() => {
        if (mpTest.status !== 'waiting' || !mpTest.enrollmentId || mpTestPollCount >= 40) return;
        const timer = setTimeout(async () => {
            const { data: enr } = await supabase
                .from('SITE_Enrollments')
                .select('status, amount_paid')
                .eq('id', mpTest.enrollmentId)
                .single();

            if (enr?.status === 'Confirmed') {
                const { data: tx } = await supabase
                    .from('SITE_Transactions')
                    .select('id')
                    .eq('enrollment_id', mpTest.enrollmentId)
                    .single();
                setMpTest(prev => ({ ...prev, status: 'confirmed', amountPaid: enr.amount_paid, transactionId: tx?.id || null }));
            } else {
                setMpTestPollCount(prev => prev + 1);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [mpTest.status, mpTest.enrollmentId, mpTestPollCount]);

    const handleMpTest = async () => {
        if (!globalConfig.mercadoPagoKey) return alert('Configure o Access Token do Mercado Pago antes de testar.');
        const isSandbox = globalConfig.mercadoPagoKey.startsWith('APP_TEST');
        setMpTest({ status: 'creating', enrollmentId: null, initPoint: null, isSandbox, amountPaid: 0, transactionId: null, errorMsg: null });
        setMpTestPollCount(0);

        try {
            // Pega o primeiro curso disponível para satisfazer a FK
            const { data: course, error: courseErr } = await supabase
                .from('SITE_Courses')
                .select('id, title')
                .limit(1)
                .single();
            if (courseErr || !course) throw new Error('Nenhum curso cadastrado. Crie ao menos um curso antes de testar.');

            // Cria enrollment de teste
            const { data: enrollment, error: enrollError } = await supabase
                .from('SITE_Enrollments')
                .insert([{
                    course_id: course.id,
                    student_name: '⚠️ TESTE INTEGRAÇÃO MP',
                    student_email: user?.email || 'teste@w-tech.com',
                    student_cpf: '00000000000',
                    student_phone: '11900000000',
                    status: 'Pending',
                    payment_method: 'Mercado Pago',
                    total_amount: 1.00,
                    amount_paid: 0,
                    currency: 'BRL'
                }])
                .select('id')
                .single();

            if (enrollError || !enrollment) throw new Error(enrollError?.message || 'Erro ao criar inscrição de teste.');

            // Cria preferência no MP
            const mpResult = await createMercadoPagoPreference({
                course: { id: course.id, title: '⚠️ TESTE INTEGRAÇÃO MP', price: 1.00 },
                customer: { name: 'Teste Integração W-Tech', email: user?.email || 'teste@w-tech.com', cpf: '00000000000', phone: '11900000000' },
                enrollmentId: enrollment.id,
            });

            if (!mpResult.success) throw new Error(mpResult.error || 'Erro ao criar preferência MP.');

            const point = isSandbox ? mpResult.sandbox_init_point : mpResult.init_point;
            setMpTest(prev => ({ ...prev, status: 'waiting', enrollmentId: enrollment.id, initPoint: point || null }));
            if (point) window.open(point, '_blank');

        } catch (err: any) {
            setMpTest(prev => ({ ...prev, status: 'error', errorMsg: err.message }));
        }
    };

    const handleMpTestCleanup = async () => {
        if (!mpTest.enrollmentId) return;
        await supabase.from('SITE_Transactions').delete().eq('enrollment_id', mpTest.enrollmentId);
        await supabase.from('SITE_Enrollments').delete().eq('id', mpTest.enrollmentId);
        setMpTest({ status: 'idle', enrollmentId: null, initPoint: null, isSandbox: false, amountPaid: 0, transactionId: null, errorMsg: null });
        setMpTestPollCount(0);
    };

    const handleTestText = async () => {
        if (!testPhone) return alert('Digite um número para o teste.');
        setIsSendingTest(true);
        try {
            const { success, error } = await sendWhatsAppMessage(testPhone, testMessage, user?.id);
            if (success) alert('Mensagem enviada com sucesso!');
            else alert('Erro ao enviar: ' + JSON.stringify(error));
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleTestImage = async () => {
        if (!testPhone || !testImageUrl) return alert('Digite o número e a URL da imagem.');
        setIsSendingTest(true);
        try {
            const { success, error } = await sendWhatsAppMedia(testPhone, testImageUrl, testMessage, user?.id);
            if (success) alert('Imagem enviada com sucesso!');
            else alert('Erro ao enviar imagem: ' + JSON.stringify(error));
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleSaveGlobalConfig = async () => {
        setLoading(true);
        try {
            const updates = [
                { key: 'evolution_api_url', value: globalConfig.serverUrl },
                { key: 'evolution_api_key', value: globalConfig.apiKey },
                { key: 'asaas_api_key', value: globalConfig.asaasKey },
                { key: 'stripe_api_key', value: globalConfig.stripeKey },
                { key: 'mercadopago_access_token', value: globalConfig.mercadoPagoKey },
                { key: 'checkout_direto_habilitado', value: String(globalConfig.checkoutDiretoEnabled) },
                { key: 'google_oauth_client_id', value: globalConfig.googleClientId },
                { key: 'google_oauth_client_secret', value: globalConfig.googleClientSecret },
                { key: 'ga4_property_id', value: globalConfig.ga4PropertyId },
                { key: 'kiwify_client_id', value: globalConfig.kiwifyClientId },
                { key: 'kiwify_client_secret', value: globalConfig.kiwifyClientSecret },
                { key: 'kiwify_account_id', value: globalConfig.kiwifyAccountId },
                { key: 'affiliates_drive_url', value: globalConfig.affiliatesDriveUrl }
            ];

            for (const update of updates) {
                const { error } = await supabase.from('SITE_Config').upsert(update, { onConflict: 'key' });
                if (error) throw error;
            }
            alert('Configurações do Servidor salvas!');
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCheckoutDireto = async () => {
        const newValue = !globalConfig.checkoutDiretoEnabled;
        setGlobalConfig(prev => ({ ...prev, checkoutDiretoEnabled: newValue }));
        await supabase.from('SITE_Config').upsert(
            { key: 'checkout_direto_habilitado', value: String(newValue) },
            { onConflict: 'key' }
        );
    };

    const handleGoogleAuth = () => {
        if (!globalConfig.googleClientId) return alert('Configure o Client ID primeiro.');
        
        const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        const options = {
            redirect_uri: `https://${window.location.host}/google-auth.html`,
            client_id: globalConfig.googleClientId,
            access_type: 'offline',
            response_type: 'code',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/analytics.readonly',
                'https://www.googleapis.com/auth/webmasters.readonly',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ].join(' ')
        };

        const qs = new URLSearchParams(options).toString();
        window.location.href = `${rootUrl}?${qs}`;
    };

    const isAdmin = (user?.role === 'ADMIN' || user?.role === 'Super Admin') ||
        (typeof user?.role === 'object' && (user?.role?.name === 'ADMIN' || user?.role?.name === 'Super Admin'));

    if (!isAdmin) {
        return (
            <div className="p-8 text-center text-gray-500 bg-gray-50 bg-[var(--admin-surface-1)] rounded-xl border border-gray-200 ">
                <AlertTriangle className="mx-auto mb-2 text-yellow-500" size={32} />
                <h3 className="font-bold text-[var(--admin-text-primary)]">Acesso Restrito</h3>
                <p className="text-[var(--admin-text-secondary)]">Apenas administradores podem configurar o Servidor da API.</p>
                <p className="text-sm mt-2">Para conectar seu WhatsApp, vá em <strong>Meu Perfil</strong>.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. Global Server Config (Admin Only) */}
            <div className="bg-gray-50 bg-[var(--admin-surface-1)] p-6 rounded-xl border border-gray-200  shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Server className="text-[var(--admin-text-secondary)]" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Configuração do Servidor (Global)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Server URL</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] dark:focus:border-wtech-gold/50 transition-colors outline-none"
                            value={globalConfig.serverUrl}
                            onChange={e => setGlobalConfig({ ...globalConfig, serverUrl: e.target.value })}
                            placeholder="https://api.seudominio.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Global API Key</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono dark:focus:border-wtech-gold/50 transition-colors outline-none"
                            type="password"
                            value={globalConfig.apiKey}
                            onChange={e => setGlobalConfig({ ...globalConfig, apiKey: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Asaas Payment Config */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-gray-200  shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <Banknote className="text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Integração Asaas (Nacional)</h3>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-6">
                    API Key do Asaas para gerar links de pagamento (Boleto/Pix/Cartão) automaticamente.
                </p>
                <div>
                    <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Asaas API Key</label>
                    <input
                        className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono dark:focus:border-blue-500/50 transition-colors outline-none"
                        type="password"
                        value={globalConfig.asaasKey}
                        onChange={e => setGlobalConfig({ ...globalConfig, asaasKey: e.target.value })}
                        placeholder="$aact_..."
                    />
                </div>
                <button onClick={handleSaveGlobalConfig} disabled={loading} className="mt-4 bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 shadow-sm">
                    <Save size={14} /> Salvar Asaas
                </button>
            </div>

            {/* 3. Stripe Payment Config */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-gray-200  shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Integração Stripe (Internacional)</h3>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-6">
                    Secret Key do Stripe para vendas internacionais (USD, EUR, etc).
                </p>
                <div>
                    <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Stripe Secret Key (sk_live_...)</label>
                    <input
                        className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono dark:focus:border-purple-500/50 transition-colors outline-none"
                        type="password"
                        value={globalConfig.stripeKey}
                        onChange={e => setGlobalConfig({ ...globalConfig, stripeKey: e.target.value })}
                        placeholder="sk_live_..."
                    />
                </div>
                <button onClick={handleSaveGlobalConfig} disabled={loading} className="mt-4 bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 shadow-sm">
                    <Save size={14} /> Salvar Stripe
                </button>
            </div>

            {/* 4. Mercado Pago Config */}
            <div className={`p-6 rounded-xl border-2 shadow-sm transition-all ${globalConfig.checkoutDiretoEnabled ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800' : 'bg-[var(--admin-surface-1)] border-gray-200 '}`}>
                {/* Header com Toggle */}
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${globalConfig.checkoutDiretoEnabled ? 'bg-green-100 dark:bg-green-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <ShoppingCart size={20} className={globalConfig.checkoutDiretoEnabled ? 'text-green-600 dark:text-green-400' : 'text-[var(--admin-text-secondary)]'} />
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--admin-text-primary)]">Mercado Pago — Checkout Direto</h3>
                            <p className="text-xs text-[var(--admin-text-secondary)] mt-0.5">
                                LP → Formulário → Checkout → Pagamento → Inscrição automática
                            </p>
                        </div>
                    </div>
                    {/* Toggle liga/desliga */}
                    <button
                        onClick={handleToggleCheckoutDireto}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-sm transition-all shrink-0 ${globalConfig.checkoutDiretoEnabled ? 'bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/30' : 'bg-gray-200 dark:bg-gray-700 text-[var(--admin-text-secondary)]'}`}
                        title={globalConfig.checkoutDiretoEnabled ? 'Clique para desabilitar' : 'Clique para habilitar'}
                    >
                        {globalConfig.checkoutDiretoEnabled
                            ? <><ToggleRight size={18} /> ATIVO</>
                            : <><ToggleLeft size={18} /> INATIVO</>
                        }
                    </button>
                </div>

                {/* Status banner */}
                <div className={`rounded-lg px-4 py-3 mb-5 text-sm font-bold flex items-center gap-2 ${globalConfig.checkoutDiretoEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-[var(--admin-text-secondary)]'}`}>
                    {globalConfig.checkoutDiretoEnabled
                        ? '✓ Habilitado — clientes serão redirecionados ao checkout após preencher o formulário da LP'
                        : '○ Desabilitado — o formulário da LP exibirá a mensagem de "obrigado" (fluxo antigo)'}
                </div>

                {/* Access Token */}
                <div>
                    <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1 tracking-wider">
                        Access Token (APP_USR-... ou APP_TEST-...)
                    </label>
                    <input
                        className="w-full border border-[var(--admin-border)] rounded-lg p-2.5 text-sm bg-[var(--admin-surface-2)] font-mono focus:border-green-500 dark:focus:border-green-500/50 transition-colors outline-none"
                        type="password"
                        value={globalConfig.mercadoPagoKey}
                        onChange={e => setGlobalConfig({ ...globalConfig, mercadoPagoKey: e.target.value })}
                        placeholder="APP_USR-..."
                    />
                    <p className="text-xs text-[var(--admin-text-tertiary)] mt-1">
                        Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">APP_TEST-...</code> para sandbox (testes) ou <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">APP_USR-...</code> para produção.
                    </p>
                </div>
                <button onClick={handleSaveGlobalConfig} disabled={loading} className="mt-4 bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 shadow-sm">
                    <Save size={14} /> Salvar Token
                </button>
            </div>

            {/* 5. Teste de Integração — Mercado Pago */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-[var(--admin-border)] shadow-sm">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <FlaskConical size={20} className="text-violet-500" />
                        <h3 className="font-bold text-[var(--admin-text-primary)]">Teste de Integração — Mercado Pago</h3>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${globalConfig.mercadoPagoKey.startsWith('APP_TEST') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {globalConfig.mercadoPagoKey.startsWith('APP_TEST') ? 'Sandbox' : globalConfig.mercadoPagoKey ? 'Produção' : 'Sem token'}
                    </span>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-5">
                    Simula uma venda de <strong>R$ 1,00</strong>, abre o checkout do MP e monitora o retorno do webhook em tempo real.
                </p>

                {/* Idle */}
                {mpTest.status === 'idle' && (
                    <button
                        onClick={handleMpTest}
                        disabled={!globalConfig.mercadoPagoKey}
                        className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-black text-sm flex items-center gap-2 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-violet-500/20"
                    >
                        <FlaskConical size={16} /> Iniciar Teste de Pagamento
                    </button>
                )}

                {/* Creating */}
                {mpTest.status === 'creating' && (
                    <div className="flex items-center gap-3 text-sm text-[var(--admin-text-secondary)] font-bold">
                        <Loader2 size={18} className="animate-spin text-violet-500" />
                        Criando inscrição e preferência no Mercado Pago...
                    </div>
                )}

                {/* Waiting for webhook */}
                {mpTest.status === 'waiting' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                            <Loader2 size={18} className="animate-spin text-yellow-600 dark:text-yellow-400 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-yellow-800 dark:text-yellow-300">Aguardando webhook do Mercado Pago...</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-0.5">Polling a cada 3s · {mpTestPollCount}/40 tentativas</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 border border-[var(--admin-border)]">
                                <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Enrollment ID</p>
                                <p className="font-mono text-[var(--admin-text-primary)] truncate">{mpTest.enrollmentId}</p>
                            </div>
                            <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 border border-[var(--admin-border)]">
                                <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Modo</p>
                                <p className="font-bold text-[var(--admin-text-primary)]">{mpTest.isSandbox ? '🧪 Sandbox' : '🟢 Produção'}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {mpTest.initPoint && (
                                <a
                                    href={mpTest.initPoint}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-lg text-sm font-bold hover:bg-[var(--admin-surface-3)] transition-colors"
                                >
                                    <ExternalLink size={14} /> Abrir Checkout MP
                                </a>
                            )}
                            <button
                                onClick={handleMpTestCleanup}
                                className="flex items-center gap-2 px-4 py-2 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={14} /> Cancelar e Limpar
                            </button>
                        </div>
                    </div>
                )}

                {/* Confirmed — webhook received */}
                {mpTest.status === 'confirmed' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <CheckCircle2 size={22} className="text-green-600 dark:text-green-400 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-green-800 dark:text-green-300">Webhook recebido com sucesso!</p>
                                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Enrollment confirmado · Transação registrada · Lead atualizado</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 border border-[var(--admin-border)]">
                                <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Status</p>
                                <p className="font-black text-green-600 dark:text-green-400">Confirmed ✓</p>
                            </div>
                            <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 border border-[var(--admin-border)]">
                                <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Valor Reconhecido</p>
                                <p className="font-black text-[var(--admin-text-primary)]">R$ {mpTest.amountPaid.toFixed(2)}</p>
                            </div>
                            <div className="bg-[var(--admin-surface-2)] rounded-lg p-3 border border-[var(--admin-border)]">
                                <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Transação</p>
                                <p className="font-mono text-[var(--admin-text-primary)] truncate">{mpTest.transactionId ? `#${mpTest.transactionId.slice(-8)}` : '—'}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleMpTestCleanup}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-lg text-sm font-bold hover:bg-red-500/10 hover:text-red-500 hover:border-red-300 transition-all"
                        >
                            <Trash2 size={14} /> Limpar dados de teste
                        </button>
                    </div>
                )}

                {/* Error */}
                {mpTest.status === 'error' && (
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-black text-red-700 dark:text-red-400">Erro no teste</p>
                                <p className="text-xs text-red-600 dark:text-red-500 mt-1">{mpTest.errorMsg}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setMpTest(prev => ({ ...prev, status: 'idle' }))}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-surface-2)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-lg text-sm font-bold hover:bg-[var(--admin-surface-3)] transition-colors"
                        >
                            <RefreshCw size={14} /> Tentar novamente
                        </button>
                    </div>
                )}
            </div>

            {/* 5.5. Kiwify & Affiliates Config */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <Server className="text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Integração Kiwify & Portal de Afiliados</h3>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-6 font-medium">
                    Configure as credenciais da API Pública da Kiwify para sincronizar a lista de afiliados em tempo real e o link do Google Drive com criativos/materiais promocionais.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Kiwify Client ID</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.kiwifyClientId}
                            onChange={e => setGlobalConfig({ ...globalConfig, kiwifyClientId: e.target.value })}
                            placeholder="Obtido em Apps -> API na Kiwify"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Kiwify Client Secret</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            type="password"
                            value={globalConfig.kiwifyClientSecret}
                            onChange={e => setGlobalConfig({ ...globalConfig, kiwifyClientSecret: e.target.value })}
                            placeholder="client_secret da Kiwify"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Kiwify Account ID</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.kiwifyAccountId}
                            onChange={e => setGlobalConfig({ ...globalConfig, kiwifyAccountId: e.target.value })}
                            placeholder="x-kiwify-account-id da Kiwify"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Google Drive (Materiais de Afiliados)</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all"
                            value={globalConfig.affiliatesDriveUrl}
                            onChange={e => setGlobalConfig({ ...globalConfig, affiliatesDriveUrl: e.target.value })}
                            placeholder="https://drive.google.com/drive/folders/..."
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <button onClick={handleSaveGlobalConfig} disabled={loading} className="bg-gray-800 dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center gap-2 shadow-sm">
                        <Save size={14} /> Salvar Integração Kiwify
                    </button>
                </div>
            </div>

            {/* 6. Google Analytics / Search Console Config */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-gray-200  shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="text-red-500 dark:text-red-400" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Conexão Google Cloud (Marketing)</h3>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-6 font-medium">
                    Configure as credenciais OAuth para importar dados reais do Google Analytics 4 e Search Console.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Client ID (OAuth)</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono text-[10px]"
                            value={globalConfig.googleClientId}
                            onChange={e => setGlobalConfig({ ...globalConfig, googleClientId: e.target.value })}
                            placeholder="...apps.googleusercontent.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Client Secret</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono text-[10px]"
                            type="password"
                            value={globalConfig.googleClientSecret}
                            onChange={e => setGlobalConfig({ ...globalConfig, googleClientSecret: e.target.value })}
                            placeholder="GOCSPX-..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">GA4 Property ID</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.ga4PropertyId}
                            onChange={e => setGlobalConfig({ ...globalConfig, ga4PropertyId: e.target.value })}
                            placeholder="123456789"
                        />
                        <p className="text-[10px] text-gray-400 mt-2 italic">Você encontra isso nas Configurações da Propriedade no GA4.</p>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={handleSaveGlobalConfig} disabled={loading} className="bg-wtech-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                        <Save size={14} /> Salvar Credenciais Google
                    </button>
                    <button 
                        onClick={handleGoogleAuth} 
                        disabled={loading || !globalConfig.googleClientId}
                        className="border-2 border-wtech-black dark:border-white text-wtech-black px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-wtech-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
                    >
                        <Globe size={14} /> Autenticar Conta
                    </button>
                </div>

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                    <div className="flex gap-3 text-amber-800 dark:text-amber-400">
                        <AlertTriangle size={18} className="shrink-0" />
                        <div className="text-[11px] leading-relaxed">
                            <p className="font-bold mb-1 uppercase tracking-wider">Atenção ao Configurar</p>
                            Para funcionar, adicione <strong>https://{window.location.host}/auth/callback</strong> nas URIs de redirecionamento autorizadas do seu projeto no Google Console.
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Test Connection & Send (NEW) */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-[var(--admin-border)] shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Send className="text-blue-500 dark:text-blue-400" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">Testar Disparo & Integração</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Número de Destino</label>
                        <div className="relative">
                            <Smartphone size={14} className="absolute left-3 top-3 text-gray-300" />
                            <input
                                className="w-full border border-[var(--admin-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm font-bold bg-gray-50/30 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all"
                                placeholder="DD9XXXXXXXX"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Conteúdo da Mensagem</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm bg-gray-50/30 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all"
                            placeholder="Olá, teste de integração..."
                            value={testMessage}
                            onChange={e => setTestMessage(e.target.value)}
                        />
                    </div>

                    <div className="lg:col-span-5 flex gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">URL da Imagem (Opcional)</label>
                            <div className="relative">
                                <ImageIcon size={14} className="absolute left-3 top-3 text-gray-300" />
                                <input
                                    className="w-full border border-[var(--admin-border)] rounded-lg pl-9 pr-3 py-2.5 text-sm bg-gray-50/30 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none font-mono text-[10px] transition-all"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                    value={testImageUrl}
                                    onChange={e => setTestImageUrl(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-50 ">
                    <button
                        onClick={handleTestText}
                        disabled={isSendingTest || !testPhone}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 shadow-lg shadow-blue-500/10 dark:shadow-none transition-all active:scale-95"
                    >
                        {isSendingTest ? 'Enviando...' : <><Send size={14} /> Enviar Mensagem de Texto</>}
                    </button>
                    <button
                        onClick={handleTestImage}
                        disabled={isSendingTest || !testPhone || !testImageUrl}
                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500 disabled:opacity-50 shadow-lg shadow-green-500/10 dark:shadow-none transition-all active:scale-95"
                    >
                        {isSendingTest ? 'Enviando...' : <><ImageIcon size={14} /> Enviar Teste de Imagem</>}
                    </button>
                </div>

                <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-100/50 dark:border-blue-900/40">
                    <p className="text-[10px] text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                        <strong>Dica:</strong> O envio utiliza a sua instância pessoal (conectada no seu perfil). Se você não estiver conectado, o sistema tentará usar a instância padrão configurada globalmente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminIntegrations;
