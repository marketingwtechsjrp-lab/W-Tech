import React, { useState, useEffect, useRef } from "react";
import TemplateGallery from "../components/lp/TemplateGallery";
import LandingDraftPreview from "../components/lp/LandingDraftPreview";
import {
  getLandingTemplate,
  landingPageUrl,
  recommendedTemplate,
  supportsSectionOrder,
  type LandingTemplateId,
} from "../lib/landingTemplates";
import "../components/lp/landingStudio.css";
import {
  ORIGINAL_LANDING_MEDIA,
  ORIGINAL_COURSE_IMAGE,
  originalLandingImage,
} from "../lib/landingMedia";
import { supabase } from "../lib/supabaseClient";
import { Course, LandingPage } from "../types";
import { slugify } from "../lib/slug";
import { signatureSectionOrder } from "../lib/signatureExperience";
import {
  DEFAULT_COURSE_TESTIMONIALS,
  filterBlockedTestimonials,
  getYouTubeId,
} from "../lib/testimonials";
import {
  DEFAULT_SCHEDULE_MODULES,
  scheduleModulesToText,
  ScheduleModule,
} from "../lib/schedule";
import {
  LP_SECTIONS,
  DEFAULT_SECTION_ORDER,
  resolveSectionOrder,
  LPSectionConfig,
} from "../lib/lpSections";
import {
  ShieldCheck,
  X,
  Save,
  Plus,
  Trash2,
  Layout,
  Video,
  User,
  CheckSquare,
  Loader2,
  Link as LinkIcon,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Check,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Star,
  CalendarClock,
  Target,
  Trophy,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Wrench,
} from "lucide-react";

interface LandingPageEditorProps {
  course: Course;
  onClose: () => void;
  onSaved?: () => void;
  initialTemplate?: LandingTemplateId;
  initialTab?: "template" | "sections" | "review";
}

