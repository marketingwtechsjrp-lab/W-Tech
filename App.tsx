import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { WhatsAppInterceptor } from './components/WhatsAppInterceptor';
import { supabase } from './lib/supabaseClient'; // Assuming supabaseClient.ts exists

// Lazy Load Pages
const Home = lazy(() => import('./pages/Home'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Admin = lazy(() => import('./pages/Admin'));
const MechanicRegister = lazy(() => import('./pages/MechanicRegister'));
const MechanicsMap = lazy(() => import('./pages/MechanicsMap'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Contact = lazy(() => import('./pages/Contact'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const LandingPageViewer = lazy(() => import('./pages/LandingPageViewer'));
const HomeP2 = lazy(() => import('./pages/HomeP2'));
const Home3 = lazy(() => import('./pages/Home3'));
const LPEuropa = lazy(() => import('./pages/LPEuropa'));
const LPLisboaFev2026 = lazy(() => import('./pages/LPLisboaFev2026'));
const LPWTechLisboa = lazy(() => import('./pages/LPWTechLisboa'));
const LPProRidersLisboa = lazy(() => import('./pages/LPProRidersLisboa'));
const Termos = lazy(() => import('./pages/Termos'));
const Privacidade = lazy(() => import('./pages/Privacidade'));
const Cancelamento = lazy(() => import('./pages/Cancelamento'));
const Suporte = lazy(() => import('./pages/Suporte'));
const CertificateValidation = lazy(() => import('./pages/CertificateValidation'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ClientPortal = lazy(() => import('./pages/meus-pedidos'));
const OrderTracking = lazy(() => import('./pages/rastreio'));
const GoogleCallback = lazy(() => import('./pages/auth/GoogleCallback'));
const Bio = lazy(() => import('./pages/bio'));



// Loading Fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="w-10 h-10 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Extend Window interface to add hasInjectedScripts property
declare global {
  interface Window {
    hasInjectedScripts?: boolean;
  }
}

import { ThemeProvider } from 'next-themes';

import { AnalyticsTracker } from './components/AnalyticsTracker';

const App = () => {
  return (
    <SettingsProvider>
      {/* @ts-ignore - ThemeProvider types mismatch */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Router>
          <AuthProvider>
            <CartProvider>
              <div className="flex flex-col min-h-screen bg-white dark:bg-[#111] transition-colors duration-300">
                <WhatsAppInterceptor />
                <AnalyticsTracker />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Layout><Home3 /></Layout>} />
                    <Route path="/home-legacy" element={<Layout><Home /></Layout>} />
                    <Route path="/home-p2" element={<HomeP2 />} />
                    <Route path="/cursos" element={<Layout><Courses /></Layout>} />
                    <Route path="/cursos/:id" element={<Layout><CourseDetail /></Layout>} />
                    <Route path="/glossario" element={<Glossary />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/sou-mecanico" element={<MechanicRegister />} />
                    <Route path="/mapa" element={<Layout><MechanicsMap /></Layout>} />
                    <Route path="/checkout/:planId" element={<Layout><Checkout /></Layout>} />
                    <Route path="/contato" element={<Layout><Contact /></Layout>} />
                    <Route path="/blog" element={<Layout><Blog /></Layout>} />
                    <Route path="/blog/:slug" element={<Layout><BlogPost /></Layout>} />

                    {/* Landing Pages */}
                    <Route path="/lp/europa" element={<LPEuropa />} />
                    <Route path="/lp-lisboa-fev-2026" element={<LPLisboaFev2026 />} />
                    <Route path="/lp-wtech-lisboa" element={<LPWTechLisboa />} />
                    <Route path="/lp-proriders-lisboa" element={<LPProRidersLisboa />} />
                    <Route path="/lp/:slug" element={<LandingPageViewer />} />

                    {/* Legal Pages */}
                    <Route path="/termos" element={<Termos />} />
                    <Route path="/privacidade" element={<Privacidade />} />
                    <Route path="/cancelamento" element={<Cancelamento />} />
                    <Route path="/suporte" element={<Suporte />} />

                    {/* Validation */}
                    <Route path="/validar/:id" element={<CertificateValidation />} />
                    <Route path="/bio" element={<Bio />} />


                    {/* Order Portals */}
                    <Route path="/meus-pedidos" element={<ClientPortal />} />
                    <Route path="/rastreio" element={<Layout><OrderTracking /></Layout>} />

                    <Route path="/auth/google/callback" element={<GoogleCallback />} />

                    <Route path="*" element={<NotFound />} />


                  </Routes>
                </Suspense>
              </div>
            </CartProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default App;