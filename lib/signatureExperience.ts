import { resolveSectionOrder } from "./lpSections.ts";

/** Ao experimentar um design novo, recomenda a narrativa premium sem reativar seções ocultas. */
export function signatureSectionOrder(raw: unknown) {
  const current = resolveSectionOrder(raw);
  const sequence = [
    "instructor",
    "narrative",
    "benefits",
    "modules",
    "schedule",
    "testimonials",
    "location",
    "faq",
  ];
  return sequence.map((id) => current.find((section) => section.id === id)!);
}

export const PREMIUM_ALEX_PORTRAIT = "/images/alex-webp.webp";

/** Corrige apenas o erro tipográfico conhecido, sem reescrever títulos autorais. */
export const displayLandingTitle = (title: string) =>
  title.replace(/\bcusro\b/gi, "Curso");

export function instructorPortrait(name?: string, configuredImage?: string) {
  if (
    /alex(?:\s+crepaldi)?/i.test(name || "") &&
    (!configuredImage ||
      /\/(?:Alex|alex-webp)\.webp(?:\?.*)?$/i.test(configuredImage) ||
      /\/boas-vindas-2(?:\.png)?\.webp(?:\?.*)?$/i.test(configuredImage))
  )
    return PREMIUM_ALEX_PORTRAIT;
  return configuredImage;
}
