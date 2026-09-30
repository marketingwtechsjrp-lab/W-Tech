import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Check, MessageCircle, SlidersHorizontal, X } from 'lucide-react';
import { WhatsAppLeadCapture } from '../WhatsAppLeadCapture';
import { trackGoogleEvent } from '../../lib/googleTracking';
import { COURSE_NAME } from '../../lib/courseSchema';
import './post-conversion.css';

const COURSE_PATH = '/curso-suspensao-piloto';
const SEEN_KEY = 'wtech:post-offer:v1';
const COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const questions = [
  { q: 'O curso serve para quem está começando?', a: 'Sim. O curso começa do zero e ensina o piloto a entender e regular a suspensão da própria moto off-road, com SAG, molas e cliques de compressão e retorno.' },
  { q: 'Como funcionam as aulas e o acesso?', a: 'São 11 módulos online com Alex Crepaldi, 12 meses de acesso e certificado de conclusão. Você pode estudar no seu ritmo e voltar às aulas para acompanhar os ajustes.' },
  { q: 'Quero saber o preço e a garantia', a: 'O curso tem garantia de 7 dias. Consulte o preço, o plano anual, as condições de renovação e as formas de pagamento atualizadas na página do curso.' },
  { q: 'Preciso de ajuda técnica com minha moto', a: 'Para encaminhar sua dúvida, informe à equipe o modelo e ano da moto, seu peso equipado e o comportamento da suspensão. A regulagem depende desses dados; não recomendamos um número de cliques sem avaliar o contexto.' },
];

export function CourseLink({ placement, children = 'Quero acertar minha suspensão', className = 'post-course-button' }: { placement: string; children?: React.ReactNode; className?: string }) {
  return <Link to={COURSE_PATH} className={className} onClick={() => trackGoogleEvent('blog_course_click', { placement, item_name: COURSE_NAME })}>{children}<ArrowRight size={18} aria-hidden="true" /></Link>;
}

export function CourseCard({ compact = false }: { compact?: boolean }) {
  return <section className={`post-course-card ${compact ? 'post-course-card--compact' : ''}`} aria-label="Curso online de suspensão">
    <img src="/images/hero-piloto/entender.webp" alt="Alex Crepaldi ao lado de uma moto na oficina" loading="lazy" width="960" height="640" />
    <div className="post-course-card__body">
      <span className="post-eyebrow"><SlidersHorizontal size={14} /> DA LEITURA À PRÁTICA</span>
      <h2>Sua moto.<br /><span>Acertada por você.</span></h2>
      <p>Aprenda a medir o SAG e ajustar molas, óleo e cliques com um método para a sua pilotagem.</p>
      <ul>{['11 módulos com Alex Crepaldi', '12 meses de acesso às aulas', 'Garantia de 7 dias'].map(item => <li key={item}><Check size={16} />{item}</li>)}</ul>
      <CourseLink placement={compact ? 'sidebar' : 'article_end'} />
      <small>Curso online de regulagem de suspensão para pilotos</small>
    </div>
  </section>;
}

