import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
  Plus, Eye, TrendingUp, ArrowUpRight, Layers, Zap, Star,
  CheckCircle, Sparkles, Monitor, ArrowRight, ExternalLink,
  Clock, Users, BarChart2, Copy, Check
} from 'lucide-react';
import type { LandingPage } from '../../../types';

// ─── Template definitions ────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'v1' as const,
    name: 'Classic Dark',
    badge: 'V1',
    tagline: 'Sólido e direto ao ponto',
    description: 'Layout escuro elegante com hero, benefícios, módulos e formulário. Ideal para cursos com conteúdo rico.',
    features: ['Hero com imagem de fundo', 'Seção de benefícios', 'Lista de módulos', 'Formulário de inscrição', 'WhatsApp CTA'],
    color: '#1a1a1a',
    accent: '#D4AF37',
    isNew: false,
  },
  {
    id: 'v2' as const,
    name: 'Premium Cinematic',
    badge: 'V2',
    tagline: 'Cinematográfico e de alta conversão',
    description: 'Parallax hero, countdown ao vivo, contadores animados, cards com stagger e CTA flutuante mobile.',
    features: ['Parallax hero + barra de progresso scroll', 'Countdown em tempo real', 'Contadores animados', 'Cards com entrada em stagger', 'Timeline de módulos expansível', 'FAQ accordion', 'CTA flutuante mobile'],
    color: '#050505',
    accent: '#D4AF37',
    isNew: false,
  },
  {
    id: 'v3' as const,
    name: 'White Clean',
    badge: 'V3',
    tagline: 'Branco, leve e cronograma visual',
    description: 'Design claro/branco com cronograma do curso em timeline, countdown em card branco e formulário lateral.',
    features: ['Hero branco com imagem lateral', 'Cronograma visual automático (do curso)', 'Countdown em cards brancos', 'Seção de benefícios com hover dourado', 'Formulário com card de preço lateral', 'FAQ accordion', 'CTA flutuante mobile'],
    color: '#ffffff',
    accent: '#D4AF37',
    isNew: true,
  },
] as const;

type TemplateId = 'v1' | 'v2' | 'v3';

// ─── Visual Mockup — V1 ───────────────────────────────────────────────────────
const MockupV1 = () => (
  <div className="w-full h-full bg-[#0a0a0a] overflow-hidden rounded-t-lg relative select-none">
    {/* navbar */}
    <div className="h-5 bg-black/80 flex items-center px-2 gap-1 border-b border-white/5">
      <div className="w-8 h-1.5 bg-[#D4AF37]/60 rounded-full" />
      <div className="flex-1" />
      <div className="w-10 h-2 bg-[#D4AF37] rounded-sm" />
    </div>
    {/* hero */}
    <div className="relative h-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700/40 to-gray-900/80" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      <div className="absolute bottom-3 left-3 space-y-1">
        <div className="flex gap-1">
          <div className="h-1.5 w-12 bg-[#D4AF37]/50 rounded-full" />
          <div className="h-1.5 w-8 bg-white/20 rounded-full" />
        </div>
        <div className="h-4 w-28 bg-white/80 rounded" />
        <div className="h-2 w-24 bg-white/40 rounded" />
        <div className="flex gap-1 mt-1">
          <div className="h-3 w-14 bg-[#D4AF37] rounded" />
          <div className="h-3 w-12 bg-white/10 border border-white/20 rounded" />
        </div>
      </div>
    </div>
    {/* stats bar */}
    <div className="h-6 bg-[#111] border-y border-white/5 flex items-center justify-around px-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className="h-1.5 w-5 bg-[#D4AF37]/70 rounded-full" />
          <div className="h-1 w-8 bg-white/20 rounded-full" />
        </div>
      ))}
    </div>
    {/* benefits */}
    <div className="p-2 grid grid-cols-3 gap-1">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white/3 border border-white/8 rounded p-1.5 space-y-1">
          <div className="w-3 h-3 bg-[#D4AF37]/20 rounded" />
          <div className="h-1.5 w-full bg-white/30 rounded-full" />
          <div className="h-1 w-3/4 bg-white/15 rounded-full" />
        </div>
      ))}
    </div>
    {/* form */}
    <div className="mx-2 bg-white/3 border border-white/8 rounded p-2 space-y-1">
      <div className="h-1.5 w-16 bg-white/30 rounded-full" />
      {[1,2].map(i => <div key={i} className="h-3 w-full bg-white/8 border border-white/10 rounded" />)}
      <div className="h-3 w-full bg-[#D4AF37] rounded" />
    </div>
  </div>
);

