import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Fluxo de dinheiro da Vacuum Pump sem tocar em banco nem em Mercado Pago: o esbuild
// troca o cliente do Supabase e o nodemailer por versões de mentira, e o fetch do código
// empacotado responde como a API do Mercado Pago. As regras de preço e os handlers são os reais.
//
// Variáveis de ambiente e fetch entram só no bundle (`define`), nunca em process.env ou
// globalThis.fetch: o Playwright também carrega este arquivo, e alteração global vazaria
// para os outros specs da mesma execução.
const CRON_SECRET = 'x'.repeat(40);
const envAntes = { ...process.env };
const fetchAntes = globalThis.fetch;

const stubs = {
    // Proxy porque o _auth.ts guarda o primeiro cliente criado, e cada teste usa um banco novo.
    '@supabase/supabase-js': 'export const createClient = () => new Proxy({}, { get: (_t, prop) => globalThis.__vacuumFakeSupabase[prop] });',
    nodemailer: 'export default { createTransport: () => ({ sendMail: async () => ({}) }) };',
};

const { outputFiles } = await build({
    stdin: {
        contents: `
            export { default as apiHandler } from './api/vacuum-pump.ts';
            export { default as webhookHandler } from './api/mercadopago-webhook.ts';
            export * from './api/_vacuumPump.ts';
            export * from './lib/vacuumOffer.ts';
        `,
        resolveDir: fileURLToPath(new URL('..', import.meta.url)),
        loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    define: {
        'process.env.VITE_SUPABASE_URL': JSON.stringify('http://fake'),
        'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify('fake'),
        'process.env.CRON_SECRET': JSON.stringify(CRON_SECRET),
        'process.env.MERCADOPAGO_WEBHOOK_SECRET': 'undefined',
        fetch: 'globalThis.__vacuumFakeFetch',
    },
    plugins: [
        {
            name: 'stubs',
            setup(b) {
                b.onResolve({ filter: /^(@supabase\/supabase-js|nodemailer)$/ }, (args) => ({ path: args.path, namespace: 'stub' }));
                b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({ contents: stubs[args.path], loader: 'js' }));
            },
        },
    ],
});

const dir = mkdtempSync(path.join(tmpdir(), 'vacuum-test-'));
const file = path.join(dir, 'bundle.mjs');
writeFileSync(file, outputFiles[0].text);

class FakeQuery {
    constructor(db, table) {
        Object.assign(this, { db, table, op: 'select', filters: [], rows: null, patch: null, one: false, head: false, wantCount: false, max: null, sortBy: null });
    }
    select(_columns, options = {}) {
        if (options.head) this.head = true;
        if (options.count) this.wantCount = true;
        return this;
    }
    insert(rows) { this.op = 'insert'; this.rows = rows; return this; }
    update(patch) { this.op = 'update'; this.patch = patch; return this; }
    upsert(row) { this.op = 'upsert'; this.rows = [row]; return this; }
    eq(column, value) { this.filters.push((r) => r[column] === value); return this; }
    neq(column, value) { this.filters.push((r) => r[column] !== value); return this; }
    is(column, value) { this.filters.push((r) => (r[column] ?? null) === value); return this; }
    lt(column, value) { this.filters.push((r) => r[column] < value); return this; }
    gte(column, value) { this.filters.push((r) => r[column] >= value); return this; }
    in(column, values) { this.filters.push((r) => values.includes(r[column])); return this; }
    contains(column, values) { this.filters.push((r) => values.every((v) => (r[column] || []).includes(v))); return this; }
    ilike(column, pattern) {
        const regex = new RegExp(`^${pattern.replace(/\\/g, '').replace(/%/g, '.*')}$`, 'i');
        this.filters.push((r) => regex.test(String(r[column] ?? '')));
        return this;
    }
    order(column, options = {}) { this.sortBy = { column, ascending: options.ascending !== false }; return this; }
    limit(n) { this.max = n; return this; }
    single() { this.one = 'single'; return this; }
    maybeSingle() { this.one = 'maybe'; return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }
    run() {
        const table = (this.db.tables[this.table] ||= []);
        const matches = () => table.filter((row) => this.filters.every((filter) => filter(row)));
        let rows;
        if (this.op === 'insert') {
            rows = [];
            for (const raw of this.rows) {
                if (this.table === 'SITE_Sales' && raw.mp_payment_id && table.some((r) => r.mp_payment_id === raw.mp_payment_id)) {
                    return { data: null, error: { code: '23505', message: 'duplicate key' } };
                }
                const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), followup_at: null, payment_attempts: 0, ...raw };
                table.push(row);
                rows.push(row);
            }
        } else if (this.op === 'upsert') {
            const [raw] = this.rows;
            const found = table.find((r) => r.key === raw.key);
            if (found) Object.assign(found, raw);
            else table.push({ ...raw });
            rows = [raw];
        } else if (this.op === 'update') {
            rows = matches();
            rows.forEach((row) => Object.assign(row, this.patch));
        } else {
            rows = matches();
            if (this.sortBy) {
                const { column, ascending } = this.sortBy;
                rows = [...rows].sort((a, b) => (String(a[column]) < String(b[column]) ? -1 : 1) * (ascending ? 1 : -1));
            }
            if (this.max) rows = rows.slice(0, this.max);
        }
        if (this.head) return { data: null, count: rows.length, error: null };
        if (this.one) {
            if (rows.length === 0) return { data: null, error: this.one === 'single' ? { code: 'PGRST116', message: 'none' } : null };
            return { data: rows[0], error: null };
        }
        return { data: rows, count: rows.length, error: null };
    }
}

function fakeDb(tables = {}) {
    const db = { tables, from: (table) => new FakeQuery(db, table) };
    globalThis.__vacuumFakeSupabase = db;
    return db;
}

let ipCounter = 0;
async function call(handler, { method = 'GET', query = {}, body = {}, headers = {} } = {}) {
    ipCounter += 1;
    const req = { method, query, body, headers: { 'x-real-ip': `200.1.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`, ...headers }, socket: {} };
    const out = { status: null, json: null, headers: {} };
    const res = {
        setHeader(key, value) { out.headers[key] = value; },
        status(code) { out.status = code; return this; },
        json(data) { out.json = data; return this; },
    };
    await handler(req, res);
    return out;
}

const DAY = 86_400_000;
const liveConfig = (over = {}) =>
    JSON.stringify({ starts_at: new Date(Date.now() - DAY).toISOString(), ends_at: new Date(Date.now() + DAY).toISOString(), ...over });

const lib = await import(pathToFileURL(file).href);

function resetOffer() {
    lib.clearVacuumOfferCache();
}

