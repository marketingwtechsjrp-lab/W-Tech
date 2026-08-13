import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FaceRegistrationProps {
    onCapture: (descriptor: number[]) => void;
    onCancel: () => void;
}

/**
 * Cadastro facial DESABILITADO — mesmo motivo de components/FaceLogin.tsx:
 * o descriptor capturado aqui alimentava um "login" comparado inteiramente
 * no cliente (replayável, sem liveness), e ficaria salvo em SITE_Users para
 * qualquer leitura anon baixar depois. Sem um fluxo server-side com
 * desafio/liveness, não existe forma segura de cadastrar biometria hoje.
 */
const FaceRegistration: React.FC<FaceRegistrationProps> = ({ onCancel }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto text-center border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-800">Cadastro Facial</h3>

            <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-500">
                <AlertCircle size={32} className="text-amber-500" />
                <p className="text-sm font-medium">
                    Cadastro facial temporariamente indisponível.
                </p>
            </div>

            <button onClick={onCancel} className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">
                Fechar
            </button>
        </div>
    );
};

export default FaceRegistration;