function Modal({ open, onOpenChange, title, description, children, className = '' }: { open: boolean; onOpenChange: (value: boolean) => void; title: string; description: string; children: React.ReactNode; className?: string }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="post-modal-overlay" />
    <Dialog.Content className={`post-modal ${className}`}>
      <Dialog.Close className="post-modal-close" aria-label="Fechar janela"><X size={21} /></Dialog.Close>
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      <Dialog.Description className="sr-only">{description}</Dialog.Description>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

export function PostConversion({ slug, title }: { slug: string; title: string }) {
  const [offerOpen, setOfferOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const supportOpenRef = useRef(false);
  const offered = useRef(false);
  const started = useRef(0);
  supportOpenRef.current = supportOpen;

  useEffect(() => {
    offered.current = false;
    started.current = Date.now();
    setOfferOpen(false);
    setSupportOpen(false);
    setAnswer(null);
    const show = (trigger: string) => {
      if (offered.current || supportOpenRef.current || document.visibilityState !== 'visible') return;
      // Não disputar foco com formulários ou outras janelas abertas.
      if (document.querySelector('[role="dialog"]') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      try {
        const last = Number(localStorage.getItem(SEEN_KEY));
        if (last && Date.now() - last < COOLDOWN) return;
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch { /* Navegação privada: limite em memória continua valendo. */ }
      offered.current = true;
      setOfferOpen(true);
      trackGoogleEvent('blog_course_popup_view', { trigger, article_slug: slug });
    };
    const onScroll = () => {
      const article = document.querySelector('[data-post-body]');
      if (!article || Date.now() - started.current < 20000) return;
      const rect = article.getBoundingClientRect();
      if (rect.top + rect.height * 0.55 < window.innerHeight) show('article_read');
    };
    const onExit = (event: MouseEvent) => {
      if (!event.relatedTarget && event.clientY <= 0 && Date.now() - started.current > 20000 && window.matchMedia('(pointer: fine)').matches) show('exit_intent');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', onExit);
    const timer = window.setInterval(onScroll, 5000);
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mouseout', onExit); clearInterval(timer); };
  }, [slug]);

  return <>
    <div className="post-bottom-bar"><div><span>CURSO ONLINE PARA PILOTOS</span><strong>Transforme conhecimento em regulagem.</strong></div><CourseLink placement="sticky_bar">Ver o curso online</CourseLink></div>
    <button className="post-support-trigger" onClick={() => { setOfferOpen(false); setSupportOpen(true); trackGoogleEvent('blog_support_open', { article_slug: slug }); }}><MessageCircle size={20} /><span>Tirar uma dúvida</span></button>
    <Modal className="post-lp-popup" open={offerOpen} onOpenChange={setOfferOpen} title="Aprenda a regular a suspensão da sua moto" description="Conheça o curso online da W-Tech ou continue lendo o artigo.">
      <img className="post-offer-image" src="/images/hero-piloto/entender.webp" alt="Alex Crepaldi apresentando uma moto na oficina" width="960" height="640" />
      <div className="post-offer-body"><span className="post-eyebrow">SEU PRÓXIMO PASSO NA PILOTAGEM</span><h2>Entender é o começo.<br /><em>Acertar muda a pilotagem.</em></h2><p>Leve o que você está aprendendo para a sua moto. Domine SAG, molas e cliques no curso online com Alex Crepaldi.</p><div className="post-offer-facts">11 módulos · 12 meses de acesso · Garantia de 7 dias</div><CourseLink placement="popup" /><button className="post-text-button" onClick={() => setOfferOpen(false)}>Continuar lendo o artigo</button></div>
    </Modal>
    <Modal open={supportOpen} onOpenChange={setSupportOpen} title="Assistente W-Tech" description="Respostas automáticas sobre o curso e encaminhamento de dúvidas à equipe pelo WhatsApp.">
      <div className="post-assistant"><span className="post-eyebrow"><MessageCircle size={16} /> ASSISTENTE W-TECH</span><h2>Vamos tirar sua dúvida?</h2><p>Escolha um assunto para receber uma resposta automática. Para conversar com a equipe, continue pelo WhatsApp.</p><div className="post-question-list">{questions.map((item, index) => <button key={item.q} aria-expanded={answer === index} onClick={() => { setAnswer(index); trackGoogleEvent('blog_support_question', { question: item.q, article_slug: slug }); }}>{item.q}<ArrowRight size={16} /></button>)}</div>{answer !== null && <div className="post-assistant-answer" aria-live="polite">{questions[answer].a}</div>}<CourseLink placement="support">Ver programa e condições</CourseLink>
      <WhatsAppLeadCapture pageLabel={`Blog · ${title}${answer !== null ? ` · ${questions[answer].q}` : ''}`} initialMessage={`Estou lendo o artigo "${title}" (${slug}). ${answer !== null ? questions[answer].q : 'Quero tirar uma dúvida sobre o curso de regulagem de suspensão.'}`} className="post-support-link"><MessageCircle size={18} />Continuar com a equipe no WhatsApp</WhatsAppLeadCapture><small>O atendimento da equipe segue a disponibilidade do canal. Seus dados serão usados para responder à solicitação. <Link to="/privacidade">Política de privacidade</Link>.</small></div>
    </Modal>
  </>;
}
