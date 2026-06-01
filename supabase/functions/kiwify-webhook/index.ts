import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') || '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE_NAME') || '';

// Supabase config for DB operations
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// URLs of the videos to send
const VIDEOS = {
  cart_abandoned: "https://w-techstore.com.br/wp-content/uploads/2026/05/carrinho-abandonado.mov",
  welcome: "https://seu-dominio.com/videos/boas-vindas.mp4"
};

// Captions for the videos
const CAPTIONS = {
  // Carrinho abandonado SEM pix gerado (só interesse) — mantém link de checkout
  cart_abandoned: (name: string, link: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!* \n\nVi que você demonstrou interesse no nosso treinamento de *Regulagem de Suspensão*, mas acabou não finalizando a sua inscrição. ⚠️\n\nEu sei que esse é um assunto que gera muitas dúvidas, mas dominar o ajuste da moto é o que separa quem anda no limite do risco de quem tem performance com segurança. 🏍️💨\n\nAlguma dúvida técnica ou dificuldade no checkout te travou? \n\nSe estiver tudo certo, vou deixar o seu link de acesso aqui embaixo para você garantir sua vaga agora e não ficar de fora dessa turma: 🛠️\n\n🔗 ${link}\n\n*Bora pra cima!* 🤝`,

  // Pix gerado mas ainda não pago — manda o Pix pronto (vídeo do Alex)
  pix_video: (name: string, expira: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!* \n\nVi que você já gerou o Pix pra entrar no treinamento de *Regulagem de Suspensão*, mas o pagamento ainda não caiu. ⚠️\n\nPra não te deixar na mão, já preparei tudo: é só pagar o Pix aqui embaixo que sua vaga é garantida na hora. 🛠️🏍️${expira ? `\n\n⏳ *Atenção:* esse Pix expira ${expira}. Garanta agora antes que feche!` : ''}\n\nVou te mandar o QR Code e o código *Copia e Cola* na sequência. 👇`,

  // Legenda da imagem do QR Code
  pix_qr: () => `📲 *Pague pelo QR Code:* abra o app do seu banco, escolha *Pix > Pagar com QR Code* e aponte a câmera.\n\nSe estiver lendo pelo celular, role pra baixo 👇 que vou te mandar o código *Copia e Cola* (é só copiar e colar no banco).`,

  // Instrução antes do código copia e cola
  pix_copy_intro: () => `👇 *Pix Copia e Cola* — toque e segure na mensagem abaixo para copiar, depois cole no seu banco em *Pix > Copia e Cola*:`,

  welcome: (name: string) => `🎉 *Parabéns, ${name}! É oficial!* \n\nAlex Crepaldi aqui pra te dar as boas-vindas ao treinamento de *Regulagem de Suspensão* da W-Tech. ✅\n\nVocê acaba de tomar a decisão certa pra dominar a ciclística da sua moto ou dos seus clientes. O seu acesso já foi disparado pelo Kiwify pro seu e-mail. Dá uma conferida lá agora! 📧\n\nAssista aos módulos iniciais, entenda a base teórica e se prepare: a partir de agora você vai entender exatamente o que cada clique faz na suspensão. 👨‍🏫🏍️\n\nQualquer coisa, o nosso suporte está à disposição. Nos vemos nas aulas! 🚀`,
};

// Normaliza telefone para o formato da Evolution (55 + DDD + número)
function formatPhone(phone: string): string {
  let formatted = phone.replace(/\D/g, '');
  if (formatted.length <= 11) {
    formatted = '55' + formatted;
  }
  return formatted;
}

function evolutionReady(): boolean {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.error("Evolution API credentials missing in environment variables.");
    return false;
  }
  return true;
}

