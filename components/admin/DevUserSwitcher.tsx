import React from 'react';

/**
 * "Super Admin" (troca de usuário sem reautenticar) — DESATIVADO.
 *
 * Baixava a tabela SITE_Users inteira (incluindo permissions/role de todo
 * mundo) com a chave anon e trocava o usuário logado só no estado do React,
 * sem qualquer validação do servidor — um bypass completo da sessão real.
 * Incompatível com o modelo de sessão httpOnly (context/AuthContext.tsx
 * nem expõe mais `impersonateUser`). Não tem mais import em lugar nenhum do
 * app (removido de pages/Admin.tsx); o componente fica só como stub inerte
 * para não quebrar se alguém reimportar por engano.
 */
const DevUserSwitcher = (_props: { onClose?: () => void }) => {
    return null;
};

export default DevUserSwitcher;
