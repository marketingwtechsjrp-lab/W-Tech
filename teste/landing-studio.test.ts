import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LANDING_TEMPLATES,
  getLandingTemplate,
  landingPageUrl,
  lpPathForTemplate,
  recommendedTemplate,
  supportsSectionOrder,
} from "../lib/landingTemplates.ts";
import { resolveSectionOrder } from "../lib/lpSections.ts";
import {
  displayLandingTitle,
  instructorPortrait,
  PREMIUM_ALEX_PORTRAIT,
  signatureSectionOrder,
} from "../lib/signatureExperience.ts";

test("narrativa premium começa pela autoridade sem reativar seções ocultas", () => {
  const order = signatureSectionOrder([
    { id: "location", enabled: true },
    { id: "instructor", enabled: false },
  ]);
  assert.equal(order[0].id, "instructor");
  assert.equal(order[0].enabled, false);
  assert.equal(order.at(-2)?.id, "location");
  assert.equal(new Set(order.map((s) => s.id)).size, 8);
});

test("retrato premium substitui arte legada do Alex mas preserva uploads e outros instrutores", () => {
  assert.equal(
    instructorPortrait(
      "Alex Crepaldi",
      "https://lp.w-techbrasil.com.br/wp-content/uploads/2025/09/boas-vindas-2.png.webp",
    ),
    PREMIUM_ALEX_PORTRAIT,
  );
  assert.equal(
    instructorPortrait("Alex Crepaldi", "/images/Alex.webp"),
    PREMIUM_ALEX_PORTRAIT,
  );
  assert.equal(
    instructorPortrait("Alex Crepaldi", "/uploads/meu-retrato.webp"),
    "/uploads/meu-retrato.webp",
  );
  assert.equal(
    instructorPortrait("Outro instrutor", "/uploads/outra-pessoa.webp"),
    "/uploads/outra-pessoa.webp",
  );
  assert.equal(displayLandingTitle("Cusro de Suspensão"), "Curso de Suspensão");
  assert.equal(
    displayLandingTitle("Minha formação autoral"),
    "Minha formação autoral",
  );
});
import {
  originalLandingImage,
  ORIGINAL_COURSE_IMAGE,
  ORIGINAL_LANDING_MEDIA,
} from "../lib/landingMedia.ts";

test("catálogo oferece 12 IDs únicos e rotas válidas para cada modelo", () => {
  assert.equal(new Set(LANDING_TEMPLATES.map((t) => t.id)).size, 12);
  for (let i = 1; i <= 12; i++)
    assert.equal(lpPathForTemplate(`v${i}`), i === 1 ? "/lp" : `/lp${i}`);
  assert.equal(getLandingTemplate("inexistente").id, "v1");
  assert.equal(
    landingPageUrl("curso são paulo", "v11", true),
    "/lp11/curso%20s%C3%A3o%20paulo?preview=1",
  );
});
test("recomendação acompanha contexto da turma sem alterar a escolha salva", () => {
  assert.equal(recommendedTemplate({ title: "Imersão" }), "v10");
  assert.equal(recommendedTemplate({ title: "Preparação avançada" }), "v12");
  assert.equal(
    recommendedTemplate({ title: "Avançado", currency: "EUR" }),
    "v11",
  );
  assert.equal(
    recommendedTemplate({ title: "Imersão", isInternational: true }),
    "v11",
  );
});
test("ordem, ocultação e compatibilidade são preservadas nos modelos Signature", () => {
  const order = resolveSectionOrder([
    { id: "faq", enabled: false },
    { id: "benefits", enabled: true },
    { id: "faq", enabled: true },
    { id: "invalido" },
  ]);
  assert.deepEqual(order.slice(0, 2), [
    { id: "faq", enabled: false },
    { id: "benefits", enabled: true },
  ]);
  assert.equal(order.length, 8);
  for (const id of ["v9", "v10", "v11", "v12"])
    assert.equal(supportsSectionOrder(id), true);
  assert.equal(supportsSectionOrder("v1"), false);
});

test("acervo original substitui imagens ilustrativas sem sobrescrever mídia cadastrada", () => {
  assert.equal(
    originalLandingImage("/images/blog/suspension-training.webp"),
    ORIGINAL_COURSE_IMAGE,
  );
  assert.equal(
    originalLandingImage("https://images.unsplash.com/photo-123"),
    ORIGINAL_COURSE_IMAGE,
  );
  assert.equal(originalLandingImage(null), ORIGINAL_COURSE_IMAGE);
  assert.equal(
    originalLandingImage("/uploads/turma-real.webp"),
    "/uploads/turma-real.webp",
  );
  assert.ok(
    ORIGINAL_LANDING_MEDIA.every(
      (media) => media.source && media.src.startsWith("/images/"),
    ),
  );
});