// ─── Visual Mockup — V2 ───────────────────────────────────────────────────────
const MockupV2 = () => (
  <div className="w-full h-full bg-[#050505] overflow-hidden rounded-t-lg relative select-none">
    {/* scroll progress bar */}
    <div className="h-0.5 bg-[#D4AF37] w-2/3" />
    {/* navbar */}
    <div className="h-5 bg-black/80 backdrop-blur flex items-center px-2 gap-1 border-b border-white/5">
      <div className="w-7 h-2 bg-[#D4AF37]/70 rounded-sm" />
      <div className="flex-1" />
      <div className="w-10 h-2 bg-[#D4AF37] rounded-sm" />
    </div>
    {/* hero */}
    <div className="relative h-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700/30 to-gray-900/70" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 60% 50%, rgba(212,175,55,0.12) 0%, transparent 60%)' }} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
      {/* badges */}
      <div className="absolute top-2 left-3 flex gap-1">
        <div className="h-2 w-16 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-full" />
        <div className="h-2 w-10 bg-white/8 border border-white/10 rounded-full" />
      </div>
      {/* title */}
      <div className="absolute top-6 left-3 space-y-0.5">
        <div className="h-4 w-28 bg-white/90 rounded" />
        <div className="h-2 w-20 bg-white/40 rounded" />
      </div>
      {/* countdown */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="w-5 h-5 bg-black/60 border border-[#D4AF37]/30 rounded flex flex-col items-center justify-center gap-0.5">
            <div className="h-1.5 w-3 bg-white/70 rounded-full" />
            <div className="h-0.5 w-2 bg-[#D4AF37]/50 rounded-full" />
          </div>
        ))}
      </div>
      {/* scarcity */}
      <div className="absolute bottom-2 left-3 space-y-0.5 w-20">
        <div className="flex justify-between">
          <div className="h-1 w-8 bg-white/20 rounded-full" />
          <div className="h-1 w-6 bg-[#D4AF37]/60 rounded-full" />
        </div>
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-[#D4AF37] rounded-full" />
        </div>
      </div>
    </div>
    {/* stats */}
    <div className="h-7 bg-[#0a0a0a] border-y border-white/5 flex items-center justify-around px-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className="h-2 w-5 bg-[#D4AF37] rounded-full" />
          <div className="h-1 w-7 bg-white/20 rounded-full" />
        </div>
      ))}
    </div>
    {/* benefit cards stagger */}
    <div className="p-2 grid grid-cols-3 gap-1">
      {[0,1,2].map(i => (
        <div key={i} className="bg-white/3 border border-white/8 rounded p-1.5 space-y-1"
          style={{ opacity: 1 - i * 0.1 }}>
          <div className="w-4 h-4 bg-[#D4AF37]/15 border border-[#D4AF37]/20 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-[#D4AF37]/60 rounded-sm" />
          </div>
          <div className="h-1.5 w-full bg-white/30 rounded-full" />
          <div className="h-1 w-3/4 bg-white/15 rounded-full" />
        </div>
      ))}
    </div>
    {/* mobile sticky cta */}
    <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/90 border-t border-white/10 flex items-center justify-center">
      <div className="h-2 w-24 bg-[#D4AF37] rounded-sm" />
    </div>
  </div>
);

