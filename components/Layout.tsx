import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart, User as UserIcon, LogIn, Instagram, Facebook, Youtube, MessageCircle, Mail, Phone, MapPin } from 'lucide-react';
import { ASSETS, APP_VERSION } from '../constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartDrawer from './CartDrawer';
import LoginModal from './LoginModal';
import { motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import { Header } from './ui/header-2';
import { useLanguage } from '../context/LanguageContext';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { toggleCart, items } = useCart();
  const { user, setShowLoginModal, logout } = useAuth();
  const { get } = useSettings();
  const { t } = useLanguage();

  const siteTitle = get('site_title', 'W-TECH');
  const logoUrl = get('logo_url', ASSETS.LOGO_URL);
  const contactEmail = get('email_contato', 'comercial@w-techbrasil.com.br');
  const contactPhone = get('phone_main', '17 3231-2858');
  const contactAddr = get('address', 'São José do Rio Preto, SP');

  const instagram = get('instagram', '');
  const facebook = get('facebook', '');
  const youtube = get('youtube', ''); 
  const whatsapp = get('whatsapp_phone', '');

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <CartDrawer />
      <LoginModal />
      
      <Header />

      {/* Main Content */}
      <main className="flex-grow bg-slate-50">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="bg-wtech-black text-gray-400 py-12 border-t-4 border-wtech-gold">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div>
            <img src={logoUrl} alt={siteTitle} className="h-10 mb-6 opacity-90" />
            <p className="text-sm leading-relaxed mb-6">
              {t.footer.desc}
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
                {instagram && (
                    <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center hover:bg-wtech-gold hover:text-black transition-all">
                        <Instagram size={20} />
                    </a>
                )}
                {facebook && (
                    <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center hover:bg-wtech-gold hover:text-black transition-all">
                        <Facebook size={20} />
                    </a>
                )}
                {youtube && (
                    <a href={youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center hover:bg-wtech-gold hover:text-black transition-all">
                        <Youtube size={20} />
                    </a>
                )}
                 {whatsapp && (
                    <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center hover:bg-wtech-gold hover:text-black transition-all">
                        <MessageCircle size={20} />
                    </a>
                )}
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold uppercase mb-4">{t.footer.quickLinks}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/cursos" className="hover:text-wtech-gold">{t.nav.courses}</Link></li>
              <li><Link to="/mapa" className="hover:text-wtech-gold">{t.nav.mechanics}</Link></li>
              <li><Link to="/molas" className="hover:text-wtech-gold">{t.nav.springs}</Link></li>
              <li><Link to="/oleo" className="hover:text-wtech-gold">{t.nav.oil}</Link></li>
              <li><button onClick={() => setShowLoginModal(true)} className="hover:text-wtech-gold text-left">{t.nav.admin}</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold uppercase mb-4">{t.footer.legal}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/termos" className="hover:text-wtech-gold">{t.footer.terms}</Link></li>
              <li><Link to="/privacidade" className="hover:text-wtech-gold">{t.footer.privacy}</Link></li>
              <li><Link to="/cancelamento" className="hover:text-wtech-gold">{t.footer.cancellation}</Link></li>
              <li><Link to="/suporte" className="hover:text-wtech-gold">{t.footer.support}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold uppercase mb-4">{t.footer.contact}</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail size={16} className="text-wtech-gold"/> {contactEmail}</li>
              <li className="flex items-center gap-2"><Phone size={16} className="text-wtech-gold"/> {contactPhone}</li>
              <li className="flex items-start gap-2"><MapPin size={16} className="text-wtech-gold shrink-0 mt-1"/> <span dangerouslySetInnerHTML={{__html: contactAddr}} /></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-xs space-y-1">
          <p>&copy; {new Date().getFullYear()} {siteTitle}. {t.footer.rights} v{APP_VERSION}</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;