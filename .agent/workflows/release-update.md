---
description: Processo para subir atualizações do sistema
---

# Fluxo de Atualização/Release do Sistema

Este processo deve ser executado **SEMPRE** que houver uma atualização de código que será enviada para o GitHub.

## 1. Atualizar Versão e Changelog

Antes de fazer o commit final, você deve editar o arquivo manualmente ou solicitar que o agente faça:

`src/lib/changelog.ts`

1. Adicione um novo objeto ao array `CHANGELOG`.
2. Aumente o número da versão (SemVer: x.y.z).
    - **Major (x)**: Mudanças drásticas/quebras.
    - **Minor (y)**: Novas funcionalidades.
    - **Patch (z)**: Correções de bugs ou pequenas melhorias.
3. Atualize a constante `SYSTEM_VERSION` para coincidir com a nova versão.

Exemplo:

```typescript
export const SYSTEM_VERSION = '1.1.0';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0', // Nova entrada no topo
    date: '02/02/2026',
    title: 'Integração com WhatsApp',
    changes: [
      'Envio automático de mensagens',
      'Correção no login'
    ]
  },
  // ... versões anteriores
];
```

## 2. Atulizar package.json

Atualize o campo `"version"` no arquivo `package.json` para manter a consistência com o `SYSTEM_VERSION`.

## 3. Commit e Push

Após atualizar o changelog e a versão, prossiga com o commit e push para o GitHub.

```bash
git add .
git commit -m "chore(release): v1.1.0 - Atualização do sistema"
git push
```

## Regra de Ouro

**NUNCA** suba uma alteração funcional sem registrar no Changelog. Isso garante que o usuário final saiba o que mudou na aba "Configurações > Atualizações".
