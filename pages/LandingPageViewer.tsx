import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LandingPage, Course } from '../types';
import { CheckCircle, ShieldCheck, ArrowRight, Star, Play, MapPin, Calendar, Clock, Check, User, Users, AlertTriangle, Navigation } from 'lucide-react';
import { triggerWebhook } from '../lib/webhooks';
import { distributeLead, handleLeadUpsert } from '../lib/leadDistribution';
import { QualificationQuiz } from '../components/QualificationQuiz';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal, sanitizeHtml } from '../lib/utils';

const LandingPageViewer: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { get } = useSettings();
    const systemLogo = get('logo_url');
    const siteTitle = get('site_title', 'W-TECH');
    const whatsappGlobal = get('whatsapp_phone');
  
    interface LandingPageWithCourse extends LandingPage {
        course: Course;
    }
  
    const [lp, setLp] = useState<LandingPageWithCourse | null>(null);
    const [loading, setLoading] = useState(true);
  
    // Form State
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [submitted, setSubmitted] = useState(false);
    const [spotsLeft, setSpotsLeft] = useState<number>(5); // Default simulated scarcity

    useEffect(() => {
    const fetchLP = async () => {
      if (!slug) return;
      setLoading(true);

      // Check if 'slug' is actually a UUID (Course ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
      
      let lpData: LandingPageWithCourse | null = null;

      if (isUUID) {
          // 1. Try to find LP linked to this Course ID
          const { data: linkedLP } = await supabase.from('SITE_LandingPages').select('*, course:SITE_Courses(*)').eq('course_id', slug).single();
          
          if (linkedLP) {
              lpData = linkedLP; 
          } else {
              // 2. No LP found? Fetch Course and Generate Virtual LP
              const { data: courseData } = await supabase.from('SITE_Courses').select('*').eq('id', slug).single();
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
          const { data } = await supabase.from('SITE_LandingPages').select('*, course:SITE_Courses(*)').eq('slug', slug).single();
          lpData = data;
      }
      
      if (lpData) {
        // Map DB snake_case to TS camelCase (reuse existing logic, ensure 'course' is mapped if fetch didn't automap nested)
        const rawCourse = (lpData as any).course;
        
        const mappedCourse = rawCourse ? {
            ...rawCourse,
            locationType: rawCourse.location_type,
            registeredCount: 0, // Placeholder
            hotelsInfo: rawCourse.hotels_info,
            startTime: rawCourse.start_time,
            endTime: rawCourse.end_time,
            dateEnd: rawCourse.date_end,
            mapUrl: rawCourse.map_url,
            zipCode: rawCourse.zip_code,
            addressNumber: rawCourse.address_number,
            addressNeighborhood: rawCourse.address_neighborhood
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
            course: mappedCourse
        };
        setLp(mappedData);

        // Calculate Scarcity logic...
        if (mappedCourse) {
            const total = mappedCourse.capacity || 20;
            const remaining = Math.max(0, total - 0); // Mock registered=0 for now
            setSpotsLeft(remaining > 5 ? 5 : remaining);
        }
      } else {
          console.error("LP not found");
      }
      setLoading(false);
    };
    fetchLP();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lp) return;

    try {
        const payload = {
            name: form.name,
            email: form.email,
            phone: form.phone,
            type: 'Course_Registration',
            status: 'New',
            context_id: `LP: ${lp.title} (${lp.slug})`,
            tags: ['landing_page', lp.slug ? String(lp.slug) : 'virtual_lp'],
            origin: window.location.href,
            assigned_to: null // handleLeadUpsert will handle distribution if needed
        };

        await handleLeadUpsert(payload);
        
        // await triggerWebhook('webhook_lead', payload); // handleLeadUpsert already triggers specific webhook if new or updated? 
        // Logic check: handleLeadUpsert triggers 'webhook_lead'. 
        // Duplicate trigger? No, handleLeadUpsert triggers it. So we can remove duplicate call or keep if event type differs.
        // The previous code had: await triggerWebhook('webhook_lead', payload);
        // handleLeadUpsert also does that. So I will REMOVE this explicit call to avoid double webhook.
        
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-white"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-wtech-gold"></div></div>;
  if (!lp) return <div className="h-screen flex items-center justify-center bg-black text-white">Página não encontrada. Verifique o link.</div>;

  const mapQuery = lp.course?.address ? `${lp.course.address}, ${lp.course.city}` : lp.course?.location || 'Sao Paulo';

  return (
    <div className="min-h-screen font-sans bg-[#050505] text-white selection:bg-wtech-gold selection:text-black overflow-x-hidden">
        
        {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

        {/* Navbar */}
        <header className="fixed top-0 left-0 w-full z-50 bg-black/60 backdrop-blur-md border-b border-white/5 transition-all duration-300">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {systemLogo ? (
                        <img src={systemLogo} alt={siteTitle} className="h-10 object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-wtech-gold rounded-sm transform rotate-45 flex items-center justify-center">
                            <span className="transform -rotate-45 font-bold text-black text-xs">W</span>
                        </div>
                    )}
                    {!systemLogo && <span className="font-bold text-lg tracking-wider">W-TECH <span className="text-wtech-gold">ACADEMY</span></span>}
                </div>
                <button onClick={scrollToForm} className="hidden md:flex bg-gradient-to-r from-wtech-gold to-yellow-600 text-black px-6 py-2.5 rounded-lg font-bold uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                    Garantir Vaga
                </button>
            </div>
        </header>

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
             {/* Dynamic Background with Overlay */}
             <div className="absolute inset-0 z-0">
                 {lp.heroImage && <img src={lp.heroImage} className="w-full h-full object-cover opacity-40 scale-105 animate-pulse-slow" />}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent"></div>
                 <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent"></div>
                 {/* Grid Pattern */}
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
             </div>

             <div className="container mx-auto px-6 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
                 
                 {/* TEXT CONTENT */}
                 <div className="lg:col-span-7 space-y-8 animate-fade-in-up">
                     {/* Badges */}
                     <div className="flex flex-wrap gap-3">
                        <div className="inline-flex items-center gap-1.5 bg-wtech-gold/10 border border-wtech-gold/30 text-wtech-gold px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                            <Star size={12} className="fill-wtech-gold" /> Certificação Oficial
                        </div>
                        <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                            <MapPin size={12} /> {lp.course?.city}
                        </div>
                     </div>
                     
                     {/* Headlines */}
                     <h1 className="text-5xl md:text-7xl font-black leading-tight uppercase tracking-tight text-white drop-shadow-2xl">
                         {lp.title}
                     </h1>
                     
                     <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed max-w-2xl border-l-4 border-wtech-gold pl-6">
                         {lp.subtitle}
                     </p>
                     
                     {/* Scarcity Bar */}
                     <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md max-w-md">
                        <div className="flex justify-between text-xs font-bold uppercase text-gray-400 mb-2">
                            <span>Vagas Preenchidas</span>
                            <span className="text-red-500 animate-pulse">Restam apenas {spotsLeft} vagas</span>
                        </div>
                        <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-full w-[85%] relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                     </div>

                     <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <button onClick={scrollToForm} className="bg-red-600 text-white px-10 py-5 rounded-lg font-black text-lg uppercase tracking-wider hover:bg-red-700 hover:scale-105 transition-all shadow-[0_10px_40px_-10px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 group">
                            Quero me Inscrever <ArrowRight className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </button>
                        <a href="#modules" onClick={handleScrollToModules} className="px-8 py-5 border border-white/20 rounded-lg font-bold text-gray-300 uppercase tracking-widest hover:bg-white/5 transition-all text-center">
                            Ver Programação
                        </a>
                     </div>
                 </div>
                 
                 {/* GLASS IMAGE (Replaces Form) */}
                 <div className="lg:col-span-5 relative animate-fade-in-right delay-200">
                     <div className="absolute -inset-4 bg-gradient-to-tr from-wtech-gold/20 to-transparent rounded-[2rem] blur-2xl opacity-50"></div>
                     <div className="relative rounded-2xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                        <img 
                            src={lp.heroSecondaryImage || "https://lp.w-techbrasil.com.br/wp-content/webp-express/webp-images/uploads/2025/09/boas-vindas-2.png.webp"} 
                            alt="Welcome" 
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

        {/* INFO BAR (Sticky-ish) */}
        <div className="border-y border-white/10 bg-zinc-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-wtech-gold">
                        <Calendar />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Data</div>
                        <div className="text-sm font-bold text-white">
                            {lp.course?.date ? (
                                lp.course.dateEnd ? 
                                `${formatDateLocal(lp.course.date)} - ${formatDateLocal(lp.course.dateEnd)}` 
                                : formatDateLocal(lp.course.date)
                            ) : 'A Definir'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-wtech-gold">
                        <Clock />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Horário</div>
                        <div className="text-sm font-bold text-white">{lp.course?.startTime || '08:00'} - {lp.course?.endTime || '18:00'}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-wtech-gold">
                        <MapPin />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Local</div>
                        <div className="text-sm font-bold text-white truncate max-w-[120px]">{lp.course?.city}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-wtech-gold">
                        <Users />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold">Vagas</div>
                        <div className="text-sm font-bold text-white">Limitadas ({spotsLeft} Restantes)</div>
                    </div>
                </div>
            </div>
        </div>

        {/* DETAILS SECTION */}
        <section id="details" className="py-24 bg-black relative">
            <div className="container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* VIDEO */}
                    <div className="space-y-6">
                         <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                            <span className="w-12 h-1 bg-wtech-gold"></span>
                            Sobre o Treinamento
                         </h2>
                        <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl">
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
                                <div className="aspect-video flex items-center justify-center bg-zinc-900">
                                    <div className="text-center p-8">
                                        <Play size={48} className="mx-auto text-white/20 mb-4" />
                                        <p className="text-gray-500">Vídeo indisponível</p>
                                    </div>
                                </div>
                             )}
                        </div>
                        <p className="text-gray-400 leading-relaxed text-lg">
                            Esta é sua oportunidade de dominar as técnicas mais avançadas do mercado. 
                            Um conteúdo prático, direto ao ponto e focado em resultados reais para sua oficina.
                        </p>
                    </div>

                    {/* BENEFITS */}
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            {lp.benefits && lp.benefits.map((item, idx) => (
                                <div key={idx} className="bg-zinc-900/50 p-6 rounded-xl border border-white/5 hover:border-wtech-gold/30 hover:bg-zinc-900 transition-all group cursor-default">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-wtech-gold/10 text-wtech-gold flex items-center justify-center shrink-0 group-hover:bg-wtech-gold group-hover:text-black transition-colors">
                                            <Check size={20} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white mb-1 group-hover:text-wtech-gold transition-colors">{item.title}</h3>
                                            <p className="text-gray-400 text-sm">{item.description}</p>
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
            <section id="schedule" className="py-24 bg-black border-t border-white/5">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                         <span className="text-wtech-gold font-bold uppercase tracking-widest text-xs">Cronograma</span>
                         <h2 className="text-4xl font-black text-white uppercase mt-2">Programação do Curso</h2>
                    </div>
                    
                    <div className="max-w-4xl mx-auto bg-zinc-900/30 p-8 md:p-12 rounded-3xl border border-white/5">
                        <div className="prose prose-invert prose-p:text-gray-400 prose-headings:text-white max-w-none" 
                             dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.course.schedule.replace(/\n/g, '<br/>')) }} />
                    </div>
                </div>
            </section>
        )}

        {/* MODULES SECTION */}
        {lp.modules && lp.modules.length > 0 && (
            <section id="modules" className="py-24 bg-zinc-900 border-t border-white/5">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                         <span className="text-wtech-gold font-bold uppercase tracking-widest text-xs">Conteúdo Programático</span>
                         <h2 className="text-4xl font-black text-white uppercase mt-2">O Que Você Vai Aprender</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {lp.modules.map((mod, idx) => (
                            <div key={idx} className="group relative bg-black border border-white/5 rounded-2xl overflow-hidden hover:border-wtech-gold/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                                <div className="aspect-video relative overflow-hidden">
                                     <div className="absolute top-4 right-4 z-20 font-black text-6xl text-white/5 group-hover:text-wtech-gold/10 transition-colors pointer-events-none select-none">
                                         {idx + 1}
                                     </div>
                                    <img src={mod.image} alt={mod.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 filter grayscale group-hover:grayscale-0" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                                </div>
                                <div className="p-8 relative">
                                    <h3 className="text-xl font-bold text-wtech-gold mb-3 uppercase leading-tight group-hover:text-white transition-colors">{mod.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{mod.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )}
        
        {/* INSTRUCTOR */}
        <section className="py-24 bg-gradient-to-b from-zinc-900 to-black border-t border-white/5">
            <div className="container mx-auto px-6 flex flex-col items-center">
                 <span className="text-wtech-gold font-bold uppercase tracking-widest text-xs mb-4">Seu Mentor</span>
                 <h2 className="text-4xl font-black text-white uppercase mb-16">Conheça o Instrutor</h2>
                 
                 <div className="bg-zinc-900/50 border border-white/5 p-8 md:p-12 rounded-3xl max-w-5xl w-full flex flex-col md:flex-row gap-12 items-center hover:border-white/10 transition-colors">
                     <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 relative">
                         <div className="absolute inset-0 bg-wtech-gold rounded-2xl rotate-6 opacity-20 group-hover:rotate-12 transition-transform"></div>
                         <img src={lp.instructorImage || "https://github.com/shadcn.png"} alt={lp.instructorName} className="w-full h-full object-cover rounded-2xl relative z-10 shadow-2xl grayscale hover:grayscale-0 transition-all duration-500" />
                     </div>
                     <div className="text-center md:text-left">
                         <h3 className="text-3xl font-bold text-white mb-2">{lp.instructorName}</h3>
                         <div className="w-12 h-1 bg-wtech-gold mx-auto md:mx-0 mb-6"></div>
                         <div className="prose prose-invert prose-p:text-gray-400 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lp.instructorBio?.replace(/\n/g, '<br/>') || '') }} />
                     </div>
                 </div>
            </div>
        </section>

        {/* LOCATION & MAP */}
        <section className="py-24 relative overflow-hidden bg-[#0a0a0a]">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-1/4"></div>
            
            <div className="container mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                         <h2 className="text-4xl font-black uppercase text-white">
                            Local do Evento
                         </h2>
                         <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/5 rounded-lg text-wtech-gold">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="text-gray-400 text-xs font-bold uppercase mb-1">Endereço</h4>
                                    <p className="text-xl font-medium text-white max-w-xs">{lp.course?.address || 'Endereço a ser confirmado'}</p>
                                    <p className="text-gray-500">{lp.course?.addressNeighborhood}, {lp.course?.city} - {lp.course?.state}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/5 rounded-lg text-wtech-gold">
                                    <Navigation size={24} />
                                </div>
                                <div>
                                    <h4 className="text-gray-400 text-xs font-bold uppercase mb-1">Como Chegar</h4>
                                    <a target="_blank" href={lp.course?.mapUrl ? lp.course.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} className="text-blue-400 hover:text-blue-300 underline font-medium">
                                        Abrir no Google Maps
                                    </a>
                                </div>
                            </div>
                         </div>
                         
                         <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-4">
                             <AlertTriangle className="text-red-500 shrink-0" />
                             <p className="text-red-200 text-sm">
                                 <strong className="text-white block font-bold uppercase mb-1">Vagas Limitadas para Presencial</strong>
                                 Devido à capacidade do local, as vagas são extremamente limitadas. Garanta a sua.
                             </p>
                         </div>
                    </div>

                    <div className="h-[400px] w-full bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            className="w-full h-full filter invert contrast-125 saturate-0 hover:invert-0 hover:filter-none transition-all duration-500"
                            title="Mapa do Local"
                        ></iframe>
                    </div>
                </div>
            </div>
        </section>

        {/* FORM FINAL SECTION */}
        <section className="py-24 bg-gradient-to-b from-[#050505] to-black relative overflow-hidden" id="enroll-form">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
            
            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-2xl mx-auto text-center mb-12">
                     <h2 className="text-4xl md:text-5xl font-black uppercase mb-4 text-white">Garanta Sua Vaga</h2>
                     <p className="text-xl text-gray-400">
                        Junte-se à elite da mecânica de suspensões. Preencha o formulário abaixo para iniciar sua inscrição.
                    </p>
                </div>

                <div className="max-w-xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl relative group">
                     <div className="absolute -inset-1 bg-gradient-to-r from-wtech-gold to-transparent opacity-20 rounded-3xl blur group-hover:opacity-40 transition-opacity duration-1000"></div>
                     <div className="relative">
                        {lp.quizEnabled ? (
                            <QualificationQuiz lp={lp} onComplete={() => setSubmitted(true)} whatsappGlobalNumber={whatsappGlobal} />
                        ) : (
                            submitted ? (
                                    <div className="text-center py-12 animate-fade-in bg-green-500/10 rounded-xl border border-green-500/20">
                                        <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/20">
                                            <Check size={40} strokeWidth={3} />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Inscrição Recebida!</h3>
                                        <p className="text-green-200">Em breve entraremos em contato pelo WhatsApp.</p>
                                    </div>
                            ) : (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="group-form">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">Nome Completo</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-3.5 text-gray-500" size={20} />
                                                <input 
                                                    required 
                                                    value={form.name} 
                                                    onChange={e => setForm({...form, name: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-wtech-gold/50 focus:ring-1 focus:ring-wtech-gold/50 outline-none transition-all placeholder:text-gray-700" 
                                                    placeholder="Digite seu nome" 
                                                />
                                            </div>
                                        </div>
                                        <div className="group-form">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">WhatsApp</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-4 text-gray-500 font-bold text-xs">BR</span>
                                                <input 
                                                    required 
                                                    value={form.phone} 
                                                    onChange={e => setForm({...form, phone: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-wtech-gold/50 focus:ring-1 focus:ring-wtech-gold/50 outline-none transition-all placeholder:text-gray-700" 
                                                    placeholder="(00) 00000-0000" 
                                                />
                                            </div>
                                        </div>
                                        <div className="group-form">
                                            <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-2 block">E-mail</label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-4 text-gray-500">@</div>
                                                <input 
                                                    required 
                                                    type="email"
                                                    value={form.email} 
                                                    onChange={e => setForm({...form, email: e.target.value})}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-wtech-gold/50 focus:ring-1 focus:ring-wtech-gold/50 outline-none transition-all placeholder:text-gray-700" 
                                                    placeholder="seu@email.com" 
                                                />
                                            </div>
                                        </div>
                                        
                                        <button className="w-full bg-wtech-gold text-black font-black text-xl py-5 rounded-xl hover:bg-white hover:scale-[1.02] transition-all uppercase tracking-wide shadow-xl flex items-center justify-center gap-3">
                                            Fazer Pré-Inscrição <ArrowRight strokeWidth={3} />
                                        </button>
                                        
                                        <div className="text-center text-xs text-gray-600 flex items-center justify-center gap-2">
                                            <ShieldCheck size={12} /> Seus dados estão protegidos. Sem spam.
                                        </div>
                                    </form>
                            )
                        )}
                     </div>
                </div>
            </div>
        </section>

        <footer className="py-12 bg-[#050505] text-center text-gray-700 border-t border-white/5">
            <div className="flex justify-center mb-6 opacity-30">
                 <div className="w-12 h-12 rounded-sm flex items-center justify-center overflow-hidden">
                    {systemLogo ? <img src={systemLogo} alt={siteTitle} className="w-full h-full object-contain grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100" /> : <WTechLogo />}
                </div>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} W-Tech Suspensões. Todos os direitos reservados.</p>
        </footer>
    </div>
  );
};

const WTechLogo = () => (
    <div className="w-12 h-12 bg-wtech-gold transform rotate-45 flex items-center justify-center">
        <span className="transform -rotate-45 font-black text-black text-xl">W</span>
    </div>
);

export default LandingPageViewer;