import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FaceLoginProps {
    onMatch: (userId: string) => void;
    onCancel: () => void;
}

/**
 * Login facial DESABILITADO.
 *
 * A implementação anterior baixava `face_descriptor` de TODOS os usuários
 * (SITE_Users) direto no browser com a chave anon, e comparava localmente —
 * ou seja, qualquer visitante conseguia baixar os vetores biométricos de
 * todo mundo, e o "match" era decidido inteiramente no cliente (replayável:
 * dava pra forjar um descriptor batendo com qualquer usuário sem a câmera).
 * Não existe hoje um endpoint server-side com desafio/liveness que resolva
 * isso com segurança, então o componente fica desativado — com aviso claro —
 * em vez de continuar expondo biometria ou aceitar uma autenticação forjável.
 * Reativar exige: comparação no servidor (nunca expor descriptors ao
 * cliente) + prova de vivacidade (liveness) para impedir replay de foto/vídeo.
 */
const FaceLogin: React.FC<FaceLoginProps> = ({ onCancel }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto text-center border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Login Facial</h3>

            <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-500">
                <AlertCircle size={32} className="text-amber-500" />
                <p className="text-sm font-medium">
                    Login facial temporariamente indisponível.
                </p>
                <p className="text-xs text-gray-400 max-w-xs">
                    Use e-mail e senha para acessar o painel.
                </p>
            </div>

            <button onClick={onCancel} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">
                Fechar
            </button>
        </div>
    );
};

export default FaceLogin;