function seed(over = {}) {
    resetOffer();
    return fakeDb({
        SITE_Config: [
            { key: 'vacuum_pump_offer', value: over.config || liveConfig() },
            { key: 'mercadopago_public_key', value: 'APP_USR-public-key' },
            { key: 'mercadopago_access_token', value: 'APP_USR-secret-token' },
            { key: 'brevo_enabled', value: 'false' },
        ],
        SITE_Users: [
            { id: '11111111-1111-4111-8111-111111111111', name: 'Vendedor A', status: 'Active', receives_leads: true },
            { id: '22222222-2222-4222-8222-222222222222', name: 'Vendedor B', status: 'Active', receives_leads: true },
        ],
        SITE_Leads: over.leads || [],
        SITE_Sales: [],
        SITE_Tasks: over.tasks || [],
        SITE_Transactions: [],
        SITE_CampaignCheckouts: [],
        SITE_EmailLogs: [],
    });
}

function mockMercadoPago(respond) {
    const calls = [];
    globalThis.__vacuumFakeFetch = async (url, init = {}) => {
        const body = init.body ? JSON.parse(init.body) : null;
        calls.push({ url: String(url), method: init.method || 'GET', body, headers: init.headers || {} });
        const { status = 200, json } = respond(String(url), body);
        return { ok: status < 300, status, statusText: String(status), json: async () => json, text: async () => JSON.stringify(json) };
    };
    return calls;
}

const CARD_FORM = { payment_method_id: 'visa', token: 'tok_123', installments: 10, issuer_id: '25', payer: { email: 'a@b.com', identification: { type: 'CPF', number: '52998224725' } } };
const VALID_ADDRESS = { cep: '15000-000', street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Rio Preto', state: 'SP' };

async function startCheckout({ phone = '17 99999-0001', email = 'cliente@oficina.com' } = {}) {
    const lead = await call(lib.apiHandler, {
        method: 'POST',
        query: { action: 'lead' },
        body: { name: 'João da Silva', phone, email, source: 'checkout', tracking: { utm_source: 'whatsapp', hacker: 'x' } },
    });
    assert.equal(lead.status, 200);
    const save = await call(lib.apiHandler, {
        method: 'POST',
        query: { action: 'save' },
        body: { checkout_id: lead.json.checkout_id, stage: 'payment', document: '529.982.247-25', address: VALID_ADDRESS },
    });
    assert.equal(save.status, 200);
    return lead.json.checkout_id;
}

const pay = (checkoutId, over = {}) =>
    call(lib.apiHandler, {
        method: 'POST',
        query: { action: 'pay' },
        body: { checkout_id: checkoutId, bumps: [], expected_total: 7990, attempt_key: 'k1', form_data: CARD_FORM, ...over },
    });

test.after(() => {
    rmSync(dir, { recursive: true, force: true });
    delete globalThis.__vacuumFakeSupabase;
    delete globalThis.__vacuumFakeFetch;
});

test('oferta: pré-venda vende a 10x de R$ 799 e depois sobe para 10x de R$ 999', () => {
    const config = lib.resolveVacuumConfig(liveConfig());
    const state = lib.getVacuumOfferState(config, 0, Date.now());
    assert.equal(state.phase, 'presale');
    assert.equal(state.price, 7990);
    assert.equal(state.compare_at, 9990);
    assert.equal(state.installments, 10);
    assert.equal(state.installment_value, 799);
    assert.equal(state.remaining, 50);

    const after = lib.getVacuumOfferState(config, 0, Date.now() + 2 * DAY);
    assert.equal(after.phase, 'regular');
    assert.equal(after.end_reason, 'expired');
    assert.equal(after.price, 9990);
    assert.equal(after.compare_at, null);
    assert.equal(after.installment_value, 999);
    assert.equal(after.installments, 10, 'continua em 10x depois da pré-venda');
});

test('oferta: antes de abrir fica em "soon"; lote esgotado encerra antes do prazo', () => {
    const config = lib.resolveVacuumConfig(liveConfig({ sold_offset: 3 }));
    assert.equal(lib.getVacuumOfferState(config, 0, Date.now() - 2 * DAY).phase, 'soon');
    assert.equal(lib.getVacuumOfferState(config, 10, Date.now()).remaining, 37, 'venda fora do site também desconta');
    const soldOut = lib.getVacuumOfferState(config, 47, Date.now());
    assert.equal(soldOut.phase, 'regular');
    assert.equal(soldOut.end_reason, 'sold_out');
    assert.equal(soldOut.price, 9990);
});

test('oferta: JSON quebrado ou valor inválido cai no padrão, sem derrubar a página', () => {
    const broken = lib.resolveVacuumConfig('{isso nao e json');
    assert.equal(broken.presale_price, 7990);
    const invalid = lib.resolveVacuumConfig(JSON.stringify({ presale_price: -1, lot_size: 'muitos', starts_at: 'ontem', ends_at: '2020-01-01T00:00:00Z' }));
    assert.equal(invalid.presale_price, 7990);
    assert.equal(invalid.lot_size, 50);
    assert.equal(invalid.starts_at, lib.VACUUM_DEFAULT_CONFIG.starts_at);
    assert.equal(invalid.ends_at, lib.VACUUM_DEFAULT_CONFIG.ends_at);
});

test('acessórios: a ficha chega até a página e a configuração pode trocar', () => {
    const state = lib.getVacuumOfferState(lib.resolveVacuumConfig(liveConfig()), 0, Date.now());
    assert.ok(state.bumps.every((bump) => bump.details.length > 0));
    const changed = lib.resolveVacuumConfig(liveConfig({ bumps: [{ id: 'kit_adaptador', details: ['Só esta linha', 7, ' '] }] }));
    assert.deepEqual(changed.bumps.find((bump) => bump.id === 'kit_adaptador').details, ['Só esta linha']);
});

test('urgência: conta dias de calendário e usa o horário configurado', () => {
    const ends = '2026-11-13T23:59:59-03:00';
    assert.equal(lib.vacuumUrgencyLabel(ends, Date.parse('2026-11-10T10:00:00-03:00')), 'Faltam 3 dias');
    assert.equal(lib.vacuumUrgencyLabel(ends, Date.parse('2026-11-12T22:00:00-03:00')), 'Termina amanhã');
    assert.equal(lib.vacuumUrgencyLabel(ends, Date.parse('2026-11-13T08:00:00-03:00')), 'Último dia: termina hoje às 23h59');
    assert.equal(lib.vacuumUrgencyLabel(ends, Date.parse('2026-11-14T00:00:00-03:00')), 'Pré-venda encerrada');
});

test('carrinho: order bump soma na parcela; id desconhecido ou repetido é ignorado', () => {
    const state = lib.getVacuumOfferState(lib.resolveVacuumConfig(liveConfig()), 0, Date.now());
    const cart = lib.computeVacuumCart(state, ['borbulhador', 'borbulhador', 'nao-existe']);
    assert.equal(cart.total, 8689);
    assert.equal(cart.installment_value, 868.9);
    assert.deepEqual(cart.bump_ids, ['borbulhador']);
    assert.equal(lib.computeVacuumCart(state, ['borbulhador', 'kit_adaptador']).total, 9729);
    assert.equal(lib.computeVacuumCart(state, 'qualquer coisa').total, 7990);
});

test('validação: CPF, CNPJ e WhatsApp', () => {
    assert.equal(lib.documentType('529.982.247-25'), 'CPF');
    assert.equal(lib.documentType('111.111.111-11'), null);
    assert.equal(lib.documentType('11.222.333/0001-81'), 'CNPJ');
    assert.equal(lib.documentType('11.222.333/0001-00'), null);
    assert.equal(lib.normalizeBrPhone('(17) 99999-0001'), '17999990001');
    assert.equal(lib.normalizeBrPhone('5517999990001'), '17999990001');
    assert.equal(lib.normalizeBrPhone('123'), null);
});

test('API offer: entrega a chave pública e nunca o token', async () => {
    seed();
    const res = await call(lib.apiHandler, { query: { action: 'offer' } });
    assert.equal(res.status, 200);
    assert.equal(res.json.mp_public_key, 'APP_USR-public-key');
    assert.ok(!JSON.stringify(res.json).includes('secret-token'));
});

test('lead: grava no CRM antes do pagamento, sem coluna estranha e sem duplicar checkout', async () => {
    const db = seed();
    const id1 = await startCheckout();
    assert.equal(db.tables.SITE_Leads.length, 1);
    const lead = db.tables.SITE_Leads[0];
    assert.equal(lead.status, 'New');
    assert.ok(lead.tags.includes('vacuum_bf_checkout'));
    assert.equal(lead.utm_source, 'whatsapp');
    assert.equal(lead.hacker, undefined);

    const again = await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'João da Silva', phone: '17999990001', email: 'cliente@oficina.com', source: 'checkout' } });
    assert.equal(again.json.checkout_id, id1);
    assert.equal(db.tables.SITE_CampaignCheckouts.length, 1);
    assert.equal(db.tables.SITE_Leads.length, 1);
});

