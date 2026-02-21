import React from 'react';
import { useCart } from '../context/CartContext';
import { X, Trash2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const CartDrawer: React.FC = () => {
  const { items, removeFromCart, total, isOpen, toggleCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    toggleCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="p-5 bg-wtech-black text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-wtech-gold" />
                <h2 className="text-lg font-bold">Seu Carrinho</h2>
              </div>
              <button onClick={toggleCart} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ShoppingCart size={48} className="mb-4 opacity-20" />
                  <p>Seu carrinho está vazio.</p>
                  <button onClick={toggleCart} className="mt-4 text-wtech-gold font-bold hover:underline">
                    Ver Cursos
                  </button>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.courseId} className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <img src={item.image} alt={item.title} className="w-20 h-20 object-cover rounded bg-gray-200" />
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-gray-800 line-clamp-2">{item.title}</h3>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="font-bold text-wtech-black">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </span>
                        <button 
                          onClick={() => removeFromCart(item.courseId)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600 font-medium">Total:</span>
                  <span className="text-2xl font-bold text-wtech-black">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-wtech-gold text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-lg"
                >
                  FINALIZAR COMPRA
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;