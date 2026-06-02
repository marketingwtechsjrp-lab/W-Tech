import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GridVignetteBackground } from '../../ui/vignette-grid-background';
import { 
    Users, Search, DollarSign, Award, Download, Copy, Check, MessageSquare, 
    Share2, ArrowRight, ShieldCheck, Flame, BookOpen, Layers, CheckCircle,
    ExternalLink, Coins, Sparkles, AlertCircle, Terminal, HelpCircle, Eye,
    Link, Code, Clock, Lock, ChevronRight, FolderOpen, TrendingUp
} from 'lucide-react';
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

    const filteredCreatives = selectedCategory === 'all'
        ? CREATIVES
        : CREATIVES.filter(c => c.category === selectedCategory);

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