export const LandingPageEditor: React.FC<LandingPageEditorProps> = ({
  course,
  onClose,
  onSaved,
  initialTemplate,
  initialTab = "sections",
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadError, setLoadError] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [savedPageUrl, setSavedPageUrl] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<() => void>(() => {});
  const [launching, setLaunching] = useState(false);

  /**
   * Lançamento por região: consulta o público (dry run), confirma com o
   * usuário e dispara a cadência de e-mails para os leads da base com a
   * cidade/estado do curso (inclui leads perdidos, para reaquecimento).
   */
  const handleLaunchCampaign = async () => {
    setLaunching(true);
    try {
      const preview = await fetch("/api/launch-course-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, dryRun: true }),
      }).then((r) => r.json());

      if (!preview.ok) {
        alert(
          "Não foi possível montar o público: " +
            (preview.error || "erro desconhecido"),
        );
        return;
      }
      const go = window.confirm(
        `Lançamento "${preview.course}" — ${preview.city}${preview.state ? "/" + preview.state : ""}\n\n` +
          `Público encontrado na base: ${preview.audienceTotal} contatos\n` +
          ` • Mesma cidade: ${preview.cityMatches}\n` +
          ` • Mesmo estado: ${preview.stateMatches}\n` +
          ` • Leads perdidos (reaquecimento): ${preview.lostIncluded}\n\n` +
          `Será criada uma cadência de 3 e-mails (anúncio, prova social e última chamada) apontando para:\n${preview.lpUrl}\n\n` +
          `Confirmar o lançamento?`,
      );
      if (!go) return;

      const result = await fetch("/api/launch-course-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      }).then((r) => r.json());

      if (result.ok) {
        alert(
          `✅ Lançamento criado!\n\n${result.enrolled} contatos entraram na cadência "${"Lançamento — " + result.course}".\nOs e-mails saem pelo processador diário de fluxos (requer Brevo ativo).`,
        );
      } else {
        alert("Falha no lançamento: " + (result.error || "erro desconhecido"));
      }
    } catch (err: any) {
      alert("Erro ao lançar campanha: " + err.message);
    } finally {
      setLaunching(false);
    }
  };
  const [activeTab, setActiveTab] = useState<
    | "template"
    | "sections"
    | "hero"
    | "content"
    | "modules"
    | "schedule"
    | "instructor"
    | "testimonials"
    | "preview"
    | "review"
  >(initialTab);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Initial State Template
  const [lp, setLp] = useState<Partial<LandingPage>>({
    courseId: course.id,
    title: course.title,
    subtitle: "Domine a arte da suspensão de motos com a metodologia W-Tech.",
    slug: `${slugify(course.title)}-${course.id.slice(0, 8)}`,
    heroImage: originalLandingImage(course.image),
    heroSecondaryImage: ORIGINAL_COURSE_IMAGE,
    benefits: [
      {
        title: "Fundamentos Teóricos",
        description: "Hidráulica, Mola, SAG, Atrito e Qualidade de Trabalho.",
      },
      {
        title: "Técnica de Revalvulação",
        description:
          "Aprenda a personalizar e preparar suspensões para alta performance.",
      },
      {
        title: "Prática de Oficina",
        description:
          "Montagem, desmontagem e dicas essenciais para o dia-a-dia.",
      },
      {
        title: "Análise de Modelos",
        description:
          "Variações entre suspensões atuais e tradicionais. Diagnóstico técnico.",
      },
      {
        title: "Peças e Ferramentas",
        description: "Acesso a projetos e desenvolvimentos próprios da W-Tech.",
      },
      {
        title: "Seja um Credenciado",
        description:
          "Tabela de preços exclusiva e suporte técnico contínuo para parceiros.",
      },
    ],
    modules: [
      {
        image:
          "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp",
        title: "SUSPENSÕES E SEUS MODELOS VARIADOS",
        description:
          "Neste módulo introdutório, você aprenderá sobre os diferentes tipos de suspensão aplicados a motos off-road e de alta velocidade. Entenda como cada sistema funciona e qual é o mais adequado para cada terreno ou estilo de pilotagem",
      },
      {
        image:
          "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp",
        title: "MOLAS E SUAS PROPRIEDADES",
        description:
          "As molas são componentes fundamentais na suspensão. Neste módulo, você vai se aprofundar nas propriedades das molas e como elas impactam o desempenho e a estabilidade da moto em diferentes situações",
      },
      {
        image:
          "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp",
        title: "MECÂNICA DOS FLUIDOS PARA SUSPENSÃO",
        description:
          "A suspensão hidráulica utiliza fluido para amortecer impactos. Neste módulo, você vai entender os princípios da mecânica dos fluidos e como eles influenciam o desempenho do sistema de suspensão",
      },
      {
        image:
          "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp",
        title: "PARAMETRIZAÇÃO DA SUSPENSÃO",
        description:
          "Neste módulo, você aprenderá a parametrizar a suspensão de forma precisa, ajustando configurações para obter o melhor desempenho em diferentes condições e terrenos",
      },
      {
        image:
          "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MOLAS-E-SUAS-PARTICULARIDAS-768x512.jpg.webp",
        title: "ÓLEO E SUAS VISCOSIDADES",
        description:
          "A escolha do óleo correto é fundamental para o bom funcionamento do sistema hidráulico. Neste módulo, você aprenderá sobre as diferentes viscosidades e como elas afetam o desempenho da suspensão",
      },
      {
        image:
          "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/MECANICA-DOS-FLUIDOS-PARA-SUSPENSAO-768x512.jpg.webp",
        title: "FLUXOGRAMA DA VÁLVULA",
        description:
          "Entender o funcionamento das válvulas no sistema de suspensão é crucial para ajustar corretamente o fluxo hidráulico. Neste módulo, você aprenderá sobre o fluxo de óleo e como ele é controlado pelas válvulas",
      },
    ],
    instructorName: "Alex Crepaldi",
    instructorBio:
      "Referência nacional em suspensões, Alex Crepaldi ensina as técnicas de acerto e ajuste em todos os modelos. Torne-se um profissional diferenciado ao associar-se à empresa líder no mercado nacional e desfrute de todas as vantagens de ser um credenciado W-Tech!",
    instructorImage: "/images/alex-webp.webp",
    whatsappNumber: "",
    videoUrl: "https://www.youtube.com/watch?v=RePclscnxDM",
    template: initialTemplate || recommendedTemplate(course),
    testimonials: [],
    scheduleModules: DEFAULT_SCHEDULE_MODULES,
    sectionOrder: signatureSectionOrder(null),
  });

  useEffect(() => {
    fetchLandingPage();
  }, [course.id]);

  const fetchLandingPage = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase
        .from("SITE_LandingPages")
        .select("*")
        .eq("course_id", course.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const loaded: Partial<LandingPage> = {
          ...data,
          courseId: data.course_id,
          heroImage: data.hero_image,
          heroSecondaryImage: data.hero_secondary_image,
          videoUrl: data.video_url || "",
          instructorName: data.instructor_name,
          instructorBio: data.instructor_bio,
          instructorImage: data.instructor_image,
          whatsappNumber: data.whatsapp_number,
          modules: data.modules || [], // Ensure array
          quizEnabled: data.quiz_enabled,
          fakeAlertsEnabled: data.fake_alerts_enabled,
          handsOnEnabled: data.hands_on_enabled !== false,
          template: data.template || "v1",
          testimonials: Array.isArray(data.testimonials)
            ? filterBlockedTestimonials(data.testimonials)
            : DEFAULT_COURSE_TESTIMONIALS,
          scheduleModules: Array.isArray(data.schedule_modules)
            ? data.schedule_modules
            : DEFAULT_SCHEDULE_MODULES,
          sectionOrder: resolveSectionOrder(data.section_order),
        };
        setSavedSnapshot(JSON.stringify(loaded));
        setSavedPageUrl(
          landingPageUrl(loaded.slug || course.id, loaded.template),
        );
        setLp({
          ...loaded,
          template: initialTemplate || loaded.template,
          sectionOrder:
            initialTemplate &&
            initialTemplate !== loaded.template &&
            ["v10", "v11", "v12"].includes(initialTemplate)
              ? signatureSectionOrder(loaded.sectionOrder)
              : loaded.sectionOrder,
        });
      } else {
        setSavedSnapshot(JSON.stringify(lp));
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Falha ao carregar a página.",
      );
    } finally {
      setLoading(false);
    }
  };

  const dirty = !!savedSnapshot && JSON.stringify(lp) !== savedSnapshot;
  const closeEditor = () => {
    if (
      !saving &&
      (!dirty ||
        window.confirm(
          "Você tem alterações não salvas. Deseja sair do editor?",
        ))
    )
      onClose();
  };
  closeRef.current = closeEditor;
  useEffect(() => {
    if (loading) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),iframe",
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const list = focusable();
      const first = list[0],
        last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [loading]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleSave = async () => {
    if (saving || loadError) return;
    if (!lp.title?.trim() || !lp.slug?.trim()) {
      setFeedback("Preencha o título e o endereço da página antes de salvar.");
      setActiveTab("hero");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      const { data, error } = await supabase
        .from("SITE_LandingPages")
        .upsert(
          {
            course_id: course.id,
            slug: lp.slug,
            title: lp.title,
            subtitle: lp.subtitle,
            hero_image: lp.heroImage,
            hero_secondary_image: lp.heroSecondaryImage,
            video_url: lp.videoUrl,
            benefits: lp.benefits,
            modules: lp.modules,
            instructor_name: lp.instructorName,
            instructor_bio: lp.instructorBio,
            instructor_image: lp.instructorImage,
            whatsapp_number: lp.whatsappNumber,
            quiz_enabled: lp.quizEnabled,
            fake_alerts_enabled: lp.fakeAlertsEnabled,
            hands_on_enabled: lp.handsOnEnabled !== false,
            template: lp.template || "v1",
            testimonials: lp.testimonials || [],
            schedule_modules: lp.scheduleModules || [],
            section_order: lp.sectionOrder || null,
          },
          { onConflict: "course_id" },
        )
        .select()
        .single();

      if (error) throw error;

      // Trocar somente o visual não deve sobrescrever o cronograma do curso.
      const previousDraft: Partial<LandingPage> = savedSnapshot
        ? JSON.parse(savedSnapshot)
        : {};
      const scheduleChanged =
        JSON.stringify(previousDraft.scheduleModules || []) !==
        JSON.stringify(lp.scheduleModules || []);
      let scheduleSyncFailed = false;
      if (scheduleChanged) {
        const { error: courseErr } = await supabase
          .from("SITE_Courses")
          .update({
            schedule: lp.scheduleModules?.length
              ? scheduleModulesToText(lp.scheduleModules)
              : "",
          })
          .eq("id", course.id);
        scheduleSyncFailed = !!courseErr;
        if (courseErr)
          console.error("Falha ao espelhar cronograma no curso:", courseErr);
      }

      if (data) {
        const saved = {
          ...lp,
          ...data,
          heroImage: data.hero_image,
          heroSecondaryImage: data.hero_secondary_image,
          videoUrl: data.video_url,
          instructorName: data.instructor_name,
          instructorBio: data.instructor_bio,
          instructorImage: data.instructor_image,
          whatsappNumber: data.whatsapp_number,
          modules: data.modules,
          quizEnabled: data.quiz_enabled,
          fakeAlertsEnabled: data.fake_alerts_enabled,
          handsOnEnabled: data.hands_on_enabled !== false,
          testimonials: data.testimonials || [],
        };
        setLp(saved);
        // Mantém a diferença do cronograma para permitir nova tentativa de sincronização.
        setSavedSnapshot(
          JSON.stringify(
            scheduleSyncFailed
              ? { ...saved, scheduleModules: previousDraft.scheduleModules }
              : saved,
          ),
        );
        setSavedPageUrl(
          landingPageUrl(saved.slug || course.id, saved.template),
        );
      }
      setFeedback(
        scheduleSyncFailed
          ? "Página salva. Não foi possível atualizar o cronograma do curso; tente salvar novamente."
          : "Página salva. O modelo e o conteúdo já estão vinculados a esta turma.",
      );
      onSaved?.();
    } catch (err: any) {
      console.error("Catch Error:", err);
      setFeedback(
        "Não foi possível salvar: " + (err.message || "tente novamente."),
      );
    } finally {
      setSaving(false);
    }
  };

  const updateBenefit = (index: number, field: string, value: string) => {
    const newBenefits = [...(lp.benefits || [])];
    newBenefits[index] = { ...newBenefits[index], [field]: value };
    setLp({ ...lp, benefits: newBenefits });
  };

  const addBenefit = () => {
    setLp({
      ...lp,
      benefits: [
        ...(lp.benefits || []),
        { title: "Novo Benefício", description: "Descrição..." },
      ],
    });
  };

  const removeBenefit = (index: number) => {
    const newBenefits = [...(lp.benefits || [])];
    newBenefits.splice(index, 1);
    setLp({ ...lp, benefits: newBenefits });
  };

  // Modules Handlers
  const updateModule = (index: number, field: string, value: string) => {
    const newModules = [...(lp.modules || [])];
    newModules[index] = { ...newModules[index], [field]: value };
    setLp({ ...lp, modules: newModules });
  };

  const addModule = () => {
    setLp({
      ...lp,
      modules: [
        ...(lp.modules || []),
        {
          title: "Novo Módulo",
          description: "Descrição do módulo...",
          image:
            "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/SUSPENSOES-E-SEUS-MODELOS-VARIADOS.jpg.webp",
        },
      ],
    });
  };

  const removeModule = (index: number) => {
    const newModules = [...(lp.modules || [])];
    newModules.splice(index, 1);
    setLp({ ...lp, modules: newModules });
  };

  // Testimonials Handlers
  const updateTestimonial = (index: number, field: string, value: string) => {
    const newTestimonials = [...(lp.testimonials || [])];
    newTestimonials[index] = { ...newTestimonials[index], [field]: value };
    setLp({ ...lp, testimonials: newTestimonials });
  };

  const addTestimonial = () => {
    setLp({
      ...lp,
      testimonials: [
        ...(lp.testimonials || []),
        { name: "", text: "", image: "", videoUrl: "" },
      ],
    });
  };

  const removeTestimonial = (index: number) => {
    const newTestimonials = [...(lp.testimonials || [])];
    newTestimonials.splice(index, 1);
    setLp({ ...lp, testimonials: newTestimonials });
  };

  const moveTestimonial = (index: number, direction: "up" | "down") => {
    const list = [...(lp.testimonials || [])];
    if (direction === "up" && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === "down" && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setLp({ ...lp, testimonials: list });
  };

  // Schedule (cronograma) Handlers
  const updateScheduleModule = (
    index: number,
    field: "title" | "objective" | "result",
    value: string,
  ) => {
    const list = [...(lp.scheduleModules || [])];
    list[index] = { ...list[index], [field]: value };
    setLp({ ...lp, scheduleModules: list });
  };

  const addScheduleModule = () => {
    setLp({
      ...lp,
      scheduleModules: [
        ...(lp.scheduleModules || []),
        { title: "Novo Módulo", objective: "", topics: [""], result: "" },
      ],
    });
  };

  const removeScheduleModule = (index: number) => {
    const list = [...(lp.scheduleModules || [])];
    list.splice(index, 1);
    setLp({ ...lp, scheduleModules: list });
  };

  const moveScheduleModule = (index: number, direction: "up" | "down") => {
    const list = [...(lp.scheduleModules || [])];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setLp({ ...lp, scheduleModules: list });
  };

  const updateScheduleTopic = (
    modIndex: number,
    topicIndex: number,
    value: string,
  ) => {
    const list = [...(lp.scheduleModules || [])];
    const topics = [...(list[modIndex].topics || [])];
    topics[topicIndex] = value;
    list[modIndex] = { ...list[modIndex], topics };
    setLp({ ...lp, scheduleModules: list });
  };

  const addScheduleTopic = (modIndex: number) => {
    const list = [...(lp.scheduleModules || [])];
    list[modIndex] = {
      ...list[modIndex],
      topics: [...(list[modIndex].topics || []), ""],
    };
    setLp({ ...lp, scheduleModules: list });
  };

  const removeScheduleTopic = (modIndex: number, topicIndex: number) => {
    const list = [...(lp.scheduleModules || [])];
    const topics = [...(list[modIndex].topics || [])];
    topics.splice(topicIndex, 1);
    list[modIndex] = { ...list[modIndex], topics };
    setLp({ ...lp, scheduleModules: list });
  };

  // Seções (ordem/visibilidade — template V9) Handlers
  const sectionList: LPSectionConfig[] =
    lp.sectionOrder && lp.sectionOrder.length > 0
      ? lp.sectionOrder
      : DEFAULT_SECTION_ORDER.map((s) => ({ ...s }));

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sectionList.length || from === to) return;
    const list = sectionList.map((s) => ({ ...s }));
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    setLp({ ...lp, sectionOrder: list });
  };

  const toggleSection = (index: number) => {
    const list = sectionList.map((s) => ({ ...s }));
    list[index].enabled = !list[index].enabled;
    setLp({ ...lp, sectionOrder: list });
  };

  const resetSections = () => {
    setLp({
      ...lp,
      sectionOrder: ["v10", "v11", "v12"].includes(lp.template || "")
        ? signatureSectionOrder(lp.sectionOrder)
        : DEFAULT_SECTION_ORDER.map((s) => ({
            ...s,
            enabled: sectionList.find(current => current.id === s.id)?.enabled ?? s.enabled,
          })),
    });
  };

  const loadDefaultSchedule = () => {
    if (
      lp.scheduleModules &&
      lp.scheduleModules.length > 0 &&
      !window.confirm(
        "Substituir o cronograma atual pelo modelo padrão da W-Tech?",
      )
    )
      return;
    setLp({
      ...lp,
      scheduleModules: DEFAULT_SCHEDULE_MODULES.map((m) => ({
        ...m,
        topics: [...m.topics],
      })),
    });
  };

  if (loading)
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white p-8 rounded-lg flex items-center gap-4">
          <Loader2 className="animate-spin text-wtech-gold" /> Carregando
          editor...
        </div>
      </div>
    );

  return (
    <div className="ls-editor-shell">
      <div
        ref={dialogRef}
        className="ls-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Editor de landing page"
      >
        <header className="ls-editor-head">
          <div>
            <span className="ls-eyebrow">W-TECH / LANDING STUDIO</span>
            <h2>{course.title}</h2>
            <p>
              {course.city || course.location} ·{" "}
              {getLandingTemplate(lp.template).name} ·{" "}
              {dirty ? "Alterações não salvas" : "Conteúdo carregado"}
            </p>
          </div>
          <div className="ls-editor-head-actions">
            <button
              className="ls-button"
              onClick={() => setActiveTab("preview")}
            >
              <Eye size={16} />
              Prévia
            </button>
            {lp.id && (
              <a
                className="ls-button"
                href={
                  savedPageUrl ||
                  landingPageUrl(lp.slug || course.id, lp.template)
                }
                target="_blank"
                rel="noreferrer"
              >
                <LinkIcon size={16} />
                Página salva
              </a>
            )}
            <button
              className="ls-button"
              onClick={closeEditor}
              aria-label="Fechar editor"
            >
              <X size={20} />
            </button>
          </div>
        </header>
        {(feedback || loadError) && (
          <div
            className="ls-editor-feedback"
            role={loadError ? "alert" : "status"}
          >
            {loadError ? "Não foi possível carregar: " + loadError : feedback}
            {loadError && (
              <button
                className="ml-3 underline"
                onClick={() => void fetchLandingPage()}
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
        <div className="ls-editor-body">
          <nav className="ls-editor-nav" aria-label="Etapas da página">
            <span className="ls-eyebrow">PÁGINA DESTA TURMA</span>
            {(
              [
                ["template", Layers, "01", "Modelo", "Todos os 12 modelos"],
                [
                  "sections",
                  Layout,
                  "02",
                  "Conteúdo",
                  "Editar e organizar blocos",
                ],
                ["preview", Eye, "03", "Prévia", "Desktop e celular"],
                ["review", Check, "04", "Revisão", "Conferir antes de salvar"],
              ] as const
            ).map(([id, Icon, number, label, detail]) => (
              <button
                key={id}
                type="button"
                aria-current={
                  activeTab === id ||
                  (id === "sections" &&
                    !["template", "preview", "review"].includes(activeTab))
                    ? "step"
                    : undefined
                }
                onClick={() => setActiveTab(id)}
              >
                <span className="ls-step-number">{number}</span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
              </button>
            ))}
            <div className="ls-editor-context">
              <span className="ls-eyebrow">MODELO DO RASCUNHO</span>
              <strong>{getLandingTemplate(lp.template).name}</strong>
              <p>{dirty ? "Alterações não salvas" : "Conteúdo carregado"}</p>
            </div>
          </nav>
          <fieldset
            className="ls-editor-content"
            disabled={saving || !!loadError}
            style={{ minWidth: 0, margin: 0, border: 0 }}
          >
            {!["template", "sections", "preview", "review"].includes(
              activeTab,
            ) && (
              <button
                type="button"
                className="ls-back-to-blocks"
                onClick={() => setActiveTab("sections")}
              >
                ← Voltar aos blocos da página
              </button>
            )}
            {activeTab === "template" && (
              <>
                <div className="ls-notice">
                  Ao escolher um modelo premium, organizamos a sequência a
                  partir do instrutor e da experiência. Seções ocultas continuam
                  ocultas; você pode ajustar a ordem na etapa Conteúdo.
                </div>
                <TemplateGallery
                  value={lp.template}
                  onChange={(template) =>
                    setLp({
                      ...lp,
                      template,
                      sectionOrder:
                        template !== lp.template &&
                        ["v10", "v11", "v12"].includes(template)
                          ? signatureSectionOrder(lp.sectionOrder)
                          : lp.sectionOrder,
                    })
                  }
                  slug={lp.id ? lp.slug : course.id}
                  image={lp.heroImage || course.image}
                  recommended={recommendedTemplate(course)}
                />
              </>
            )}
            {activeTab === "preview" && (
              <LandingDraftPreview lp={lp} course={course} />
            )}
            {activeTab === "review" && (
              <div>
                <span className="ls-eyebrow">PRONTA PARA O PRÓXIMO PASSO?</span>
                <h3 className="text-2xl font-bold mt-3">
                  Revise sua experiência.
                </h3>
                <p className="text-sm text-gray-500 mt-3">
                  Salvar atualiza a página vinculada a esta turma. O link dos
                  anúncios existentes continua encaminhando para o modelo
                  escolhido.
                </p>
                <div className="ls-review-list">
                  {[
                    ["Design", getLandingTemplate(lp.template).name],
                    ["Curso / projeto", course.title],
                    [
                      "Endereço",
                      landingPageUrl(lp.slug || course.id, lp.template),
                    ],
                    ["Título", lp.title || "Pendente"],
                    [
                      "Imagem de abertura",
                      lp.heroImage ? "Configurada" : "Usará a imagem do curso",
                    ],
                    [
                      "Vídeo da hero",
                      lp.videoUrl
                        ? "Configurado"
                        : "Opcional — adicione em Abertura & mídia",
                    ],
                    ["Instrutor", lp.instructorName || "Pendente"],
                    [
                      "Depoimentos",
                      String(lp.testimonials?.length || 0) + " cadastrados",
                    ],
                    [
                      "Seções visíveis",
                      String(sectionList.filter((s) => s.enabled).length),
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <Check size={17} />
                      <span>{label}</span>
                      <small>{value}</small>
                    </div>
                  ))}
                </div>
                <div className="ls-notice">
                  O envio de campanha para a base é uma ação separada do
                  salvamento.
                </div>
                <button
                  type="button"
                  className="ls-button"
                  onClick={handleLaunchCampaign}
                  disabled={launching || dirty || !lp.id}
                  title={
                    dirty
                      ? "Salve a página antes de preparar a campanha"
                      : undefined
                  }
                >
                  {launching
                    ? "Consultando público…"
                    : "Preparar campanha por região"}
                </button>
              </div>
            )}

            {activeTab === "sections" && (
              <div className="ls-block-workspace">
                <div className="ls-block-heading">
                  <div>
                    <span className="ls-eyebrow">CONTEÚDO DESTA PÁGINA</span>
                    <h3>Blocos da página</h3>
                    <p>
                      Edite cada bloco separadamente. A ordem abaixo é a ordem
                      das seções nos modelos V9–V12.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ls-button"
                    onClick={resetSections}
                    disabled={!supportsSectionOrder(lp.template)}
                  >
                    Restaurar ordem
                  </button>
                </div>
                <article className="ls-content-block ls-content-block--fixed">
                  <span className="ls-block-number">
                    <Layout size={18} />
                  </span>
                  <div>
                    <h4>Abertura da página</h4>
                    <p>Título, vídeo, fotos originais, endereço e contato.</p>
                  </div>
                  <span className="ls-block-status">Fixo</span>
                  <button
                    className="ls-button"
                    type="button"
                    onClick={() => setActiveTab("hero")}
                  >
                    Editar abertura
                  </button>
                </article>
                {!supportsSectionOrder(lp.template) && (
                  <div className="ls-notice">
                    Este modelo clássico tem sequência fixa. Você pode editar o
                    conteúdo abaixo; reordenar e ocultar seções está disponível
                    nos modelos V9–V12.
                  </div>
                )}
                <div className="ls-block-list">
                  {sectionList.map((section, index) => {
                    const meta = LP_SECTIONS.find(
                      (item) => item.id === section.id,
                    );
                    if (!meta) return null;
                    const editable = (
                      {
                        benefits: "content",
                        modules: "modules",
                        schedule: "schedule",
                        instructor: "instructor",
                        testimonials: "testimonials",
                      } as const
                    )[
                      section.id as
                        | "benefits"
                        | "modules"
                        | "schedule"
                        | "instructor"
                        | "testimonials"
                    ];
                    const descriptions: Record<string, string> = {
                      narrative:
                        "Apresentação da metodologia · composição do modelo",
                      benefits:
                        (lp.benefits?.length || 0) + " benefícios cadastrados",
                      modules:
                        (lp.modules?.length || 0) + " módulos cadastrados",
                      schedule:
                        (lp.scheduleModules?.length || 0) +
                        " etapas cadastradas",
                      instructor:
                        lp.instructorName || "Cadastre nome, foto e biografia",
                      testimonials:
                        (lp.testimonials?.length || 0) +
                        " depoimentos cadastrados",
                      location:
                        [course.city, course.location]
                          .filter(Boolean)
                          .join(" · ") || "Informações do cadastro do curso",
                      faq: "Perguntas automáticas conforme a turma e a inscrição",
                    };
                    return (
                      <article
                        className={
                          "ls-content-block " +
                          (!section.enabled ? "is-hidden" : "")
                        }
                        key={section.id}
                        draggable={supportsSectionOrder(lp.template)}
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (
                            dragIndex !== null &&
                            supportsSectionOrder(lp.template)
                          )
                            moveSection(dragIndex, index);
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                      >
                        <span className="ls-block-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h4>{meta.label}</h4>
                          <p>{descriptions[section.id]}</p>
                        </div>
                        <span
                          className={
                            "ls-block-status " +
                            (section.enabled ? "is-visible" : "")
                          }
                        >
                          {section.enabled ? "Visível" : "Oculto"}
                        </span>
                        <div className="ls-block-order">
                          <button
                            type="button"
                            aria-label={"Mover " + meta.label + " para cima"}
                            disabled={
                              index === 0 || !supportsSectionOrder(lp.template)
                            }
                            onClick={() => moveSection(index, index - 1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={"Mover " + meta.label + " para baixo"}
                            disabled={
                              index === sectionList.length - 1 ||
                              !supportsSectionOrder(lp.template)
                            }
                            onClick={() => moveSection(index, index + 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={
                              (section.enabled ? "Ocultar " : "Mostrar ") +
                              meta.label
                            }
                            disabled={!supportsSectionOrder(lp.template)}
                            onClick={() => toggleSection(index)}
                          >
                            {section.enabled ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                        </div>
                        {editable ? (
                          <button
                            className="ls-button"
                            type="button"
                            onClick={() => setActiveTab(editable)}
                          >
                            Editar {meta.label.toLowerCase()}
                          </button>
                        ) : (
                          <span className="ls-block-auto">
                            {section.id === "location"
                              ? "Dados do curso"
                              : "Automático"}
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
                <article className="ls-content-block ls-content-block--fixed">
                  <span className="ls-block-number">
                    <ShieldCheck size={18} />
                  </span>
                  <div>
                    <h4>Inscrição e investimento</h4>
                    <p>
                      Formulário, moeda e checkout seguem a configuração da
                      turma.
                    </p>
                  </div>
                  <span className="ls-block-status">Fixo</span>
                  <button
                    className="ls-button"
                    type="button"
                    onClick={() => setActiveTab("preview")}
                  >
                    Ver na prévia
                  </button>
                </article>
                <p className="ls-block-help">
                  As alterações só são aplicadas ao salvar. Blocos sem conteúdo
                  não aparecem na página, mesmo quando marcados como visíveis.
                </p>
              </div>
            )}

            {activeTab === "hero" && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold border-b pb-2 mb-4">
                  Informações Principais
                </h3>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="block text-sm font-bold text-gray-500 mb-1 flex items-center gap-2">
                    <Video size={16} /> Vídeo da hero / apresentação
                  </label>
                  <input
                    className="w-full bg-white border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                    value={lp.videoUrl || ""}
                    onChange={(e) => setLp({ ...lp, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... ou https://.../video.mp4"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    YouTube, MP4 ou WebM nos modelos Signature. No Cinema,
                    arquivos MP4/WebM também podem formar o fundo em movimento.
                    Nos modelos clássicos, use YouTube.
                  </p>
                </div>
                {/* Existing fields */}
                <div className="ls-original-library">
                  <span className="ls-eyebrow">ACERVO ORIGINAL W-TECH</span>
                  <p>
                    Use registros reais da equipe e das turmas. Selecione uma
                    imagem para a abertura; imagens geradas e bancos de imagem
                    não fazem parte deste acervo.
                  </p>
                  <div>
                    {ORIGINAL_LANDING_MEDIA.map((media) => (
                      <button
                        type="button"
                        key={media.src}
                        title={media.source}
                        onClick={() => setLp({ ...lp, heroImage: media.src })}
                        aria-pressed={lp.heroImage === media.src}
                      >
                        <img src={media.src} alt={media.label} loading="lazy" />
                        <span>{media.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">
                    Título da Página (H1)
                  </label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                    value={lp.title || ""}
                    onChange={(e) => setLp({ ...lp, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">
                    Subtítulo (Headline)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                    value={lp.subtitle || ""}
                    onChange={(e) => setLp({ ...lp, subtitle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">
                    URL Slug (ex: curso-bh)
                  </label>
                  <div className="flex items-center">
                    <span className="p-3 bg-gray-100 border border-r-0 border-gray-200 text-gray-500 rounded-l-lg text-sm">
                      {window.location.host}
                      {landingPageUrl("", lp.template)}
                    </span>
                    <input
                      className="flex-1 bg-white border border-gray-200 p-3 rounded-r-lg focus:ring-2 focus:ring-black outline-none transition-all"
                      value={lp.slug || ""}
                      onChange={(e) =>
                        setLp({
                          ...lp,
                          slug: e.target.value
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9-]+/g, ""),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">
                    Imagem de Capa (Background Hero)
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                      value={lp.heroImage || ""}
                      onChange={(e) =>
                        setLp({ ...lp, heroImage: e.target.value })
                      }
                      placeholder="https://..."
                    />
                    {lp.heroImage && (
                      <img
                        src={lp.heroImage}
                        className="w-12 h-12 object-cover rounded shadow"
                        alt="Preview"
                      />
                    )}
                  </div>
                </div>

                {/* New Secondary Image Field */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Imagem de apoio / capa do vídeo
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Nos modelos Signature, esta foto aparece na capa do vídeo e
                    na seção de apresentação.
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-white border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                      value={lp.heroSecondaryImage || ""}
                      onChange={(e) =>
                        setLp({ ...lp, heroSecondaryImage: e.target.value })
                      }
                      placeholder="https://..."
                    />
                    {lp.heroSecondaryImage && (
                      <img
                        src={lp.heroSecondaryImage}
                        className="w-12 h-12 object-cover rounded shadow"
                        alt="Preview"
                      />
                    )}
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between mt-4">
                  <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <CheckSquare className="text-purple-600" size={18} /> Quiz
                      Interativo de Qualificação
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md">
                      Ative para substituir o formulário padrão por um quiz de 5
                      perguntas que qualifica o lead (Frio, Morno, Quente).
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={lp.quizEnabled || false}
                      onChange={(e) =>
                        setLp({ ...lp, quizEnabled: e.target.checked })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between mt-4">
                  <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <Wrench className="text-amber-600" size={18} /> Destaque
                      "100% Mão na Massa" (Prática na Bancada)
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md">
                      Ative para exibir o módulo/selo de 100% Prática Mão na
                      Massa nas Landing Pages. Desative para modalidades
                      teóricas ou online sem aulas de bancada.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={lp.handsOnEnabled !== false}
                      onChange={(e) =>
                        setLp({ ...lp, handsOnEnabled: e.target.checked })
                      }
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "modules" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                  <h3 className="text-xl font-bold">Módulos do Curso (Grid)</h3>
                  <button
                    onClick={addModule}
                    className="text-sm bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
                  >
                    <Plus size={16} /> Adicionar Módulo
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {lp.modules?.map((mod, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 items-start"
                    >
                      <div className="w-24 h-24 bg-gray-200 rounded-lg shrink-0 overflow-hidden border border-gray-300">
                        {mod.image ? (
                          <img
                            src={mod.image}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-full h-full p-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Título
                          </label>
                          <input
                            className="w-full bg-white border border-gray-200 p-2 rounded font-bold"
                            value={mod.title}
                            onChange={(e) =>
                              updateModule(idx, "title", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Descrição
                          </label>
                          <textarea
                            rows={2}
                            className="w-full bg-white border border-gray-200 p-2 rounded text-sm text-gray-600"
                            value={mod.description}
                            onChange={(e) =>
                              updateModule(idx, "description", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">
                            Imagem URL
                          </label>
                          <input
                            className="w-full bg-white border border-gray-200 p-2 rounded text-xs text-gray-500"
                            value={mod.image}
                            onChange={(e) =>
                              updateModule(idx, "image", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeModule(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start justify-between border-b pb-3 mb-4 gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Cronograma do Curso</h3>
                    <p className="text-sm text-gray-500">
                      Estruture o conteúdo por módulo (título, objetivo, tópicos
                      e resultado). Aparece de forma visual em todas as landing
                      pages.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={loadDefaultSchedule}
                      className="text-xs bg-[var(--admin-accent-gold-muted,#fdf6e3)] text-amber-700 border border-amber-500/30 px-3 py-2 rounded-lg font-bold hover:opacity-80 transition-all whitespace-nowrap"
                    >
                      📥 Modelo W-Tech
                    </button>
                    <button
                      onClick={addScheduleModule}
                      className="text-sm bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 whitespace-nowrap"
                    >
                      <Plus size={16} /> Adicionar Módulo
                    </button>
                  </div>
                </div>

                {!lp.scheduleModules || lp.scheduleModules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <CalendarClock
                      className="mx-auto text-gray-300 mb-3"
                      size={40}
                    />
                    <p className="text-gray-500 font-medium">
                      Nenhum módulo no cronograma ainda.
                    </p>
                    <button
                      onClick={loadDefaultSchedule}
                      className="mt-3 text-xs bg-black text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-gray-800"
                    >
                      <Plus size={12} /> Carregar Modelo W-Tech
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {lp.scheduleModules.map((mod, idx) => (
                      <div
                        key={idx}
                        className="p-5 bg-gray-50 rounded-2xl border border-gray-200 flex gap-4 items-start shadow-sm transition-all hover:border-wtech-gold/40"
                      >
                        {/* Reorder + número */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <button
                            onClick={() => moveScheduleModule(idx, "up")}
                            disabled={idx === 0}
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-xs font-black">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <button
                            onClick={() => moveScheduleModule(idx, "down")}
                            disabled={
                              idx === (lp.scheduleModules?.length || 0) - 1
                            }
                            className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30"
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>

                        {/* Campos do módulo */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Título do Módulo
                            </label>
                            <input
                              className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm font-bold focus:ring-1 focus:ring-black outline-none"
                              value={mod.title}
                              placeholder="Ex: Fundamentos das Suspensões"
                              onChange={(e) =>
                                updateScheduleModule(
                                  idx,
                                  "title",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <Target size={11} className="text-wtech-gold" />{" "}
                              Objetivo (opcional)
                            </label>
                            <textarea
                              rows={2}
                              className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm text-gray-600 focus:ring-1 focus:ring-black outline-none"
                              value={mod.objective || ""}
                              placeholder="O que este módulo entrega ao aluno..."
                              onChange={(e) =>
                                updateScheduleModule(
                                  idx,
                                  "objective",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Tópicos (o aluno vai aprender)
                              </label>
                              <button
                                onClick={() => addScheduleTopic(idx)}
                                className="text-[11px] text-gray-600 hover:text-black flex items-center gap-1 font-bold"
                              >
                                <Plus size={11} /> Tópico
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(mod.topics || []).map((topic, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="flex gap-2 items-center"
                                >
                                  <Check
                                    size={13}
                                    className="text-wtech-gold shrink-0"
                                    strokeWidth={3}
                                  />
                                  <input
                                    className="flex-1 bg-white border border-gray-200 p-2 rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-black outline-none"
                                    value={topic}
                                    placeholder="Descreva um tópico..."
                                    onChange={(e) =>
                                      updateScheduleTopic(
                                        idx,
                                        tIdx,
                                        e.target.value,
                                      )
                                    }
                                  />
                                  <button
                                    onClick={() =>
                                      removeScheduleTopic(idx, tIdx)
                                    }
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ))}
                              {(!mod.topics || mod.topics.length === 0) && (
                                <button
                                  onClick={() => addScheduleTopic(idx)}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  + Adicionar primeiro tópico
                                </button>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <Trophy size={11} className="text-wtech-gold" />{" "}
                              Resultado (opcional)
                            </label>
                            <input
                              className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm text-gray-600 focus:ring-1 focus:ring-black outline-none"
                              value={mod.result || ""}
                              placeholder="Ex: O aluno sabe dimensionar a mola para cada moto."
                              onChange={(e) =>
                                updateScheduleModule(
                                  idx,
                                  "result",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => removeScheduleModule(idx)}
                          className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "content" && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold border-b pb-2 mb-4">
                  Conteúdo e Benefícios (Checklist)
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-bold text-gray-500">
                      Lista de Benefícios
                    </label>
                    <button
                      onClick={addBenefit}
                      className="text-xs bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-800"
                    >
                      <Plus size={12} /> Adicionar Item
                    </button>
                  </div>
                  <div className="space-y-4">
                    {lp.benefits?.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 group"
                      >
                        <div className="flex-1 space-y-2">
                          <input
                            className="w-full bg-white border border-gray-200 p-2 rounded text-sm font-bold"
                            value={benefit.title}
                            placeholder="Título do Benefício"
                            onChange={(e) =>
                              updateBenefit(idx, "title", e.target.value)
                            }
                          />
                          <input
                            className="w-full bg-white border border-gray-200 p-2 rounded text-sm text-gray-600"
                            value={benefit.description}
                            placeholder="Descrição curta"
                            onChange={(e) =>
                              updateBenefit(idx, "description", e.target.value)
                            }
                          />
                        </div>
                        <button
                          onClick={() => removeBenefit(idx)}
                          className="self-center p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "instructor" && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold border-b pb-2 mb-4">
                  Quem é o Instrutor?
                </h3>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">
                    Nome do Instrutor
                  </label>
                  <input
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                    value={lp.instructorName || ""}
                    onChange={(e) =>
                      setLp({ ...lp, instructorName: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-500 mb-1">
                      Biografia
                    </label>
                    <textarea
                      rows={5}
                      className="w-full bg-gray-50 border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition-all"
                      value={lp.instructorBio || ""}
                      onChange={(e) =>
                        setLp({ ...lp, instructorBio: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-sm font-bold text-gray-500 mb-1">
                      Foto (URL)
                    </label>
                    <div className="space-y-2">
                      <input
                        className="w-full bg-gray-50 border border-gray-200 p-2 rounded-lg text-sm"
                        value={lp.instructorImage || ""}
                        onChange={(e) =>
                          setLp({ ...lp, instructorImage: e.target.value })
                        }
                        placeholder="http://..."
                      />
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                        {lp.instructorImage ? (
                          <img
                            src={lp.instructorImage}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "testimonials" && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b pb-2 mb-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      Depoimentos dos Alunos
                    </h3>
                    <p className="text-sm text-gray-500">
                      Adicione depoimentos em texto ou vídeo (YouTube) para
                      impulsionar a prova social e conversão.
                    </p>
                  </div>
                  <button
                    onClick={addTestimonial}
                    className="text-sm bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800"
                  >
                    <Plus size={16} /> Adicionar Depoimento
                  </button>
                </div>

                <div className="space-y-6">
                  {!lp.testimonials || lp.testimonials.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <MessageSquare
                        className="mx-auto text-gray-300 mb-3"
                        size={40}
                      />
                      <p className="text-gray-500 font-medium">
                        Nenhum depoimento cadastrado ainda.
                      </p>
                      <button
                        onClick={addTestimonial}
                        className="mt-3 text-xs bg-black text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1 hover:bg-gray-800"
                      >
                        <Plus size={12} /> Começar a Cadastrar
                      </button>
                    </div>
                  ) : (
                    lp.testimonials.map((test, idx) => {
                      const ytId = getYouTubeId(test.videoUrl);

                      return (
                        <div
                          key={idx}
                          className="p-5 bg-gray-50 rounded-2xl border border-gray-200 flex gap-4 items-start relative group shadow-sm transition-all hover:border-yellow-500/40"
                        >
                          {/* Move buttons */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => moveTestimonial(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <span className="text-[10px] text-center font-bold text-gray-400">
                              {idx + 1}
                            </span>
                            <button
                              onClick={() => moveTestimonial(idx, "down")}
                              disabled={
                                idx === (lp.testimonials?.length || 0) - 1
                              }
                              className="p-1 hover:bg-gray-200 rounded text-gray-500 disabled:opacity-30"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>

                          {/* Image Avatar */}
                          <div className="w-20 h-20 rounded-xl shrink-0 overflow-hidden border border-gray-300 bg-white relative">
                            {ytId ? (
                              /* Show YouTube video thumbnail if videoUrl is provided */
                              <div className="w-full h-full relative">
                                <img
                                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                  className="w-full h-full object-cover"
                                  alt="YT cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <Video size={16} className="text-white" />
                                </div>
                              </div>
                            ) : test.image ? (
                              <img
                                src={test.image}
                                className="w-full h-full object-cover"
                                alt={test.name}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <User size={24} />
                              </div>
                            )}
                          </div>

                          {/* Fields */}
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3 md:col-span-2">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Nome do Aluno
                                  </label>
                                  <input
                                    className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm font-bold focus:ring-1 focus:ring-black outline-none"
                                    value={test.name}
                                    placeholder="Ex: João da Silva"
                                    onChange={(e) =>
                                      updateTestimonial(
                                        idx,
                                        "name",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Foto URL (Opcional)
                                  </label>
                                  <input
                                    className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-xs text-gray-600 focus:ring-1 focus:ring-black outline-none"
                                    value={test.image || ""}
                                    placeholder="https://..."
                                    onChange={(e) =>
                                      updateTestimonial(
                                        idx,
                                        "image",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3 md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Link de Vídeo do YouTube (Opcional)
                              </label>
                              <p className="text-[10px] text-gray-400 -mt-2">
                                Cole o link completo do vídeo de depoimento do
                                aluno no YouTube.
                              </p>
                              <div className="flex gap-2">
                                <input
                                  className="flex-1 bg-white border border-gray-200 p-2.5 rounded-lg text-xs text-gray-600 focus:ring-1 focus:ring-black outline-none"
                                  value={test.videoUrl || ""}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  onChange={(e) =>
                                    updateTestimonial(
                                      idx,
                                      "videoUrl",
                                      e.target.value,
                                    )
                                  }
                                />
                                {ytId && (
                                  <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2.5 py-1 rounded-md self-center flex items-center gap-1">
                                    <Check size={10} strokeWidth={3} /> Vídeo
                                    Detectado
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3 md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                Texto do Depoimento
                              </label>
                              <textarea
                                rows={3}
                                className="w-full bg-white border border-gray-200 p-2.5 rounded-lg text-sm text-gray-600 focus:ring-1 focus:ring-black outline-none"
                                value={test.text}
                                placeholder="Escreva o relato do aluno aqui..."
                                onChange={(e) =>
                                  updateTestimonial(idx, "text", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => removeTestimonial(idx)}
                            className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </fieldset>
        </div>

        <footer className="ls-editor-footer">
          <p>
            {dirty
              ? "Você tem alterações não salvas."
              : "O conteúdo pertence a esta turma, independente do design."}
          </p>
          <button
            type="button"
            className="ls-button ls-button--dark"
            onClick={() => void handleSave()}
            disabled={saving || !!loadError}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Salvando…" : "Salvar página"}
          </button>
        </footer>
      </div>
    </div>
  );
};