test('lead: cliente antigo ganho não é rebaixado; perdido volta para o funil', async () => {
    const db = seed({
        leads: [
            { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Ganho', phone: '17999990002', email: 'g@x.com', status: 'Converted', tags: ['antigo'] },
            { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'Perdido', phone: '17999990003', email: 'p@x.com', status: 'Rejected', tags: [] },
        ],
    });
    await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Ganho', phone: '17999990002', email: 'g@x.com', source: 'checkout' } });
    await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Perdido', phone: '17999990003', email: 'p@x.com', source: 'checkout' } });
    assert.equal(db.tables.SITE_Leads[0].status, 'Converted');
    assert.ok(db.tables.SITE_Leads[0].tags.includes('antigo'));
    assert.equal(db.tables.SITE_Leads[1].status, 'New');
});

test('pagamento: adulterar o total não passa, e o valor enviado ao Mercado Pago é o do servidor', async () => {
    seed();
    const calls = mockMercadoPago(() => ({ json: { id: 900, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 8489 } }));
    const id = await startCheckout();

    const tampered = await pay(id, { expected_total: 1 });
    assert.equal(tampered.status, 409);
    assert.equal(tampered.json.code, 'price_changed');
    assert.equal(calls.length, 0, 'nem chega ao Mercado Pago');

    const ok = await pay(id, { bumps: ['borbulhador'], expected_total: 8689, form_data: { ...CARD_FORM, transaction_amount: 1 } });
    assert.equal(ok.status, 200);
    const sent = calls.at(-1);
    assert.equal(sent.body.transaction_amount, 8689, 'ignora o valor do navegador');
    assert.equal(sent.body.external_reference, `vacuum:${id}`);
    assert.equal(sent.body.notification_url, 'https://w-techbrasil.com.br/api/mercadopago-webhook');
    assert.ok(sent.headers['X-Idempotency-Key'].includes(id));
    assert.equal(sent.headers.Authorization, 'Bearer APP_USR-secret-token');
});

test('pagamento: acima de 10x é recusado e pré-venda fechada não vende', async () => {
    seed();
    const calls = mockMercadoPago(() => ({ json: {} }));
    const id = await startCheckout();
    const twelve = await pay(id, { form_data: { ...CARD_FORM, installments: 12 } });
    assert.equal(twelve.status, 400);
    assert.equal(calls.length, 0);

    seed({ config: liveConfig({ starts_at: new Date(Date.now() + DAY).toISOString(), ends_at: new Date(Date.now() + 2 * DAY).toISOString() }) });
    const id2 = await startCheckout();
    const closed = await pay(id2);
    assert.equal(closed.status, 409);
    assert.equal(closed.json.code, 'not_open');
});

test('pagamento: quem chega com a página antiga depois do prazo paga o preço novo, não o antigo', async () => {
    seed({ config: liveConfig({ ends_at: new Date(Date.now() - 1000).toISOString(), starts_at: new Date(Date.now() - DAY).toISOString() }) });
    mockMercadoPago(() => ({ json: {} }));
    const id = await startCheckout();
    const stale = await pay(id, { expected_total: 7990 });
    assert.equal(stale.status, 409);
    assert.equal(stale.json.code, 'price_changed');
    assert.equal(stale.json.total, 9990);
});

test('aprovado: grava uma venda só, mesmo com o webhook chegando depois, e desce o lote', async () => {
    const db = seed();
    const payment = { id: 901, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago((url) => {
        if (url.includes('/v1/payments/901')) return { json: { ...payment, external_reference: db.tables.SITE_CampaignCheckouts[0].id ? `vacuum:${db.tables.SITE_CampaignCheckouts[0].id}` : '' } };
        return { json: payment };
    });
    const id = await startCheckout();
    const res = await pay(id);
    assert.equal(res.json.stage, 'paid');
    assert.ok(res.json.order_number.startsWith('WT-VP'));

    assert.equal(db.tables.SITE_Sales.length, 1);
    const sale = db.tables.SITE_Sales[0];
    assert.equal(sale.status, 'paid');
    assert.equal(sale.channel, 'Site');
    assert.equal(sale.total_value, 7990);
    assert.equal(sale.mp_payment_id, '901');
    assert.equal(sale.campaign, 'vacuum_pump_bf_2026');
    assert.equal(sale.delivery_city, 'Rio Preto');
    assert.equal(sale.payment_method, 'Mercado Pago - Cartão 10x');
    assert.equal(db.tables.SITE_Transactions.length, 1);
    assert.equal(db.tables.SITE_Leads[0].status, 'Converted');
    // SITE_Leads tem leitura pública: CPF e endereço não podem parar lá.
    assert.equal(db.tables.SITE_Leads[0].cpf, undefined);
    assert.equal(db.tables.SITE_Leads[0].address_street, undefined);
    assert.equal(db.tables.SITE_Leads[0].zip_code, undefined);
    assert.ok(sale.notes.includes('52998224725'), 'o pedido guarda o documento para a nota fiscal');

    const hook = await call(lib.webhookHandler, { method: 'POST', query: {}, body: { action: 'payment.updated', data: { id: '901' } } });
    assert.equal(hook.status, 200);
    assert.equal(db.tables.SITE_Sales.length, 1, 'webhook repetido não duplica');
    assert.equal(db.tables.SITE_Transactions.length, 1);

    resetOffer();
    const offer = await call(lib.apiHandler, { query: { action: 'offer' } });
    assert.equal(offer.json.sold, 1);
    assert.equal(offer.json.remaining, 49);
});

test('corrida: duas confirmações simultâneas do mesmo pagamento geram uma venda só', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: {} }));
    const id = await startCheckout();
    const checkout = db.tables.SITE_CampaignCheckouts.find((c) => c.id === id);
    Object.assign(checkout, { items: [{ id: 'vacuum_pump_standard', name: 'Vacuum', price: 7990 }], amount: 7990 });
    const payment = { id: 902, status: 'approved', installments: 1, payment_method_id: 'pix', transaction_amount: 7990 };
    const [a, b] = await Promise.all([lib.finalizeVacuumPayment(db, checkout, payment), lib.finalizeVacuumPayment(db, checkout, payment)]);
    assert.equal(db.tables.SITE_Sales.length, 1);
    assert.equal(a.saleId, b.saleId);
});

