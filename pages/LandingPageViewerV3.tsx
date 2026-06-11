import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { LandingPage, Course } from '../types';
import { handleLeadUpsert } from '../lib/leadDistribution';
import { useSettings } from '../context/SettingsContext';
import { formatDateLocal } from '../lib/utils';
import { QualificationQuiz } from '../components/QualificationQuiz';
import { FakeSignupAlert } from '../components/FakeSignupAlert';
import {
  MapPin, Calendar, Clock, Users, Star, CheckCircle, ArrowRight,
  ChevronDown, Award, Shield, Target, TrendingUp, Zap, Wrench,
  BookOpen, GraduationCap, Trophy, MessageCircle, Quote, Phone,
  Menu, X, Timer, ClipboardList, Play
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

// ─── Scroll reveal ────────────────────────────────────────────────────────────
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = ''
}) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Gold accent line ─────────────────────────────────────────────────────────
const GoldLine = ({ className = '' }: { className?: string }) => (
  <div className={`h-1 w-12 bg-wtech-gold rounded-full ${className}`} />
);

// ─── Countdown strip ─────────────────────────────────────────────────────────
const CountdownStrip: React.FC<{ date: string }> = ({ date }) => {
  const { days, hours, minutes, seconds } = useCountdown(date);
  return (
    <div className="flex items-center gap-2">
      {[{ v: days, l: 'dias' }, { v: hours, l: 'horas' }, { v: minutes, l: 'min' }, { v: seconds, l: 'seg' }].map(({ v, l }) => (
        <div key={l} className="flex flex-col items-center">
          <div className="w-14 h-14 bg-white border-2 border-wtech-gold/30 rounded-xl flex items-center justify-center shadow-sm">
            <AnimatePresence mode="wait">
              <motion.span key={v}
                initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-black text-gray-900 tabular-nums">
                {String(v).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-gray-400 mt-1 font-bold">{l}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Schedule renderer ────────────────────────────────────────────────────────
// Parses free-text schedule into visual timeline items
const ScheduleBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n').filter(l => l.trim());

  type Item = { type: 'title' | 'time' | 'module' | 'text'; content: string };
  const items: Item[] = lines.map(line => {
    const trimmed = line.trim();
    if (/^\d{1,2}[h:]\d{2}/i.test(trimmed)) return { type: 'time', content: trimmed };
    if (/^(🔹|🔸|🛠️|📌|✅|⚡|🎯|🏆|💡|📋|🔑|🔥|•|\*\*|##|\-\s)/i.test(trimmed) || /^[A-ZÁÉÍÓÚ\s]{5,}$/.test(trimmed)) {
      return { type: 'module', content: trimmed };
    }
    if (trimmed.length > 2 && /Módulo|módulo|Objetivo|MÓDULO/i.test(trimmed)) return { type: 'module', content: trimmed };
    if (trimmed.length > 40 && !trimmed.startsWith('http')) return { type: 'text', content: trimmed };
    return { type: 'text', content: trimmed };
  });

  // Group time items + their sub-content
  const groups: { time?: string; label?: string; details: string[] }[] = [];
  let current: typeof groups[number] | null = null;

  for (const item of items) {
    if (item.type === 'time') {
      // Parse "08:00 - Café da manhã" → time + label
      const match = item.content.match(/^(\d{1,2}[h:]\d{2})\s*[-–]?\s*(.*)/i);
      if (match) {
        current = { time: match[1], label: match[2] || '', details: [] };
        groups.push(current);
      }
    } else if (item.type === 'module') {
      current = { label: item.content, details: [] };
      groups.push(current);
    } else if (current) {
      if (item.content.trim()) current.details.push(item.content.trim());
    } else {
      groups.push({ details: [item.content] });
    }
  }

  // If no time/module groups detected, just render as formatted text
  const hasStructure = groups.some(g => g.time || g.label);

  if (!hasStructure) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{text}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {groups.map((g, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: i * 0.04 }}
          className="relative flex gap-4"
        >
          {/* Timeline line */}
          {i < groups.length - 1 && (
            <div className="absolute left-[19px] top-10 bottom-0 w-px bg-wtech-gold/20" />
          )}

          {/* Dot */}
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${g.time ? 'bg-wtech-gold text-black' : 'bg-gray-100 border border-gray-200'}`}>
              {g.time
                ? <span className="text-[10px] font-black leading-none text-center">{g.time.replace(':', 'h')}</span>
                : <div className="w-2 h-2 bg-wtech-gold rounded-full" />
              }
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 pb-5">
            {g.label && (
              <p className={`font-black leading-snug mb-1 ${g.time ? 'text-gray-900 text-base' : 'text-gray-800 text-sm uppercase tracking-wide'}`}>
                {g.label.replace(/^[🔹🔸🛠️📌✅⚡🎯🏆💡📋🔑🔥•\-\*#\s]+/, '').trim()}
              </p>
            )}
            {g.details.length > 0 && (
              <ul className="space-y-0.5">
                {g.details.map((d, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-sm text-gray-500">
                    <div className="w-1 h-1 bg-wtech-gold rounded-full mt-2 flex-shrink-0" />
                    {d.replace(/^[-•*]\s*/, '')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
        <span className="font-bold text-gray-900 pr-4">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={18} className="text-wtech-gold flex-shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <p className="px-5 pb-5 text-gray-600 leading-relaxed text-sm">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingPageViewerV3: React.FC = () => {
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
  const [spotsLeft, setSpotsLeft] = useState(5);
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
  const [openModule, setOpenModule] = useState<number | null>(null);

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
              subtitle: courseData.description?.substring(0, 180) || 'Prepare-se para transformar sua carreira com a metodologia W-Tech.',
              hero_image: courseData.image || '', hero_secondary_image: null, video_url: null,
              benefits: [], modules: [],
              instructor_name: courseData.instructor || 'Equipe W-Tech',
              instructor_bio: 'Especialista certificado W-Tech.',
              instructor_image: null, whatsapp_number: whatsappGlobal || '', pixel_id: null,
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
          schedule: rawCourse.schedule,
          whatToBring: rawCourse.what_to_bring,
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
          setSpotsLeft(Math.max(0, (mappedCourse.capacity || 20) - (mappedCourse.registeredCount || 0)));
        }
      }
      setLoading(false);
    };
    fetchLP();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lp || submitting) return;
    setSubmitting(true);
    try {
      const isInternational = (lp.course as any)?.is_international || lp.course?.isInternational;
      const checkoutAtivo = lp.course?.checkoutType === 'automated' && !isInternational;
      const result = await handleLeadUpsert({
        name: form.name, email: form.email, phone: form.phone,
        type: 'Course_Registration', status: 'New',
        context_id: `LP V3: ${lp.title} (${lp.slug})`,
        tags: ['landing_page_v3', lp.slug || 'virtual', checkoutAtivo ? 'checkout_direto' : ''].filter(Boolean),
        origin: window.location.href, assigned_to: null,
      });
      const courseId = (lp as any).courseId || (lp as any).course_id;
      if (checkoutAtivo && courseId && result?.id) {
        navigate(`/checkout-curso/${courseId}?lid=${result.id}`);
        return;
      }
      setSubmitted(true);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-10 h-10 border-2 border-gray-200 border-t-wtech-gold rounded-full animate-spin" />
      <p className="mt-3 text-gray-400 text-xs tracking-widest uppercase">Carregando...</p>
    </div>
  );
  if (!lp) return (
    <div className="h-screen flex items-center justify-center bg-white text-gray-900">
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
  const pct = course ? Math.min(100, Math.round(((course.registeredCount || 0) / (course.capacity || 20)) * 100)) : 50;

  const benefitIcons: Record<string, React.ReactNode> = {
    target: <Target size={20} />, award: <Award size={20} />, wrench: <Wrench size={20} />,
    shield: <Shield size={20} />, users: <Users size={20} />, trending: <TrendingUp size={20} />,
    zap: <Zap size={20} />, book: <BookOpen size={20} />, grad: <GraduationCap size={20} />,
  };

  const defaultBenefits = lp.benefits?.length ? lp.benefits : [
    { title: 'Metodologia Exclusiva', description: 'Conteúdo desenvolvido por especialistas com anos de experiência no mercado.', icon: 'target' },
    { title: 'Certificação Oficial', description: 'Certificado reconhecido pelo setor automotivo ao concluir o curso.', icon: 'award' },
    { title: 'Prática Intensiva', description: 'Mais de 70% do tempo em atividades práticas com equipamentos reais.', icon: 'wrench' },
    { title: 'Suporte Pós-Curso', description: 'Grupo exclusivo de ex-alunos e acesso ao material por 12 meses.', icon: 'shield' },
    { title: 'Turma Reduzida', description: 'Máximo de alunos por turma para garantir atenção individualizada.', icon: 'users' },
    { title: 'Atualização Contínua', description: 'Conteúdo sempre atualizado com as últimas tendências do mercado.', icon: 'trending' },
  ];

  const defaultFaqs = [
    { q: 'Quem pode participar?', a: 'O curso é voltado para profissionais e entusiastas da área automotiva que desejam aprofundar seus conhecimentos e obter certificação oficial W-Tech.' },
    { q: 'O certificado é reconhecido pelo mercado?', a: 'Sim. A certificação W-Tech é reconhecida pelo setor automotivo e representa um diferencial competitivo no mercado.' },
    { q: 'Como é feito o pagamento?', a: 'Aceitamos cartão de crédito, boleto bancário e PIX. Para pagamento parcelado, entre em contato via WhatsApp.' },
    { q: 'O que devo levar no dia?', a: course?.whatToBring || 'Documentos pessoais, caneta e vontade de aprender! Os materiais didáticos são fornecidos pelo instrutor.' },
    { q: 'Haverá material de apoio?', a: 'Sim! Todos os alunos recebem apostila completa, acesso a conteúdo digital exclusivo e certificado de conclusão.' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden selection:bg-wtech-gold/20">

      {lp.fakeAlertsEnabled && <FakeSignupAlert courseName={lp.title} />}

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
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
                <span className="font-black text-sm tracking-widest uppercase text-gray-900">{siteTitle}</span>
              </div>
            )}
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-gray-500">
            <button onClick={() => scrollTo('sobre')} className="hover:text-wtech-gold transition-colors">Sobre</button>
            {course?.schedule && <button onClick={() => scrollTo('cronograma')} className="hover:text-wtech-gold transition-colors">Cronograma</button>}
            <button onClick={() => scrollTo('instrutor')} className="hover:text-wtech-gold transition-colors">Instrutor</button>
            <button onClick={() => scrollTo('inscricao')}
              className="bg-wtech-gold text-black px-5 py-2 rounded-lg hover:bg-yellow-400 transition-colors">
              Garantir Vaga
            </button>
          </nav>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-700 p-2">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="md:hidden bg-white border-t border-gray-100 overflow-hidden">
              <div className="px-5 py-4 flex flex-col gap-4">
                {[['sobre', 'Sobre'], ['cronograma', 'Cronograma'], ['instrutor', 'Instrutor']].map(([id, label]) => (
                  course?.schedule || id !== 'cronograma' ? (
                    <button key={id} onClick={() => scrollTo(id)} className="text-left text-sm font-bold uppercase tracking-wider text-gray-600 hover:text-wtech-gold transition-colors">{label}</button>
                  ) : null
                ))}
                <button onClick={() => scrollTo('inscricao')} className="bg-wtech-gold text-black font-black py-3 rounded-lg text-sm uppercase tracking-wider">Garantir Vaga</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* HERO — light, clean                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="pt-16 min-h-screen flex items-center relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-yellow-50/30">

        {/* Subtle decorative shapes */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.04] bg-wtech-gold translate-x-1/3 -translate-y-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.03] bg-wtech-gold -translate-x-1/3 translate-y-1/4 pointer-events-none" />
        {/* Gold top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-wtech-gold via-yellow-400 to-wtech-gold" />

        <div className="max-w-7xl mx-auto px-6 py-20 w-full grid lg:grid-cols-2 gap-14 items-center">

          {/* Left — text */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
              className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 bg-wtech-gold/10 border border-wtech-gold/30 text-yellow-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                <Star size={11} className="fill-yellow-500 text-yellow-500" /> Certificação Oficial
              </span>
              {course?.city && (
                <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                  <MapPin size={11} /> {course.city}
                </span>
              )}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
              className="text-5xl md:text-6xl font-black uppercase leading-[0.95] tracking-tight text-gray-900">
              {lp.title}
            </motion.h1>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }}>
              <GoldLine className="mb-4" />
              <p className="text-lg text-gray-600 leading-relaxed max-w-xl">{lp.subtitle}</p>
            </motion.div>

            {/* Info row */}
            {course && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }}
                className="flex flex-wrap gap-3">
                {course.date && (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-gray-700 shadow-sm">
                    <Calendar size={15} className="text-wtech-gold" />
                    <span className="font-bold">{formatDateLocal(course.date)}</span>
                  </div>
                )}
                {(course.startTime || course.endTime) && (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm text-gray-700 shadow-sm">
                    <Clock size={15} className="text-wtech-gold" />
                    <span className="font-bold">{course.startTime}{course.endTime ? ` – ${course.endTime}` : ''}</span>
                  </div>
                )}
                {course.price > 0 && (
                  <div className="flex items-center gap-2 bg-wtech-gold/10 border border-wtech-gold/30 px-4 py-2.5 rounded-xl text-sm shadow-sm">
                    <span className="font-black text-yellow-800">{currency} {course.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.6 }}
              className="flex flex-wrap gap-3">
              <button onClick={() => scrollTo('inscricao')}
                className="group bg-wtech-gold hover:bg-yellow-400 text-black font-black px-8 py-4 rounded-xl uppercase tracking-wider text-sm flex items-center gap-2 transition-all shadow-lg shadow-wtech-gold/20 hover:shadow-wtech-gold/30">
                Garantir Minha Vaga
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              {whatsapp && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 border-2 border-gray-200 hover:border-green-400 text-gray-700 hover:text-green-600 px-6 py-4 rounded-xl font-bold text-sm transition-all">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
            </motion.div>
          </div>

          {/* Right — image + countdown */}
          <div className="flex flex-col gap-6 items-center lg:items-end">

            {/* Hero image */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.7 }}
              className="relative w-full max-w-md">
              <div className="absolute -inset-3 bg-wtech-gold/8 rounded-3xl" />
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-gray-200 shadow-xl">
                {lp.heroSecondaryImage || lp.heroImage ? (
                  <img src={lp.heroSecondaryImage || lp.heroImage} alt={lp.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <GraduationCap size={64} className="text-gray-300" />
                  </div>
                )}
              </div>
              <motion.div
                animate={{ y: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-3 -right-3 bg-wtech-gold text-black font-black px-4 py-2 rounded-xl text-xs shadow-lg flex items-center gap-1.5">
                <Trophy size={13} /> Certificado Oficial
              </motion.div>
            </motion.div>

            {/* Countdown */}
            {course?.date && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm w-full max-w-md">
                <div className="flex items-center gap-2 mb-3">
                  <Timer size={14} className="text-wtech-gold" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500">O curso começa em</span>
                </div>
                <CountdownStrip date={course.date} />

                {/* Scarcity */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 font-bold">Vagas disponíveis</span>
                    <span className={`font-black ${isFull ? 'text-red-500' : 'text-yellow-700'}`}>
                      {isFull ? 'Esgotado' : `${spotsLeft} restantes`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ delay: 1.2, duration: 1 }}
                      className="h-full bg-wtech-gold rounded-full" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{pct}% das vagas preenchidas</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* STATS                                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Anos de experiência', value: '10+' },
            { label: 'Alunos formados', value: '3.000+' },
            { label: 'Cidades atendidas', value: '40+' },
            { label: 'Satisfação', value: '98%' },
          ].map(({ label, value }, i) => (
            <Reveal key={label} delay={i * 0.08} className="text-center">
              <div className="text-3xl font-black text-wtech-gold">{value}</div>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SOBRE                                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="sobre" className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <Reveal>
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold">Sobre o Curso</p>
              <GoldLine className="my-3" />
              <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900 leading-tight">{lp.title}</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-gray-600 leading-relaxed">{lp.subtitle}</p>
            </Reveal>
            {course?.features && course.features.length > 0 && (
              <Reveal delay={0.2}>
                <ul className="space-y-2.5">
                  {course.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle size={16} className="text-wtech-gold mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}
            <Reveal delay={0.25}>
              <button onClick={() => scrollTo('inscricao')}
                className="inline-flex items-center gap-2 border-2 border-wtech-gold text-yellow-700 font-bold px-6 py-3 rounded-xl hover:bg-wtech-gold hover:text-black transition-all text-sm uppercase tracking-wider">
                Quero me inscrever <ArrowRight size={14} />
              </button>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Award size={20} className="text-wtech-gold" />, label: 'Certificação', value: 'Oficial W-Tech' },
                  { icon: <Users size={20} className="text-wtech-gold" />, label: 'Turma', value: 'Reduzida' },
                  { icon: <Wrench size={20} className="text-wtech-gold" />, label: 'Prática', value: '70% hands-on' },
                  { icon: <Shield size={20} className="text-wtech-gold" />, label: 'Suporte', value: 'Pós-curso' },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 bg-wtech-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">{icon}</div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p>
                      <p className="font-black text-gray-900 text-sm mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              {course?.date && (
                <div className="bg-wtech-gold/5 border border-wtech-gold/20 rounded-xl p-4 flex items-center gap-3">
                  <Calendar size={18} className="text-wtech-gold flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 font-bold">Data do curso</p>
                    <p className="font-black text-gray-900">{formatDateLocal(course.date)}{course.dateEnd ? ` – ${formatDateLocal(course.dateEnd)}` : ''}</p>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CRONOGRAMA                                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {course?.schedule && (
        <section id="cronograma" className="py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Programação</p>
              <GoldLine className="mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900">
                Cronograma <span className="text-wtech-gold">do Curso</span>
              </h2>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto text-sm">Veja como será organizado o dia de aprendizado intensivo.</p>
            </Reveal>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-wtech-gold/10 rounded-xl flex items-center justify-center">
                  <ClipboardList size={20} className="text-wtech-gold" />
                </div>
                <div>
                  <p className="font-black text-gray-900">{lp.title}</p>
                  {course.date && <p className="text-sm text-gray-500">{formatDateLocal(course.date)}{course.startTime ? ` · ${course.startTime}` : ''}{course.endTime ? ` – ${course.endTime}` : ''}</p>}
                </div>
              </div>
              <ScheduleBlock text={course.schedule} />
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* BENEFÍCIOS                                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-14">
          <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Diferenciais</p>
          <GoldLine className="mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900">
            O que você vai <span className="text-wtech-gold">ganhar</span>
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {defaultBenefits.map((b, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="group bg-white border border-gray-200 hover:border-wtech-gold/40 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 bg-wtech-gold/10 border border-wtech-gold/20 rounded-xl flex items-center justify-center mb-4 text-wtech-gold group-hover:bg-wtech-gold group-hover:text-black transition-colors">
                {benefitIcons[b.icon || 'zap'] || <Zap size={20} />}
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-2 group-hover:text-yellow-700 transition-colors">{b.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MÓDULOS                                                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {lp.modules && lp.modules.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <Reveal className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Conteúdo</p>
              <GoldLine className="mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900">O que você vai <span className="text-wtech-gold">aprender</span></h2>
            </Reveal>
            <div className="space-y-3">
              {lp.modules.map((mod, i) => {
                const open = openModule === i;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.45, delay: i * 0.06 }}
                    className={`bg-white border rounded-xl overflow-hidden transition-colors ${open ? 'border-wtech-gold/40' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <button onClick={() => setOpenModule(open ? null : i)}
                      className="w-full flex items-center gap-4 p-5 text-left">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors ${open ? 'bg-wtech-gold text-black' : 'bg-gray-100 text-gray-600'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <span className="flex-1 font-black text-gray-900">{mod.title}</span>
                      <motion.span animate={{ rotate: open ? 180 : 0 }}>
                        <ChevronDown size={16} className="text-gray-400" />
                      </motion.span>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <p className="px-5 pb-5 pl-[72px] text-gray-600 text-sm leading-relaxed">{mod.description}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INSTRUTOR                                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {(lp.instructorName || lp.instructorBio) && (
        <section id="instrutor" className="py-24 max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Conheça</p>
            <GoldLine className="mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900">Seu <span className="text-wtech-gold">Instrutor</span></h2>
          </Reveal>
          <div className="grid lg:grid-cols-2 gap-14 items-center max-w-5xl mx-auto">
            <Reveal>
              <div className="relative flex justify-center">
                {lp.instructorImage ? (
                  <div className="w-72 h-72 rounded-2xl overflow-hidden border-4 border-white shadow-xl ring-2 ring-wtech-gold/20">
                    <img src={lp.instructorImage} alt={lp.instructorName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-72 h-72 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg">
                    <GraduationCap size={80} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute -bottom-3 -right-3 bg-wtech-gold text-black text-xs font-black px-4 py-2 rounded-xl shadow-md">
                  <Award size={11} className="inline mr-1" />Especialista Certificado
                </div>
              </div>
            </Reveal>
            <div className="space-y-5">
              <Reveal delay={0.1}>
                <h3 className="text-2xl font-black text-gray-900">{lp.instructorName || course?.instructor}</h3>
                <div className="flex gap-1 mt-1">{[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-wtech-gold text-wtech-gold" />)}</div>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="text-gray-600 leading-relaxed">{lp.instructorBio}</p>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Experiência', value: '10+ anos' },
                    { label: 'Alunos', value: '3.000+' },
                    { label: 'Certificações', value: '15+' },
                    { label: 'Avaliação', value: '4.9 ★' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                      <div className="text-lg font-black text-wtech-gold">{value}</div>
                      <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DEPOIMENTOS                                                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {lp.testimonials && lp.testimonials.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <Reveal className="text-center mb-14">
              <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Depoimentos</p>
              <GoldLine className="mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900">O que dizem nossos <span className="text-wtech-gold">alunos</span></h2>
            </Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {lp.testimonials.map((t, i) => {
                const ytId = t.videoUrl ? (() => {
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                  const match = t.videoUrl.match(regExp);
                  return (match && match[2].length === 11) ? match[2] : '';
                })() : '';

                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.09 }}
                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-yellow-500/30 transition-all duration-300 group">
                    
                    {ytId ? (
                      /* Video Testimonial */
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-100 group-hover:border-wtech-gold/30 transition-colors bg-gray-50 cursor-pointer"
                          onClick={() => setActiveVideo(ytId)}>
                          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={t.name} />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="w-12 h-12 bg-wtech-gold text-black rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 active:scale-95 transition-all duration-300">
                              <Play size={16} className="fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-500 text-sm italic leading-relaxed mb-4">"{t.text}"</p>
                      </div>
                    ) : (
                      /* Text Testimonial */
                      <div className="space-y-4 flex-1">
                        <Quote size={24} className="text-wtech-gold/30 mb-2" />
                        <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                      {t.image ? (
                        <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover border-2 border-wtech-gold/20" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-wtech-gold/15 flex items-center justify-center text-yellow-700 font-black">{t.name[0]}</div>
                      )}
                      <div>
                        <div className="font-black text-gray-900 text-sm">{t.name}</div>
                        <div className="flex gap-0.5 mt-0.5">{[...Array(5)].map((_, j) => <Star key={j} size={11} className="fill-wtech-gold text-wtech-gold" />)}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DATA & LOCAL                                                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {course && (course.date || course.location || course.city) && (
        <section className="py-20 max-w-5xl mx-auto px-6">
          <Reveal className="text-center mb-10">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Quando e onde</p>
            <GoldLine className="mx-auto mb-4" />
            <h2 className="text-2xl font-black uppercase text-gray-900">Data e <span className="text-wtech-gold">Local</span></h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-4">
            {course.date && (
              <Reveal className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex gap-4 items-start">
                <div className="w-11 h-11 bg-wtech-gold/10 rounded-xl flex items-center justify-center text-wtech-gold flex-shrink-0"><Calendar size={20} /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Data</p>
                  <p className="font-black text-gray-900">{formatDateLocal(course.date)}</p>
                  {course.dateEnd && <p className="text-sm text-gray-500 mt-0.5">até {formatDateLocal(course.dateEnd)}</p>}
                </div>
              </Reveal>
            )}
            {(course.startTime || course.endTime) && (
              <Reveal delay={0.08} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex gap-4 items-start">
                <div className="w-11 h-11 bg-wtech-gold/10 rounded-xl flex items-center justify-center text-wtech-gold flex-shrink-0"><Clock size={20} /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Horário</p>
                  <p className="font-black text-gray-900">{course.startTime}{course.endTime ? ` às ${course.endTime}` : ''}</p>
                </div>
              </Reveal>
            )}
            {(course.location || course.city) && (
              <Reveal delay={0.16} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex gap-4 items-start">
                <div className="w-11 h-11 bg-wtech-gold/10 rounded-xl flex items-center justify-center text-wtech-gold flex-shrink-0"><MapPin size={20} /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Local</p>
                  <p className="font-black text-gray-900">{course.location || course.city}</p>
                  {course.address && <p className="text-sm text-gray-500 mt-0.5">{course.address}{course.addressNumber ? `, ${course.addressNumber}` : ''}</p>}
                  {course.mapUrl && (
                    <a href={course.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-wtech-gold text-xs font-bold mt-1 hover:underline">
                      Ver no mapa <ArrowRight size={11} />
                    </a>
                  )}
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INSCRIÇÃO                                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section id="inscricao" className="py-24 bg-gradient-to-br from-gray-50 to-yellow-50/20">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Inscrição</p>
            <GoldLine className="mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-black uppercase text-gray-900">Garanta sua <span className="text-wtech-gold">vaga agora</span></h2>
          </Reveal>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Price card */}
            <Reveal className="lg:col-span-2">
              <div className="bg-white border-2 border-wtech-gold/20 rounded-2xl p-7 shadow-sm sticky top-24">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Investimento</div>
                {course?.price && course.price > 0 ? (
                  <div className="mb-6">
                    <div className="text-4xl font-black text-gray-900">
                      <span className="text-xl text-gray-400 mr-1">{currency}</span>
                      {course.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {course.recyclingPrice && course.recyclingPrice < course.price && (
                      <div className="mt-2 bg-wtech-gold/10 border border-wtech-gold/20 rounded-lg px-3 py-2 text-sm">
                        <span className="text-gray-500">Reciclagem: </span>
                        <span className="font-black text-yellow-700">{currency} {course.recyclingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-2xl font-black text-gray-900 mb-6">Consulte o valor</div>
                )}

                <ul className="space-y-2.5 mb-6">
                  {['Material didático incluso', 'Certificado de conclusão', 'Acesso ao grupo exclusivo', 'Suporte pós-curso'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle size={14} className="text-wtech-gold flex-shrink-0" /> {item}
                    </li>
                  ))}
                </ul>

                {/* Scarcity */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500 font-bold">Vagas</span>
                    <span className={`font-black ${isFull ? 'text-red-500' : 'text-yellow-700'}`}>
                      {isFull ? 'Esgotado' : `${spotsLeft} restantes`}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }} transition={{ duration: 1 }}
                      className="h-full bg-wtech-gold rounded-full" />
                  </div>
                </div>

                {whatsapp && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 py-3 rounded-xl text-sm font-bold transition-colors">
                    <MessageCircle size={15} /> Tirar dúvidas no WhatsApp
                  </a>
                )}
              </div>
            </Reveal>

            {/* Form */}
            <Reveal delay={0.1} className="lg:col-span-3">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                {submitted ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10">
                    <div className="w-16 h-16 bg-green-100 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-5">
                      <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Inscrição enviada!</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Nossa equipe entrará em contato em breve para confirmar sua vaga.</p>
                    {whatsapp && (
                      <a href={waLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-wtech-gold text-black font-black px-6 py-3 rounded-xl mt-6 text-sm hover:bg-yellow-400 transition-colors">
                        <MessageCircle size={14} /> Continuar pelo WhatsApp
                      </a>
                    )}
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <h3 className="text-xl font-black text-gray-900 mb-2">Preencha seus dados</h3>
                    {[
                      { id: 'name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo', key: 'name' },
                      { id: 'email', label: 'E-mail', type: 'email', placeholder: 'seu@email.com', key: 'email' },
                      { id: 'phone', label: 'WhatsApp', type: 'tel', placeholder: '(11) 99999-9999', key: 'phone' },
                    ].map(f => (
                      <div key={f.id}>
                        <label htmlFor={f.id} className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                          {f.label} <span className="text-wtech-gold">*</span>
                        </label>
                        <input id={f.id} type={f.type} required
                          value={form[f.key as keyof typeof form]}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-wtech-gold focus:ring-2 focus:ring-wtech-gold/10 transition-all text-gray-900 placeholder-gray-300"
                        />
                      </div>
                    ))}
                    <motion.button type="submit" disabled={submitting || isFull} whileTap={{ scale: 0.98 }}
                      className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${
                        isFull ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-wtech-gold hover:bg-yellow-400 text-black shadow-lg shadow-wtech-gold/20 hover:-translate-y-0.5'
                      }`}>
                      {submitting
                        ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Enviando...</>
                        : isFull ? 'Turma encerrada'
                        : <><ArrowRight size={16} /> Garantir minha vaga</>
                      }
                    </motion.button>
                    <p className="text-xs text-gray-400 text-center">Seus dados estão seguros. Não fazemos spam.</p>
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
      <section className="py-24 max-w-3xl mx-auto px-6">
        <Reveal className="text-center mb-12">
          <p className="text-xs font-black uppercase tracking-widest text-wtech-gold mb-2">Dúvidas</p>
          <GoldLine className="mx-auto mb-4" />
          <h2 className="text-3xl font-black uppercase text-gray-900">Perguntas <span className="text-wtech-gold">frequentes</span></h2>
        </Reveal>
        <div className="space-y-3">
          {defaultFaqs.map((f, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <FaqItem q={f.q} a={f.a} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FINAL CTA                                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #D4AF37 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <GoldLine className="mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-black uppercase text-white leading-tight mb-4">
              Transforme sua <span className="text-wtech-gold">carreira</span> hoje
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">Não perca essa oportunidade de se tornar um profissional certificado W-Tech.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={() => scrollTo('inscricao')}
                className="bg-wtech-gold hover:bg-yellow-400 text-black font-black px-10 py-4 rounded-xl uppercase tracking-wider text-sm flex items-center gap-2 transition-all shadow-lg shadow-wtech-gold/20 hover:-translate-y-1">
                Garantir vaga <ArrowRight size={16} />
              </button>
              {whatsapp && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="border border-white/20 text-white hover:bg-white/10 px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all">
                  <MessageCircle size={15} className="text-green-400" /> WhatsApp
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-6 text-center bg-white">
        <p className="text-gray-400 text-xs">© {new Date().getFullYear()} {siteTitle}. Todos os direitos reservados.</p>
      </footer>

      {/* Mobile sticky CTA */}
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} transition={{ delay: 2, duration: 0.5 }}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-200 p-3 shadow-lg">
        <button onClick={() => scrollTo('inscricao')}
          className="w-full bg-wtech-gold text-black font-black py-3.5 rounded-xl uppercase tracking-wider text-sm flex items-center justify-center gap-2">
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

      {lp.quizEnabled && <QualificationQuiz lp={lp} onComplete={() => {}} whatsappGlobalNumber={whatsapp || ''} />}
    </div>
  );
};

export default LandingPageViewerV3;
