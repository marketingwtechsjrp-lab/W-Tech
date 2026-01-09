import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { QrCode, RefreshCw, Send, Smartphone, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { sendWhatsAppMessage, sendWhatsAppMedia, getGlobalWhatsAppConfig } from '../../../lib/whatsapp';

const UserWhatsAppConnection = () => {
    const { user } = useAuth();
    
    // Global Config State (To know where to connect)
    const [globalConfig, setGlobalConfig] = useState({
        serverUrl: '',
        apiKey: ''
    });

    // User Instance State
    const [userInstance, setUserInstance] = useState({
        instanceName: '',
        status: 'disconnected',
        qrCode: null as string | null
    });

    const [loading, setLoading] = useState(false);
    
    // Test Message State
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Olá! Teste de integração W-Tech.');
    const [testImageUrl, setTestImageUrl] = useState('');

    useEffect(() => {
        fetchGlobalConfig();
        if (user) fetchUserInstance();
    }, [user]);

    const fetchGlobalConfig = async () => {
        const config = await getGlobalWhatsAppConfig();
        if (config) {
            setGlobalConfig({
                serverUrl: config.serverUrl,
                apiKey: config.apiKey
            });
        }
    };

    const fetchUserInstance = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('SITE_UserIntegrations')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setUserInstance(prev => ({ 
                ...prev, 
                instanceName: data.instance_name, 
                status: data.instance_status 
            }));
            // If we have an instance, check its real status
            if (globalConfig.serverUrl && globalConfig.apiKey) {
                checkConnectionState(globalConfig.serverUrl, globalConfig.apiKey, data.instance_name);
            }
        } else {
             // Default instance name suggestion: user_ID (shortened or sanitized name)
             const sanitizedName = user.name?.replace(/\s+/g, '').toLowerCase().substring(0, 10) || 'user';
             setUserInstance(prev => ({ ...prev, instanceName: `${sanitizedName}_${user.id.substring(0,4)}` }));
        }
    };

    const checkConnectionState = async (url: string, key: string, instance: string) => {
        if (!url || !key || !instance) return;
        try {
            const response = await fetch(`${url}/instance/connectionState/${instance}`, {
                method: 'GET',
                headers: { 'apikey': key }
            });
            const data = await response.json();

            let state = 'disconnected';
            if (data?.instance?.state) state = data.instance.state;
            else if (data?.state) state = data.state;
            else if (data?.connectionStatus?.state) state = data.connectionStatus.state;

            // Update local state and DB
            setUserInstance(prev => ({ ...prev, status: state }));
            await supabase.from('SITE_UserIntegrations').upsert({ 
                user_id: user?.id, 
                instance_name: instance,
                instance_status: state,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        } catch (e) {
            console.error(e);
            setUserInstance(prev => ({ ...prev, status: 'error' }));
        }
    };

    const handleDeleteInstance = async () => {
         if (!confirm('ATENÇÃO: Isso irá desconectar e apagar sua instância do servidor. Deseja continuar?')) return;
         if (!globalConfig.serverUrl || !globalConfig.apiKey) return;
         setLoading(true);
         try {
             // 1. Delete on Evolution API
             await fetch(`${globalConfig.serverUrl}/instance/delete/${userInstance.instanceName}`, {
                 method: 'DELETE',
                 headers: { 'apikey': globalConfig.apiKey }
             });
             
             // 2. Update DB - Reset status
             await supabase.from('SITE_UserIntegrations').update({ 
                 instance_status: 'disconnected',
                 instance_token: null
             }).eq('user_id', user?.id);

             setUserInstance(prev => ({ ...prev, status: 'disconnected', qrCode: null }));
             alert('Instância desconectada e removida com sucesso.');
         } catch (e: any) {
             console.error(e);
             alert('Erro ao apagar: ' + e.message);
         } finally {
             setLoading(false);
         }
    };

    const handleCreateUserInstance = async () => {
        if (!globalConfig.serverUrl || !globalConfig.apiKey) return alert('O Administrador ainda não configurou o Servidor WhatsApp.');
        setLoading(true);
        try {
            const response = await fetch(`${globalConfig.serverUrl}/instance/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'apikey': globalConfig.apiKey 
                },
                body: JSON.stringify({
                    instanceName: userInstance.instanceName,
                    token: '',
                    qrcode: true,
                    integration: 'WHATSAPP-BAILEYS'
                })
            });
            const data = await response.json();
            
            if (data.instance || data.hash) {
                alert('Instância criada!');
                // Save to DB
                 await supabase.from('SITE_UserIntegrations').upsert({ 
                    user_id: user?.id, 
                    instance_name: userInstance.instanceName,
                    instance_status: 'connecting'
                }, { onConflict: 'user_id' });
                
                handleConnect(userInstance.instanceName);
            } else {
                 // Check if already exists
                 if (JSON.stringify(data).includes('already exists')) {
                     alert('Instância já existe, tentando conectar...');
                     handleConnect(userInstance.instanceName);
                 } else {
                    alert('Erro ao criar instância: ' + JSON.stringify(data));
                 }
            }
        } catch (e: any) {
            alert('Erro de requisição: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (instanceName: string) => {
        setLoading(true);
        setUserInstance(prev => ({ ...prev, qrCode: null }));
        try {
            const response = await fetch(`${globalConfig.serverUrl}/instance/connect/${instanceName}`, {
                method: 'GET',
                headers: { 'apikey': globalConfig.apiKey }
            });
            const data = await response.json();
            if (data.base64) {
                setUserInstance(prev => ({ ...prev, qrCode: data.base64 }));
            } else if (data.instance?.state === 'open') {
                alert('Já está conectado!');
                checkConnectionState(globalConfig.serverUrl, globalConfig.apiKey, instanceName);
            } else {
                 alert('Não foi possível obter o QR Code.');
            }
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendTestMessage = async () => {
        if (!testPhone) return alert('Digite um número');
        if (!user) return;
        setLoading(true);
        try {
            const { success, error } = await sendWhatsAppMessage(testPhone, testMessage, user.id);
            
            if (success) {
                alert('Mensagem enviada com sucesso!');
            } else {
                alert('Erro ao enviar: ' + JSON.stringify(error));
            }
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendTestImage = async () => {
        if (!testPhone || !testImageUrl) return alert('Digite um número e a URL da imagem');
        if (!user) return;
        setLoading(true);
        try {
            const { success, error } = await sendWhatsAppMedia(testPhone, testImageUrl, testMessage, user.id);
            if (success) alert('Imagem enviada com sucesso!');
            else alert('Erro ao enviar imagem: ' + JSON.stringify(error));
        } catch (e: any) {
            alert('Erro: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setLoading(true);
        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id || 'anon'}_${Date.now()}.${fileExt}`;
            const filePath = `whatsapp_tests/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);

            if (uploadError) {
                alert('Erro no upload: ' + uploadError.message);
                return;
            }

            const { data } = supabase.storage.from('site-assets').getPublicUrl(filePath);
            setTestImageUrl(data.publicUrl);
        } catch (err: any) {
            alert('Erro: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* User Instance Connection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                             <Smartphone className="text-green-500" /> Minha Conexão WhatsApp
                        </h3>
                        <p className="text-sm text-gray-500">Conecte seu WhatsApp pessoal para automação de tarefas.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            userInstance.status === 'open' ? 'bg-green-100 text-green-700' : 
                            userInstance.status === 'connecting' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {userInstance.status === 'open' ? 'Conectado' : userInstance.status}
                        </span>
                        <button 
                            onClick={() => checkConnectionState(globalConfig.serverUrl, globalConfig.apiKey, userInstance.instanceName)} 
                            className="p-2 hover:bg-gray-100 rounded-full" 
                            title="Atualizar Status"
                        >
                            <RefreshCw size={16} />
                        </button>
                        {(userInstance.status === 'open' || userInstance.status === 'connecting') && (
                            <button 
                                onClick={handleDeleteInstance} 
                                className="p-2 hover:bg-red-50 text-red-500 rounded-full" 
                                title="Desconectar e Apagar Instância"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome da Minha Instância (ID)</label>
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 border border-gray-300 rounded p-2 text-sm bg-gray-50" 
                            value={userInstance.instanceName}
                            // onChange={e => setUserInstance({...userInstance, instanceName: e.target.value})} // Prevent easy accidental change of instance name
                            readOnly
                        />
                         <button onClick={handleCreateUserInstance} disabled={loading || !globalConfig.serverUrl || userInstance.status === 'open'} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300">
                            <QrCode size={16} /> {userInstance.status === 'open' ? 'Conectado' : 'Conectar / Gerar QR'}
                        </button>
                    </div>
                    {!globalConfig.serverUrl && <p className="text-xs text-red-500 mt-1">Servidor não configurado pelo Admin.</p>}
                </div>

                {userInstance.qrCode && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg flex flex-col items-center animate-in fade-in zoom-in border border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-2">Escaneie o QR Code</h4>
                        <img src={userInstance.qrCode} alt="QR Code WhatsApp" className="w-64 h-64 border-4 border-white shadow-lg rounded-lg" />
                        <p className="text-xs text-gray-500 mt-2">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                    </div>
                )}
            </div>

            {/* Test Area */}
            {userInstance.status === 'open' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                            <Send className="text-blue-500" /> Teste de Disparo
                    </h3>
                    <div className="flex gap-4 items-end">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Número (com DDD)</label>
                            <input 
                                className="w-full border border-gray-300 rounded p-2 text-sm" 
                                placeholder="Ex: 11999999999"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mensagem / Legenda</label>
                            <input 
                                className="w-full border border-gray-300 rounded p-2 text-sm" 
                                placeholder="Sua mensagem de teste..."
                                value={testMessage}
                                onChange={e => setTestMessage(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="flex gap-4 items-end mt-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL da Imagem (Para teste)</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <ImageIcon size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        className="w-full border border-gray-300 rounded pl-9 pr-2 py-2 text-sm" 
                                        placeholder="https://exemplo.com/imagem.jpg"
                                        value={testImageUrl}
                                        onChange={e => setTestImageUrl(e.target.value)}
                                    />
                                </div>
                                <label className="flex items-center justify-center bg-gray-100 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-200 transition-colors" title="Fazer Upload">
                                    <Upload size={14} className="text-gray-600" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={loading} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSendTestMessage} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 h-9 flex items-center gap-2 text-xs">
                                <Send size={14} /> Enviar Texto
                            </button>
                            <button onClick={handleSendTestImage} disabled={loading || !testImageUrl} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 h-9 flex items-center gap-2 text-xs">
                                <ImageIcon size={14} /> Enviar Imagem
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserWhatsAppConnection;
