import React, { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Search, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { createHasPermission, type PermFlags } from "../../../lib/permissions";
import { LandingPageEditor } from "../../../pages/LandingPageEditor";
import TemplateGallery from "../../lp/TemplateGallery";
import {
  LANDING_TEMPLATES,
  isLandingTemplate,
  getLandingTemplate,
  landingPageUrl,
  recommendedTemplate,
  type LandingTemplateId,
} from "../../../lib/landingTemplates";
import { formatDateLocal } from "../../../lib/utils";
import type { Course } from "../../../types";
import "../../lp/landingStudio.css";
import { originalLandingImage } from "../../../lib/landingMedia";

interface PageSummary {
  id: string;
  course_id: string | null;
  title: string;
  slug: string;
  template: LandingTemplateId;
  video_url: string | null;
  hero_image: string | null;
}
type CourseRow = Course & {
  location_type?: Course["locationType"];
  is_international?: boolean;
  checkout_type?: Course["checkoutType"];
  custom_link?: string;
  date_end?: string;
  start_time?: string;
  end_time?: string;
};

export default function LandingPagesView({
  permissions,
}: {
  permissions?: PermFlags;
}) {
  const { user } = useAuth();
  const canManage = createHasPermission(
    user,
    permissions,
  )("landing_pages_manage");
  const [courses, setCourses] = useState<Course[]>([]);
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"projects" | "designs">("projects");
  const [editing, setEditing] = useState<Course | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<LandingTemplateId>("v10");
  const [copied, setCopied] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [pendingTemplates, setPendingTemplates] = useState<
    Record<string, LandingTemplateId>
  >({});
  const [editorTab, setEditorTab] = useState<
    "template" | "sections" | "review"
  >("sections");
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const openEditor = (
    course: Course,
    template: LandingTemplateId,
    entry: "template" | "sections" | "review",
  ) => {
    setSelectedTemplate(template);
    setEditorTab(entry);
    setEditing(course);
  };
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [courseResult, pageResult] = await Promise.all([
        supabase
          .from("SITE_Courses")
          .select("*")
          .order("date", { ascending: false }),
        supabase
          .from("SITE_LandingPages")
          .select("id,course_id,title,slug,template,video_url,hero_image")
          .order("created_at", { ascending: false }),
      ]);
      if (courseResult.error) throw courseResult.error;
      if (pageResult.error) throw pageResult.error;
      setCourses(
        ((courseResult.data as CourseRow[]) || []).map((c) => ({
          ...c,
          locationType: c.location_type || c.locationType,
          isInternational: c.is_international ?? c.isInternational,
          checkoutType: c.checkout_type || c.checkoutType,
          dateEnd: c.date_end || c.dateEnd,
          startTime: c.start_time,
          endTime: c.end_time,
          customLink: c.custom_link ?? c.customLink,
        })),
      );
      setPages((pageResult.data as PageSummary[]) || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as páginas. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(""), 2200);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async (slug: string, template: LandingTemplateId) => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + landingPageUrl(slug, template),
      );
      setCopied(slug);
    } catch {
      setError(
        "Não foi possível copiar. Abra a página e copie o endereço do navegador.",
      );
    }
  };
  const matching = courses.filter((c) => {
    const lp = pages.find((p) => p.course_id === c.id);
    const international = c.isInternational || c.currency === "EUR";
    return (
      [c.title, c.city, c.state, lp?.slug]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (region === "all" ||
        (region === "international" ? international : !international)) &&
      (filter === "all" || (filter === "configured" ? !!lp : !lp))
    );
  });
  const orphaned = pages.filter(
    (p) => !p.course_id || !courses.some((c) => c.id === p.course_id),
  );
  const galleryCourse = courses.find((c) => c.id === selectedCourse);
  const galleryPage = pages.find((p) => p.course_id === selectedCourse);

  return (
    <div className="ls-studio ls-console">
      <header className="ls-console-header">
        <div>
          <span className="ls-eyebrow">MARKETING / PÁGINAS POR CURSO</span>
          <h1>Landing pages</h1>
          <p>
            Cada curso tem sua página. Escolha o modelo, organize os blocos e
            confira o link.
          </p>
        </div>
        <div className="ls-console-total">
          <strong>{courses.length}</strong>
          <span>cursos / projetos</span>
          <strong>{LANDING_TEMPLATES.length}</strong>
          <span>modelos disponíveis</span>
        </div>
      </header>
      {local && (
        <div className="ls-environment">
          <span>AMBIENTE LOCAL</span>
          <p>
            Você está no editor local, não no painel da VPS. Salvar conteúdo
            utiliza o banco conectado a este ambiente.
          </p>
        </div>
      )}
      <nav className="ls-tabs" aria-label="Gerenciar landing pages">
        <button
          aria-current={tab === "projects" ? "page" : undefined}
          onClick={() => setTab("projects")}
        >
          Páginas dos cursos <span>{courses.length}</span>
        </button>
        <button
          aria-current={tab === "designs" ? "page" : undefined}
          onClick={() => setTab("designs")}
        >
          Todos os modelos <span>{LANDING_TEMPLATES.length}</span>
        </button>
      </nav>
      {error && (
        <div className="ls-notice" role="alert">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => void load()}>Tentar novamente</button>
        </div>
      )}
      {tab === "projects" ? (
        <>
          <div className="ls-toolbar">
            <label className="ls-search">
              <Search size={17} />
              <input
                aria-label="Buscar curso, cidade ou endereço"
                placeholder="Buscar curso, cidade ou endereço…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filtrar por região"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="all">Todas as regiões</option>
              <option value="br">Brasil</option>
              <option value="international">Internacional</option>
            </select>
            <select
              aria-label="Filtrar configuração"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todas as páginas</option>
              <option value="configured">Personalizadas</option>
              <option value="automatic">Automáticas</option>
            </select>
          </div>
          <div className="ls-console-caption">
            <span>{matching.length} cursos encontrados</span>
            <span>
              Escolher um modelo não publica mudanças. Revise antes de aplicar.
            </span>
          </div>
          {loading ? (
            <div className="ls-empty" role="status">
              Carregando páginas…
            </div>
          ) : matching.length === 0 ? (
            <div className="ls-empty">
              <h3>Nenhum curso encontrado</h3>
              <p>
                {courses.length
                  ? "Ajuste a busca ou os filtros."
                  : "Cadastre um curso para montar sua landing page."}
              </p>
              <button
                className="ls-button"
                onClick={() => {
                  setQuery("");
                  setRegion("all");
                  setFilter("all");
                }}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="ls-console-list">
              {matching.map((course) => {
                const page = pages.find((p) => p.course_id === course.id);
                const saved = getLandingTemplate(
                  page ? page.template || "v1" : "v9",
                );
                const selected = pendingTemplates[course.id] || saved.id;
                const changed = selected !== saved.id;
                const slug = page?.slug || course.id;
                return (
                  <article className="ls-course-row" key={course.id}>
                    <div className="ls-course-identity">
                      <img
                        src={originalLandingImage(course.image)}
                        alt=""
                        loading="lazy"
                      />
                      <div>
                        <div className="ls-course-badges">
                          <span>
                            {course.isInternational || course.currency === "EUR"
                              ? "Internacional"
                              : "Brasil"}
                          </span>
                          <span>
                            {page
                              ? "Conteúdo personalizado"
                              : "Página automática"}
                          </span>
                          {["Draft", "Completed", "Cancelled"].includes(
                            course.status,
                          ) && (
                            <span>
                              {course.status === "Draft"
                                ? "Curso em rascunho"
                                : course.status === "Completed"
                                  ? "Turma encerrada"
                                  : "Turma cancelada"}
                            </span>
                          )}
                        </div>
                        <h3>{course.title}</h3>
                        <p>
                          {course.city || course.location || "Local a definir"}{" "}
                          ·{" "}
                          {course.date
                            ? formatDateLocal(course.date)
                            : "Data a definir"}
                        </p>
                        <code title={landingPageUrl(slug, saved.id)}>
                          {landingPageUrl(slug, saved.id)}
                        </code>
                        {course.customLink && (
                          <small className="ls-external-warning">
                            A agenda deste curso usa um link externo, não esta
                            página.
                          </small>
                        )}
                      </div>
                    </div>
                    <div className="ls-course-current">
                      <span className="ls-eyebrow">MODELO EM USO</span>
                      <strong>
                        {saved.id.toUpperCase()} · {saved.name}
                      </strong>
                      <small>
                        {page?.video_url
                          ? "Vídeo cadastrado"
                          : "Sem vídeo cadastrado"}
                      </small>
                      <a
                        href={landingPageUrl(slug, saved.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir página atual <ArrowUpRight size={13} />
                      </a>
                    </div>
                    <div className="ls-course-controls">
                      <label>
                        Modelo para esta turma
                        <select
                          aria-label={"Modelo de " + course.title}
                          disabled={!canManage}
                          value={selected}
                          onChange={(e) => {
                            if (isLandingTemplate(e.target.value))
                              setPendingTemplates((prev) => ({
                                ...prev,
                                [course.id]: e.target
                                  .value as LandingTemplateId,
                              }));
                          }}
                        >
                          {LANDING_TEMPLATES.map((t) => (
                            <option value={t.id} key={t.id}>
                              {t.id.toUpperCase()} · {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {changed && (
                        <div className="ls-pending-model">
                          <span>Escolha ainda não aplicada</span>
                          <button
                            onClick={() =>
                              setPendingTemplates((prev) => {
                                const next = { ...prev };
                                delete next[course.id];
                                return next;
                              })
                            }
                          >
                            Desfazer
                          </button>
                        </div>
                      )}
                      <div className="ls-row-actions">
                        {canManage && (
                          <button
                            className="ls-button ls-button--dark"
                            onClick={() =>
                              openEditor(
                                course,
                                selected,
                                changed ? "review" : "sections",
                              )
                            }
                          >
                            {changed ? "Revisar e aplicar" : "Editar conteúdo"}
                          </button>
                        )}
                        <a
                          className="ls-button"
                          href={landingPageUrl(slug, selected, true)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Prévia <ArrowUpRight size={13} />
                        </a>
                        <button
                          className="ls-button"
                          onClick={() => void copy(slug, saved.id)}
                          title="Copiar o link do modelo em uso"
                        >
                          {copied === slug ? (
                            <Check size={13} />
                          ) : (
                            <Copy size={13} />
                          )}
                          {copied === slug ? "Copiado" : "Copiar link"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {orphaned.length > 0 && (
            <details className="ls-orphans">
              <summary>
                Páginas antigas sem curso vinculado ({orphaned.length})
              </summary>
              <p>Os endereços existentes foram preservados.</p>
              {orphaned.map((page) => (
                <div key={page.id}>
                  <span>{page.title || page.slug}</span>
                  <a
                    href={landingPageUrl(page.slug, page.template)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir página <ArrowUpRight size={14} />
                  </a>
                </div>
              ))}
            </details>
          )}
        </>
      ) : (
        <>
          <div className="ls-gallery-context">
            <label>
              Pré-visualizar com o conteúdo de
              <select
                aria-label="Curso para visualizar os modelos"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="">Selecione um curso</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} · {course.city || course.location}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {galleryCourse
                ? "Compare os modelos com o mesmo conteúdo. Nada muda até você salvar."
                : "Os 12 modelos estão disponíveis. Escolha um curso para comparar as prévias."}
            </p>
            {canManage && galleryCourse && (
              <button
                className="ls-button ls-button--dark"
                onClick={() =>
                  openEditor(galleryCourse, selectedTemplate, "template")
                }
              >
                Editar com {getLandingTemplate(selectedTemplate).name}
                <ArrowUpRight size={16} />
              </button>
            )}
          </div>
          <TemplateGallery
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            slug={
              galleryCourse ? galleryPage?.slug || galleryCourse.id : undefined
            }
            recommended={
              galleryCourse ? recommendedTemplate(galleryCourse) : undefined
            }
            image={galleryCourse?.image}
          />
        </>
      )}
      {editing && (
        <LandingPageEditor
          key={editing.id}
          course={editing}
          initialTemplate={selectedTemplate}
          initialTab={editorTab}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setPendingTemplates((prev) => {
              const next = { ...prev };
              delete next[editing.id];
              return next;
            });
            void load();
          }}
        />
      )}
    </div>
  );
}
