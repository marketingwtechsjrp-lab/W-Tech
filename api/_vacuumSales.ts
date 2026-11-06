import { findExistingLead } from '../lib/leadMatch.js';
import {
    VACUUM_CAMPAIGN,
    VACUUM_ITEM_NAME,
    documentType,
    isValidEmail,
    normalizeBrPhone,
    onlyDigits,
    roundCents,
    vacuumDeliveryDeadline,
} from '../lib/vacuumOffer.js';
import {
    VACUUM_MACHINE_ITEM,
    VACUUM_MAX_INSTALLMENTS,
    VACUUM_PAYMENTS,
    VACUUM_SELLERS,
    isVacuumSalePaid,
    vacuumManualPaymentLabel,
    type VacuumManualMeta,
    type VacuumPaymentId,
    type VacuumSeller,
} from '../lib/vacuumSales.js';
import { isPermissionGranted, requireSameOrigin, requireStaffAnyPermission, requireStaffPermission, type StaffSessionUser } from './_auth.js';
import { clearVacuumOfferCache, dateSP, firstName, isUuid, loadVacuumOffer } from './_vacuumPump.js';
import { brDate, sendVacuumOrderWhatsApp } from './_vacuumWhatsApp.js';

// Vendedor lança venda nova; alterar o que já foi lançado é só do gerente.
const LAUNCH_PERMISSIONS = ['campaign_sales_launch', 'campaign_sales_manage'] as const;

/**
 * Pedidos da promoção da Vacuum Pump e lançamento manual, quando o vendedor fecha fora do site.
 *
 * A venda manual entra em SITE_Sales com a mesma campanha da venda do site. Com isso ela já
 * conta no lote e no placar e dispara a comemoração do painel, sem caminho paralelo. O preço
 * pode ser negociado, mas o total é sempre somado aqui, nunca recebido do navegador.
 *
 * Só venda com `manual_sale` se altera por aqui: a do site tem pagamento real no Mercado Pago,
 * e o estorno de lá é que a cancela.
 */

const SALES = 'SITE_Sales';
const CHECKOUTS = 'SITE_CampaignCheckouts';
const MAX_SALES = 1000;
const MAX_PRICE = 200_000;
const SALE_COLUMNS = [
    'id', 'order_number', 'status', 'payment_status', 'payment_method', 'channel', 'total_value', 'shipping_cost',
    'customer_name', 'customer_phone', 'customer_email', 'seller_id', 'seller_name', 'sale_date', 'created_at', 'items',
    'delivery_cep', 'delivery_street', 'delivery_number', 'delivery_neighborhood', 'delivery_city', 'delivery_state',
    'estimated_delivery_date', 'notes', 'manual_sale',
].join(', ');

/** Etapas de carrinho em aberto: quem fechou com o vendedor não pode continuar na fila de ligação. */
const OPEN_CHECKOUT_STAGES = ['lead', 'address', 'payment', 'pix_pending', 'rejected', 'expired', 'contact', 'waitlist'];

async function loadSellers(supabase: any): Promise<VacuumSeller[]> {
    const { data, error } = await supabase
        .from('SITE_Users')
        .select('id, name')
        .eq('status', 'Active')
        .in('name', VACUUM_SELLERS.map((seller) => seller.name));
    if (error) throw new Error(`Falha ao ler a equipe: ${error.message}`);
    return VACUUM_SELLERS.flatMap((seller) => {
        const user = (data || []).find((row: any) => row.name === seller.name);
        return user ? [{ id: String(user.id), name: seller.name, label: seller.label }] : [];
    });
}

function text(value: unknown, max: number): string {
    return String(value ?? '').trim().slice(0, max);
}

function money(value: unknown): number | null {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= MAX_PRICE ? roundCents(number) : null;
}

