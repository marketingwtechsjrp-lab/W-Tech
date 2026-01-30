import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const GoogleCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            exchangeCodeForToken(code);
        } else {
            setStatus('error');
            setErrorMsg('Código de autorização não encontrado.');
        }
    }, []);

    const exchangeCodeForToken = async (code: string) => {
        try {
            // 1. Get Credentials from DB
            const { data: configs } = await supabase.from('SITE_Config').select('*');
            const configMap = configs?.reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg.value }), {}) || {};

            const clientId = configMap['google_oauth_client_id'];
            const clientSecret = configMap['google_oauth_client_secret'];

            if (!clientId || !clientSecret) {
                throw new Error('Configuração Client ID ou Secret ausente no banco de dados.');
            }

            // 2. Exchange code for tokens
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: clientId,
                    client_secret: clientSecret,
                    redirect_uri: `https://${window.location.host}/auth/google/callback`,
                    grant_type: 'authorization_code',
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error_description || data.error);
            }

            // 3. Store Tokens
            // We store the refresh_token to allow fetching data in the background
            if (data.refresh_token) {
                await supabase.from('SITE_Config').upsert({ 
                    key: 'google_refresh_token', 
                    value: data.refresh_token 
                }, { onConflict: 'key' });
            }

            // Also store access_token temporarily (optional, we usually refresh it)
            if (data.access_token) {
                 await supabase.from('SITE_Config').upsert({ 
                    key: 'google_access_token', 
                    value: data.access_token 
                }, { onConflict: 'key' });
            }

            setStatus('success');
            setTimeout(() => navigate('/admin'), 2000);

        } catch (err: any) {
            console.error("OAuth Error:", err);
            setStatus('error');
            setErrorMsg(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#111]">
            <div className="max-w-md w-full p-8 text-center bg-gray-50 dark:bg-[#1A1A1A] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="mx-auto text-wtech-gold animate-spin" size={48} />
                        <h2 className="text-xl font-bold dark:text-white">Autenticando com o Google...</h2>
                        <p className="text-sm text-gray-500">Estamos trocando as chaves de segurança.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4 animate-bounce">
                        <CheckCircle className="mx-auto text-green-500" size={48} />
                        <h2 className="text-xl font-bold dark:text-white">Conectado com Sucesso!</h2>
                        <p className="text-sm text-gray-500">Redirecionando de volta ao painel...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <AlertCircle className="mx-auto text-red-500" size={48} />
                        <h2 className="text-xl font-bold dark:text-white">Erro na Autenticação</h2>
                        <p className="text-sm text-red-400 font-mono bg-red-50 dark:bg-red-900/10 p-2 rounded">{errorMsg}</p>
                        <button 
                            onClick={() => navigate('/admin')}
                            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold"
                        >
                            Voltar ao Admin
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GoogleCallback;
