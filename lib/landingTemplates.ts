import type { Course } from "../types";

/** Catálogo único: editor, marketing e rotas compartilham os mesmos IDs. */
export const LANDING_TEMPLATES = [
  {
    id: "v10",
    name: "W-Tech Cinema",
    collection: "signature",
    tone: "dark",
    accent: "#D4AF37",
    description: "A experiência começa antes da primeira aula.",
    audience: "Imersões presenciais e campanhas com vídeo",
    layout: "cinema",
  },
  {
    id: "v11",
    name: "W-Tech Signature",
    collection: "signature",
    tone: "light",
    accent: "#E60000",
    description: "Formação premium com a identidade W-Tech em fundo claro.",
    audience: "Formações premium no Brasil e na Europa",
    layout: "atelier",
  },
  {
    id: "v12",
    name: "W-Tech Performance",
    collection: "signature",
    tone: "dark",
    accent: "#E60000",
    description: "Precisão técnica. Presença de marca. Ação.",
    audience: "Cursos técnicos, preparação e oficinas",
    layout: "lab",
  },
  {
    id: "v9",
    name: "Premium Immersive",
    collection: "essentials",
    tone: "dark",
    accent: "#e6241d",
    description: "Hero imersiva, bento de benefícios e seções flexíveis.",
    audience: "Campanhas de imersão",
    layout: "cinema",
  },
  {
    id: "v7",
    name: "Editorial Light",
    collection: "essentials",
    tone: "light",
    accent: "#b69656",
    description: "Composição de revista com espaço para o conteúdo.",
    audience: "Formação e autoridade",
    layout: "atelier",
  },
  {
    id: "v8",
    name: "Swiss Tech",
    collection: "essentials",
    tone: "light",
    accent: "#d4af37",
    description: "Grid preciso e programa organizado.",
    audience: "Conteúdo técnico",
    layout: "lab",
  },
  {
    id: "v6",
    name: "Carbon Racing",
    collection: "essentials",
    tone: "dark",
    accent: "#d4af37",
    description: "Texturas de pista e identidade do automobilismo.",
    audience: "Performance e preparação",
    layout: "lab",
  },
  {
    id: "v5",
    name: "Gold Brutal",
    collection: "essentials",
    tone: "dark",
    accent: "#d4af37",
    description: "Tipografia forte e contraste dourado.",
    audience: "Campanhas de impacto",
    layout: "lab",
  },
  {
    id: "v2",
    name: "Premium Cinematic",
    collection: "essentials",
    tone: "dark",
    accent: "#d4af37",
    description: "Hero em parallax e apresentação do programa.",
    audience: "Cursos presenciais",
    layout: "cinema",
  },
  {
    id: "v3",
    name: "White Clean",
    collection: "essentials",
    tone: "light",
    accent: "#d4af37",
    description: "Página clara com cronograma visual.",
    audience: "Cursos com agenda detalhada",
    layout: "atelier",
  },
  {
    id: "v4",
    name: "Classic Light",
    collection: "essentials",
    tone: "light",
    accent: "#b69656",
    description: "Apresentação clara e objetiva.",
    audience: "Campanhas tradicionais",
    layout: "atelier",
  },
  {
    id: "v1",
    name: "Classic Dark",
    collection: "essentials",
    tone: "dark",
    accent: "#d4af37",
    description: "O modelo original da W-Tech.",
    audience: "Campanhas tradicionais",
    layout: "cinema",
  },
] as const;

export type LandingTemplateId = (typeof LANDING_TEMPLATES)[number]["id"];
export type SignatureTemplateId = "v10" | "v11" | "v12";
export const isLandingTemplate = (value: unknown): value is LandingTemplateId =>
  LANDING_TEMPLATES.some((t) => t.id === value);
export const getLandingTemplate = (value?: string | null) =>
  LANDING_TEMPLATES.find((t) => t.id === value) ??
  LANDING_TEMPLATES.find((t) => t.id === "v1")!;
export const lpPathForTemplate = (value?: string | null) => {
  const id = getLandingTemplate(value).id;
  return id === "v1" ? "/lp" : `/lp${id.slice(1)}`;
};
export const landingPageUrl = (
  slug: string,
  template?: string | null,
  preview = false,
) =>
  `${lpPathForTemplate(template)}/${encodeURIComponent(slug)}${preview ? "?preview=1" : ""}`;
export const supportsSectionOrder = (value?: string) =>
  ["v9", "v10", "v11", "v12"].includes(value || "");
export function recommendedTemplate(
  course: Pick<Course, "isInternational" | "currency" | "title">,
): LandingTemplateId {
  if (course.isInternational || course.currency === "EUR") return "v11";
  return /avançad|prepara|revalv|performance/i.test(course.title)
    ? "v12"
    : "v10";
}
