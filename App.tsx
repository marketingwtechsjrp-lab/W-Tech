import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
const LandingPageViewerV2 = lazy(() => import('./pages/LandingPageViewerV2'));
const LandingPageViewerV3 = lazy(() => import('./pages/LandingPageViewerV3'));
const LandingPageViewerV4 = lazy(() => import('./pages/LandingPageViewerV4'));
const LandingPageViewerV5 = lazy(() => import('./pages/LandingPageViewerV5'));
const LandingPageViewerV6 = lazy(() => import('./pages/LandingPageViewerV6'));
const LandingPageViewerV7 = lazy(() => import('./pages/LandingPageViewerV7'));
const LandingPageViewerV8 = lazy(() => import('./pages/LandingPageViewerV8'));
const LandingPageViewerV9 = lazy(() => import('./pages/LandingPageViewerV9'));
const HomeP2 = lazy(() => import('./pages/HomeP2'));
const Home3 = lazy(() => import('./pages/Home3'));
const LPEuropa = lazy(() => import('./pages/LPEuropa'));
const LPLisboaFev2026 = lazy(() => import('./pages/LPLisboaFev2026'));
const LPWTechLisboa = lazy(() => import('./pages/LPWTechLisboa'));
const WTechLisboa = lazy(() => import('./pages/WTechLisboa'));
const LPWTechLisboaNov2026 = lazy(() => import('./pages/LPWTechLisboaNov2026'));
const WTechLisboaNov2026 = lazy(() => import('./pages/WTechLisboaNov2026'));
const LPProRidersLisboa = lazy(() => import('./pages/LPProRidersLisboa'));
const ObrigadoLisboa = lazy(() => import('./pages/ObrigadoLisboa'));
const CheckoutLisboa = lazy(() => import('./pages/CheckoutLisboa'));
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
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const LPErgonomia = lazy(() => import('./pages/LPErgonomia'));
const LPErgonomia2 = lazy(() => import('./pages/LPErgonomia2'));
const LPErgonomia3 = lazy(() => import('./pages/LPErgonomia3'));
const LPErgonomia4 = lazy(() => import('./pages/LPErgonomia4'));
const LPErgonomiaVSL = lazy(() => import('./pages/LPErgonomiaVSL'));
const LPErgonomiaLight = lazy(() => import('./pages/LPErgonomiaLight'));
const PronelloImmersion = lazy(() => import('./pages/PronelloImmersion'));
const WaitlistSuspension = lazy(() => import('./pages/WaitlistSuspension'));
const QuizSuspensao = lazy(() => import('./pages/QuizSuspensao'));
const CourseCheckout = lazy(() => import('./pages/CourseCheckout'));
const InscricaoConfirmada = lazy(() => import('./pages/InscricaoConfirmada'));
const LPGasGarage = lazy(() => import('./pages/LPGasGarage'));
const ObrigadoSuspensao = lazy(() => import('./pages/ObrigadoSuspensao'));
const AffiliatesManagerView = lazy(() => import('./components/admin/Marketing/AffiliatesManagerView'));
const MolasCalculator = lazy(() => import('./pages/MolasCalculator'));
const CaptureCampaignPage = lazy(() => import('./pages/CaptureCampaign'));
const OleoCalculator = lazy(() => import('./pages/OleoCalculator'));



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

import { LanguageProvider } from './context/LanguageContext';
import { AnalyticsTracker } from './components/AnalyticsTracker';

