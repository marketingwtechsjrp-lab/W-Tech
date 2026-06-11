import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { LandingPage, Course } from '../types';
import { handleLeadUpsert } from '../lib/leadDistribution';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal } from '../lib/utils';
import { QualificationQuiz } from '../components/QualificationQuiz';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import {
  MapPin, Calendar, Clock, Users, Star, CheckCircle, ArrowRight,
  ChevronDown, ChevronUp, Award, Zap, Shield, Target, TrendingUp,
  Phone, Mail, MessageCircle, Play, Quote, X, Menu, Flame,
  Wrench, BookOpen, GraduationCap, Trophy
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LandingPageWithCourse extends LandingPage {
  course: Course;
}

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(targetDate: string) {
  const calc = useCallback(() => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }, [targetDate]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration: 2,
      ease: 'easeOut',
      onUpdate(v) {
        if (ref.current) ref.current.textContent = Math.round(v) + suffix;
      },
    });
    return controls.stop;
  }, [inView, to, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

// ─── Section wrapper with scroll reveal ──────────────────────────────────────
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = ''
}) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Gold divider ─────────────────────────────────────────────────────────────
const GoldDivider = () => (
  <div className="flex items-center gap-4 justify-center my-2">
    <div className="h-px w-16 bg-gradient-to-r from-transparent to-wtech-gold/60" />
    <div className="w-2 h-2 bg-wtech-gold rotate-45" />
    <div className="h-px w-16 bg-gradient-to-l from-transparent to-wtech-gold/60" />
  </div>
);

