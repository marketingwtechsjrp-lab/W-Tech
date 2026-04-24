
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Termos = () => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
             {/* Header Simples */}
             <div className="bg-wtech-black text-white py-6">
                <div className="container mx-auto px-6 flex items-center gap-4">
                    <Link to="/" className="hover:text-wtech-gold transition-colors"><ArrowLeft /></Link>
                    <h1 className="text-xl font-bold">Termos de Uso</h1>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">1. Aceitação dos Termos</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Ao acessar e utilizar os serviços da W-Tech Brasil, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">2. Uso do Site</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Você concorda em usar nosso site apenas para fins legais e de uma maneira que não infrinja os direitos de, restrinja ou iniba o uso e o aproveitamento do site por qualquer terceiro. Comportamento proibido inclui assediar ou causar angústia ou inconveniência a qualquer outra pessoa, transmitir conteúdo obsceno ou ofensivo ou interromper o fluxo normal de diálogo dentro do nosso site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">3. Propriedade Intelectual</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Todo o conteúdo incluído neste site, como texto, gráficos, logotipos, ícones de botões, imagens, clipes de áudio, downloads digitais, compilações de dados e software, é propriedade da W-Tech Brasil ou de seus fornecedores de conteúdo e é protegido pelas leis de direitos autorais internacionais.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">4. Limitação de Responsabilidade</h2>
                        <p className="text-gray-600 leading-relaxed">
                            A W-Tech Brasil não será responsável por quaisquer danos diretos, indiretos, incidentais, consequenciais ou punitivos decorrentes do uso ou da incapacidade de usar este site ou de qualquer informação fornecida neste site.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Termos;