test('Pix: devolve o QR, não gera outro à toa e confirma pelo webhook', async () => {
    const db = seed();
    const pixPayment = {
        id: 903,
        status: 'pending',
        status_detail: 'pending_waiting_transfer',
        payment_method_id: 'pix',
        date_of_expiration: new Date(Date.now() + 1_800_000).toISOString(),
        point_of_interaction: { transaction_data: { qr_code: 'PIXCOPIAECOLA', qr_code_base64: 'QkFTRTY0' } },
    };
    const calls = mockMercadoPago(() => ({ json: pixPayment }));
    const id = await startCheckout();
    const form = { payment_method_id: 'pix', payer: { email: 'a@b.com' } };

    const first = await pay(id, { form_data: form });
    assert.equal(first.json.stage, 'pix_pending');
    assert.equal(first.json.pix.qr_code, 'PIXCOPIAECOLA');
    assert.equal(calls.at(-1).body.installments, 1);
    assert.ok(calls.at(-1).body.date_of_expiration.endsWith('-03:00'));
    assert.equal(db.tables.SITE_Sales.length, 0, 'Pix não pago não é venda');

    const before = calls.length;
    const second = await pay(id, { form_data: form, attempt_key: 'k2' });
    assert.equal(second.json.pix.qr_code, 'PIXCOPIAECOLA');
    assert.equal(calls.length, before, 'reaproveita o código válido');

    const paid = { ...pixPayment, status: 'approved', status_detail: 'accredited', installments: 1, transaction_amount: 7990, external_reference: `vacuum:${id}` };
    mockMercadoPago(() => ({ json: paid }));
    const status = await call(lib.apiHandler, { query: { action: 'status', id } });
    assert.equal(status.json.stage, 'paid', 'a consulta de status confirma mesmo sem webhook');
    assert.equal(db.tables.SITE_Sales[0].payment_method, 'Mercado Pago - Pix');
    assert.ok(!('pix' in status.json), 'não expõe QR depois de pago');
});

