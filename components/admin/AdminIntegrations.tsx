import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Save, Server, AlertTriangle, Send, Image as ImageIcon, Smartphone, Banknote, CreditCard, BarChart3, Globe } from 'lucide-react';
import { getGlobalWhatsAppConfig, sendWhatsAppMessage, sendWhatsAppMedia } from '../../lib/whatsapp';
import { getAsaasConfig } from '../../lib/asaas';
import { getStripeConfig } from '../../lib/stripe';

const AdminIntegrations = () => {
    const { user } = useAuth();

    // Global Config State (Admin Only)
    const [globalConfig, setGlobalConfig] = useState({
        serverUrl: '',
        apiKey: '',
        asaasKey: '',
        stripeKey: '',
        googleClientId: '',
        googleClientSecret: '',
        ga4PropertyId: ''
    });

    const [loading, setLoading] = useState(false);

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
                googleClientId: configMap['google_oauth_client_id'] || '',
                googleClientSecret: configMap['google_oauth_client_secret'] || '',
                ga4PropertyId: configMap['ga4_property_id'] || ''
            });
        }
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
                { key: 'google_oauth_client_id', value: globalConfig.googleClientId },
                { key: 'google_oauth_client_secret', value: globalConfig.googleClientSecret },
                { key: 'ga4_property_id', value: globalConfig.ga4PropertyId }
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
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-[#1A1A1A] rounded-xl border border-gray-200 dark:border-gray-800">
                <AlertTriangle className="mx-auto mb-2 text-yellow-500" size={32} />
                <h3 className="font-bold text-gray-900 dark:text-white">Acesso Restrito</h3>
                <p className="dark:text-gray-400">Apenas administradores podem configurar o Servidor da API.</p>
                <p className="text-sm mt-2 dark:text-gray-500">Para conectar seu WhatsApp, vá em <strong>Meu Perfil</strong>.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. Global Server Config (Admin Only) */}
            <div className="bg-gray-50 dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Server className="text-gray-600 dark:text-gray-400" />
                    <h3 className="font-bold text-gray-800 dark:text-white">Configuração do Servidor (Global)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Server URL</label>
                        <input
                            className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 text-sm bg-white dark:bg-[#222] dark:text-white dark:focus:border-wtech-gold/50 transition-colors outline-none"
                            value={globalConfig.serverUrl}
                            onChange={e => setGlobalConfig({ ...globalConfig, serverUrl: e.target.value })}
                            placeholder="https://api.seudominio.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Global API Key</label>
                        <input
                            className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 text-sm bg-white dark:bg-[#222] dark:text-white font-mono dark:focus:border-wtech-gold/50 transition-colors outline-none"
                            type="password"
                            value={globalConfig.apiKey}
                            onChange={e => setGlobalConfig({ ...globalConfig, apiKey: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Asaas Payment Config */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <Banknote className="text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-gray-800 dark:text-white">Integração Asaas (Nacional)</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    API Key do Asaas para gerar links de pagamento (Boleto/Pix/Cartão) automaticamente.
                </p>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Asaas API Key</label>
                    <input
                        className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 text-sm bg-white dark:bg-[#222] dark:text-white font-mono dark:focus:border-blue-500/50 transition-colors outline-none"
                        type="password"
                        value={globalConfig.asaasKey}
                        onChange={e => setGlobalConfig({ ...globalConfig, asaasKey: e.target.value })}
                        placeholder="$aact_..."
                    />
                </div>
                <button onClick={handleSaveGlobalConfig} disabled={loading} className="mt-4 bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-sm">
                    <Save size={14} /> Salvar Asaas
                </button>
            </div>

            {/* 3. Stripe Payment Config */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="text-purple-600 dark:text-purple-400" />
                    <h3 className="font-bold text-gray-800 dark:text-white">Integração Stripe (Internacional)</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Secret Key do Stripe para vendas internacionais (USD, EUR, etc).
                </p>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Stripe Secret Key (sk_live_...)</label>
                    <input
                        className="w-full border border-gray-300 dark:border-gray-700 rounded p-2 text-sm bg-white dark:bg-[#222] dark:text-white font-mono dark:focus:border-purple-500/50 transition-colors outline-none"
                        type="password"
                        value={globalConfig.stripeKey}
                        onChange={e => setGlobalConfig({ ...globalConfig, stripeKey: e.target.value })}
                        placeholder="sk_live_..."
                    />
                </div>
                <button onClick={handleSaveGlobalConfig} disabled={loading} className="mt-4 bg-gray-800 dark:bg-white text-white dark:text-black px-4 py-2 rounded text-sm font-bold hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors flex items-center gap-2 shadow-sm">
                    <Save size={14} /> Salvar Stripe
                </button>
            </div>

            {/* 4. Google Analytics / Search Console Config */}
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="text-red-500 dark:text-red-400" />
                    <h3 className="font-bold text-gray-800 dark:text-white">Conexão Google Cloud (Marketing)</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                    Configure as credenciais OAuth para importar dados reais do Google Analytics 4 e Search Console.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Client ID (OAuth)</label>
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm bg-gray-50/50 dark:bg-[#222] dark:text-white focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono text-[10px]"
                            value={globalConfig.googleClientId}
                            onChange={e => setGlobalConfig({ ...globalConfig, googleClientId: e.target.value })}
                            placeholder="...apps.googleusercontent.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">Client Secret</label>
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm bg-gray-50/50 dark:bg-[#222] dark:text-white focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono text-[10px]"
                            type="password"
                            value={globalConfig.googleClientSecret}
                            onChange={e => setGlobalConfig({ ...globalConfig, googleClientSecret: e.target.value })}
                            placeholder="GOCSPX-..."
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-gray-400 uppercase mb-1 tracking-widest">GA4 Property ID</label>
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm bg-gray-50/50 dark:bg-[#222] dark:text-white focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all font-mono"
                            value={globalConfig.ga4PropertyId}
                            onChange={e => setGlobalConfig({ ...globalConfig, ga4PropertyId: e.target.value })}
                            placeholder="123456789"
                        />
                        <p className="text-[10px] text-gray-400 mt-2 italic">Você encontra isso nas Configurações da Propriedade no GA4.</p>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button onClick={handleSaveGlobalConfig} disabled={loading} className="bg-wtech-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95">
                        <Save size={14} /> Salvar Credenciais Google
                    </button>
                    <button 
                        onClick={handleGoogleAuth} 
                        disabled={loading || !globalConfig.googleClientId}
                        className="border-2 border-wtech-black dark:border-white text-wtech-black dark:text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-wtech-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95"
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
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Send className="text-blue-500 dark:text-blue-400" />
                    <h3 className="font-bold text-gray-800 dark:text-white">Testar Disparo & Integração</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Número de Destino</label>
                        <div className="relative">
                            <Smartphone size={14} className="absolute left-3 top-3 text-gray-300" />
                            <input
                                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm font-bold bg-gray-50/30 dark:bg-[#222] dark:text-white focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all"
                                placeholder="DD9XXXXXXXX"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Conteúdo da Mensagem</label>
                        <input
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-gray-50/30 dark:bg-[#222] dark:text-white focus:bg-white dark:focus:bg-[#1A1A1A] outline-none transition-all"
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
                                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-gray-50/30 dark:bg-[#222] dark:text-white focus:bg-white dark:focus:bg-[#1A1A1A] outline-none font-mono text-[10px] transition-all"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                    value={testImageUrl}
                                    onChange={e => setTestImageUrl(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-50 dark:border-gray-800">
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
