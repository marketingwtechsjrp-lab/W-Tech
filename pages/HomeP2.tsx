import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Wrench, BookOpen, GraduationCap, Star, Shield, Users, Trophy, MapPin, ChevronRight, CheckCircle, Calendar, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Course, Mechanic, BlogPost } from '../types';
import CourseCard from '../components/CourseCard';

declare const L: any; // Leaflet Global from CDN

const HomeP2: React.FC = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Map Refs
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    fetchData();

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Courses (Limit 3)
    const { data: coursesData } = await supabase
      .from('SITE_Courses')
      .select('*')
      .eq('status', 'Published')
      .order('date', { ascending: true })
      .limit(3);

    if (coursesData) {
      setCourses(coursesData.map((c: any) => ({
        ...c,
        locationType: c.location_type,
        registeredCount: c.registered_count
      })));
    }

    // Fetch Mechanics (Approved only)
    const { data: mechanicsData } = await supabase
      .from('SITE_Mechanics')
      .select('*')
      .eq('status', 'Approved');

    if (mechanicsData) {
        // Process mechanics
        const processedMechanics = mechanicsData.map((m: any) => ({
            ...m,
            workshopName: m.workshop_name,
            latitude: m.latitude || -23.550520 + (Math.random() - 0.5) * 10,
            longitude: m.longitude || -46.633308 + (Math.random() - 0.5) * 10
        }));
        setMechanics(processedMechanics);
    }

    // Fetch Blog Posts (Limit 3)
    const { data: postsData } = await supabase
        .from('SITE_BlogPosts')
        .select('*')
        .eq('status', 'Published')
        .order('date', { ascending: false })
        .limit(3);

    if (postsData) {
        setPosts(postsData.map((p: any) => ({ ...p, seoScore: p.seo_score })));
    }

    setLoading(false);
  };

  // Initialize Map after mechanics load
  useEffect(() => {
    if (!loading && mechanics.length > 0 && mapContainerRef.current && !mapRef.current) {
        // Center on Brazil
        mapRef.current = L.map(mapContainerRef.current).setView([-15.793889, -47.882778], 3);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(mapRef.current);

        mechanics.forEach(mech => {
            if (mech.latitude && mech.longitude) {
                L.circleMarker([mech.latitude, mech.longitude], {
                    radius: 6,
                    fillColor: "#fbbf24", // wtech-gold
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(mapRef.current)
                .bindPopup(`<b>${mech.workshopName}</b><br>${mech.city} - ${mech.state}`);
            }
        });
    }
  }, [loading, mechanics]);

  // Get 5 random mechanics for display
  const randomMechanics = mechanics
    .sort(() => 0.5 - Math.random())
    .slice(0, 5);

  return (
    <div style={{ 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff', 
      minHeight: '100vh', 
      fontFamily: '"Inter", sans-serif',
      overflowX: 'hidden'
    }}>
      {/* Background Ambient Effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(29, 78, 216, 0.15), transparent 80%)`
      }} />

      {/* Hero Section */}
      <section style={{ 
        minHeight: '90vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        position: 'relative',
        zIndex: 1,
        paddingTop: '80px'
      }}>
        {/* Animated Background Shapes */}
        <motion.div style={{
          position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', borderRadius: '50%',
          background: 'linear-gradient(45deg, #2563eb, #7c3aed)', filter: 'blur(80px)', opacity: 0.4, y: y1
        }} />
        <motion.div style={{
          position: 'absolute', bottom: '20%', right: '10%', width: '400px', height: '400px', borderRadius: '50%',
          background: 'linear-gradient(45deg, #059669, #10b981)', filter: 'blur(80px)', opacity: 0.3, y: y2
        }} />

        <div style={{ zIndex: 3, textAlign: 'center', maxWidth: '1200px', padding: '0 20px' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
            >
                <span className="bg-white/10 text-white border border-white/20 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-md">
                    REDE TÉCNICA OFICIAL 2026
                </span>
            </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{ 
              fontSize: 'clamp(3rem, 6vw, 5rem)', 
              fontWeight: 800, 
              lineHeight: 1.1, 
              marginBottom: '24px',
              background: 'linear-gradient(to right, #ffffff, #93c5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em'
            }}
          >
            A Elite da Mecânica <br />
            Conectada.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{ fontSize: '1.25rem', color: '#9ca3af', maxWidth: '700px', margin: '0 auto 40px', lineHeight: 1.6 }}
          >
            Cursos oficiais, certificação reconhecida internacionalmente e a maior rede de oficinas especializadas do Brasil. O futuro da alta performance passa por aqui.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/cursos">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                Ver Próximos Cursos <ArrowRight size={20} />
              </motion.button>
            </Link>
            
            <Link to="/mechanics-map">
              <motion.button
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                 className="bg-transparent text-white border border-white/20 px-8 py-4 rounded-xl text-lg font-bold backdrop-blur-md flex items-center justify-center gap-2"
              >
                Buscar Mecânico <MapPin size={20} />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="border-y border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
                { number: "+8.000", label: "Alunos Formados", color: "text-blue-400" },
                { number: "500+", label: "Oficinas Credenciadas", color: "text-emerald-400" },
                { number: "100%", label: "Certificação Oficial", color: "text-amber-400" },
                { number: "BR", label: "Cobertura Nacional", color: "text-purple-400" },
            ].map((stat, i) => (
                <div key={i} className="text-center">
                    <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.number}</div>
                    <div className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</div>
                </div>
            ))}
        </div>
      </div>

      {/* NEXT COURSES SECTION */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Próximos Treinamentos</h2>
                    <p className="text-gray-400 max-w-2xl text-lg">Garanta sua vaga nas turmas confirmadas e eleve o nível da sua oficina.</p>
                </div>
                <Link to="/courses" className="hidden md:flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-bold">
                    Ver Calendário Completo <ArrowRight size={18} />
                </Link>
            </div>

            {loading ? (
                 <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid md:grid-cols-3 gap-8">
                    {courses.map(course => (
                        <div key={course.id} className="transform hover:-translate-y-2 transition-transform duration-300">
                             {/* Wrapper for Light Mode Card to look good in Dark Mode */}
                            <CourseCard course={course} />
                        </div>
                    ))}
                </div>
            )}
        </div>
      </section>

      {/* MECHANICS SHOWCASE */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-black relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        
        <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-bold mb-4">Rede de Excelência</h2>
                 <p className="text-gray-400 text-lg">Alguns dos profissionais que são referência em suas regiões.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {randomMechanics.map((mech, i) => (
                    <motion.div 
                        key={mech.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center hover:bg-white/10 transition-colors cursor-pointer"
                    >
                         <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center mb-4 border-2 border-amber-500/50">
                             <User className="text-gray-300" size={24} />
                         </div>
                         <h3 className="font-bold text-white mb-1 truncate w-full">{mech.workshopName}</h3>
                         <p className="text-gray-400 text-xs mb-3">{mech.city}, {mech.state}</p>
                         <div className="mt-auto pt-3 border-t border-white/10 w-full flex justify-center">
                            <span className="text-amber-500 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                                <Shield size={10} /> Credenciado
                            </span>
                         </div>
                    </motion.div>
                ))}
            </div>
        </div>
      </section>

       {/* ABOUT W-TECH & MAP */}
       <section className="py-0 relative">
          <div className="grid md:grid-cols-2 min-h-[600px]">
              {/* Text Side */}
              <div className="bg-zinc-900 p-12 md:p-24 flex flex-col justify-center">
                  <h2 className="text-4xl font-bold mb-8">Por que somos a <span className="text-blue-500">autoridade</span>?</h2>
                  <div className="space-y-6 text-gray-400 text-lg">
                      <p>A W-Tech não é apenas uma escola. É um ecossistema. Conectamos o fabricante da peça, o engenheiro, o mecânico e o piloto.</p>
                      <p>Nossa metodologia foi testada nas pistas e validada nas oficinas mais movimentadas do país.</p>
                      <ul className="space-y-4 pt-4">
                          {[
                              "Material didático proprietário e exclusivo",
                              "Suporte técnico vitalício para alunos",
                              "Acesso às ferramentas mais modernas do mercado",
                              "Certificação com validação via QR Code"
                          ].map((item, i) => (
                              <li key={i} className="flex items-center gap-3 text-white">
                                  <CheckCircle className="text-blue-500 shrink-0" size={20} />
                                  {item}
                              </li>
                          ))}
                      </ul>
                  </div>
              </div>
              
              {/* Map Side */}
              <div className="relative h-[400px] md:h-auto bg-gray-800">
                  <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-gray-900" />
                  <div className="absolute bottom-8 left-8 z-[500] bg-black/80 backdrop-blur p-6 rounded-xl border border-white/10 max-w-xs shadow-2xl">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="bg-amber-500 p-2 rounded-lg text-black"><MapPin size={24}/></div>
                             <div>
                                 <h4 className="font-bold text-white">Encontre Agora</h4>
                                 <p className="text-gray-400 text-xs">Busque oficinas próximas</p>
                             </div>
                        </div>
                        <Link to="/mechanics-map" className="block w-full bg-white text-black text-center py-2 rounded font-bold text-sm mt-3 hover:bg-gray-200">
                            ABRIR MAPA COMPLETO
                        </Link>
                  </div>
              </div>
          </div>
       </section>

      {/* BLOG WIDGET */}
      <section className="py-24 bg-black">
         <div className="container mx-auto px-4 max-w-7xl">
            <h2 className="text-3xl font-bold mb-12 text-center">W-TECH <span className="text-stone-500">INSIGHTS</span></h2>
            
            <div className="grid md:grid-cols-3 gap-8">
                {posts.map(post => (
                    <Link to={`/blog/${post.slug || post.id}`} key={post.id} className="group block bg-zinc-900 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all">
                        <div className="h-48 overflow-hidden">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" />
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-2 text-xs text-blue-400 mb-3 font-bold uppercase">
                                <span>{post.category}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">{post.title}</h3>
                            <p className="text-gray-500 text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                            <div className="flex items-center text-xs text-gray-600 font-bold uppercase tracking-wider">
                                Ler Artigo <ChevronRight size={14} className="ml-1" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
         </div>
      </section>

      {/* FINAL CTA - CREDENTIALING */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
             <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 p-12 rounded-3xl"
             >
                 <Shield size={64} className="text-amber-400 mx-auto mb-6" />
                 <h2 className="text-4xl md:text-6xl font-bold mb-6">Torne-se uma Autoridade.</h2>
                 <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                    Junte-se às 500+ oficinas que já são referência em suas cidades. Credenciamento exclusivo para profissionais qualificados.
                 </p>
                 <div className="flex flex-col sm:flex-row justify-center gap-4">
                     <Link to="/register-mechanic" className="bg-amber-500 text-black px-10 py-5 rounded-xl font-bold text-lg hover:bg-amber-400 transition-colors shadow-xl shadow-amber-500/20">
                        QUERO ME CREDENCIAR
                     </Link>
                     <Link to="/contact" className="bg-white/10 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white/20 transition-colors backdrop-blur border border-white/10">
                        FALAR COM CONSULTOR
                     </Link>
                 </div>
             </motion.div>
        </div>
      </section>

    </div>
  );
};

export default HomeP2;
