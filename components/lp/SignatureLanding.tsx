import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  MapPin,
  Play,
  CalendarDays,
  ChevronDown,
  ShieldCheck,
  Pause,
  MessageCircle,
  X,
  Wrench,
  BookOpen,
  Users,
  Layers,
  Settings2,
  Target,
  Clock3,
} from "lucide-react";
import type { LandingPageWithCourse } from "../../hooks/useLandingPage";
import type { SignatureTemplateId } from "../../lib/landingTemplates";
import { resolveSectionOrder } from "../../lib/lpSections";
import { getYouTubeId } from "../../lib/testimonials";
import { formatDateLocal } from "../../lib/utils";
import {
  originalLandingImage,
  ORIGINAL_COURSE_IMAGE,
} from "../../lib/landingMedia";
import {
  displayLandingTitle,
  instructorPortrait,
  signatureSectionOrder,
} from "../../lib/signatureExperience";
import "./signatureLanding.css";

const imageFallback = (event: React.SyntheticEvent<HTMLImageElement>) => {
  const img = event.currentTarget;
  if (!img.src.endsWith(ORIGINAL_COURSE_IMAGE)) img.src = ORIGINAL_COURSE_IMAGE;
};
const isDirectVideo = (url?: string) =>
  !!url && /^(https?:\/\/|\/)[^\s]+\.(mp4|webm)(\?.*)?$/i.test(url);

/** Nenhum player externo é carregado antes da intenção de assistir. */
export function PresentationVideo({
  url,
  poster,
  title,
  startPlaying = false,
}: {
  url?: string;
  poster?: string;
  title: string;
  startPlaying?: boolean;
}) {
  const [playing, setPlaying] = useState(startPlaying);
  const youtubeId = getYouTubeId(url);
  const direct = isDirectVideo(url);
  const cover = originalLandingImage(
    poster,
    youtubeId
      ? "https://i.ytimg.com/vi/" + youtubeId + "/hqdefault.jpg"
      : ORIGINAL_COURSE_IMAGE,
  );
  useEffect(() => setPlaying(startPlaying), [url, startPlaying]);
  if (!youtubeId && !direct)
    return (
      <div className="sig-video sig-video--photo">
        <img onError={imageFallback} src={cover} alt={title} loading="lazy" />
      </div>
    );
  return (
    <div className="sig-video">
      {playing ? (
        youtubeId ? (
          <iframe
            src={
              "https://www.youtube-nocookie.com/embed/" +
              youtubeId +
              "?autoplay=1&rel=0"
            }
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            poster={cover}
            aria-label={title}
          />
        )
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={"Assistir: " + title}
        >
          <img onError={imageFallback} src={cover} alt="" loading="lazy" />
          <span className="sig-play">
            <Play fill="currentColor" size={22} />
          </span>
          <span className="sig-video-label">
            ASSISTIR AO VÍDEO <ArrowUpRight size={15} />
          </span>
        </button>
      )}
    </div>
  );
}

interface Props {
  lp: LandingPageWithCourse;
  template: SignatureTemplateId;
  form: React.ReactNode;
  checkoutAtivo?: boolean;
  isFullOrDone?: boolean;
  preview?: boolean;
  whatsapp?: string;
}

