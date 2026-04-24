import React, { useState } from 'react';
import { CheckCircle, ShieldCheck, MapPin, Wrench, GraduationCap, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';

const PricingCard = ({
  title,
  price,
  features,
  isPopular,
  buttonText,
  link,
  description
}: {
  title: string,
  price: string,
  features: string[],
  isPopular?: boolean,
  buttonText: string,
  link: string,
  description: string
}) => (
  <motion.div
    whileHover={{ y: -8 }}
    className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${isPopular
        ? 'bg-wtech-black text-white border-wtech-gold shadow-2xl scale-105 z-10'
        : 'bg-white text-gray-900 border-gray-200 shadow-lg hover:border-wtech-gold/50'
      }`}
  >
    {isPopular && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-wtech-gold text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
        Mais Escolhido
      </div>
    )}

    <div className="mb-6">
      <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
    </div>

    <div className="mb-8 flex items-end">
      <span className="text-4xl font-bold">{price}</span>
      <span className={`text-sm ml-1 mb-1 ${isPopular ? 'text-gray-400' : 'text-gray-500'}`}>/ano</span>
    </div>

    <ul className="space-y-4 mb-8 flex-grow">
      {features.map((feature, idx) => (
        <li key={idx} className="flex items-start gap-3 text-sm">
          <CheckCircle size={18} className={`flex-shrink-0 mt-0.5 ${isPopular ? 'text-wtech-gold' : 'text-green-600'}`} />
          <span className={isPopular ? 'text-gray-300' : 'text-gray-600'}>{feature}</span>
        </li>
      ))}
    </ul>

    <Link
      to={link}
      className={`w-full py-4 rounded-lg font-bold text-center uppercase tracking-wide transition-colors flex items-center justify-center gap-2 ${isPopular
          ? 'bg-wtech-gold text-black hover:bg-white'
          : 'bg-black text-white hover:bg-gray-800'
        }`}
    >
      {buttonText} <ArrowRight size={16} />
    </Link>
  </motion.div>
);

const Plans: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  return (
    <div className="bg-slate-50 min-h-screen">
      <SEO
        title="Planos e Credenciamento"
        description="Torne-se um Credenciado Oficial W-Tech. Planos para mecânicos e oficinas com benefícios exclusivos, suporte técnico e descontos em cursos."
      />

      {/* Hero */}
      <section className="bg-wtech-black text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-wtech-gold/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Invista na sua <span className="text-wtech-gold">Autoridade</span>.</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Escolha o plano ideal para se tornar um Credenciado Oficial W-TECH e colocar sua oficina no mapa da alta performance.
          </p>

          {/* Toggle (Visual Only for now) */}
          <div className="inline-flex bg-white/10 p-1 rounded-full backdrop-blur">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-wtech-gold text-black' : 'text-white hover:text-wtech-gold'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'yearly' ? 'bg-wtech-gold text-black' : 'text-white hover:text-wtech-gold'}`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 -mt-16 pb-24 relative z-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">

          <PricingCard
            title="Estudante"
            description="Para quem está começando e quer aprender."
            price="Grátis"
            buttonText="Criar Conta"
            link="/courses"
            features={[
              "Acesso ao catálogo de cursos",
              "Blog e Glossário Técnico",
              "Newsletter semanal",
              "Compra avulsa de treinamentos"
            ]}
          />

          <PricingCard
            title="Mecânico PRO"
            description="Para profissionais que buscam reconhecimento."
            price="R$ 997"
            isPopular={true}
            buttonText="Quero me Credenciar"
            link="/register-mechanic"
            features={[
              "Selo Oficial de Credenciado W-TECH",
              "Pino no Mapa de Oficinas (Brasil)",
              "Certificado Digital de Afiliação",
              "Acesso ao Portal do Mecânico",
              "10% de desconto em todos os cursos",
              "Suporte técnico via WhatsApp"
            ]}
          />

          <PricingCard
            title="Oficina Elite"
            description="Para centros automotivos de alta performance."
            price="R$ 2.490"
            buttonText="Falar com Consultor"
            link="/contact"
            features={[
              "Tudo do plano PRO",
              "Destaque Ouro no Mapa (Topo das buscas)",
              "Credenciamento para até 3 mecânicos",
              "20% de desconto em cursos presenciais",
              "Mentoria mensal com engenharia",
              "Acesso antecipado a lançamentos"
            ]}
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-wtech-black">Perguntas Frequentes</h2>

          <div className="space-y-4">
            {[
              { q: "Como funciona o processo de credenciamento?", a: "Após assinar o plano PRO, nossa equipe técnica analisará seu perfil e certificações. Sendo aprovado, você recebe o selo e entra no mapa em até 48h." },
              { q: "Preciso ter feito cursos da W-TECH?", a: "É altamente recomendado. Para o selo Elite, é obrigatório ter pelo menos o curso de Suspensão Avançada." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim. No plano anual, o cancelamento encerra a renovação automática, mas você mantém os benefícios até o fim do ciclo vigente." },
              { q: "O suporte técnico é ilimitado?", a: "O suporte cobre dúvidas sobre procedimentos ensinados nos cursos e auxílio em diagnósticos complexos, dentro do horário comercial." }
            ].map((item, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-6 hover:border-wtech-gold transition-colors">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <span className="text-wtech-gold">?</span> {item.q}
                </h3>
                <p className="text-gray-600 ml-5">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Elements */}
      <section className="py-16 bg-gray-50 border-t border-gray-200 text-center">
        <div className="container mx-auto px-4">
          <p className="text-gray-500 uppercase tracking-widest text-sm font-bold mb-8">Empresas que confiam na metodologia W-TECH</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale">
            {/* Mock Logos */}
            <div className="text-2xl font-black">OHLINS</div>
            <div className="text-2xl font-black">SHOWA</div>
            <div className="text-2xl font-black">KYB</div>
            <div className="text-2xl font-black">MOTUL</div>
            <div className="text-2xl font-black">BREMBO</div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Plans;