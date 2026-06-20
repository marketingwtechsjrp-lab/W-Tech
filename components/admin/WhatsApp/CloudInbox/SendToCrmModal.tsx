import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { CloudConversation } from '../../../../lib/whatsappCloud';
import { fetchAttendants, createLeadFromContact } from '../../../../lib/leads';

interface Props {
  conversation: CloudConversation;
  open: boolean;
  onClose: () => void;
}

function defaultName(conv: CloudConversation): string {
  if (conv.profile_name) return conv.profile_name;
  const d = conv.wa_id.replace(/\D/g, '');
  return d ? `Contato ${d.slice(-4)}` : '';
}

function prettyPhone(waId: string): string {
  const d = waId.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
}

const SendToCrmModal: React.FC<Props> = ({ conversation, open, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [attendantId, setAttendantId] = useState('');
  const [notes, setNotes] = useState('');
  const [attendants, setAttendants] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { existed: boolean }>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName(conversation));
    setPhone(prettyPhone(conversation.wa_id));
    setNotes('');
    setError(null);
    setDone(null);
    fetchAttendants().then(setAttendants);
  }, [open, conversation]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Informe o nome do contato.');
      return;
    }
    setSaving(true);
    setError(null);
    const r = await createLeadFromContact({
      name: name.trim(),
      phone: phone || conversation.wa_id,
      assignedTo: attendantId || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!r.success) {
      setError(r.error || 'Falha ao enviar para o CRM.');
      return;
    }
    setDone({ existed: r.existed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#25D366]/10 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[#128C7E] dark:text-[#25D366]" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Enviar para o CRM</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <CheckCircle2 size={44} className="mx-auto text-[#25D366] mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {done.existed ? 'Contato já existia — atualizado no CRM.' : 'Lead criado no CRM!'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {attendantId
                ? `Atribuído a ${attendants.find((a) => a.id === attendantId)?.name || 'atendente'}.`
                : 'Sem atendente atribuído.'}
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1da851]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a3942] text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
                placeholder="Nome do contato"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a3942] text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 font-mono"
                placeholder="+55 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                Atendente (CRM)
              </label>
              <select
                value={attendantId}
                onChange={(e) => setAttendantId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a3942] text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40"
              >
                <option value="">Sem atendente</option>
                {attendants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                Observação <span className="font-normal normal-case text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#2a3942] text-gray-900 dark:text-white border-none focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 resize-none"
                placeholder="Contexto da conversa, interesse, etc."
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1da851] disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Enviar ao CRM
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendToCrmModal;