test('Pix: ao gerar, manda o pedido com o código por e-mail, uma vez só', async () => {
    const db = seed();
    db.tables.SITE_Config.push(
        { key: 'brevo_enabled', value: 'true' },
        { key: 'brevo_smtp_login', value: 'login' },
        { key: 'brevo_smtp_key', value: 'chave' },
        { key: 'brevo_sender_email', value: 'contato@w-tech.test' }
    );
    db.tables.SITE_EmailLogs = [];
    mockMercadoPago(() => ({
        json: {
            id: 910,
            status: 'pending',
            status_detail: 'pending_waiting_transfer',
            payment_method_id: 'pix',
            date_of_expiration: new Date(Date.now() + 1_800_000).toISOString(),
            point_of_interaction: { transaction_data: { qr_code: 'PIXCOPIAECOLA', qr_code_base64: 'QkFTRTY0' } },
        },
    }));
    const id = await startCheckout();
    const form = { payment_method_id: 'pix' };

    await pay(id, { form_data: form });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const pixEmails = () => db.tables.SITE_EmailLogs.filter((row) => row.type === 'vacuum_pump_pix');
    assert.equal(pixEmails().length, 1, 'pedido recebido vai por e-mail');
    assert.match(pixEmails()[0].subject, /falta pagar o Pix/);
    assert.equal(pixEmails()[0].status, 'Sent');

    await pay(id, { form_data: form, attempt_key: 'k2' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(pixEmails().length, 1, 'reaproveitar o código não reenvia o e-mail');
});

test('Pix: gerado sem e-mail do comprador não quebra o pagamento', async () => {
    const db = seed();
    mockMercadoPago(() => ({
        json: {
            id: 911,
            status: 'pending',
            payment_method_id: 'pix',
            date_of_expiration: new Date(Date.now() + 1_800_000).toISOString(),
            point_of_interaction: { transaction_data: { qr_code: 'PIXCOPIAECOLA', qr_code_base64: 'QkFTRTY0' } },
        },
    }));
    const id = await startCheckout();
    db.tables.SITE_CampaignCheckouts.find((row) => row.id === id).email = null;
    const result = await pay(id, { form_data: { payment_method_id: 'pix' } });
    assert.equal(result.json.stage, 'pix_pending');
});

test('Pix aberto: trocar para o cartão cancela o código antigo antes de cobrar', async () => {
    const db = seed();
    const calls = mockMercadoPago((_url, body) => {
        if (body?.status === 'cancelled') return { json: { id: 920, status: 'cancelled' } };
        if (body?.payment_method_id === 'pix') {
            return {
                json: {
                    id: 920,
                    status: 'pending',
                    payment_method_id: 'pix',
                    date_of_expiration: new Date(Date.now() + 1_800_000).toISOString(),
                    point_of_interaction: { transaction_data: { qr_code: 'PIXANTIGO', qr_code_base64: 'QkFTRTY0' } },
                },
            };
        }
        return { json: { id: 921, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } };
    });
    const id = await startCheckout();
    await pay(id, { form_data: { payment_method_id: 'pix' } });
    assert.equal(db.tables.SITE_CampaignCheckouts.find((row) => row.id === id).mp_payment_id, '920');

    const result = await pay(id, { form_data: CARD_FORM, attempt_key: 'cartao' });
    assert.equal(result.json.stage, 'paid');
    const order = calls.map((call) => `${call.method} ${call.url.split('/v1/')[1]?.split('?')[0]}`);
    const cancel = order.indexOf('PUT payments/920');
    assert.ok(cancel > 0, 'cancelou o Pix antigo');
    assert.ok(cancel < order.lastIndexOf('POST payments'), 'cancela antes de criar a cobrança nova');
    assert.equal(calls[cancel].body.status, 'cancelled');
    assert.equal(db.tables.SITE_Sales.length, 1, 'uma venda só');

    // O aviso do Pix cancelado chega depois e não pode mexer na compra paga.
    const late = await lib.handleVacuumPaymentEvent(db, { id: 920, status: 'cancelled', external_reference: `vacuum:${id}` });
    assert.equal(db.tables.SITE_Sales.length, 1);
    assert.equal(db.tables.SITE_CampaignCheckouts.find((row) => row.id === id).stage, 'paid', `continua pago: ${JSON.stringify(late)}`);
});

test('Pix aberto: falha ao cancelar o código antigo não impede a compra', async () => {
    const db = seed();
    mockMercadoPago((_url, body) => {
        if (body?.status === 'cancelled') return { status: 500, json: { message: 'erro' } };
        if (body?.payment_method_id === 'pix') {
            return {
                json: {
                    id: 930,
                    status: 'pending',
                    payment_method_id: 'pix',
                    date_of_expiration: new Date(Date.now() + 1_800_000).toISOString(),
                    point_of_interaction: { transaction_data: { qr_code: 'PIXANTIGO', qr_code_base64: 'QkFTRTY0' } },
                },
            };
        }
        return { json: { id: 931, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } };
    });
    const id = await startCheckout();
    await pay(id, { form_data: { payment_method_id: 'pix' } });
    const result = await pay(id, { form_data: CARD_FORM, attempt_key: 'cartao' });
    assert.equal(result.json.stage, 'paid');
    assert.equal(db.tables.SITE_Sales.length, 1);
});

test('recusado: mensagem clara, sem venda, e vendedor recebe em 10 minutos', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: { id: 904, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' } }));
    const id = await startCheckout();
    const res = await pay(id);
    assert.equal(res.json.stage, 'rejected');
    assert.match(res.json.message, /limite/);
    assert.equal(db.tables.SITE_Sales.length, 0);

    const checkout = db.tables.SITE_CampaignCheckouts[0];
    checkout.updated_at = new Date(Date.now() - 11 * 60_000).toISOString();
    const swept = await lib.sweepVacuumAbandoned(db);
    assert.equal(swept.assigned, 1);
    assert.equal(db.tables.SITE_Tasks[0].priority, 'URGENT');
    assert.match(db.tables.SITE_Tasks[0].description, /Cartão recusado/);
});

test('varredura: só depois de 30 min, uma vez, com responsável e tarefa; cliente ganho continua ganho', async () => {
    const db = seed({
        leads: [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Antigo', phone: '17999990009', email: 'antigo@x.com', status: 'Converted', tags: [] }],
    });
    await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Antigo Cliente', phone: '17999990009', email: 'antigo@x.com', source: 'checkout' } });

    assert.equal((await lib.sweepVacuumAbandoned(db)).assigned, 0, 'recente ainda não vai');
    const checkout = db.tables.SITE_CampaignCheckouts[0];
    checkout.updated_at = new Date(Date.now() - 31 * 60_000).toISOString();

    assert.equal((await lib.sweepVacuumAbandoned(db)).assigned, 1);
    assert.equal((await lib.sweepVacuumAbandoned(db)).assigned, 0, 'não entrega duas vezes');
    assert.equal(db.tables.SITE_Tasks.length, 1);
    const task = db.tables.SITE_Tasks[0];
    assert.ok(task.assigned_to);
    assert.equal(task.lead_id, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    const lead = db.tables.SITE_Leads[0];
    assert.equal(lead.status, 'Converted', 'nunca rebaixa');
    assert.equal(lead.assigned_to, task.assigned_to);
    assert.ok(lead.tags.includes('vacuum_bf_chamar'));
});

test('varredura: mantém o vendedor que já cuida do cliente', async () => {
    const db = seed({
        leads: [{ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Da Carteira', phone: '17999990010', email: 'c@x.com', status: 'Contacted', tags: [], assigned_to: '22222222-2222-4222-8222-222222222222' }],
    });
    await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Da Carteira', phone: '17999990010', email: 'c@x.com', source: 'checkout' } });
    db.tables.SITE_CampaignCheckouts[0].updated_at = new Date(Date.now() - 31 * 60_000).toISOString();
    await lib.sweepVacuumAbandoned(db);
    assert.equal(db.tables.SITE_Tasks[0].assigned_to, '22222222-2222-4222-8222-222222222222');
    assert.equal(db.tables.SITE_Leads[0].status, 'Contacted');
});

test('varredura: quem comprou, quem só pediu aviso e pagamento em análise não vão para o vendedor', async () => {
    const db = seed();
    const old = new Date(Date.now() - DAY).toISOString();
    const base = { campaign: 'vacuum_pump_bf_2026', name: 'X', phone: '17999990011', updated_at: old, followup_at: null };
    db.tables.SITE_CampaignCheckouts.push({ ...base, id: 'e0000000-0000-4000-8000-000000000001', stage: 'paid' }, { ...base, id: 'e0000000-0000-4000-8000-000000000002', stage: 'waitlist' }, { ...base, id: 'e0000000-0000-4000-8000-000000000003', stage: 'review' });
    assert.equal((await lib.sweepVacuumAbandoned(db)).assigned, 0);
    assert.equal(db.tables.SITE_Tasks.length, 0);
});

test('sweep pela API exige o segredo do cron', async () => {
    seed();
    assert.equal((await call(lib.apiHandler, { query: { action: 'sweep' } })).status, 401);
    const ok = await call(lib.apiHandler, { query: { action: 'sweep' }, headers: { authorization: `Bearer ${CRON_SECRET}` } });
    assert.equal(ok.status, 200);
});

test('pediu contato: vai para o vendedor na hora', async () => {
    const db = seed();
    const res = await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Quer Falar', phone: '17999990012', source: 'contact' } });
    assert.equal(res.status, 200);
    assert.equal(db.tables.SITE_Tasks.length, 1);
    assert.equal(db.tables.SITE_Tasks[0].priority, 'URGENT');
});

test('link do vendedor: quem se cadastra por ele fica no nome dele, sem precisar de WhatsApp', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: { id: 950, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } }));
    const seller = db.tables.SITE_Users[0];
    const code = lib.sellerRefCode(seller.id);
    assert.match(code, /^[a-f0-9]{8}$/);
    const lead = await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Cliente Ligação', phone: '17 99999-0050', email: 'lig@oficina.com', source: 'checkout', seller_ref: code } });
    const id = lead.json.checkout_id;
    assert.equal(db.tables.SITE_CampaignCheckouts.find((row) => row.id === id).referred_by, seller.id);
    await call(lib.apiHandler, { method: 'POST', query: { action: 'save' }, body: { checkout_id: id, stage: 'payment', document: '52998224725', address: VALID_ADDRESS } });
    await pay(id);
    assert.equal(db.tables.SITE_Sales[0].seller_id, seller.id);
    assert.equal(db.tables.SITE_Sales[0].seller_name, seller.name);
    assert.ok(db.tables.SITE_Leads[0].tags.includes('recuperado_por_vendedor'));
});

test('link do vendedor: código inválido, inventado ou de quem saiu da equipe não dá crédito', async () => {
    const db = seed();
    const seller = db.tables.SITE_Users[0];
    const refOf = async (seller_ref, phone) => {
        const lead = await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Cliente', phone, email: 'c@oficina.com', source: 'checkout', seller_ref } });
        return db.tables.SITE_CampaignCheckouts.find((row) => row.id === lead.json.checkout_id).referred_by ?? null;
    };
    assert.equal(await refOf('00000000', '17 99999-0051'), null);
    assert.equal(await refOf("' or 1=1", '17 99999-0052'), null);
    assert.equal(await refOf(null, '17 99999-0053'), null);
    seller.status = 'Inactive';
    assert.equal(await refOf(lib.sellerRefCode(seller.id), '17 99999-0054'), null);
});

test('link do vendedor: vale mais que a conversa no WhatsApp, e quem desiste volta para ele', async () => {
    const db = seed();
    const [first, second] = db.tables.SITE_Users;
    mockMercadoPago(() => ({ json: { id: 951, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } }));
    const lead = await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Cliente Ligação', phone: '17 99999-0055', email: 'lig2@oficina.com', source: 'checkout', seller_ref: lib.sellerRefCode(second.id) } });
    const id = lead.json.checkout_id;
    const checkout = db.tables.SITE_CampaignCheckouts.find((row) => row.id === id);
    checkout.updated_at = new Date(Date.now() - 31 * 60_000).toISOString();
    await lib.sweepVacuumAbandoned(db);
    assert.equal(checkout.followup_assigned_to, second.id, 'a tarefa de quem desistiu vai para o dono do link');

    db.tables.SITE_WhatsAppCloudConversations = [{ id: 'c1', wa_id: '5517999990055', assigned_to: first.id }];
    db.tables.SITE_WhatsAppCloudMessages = [{ wa_id: '5517999990055', sent_by: 'human', created_at: new Date().toISOString() }];
    await call(lib.apiHandler, { method: 'POST', query: { action: 'save' }, body: { checkout_id: id, stage: 'payment', document: '52998224725', address: VALID_ADDRESS } });
    await pay(id);
    assert.equal(db.tables.SITE_Sales[0].seller_id, second.id);
});

test('vendedor recebeu a tarefa mas não falou com o cliente: compra direta, sem comissão', async () => {
    const db = seed();
    const payment = { id: 940, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' };
    mockMercadoPago(() => ({ json: payment }));
    const id = await startCheckout();
    const checkout = db.tables.SITE_CampaignCheckouts[0];
    checkout.updated_at = new Date(Date.now() - 31 * 60_000).toISOString();
    await lib.sweepVacuumAbandoned(db);
    assert.ok(checkout.followup_assigned_to, 'a varredura entregou o carrinho');

    await pay(id);
    const sale = db.tables.SITE_Sales[0];
    assert.equal(sale.seller_id, null);
    assert.equal(sale.seller_name, 'Compra direta online');
    assert.equal(db.tables.SITE_Tasks[0].status, 'DONE', 'a tarefa fecha do mesmo jeito');
    assert.ok(db.tables.SITE_Leads[0].tags.includes('checkout_automatico'));
    assert.ok(!db.tables.SITE_Leads[0].tags.includes('recuperado_por_vendedor'));
});

test('compra direta sem nunca ter caído para vendedor: sem vendedor', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: { id: 941, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } }));
    const id = await startCheckout();
    await pay(id);
    assert.equal(db.tables.SITE_Sales[0].seller_id, null);
    assert.equal(db.tables.SITE_Sales[0].seller_name, 'Compra direta online');
});

