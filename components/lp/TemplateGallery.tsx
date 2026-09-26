import React, { useState } from "react";
import { ArrowUpRight, Check, Play } from "lucide-react";
import {
  LANDING_TEMPLATES,
  landingPageUrl,
  type LandingTemplateId,
} from "../../lib/landingTemplates";
import "./landingStudio.css";
import { originalLandingImage } from "../../lib/landingMedia";
import { PREMIUM_ALEX_PORTRAIT } from "../../lib/signatureExperience";

export function TemplateArtwork({
  template,
  image,
}: {
  template: (typeof LANDING_TEMPLATES)[number];
  image?: string;
}) {
  return (
    <div
      className={`ls-art ls-art--${template.layout} ls-art--${template.tone} ${template.collection === "signature" ? "ls-art--portrait" : ""}`}
      style={{ "--ls-accent": template.accent } as React.CSSProperties}
      aria-hidden="true"
    >
      <div className="ls-art-top">
        <img className="ls-art-logo" src="/logo-wtech-branca.webp" alt="" />
        <span>FORMAÇÃO ESPECIALIZADA ↗</span>
      </div>
      <img
        src={
          template.collection === "signature"
            ? PREMIUM_ALEX_PORTRAIT
            : originalLandingImage(image)
        }
        alt=""
        loading="lazy"
      />
      <div className="ls-art-copy">
        <span>
          {template.layout === "atelier"
            ? "A próxima etapa da sua carreira."
            : "CONHECIMENTO QUE TRANSFORMA"}
        </span>
        <strong>
          {template.layout === "lab" ? (
            <>
              TÉCNICA.
              <br />
              SEM LIMITES.
            </>
          ) : template.layout === "atelier" ? (
            <>
              O detalhe faz
              <br />
              <em>a diferença.</em>
            </>
          ) : (
            <>
              Viva o próximo
              <br />
              <em>nível.</em>
            </>
          )}
        </strong>
        <i>
          Conhecer a formação <ArrowUpRight size={12} />
        </i>
      </div>
      <span className="ls-art-play">
        <Play size={15} fill="currentColor" />
      </span>
      <div className="ls-art-bottom">
        <span>01 / EXPERIÊNCIA</span>
        <span>W-TECH / FORMAÇÃO TÉCNICA</span>
      </div>
    </div>
  );
}

export default function TemplateGallery({
  value,
  onChange,
  slug,
  recommended,
  image,
}: {
  value?: LandingTemplateId;
  onChange: (id: LandingTemplateId) => void;
  slug?: string;
  recommended?: LandingTemplateId;
  image?: string;
}) {
  const [collection, setCollection] = useState<"signature" | "all">("all");
  return (
    <div className="ls-gallery">
      <div className="ls-section-heading">
        <div>
          <span className="ls-eyebrow">12 MODELOS DISPONÍVEIS</span>
          <h3>Escolha o modelo da página.</h3>
          <p>
            Os nove modelos anteriores continuam aqui, junto dos três novos.
            Trocar o visual mantém o conteúdo do curso.
          </p>
        </div>
        <div className="ls-segment">
          <button
            type="button"
            aria-pressed={collection === "all"}
            onClick={() => setCollection("all")}
          >
            Todos · 12
          </button>
          <button
            type="button"
            aria-pressed={collection === "signature"}
            onClick={() => setCollection("signature")}
          >
            Novos · 3
          </button>
        </div>
      </div>
      <div className="ls-template-grid">
        {LANDING_TEMPLATES.filter(
          (t) => collection === "all" || t.collection === "signature",
        ).map((t) => (
          <article
            className={`ls-template ${value === t.id ? "is-selected" : ""}`}
            key={t.id}
          >
            <button
              type="button"
              className="ls-template-select"
              aria-label={`Selecionar ${t.name}`}
              aria-pressed={value === t.id}
              onClick={() => onChange(t.id)}
            >
              <TemplateArtwork template={t} image={image} />
              <div className="ls-template-info">
                <div className="ls-template-title">
                  <h4>
                    <small className="ls-model-id">{t.id.toUpperCase()}</small>
                    {t.name}
                  </h4>
                  {value === t.id && <Check size={18} />}
                </div>
                <p>{t.description}</p>
                <span>{t.audience}</span>
                <div className="ls-template-tags">
                  <b>{t.tone === "light" ? "Claro" : "Escuro"}</b>
                  {t.collection === "signature" && <b>Vídeo na hero</b>}
                  {recommended === t.id && <b>Indicado para esta turma</b>}
                </div>
              </div>
            </button>
            {slug && (
              <a
                className="ls-template-preview"
                href={landingPageUrl(slug, t.id, true)}
                target="_blank"
                rel="noreferrer"
              >
                Ver prévia real <ArrowUpRight size={14} />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
