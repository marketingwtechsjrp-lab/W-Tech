import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarHarness } from './_apiHarness.mjs';

// O id da matrícula é um link de acesso, mas também vai no QR do certificado. Estes testes
// seguram o recorte: CPF nunca sai, contato só com o questionário em aberto e antes do
// curso, e pelo id do lead (que o recadastro entrega a quem digitar o e-mail) só andamento.

const CPF = '123.456.789-00';
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEAD_ID = '11111111-1111-4111-8111-111111111111';
const CURSO_ID = '33333333-3333-4333-8333-333333333333';
const CURSO_DIRETO = 'b4a2f0be-2c70-44ce-b2ba-06773e89a0b8';

let h;
let publicEnrollments;

before(async () => {
  h = await iniciarHarness("export { default as publicEnrollments } from './api/_publicEnrollments.ts'; export * from './lib/publicEnrollments.ts';");
  publicEnrollments = h.modulo.publicEnrollments;
});
after(() => h.fechar());

function matricula(extra = {}) {
  return {
    id: ID,
    course_id: CURSO_ID,
    status: 'Confirmed',
    student_name: 'Aluno Teste',
    student_email: 'aluno@teste.com',
    student_phone: '11999998888',
    student_cpf: null,
    t_shirt_size: null,
    amount_paid: 150,
    total_amount: 480,
    currency: 'EUR',
    payment_method: 'Stripe',
    payment_id: 'pi_1',
    zip_code: '01001000',
    address: 'Rua Secreta',
    address_number: '42',
    address_neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    created_at: '2026-11-01T10:00:00+00:00',
    SITE_Courses: {
      title: 'Curso de Suspensão',
      date: '2026-12-01',
      date_end: null,
      city: 'Lisboa',
      state: null,
      start_time: '09:00',
      what_to_bring: 'Caderno',
      currency: 'EUR',
      whatsapp_group_link: 'https://chat.whatsapp.com/grupo',
      location: 'Sede',
      location_type: 'Presencial',
    },
    ...extra,
  };
}

function novaBase({ matriculas = [matricula()], leads = [] } = {}) {
  h.estado.tabelas = {
    SITE_Enrollments: matriculas,
    SITE_Leads: [
      { id: LEAD_ID, name: 'Aluno Teste', email: 'aluno@teste.com', phone: '11999998888', status: 'New', client_code: 'ALU-12ABC', created_at: '2026-11-01T10:00:00+00:00' },
      ...leads,
    ],
  };
  h.estado.chamadas.length = 0;
}

const CAMPOS_DE_CONTATO = ['student_email', 'student_phone', 'zip_code', 'address', 'address_number', 'address_neighborhood', 'city', 'state', 'client_code'];

test('view pelo id, questionário aberto: traz contato para preencher, nunca CPF', async () => {
  novaBase({ matriculas: [matricula({ student_cpf: CPF })] });
  const { codigo, corpo, cabecalhos } = await h.chamar(publicEnrollments, { action: 'view', id: ID });
  assert.equal(codigo, 200);
  const e = corpo.enrollment;
  assert.equal(e.id, ID);
  assert.equal(e.student_name, 'Aluno Teste');
  assert.equal(e.student_email, 'aluno@teste.com');
  assert.equal(e.address, 'Rua Secreta');
  assert.equal(e.client_code, 'ALU-12ABC');
  assert.equal(e.has_cpf, true);
  assert.equal(e.amount_paid, 150);
  assert.equal(e.SITE_Courses.whatsapp_group_link, 'https://chat.whatsapp.com/grupo');
  assert.equal(JSON.stringify(corpo).includes(CPF), false);
  assert.equal(cabecalhos['cache-control'], 'private, no-store');
});

test('view pelo id, questionário preenchido: o id do QR não abre contato nem código', async () => {
  novaBase({ matriculas: [matricula({ student_cpf: CPF, t_shirt_size: 'M' })] });
  const { corpo: { enrollment: e } } = await h.chamar(publicEnrollments, { action: 'view', id: ID });
  assert.equal(e.student_name, 'Aluno Teste');
  assert.equal(e.t_shirt_size, 'M');
  for (const campo of CAMPOS_DE_CONTATO) assert.equal(campo in e, false, campo);
  assert.equal(h.chamadasDe('SITE_Leads').length, 0);
});

