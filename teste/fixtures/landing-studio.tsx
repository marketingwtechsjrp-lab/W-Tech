/// <reference types="vite/client" />
/** Harness somente do servidor de desenvolvimento. Escritas ficam em memória. */
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../../index.css";

if (!import.meta.env.DEV)
  throw new Error("Fixture disponível somente em desenvolvimento");
const courses = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Imersão em suspensões",
    city: "São Paulo",
    state: "SP",
    date: "2026-11-20",
    date_end: "2026-11-22",
    location: "Centro de treinamento W-Tech",
    location_type: "Presencial",
    status: "Published",
    image: "/images/landing-studio/turma-lisboa-original.webp",
    currency: "BRL",
    checkout_type: "manual",
    is_international: false,
    price: 2400,
    capacity: 20,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Suspensões de alta performance",
    city: "Lisboa",
    date: "2026-11-27",
    location: "Portugal",
    location_type: "Presencial",
    status: "Published",
    image: "/images/lp-curso/3.webp",
    currency: "EUR",
    checkout_type: "manual",
    is_international: true,
    price: 480,
    capacity: 16,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Preparação avançada de suspensões",
    city: "Curitiba",
    date: "2026-12-04",
    location: "Paraná",
    location_type: "Presencial",
    status: "Published",
    image: "/images/landing-studio/estrutura-lisboa-original.webp",
    currency: "BRL",
    checkout_type: "automated",
    is_international: false,
    price: 1800,
    capacity: 20,
  },
];
const initial = {
  id: "qa-landing",
  course_id: courses[0].id,
  title: "Domine o próximo nível.",
  subtitle:
    "Uma imersão para ampliar seu repertório técnico, trocar experiências e construir o próximo capítulo da sua carreira.",
  slug: "imersao-sao-paulo",
  template: "v10",
  hero_image: "/images/landing-studio/turma-lisboa-original.webp",
  hero_secondary_image: "/images/lp-curso/3.webp",
  video_url: "/videos/como_foi.mp4",
  benefits: [
    {
      title: "Um novo olhar técnico",
      description:
        "Entenda os princípios que orientam cada decisão no acerto de suspensões.",
    },
    {
      title: "Conexões que continuam",
      description:
        "Troque experiências com profissionais que compartilham a sua paixão.",
    },
    {
      title: "Conhecimento para evoluir",
      description: "Amplie seu repertório com orientação da equipe W-Tech.",
    },
  ],
  modules: [
    {
      title: "Fundamentos de suspensão",
      description:
        "Geometria, cargas e funcionamento dos sistemas de suspensão.",
      image: "/images/lp-curso/3.webp",
    },
    {
      title: "Ajuste e diagnóstico",
      description:
        "Interprete o comportamento da suspensão e aprenda os princípios do ajuste.",
      image: "/images/landing-studio/estrutura-lisboa-original.webp",
    },
  ],
  instructor_name: "Alex Crepaldi",
  instructor_bio:
    "Conhecimento técnico compartilhado de perto. Conheça a metodologia W-Tech e aprofunde sua compreensão sobre o comportamento das suspensões.",
  instructor_image: "/images/Alex.webp",
  testimonials: [],
  schedule_modules: [],
  section_order: [
    { id: "testimonials", enabled: false },
    { id: "schedule", enabled: false },
  ],
  hands_on_enabled: false,
};
let pages: Record<string, unknown>[] = [initial];
const writes: { table: string; payload: Record<string, unknown> }[] = [];
const qa = { writes, failSave: false, failLoad: false, pages: () => pages };
Object.assign(window, { landingQA: qa });
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
window.fetch = async (input, init) => {
  const req = new Request(input, init);
  const url = new URL(req.url, window.location.origin);
  if (url.pathname === "/api/staff/me")
    return json({
      user: {
        id: "qa-user",
        name: "QA local",
        role: "admin",
        status: "Active",
        permissions: { admin_access: true },
      },
    });
  if (url.pathname.includes("/rest/v1/")) {
    const table = url.pathname.split("/").at(-1)!;
    const single = req.headers.get("accept")?.includes("object+json");
    if (req.method !== "GET" && req.method !== "HEAD") {
      const payload = await req.json();
      if (qa.failSave)
        return json(
          { message: "Falha simulada: nada foi salvo", code: "QA" },
          500,
        );
      writes.push({ table, payload });
      if (table === "SITE_LandingPages") {
        const prev = pages.find((p) => p.course_id === payload.course_id);
        const saved = {
          ...prev,
          ...payload,
          id: prev?.id || "qa-" + pages.length,
        };
        pages = [
          ...pages.filter((p) => p.course_id !== payload.course_id),
          saved,
        ];
        return json(single ? saved : [saved]);
      }
      return json(null);
    }
    if (qa.failLoad)
      return json({ message: "Falha de leitura simulada", code: "QA" }, 500);
    if (table === "SITE_Courses") return json(courses);
    if (table === "SITE_LandingPages") {
      const id = url.searchParams.get("course_id")?.replace("eq.", "");
      const matches = id ? pages.filter((p) => p.course_id === id) : pages;
      return json(single ? matches[0] || null : matches);
    }
    return json([]);
  }
  // A fixture nunca envia chamadas de negócio para serviços reais.
  return json({ ok: true });
};
const { AuthProvider } = await import("../../context/AuthContext");
const { default: LandingPagesView } = await import(
  "../../components/admin/Marketing/LandingPagesView"
);
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <div
        style={{
          padding: "24px",
          background: "var(--admin-surface-2)",
          minHeight: "100vh",
        }}
      >
        <LandingPagesView permissions={{ admin_access: true }} />
      </div>
    </AuthProvider>
  </BrowserRouter>,
);
