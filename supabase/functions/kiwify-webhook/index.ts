import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME') || '';

// Supabase config for DB operations
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Minutos até o disparo do follow-up de escassez (caso o Pix não seja pago)
const FOLLOWUP_DELAY_MIN = 15;

// URLs of the videos to send
const VIDEOS = {
  cart_abandoned: "https://w-techstore.com.br/wp-content/uploads/2026/05/carrinho-abandonado.mov",
  welcome: "https://seu-dominio.com/videos/boas-vindas.mp4"
};

// Captions for the videos
const CAPTIONS = {
  // Carrinho abandonado SEM pix gerado (só interesse) — mantém link de checkout
  cart_abandoned: (name: string, link: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!* \n\nVi que você demonstrou interesse no nosso treinamento de *Regulagem de Suspensão*, mas acabou não finalizando a sua inscrição. ⚠️\n\nEu sei que esse é um assunto que gera muitas dúvidas, mas dominar o ajuste da moto é o que separa quem anda no limite do risco de quem tem performance com segurança. 🏍️💨\n\nAlguma dúvida técnica ou dificuldade no checkout te travou? \n\nSe estiver tudo certo, vou deixar o seu link de acesso aqui embaixo para você garantir sua vaga agora e não ficar de fora dessa turma: 🛠️\n\n🔗 ${link}\n\n*Bora pra cima!* 🤝`,

  // --- A/B: vídeo do Alex no "Pix gerado" (ainda não pago) ---
  // Variante A — empática/técnica (a validada ao vivo)
  pix_video_A: (name: string, expira: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!* \n\nVi que você já gerou o Pix pra entrar no treinamento de *Regulagem de Suspensão*, mas o pagamento ainda não caiu. ⚠️\n\nPra não te deixar na mão, já preparei tudo: é só pagar o Pix aqui embaixo que sua vaga é garantida na hora. 🛠️🏍️${expira ? `\n\n⏳ *Atenção:* esse Pix expira ${expira}. Garanta agora antes que feche!` : ''}\n\nVou te mandar o QR Code e o código *Copia e Cola* na sequência. 👇`,

  // Variante B — escassez/prova social na frente
  pix_video_B: (name: string, expira: string) => `🏁 *${name}!* Alex Crepaldi aqui, da W-Tech. \n\nFaltou só 1 passo: seu Pix do treinamento de *Regulagem de Suspensão* foi gerado, mas ainda não foi pago. 👀\n\nAs vagas dessa turma piloto estão acabando — e o melhor: pagando por Pix, seu acesso libera *na hora*. 🚀🏍️${expira ? `\n\n⏳ *Seu Pix expira ${expira}* — não deixe a vaga escapar por causa de um clique!` : ''}\n\nTe mando agora o QR Code e o *Copia e Cola* pra garantir. 👇`,

  // Legenda da imagem do QR Code
  pix_qr: () => `📲 *Pague pelo QR Code:* abra o app do seu banco, escolha *Pix > Pagar com QR Code* e aponte a câmera.\n\nSe estiver lendo pelo celular, role pra baixo 👇 que vou te mandar o código *Copia e Cola* (é só copiar e colar no banco).`,

  // Instrução antes do código copia e cola
  pix_copy_intro: () => `👇 *Pix Copia e Cola* — toque e segure na mensagem abaixo para copiar, depois cole no seu banco em *Pix > Copia e Cola*:`,

  // Follow-up de escassez (+FOLLOWUP_DELAY_MIN min) enviado pelo cron se não pagar
  pix_followup: (name: string, pixCode: string, link: string) => `⏳ *${name}, seu Pix ainda está aberto — mas não por muito tempo!* \n\nNão perca a vaga da turma piloto de *Regulagem de Suspensão* por causa de um clique. Pagando agora, seu acesso cai na hora. 🏍️💨\n\n🔑 *Pix Copia e Cola* (toque e segure pra copiar):\n${pixCode}\n\nPrefere o checkout? 👉 ${link}\n\nQualquer dúvida é só me chamar aqui. Bora garantir! 🤝`,

  welcome: (name: string) => `🎉 *Parabéns, ${name}! É oficial!* \n\nAlex Crepaldi aqui pra te dar as boas-vindas ao treinamento de *Regulagem de Suspensão* da W-Tech. ✅\n\nVocê acaba de tomar a decisão certa pra dominar a ciclística da sua moto ou dos seus clientes. O seu acesso já foi disparado pelo Kiwify pro seu e-mail. Dá uma conferida lá agora! 📧\n\nAssista aos módulos iniciais, entenda a base teórica e se prepare: a partir de agora você vai entender exatamente o que cada clique faz na suspensão. 👨‍🏫🏍️\n\nQualquer coisa, o nosso suporte está à disposição. Nos vemos nas aulas! 🚀`,
};

// Seleciona variante A/B de forma determinística pelo order_id (split ~50/50)
function pickVariant(orderId: string): 'A' | 'B' {
  let sum = 0;
  for (const ch of String(orderId)) sum += ch.charCodeAt(0);
  return sum % 2 === 0 ? 'A' : 'B';
}

// Normaliza telefone para o formato da Evolution (55 + DDD + número)
function formatPhone(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (formatted.length <= 11) {
    formatted = '55' + formatted;
  }
  return formatted;
}

function evolutionReady(config: { url: string; apiKey: string; instance: string }): boolean {
  if (!config.url || !config.apiKey || !config.instance) {
    console.error("Evolution API credentials missing in configurations.");
    return false;
  }
  return true;
}

// Envio de mídia (vídeo/imagem/documento) via Evolution API
async function sendWhatsAppMedia(
  phone: string,
  mediaUrl: string,
  caption: string,
  config: { url: string; apiKey: string; instance: string },
  mediatype: 'image' | 'video' | 'document' = 'video',
  delay = 1500,
): Promise<boolean> {
  if (!evolutionReady(config)) return false;

  const baseUrl = config.url.replace(/\/$/, '');
  const endpoint = `${baseUrl}/message/sendMedia/${config.instance}`;

  const payload = {
    number: formatPhone(phone),
    mediatype,
    media: mediaUrl,
    fileName: mediatype === 'video' ? 'video.mp4' : 'pix-qrcode.png',
    caption,
    delay,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    console.log("Evolution sendMedia response:", data);
    return response.ok;
  } catch (error) {
    console.error("Error sending WhatsApp media:", error);
    return false;
  }
}

// Envio de texto puro via Evolution API
async function sendWhatsAppText(
  phone: string,
  text: string,
  config: { url: string; apiKey: string; instance: string },
  delay = 1200
): Promise<boolean> {
  if (!evolutionReady(config)) return false;

  const baseUrl = config.url.replace(/\/$/, '');
  const endpoint = `${baseUrl}/message/sendText/${config.instance}`;

  const payload = {
    number: formatPhone(phone),
    text,
    delay,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': config.apiKey },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    console.log("Evolution sendText response:", data);
    return response.ok;
  } catch (error) {
    console.error("Error sending WhatsApp text:", error);
    return false;
  }
}

// Backward-compat helper usado pelos fluxos antigos
async function sendWhatsAppVideo(
  phone: string,
  videoUrl: string,
  caption: string,
  config: { url: string; apiKey: string; instance: string }
): Promise<boolean> {
  return await sendWhatsAppMedia(phone, videoUrl, caption, config, 'video', 1500);
}

// Extrai o código Pix (copia e cola) e a expiração do payload da Kiwify.
// A Kiwify varia o formato entre versões, então cobrimos os campos conhecidos.
function extractPix(orderData: any, payload: any): { code: string; expiration: string } {
  const code =
    orderData.pix_code ||
    orderData.pix?.qrcode ||
    orderData.pix?.pix_code ||
    orderData.pix?.code ||
    orderData.Charges?.pix?.code ||
    orderData.charges?.pix?.code ||
    payload.pix_code ||
    payload.pix?.qrcode ||
    '';

  const expiration =
    orderData.pix_expiration ||
    orderData.pix?.expiration_date ||
    orderData.pix?.expiration ||
    payload.pix_expiration ||
    '';

  return { code: String(code || ''), expiration: String(expiration || '') };
}

// Monta a URL de imagem do QR Code a partir do payload Pix copia e cola.
function buildQrImageUrl(pixCode: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=12&data=${encodeURIComponent(pixCode)}`;
}

// Formata a expiração de forma amigável (se vier uma data ISO).
function formatExpiration(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return `às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`;
}

// Sequência de recuperação com Pix pronto: vídeo (variante) -> QR -> copia e cola.
async function sendPixRecovery(
  phone: string,
  name: string,
  pixCode: string,
  expiration: string,
  variant: 'A' | 'B',
  config: { url: string; apiKey: string; instance: string }
): Promise<boolean> {
  const expiraTxt = formatExpiration(expiration);
  const videoCaption = variant === 'B' ? CAPTIONS.pix_video_B(name, expiraTxt) : CAPTIONS.pix_video_A(name, expiraTxt);

  // 1. Vídeo do Alex contextualizando (variante A/B)
  const okVideo = await sendWhatsAppVideo(phone, VIDEOS.cart_abandoned, videoCaption, config);

  // 2. Imagem do QR Code (gerado a partir do copia e cola)
  const qrUrl = buildQrImageUrl(pixCode);
  const okQr = await sendWhatsAppMedia(phone, qrUrl, CAPTIONS.pix_qr(), config, 'image', 1200);

  // 3. Instrução + código copia e cola ISOLADO (pra cópia limpa no mobile)
  await sendWhatsAppText(phone, CAPTIONS.pix_copy_intro(), config, 1000);
  const okCode = await sendWhatsAppText(phone, pixCode, config, 600);

  return okVideo && okQr && okCode;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await req.json();
    console.log("Received Kiwify Webhook:", JSON.stringify(payload));

    // Fetch dynamic configuration from database SITE_Config table
    let resolvedUrl = EVOLUTION_API_URL;
    let resolvedKey = EVOLUTION_API_KEY;
    let resolvedInstance = EVOLUTION_INSTANCE;

    try {
      const { data: configs } = await supabase
        .from('SITE_Config')
        .select('key, value');

      if (configs) {
        const map: Record<string, string> = {};
        configs.forEach((cfg: any) => {
          map[cfg.key] = cfg.value;
        });

        if (map['evolution_api_url']) {
          resolvedUrl = map['evolution_api_url'].replace(/\/$/, '');
        }
        if (map['evolution_api_key']) {
          resolvedKey = map['evolution_api_key'].trim();
        }
        // Instância DEDICADA do curso online (Pix gerado / carrinho abandonado /
        // boas-vindas via Kiwify). Só cai na automação/padrão se não configurada,
        // para NUNCA sair pelo número mestre por engano.
        if (map['wa_instance_curso_online']) {
          resolvedInstance = map['wa_instance_curso_online'].trim();
        } else if (map['automation_whatsapp_instance']) {
          resolvedInstance = map['automation_whatsapp_instance'].trim();
        } else if (map['evolution_instance_name']) {
          resolvedInstance = map['evolution_instance_name'].trim();
        }
      }
      console.log(`[Kiwify Webhook] Config resolved: url=${resolvedUrl}, instance=${resolvedInstance}`);
    } catch (dbErr: any) {
      console.error("[Kiwify Webhook] DB Config error, using Deno env fallback:", dbErr);
    }

    const config = { url: resolvedUrl, apiKey: resolvedKey, instance: resolvedInstance };

    // Universal extraction for all Kiwify versions
    const orderData = payload.order || payload.cart || payload;
    const status = orderData.order_status || orderData.status;
    const orderId = orderData.order_id || orderData.id;

    const customer = orderData.Customer || orderData.customer || orderData;
    const phone = customer.mobile || customer.phone;
    const name = customer.first_name || customer.full_name || "Amigo";

    if (!phone) {
      console.log("Webhook received but no phone found in any known field. Returning 200.");
      return new Response(JSON.stringify({ message: "Acknowledged, but no action taken (no phone)" }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }

    let success = true;

    // Helper to ensure link is a full URL
    const formatLink = (l: string) => {
      if (!l) return "https://w-techstore.com.br/";
      if (l.startsWith('http')) return l;
      return `https://pay.kiwify.com.br/${l}`;
    };

    // --- DEDUPLICATION CHECK ---
    // Check if we already processed this order recently for abandonment or payment
    const { data: existing } = await supabase
      .from('SITE_Automacao_Fila')
      .select('processed, created_at')
      .eq('order_id', orderId)
      .single();

    // 1. Pix gerado (aguardando pagamento) — ENVIO IMEDIATO do Pix + follow-up de escassez agendado
    if (status === 'waiting_payment') {
      if (existing) {
        return new Response(JSON.stringify({ message: "Already handled" }), { status: 200 });
      }

      const { code: pixCode, expiration } = extractPix(orderData, payload);
      const rawLink = orderData.checkout_url || orderData.checkout_link;
      const checkoutUrl = formatLink(rawLink);

      if (pixCode) {
        const variant = pickVariant(orderId);
        console.log(`Pix gerado para ${phone}. Variante=${variant}. Enviando QR + copia e cola IMEDIATAMENTE.`);

        // Agenda o FOLLOW-UP de escassez (processed=false): o cron processar_fila_whatsapp() envia em +FOLLOWUP_DELAY_MIN min.
        // Quando o pagamento é aprovado, o handler 'paid' deleta esta linha e cancela o follow-up.
        // Esta linha também serve como registro de dedup (a checagem 'existing' acima a encontra).
        const followupAt = new Date(Date.now() + FOLLOWUP_DELAY_MIN * 60 * 1000).toISOString();
        await supabase.from('SITE_Automacao_Fila').insert({
          order_id: orderId,
          phone: phone,
          video_url: VIDEOS.cart_abandoned,
          caption: CAPTIONS.pix_followup(name, pixCode, checkoutUrl),
          send_at: followupAt,
          processed: false,
        });

        // Tracking de recuperação (tabela isolada) — mede conversão e resultado do A/B
        await supabase.from('SITE_Pix_Recovery_Stats').upsert({
          order_id: orderId,
          phone: phone,
          name: name,
          variant: variant,
          pix_sent: true,
          followup_scheduled: true,
          recovered: false,
          sent_at: new Date().toISOString(),
        }, { onConflict: 'order_id' });

        success = await sendPixRecovery(phone, name, pixCode, expiration, variant, config);
      } else {
        // Sem código Pix no payload (ex: boleto ou versão sem o campo) -> mantém fluxo antigo agendado (+5min)
        console.log(`waiting_payment sem pix_code no payload para ${phone}. Agendando msg de link (+5min). Verifique os logs do payload acima para mapear o campo correto.`);
        const sendAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        const { error } = await supabase
          .from('SITE_Automacao_Fila')
          .insert({
            order_id: orderId,
            phone: phone,
            video_url: VIDEOS.cart_abandoned,
            caption: CAPTIONS.cart_abandoned(name, checkoutUrl),
            send_at: sendAt,
            processed: false,
          });
        if (error) console.error("Error scheduling message:", error);
      }
    }

    // 2. Logic for Payment Approved - CANCEL QUEUE AND SEND WELCOME
    else if (status === 'paid' || status === 'approved') {
      // If already processed as paid, skip
      if (existing && existing.processed && (Date.now() - new Date(existing.created_at).getTime() < 60000)) {
        return new Response(JSON.stringify({ message: "Already processed" }), { status: 200 });
      }

      console.log(`Payment approved for ${phone}. Cancelling any scheduled message and sending welcome video.`);

      // Marca recuperação no tracking se havia um Pix de recuperação pendente para este pedido
      await supabase
        .from('SITE_Pix_Recovery_Stats')
        .update({ recovered: true, recovered_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('recovered', false);

      // Cancel scheduled message (incl. follow-up de escassez) if exists
      await supabase.from('SITE_Automacao_Fila').delete().eq('order_id', orderId);

      // Mark as processed in a log-like way (using upsert to keep a record)
      await supabase.from('SITE_Automacao_Fila').upsert({
        order_id: orderId,
        phone: phone,
        video_url: VIDEOS.welcome,
        caption: CAPTIONS.welcome(name),
        send_at: new Date().toISOString(),
        processed: true
      });

      // Send welcome video immediately
      success = await sendWhatsAppVideo(phone, VIDEOS.welcome, CAPTIONS.welcome(name), config);
    }

    // 3. Logic for Manual Abandonment (Kiwify direct) — com pix manda QR+copia e cola, senão vídeo + link
    else if (status === 'cart_abandoned' || status === 'abandoned') {
      // If we already sent an immediate message or have one scheduled, skip to avoid duplicates
      if (existing) {
        return new Response(JSON.stringify({ message: "Already handled" }), { status: 200 });
      }

      const { code: pixCode, expiration } = extractPix(orderData, payload);
      const rawLink = orderData.checkout_url || orderData.checkout_link;
      const checkoutUrl = formatLink(rawLink);
      const variant = pickVariant(orderId);

      // Record that we are sending it now
      await supabase.from('SITE_Automacao_Fila').insert({
        order_id: orderId,
        phone: phone,
        video_url: VIDEOS.cart_abandoned,
        caption: pixCode ? CAPTIONS.pix_video_A(name, formatExpiration(expiration)) : CAPTIONS.cart_abandoned(name, checkoutUrl),
        send_at: new Date().toISOString(),
        processed: true
      });

      if (pixCode) {
        console.log(`Cart abandoned COM pix para ${phone}. Variante=${variant}. Enviando QR + copia e cola.`);
        await supabase.from('SITE_Pix_Recovery_Stats').upsert({
          order_id: orderId,
          phone: phone,
          name: name,
          variant: variant,
          pix_sent: true,
          followup_scheduled: false,
          recovered: false,
          sent_at: new Date().toISOString(),
        }, { onConflict: 'order_id' });
        success = await sendPixRecovery(phone, name, pixCode, expiration, variant, config);
      } else {
        console.log(`Cart abandoned para ${phone}. Enviando vídeo + link.`);
        success = await sendWhatsAppVideo(phone, VIDEOS.cart_abandoned, CAPTIONS.cart_abandoned(name, checkoutUrl), config);
      }
    }

    return new Response(
      JSON.stringify({ success, message: "Webhook processed" }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err: any) {
    console.error("Error processing webhook:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
