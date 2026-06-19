import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Save, Server, AlertTriangle, Send, Image as ImageIcon, Smartphone, Banknote, CreditCard, BarChart3, Globe, ToggleLeft, ToggleRight, ShoppingCart, FlaskConical, ExternalLink, CheckCircle2, RefreshCw, Trash2, Loader2, XCircle, Bot, QrCode } from 'lucide-react';
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
        automationInstance: '',
        fallbackInstance: '',
        saldoRemindersEnabled: true,
        saldoRemindersScope: 'auto' as 'auto' | 'all',
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
        affiliatesDriveUrl: '',
        brevoEnabled: false,
        brevoSmtpHost: 'smtp-relay.brevo.com',
        brevoSmtpPort: '587',
        brevoSmtpLogin: '',
        brevoSmtpKey: '',
        brevoSenderEmail: '',
        brevoSenderName: 'W-Tech Brasil',
        // WhatsApp Cloud API (Meta) — atendimento oficial (separado da Evolution)
        waCloudPhoneNumberId: '',
        waCloudWabaId: '',
        waCloudAppId: '',
        waCloudAppSecret: '',
        waCloudAccessToken: '',
        waCloudApiVersion: 'v20.0',
        waCloudVerifyToken: '',
        waCloudDisplayNumber: ''
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

    // Brevo Test Email State
    const [testEmailTo, setTestEmailTo] = useState('');
    const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

    // Automation Instance State (criação/conexão/QR da instância do robô)
    const [automationTestPhone, setAutomationTestPhone] = useState('');
    const [isTestingAutomation, setIsTestingAutomation] = useState(false);
    const [automationStatus, setAutomationStatus] = useState<string>('desconhecido');
    const [automationQr, setAutomationQr] = useState<string | null>(null);
    const [isManagingAutomation, setIsManagingAutomation] = useState(false);

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
                automationInstance: configMap['automation_whatsapp_instance'] || '',
                fallbackInstance: configMap['evolution_instance_name'] || '',
                saldoRemindersEnabled: configMap['saldo_reminders_enabled'] !== 'false',
                saldoRemindersScope: configMap['saldo_reminders_scope'] === 'all' ? 'all' : 'auto',
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
                affiliatesDriveUrl: configMap['affiliates_drive_url'] || '',
                brevoEnabled: configMap['brevo_enabled'] === 'true',
                brevoSmtpHost: configMap['brevo_smtp_host'] || 'smtp-relay.brevo.com',
                brevoSmtpPort: configMap['brevo_smtp_port'] || '587',
                brevoSmtpLogin: configMap['brevo_smtp_login'] || '',
                brevoSmtpKey: configMap['brevo_smtp_key'] || '',
                brevoSenderEmail: configMap['brevo_sender_email'] || '',
                brevoSenderName: configMap['brevo_sender_name'] || 'W-Tech Brasil',
                // WhatsApp Cloud API (Meta) — defaults não-sensíveis já preenchidos
                waCloudPhoneNumberId: configMap['whatsapp_cloud_phone_number_id'] || '561199070419888',
                waCloudWabaId: configMap['whatsapp_cloud_waba_id'] || '715698567695226',
                waCloudAppId: configMap['whatsapp_cloud_app_id'] || '1424299738908155',
                waCloudAppSecret: configMap['whatsapp_cloud_app_secret'] || '',
                waCloudAccessToken: configMap['whatsapp_cloud_access_token'] || '',
                waCloudApiVersion: configMap['whatsapp_cloud_api_version'] || 'v20.0',
                waCloudVerifyToken: configMap['whatsapp_cloud_webhook_verify_token'] || 'wtech_meta_webhook_2026',
                waCloudDisplayNumber: configMap['whatsapp_cloud_display_number'] || '+55 17 3231-2858'
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

    /** Consulta o estado real da instância de automação na Evolution. */
    const checkAutomationState = async (instanceOverride?: string) => {
        const instance = (instanceOverride ?? globalConfig.automationInstance).trim();
        if (!globalConfig.serverUrl || !globalConfig.apiKey || !instance) return;
        try {
            const response = await fetch(`${globalConfig.serverUrl}/instance/connectionState/${instance}`, {
                method: 'GET',
                headers: { apikey: globalConfig.apiKey }
            });
            const data = await response.json();
            const state = data?.instance?.state || data?.state || data?.connectionStatus?.state || 'disconnected';
            setAutomationStatus(state);
            if (state === 'open') setAutomationQr(null);
        } catch {
            setAutomationStatus('erro');
        }
    };

    /** Cria a instância do robô na Evolution e abre o QR Code para escanear. */
    const handleCreateAutomationInstance = async () => {
        const instance = globalConfig.automationInstance.trim();
        if (!globalConfig.serverUrl || !globalConfig.apiKey) return alert('Preencha e salve a Server URL e a Global API Key primeiro.');
        if (!instance) return alert('Digite um nome para a instância de automação (ex: automacao-wtech).');
        setIsManagingAutomation(true);
        setAutomationQr(null);
        try {
            const response = await fetch(`${globalConfig.serverUrl}/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: globalConfig.apiKey },
                body: JSON.stringify({ instanceName: instance, token: globalConfig.apiKey, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
            });
            const data = await response.json();

            const created = !!(data.instance || data.hash);
            const alreadyExists = JSON.stringify(data).includes('already');
            if (!created && !alreadyExists) {
                return alert('Erro ao criar instância: ' + JSON.stringify(data).slice(0, 300));
            }

            // Persiste o nome para o robô do servidor usar imediatamente
            await supabase.from('SITE_Config').upsert(
                { key: 'automation_whatsapp_instance', value: instance },
                { onConflict: 'key' }
            );

            // QR pode vir direto do create; senão, busca no connect
            if (data.qrcode?.base64) {
                setAutomationQr(data.qrcode.base64);
                setAutomationStatus('connecting');
            } else {
                await handleConnectAutomationInstance(instance);
            }
        } catch (e: any) {
            alert('Erro de requisição: ' + e.message);
        } finally {
            setIsManagingAutomation(false);
        }
    };

    /** Busca o QR Code de conexão da instância (ou detecta que já está conectada). */
    const handleConnectAutomationInstance = async (instanceOverride?: string) => {
        const instance = (instanceOverride ?? globalConfig.automationInstance).trim();
        if (!globalConfig.serverUrl || !globalConfig.apiKey || !instance) return;
        setIsManagingAutomation(true);
        try {
            const response = await fetch(`${globalConfig.serverUrl}/instance/connect/${instance}`, {
                method: 'GET',
                headers: { apikey: globalConfig.apiKey }
            });
            const data = await response.json();
            if (data.base64) {
                setAutomationQr(data.base64);
                setAutomationStatus('connecting');
            } else if (data.instance?.state === 'open') {
                setAutomationStatus('open');
                setAutomationQr(null);
                alert('Esta instância já está conectada!');
            } else {
                alert('Não foi possível obter o QR Code. Tente "Criar / Conectar" novamente.');
            }
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setIsManagingAutomation(false);
        }
    };

    /** Desconecta e apaga a instância do robô no servidor Evolution. */
    const handleDeleteAutomationInstance = async () => {
        const instance = globalConfig.automationInstance.trim();
        if (!instance) return;
        if (!confirm(`ATENÇÃO: isso desconecta e APAGA a instância "${instance}" do servidor Evolution. As automações (cobranças/remarketing) param de enviar até reconectar. Continuar?`)) return;
        setIsManagingAutomation(true);
        try {
            await fetch(`${globalConfig.serverUrl}/instance/delete/${instance}`, {
                method: 'DELETE',
                headers: { apikey: globalConfig.apiKey }
            });
            setAutomationStatus('disconnected');
            setAutomationQr(null);
            alert('Instância de automação removida do servidor.');
        } catch (e: any) {
            alert('Erro ao apagar: ' + e.message);
        } finally {
            setIsManagingAutomation(false);
        }
    };

    // Enquanto o QR estiver na tela, checa a cada 5s se foi escaneado
    useEffect(() => {
        if (!automationQr) return;
        const timer = setInterval(() => checkAutomationState(), 5000);
        return () => clearInterval(timer);
    }, [automationQr, globalConfig.automationInstance, globalConfig.serverUrl, globalConfig.apiKey]);

    const handleTestAutomationInstance = async () => {
        if (!automationTestPhone.trim()) return alert('Informe um telefone (DDD + número) para o teste.');
        const instance = globalConfig.automationInstance.trim() || globalConfig.fallbackInstance.trim();
        if (!instance) return alert('Preencha o nome da instância de automação (ou configure a instância padrão) antes de testar.');
        setIsTestingAutomation(true);
        try {
            const { success, error } = await sendWhatsAppMessage(
                automationTestPhone,
                '🤖 Teste da instância de automação do sistema W-Tech.\n\nSe você recebeu esta mensagem, os alertas, cobranças e remarketing automáticos sairão por este número.',
                instance
            );
            if (success) alert(`Mensagem de teste enviada pela instância "${instance}"!`);
            else alert('Erro ao enviar: ' + JSON.stringify(error));
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setIsTestingAutomation(false);
        }
    };

    const handleSaveGlobalConfig = async () => {
        setLoading(true);
        try {
            const updates = [
                { key: 'evolution_api_url', value: globalConfig.serverUrl },
                { key: 'evolution_api_key', value: globalConfig.apiKey },
                { key: 'automation_whatsapp_instance', value: globalConfig.automationInstance.trim() },
                { key: 'saldo_reminders_enabled', value: String(globalConfig.saldoRemindersEnabled) },
                { key: 'saldo_reminders_scope', value: globalConfig.saldoRemindersScope },
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
                { key: 'affiliates_drive_url', value: globalConfig.affiliatesDriveUrl },
                { key: 'brevo_enabled', value: String(globalConfig.brevoEnabled) },
                { key: 'brevo_smtp_host', value: globalConfig.brevoSmtpHost },
                { key: 'brevo_smtp_port', value: globalConfig.brevoSmtpPort },
                { key: 'brevo_smtp_login', value: globalConfig.brevoSmtpLogin },
                { key: 'brevo_smtp_key', value: globalConfig.brevoSmtpKey },
                { key: 'brevo_sender_email', value: globalConfig.brevoSenderEmail },
                { key: 'brevo_sender_name', value: globalConfig.brevoSenderName },
                // WhatsApp Cloud API (Meta)
                { key: 'whatsapp_cloud_phone_number_id', value: globalConfig.waCloudPhoneNumberId.trim() },
                { key: 'whatsapp_cloud_waba_id', value: globalConfig.waCloudWabaId.trim() },
                { key: 'whatsapp_cloud_app_id', value: globalConfig.waCloudAppId.trim() },
                { key: 'whatsapp_cloud_app_secret', value: globalConfig.waCloudAppSecret.trim() },
                { key: 'whatsapp_cloud_access_token', value: globalConfig.waCloudAccessToken.trim() },
                { key: 'whatsapp_cloud_api_version', value: globalConfig.waCloudApiVersion.trim() || 'v20.0' },
                { key: 'whatsapp_cloud_webhook_verify_token', value: globalConfig.waCloudVerifyToken.trim() },
                { key: 'whatsapp_cloud_display_number', value: globalConfig.waCloudDisplayNumber.trim() }
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

    const handleSendTestEmail = async () => {
        if (!testEmailTo.trim()) return alert('Informe um e-mail de destino para o teste.');
        if (!globalConfig.brevoSmtpKey || !globalConfig.brevoSenderEmail) {
            return alert('Preencha a SMTP Key e o e-mail remetente do Brevo, e salve, antes de testar.');
        }
        setIsSendingTestEmail(true);
        try {
            const res = await fetch('/api/send-test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: testEmailTo.trim() })
            });
            const data = await res.json();
            if (res.ok && data.sent) {
                alert(`E-mail de teste enviado para ${testEmailTo}. Verifique a caixa de entrada (e o spam).`);
            } else {
                alert('Falha no envio: ' + (data.error || `HTTP ${res.status}`));
            }
        } catch (err: any) {
            alert('Erro ao enviar e-mail de teste: ' + err.message);
        } finally {
            setIsSendingTestEmail(false);
        }
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

                {/* Instância de Automação do Sistema */}
                <div className="mt-5 pt-5 border-t border-[var(--admin-border)]">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Bot size={16} className="text-wtech-gold" />
                            <label className="text-xs font-bold text-[var(--admin-text-secondary)] uppercase">Instância de Automação do Sistema</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                automationStatus === 'open' ? 'bg-green-100 text-green-700' :
                                automationStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                                {automationStatus === 'open' ? 'Conectado' : automationStatus === 'connecting' ? 'Aguardando QR' : automationStatus}
                            </span>
                            <button
                                onClick={() => checkAutomationState()}
                                className="p-1.5 hover:bg-[var(--admin-surface-2)] rounded-full"
                                title="Atualizar status"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--admin-text-secondary)] mb-3">
                        Número usado pelo <strong>robô do sistema</strong> para alertas, cobranças de saldo pendente e remarketing.
                        Crie a instância, escaneie o QR Code com o chip dedicado e pronto.
                        {globalConfig.fallbackInstance && !globalConfig.automationInstance && (
                            <span className="text-amber-600 dark:text-amber-400"> Vazio = usa a instância padrão "{globalConfig.fallbackInstance}".</span>
                        )}
                    </p>
                    <div className="flex flex-col md:flex-row gap-2">
                        <input
                            className="flex-1 border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] dark:focus:border-wtech-gold/50 transition-colors outline-none"
                            value={globalConfig.automationInstance}
                            onChange={e => setGlobalConfig({ ...globalConfig, automationInstance: e.target.value })}
                            placeholder="ex: automacao-wtech (nome da instância na Evolution)"
                        />
                        <button
                            onClick={handleCreateAutomationInstance}
                            disabled={isManagingAutomation || automationStatus === 'open'}
                            className="bg-green-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold uppercase hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                            <QrCode size={15} /> {automationStatus === 'open' ? 'Conectado' : isManagingAutomation ? 'Aguarde...' : 'Criar / Conectar (QR)'}
                        </button>
                        {globalConfig.automationInstance.trim() && (
                            <button
                                onClick={handleDeleteAutomationInstance}
                                disabled={isManagingAutomation}
                                className="bg-red-600 text-white px-3 py-2 rounded flex items-center justify-center gap-1 text-xs font-bold uppercase hover:bg-red-700 disabled:opacity-50 transition-colors"
                                title="Desconectar e apagar instância"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    {automationQr && (
                        <div className="mt-4 p-4 bg-[var(--admin-surface-2)] rounded-lg flex flex-col items-center border border-[var(--admin-border)]">
                            <h4 className="font-bold text-sm text-[var(--admin-text-primary)] mb-2">Escaneie o QR Code com o número da automação</h4>
                            <img src={automationQr} alt="QR Code WhatsApp Automação" className="w-56 h-56 border-4 border-white shadow-lg rounded-lg bg-white" />
                            <p className="text-xs text-[var(--admin-text-secondary)] mt-2">WhatsApp → Aparelhos Conectados → Conectar Aparelho. O status atualiza sozinho ao conectar.</p>
                        </div>
                    )}

                    <div className="flex gap-2 mt-3">
                        <input
                            className="flex-1 border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] dark:focus:border-wtech-gold/50 transition-colors outline-none"
                            value={automationTestPhone}
                            onChange={e => setAutomationTestPhone(e.target.value)}
                            placeholder="Telefone p/ teste (DDD + número)"
                        />
                        <button
                            onClick={handleTestAutomationInstance}
                            disabled={isTestingAutomation}
                            className="px-4 py-2 bg-wtech-gold text-black rounded text-xs font-bold uppercase hover:bg-yellow-500 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                            {isTestingAutomation ? 'Enviando...' : 'Testar Envio'}
                        </button>
                    </div>
                </div>

                {/* Cobrança Automática de Saldo Pendente */}
                <div className="mt-5 pt-5 border-t border-[var(--admin-border)]">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Banknote size={16} className="text-wtech-gold" />
                            <label className="text-xs font-bold text-[var(--admin-text-secondary)] uppercase">Cobrança Automática de Saldo Pendente</label>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGlobalConfig({ ...globalConfig, saldoRemindersEnabled: !globalConfig.saldoRemindersEnabled })}
                            className="flex items-center gap-1.5 text-xs font-bold uppercase"
                            title={globalConfig.saldoRemindersEnabled ? 'Cobrança ligada' : 'Cobrança desligada'}
                        >
                            {globalConfig.saldoRemindersEnabled
                                ? <><ToggleRight size={26} className="text-green-600" /> <span className="text-green-700">Ativa</span></>
                                : <><ToggleLeft size={26} className="text-gray-400" /> <span className="text-gray-500">Desativada</span></>}
                        </button>
                    </div>
                    <p className="text-xs text-[var(--admin-text-secondary)] mb-3">
                        Define quem recebe os lembretes automáticos de saldo pendente (e-mail + WhatsApp em 3 estágios).
                    </p>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 transition-opacity ${globalConfig.saldoRemindersEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
                        <button
                            type="button"
                            onClick={() => setGlobalConfig({ ...globalConfig, saldoRemindersScope: 'auto' })}
                            className={`text-left p-3 rounded-lg border transition-colors ${
                                globalConfig.saldoRemindersScope === 'auto'
                                    ? 'border-wtech-gold bg-wtech-gold/10'
                                    : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] hover:border-wtech-gold/40'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                {globalConfig.saldoRemindersScope === 'auto'
                                    ? <CheckCircle2 size={15} className="text-wtech-gold" />
                                    : <Bot size={15} className="text-[var(--admin-text-secondary)]" />}
                                <span className="text-sm font-bold text-[var(--admin-text-primary)]">Somente leads do sistema</span>
                            </div>
                            <p className="text-[11px] text-[var(--admin-text-secondary)] leading-snug">
                                Apenas inscrições criadas automaticamente (checkout, site, webhook). Quem foi cadastrado por um atendente <strong>não</strong> recebe cobrança automática.
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGlobalConfig({ ...globalConfig, saldoRemindersScope: 'all' })}
                            className={`text-left p-3 rounded-lg border transition-colors ${
                                globalConfig.saldoRemindersScope === 'all'
                                    ? 'border-wtech-gold bg-wtech-gold/10'
                                    : 'border-[var(--admin-border)] bg-[var(--admin-surface-2)] hover:border-wtech-gold/40'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                {globalConfig.saldoRemindersScope === 'all'
                                    ? <CheckCircle2 size={15} className="text-wtech-gold" />
                                    : <Globe size={15} className="text-[var(--admin-text-secondary)]" />}
                                <span className="text-sm font-bold text-[var(--admin-text-primary)]">Todos os alunos com saldo</span>
                            </div>
                            <p className="text-[11px] text-[var(--admin-text-secondary)] leading-snug">
                                Cobra qualquer inscrição com saldo em aberto, inclusive as cadastradas manualmente por atendentes.
                            </p>
                        </button>
                    </div>

                    <button
                        onClick={handleSaveGlobalConfig}
                        disabled={loading}
                        className="mt-3 bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded text-xs font-bold uppercase hover:bg-gray-900 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Save size={14} /> Salvar Cobrança
                    </button>
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

            {/* 3.5. Brevo E-mail (SMTP) Config */}
            <div className={`p-6 rounded-xl border-2 shadow-sm transition-all md:col-span-2 ${globalConfig.brevoEnabled ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' : 'bg-[var(--admin-surface-1)] border-gray-200 '}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Send className="text-amber-600 dark:text-amber-400" />
                        <h3 className="font-bold text-[var(--admin-text-primary)]">E-mail (Brevo SMTP)</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setGlobalConfig({ ...globalConfig, brevoEnabled: !globalConfig.brevoEnabled })}
                        className="flex items-center gap-2 text-sm font-bold text-[var(--admin-text-secondary)]"
                    >
                        {globalConfig.brevoEnabled ? <ToggleRight size={28} className="text-amber-500" /> : <ToggleLeft size={28} className="text-gray-400" />}
                        {globalConfig.brevoEnabled ? 'Ativo' : 'Inativo'}
                    </button>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-6">
                    Credenciais SMTP do Brevo para envio de e-mails transacionais (confirmação de inscrição) e fluxos de follow-up. Pegue a SMTP Key em Brevo → SMTP &amp; API → SMTP.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Servidor SMTP</label>
                        <input className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono transition-colors outline-none" type="text" value={globalConfig.brevoSmtpHost} onChange={e => setGlobalConfig({ ...globalConfig, brevoSmtpHost: e.target.value })} placeholder="smtp-relay.brevo.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Porta</label>
                        <input className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono transition-colors outline-none" type="text" value={globalConfig.brevoSmtpPort} onChange={e => setGlobalConfig({ ...globalConfig, brevoSmtpPort: e.target.value })} placeholder="587" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Login SMTP</label>
                        <input className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono transition-colors outline-none" type="text" value={globalConfig.brevoSmtpLogin} onChange={e => setGlobalConfig({ ...globalConfig, brevoSmtpLogin: e.target.value })} placeholder="xxxxxx@smtp-brevo.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">SMTP Key (senha)</label>
                        <input className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] font-mono transition-colors outline-none" type="password" value={globalConfig.brevoSmtpKey} onChange={e => setGlobalConfig({ ...globalConfig, brevoSmtpKey: e.target.value })} placeholder="xsmtpsib-..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">E-mail Remetente (verificado)</label>
                        <input className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] transition-colors outline-none" type="email" value={globalConfig.brevoSenderEmail} onChange={e => setGlobalConfig({ ...globalConfig, brevoSenderEmail: e.target.value })} placeholder="contato@w-techbrasil.com.br" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--admin-text-secondary)] uppercase mb-1">Nome do Remetente</label>
                        <input className="w-full border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] transition-colors outline-none" type="text" value={globalConfig.brevoSenderName} onChange={e => setGlobalConfig({ ...globalConfig, brevoSenderName: e.target.value })} placeholder="W-Tech Brasil" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button onClick={handleSaveGlobalConfig} disabled={loading} className="bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-900 transition-colors flex items-center gap-2 shadow-sm">
                        <Save size={14} /> Salvar Brevo
                    </button>
                    <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                        <input className="flex-1 border border-[var(--admin-border)] rounded p-2 text-sm bg-[var(--admin-surface-2)] transition-colors outline-none" type="email" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} placeholder="enviar teste para..." />
                        <button onClick={handleSendTestEmail} disabled={isSendingTestEmail} className="bg-amber-500 text-black px-4 py-2 rounded text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
                            {isSendingTestEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Testar
                        </button>
                    </div>
                </div>
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

            {/* 5.6. WhatsApp Cloud API (Meta) — atendimento oficial */}
            <div className="bg-[var(--admin-surface-1)] p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="text-green-600 dark:text-green-400" />
                    <h3 className="font-bold text-[var(--admin-text-primary)]">WhatsApp Cloud API (Meta) — Atendimento Oficial</h3>
                </div>
                <p className="text-sm text-[var(--admin-text-secondary)] mb-4 font-medium">
                    Credenciais da API oficial da Meta usadas pelo inbox em <strong>Operacional → WhatsApp (Meta)</strong>.
                    É independente da automação via Evolution API acima. O servidor lê estes valores (e o token nunca
                    é exposto no navegador). Cole o <strong>Access Token permanente</strong> do System User.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Phone Number ID</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.waCloudPhoneNumberId}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudPhoneNumberId: e.target.value })}
                            placeholder="561199070419888"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">WABA ID (WhatsApp Business Account)</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.waCloudWabaId}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudWabaId: e.target.value })}
                            placeholder="715698567695226"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">App ID</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.waCloudAppId}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudAppId: e.target.value })}
                            placeholder="1424299738908155"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">App Secret</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            type="password"
                            value={globalConfig.waCloudAppSecret}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudAppSecret: e.target.value })}
                            placeholder="App Secret do app wtech"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Access Token (permanente — System User)</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            type="password"
                            value={globalConfig.waCloudAccessToken}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudAccessToken: e.target.value })}
                            placeholder="EAAUPZA... (token permanente; o temporário do Graph Explorer vale ~60 dias)"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">API Version</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.waCloudApiVersion}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudApiVersion: e.target.value })}
                            placeholder="v20.0"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Número (exibição)</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all"
                            value={globalConfig.waCloudDisplayNumber}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudDisplayNumber: e.target.value })}
                            placeholder="+55 17 3231-2858"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Webhook — Verify Token</label>
                        <input
                            className="w-full border border-[var(--admin-border)] rounded-lg p-3 text-sm bg-gray-50/50 bg-[var(--admin-surface-2)] focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.waCloudVerifyToken}
                            onChange={e => setGlobalConfig({ ...globalConfig, waCloudVerifyToken: e.target.value })}
                            placeholder="você define (use o mesmo no painel da Meta)"
                        />
                    </div>
                </div>

                {/* Dados do webhook para colar no painel da Meta */}
                <div className="mt-5 rounded-lg border border-green-200 dark:border-green-900/40 bg-green-50/60 dark:bg-green-900/10 p-4 text-sm">
                    <p className="font-bold text-[var(--admin-text-primary)] mb-2">No painel da Meta (WhatsApp → Configuration → Webhook):</p>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">Callback URL:</span>
                            <code className="text-xs bg-white dark:bg-black/30 px-2 py-1 rounded border border-[var(--admin-border)] font-mono break-all">
                                {`${typeof window !== 'undefined' ? window.location.origin : 'https://SEU-DOMINIO'}/api/whatsapp-cloud-webhook`}
                            </code>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">Verify Token:</span>
                            <code className="text-xs bg-white dark:bg-black/30 px-2 py-1 rounded border border-[var(--admin-border)] font-mono break-all">
                                {globalConfig.waCloudVerifyToken || '—'}
                            </code>
                        </div>
                        <p className="text-xs text-[var(--admin-text-secondary)] pt-1">Depois clique em <strong>Manage</strong> e assine o campo <strong>messages</strong>. Salve as credenciais aqui antes de verificar o webhook.</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={handleSaveGlobalConfig} disabled={loading} className="bg-gray-800 dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center gap-2 shadow-sm">
                        <Save size={14} /> Salvar WhatsApp (Meta)
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/whatsapp-cloud-send');
                                const data = await res.json();
                                alert(data.configured
                                    ? `✅ Conectado!\nNúmero: ${data.displayNumber || '—'}\nAPI: ${data.apiVersion}\nVerify token: ${data.hasWebhookToken ? 'ok' : 'faltando'}`
                                    : '⚠️ Ainda não configurado no servidor. Salve as credenciais e tente de novo (no deploy da Vercel).');
                            } catch (e: any) {
                                alert('Erro ao checar status: ' + (e?.message || 'desconhecido'));
                            }
                        }}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <CheckCircle2 size={14} /> Testar Conexão
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