const App = () => {
  return (
    <LanguageProvider>
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
                    <Route path="/glossario" element={<Layout><Glossary /></Layout>} />
                    <Route path="/glossario/:slug" element={<Layout><Glossary /></Layout>} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/sou-mecanico" element={<MechanicRegister />} />
                    <Route path="/mapa" element={<Layout><MechanicsMap /></Layout>} />
                    <Route path="/molas" element={<Layout><MolasCalculator /></Layout>} />
                    <Route path="/oleo" element={<Layout><OleoCalculator /></Layout>} />
                    <Route path="/checkout/:planId" element={<Layout><Checkout /></Layout>} />
                    <Route path="/contato" element={<Layout><Contact /></Layout>} />
                    <Route path="/blog" element={<Layout><Blog /></Layout>} />
                    <Route path="/blog/:slug" element={<Layout><BlogPost /></Layout>} />

                    {/* Landing Pages */}
                    <Route path="/lp/europa" element={<LPEuropa />} />
                    <Route path="/lp-lisboa-fev-2026" element={<LPLisboaFev2026 />} />
                    <Route path="/lp-wtech-lisboa" element={<LPWTechLisboa />} />
                    <Route path="/wtech-lisboa" element={<WTechLisboa />} />
                    <Route path="/lp-wtech-lisboa-nov" element={<LPWTechLisboaNov2026 />} />
                    <Route path="/wtech-lisboa-nov" element={<WTechLisboaNov2026 />} />
                    <Route path="/lp-proriders-lisboa" element={<LPProRidersLisboa />} />
                    <Route path="/obrigado-lisboa" element={<ObrigadoLisboa />} />
                    <Route path="/checkout-lisboa" element={<CheckoutLisboa />} />
                    <Route path="/curso-suspensao-piloto" element={<LPErgonomia />} />
                    <Route path="/curso-suspensao-piloto-v2" element={<LPErgonomia2 />} />
                    <Route path="/curso-suspensao-piloto-v3" element={<LPErgonomia3 />} />
                    <Route path="/curso-suspensao-piloto-v4" element={<LPErgonomia4 />} />
                    <Route path="/curso-suspensao-piloto-completa" element={<LPErgonomia forceFullContent />} />
                    <Route path="/curso-suspensao-piloto-vsl" element={<LPErgonomiaVSL />} />
                    <Route path="/curso-suspensao-piloto-clara" element={<LPErgonomiaLight />} />
                    <Route path="/imersao-pronello" element={<PronelloImmersion />} />
                    <Route path="/chao-de-oficina" element={<LPGasGarage />} />
                    <Route path="/obrigado-suspensao" element={<ObrigadoSuspensao />} />
                    <Route path="/espera-suspensao-piloto" element={<WaitlistSuspension />} />
                    <Route path="/quiz-suspensao" element={<QuizSuspensao />} />
                    <Route path="/captura/:slug" element={<CaptureCampaignPage />} />
                    <Route path="/lp/:slug" element={<LandingPageViewer />} />
                    <Route path="/lp2/:slug" element={<LandingPageViewerV2 />} />
                    <Route path="/lp3/:slug" element={<LandingPageViewerV3 />} />
                    <Route path="/lp4/:slug" element={<LandingPageViewerV4 />} />
                    <Route path="/lp5/:slug" element={<LandingPageViewerV5 />} />
                    <Route path="/lp6/:slug" element={<LandingPageViewerV6 />} />
                    <Route path="/lp7/:slug" element={<LandingPageViewerV7 />} />
                    <Route path="/lp8/:slug" element={<LandingPageViewerV8 />} />
                    <Route path="/lp9/:slug" element={<LandingPageViewerV9 />} />

                    {/* Legal Pages */}
                    <Route path="/termos" element={<Termos />} />
                    <Route path="/privacidade" element={<Privacidade />} />
                    <Route path="/cancelamento" element={<Cancelamento />} />
                    <Route path="/suporte" element={<Suporte />} />

                    {/* Validation */}
                    <Route path="/validar/:id" element={<CertificateValidation />} />
                    <Route path="/bio" element={<Bio />} />
                    <Route path="/pagamento-sucesso" element={<PaymentSuccess />} />
                    <Route path="/checkout-curso/:courseId" element={<CourseCheckout />} />
                    <Route path="/inscricao-confirmada" element={<InscricaoConfirmada />} />

                    {/* Affiliates Public Portal */}
                    <Route path="/afiliados" element={<AffiliatesManagerView publicMode={true} />} />
                    <Route path="/portal-afiliados" element={<Navigate to="/afiliados" replace />} />


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
    </LanguageProvider>
  );
};

export default App;