interface SaleInput {
    seller: VacuumSeller;
    name: string;
    phone: string;
    email: string | null;
    document: string | null;
    items: { id: string; name: string; price: number; quantity: number }[];
    shippingCost: number;
    total: number;
    payment: VacuumPaymentId;
    installments: number;
    status: 'paid' | 'pending';
    saleDate: string;
    note: string | null;
    address: { cep: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
}

function parseSale(body: any, bumps: { id: string; name: string }[], sellers: VacuumSeller[], now: number): { error: string } | { value: SaleInput } {
    const seller = sellers.find((item) => item.id === body.seller_id);
    if (!seller) return { error: 'Escolha o vendedor que fechou a venda.' };

    const name = text(body.name, 120);
    if (name.length < 2) return { error: 'Informe o nome do cliente.' };
    const phone = normalizeBrPhone(body.phone);
    if (!phone) return { error: 'Informe o WhatsApp do cliente, com DDD.' };
    const email = text(body.email, 160).toLowerCase();
    if (email && !isValidEmail(email)) return { error: 'Confira o e-mail do cliente.' };
    const document = onlyDigits(body.document);
    if (document && !documentType(document)) return { error: 'Confira o CPF ou CNPJ do cliente.' };

    const machinePrice = money(body.machine_price);
    if (!machinePrice) return { error: 'Informe o valor da máquina.' };
    const items = [{ id: VACUUM_MACHINE_ITEM, name: VACUUM_ITEM_NAME, price: machinePrice, quantity: 1 }];
    // O nome sempre vem da oferta. Acessório desconhecido ou repetido é descartado.
    for (const bump of bumps) {
        const wanted = (Array.isArray(body.bumps) ? body.bumps : []).find((item: any) => item?.id === bump.id);
        if (!wanted) continue;
        const price = money(wanted.price);
        if (price === null) return { error: `Confira o valor de ${bump.name}.` };
        items.push({ id: bump.id, name: bump.name, price, quantity: 1 });
    }

    const shippingCost = money(body.shipping_cost ?? 0);
    if (shippingCost === null) return { error: 'Confira o valor do frete.' };

    const payment = VACUUM_PAYMENTS.find((item) => item.id === body.payment)?.id;
    if (!payment) return { error: 'Escolha a forma de pagamento.' };
    const rawInstallments = Math.floor(Number(body.installments));
    const installments = payment === 'credit' ? rawInstallments : 1;
    if (!(installments >= 1 && installments <= VACUUM_MAX_INSTALLMENTS)) return { error: `As parcelas vão de 1x a ${VACUUM_MAX_INSTALLMENTS}x.` };

    const status = body.status === 'pending' ? 'pending' : body.status === 'paid' ? 'paid' : null;
    if (!status) return { error: 'Diga se a venda já foi paga.' };

    const saleDate = text(body.sale_date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate) || Number.isNaN(Date.parse(`${saleDate}T12:00:00-03:00`))) return { error: 'Confira a data da venda.' };
    if (saleDate > dateSP(new Date(now))) return { error: 'A data da venda não pode estar no futuro.' };

    const cep = onlyDigits(body.address?.cep).slice(0, 8);
    if (cep && cep.length !== 8) return { error: 'Confira o CEP.' };

    return {
        value: {
            seller,
            name,
            phone,
            email: email || null,
            document: document || null,
            items,
            shippingCost,
            total: roundCents(items.reduce((sum, item) => sum + item.price, 0) + shippingCost),
            payment,
            installments,
            status,
            saleDate,
            note: text(body.note, 1000) || null,
            address: {
                cep,
                street: text(body.address?.street, 120),
                number: text(body.address?.number, 20),
                complement: text(body.address?.complement, 80),
                neighborhood: text(body.address?.neighborhood, 80),
                city: text(body.address?.city, 80),
                state: text(body.address?.state, 2).toUpperCase(),
            },
        },
    };
}

/** Colunas comuns a lançar e editar. CPF fica em `notes` também, como na venda do site. */
function saleColumns(input: SaleInput, launchedBy: string, nowIso: string) {
    const { address } = input;
    return {
        status: input.status,
        payment_status: input.status,
        payment_method: vacuumManualPaymentLabel(input.payment, input.installments),
        total_value: input.total,
        client_name: input.name,
        client_email: input.email,
        client_phone: input.phone,
        customer_name: input.name,
        customer_email: input.email,
        customer_phone: input.phone,
        seller_id: input.seller.id,
        seller_name: input.seller.name,
        sale_date: input.saleDate,
        sale_summary: input.items.map((item) => item.name).join(' + '),
        items: input.items,
        shipping_method: 'manual',
        shipping_cost: input.shippingCost,
        delivery_cep: address.cep || null,
        delivery_street: address.street || null,
        delivery_number: address.number || null,
        delivery_neighborhood: address.neighborhood || null,
        delivery_city: address.city || null,
        delivery_state: address.state || null,
        delivery_address: [address.street, address.number, address.complement, address.neighborhood, address.city, address.state].filter(Boolean).join(', ') || null,
        notes: [
            'Venda manual da Black Friday Vacuum Pump.',
            `CPF/CNPJ: ${input.document || 'não informado'}.`,
            `Lançada por ${launchedBy}.`,
            input.note ? `Obs.: ${input.note}` : '',
        ].filter(Boolean).join(' '),
        updated_at: nowIso,
    };
}

