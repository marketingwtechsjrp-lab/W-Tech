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
  cart_abandoned: (name: string, link: string) => `🏁 *${name}, aqui é o Alex Crepaldi da W-Tech!* \n\nVi que você demonstrou interesse no nosso treinamento de *Regulagem de Suspensão*, mas acabou não finalizando a sua inscrição. ⚠️\n\nEu sei que esse é um assunto que gera muitas dúvidas, mas dominar o ajuste da moto é o que separa quem anda no limite do risco de quem tem performance com segurança. 🏍️💨\n\nAlguma dúvida técnica ou dificuldade no checkout te travou? \n\nSe estiver tudo certo, vou deixar o seu link de acesso aqui embaixo para você garantir sua vaga agora e não ficar de fora dessa turma: 🛠️\n\n🔗 ${link}\n\n*Bora pra cima!* 🤝`,
  
  welcome: (name: string) => `🎉 *Parabéns, ${name}! É oficial!* \n\nAlex Crepaldi aqui pra te dar as boas-vindas ao treinamento de *Regulagem de Suspensão* da W-Tech. ✅\n\nVocê acaba de tomar a decisão certa pra dominar a ciclística da sua moto ou dos seus clientes. O seu acesso já foi disparado pelo Kiwify pro seu e-mail. Dá uma conferida lá agora! 📧\n\nAssista aos módulos iniciais, entenda a base teórica e se prepare: a partir de agora você vai entender exatamente o que cada clique faz na suspensão. 👨‍🏫🏍️\n\nQualquer coisa, o nosso suporte está à disposição. Nos vemos nas aulas! 🚀`,
};

async function sendWhatsAppVideo(phone: string, videoUrl: string, caption: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.error("Evolution API credentials missing in environment variables.");
    return false;
  }

  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.length <= 11) {
    formattedPhone = '55' + formattedPhone;
  }

  const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
  const endpoint = `${baseUrl}/message/sendMedia/${EVOLUTION_INSTANCE}`;
  
  const payload = {
    number: formattedPhone,
    mediatype: "video",
    media: videoUrl,
    fileName: "video.mp4",
    caption: caption,
    delay: 1500
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Evolution API Response:", data);
    return response.ok;
  } catch (error) {
    console.error("Error sending WhatsApp video:", error);
    return false;
  }
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

    // 1. Logic for Pix Generated (Waiting Payment) - ADD TO QUEUE WITH DELAY
    if (status === 'waiting_payment') {
      if (existing) {
        return new Response(JSON.stringify({ message: "Already in queue" }), { status: 200 });
      }

      console.log(`Pix generated for ${phone}. Scheduling message for 5 minutes from now.`);
      
      const rawLink = orderData.checkout_url || orderData.checkout_link;
      const checkoutUrl = formatLink(rawLink);
      const sendAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // Now + 5 minutes

      const { error } = await supabase
        .from('SITE_Automacao_Fila')
        .insert({
          order_id: orderId,
          phone: phone,
          video_url: VIDEOS.cart_abandoned,
          caption: CAPTIONS.cart_abandoned(name, checkoutUrl),
          send_at: sendAt,
          processed: false
        });

      if (error) console.error("Error scheduling message:", error);
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

    // 3. Logic for Manual Abandonment (Kiwify direct)
    else if (status === 'cart_abandoned' || status === 'abandoned') {
      // If we already sent an immediate message or have one scheduled, skip to avoid duplicates
      if (existing) {
        return new Response(JSON.stringify({ message: "Already handled" }), { status: 200 });
      }

      console.log(`Cart abandoned for ${phone}. Sending immediate video.`);
      const rawLink = orderData.checkout_url || orderData.checkout_link;
      const checkoutUrl = formatLink(rawLink);

      // Record that we are sending it now
      await supabase.from('SITE_Automacao_Fila').insert({
        order_id: orderId,
        phone: phone,
        video_url: VIDEOS.cart_abandoned,
        caption: CAPTIONS.cart_abandoned(name, checkoutUrl),
        send_at: new Date().toISOString(),
        processed: true
      });

      success = await sendWhatsAppVideo(phone, VIDEOS.cart_abandoned, CAPTIONS.cart_abandoned(name, checkoutUrl));
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