// ─── Visual Mockup — V3 ───────────────────────────────────────────────────────
const MockupV3 = () => (
  <div className="w-full h-full bg-white overflow-hidden rounded-t-lg relative select-none">
    {/* gold top stripe */}
    <div className="h-0.5 bg-gradient-to-r from-[#D4AF37] to-yellow-400 w-full" />
    {/* navbar */}
    <div className="h-5 bg-white flex items-center px-2 gap-1 border-b border-gray-100 shadow-sm">
      <div className="w-7 h-2 bg-[#D4AF37] rounded-sm" />
      <div className="flex-1" />
      <div className="hidden sm:flex gap-3 mr-2">
        <div className="h-1 w-6 bg-gray-300 rounded-full" />
        <div className="h-1 w-6 bg-gray-300 rounded-full" />
      </div>
      <div className="w-12 h-2.5 bg-[#D4AF37] rounded-lg" />
    </div>
    {/* hero */}
    <div className="relative h-28 bg-gradient-to-br from-gray-50 to-yellow-50/20 flex overflow-hidden">
      {/* left */}
      <div className="flex-1 p-2 space-y-1">
        <div className="h-2 w-20 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-full" />
        <div className="h-4 w-24 bg-gray-800 rounded" />
        <div className="h-0.5 w-6 bg-[#D4AF37] rounded-full" />
        <div className="h-2 w-28 bg-gray-400/40 rounded-full" />
        <div className="flex gap-1.5 mt-1.5">
          <div className="h-3 w-14 bg-[#D4AF37] rounded-lg shadow-sm" />
          <div className="h-3 w-12 bg-white border border-gray-200 rounded-lg shadow-sm" />
        </div>
        {/* date pill */}
        <div className="flex gap-1 mt-1">
          <div className="h-2.5 w-16 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center px-1 gap-0.5">
            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-sm" />
            <div className="h-1 w-8 bg-gray-400/50 rounded-full" />
          </div>
        </div>
      </div>
      {/* right — image + countdown */}
      <div className="w-24 p-1.5 flex flex-col gap-1">
        <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 shadow-sm" />
        <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <div className="flex gap-0.5 justify-center mb-0.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-4 h-4 bg-white border border-[#D4AF37]/40 rounded-md flex items-center justify-center shadow-sm">
                <div className="h-1 w-2.5 bg-gray-700/60 rounded-full" />
              </div>
            ))}
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-[#D4AF37] rounded-full" />
          </div>
        </div>
      </div>
    </div>
    {/* stats dark strip */}
    <div className="h-6 bg-gray-900 flex items-center justify-around px-2">
      {[1,2,3,4].map(i => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className="h-2 w-5 bg-[#D4AF37] rounded-full" />
          <div className="h-1 w-7 bg-white/20 rounded-full" />
        </div>
      ))}
    </div>
    {/* schedule timeline */}
    <div className="p-2 space-y-1.5">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-start gap-1.5">
          <div className={`w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center ${i === 1 ? 'bg-[#D4AF37]' : 'bg-gray-100 border border-gray-200'}`}>
            <div className={`h-1 w-3 rounded-full ${i === 1 ? 'bg-black/50' : 'bg-gray-400/50'}`} />
          </div>
          <div className="space-y-0.5 flex-1">
            <div className="h-1.5 w-20 bg-gray-700/40 rounded-full" />
            <div className="h-1 w-14 bg-gray-300/60 rounded-full" />
          </div>
        </div>
      ))}
    </div>
    {/* benefit cards */}
    <div className="px-2 grid grid-cols-3 gap-1">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-1.5 space-y-0.5 shadow-sm">
          <div className="w-3 h-3 bg-[#D4AF37]/15 border border-[#D4AF37]/25 rounded" />
          <div className="h-1.5 w-full bg-gray-700/30 rounded-full" />
          <div className="h-1 w-3/4 bg-gray-300/50 rounded-full" />
        </div>
      ))}
    </div>
    {/* mobile sticky cta */}
    <div className="absolute bottom-0 left-0 right-0 h-4 bg-white border-t border-gray-200 flex items-center justify-center shadow-md">
      <div className="h-2.5 w-24 bg-[#D4AF37] rounded-lg" />
    </div>
  </div>
);

