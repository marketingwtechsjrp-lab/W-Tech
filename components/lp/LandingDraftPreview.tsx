import React, { useCallback, useEffect, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { Course, LandingPage } from "../../types";
import { landingPageUrl } from "../../lib/landingTemplates";

export default function LandingDraftPreview({
  lp,
  course,
}: {
  lp: Partial<LandingPage>;
  course: Course;
}) {
  const [mobile, setMobile] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const signature = ["v10", "v11", "v12"].includes(lp.template || "");
  const send = useCallback(
    () =>
      frame.current?.contentWindow?.postMessage(
        { type: "wtech:landing-draft", lp: { ...lp, course } },
        window.location.origin,
      ),
    [lp, course],
  );
  useEffect(() => {
    if (!signature) return;
    const ready = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "wtech:preview-ready"
      )
        send();
    };
    window.addEventListener("message", ready);
    send();
    return () => window.removeEventListener("message", ready);
  }, [send, signature]);
  return (
    <div>
      <div className="ls-preview-toolbar">
        <div>
          <span className="ls-eyebrow">PRÉ-VISUALIZAÇÃO</span>
          <p className="text-xs text-gray-500 mt-2">
            {signature
              ? "Seu conteúdo atual, antes de salvar. Inscrições desativadas."
              : "Este modelo clássico mostra o conteúdo já salvo. Salve para atualizar a prévia."}
          </p>
        </div>
        <div className="ls-segment">
          <button
            type="button"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
            aria-label="Prévia desktop"
          >
            <Monitor size={17} />
          </button>
          <button
            type="button"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
            aria-label="Prévia celular"
          >
            <Smartphone size={17} />
          </button>
        </div>
      </div>
      <div className={`ls-preview-frame ${mobile ? "is-mobile" : ""}`}>
        <iframe
          ref={frame}
          onLoad={signature ? send : undefined}
          src={
            signature
              ? "/lp-preview"
              : landingPageUrl(
                  lp.id ? lp.slug || course.id : course.id,
                  lp.template,
                  true,
                )
          }
          title="Prévia da landing page"
        />
      </div>
    </div>
  );
}
