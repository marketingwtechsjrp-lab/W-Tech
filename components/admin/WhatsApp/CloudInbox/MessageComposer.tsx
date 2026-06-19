import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Image as ImageIcon, FileText, Mic, Square, X, Loader2, AlertTriangle } from 'lucide-react';
import {
  CloudConversation,
  sendCloudText,
  sendCloudMedia,
  fileToDataUrl,
  imageToJpegDataUrl,
  isOutsideServiceWindow,
} from '../../../../lib/whatsappCloud';
import { useAuth } from '../../../../context/AuthContext';

interface Props {
  conversation: CloudConversation;
  disabled?: boolean;
  lastInboundAt: string | null;
  onSent: () => void;
}

function pickAudioMime(): string {
  const candidates = ['audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

const MessageComposer: React.FC<Props> = ({ conversation, disabled, lastInboundAt, onSent }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Reseta ao trocar de conversa.
    setText('');
    setError(null);
    setMenuOpen(false);
  }, [conversation.id]);

  useEffect(() => () => stopTimer(), []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const to = conversation.wa_id;
  const outsideWindow = isOutsideServiceWindow(lastInboundAt);

  const wrap = async (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setSending(true);
    setError(null);
    try {
      const r = await fn();
      if (!r.success) setError(r.error || 'Falha ao enviar.');
      else onSent();
      return r.success;
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    const value = text.trim();
    if (!value || sending) return;
    const ok = await wrap(() => sendCloudText(to, value, user?.id));
    if (ok) setText('');
  };

  const handleImage = async (file: File) => {
    setMenuOpen(false);
    try {
      const dataUrl = await imageToJpegDataUrl(file);
      await wrap(() =>
        sendCloudMedia(
          { to, type: 'image', mediaBase64: dataUrl, mediaMime: 'image/jpeg', filename: 'imagem.jpg' },
          user?.id
        )
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao processar imagem.');
    }
  };

  const handleDocument = async (file: File) => {
    setMenuOpen(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      await wrap(() =>
        sendCloudMedia(
          {
            to,
            type: 'document',
            mediaBase64: dataUrl,
            mediaMime: file.type || 'application/octet-stream',
            filename: file.name,
          },
          user?.id
        )
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao processar arquivo.');
    }
  };

  const handleAudioFile = async (file: File) => {
    setMenuOpen(false);
    try {
      const dataUrl = await fileToDataUrl(file);
      await wrap(() =>
        sendCloudMedia(
          { to, type: 'audio', mediaBase64: dataUrl, mediaMime: file.type || 'audio/mpeg', filename: file.name },
          user?.id
        )
      );
    } catch (e: any) {
      setError(e?.message || 'Falha ao processar áudio.');
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickAudioMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          try {
            const dataUrl = await fileToDataUrl(blob);
            await wrap(() =>
              sendCloudMedia(
                { to, type: 'audio', mediaBase64: dataUrl, mediaMime: blob.type, filename: 'audio.ogg' },
                user?.id
              )
            );
          } catch (e: any) {
            setError(e?.message || 'Falha ao enviar áudio.');
          }
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    stopTimer();
  };

  const cancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.onstop = null as any;
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    stopTimer();
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="shrink-0 bg-white dark:bg-[#202c33] border-t border-gray-200 dark:border-white/10">
      {outsideWindow && (
        <div className="flex items-start gap-2 px-4 py-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Faz mais de 24h desde a última mensagem do contato. Pela política da Meta, mensagens
            livres podem ser bloqueadas — só templates aprovados são entregues nessa janela.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10">
          <span className="truncate">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 p-2.5">
        {recording ? (
          <div className="flex items-center gap-3 flex-1 px-3 py-2.5 rounded-full bg-gray-100 dark:bg-[#2a3942]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-gray-700 dark:text-gray-200 tabular-nums">{mmss}</span>
            <span className="text-xs text-gray-400 flex-1">Gravando áudio...</span>
            <button onClick={cancelRecording} className="p-1.5 text-gray-500 hover:text-red-500" title="Cancelar">
              <X size={18} />
            </button>
            <button
              onClick={stopRecording}
              className="p-2 rounded-full bg-[#25D366] text-white hover:bg-[#1da851]"
              title="Enviar áudio"
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Anexos */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                disabled={disabled || sending}
                className="p-2.5 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40"
                title="Anexar"
              >
                <Paperclip size={20} />
              </button>
              {menuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-44 bg-white dark:bg-[#233138] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 py-1.5 z-10">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <ImageIcon size={17} className="text-purple-500" /> Imagem
                  </button>
                  <button
                    onClick={() => docInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <FileText size={17} className="text-blue-500" /> Documento
                  </button>
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    <Mic size={17} className="text-orange-500" /> Áudio (arquivo)
                  </button>
                </div>
              )}
            </div>

            {/* Texto */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              disabled={disabled || sending}
              rows={1}
              placeholder={disabled ? 'Integração não configurada' : 'Digite uma mensagem'}
              className="flex-1 resize-none max-h-32 px-4 py-2.5 text-sm rounded-2xl bg-gray-100 dark:bg-[#2a3942] text-gray-900 dark:text-white placeholder:text-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 disabled:opacity-50"
            />

            {/* Enviar / Gravar */}
            {text.trim() ? (
              <button
                onClick={handleSendText}
                disabled={disabled || sending}
                className="p-2.5 rounded-full bg-[#25D366] text-white hover:bg-[#1da851] disabled:opacity-40 shrink-0"
                title="Enviar"
              >
                {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={disabled || sending}
                className="p-2.5 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 shrink-0"
                title="Gravar áudio"
              >
                {sending ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
              </button>
            )}
          </>
        )}

        {/* Inputs ocultos */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
        />
        <input
          ref={docInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleDocument(e.target.files[0])}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleAudioFile(e.target.files[0])}
        />
      </div>
    </div>
  );
};

export default MessageComposer;