// ─── Template Card (gallery) ─────────────────────────────────────────────────
const TemplateGalleryCard = ({
  template, selected, onSelect
}: {
  template: typeof TEMPLATES[number];
  selected: boolean;
  onSelect: () => void;
}) => (
  <div
    onClick={onSelect}
    className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-200 group ${
      selected
        ? 'border-yellow-500 shadow-[0_0_0_3px_rgba(212,175,55,0.2)]'
        : 'border-gray-200 hover:border-yellow-400/60'
    }`}
  >
    {/* Mockup preview */}
    <div className="h-52 relative overflow-hidden bg-[#050505]">
      {template.id === 'v1' ? <MockupV1 /> : template.id === 'v2' ? <MockupV2 /> : <MockupV3 />}
      {/* NEW badge */}
      {template.isNew && (
        <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
          <Sparkles size={8} /> Novo
        </div>
      )}
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
          <Check size={11} className="text-black" strokeWidth={3} />
        </div>
      )}
    </div>

    {/* Info */}
    <div className="p-4 bg-white border-t border-gray-100">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded">{template.badge}</span>
            <h3 className="font-black text-gray-900 text-sm">{template.name}</h3>
          </div>
          <p className="text-xs text-yellow-600 font-semibold mt-0.5">{template.tagline}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed mb-3">{template.description}</p>
      <ul className="space-y-1">
        {template.features.slice(0, 4).map((f, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <CheckCircle size={10} className="text-yellow-500 flex-shrink-0" />
            {f}
          </li>
        ))}
        {template.features.length > 4 && (
          <li className="text-[11px] text-gray-400 pl-4">+{template.features.length - 4} mais...</li>
        )}
      </ul>
    </div>
  </div>
);

// ─── Mini template badge for LP cards ────────────────────────────────────────
const TemplateBadge = ({ template }: { template?: TemplateId }) => {
  const t = TEMPLATES.find(t => t.id === (template || 'v1'));
  if (!t) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
      t.id === 'v2'
        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
        : t.id === 'v3'
        ? 'bg-blue-50 text-blue-700 border border-blue-200'
        : 'bg-gray-100 text-gray-600 border border-gray-200'
    }`}>
      {t.id === 'v2' && <Sparkles size={7} />}
      {t.badge} · {t.name}
    </span>
  );
};

