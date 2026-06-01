import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { sendWhatsAppMessage } from '../../../lib/whatsapp';
import { 
    Upload, MessageSquare, CheckCircle2, AlertTriangle, Play, Search, 
    FileText, User, CreditCard, Sparkles, RefreshCw, Send, Smartphone, Check, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RecoveryLead {
    id: string;
    saleId: string;
    status: 'refused' | 'waiting_payment';
    product: string;
    name: string;
    email: string;
    phone: string;
    paymentMethod: string;
    declineReason?: string;
    price: string;
    createdAt: string;
    messageText: string;
    sendStatus: 'pending' | 'sending' | 'success' | 'error';
    sendError?: string;
}

const SalesRecoveryView = () => {
    // Lead states
    const [leads, setLeads] = useState<RecoveryLead[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'refused' | 'waiting_payment'>('all');
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    
    // Configurations
    const [instances, setInstances] = useState<string[]>([]);
    const [selectedInstance, setSelectedInstance] = useState('wtech-suporte-curso');
    const [customInstance, setCustomInstance] = useState('');
    const [sendDelay, setSendDelay] = useState(5); // default 5 seconds delay
    
    // Dispatch stats
    const [isSending, setIsSending] = useState(false);
    const [currentSendingIndex, setCurrentSendingIndex] = useState(-1);
    
    // Message templates
    const [refusedTemplate, setRefusedTemplate] = useState(
        "Oi *{{name}}*, tudo bem? Aqui é do suporte do Curso W-Tech. 🛠️\n\nPercebemos que sua inscrição na *{{product}}* não pôde ser concluída porque o pagamento foi recusado por: *{{reason}}*.\n\nIsso é super comum! Geralmente o próprio banco bloqueia compras na internet por segurança.\n\n⚠️ *Atenção:* O preço promocional está nas últimas vagas! Como restam *apenas 7 vagas promocionais* antes de voltar ao valor original, separei o seu link direto e seguro para tentar novamente (com outro cartão ou Pix):\n\n🔗 *Acesse para garantir a promoção:* https://pay.kiwify.com.br/19v4nIa\n\nSe precisar de qualquer ajuda ou preferir outra forma, me avise por aqui!"
    );
    
    const [pendingTemplate, setPendingTemplate] = useState(
        "Olá *{{name}}*! Tudo bem? Aqui é o suporte da W-Tech. ⚡\n\nVi que você gerou o Pix para a sua inscrição no *{{product}}*, mas a confirmação ainda não constou em nosso sistema.\n\n⚠️ *Importante:* Estamos nas últimas *7 vagas promocionais* deste lote. Assim que forem preenchidas, o preço retornará ao valor original.\n\nCaso o código Pix tenha expirado ou você queira garantir a vaga parcelando no cartão, você pode usar o link direto abaixo:\n\n🔗 *Garantir vaga promocional agora:* https://pay.kiwify.com.br/19v4nIa\n\nSe você já realizou o pagamento, basta me enviar o comprovante por aqui para liberarmos seu acesso imediatamente!"
    );

    // Fetch instances from database to populate dropdown
    useEffect(() => {
        const fetchWhatsAppInstances = async () => {
            try {
                const { data: globalInstance } = await supabase
                    .from('SITE_Config')
                    .select('value')
                    .eq('key', 'evolution_instance_name')
                    .single();
                
                const { data: userInts } = await supabase
                    .from('SITE_UserIntegrations')
                    .select('instance_name')
                    .not('instance_name', 'is', null);

                const foundInstances = new Set<string>();
                if (globalInstance?.value) {
                    foundInstances.add(globalInstance.value.trim());
                }
                if (userInts) {
                    userInts.forEach((ui: any) => {
                        if (ui.instance_name) foundInstances.add(ui.instance_name.trim());
                    });
                }
                
                // Add Support instance if not present
                foundInstances.add("suporte técnico");
                
                const list = Array.from(foundInstances);
                setInstances(list);
                if (list.length > 0) {
                    setSelectedInstance(list[0]);
                }
            } catch (err) {
                console.error("Error loading instances", err);
            }
        };
        fetchWhatsAppInstances();
    }, []);

    // Re-generate message text when templates change
    const generateMessage = (lead: Omit<RecoveryLead, 'messageText' | 'sendStatus'>): string => {
        const template = lead.status === 'refused' ? refusedTemplate : pendingTemplate;
        
        let reasonTranslated = 'Transação negada';
        if (lead.declineReason === 'antifraud') reasonTranslated = 'Bloqueio de segurança / Antifraude do cartão';
        else if (lead.declineReason === 'insufficient_funds') reasonTranslated = 'Saldo/Limite insuficiente';
        else if (lead.declineReason === 'expired_card') reasonTranslated = 'Cartão expirado';
        else if (lead.declineReason === 'blocked_card') reasonTranslated = 'Cartão bloqueado';
        else if (lead.declineReason) reasonTranslated = lead.declineReason;

        return template
            .replace(/\{\{name\}\}/g, lead.name)
            .replace(/\{\{product\}\}/g, lead.product)
            .replace(/\{\{payment_method\}\}/g, lead.paymentMethod.toUpperCase())
            .replace(/\{\{reason\}\}/g, reasonTranslated)
            .replace(/\{\{price\}\}/g, lead.price);
    };

    // Recalculate all messages
    const updateAllMessages = () => {
        setLeads(prev => prev.map(lead => ({
            ...lead,
            messageText: generateMessage(lead)
        })));
    };

    useEffect(() => {
        updateAllMessages();
    }, [refusedTemplate, pendingTemplate]);

    // Handle spreadsheet upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'refused' | 'waiting_payment') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rawData = XLSX.utils.sheet_to_json<any>(worksheet);

                if (rawData.length === 0) {
                    alert("A planilha está vazia.");
                    return;
                }

                // Map row columns to recovery leads
                const mappedLeads: RecoveryLead[] = rawData.map((row: any, idx: number) => {
                    const phoneRaw = row['Celular'] || row['Telefone'] || '';
                    // Clean up and standardize the phone format
                    let phone = phoneRaw.toString().replace(/\D/g, '');
                    if (phone.startsWith('55') && phone.length > 11) {
                        // is already standard format
                    } else {
                        // format to standard
                        if (phone.length <= 11) phone = '55' + phone;
                    }

                    const tempLead: Omit<RecoveryLead, 'messageText' | 'sendStatus'> = {
                        id: `${type}-${Date.now()}-${idx}`,
                        saleId: row['ID da venda'] || row['ID'] || `REC-${idx}`,
                        status: type,
                        product: row['Produto'] || 'Curso Regulagem de Suspensão',
                        name: row['Cliente'] || row['Nome'] || 'Cliente',
                        email: row['Email'] || '',
                        phone: phone,
                        paymentMethod: row['Pagamento'] || row['Meio de pagamento'] || (type === 'waiting_payment' ? 'pix' : 'cartao'),
                        declineReason: row['Motivo da recusa'] || row['Status do motivo'] || undefined,
                        price: row['Total com acréscimo'] || row['Valor'] || row['Preço base do produto'] || '0.00',
                        createdAt: row['Data de Criação'] || row['Data'] || new Date().toLocaleString(),
                    };

                    return {
                        ...tempLead,
                        messageText: generateMessage(tempLead),
                        sendStatus: 'pending'
                    };
                });

                // Merge or replace
                setLeads(prev => {
                    // Filter out duplicates based on saleId
                    const existingIds = new Set(prev.map(l => l.saleId));
                    const newLeads = mappedLeads.filter(l => !existingIds.has(l.saleId));
                    return [...prev, ...newLeads];
                });
                
                // Select all newly imported leads by default
                setSelectedLeads(prev => [
                    ...prev,
                    ...mappedLeads.map(l => l.id)
                ]);

                // Reset file input
                e.target.value = '';
            } catch (err: any) {
                console.error("Error reading spreadsheet", err);
                alert("Erro ao processar planilha: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Search and filters
    const filteredLeads = leads.filter(lead => {
        const matchesSearch = 
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm) ||
            lead.product.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = 
            statusFilter === 'all' || 
            lead.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const toggleSelectLead = (id: string) => {
        setSelectedLeads(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const currentFilteredIds = filteredLeads.map(l => l.id);
        const allSelected = currentFilteredIds.every(id => selectedLeads.includes(id));
        
        if (allSelected) {
            setSelectedLeads(prev => prev.filter(id => !currentFilteredIds.includes(id)));
        } else {
            setSelectedLeads(prev => {
                const union = new Set([...prev, ...currentFilteredIds]);
                return Array.from(union);
            });
        }
    };

    const handleClearLeads = () => {
        if (confirm("Remover todos os leads importados da lista?")) {
            setLeads([]);
            setSelectedLeads([]);
        }
    };

    // Bulk send automation loop
    const handleStartRecovery = async () => {
        const leadsToSend = leads.filter(l => selectedLeads.includes(l.id) && l.sendStatus !== 'success');
        if (leadsToSend.length === 0) {
            alert("Nenhum lead pendente de envio foi selecionado.");
            return;
        }

        const instance = customInstance.trim() || selectedInstance;
        if (!instance) {
            alert("Por favor, selecione ou digite o nome da instância ativa.");
            return;
        }

        if (!confirm(`Deseja iniciar o disparo de ${leadsToSend.length} mensagens usando a instância "${instance}"?`)) {
            return;
        }

        setIsSending(true);

        // Process each lead sequentially with delay
        for (let i = 0; i < leads.length; i++) {
            const lead = leads[i];
            
            // Only send if it's selected and not already sent successfully
            if (!selectedLeads.includes(lead.id) || lead.sendStatus === 'success') {
                continue;
            }

            setCurrentSendingIndex(i);

            // Update status to 'sending'
            setLeads(prev => prev.map((l, idx) => idx === i ? { ...l, sendStatus: 'sending' } : l));

            try {
                // Trigger the WhatsApp message via client function
                const response = await sendWhatsAppMessage(lead.phone, lead.messageText, instance);
                
                if (response.success) {
                    setLeads(prev => prev.map((l, idx) => idx === i ? { ...l, sendStatus: 'success' } : l));
                } else {
                    const errMsg = typeof response.error === 'object' ? JSON.stringify(response.error) : response.error || 'Erro desconhecido';
                    setLeads(prev => prev.map((l, idx) => idx === i ? { ...l, sendStatus: 'error', sendError: errMsg } : l));
                }
            } catch (err: any) {
                setLeads(prev => prev.map((l, idx) => idx === i ? { ...l, sendStatus: 'error', sendError: err.message } : l));
            }

            // Wait for delay before next item (if there are more to send)
            const isLast = i === leads.length - 1 || !leads.slice(i + 1).some(l => selectedLeads.includes(l.id) && l.sendStatus !== 'success');
            if (!isLast) {
                await new Promise(resolve => setTimeout(resolve, sendDelay * 1000));
            }
        }

        setIsSending(false);
        setCurrentSendingIndex(-1);
        alert("Automação de recuperação concluída!");
    };

    // Stats calculations
    const stats = {
        total: leads.length,
        selected: selectedLeads.length,
        success: leads.filter(l => l.sendStatus === 'success').length,
        error: leads.filter(l => l.sendStatus === 'error').length,
        pending: leads.filter(l => l.sendStatus === 'pending').length,
        refusedCount: leads.filter(l => l.status === 'refused').length,
        pendingPaymentCount: leads.filter(l => l.status === 'waiting_payment').length,
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-white bg-black min-h-screen">
            {/* Header Title with W-Tech Branding */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-neutral-900 to-black p-6 rounded-2xl border border-yellow-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2">
                        <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                            Automação Inteligente
                        </span>
                        <span className="text-yellow-500/80 text-xs font-bold tracking-tight">Kiwify Integrador</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                        <Sparkles className="text-yellow-500 animate-pulse" size={28} /> Recuperador de Vendas
                    </h2>
                    <p className="text-sm text-gray-400 font-medium">
                        Importe suas planilhas de recusados ou pendentes e faça redisparos automáticos altamente persuasivos via WhatsApp.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 relative z-10">
                    <label className="bg-gradient-to-r from-red-950/40 to-red-900/40 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer">
                        <Upload size={16} /> Importar Recusas
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={(e) => handleFileUpload(e, 'refused')} 
                            className="hidden" 
                        />
                    </label>

                    <label className="bg-gradient-to-r from-yellow-950/40 to-yellow-900/40 border border-yellow-500/30 hover:border-yellow-500 text-yellow-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer">
                        <Upload size={16} /> Importar Aguardando
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={(e) => handleFileUpload(e, 'waiting_payment')} 
                            className="hidden" 
                        />
                    </label>

                    {leads.length > 0 && (
                        <button 
                            onClick={handleClearLeads}
                            className="bg-transparent border border-neutral-800 text-gray-400 hover:text-white hover:border-red-500/50 px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                            Limpar Lista
                        </button>
                    )}
                </div>
            </div>

            {/* Overall Statistics Dashboard Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-neutral-900/60 backdrop-blur border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Leads Totais</span>
                    <span className="text-3xl font-black text-white mt-2">{stats.total}</span>
                    <div className="text-[10px] text-gray-400 font-bold mt-1 flex justify-between">
                        <span>{stats.refusedCount} Recusas</span>
                        <span>{stats.pendingPaymentCount} Pix</span>
                    </div>
                </div>

                <div className="bg-neutral-900/60 backdrop-blur border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Selecionados</span>
                    <span className="text-3xl font-black text-yellow-500 mt-2">{stats.selected}</span>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">Prontos para envio</span>
                </div>

                <div className="bg-neutral-900/60 backdrop-blur border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Enviado com Sucesso</span>
                    <span className="text-3xl font-black text-green-500 mt-2 flex items-center gap-1.5">
                        {stats.success} <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">Status 200 OK</span>
                </div>

                <div className="bg-neutral-900/60 backdrop-blur border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Falhas / Erros</span>
                    <span className="text-3xl font-black text-red-500 mt-2 flex items-center gap-1.5">
                        {stats.error} {stats.error > 0 && <AlertTriangle size={18} className="text-red-500 shrink-0 animate-bounce" />}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">Verifique logs do WhatsApp</span>
                </div>

                <div className="col-span-2 md:col-span-1 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 p-4 rounded-2xl flex flex-col justify-between">
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Pendente</span>
                    <span className="text-3xl font-black text-white mt-2">{stats.pending}</span>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">Aguardando disparo</span>
                </div>
            </div>

            {/* Core Working Panel (Templates sidebar + Lead Table) */}
            <div className="grid lg:grid-cols-3 gap-6">
                
                {/* Left side: Advanced Configuration & Templates Editor */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Instância do WhatsApp & Connection Info */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
                            <Smartphone size={16} className="text-yellow-500" /> Configuração do WhatsApp
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Instância de Disparo (Evolution API)
                                </label>
                                <select 
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                                    value={selectedInstance}
                                    onChange={e => setSelectedInstance(e.target.value)}
                                >
                                    {instances.map(inst => (
                                        <option key={inst} value={inst}>{inst}</option>
                                    ))}
                                    <option value="custom">-- Digitar Outra Instância --</option>
                                </select>
                            </div>

                            {(selectedInstance === 'custom' || !instances.includes(selectedInstance)) && (
                                <div>
                                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                        Nome Personalizado da Instância
                                    </label>
                                    <input 
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                                        placeholder="Ex: suporte técnico"
                                        value={customInstance}
                                        onChange={e => setCustomInstance(e.target.value)}
                                    />
                                    <p className="text-[9px] text-gray-500 mt-1 italic">
                                        Digite exatamente o nome cadastrado na Evolution API.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Intervalo Anti-Ban (Segundos)
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number"
                                        min="2"
                                        max="60"
                                        className="w-20 bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-bold text-white text-center outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                                        value={sendDelay}
                                        onChange={e => setSendDelay(parseInt(e.target.value) || 5)}
                                    />
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        Recomendamos no mínimo 5 segundos para evitar bloqueios.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-2">
                            <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest block">
                                Dica de ouro para Suporte Técnico:
                            </span>
                            <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                Abordagens de suporte convertem mais do que cobranças diretas. Diga que está entrando em contato para saber se deu algum erro de processamento ou se precisam de ajuda para liberar a vaga.
                            </p>
                        </div>
                    </div>

                    {/* Copywriting Templates Panel */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-xl">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
                            <MessageSquare size={16} className="text-yellow-500" /> Copys de Alta Conversão
                        </h3>

                        {/* Card Rejection Template */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
                                🟥 Modelo: Cartão Recusado
                            </span>
                            <textarea 
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-medium h-48 outline-none focus:ring-1 focus:ring-yellow-500 transition-all text-gray-300 leading-relaxed"
                                value={refusedTemplate}
                                onChange={e => setRefusedTemplate(e.target.value)}
                            />
                        </div>

                        {/* Pix Pending Template */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block">
                                🟨 Modelo: Pix Pendente / Aguardando
                            </span>
                            <textarea 
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs font-medium h-48 outline-none focus:ring-1 focus:ring-yellow-500 transition-all text-gray-300 leading-relaxed"
                                value={pendingTemplate}
                                onChange={e => setPendingTemplate(e.target.value)}
                            />
                        </div>

                        {/* Variable explanation helper */}
                        <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                                Variáveis Disponíveis:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {['{{name}}', '{{product}}', '{{payment_method}}', '{{reason}}', '{{price}}'].map(tag => (
                                    <code key={tag} className="text-[9px] bg-black px-1.5 py-0.5 rounded text-yellow-500 border border-neutral-800 font-mono">
                                        {tag}
                                    </code>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right side: Leads List Table & Bulk Trigger Panel */}
                <div className="space-y-6 lg:col-span-2">
                    
                    {/* Bulk send banner */}
                    {leads.length > 0 && (
                        <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                            <div className="space-y-1">
                                <h4 className="font-bold text-white text-base">Pronto para iniciar a recuperação?</h4>
                                <p className="text-xs text-gray-400">
                                    Há <span className="text-yellow-500 font-bold">{stats.selected}</span> leads selecionados para receber a mensagem personalizada.
                                </p>
                            </div>
                            <button
                                onClick={handleStartRecovery}
                                disabled={isSending || stats.selected === 0}
                                className="w-full md:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:from-yellow-400 hover:to-yellow-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/10 shrink-0"
                            >
                                {isSending ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Disparando ({currentSendingIndex + 1}/{stats.total})...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} fill="black" /> Iniciar Automação
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Leads filterable list card */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden">
                        
                        {/* List Filters & Search Bar */}
                        <div className="p-4 md:p-6 border-b border-neutral-800 bg-neutral-950 flex flex-col md:flex-row gap-3 justify-between items-center">
                            
                            {/* Search */}
                            <div className="w-full md:w-72 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input 
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                                    placeholder="Buscar por cliente, curso ou telefone..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Status Filters */}
                            <div className="flex gap-2 w-full md:w-auto">
                                <button 
                                    onClick={() => setStatusFilter('all')}
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                        statusFilter === 'all' 
                                            ? 'bg-white text-black border-white' 
                                            : 'bg-neutral-900 text-gray-400 border-neutral-800 hover:bg-neutral-800'
                                    }`}
                                >
                                    Todos ({leads.length})
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('refused')}
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                        statusFilter === 'refused' 
                                            ? 'bg-red-500/20 text-red-400 border-red-500/40' 
                                            : 'bg-neutral-900 text-gray-400 border-neutral-800 hover:bg-neutral-800'
                                    }`}
                                >
                                    Recusas ({stats.refusedCount})
                                </button>
                                <button 
                                    onClick={() => setStatusFilter('waiting_payment')}
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                        statusFilter === 'waiting_payment' 
                                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' 
                                            : 'bg-neutral-900 text-gray-400 border-neutral-800 hover:bg-neutral-800'
                                    }`}
                                >
                                    Aguardando Pix ({stats.pendingPaymentCount})
                                </button>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-950 text-[9px] font-black uppercase tracking-wider text-gray-500">
                                        <th className="p-4 w-10 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 accent-yellow-500 rounded cursor-pointer"
                                                checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.includes(l.id))}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Curso / Produto</th>
                                        <th className="p-4">Pagamento</th>
                                        <th className="p-4">Preço</th>
                                        <th className="p-4">Status Envio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-900">
                                    {filteredLeads.map((lead, index) => (
                                        <tr key={lead.id} className="hover:bg-neutral-900/40 transition-colors text-xs font-medium text-gray-300">
                                            
                                            {/* Select Checkbox */}
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 accent-yellow-500 rounded cursor-pointer"
                                                    checked={selectedLeads.includes(lead.id)}
                                                    onChange={() => toggleSelectLead(lead.id)}
                                                    disabled={isSending && currentSendingIndex === index}
                                                />
                                            </td>

                                            {/* Client details */}
                                            <td className="p-4">
                                                <div className="space-y-0.5">
                                                    <span className="font-bold text-white block truncate max-w-[160px]">
                                                        {lead.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                                                        <a 
                                                            href={`https://wa.me/${lead.phone}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:text-green-400 flex items-center gap-0.5"
                                                        >
                                                            <Smartphone size={10} /> {lead.phone}
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Product title */}
                                            <td className="p-4">
                                                <span className="text-[11px] block truncate max-w-[180px]" title={lead.product}>
                                                    {lead.product}
                                                </span>
                                                <span className="text-[9px] text-gray-500 font-mono block">
                                                    ID: {lead.saleId}
                                                </span>
                                            </td>

                                            {/* Payment details */}
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        {lead.status === 'refused' ? (
                                                            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                                                Recusado ({lead.paymentMethod})
                                                            </span>
                                                        ) : (
                                                            <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                                                                Aguardando Pix
                                                            </span>
                                                        )}
                                                    </div>
                                                    {lead.declineReason && (
                                                        <span className="text-[9px] text-gray-400 font-medium block truncate max-w-[120px]" title={lead.declineReason}>
                                                            Motivo: {lead.declineReason === 'antifraud' ? 'Antifraude' : lead.declineReason}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Price / Value */}
                                            <td className="p-4 font-bold text-white font-mono">
                                                R$ {parseFloat(lead.price).toFixed(2)}
                                            </td>

                                            {/* Send Automation Status */}
                                            <td className="p-4">
                                                {lead.sendStatus === 'pending' && (
                                                    <span className="text-gray-500 text-[10px] font-bold flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Pendente
                                                    </span>
                                                )}
                                                {lead.sendStatus === 'sending' && (
                                                    <span className="text-yellow-500 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                                        <RefreshCw size={10} className="animate-spin" /> Enviando...
                                                    </span>
                                                )}
                                                {lead.sendStatus === 'success' && (
                                                    <span className="text-green-500 text-[10px] font-black uppercase flex items-center gap-1">
                                                        <Check size={12} className="stroke-[3]" /> Enviado OK
                                                    </span>
                                                )}
                                                {lead.sendStatus === 'error' && (
                                                    <div className="space-y-0.5">
                                                        <span className="text-red-500 text-[10px] font-black uppercase flex items-center gap-1" title={lead.sendError}>
                                                            <AlertTriangle size={12} /> Falha
                                                        </span>
                                                        <span className="text-[9px] text-red-400/80 block max-w-[120px] truncate" title={lead.sendError}>
                                                            {lead.sendError}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredLeads.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-gray-500 font-medium">
                                                <FileText className="mx-auto mb-3 opacity-20" size={48} />
                                                <p className="text-sm">Nenhum lead carregado.</p>
                                                <p className="text-xs text-gray-600 mt-1">Importe arquivos (.xlsx) da Kiwify usando os botões acima.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesRecoveryView;
