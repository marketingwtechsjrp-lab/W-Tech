import React from "react";
import { useLandingPage } from "../hooks/useLandingPage";
import { useSettings } from "../context/SettingsContext";
import { type SignatureTemplateId } from "../lib/landingTemplates";
import SignatureLanding from "../components/lp/SignatureLanding";
import LPEnrollForm from "../components/lp/LPEnrollForm";
import SEO from "../components/SEO";
import { displayLandingTitle } from "../lib/signatureExperience";

export default function LandingPageSignature({
  template,
}: {
  template: SignatureTemplateId;
}) {
  const state = useLandingPage(template);
  const { get } = useSettings();
  const preview =
    new URLSearchParams(window.location.search).get("preview") === "1";
  if (state.loading)
    return (
      <div className="sig-loading" role="status">
        Preparando sua experiência W-Tech…
      </div>
    );
  if (state.error)
    return (
      <div className="sig-loading" role="alert">
        <p>{state.error}</p>
        <button onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  if (!state.lp)
    return (
      <div className="sig-loading">
        <h1>Página não encontrada</h1>
        <a href="/cursos">Conheça nossas turmas</a>
      </div>
    );
  return (
    <>
      <SEO
        title={displayLandingTitle(state.lp.title)}
        description={state.lp.subtitle}
        image={state.lp.heroImage}
        noindex={preview}
      />
      <SignatureLanding
        lp={state.lp}
        template={template}
        preview={preview}
        checkoutAtivo={state.checkoutAtivo}
        isFullOrDone={state.isFullOrDone}
        whatsapp={get("whatsapp_phone")}
        form={
          <fieldset disabled={preview}>
            <LPEnrollForm
              {...state}
              lp={state.lp}
              theme={template === "v11" ? "light" : "dark"}
              whatsappGlobal={get("whatsapp_phone")}
            />
          </fieldset>
        }
      />
    </>
  );
}
