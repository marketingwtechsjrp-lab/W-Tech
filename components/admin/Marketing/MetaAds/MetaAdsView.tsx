import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Megaphone, 
    MessageSquare, 
    RefreshCcw, 
    Settings, 
    AlertCircle,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';
import MetaDashboard from './MetaDashboard.tsx';
import MetaCampaigns from './MetaCampaigns.tsx';
import MetaAIChat from './MetaAIChat.tsx';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

const MetaAdsView = () => {
    const [accounts, setAccounts] = useState<any>({});
    const [activeAccount, setActiveAccount] = useState<string | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'campaigns' | 'chat'>('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Config Modal State
    const [showConfig, setShowConfig] = useState(false);
    const [configFormData, setConfigFormData] = useState({
        slug: '',
        name: '',
        access_token: '',
        ad_account_id: '',
        niche: 'custom'
    });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/accounts`);
            if (!response.ok) throw new Error('Falha ao carregar contas do Meta');
            const data = await response.json();
            setAccounts(data);
            
            const slugs = Object.keys(data);
            if (slugs.length > 0 && !activeAccount) {
                handleSelectAccount(slugs[0]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAccount = async (slug: string) => {
        try {
            const response = await fetch(`${API_BASE}/auth/${slug}`, { method: 'POST' });
            if (!response.ok) throw new Error('Falha ao autenticar conta');
            setActiveAccount(slug);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSaveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing ? `${API_BASE}/accounts/${configFormData.slug}` : `${API_BASE}/accounts`;
            
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configFormData)
            });

            if (!response.ok) throw new Error('Erro ao salvar conta');
            
            setShowConfig(false);
            fetchAccounts();
            alert('Conta salva com sucesso!');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openEditModal = () => {
        if (!activeAccount) return;
        const acc = accounts[activeAccount];
        setConfigFormData({
            slug: activeAccount,
            name: acc.name,
            access_token: '', // Por segurança, não puxamos o token antigo
            ad_account_id: acc.ad_account_id,
            niche: acc.niche || 'custom'
        });
        setIsEditing(true);
        setShowConfig(true);
    };

    const openAddModal = () => {
        setConfigFormData({
            slug: '',
            name: '',
            access_token: '',
            ad_account_id: '',
            niche: 'custom'
        });
        setIsEditing(false);
        setShowConfig(true);
    };

    if (loading && !Object.keys(accounts).length) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-4">
                <RefreshCcw className="animate-spin text-wtech-gold" size={32} />
                <p className="text-gray-500 font-medium">Conectando ao Gerenciador Meta...</p>
            </div>
        );
    }

    if (error && !Object.keys(accounts).length) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] p-8 text-center bg-white dark:bg-[#1A1A1A] rounded-3xl m-6">
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-full text-red-600 mb-4">
                    <AlertCircle size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Erro de Conexão</h3>
                <p className="text-gray-500 max-w-md mb-6">
                    O servidor de Meta Ads não está respondendo na porta 5000 ou não há contas configuradas.
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={fetchAccounts}
                        className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-80 transition-all"
                    >
                        <RefreshCcw size={18} /> Tentar Novamente
                    </button>
                    <button 
                        onClick={openAddModal}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
                    >
                         Configurar Primeira Conta
                    </button>
                </div>
            </div>
        );
    }

    const currentAccountData = activeAccount ? accounts[activeAccount] : null;

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-transparent relative">
            {/* Meta Header / Account Selector */}
            <div className="bg-white dark:bg-[#1A1A1A] border-b border-gray-100 dark:border-gray-800 p-4 sticky top-0 z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                            <Megaphone size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Meta Traffic AI
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800/50">
                                        CONECTADO
                                    </span>
                                    <button 
                                        onClick={openEditModal}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                        title="Editar Token/ID"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <select 
                                    value={activeAccount || ''} 
                                    onChange={(e) => handleSelectAccount(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-gray-500 dark:text-gray-400 focus:ring-0 p-0 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    {Object.entries(accounts).map(([slug, acc]: [string, any]) => (
                                        <option key={slug} value={slug} className="dark:bg-[#1A1A1A]">
                                            {acc.name} ({acc.niche_name})
                                        </option>
                                    ))}
                                </select>
                                <ChevronRight size={14} className="text-gray-300" />
                                <span className="text-xs text-gray-400 font-medium">ID: {currentAccountData?.ad_account_id}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-xl flex-1 md:flex-none">
                            <button
                                onClick={() => setActiveSubTab('dashboard')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeSubTab === 'dashboard' 
                                    ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <LayoutDashboard size={14} /> Dashboard
                            </button>
                            <button
                                onClick={() => setActiveSubTab('campaigns')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeSubTab === 'campaigns' 
                                    ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <Megaphone size={14} /> Campanhas
                            </button>
                            <button
                                onClick={() => setActiveSubTab('chat')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${
                                    activeSubTab === 'chat' 
                                    ? 'bg-white dark:bg-[#222] text-black dark:text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <MessageSquare size={14} /> IA Gestor
                            </button>
                        </div>
                        <button 
                            onClick={openAddModal}
                            className="hidden md:flex p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-80 transition-all"
                            title="Adicionar Nova Conta"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeSubTab === 'dashboard' && <MetaDashboard slug={activeAccount} />}
                {activeSubTab === 'campaigns' && <MetaCampaigns slug={activeAccount} />}
                {activeSubTab === 'chat' && <MetaAIChat slug={activeAccount} />}
            </div>

            {/* Config Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {isEditing ? 'Editar Conta' : 'Nova Conta Meta'}
                                </h3>
                                <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                    <AlertCircle size={24} className="rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveAccount} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Identificador (Slug)</label>
                                    <input 
                                        type="text"
                                        disabled={isEditing}
                                        value={configFormData.slug}
                                        onChange={(e) => setConfigFormData({...configFormData, slug: e.target.value})}
                                        placeholder="ex: wtech"
                                        className="w-full bg-gray-50 dark:bg-[#111] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome da Conta</label>
                                    <input 
                                        type="text"
                                        value={configFormData.name}
                                        onChange={(e) => setConfigFormData({...configFormData, name: e.target.value})}
                                        placeholder="ex: W-Tech Principal"
                                        className="w-full bg-gray-50 dark:bg-[#111] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Meta Access Token</label>
                                    <input 
                                        type="password"
                                        value={configFormData.access_token}
                                        onChange={(e) => setConfigFormData({...configFormData, access_token: e.target.value})}
                                        placeholder="EAA..."
                                        className="w-full bg-gray-50 dark:bg-[#111] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 transition-all"
                                        required={!isEditing}
                                    />
                                    {isEditing && <p className="text-[10px] text-gray-400 mt-1">* Deixe em branco para manter o token atual.</p>}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">ID da Conta de Anúncios</label>
                                    <input 
                                        type="text"
                                        value={configFormData.ad_account_id}
                                        onChange={(e) => setConfigFormData({...configFormData, ad_account_id: e.target.value})}
                                        placeholder="ex: 123456789 (sem act_)"
                                        className="w-full bg-gray-50 dark:bg-[#111] border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold focus:border-blue-500 transition-all"
                                        required
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 mt-4 capitalize"
                                >
                                    {isEditing ? 'Salvar Alterações' : 'Conectar Conta Meta'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetaAdsView;
