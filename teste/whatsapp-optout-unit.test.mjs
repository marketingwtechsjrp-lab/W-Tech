import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Webhook do número oficial sem tocar em banco nem na Meta: o esbuild troca o Supabase e a IA
// por versões de mentira, e o fetch do código empacotado responde como a API da Meta.
// Variáveis de ambiente e fetch entram só no bundle (`define`), como em vacuum-pump-unit.
const stubs = {
    '@supabase/supabase-js': 'export const createClient = () => new Proxy({}, { get: (_t, prop) => globalThis.__optoutFakeSupabase[prop] });',
    ai: 'export const runAIResponder = async (_s, _c, args) => { globalThis.__optoutAiCalls.push(args); };',
    bot: 'export const handleEvolutionWebhook = async () => {};',
};

const { outputFiles } = await build({
    stdin: {
        contents: `
            export { default as webhook } from './api/whatsapp-cloud-webhook.ts';
            export { isOptOutRequest } from './api/_whatsappOptout.ts';
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
        fetch: 'globalThis.__optoutFakeFetch',
    },
    plugins: [
        {
            name: 'stubs',
            setup(b) {
                b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: '@supabase/supabase-js', namespace: 'stub' }));
                b.onResolve({ filter: /_aiReply\.js$/ }, () => ({ path: 'ai', namespace: 'stub' }));
                b.onResolve({ filter: /_aiGroupBot\.js$/ }, () => ({ path: 'bot', namespace: 'stub' }));
                b.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({ contents: stubs[args.path], loader: 'js' }));
            },
        },
    ],
});

const dir = mkdtempSync(path.join(tmpdir(), 'optout-test-'));
const file = path.join(dir, 'bundle.mjs');
writeFileSync(file, outputFiles[0].text);
const { webhook, isOptOutRequest } = await import(pathToFileURL(file).href);
test.after(() => rmSync(dir, { recursive: true, force: true }));

class FakeQuery {
    constructor(db, table) {
        Object.assign(this, { db, table, op: 'select', filters: [], rows: null, patch: null, one: false, ignoreDuplicates: false });
    }
    select() { return this; }
    insert(row) { this.op = 'insert'; this.rows = [].concat(row); return this; }
    update(patch) { this.op = 'update'; this.patch = patch; return this; }
    upsert(row, options = {}) { this.op = 'upsert'; this.rows = [row]; this.ignoreDuplicates = options.ignoreDuplicates; return this; }
    eq(column, value) { this.filters.push((r) => r[column] === value); return this; }
    is(column, value) { this.filters.push((r) => (r[column] ?? null) === value); return this; }
    ilike(column, pattern) {
        const regex = new RegExp(`^${pattern.replace(/\\/g, '').replace(/%/g, '.*')}$`, 'i');
        this.filters.push((r) => regex.test(String(r[column] ?? '')));
        return this;
    }
    limit() { return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }
    run() {
        const table = (this.db.tables[this.table] ||= []);
        const failure = this.db.failOn?.[this.table];
        if (failure && this.op === failure.op) return { data: null, error: { message: failure.message } };
        let rows = table.filter((row) => this.filters.every((filter) => filter(row)));
        if (this.op === 'insert') {
            rows = this.rows.map((raw) => ({ id: crypto.randomUUID(), ...raw }));
            table.push(...rows);
        } else if (this.op === 'upsert') {
            const [raw] = this.rows;
            if (table.some((r) => r.wa_message_id === raw.wa_message_id)) rows = [];
            else {
                rows = [{ id: crypto.randomUUID(), ...raw }];
                table.push(...rows);
            }
        } else if (this.op === 'update') {
            rows.forEach((row) => Object.assign(row, this.patch));
        }
        if (this.one) return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
    }
}

const WA_ID = '5517991234567';

function seed(tables = {}) {
    const db = {
        tables: {
            SITE_Config: [
                { key: 'whatsapp_cloud_access_token', value: 'token' },
                { key: 'whatsapp_cloud_phone_number_id', value: '123' },
            ],
            SITE_WhatsAppCloudConversations: [],
            SITE_WhatsAppCloudMessages: [],
            SITE_Leads: [],
            ...tables,
        },
        from: (table) => new FakeQuery(db, table),
    };
    globalThis.__optoutFakeSupabase = db;
    globalThis.__optoutAiCalls = [];
    globalThis.__optoutSent = [];
    globalThis.__optoutFakeFetch = async (_url, init) => {
        globalThis.__optoutSent.push(JSON.parse(init.body));
        return { ok: true, json: async () => ({ messages: [{ id: `wamid.confirma${globalThis.__optoutSent.length}` }] }) };
    };
    return db;
}

let messageCounter = 0;
function incoming(over = {}) {
    messageCounter += 1;
    return { from: WA_ID, id: `wamid.in${messageCounter}`, timestamp: '1793850000', type: 'text', text: { body: 'oi' }, ...over };
}

const buttonPress = (text = 'Não quero receber') => incoming({ type: 'button', text: undefined, button: { text, payload: text } });

async function deliver(message) {
    const req = {
        method: 'POST',
        query: {},
        headers: {},
        body: { entry: [{ changes: [{ value: { contacts: [{ profile: { name: 'Carlos' } }], messages: [message] } }] }] },
    };
    const out = { status: null, json: null };
    await webhook(req, {
        status(code) { out.status = code; return this; },
        json(data) { out.json = data; return this; },
    });
    return out;
}

const conversation = (db) => db.tables.SITE_WhatsAppCloudConversations[0];
const inbound = (db) => db.tables.SITE_WhatsAppCloudMessages.filter((m) => m.direction === 'in');
const outbound = (db) => db.tables.SITE_WhatsAppCloudMessages.filter((m) => m.direction === 'out');

test('reconhece o pedido de saída, com ou sem acento', () => {
    for (const text of [
        'Não quero receber',
        'nao quero receber',
        'NÃO QUERO MAIS RECEBER',
        'Não quero receber mensagens',
        'não quero mais receber ofertas por aqui',
        'SAIR',
        'sair.',
        'Quero sair da lista',
        'Parar',
        'pare de me mandar mensagem',
        'para de enviar isso por favor',
        'Não me mande mais mensagens',
        'stop',
        'descadastrar',
        'me tire da lista',
        'remova meu número',
        'tire-me da lista',
    ]) {
        assert.equal(isOptOutRequest(text), true, text);
    }
});

test('conversa normal não vira pedido de saída', () => {
    for (const text of [
        'oi',
        'Vou sair agora, te chamo depois',
        'não quero receber na sexta, pode ser segunda?',
        'Quero comprar a máquina',
        'como faço para parar o vazamento?',
        'Pode cancelar meu pedido?',
        'Sem interesse no momento',
        'Tire uma dúvida para mim',
        'a máquina vem com bico? ' + 'x'.repeat(60),
        '',
        null,
    ]) {
        assert.equal(isOptOutRequest(text), false, String(text));
    }
});

test('botão de saída: grava, marca a ficha, confirma e não chama a IA', async () => {
    const db = seed({
        SITE_Leads: [
            { id: 'lead-1', phone: '(17) 99123-4567', tags: ['vacuum_bf'] },
            { id: 'lead-2', phone: '(11) 98888-7777', tags: [] },
        ],
    });
    const res = await deliver(buttonPress());
    assert.equal(res.status, 200);
    assert.equal(inbound(db).length, 1);
    assert.equal(inbound(db)[0].type, 'text');
    assert.equal(inbound(db)[0].body, 'Não quero receber');
    assert.ok(conversation(db).marketing_optout_at);
    assert.deepEqual(db.tables.SITE_Leads[0].tags, ['vacuum_bf', 'whatsapp_optout']);
    assert.deepEqual(db.tables.SITE_Leads[1].tags, []);
    assert.equal(globalThis.__optoutAiCalls.length, 0);
    assert.equal(globalThis.__optoutSent.length, 1);
    assert.equal(globalThis.__optoutSent[0].to, WA_ID);
    assert.equal(globalThis.__optoutSent[0].type, 'text');
    assert.equal(outbound(db).length, 1);
    assert.equal(outbound(db)[0].sent_by, 'system');
});

test('quem digita SAIR tem o mesmo tratamento', async () => {
    const db = seed();
    await deliver(incoming({ text: { body: 'SAIR' } }));
    assert.ok(conversation(db).marketing_optout_at);
    assert.equal(globalThis.__optoutAiCalls.length, 0);
    assert.equal(globalThis.__optoutSent.length, 1);
});

test('confirma uma vez só, mesmo apertando de novo em outro envio', async () => {
    const db = seed();
    await deliver(buttonPress());
    const first = conversation(db).marketing_optout_at;
    await deliver(buttonPress());
    assert.equal(conversation(db).marketing_optout_at, first);
    assert.equal(globalThis.__optoutSent.length, 1);
    assert.equal(inbound(db).length, 2);
});

test('reentrega da Meta não duplica nada', async () => {
    const db = seed();
    const message = buttonPress();
    await deliver(message);
    await deliver(message);
    assert.equal(inbound(db).length, 1);
    assert.equal(globalThis.__optoutSent.length, 1);
});

test('mensagem normal segue para a IA e não marca saída', async () => {
    const db = seed();
    await deliver(incoming({ text: { body: 'Quanto custa a máquina?' } }));
    assert.equal(globalThis.__optoutAiCalls.length, 1);
    assert.equal(conversation(db).marketing_optout_at, undefined);
    assert.equal(globalThis.__optoutSent.length, 0);
});

test('botão de outro template aparece como texto e não chama a IA', async () => {
    const db = seed();
    await deliver(buttonPress('Quero saber mais'));
    assert.equal(inbound(db)[0].type, 'text');
    assert.equal(inbound(db)[0].body, 'Quero saber mais');
    assert.equal(globalThis.__optoutAiCalls.length, 0);
    assert.equal(conversation(db).marketing_optout_at, undefined);
});

test('template sem conversa entra no histórico quando a pessoa responde', async () => {
    const db = seed({
        SITE_WhatsAppCloudMessages: [
            { id: 'camp-1', conversation_id: null, wa_id: WA_ID, wa_message_id: 'wamid.camp1', direction: 'out', type: 'text', body: 'Abriu, Carlos!' },
            { id: 'camp-2', conversation_id: null, wa_id: '5511988887777', wa_message_id: 'wamid.camp2', direction: 'out', type: 'text', body: 'Abriu, Ana!' },
        ],
    });
    await deliver(incoming({ text: { body: 'Tenho interesse' } }));
    const [mine, other] = db.tables.SITE_WhatsAppCloudMessages;
    assert.equal(mine.conversation_id, conversation(db).id);
    assert.equal(other.conversation_id, null);
});

test('confirmação recusada pela Meta não desfaz o pedido nem derruba o webhook', async () => {
    const db = seed();
    globalThis.__optoutFakeFetch = async () => ({ ok: false, json: async () => ({ error: { message: 'recusado' } }) });
    const res = await deliver(buttonPress());
    assert.equal(res.status, 200);
    assert.ok(conversation(db).marketing_optout_at);
    assert.equal(outbound(db).length, 0);
});

test('sem a coluna no banco, a mensagem fica salva e a IA continua de fora', async () => {
    const db = seed();
    db.failOn = { SITE_WhatsAppCloudConversations: { op: 'update', message: 'column does not exist' } };
    const res = await deliver(incoming({ text: { body: 'sair' } }));
    assert.equal(res.status, 200);
    assert.equal(inbound(db).length, 1);
    assert.equal(globalThis.__optoutAiCalls.length, 0);
    assert.equal(globalThis.__optoutSent.length, 0);
});
