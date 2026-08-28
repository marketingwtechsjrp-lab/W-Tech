import { expect, test } from '@playwright/test';
import {
    classifyEvolutionHttpStatus,
    extractEvolutionMessageId,
    formatPhone,
    normalizeEvolutionApiUrl,
} from '../server/edge/_whatsappAutomacao';

test.describe('WhatsApp da Hotmart — normalização internacional', () => {
  test('adiciona DDI 55 somente a números brasileiros sem DDI', () => {
    expect(formatPhone('(11) 99999-0000', 'BR')).toBe('5511999990000');
    expect(formatPhone('(55) 99999-0000', 'BR')).toBe('5555999990000');
    expect(formatPhone('+55 11 99999-0000', 'BR')).toBe('5511999990000');
  });

  test('preserva DDI de números internacionais', () => {
    expect(formatPhone('+351 912 345 678', 'PT')).toBe('351912345678');
    expect(formatPhone('351 912 345 678', 'PT')).toBe('351912345678');
    expect(formatPhone('0034 612 345 678', 'ES')).toBe('34612345678');
    expect(formatPhone('912 345 678', 'PT')).toBe('');
  });

  test('reconhece DDIs europeus mesmo quando a Hotmart omite o sinal de mais', () => {
    expect(formatPhone('4915123456789', 'DE')).toBe('4915123456789');
    expect(formatPhone('33612345678', 'FR')).toBe('33612345678');
    expect(formatPhone('393331234567', 'IT')).toBe('393331234567');
    expect(formatPhone('31612345678', 'NL')).toBe('31612345678');
  });

  test('sem país exige DDI explícito e nunca infere Brasil', () => {
    expect(formatPhone('11999990000')).toBe('');
    expect(formatPhone('+1 415 555 0100')).toBe('14155550100');
    expect(formatPhone('+34 612 345 678')).toBe('34612345678');
  });

  test('recusa números incompletos e acima do limite E.164', () => {
    expect(formatPhone('1234', 'PT')).toBe('');
    expect(formatPhone('99999-0000', 'BR')).toBe('');
    expect(formatPhone('123456', 'PT')).toBe('');
    expect(formatPhone('1234567890123456', 'US')).toBe('');
  });
});

test.describe('WhatsApp da Hotmart — resultado HTTP da Evolution', () => {
  test('confirma apenas respostas 2xx e rejeita erros 4xx inequívocos', () => {
    expect(classifyEvolutionHttpStatus(200)).toBe('accepted');
    expect(classifyEvolutionHttpStatus(201)).toBe('accepted');
    expect(classifyEvolutionHttpStatus(400)).toBe('rejected');
    expect(classifyEvolutionHttpStatus(401)).toBe('rejected');
    expect(classifyEvolutionHttpStatus(422)).toBe('rejected');
  });

  test('trata timeout, rate limit, conflito e erros de servidor como ambíguos', () => {
    expect(classifyEvolutionHttpStatus(408)).toBe('unknown');
    expect(classifyEvolutionHttpStatus(409)).toBe('unknown');
    expect(classifyEvolutionHttpStatus(425)).toBe('unknown');
    expect(classifyEvolutionHttpStatus(429)).toBe('unknown');
    expect(classifyEvolutionHttpStatus(500)).toBe('unknown');
    expect(classifyEvolutionHttpStatus(503)).toBe('unknown');
  });

  test('extrai somente o identificador técnico da resposta aceita', () => {
    expect(extractEvolutionMessageId({
      key: { id: 'MSG-123', remoteJid: '5511999990000@s.whatsapp.net' },
      message: { conversation: 'conteúdo privado' },
    })).toBe('MSG-123');
    expect(extractEvolutionMessageId({ messageId: 'MSG-456' })).toBe('MSG-456');
    expect(extractEvolutionMessageId(null)).toBe('');
  });
});

test.describe('WhatsApp da Hotmart — endpoint da Evolution', () => {
  test('aceita somente base HTTPS sem credenciais, porta, query ou fragmento', () => {
    expect(normalizeEvolutionApiUrl('https://evolution.example.com/api/')).toBe(
      'https://evolution.example.com/api',
    );
    expect(normalizeEvolutionApiUrl('http://evolution.example.com')).toBe('');
    expect(normalizeEvolutionApiUrl('https://user:key@evolution.example.com')).toBe('');
    expect(normalizeEvolutionApiUrl('https://evolution.example.com:8443')).toBe('');
    expect(normalizeEvolutionApiUrl('https://evolution.example.com?key=secret')).toBe('');
    expect(normalizeEvolutionApiUrl('https://evolution.example.com/#secret')).toBe('');
  });
});
