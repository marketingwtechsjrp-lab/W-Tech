import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GridVignetteBackground } from '../../ui/vignette-grid-background';
import { 
    Users, Search, DollarSign, Award, Download, Copy, Check, MessageSquare, 
    Share2, ArrowRight, ShieldCheck, Flame, BookOpen, Layers, CheckCircle,
    ExternalLink, Coins, Sparkles, AlertCircle, Terminal, HelpCircle, Eye,
    Link, Code, Clock, Lock, ChevronRight, FolderOpen, TrendingUp,
    Bike, Mountain, Wrench, Globe, Star, Monitor, Play, CalendarDays, ChevronDown, ArrowLeft, Zap, Gauge
} from 'lucide-react';
import { Marquee } from '../../ui/marquee';
import { supabase } from '../../../lib/supabaseClient';

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

const FAQItem = ({ q, a }: { q: string; a: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-white/10 bg-zinc-900/50 rounded-2xl overflow-hidden hover:border-[#D4AF37]/40 transition-colors">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left group"
            >
                <span className="font-bold text-gray-200 text-xs md:text-sm group-hover:text-white transition-colors duration-150">{q}</span>
                <div className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-[#D4AF37]' : 'text-gray-500'}`}>
                    <ChevronDown size={18} />
                </div>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="px-5 pb-5 text-neutral-400 text-xs leading-relaxed font-medium">{a}</div>
            </div>
        </div>
    );
};

const AffiliatesManagerView = ({ publicMode = false }: { publicMode?: boolean }) => {
    const [activeTab, setActiveTab] = useState<'admin' | 'portal'>('portal');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Portal states
    const [monthlySales, setMonthlySales] = useState(15);
    const [copiedSwipeId, setCopiedSwipeId] = useState<number | null>(null);
    const [copiedElementId, setCopiedElementId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    // Config states
    const [driveUrl, setDriveUrl] = useState('https://drive.google.com/drive/folders/1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A1A');
    const [affiliates, setAffiliates] = useState<Affiliate[]>(AFFILIATES_DATA);
    const [loadingAffiliates, setLoadingAffiliates] = useState(false);
    
    // Link tracking generator states
    const [affiliateLink, setAffiliateLink] = useState('https://pay.kiwify.com.br/19v4nIa');
    const [utmSource, setUtmSource] = useState('instagram_bio');
    const [generatedLink, setGeneratedLink] = useState('');

    // Portal structural states
    const [showTools, setShowTools] = useState(false);

    // Video VSL states
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [videoActivated, setVideoActivated] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    const handlePlayVideo = () => {
        setVideoActivated(true);
        requestAnimationFrame(() => {
            if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => { });
                setVideoPlaying(true);
            }
        });
    };

    useEffect(() => {
        if (publicMode) {
            setActiveTab('portal');
        }
    }, [publicMode]);

    useEffect(() => {
        const fetchDriveUrl = async () => {
            try {
                const { data } = await supabase
                    .from('SITE_Config')
                    .select('value')
                    .eq('key', 'affiliates_drive_url')
                    .single();
                if (data && data.value) {
                    setDriveUrl(data.value);
                }
            } catch (e) {
                console.error("Error fetching drive url:", e);
            }
        };
        fetchDriveUrl();
    }, []);

    useEffect(() => {
        if (activeTab === 'admin' && !publicMode) {
            const fetchKiwifyAffiliates = async () => {
                setLoadingAffiliates(true);
                try {
                    const { data } = await supabase.functions.invoke('get-kiwify-affiliates');
                    if (data && data.success && data.affiliates && data.affiliates.length > 0) {
                        const mapped = data.affiliates.map((aff: any) => ({
                            name: aff.name || aff.full_name || '',
                            email: aff.email || '',
                            company: aff.company_name || '',
                            doc: aff.cpf_cnpj || '',
                            status: aff.status || 'active'
                        }));
                        setAffiliates(mapped);
                    }
                } catch (e) {
                    console.error("Error fetching Kiwify affiliates:", e);
                } finally {
                    setLoadingAffiliates(false);
                }
            };
            fetchKiwifyAffiliates();
        }
    }, [activeTab, publicMode]);

    // Live update for tracking link generator
    useEffect(() => {
        try {
            const url = new URL(affiliateLink);
            url.searchParams.set('src', utmSource);
            setGeneratedLink(url.toString());
        } catch (e) {
            setGeneratedLink(`${affiliateLink}${affiliateLink.includes('?') ? '&' : '?'}src=${utmSource}`);
        }
    }, [affiliateLink, utmSource]);

    // Filtered affiliates for Admin view
    const filteredAffiliates = affiliates.filter(aff => 
        (aff.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (aff.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (aff.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (aff.doc || '').includes(searchTerm)
    );

    // Sales calculator values
    const coursePrice = 347.00;
    const commissionRate = 0.20;
    const commissionPerSale = coursePrice * commissionRate; // R$ 69.40
    const estimatedEarnings = monthlySales * commissionPerSale;

    const getEarningLevel = (earnings: number) => {
        if (earnings >= 10000) return { label: '🏆 W-Tech Black Legend', color: 'from-[#D4AF37] via-amber-500 to-[#D4AF37]', text: 'text-black font-black' };
        if (earnings >= 5000) return { label: '🔥 W-Tech Platinum Elite', color: 'from-neutral-900 via-[#D4AF37] to-neutral-900', text: 'text-[#D4AF37] font-black border border-[#D4AF37]/30' };
        if (earnings >= 2500) return { label: '🌟 W-Tech Gold Partner', color: 'from-[#D4AF37] to-amber-500', text: 'text-black font-black' };
        if (earnings >= 1000) return { label: '✨ W-Tech Silver Partner', color: 'from-zinc-300 to-zinc-500', text: 'text-black font-bold' };
        return { label: '🏁 W-Tech Bronze Affiliate', color: 'from-amber-700 to-amber-900', text: 'text-white' };
    };

    const earningLevel = getEarningLevel(estimatedEarnings);

    // Copywriting swipes data
    const SWIPES = [
        {
            id: 1,
            title: "📱 WhatsApp (Abordagem Direta para Pilotos)",
            text: "Olá! Tudo bem? Vi que você é piloto e está sempre acelerando forte. Cara, o Alex da W-Tech liberou uma oportunidade única do novo Curso Online de Regulagem de Suspensão Para Pilotos.\n\nEles estão fechando as últimas vagas com desconto exclusivo: de R$ 997 por apenas R$ 347. É o melhor investimento para aprender a regular cliques, sag e hidráulica em casa, ganhando segurança e tempo de volta.\n\nConfere os detalhes na página oficial deles:\n\n👉 [LINK-GERADO-ABAIXO]"
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
        const parsedText = text.replace("[LINK-GERADO-ABAIXO]", generatedLink);
        navigator.clipboard.writeText(parsedText);
        setCopiedSwipeId(id);
        setTimeout(() => setCopiedSwipeId(null), 2000);
    };

    // Entrance animations mapping
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
        }
    };

    // Visual assets data directly linked from the Sales LP
    const CREATIVES = [
        {
            title: 'Banner Hero Oficial (Desktop)',
            size: '1920x1280px',
            type: 'Hero Web',
            category: 'Capa & Banners',
            image: '/hero-desktop-alex.webp',
            previewText: 'Alex Regulando Suspensão'
        },
        {
            title: 'Banner Hero Oficial (Mobile)',
            size: '1080x1920px',
            type: 'Hero Mobile',
            category: 'Capa & Banners',
            image: '/hero-mobile-alex.webp',
            previewText: 'Alex Regulando Suspensão'
        },
        {
            title: 'Capa do Vídeo de Vendas (VSL)',
            size: '1920x1080px',
            type: 'Thumbnail',
            category: 'Capa & Banners',
            image: '/images/vsl-thumbnail.webp',
            previewText: 'Assista a VSL W-Tech'
        },
        {
            title: 'Banner Paschoalin (Módulo Bônus)',
            size: '1920x1080px',
            type: 'Banner',
            category: 'Capa & Banners',
            image: '/paschoalin.webp',
            previewText: 'Rafa Paschoalin - Prática na Pista'
        },
        {
            title: 'Banner Alex Crepaldi (Mentor)',
            size: '1920x1080px',
            type: 'Banner',
            category: 'Capa & Banners',
            image: '/images/alex-webp.webp',
            previewText: 'Alex Crepaldi W-Tech'
        },
        {
            title: 'Card Módulo 1: Boas-Vindas & Métodos',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO.webp',
            previewText: 'Módulo 1'
        },
        {
            title: 'Card Módulo 2: Ergonomia - Cockpit',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-1.webp',
            previewText: 'Módulo 2'
        },
        {
            title: 'Card Módulo 3: Equilíbrio',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-2.webp',
            previewText: 'Módulo 3'
        },
        {
            title: 'Card Módulo 4: Molas & Particularidades',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp',
            previewText: 'Módulo 4'
        },
        {
            title: 'Card Módulo 5: O SAG - Geometria',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp',
            previewText: 'Módulo 5'
        },
        {
            title: 'Card Módulo 6: Óleo e Viscosidades',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/lp-curso/oleo-e-viscosidades.webp',
            previewText: 'Módulo 6'
        },
        {
            title: 'Card Módulo 7: Desmistificando Cliques',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3-1.webp',
            previewText: 'Módulo 7'
        },
        {
            title: 'Card Módulo 8: Dianteira & Bengala',
            size: '1080x1350px',
            type: 'Card do Curso',
            category: 'Módulos do Curso',
            image: '/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4-1.webp',
            previewText: 'Módulo 8'
        },
        {
            title: 'Bento Asset 1: Piloto Amador',
            size: '800x600px',
            type: 'Bento Grid',
            category: 'Público-Alvo',
            image: '/images/lp-curso/1.webp',
            previewText: 'Para Piloto Amador'
        },
        {
            title: 'Bento Asset 2: Trilha e Enduro',
            size: '800x600px',
            type: 'Bento Grid',
            category: 'Público-Alvo',
            image: '/images/lp-curso/2.webp',
            previewText: 'Para Trilha e Enduro'
        },
        {
            title: 'Bento Asset 3: Mecânico Preparador',
            size: '800x600px',
            type: 'Bento Grid',
            category: 'Público-Alvo',
            image: '/images/lp-curso/3.webp',
            previewText: 'Para Mecânico Preparador'
        },
        {
            title: 'Bento Asset 4: Dono de Oficina',
            size: '800x600px',
            type: 'Bento Grid',
            category: 'Público-Alvo',
            image: '/images/lp-curso/4.webp',
            previewText: 'Para Dono de Oficina'
        }
    ];

    const renderLandingPage = () => {
        return (
            <div className="min-h-screen bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black font-sans overflow-x-hidden relative">
                {/* Background image layers to match the Sales LP branding */}
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/blueprint-moto.webp')] opacity-[0.07] pointer-events-none mix-blend-luminosity z-0" />
                <div className="absolute top-0 left-0 right-0 h-[600px] bg-cover bg-top bg-no-repeat bg-[url('/hero-desktop-alex.webp')] opacity-[0.10] pointer-events-none z-0" />
                <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-transparent to-[#050505] pointer-events-none z-0" />
                <GridVignetteBackground className="opacity-35" size={48} x={50} y={40} intensity={80} horizontalVignetteSize={90} verticalVignetteSize={60} />
                
                {/* Sticky scarcity banner */}
                <div className="bg-gradient-to-r from-red-700 to-red-950 text-white py-3 px-4 text-center sticky top-0 z-50 shadow-md">
                    <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-xs font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2">
                            <Zap size={14} className="text-yellow-300 animate-pulse" />
                            Seja um parceiro oficial W-Tech!
                        </span>
                        <span className="hidden md:inline text-white/50">•</span>
                        <span>Comissão direta de 20% (R$ 69,40 por venda) no Curso Suspensão Piloto</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-7xl mx-auto py-10 md:py-16 px-4 md:px-8 space-y-24">
                    {/* Navigation/Header Bar */}
                    <div className="flex justify-between items-center border-b border-white/10 pb-6">
                        <div className="flex items-center gap-3">
                            <img src="/logo-wtech-letreiro.png" alt="W-Tech Logo" className="h-6 object-contain" onError={(e) => { e.currentTarget.src = "/logo-wtech-branca.png" }} />
                            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest shrink-0">
                                Afiliados VIP
                            </span>
                        </div>
                        <button 
                            onClick={() => {
                                setShowTools(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="border border-white/20 hover:border-[#D4AF37]/50 text-white hover:text-[#D4AF37] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all bg-zinc-900/40 backdrop-blur shadow-lg hover:shadow-[#D4AF37]/5 flex items-center gap-2"
                        >
                            <FolderOpen size={14} /> Já sou Afiliado
                        </button>
                    </div>

                    {/* 1. HERO SECTION */}
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 backdrop-blur-md px-3.5 py-1 rounded-full">
                                <Zap size={12} className="text-[#D4AF37] animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Programa de Afiliados Oficial</span>
                            </div>
                            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-[0.9] drop-shadow-2xl">
                                Regule a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-amber-600">Suspensão<br className="hidden lg:block" /></span><br className="lg:hidden" />
                                <span className="text-3xl md:text-4xl lg:text-5xl">da Sua Moto. Do Zero.</span>
                            </h1>
                            <p className="text-base md:text-lg text-gray-200 leading-relaxed font-bold">
                                Promova o método oficial de regulagem da W-Tech e do Alex Crepaldi. Receba <span className="text-[#D4AF37]">20% de comissão direta (R$ 69,40 por venda)</span> por indicação em um produto com demanda reprimida extrema.
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 bg-black/40 border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 backdrop-blur-md">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">A comissão é</span>
                                    <span className="text-[#D4AF37] font-black text-lg leading-none tracking-tight">R$ 69,40 / Venda</span>
                                </div>
                                <div className="inline-flex items-center gap-2 text-gray-200 text-xs font-semibold">
                                    <ShieldCheck size={15} className="text-[#D4AF37]" /> Cookie de 180 dias
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <a 
                                    href="https://pay.kiwify.com.br/19v4nIa"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-[#D4AF37] to-amber-600 text-black px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 hover:brightness-110 relative overflow-hidden group text-center"
                                >
                                    Quero me Afiliar Agora <ArrowRight size={14} strokeWidth={2.5} />
                                </a>
                                <button 
                                    onClick={() => {
                                        setShowTools(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] bg-zinc-900/30 backdrop-blur"
                                >
                                    Acessar Central de Materiais <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Video VSL Player */}
                        <div className="flex flex-col gap-6">
                            <div 
                                className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-black group cursor-pointer"
                                onClick={handlePlayVideo}
                            >
                                <video
                                    ref={videoRef}
                                    poster="/images/vsl-thumbnail.webp"
                                    controls={videoPlaying}
                                    playsInline
                                    preload="none"
                                    className="w-full h-full object-cover"
                                    onPlay={() => setVideoPlaying(true)}
                                    onPause={() => setVideoPlaying(false)}
                                >
                                    {videoActivated && (
                                        <source src="https://niesvylxwfaffgnmdoql.supabase.co/storage/v1/object/public/site-assets/vsl-suspensao.mp4" type="video/mp4" />
                                    )}
                                    Seu navegador não suporta vídeos.
                                </video>

                                {!videoPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors z-20">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-[#D4AF37]/40 rounded-full animate-ping scale-150 opacity-20" />
                                            <div className="absolute inset-0 bg-[#D4AF37]/30 rounded-full animate-pulse scale-125 opacity-40" />
                                            <div className="relative w-20 h-20 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.6)] group-hover:scale-110 transition-transform">
                                                <Play fill="black" size={32} className="text-black ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 pointer-events-none border-2 border-[#D4AF37]/20 rounded-2xl z-10" />
                            </div>
                        </div>
                    </div>

                    {/* 2. BENTO GRID (PARA QUEM É) */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Público-Alvo do Produto</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Este Curso é <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Para Quem</span>?</h2>
                            <p className="text-neutral-400 max-w-2xl mx-auto text-xs leading-relaxed font-medium">
                                Entenda os perfis de clientes que compram o treinamento para direcionar suas campanhas de forma ultra-precisa.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(220px,auto)] gap-6 max-w-6xl mx-auto text-left">
                            {/* Card 1 - Piloto */}
                            <div 
                                style={{ backgroundImage: `url('/images/lp-curso/1.webp')` }}
                                className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                            >
                                <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#D4AF37]/15 rounded-full blur-[50px] pointer-events-none" />
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-black mb-5 shadow-[0_0_20px_rgba(212,175,55,0.3)] relative z-10">
                                    <Bike size={24} />
                                </div>
                                <div className="inline-block text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/80 border border-[#D4AF37]/30 px-2 py-1 rounded mb-3 relative z-10">Para Todo Piloto</div>
                                <h3 className="text-xl lg:text-2xl font-black uppercase text-white mb-2 tracking-tight relative z-10">Piloto</h3>
                                <p className="text-neutral-300 text-xs md:text-sm leading-relaxed relative z-10">
                                    Sente a moto "quicar" demais e os braços cansarem rápido. Sabe que algo está errado na suspensão, mas não sabe por onde começar — nem quantos cliques dar. Este curso é o seu guia definitivo do zero ao acerto.
                                </p>
                            </div>
                            
                            {/* Card 2 - Trilha / Enduro */}
                            <div 
                                style={{ backgroundImage: `url('/images/lp-curso/2.webp')` }}
                                className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                            >
                                <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[#D4AF37] mb-4 relative z-10">
                                    <Mountain size={22} />
                                </div>
                                <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">Trilha & Enduro</div>
                                <h3 className="text-lg font-black uppercase text-white mb-2 tracking-tight relative z-10">Trilha / Enduro</h3>
                                <p className="text-neutral-300 text-xs leading-relaxed relative z-10">
                                    Perde tração em subidas, sofre com fim de curso em saltos e buracos. Termina a trilha exausto antes do tempo — não é falta de preparo físico. É a suspensão errada.
                                </p>
                            </div>
                            
                            {/* Card 3 - Mecânico */}
                            <div 
                                style={{ backgroundImage: `url('/images/lp-curso/3.webp')` }}
                                className="md:col-span-5 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                            >
                                <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[#D4AF37] mb-4 relative z-10">
                                    <Wrench size={22} />
                                </div>
                                <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">Serviço Nobre</div>
                                <h3 className="text-lg font-black uppercase text-white mb-2 tracking-tight relative z-10">Mecânico / Preparador</h3>
                                <p className="text-neutral-300 text-xs leading-relaxed relative z-10">
                                    Quer agregar o serviço mais lucrativo da oficina: o acerto de suspensão. Saia das revisões básicas e entre no mundo das bengalas, amortecedores e preparações — e ainda ensine seus clientes.
                                </p>
                            </div>
                            
                            {/* Card 4 - Dono de Oficina */}
                            <div 
                                style={{ backgroundImage: `url('/images/lp-curso/4.webp')` }}
                                className="md:col-span-7 bg-zinc-900/80 bg-blend-overlay bg-cover bg-center border border-white/10 rounded-3xl p-8 md:p-10 transition-all hover:bg-zinc-800/80 group overflow-hidden relative shadow-lg cursor-default"
                            >
                                <div className="absolute inset-0 bg-black/65 pointer-events-none z-0" />
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-red-500/10 rounded-full blur-[50px] pointer-events-none" />
                                <div className="w-12 h-12 flex items-center justify-center text-white mb-5 border border-white/30 rounded-2xl bg-white/10 backdrop-blur shadow-inner relative z-10">
                                    <Layers size={22} />
                                </div>
                                <div className="inline-block text-[9px] font-black uppercase tracking-widest text-gray-400 border border-white/10 px-2 py-1 rounded mb-3 relative z-10">Diferencial Competitivo</div>
                                <h3 className="text-xl lg:text-2xl font-black uppercase text-white mb-2 tracking-tight relative z-10">Dono de Oficina</h3>
                                <p className="text-neutral-300 text-xs md:text-sm leading-relaxed relative z-10">
                                    Seus clientes pedem ajustes de cliques que a equipe não sabe resolver, perdendo serviço e fidelidade para oficinas especializadas de Off-Road. Dê esse diferencial à sua equipe.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 3. TRAFFIC PROOF & ROI GRID */}
                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all duration-300 text-left">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />
                        <div className="grid md:grid-cols-5 gap-8 items-center relative z-10">
                            <div className="md:col-span-3 space-y-6">
                                <div className="inline-flex items-center gap-2 border border-[#D4AF37]/20 bg-[#D4AF37]/5 backdrop-blur-md px-3.5 py-1 rounded-full">
                                    <TrendingUp size={12} className="text-[#D4AF37]" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Dados Reais e Comprovados</span>
                                </div>
                                <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
                                    Métricas de Tráfego Reais <br />
                                    e <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-amber-600">ROI Altíssimo</span>
                                </h2>
                                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                    Nossas campanhas provam o quanto o mercado Off-Road é aquecido e responde rápido. Os gráficos de desempenho ao lado comprovam o ROI fantástico das vendas diretas, impulsionado por um produto de alta didática técnica sem nenhum concorrente de peso no Brasil.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-[#D4AF37]/10 transition-colors">
                                        <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                                            <span className="flex h-2 w-2 relative shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            Conversão Otimizada
                                        </h4>
                                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                                            A página oficial foi construída por especialistas em vendas. VSL envolvendo e argumentos técnicos inquestionáveis fazem o cliente comprar sem pensar duas vezes.
                                        </p>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-[#D4AF37]/10 transition-colors">
                                        <h4 className="text-xs font-black uppercase text-[#D4AF37] flex items-center gap-1.5">
                                            <Coins size={14} /> Ticket Sob Medida
                                        </h4>
                                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                                            Diferente de cursos caros de R$ 1.000+, o preço promocional de R$ 347,00 está na faixa perfeita para incentivar a decisão por impulso.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="md:col-span-2 flex flex-col gap-4">
                                <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 shadow-lg group-hover:border-[#D4AF37]/25 transition-all duration-300 overflow-hidden relative">
                                    <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 border border-green-500/30 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider z-10">
                                        ROI & Vendas
                                    </div>
                                    <img src="/images/traffic-stats-1.jpeg" alt="ROI real" className="w-full h-auto rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-[1.02]" />
                                </div>
                                <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 shadow-lg group-hover:border-[#D4AF37]/25 transition-all duration-300 overflow-hidden relative">
                                    <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider z-10">
                                        Alcance & Custo
                                    </div>
                                    <img src="/images/traffic-stats-2.jpeg" alt="Métricas de alcance" className="w-full h-auto rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-[1.02]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. QUAL O SEGREDO DO ACERTO PERFEITO? */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Fundamentos da Metodologia</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">O Segredo do <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Acerto Perfeito</span></h2>
                            <p className="text-neutral-400 max-w-2xl mx-auto text-xs leading-relaxed font-medium">
                                Apresentamos a base técnica que o aluno aprende no curso. Isso facilita explicar o produto e fazer vendas.
                            </p>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto text-left">
                            {[
                                { icon: <CheckCircle size={22} className="text-[#D4AF37]" />, title: 'O SAG', desc: 'A geometria sagrada da moto. O ponto de partida obrigatório antes de encostar na chave de fenda.' },
                                { icon: <Flame size={22} className="text-[#D4AF37]" />, title: 'Molas', desc: 'O equilíbrio exato entre absorção e retorno (os famosos "cliques") para cada tipo de peso e nível.' },
                                { icon: <Layers size={22} className="text-[#D4AF37]" />, title: 'Ergonomia (Cockpit)', desc: 'Como o piloto se integra à suspensão ajustada: altura e ângulo de guidão e pedaleira.' },
                                { icon: <ShieldCheck size={22} className="text-[#D4AF37]" />, title: 'Pneus e Tração', desc: 'A escolha correta e a calibragem - a ponte final entre o chão e a sua válvula de suspensão.' }
                            ].map((b, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 bg-zinc-900/40 border border-white/5 rounded-2xl hover:border-[#D4AF37]/20 transition-all cursor-default group">
                                    <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        {b.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm mb-1">{b.title}</h3>
                                        <p className="text-neutral-400 text-[11px] leading-relaxed font-medium">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. COURSE MODULES SECTION WITH CONTINUOUS MARQUEE CAROUSEL */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">Estrutura e Qualidade do Curso</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Didática e Conteúdo <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-600">Premium</span></h2>
                            <p className="text-neutral-400 max-w-2xl mx-auto text-xs leading-relaxed font-medium">
                                Apresentamos abaixo os 11 módulos práticos + bônus que garantem a transformação completa do piloto e a **satisfação total dos alunos**.
                            </p>
                        </div>
                        
                        <div className="grid sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
                            {[
                                { icon: <Monitor size={20} />, text: '100% Online' },
                                { icon: <Play size={20} />, text: 'Aulas Gravadas' },
                                { icon: <CalendarDays size={20} />, text: 'Acesso 12 Meses' },
                                { icon: <BookOpen size={20} />, text: '11 Módulos Completos' },
                            ].map((f, i) => (
                                <div key={i} className="flex items-center justify-center gap-3 bg-zinc-900/40 border border-white/5 rounded-xl p-4 cursor-default">
                                    <div className="text-[#D4AF37]">{f.icon}</div>
                                    <span className="font-bold text-xs uppercase tracking-wide">{f.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* 11 Modules List */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto text-left">
                            {[
                                { num: '01', title: 'Boas-Vindas ao Curso', desc: 'Visão geral, método e como aproveitar ao máximo cada módulo' },
                                { num: '02', title: 'Ergonomia — O "Cockpit" do Piloto', desc: 'Guidão, manetes, pedal de freio e câmbio: o seu encaixe correto na moto' },
                                { num: '03', title: 'Equilíbrio', desc: 'Verifique se sua moto está realmente equilibrada antes de qualquer acerto' },
                                { num: '04', title: 'Molas e suas Particularidades', desc: 'Rigidez, taxa de mola e como escolher a certa para o seu peso' },
                                { num: '05', title: 'O SAG — A Geometria Sagrada', desc: 'Medição e ajuste prático do SAG estático e dinâmico, do zero' },
                                { num: '06', title: 'Óleo e Viscosidades', desc: 'Como o fluido controla a dinâmica da suspensão e quando substituir' },
                                { num: '07', title: 'Desmistificando os "Cliques"', desc: 'Compressão, retorno: o que cada clique faz e como ajustar na prática' },
                                { num: '08', title: 'Suspensão do Eixo Dianteiro', desc: 'As bengalas, o ritual de instalação da roda e por que a frente dura te machuca' },
                                { num: '09', title: 'Pneus e Tração', desc: 'Pressão correta, regulagem de PSI e como o pneu determina a tração' },
                                { num: '10', title: 'Relação e Corrente', desc: 'Ajustes de relação que impactam diretamente a entrega de potência' },
                                { num: '11', title: 'Kits e Ferramentas', desc: 'O setup ideal da sua bancada para regular suspensão como um profissional' },
                            ].map((mod, i) => (
                                <div key={i} className="flex gap-4 p-5 bg-zinc-900/20 border border-white/5 hover:border-[#D4AF37]/20 rounded-2xl transition-all cursor-default group relative overflow-hidden">
                                    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black text-sm group-hover:bg-[#D4AF37]/20 transition-colors">
                                        {mod.num}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-sm leading-snug mb-1 group-hover:text-[#D4AF37] transition-colors">{mod.title}</h3>
                                        <p className="text-neutral-500 text-xs leading-relaxed">{mod.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Carousel Marquee with real module cards */}
                        <div className="relative w-full overflow-hidden flex flex-col gap-6 py-4">
                            <Marquee pauseOnHover className="[--duration:50s]">
                                {[
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO.webp",
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-1.webp",
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-2.webp",
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3.webp",
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4.webp",
                                    "/images/lp-curso/oleo-e-viscosidades.webp",
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-3-1.webp",
                                    "/images/modulos/CARDS-KWIFY-CURSO-AVANCADO-4-1.webp",
                                ].map((src, idx) => (
                                    <img
                                        key={idx}
                                        src={src}
                                        alt={`Módulo ${idx + 1}`}
                                        className="h-[200px] md:h-[240px] w-auto rounded-2xl border border-white/10 shadow-xl object-contain hover:scale-105 transition-transform duration-300"
                                    />
                                ))}
                            </Marquee>
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-[#050505] to-transparent z-10"></div>
                            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/5 bg-gradient-to-l from-[#050505] to-transparent z-10"></div>
                        </div>
                    </div>

                    {/* 6. THE MENTOR SECTION (Alex Crepaldi) */}
                    <div className="bg-zinc-950 border border-white/5 rounded-3xl overflow-hidden relative text-left">
                        <div className="absolute -right-[10%] top-[10%] w-[50%] h-[70%] bg-[#D4AF37]/5 blur-[120px] rounded-full z-0 pointer-events-none" />
                        <div className="grid lg:grid-cols-2 gap-8 items-center p-8 md:p-12 relative z-10">
                            <div className="relative h-72 lg:h-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                                <img src="/images/alex-webp.webp" alt="Alex Crepaldi" className="w-full h-full object-cover object-top" onError={(e)=>{e.currentTarget.src="/paschoalin.jpg"}} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <div className="absolute bottom-4 left-4 bg-[#D4AF37] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <Award size={12} /> Instrutor Oficial
                                </div>
                            </div>
                            <div className="space-y-6">
                                <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px]">Autoridade Técnica</span>
                                <h2 className="text-3xl lg:text-4xl font-black uppercase text-white tracking-tight">O Mentor: Alex Crepaldi</h2>
                                <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                                    Alex Crepaldi é o responsável pelo desenvolvimento das metodologias e inovações técnicas da **W-Tech**. Com mais de 15 anos de atuação nos bastidores das pistas, ele reúne o conhecimento teórico e prático definitivo para o acerto preciso de cliques, SAG e hidráulica. Ter uma autoridade reconhecida nacionalmente assinando o produto facilita a sua prospecção e eleva os níveis de conversão.
                                </p>
                                <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/15 rounded-xl">
                                    <p className="text-xs font-bold text-[#D4AF37] leading-relaxed">
                                        Indique um produto com a chancela W-Tech e aproveite a credibilidade de quem é líder em suspensão de motos Off-Road.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7. BÔNUS PASCHOALIN */}
                    <div className="py-20 relative overflow-hidden bg-[#06010a] border border-purple-500/10 rounded-3xl text-left">
                        <div className="absolute -right-[15%] top-[10%] w-[50%] h-[70%] bg-[#7c3aed]/5 blur-[120px] rounded-full z-0 pointer-events-none" />
                        <div className="grid lg:grid-cols-2 gap-8 items-center p-8 md:p-12 relative z-10">
                            <div className="relative h-72 lg:h-96 rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl">
                                <img
                                    src="/paschoalin.webp"
                                    alt="Rafa Paschoalin"
                                    className="w-full h-full object-cover object-top"
                                    onError={(e) => { e.currentTarget.src = "/paschoalin.jpg" }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <div className="absolute bottom-4 left-4 bg-purple-600/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                    <Star size={12} className="fill-white" /> Participação Especial
                                </div>
                            </div>
                            <div className="space-y-6">
                                <span className="text-purple-400 font-black uppercase tracking-[0.3em] text-[10px]">Módulo Bônus Premium</span>
                                <h2 className="text-3xl lg:text-4xl font-black uppercase text-white tracking-tight">Rafa Paschoalin</h2>
                                <p className="text-neutral-400 text-xs md:text-sm leading-relaxed">
                                    Rafa Paschoalin é piloto de alta performance e participou do módulo prático do curso desregulando e regulando a moto ao vivo para demonstrar visualmente e na prática a diferença que cada clique e ajuste faz na pilotagem real.
                                </p>
                                <div className="p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                                    <p className="text-xs font-bold text-purple-300 leading-relaxed">
                                        Um módulo único no Brasil que valida a teoria na pista real, aumentando o apelo de vendas para os seus leads.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 8. INSTRUTORES LIST */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px]">Autoridade Técnica</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Seus <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Instrutores</span></h2>
                        </div>
                        
                        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
                            {/* Alex Crepaldi */}
                            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden group cursor-default">
                                <div className="h-64 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center relative overflow-hidden">
                                    <img
                                        src="/images/alex-webp.webp"
                                        alt="Alex Crepaldi"
                                        className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="inline-block bg-[#D4AF37] text-black text-[9px] font-black uppercase px-2.5 py-1 rounded">Instrutor Principal</div>
                                    <h3 className="text-xl font-black uppercase text-white">Alex Crepaldi</h3>
                                    <p className="text-neutral-400 text-xs leading-relaxed font-medium">
                                        Fundador da W-Tech Suspensões e referência nacional em acerto técnico. Mais de 3.000 profissionais treinados e foco total na física e hidráulica das suspensões.
                                    </p>
                                </div>
                            </div>

                            {/* Rafa Paschoalin */}
                            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden group cursor-default">
                                <div className="h-64 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center relative overflow-hidden">
                                    <img
                                        src="/paschoalin.webp"
                                        alt="Rafa Paschoalin"
                                        className="w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="inline-block bg-purple-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded">Participação Especial</div>
                                    <h3 className="text-xl font-black uppercase text-white">Rafa Paschoalin</h3>
                                    <p className="text-neutral-400 text-xs leading-relaxed font-medium">
                                        Piloto com vasta experiência em competições e provas de alto nível. Traz a validação prática da pilotagem da teoria para as pistas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 9. BÔNUS INCLUSOS */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-red-500 font-black uppercase tracking-[0.3em] text-[10px]">Material de Apoio</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Bônus Inclusos no <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Treinamento</span></h2>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                            {[
                                { title: 'Planilha de Regulagem de SAG', value: '397,00', icon: <Activity size={22} /> },
                                { title: 'Planilha de Regulagem de PSI', value: '257,00', icon: <Gauge size={22} /> },
                                { title: 'Comparativo de Óleos', value: '197,00', icon: <Move size={22} /> },
                                { title: 'Comparativo de Molas', value: '146,00', icon: <CheckCircle size={22} /> },
                            ].map((bonus, i) => (
                                <div key={i} className="flex flex-col gap-4 p-6 bg-zinc-950/80 border border-white/5 rounded-2xl relative overflow-hidden group shadow-lg">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full blur-[20px]" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                            {bonus.icon}
                                        </div>
                                        <h3 className="font-black text-white text-sm md:text-base uppercase tracking-wide">{bonus.title}</h3>
                                    </div>
                                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 relative z-10 mt-1">
                                        <span className="text-neutral-500 font-black text-sm line-through decoration-red-500/60 decoration-2">
                                            R$ {bonus.value}
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] font-black uppercase text-[9px] tracking-widest px-2.5 py-1 rounded">
                                            <CheckCircle size={10} /> Incluso
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 10. DEPOIMENTOS */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px]">Prova Social</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">O que dizem os <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Alunos</span></h2>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                            {[
                                { name: 'Ricardo F.', role: 'Piloto Amador — SP', text: 'Depois do curso, finalmente ajustei os cliques e o SAG para o meu peso. Chega de tomar solavanco e ceder nas trilhas. Moto grudada no chão!' },
                                { name: 'Marcos S.', role: 'Mecânico — MG', text: 'Comecei a oferecer regulagem e setup de suspensão na oficina. Ganhei novos clientes que antes iam buscar fora. O retorno foi imenso.' },
                                { name: 'Tiago L.', role: 'Piloto de Enduro — PR', text: 'As ladeiras com cavas não são mais um problema. A dianteira da roda da moto agora me dá confiança nas curvas abertas e a tração é constante.' },
                                { name: 'Juliana M.', role: 'Pilota Hard Enduro — RJ', text: 'Eu achava minhas molas macias demais, mas na verdade a hidráulica estava zerada. Entender esse casamento através do curso virou a chave da minha tocada.' },
                            ].map((test, i) => (
                                <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-[#D4AF37]/15 transition-all cursor-default shadow-md">
                                    <p className="text-neutral-300 text-xs leading-relaxed italic mb-4">"{test.text}"</p>
                                    <div>
                                        <h4 className="font-bold text-white text-xs">{test.name}</h4>
                                        <span className="text-[10px] text-neutral-500 font-semibold">{test.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 11. FAQ FOR AFFILIATES */}
                    <div className="space-y-12">
                        <div className="text-center space-y-4">
                            <span className="text-[#D4AF37] font-black uppercase tracking-[0.3em] text-[10px]">FAQ Geral</span>
                            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Perguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-amber-500">Frequentes</span></h2>
                        </div>
                        
                        <div className="max-w-3xl mx-auto space-y-4 text-left">
                            <FAQItem q="Qual a comissão do curso?" a="A comissão por venda é de 20% do valor do curso, ou seja, você recebe R$ 69,40 livres para cada indicação que efetuar a compra através da plataforma Kiwify." />
                            <FAQItem q="Qual a duração do cookie?" a="Trabalhamos com cookies de 180 dias (6 meses). Caso a pessoa compre dentro desse período, você ganha a comissão." />
                            <FAQItem q="Como funciona a comissão de Último Clique?" a="Se o cliente clicar em links de afiliados diferentes, quem enviou o último link que o cliente clicou antes de concluir a compra receberá a comissão." />
                            <FAQItem q="Posso criar perfis ou fazer anúncios?" a="Sim, você pode produzir conteúdo ou rodar anúncios de tráfego pago nas redes sociais direcionando os usuários para seu link, desde que respeite as diretrizes básicas de marca." />
                            <FAQItem q="Preciso ter experiência para vender?" a="Não. O curso tem um apelo técnico fortíssimo e atende a uma dor extrema dos pilotos. Fornecemos modelos de copy e imagens prontas para você usar." />
                            <FAQItem q="Como o aluno acessa as aulas?" a="Logo após o pagamento na Kiwify, o aluno recebe um e-mail com os dados de acesso imediatos para a nossa área de membros." />
                        </div>
                    </div>

                    {/* 12. FINAL CTA */}
                    <div className="py-16 md:py-24 bg-gradient-to-br from-zinc-950 via-[#0a0a0a] to-[#121212] border border-white/5 rounded-3xl text-center space-y-8 relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[80px] z-0 pointer-events-none" />
                        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                            <h2 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
                                Comece a Vender <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-amber-600">Ainda Hoje</span>
                            </h2>
                            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed font-medium">
                                Clique no botão abaixo para garantir o seu link de afiliado oficial na plataforma Kiwify e ter acesso imediato à central de criativos da W-Tech.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <a 
                                    href="https://pay.kiwify.com.br/19v4nIa"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center gap-2 hover:scale-[1.02] text-center"
                                >
                                    Solicitar Afiliação na Kiwify <ArrowRight size={14} strokeWidth={2.5} />
                                </a>
                                <button 
                                    onClick={() => {
                                        setShowTools(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="border border-white/10 hover:border-white/20 text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-zinc-900/60 backdrop-blur"
                                >
                                    Ver Ferramentas de Suporte
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Footer Copyright */}
                    <div className="text-center text-[10px] text-neutral-600 font-bold uppercase tracking-wider pt-6 border-t border-white/5">
                        © {new Date().getFullYear()} W-Tech • Alex Crepaldi • Todos os direitos reservados
                    </div>
                </div>
            </div>
        );
    };

    if (publicMode && !showTools) {
        return renderLandingPage();
    }

    return (
        <div className="relative min-h-screen bg-[#050505] text-white overflow-hidden py-10 md:py-16 px-4 md:px-8 font-sans selection:bg-[#D4AF37] selection:text-black">
            
            {/* Background image layers to match the Sales LP branding */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-[url('/blueprint-moto.webp')] opacity-[0.07] pointer-events-none mix-blend-luminosity z-0" />
            
            {/* Hero faded background image at the top */}
            <div className="absolute top-0 left-0 right-0 h-[600px] bg-cover bg-top bg-no-repeat bg-[url('/hero-desktop-alex.webp')] opacity-[0.10] pointer-events-none z-0" />
            <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-transparent to-[#050505] pointer-events-none z-0" />

            {/* Immersive grid vignette background identical to Sales LP */}
            <GridVignetteBackground className="opacity-35" size={48} x={50} y={40} intensity={80} horizontalVignetteSize={90} verticalVignetteSize={60} />
            
            <div className="relative z-10 space-y-12 max-w-7xl mx-auto">
                
                {publicMode && showTools && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex justify-start"
                    >
                        <button 
                            onClick={() => {
                                setShowTools(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="inline-flex items-center gap-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] backdrop-blur-md px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#D4AF37]/5"
                        >
                            <ArrowLeft size={14} /> Voltar para Apresentação
                        </button>
                    </motion.div>
                )}
                
                {/* Hero / Header Section without card box (Clean Free-Flowing LP Style) */}
                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-10"
                >
                    <div className="space-y-3">
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 backdrop-blur-md px-3.5 py-1 rounded-full">
                            <Flame size={12} className="text-[#D4AF37] animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">W-Tech VIP Network</span>
                        </motion.div>
                        <motion.h1 variants={itemVariants} className="font-display text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none">
                            Central de <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-amber-600">Parceiros</span>
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-xs md:text-sm text-neutral-400 font-medium max-w-xl leading-relaxed">
                            Monitore materiais de alta comissão, use as imagens da página de vendas oficial e acompanhe o passo a passo para alavancar suas vendas de suspensão Off-Road.
                        </motion.p>
                    </div>

                    {/* Navigation tabs - Hidden in public mode */}
                    {!publicMode ? (
                        <motion.div variants={itemVariants} className="bg-zinc-900/90 p-1 rounded-xl border border-white/10 flex shadow-xl shrink-0">
                            <button 
                                onClick={() => setActiveTab('portal')}
                                className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeTab === 'portal' 
                                        ? 'bg-[#D4AF37] text-black font-extrabold shadow' 
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <Flame size={14} className={activeTab === 'portal' ? 'animate-bounce' : ''} /> Recursos e Treinamento
                            </button>
                            <button 
                                onClick={() => setActiveTab('admin')}
                                className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    activeTab === 'admin' 
                                        ? 'bg-[#D4AF37] text-black font-extrabold shadow' 
                                        : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <Users size={14} /> Gestão ({AFFILIATES_DATA.length})
                            </button>
                        </motion.div>
                    ) : null}
                </motion.div>

                {/* TAB CONTENT: AFFILIATES RESOURCE PORTAL */}
                {activeTab === 'portal' && (
                    <div className="space-y-10 animate-in fade-in duration-300">
                        
                        {/* Traffic Proof & ROI Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
                            
                            <div className="grid md:grid-cols-5 gap-8 items-center relative z-10">
                                {/* Left: Persuasive Text Content (3 columns) */}
                                <div className="md:col-span-3 space-y-6">
                                    <div className="inline-flex items-center gap-2 border border-[#D4AF37]/20 bg-[#D4AF37]/5 backdrop-blur-md px-3.5 py-1 rounded-full">
                                        <TrendingUp size={12} className="text-[#D4AF37]" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Oportunidade Única de Mercado</span>
                                    </div>
                                    <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
                                        Produto Único, Demanda Represada <br />
                                        e <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-yellow-400 to-amber-600">ROI Comprovado</span>
                                    </h2>
                                    <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                        Diferente de nichos saturados e genéricos do marketing digital, o <span className="text-white">Curso de Regulagem de Suspensão W-Tech</span> atende a uma necessidade real, técnica e extremamente dolorosa para os pilotos Off-Road (motocross, trilha e enduro). Pilotos sofrem constantemente com suspensões mal reguladas que causam fadiga, perda de rendimento e riscos de queda. O curso ensina o método profissional de acerto prático de cliques, sag e hidráulica em casa, eliminando a dependência de oficinas caras.
                                    </p>
                                    
                                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-[#D4AF37]/10 transition-colors">
                                            <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                                                <span className="flex h-2 w-2 relative shrink-0">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                Sem Concorrência Direta
                                            </h4>
                                            <p className="text-[10px] text-neutral-400 leading-relaxed">
                                                Não há outro curso prático de suspensão Off-Road focado em pilotos no Brasil. A autoridade inquestionável do Alex Crepaldi no acerto técnico converte cliques de forma muito mais simples.
                                            </p>
                                        </div>
                                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2 hover:border-[#D4AF37]/10 transition-colors">
                                            <h4 className="text-xs font-black uppercase text-[#D4AF37] flex items-center gap-1.5">
                                                <Coins size={14} /> Ticket Baixo & Alto ROI
                                            </h4>
                                            <p className="text-[10px] text-neutral-400 leading-relaxed">
                                                O valor promocional de R$ 347,00 (em até 12x de R$ 34,70) estimula a compra imediata por impulso, maximizando o ROI e minimizando o custo de aquisição (CPA) nas suas campanhas.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Right: Image Proof Showcase (2 columns) */}
                                <div className="md:col-span-2 flex flex-col gap-4">
                                    <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 shadow-lg group-hover:border-[#D4AF37]/25 transition-all duration-300 overflow-hidden relative">
                                        <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 border border-green-500/30 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider z-10">
                                            ROI & Vendas
                                        </div>
                                        <img 
                                            src="/images/traffic-stats-1.jpeg" 
                                            alt="Métricas reais de ROI" 
                                            className="w-full h-auto rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-[1.02]" 
                                        />
                                    </div>
                                    <div className="bg-black/60 border border-white/10 rounded-2xl p-2.5 shadow-lg group-hover:border-[#D4AF37]/25 transition-all duration-300 overflow-hidden relative">
                                        <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider z-10">
                                            Alcance & Custo
                                        </div>
                                        <img 
                                            src="/images/traffic-stats-2.jpeg" 
                                            alt="Métricas reais de custo e alcance" 
                                            className="w-full h-auto rounded-xl grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-[1.02]" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid lg:grid-cols-3 gap-8 items-start">
                        
                        {/* Left & Middle columns: Resources, Simulator, Copys, and Strategy Guides */}
                        <div className="lg:col-span-2 space-y-10">
                            
                            {/* Interactive Commissions Calculator */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300"
                            >
                                <div className="absolute top-0 right-0 w-60 h-60 bg-[#D4AF37]/5 rounded-full blur-[80px]" />
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-5 mb-6 gap-3">
                                    <div>
                                        <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
                                            <Coins size={22} className="text-[#D4AF37]" /> Simule seus Ganhos Mensais
                                        </h3>
                                        <p className="text-xs text-neutral-400 mt-1">Arrasta o slider abaixo para simular sua comissão de {(commissionRate * 100)}% direta.</p>
                                    </div>
                                    <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[9px] font-black uppercase px-3.5 py-1.5 rounded-full tracking-widest shrink-0">
                                        Comissão por venda: R$ {commissionPerSale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center text-xs font-black text-neutral-400 uppercase tracking-wider">
                                            <span>Meta de Indicações</span>
                                            <span className="text-[#D4AF37] text-lg font-mono font-black bg-black/60 px-4 py-1.5 rounded-xl border border-white/10">
                                                {monthlySales} {monthlySales === 1 ? 'venda' : 'vendas'}
                                            </span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="1"
                                            max="100"
                                            className="w-full h-2 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-[#D4AF37] hover:accent-[#D4AF37]/80 transition-all"
                                            value={monthlySales}
                                            onChange={e => setMonthlySales(parseInt(e.target.value))}
                                        />
                                        <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                                            <span>1 Venda</span>
                                            <span>50 Vendas</span>
                                            <span>100 Vendas</span>
                                        </div>
                                    </div>

                                    <div className="bg-[#050505]/95 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-inner relative overflow-hidden">
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
                            </motion.div>

                            {/* STRATEGY GUIDE: HOW TO USE THE SALES LP */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
                            >
                                <div className="border-b border-white/10 pb-5">
                                    <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        <Sparkles size={20} className="text-[#D4AF37]" /> Estratégia do Funil: Como Usar a LP de Vendas
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-1">Conheça os elementos psicológicos integrados no nosso funil que garantem a conversão.</p>
                                </div>

                                <div className="grid md:grid-cols-5 gap-8 items-center">
                                    {/* Visual Mockup of the landing page (iPhone style) */}
                                    <div className="md:col-span-2 bg-[#090909] border border-white/10 p-5 rounded-[2.5rem] shadow-xl relative max-w-[260px] mx-auto w-full">
                                        {/* Notch */}
                                        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20 flex items-center justify-center">
                                            <div className="w-12 h-1 bg-neutral-900 rounded-full" />
                                        </div>
                                        
                                        {/* Content Screen */}
                                        <div className="bg-[#121212] rounded-[2rem] p-4 border border-neutral-900 space-y-3.5 text-[9px] text-neutral-400 relative overflow-hidden pt-7">
                                            <div className="flex justify-between items-center text-[7px] text-neutral-600 font-mono">
                                                <span>W-Tech LP</span>
                                                <span>09:41 AM</span>
                                            </div>

                                            {/* Fake Video Player using actual poster from LP */}
                                            <div className="w-full h-24 bg-black rounded-xl flex flex-col items-center justify-center border border-white/10 relative overflow-hidden group">
                                                <img 
                                                    src="/images/vsl-thumbnail.webp" 
                                                    alt="VSL Playback Preview"
                                                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                                                <div className="w-8 h-8 rounded-full bg-[#D4AF37] flex items-center justify-center text-black shadow-lg relative z-10 group-hover:scale-110 transition-transform">
                                                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-black ml-0.5" />
                                                </div>
                                                <span className="text-[7px] font-black text-white uppercase tracking-wider mt-2 z-10">Ver Vídeo Oficial</span>
                                            </div>

                                            <div className="text-center space-y-1">
                                                <span className="text-[7px] text-[#D4AF37] font-black uppercase tracking-widest">Curso Regulagem de Suspensão</span>
                                                <h4 className="font-black text-white uppercase leading-tight text-[10px]">Ajuste Como Um Profissional</h4>
                                            </div>

                                            <div className="space-y-1.5 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-900">
                                                <div className="flex items-center gap-1.5 text-[7px]">
                                                    <CheckCircle size={9} className="text-[#D4AF37] shrink-0" />
                                                    <span>Ajuste de Sag & Cliques na prática</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[7px]">
                                                    <CheckCircle size={9} className="text-[#D4AF37] shrink-0" />
                                                    <span>Para Motocross, Enduro e Trilha</span>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-r from-[#D4AF37] to-amber-600 text-black text-center font-black py-2 rounded-xl text-[8px] uppercase tracking-widest font-sans shadow-md shadow-[#D4AF37]/10">
                                                Garantir Inscrição R$ 347
                                            </div>
                                        </div>
                                        
                                        <div className="text-[8px] text-neutral-500 text-center font-bold uppercase tracking-widest mt-3.5">
                                            Mockup da LP de Vendas
                                        </div>
                                    </div>

                                    {/* Instructing how to drive traffic and convert */}
                                    <div className="md:col-span-3 space-y-5">
                                        <h4 className="font-display text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                            <Award size={18} className="text-[#D4AF37]" /> Os Três Pilares da LP
                                        </h4>
                                        
                                        <div className="space-y-4 text-xs text-neutral-400">
                                            <div className="border-l-2 border-[#D4AF37]/40 pl-3.5 py-0.5 space-y-1">
                                                <strong className="text-white text-xs block">1. A Apresentação de Alex Crepaldi</strong>
                                                <p className="leading-relaxed">
                                                    A página exibe um vídeo detalhado onde o Alex destrincha por que 90% dos pilotos andam com suspensão desregulada. Direcione o cliente a assistir o vídeo explicativo.
                                                </p>
                                            </div>
                                            <div className="border-l-2 border-[#D4AF37]/40 pl-3.5 py-0.5 space-y-1">
                                                <strong className="text-white text-xs block">2. Prova Social e Depoimentos</strong>
                                                <p className="leading-relaxed">
                                                    Pilotos reais mostram seus tempos de volta abaixando e a moto colando no chão após aplicarem o sag correto. Use isso no seu fechamento.
                                                </p>
                                            </div>
                                            <div className="border-l-2 border-[#D4AF37]/40 pl-3.5 py-0.5 space-y-1">
                                                <strong className="text-white text-xs block">3. Lote VIP de Escassez (R$ 347)</strong>
                                                <p className="leading-relaxed">
                                                    O valor de tabela do curso é R$ 997, mas a página está travada na promoção de R$ 347 por tempo limitado. Sempre lembre seu cliente dessa diferença.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* INTERACTIVE LINK GENERATOR & ONBOARDING */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.15 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
                            >
                                <div className="border-b border-white/10 pb-5">
                                    <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        <Link size={20} className="text-[#D4AF37]" /> Gerador Inteligente de Link de Afiliado
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-1">Esqueça links bagunçados. Insira seu link de afiliado Kiwify e gere URLs rastreadas automaticamente.</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                                                <Lock size={12} className="text-[#D4AF37]" /> Seu Link Base da Kiwify
                                            </label>
                                            <input 
                                                type="text" 
                                                value={affiliateLink} 
                                                onChange={e => setAffiliateLink(e.target.value)}
                                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-neutral-300 outline-none focus:border-[#D4AF37] transition-colors"
                                                placeholder="Ex: https://pay.kiwify.com.br/19v4nIa"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                                                <Search size={12} className="text-[#D4AF37]" /> Origem de Tráfego (Rastreamento SRC)
                                            </label>
                                            <select 
                                                value={utmSource} 
                                                onChange={e => setUtmSource(e.target.value)}
                                                className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs text-neutral-300 outline-none focus:border-[#D4AF37] cursor-pointer"
                                            >
                                                <option value="instagram_bio">Instagram Bio</option>
                                                <option value="instagram_stories">Instagram Stories</option>
                                                <option value="whatsapp_direto">WhatsApp Direto</option>
                                                <option value="grupo_motos">Grupo de WhatsApp de Motos</option>
                                                <option value="facebook_ads">Anúncios Patrocinados</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-[#050505]/80 border border-white/10 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-inner">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                                                    <ShieldCheck size={10} className="text-green-500" /> Link Rastreável Ready
                                                </span>
                                                <span className="bg-green-500/10 text-green-400 border border-green-500/25 text-[8px] font-black uppercase px-2 py-0.5 rounded">Ativo</span>
                                            </div>
                                            <div className="bg-zinc-950 border border-white/5 rounded-xl p-3.5 font-mono text-[10px] text-[#D4AF37] break-all select-all">
                                                {generatedLink}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleCopyText(generatedLink, 'tracking_link')}
                                            className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                                                copiedElementId === 'tracking_link'
                                                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/10'
                                                    : 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 shadow-lg shadow-[#D4AF37]/15 active:scale-[0.98]'
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

                                <div className="bg-[#050505] rounded-2xl border border-white/5 p-4 flex gap-3 items-start text-xs text-neutral-400">
                                    <Clock className="text-[#D4AF37] shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <strong className="text-white block font-black uppercase text-[10px] tracking-wider mb-0.5">Como funcionam os Cookies na Kiwify?</strong>
                                        Os cookies de indicação duram <strong className="text-[#D4AF37]">180 dias</strong>. A comissão é atribuída pelo modelo de <strong className="text-white">Último Clique</strong> (se o cliente clicar em múltiplos links, quem mandou o último link leva a comissão).
                                    </div>
                                </div>
                            </motion.div>

                            {/* Copywriting swipes */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6"
                            >
                                <div className="border-b border-white/10 pb-4">
                                    <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        <Layers size={18} className="text-[#D4AF37]" /> Legendas e Copys Prontas (Abordagem de Alto Impacto)
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-1">
                                        Copie os scripts de vendas abaixo. Ao clicar em copiar, o link personalizado gerado acima será anexado automaticamente no texto.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    {SWIPES.map(swipe => (
                                        <div key={swipe.id} className="bg-zinc-950 border border-white/10 rounded-xl overflow-hidden">
                                            <div className="bg-zinc-900/40 px-4 py-3 border-b border-white/10 flex justify-between items-center">
                                                <span className="text-xs font-bold text-white tracking-tight">{swipe.title}</span>
                                                <button
                                                    onClick={() => handleCopySwipe(swipe.text, swipe.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                                        copiedSwipeId === swipe.id 
                                                            ? 'bg-green-600 text-white' 
                                                            : 'bg-black text-neutral-300 hover:text-white border border-white/10'
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
                                            <div className="p-4 text-xs text-neutral-400 font-medium whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar bg-black/40 font-mono">
                                                {swipe.text.replace("[LINK-GERADO-ABAIXO]", generatedLink)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Materials and Google Drive Access Card */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.25 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl space-y-6 relative overflow-hidden group hover:border-[#D4AF37]/30 transition-all duration-300"
                            >
                                <div className="absolute top-0 right-0 w-60 h-60 bg-[#D4AF37]/5 rounded-full blur-[80px]" />
                                <div className="border-b border-white/10 pb-5">
                                    <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        <FolderOpen size={22} className="text-[#D4AF37]" /> Central de Materiais e Criativos
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-1 font-sans">
                                        Acesse a nossa pasta no Google Drive com todas as imagens, vídeos, criativos para anúncios e recursos de divulgação para o Curso W-Tech.
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="bg-[#050505]/40 p-4 rounded-xl border border-white/5">
                                        <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block mb-1">Vídeos & VSL</span>
                                        <h4 className="text-xs font-bold text-white mb-1">Vídeos de Vendas</h4>
                                        <p className="text-[10px] text-neutral-400 leading-relaxed">Vídeos em alta definição, depoimento de alunos e trechos das aulas prontas para rodar anúncios ou enviar direto no WhatsApp.</p>
                                    </div>
                                    <div className="bg-[#050505]/40 p-4 rounded-xl border border-white/5">
                                        <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block mb-1">Fotos & Capas</span>
                                        <h4 className="text-xs font-bold text-white mb-1">Banners & Mockups</h4>
                                        <p className="text-[10px] text-neutral-400 leading-relaxed">Artes dos módulos, fotos do Alex ajustando motos, mockups da área de membros e logos oficiais em fundo transparente.</p>
                                    </div>
                                    <div className="bg-[#050505]/40 p-4 rounded-xl border border-white/5">
                                        <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider block mb-1">Roteiros & Textos</span>
                                        <h4 className="text-xs font-bold text-white mb-1">Estrutura de Vendas</h4>
                                        <p className="text-[10px] text-neutral-400 leading-relaxed">Sugestões de copys prontas para Stories, sequências de quebra de objeção no direct e scripts validados de fechamento.</p>
                                    </div>
                                </div>

                                <a 
                                    href={driveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 text-sm font-black uppercase tracking-wider py-4 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-[#D4AF37]/10 hover:shadow-[#D4AF37]/20 active:scale-[0.99] text-center font-sans"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <ExternalLink size={18} className="stroke-[2.5]" /> Acessar Pasta de Criativos no Google Drive
                                    </span>
                                    <span className="text-[10px] text-neutral-850 font-bold max-w-xl normal-case block">
                                        Clique aqui para ter acesso aos materiais para você aprender a como vender e faturar com o curso de suspensão de regulagem para piloto da Wtech.
                                    </span>
                                </a>
                            </motion.div>

                            {/* DEVELOPER HUB: KIWIFY WEBHOOK INTEGRATION */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
                            >
                                <div className="border-b border-white/10 pb-5">
                                    <h3 className="font-display text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        <Code size={20} className="text-[#D4AF37]" /> Integração Técnica: Webhooks & API
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-1">Quer automatizar sua entrega, rastrear em tempo real no seu CRM ou rodar scripts de funil? Configure Webhooks.</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-4 text-xs text-neutral-400 leading-relaxed">
                                        <h4 className="font-display text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <Terminal size={14} className="text-[#D4AF37]" /> Fluxo de Integração
                                        </h4>
                                        <p>
                                            A Kiwify permite cadastrar URLs de webhook que disparam alertas instantâneos no momento exato em que uma compra é aprovada ou gerada.
                                        </p>
                                        <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-white/10">
                                            <div className="flex gap-2">
                                                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-black px-1.5 py-0.5 rounded h-max">1</span>
                                                <p className="text-[11px]">Vá no painel Kiwify {"->"} Aplicativos {"->"} Webhooks.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-black px-1.5 py-0.5 rounded h-max">2</span>
                                                <p className="text-[11px]">Crie um webhook para o evento "Compra Aprovada".</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-black px-1.5 py-0.5 rounded h-max">3</span>
                                                <p className="text-[11px]">Caso utilize um webhook nosso para dashboard de afiliados, nos forneça o seu Token Secreto.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock Terminal */}
                                    <div className="bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                                        <div className="bg-zinc-950 px-4 py-2 border-b border-white/10 flex justify-between items-center">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]/75" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                                            </div>
                                            <span className="text-[9px] font-mono text-neutral-500">payload_example.json</span>
                                        </div>
                                        <div className="p-4 font-mono text-[9px] text-neutral-400 overflow-x-auto select-all max-h-56">
                                            <pre className="leading-5">
                                                <span className="text-neutral-500">{`{`}</span><br />
                                                {`  `}
                                                <span className="text-[#D4AF37]">"event"</span>: <span className="text-green-400">"ORDER_APPROVED"</span>,<br />
                                                {`  `}
                                                <span className="text-[#D4AF37]">"order_status"</span>: <span className="text-green-400">"approved"</span>,<br />
                                                {`  `}
                                                <span className="text-[#D4AF37]">"payment_method"</span>: <span className="text-green-400">"pix"</span>,<br />
                                                {`  `}
                                                <span className="text-[#D4AF37]">"total_amount"</span>: <span className="text-blue-400">347.00</span>,<br />
                                                {`  `}
                                                <span className="text-[#D4AF37]">"commission"</span>: <span className="text-neutral-500">{`{`}</span><br />
                                                {`    `}
                                                <span className="text-[#D4AF37]">"amount"</span>: <span className="text-blue-400">69.40</span>,<br />
                                                {`    `}
                                                <span className="text-[#D4AF37]">"percentage"</span>: <span className="text-blue-400">20</span><br />
                                                {`  `}
                                                <span className="text-neutral-500">{`}`}</span>,<br />
                                                {`  `}
                                                <span className="text-[#D4AF37]">"affiliate"</span>: <span className="text-neutral-500">{`{`}</span><br />
                                                {`    `}
                                                <span className="text-[#D4AF37]">"email"</span>: <span className="text-green-400">"seu-email@afiliados.com"</span><br />
                                                {`  `}
                                                <span className="text-neutral-500">{`}`}</span><br />
                                                <span className="text-neutral-500">{`}`}</span>
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Right side: Step-by-step Sales Guide & VIP WhatsApp link */}
                        <div className="lg:col-span-1 space-y-6">
                            
                            {/* VIP WhatsApp Group widget */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="bg-zinc-900/50 border border-green-500/30 rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden hover:border-green-500/40 transition-colors"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-[40px]" />
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black shadow-lg shadow-green-500/20 shrink-0">
                                        <MessageSquare size={22} fill="black" />
                                    </div>
                                    <div>
                                        <h4 className="font-display font-black text-sm text-white uppercase tracking-tight">Grupo VIP de Afiliados</h4>
                                        <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider block mt-0.5">Suporte Direto</span>
                                    </div>
                                </div>
                                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                                    Entre no grupo oficial dos parceiros de vendas da W-Tech. Receba atualizações de estoque, campanhas exclusivas e suporte individual de prospecção.
                                </p>
                                <a 
                                    href="https://wa.me/5512997146957"
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-black py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:from-green-400 hover:to-green-500 transition-all active:scale-[0.98] shadow-lg shadow-green-500/10 text-center font-display"
                                >
                                    Acessar Grupo VIP <ArrowRight size={14} strokeWidth={2.5} />
                                </a>
                            </motion.div>

                            {/* Step-by-step Quick Sales Guide */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 shadow-xl space-y-5"
                            >
                                <h3 className="font-display text-sm font-black uppercase tracking-widest text-white border-b border-white/10 pb-3 flex items-center gap-2">
                                    <BookOpen size={16} className="text-[#D4AF37]" /> Manual do Parceiro W-Tech
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
                                        <div key={idx} className="flex gap-3.5 bg-[#050505]/40 p-4 rounded-xl border border-white/5 hover:border-[#D4AF37]/10 transition-colors">
                                            <span className="text-xs font-mono font-black text-[#D4AF37] shrink-0 mt-0.5">{manual.step}</span>
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-white leading-tight">{manual.title}</h4>
                                                <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">{manual.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
                )}

                {/* TAB CONTENT: ADMIN AFFILIATE GESTION LIST */}
                {activeTab === 'admin' && !publicMode && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-zinc-900/50 border border-white/10 rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-200"
                    >
                        {/* Search & Filters */}
                        <div className="p-4 md:p-6 border-b border-white/10 bg-black/30 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="w-full md:w-80 relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                <input 
                                    className="w-full bg-[#050505] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white outline-none focus:border-[#D4AF37] transition-all"
                                    placeholder="Buscar por nome, e-mail ou CPF/CNPJ..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto text-xs text-neutral-400 font-bold">
                                <span>Total de parceiros ativos: <span className="text-[#D4AF37] font-black">{filteredAffiliates.length}</span></span>
                            </div>
                        </div>

                        {/* Affiliates List Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 bg-black/40 text-[9px] font-black uppercase tracking-wider text-neutral-500">
                                        <th className="p-4">Nome do Afiliado</th>
                                        <th className="p-4">Razão Social / Cadastro</th>
                                        <th className="p-4">E-mail</th>
                                        <th className="p-4">CPF / CNPJ</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loadingAffiliates ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-neutral-500 font-medium">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37] mx-auto mb-3" />
                                                <p className="text-sm text-neutral-400 font-medium">Carregando afiliados da Kiwify...</p>
                                            </td>
                                        </tr>
                                    ) : filteredAffiliates.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-neutral-500 font-medium">
                                                <Users className="mx-auto mb-3 opacity-20" size={48} />
                                                <p className="text-sm">Nenhum afiliado encontrado.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAffiliates.map((aff, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors text-xs font-medium text-neutral-300">
                                                <td className="p-4 font-bold text-white">{aff.name}</td>
                                                <td className="p-4 text-neutral-400">{aff.company || '-'}</td>
                                                <td className="p-4 font-mono text-[11px] text-[#D4AF37]/80">{aff.email}</td>
                                                <td className="p-4 font-mono">{aff.doc || '-'}</td>
                                                <td className="p-4">
                                                    <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase px-2.5 py-0.5 rounded tracking-wide flex items-center gap-1.5 w-max">
                                                        <CheckCircle size={10} /> Ativo
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AffiliatesManagerView;