test('robô e disparo no WhatsApp não contam como conversa com vendedor', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: { id: 942, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } }));
    const id = await startCheckout();
    const seller = db.tables.SITE_Users[0];
    db.tables.SITE_WhatsAppCloudConversations = [{ id: 'c1', wa_id: '5517999990001', assigned_to: seller.id, handoff_by: seller.id }];
    db.tables.SITE_WhatsAppCloudMessages = ['ai', 'system', 'customer'].map((sent_by) => ({ wa_id: '5517999990001', sent_by, created_at: new Date().toISOString() }));
    await pay(id);
    assert.equal(db.tables.SITE_Sales[0].seller_id, null);
});

test('conversa antiga, fora da janela de 15 dias, não dá comissão', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: { id: 943, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } }));
    const id = await startCheckout();
    const seller = db.tables.SITE_Users[0];
    db.tables.SITE_WhatsAppCloudConversations = [{ id: 'c1', wa_id: '5517999990001', assigned_to: seller.id }];
    db.tables.SITE_WhatsAppCloudMessages = [{ wa_id: '5517999990001', sent_by: 'human', created_at: new Date(Date.now() - 16 * 86_400_000).toISOString() }];
    await pay(id);
    assert.equal(db.tables.SITE_Sales[0].seller_id, null);
});

test('conversou com o vendedor antes de comprar, mesmo com o número sem o nono dígito: crédito é dele', async () => {
    const db = seed();
    mockMercadoPago(() => ({ json: { id: 944, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990, external_reference: 'x' } }));
    const id = await startCheckout();
    const seller = db.tables.SITE_Users[0];
    db.tables.SITE_WhatsAppCloudConversations = [{ id: 'c1', wa_id: '551799990001', assigned_to: seller.id }];
    db.tables.SITE_WhatsAppCloudMessages = [{ wa_id: '551799990001', sent_by: 'human', created_at: new Date().toISOString() }];
    await pay(id);
    assert.equal(db.tables.SITE_Sales[0].seller_id, seller.id);
    assert.equal(db.tables.SITE_Sales[0].seller_name, seller.name);
    assert.ok(db.tables.SITE_Leads[0].tags.includes('recuperado_por_vendedor'));
});