// ─── Copy URL helper ──────────────────────────────────────────────────────────
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="ml-1 text-gray-400 hover:text-yellow-600 transition-colors">
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LandingPagesView = ({ permissions }: { permissions?: any }) => {
  const [pages, setPages] = useState<(LandingPage & { viewCount?: number; conversionCount?: number })[]>([]);
  const [activeTab, setActiveTab] = useState<'lps' | 'gallery'>('lps');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<LandingPage> & { heroHeadline?: string; heroSubheadline?: string; features?: string[]; status?: string }>({});
  const [formTemplate, setFormTemplate] = useState<TemplateId>('v1');
  const [gallerySelected, setGallerySelected] = useState<TemplateId>('v2');

  const systemLinks = [
    { label: 'Home (Início)', url: 'https://w-techbrasil.com.br/' },
    { label: 'Cursos & Agenda', url: 'https://w-techbrasil.com.br/cursos' },
    { label: 'Mapa da Rede', url: 'https://w-techbrasil.com.br/mapa' },
    { label: 'Blog', url: 'https://w-techbrasil.com.br/blog' },
    { label: 'Glossário Técnico', url: 'https://w-techbrasil.com.br/glossario' },
    { label: 'Contato', url: 'https://w-techbrasil.com.br/contato' },
    { label: 'Cadastro de Mecânico', url: 'https://w-techbrasil.com.br/sou-mecanico' },
    { label: 'Painel Admin', url: 'https://w-techbrasil.com.br/admin' },
  ];

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    const { data } = await supabase
      .from('SITE_LandingPages')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPages(data.map((p: any) => ({
      ...p,
      heroImage: p.hero_image,
      heroHeadline: p.hero_headline,
      heroSubheadline: p.hero_subheadline,
      viewCount: p.view_count ?? 0,
      conversionCount: p.conversion_count ?? 0,
      template: p.template ?? 'v1',
    })));
  };

  const openEdit = (page?: typeof pages[number]) => {
    if (page) {
      setFormData(page);
      setFormTemplate((page.template as TemplateId) || 'v1');
    } else {
      setFormData({});
      setFormTemplate('v1');
    }
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      slug: formData.slug,
      hero_headline: formData.heroHeadline,
      hero_subheadline: formData.heroSubheadline,
      hero_image: formData.heroImage,
      features: formData.features,
      status: formData.status || 'Draft',
      template: formTemplate,
    };
    if (formData.id) {
      await supabase.from('SITE_LandingPages').update(payload).eq('id', formData.id);
    } else {
      await supabase.from('SITE_LandingPages').insert([payload]);
    }
    setIsEditing(false);
    fetchPages();
  };

  const lpUrl = (page: typeof pages[number]) => {
    const base = window.location.origin;
    const route = page.template === 'v2' ? 'lp2' : page.template === 'v3' ? 'lp3' : 'lp';
    return `${base}/${route}/${page.slug}`;
  };

  // ── EDIT FORM ───────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="bg-white rounded-xl shadow-sm text-gray-900 animate-in fade-in overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">
            {formData.id ? 'Editar Landing Page' : 'Nova Landing Page'}
          </h2>
          <button onClick={() => setIsEditing(false)} className="text-sm text-gray-400 hover:text-gray-700">Cancelar</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">

          {/* ── Template Selector ── */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-1 uppercase tracking-wide">
              Template Visual
            </label>
            <p className="text-xs text-gray-500 mb-3">Escolha o layout desta landing page. Pode alterar a qualquer momento.</p>
            <div className="grid grid-cols-2 gap-4">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFormTemplate(t.id)}
                  className={`relative rounded-xl border-2 overflow-hidden text-left transition-all duration-200 ${
                    formTemplate === t.id
                      ? 'border-yellow-500 shadow-[0_0_0_3px_rgba(212,175,55,0.2)]'
                      : 'border-gray-200 hover:border-yellow-400/60'
                  }`}
                >
                  {/* Mini mockup */}
                  <div className="h-32 bg-[#050505] overflow-hidden pointer-events-none">
                    {t.id === 'v1' ? <MockupV1 /> : t.id === 'v2' ? <MockupV2 /> : <MockupV3 />}
                  </div>
                  {/* Label */}
                  <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded">{t.badge}</span>
                        <span className="text-sm font-black text-gray-900">{t.name}</span>
                        {t.isNew && (
                          <span className="text-[9px] font-black bg-yellow-100 text-yellow-700 border border-yellow-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Sparkles size={7} /> Novo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{t.tagline}</p>
                    </div>
                    {formTemplate === t.id && (
                      <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={11} className="text-black" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Basic fields ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Título Interno</label>
              <input
                className="w-full border border-gray-200 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-yellow-400"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Curso Suspensão — São Paulo Mai/26"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-700">Slug (URL)</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-yellow-400">
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-2.5 border-r border-gray-200 whitespace-nowrap">/lp/</span>
                <input
                  className="flex-1 p-2.5 text-sm text-gray-900 focus:outline-none"
                  value={formData.slug || ''}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="suspensao-sp-mai-26"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Headline (Título Principal)</label>
            <input
              className="w-full border border-gray-200 p-2.5 rounded-lg text-gray-900 font-bold text-base focus:outline-none focus:border-yellow-400"
              value={formData.heroHeadline || ''}
              onChange={e => setFormData({ ...formData, heroHeadline: e.target.value })}
              placeholder="SUSPENSÃO ESPORTIVA CERTIFICADA"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Subheadline</label>
            <textarea
              className="w-full border border-gray-200 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-yellow-400"
              rows={2}
              value={formData.heroSubheadline || ''}
              onChange={e => setFormData({ ...formData, heroSubheadline: e.target.value })}
              placeholder="Domine a configuração e diagnóstico de suspensões esportivas com certificação oficial W-Tech."
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Imagem de Capa (URL)</label>
            <input
              className="w-full border border-gray-200 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-yellow-400"
              value={formData.heroImage || ''}
              onChange={e => setFormData({ ...formData, heroImage: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Lista de Benefícios / Features</label>
            <p className="text-xs text-gray-400 mb-2">Separe itens por vírgula</p>
            <textarea
              className="w-full border border-gray-200 p-2.5 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-yellow-400"
              rows={3}
              value={Array.isArray(formData.features) ? formData.features.join(', ') : formData.features || ''}
              onChange={e => setFormData({ ...formData, features: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="Certificação oficial, Material incluso, Prática com equipamento real"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-gray-700">Status:</label>
            {['Draft', 'Published'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFormData({ ...formData, status: s as 'Draft' | 'Published' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  (formData.status || 'Draft') === s
                    ? s === 'Published' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-700 border border-gray-300'
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {s === 'Published' ? '● Publicada' : '○ Rascunho'}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit"
              className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg text-sm transition-colors">
              Salvar Landing Page
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── MAIN VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="text-gray-900 animate-in fade-in space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Landing Pages</h2>
          <p className="text-xs text-gray-500 mt-0.5">Páginas de alta conversão para campanhas e cursos.</p>
        </div>
        <button
          onClick={() => openEdit()}
          className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2.5 rounded-lg font-black text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova LP
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'lps' as const, label: 'Minhas LPs', icon: <Monitor size={13} /> },
          { id: 'gallery' as const, label: 'Galeria de Templates', icon: <Layers size={13} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: GALERIA ─────────────────────────────────────────────────── */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-yellow-400" />
              <span className="text-xs font-black uppercase tracking-widest text-yellow-400">Templates de LP</span>
            </div>
            <h3 className="text-xl font-black mb-1">Escolha o estilo visual perfeito</h3>
            <p className="text-sm text-gray-400">
              Cada LP criada pode usar um template diferente. Altere o template pelo botão <strong className="text-white">Editar</strong> em qualquer LP.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {TEMPLATES.map(t => (
              <TemplateGalleryCard
                key={t.id}
                template={t}
                selected={gallerySelected === t.id}
                onSelect={() => setGallerySelected(t.id)}
              />
            ))}
          </div>

          {/* Feature comparison */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h4 className="font-black text-gray-900 text-sm">Comparação detalhada</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-gray-500 font-bold uppercase tracking-wide">Recurso</th>
                    <th className="px-5 py-3 text-center text-gray-700 font-black">V1 Classic</th>
                    <th className="px-5 py-3 text-center text-yellow-700 font-black">V2 Premium ✨</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Hero com imagem de fundo', true, true],
                    ['Barra de progresso de scroll', false, true],
                    ['Parallax no hero', false, true],
                    ['Countdown em tempo real', false, true],
                    ['Contadores animados (stats)', false, true],
                    ['Cards com entrada em stagger', false, true],
                    ['Timeline de módulos', true, true],
                    ['Seção de benefícios', true, true],
                    ['Seção de depoimentos', false, true],
                    ['FAQ accordion', false, true],
                    ['CTA flutuante mobile', false, true],
                    ['Menu mobile animado', false, true],
                    ['Formulário de inscrição', true, true],
                    ['WhatsApp CTA', true, true],
                    ['Suporte a reciclagem (preço)', false, true],
                  ].map(([feature, v1, v2], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                      <td className="px-5 py-2.5 text-gray-700 font-medium">{feature as string}</td>
                      <td className="px-5 py-2.5 text-center">
                        {v1 ? <CheckCircle size={13} className="text-green-500 inline" /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-2.5 text-center">
                        {v2 ? <CheckCircle size={13} className="text-yellow-500 inline" /> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => { setActiveTab('lps'); openEdit(); }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              <Plus size={15} /> Criar LP com template {gallerySelected.toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: MINHAS LPs ──────────────────────────────────────────────── */}
      {activeTab === 'lps' && (
        <div className="space-y-6">

          {/* System links */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="font-black text-gray-700 mb-3 text-xs uppercase tracking-wide">Links Internos do Sistema</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {systemLinks.map((link, idx) => (
                <div key={idx} className="flex flex-col text-xs">
                  <span className="font-bold text-gray-800 mb-1">{link.label}</span>
                  <div className="flex items-center">
                    <code className="bg-gray-200 px-1.5 py-1 rounded text-[10px] truncate flex-1 text-gray-700 select-all cursor-pointer"
                      title={link.url}>{link.url}</code>
                    <CopyButton text={link.url} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LP grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pages.map(page => {
              const tpl = TEMPLATES.find(t => t.id === (page.template || 'v1')) || TEMPLATES[0];
              const url = lpUrl(page);
              return (
                <div key={page.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                  {/* Mockup thumbnail */}
                  <div className="h-36 bg-[#050505] relative overflow-hidden cursor-pointer"
                    onClick={() => window.open(`/${tpl.id === 'v2' ? 'lp2' : tpl.id === 'v3' ? 'lp3' : 'lp'}/${page.slug}`, '_blank')}>
                    <div className="w-full h-full scale-[0.8] origin-top-left" style={{ width: '125%', height: '125%' }}>
                      {tpl.id === 'v1' ? <MockupV1 /> : tpl.id === 'v2' ? <MockupV2 /> : <MockupV3 />}
                    </div>
                    {/* overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex items-end p-3">
                      <TemplateBadge template={page.template as TemplateId} />
                    </div>
                    {/* status badge */}
                    <div className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      page.status === 'Published'
                        ? 'bg-green-500/90 text-white'
                        : 'bg-white/80 text-gray-600'
                    }`}>
                      {page.status || 'Draft'}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1">
                    <h3 className="font-black text-gray-900 text-sm mb-0.5">{page.title}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-3">
                      <span className="truncate">/lp/{page.slug}</span>
                      <CopyButton text={url} />
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye size={11} /> {(page as any).viewCount ?? 0}
                      </span>
                      <span className="flex items-center gap-1 text-green-600 font-bold">
                        <TrendingUp size={11} /> {(page as any).conversionCount ?? 0} leads
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => openEdit(page)}
                      className="flex-1 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                    >
                      Editar
                    </button>
                    <a
                      href={`/${tpl.id === 'v2' ? 'lp2' : tpl.id === 'v3' ? 'lp3' : 'lp'}/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex-1 py-2 text-xs font-black rounded-lg text-center flex items-center justify-center gap-1 transition-colors ${
                        tpl.id === 'v2'
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-400'
                          : tpl.id === 'v3'
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-gray-900 text-white hover:bg-gray-700'
                      }`}
                    >
                      {tpl.badge} <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              );
            })}

            {pages.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <Layers size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm font-bold">Nenhuma Landing Page criada ainda.</p>
                <button
                  onClick={() => openEdit()}
                  className="mt-4 bg-yellow-500 text-black font-black px-5 py-2.5 rounded-lg text-sm hover:bg-yellow-400 transition-colors"
                >
                  Criar primeira LP
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPagesView;
