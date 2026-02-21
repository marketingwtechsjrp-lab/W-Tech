
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Cancelamento = () => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
             <div className="bg-wtech-black text-white py-6">
                <div className="container mx-auto px-6 flex items-center gap-4">
                    <Link to="/" className="hover:text-wtech-gold transition-colors"><ArrowLeft /></Link>
                    <h1 className="text-xl font-bold">Política de Cancelamento</h1>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">1. Cancelamento de Cursos Presenciais</h2>
                        <p className="text-gray-600 leading-relaxed">
                            O cancelamento da inscrição em cursos presenciais pode ser solicitado até 7 dias antes da data de início do curso para reembolso integral. Cancelamentos solicitados com menos de 7 dias de antecedência estarão sujeitos a uma taxa administrativa de 20% do valor do curso.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">2. Cancelamento de Cursos Online</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Para cursos online, o cancelamento pode ser solicitado no prazo de 7 dias após a compra, desde que o aluno não tenha acessado mais de 20% do conteúdo do curso. Após esse período ou excedido o limite de acesso, não haverá reembolso.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">3. Reagendamento</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Em caso de impossibilidade de comparecimento a um curso presencial, o aluno poderá solicitar o reagendamento para uma próxima turma, sujeito à disponibilidade de vagas, sem custos adicionais, desde que comunicado com pelo menos 72 horas de antecedência.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-4 text-wtech-black">4. Cancelamento pela W-Tech Brasil</h2>
                        <p className="text-gray-600 leading-relaxed">
                            A W-Tech Brasil reserva-se o direito de cancelar ou adiar cursos por motivos de força maior ou quórum mínimo insuficiente. Nesses casos, o aluno terá direito ao reembolso integral ou crédito para futuras turmas, conforme sua preferência.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Cancelamento;
