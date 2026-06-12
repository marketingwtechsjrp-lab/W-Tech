import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import CheckoutOfferCard from '../components/CheckoutOfferCard';
import { LandingPage, Course } from '../types';
import { CheckCircle, ShieldCheck, ArrowRight, Star, Play, MapPin, Calendar, Clock, Check, User, Users, AlertTriangle, Navigation, X, Quote } from 'lucide-react';
import { triggerWebhook } from '../lib/webhooks';
import { distributeLead, handleLeadUpsert } from '../lib/leadDistribution';
import { QualificationQuiz } from '../components/QualificationQuiz';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

const LandingPageViewerV4: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const siteTitle = get('site_title', 'W-TECH');
    const whatsappGlobal = get('whatsapp_phone');
  
    interface LandingPageWithCourse extends LandingPage {
        course: Course;
    }
  
    const [lp, setLp] = useState<LandingPageWithCourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutDiretoEnabled, setCheckoutDiretoEnabled] = useState(false);

    // Form State
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');
    const [submitted, setSubmitted] = useState(false);
    const [spotsLeft, setSpotsLeft] = useState<number>(5); // Default simulated scarcity
    const [activeVideo, setActiveVideo] = useState<string | null>(null);
    const [showFloatingCTA, setShowFloatingCTA] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowFloatingCTA(true);
            } else {
                setShowFloatingCTA(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
    // Busca a config do checkout junto com a LP
    supabase.from('SITE_Config').select('value').eq('key', 'checkout_direto_habilitado').single()
        .then(({ data }) => setCheckoutDiretoEnabled(data?.value === 'true'));

    const fetchLP = async () => {
      if (!slug) return;
      setLoading(true);

      // Check if 'slug' is actually a UUID (Course ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
      
      let lpData: LandingPageWithCourse | null = null;

      if (isUUID) {
          // 1. Try to find LP linked to this Course ID
          const { data: linkedLP } = await supabase.from('SITE_LandingPages').select('*, course:SITE_Courses(*, SITE_Enrollments(count))').eq('course_id', slug).single();
          
          if (linkedLP) {
              lpData = linkedLP; 
          } else {
              // 2. No LP found? Fetch Course and Generate Virtual LP
              const { data: courseData } = await supabase.from('SITE_Courses').select('*, SITE_Enrollments(count)').eq('id', slug).single();
              if (courseData) {
                  // Create Virtual LP from Course Data
                  lpData = {
                      id: 'virtual',
                      course_id: courseData.id,
                      slug: courseData.id,
                      title: courseData.title,
                      subtitle: courseData.description ? courseData.description.substring(0, 150) + "..." : "Prepare-se para transformar sua carreira com a metodologia W-Tech.",
                      hero_image: courseData.image || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
                      hero_secondary_image: null,
                      video_url: null,
                      benefits: [],
                      modules: [],
                      instructor_name: courseData.instructor || 'Equipe W-Tech',
                      instructor_bio: 'Especialista certificado W-Tech.',
                      instructor_image: null,
                      whatsapp_number: '5511999999999',
                      pixel_id: null,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      status: 'Published',
                      course: courseData // Attach course data
                  } as any as LandingPageWithCourse;
              }
          }
      } else {
          // Standard Slug Fetch
          const { data } = await supabase.from('SITE_LandingPages').select('*, course:SITE_Courses(*, SITE_Enrollments(count))').eq('slug', slug).single();
          lpData = data;
      }
      
      if (lpData) {
        // Map DB snake_case to TS camelCase (reuse existing logic, ensure 'course' is mapped if fetch didn't automap nested)
        const rawCourse = (lpData as any).course;
        
        const mappedCourse = rawCourse ? {
            ...rawCourse,
            locationType: rawCourse.location_type,
            registeredCount: rawCourse.SITE_Enrollments?.[0]?.count || 0,
            hotelsInfo: rawCourse.hotels_info,
            startTime: rawCourse.start_time,
            endTime: rawCourse.end_time,
            dateEnd: rawCourse.date_end,
            mapUrl: rawCourse.map_url,
            zipCode: rawCourse.zip_code,
            addressNumber: rawCourse.address_number,
            addressNeighborhood: rawCourse.address_neighborhood,
            checkoutType: rawCourse.checkout_type
        } : null;

        const mappedData: LandingPageWithCourse = {
            ...lpData,
            title: lpData.title, // Ensure priority
            subtitle: lpData.subtitle,
            slug: lpData.slug,
            heroImage: (lpData as any).hero_image, 
            videoUrl: (lpData as any).video_url,
            benefits: lpData.benefits,
            instructorName: (lpData as any).instructor_name,
            instructorBio: (lpData as any).instructor_bio,
            instructorImage: (lpData as any).instructor_image,
            whatsappNumber: (lpData as any).whatsapp_number,
            pixelId: (lpData as any).pixel_id,
            modules: lpData.modules,
            heroSecondaryImage: (lpData as any).hero_secondary_image,
            quizEnabled: (lpData as any).quiz_enabled,
            fakeAlertsEnabled: (lpData as any).fake_alerts_enabled,
            course: mappedCourse,
            courseId: (lpData as any).course_id  // garante disponibilidade para redirect ao checkout
         };

         // Auto-redirect para o viewer do template salvo, se diferente de 'v4'
         const savedTemplate = (lpData as any).template || 'v1';
         if (savedTemplate !== 'v4') {
             navigate(savedTemplate === 'v1' ? `/lp/${slug}` : `/lp${String(savedTemplate).replace('v', '')}/${slug}`, { replace: true });
             return;
         }

         setLp(mappedData);

         // Calculate Scarcity logic...
         if (mappedCourse) {
             const total = mappedCourse.capacity || 20;
             const enrolled = mappedCourse.registeredCount || 0;
             const realRemaining = Math.max(0, total - enrolled);
             setSpotsLeft(realRemaining);
         }
      } else {
          console.error("LP not found");
      }
      setLoading(false);
    };
    fetchLP();
  }, [slug, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lp) return;

    try {
        const isInternationalCourse = lp.course?.isInternational || (lp.course as any)?.is_international;
        const checkoutAtivoParaLP = lp.course?.checkoutType === 'automated' && !isInternationalCourse;

        const payload = {
            name: form.name,
            email: form.email,
            phone: form.phone,
            type: 'Course_Registration',
            status: 'New',
            context_id: `LP: ${lp.title} (${lp.slug})`,
            tags: [
                'landing_page',
                lp.slug ? String(lp.slug) : 'virtual_lp',
                (lp.course?.status === 'Full' || lp.course?.status === 'Completed') ? 'lista_espera_curso' : '',
                checkoutAtivoParaLP ? 'checkout_direto' : ''  // Marca desde o início que seguiu o fluxo automático
            ].filter(Boolean),
            origin: window.location.href,
            assigned_to: null
        };

        const leadResult = await handleLeadUpsert(payload);

        // Redireciona ao checkout se: habilitado + curso nacional + tem course_id
        const courseIdForCheckout = (lp as any).courseId || (lp as any).course_id;
        if (checkoutAtivoParaLP && courseIdForCheckout && leadResult?.id) {
            navigate(`/checkout-curso/${courseIdForCheckout}?lid=${leadResult.id}&type=${paymentType}`);
            return;
        }

        // Fallback: obrigado (checkout desabilitado, LP sem curso ou curso internacional)
        setSubmitted(true);
    } catch (err: any) {
        console.error(err);
        alert('Erro ao enviar inscrição. verifique o console ou contate o suporte.');
    }
  };

  const scrollToForm = () => {
      document.getElementById('enroll-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScrollToModules = (e: React.MouseEvent) => {
      e.preventDefault();
      const element = document.getElementById('modules');
      if (element) {
          // Offset for fixed header approx 100px
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
          window.scrollTo({
              top: offsetPosition,
              behavior: "smooth"
          });
      }
  };

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-900">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wtech-gold"></div>
          </div>
      );
  }
  if (!lp) {
      return (
          <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-950 font-medium">
              Página não encontrada. Verifique o link.
          </div>
      );
  }

  const mapQuery = lp.course?.address ? `${lp.course.address}, ${lp.course.city}` : lp.course?.location || 'Sao Paulo';
  const whatsappNumber = lp.whatsappNumber || whatsappGlobal;
  const waLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}`
    : '#';

  return (
    <div className="min-h-screen font-sans bg-white text-zinc-900 selection:bg-wtech-gold selection:text-black overflow-x-hidden">
        
        {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

        {/* Navbar */}
        <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {systemLogo ? (
                        <img src={systemLogo} alt={siteTitle} className="h-10 object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-wtech-gold rounded-sm transform rotate-45 flex items-center justify-center">
                            <span className="transform -rotate-45 font-bold text-black text-xs">W</span>
                        </div>
                    )}
                    {!systemLogo && (
                        <span className="font-bold text-lg tracking-wider text-zinc-950">
                            W-TECH <span className="text-yellow-600">ACADEMY</span>
                        </span>
                    )}
                </div>
                <button onClick={scrollToForm} className="hidden md:flex bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-6 py-2.5 rounded-lg font-bold uppercase text-xs tracking-widest hover:shadow-[0_4px_14px_rgba(212,175,55,0.4)] transition-all">
                    Garantir Vaga
                </button>
            </div>
        </header>

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden bg-gray-50/55">
             {/* Dynamic Background with Overlay */}
             <div className="absolute inset-0 z-0">
                 {lp.heroImage && <img src={lp.heroImage} alt="Hero Background" className="w-full h-full object-cover opacity-15 scale-105" />}
                 <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent"></div>
                 <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
                 {/* Grid Pattern */}
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5"></div>
             </div>

             <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
                 
                 {/* TEXT CONTENT */}
                 <div className="lg:col-span-7 space-y-8">
                     {/* Badges */}
                     <div className="flex flex-wrap gap-3">
                        <div className="inline-flex items-center gap-1.5 bg-wtech-gold/10 border border-wtech-gold/30 text-yellow-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                            <Star size={12} className="fill-yellow-600 text-yellow-600" /> Certificação Oficial
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-gray-150 border border-gray-200 text-gray-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                            <MapPin size={12} /> {lp.course?.city}
                        </div>
                     </div>
                     
                     {/* Headlines */}
                     <h1 className="text-5xl md:text-7xl font-black leading-tight uppercase tracking-tight text-zinc-950 drop-shadow-sm">
                         {lp.title}
                     </h1>
                     
                     <p className="text-xl md:text-2xl text-zinc-600 font-light leading-relaxed max-w-2xl border-l-4 border-wtech-gold pl-6">
                         {lp.subtitle}
                     </p>
                     
                     {/* Scarcity OR Status Bar */}
                     <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm max-w-md">
                        {lp.course?.status === 'Full' || lp.course?.status === 'Completed' ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs font-bold uppercase text-orange-600">
                                    <span>Inscrições Encerradas</span>
                                    <span className="flex items-center gap-1"><AlertTriangle size={12}/> Vagas Esgotadas</span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">Inscreva-se abaixo para entrar na lista de espera da próxima turma em sua região.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between text-xs font-bold uppercase text-gray-500 mb-2">
                                    <span>Inscrições Abertas</span>
                                    <span className={`flex items-center gap-1 font-bold ${spotsLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-yellow-600'}`}>
                                        {spotsLeft <= 10 ? `🔥 ÚLTIMAS ${spotsLeft} VAGAS!` : 'VAGAS LIMITADAS'}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full w-[85%] relative overflow-hidden">
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </>
                        )}
                     </div>

                     <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <button onClick={scrollToForm} className={`${lp.course?.status === 'Full' || lp.course?.status === 'Completed' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'} text-white px-10 py-5 rounded-lg font-black text-lg uppercase tracking-wider hover:scale-[1.02] transition-all shadow-[0_10px_25px_-5px_rgba(220,38,38,0.3)] flex items-center justify-center gap-3 group`}>
                            {lp.course?.status === 'Full' || lp.course?.status === 'Completed' ? 'Entrar na Lista de Espera' : 'Quero me Inscrever'} <ArrowRight className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </button>
                        <a href="#modules" onClick={handleScrollToModules} className="px-8 py-5 border border-gray-300 rounded-lg font-bold text-zinc-700 uppercase tracking-widest hover:bg-gray-100 transition-all text-center">
                            Ver Programação
                        </a>
                     </div>
                 </div>
                 
                 {/* WELCOME IMAGE CONTAINER */}
                 <div className="lg:col-span-5 relative">
                     <div className="absolute -inset-4 bg-gradient-to-tr from-wtech-gold/15 to-transparent rounded-[2rem] blur-2xl opacity-40"></div>
                     <div className="relative rounded-2xl overflow-hidden group border border-gray-200/80 shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                        <img 
                            src={lp.heroSecondaryImage || "https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp"} 
                            alt="Welcome Image" 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                        />
                         <div className="absolute bottom-6 left-6 z-20">
                             <div className="inline-block bg-wtech-gold text-black px-3 py-1 font-bold text-xs uppercase tracking-widest rounded-sm mb-2">
                                 Bem-vindo
                             </div>
                             <p className="text-white text-lg font-medium max-w-xs leading-snug">
                                 Prepare-se para transformar sua carreira com a metodologia W-Tech.
                             </p>
                         </div>
                     </div>
                 </div>
             </div>
        </section>

        {/* INFO BAR */}
        <div className="border-y border-gray-200 bg-gray-50/70 backdrop-blur-sm">
            <div className="container mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-wtech-gold/15 flex items-center justify-center text-yellow-700 shrink-0">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Data</div>
                        <div className="text-sm font-bold text-zinc-900">
                            {lp.course?.date ? (
                                lp.course.dateEnd ? 
                                `${formatDateLocal(lp.course.date)} - ${formatDateLocal(lp.course.dateEnd)}` 
                                : formatDateLocal(lp.course.date)
                            ) : 'A Definir'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-wtech-gold/15 flex items-center justify-center text-yellow-700 shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Horário</div>
                        <div className="text-sm font-bold text-zinc-900">{lp.course?.startTime || '08:00'} - {lp.course?.endTime || '18:00'}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-wtech-gold/15 flex items-center justify-center text-yellow-700 shrink-0">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Local</div>
                        <div className="text-sm font-bold text-zinc-900 truncate max-w-[120px]">{lp.course?.city}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-wtech-gold/15 flex items-center justify-center text-yellow-700 shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Vagas</div>
                        <div className="text-sm font-bold text-zinc-900">
                            {lp.course?.status === 'Full' || lp.course?.status === 'Completed' ? 'Lista de Espera' : `Limitadas (${spotsLeft} Restantes)`}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* DETAILS SECTION */}
        <section id="details" className="py-24 bg-white relative">
            <div className="container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* VIDEO */}
                    <div className="space-y-6">
                         <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3 text-zinc-950">
                            <span className="w-12 h-1 bg-wtech-gold"></span>
                            Sobre o Treinamento
                         </h2>
                        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white shadow-xl">
                             {lp.videoUrl ? (
                                <div className="aspect-video">
                                     <iframe 
                                        src={lp.videoUrl.replace('watch?v=', 'embed/')} 
                                        className="w-full h-full" 
                                        title="Course Video"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                     ></iframe>
                                </div>
                             ) : (
                                <div className="aspect-video flex items-center justify-center bg-gray-50">
                                    <div className="text-center p-8">
                                        <Play size={48} className="mx-auto text-gray-300 mb-4" />
                                        <p className="text-gray-400">Vídeo indisponível</p>
                                    </div>
                                </div>
                             )}
                        </div>
                        <p className="text-zinc-600 leading-relaxed text-lg">
                            Esta é sua oportunidade de dominar as técnicas mais avançadas do mercado. 
                            Um conteúdo prático, direto ao ponto e focado em resultados reais para sua oficina.
                        </p>
                    </div>

                    {/* BENEFITS */}
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            {lp.benefits && lp.benefits.map((item, idx) => (
                                <div key={idx} className="bg-gray-50/50 p-6 rounded-xl border border-gray-150 hover:border-wtech-gold/40 hover:bg-white hover:shadow-md transition-all duration-300 group cursor-default">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-wtech-gold/10 text-yellow-700 flex items-center justify-center shrink-0 group-hover:bg-wtech-gold group-hover:text-black transition-colors">
                                            <Check size={20} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-zinc-950 mb-1 group-hover:text-yellow-600 transition-colors">{item.title}</h3>
                                            <p className="text-zinc-500 text-sm">{item.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* SCHEDULE SECTION */}
        {lp.course?.schedule && (
            <section id="schedule" className="py-24 bg-white border-t border-gray-100">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                         <span className="text-yellow-600 font-bold uppercase tracking-widest text-xs">Cronograma</span>
                         <h2 className="text-4xl font-black text-zinc-950 uppercase mt-2">Programação do Curso</h2>
                    </div>
                    
                    <div className="max-w-4xl mx-auto bg-gray-50/50 p-8 md:p-12 rounded-3xl border border-gray-200/80 shadow-sm">
                        <div className="prose prose-zinc max-w-none text-zinc-700 prose-headings:text-zinc-950 prose-a:text-wtech-gold prose-p:leading-relaxed" 
                             dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.course.schedule.replace(/\n/g, '<br/>')) }} />
                    </div>
                </div>
            </section>
        )}

        {/* MODULES SECTION */}
        {lp.modules && lp.modules.length > 0 && (
            <section id="modules" className="py-24 bg-gray-50/70 border-t border-gray-250">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                         <span className="text-yellow-600 font-bold uppercase tracking-widest text-xs">Conteúdo Programático</span>
                         <h2 className="text-4xl font-black text-zinc-950 uppercase mt-2">O Que Você Vai Aprender</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {lp.modules.map((mod, idx) => (
                            <div key={idx} className="group relative bg-white border border-gray-200/80 rounded-2xl overflow-hidden hover:border-wtech-gold/40 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl shadow-sm">
                                <div className="aspect-video relative overflow-hidden">
                                     <div className="absolute top-4 right-4 z-20 font-black text-6xl text-gray-900/5 group-hover:text-wtech-gold/10 transition-colors pointer-events-none select-none">
                                         {idx + 1}
                                     </div>
                                    <img src={mod.image} alt={mod.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 filter grayscale group-hover:grayscale-0" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent opacity-85 group-hover:opacity-65 transition-opacity"></div>
                                </div>
                                <div className="p-8 relative bg-white">
                                    <h3 className="text-xl font-bold text-zinc-950 mb-3 uppercase leading-tight group-hover:text-yellow-600 transition-colors">{mod.title}</h3>
                                    <p className="text-zinc-650 text-sm leading-relaxed">{mod.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}
        
        {/* INSTRUCTOR */}
        <section className="py-24 bg-gradient-to-b from-gray-50/80 to-white border-t border-gray-200">
            <div className="container mx-auto px-6 flex flex-col items-center">
                 <span className="text-yellow-600 font-bold uppercase tracking-widest text-xs mb-4">Seu Mentor</span>
                 <h2 className="text-4xl font-black text-zinc-950 uppercase mb-16">Conheça o Instrutor</h2>
                 
                 <div className="bg-white border border-gray-200/80 p-8 md:p-12 rounded-3xl max-w-5xl w-full flex flex-col md:flex-row gap-12 items-center hover:border-gray-300 hover:shadow-lg transition-all duration-300">
                     <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 relative">
                         <div className="absolute inset-0 bg-wtech-gold rounded-2xl rotate-6 opacity-20 group-hover:rotate-12 transition-transform"></div>
                         <img src={lp.instructorImage || "https://github.com/shadcn.png"} alt={lp.instructorName} className="w-full h-full object-cover rounded-2xl relative z-10 shadow-xl grayscale hover:grayscale-0 transition-all duration-500" />
                     </div>
                     <div className="text-center md:text-left">
                         <h3 className="text-3xl font-bold text-zinc-950 mb-2">{lp.instructorName}</h3>
                         <div className="w-12 h-1 bg-wtech-gold mx-auto md:mx-0 mb-6"></div>
                         <div className="prose prose-zinc text-zinc-650 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }} />
                     </div>
                 </div>
            </div>
        </section>

        {/* TESTIMONIALS */}
        {lp.testimonials && lp.testimonials.length > 0 && (
            <section className="py-24 bg-gray-50/60 border-t border-gray-150">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-yellow-600 font-bold uppercase tracking-widest text-xs mb-4 block">Prova Social</span>
                        <h2 className="text-4xl font-black text-zinc-950 uppercase">O Que Dizem Nossos Alunos</h2>
                        <div className="w-16 h-1 bg-wtech-gold mx-auto mt-4"></div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {lp.testimonials.map((test, idx) => {
                            const ytId = test.videoUrl ? (() => {
                                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                const match = test.videoUrl.match(regExp);
                                return (match && match[2].length === 11) ? match[2] : '';
                            })() : '';

                            return (
                                <div key={idx} className="bg-white border border-gray-200 rounded-3xl p-6 relative flex flex-col justify-between hover:border-wtech-gold/30 hover:shadow-xl transition-all duration-300 group shadow-sm">
                                    {ytId ? (
                                        /* Video Testimonial */
                                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 group-hover:border-wtech-gold/30 transition-colors bg-gray-100 cursor-pointer"
                                                onClick={() => setActiveVideo(ytId)}>
                                                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt={test.name} />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <div className="w-14 h-14 bg-wtech-gold text-black rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 active:scale-95 transition-all duration-300">
                                                        <Play size={20} className="fill-black text-black ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-zinc-600 text-sm italic leading-relaxed">"{test.text}"</p>
                                        </div>
                                    ) : (
                                        /* Text Testimonial */
                                        <div className="space-y-4 flex-1">
                                            <Quote size={32} className="text-wtech-gold/15" />
                                            <p className="text-zinc-700 text-sm leading-relaxed">"{test.text}"</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-100">
                                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-wtech-gold/20 bg-gray-50 flex items-center justify-center">
                                            {test.image ? (
                                                <img src={test.image} className="w-full h-full object-cover" alt={test.name} />
                                            ) : (
                                                <div className="font-black text-yellow-700 text-lg">{test.name[0]}</div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-zinc-900 text-sm">{test.name}</h4>
                                            <div className="flex gap-0.5 mt-1">
                                                {[...Array(5)].map((_, j) => <Star key={j} size={11} className="fill-wtech-gold text-wtech-gold" />)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
        )}

        {/* LOCATION & MAP */}
        <section className="py-24 relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gray-50/70 skew-x-12 translate-x-1/4"></div>
            
            <div className="container mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                         <h2 className="text-4xl font-black uppercase text-zinc-950">
                            Local do Evento
                         </h2>
                         <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-wtech-gold/15 rounded-lg text-yellow-700">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="text-gray-400 text-xs font-bold uppercase mb-1">Endereço</h4>
                                    <p className="text-xl font-medium text-zinc-950 max-w-xs">{lp.course?.address || 'Endereço a ser confirmado'}</p>
                                    <p className="text-gray-500">{lp.course?.addressNeighborhood}, {lp.course?.city} - {lp.course?.state}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-wtech-gold/15 rounded-lg text-yellow-700">
                                    <Navigation size={24} />
                                </div>
                                <div>
                                    <h4 className="text-gray-400 text-xs font-bold uppercase mb-1">Como Chegar</h4>
                                    <a target="_blank" rel="noreferrer" href={lp.course?.mapUrl ? lp.course.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} className="text-blue-600 hover:text-blue-500 underline font-medium">
                                        Abrir no Google Maps
                                    </a>
                                </div>
                            </div>
                         </div>
                         
                         <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-4">
                             <AlertTriangle className="text-red-600 shrink-0" />
                             <p className="text-red-800 text-sm">
                                  <strong className="text-red-950 block font-bold uppercase mb-1">Vagas Limitadas para Presencial</strong>
                                  Devido à capacidade do local, as vagas são extremamente limitadas. Garanta a sua.
                             </p>
                         </div>
                     </div>

                     <div className="h-[400px] w-full bg-gray-50 rounded-2xl overflow-hidden shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            className="w-full h-full border-0"
                            title="Mapa do Local"
                        ></iframe>
                     </div>
                </div>
            </div>
        </section>

        {/* FORM FINAL SECTION */}
        <section className="py-24 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden" id="enroll-form">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none"></div>
            
            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-2xl mx-auto text-center mb-12">
                     <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 text-zinc-950">
                        {lp.course?.status === 'Full' || lp.course?.status === 'Completed' ? 'Lista de Espera' : 'Garanta Sua Vaga'}
                     </h2>
                     <p className="text-xl text-zinc-650">
                        {lp.course?.status === 'Full' || lp.course?.status === 'Completed' 
                            ? 'Este curso já preencheu todas as vagas ou já foi realizado, mas você pode deixar seus dados para a próxima turma na sua região.' 
                            : 'Junte-se à elite da mecânica de suspensões. Preencha o formulário abaixo para iniciar sua inscrição.'}
                    </p>
                </div>

                <div className="max-w-xl mx-auto bg-white border border-gray-200 p-8 md:p-12 rounded-3xl shadow-2xl relative group">
                     <div className="absolute -inset-1 bg-gradient-to-r from-wtech-gold/15 to-transparent opacity-30 rounded-3xl blur group-hover:opacity-50 transition-opacity duration-1000"></div>
                     <div className="relative bg-white">
                        {lp.quizEnabled ? (
                            <QualificationQuiz lp={lp} onComplete={() => setSubmitted(true)} whatsappGlobalNumber={whatsappGlobal} />
                        ) : (
                            submitted ? (
                                    <div className="text-center py-12 animate-fade-in bg-green-50 rounded-xl border border-green-200">
                                        <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md shadow-green-950/20">
                                            <Check size={40} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-zinc-900 mb-2">Inscrição Recebida!</h3>
                                        <p className="text-green-700">Em breve entraremos em contato pelo WhatsApp.</p>
                                    </div>
                            ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Aviso do Checkout Direto: explica o fluxo de pagamento e o sinal de reserva */}
                                        {(() => {
                                            const isInternationalCourse = lp.course?.isInternational || (lp.course as any)?.is_international;
                                            const isFullOrDone = lp.course?.status === 'Full' || lp.course?.status === 'Completed';
                                            const checkoutAtivo = lp.course?.checkoutType === 'automated' && !isInternationalCourse && !isFullOrDone;
                                            if (!checkoutAtivo) return null;

                                            return (
                                                <div className="text-left">
                                                    <CheckoutOfferCard
                                                        theme="light"
                                                        coursePrice={Number((lp.course as any)?.price || 0)}
                                                        depositPrice={Number((lp.course as any)?.deposit_price || 0)}
                                                    />
                                                </div>
                                            );
                                        })()}

                                        {/* Selector de Opção de Pagamento */}
                                        {(() => {
                                            const isInternationalCourse = lp.course?.isInternational || (lp.course as any)?.is_international;
                                            const isFullOrDone = lp.course?.status === 'Full' || lp.course?.status === 'Completed';
                                            const checkoutAtivo = lp.course?.checkoutType === 'automated' && !isInternationalCourse && !isFullOrDone;
                                            if (!checkoutAtivo) return null;

                                            const depositPrice = lp.course?.deposit_price != null && Number(lp.course.deposit_price) > 0
                                                ? Number(lp.course.deposit_price)
                                                : 400.00;
                                            const coursePrice = Number(lp.course?.price || 0);

                                            return (
                                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 mb-6 text-left">
                                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-3">
                                                        Opção de Inscrição
                                                    </label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {/* Card: Integral */}
                                                        <div
                                                            onClick={() => setPaymentType('full')}
                                                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                                                                paymentType === 'full'
                                                                    ? 'border-wtech-gold bg-yellow-50/30 shadow-sm'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-black text-gray-950 uppercase tracking-tight">Valor Integral</span>
                                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                    paymentType === 'full' ? 'border-wtech-gold' : 'border-gray-350'
                                                                }`}>
                                                                    {paymentType === 'full' && <div className="w-2 h-2 rounded-full bg-wtech-gold" />}
                                                                </div>
                                                            </div>
                                                            <span className="text-lg font-black text-gray-900">
                                                                R$ {coursePrice.toFixed(2).replace('.', ',')}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 mt-2 font-bold leading-tight">Acesso integral garantido</span>
                                                        </div>

                                                        {/* Card: Sinal */}
                                                        <div
                                                            onClick={() => setPaymentType('deposit')}
                                                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex flex-col justify-between ${
                                                                paymentType === 'deposit'
                                                                    ? 'border-wtech-gold bg-yellow-50/30 shadow-sm'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-black text-gray-950 uppercase tracking-tight">Reservar Vaga</span>
                                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                    paymentType === 'deposit' ? 'border-wtech-gold' : 'border-gray-350'
                                                                }`}>
                                                                    {paymentType === 'deposit' && <div className="w-2 h-2 rounded-full bg-wtech-gold" />}
                                                                </div>
                                                            </div>
                                                            <span className="text-lg font-black text-gray-900">
                                                                R$ {depositPrice.toFixed(2).replace('.', ',')}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 mt-2 font-bold leading-tight">Sinal da pré-inscrição para assegurar a vaga</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="group-form">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">Nome Completo</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                                                <input 
                                                    required 
                                                    value={form.name} 
                                                    onChange={e => setForm({...form, name: e.target.value})}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/25 outline-none transition-all" 
                                                    placeholder="Digite seu nome" 
                                                />
                                            </div>
                                        </div>
                                        <div className="group-form">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">WhatsApp</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-4 text-gray-400 font-bold text-xs">BR</span>
                                                <input 
                                                    required 
                                                    value={form.phone} 
                                                    onChange={e => setForm({...form, phone: e.target.value})}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/25 outline-none transition-all" 
                                                    placeholder="(00) 00000-0000" 
                                                />
                                            </div>
                                        </div>
                                        <div className="group-form">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">E-mail</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-4 text-gray-400">@</div>
                                                <input 
                                                    required 
                                                    type="email"
                                                    value={form.email} 
                                                    onChange={e => setForm({...form, email: e.target.value})}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/25 outline-none transition-all" 
                                                    placeholder="Digite seu e-mail" 
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="w-full bg-gradient-to-r from-wtech-gold to-yellow-600 text-black py-4.5 rounded-xl font-black text-lg uppercase tracking-wider hover:shadow-[0_10px_20px_rgba(212,175,55,0.3)] hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
                                            {lp.course?.status === 'Full' || lp.course?.status === 'Completed' 
                                                ? 'Entrar na Lista' 
                                                : paymentType === 'deposit' 
                                                    ? 'Garantir Vaga (Pré-Inscrição)' 
                                                    : 'Garantir Vaga (Inscrição Integral)'} <ArrowRight size={20} strokeWidth={3} />
                                        </button>

                                        <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-100 text-gray-400 text-xs font-bold uppercase">
                                            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-600" /> Seus dados estão seguros</span>
                                            <span>•</span>
                                            <span>Oficial W-Tech</span>
                                        </div>
                                    </form>
                            )
                        )}
                     </div>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-950 text-gray-500 py-12 border-t border-gray-900 text-center text-sm">
            <div className="container mx-auto px-6 space-y-4">
                <p>© {new Date().getFullYear()} W-Tech Academy. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-6 text-xs font-bold uppercase tracking-wider">
                    <a href="/termos" className="hover:text-white transition-colors">Termos de Uso</a>
                    <span>•</span>
                    <a href="/privacidade" className="hover:text-white transition-colors">Privacidade</a>
                </div>
            </div>
        </footer>

        {/* Mobile Floating CTA (Fixed Bottom) */}
        {showFloatingCTA && (
            <div className="fixed bottom-0 left-0 w-full z-45 bg-white/95 backdrop-blur-md border-t border-gray-200 py-4 px-6 md:hidden flex items-center justify-between shadow-[0_-5px_15px_rgba(0,0,0,0.05)] animate-slide-up">
                <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Curso Oficial</div>
                    <div className="text-sm font-black text-zinc-950 max-w-[150px] truncate">{lp.title}</div>
                </div>
                <button onClick={scrollToForm} className="bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-6 py-3 rounded-lg font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all">
                    Garantir Vaga
                </button>
            </div>
        )}

        {/* TESTIMONIAL VIDEO MODAL (Keep Dark Backdrop and Dark Focus for Premium Video Playback) */}
        {activeVideo && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in">
                <div className="absolute inset-0" onClick={() => setActiveVideo(null)}></div>
                <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 w-full max-w-4xl aspect-video relative z-10 shadow-2xl">
                    <button 
                        onClick={() => setActiveVideo(null)} 
                        className="absolute top-4 right-4 text-white hover:text-wtech-gold bg-black/40 hover:bg-black/80 w-10 h-10 rounded-full flex items-center justify-center transition-colors z-20"
                    >
                        <X size={20} />
                    </button>
                    <iframe 
                        src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} 
                        className="w-full h-full" 
                        title="Video testimonial player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        )}

    </div>
  );
};

export default LandingPageViewerV4;
