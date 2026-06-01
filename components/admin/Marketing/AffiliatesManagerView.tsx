import React, { useState, useEffect } from 'react';
import { 
    Users, Search, DollarSign, Award, Download, Copy, Check, MessageSquare, 
    Share2, ArrowRight, ShieldCheck, Flame, BookOpen, Layers, CheckCircle
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
    const [activeTab, setActiveTab] = useState<'admin' | 'portal'>('portal'); // Render resource portal by default
    const [searchTerm, setSearchTerm] = useState('');
    
    // Portal Specific states
    const [monthlySales, setMonthlySales] = useState(15);
    const [copiedSwipeId, setCopiedSwipeId] = useState<number | null>(null);

    useEffect(() => {
        if (publicMode) {
            setActiveTab('portal');
        }
    }, [publicMode]);

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
        if (earnings >= 5000) return { label: '🔥 W-Tech Platinum Elite', color: 'from-amber-400 to-yellow-600' };
        if (earnings >= 2500) return { label: '🌟 W-Tech Gold Partner', color: 'from-yellow-400 to-amber-500' };
        if (earnings >= 1000) return { label: '✨ W-Tech Silver Partner', color: 'from-slate-300 to-slate-500' };
        return { label: '🏁 W-Tech Bronze Affiliate', color: 'from-orange-400 to-orange-600' };
    };

    const earningLevel = getEarningLevel(estimatedEarnings);

    // Copywriting swipes data
    const SWIPES = [
        {
            id: 1,
            title: "📱 Script WhatsApp (Abordagem Direta)",
            text: "Olá! Tudo bem? Vi que você é piloto e curte acelerar forte. Cara, o Vinícius da W-Tech liberou um lote super promocional do novo Curso Online de Regulagem de Suspensão Para Pilotos.\n\nEles estão fechando as últimas vagas de R$ 997 por apenas R$ 347. É a oportunidade perfeita para você mesmo aprender a regular o clique da sua moto e ganhar muito mais segurança na pista ou trilha.\n\nCorre lá e dá uma olhada nas vagas restantes nesse link oficial:\n\n👉 [SEU-LINK-DE-AFILIADO]"
        },
        {
            id: 2,
            title: "📸 Legenda para Stories / Feed (Gatilho de Urgência)",
            text: "🚨🚨 ÚLTIMA CHAMADA: Restam APENAS 7 VAGAS com 65% de desconto no Curso de Suspensão W-Tech! 🚨🚨\n\nChega de andar com a moto dura, jogando de lado ou sem tração traseira nas curvas. Aprenda o segredo que os pilotos profissionais usam para ajustar cliques, sag e hidráulica de forma descomplicada.\n\nDe R$ 997,00 por apenas R$ 347,00 (ou parcelado no cartão).\n\n👉 Clique no link da minha bio e garanta seu lugar antes que o preço retorne ao valor original!"
        },
        {
            id: 3,
            title: "💬 Script Instagram Direct (Quebra de Objeções)",
            text: "E aí! Beleza? Cara, vi seu comentário no post de suspensões. Se você tem dúvida sobre se o curso vale a pena ou se é difícil, te garanto: o método da W-Tech é 100% focado na prática para pilotos normais ajustarem a moto em casa.\n\nEles dão garantia de 7 dias e suporte individual para tirar dúvidas de clique. E como restam poucas vagas do preço promocional de R$ 347, vale super a pena garantir agora antes do reajuste.\n\nSe quiser dar uma olhada na página de apresentação, o link seguro é esse:\n\n👉 [SEU-LINK-DE-AFILIADO]"
        }
    ];

    const handleCopySwipe = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setCopiedSwipeId(id);
        setTimeout(() => setCopiedSwipeId(null), 2000);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-white bg-black min-h-screen">
            {/* Header section with theme colors */}
            <div className="bg-gradient-to-br from-neutral-900 to-black p-6 rounded-2xl border border-yellow-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                                W-Tech Network
                            </span>
                            <span className="text-yellow-500/80 text-xs font-bold tracking-tight">Parceiros Afiliados</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                            <Share2 className="text-yellow-500" size={28} /> Central de Afiliados
                        </h2>
                        <p className="text-sm text-gray-400 font-medium">
                            Monitore sua rede de parceiros comerciais e disponibilize criativos de conversão extrema.
                        </p>
                    </div>

                    {/* Navigation tabs - Hidden in public mode */}
                    {!publicMode && (
                        <div className="bg-neutral-900 p-1 rounded-xl border border-neutral-800 flex">
                            <button 
                                onClick={() => setActiveTab('portal')}
                                className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeTab === 'portal' 
                                        ? 'bg-yellow-500 text-black font-extrabold shadow' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Flame size={14} /> Portal de Criativos
                            </button>
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeTab === 'admin' 
                                        ? 'bg-yellow-500 text-black font-extrabold shadow' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Users size={14} /> Gestão de Afiliados ({AFFILIATES_DATA.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* TAB CONTENT: AFFILIATES RESOURCE PORTAL */}
            {activeTab === 'portal' && (
                <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    
                    {/* Left & Middle columns: Earnings simulator and Sales Swipes */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Interactive Commissions Calculator */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl" />
                            <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-6">
                                <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                                    <DollarSign size={18} className="text-green-500" /> Simulador de Comissões Líquidas
                                </h3>
                                <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                                    Comissão: 30%
                                </span>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-center">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                                        <span>META DE VENDAS MENSAIS</span>
                                        <span className="text-white text-base font-mono">{monthlySales} vendas</span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="1"
                                        max="100"
                                        className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                                        value={monthlySales}
                                        onChange={e => setMonthlySales(parseInt(e.target.value))}
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                                        <span>1 Venda</span>
                                        <span>50 Vendas</span>
                                        <span>100 Vendas</span>
                                    </div>
                                </div>

                                <div className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-xl flex flex-col items-center text-center space-y-2">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        Seu ganho mensal estimado:
                                    </span>
                                    <span className="text-3xl font-black text-green-400 font-mono">
                                        R$ {estimatedEarnings.toFixed(2)}
                                    </span>
                                    <span className={`bg-gradient-to-r ${earningLevel.color} text-black text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider mt-1`}>
                                        {earningLevel.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Copywriting swipes */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="border-b border-neutral-800 pb-4">
                                <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                                    <Layers size={18} className="text-yellow-500" /> Legendas e Copys Prontas (Copywriting Swipes)
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Copie os scripts de abordagem abaixo e cole no seu WhatsApp, Direct do Instagram ou Stories. Substitua o link pelo seu ID de afiliado da Kiwify.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {SWIPES.map(swipe => (
                                    <div key={swipe.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                                        <div className="bg-neutral-900/80 px-4 py-3 border-b border-neutral-800 flex justify-between items-center">
                                            <span className="text-xs font-bold text-white tracking-tight">{swipe.title}</span>
                                            <button
                                                onClick={() => handleCopySwipe(swipe.text, swipe.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                    copiedSwipeId === swipe.id 
                                                        ? 'bg-green-600 text-white' 
                                                        : 'bg-black text-gray-300 hover:text-white border border-neutral-800'
                                                }`}
                                            >
                                                {copiedSwipeId === swipe.id ? (
                                                    <>
                                                        <Check size={12} className="stroke-[3]" /> Copiado!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} /> Copiar Texto
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="p-4 text-xs text-gray-400 font-medium whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar bg-neutral-950">
                                            {swipe.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Interactive creatives downloads grid */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
                            <div className="border-b border-neutral-800 pb-4 flex justify-between items-center">
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
                                        <Award size={18} className="text-yellow-500" /> Criativos de Imagem e Vídeo para Lançamento
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">Imagens para Feed e Stories otimizadas para anúncios e posts orgânicos.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { title: 'Feed: Comparativo Duro vs Macio', size: '1080x1080px', type: 'Feed' },
                                    { title: 'Stories: Últimas 7 Vagas Promocionais', size: '1080x1920px', type: 'Stories' },
                                    { title: 'Feed: Cronograma Completo Aulas', size: '1080x1080px', type: 'Feed' },
                                    { title: 'Stories: Chamada Suporte Técnico', size: '1080x1920px', type: 'Stories' },
                                    { title: 'Feed: Mockup do Curso Celular', size: '1080x1080px', type: 'Feed' },
                                    { title: 'Stories: Vídeo Ajuste de Sag Traseiro', size: '1080x1920px', type: 'Stories' }
                                ].map((creative, idx) => (
                                    <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col justify-between p-4 relative group hover:border-yellow-500/30 transition-all">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full inline-block">
                                                {creative.type}
                                            </span>
                                            <h4 className="text-xs font-bold text-white leading-snug group-hover:text-yellow-500 transition-colors">
                                                {creative.title}
                                            </h4>
                                            <span className="text-[10px] text-gray-500 block font-mono">Resolução: {creative.size}</span>
                                        </div>
                                        <button className="w-full mt-4 bg-black border border-neutral-800 text-gray-300 hover:text-black hover:bg-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all">
                                            <Download size={12} /> Baixar Ativo
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right side: Step-by-step Sales Guide & VIP WhatsApp link */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* VIP WhatsApp Group widget */}
                        <div className="bg-gradient-to-br from-green-950/20 to-neutral-950 border border-green-500/30 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black shadow-lg shadow-green-500/20 shrink-0">
                                    <MessageSquare size={22} fill="black" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm text-white uppercase tracking-tight">Grupo VIP de Afiliados</h4>
                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider block mt-0.5">Suporte em Tempo Real</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                Entre no grupo oficial do WhatsApp dos afiliados para receber materiais exclusivos, datas de webinários e suporte de prospecção do Vinícius Saldanha.
                            </p>
                            <a 
                                href="https://wa.me/5512997146957"
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:from-green-400 hover:to-green-500 transition-all active:scale-95 shadow-lg shadow-green-500/10 block text-center"
                            >
                                Entrar no Grupo VIP <ArrowRight size={14} />
                            </a>
                        </div>

                        {/* Step-by-step Quick Sales Guide */}
                        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
                                <BookOpen size={16} className="text-yellow-500" /> Manual Prático do Afiliado
                            </h3>

                            <div className="space-y-4">
                                {[
                                    {
                                        step: '01',
                                        title: 'Cadastro no Kiwify',
                                        text: 'Acesse a Kiwify, crie sua conta de produtor/afiliado e aceite o convite enviado pelo email de produtor da W-Tech para se afiliar.'
                                    },
                                    {
                                        step: '02',
                                        title: 'Pegue seu Link Seguro',
                                        text: 'Na aba "Produtos que Promovo", localize o "Curso Regulagem de Suspensão Para Pilotos" e copie o seu link único de checkout.'
                                    },
                                    {
                                        step: '03',
                                        title: 'Aborde Pilotos (Direct/WhatsApp)',
                                        text: 'Aborde pilotos em grupos de motocross, trilha, trackdays e redes sociais. Ofereça conteúdo gratuito da W-Tech para quebrar o gelo.'
                                    },
                                    {
                                        step: '04',
                                        title: 'Quebra de Objeção com Escassez',
                                        text: 'Quando o cliente demonstrar interesse, avise que as últimas 7 vagas de desconto máximo lote VIP estão se esgotando e envie o link.'
                                    }
                                ].map((manual, idx) => (
                                    <div key={idx} className="flex gap-3 bg-neutral-900/60 p-4 rounded-xl border border-neutral-800">
                                        <span className="text-base font-black text-yellow-500 font-sans tracking-tight shrink-0">{manual.step}</span>
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-bold text-white">{manual.title}</h4>
                                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{manual.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ADMIN AFFILIATE GESTION LIST */}
            {activeTab === 'admin' && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200">
                    
                    {/* Search & Filters */}
                    <div className="p-4 md:p-6 border-b border-neutral-800 bg-neutral-950 flex flex-col md:flex-row gap-3 justify-between items-center">
                        <div className="w-full md:w-72 relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-yellow-500 transition-all"
                                placeholder="Buscar por nome, email ou documento..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto text-xs text-gray-400 font-bold">
                            <span>Mostrando <span className="text-yellow-500 font-black">{filteredAffiliates.length}</span> afiliados ativos</span>
                        </div>
                    </div>

                    {/* Affiliates List Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-950 text-[9px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="p-4">Nome do Afiliado</th>
                                    <th className="p-4">Razão Social / Cadastro</th>
                                    <th className="p-4">E-mail</th>
                                    <th className="p-4">CPF / CNPJ</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-900">
                                {filteredAffiliates.map((aff, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-900/40 transition-colors text-xs font-medium text-gray-300">
                                        <td className="p-4 font-bold text-white">{aff.name}</td>
                                        <td className="p-4 text-gray-400">{aff.company || '-'}</td>
                                        <td className="p-4 font-mono text-[11px] text-yellow-500/80">{aff.email}</td>
                                        <td className="p-4 font-mono">{aff.doc || '-'}</td>
                                        <td className="p-4">
                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide flex items-center gap-1.5 w-max">
                                                <CheckCircle size={10} /> Ativo
                                            </span>
                                        </td>
                                    </tr>
                                ))}

                                {filteredAffiliates.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-gray-500 font-medium">
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