/** Quem é lançado precisa estar no CRM. Falha aqui não pode travar a venda. */
async function ensureLead(supabase: any, input: SaleInput, nowIso: string): Promise<any | null> {
    try {
        const existing = await findExistingLead<any>(supabase, { email: input.email, phone: input.phone });
        if (existing) return existing;
        const { data, error } = await supabase
            .from('SITE_Leads')
            .insert([{
                name: input.name,
                email: input.email,
                phone: input.phone,
                type: 'Contact_Form',
                status: 'New',
                context_id: 'Vacuum Pump Black Friday',
                origin: 'Venda manual Vacuum Pump',
                assigned_to: input.seller.id,
                tags: ['vacuum_bf', 'vacuum_bf_venda_manual'],
                created_at: nowIso,
                updated_at: nowIso,
            }])
            .select('*')
            .single();
        if (error) throw new Error(error.message);
        return data;
    } catch (err: any) {
        console.error('[Vacuum] Falha ao preparar a ficha do cliente (não-fatal):', err?.message);
        return null;
    }
}

/** Venda paga: a ficha vira cliente e a pessoa sai da recuperação de carrinho. */
async function closeCustomerFollowUps(
    supabase: any,
    sale: { id: string; total: number; orderNumber: string; phone: string; sellerId: string },
    lead: any | null,
    nowIso: string
): Promise<void> {
    try {
        if (lead) {
            const { error } = await supabase
                .from('SITE_Leads')
                .update({
                    status: 'Converted',
                    assigned_to: lead.assigned_to || sale.sellerId,
                    tags: Array.from(new Set([...(lead.tags || []), 'vacuum_bf', 'vacuum_bf_comprou', 'vacuum_bf_venda_manual'])),
                    conversion_value: sale.total,
                    conversion_type: 'Product_Purchase',
                    conversion_summary: `Vacuum Pump Black Friday, pedido ${sale.orderNumber}, venda manual.`,
                    updated_at: nowIso,
                })
                .eq('id', lead.id);
            if (error) console.error('[Vacuum] Falha ao converter lead (não-fatal):', error.message);

            const { error: taskError } = await supabase
                .from('SITE_Tasks')
                .update({ status: 'DONE' })
                .eq('lead_id', lead.id)
                .eq('status', 'TODO')
                .contains('tags', ['vacuum_bf']);
            if (taskError) console.error('[Vacuum] Falha ao concluir tarefas (não-fatal):', taskError.message);
        }

        // Sem isto a varredura do cron mandaria o vendedor ligar para quem já comprou.
        const { error: cartError } = await supabase
            .from(CHECKOUTS)
            .update({ stage: 'paid', sale_id: sale.id, payment_status: 'manual', paid_at: nowIso, updated_at: nowIso })
            .eq('campaign', VACUUM_CAMPAIGN)
            .eq('phone', sale.phone)
            .in('stage', OPEN_CHECKOUT_STAGES);
        if (cartError) console.error('[Vacuum] Falha ao fechar o carrinho (não-fatal):', cartError.message);
    } catch (err: any) {
        console.error('[Vacuum] Erro ao encerrar o acompanhamento (não-fatal):', err?.message);
    }
}

async function audit(supabase: any, staff: StaffSessionUser, details: string): Promise<void> {
    const { error } = await supabase.from('SITE_AuditLogs').insert({
        user_id: staff.id,
        user_name: staff.name || 'Usuário',
        action_type: 'MODIFICATION',
        screen: 'vacuum_orders',
        details,
    });
    if (error) console.error('[Vacuum] Falha na auditoria (não-fatal):', error.message);
}

