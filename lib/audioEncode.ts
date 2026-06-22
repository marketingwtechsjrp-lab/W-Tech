/**
 * Preparação de áudio para a WhatsApp Cloud API (Meta).
 *
 * O MediaRecorder grava em formatos diferentes por navegador e a maioria é
 * RECUSADA pela Meta (erro 131053 "Media upload error"): Chrome grava
 * `audio/webm` e Safari grava `audio/mp4` (com OPUS dentro). Por isso NÃO dá
 * para confiar no container — convertemos sempre para MP3 (audio/mpeg), o único
 * formato que a Meta aceita de forma consistente em qualquer navegador. O
 * encoder (lamejs) é carregado sob demanda para não pesar o bundle principal.
 */

function baseMime(mime: string): string {
  return (mime || '').split(';')[0].trim().toLowerCase();
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler o áudio.'));
    reader.readAsDataURL(blob);
  });
}

/** Decodifica o áudio, converte para mono Int16 e encoda em MP3 (audio/mpeg). */
async function recordedBlobToMp3(blob: Blob): Promise<{ dataUrl: string; mime: string; filename: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    if (typeof ctx.close === 'function') ctx.close();
  }

  const sampleRate = audioBuffer.sampleRate;
  const pcm = audioBuffer.getChannelData(0); // canal 0 (mono) — suficiente para voz

  // Float32 [-1,1] → Int16
  const samples = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const { Mp3Encoder } = (await import('@breezystack/lamejs')) as any;
  const encoder = new Mp3Encoder(1, sampleRate, 64); // mono, 64 kbps (bom para voz)
  const blockSize = 1152;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < samples.length; i += blockSize) {
    const buf = encoder.encodeBuffer(samples.subarray(i, i + blockSize));
    if (buf.length > 0) chunks.push(new Uint8Array(buf));
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(new Uint8Array(tail));

  const mp3Blob = new Blob(chunks, { type: 'audio/mpeg' });
  const dataUrl = await blobToDataUrl(mp3Blob);
  return { dataUrl, mime: 'audio/mpeg', filename: 'audio.mp3' };
}

/**
 * Devolve o áudio pronto para a Cloud API: { dataUrl base64, mime, filename }.
 *
 * Regra: só passa direto quando JÁ é MP3 (audio/mpeg). Qualquer outro formato é
 * re-encodado para MP3. Não dá para confiar no container do MediaRecorder porque
 * ele varia por navegador e engana: Chrome grava `audio/webm`, Safari grava
 * `audio/mp4` (com OPUS dentro) — ambos recusados pela Meta (erro 131053), mesmo
 * o mp4 "parecendo" um formato aceito. Convertendo sempre para MP3, garantimos
 * compatibilidade em qualquer navegador/dispositivo.
 */
export async function prepareWhatsAppAudio(
  blob: Blob,
  originalName?: string
): Promise<{ dataUrl: string; mime: string; filename: string }> {
  if (baseMime(blob.type) === 'audio/mpeg') {
    const dataUrl = await blobToDataUrl(blob);
    return { dataUrl, mime: 'audio/mpeg', filename: originalName || 'audio.mp3' };
  }
  return recordedBlobToMp3(blob);
}