test('comprou depois de ser chamado: tarefa fecha e a venda fica com o vendedor', async () => {
    const db = seed();
    const payment = { id: 905, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago(() => ({ json: payment }));
    const id = await startCheckout();
    const checkout = db.tables.SITE_CampaignCheckouts[0];
    checkout.updated_at = new Date(Date.now() - 31 * 60_000).toISOString();
    await lib.sweepVacuumAbandoned(db);
    assert.equal(db.tables.SITE_Tasks[0].status, 'TODO');
    db.tables.SITE_WhatsAppCloudMessages = [{ wa_id: '5517999990001', sent_by: 'human', created_at: new Date().toISOString() }];

    await pay(id);
    assert.equal(db.tables.SITE_Tasks[0].status, 'DONE');
    assert.equal(db.tables.SITE_Sales[0].seller_id, checkout.followup_assigned_to);
    assert.ok(db.tables.SITE_Leads[0].tags.includes('recuperado_por_vendedor'));
});

test('estorno: cancela a venda e devolve a unidade ao lote', async () => {
    const db = seed();
    const payment = { id: 906, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago(() => ({ json: payment }));
    const id = await startCheckout();
    await pay(id);
    resetOffer();
    assert.equal((await call(lib.apiHandler, { query: { action: 'offer' } })).json.remaining, 49);

    const result = await lib.handleVacuumPaymentEvent(db, { ...payment, status: 'refunded', external_reference: `vacuum:${id}` });
    assert.equal(result.cancelled, true);
    assert.equal(db.tables.SITE_Sales[0].status, 'cancelled');
    assert.equal((await call(lib.apiHandler, { query: { action: 'offer' } })).json.remaining, 50);
});

test('limite por IP: barra teste de cartão em massa sem misturar clientes diferentes', async () => {
    seed();
    mockMercadoPago(() => ({ json: { id: 908, status: 'rejected', status_detail: 'cc_rejected_other_reason' } }));
    const id = await startCheckout();
    const attempt = (ip) => call(lib.apiHandler, { method: 'POST', query: { action: 'pay' }, headers: { 'x-real-ip': ip }, body: { checkout_id: 'nao-e-uuid' } });
    for (let i = 0; i < 10; i++) assert.equal((await attempt('200.2.2.2')).status, 400);
    assert.equal((await attempt('200.2.2.2')).status, 429);
    assert.equal((await attempt('200.3.3.3')).status, 400, 'outro cliente segue normal');
    assert.ok(id);
});

test('limite por checkout: depois de 8 tentativas só com vendedor', async () => {
    const db = seed();
    const calls = mockMercadoPago(() => ({ json: { id: 909, status: 'rejected', status_detail: 'cc_rejected_other_reason' } }));
    const id = await startCheckout();
    db.tables.SITE_CampaignCheckouts[0].payment_attempts = 8;
    const res = await pay(id);
    assert.equal(res.status, 429);
    assert.equal(calls.length, 0);
});

test('webhook: pagamento de curso continua indo para o fluxo de matrícula', () => {
    assert.equal(lib.isVacuumPayment({ external_reference: 'e929a4f8-5180-46fa-86cc-455ca17c6990' }), false);
    assert.equal(lib.isVacuumPayment({ external_reference: 'vacuum:e929a4f8-5180-46fa-86cc-455ca17c6990' }), true);
    assert.equal(lib.isVacuumPayment({}), false);
});

test('falha ao gravar a venda depois de aprovado: cliente vê "em análise" e o vendedor não liga', async () => {
    const db = seed();
    const payment = { id: 907, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago(() => ({ json: payment }));
    const id = await startCheckout();
    const original = db.from;
    db.from = (table) => {
        const query = original(table);
        if (table === 'SITE_Sales') {
            const run = query.run.bind(query);
            query.run = () => (query.op === 'insert' ? { data: null, error: { code: '500', message: 'fora do ar' } } : run());
        }
        return query;
    };
    const res = await pay(id);
    assert.equal(res.status, 200);
    assert.equal(res.json.stage, 'review');
    const checkout = db.tables.SITE_CampaignCheckouts[0];
    checkout.updated_at = new Date(Date.now() - DAY).toISOString();
    db.from = original;
    assert.equal((await lib.sweepVacuumAbandoned(db)).assigned, 0);
});

test('isolamento: este arquivo não altera o ambiente nem o fetch do processo', () => {
    assert.deepEqual({ ...process.env }, envAntes);
    assert.equal(globalThis.fetch, fetchAntes);
});

const SHIPPING_ON = { enabled: true, weight_kg: 25, length_cm: 50, height_cm: 50, width_cm: 50 };
const RJ_ADDRESS = { cep: '20040-020', street: 'Av. Rio Branco', number: '1', neighborhood: 'Centro', city: 'Rio de Janeiro', state: 'RJ' };
const sgpReply = {
    servicos: {
        3220: { Codigo: 3220, Valor: '197,44', PrazoEntrega: '2', Erro: '0', MsgErro: '' },
        3298: { Codigo: 3298, Valor: '153,33', PrazoEntrega: '6', Erro: '0', MsgErro: '' },
    },
};

function seedShipping(over = {}) {
    const db = seed({ config: liveConfig({ shipping: { ...SHIPPING_ON, ...over } }) });
    db.tables.SITE_Config.push({ key: 'sgp_api_key', value: 'chave-sgp-secreta' });
    return db;
}

async function startCheckoutAt(address, phone = '21999990001') {
    const lead = await call(lib.apiHandler, { method: 'POST', query: { action: 'lead' }, body: { name: 'Maria Souza', phone, email: 'maria@oficina.com', source: 'checkout' } });
    const save = await call(lib.apiHandler, { method: 'POST', query: { action: 'save' }, body: { checkout_id: lead.json.checkout_id, stage: 'payment', document: '529.982.247-25', address } });
    assert.equal(save.status, 200);
    return lead.json.checkout_id;
}

const quoteFor = (cep, bumps = []) => call(lib.apiHandler, { method: 'POST', query: { action: 'shipping' }, body: { cep, bumps } });

test('frete: SP é grátis em todo o estado pelo CEP, sem consultar o SGP', async () => {
    seedShipping();
    const calls = mockMercadoPago(() => ({ json: sgpReply }));
    for (const cep of ['01310-100', '15060-190', '19999-999']) {
        const res = await quoteFor(cep);
        assert.equal(res.json.mode, 'free', cep);
    }
    assert.equal(calls.length, 0);
    assert.equal(lib.isSaoPauloCep('20040-020'), false);
    assert.equal(lib.isSaoPauloCep('20000000'), false);
    assert.equal(lib.isSaoPauloCep('00999999'), false);
    assert.equal(lib.isSaoPauloCep('123'), false);
});

test('frete: fora de SP cota no SGP, entende o código sem zero e ordena pelo mais barato', async () => {
    seedShipping();
    const calls = mockMercadoPago(() => ({ json: sgpReply }));
    const res = await quoteFor('20040-021', ['borbulhador']);
    assert.equal(res.json.mode, 'quoted');
    assert.deepEqual(res.json.options.map((o) => [o.code, o.name, o.price, o.days]), [['03298', 'PAC', 153.33, 6], ['03220', 'SEDEX', 197.44, 2]]);
    const sent = calls.at(-1);
    assert.ok(sent.url.includes('sgpweb.com.br'));
    assert.ok(sent.url.includes('chave_integracao=chave-sgp-secreta'));
    assert.equal(sent.body.cep_destino, '20040021');
    assert.equal(sent.body.peso, '25');
    assert.deepEqual(sent.body.servicos, ['03298', '03220']);
    assert.ok(!JSON.stringify(res.json).includes('chave-sgp-secreta'), 'a chave nunca vai para o navegador');
});

test('frete: seguro vai com ponto, como o SGP exige', async () => {
    seedShipping({ declared_value: 4000 });
    const calls = mockMercadoPago(() => ({ json: sgpReply }));
    await quoteFor('20040-030');
    assert.equal(calls.at(-1).body.valor_declarado, '4000.00');
});

test('frete: pagamento soma o frete escolhido, recalcula no servidor e grava no pedido', async () => {
    const db = seedShipping();
    const payment = { id: 950, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 8143.33 };
    const calls = mockMercadoPago((url) => (url.includes('sgpweb') ? { json: sgpReply } : { json: payment }));
    const id = await startCheckoutAt(RJ_ADDRESS);

    const semEscolha = await pay(id, { expected_total: 7990 });
    assert.equal(semEscolha.status, 409, 'fora de SP precisa escolher o envio');

    const adulterado = await pay(id, { shipping_service: '03298', expected_total: 7990 });
    assert.equal(adulterado.status, 409);
    assert.equal(adulterado.json.code, 'price_changed');
    assert.equal(adulterado.json.total, 8143.33);

    const ok = await pay(id, { shipping_service: '03298', expected_total: 8143.33 });
    assert.equal(ok.json.stage, 'paid');
    const sent = calls.filter((c) => c.url.includes('/v1/payments')).at(-1);
    assert.equal(sent.body.transaction_amount, 8143.33);
    assert.ok(sent.body.additional_info.items.some((item) => item.id === 'frete' && item.unit_price === 153.33));
    const sale = db.tables.SITE_Sales[0];
    assert.equal(sale.total_value, 8143.33);
    assert.equal(sale.shipping_cost, 153.33);
    assert.equal(sale.shipping_method, 'pac');
    assert.equal(ok.json.shipping.name, 'Frete PAC');
});

test('frete: SP paga sem frete mesmo digitando outra UF ou mandando serviço', async () => {
    const db = seedShipping();
    const payment = { id: 951, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago((url) => (url.includes('sgpweb') ? { json: sgpReply } : { json: payment }));
    const id = await startCheckoutAt({ ...RJ_ADDRESS, cep: '15060-190', state: 'RJ' });
    const ok = await pay(id, { shipping_service: '03220', expected_total: 7990 });
    assert.equal(ok.json.stage, 'paid');
    assert.equal(db.tables.SITE_Sales[0].shipping_cost, 0);
    assert.equal(db.tables.SITE_Sales[0].shipping_method, 'gratis_sp');
});

test('frete: SGP fora do ar, peso acima do limite ou sem chave não travam a venda', async () => {
    seedShipping();
    mockMercadoPago(() => ({ status: 500, json: { MsgErro: 'fora do ar' } }));
    assert.equal((await quoteFor('20040-022')).json.mode, 'combine');

    seedShipping();
    mockMercadoPago(() => ({ json: { Erro: 'PESO INVALIDO', MsgErro: 'O peso informado é superior a 30 Kg.' } }));
    assert.equal((await quoteFor('20040-023')).json.mode, 'combine');

    const semChave = seed({ config: liveConfig({ shipping: SHIPPING_ON }) });
    mockMercadoPago(() => ({ json: sgpReply }));
    assert.equal((await quoteFor('20040-024')).json.mode, 'combine');
    assert.ok(semChave);

    seed({ config: liveConfig() });
    const desligado = mockMercadoPago(() => ({ json: sgpReply }));
    assert.equal((await quoteFor('20040-025')).json.mode, 'combine', 'sem peso configurado não cota');
    assert.equal(desligado.length, 0);

    seedShipping();
    mockMercadoPago(() => ({ json: { servicos: { 3220: { Codigo: 3220, Valor: '0,00', Erro: '-888', MsgErro: 'não atende' }, 3298: { Codigo: 3298, Valor: '53,33', PrazoEntrega: '6', Erro: '0' } } } }));
    const parcial = await quoteFor('20040-026');
    assert.deepEqual(parcial.json.options.map((o) => o.name), ['PAC'], 'serviço com erro some da lista');
});

test('frete a combinar: vende sem cobrar frete e registra no pedido', async () => {
    const db = seed();
    const payment = { id: 952, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago(() => ({ json: payment }));
    const id = await startCheckoutAt(RJ_ADDRESS, '21999990002');
    const ok = await pay(id, { expected_total: 7990 });
    assert.equal(ok.json.stage, 'paid');
    assert.equal(db.tables.SITE_Sales[0].shipping_method, 'a_combinar');
    assert.equal(db.tables.SITE_Sales[0].total_value, 7990);
});

test('venda liberada antes da data: soft_open abre a compra e mantém o texto da campanha', async () => {
    const future = { starts_at: new Date(Date.now() + DAY).toISOString(), ends_at: new Date(Date.now() + 8 * DAY).toISOString() };
    assert.equal(lib.getVacuumOfferState(lib.resolveVacuumConfig(liveConfig(future)), 0, Date.now()).phase, 'soon');
    const open = lib.getVacuumOfferState(lib.resolveVacuumConfig(liveConfig({ ...future, soft_open: true })), 0, Date.now());
    assert.equal(open.phase, 'presale');
    assert.equal(open.price, 7990);
    assert.equal(open.starts_at, future.starts_at);

    seed({ config: liveConfig({ ...future, soft_open: true }) });
    const payment = { id: 953, status: 'approved', status_detail: 'accredited', installments: 10, payment_method_id: 'visa', transaction_amount: 7990 };
    mockMercadoPago(() => ({ json: payment }));
    const id = await startCheckout();
    assert.equal((await pay(id)).json.stage, 'paid');
});

test('isolamento: nenhum teste de frete alterou o ambiente nem o fetch do processo', () => {
    assert.deepEqual({ ...process.env }, envAntes);
    assert.equal(globalThis.fetch, fetchAntes);
});