test('view pelo id, aluno que já fez o curso: sem contato mesmo com questionário aberto', async () => {
  novaBase({ matriculas: [matricula({ status: 'CheckedIn' })] });
  const { corpo: { enrollment: e } } = await h.chamar(publicEnrollments, { action: 'view', id: ID });
  for (const campo of CAMPOS_DE_CONTATO) assert.equal(campo in e, false, campo);
});

test('view pelo id, pagamento pendente: sem grupo da turma e sem código do portal', async () => {
  novaBase({ matriculas: [matricula({ status: 'Pending' })] });
  const { corpo: { enrollment: e } } = await h.chamar(publicEnrollments, { action: 'view', id: ID });
  assert.equal(e.SITE_Courses.whatsapp_group_link, null);
  assert.equal(e.client_code, null);
  assert.equal(h.chamadasDe('SITE_Leads').length, 0);
});

test('view pelo lead: só andamento, sem nome, contato nem id da matrícula', async () => {
  novaBase({ matriculas: [matricula({ student_cpf: CPF, student_email: 'ALUNO@teste.com' })] });
  const { codigo, corpo } = await h.chamar(publicEnrollments, { action: 'view', leadId: LEAD_ID, courseId: CURSO_ID });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo.enrollment, {
    status: 'Confirmed',
    amount_paid: 150,
    total_amount: 480,
    currency: 'EUR',
    payment_method: 'Stripe',
    payment_id: 'pi_1',
    t_shirt_size: null,
    has_cpf: true,
    SITE_Courses: { title: 'Curso de Suspensão', currency: 'EUR' },
  });
});

test('view: id inexistente, lead sem matrícula e entrada estranha viram 404', async () => {
  novaBase();
  assert.equal((await h.chamar(publicEnrollments, { action: 'view', id: '77777777-7777-4777-8777-777777777777' })).codigo, 404);
  assert.equal((await h.chamar(publicEnrollments, { action: 'view', leadId: LEAD_ID, courseId: '77777777-7777-4777-8777-777777777777' })).codigo, 404);
  novaBase();
  for (const corpo of [{ id: 'test' }, { id: 7 }, {}, { leadId: LEAD_ID }, { leadId: 'x', courseId: CURSO_ID }]) {
    assert.equal((await h.chamar(publicEnrollments, { action: 'view', ...corpo })).codigo, 404);
  }
  assert.equal(h.estado.chamadas.length, 0);
});

test('questionário: grava só as respostas, vazio não apaga, e sincroniza o lead', async () => {
  novaBase({ matriculas: [matricula({ student_cpf: CPF })] });
  const { codigo, corpo } = await h.chamar(publicEnrollments, {
    action: 'questionnaire',
    id: ID,
    answers: {
      student_name: 'Aluno Novo',
      student_cpf: '',
      student_email: '',
      t_shirt_size: 'G',
      is_mechanic: true,
      experience_years: '5',
      // Nada disto pode vir do navegador:
      status: 'CheckedIn',
      amount_paid: 9999,
      total_amount: 0,
      course_id: 'outro',
    },
  });
  assert.equal(codigo, 200);
  assert.equal(corpo.client_code, 'ALU-12ABC');

  const [m] = h.estado.tabelas.SITE_Enrollments;
  assert.equal(m.student_name, 'Aluno Novo');
  assert.equal(m.student_cpf, CPF);
  assert.equal(m.student_email, 'aluno@teste.com');
  assert.equal(m.t_shirt_size, 'G');
  assert.equal(m.is_mechanic, true);
  assert.equal(m.status, 'Confirmed');
  assert.equal(m.amount_paid, 150);
  assert.equal(m.total_amount, 480);
  assert.equal(m.course_id, CURSO_ID);

  const lead = h.estado.tabelas.SITE_Leads[0];
  assert.equal(lead.name, 'Aluno Novo');
  assert.equal(lead.status, 'Converted');
  assert.equal(lead.t_shirt_size, 'G');
  assert.equal(lead.cpf, CPF);
});

test('questionário: depois de concluído, o id não reescreve o cadastro', async () => {
  novaBase({ matriculas: [matricula({ student_cpf: CPF, t_shirt_size: 'M' })] });
  const { codigo } = await h.chamar(publicEnrollments, { action: 'questionnaire', id: ID, answers: { student_name: 'Outro' } });
  assert.equal(codigo, 409);
  assert.equal(h.estado.tabelas.SITE_Enrollments[0].student_name, 'Aluno Teste');
});

