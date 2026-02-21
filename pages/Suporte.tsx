
import React from 'react';
import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

const Suporte = () => {
    const { get } = useSettings();
    const whatsapp = get('whatsapp_phone', '5511999999999');
    const email = get('email_contato', 'contato@w-techbrasil.com.br');
    const phone = get('phone_main', '(11) 99999-9999');
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
             <div className="bg-wtech-black text-white py-6">
                <div className="container mx-auto px-6 flex items-center gap-4">
                    <Link to="/" className="hover:text-wtech-gold transition-colors"><ArrowLeft /></Link>
                    <h1 className="text-xl font-bold">Central de Suporte</h1>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold mb-2">Como podemos ajudar?</h2>
                        <p className="text-gray-500">Nossa equipe está pronta para atender você.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center p-6 border border-gray-100 rounded-xl hover:shadow-md transition-all hover:border-green-500 group">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <MessageCircle size={24}/>
                            </div>
                            <h3 className="font-bold mb-2">WhatsApp</h3>
                            <p className="text-sm text-gray-500 text-center">Atendimento rápido em horário comercial.</p>
                        </a>

                        <a href={`mailto:${email}`} className="flex flex-col items-center p-6 border border-gray-100 rounded-xl hover:shadow-md transition-all hover:border-blue-500 group">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Mail size={24}/>
                            </div>
                            <h3 className="font-bold mb-2">E-mail</h3>
                            <p className="text-sm text-gray-500 text-center">Para dúvidas gerais e parcerias.</p>
                        </a>

                        <div className="flex flex-col items-center p-6 border border-gray-100 rounded-xl hover:shadow-md transition-all hover:border-wtech-black group">
                            <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                                <Phone size={24}/>
                            </div>
                            <h3 className="font-bold mb-2">Telefone</h3>
                            <p className="text-sm text-gray-500 text-center">{phone}</p>
                        </div>
                    </div>

                    <div className="mt-12">
                        <h3 className="text-lg font-bold mb-4 border-b border-gray-100 pb-2">Perguntas Frequentes</h3>
                        <div className="space-y-4">
                            <details className="group">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <span>Como acesso meu certificado?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <p className="text-gray-600 mt-3 px-4 pb-4">
                                    Após concluir 100% das aulas e avaliações do curso, o certificado estará disponível para download na sua área do aluno.
                                </p>
                            </details>
                            <details className="group">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <span>Quais as formas de pagamento?</span>
                                    <span className="transition group-open:rotate-180">
                                        <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                    </span>
                                </summary>
                                <p className="text-gray-600 mt-3 px-4 pb-4">
                                    Aceitamos cartão de crédito, PIX e boleto bancário. O parcelamento pode ser feito em até 12x no cartão.
                                </p>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Suporte;