export default function SignatureLanding({
  lp,
  template,
  form,
  checkoutAtivo = false,
  isFullOrDone = false,
  preview = false,
  whatsapp,
}: Props) {
  const hero = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const background = useRef<HTMLVideoElement>(null);
  const filmDialog = useRef<HTMLDialogElement>(null);
  const filmTrigger = useRef<HTMLButtonElement>(null);
  const [filmOpen, setFilmOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [paused, setPaused] = useState(false);
  const variant =
    template === "v11" ? "atelier" : template === "v12" ? "lab" : "cinema";
  const course = lp.course;
  const international = course?.isInternational || course?.currency === "EUR";
  const online = course?.locationType === "Online";
  const name = displayLandingTitle(lp.title);
  const city = course?.city || course?.location || "Local a confirmar";
  const date = course?.date
    ? formatDateLocal(course.date)
    : "Consulte as próximas datas";
  const dates =
    date +
    (course?.dateEnd && course.dateEnd !== course.date
      ? " — " + formatDateLocal(course.dateEnd)
      : "");
  const photo = originalLandingImage(lp.heroImage || course?.image);
  const mentorPhoto = originalLandingImage(
    instructorPortrait(lp.instructorName, lp.instructorImage),
    photo,
  );
  const isAlex = /alex\s+crepaldi/i.test(lp.instructorName || "");
  const hasVideo = !!getYouTubeId(lp.videoUrl) || isDirectVideo(lp.videoUrl);
  const cta = isFullOrDone
    ? "Entrar na lista de interesse"
    : checkoutAtivo
      ? "Quero fazer parte desta turma"
      : "Quero conhecer esta formação";
  const phone = (lp.whatsappNumber || whatsapp || "").replace(/\D/g, "");
  const whatsappUrl = phone
    ? "https://wa.me/" +
      phone +
      "?text=" +
      encodeURIComponent(
        "Olá! Gostaria de conhecer a formação " + name + ", em " + city + ".",
      )
    : "";
  // A prévia de outro design usa a mesma sequência que o editor aplica ao escolhê-lo.
  const ordered =
    lp.template !== template
      ? signatureSectionOrder(lp.sectionOrder)
      : resolveSectionOrder(lp.sectionOrder);
  const visible = ordered.filter((section) => section.enabled);
  const enabled = (id: string) => visible.some((section) => section.id === id);
  const programTarget =
    enabled("modules") && lp.modules?.length
      ? "#programa"
      : enabled("schedule") && lp.scheduleModules?.length
        ? "#jornada"
        : "#enroll-form";
  const experienceTarget = enabled("narrative")
    ? "#experiencia"
    : programTarget;
  const proof = (lp.testimonials || []).filter(
    (item, index, list) =>
      !item.videoUrl ||
      list.findIndex(
        (other) =>
          (getYouTubeId(other.videoUrl) || other.videoUrl) ===
          (getYouTubeId(item.videoUrl) || item.videoUrl),
      ) === index,
  );
  const icons = [BookOpen, Settings2, Wrench, Target, Layers, Users];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionEnabled(!media.matches && !preview);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preview]);
  useEffect(() => {
    if (!hero.current) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShowSticky(!entry.isIntersecting),
    );
    observer.observe(hero.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (
      !root.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const elements = root.current.querySelectorAll<HTMLElement>(
      ".sig-section-heading,.sig-benefit-grid article,.sig-gallery figure",
    );
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("sig-revealed");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    elements.forEach((element) => {
      element.classList.add("sig-reveal");
      observer.observe(element);
    });
    return () => {
      observer.disconnect();
      elements.forEach((element) => element.classList.remove("sig-reveal"));
    };
  }, [lp, template]);
  useEffect(() => {
    if (!filmOpen) return;
    const dialog = filmDialog.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      filmTrigger.current?.focus({ preventScroll: true });
    };
  }, [filmOpen]);
  const toggleMotion = () => {
    if (!background.current) return;
    if (background.current.paused)
      void background.current
        .play()
        .then(() => setPaused(false))
        .catch(() => setPaused(true));
    else {
      background.current.pause();
      setPaused(true);
    }
  };
  const heading = (label: string, title: string, description?: string) => (
    <div className="sig-section-heading">
      <span className="sig-kicker">{label}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
  const sections: Record<string, React.ReactNode> = {
    instructor: lp.instructorName ? (
      <section className="sig-section sig-mentor" id="mentor">
        <div className="sig-mentor-portrait">
          <img
            onError={imageFallback}
            src={mentorPhoto}
            alt={lp.instructorName}
            loading="lazy"
          />
          <div>
            <span>QUEM CONDUZ A FORMAÇÃO</span>
            <strong>{lp.instructorName}</strong>
          </div>
        </div>
        <div className="sig-mentor-copy">
          {heading(
            "01 / CONHEÇA SEU INSTRUTOR",
            "Conhecimento tem valor. Quem compartilha faz a diferença.",
          )}
          <p className="sig-mentor-name">{lp.instructorName}</p>
          <p>{lp.instructorBio}</p>
          {isAlex && (
            <div className="sig-expertise">
              <span>
                <Wrench size={17} />
                Suspensões & diagnóstico
              </span>
              <span>
                <Users size={17} />
                Fundador da W-Tech
              </span>
              <span>
                <BookOpen size={17} />
                Formação técnica
              </span>
            </div>
          )}
          <a className="sig-text-link" href={programTarget}>
            Conheça o programa da turma <ArrowUpRight size={18} />
          </a>
        </div>
      </section>
    ) : null,
    narrative: (
      <section className="sig-section sig-experience" id="experiencia">
        <div className="sig-split-heading">
          {heading(
            "02 / MUITO ALÉM DE UMA AULA",
            "A técnica aproxima. A experiência transforma.",
          )}
          <p>
            Antes de escolher sua próxima formação, conheça quem ensina, o
            conteúdo e o ambiente de aprendizado. Estes são registros do nosso
            trabalho e de encontros reais da comunidade W-Tech.
          </p>
        </div>
        <div className="sig-gallery">
          <figure>
            <img
              src={ORIGINAL_COURSE_IMAGE}
              alt="Alex conduzindo uma turma real da W-Tech em Lisboa"
              loading="lazy"
            />
            <figcaption>
              <span>01 / CONHECIMENTO COMPARTILHADO</span>
              <strong>Encontros que ampliam perspectivas.</strong>
              <small>Registro de uma turma W-Tech em Lisboa</small>
            </figcaption>
          </figure>
          <figure>
            <img
              src="/images/lp-curso/3.webp"
              alt="Alex trabalhando na oficina W-Tech"
              loading="lazy"
            />
            <figcaption>
              <span>02 / NOSSO UNIVERSO TÉCNICO</span>
              <strong>A atenção está em cada detalhe.</strong>
              <small>Acervo original W-Tech · oficina</small>
            </figcaption>
          </figure>
        </div>
        <div className="sig-experience-foot">
          <span>
            <ShieldCheck size={19} />
            Imagens originais da W-Tech. Consulte o programa específico da sua
            turma.
          </span>
          <a className="sig-text-link" href={programTarget}>
            Explorar o conteúdo <ArrowDown size={17} />
          </a>
        </div>
      </section>
    ),
    benefits: lp.benefits?.length ? (
      <section className="sig-section sig-benefits" id="aprendizado">
        {heading(
          "03 / O CONHECIMENTO QUE VOCÊ LEVA",
          "Mais critério técnico. Mais possibilidades.",
          "Veja os temas e diferenciais cadastrados para esta formação.",
        )}
        <div className="sig-benefit-grid">
          {lp.benefits.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article key={index}>
                <div className="sig-card-top">
                  <Icon size={26} />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    ) : null,
    modules: lp.modules?.length ? (
      <section className="sig-section sig-program" id="programa">
        <div>
          {heading(
            "04 / POR DENTRO DO PROGRAMA",
            "Entenda o que você vai estudar.",
            "Cada módulo tem um propósito. Explore o conteúdo antes de decidir.",
          )}
          <a className="sig-text-link" href="#enroll-form">
            Quero participar <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="sig-accordion">
          {lp.modules.map((item, index) => (
            <details key={index} open={index === 0}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <ChevronDown size={19} />
              </summary>
              <div className="sig-module-body">
                {item.image && (
                  <img
                    onError={imageFallback}
                    loading="lazy"
                    src={originalLandingImage(item.image)}
                    alt={item.title}
                  />
                )}
                <p>{item.description}</p>
              </div>
            </details>
          ))}
        </div>
      </section>
    ) : null,
    schedule: lp.scheduleModules?.length ? (
      <section className="sig-section sig-curriculum" id="jornada">
        <div className="sig-curriculum-intro">
          {heading(
            "PROFUNDIDADE, ETAPA POR ETAPA",
            "Uma formação com começo, meio e evolução.",
            "Conheça os objetivos, os temas e o foco de cada etapa do programa.",
          )}
          <div className="sig-program-count">
            <strong>
              {String(lp.scheduleModules.length).padStart(2, "0")}
            </strong>
            <span>
              etapas no programa
              <br />
              desta formação
            </span>
          </div>
          <a className="sig-text-link" href="#enroll-form">
            Conversar sobre a turma <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="sig-accordion">
          {lp.scheduleModules.map((item, index) => (
            <details key={index} open={index === 0}>
              <summary>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <ChevronDown size={20} />
              </summary>
              <div className="sig-stage-body">
                {item.objective && <p>{item.objective}</p>}
                <ul>
                  {item.topics?.map((topic, i) => (
                    <li key={i}>
                      <Check size={15} />
                      {topic}
                    </li>
                  ))}
                </ul>
                {item.result && (
                  <div className="sig-stage-result">
                    <Target size={19} />
                    <div>
                      <span>FOCO DESTA ETAPA</span>
                      <p>{item.result}</p>
                    </div>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    ) : null,
    testimonials: proof.length ? (
      <section className="sig-section sig-testimonials" id="relatos">
        <div className="sig-split-heading">
          {heading(
            "A EXPERIÊNCIA NA VOZ DE QUEM VIVEU",
            "Histórias reais. Novas perspectivas.",
          )}
          <p>
            Assista aos relatos da comunidade W-Tech e conheça outras
            experiências de aprendizado. Cada trajetória é individual.
          </p>
        </div>
        <div className="sig-testimonial-grid">
          {proof.map((item, index) => (
            <article key={index}>
              {item.videoUrl && (
                <PresentationVideo
                  url={item.videoUrl}
                  poster={item.image || undefined}
                  title={"Depoimento de " + item.name}
                />
              )}
              {item.text && <blockquote>“{item.text}”</blockquote>}
              <div className="sig-testimonial-person">
                <span>{item.name.slice(0, 1)}</span>
                <div>
                  <h3>{item.name}</h3>
                  <small>Comunidade W-Tech</small>
                </div>
                <MessageCircle size={19} />
              </div>
            </article>
          ))}
        </div>
      </section>
    ) : null,
    location:
      course && !online ? (
        <section className="sig-section sig-location" id="local">
          <div className="sig-location-image">
            <img
              src={photo}
              onError={imageFallback}
              alt={"Imagem cadastrada para a turma de " + city}
              loading="lazy"
            />
            <div>
              <span>SUA PRÓXIMA TURMA</span>
              <h2>{city}</h2>
            </div>
          </div>
          <div className="sig-location-info">
            {heading(
              "ORGANIZE SUA PARTICIPAÇÃO",
              "A experiência começa com planejamento.",
            )}
            <dl>
              <div>
                <CalendarDays size={20} />
                <dt>Quando</dt>
                <dd>{dates}</dd>
              </div>
              {course.startTime && (
                <div>
                  <Clock3 size={20} />
                  <dt>Horário</dt>
                  <dd>
                    {course.startTime}
                    {course.endTime ? " às " + course.endTime : ""}
                  </dd>
                </div>
              )}
              <div>
                <MapPin size={20} />
                <dt>Onde</dt>
                <dd>
                  {course.location}
                  <small>{course.address}</small>
                </dd>
              </div>
            </dl>
            <a
              className="sig-text-link"
              href={
                "https://www.google.com/maps/search/?api=1&query=" +
                encodeURIComponent(
                  [course.address, course.location, city]
                    .filter(Boolean)
                    .join(", "),
                )
              }
              target="_blank"
              rel="noreferrer"
            >
              Ver o endereço no mapa <ArrowUpRight size={17} />
            </a>
            <p className="sig-location-note">
              Confirme local e horários com nossa equipe antes de reservar
              transporte ou hospedagem.
            </p>
          </div>
        </section>
      ) : null,
    faq: (
      <section className="sig-section sig-faq" id="duvidas">
        <div>
          {heading(
            "DECIDA COM CLAREZA",
            "Boas decisões começam com boas perguntas.",
          )}
          <p>
            Uma formação é um investimento no seu desenvolvimento. Nossa equipe
            está disponível para conversar sobre o programa e as condições da
            turma.
          </p>
          {whatsappUrl && (
            <a
              className="sig-text-link"
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
            >
              Tirar dúvidas com a W-Tech <MessageCircle size={18} />
            </a>
          )}
        </div>
        <div className="sig-accordion">
          {[
            [
              "Esta formação é adequada para mim?",
              "Compare os temas do programa com seu momento profissional. Converse com a equipe sobre conhecimentos prévios e objetivos antes de confirmar sua participação.",
            ],
            [
              "Como funciona a inscrição?",
              checkoutAtivo
                ? "Preencha seus dados para seguir ao checkout. Confira as condições e conclua sua inscrição no ambiente de pagamento."
                : "Deixe seu contato. A equipe apresenta o programa, a disponibilidade e as condições de inscrição desta turma.",
            ],
            [
              "Onde e quando acontece?",
              (online ? "Formação online" : city) +
                ". " +
                dates +
                ". Os detalhes cadastrados da turma estão nesta página.",
            ],
            [
              "O que preciso levar?",
              course?.whatToBring ||
                "Consulte a equipe sobre materiais, equipamentos e orientações específicas desta formação.",
            ],
            [
              "Quais são as condições de pagamento?",
              international
                ? "A equipe informa moeda, formas de pagamento e condições da turma internacional antes da inscrição."
                : checkoutAtivo
                  ? "O investimento desta turma está apresentado abaixo. Confira as condições de pagamento disponíveis no checkout."
                  : "Solicite à equipe o investimento e as condições disponíveis para esta turma.",
            ],
            [
              "E se eu precisar alterar ou cancelar minha participação?",
              "Antes de confirmar sua inscrição, peça à equipe as condições de alteração, transferência e cancelamento aplicáveis à turma.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>
                <h3>{question}</h3>
                <ChevronDown size={19} />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    ),
  };
  return (
    <div
      ref={root}
      className={"sig-page sig-" + variant}
      data-signature={template}
    >
      {preview && (
        <div className="sig-preview-note">
          PRÉVIA DO DESIGN · formulários desativados
        </div>
      )}
      <header className="sig-header">
        <a href="/" aria-label="W-Tech — início">
          <img src="/logo-wtech-branca.webp" alt="W-Tech" />
        </a>
        <nav aria-label="Conheça a formação">
          {enabled("instructor") && lp.instructorName && (
            <a href="#mentor">O instrutor</a>
          )}
          {programTarget !== "#enroll-form" && (
            <a href={programTarget}>O programa</a>
          )}
          {enabled("testimonials") && proof.length > 0 && (
            <a href="#relatos">Depoimentos</a>
          )}
        </nav>
        <a className="sig-header-cta" href="#enroll-form">
          Conhecer a turma <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <section className="sig-hero" ref={hero}>
          {variant === "cinema" && (
            <div className="sig-hero-backdrop">
              <img src={photo} alt="" />
              {isDirectVideo(lp.videoUrl) && motionEnabled && (
                <video
                  ref={background}
                  src={lp.videoUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={photo}
                  aria-hidden="true"
                />
              )}
            </div>
          )}
          <div className="sig-hero-copy">
            <span className="sig-kicker">
              <span className="sig-dot" />
              {online ? "FORMAÇÃO ONLINE" : "FORMAÇÃO PRESENCIAL"} ·{" "}
              {international ? "INTERNACIONAL" : "W-TECH BRASIL"}
            </span>
            <span className="sig-hero-edition">
              {city} <span>/</span> {date}
            </span>
            <h1>{name}</h1>
            <p>{lp.subtitle}</p>
            <div className="sig-hero-actions">
              <a className="sig-cta" href="#enroll-form">
                {cta}
                <ArrowUpRight size={19} />
              </a>
              <a className="sig-secondary" href={programTarget}>
                Explorar o programa <ArrowDown size={16} />
              </a>
            </div>
            <div className="sig-hero-assurance">
              <ShieldCheck size={18} />
              <span>
                Uma decisão importante.
                <br />
                <strong>Conte com a equipe oficial W-Tech.</strong>
              </span>
            </div>
          </div>
          <div className="sig-hero-visual">
            <div className="sig-portrait-frame">
              <img
                className="sig-hero-portrait"
                src={mentorPhoto}
                onError={imageFallback}
                alt={lp.instructorName || "Formação W-Tech"}
                fetchPriority="high"
              />
              <div className="sig-portrait-caption">
                <span>
                  {lp.instructorName
                    ? "SEU INSTRUTOR"
                    : "CONHECIMENTO QUE CONECTA"}
                </span>
                <strong>{lp.instructorName || "W-Tech Brasil"}</strong>
                <small>
                  {isAlex
                    ? "Fundador W-Tech · Suspensões & formação técnica"
                    : "Conheça a metodologia e o programa da turma"}
                </small>
              </div>
            </div>
            {hasVideo && (
              <button
                ref={filmTrigger}
                className="sig-hero-film"
                type="button"
                onClick={() => setFilmOpen(true)}
                aria-label="Assistir à apresentação da formação"
              >
                <span className="sig-film-thumb">
                  <img
                    src={originalLandingImage(lp.heroSecondaryImage)}
                    onError={imageFallback}
                    alt=""
                  />
                  <i>
                    <Play size={18} fill="currentColor" />
                  </i>
                </span>
                <span>
                  <small>ANTES DE DAR O PRÓXIMO PASSO</small>
                  <strong>
                    Conheça a formação
                    <br />
                    em vídeo.
                  </strong>
                </span>
                <ArrowUpRight size={20} />
              </button>
            )}
          </div>
          {variant === "cinema" &&
            isDirectVideo(lp.videoUrl) &&
            motionEnabled && (
              <button
                className="sig-motion"
                onClick={toggleMotion}
                aria-label={paused ? "Retomar movimento" : "Pausar movimento"}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
                {paused ? "Retomar" : "Pausar"}
              </button>
            )}
        </section>
        <div className="sig-trust">
          <div>
            <span>FORMAÇÃO</span>
            <strong>{online ? "Online" : "Presencial"}</strong>
          </div>
          <div>
            <span>PRÓXIMO ENCONTRO</span>
            <strong>{dates}</strong>
          </div>
          <div>
            <span>DESTINO</span>
            <strong>{city}</strong>
          </div>
          <a href={experienceTarget}>
            <span>EXPLORE A EXPERIÊNCIA</span>
            <ArrowDown size={21} />
          </a>
        </div>
        {visible.map((section) => (
          <React.Fragment key={section.id}>
            {sections[section.id]}
          </React.Fragment>
        ))}
        <section className="sig-section sig-enroll" id="enroll-form">
          <div>
            {heading(
              "SEU PRÓXIMO PASSO, COM CONFIANÇA",
              isFullOrDone
                ? "Novas turmas. A mesma vontade de evoluir."
                : "Invista no seu conhecimento. Comece pela conversa.",
            )}
            <p>
              {isFullOrDone
                ? "Cadastre seu interesse para receber informações sobre as próximas turmas."
                : "Revise o programa, conheça o instrutor e tire suas dúvidas. Nossa equipe ajuda você a entender os detalhes antes da sua decisão."}
            </p>
            <div className="sig-enroll-details">
              <span>
                <MapPin size={17} />
                {city}
              </span>
              <span>
                <CalendarDays size={17} />
                {dates}
              </span>
            </div>
            {checkoutAtivo && course?.price > 0 && (
              <div className="sig-price">
                <span>INVESTIMENTO NESTA TURMA</span>
                <strong>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: course.currency || "BRL",
                  }).format(course.price)}
                </strong>
                <small>Confira as formas de pagamento no checkout.</small>
              </div>
            )}
            {whatsappUrl && (
              <a
                className="sig-contact-card"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={24} />
                <span>
                  <strong>Prefere conversar primeiro?</strong>
                  <small>Fale com a equipe oficial pelo WhatsApp.</small>
                </span>
                <ArrowUpRight size={20} />
              </a>
            )}
          </div>
          <div className="sig-form-card">
            <div className="sig-form-top">
              <img src="/logo-wtech-branca.webp" alt="W-Tech" />
              <ShieldCheck size={24} />
            </div>
            <span className="sig-kicker">
              {isFullOrDone
                ? "LISTA DE INTERESSE"
                : "FALE SOBRE SUA PRÓXIMA TURMA"}
            </span>
            <h3>
              {checkoutAtivo
                ? "Seu próximo capítulo começa aqui."
                : "Vamos conhecer seus objetivos?"}
            </h3>
            <p className="sig-form-intro">
              {checkoutAtivo
                ? "Informe seus dados para continuar para a inscrição."
                : "Preencha seus dados para receber as informações da formação."}
            </p>
            {form}
            <p className="sig-privacy">
              Ao enviar, você autoriza o contato sobre esta formação.{" "}
              <a href="/privacidade" target="_blank" rel="noreferrer">
                Política de privacidade
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <footer className="sig-footer">
        <img src="/logo-wtech-branca.webp" alt="W-Tech" />
        <p>
          Técnica que aproxima.
          <br />
          <strong>Conhecimento que vai com você.</strong>
        </p>
        <a href="/privacidade">Privacidade</a>
        <small>© {new Date().getFullYear()} W-Tech</small>
      </footer>
      {showSticky && !filmOpen && (
        <div className="sig-sticky">
          <span>
            {city}
            <small>{date}</small>
          </span>
          <a className="sig-cta" href="#enroll-form">
            {isFullOrDone ? "Tenho interesse" : "Conhecer a turma"}
            <ArrowUpRight size={18} />
          </a>
        </div>
      )}
      <dialog
        ref={filmDialog}
        className="sig-film-dialog"
        aria-label="Apresentação da formação"
        onClose={() => setFilmOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setFilmOpen(false);
        }}
      >
        <div>
          <header>
            <span>W-TECH / CONHEÇA A FORMAÇÃO</span>
            <button
              type="button"
              aria-label="Fechar apresentação"
              onClick={() => setFilmOpen(false)}
            >
              <X size={23} />
            </button>
          </header>
          {filmOpen && (
            <PresentationVideo
              url={lp.videoUrl}
              poster={originalLandingImage(lp.heroSecondaryImage)}
              title={name}
              startPlaying
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