export async function handleVacuumSalesList(supabase: any, req: any, res: any) {
    const staff = await requireStaffPermission(req, res, 'campaign_sales_view');
    if (!staff) return;

    const [{ state }, sellers, sales] = await Promise.all([
        loadVacuumOffer(supabase),
        loadSellers(supabase),
        supabase.from(SALES).select(SALE_COLUMNS).eq('campaign', VACUUM_CAMPAIGN).order('created_at', { ascending: false }).limit(MAX_SALES),
    ]);
    if (sales.error) {
        console.error('[Vacuum] Falha ao listar os pedidos:', sales.error.message);
        return res.status(500).json({ error: 'Não foi possível carregar os pedidos agora.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
        now: Date.now(),
        can_manage: isPermissionGranted(staff.permissions, 'campaign_sales_manage'),
        can_launch: LAUNCH_PERMISSIONS.some((key) => isPermissionGranted(staff.permissions, key)),
        offer: {
            phase: state.phase,
            price: state.price,
            remaining: state.remaining,
            machine_name: VACUUM_ITEM_NAME,
            bumps: state.bumps.map((bump) => ({ id: bump.id, name: bump.name, price: bump.price })),
        },
        sellers,
        sales: (sales.data || []).map((sale: any) => ({
            ...sale,
            total_value: Number(sale.total_value) || 0,
            shipping_cost: Number(sale.shipping_cost) || 0,
            items: Array.isArray(sale.items) ? sale.items : [],
        })),
    });
}

export async function handleVacuumSaleCreate(supabase: any, req: any, res: any) {
    if (!requireSameOrigin(req, res)) return;
    const staff = await requireStaffAnyPermission(req, res, LAUNCH_PERMISSIONS);
    if (!staff) return;

    const body = req.body || {};
    // O navegador gera o id ao abrir o formulário: clicar duas vezes não lança duas máquinas.
    if (!isUuid(body.id)) return res.status(400).json({ error: 'Abra o formulário de novo e tente outra vez.' });
    const { data: repeated, error: repeatedError } = await supabase.from(SALES).select('id, order_number').eq('id', body.id).maybeSingle();
    if (repeatedError) throw new Error(repeatedError.message);
    if (repeated) return res.status(200).json({ ok: true, sale_id: repeated.id, order_number: repeated.order_number });

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const { config, state } = await loadVacuumOffer(supabase, { fresh: true });
    const parsed = parseSale(body, config.bumps, await loadSellers(supabase), now);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    // Só o gerente confirma pagamento: o que o vendedor lança fica aguardando, fora do placar e do lote.
    const canConfirmPayment = isPermissionGranted(staff.permissions, 'campaign_sales_manage');
    const input: typeof parsed.value = canConfirmPayment ? parsed.value : { ...parsed.value, status: 'pending' };

    const lead = await ensureLead(supabase, input, nowIso);
    const orderNumber = `WT-VM${String(now).slice(-7)}${Math.floor(Math.random() * 100)}`;
    const manualSale: VacuumManualMeta = {
        payment: input.payment,
        installments: input.installments,
        document: input.document,
        complement: input.address.complement || null,
        note: input.note,
        launched_by: { id: staff.id, name: staff.name },
        launched_at: nowIso,
    };

    const deliveryDate = dateSP(vacuumDeliveryDeadline(config, state.phase, now));
    const { data: sale, error } = await supabase
        .from(SALES)
        .insert([{
            ...saleColumns(input, staff.name, nowIso),
            id: body.id,
            channel: 'Admin',
            shipping_status: 'pending',
            client_id: lead?.id || null,
            lead_id: lead?.id || null,
            order_number: orderNumber,
            estimated_delivery_date: deliveryDate,
            campaign: VACUUM_CAMPAIGN,
            manual_sale: manualSale,
            // Venda de outro dia entra no dia certo do placar; a de hoje fica com a hora real.
            ...(input.saleDate === dateSP(new Date(now)) ? {} : { created_at: `${input.saleDate}T12:00:00-03:00` }),
        }])
        .select('id, order_number')
        .single();
    if (error) {
        // 23505: o mesmo envio chegou duas vezes ao mesmo tempo.
        if (error.code === '23505') {
            const { data: winner } = await supabase.from(SALES).select('id, order_number').eq('id', body.id).maybeSingle();
            if (winner) return res.status(200).json({ ok: true, sale_id: winner.id, order_number: winner.order_number });
        }
        throw new Error(`Falha ao gravar a venda manual: ${error.message}`);
    }

    clearVacuumOfferCache();
    if (input.status === 'paid') {
        await closeCustomerFollowUps(supabase, { id: sale.id, total: input.total, orderNumber: sale.order_number, phone: input.phone, sellerId: input.seller.id }, lead, nowIso);
        void sendVacuumOrderWhatsApp(supabase, { orderNumber: sale.order_number, firstName: firstName(input.name), phone: input.phone, total: input.total, deadline: brDate(deliveryDate) });
    }
    await audit(supabase, staff, `Lançou a venda manual ${sale.order_number} para ${input.seller.name}, ${input.total.toFixed(2)} (${input.status}).`);
    console.log(`[Vacuum] Venda manual ${sale.order_number} lançada por ${staff.name}.`);
    return res.status(201).json({ ok: true, sale_id: sale.id, order_number: sale.order_number });
}

/** Carrega a venda e recusa o que não foi lançado à mão. Responde sozinho quando recusa. */
async function loadManualSale(supabase: any, id: unknown, res: any): Promise<any | null> {
    if (!isUuid(id)) {
        res.status(400).json({ error: 'Pedido inválido.' });
        return null;
    }
    const { data, error } = await supabase.from(SALES).select(SALE_COLUMNS).eq('id', id).eq('campaign', VACUUM_CAMPAIGN).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return null;
    }
    if (!data.manual_sale) {
        res.status(409).json({ error: 'Venda feita pelo site não se altera aqui: o pagamento está no Mercado Pago.' });
        return null;
    }
    return data;
}

