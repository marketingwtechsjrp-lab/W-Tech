import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { QrCode, RefreshCw, Send, Smartphone, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { sendWhatsAppMessage, sendWhatsAppMedia } from '../../../lib/whatsapp';
import {
    EvolutionStaffError,
    evolutionConnect,
    evolutionCreate,
    evolutionDelete,
    evolutionInstanceInfo,
    evolutionStatus,
} from '../../../lib/evolutionStaff';

const INSTANCE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function defaultSelfInstance(user: { id: string; name?: string | null }): string {
    const name = String(user.name || 'usuario')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'usuario';
    const suffix = String(user.id).replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toLowerCase() || 'self';
    return `wtech-${name}-${suffix}`.slice(0, 64);
}

/** O backend inclui a instância resolvida nas respostas do escopo self. */
function responseInstance(result: object, fallback: string): string {
    const candidate = (result as { instance?: unknown }).instance;
    return typeof candidate === 'string' && INSTANCE_RE.test(candidate) ? candidate : fallback;
}

function selfEvolutionError(error: unknown): string {
    if (!(error instanceof EvolutionStaffError)) return 'Não foi possível concluir a operação.';
    if (error.code === 'evolution_not_configured') return 'O Administrador ainda não configurou o Servidor WhatsApp.';
    if (error.code === 'network_error') return 'Não foi possível acessar o servidor do sistema.';
    if (error.code === 'evolution_timeout') return 'O servidor WhatsApp demorou demais para responder.';
    if (error.code === 'self_instance_not_allowed') return 'A instância vinculada ao seu usuário não pôde ser confirmada.';
    if (error.status === 401 || error.status === 403) return 'Sua sessão não permite gerenciar esta conexão.';
    return 'O servidor WhatsApp recusou a operação.';
}

const UserWhatsAppConnection = () => {
    const { user } = useAuth();

    // User Instance State
    const [userInstance, setUserInstance] = useState({
        instanceName: '',
        status: 'disconnected',
        qrCode: null as string | null
    });

    const [loading, setLoading] = useState(false);
    const [evolutionAvailable, setEvolutionAvailable] = useState<boolean | null>(null);
    
    // Test Message State
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Olá! Teste de integração W-Tech.');
    const [testImageUrl, setTestImageUrl] = useState('');

    useEffect(() => {
        if (!user) {
            setEvolutionAvailable(null);
            setUserInstance({ instanceName: '', status: 'disconnected', qrCode: null });
            return;
        }

        let cancelled = false;
        const fallbackInstance = defaultSelfInstance(user);
        setUserInstance(prev => ({ ...prev, instanceName: fallbackInstance }));

        void (async () => {
            try {
                const result = await evolutionInstanceInfo('self');
                if (cancelled) return;
                setEvolutionAvailable(true);
                setUserInstance({
                    instanceName: responseInstance(result, fallbackInstance),
                    status: result.state,
                    qrCode: null,
                });
            } catch (error) {
                if (cancelled) return;
                setEvolutionAvailable(
                    error instanceof EvolutionStaffError && error.code === 'evolution_not_configured'
                        ? false
                        : true,
                );
                setUserInstance(prev => ({ ...prev, status: 'disconnected' }));
            }
        })();

        return () => { cancelled = true; };
    }, [user?.id, user?.name]);

    const checkConnectionState = async () => {
        if (!user) return;
        try {
            const result = await evolutionStatus('self');
            setEvolutionAvailable(true);
            setUserInstance(prev => ({
                ...prev,
                instanceName: responseInstance(result, prev.instanceName || defaultSelfInstance(user)),
                status: result.state,
            }));
        } catch (error) {
            if (error instanceof EvolutionStaffError && error.code === 'evolution_not_configured') {
                setEvolutionAvailable(false);
            }
            setUserInstance(prev => ({ ...prev, status: 'error' }));
        }
    };

    const handleDeleteInstance = async () => {
         if (!confirm('ATENÇÃO: Isso irá desconectar e apagar sua instância do servidor. Deseja continuar?')) return;
         if (!user) return;
         setLoading(true);
         try {
             const result = await evolutionDelete('self');
             setEvolutionAvailable(true);
             setUserInstance(prev => ({
                 instanceName: responseInstance(result, prev.instanceName || defaultSelfInstance(user)),
                 status: result.state,
                 qrCode: null,
             }));
             alert('Instância desconectada e removida com sucesso.');
         } catch (error) {
             alert('Erro ao apagar: ' + selfEvolutionError(error));
         } finally {
             setLoading(false);
         }
    };

    const handleCreateUserInstance = async () => {
        if (!user) return;
        if (evolutionAvailable === false) return alert('O Administrador ainda não configurou o Servidor WhatsApp.');
        setLoading(true);
        try {
            const created = await evolutionCreate('self');
            setEvolutionAvailable(true);
            const instanceName = responseInstance(created, userInstance.instanceName || defaultSelfInstance(user));
            if (created.qr) {
                setUserInstance({ instanceName, status: 'connecting', qrCode: created.qr });
                alert('Instância criada!');
                return;
            }
            if (created.state === 'open') {
                setUserInstance({ instanceName, status: 'open', qrCode: null });
                alert('Já está conectado!');
                return;
            }

            const connected = await evolutionConnect('self');
            const connectedInstance = responseInstance(connected, instanceName);
            if (connected.qr) {
                setUserInstance({ instanceName: connectedInstance, status: 'connecting', qrCode: connected.qr });
            } else if (connected.state === 'open') {
                setUserInstance({ instanceName: connectedInstance, status: 'open', qrCode: null });
                alert('Já está conectado!');
            } else {
                alert('Não foi possível obter o QR Code.');
            }
        } catch (error) {
            if (error instanceof EvolutionStaffError && error.code === 'evolution_not_configured') {
                setEvolutionAvailable(false);
            }
            alert('Erro de requisição: ' + selfEvolutionError(error));
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
                            onClick={() => { void checkConnectionState(); }}
                            disabled={loading || evolutionAvailable !== true}
                            className="p-2 hover:bg-gray-100 rounded-full" 
                            title="Atualizar Status"
                        >
                            <RefreshCw size={16} />
                        </button>
                        {userInstance.instanceName && (
                            <button 
                                onClick={handleDeleteInstance} 
                                disabled={loading || evolutionAvailable !== true}
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
                            readOnly
                            title="Identificador definido automaticamente para seu usuário"
                        />
                        <button onClick={handleCreateUserInstance} disabled={loading || evolutionAvailable !== true || userInstance.status === 'open'} className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300">
                            <QrCode size={16} /> {userInstance.status === 'open' ? 'Conectado' : 'Conectar / Gerar QR'}
                        </button>
                        <button 
                            onClick={handleDeleteInstance}
                            disabled={loading || evolutionAvailable !== true}
                            className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-red-700 disabled:opacity-50"
                            title="Excluir Instância e Tentar Novamente"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                    {evolutionAvailable === false && <p className="text-xs text-red-500 mt-1">Servidor não configurado pelo Admin.</p>}
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