// Envio de mídia (vídeo/imagem/documento) via Evolution API
async function sendWhatsAppMedia(
  phone: string,
  mediaUrl: string,
  caption: string,
  mediatype: 'image' | 'video' | 'document' = 'video',
  delay = 1500,
): Promise<boolean> {
  if (!evolutionReady()) return false;

  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
  const endpoint = `${baseUrl}/message/sendMedia/${EVOLUTION_INSTANCE}`;

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
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
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
async function sendWhatsAppText(phone: string, text: string, delay = 1200): Promise<boolean> {
  if (!evolutionReady()) return false;

  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
  const endpoint = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;

  const payload = {
    number: formatPhone(phone),
    text,
    delay,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
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
async function sendWhatsAppVideo(phone: string, videoUrl: string, caption: string): Promise<boolean> {
  return await sendWhatsAppMedia(phone, videoUrl, caption, 'video', 1500);
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

// Sequência de recuperação com Pix pronto: vídeo -> QR -> copia e cola.
async function sendPixRecovery(phone: string, name: string, pixCode: string, expiration: string): Promise<boolean> {
  const expiraTxt = formatExpiration(expiration);

  // 1. Vídeo do Alex contextualizando
  const okVideo = await sendWhatsAppVideo(phone, VIDEOS.cart_abandoned, CAPTIONS.pix_video(name, expiraTxt));

  // 2. Imagem do QR Code (gerado a partir do copia e cola)
  const qrUrl = buildQrImageUrl(pixCode);
  const okQr = await sendWhatsAppMedia(phone, qrUrl, CAPTIONS.pix_qr(), 'image', 1200);

  // 3. Instrução + código copia e cola ISOLADO (pra cópia limpa no mobile)
  await sendWhatsAppText(phone, CAPTIONS.pix_copy_intro(), 1000);
  const okCode = await sendWhatsAppText(phone, pixCode, 600);

  return okVideo && okQr && okCode;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await req.json();
    console.log("Received Kiwify Webhook:", JSON.stringify(payload));

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

    // 1. Pix gerado (aguardando pagamento) — ENVIO IMEDIATO do Pix pronto (QR + copia e cola)
    if (status === 'waiting_payment') {
      if (existing) {
        return new Response(JSON.stringify({ message: "Already handled" }), { status: 200 });
      }

      const { code: pixCode, expiration } = extractPix(orderData, payload);
      const rawLink = orderData.checkout_url || orderData.checkout_link;
      const checkoutUrl = formatLink(rawLink);

      if (pixCode) {
        console.log(`Pix gerado para ${phone}. Enviando QR + copia e cola IMEDIATAMENTE.`);

        // Registra ANTES de enviar (processed=true) para dedup e para o cron externo NÃO reenviar
        await supabase.from('SITE_Automacao_Fila').insert({
          order_id: orderId,
          phone: phone,
          video_url: VIDEOS.cart_abandoned,
          caption: CAPTIONS.pix_video(name, formatExpiration(expiration)),
          send_at: new Date().toISOString(),
          processed: true,
        });

        success = await sendPixRecovery(phone, name, pixCode, expiration);
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

      // Cancel scheduled message if exists
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
      success = await sendWhatsAppVideo(phone, VIDEOS.welcome, CAPTIONS.welcome(name));
    }

    // 3. Logic for Manual Abandonment (Kiwify direct) — sem pix, manda vídeo + link
    else if (status === 'cart_abandoned' || status === 'abandoned') {
      // If we already sent an immediate message or have one scheduled, skip to avoid duplicates
      if (existing) {
        return new Response(JSON.stringify({ message: "Already handled" }), { status: 200 });
      }

      const { code: pixCode, expiration } = extractPix(orderData, payload);
      const rawLink = orderData.checkout_url || orderData.checkout_link;
      const checkoutUrl = formatLink(rawLink);

      // Record that we are sending it now
      await supabase.from('SITE_Automacao_Fila').insert({
        order_id: orderId,
        phone: phone,
        video_url: VIDEOS.cart_abandoned,
        caption: pixCode ? CAPTIONS.pix_video(name, formatExpiration(expiration)) : CAPTIONS.cart_abandoned(name, checkoutUrl),
        send_at: new Date().toISOString(),
        processed: true
      });

      if (pixCode) {
        console.log(`Cart abandoned COM pix para ${phone}. Enviando QR + copia e cola.`);
        success = await sendPixRecovery(phone, name, pixCode, expiration);
      } else {
        console.log(`Cart abandoned para ${phone}. Enviando vídeo + link.`);
        success = await sendWhatsAppVideo(phone, VIDEOS.cart_abandoned, CAPTIONS.cart_abandoned(name, checkoutUrl));
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