test('questionário pelo lead: grava, mas não entrega o código do portal', async () => {
  novaBase();
  const { codigo, corpo } = await h.chamar(publicEnrollments, {
    action: 'questionnaire',
    leadId: LEAD_ID,
    courseId: CURSO_ID,
    answers: { t_shirt_size: 'P', student_cpf: '11122233344' },
  });
  assert.equal(codigo, 200);
  assert.equal(corpo.client_code, null);
  assert.equal(h.estado.tabelas.SITE_Enrollments[0].t_shirt_size, 'P');
});

test('questionário: sem resposta válida não grava', async () => {
  novaBase();
  for (const answers of [undefined, 'x', {}, { status: 'CheckedIn' }, { student_name: '   ' }]) {
    assert.equal((await h.chamar(publicEnrollments, { action: 'questionnaire', id: ID, answers })).codigo, 400);
  }
  assert.equal(h.chamadasDe('SITE_Enrollments', 'PATCH').length, 0);
});

test('certificado: valida sem expor contato, e só para quem pagou', async () => {
  novaBase({ matriculas: [matricula({ student_cpf: CPF, status: 'CheckedIn' })] });
  const { codigo, corpo } = await h.chamar(publicEnrollments, { action: 'certificate', id: ID });
  assert.equal(codigo, 200);
  assert.deepEqual(corpo.certificate, {
    reference: 'aaaaaaaa',
    student_name: 'Aluno Teste',
    course: { title: 'Curso de Suspensão', location: 'Sede', location_type: 'Presencial', date: '2026-12-01' },
  });

  novaBase({ matriculas: [matricula({ status: 'Pending' })] });
  assert.equal((await h.chamar(publicEnrollments, { action: 'certificate', id: ID })).codigo, 404);
  assert.equal((await h.chamar(publicEnrollments, { action: 'certificate', id: 'nao-e-uuid' })).codigo, 404);
});

test('inscrição direta: só no curso liberado, sempre Pending e sem valor pago', async () => {
  novaBase({ matriculas: [] });
  const { codigo, corpo } = await h.chamar(publicEnrollments, {
    action: 'create',
    courseId: CURSO_DIRETO,
    name: 'Aluno',
    email: 'a@b.c',
    phone: '351962030640',
    status: 'Confirmed',
    amount_paid: 480,
  });
  assert.equal(codigo, 201);
  assert.deepEqual(Object.keys(corpo), ['id']);
  const [m] = h.estado.tabelas.SITE_Enrollments;
  assert.equal(m.status, 'Pending');
  assert.equal(m.amount_paid, 0);
  assert.equal(m.course_id, CURSO_DIRETO);

  novaBase({ matriculas: [] });
  assert.equal((await h.chamar(publicEnrollments, { action: 'create', courseId: CURSO_ID, name: 'A', email: 'a@b.c', phone: '1' })).codigo, 400);
  assert.equal((await h.chamar(publicEnrollments, { action: 'create', courseId: CURSO_DIRETO, name: '', email: 'a@b.c', phone: '1' })).codigo, 400);
  assert.equal(h.estado.tabelas.SITE_Enrollments.length, 0);
});

test('rota: só POST, só do próprio site, ação conhecida, com limite por IP', async () => {
  novaBase();
  assert.equal((await h.chamar(publicEnrollments, null, { metodo: 'GET' })).codigo, 405);
  assert.equal((await h.chamar(publicEnrollments, { action: 'view', id: ID }, { origem: 'https://atacante.exemplo' })).codigo, 403);
  assert.equal((await h.chamar(publicEnrollments, { action: 'apagar', id: ID })).codigo, 400);
  assert.equal((await h.chamar(publicEnrollments, { action: 'constructor', id: ID })).codigo, 400);
  assert.equal(h.estado.chamadas.length, 0);

  const ip = '10.7.7.7';
  for (let i = 0; i < 60; i += 1) {
    assert.equal((await h.chamar(publicEnrollments, { action: 'x' }, { ip })).codigo, 400);
  }
  assert.equal((await h.chamar(publicEnrollments, { action: 'x' }, { ip })).codigo, 429);
});
