import React, { useEffect, useState } from "react";
import type { LandingPageWithCourse } from "../hooks/useLandingPage";
import type { SignatureTemplateId } from "../lib/landingTemplates";
import SignatureLanding from "../components/lp/SignatureLanding";
import LPEnrollForm from "../components/lp/LPEnrollForm";
import SEO from "../components/SEO";

/** Prévia efêmera. Nenhuma consulta, lead ou rascunho é persistido por esta página. */
export default function LandingPagePreview() {
  const [lp, setLp] = useState<LandingPageWithCourse | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        window.parent === window
      )
        return;
      const data = event.data;
      if (
        data?.type !== "wtech:landing-draft" ||
        !data.lp ||
        !["v10", "v11", "v12"].includes(data.lp.template)
      )
        return;
      setLp(data.lp);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "wtech:preview-ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, []);
  if (!lp)
    return (
      <div className="sig-loading">Abra a prévia pelo Landing Studio.</div>
    );
  const full =
    lp.course?.status === "Full" || lp.course?.status === "Completed";
  const checkout =
    lp.course?.checkoutType === "automated" &&
    !lp.course?.isInternational &&
    lp.course?.currency !== "EUR" &&
    !full;
  return (
    <>
      <SEO title={`Prévia · ${lp.title}`} noindex />
      <SignatureLanding
        lp={lp}
        template={lp.template as SignatureTemplateId}
        preview
        isFullOrDone={full}
        checkoutAtivo={checkout}
        form={
          <fieldset disabled>
            <LPEnrollForm
              lp={{ ...lp, quizEnabled: false }}
              theme={lp.template === "v11" ? "light" : "dark"}
              checkoutAtivo={checkout}
              isFullOrDone={full}
              form={{ name: "", email: "", phone: "" }}
              setForm={() => {}}
              paymentType="full"
              setPaymentType={() => {}}
              submitted={false}
              setSubmitted={() => {}}
              handleSubmit={(e) => e.preventDefault()}
            />
          </fieldset>
        }
      />
    </>
  );
}
