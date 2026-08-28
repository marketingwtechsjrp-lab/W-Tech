import { expect, test } from '@playwright/test';
import { resolveAllowedAiGroupInstance } from '../api/_aiGroupBot.js';

test.describe('Instância segura do bot de IA', () => {
  test('aceita a seleção somente quando ela está no cadastro administrativo', () => {
    expect(resolveAllowedAiGroupInstance({
      ai_group_bot_instance: 'ia-dedicada',
      evolution_managed_instances: JSON.stringify([{ name: 'ia-dedicada' }]),
    })).toBe('ia-dedicada');
  });

  test('ignora seleção arbitrária e usa um fallback administrativo', () => {
    expect(resolveAllowedAiGroupInstance({
      ai_group_bot_instance: 'instancia-injetada',
      wa_instance_report: 'relatorio-oficial',
      evolution_managed_instances: JSON.stringify([{ name: 'outra-oficial' }]),
    })).toBe('relatorio-oficial');
  });

  test('falha fechado quando não há instância administrativa válida', () => {
    expect(resolveAllowedAiGroupInstance({
      ai_group_bot_instance: '../instancia',
      evolution_managed_instances: '{invalido',
    })).toBeUndefined();
  });
});
