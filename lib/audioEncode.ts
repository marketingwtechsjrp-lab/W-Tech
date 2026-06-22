/**
 * Preparação de áudio para a WhatsApp Cloud API (Meta).
 *
 * A Meta só aceita áudio em AAC, AMR, MP3, M4A/MP4 ou OGG (codec OPUS). O Chrome
 * grava em `audio/webm;codecs=opus`, que é RECUSADO (erro 131053 "Media upload
 * error"). Firefox grava ogg/opus e Safari grava mp4/aac — esses já são aceitos.
 *
 * Estratégia: se o formato gravado já for aceito, envia como está; senão (webm),
 * re-encoda para MP3 no navegador. O encoder (lamejs) é carregado sob demanda
 * (dynamic import) para não pesar o bundle principal.
 */

const SUPPORTED_BASES = [
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/amr',
  'audio/ogg',
  'audio/m4a',
  'audio/x-m4a',
];

function baseMime(mime: string): string {
  return (mime || '').split(';')[0].trim().toLowerCase();
}

export function isWhatsAppAudio(mime: string): boolean {
  return SUPPORTED_BASES.includes(baseMime(mime));
}

function extFor(base: string): string {
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a') return 'm4a';
  if (base === 'audio/aac') return 'aac';
  if (base === 'audio/amr') return 'amr';
  return 'mp3';
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
 * Mantém o formato quando já é aceito; converte para MP3 quando não é (webm).
 */
export async function prepareWhatsAppAudio(
  blob: Blob,
  originalName?: string
): Promise<{ dataUrl: string; mime: string; filename: string }> {
  const base = baseMime(blob.type);
  if (isWhatsAppAudio(blob.type)) {
    const dataUrl = await blobToDataUrl(blob);
    return { dataUrl, mime: base, filename: originalName || `audio.${extFor(base)}` };
  }
  return recordedBlobToMp3(blob);
}
