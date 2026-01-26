import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Check, CreditCard, Lock, Smartphone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';
import { trackEvent } from '../components/AnalyticsTracker';

const Checkout: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    paymentMethod: 'Credit_Card' as 'Credit_Card' | 'Pix' | 'Boleto'
  });

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return alert('Preencha os dados.');
    
    setLoading(true);

    try {
        trackEvent('Ecommerce', 'purchase_attempt', `Total: ${total}`);

        // 1. Create Lead
        const { data: leadData, error: leadError } = await supabase
            .from('SITE_Leads')
            .insert([{
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                type: 'Course_Registration',
                status: 'New',
                context_id: items.map(i => i.title).join(', ') // Store courses of interest
            }])
            .select()
            .single();

        if (leadError) throw leadError;

        // 2. Create Order
        const { data: orderData, error: orderError } = await supabase
            .from('SITE_Orders')
            .insert([{
                customer_name: formData.name,
                customer_email: formData.email,
                customer_cpf: formData.cpf,
                customer_phone: formData.phone,
                total: total,
                payment_method: formData.paymentMethod,
                status: 'Paid', // Simulating successful payment
                items: items // JSONB
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Trigger Webhooks
        await triggerWebhook('webhook_order', {
             orderId: orderData.id,
             customer: formData,
             items: items,
             total: total
        });
        
        await triggerWebhook('webhook_lead', {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            type: 'Course_Purchase',
            status: 'New',
            context_id: `Order #${orderData.id.slice(0,8)}`
        });

        trackEvent('Ecommerce', 'purchase_success', `Order: ${orderData.id}`);

        setOrderId(orderData.id.slice(0,8).toUpperCase());
        setStep(3); // Success
        clearCart();

    } catch (err) {
        console.error(err);
        trackEvent('Ecommerce', 'purchase_error', (err as Error).message);
        alert('Erro ao processar pedido. Tente novamente.');
    } finally {
        setLoading(false);
    }
  };

  if (items.length === 0 && step !== 3) {
    return (
        <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-bold mb-4">Seu carrinho está vazio</h1>
            <Link to="/courses" className="text-wtech-gold font-bold underline">Voltar para cursos</Link>
        </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-wtech-black mb-8">Finalizar Inscrição</h1>

        {step === 3 ? (
            <div className="bg-white p-12 rounded-lg shadow-lg text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-4">Pedido Confirmado!</h2>
                <p className="text-gray-600 mb-8">
                    Sua inscrição foi realizada com sucesso. Você receberá um e-mail com os detalhes do curso e link de acesso (se online).
                </p>
                <div className="bg-gray-50 p-4 rounded mb-8 text-left">
                    <p className="font-bold text-sm text-gray-500 uppercase">Número do Pedido</p>
                    <p className="text-xl font-mono">#{orderId}</p>
                </div>
                <Link to="/" className="bg-wtech-gold text-black px-8 py-3 rounded font-bold hover:bg-yellow-500">
                    Voltar para Home
                </Link>
            </div>
        ) : (
            <div className="grid md:grid-cols-3 gap-8">
                {/* Forms */}
                <div className="md:col-span-2 space-y-6">
                    {/* User Data */}
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <span className="bg-wtech-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                            Dados Pessoais
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo</label>
                                <input type="text" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                                <input type="text" className="w-full border p-2 rounded" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                                <input type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Celular</label>
                                <input type="tel" className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-bold mb-4 flex items-center">
                            <span className="bg-wtech-black text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                            Pagamento
                        </h2>
                        
                        <div className="flex gap-4 mb-6">
                            <button 
                                onClick={() => {
                                    setFormData({...formData, paymentMethod: 'Credit_Card'});
                                    trackEvent('Ecommerce', 'select_payment', 'Credit Card');
                                }}
                                className={`flex-1 py-3 px-4 rounded border flex items-center justify-center gap-2 font-bold ${formData.paymentMethod === 'Credit_Card' ? 'border-wtech-gold bg-yellow-50 text-black' : 'border-gray-200 text-gray-500'}`}
                            >
                                <CreditCard size={20} /> Cartão de Crédito
                            </button>
                            <button 
                                onClick={() => {
                                    setFormData({...formData, paymentMethod: 'Pix'});
                                    trackEvent('Ecommerce', 'select_payment', 'Pix');
                                }}
                                className={`flex-1 py-3 px-4 rounded border flex items-center justify-center gap-2 font-bold ${formData.paymentMethod === 'Pix' ? 'border-wtech-gold bg-yellow-50 text-black' : 'border-gray-200 text-gray-500'}`}
                            >
                                <Smartphone size={20} /> Pix
                            </button>
                        </div>

                        {formData.paymentMethod === 'Credit_Card' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número do Cartão</label>
                                    <div className="relative">
                                        <input type="text" className="w-full border p-2 rounded pl-10" placeholder="0000 0000 0000 0000" />
                                        <CreditCard size={18} className="absolute left-3 top-2.5 text-gray-400" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Validade</label>
                                        <input type="text" className="w-full border p-2 rounded" placeholder="MM/AA" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                                        <input type="text" className="w-full border p-2 rounded" placeholder="123" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome no Cartão</label>
                                    <input type="text" className="w-full border p-2 rounded" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded border border-gray-200">
                                <p className="mb-2 font-bold">O código Pix será gerado na próxima etapa.</p>
                                <p className="text-sm text-gray-500">Aprovação imediata.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm sticky top-24">
                        <h3 className="text-lg font-bold mb-4">Resumo do Pedido</h3>
                        <div className="space-y-3 mb-6">
                            {items.map(item => (
                                <div key={item.courseId} className="flex justify-between text-sm">
                                    <span className="text-gray-600 truncate w-2/3">{item.title}</span>
                                    <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-4 mb-6 flex justify-between items-center">
                            <span className="font-bold text-lg">Total</span>
                            <span className="font-bold text-2xl text-wtech-black">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                        </div>
                        
                        <button 
                            onClick={handleFinish}
                            disabled={loading}
                            className="w-full bg-wtech-gold text-black font-bold py-3 rounded hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Processando...' : (
                                <><Lock size={18} /> CONFIRMAR PAGAMENTO</>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                            <Lock size={12} /> Ambiente 100% Seguro
                        </p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;