export async function handleVacuumSaleUpdate(supabase: any, req: any, res: any) {
    if (!requireSameOrigin(req, res)) return;
    const staff = await requireStaffPermission(req, res, 'campaign_sales_manage');
    if (!staff) return;

    const body = req.body || {};
    const current = await loadManualSale(supabase, body.id, res);
    if (!current) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const { config } = await loadVacuumOffer(supabase);
    const parsed = parseSale(body, config.bumps, await loadSellers(supabase), now);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const input = parsed.value;

    const columns: Record<string, unknown> = saleColumns(input, current.manual_sale.launched_by?.name || staff.name, nowIso);
    // Pedido já em produção ou enviado: editar os dados não pode voltar a etapa dele.
    if (['producing', 'shipped', 'delivered'].includes(current.status)) {
        delete columns.status;
        delete columns.payment_status;
    }
    if (input.saleDate !== current.sale_date) {
        columns.created_at = input.saleDate === dateSP(new Date(now)) ? nowIso : `${input.saleDate}T12:00:00-03:00`;
    }
    columns.manual_sale = {
        ...current.manual_sale,
        payment: input.payment,
        installments: input.installments,
        document: input.document,
        complement: input.address.complement || null,
        note: input.note,
        updated_by: { id: staff.id, name: staff.name },
        updated_at: nowIso,
    };

    const { error } = await supabase.from(SALES).update(columns).eq('id', current.id);
    if (error) throw new Error(`Falha ao editar a venda manual: ${error.message}`);

    clearVacuumOfferCache();
    const becamePaid = !isVacuumSalePaid(current.status) && columns.status === 'paid';
    if (becamePaid) {
        const lead = await ensureLead(supabase, input, nowIso);
        await closeCustomerFollowUps(supabase, { id: current.id, total: input.total, orderNumber: current.order_number, phone: input.phone, sellerId: input.seller.id }, lead, nowIso);
        void sendVacuumOrderWhatsApp(supabase, { orderNumber: current.order_number, firstName: firstName(input.name), phone: input.phone, total: input.total, deadline: brDate(current.estimated_delivery_date) });
    }
    await audit(supabase, staff, `Editou a venda manual ${current.order_number}: ${input.seller.name}, ${input.total.toFixed(2)} (${input.status}).`);
    return res.status(200).json({ ok: true, sale_id: current.id, order_number: current.order_number });
}

export async function handleVacuumSaleStatus(supabase: any, req: any, res: any) {
    if (!requireSameOrigin(req, res)) return;
    const staff = await requireStaffPermission(req, res, 'campaign_sales_manage');
    if (!staff) return;

    const body = req.body || {};
    if (!['paid', 'pending', 'cancelled'].includes(body.status)) return res.status(400).json({ error: 'Situação inválida.' });
    const current = await loadManualSale(supabase, body.id, res);
    if (!current) return;
    if (['shipped', 'delivered'].includes(current.status) && body.status !== 'paid') {
        return res.status(409).json({ error: 'Este pedido já foi enviado. Trate o cancelamento pela tela de Pedidos.' });
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase
        .from(SALES)
        .update({ status: body.status, payment_status: body.status, updated_at: nowIso })
        .eq('id', current.id);
    if (error) throw new Error(`Falha ao mudar a situação: ${error.message}`);

    clearVacuumOfferCache();
    if (body.status === 'paid' && !isVacuumSalePaid(current.status)) {
        const phone = normalizeBrPhone(current.customer_phone);
        const lead = await findExistingLead<any>(supabase, { email: current.customer_email, phone: current.customer_phone }).catch(() => null);
        if (phone) {
            await closeCustomerFollowUps(
                supabase,
                { id: current.id, total: Number(current.total_value) || 0, orderNumber: current.order_number, phone, sellerId: current.seller_id },
                lead,
                nowIso
            );
        }
        void sendVacuumOrderWhatsApp(supabase, {
            orderNumber: current.order_number,
            firstName: firstName(current.customer_name),
            phone: current.customer_phone,
            total: Number(current.total_value) || 0,
            deadline: brDate(current.estimated_delivery_date),
        });
    }
    await audit(supabase, staff, `Mudou a venda manual ${current.order_number} de ${current.status} para ${body.status}.`);
    return res.status(200).json({ ok: true });
}

