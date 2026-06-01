---
trigger: always_on
---

================================================================================
rule-09-updates-and-releases.md
LEI 09: Versionamento, Releases no GitHub e Histórico Interno de Atualizações
================================================================================

MOTIVO:
Garantir que todo sistema desenvolvido possua total rastreabilidade de suas melhorias, controle de versões (Semantic Versioning), integração clara com o GitHub via Releases, e uma interface/seção interna para os usuários acompanharem o histórico de atualizações.

GATILHO:
Ativado ao criar um novo sistema, planejar uma nova versão de um projeto existente, preparar deploys ou realizar modificações de código/estrutura em qualquer projeto do workspace.

DIRETRIZES E REGRAS INEGOCIÁVEIS:

1. SEÇÃO DE ATUALIZAÇÕES INTERNA DO SISTEMA:
   - Todo sistema/aplicação deve incluir uma tela, página ou seção visível (ex: `/updates`, `/changelog`, `/novidades`, ou uma aba dentro do Dashboard/Configurações) detalhando o histórico de atualizações.
   - O sistema deve expor sua versão atual (ex: v1.2.0) de forma discreta e elegante (ex: no rodapé da página principal ou no menu lateral de configurações).
   - O histórico interno deve listar de forma amigável: a data, a versão e os itens divididos entre:
     - 🚀 [Novidades / Funcionalidades]
     - ⚡ [Melhorias]
     - 🐛 [Correções de Bugs]

2. ESTRUTURA DE ARQUIVO CHANGELOG.md (RAIZ DO PROJETO):
   - Cada repositório de projeto deve conter um arquivo `CHANGELOG.md` na raiz atualizado periodicamente.
   - O formato deve seguir o padrão "Keep a Changelog" (https://keepachangelog.com/), usando Semantic Versioning (SemVer: MAJOR.MINOR.PATCH).

3. INTEGRAÇÃO E RELEASES NO GITHUB:
   - Toda versão estável promovida para produção deve gerar uma nova **Release no GitHub** correspondente, acompanhada da tag `vX.Y.Z`.
   - As notas de release (Release Notes) do GitHub devem ser preenchidas detalhando as alterações contidas naquela versão, copiadas diretamente do histórico interno/CHANGELOG.
   - Use branches de desenvolvimento/staging e faça merge para a branch principal (`main`/`master`) somente após a validação completa, gerando a tag de versão logo em seguida.

4. LOGS INTERNOS DE VERSÃO (BANCO DE DADOS / CONFIGURAÇÃO):
   - Para sistemas que utilizam banco de dados, mantenha uma tabela ou registro interno (ex: `system_settings` ou `system_updates`) contendo a versão atual e o histórico de migrações aplicadas. Isso impede incompatibilidade de schemas entre diferentes versões.

EXEMPLO DE SEÇÃO DE HISTÓRICO INTERNA (JSON/CONFIG):
```json
[
  {
    "version": "1.1.0",
    "date": "2026-05-28",
    "title": "Painel de Métricas e Performance",
    "changes": {
      "features": ["Adicionado gráfico de faturamento mensal em tempo real", "Implementado suporte a exportação de PDF"],
      "improvements": ["Otimização de 40% na velocidade de carregamento da tabela principal"],
      "fixes": ["Corrigido bug no filtro de data que ignorava fusos horários específicos"]
    }
  }
]
```
