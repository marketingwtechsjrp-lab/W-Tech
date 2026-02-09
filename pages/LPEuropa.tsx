import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { distributeLead } from '../lib/leadDistribution';
import { triggerWebhook } from '../lib/webhooks';
import { CheckCircle, ArrowRight, User, ShieldCheck, MapPin, Calendar, Clock, Star, Play } from 'lucide-react';

const LPEuropa: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '', cpf: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const assignedTo = await distributeLead();
        const payload = {
            name: form.name,
            email: form.email,
            phone: form.phone,
            cpf: form.cpf,
            type: 'Course_Registration', // Or specific type for Europa
            status: 'New',
            context_id: `LP EUROPA: ${form.location}`,
            tags: ['EUROPA_WAITLIST'],
            assigned_to: assignedTo
        };

        await supabase.from('SITE_Leads').insert([payload]);
        await triggerWebhook('webhook_lead', payload);
        setSubmitted(true);
    } catch (err) {
        alert('Erro ao enviar. Tente novamente.');
    }
    setLoading(false);
  };

  const scrollToForm = () => {
    document.getElementById('vip-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen font-sans bg-[#050505] text-white selection:bg-[#d40000] selection:text-white overflow-x-hidden">
        
        {/* TOP BAR */}
        <div className="bg-gradient-to-r from-[#d40000] to-[#a00000] text-white text-xs font-bold uppercase tracking-widest text-center py-2">
            🚀 Página Oficial – W-Tech Europa 2025
        </div>

        {/* HERO */}
        <header className="relative min-h-screen flex items-center justify-center overflow-hidden">
             {/* Background */}
             <div className="absolute inset-0 z-0">
                 <div className="absolute inset-0 bg-black/60 z-10"></div>
                 <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/80 z-10"></div>
                 <img src="https://images.unsplash.com/photo-1534068590799-09895a701e3e?q=80&w=2600&auto=format&fit=crop" className="w-full h-full object-cover scale-105 animate-[pulse_10s_infinite]" alt="Lisbon Bridge" />
             </div>

             <div className="container mx-auto px-6 relative z-20 text-center">
                 <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full mb-8 animate-fade-in-down">
                     <span className="w-2 h-2 rounded-full bg-[#d40000] animate-pulse"></span>
                     <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-300">Lisboa será o centro da suspensão mundial</span>
                 </div>
                 
                 <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
                     Chegou a Hora <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d40000] to-red-500">W-Tech Na Europa</span>
                 </h1>
                 
                 <p className="max-w-3xl mx-auto text-lg md:text-2xl text-gray-400 font-light leading-relaxed mb-12">
                     Pela primeira vez na história, Alex, fundador da W-Tech, vai ministrar um curso exclusivo diretamente na sede oficial da <strong className="text-white">LIQUI MOLY</strong>, em Lisboa.
                 </p>

                 <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                     <button onClick={scrollToForm} className="bg-[#d40000] hover:bg-red-600 text-white px-10 py-5 rounded-none font-black text-lg uppercase tracking-widest hover:scale-105 transition-all w-full md:w-auto flex items-center justify-center gap-3">
                         Entrar na Lista VIP <ArrowRight strokeWidth={3} />
                     </button>
                     <div className="text-xs font-bold uppercase text-gray-500 tracking-widest">
                         Vagas Extremamente Limitadas
                     </div>
                 </div>
             </div>

             {/* SCROLL INDICATOR */}
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                 <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white to-transparent"></div>
             </div>
        </header>

        {/* INTRODUCTION */}
        <section className="py-24 bg-black relative">
            <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <h2 className="text-4xl font-black uppercase tracking-tight text-white">
                        Um Encontro Reservado para a <span className="text-[#d40000]">Elite</span>
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed border-l-2 border-[#d40000] pl-6">
                        Este é um evento para mecânicos, pilotos, preparadores e profissionais que querem subir de nível técnico e dominar o que existe de mais avançado em preparação de suspensões para off-road, on-road e alta performance.
                    </p>
                    <div className="p-6 bg-zinc-900/50 border border-white/5 rounded-xl">
                        <strong className="block text-white uppercase font-bold text-sm mb-2">🎯 Se você trabalha com suspensão</strong>
                        <span className="text-gray-400">Este é o curso que muda tudo. Europa inteira olhando para este evento.</span>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute -inset-4 bg-[#d40000] opacity-20 blur-3xl rounded-full"></div>
                    <img src="https://images.unsplash.com/photo-1625047509248-ec889cbff17f?q=80&w=1920&auto=format&fit=crop" className="relative z-10 w-full rounded-sm grayscale hover:grayscale-0 transition-all duration-700 shadow-2xl" alt="Mechanic Work" />
                </div>
            </div>
        </section>

        {/* WHY IMPORTANT - STACKED CARDS */}
        <section className="py-24 bg-[#050505]">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <span className="text-[#d40000] font-bold uppercase tracking-widest text-xs">Exclusividade Total</span>
                    <h2 className="text-3xl md:text-5xl font-black uppercase mt-2">Por que este curso é tão <br/>importante?</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-zinc-900 p-8 border-t-4 border-[#d40000] hover:bg-zinc-800 transition-all group">
                        <h3 className="text-xl font-bold text-white mb-4 uppercase group-hover:text-[#d40000] transition-colors">Primeira edição oficial na Europa</h3>
                        <p className="text-gray-400 text-sm">O conteúdo que revolucionou o mercado brasileiro agora chega para Portugal e toda UE.</p>
                    </div>
                    <div className="bg-zinc-900 p-8 border-t-4 border-[#d40000] hover:bg-zinc-800 transition-all group">
                        <h3 className="text-xl font-bold text-white mb-4 uppercase group-hover:text-[#d40000] transition-colors">Acesso direto ao Alex</h3>
                        <p className="text-gray-400 text-sm">Aprenda com quem desenvolve, testa, inova e constrói tecnologias usadas em pilotos campeões.</p>
                    </div>
                    <div className="bg-zinc-900 p-8 border-t-4 border-[#d40000] hover:bg-zinc-800 transition-all group">
                        <h3 className="text-xl font-bold text-white mb-4 uppercase group-hover:text-[#d40000] transition-colors">Ambiente Premium LIQUI MOLY</h3>
                        <p className="text-gray-400 text-sm">Estrutura profissional, recursos avançados e experiência internacional.</p>
                    </div>
                    <div className="bg-zinc-900 p-8 border-t-4 border-[#d40000] hover:bg-zinc-800 transition-all group md:col-span-2 lg:col-span-1">
                        <h3 className="text-xl font-bold text-white mb-4 uppercase group-hover:text-[#d40000] transition-colors">Conteúdo 100% aplicável</h3>
                        <p className="text-gray-400 text-sm">Sem enrolação: configuração, ajustes, testes, diagnóstico, preparação, segredos profissionais.</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#d40000] to-[#800000] p-8 md:col-span-2 lg:col-span-2 flex items-center">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-2 uppercase">Certificação Internacional</h3>
                            <p className="text-white/80">W-Tech + Liqui Moly. Reconhecimento real para elevar seu posicionamento no mercado.</p>
                        </div>
                        <Star className="ml-auto w-16 h-16 text-white/20" />
                    </div>
                </div>
            </div>
        </section>

        {/* DOMINATE */}
        <section className="py-24 bg-white text-black relative">
            <div className="container mx-auto px-6 relative z-10">
                <h2 className="text-4xl md:text-6xl font-black uppercase mb-12 tracking-tight max-w-4xl">
                    O Que Você Vai <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d40000] to-red-500">Dominar</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 text-lg font-medium">
                    {['Anatomia avançada das suspensões', 'Técnicas de diagnóstico profissional', 'Preparações W-Tech para diferentes terrenos', 'Uso de fluidos e combinações otimizadas', 'Setup para pilotos amadores e profissionais', 'Redução de falhas, ruídos e travamentos', 'Como entregar resultados superiores', 'Processos que transformam sua oficina'].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-200">
                            <span className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full text-xs font-bold shrink-0">{i+1}</span>
                            {item}
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 p-6 bg-gray-100 rounded-lg flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded">
                        <Star size={24} />
                    </div>
                    <p className="font-bold uppercase text-sm">Conteúdo atualizado com as tecnologias mais recentes do mercado.</p>
                </div>
            </div>
        </section>

        {/* TARGET AUDIENCE - DARK */}
        <section className="py-24 bg-zinc-900 border-b border-white/5">
             <div className="container mx-auto px-6 text-center">
                 <h2 className="text-3xl font-black uppercase mb-12">Para quem é este curso?</h2>
                 <div className="grid md:grid-cols-3 gap-8">
                     {[
                         'Quer elevar seu nível técnico ao padrão internacional',
                         'Deseja aumentar faturamento com serviços de alta performance',
                         'Busca se diferenciar em um mercado cada vez mais competitivo',
                         'Quer dominar o método W-Tech diretamente com o criador',
                         'Quer fazer parte da elite dos profissionais de suspensão em Portugal'
                     ].map((text, i) => (
                         <div key={i} className="p-6 border border-white/5 bg-black hover:border-[#d40000] transition-colors">
                             <CheckCircle className="mx-auto mb-4 text-[#d40000]" size={32} />
                             <p className="text-gray-300 font-medium">{text}</p>
                         </div>
                     ))}
                 </div>
             </div>
        </section>

        {/* INFO & URGENCY */}
        <section className="py-24 bg-black relative overflow-hidden">
            {/* Warning Tape Effect */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[#d40000]"></div>
            <div className="absolute bottom-0 left-0 w-full h-2 bg-[#d40000]"></div>

            <div className="container mx-auto px-6 text-center relative z-10">
                <div className="inline-block bg-[#d40000] text-white font-black uppercase text-xs px-4 py-1 mb-8 tracking-widest">
                    Atenção: Este evento não se repetirá em 2025
                </div>

                <h2 className="text-4xl md:text-5xl font-black uppercase mb-8 text-white">
                    A agenda europeia do Alex é <br/><span className="text-[#d40000]">Extremamente Limitada</span>
                </h2>
                
                <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                    Quem entrar, entrou. Quem perder, só no próximo ano – se abrir nova data.
                </p>

                <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-16">
                     <div className="bg-zinc-900 p-6 rounded border border-white/10">
                         <MapPin className="mx-auto text-[#d40000] mb-2" />
                         <div className="font-black uppercase text-white">Lisboa</div>
                         <div className="text-xs text-gray-500">Sede Oficial LIQUI MOLY</div>
                     </div>
                     <div className="bg-zinc-900 p-6 rounded border border-white/10">
                         <Calendar className="mx-auto text-[#d40000] mb-2" />
                         <div className="font-black uppercase text-white">Data a Revelar</div>
                         <div className="text-xs text-gray-500">Após fechamento do grupo</div>
                     </div>
                     <div className="bg-zinc-900 p-6 rounded border border-white/10">
                         <Clock className="mx-auto text-[#d40000] mb-2" />
                         <div className="font-black uppercase text-white">Vagas Limitadas</div>
                         <div className="text-xs text-gray-500">Pré-inscrição Obrigatória</div>
                     </div>
                </div>

                {/* FORM */}
                <div id="vip-form" className="max-w-xl mx-auto bg-white text-black p-8 md:p-12 rounded-sm shadow-2xl relative">
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[80px] border-t-[#d40000] border-l-[80px] border-l-transparent"></div>
                    
                    <h3 className="text-3xl font-black uppercase mb-2">Lista VIP</h3>
                    <p className="text-gray-600 mb-8 font-medium">Garanta prioridade e receba todas as informações.</p>
                    
                    {submitted ? (
                        <div className="bg-green-50 border border-green-200 p-8 text-center rounded">
                            <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
                            <h4 className="text-xl font-bold text-green-800 uppercase mb-2">Cadastro Confirmado!</h4>
                            <p className="text-green-700">Bem-vindo à elite. Em breve você receberá as informações no WhatsApp.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nome Completo</label>
                                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-100 border-none p-4 font-bold focus:ring-2 focus:ring-[#d40000]" placeholder="Seu nome" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email Profissional</label>
                                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-100 border-none p-4 font-bold focus:ring-2 focus:ring-[#d40000]" placeholder="seu@email.com" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp</label>
                                    <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-100 border-none p-4 font-bold focus:ring-2 focus:ring-[#d40000]" placeholder="+xx (xx) xxxxx-xxxx" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">CPF (Obrigatório)</label>
                                    <input required value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} className="w-full bg-gray-100 border-none p-4 font-bold focus:ring-2 focus:ring-[#d40000]" placeholder="CPF..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">País / Cidade</label>
                                    <input required value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-gray-100 border-none p-4 font-bold focus:ring-2 focus:ring-[#d40000]" placeholder="Ex: Portugal, Lisboa" />
                                </div>
                            </div>
                            
                            <button disabled={loading} className="w-full bg-[#d40000] text-white font-black text-xl py-5 uppercase tracking-wide hover:bg-black transition-colors shadow-lg mt-4 disabled:opacity-50">
                                {loading ? 'Enviando...' : 'Garantir Pré-Inscrição Agora'}
                            </button>
                            
                            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-2">
                                <ShieldCheck size={12} /> Seus dados estão seguros. Sem spam.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-[#111] py-12 text-center border-t border-white/10">
            <div className="container mx-auto px-6">
                <h4 className="text-2xl font-black uppercase text-white mb-2">W-TECH EUROPA 2025</h4>
                <p className="text-gray-500 uppercase text-xs tracking-widest">A evolução da suspensão começa em Lisboa.</p>
            </div>
        </footer>
    </div>
  );
};

export default LPEuropa;
