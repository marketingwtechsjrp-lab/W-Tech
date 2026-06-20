# Segurança das Permissões — Estado e Plano (Fase 5)

> Documento honesto sobre o que as permissões protegem hoje e o que falta para
> torná-las uma camada de **segurança** (e não só de UX). Gerado na revisão de
> Permissões & Cargos.

## TL;DR

As permissões agora são **coerentes e configuráveis** (Fases 1–4): cada toggle da
tela corresponde a uma verificação real no código. Porém, **a verificação acontece
100% no navegador** (render-gating). Isso impede o uso acidental, mas **não impede
um usuário mal-intencionado** que conheça a API. Tornar isso seguro de verdade
exige uma das duas mudanças de arquitetura descritas abaixo.

## Por que hoje não é uma barreira de segurança

| Fato | Implicação |
|---|---|
| O front usa **apenas a `anon key`** (`lib/supabaseClient.ts`) | Todo request ao banco chega como `role = anon`, sem identidade de usuário. |
| Login é uma consulta custom a `SITE_Users` com **senha em texto puro** (`AuthContext.login`) | Não há sessão Supabase Auth → não existe `auth.uid()` por usuário. |
| RLS de tabelas críticas está em `USING (true)` / `authenticated` (ver os ~30 `fix_*_rls.sql`) | RLS por usuário foi repetidamente desativada para o app anon funcionar. |
| `hasPermission` roda no cliente | Quem chamar `supabase.from('SITE_Sales').delete()` no console **ignora** o gate. |

Conclusão: **RLS por usuário não é possível sem mudar a autenticação.** Subir
políticas RLS agora ou **quebraria** o app (anon perde escrita) ou seria inócuo.

## 🔴 Achado crítico à parte (corrigir independente das permissões)

`SITE_Users.password` é comparado em **texto puro** no login. Qualquer leitura da
tabela (RLS aberta + anon key embutida no bundle) expõe todas as senhas. Migrar
para hash (bcrypt/argon2) ou para Supabase Auth deve ser prioridade.

## Caminhos para enforcement server-side (escolher um)

### Opção A — Migrar para Supabase Auth (recomendado, maior esforço)
1. Criar usuários no Supabase Auth; vincular `SITE_Users.id` ao `auth.uid()`.
2. Login via `supabase.auth.signInWithPassword` (senhas saem do texto puro).
3. Guardar `role_id`/permissões como **custom claims** no JWT.
4. Reescrever as RLS para ler `auth.jwt()`/`auth.uid()` por tabela e ação.
5. Remover os `USING(true)`.
- **Ganho:** segurança real ponta a ponta. **Custo:** toca login + todas as queries.

### Opção B — Gateway de escrita via `api/` (incremental)
As funções em `api/` já usam a **`service_role` key** (`api/_balance.ts`, etc.).
1. Para cada mutação sensível (excluir pedido/lead, lançar financeiro, gerenciar
   produtos), criar uma rota `api/*` que recebe o `userId` + ação.
2. A rota carrega o cargo do usuário no servidor e **re-verifica a permissão**
   com a mesma `lib/permissions.ts` (reaproveitável no backend) antes de escrever.
3. O front passa a chamar a rota em vez de `supabase.from(...).delete()` direto.
4. Fechar a RLS dessas tabelas para `anon` (somente service_role escreve).
- **Ganho:** protege as ações de maior risco primeiro. **Custo:** por endpoint.

## Recomendação de sequência
1. **Já feito (Fases 1–4):** permissões coerentes e configuráveis (UX correta).
2. **Curto prazo:** hashear senhas / Opção A de login (mata o achado crítico).
3. **Médio prazo:** Opção B nas mutações destrutivas (excluir pedido/lead,
   financeiro, catálogo), depois fechar as RLS correspondentes.

> A `lib/permissions.ts` foi escrita sem dependências de React/DOM justamente para
> poder ser **reaproveitada no backend** (`api/`) na Opção B.
