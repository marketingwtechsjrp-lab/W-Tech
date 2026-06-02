import React, { useState, useEffect } from 'react';
import { 
    Users, Search, DollarSign, Award, Download, Copy, Check, MessageSquare, 
    Share2, ArrowRight, ShieldCheck, Flame, BookOpen, Layers, CheckCircle,
    ExternalLink, Coins, Sparkles, AlertCircle, Terminal, HelpCircle, Eye,
    Link, Code, Clock, Lock, ChevronRight
} from 'lucide-react';

interface Affiliate {
    name: string;
    email: string;
    company: string;
    doc: string;
    status: string;
}

const AFFILIATES_DATA: Affiliate[] = [
  { "name": "Jerônimo Pompeu", "email": "jeronimopompeu5@gmail.com", "company": "Jeronimo Pompeu de Souza", "doc": "30961098856", "status": "active" },
  { "name": "Mecanicosbrasil", "email": "mecanicosbrasil@yahoo.com", "company": "MECANICOS BRASIL RACING", "doc": "13510381000109", "status": "active" },
  { "name": "Fernando Macedo", "email": "oficinaproriders@gmail.com", "company": "FERNANDO JOSE COELHO MACEDO", "doc": "14076295000194", "status": "active" },
  { "name": "Rone Mateus", "email": "ronepqdferreira@gmail.com", "company": "Rone Mateus Ferreira Martins", "doc": "22234600707", "status": "active" },
  { "name": "Pedro Henrique", "email": "pedrohenriquefreireazevedo@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Leofirula", "email": "leofirula@outlook.com", "company": "leonardo vitorino correa", "doc": "", "status": "active" },
  { "name": "JEFFERSON FERNANDO DA SILVA", "email": "jeffersonsimulationcant@gmail.com", "company": "JEFFERSON FERNANDO DA SILVA", "doc": "13068518407", "status": "active" },
  { "name": "Mari", "email": "marisalermo267@gmail.com", "company": "Marilene dos Santos Salermo Hard", "doc": "09605603780", "status": "active" },
  { "name": "Flaviathainasantos206", "email": "flaviathainasantos206@gmail.com", "company": "Thaina Santos", "doc": "16736851459", "status": "active" },
  { "name": "Rmesaque56", "email": "rmesaque56@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Ria782224", "email": "ria782224@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "VAGNER JUNIOR DA SILVA BARRETO", "email": "vagnerjrsilva726@gmail.com", "company": "VAGNER JUNIOR DA SILVA BARRETO", "doc": "05528350050", "status": "active" },
  { "name": "Pedro henrique de melo manzano", "email": "pedrohenriquedemelomanzano@gmail.com", "company": "Elaine Rodrigues de Melo", "doc": "03715123958", "status": "active" },
  { "name": "Jonatasbarretobarreto98", "email": "jonatasbarretobarreto98@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Gustavos.rocha2015", "email": "gustavos.rocha2015@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Umgbde14anos", "email": "umgbde14anos@gmail.com", "company": "Acacia maria Da Silva Pinheiro", "doc": "03346039781", "status": "active" },
  { "name": "joaci belo dos santos", "email": "joacibello197642@gmail.com", "company": "JOACI BELO DOS SANTOS", "doc": "77782135168", "status": "active" },
  { "name": "Pereiragabrielsouza777", "email": "pereiragabrielsouza777@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Kevinalvesss49", "email": "kevinalvesss49@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Juliana Santos", "email": "juhdaniel9@gmail.com", "company": "Juliana silva dos Santos", "doc": "03897854236", "status": "active" },
  { "name": "Milysares234", "email": "milysares234@gmail.com", "company": "Kemily Pereira Soares", "doc": "43890507883", "status": "active" },
  { "name": "pedro", "email": "pedrohenriquepauvelz@gmail.com", "company": "monica correia barreto pauvelz", "doc": "", "status": "active" },
  { "name": "Samukasilvasantos", "email": "samukasilvasantos@hotmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Eliane Aparecida De Moraes Fernandes", "email": "eliane40celio@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Viniciusessantos1", "email": "viniciusessantos1@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Marcos Sérgio da Mota Santos", "email": "marcos.irmao@gmail.com", "company": "Marcos Sérgio Mota Santos", "doc": "26639149591", "status": "active" },
  { "name": "Jeferson Ricardo Marques", "email": "ricardojeferson104@gmail.com", "company": "Jeferson Ricardo Marques", "doc": "31244197823", "status": "active" },
  { "name": "pedro", "email": "pedrogilmar346@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Filiado digital", "email": "artthi06@gmail.com", "company": "ARTHUR DA COSTA", "doc": "14478679711", "status": "active" },
  { "name": "Moisés", "email": "moisesvasconcelos578@gmail.com", "company": "Jodilma Vasconcelos Muniz", "doc": "06671808422", "status": "active" },
  { "name": "ATEMILSON DA SILVA", "email": "atemilsonmanoeldasilva@gmail.com", "company": "Atemilson Manoel Da Silva", "doc": "48975018000135", "status": "active" },
  { "name": "Josemarcostungtungsahur", "email": "josemarcostungtungsahur@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Paracursos", "email": "paracursos@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "PEDRO HENRIQUE ALVES GOMES", "email": "pedrohenriqueg2407@gmail.com", "company": "Marília Gomes Da Silva", "doc": "07983112408", "status": "active" },
  { "name": "Felippe", "email": "alceufelippe@gmail.com", "company": "Andreia Ambaltas", "doc": "28764084817", "status": "active" },
  { "name": "Murilopinto8889", "email": "murilopinto8889@gmail.com", "company": "Murilo Davi Souza Pinto", "doc": "04578109208", "status": "active" },
  { "name": "Maellygabriela611", "email": "maellygabriela611@gmail.com", "company": "Jennifer Gabriela Duarte Alves", "doc": "46863232820", "status": "active" },
  { "name": "Trindadepedro257", "email": "trindadepedro257@gmail.com", "company": "Jardelson trindade silva", "doc": "04348733309", "status": "active" },
  { "name": "Valter Santos", "email": "valtersantos67668@gmail.com", "company": "Válter pinho dos Santos", "doc": "98056956549", "status": "active" },
  { "name": "Carlossontos113", "email": "carlossontos113@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Jackswellsousa15", "email": "jackswellsousa15@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Davimarinhodg244", "email": "davimarinhodg244@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Capaeliseu", "email": "capaeliseu@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Vinicius Geraldo da Silva", "email": "vinii07duin@hotmail.com", "company": "Vinicius Geraldo da Silva", "doc": "34465658842", "status": "active" },
  { "name": "Hevertomlima48", "email": "hevertomlima48@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Matheusferreira2020gay", "email": "matheusferreira2020gay@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "sergiorodrigo667@gmail.com", "email": "sergiorodrigo667@gmail.com", "company": "Sergio Rodrigo Da Cruz Galdino", "doc": "11409727408", "status": "active" },
  { "name": "mismarilia95@gmail.com", "email": "mismarilia95@gmail.com", "company": "Marília Lima Matos", "doc": "05864382540", "status": "active" },
  { "name": "Livia", "email": "liviarodriguessoares2011@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Pedrohenriquemacena001", "email": "pedrohenriquemacena001@gmail.com", "company": "Fernando macena da cruz", "doc": "07172278984", "status": "active" },
  { "name": "Gustavo de souza", "email": "gustavopintodesouza123321@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Marcela", "email": "moreiramarcela984@gmail.com", "company": "marcela Moreira", "doc": "09173646601", "status": "active" },
  { "name": "Caioalvesbts11", "email": "caioalvesbts11@gmail.com", "company": "Ednei Silva de Mesquita", "doc": "39248933220", "status": "active" },
  { "name": "Davy Henrique De Melo Ribeiro", "email": "menordavihenrique@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Vglmanel.48", "email": "vglmanel.48@icloud.com", "company": "", "doc": "", "status": "active" },
  { "name": "Mateus Aguiar Oliveira", "email": "maguiaroliveira2@gmail.com", "company": "Mateus Aguiar Oliveira", "doc": "62008429300", "status": "active" },
  { "name": "Vphonegagacont", "email": "vphonegagacont@gmail.com", "company": "Andréia Aparecida Padilha", "doc": "06778342927", "status": "active" },
  { "name": "JUNIOR BARRETO", "email": "jr.sjrc@gmail.com", "company": "Junior Barreto Rodrigues", "doc": "05456494124", "status": "active" },
  { "name": "Comprasonlineviralshop", "email": "comprasonlineviralshop@gmail.com", "company": "Romancito andei gomes", "doc": "84578556115", "status": "active" },
  { "name": "Anderson Santtos", "email": "anderson008lucas@gmail.com", "company": "ANDERSON DOS SANTOS LUCAS", "doc": "09179711596", "status": "active" },
  { "name": "tiago pereira santos", "email": "tiagopereirasantost@gmail.com", "company": "Elane Oliveira Santos", "doc": "10265468698", "status": "active" },
  { "name": "Lcnovin50", "email": "lcnovin50@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Santossilvaanajulia56", "email": "santossilvaanajulia56@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "G.henrique.537628", "email": "g.henrique.537628@gmail.com", "company": "Joel Pereira da Silva", "doc": "32508746800", "status": "active" },
  { "name": "Arthurmf1981", "email": "arthurmf1981@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Arthuroliveira155020", "email": "arthuroliveira155020@gmail.com", "company": "Natércia Oliveira Pessoa", "doc": "98768557191", "status": "active" },
  { "name": "Gustawsz07", "email": "gustawsz07@gmail.com", "company": "Antônio sirleovaldo matos lopes", "doc": "01327058260", "status": "active" },
  { "name": "Vanianunesdossantos349", "email": "vanianunesdossantos349@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Marcela2santos12", "email": "marcela2santos12@gmail.com", "company": "Marcela dos Santos", "doc": "08697657520", "status": "active" },
  { "name": "Marcos Antônio", "email": "marcosantonio202500@gmail.com", "company": "Marcos Antônio Müller", "doc": "04181900037", "status": "active" },
  { "name": "A04371970", "email": "a04371970@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Heloisaalmeidadesousa91", "email": "heloisaalmeidadesousa91@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "MARIA APARECIDA MARTINS", "email": "anaclaraturial8@gmail.com", "company": "Maria Aparecida Martins", "doc": "00773904743", "status": "active" },
  { "name": "Samuel Pereira", "email": "samnascimento363@gmail.com", "company": "SAMUEL PEREIRA DO NASCIMENTO", "doc": "06699842218", "status": "active" },
  { "name": "Joaopedro29102k", "email": "joaopedro29102k@gmail.com", "company": "Cheila Mara Ribeiro", "doc": "06052159952", "status": "active" },
  { "name": "Gusta.flores.fg", "email": "gusta.flores.fg@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Cauaotavio811bh", "email": "cauaotavio811bh@gmail.com", "company": "Izac Augusto Porto Piau", "doc": "50267641850", "status": "active" },
  { "name": "Gargamelambulante", "email": "gargamelambulante@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Warllyson Araujo Rodrigues", "email": "warllysonaraujo83@gmail.com", "company": "", "doc": "", "status": "active" },
  { "name": "Dominguescesar96", "email": "dominguescesar96@gmail.com", "company": "Felipe augusto Domingues Macedo", "doc": "39342368808", "status": "active" },
  { "name": "Mariajuliapedrosa5", "email": "mariajuliapedrosa5@gmail.com", "company": "", "doc": "", "status": "active" }
];

const AffiliatesManagerView = ({ publicMode = false }: { publicMode?: boolean }) => {
    const [activeTab, setActiveTab] = useState<'admin' | 'portal'>('portal');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Portal states
    const [monthlySales, setMonthlySales] = useState(15);
    const [copiedSwipeId, setCopiedSwipeId] = useState<number | null>(null);
    const [copiedElementId, setCopiedElementId] = useState<string | null>(null);
    
    // Link tracking generator states
    const [affiliateLink, setAffiliateLink] = useState('https://pay.kiwify.com.br/19v4nIa');
    const [utmSource, setUtmSource] = useState('instagram_bio');
    const [generatedLink, setGeneratedLink] = useState('');

    useEffect(() => {
        if (publicMode) {
            setActiveTab('portal');
        }
    }, [publicMode]);

    // Live update for tracking link generator
    useEffect(() => {
        try {
            const url = new URL(affiliateLink);
            url.searchParams.set('src', utmSource);
            setGeneratedLink(url.toString());
        } catch (e) {
            // fallback if input is not fully valid URL yet
            setGeneratedLink(`${affiliateLink}${affiliateLink.includes('?') ? '&' : '?'}src=${utmSource}`);
        }
    }, [affiliateLink, utmSource]);

    // Filtered affiliates for Admin view
    const filteredAffiliates = AFFILIATES_DATA.filter(aff => 
        aff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aff.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        aff.doc.includes(searchTerm)
    );

    // Sales calculator values
    const coursePrice = 347.00;
    const commissionRate = 0.30; // 30% commission
    const commissionPerSale = coursePrice * commissionRate; // R$ 104.10
    const estimatedEarnings = monthlySales * commissionPerSale;

    const getEarningLevel = (earnings: number) => {
        if (earnings >= 10000) return { label: '🏆 W-Tech Black Legend', color: 'from-amber-400 via-yellow-500 to-amber-600', text: 'text-black' };
        if (earnings >= 5000) return { label: '🔥 W-Tech Platinum Elite', color: 'from-neutral-800 via-amber-500 to-neutral-800', text: 'text-yellow-400 border border-yellow-500/40' };
        if (earnings >= 2500) return { label: '🌟 W-Tech Gold Partner', color: 'from-yellow-400 to-amber-500', text: 'text-black' };
        if (earnings >= 1000) return { label: '✨ W-Tech Silver Partner', color: 'from-slate-300 to-slate-500', text: 'text-black' };
        return { label: '🏁 W-Tech Bronze Affiliate', color: 'from-amber-600 to-amber-900', text: 'text-white' };
    };

    const earningLevel = getEarningLevel(estimatedEarnings);

    // Copywriting swipes data
    const SWIPES = [
        {
            id: 1,
            title: "📱 WhatsApp (Abordagem Direta para Pilotos)",
            text: "Olá! Tudo bem? Vi que você é piloto e está sempre acelerando forte. Cara, o Vinícius da W-Tech liberou uma oportunidade única do novo Curso Online de Regulagem de Suspensão Para Pilotos.\n\nEles estão fechando as últimas vagas com desconto exclusivo: de R$ 997 por apenas R$ 347. É o melhor investimento para aprender a regular cliques, sag e hidráulica em casa, ganhando segurança e tempo de volta.\n\nConfere os detalhes na página oficial deles:\n\n👉 [LINK-GERADO-ABAIXO]"
        },
        {
            id: 2,
            title: "📸 Stories / Direct Instagram (Gatilho de Urgência)",
            text: "🚨 ALERTA: Restam pouquíssimas vagas com 65% de desconto no Curso de Suspensão W-Tech!\n\nChega de andar com a moto jogando de lado ou dura nas costelas. Aprenda como ajustar sua suspensão de forma simplificada.\n\nDe R$ 997,00 por apenas R$ 347,00 (ou em até 12x no cartão).\n\n👉 Arrasta ou clica no link da minha bio para garantir antes do aumento!"
        },
        {
            id: 3,
            title: "💬 Script Direct / Comentários (Quebra de Objeções)",
            text: "E aí, blz? Cara, vi sua dúvida sobre suspensão. O método da W-Tech é 100% prático e serve tanto para quem faz trilha quanto motocross ou enduro. Você tem suporte direto e garantia de 7 dias.\n\nComo o preço promocional de R$ 347 vai expirar nos próximos dias, recomendo garantir a vaga agora.\n\nSe quiser conferir a apresentação completa, o link seguro é esse:\n\n👉 [LINK-GERADO-ABAIXO]"
        }
    ];

    const handleCopyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedElementId(id);
        setTimeout(() => setCopiedElementId(null), 2000);
    };

    const handleCopySwipe = (text: string, id: number) => {
        // Replace dynamic placeholder with generated link
        const parsedText = text.replace("[LINK-GERADO-ABAIXO]", generatedLink);
        navigator.clipboard.writeText(parsedText);
        setCopiedSwipeId(id);
        setTimeout(() => setCopiedSwipeId(null), 2000);
    };

    // Developer Webhook simulated JSON payload
    const WEBHOOK_PAYLOAD = `{
  "event": "ORDER_APPROVED",
  "order_status": "approved",
  "payment_method": "pix",
  "approved_date": "${new Date().toISOString()}",
  "commission": {
    "amount": 104.10,
    "rate_percentage": 30.00
  },
  "product": {
    "id": "course_suspension_01",
    "name": "Curso Regulagem de Suspensão"
  },
  "affiliate": {
    "email": "seu-email@afiliados.com"
  }
}`;

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 text-white bg-black min-h-screen font-sans selection:bg-yellow-500 selection:text-black">
            
            {/* Header section with premium mesh-like dark background */}
            <div className="bg-gradient-to-br from-neutral-900 via-black to-neutral-950 p-6 md:p-8 rounded-3xl border border-yellow-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-yellow-600/5 rounded-full blur-2xl" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                            <span className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded tracking-widest">
                                W-TECH VIP NETWORK
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-ping" />
                            <span className="text-yellow-500/80 text-xs font-black tracking-tight uppercase">Portal de Afiliados</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                            <Share2 className="text-yellow-500 animate-pulse" size={32} /> Central de Parceiros
                        </h1>
                        <p className="text-sm text-neutral-400 font-medium max-w-xl">
                            Acesse materiais de alta conversão, crie seus links personalizados de afiliados e acompanhe a estratégia estruturada para alavancar suas vendas do Curso de Suspensão.
                        </p>
                    </div>

                    {/* Navigation tabs - Hidden in public mode */}
                    {!publicMode ? (
                        <div className="bg-neutral-900/90 p-1.5 rounded-2xl border border-neutral-800 flex shadow-lg shrink-0">
                            <button 
                                onClick={() => setActiveTab('portal')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeTab === 'portal' 
                                        ? 'bg-yellow-500 text-black font-extrabold shadow-md shadow-yellow-500/20' 
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <Flame size={14} className={activeTab === 'portal' ? 'animate-bounce' : ''} /> Recursos e Treinamento
                            </button>
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeTab === 'admin' 
                                        ? 'bg-yellow-500 text-black font-extrabold shadow-md shadow-yellow-500/20' 
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <Users size={14} /> Gestão ({AFFILIATES_DATA.length})
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* TAB CONTENT: AFFILIATES RESOURCE PORTAL */}
            {activeTab === 'portal' && (
                <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                    
                    {/* Left & Middle columns: Resources, Simulator, Copys, and Strategy Guides */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* Interactive Commissions Calculator (Refined UI) */}
                        <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border-2 border-neutral-800/80 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-52 h-52 bg-yellow-500/5 rounded-full blur-3xl group-hover:bg-yellow-500/10 transition-all duration-500" />
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-800/60 pb-5 mb-6 gap-3">
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                                        <Coins size={22} className="text-yellow-500" /> Simule seus Ganhos Mensais
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-1">Arrasta o slider abaixo para simular sua comissão de 30% direta.</p>
                                </div>
                                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/25 text-[10px] font-black uppercase px-3.5 py-1.5 rounded-full tracking-widest shrink-0">
                                    Comissão por venda: R$ 104,10
                                </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center text-xs font-black text-neutral-400 uppercase tracking-wider">
                                        <span>Meta de Indicações</span>
                                        <span className="text-yellow-500 text-lg font-mono font-black bg-neutral-900 px-4 py-1.5 rounded-xl border border-neutral-800">{monthlySales} {monthlySales === 1 ? 'venda' : 'vendas'}</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="100"
                                        className="w-full h-2 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400 transition-all"
                                        value={monthlySales}
                                        onChange={e => setMonthlySales(parseInt(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                                        <span>1 Venda</span>
                                        <span>50 Vendas</span>
                                        <span>100 Vendas</span>
                                    </div>
                                </div>

                                <div className="bg-neutral-950/90 border border-neutral-800/80 p-6 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-inner relative overflow-hidden">
                                    {monthlySales >= 50 && (
                                        <div className="absolute -top-1 -right-1 w-16 h-16 bg-yellow-500/10 rounded-full blur-xl animate-pulse" />
                                    )}
                                    <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                                        Sua comissão estimada:
                                    </span>
                                    <span className="text-4xl font-black text-green-400 font-mono tracking-tight animate-pulse">
                                        R$ {estimatedEarnings.toFixed(2)}
                                    </span>
                                    <div className={`bg-gradient-to-r ${earningLevel.color} ${earningLevel.text} text-[9px] font-black uppercase px-3.5 py-1.5 rounded-xl tracking-widest mt-1 shadow-lg transition-all duration-300`}>
                                        {earningLevel.label}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* STRATEGY GUIDE: HOW TO USE THE SALES LP (HIGHLY INSTRUCTIVE) */}
                        <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                            <div className="border-b border-neutral-800 pb-5">
                                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Sparkles size={20} className="text-yellow-500" /> Estratégia do Funil: Como Usar a LP de Vendas
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">Conheça os elementos psicológicos integrados no nosso funil que garantem a conversão.</p>
                            </div>

                            <div className="grid md:grid-cols-5 gap-8 items-center">
                                {/* Visual Mockup of the landing page (iPhone style) */}
                                <div className="md:col-span-2 bg-[#090909] border border-neutral-800/80 p-5 rounded-[2.5rem] shadow-xl relative max-w-[260px] mx-auto w-full">
                                    {/* Notch */}
                                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                                        <div className="w-12 h-1 bg-neutral-900 rounded-full" />
                                    </div>
                                    
                                    {/* Speaker/Camera detail */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-950 rounded-full z-20" />
                                    
                                    {/* Content Screen */}
                                    <div className="bg-[#121212] rounded-[2rem] p-4 border border-neutral-900 space-y-3.5 text-[9px] text-neutral-400 relative overflow-hidden pt-7">
                                        
                                        {/* Fake Header */}
                                        <div className="flex justify-between items-center text-[7px] text-neutral-600 font-mono">
                                            <span>W-Tech LP</span>
                                            <span>09:41 AM</span>
                                        </div>

                                        {/* Fake Video Player */}
                                        <div className="w-full h-24 bg-black rounded-xl flex flex-col items-center justify-center border border-neutral-800/80 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1)_0%,transparent_100%)]" />
                                            {/* Simulated video graphics */}
                                            <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-black shadow-lg relative z-10">
                                                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-black ml-0.5" />
                                            </div>
                                            <span className="text-[7px] font-black text-white uppercase tracking-wider mt-2 z-10">Ver Apresentação</span>
                                            <div className="absolute bottom-2 left-2 right-2 h-1 bg-neutral-900 rounded overflow-hidden">
                                                <div className="w-1/3 h-full bg-yellow-500" />
                                            </div>
                                        </div>

                                        {/* Course Headline mockup */}
                                        <div className="text-center space-y-1">
                                            <span className="text-[7px] text-yellow-500 font-black uppercase tracking-widest">Curso Regulagem de Suspensão</span>
                                            <h4 className="font-black text-white uppercase leading-tight text-[10px]">Ajuste Como Um Profissional</h4>
                                        </div>

                                        {/* Bullet points */}
                                        <div className="space-y-1.5 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-900">
                                            <div className="flex items-center gap-1.5 text-[7px]">
                                                <CheckCircle size={9} className="text-yellow-500 shrink-0" />
                                                <span>Ajuste de Sag & Cliques na prática</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[7px]">
                                                <CheckCircle size={9} className="text-yellow-500 shrink-0" />
                                                <span>Para Motocross, Enduro e Trilha</span>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-center font-black py-2 rounded-xl text-[8px] uppercase tracking-widest font-sans shadow-md shadow-yellow-500/10">
                                            Garantir Inscrição R$ 347
                                        </div>
                                    </div>
                                    
                                    <div className="text-[8px] text-neutral-500 text-center font-bold uppercase tracking-widest mt-3.5">
                                        Mockup da LP de Vendas
                                    </div>
                                </div>

                                {/* Instructing how to drive traffic and convert */}
                                <div className="md:col-span-3 space-y-5">
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <Award size={18} className="text-yellow-500" /> Os Três Pilares da LP
                                    </h4>
                                    
                                    <div className="space-y-4 text-xs text-neutral-400">
                                        <div className="border-l-2 border-yellow-500/40 pl-3.5 py-0.5 space-y-1">
                                            <strong className="text-white text-xs block">1. A Apresentação de Vinícius Saldanha</strong>
                                            <p className="leading-relaxed">
                                                A página exibe um vídeo detalhado onde o Vinícius destrincha por que 90% dos pilotos andam com suspensão desregulada. Direcione o cliente a assistir o vídeo explicativo.
                                            </p>
                                        </div>
                                        <div className="border-l-2 border-yellow-500/40 pl-3.5 py-0.5 space-y-1">
                                            <strong className="text-white text-xs block">2. Prova Social e Depoimentos</strong>
                                            <p className="leading-relaxed">
                                                Pilotos reais mostram seus tempos de volta abaixando e a moto colando no chão após aplicarem o sag correto. Use isso no seu fechamento.
                                            </p>
                                        </div>
                                        <div className="border-l-2 border-yellow-500/40 pl-3.5 py-0.5 space-y-1">
                                            <strong className="text-white text-xs block">3. Lote VIP de Escassez (R$ 347)</strong>
                                            <p className="leading-relaxed">
                                                O valor de tabela do curso é R$ 997, mas a página está travada na promoção de R$ 347 por tempo limitado. Sempre lembre seu cliente dessa diferença.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* INTERACTIVE LINK GENERATOR & ONBOARDING (NEW) */}
                        <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                            <div className="border-b border-neutral-800 pb-5">
                                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Link size={20} className="text-yellow-500" /> Gerador Inteligente de Link de Afiliado
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">Esqueça links bagunçados. Insira seu link de afiliado Kiwify e gere URLs rastreadas automaticamente.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                            <Lock size={12} className="text-yellow-500" /> Seu Link Base da Kiwify
                                        </label>
                                        <input 
                                            type="text" 
                                            value={affiliateLink} 
                                            onChange={e => setAffiliateLink(e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs font-mono text-neutral-300 outline-none focus:border-yellow-500 transition-colors"
                                            placeholder="Ex: https://pay.kiwify.com.br/19v4nIa"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                                            <Search size={12} className="text-yellow-500" /> Origem de Tráfego (Rastreamento SRC)
                                        </label>
                                        <select 
                                            value={utmSource} 
                                            onChange={e => setUtmSource(e.target.value)}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-300 outline-none focus:border-yellow-500 cursor-pointer"
                                        >
                                            <option value="instagram_bio">Instagram Bio</option>
                                            <option value="instagram_stories">Instagram Stories</option>
                                            <option value="whatsapp_direto">WhatsApp Direto</option>
                                            <option value="grupo_motos">Grupo de WhatsApp de Motos</option>
                                            <option value="facebook_ads">Anúncios Patrocinados</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-neutral-950/80 border border-neutral-800/80 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-inner">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                                                <ShieldCheck size={10} className="text-green-500" /> Link Rastreável Pronto
                                            </span>
                                            <span className="bg-green-500/10 text-green-400 border border-green-500/25 text-[8px] font-black uppercase px-2 py-0.5 rounded">Ativo</span>
                                        </div>
                                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 font-mono text-[10px] text-yellow-500 break-all select-all">
                                            {generatedLink}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleCopyText(generatedLink, 'tracking_link')}
                                        className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                            copiedElementId === 'tracking_link'
                                                ? 'bg-green-600 text-white shadow-lg shadow-green-500/10'
                                                : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/10 active:scale-[0.98]'
                                        }`}
                                    >
                                        {copiedElementId === 'tracking_link' ? (
                                            <>
                                                <Check size={14} className="stroke-[3]" /> Link Copiado!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} /> Copiar Link Otimizado
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#0b0b0b] rounded-2xl border border-neutral-800/50 p-4 flex gap-3 items-start text-xs text-neutral-400">
                                <Clock className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                                <div>
                                    <strong className="text-white block font-black uppercase text-[10px] tracking-wider mb-0.5">Como funcionam os Cookies na Kiwify?</strong>
                                    Os cookies de indicação duram <strong className="text-yellow-500">180 dias</strong>. A comissão é atribuída pelo modelo de <strong className="text-white">Último Clique</strong> (se o cliente clicar em múltiplos links, quem mandou o último link leva a comissão).
                                </div>
                            </div>
                        </div>

                        {/* Copywriting swipes */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="border-b border-neutral-800 pb-4">
                                <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                                    <Layers size={18} className="text-yellow-500" /> Legendas e Copys Prontas (Abordagem de Alto Impacto)
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">
                                    Copie os scripts de vendas abaixo. Ao clicar em copiar, o link personalizado gerado acima será anexado automaticamente no texto.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {SWIPES.map(swipe => (
                                    <div key={swipe.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                                        <div className="bg-[#0e0e0e] px-4 py-3 border-b border-neutral-800 flex justify-between items-center">
                                            <span className="text-xs font-bold text-white tracking-tight">{swipe.title}</span>
                                            <button
                                                onClick={() => handleCopySwipe(swipe.text, swipe.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                    copiedSwipeId === swipe.id 
                                                        ? 'bg-green-600 text-white' 
                                                        : 'bg-black text-neutral-300 hover:text-white border border-neutral-800'
                                                }`}
                                            >
                                                {copiedSwipeId === swipe.id ? (
                                                    <>
                                                        <Check size={12} className="stroke-[3]" /> Copiado com Link!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} /> Copiar Texto
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="p-4 text-xs text-neutral-400 font-medium whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar bg-neutral-950 font-mono">
                                            {swipe.text.replace("[LINK-GERADO-ABAIXO]", generatedLink)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Interactive creatives downloads grid - HIGH DESIGN */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="border-b border-neutral-800 pb-4">
                                <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                                    <Award size={18} className="text-yellow-500" /> Criativos Visuais de Alta Performance (Feed e Stories)
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">Preparamos representações gráficas reais dos criativos. Baixe para usar nas suas redes sociais.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { 
                                        title: 'Feed: Comparativo Duro vs Macio', 
                                        size: '1080x1080px', 
                                        type: 'Feed',
                                        renderPreview: () => (
                                            <div className="w-full h-36 bg-gradient-to-b from-[#111] to-black rounded-xl border border-neutral-800/80 flex flex-col justify-between p-3.5 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full blur-xl" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[7px] font-black text-red-500 tracking-wider">MOTO DURA?</span>
                                                    <span className="text-[7px] font-black text-yellow-500 tracking-wider">CONFORTO E CURVA</span>
                                                </div>
                                                {/* Shock absorber vector graphic */}
                                                <div className="flex justify-center items-center gap-6 my-1.5">
                                                    <div className="flex flex-col items-center bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">
                                                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M12 2v20M8 8h8M9 12h6M10 16h4" />
                                                        </svg>
                                                        <span className="text-[6px] font-black text-red-400 mt-1">DE FÁBRICA</span>
                                                    </div>
                                                    <span className="text-[8px] font-bold text-neutral-600">VS</span>
                                                    <div className="flex flex-col items-center bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded">
                                                        <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                            <path d="M12 2v20M8 5h8M8 9h8M8 13h8M8 17h8" strokeDasharray="1 1" />
                                                        </svg>
                                                        <span className="text-[6px] font-black text-yellow-400 mt-1">AJUSTADA</span>
                                                    </div>
                                                </div>
                                                <div className="text-[8px] font-black text-white uppercase text-center tracking-tight">Regule em minutos e mude seu tempo</div>
                                            </div>
                                        )
                                    },
                                    { 
                                        title: 'Stories: Últimas 7 Vagas VIP', 
                                        size: '1080x1920px', 
                                        type: 'Stories',
                                        renderPreview: () => (
                                            <div className="w-full h-36 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black rounded-xl border border-neutral-800/80 flex flex-col justify-between p-3.5 relative overflow-hidden">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-yellow-500/5 rounded-full blur-xl" />
                                                <div className="text-center">
                                                    <span className="bg-yellow-500 text-black font-black uppercase text-[6px] px-1.5 py-0.5 rounded tracking-widest">OFERTA LIMITADA</span>
                                                </div>
                                                <div className="text-center space-y-0.5">
                                                    <span className="text-[12px] font-mono font-black text-yellow-500">65% OFF</span>
                                                    <span className="text-[6px] text-neutral-400 block font-bold uppercase tracking-wider">RESTAM APENAS 7 VAGAS</span>
                                                </div>
                                                <div className="flex justify-center gap-1 font-mono text-[7px] text-neutral-500">
                                                    <span className="bg-neutral-950 px-1 py-0.5 rounded border border-neutral-900">02h</span>
                                                    <span>:</span>
                                                    <span className="bg-neutral-950 px-1 py-0.5 rounded border border-neutral-900">45m</span>
                                                    <span>:</span>
                                                    <span className="bg-neutral-950 px-1 py-0.5 rounded border border-neutral-900">12s</span>
                                                </div>
                                            </div>
                                        )
                                    },
                                    { 
                                        title: 'Feed: Módulos do Curso', 
                                        size: '1080x1080px', 
                                        type: 'Feed',
                                        renderPreview: () => (
                                            <div className="w-full h-36 bg-[#0a0a0a] rounded-xl border border-neutral-800/80 flex flex-col justify-between p-3.5 relative overflow-hidden">
                                                <div className="space-y-1">
                                                    <span className="text-[6px] font-black text-yellow-500 uppercase tracking-widest">W-TECH CRONOGRAMA</span>
                                                    <h5 className="text-[8px] font-black text-white uppercase">O que você vai dominar:</h5>
                                                </div>
                                                <div className="space-y-1.5 my-1">
                                                    <div className="flex items-center gap-1.5 text-[6px] text-neutral-400">
                                                        <CheckCircle size={8} className="text-yellow-500" />
                                                        <span>Módulo 1: Sag Estático e Dinâmico</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[6px] text-neutral-400">
                                                        <CheckCircle size={8} className="text-yellow-500" />
                                                        <span>Módulo 2: Cliques de Compressão</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[6px] text-neutral-400">
                                                        <CheckCircle size={8} className="text-yellow-500" />
                                                        <span>Módulo 3: Retorno e Hidráulica</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[5px] text-neutral-600 font-mono">100% Online + Suporte individual</span>
                                                </div>
                                            </div>
                                        )
                                    },
                                    { 
                                        title: 'Stories: Suporte WhatsApp VIP', 
                                        size: '1080x1920px', 
                                        type: 'Stories',
                                        renderPreview: () => (
                                            <div className="w-full h-36 bg-gradient-to-b from-[#0b0f0a] to-[#050505] rounded-xl border border-neutral-800/80 flex flex-col justify-between p-3.5 relative overflow-hidden">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[6px] text-green-500 font-bold uppercase tracking-widest">Fale com o Instrutor</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                </div>
                                                <div className="space-y-1.5 my-2">
                                                    <div className="bg-neutral-900 border border-neutral-800/80 p-2 rounded-lg max-w-[85%] text-[6px] text-neutral-300">
                                                        "Vinícius, regulei o sag da CRF e sumiu a batida de fim de curso!"
                                                    </div>
                                                    <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg max-w-[85%] ml-auto text-[6px] text-green-400 text-right">
                                                        "Show! Agora ajusta o clique de retorno..."
                                                    </div>
                                                </div>
                                                <div className="text-center text-[7px] text-neutral-400 font-bold">Acompanhamento de Perto</div>
                                            </div>
                                        )
                                    },
                                    { 
                                        title: 'Feed: Mockup do Treinamento', 
                                        size: '1080x1080px', 
                                        type: 'Feed',
                                        renderPreview: () => (
                                            <div className="w-full h-36 bg-gradient-to-r from-neutral-950 to-neutral-900 rounded-xl border border-neutral-800/80 flex flex-col justify-between p-3.5 relative overflow-hidden">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl" />
                                                <span className="text-[6px] font-black text-neutral-400 uppercase tracking-widest">CURSO 100% DIGITAL</span>
                                                <div className="flex justify-center items-center my-2">
                                                    {/* Laptop/phone overlay mock */}
                                                    <div className="w-16 h-10 bg-black rounded border border-neutral-800 flex items-center justify-center relative shadow-lg">
                                                        <svg className="w-4 h-4 text-yellow-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <rect width="20" height="14" x="2" y="3" rx="2" />
                                                            <line x1="8" x2="16" y1="21" y2="21" />
                                                            <line x1="12" x2="12" y1="17" y2="21" />
                                                        </svg>
                                                        <div className="absolute bottom-0 right-[-10px] w-6 h-10 bg-[#090909] rounded border border-neutral-800 flex items-center justify-center">
                                                            <div className="w-1.5 h-1 bg-black rounded-full absolute top-1" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[7px] font-black text-center text-white uppercase tracking-tight">Estude na pista pelo celular</div>
                                            </div>
                                        )
                                    },
                                    { 
                                        title: 'Stories: O que é o Sag Traseiro?', 
                                        size: '1080x1920px', 
                                        type: 'Stories',
                                        renderPreview: () => (
                                            <div className="w-full h-36 bg-[#000] rounded-xl border border-neutral-800/80 flex flex-col justify-between p-3.5 relative overflow-hidden">
                                                <div className="flex justify-between items-center text-[6px] text-yellow-500 font-bold uppercase tracking-wider">
                                                    <span>DICA RÁPIDA</span>
                                                    <span>SAG CORRETO</span>
                                                </div>
                                                {/* Rear wheel and shock measurement vector mock */}
                                                <div className="flex justify-center items-center my-1.5">
                                                    <svg className="w-10 h-10 text-neutral-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="50" cy="50" r="30" strokeDasharray="3 3" />
                                                        <line x1="50" y1="10" x2="50" y2="90" stroke="yellow" strokeWidth="2" />
                                                        <path d="M45 20l5-10 5 10M45 80l5 10 5-10" stroke="yellow" strokeWidth="2" />
                                                    </svg>
                                                    <span className="text-[7px] font-mono text-yellow-500 font-bold ml-2">35mm</span>
                                                </div>
                                                <div className="text-[7px] text-neutral-400 font-bold text-center">Menos que isso a moto joga traseira!</div>
                                            </div>
                                        )
                                    }
                                ].map((creative, idx) => (
                                    <div key={idx} className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col justify-between p-4 relative group hover:border-yellow-500/30 transition-all duration-300">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full inline-block">
                                                    {creative.type}
                                                </span>
                                                <span className="text-[9px] text-neutral-500 font-mono">{creative.size}</span>
                                            </div>
                                            
                                            {/* Beautiful CSS Preview representation */}
                                            {creative.renderPreview()}

                                            <h4 className="text-xs font-bold text-white leading-snug group-hover:text-yellow-500 transition-colors">
                                                {creative.title}
                                            </h4>
                                        </div>
                                        
                                        <button className="w-full mt-4 bg-black border border-neutral-800 text-neutral-300 hover:text-black hover:bg-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm">
                                            <Download size={12} /> Baixar Ativo
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DEVELOPER HUB: KIWIFY WEBHOOK INTEGRATION */}
                        <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                            <div className="border-b border-neutral-800 pb-5">
                                <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                                    <Code size={20} className="text-yellow-500" /> Integração Técnica: Webhooks & API
                                </h3>
                                <p className="text-xs text-neutral-400 mt-1">Quer automatizar sua entrega, rastrear em tempo real no seu CRM ou rodar scripts de funil? Configure Webhooks.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-4 text-xs text-neutral-400 leading-relaxed">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                        <Terminal size={14} className="text-yellow-500" /> Fluxo de Integração
                                    </h4>
                                    <p>
                                        A Kiwify permite cadastrar URLs de webhook que disparam alertas instantâneos no momento exato em que uma compra é aprovada ou gerada.
                                    </p>
                                    <div className="space-y-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
                                        <div className="flex gap-2">
                                            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-black px-1.5 py-0.5 rounded h-max">1</span>
                                            <p className="text-[11px]">Vá no painel Kiwify {"->"} Aplicativos {"->"} Webhooks.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-black px-1.5 py-0.5 rounded h-max">2</span>
                                            <p className="text-[11px]">Crie um webhook para o evento "Compra Aprovada".</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-black px-1.5 py-0.5 rounded h-max">3</span>
                                            <p className="text-[11px]">Caso utilize um webhook nosso para dashboard de afiliados, nos forneça o seu Token Secreto.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Mock Terminal */}
                                <div className="bg-[#050505] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                                    <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-800 flex justify-between items-center">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                                        </div>
                                        <span className="text-[9px] font-mono text-neutral-500">payload_example.json</span>
                                    </div>
                                    <div className="p-4 font-mono text-[9px] text-neutral-400 overflow-x-auto select-all max-h-56">
                                        {/* Highlighted payload */}
                                        <pre className="leading-5">
                                            <span className="text-neutral-500">{`{`}</span><br />
                                            {`  `}
                                            <span className="text-yellow-500">"event"</span>: <span className="text-green-400">"ORDER_APPROVED"</span>,<br />
                                            {`  `}
                                            <span className="text-yellow-500">"order_status"</span>: <span className="text-green-400">"approved"</span>,<br />
                                            {`  `}
                                            <span className="text-yellow-500">"payment_method"</span>: <span className="text-green-400">"pix"</span>,<br />
                                            {`  `}
                                            <span className="text-yellow-500">"total_amount"</span>: <span className="text-blue-400">347.00</span>,<br />
                                            {`  `}
                                            <span className="text-yellow-500">"commission"</span>: <span className="text-neutral-500">{`{`}</span><br />
                                            {`    `}
                                            <span className="text-yellow-500">"amount"</span>: <span className="text-blue-400">104.10</span>,<br />
                                            {`    `}
                                            <span className="text-yellow-500">"percentage"</span>: <span className="text-blue-400">30</span><br />
                                            {`  `}
                                            <span className="text-neutral-500">{`}`}</span>,<br />
                                            {`  `}
                                            <span className="text-yellow-500">"affiliate"</span>: <span className="text-neutral-500">{`{`}</span><br />
                                            {`    `}
                                            <span className="text-yellow-500">"email"</span>: <span className="text-green-400">"seu-email@afiliados.com"</span><br />
                                            {`  `}
                                            <span className="text-neutral-500">{`}`}</span><br />
                                            <span className="text-neutral-500">{`}`}</span>
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Step-by-step Sales Guide & VIP WhatsApp link */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        {/* VIP WhatsApp Group widget */}
                        <div className="bg-gradient-to-br from-green-950/20 to-neutral-950 border border-green-500/30 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl" />
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black shadow-lg shadow-green-500/20 shrink-0">
                                    <MessageSquare size={22} fill="black" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm text-white uppercase tracking-tight">Grupo VIP de Afiliados</h4>
                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider block mt-0.5">Suporte Direto</span>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                Entre no grupo oficial dos parceiros de vendas da W-Tech. Receba atualizações de estoque, campanhas exclusivas e suporte individual de prospecção.
                            </p>
                            <a 
                                href="https://wa.me/5512997146957"
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:from-green-400 hover:to-green-500 transition-all active:scale-[0.98] shadow-lg shadow-green-500/10 text-center"
                            >
                                Acessar Grupo VIP <ArrowRight size={14} />
                            </a>
                        </div>

                        {/* Step-by-step Quick Sales Guide */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
                                <BookOpen size={16} className="text-yellow-500" /> Manual do Parceiro W-Tech
                            </h3>

                            <div className="space-y-4">
                                {[
                                    {
                                        step: '01',
                                        title: 'Onboarding & Afiliação',
                                        text: 'Acesse o convite da Kiwify enviado pelo produtor W-Tech e confirme a afiliação para liberar seu painel.'
                                    },
                                    {
                                        step: '02',
                                        title: 'Copie seu Checkout',
                                        text: 'Copie o link seguro do checkout promocional (R$ 347,00) na aba de links da Kiwify.'
                                    },
                                    {
                                        step: '03',
                                        title: 'Insira no Rastreamento',
                                        text: 'Use o gerador de link desta página para anexar a origem (Ex: instagram) e acompanhar de onde vem cada clique.'
                                    },
                                    {
                                        step: '04',
                                        title: 'Aborde Pilotos',
                                        text: 'Foque em grupos de motocross, trilha e fóruns. Quebre objeções tirando dúvidas técnicas simples e oferte o lote promocional.'
                                    }
                                ].map((manual, idx) => (
                                    <div key={idx} className="flex gap-3.5 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80 hover:border-yellow-500/10 transition-colors">
                                        <span className="text-sm font-black text-yellow-500 font-sans tracking-tight shrink-0">{manual.step}</span>
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-bold text-white">{manual.title}</h4>
                                            <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">{manual.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ADMIN AFFILIATE GESTION LIST */}
            {activeTab === 'admin' && !publicMode && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-200">
                    
                    {/* Search & Filters */}
                    <div className="p-4 md:p-6 border-b border-neutral-800 bg-neutral-950 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="w-full md:w-80 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <input 
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                                placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto text-xs text-neutral-400 font-bold">
                            <span>Total de parceiros ativos: <span className="text-yellow-500 font-black">{filteredAffiliates.length}</span></span>
                        </div>
                    </div>

                    {/* Affiliates List Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-950 text-[9px] font-black uppercase tracking-wider text-neutral-500">
                                    <th className="p-4">Nome do Afiliado</th>
                                    <th className="p-4">Razão Social / Cadastro</th>
                                    <th className="p-4">E-mail</th>
                                    <th className="p-4">CPF / CNPJ</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-900">
                                {filteredAffiliates.map((aff, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-900/30 transition-colors text-xs font-medium text-neutral-300">
                                        <td className="p-4 font-bold text-white">{aff.name}</td>
                                        <td className="p-4 text-neutral-400">{aff.company || '-'}</td>
                                        <td className="p-4 font-mono text-[11px] text-yellow-500/80">{aff.email}</td>
                                        <td className="p-4 font-mono">{aff.doc || '-'}</td>
                                        <td className="p-4">
                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase px-2.5 py-0.5 rounded tracking-wide flex items-center gap-1.5 w-max">
                                                <CheckCircle size={10} /> Ativo
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {filteredAffiliates.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-neutral-500 font-medium">
                                            <Users className="mx-auto mb-3 opacity-20" size={48} />
                                            <p className="text-sm">Nenhum afiliado encontrado.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AffiliatesManagerView;
