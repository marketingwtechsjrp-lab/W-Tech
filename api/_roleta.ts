/**
 * Roleta de atendentes do CRM (round-robin) + recuperação de leads
 * de checkouts não finalizados.
 *
 * Arquivos com prefixo "_" dentro de /api não viram rotas na Vercel.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RECOVERY_TAGS = ['recuperacao_checkout', 'pagamento_nao_concluido'];

/**
 * Escolhe o próximo atendente da roleta (SITE_Users com receives_leads=true e Active),
 * em rodízio persistido na SITE_Config (key: crm_roleta_pointer).
 */
export async function pickNextAttendant(supabase: any): Promise<{ id: string; name: string } | null> {
  const { data: users, error } = await supabase
    .from('SITE_Users')
    .select('id, name')
    .eq('receives_leads', true)
    .eq('status', 'Active')
    .order('name');

  if (error || !users || users.length === 0) {
    console.warn('[Roleta] Nenhum atendente elegível (receives_leads=true, Active).', error);
    return null;
  }

  const { data: pointerRow } = await supabase
    .from('SITE_Config')
    .select('value')
    .eq('key', 'crm_roleta_pointer')
    .maybeSingle();

  const lastId = pointerRow?.value as string | undefined;
  const lastIdx = users.findIndex((u: any) => u.id === lastId);
  const next = users[(lastIdx + 1) % users.length];

  const { error: upsertError } = await supabase
    .from('SITE_Config')
    .upsert({ key: 'crm_roleta_pointer', value: next.id }, { onConflict: 'key' });

  if (upsertError) {
    console.warn('[Roleta] Falha ao persistir ponteiro (não-fatal):', upsertError);
  }

  return next;
}

/**
 * Devolve o lead de um checkout não finalizado para a roleta de atendentes:
 * status volta para 'New' e assigned_to passa do robô para um humano.
 *
 * Regras de segurança:
 *  - Só age se a inscrição ainda estiver Pending.
 *  - Nunca rebaixa lead já Converted.
 *  - Idempotente: se o lead já foi recuperado (tag + atendente humano), não redistribui.
 */
export async function recoverLeadToRoulette(
  supabase: any,
  enrollment: { id: string; status: string; student_email?: string; student_phone?: string; student_name?: string },
  reason: string
): Promise<{ recovered: boolean; detail: string; assigned_to?: string | null }> {
  if (enrollment.status !== 'Pending') {
    return { recovered: false, detail: `enrollment status is ${enrollment.status}, not Pending` };
  }

  const email = (enrollment.student_email || '').trim().toLowerCase();
  const phone = (enrollment.student_phone || '').replace(/\D/g, '');
  if (!email && !phone) {
    return { recovered: false, detail: 'enrollment has no email/phone to locate lead' };
  }

  const orFilter = [email && `email.eq.${email}`, phone && `phone.eq.${phone}`].filter(Boolean).join(',');
  const { data: lead } = await supabase
    .from('SITE_Leads')
    .select('id, status, assigned_to, tags, notes')
    .or(orFilter)
    .limit(1)
    .maybeSingle();

  if (lead?.status === 'Converted') {
    return { recovered: false, detail: 'lead already Converted — not downgrading' };
  }

  const existingTags: string[] = lead?.tags || [];
  const alreadyRecovered =
    existingTags.includes('recuperacao_checkout') &&
    lead?.status === 'New' &&
    UUID_RE.test(String(lead?.assigned_to || ''));
  if (alreadyRecovered) {
    return { recovered: false, detail: 'lead already recovered and assigned to attendant', assigned_to: lead.assigned_to };
  }

  const attendant = await pickNextAttendant(supabase);
  const mergedTags = Array.from(new Set([...existingTags, ...RECOVERY_TAGS]));
  const recoveryNote = `[Recuperação de Checkout] ${new Date().toISOString()} — ${reason}`;

  const leadPayload: any = {
    status: 'New',
    assigned_to: attendant?.id || null,
    tags: mergedTags,
    notes: lead?.notes ? `${lead.notes}\n${recoveryNote}` : recoveryNote,
    updated_at: new Date().toISOString()
  };

  if (lead) {
    const { error: updateError } = await supabase.from('SITE_Leads').update(leadPayload).eq('id', lead.id);
    if (updateError) {
      console.error('[Roleta] Falha ao atualizar lead:', updateError);
      return { recovered: false, detail: `lead update failed: ${updateError.message}` };
    }
  } else {
    const { error: insertError } = await supabase.from('SITE_Leads').insert([{
      ...leadPayload,
      name: enrollment.student_name || 'Lead Checkout',
      email: email || null,
      phone: phone || null,
      type: 'Course_Registration',
      origin: 'Recuperação de Checkout',
      created_at: new Date().toISOString()
    }]);
    if (insertError) {
      console.error('[Roleta] Falha ao criar lead de recuperação:', insertError);
      return { recovered: false, detail: `lead insert failed: ${insertError.message}` };
    }
  }

  console.log(`[Roleta] Lead recuperado → atendente ${attendant?.name || 'nenhum (sem elegíveis)'} | motivo: ${reason}`);
  return { recovered: true, detail: reason, assigned_to: attendant?.id || null };
}
