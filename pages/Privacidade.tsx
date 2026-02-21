
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacidade = () => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
             <div className="bg-wtech-black text-white py-6">
                <div className="container mx-auto px-6 flex items-center gap-4">
                    <Link to="/" className="hover:text-wtech-gold transition-colors"><ArrowLeft /></Link>
                    <h1 className="text-xl font-bold">Política de Privacidade</h1>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">1. Coleta de Informações</h2>
                        <p className="text-gray-600 leading-relaxed">
                            A W-Tech Brasil coleta informações pessoais quando você se registra em nosso site, faz um pedido, assina nossa newsletter ou preenche um formulário. As informações coletadas podem incluir seu nome, endereço de e-mail, número de telefone e detalhes do cartão de crédito.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">2. Uso das Informações</h2>
                        <p className="text-gray-600 leading-relaxed">
                            As informações que coletamos de você podem ser usadas para:
                            <ul className="list-disc ml-6 mt-2 space-y-1">
                                <li>Personalizar sua experiência e responder melhor às suas necessidades individuais.</li>
                                <li>Melhorar nosso site com base nas informações e feedbacks que recebemos de você.</li>
                                <li>Melhorar o atendimento ao consumidor e as necessidades de suporte.</li>
                                <li>Processar transações.</li>
                                <li>Enviar e-mails periódicos.</li>
                            </ul>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">3. Proteção das Informações</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Implementamos uma variedade de medidas de segurança para manter a segurança de suas informações pessoais quando você faz um pedido ou insere, envia ou acessa suas informações pessoais.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">4. Divulgação a Terceiros</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Nós não vendemos, trocamos ou transferimos de outra forma para terceiros suas informações pessoalmente identificáveis. Isso não inclui terceiros de confiança que nos auxiliam na operação de nosso site, na condução de nossos negócios ou no atendimento a você, desde que essas partes concordem em manter essas informações confidenciais.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Privacidade;