// ─── Countdown Block ──────────────────────────────────────────────────────────
const CountdownBlock: React.FC<{ date: string }> = ({ date }) => {
  const { days, hours, minutes, seconds } = useCountdown(date);
  const units = [
    { label: 'dias', value: days },
    { label: 'horas', value: hours },
    { label: 'min', value: minutes },
    { label: 'seg', value: seconds },
  ];
  return (
    <div className="flex gap-3">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="relative w-16 md:w-20 h-16 md:h-20 bg-black/60 border border-wtech-gold/40 rounded-xl flex items-center justify-center backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-wtech-gold/5 to-transparent" />
            <AnimatePresence mode="wait">
              <motion.span
                key={value}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="text-2xl md:text-3xl font-black text-white tabular-nums"
              >
                {String(value).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-wtech-gold/70 mt-1.5 font-bold">{label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-semibold text-white pr-4">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown size={18} className="text-wtech-gold flex-shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="px-5 pb-5 text-gray-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingPageViewerV2: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { get } = useSettings();
  const systemLogo = get('logo_url');
  const siteTitle = get('site_title', 'W-TECH');
  const whatsappGlobal = get('whatsapp_phone');

  const [lp, setLp] = useState<LandingPageWithCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutDiretoEnabled, setCheckoutDiretoEnabled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<number | null>(null);
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

  // Form
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState(5);

  // Scroll animations
  const { scrollY, scrollYProgress } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 180]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1.05, 1.15]);

  // ── Data Loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('SITE_Config').select('value').eq('key', 'checkout_direto_habilitado').single()
      .then(({ data }) => setCheckoutDiretoEnabled(data?.value === 'true'));

    const fetchLP = async () => {
      if (!slug) return;
      setLoading(true);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
      let lpData: LandingPageWithCourse | null = null;

      if (isUUID) {
        const { data: linkedLP } = await supabase.from('SITE_LandingPages').select('*, course:SITE_Courses(*, SITE_Enrollments(count))').eq('course_id', slug).single();
        if (linkedLP) {
          lpData = linkedLP;
        } else {
          const { data: courseData } = await supabase.from('SITE_Courses').select('*, SITE_Enrollments(count)').eq('id', slug).single();
          if (courseData) {
            lpData = {
              id: 'virtual', course_id: courseData.id, slug: courseData.id,
              title: courseData.title,
              subtitle: courseData.description?.substring(0, 150) + '...' || 'Prepare-se para transformar sua carreira com a metodologia W-Tech.',
              hero_image: courseData.image || '',
              hero_secondary_image: null, video_url: null, benefits: [], modules: [],
              instructor_name: courseData.instructor || 'Equipe W-Tech',
              instructor_bio: 'Especialista certificado W-Tech.', instructor_image: null,
              whatsapp_number: whatsappGlobal || '', pixel_id: null,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              status: 'Published', course: courseData,
            } as any as LandingPageWithCourse;
          }
        }
      } else {
        const { data } = await supabase.from('SITE_LandingPages').select('*, course:SITE_Courses(*, SITE_Enrollments(count))').eq('slug', slug).single();
        lpData = data;
      }

      if (lpData) {
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
          checkoutType: rawCourse.checkout_type,
        } : null;

        const mapped: LandingPageWithCourse = {
          ...lpData,
          heroImage: (lpData as any).hero_image,
          videoUrl: (lpData as any).video_url,
          instructorName: (lpData as any).instructor_name,
          instructorBio: (lpData as any).instructor_bio,
          instructorImage: (lpData as any).instructor_image,
          whatsappNumber: (lpData as any).whatsapp_number,
          pixelId: (lpData as any).pixel_id,
          heroSecondaryImage: (lpData as any).hero_secondary_image,
          quizEnabled: (lpData as any).quiz_enabled,
          fakeAlertsEnabled: (lpData as any).fake_alerts_enabled,
          course: mappedCourse,
          courseId: (lpData as any).course_id,
        } as any;

        setLp(mapped);
        if (mappedCourse) {
          const real = Math.max(0, (mappedCourse.capacity || 20) - (mappedCourse.registeredCount || 0));
          setSpotsLeft(real);
        }
      }
      setLoading(false);
    };
    fetchLP();
  }, [slug]);

  // ── Form Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lp || submitting) return;
    setSubmitting(true);
    try {
      const isInternational = lp.course?.isInternational || (lp.course as any)?.is_international;
      const checkoutAtivo = lp.course?.checkoutType === 'automated' && !isInternational;
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        type: 'Course_Registration' as const,
        status: 'New' as const,
        context_id: `LP V2: ${lp.title} (${lp.slug})`,
        tags: ['landing_page_v2', lp.slug ? String(lp.slug) : 'virtual', checkoutAtivo ? 'checkout_direto' : ''].filter(Boolean),
        origin: window.location.href,
        assigned_to: null,
      };
      const result = await handleLeadUpsert(payload);
      const courseId = (lp as any).courseId || (lp as any).course_id;
      if (checkoutAtivo && courseId && result?.id) {
        navigate(`/checkout-curso/${courseId}?lid=${result.id}`);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  // ── Loading & 404 ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#050505]">
      <div className="w-12 h-12 border-2 border-wtech-gold/20 border-t-wtech-gold rounded-full animate-spin" />
      <p className="mt-4 text-gray-500 text-sm tracking-widest uppercase">Carregando...</p>
    </div>
  );
  if (!lp) return (
    <div className="h-screen flex items-center justify-center bg-[#050505] text-white">
      <p>Página não encontrada.</p>
    </div>
  );

  const course = lp.course;
  const whatsapp = lp.whatsappNumber || whatsappGlobal;
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Tenho interesse no curso ${lp.title}`)}`
    : '#';
  const isFull = course?.status === 'Full' || course?.status === 'Completed';
  const currency = course?.currency === 'EUR' ? '€' : course?.currency === 'USD' ? 'US$' : 'R$';

  const defaultFaqs = [
    { q: 'Quem pode participar deste curso?', a: 'O curso é voltado para profissionais e entusiastas da área automotiva que desejam aprofundar seus conhecimentos e obter certificação oficial W-Tech.' },
    { q: 'O certificado é reconhecido pelo mercado?', a: 'Sim. A certificação W-Tech é reconhecida pelo setor automotivo e representa um diferencial competitivo no currículo profissional.' },
    { q: 'Como é feito o pagamento?', a: 'Aceitamos cartão de crédito, boleto bancário e PIX. Para pagamento parcelado, entre em contato via WhatsApp.' },
    { q: 'O que devo levar no dia do curso?', a: course?.whatToBring || 'Documentos pessoais, caneta e vontade de aprender! Os materiais didáticos são fornecidos pelo instrutor.' },
    { q: 'Haverá material de apoio?', a: 'Sim! Todos os alunos recebem apostila completa, acesso a conteúdo digital exclusivo e certificado de conclusão.' },
  ];

  const defaultBenefits: { title: string; description: string; icon: string }[] = lp.benefits?.length ? lp.benefits.map(b => ({ ...b, icon: b.icon || 'zap' })) : [
    { title: 'Metodologia Exclusiva', description: 'Conteúdo desenvolvido por especialistas certificados com anos de experiência no mercado.', icon: 'target' },
    { title: 'Certificação Oficial', description: 'Receba certificado reconhecido pelo setor automotivo ao concluir o curso.', icon: 'award' },
    { title: 'Prática Intensiva', description: 'Mais de 70% do tempo em atividades práticas com equipamentos reais.', icon: 'wrench' },
    { title: 'Suporte Contínuo', description: 'Grupo exclusivo de ex-alunos e acesso ao material por 12 meses.', icon: 'shield' },
    { title: 'Turma Reduzida', description: 'Máximo de alunos por turma para garantir atenção individualizada.', icon: 'users' },
    { title: 'Atualização Constante', description: 'Conteúdo sempre atualizado com as últimas tendências do mercado.', icon: 'trending' },
  ];

  const benefitIcons: Record<string, React.ReactNode> = {
    target: <Target size={22} />, award: <Award size={22} />, wrench: <Wrench size={22} />,
    shield: <Shield size={22} />, users: <Users size={22} />, trending: <TrendingUp size={22} />,
    zap: <Zap size={22} />, book: <BookOpen size={22} />, grad: <GraduationCap size={22} />,
  };

  const pct = course ? Math.min(100, Math.round(((course.registeredCount || 0) / (course.capacity || 20)) * 100)) : 50;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-wtech-gold selection:text-black">

      {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

      {/* ── Scroll Progress Bar ─────────────────────────────────────────── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-wtech-gold z-[200] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0.5 left-0 w-full z-[100] bg-black/70 backdrop-blur-xl border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {systemLogo ? (
              <img src={systemLogo} alt={siteTitle} className="h-8 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-wtech-gold rounded flex items-center justify-center rotate-45">
                  <span className="-rotate-45 font-black text-black text-xs">W</span>
                </div>
                <span className="font-black text-sm tracking-widest uppercase">{siteTitle}</span>
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-400">
            <button onClick={() => scrollTo('sobre')} className="hover:text-wtech-gold transition-colors">Sobre</button>
            <button onClick={() => scrollTo('programa')} className="hover:text-wtech-gold transition-colors">Programa</button>
            <button onClick={() => scrollTo('instrutor')} className="hover:text-wtech-gold transition-colors">Instrutor</button>
            <button onClick={() => scrollTo('inscricao')} className="bg-wtech-gold text-black px-5 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
              Garantir Vaga
            </button>
          </nav>

          {/* Mobile menu */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden bg-black/95 border-t border-white/10 overflow-hidden"
            >
              <div className="px-5 py-4 flex flex-col gap-4">
                {['sobre', 'programa', 'instrutor'].map(id => (
                  <button key={id} onClick={() => scrollTo(id)} className="text-left text-sm font-bold uppercase tracking-wider text-gray-300 hover:text-wtech-gold transition-colors capitalize">
                    {id}
                  </button>
                ))}
                <button onClick={() => scrollTo('inscricao')} className="bg-wtech-gold text-black font-black py-3 rounded-lg uppercase tracking-widest text-sm">
                  Garantir Minha Vaga
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* HERO                                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">

        {/* Parallax background */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y: heroY, scale: heroScale }}
        >
          {lp.heroImage ? (
            <img src={lp.heroImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-wtech-black to-gray-900" />
          )}
        </motion.div>

        {/* Overlays */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#050505] via-[#050505]/80 to-[#050505]/40" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent" />

        {/* Gold glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] z-[1]"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)' }} />

        {/* Content */}
        <motion.div
          className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center"
          style={{ opacity: heroOpacity }}
        >
          {/* Left */}
          <div className="space-y-8">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-wrap gap-2"
            >
              <span className="inline-flex items-center gap-1.5 bg-wtech-gold/10 border border-wtech-gold/40 text-wtech-gold px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                <Star size={11} className="fill-wtech-gold" /> Certificação Oficial W-Tech
              </span>
              {course?.city && (
                <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/15 text-gray-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                  <MapPin size={11} /> {course.city}
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-5xl md:text-6xl lg:text-7xl font-black uppercase leading-[0.95] tracking-tight"
            >
              {lp.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-lg md:text-xl text-gray-300 leading-relaxed border-l-4 border-wtech-gold pl-5 max-w-xl"
            >
              {lp.subtitle}
            </motion.p>

            {/* Info pills */}
            {course && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="flex flex-wrap gap-3"
              >
                {course.date && (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm text-gray-300 backdrop-blur-sm">
                    <Calendar size={14} className="text-wtech-gold" />
                    <span className="font-semibold">{formatDateLocal(course.date)}</span>
                  </div>
                )}
                {(course.startTime || course.endTime) && (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm text-gray-300 backdrop-blur-sm">
                    <Clock size={14} className="text-wtech-gold" />
                    <span className="font-semibold">{course.startTime}{course.endTime ? ` – ${course.endTime}` : ''}</span>
                  </div>
                )}
                {course.price > 0 && (
                  <div className="flex items-center gap-2 bg-wtech-gold/10 border border-wtech-gold/30 px-4 py-2 rounded-lg text-sm backdrop-blur-sm">
                    <span className="font-black text-wtech-gold">{currency} {course.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <button
                onClick={() => scrollTo('inscricao')}
                className="group relative overflow-hidden bg-wtech-gold text-black font-black px-8 py-4 rounded-xl uppercase tracking-widest text-sm hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Garantir Minha Vaga
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-wtech-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              {whatsapp && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 border border-white/20 text-white px-6 py-4 rounded-xl font-bold text-sm hover:border-wtech-gold/50 hover:bg-white/5 transition-all">
                  <MessageCircle size={16} className="text-green-400" /> Falar no WhatsApp
                </a>
              )}
            </motion.div>
          </div>

          {/* Right — Countdown + Scarcity */}
          <div className="flex flex-col items-center lg:items-end gap-8">

            {/* Countdown */}
            {course?.date && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="text-center lg:text-right"
              >
                <p className="text-xs font-black uppercase tracking-widest text-wtech-gold/70 mb-3">
                  <Flame size={12} className="inline mr-1" />O curso começa em
                </p>
                <CountdownBlock date={course.date} />
              </motion.div>
            )}

            {/* Scarcity card */}
            {course && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.05, duration: 0.6 }}
                className="w-full max-w-xs bg-black/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Vagas disponíveis</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-wtech-gold/20 text-wtech-gold'}`}>
                    {isFull ? 'ESGOTADO' : `${spotsLeft} restantes`}
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 1.3, duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-wtech-gold to-yellow-400 rounded-full"
                  />
                </div>
                <p className="text-xs text-gray-500">{pct}% das vagas preenchidas</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 border-2 border-white/20 rounded-full flex justify-center pt-1.5"
          >
            <div className="w-1 h-2 bg-wtech-gold rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STATS BAR                                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] border-y border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Anos de experiência', value: 10, suffix: '+' },
            { label: 'Alunos formados', value: 3000, suffix: '+' },
            { label: 'Cidades alcançadas', value: 40, suffix: '+' },
            { label: 'Satisfação', value: 98, suffix: '%' },
          ].map(({ label, value, suffix }) => (
            <Reveal key={label} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-wtech-gold">
                <AnimatedCounter to={value} suffix={suffix} />
              </div>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">{label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SOBRE O CURSO                                                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="sobre" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="space-y-6">
            <Reveal>
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold">Sobre o Curso</p>
              <GoldDivider />
              <h2 className="text-3xl md:text-4xl font-black uppercase mt-4 leading-tight">{lp.title}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-gray-400 leading-relaxed text-base">{lp.subtitle}</p>
            </Reveal>
            {course?.features && course.features.length > 0 && (
              <Reveal delay={0.2}>
                <ul className="space-y-3 mt-4">
                  {course.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-300">
                      <CheckCircle size={16} className="text-wtech-gold mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            <Reveal delay={0.3}>
              <button onClick={() => scrollTo('inscricao')} className="mt-2 inline-flex items-center gap-2 bg-transparent border border-wtech-gold text-wtech-gold font-bold px-6 py-3 rounded-xl hover:bg-wtech-gold hover:text-black transition-all text-sm uppercase tracking-widest">
                Quero me inscrever <ArrowRight size={15} />
              </button>
            </Reveal>
          </div>

          {/* Image */}
          <Reveal delay={0.15}>
            <div className="relative">
              <div className="absolute -inset-3 bg-wtech-gold/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden aspect-video lg:aspect-square border border-white/10">
                {lp.heroImage ? (
                  <img src={lp.heroImage} alt={lp.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-wtech-black to-gray-800 flex items-center justify-center">
                    <GraduationCap size={64} className="text-wtech-gold/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              {/* Floating badge */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -right-4 bg-wtech-gold text-black font-black px-5 py-3 rounded-xl text-sm shadow-xl"
              >
                <Trophy size={14} className="inline mr-1.5" />Certificado Oficial
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* BENEFÍCIOS                                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Por que escolher</p>
            <GoldDivider />
            <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">O que você vai <span className="text-wtech-gold">ganhar</span></h2>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {defaultBenefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="group relative bg-white/3 border border-white/8 hover:border-wtech-gold/30 rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(212,175,55,0.08)]"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-wtech-gold/3 rounded-full -translate-x-8 -translate-y-8 group-hover:bg-wtech-gold/8 transition-all" />
                <div className="w-12 h-12 bg-wtech-gold/10 border border-wtech-gold/20 rounded-xl flex items-center justify-center mb-5 text-wtech-gold group-hover:bg-wtech-gold/20 transition-colors">
                  {benefitIcons[b.icon || 'zap'] || <Zap size={22} />}
                </div>
                <h3 className="font-black text-white text-lg mb-2 group-hover:text-wtech-gold transition-colors">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PROGRAMA / MÓDULOS                                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {lp.modules && lp.modules.length > 0 && (
        <section id="programa" className="py-24 max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Conteúdo Programático</p>
            <GoldDivider />
            <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">O que você vai <span className="text-wtech-gold">aprender</span></h2>
          </Reveal>

          <div className="max-w-3xl mx-auto space-y-4">
            {lp.modules.map((mod, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="relative"
              >
                {/* Timeline line */}
                {i < lp.modules!.length - 1 && (
                  <div className="absolute left-6 top-[64px] w-px h-[calc(100%+1rem)] bg-gradient-to-b from-wtech-gold/30 to-transparent" />
                )}

                <div
                  className={`flex gap-5 bg-white/3 border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${activeModule === i ? 'border-wtech-gold/40 bg-wtech-gold/5' : 'border-white/8 hover:border-white/15'}`}
                  onClick={() => setActiveModule(activeModule === i ? null : i)}
                >
                  {/* Number */}
                  <div className={`flex-shrink-0 w-12 h-12 m-4 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${activeModule === i ? 'bg-wtech-gold text-black' : 'bg-white/8 text-wtech-gold'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  <div className="flex-1 py-4 pr-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-white">{mod.title}</h3>
                      <motion.span animate={{ rotate: activeModule === i ? 180 : 0 }}>
                        <ChevronDown size={16} className="text-gray-500" />
                      </motion.span>
                    </div>

                    <AnimatePresence>
                      {activeModule === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <p className="text-gray-400 text-sm mt-2 leading-relaxed">{mod.description}</p>
                          {mod.image && (
                            <img src={mod.image} alt={mod.title} className="mt-3 rounded-lg w-full max-h-40 object-cover opacity-80" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INSTRUTOR                                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(lp.instructorName || lp.instructorBio) && (
        <section id="instrutor" className="py-24 bg-[#080808]">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal className="text-center mb-16">
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Conheça</p>
              <GoldDivider />
              <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">Seu <span className="text-wtech-gold">Instrutor</span></h2>
            </Reveal>

            <div className="grid lg:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
              {/* Photo */}
              <Reveal>
                <div className="relative flex justify-center lg:justify-start">
                  <div className="absolute inset-0 max-w-sm mx-auto bg-wtech-gold/8 rounded-3xl blur-3xl" />
                  <div className="relative">
                    {lp.instructorImage ? (
                      <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-2 border-wtech-gold/20 shadow-2xl">
                        <img src={lp.instructorImage} alt={lp.instructorName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-64 h-64 md:w-80 md:h-80 rounded-2xl bg-gradient-to-br from-wtech-black to-gray-800 border-2 border-wtech-gold/20 flex items-center justify-center">
                        <GraduationCap size={80} className="text-wtech-gold/30" />
                      </div>
                    )}
                    {/* Gold badge */}
                    <div className="absolute -bottom-3 -right-3 bg-wtech-gold text-black text-xs font-black px-4 py-2 rounded-xl shadow-lg">
                      <Award size={12} className="inline mr-1" />Especialista Certificado
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* Bio */}
              <div className="space-y-5">
                <Reveal delay={0.1}>
                  <h3 className="text-2xl md:text-3xl font-black text-white">{lp.instructorName || course?.instructor}</h3>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-wtech-gold text-wtech-gold" />)}
                  </div>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className="text-gray-400 leading-relaxed">{lp.instructorBio}</p>
                </Reveal>
                <Reveal delay={0.3}>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {[
                      { label: 'Anos de experiência', value: '10+' },
                      { label: 'Alunos treinados', value: '3.000+' },
                      { label: 'Certificações', value: '15+' },
                      { label: 'Avaliação média', value: '4.9★' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
                        <div className="text-xl font-black text-wtech-gold">{value}</div>
                        <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DEPOIMENTOS                                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {lp.testimonials && lp.testimonials.length > 0 && (
        <section className="py-24 max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Depoimentos</p>
            <GoldDivider />
            <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">O que dizem nossos <span className="text-wtech-gold">alunos</span></h2>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lp.testimonials.map((t, i) => {
              const ytId = t.videoUrl ? (() => {
                const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                const match = t.videoUrl.match(regExp);
                return (match && match[2].length === 11) ? match[2] : '';
              })() : '';

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="bg-white/3 border border-white/8 rounded-2xl p-6 relative flex flex-col justify-between hover:border-wtech-gold/20 transition-all duration-300 group"
                >
                  {ytId ? (
                    /* Video Testimonial */
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group-hover:border-wtech-gold/30 transition-colors bg-black/40 cursor-pointer"
                        onClick={() => setActiveVideo(ytId)}>
                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={t.name} />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-12 h-12 bg-wtech-gold/90 text-black rounded-full flex items-center justify-center shadow-lg group-hover:bg-wtech-gold group-hover:scale-110 active:scale-95 transition-all duration-300">
                            <Play size={16} className="fill-black text-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm italic leading-relaxed mb-4">"{t.text}"</p>
                    </div>
                  ) : (
                    /* Text Testimonial */
                    <div className="space-y-4 flex-1">
                      <Quote size={28} className="text-wtech-gold/20 mb-2" />
                      <p className="text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                    {t.image ? (
                      <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-wtech-gold/30" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-wtech-gold/20 flex items-center justify-center text-wtech-gold font-black text-sm">
                        {t.name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-black text-white text-sm">{t.name}</div>
                      <div className="flex gap-0.5 mt-0.5">
                        {[...Array(5)].map((_, j) => <Star key={j} size={11} className="fill-wtech-gold text-wtech-gold" />)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DATA & LOCAL                                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {course && (
        <section className="py-24 bg-[#080808]">
          <div className="max-w-5xl mx-auto px-6">
            <Reveal className="text-center mb-16">
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Informações</p>
              <GoldDivider />
              <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">Data e <span className="text-wtech-gold">Local</span></h2>
            </Reveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {course.date && (
                <Reveal className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-4 items-start">
                  <div className="w-12 h-12 bg-wtech-gold/10 border border-wtech-gold/20 rounded-xl flex items-center justify-center text-wtech-gold flex-shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Data</p>
                    <p className="font-black text-white">{formatDateLocal(course.date)}</p>
                    {course.dateEnd && <p className="text-sm text-gray-400 mt-0.5">até {formatDateLocal(course.dateEnd)}</p>}
                  </div>
                </Reveal>
              )}
              {(course.startTime || course.endTime) && (
                <Reveal delay={0.1} className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-4 items-start">
                  <div className="w-12 h-12 bg-wtech-gold/10 border border-wtech-gold/20 rounded-xl flex items-center justify-center text-wtech-gold flex-shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Horário</p>
                    <p className="font-black text-white">{course.startTime || ''}{course.endTime ? ` às ${course.endTime}` : ''}</p>
                  </div>
                </Reveal>
              )}
              {(course.location || course.city) && (
                <Reveal delay={0.2} className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-4 items-start">
                  <div className="w-12 h-12 bg-wtech-gold/10 border border-wtech-gold/20 rounded-xl flex items-center justify-center text-wtech-gold flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Local</p>
                    <p className="font-black text-white">{course.location || course.city}</p>
                    {course.address && <p className="text-sm text-gray-400 mt-0.5">{course.address}{course.addressNumber ? `, ${course.addressNumber}` : ''}</p>}
                    {course.mapUrl && (
                      <a href={course.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-wtech-gold text-xs font-bold mt-2 hover:underline">
                        Ver no mapa <ArrowRight size={12} />
                      </a>
                    )}
                  </div>
                </Reveal>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INSCRIÇÃO / PRICING                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="inscricao" className="py-24 relative overflow-hidden">
        {/* BG glow */}
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Inscrição</p>
            <GoldDivider />
            <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">Garanta sua <span className="text-wtech-gold">vaga agora</span></h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">Preencha o formulário abaixo e nossa equipe entrará em contato para confirmar sua inscrição.</p>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Price card */}
            <Reveal className="lg:col-span-2">
              <div className="bg-[#0A0A0A] border border-wtech-gold/20 rounded-2xl p-7 sticky top-24">
                <div className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-4">Investimento</div>

                {course?.price && course.price > 0 ? (
                  <div className="mb-6">
                    <div className="text-4xl font-black text-wtech-gold">
                      {currency} {course.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {course.recyclingPrice && course.recyclingPrice < course.price && (
                      <div className="mt-2 bg-wtech-gold/10 border border-wtech-gold/20 rounded-lg px-3 py-2 text-sm">
                        <span className="text-gray-400">Reciclagem: </span>
                        <span className="text-wtech-gold font-black">{currency} {course.recyclingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-2xl font-black text-white mb-6">Entre em contato</div>
                )}

                <ul className="space-y-2.5 mb-6">
                  {[
                    'Material didático incluso',
                    'Certificado de conclusão',
                    'Acesso ao grupo exclusivo',
                    'Suporte pós-curso',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <CheckCircle size={14} className="text-wtech-gold flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Scarcity */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Vagas</span>
                    <span className={`font-black ${isFull ? 'text-red-400' : 'text-wtech-gold'}`}>
                      {isFull ? 'Esgotado' : `${spotsLeft} restantes`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2 }}
                      className="h-full bg-gradient-to-r from-wtech-gold to-yellow-400 rounded-full"
                    />
                  </div>
                </div>

                {whatsapp && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 border border-green-500/30 text-green-400 hover:bg-green-500/10 py-3 rounded-xl text-sm font-bold transition-colors">
                    <MessageCircle size={16} /> Dúvidas? WhatsApp
                  </a>
                )}
              </div>
            </Reveal>

            {/* Form */}
            <Reveal delay={0.1} className="lg:col-span-3">
              <div className="bg-[#0A0A0A] border border-white/8 rounded-2xl p-8">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 bg-wtech-gold/10 border border-wtech-gold/30 rounded-full flex items-center justify-center mx-auto mb-5">
                      <CheckCircle size={32} className="text-wtech-gold" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Inscrição enviada!</h3>
                    <p className="text-gray-400 text-sm max-w-xs mx-auto">Nossa equipe entrará em contato em breve para confirmar sua vaga e orientar sobre o pagamento.</p>
                    {whatsapp && (
                      <a href={waLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-wtech-gold text-black font-black px-6 py-3 rounded-xl mt-6 text-sm hover:bg-yellow-400 transition-colors">
                        <MessageCircle size={15} /> Falar no WhatsApp
                      </a>
                    )}
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="text-xl font-black text-white mb-6">Preencha seus dados</h3>

                    {[
                      { id: 'name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome', key: 'name' },
                      { id: 'email', label: 'E-mail', type: 'email', placeholder: 'seu@email.com', key: 'email' },
                      { id: 'phone', label: 'WhatsApp / Telefone', type: 'tel', placeholder: '(11) 99999-9999', key: 'phone' },
                    ].map(field => (
                      <div key={field.id}>
                        <label htmlFor={field.id} className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                          {field.label} <span className="text-wtech-gold">*</span>
                        </label>
                        <input
                          id={field.id}
                          type={field.type}
                          required
                          value={form[field.key as keyof typeof form]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-wtech-gold/60 focus:bg-wtech-gold/3 transition-all"
                        />
                      </div>
                    ))}

                    <motion.button
                      type="submit"
                      disabled={submitting || isFull}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${
                        isFull
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-wtech-gold to-yellow-500 text-black hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] hover:-translate-y-0.5'
                      }`}
                    >
                      {submitting ? (
                        <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Enviando...</>
                      ) : isFull ? (
                        'Turma esgotada'
                      ) : (
                        <><ArrowRight size={16} /> Garantir minha vaga</>
                      )}
                    </motion.button>

                    <p className="text-xs text-gray-600 text-center leading-relaxed">
                      Ao enviar, você concorda em receber informações sobre o curso. Não compartilhamos seus dados.
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FAQ                                                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#080808]">
        <div className="max-w-3xl mx-auto px-6">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Dúvidas</p>
            <GoldDivider />
            <h2 className="text-3xl md:text-4xl font-black uppercase mt-4">Perguntas <span className="text-wtech-gold">frequentes</span></h2>
          </Reveal>

          <div className="space-y-3">
            {defaultFaqs.map((faq, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <FaqItem q={faq.q} a={faq.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FINAL CTA BANNER                                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {lp.heroImage && <img src={lp.heroImage} alt="" className="w-full h-full object-cover opacity-10" />}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/95 to-[#050505]" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.1) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div className="w-16 h-1 bg-wtech-gold mx-auto mb-8" />
            <h2 className="text-4xl md:text-5xl font-black uppercase leading-tight mb-6">
              Transforme sua <span className="text-wtech-gold">carreira</span> hoje
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Não deixe para amanhã a oportunidade de se tornar um profissional certificado W-Tech.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => scrollTo('inscricao')}
                className="bg-wtech-gold text-black font-black px-10 py-4 rounded-xl uppercase tracking-widest text-sm hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
              >
                Garantir minha vaga <ArrowRight size={16} />
              </button>
              {whatsapp && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="border border-white/20 text-white font-bold px-8 py-4 rounded-xl text-sm hover:border-wtech-gold/50 hover:bg-white/5 transition-all flex items-center gap-2">
                  <MessageCircle size={16} className="text-green-400" /> WhatsApp
                </a>
              )}
            </div>
            <div className="mt-10 flex flex-wrap gap-6 justify-center text-sm text-gray-500">
              {[<><Shield size={13} className="text-wtech-gold" /> Dados 100% seguros</>, <><CheckCircle size={13} className="text-wtech-gold" /> Certificação oficial</>, <><Users size={13} className="text-wtech-gold" /> +3.000 alunos satisfeitos</>].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">{item}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FOOTER                                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-gray-600 text-xs">
          © {new Date().getFullYear()} {siteTitle}. Todos os direitos reservados.
        </p>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STICKY MOBILE CTA                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 2, duration: 0.5, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/95 border-t border-white/10 p-3 backdrop-blur-xl"
      >
        <button
          onClick={() => scrollTo('inscricao')}
          className="w-full bg-wtech-gold text-black font-black py-3.5 rounded-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
        >
          {isFull ? 'Lista de espera' : 'Garantir Vaga'} <ArrowRight size={15} />
        </button>
      </motion.div>

      {/* VIDEO MODAL POPUP */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/95 z-[999] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300" onClick={() => setActiveVideo(null)}>
          <div className="relative w-full max-w-4xl aspect-video bg-[#111] rounded-3xl overflow-hidden border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActiveVideo(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition-colors">
              <X size={20} />
            </button>
            <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`} title="Depoimento Aluno" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
          </div>
        </div>
      )}

      {/* Quiz overlay */}
      {lp.quizEnabled && <QualificationQuiz lp={lp} onComplete={() => {}} whatsappGlobalNumber={whatsapp || ''} />}
    </div>
  );
};

export default LandingPageViewerV2;
