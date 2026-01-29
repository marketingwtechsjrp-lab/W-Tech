import React, { useState, useEffect } from 'react';
import { 
    Search, User, Package, Clock, Truck, CheckCircle2, 
    ChevronRight, AlertCircle, LogOut, MapPin, Calendar, 
    CreditCard, Plus, ShoppingCart, Trash2, Send, ArrowLeft,
    ExternalLink, Zap, GraduationCap, Award, CalendarIcon, Eye, FileText, Download,
    Sun, Moon, RefreshCcw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { generateCertificatesPDF } from '../components/admin/Certificates/CertificateGenerator';

const ClientPortal = () => {
    // Auth State
    const [clientCode, setClientCode] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Data State
    const [orders, setOrders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'orders' | 'courses' | 'certificates' | 'profile' | 'new-order'>('orders');
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [courseSubTab, setCourseSubTab] = useState<'presencial' | 'online'>('presencial');
    const [certificateLayouts, setCertificateLayouts] = useState<any[]>([]);
    const [isDarkMode, setIsDarkMode] = useState(true);
    
    // New Order Form State
    const [products, setProducts] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [orderStep, setOrderStep] = useState<1 | 2>(1);
    const [submittingOrder, setSubmittingOrder] = useState(false);

    // Load session from local storage
    useEffect(() => {
        const cachedCode = localStorage.getItem('wtech_client_code');
        if (cachedCode) {
            setClientCode(cachedCode);
            handleLogin(cachedCode);
        }
        
        const cachedTheme = localStorage.getItem('wtech_theme');
        if (cachedTheme === 'light') setIsDarkMode(false);
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(prev => {
            const newVal = !prev;
            localStorage.setItem('wtech_theme', newVal ? 'dark' : 'light');
            return newVal;
        });
    };

    const handleLogin = async (code: string = clientCode) => {
        if (!code) return;
        setLoading(true);
        setError('');

        try {
            // 1. Find Client by Code
            let clientResult = await supabase
                .from('SITE_Leads')
                .select('*')
                .eq('client_code', code.trim().toUpperCase())
                .single();
            
            if (clientResult.error || !clientResult.data) {
                 clientResult = await supabase
                    .from('SITE_Mechanics')
                    .select('*')
                    .eq('client_code', code.trim().toUpperCase())
                    .single();
            }

            if (clientResult.error || !clientResult.data) {
                throw new Error('Código de acesso inválido. Verifique e tente novamente.');
            }

            const clientData = clientResult.data;
            setClient(clientData);
            setIsAuthenticated(true);
            localStorage.setItem('wtech_client_code', code.trim().toUpperCase());

            // 2. Fetch Orders
            fetchOrders(clientData);
            
            // 3. Load Products for New Order
            const { data: prods } = await supabase.from('SITE_Products').select('*').eq('type', 'product');
            if (prods) setProducts(prods);
            
            // 4. Fetch Enrollments
            fetchEnrollments(clientData);

            // 5. Fetch Available Courses
            fetchAvailableCourses();

            // 6. Fetch Certificate Layouts
            fetchCertificateLayouts();

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            localStorage.removeItem('wtech_client_code');
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async (clientData: any) => {
        const { data } = await supabase
            .from('SITE_Sales')
            .select('*')
            .or(`client_id.eq.${clientData.id},client_email.eq.${clientData.email}`)
            .order('created_at', { ascending: false });

        if (data) setOrders(data);
    };

    const fetchEnrollments = async (clientData: any) => {
        const { data } = await supabase
            .from('SITE_Enrollments')
            .select('*, SITE_Courses(*)')
            .or(`student_email.eq.${clientData.email},student_phone.eq.${clientData.phone}`)
            .order('created_at', { ascending: false });

        if (data) setEnrollments(data);
    };

    const fetchAvailableCourses = async () => {
        const { data } = await supabase.from('SITE_Courses').select('*').eq('status', 'Published').order('date', { ascending: true });
        if (data) {
             const now = new Date();
             setAvailableCourses(data.filter(c => new Date(c.date) >= now));
        }
    };

    const fetchCertificateLayouts = async () => {
        const { data } = await supabase.from('SITE_CertificateLayouts').select('*');
        if (data) setCertificateLayouts(data.map(l => ({ ...l, backgroundUrl: l.background_url })));
    };

    const handleDownloadCertificate = async (completedCourse: any) => {
        try {
            // 1. Find the best layout
            // We'll search for layouts that match the type name
            const isSuspension = completedCourse.type === 'suspension';
            const searchKeyword = isSuspension ? 'Suspensão' : 'Experience';
            
            let layout = certificateLayouts.find(l => l.name.toLowerCase().includes(searchKeyword.toLowerCase()) && l.type === 'Certificate');
            
            // Fallback: any certificate layout
            if (!layout) layout = certificateLayouts.find(l => l.type === 'Certificate');
            
            if (!layout) {
                alert('Modelo de certificado não encontrado no sistema. Por favor, contate o suporte.');
                return;
            }

            // 2. Prepare Mock Course Data
            const mockCourse: any = {
                id: completedCourse.id || 'N/A',
                title: isSuspension ? 'CURSO ESPECIALISTA EM SUSPENSÕES' : 'TREINAMENTO W-TECH EXPERIENCE',
                date: completedCourse.date,
                dateEnd: completedCourse.date,
                instructor: 'EQP W-TECH BRASIL',
                location: 'Matriz W-TECH',
                city: 'São Paulo',
                state: 'SP'
            };

            // 3. Prepare Mock Enrollment Data
            const mockEnrollment: any = {
                id: client.client_code || 'N/A',
                studentName: client.name
            };

            // 4. Generate
            await generateCertificatesPDF(layout, mockCourse, [mockEnrollment]);
            
        } catch (err) {
            console.error('Download Error:', err);
            alert('Erro ao gerar certificado.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('wtech_client_code');
        setClient(null);
        setOrders([]);
        setIsAuthenticated(false);
        setError('');
        setClientCode('');
    };

    const addToCart = (product: any) => {
        setCart(prev => {
            const exists = prev.find(i => i.id === product.id);
            if (exists) {
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        setSubmittingOrder(true);
        try {
            const total = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);
            const payload = {
                client_id: client.id,
                client_name: client.name,
                client_email: client.email,
                client_phone: client.phone,
                channel: 'Admin', // Changed to avoid check constraint error (SITE_Sales_channel_check)
                status: 'pending',
                total_value: total,
                seller_id: client.assigned_to,
                items: JSON.stringify(cart.map(i => ({
                    productId: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    price: i.sale_price
                })))
            };

            const { error } = await supabase.from('SITE_Sales').insert([payload]);
            if (error) throw error;

            alert('Pedido enviado com sucesso! Nosso time irá analisar e entrar em contato.');
            setCart([]);
            setOrderStep(1);
            setActiveTab('orders');
            fetchOrders(client);
        } catch (err: any) {
            alert('Erro ao enviar pedido: ' + err.message);
        } finally {
            setSubmittingOrder(false);
        }
    };

    const handleEnroll = async (course: any) => {
        if (!confirm(`Deseja solicitar sua matrícula para o curso "${course.title}"?`)) return;

        setSubmittingOrder(true);
        try {
            // 1. Create a Pending Order in SITE_Sales
            const salePayload = {
                client_id: client.id,
                client_name: client.name,
                client_email: client.email,
                client_phone: client.phone,
                channel: 'Admin', // Canonical channel for portal requests
                status: 'pending',
                total_value: course.price || 0,
                seller_id: client.assigned_to,
                items: JSON.stringify([{
                    productId: course.id,
                    name: `Inscrição: ${course.title}`,
                    quantity: 1,
                    price: course.price || 0,
                    type: 'course_enrollment'
                }])
            };

            const { error: saleError } = await supabase.from('SITE_Sales').insert([salePayload]);
            if (saleError) throw saleError;

            // 2. Insert into CRM (SITE_Leads) as a pending enrollment request
            const crmPayload = {
                name: client.name,
                email: client.email,
                phone: client.phone,
                status: 'New', // First column of the CRM
                context_id: `Matrícula: ${course.title}`,
                classification: 'Interesse em Curso',
                assigned_to: client.assigned_to || null,
                internal_notes: `PEDIDO DE MATRÍCULA VIA PORTAL: O cliente solicitou participação no curso "${course.title}". Um pedido pendente foi gerado automaticamente.`
            };
            
            await supabase.from('SITE_Leads').insert([crmPayload]);

            alert('Seu pedido de matrícula foi recebido com sucesso! Um consultor entrará em contato para finalizar os detalhes e confirmar sua vaga.');
            
            // Refresh orders and redirect to history
            fetchOrders(client);
            setActiveTab('orders');
        } catch (err: any) {
            console.error('Enrollment Error:', err);
            alert('Erro ao processar interesse: ' + err.message);
        } finally {
            setSubmittingOrder(false);
        }
    };

    const getStatusInfo = (status: string) => {
        const map: any = {
            'pending': { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: Clock },
            'approved': { label: 'Aprovado', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: CheckCircle2 },
            'paid': { label: 'Pago', color: 'bg-green-500/20 text-green-500 border-green-500/30', icon: CreditCard },
            'producing': { label: 'Em Produção', color: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30', icon: Package },
            'shipped': { label: 'Enviado', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30', icon: Truck },
            'delivered': { label: 'Entregue', color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 },
            'cancelled': { label: 'Cancelado', color: 'bg-red-500/20 text-red-500 border-red-500/30', icon: AlertCircle },
        };
        return map[status] || { label: status, color: 'bg-gray-500/20 text-gray-500 border-gray-500/30', icon: AlertCircle };
    };

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    );

    if (!isAuthenticated) {
        return (
            <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-[#f4f4f4]'} flex items-center justify-center p-4 overflow-hidden relative transition-colors duration-500`}>
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-wtech-red/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-wtech-red/10 blur-[120px] rounded-full -ml-48 -mb-48"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${isDarkMode ? 'bg-[#111] border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'} w-full max-w-md p-10 rounded-[2.5rem] border relative z-10`}
                >
                    <div className="text-center mb-10">
                        <img 
                            src="http://w-techbrasil.com.br/wp-content/uploads/2022/03/logo-w-tech-preta.png" 
                            alt="W-Tech" 
                            className={`h-12 mx-auto mb-8 ${isDarkMode ? 'invert grayscale brightness-200' : ''}`}
                        />
                        <div className={`inline-flex items-center gap-2 px-3 py-1 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'} rounded-full border mb-6`}>
                            <Zap size={14} className="text-wtech-red" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Acesso Restrito</span>
                        </div>
                        <h1 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tighter uppercase italic`}>Portal do <span className="text-wtech-red">Cliente</span></h1>
                        <p className="text-gray-500 font-medium mt-3 text-sm">Insira seu código VIP para acessar seu dashboard de pedidos.</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-wtech-red to-transparent opacity-20 group-focus-within:opacity-50 blur transition duration-500"></div>
                                <div className="relative">
                                    <User className="absolute left-5 top-5 text-gray-500" size={20} />
                                    <input 
                                        type="text" 
                                        className={`w-full ${isDarkMode ? 'bg-black border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border rounded-2xl py-5 pl-14 pr-6 font-black tracking-[0.3em] text-center uppercase text-xl focus:border-wtech-red outline-none transition-all placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-300`}
                                        placeholder="EX: DAN-12XYZ"
                                        value={clientCode}
                                        onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-3 border border-red-500/20"
                            >
                                <AlertCircle size={18} />
                                {error}
                            </motion.div>
                        )}

                        <button 
                            onClick={() => handleLogin()}
                            disabled={loading || !clientCode}
                            className="w-full bg-wtech-red hover:bg-black hover:text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-600/20 transition-all disabled:opacity-30 disabled:grayscale transition-all disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? 'Validando Acesso...' : 'ENTRAR NO PORTAL'}
                            </span>
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const cartTotal = cart.reduce((acc, i) => acc + (i.sale_price * i.quantity), 0);

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-[#f4f7f6] text-gray-900'} font-sans selection:bg-wtech-red selection:text-white transition-colors duration-500`}>
            {/* Header / Brand Bar */}
            <header className={`${isDarkMode ? 'bg-[#111] border-white/5 shadow-2xl shadow-black/50' : 'bg-white border-gray-100 shadow-sm'} border-b sticky top-0 z-40 backdrop-blur-xl transition-all duration-500`}>
                <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center text-current">
                    <div className="flex items-center gap-6">
                        <img 
                            src="http://w-techbrasil.com.br/wp-content/uploads/2022/03/logo-w-tech-preta.png" 
                            alt="W-Tech" 
                            className={`h-8 ${isDarkMode ? 'invert grayscale brightness-200' : ''}`}
                        />
                        <div className={`hidden md:flex h-8 w-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}></div>
                        <div className="hidden md:flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isDarkMode ? 'from-[#222] to-[#111] border-white/10' : 'from-gray-50 to-gray-100 border-gray-100'} border flex items-center justify-center font-black text-wtech-red shadow-inner`}>
                                {client.name.charAt(0)}
                             </div>
                             <div>
                                 <h1 className="text-sm font-black tracking-tighter uppercase italic">{client.name}</h1>
                                 <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-black uppercase tracking-widest`}>{client.type || 'Cliente Master'}</p>
                             </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <div className="hidden sm:flex flex-col items-end mr-4">
                            <span className={`text-[9px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Seu Código</span>
                            <span className="text-sm font-black text-wtech-red tracking-widest leading-none">{client.client_code}</span>
                        </div>
                        
                        <button 
                            onClick={toggleTheme}
                            className={`p-3 ${isDarkMode ? 'text-gray-500 hover:text-yellow-400 hover:bg-white/5' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-50'} rounded-2xl transition-all border border-transparent shadow-none hover:shadow-lg`}
                            title={isDarkMode ? 'Habilitar Modo Claro' : 'Habilitar Modo Escuro'}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button 
                            onClick={() => { fetchOrders(client); fetchEnrollments(client); }}
                            className={`p-3 ${isDarkMode ? 'text-gray-500 hover:text-wtech-red hover:bg-white/5' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-50'} rounded-2xl transition-all border border-transparent`}
                            title="Atualizar Status"
                        >
                            <RefreshCcw size={20} className={loading ? 'animate-spin text-wtech-red' : ''} />
                        </button>

                        <button 
                            onClick={handleLogout}
                            className={`p-3 ${isDarkMode ? 'text-gray-500 hover:text-wtech-red hover:bg-white/5' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'} rounded-2xl transition-all border border-transparent`}
                        >
                            <LogOut size={22} />
                        </button>
                    </div>
                </div>
                
                {/* Navigation - Futuristic Tabs (Desktop) */}
                <div className={`max-w-6xl mx-auto px-6 hidden md:flex gap-8 overflow-x-auto no-scrollbar scroll-smooth transition-all duration-500`}>
                    {[
                        { id: 'orders', label: 'Histórico', icon: Package },
                        { id: 'courses', label: 'Cursos', icon: GraduationCap },
                        { id: 'certificates', label: 'Certificados', icon: Award },
                        { id: 'new-order', label: 'Novo Pedido', icon: Plus },
                        { id: 'profile', label: 'Meus Dados', icon: User },
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`group relative pb-4 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all ${activeTab === tab.id ? 'text-wtech-red' : isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-wtech-red shadow-[0_0_15px_rgba(255,0,0,0.5)]"></motion.div>
                            )}
                        </button>
                    ))}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10 pb-32 md:pb-10">
                
                {activeTab === 'orders' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
                        {/* Orders Section */}
                        <div className="space-y-8">
                            <div>
                                <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lista de <span className="text-wtech-red">Compras</span></h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Monitoramento de status em tempo real</p>
                            </div>

                            {orders.length === 0 ? (
                                <div className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-sm'} rounded-[2rem] p-20 text-center border transition-all`}>
                                    <Package className="mx-auto text-gray-800 mb-6" size={80} />
                                    <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Nenhum Registro</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto">Sua lista de pedidos está vazia. Comece a comprar clicando na aba 'Novo Pedido'.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {orders.map((order) => {
                                        const { color, label, icon: Icon } = getStatusInfo(order.status);
                                        const items = order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : [];
                                        
                                        return (
                                            <div key={order.id} className={`${isDarkMode ? 'bg-[#111] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'} rounded-3xl border p-6 transition-all group overflow-hidden relative`}>
                                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 rounded-full translate-x-12 -translate-y-12 ${color.split(' ')[1]}`}></div>

                                                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 relative z-10">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-t-2 ${color} ${isDarkMode ? 'bg-black/40' : 'bg-gray-50'}`}>
                                                            <Icon size={28} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-[10px] font-black text-wtech-red uppercase tracking-widest italic">ID #{order.id.slice(0, 8)}</p>
                                                                <div className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${color}`}>
                                                                    {label}
                                                                </div>
                                                            </div>
                                                            <p className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} italic tracking-tight mt-1`}>
                                                                {new Date(order.created_at).toLocaleDateString('pt-BR')} • {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-4">
                                                        {order.tracking_code && (
                                                            <a 
                                                                href={`https://vnd.rastreie.com/${order.tracking_code}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="bg-orange-500 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                                            >
                                                                <Truck size={16} /> RASTREIO: {order.tracking_code}
                                                                <ExternalLink size={12} />
                                                            </a>
                                                        )}
                                                        <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'} border px-6 py-4 rounded-3xl text-right`}>
                                                            <p className={`text-[9px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-black uppercase tracking-widest`}>Valor Total</p>
                                                            <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} italic`}>
                                                                R$ {order.total_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-8 grid md:grid-cols-2 gap-4">
                                                    {items.map((item: any, idx: number) => (
                                                        <div key={idx} className={`${isDarkMode ? 'bg-black/30 border-white/5 hover:bg-white/5' : 'bg-gray-50 border-gray-100 hover:bg-white'} rounded-2xl p-4 border flex justify-between items-center group/item transition-colors`}>
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-white shadow-sm'} flex items-center justify-center text-[10px] font-black text-gray-500 italic uppercase`}>
                                                                    {item.quantity}x
                                                                </div>
                                                                <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} italic uppercase tracking-tight`}>{item.name || item.product?.name}</span>
                                                            </div>
                                                            <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>R$ {(item.price || 0).toLocaleString('pt-BR')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Enrollments History Section */}
                        <div className="space-y-8">
                            <div>
                                <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Carreira <span className="text-wtech-red">Profissional</span></h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Seus cursos, certificados e evoluções dentro da W-TECH</p>
                            </div>
                            
                            {enrollments.length === 0 ? (
                                <div className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-sm'} rounded-[2rem] p-12 text-center border`}>
                                    <Award className="mx-auto text-gray-800 mb-4" size={50} />
                                    <p className="text-gray-500 text-sm italic">Você ainda não possui matrículas ou certificações registradas.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {enrollments.map((enr) => (
                                        <div key={enr.id} className={`${isDarkMode ? 'bg-[#111] border-white/5 hover:border-wtech-red/20' : 'bg-white border-gray-100 hover:border-wtech-red/10 shadow-sm'} rounded-3xl border p-6 transition-all flex flex-col md:flex-row justify-between items-center gap-6`}>
                                            <div className="flex items-center gap-5">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-wtech-red border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                                                    <GraduationCap size={32} />
                                                </div>
                                                <div>
                                                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase italic tracking-tighter`}>{enr.SITE_Courses?.title || 'Curso W-TECH'}</h3>
                                                    <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                                                        <CalendarIcon size={12} className="text-wtech-red" />
                                                        {enr.SITE_Courses?.date ? new Date(enr.SITE_Courses.date).toLocaleDateString('pt-BR') : '--/--/----'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    enr.status === 'CheckedIn' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    enr.status === 'Confirmed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                                    'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                                }`}>
                                                    {enr.status === 'CheckedIn' ? 'CONCLUÍDO' : enr.status === 'Confirmed' ? 'CONFIRMADO' : 'PENDENTE'}
                                                </div>
                                                
                                                {enr.status === 'CheckedIn' && (
                                                    <button className="bg-wtech-red hover:bg-black hover:text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-600/10 transition-all flex items-center gap-2 text-white">
                                                        <Award size={14} /> CERTIFICADO
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'courses' && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div>
                                <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Próximas <span className="text-wtech-red">Experiências</span></h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Eleve seu nível técnico com treinamentos oficiais</p>
                            </div>
                            
                            <div className={`flex ${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-sm'} p-1.5 rounded-2xl border w-full md:w-auto`}>
                                <button 
                                    onClick={() => setCourseSubTab('presencial')}
                                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${courseSubTab === 'presencial' ? 'bg-wtech-red text-white shadow-lg' : 'text-gray-500 hover:text-wtech-red'}`}
                                >
                                    Presenciais
                                </button>
                                <button 
                                    onClick={() => setCourseSubTab('online')}
                                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${courseSubTab === 'online' ? 'bg-wtech-red text-white shadow-lg' : 'text-gray-500 hover:text-wtech-red'}`}
                                >
                                    Cursos Online
                                </button>
                            </div>
                        </div>

                        {availableCourses.filter(c => courseSubTab === 'online' ? c.location_type === 'Online' : c.location_type !== 'Online').length === 0 ? (
                            <div className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-sm'} rounded-[2rem] p-20 text-center border`}>
                                <Plus className="mx-auto text-gray-800 mb-6" size={80} />
                                <p className="text-gray-500 italic">Nenhum treinamento {courseSubTab} disponível no momento. Fique atento às novidades!</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-8">
                                {availableCourses.filter(c => courseSubTab === 'online' ? c.location_type === 'Online' : c.location_type !== 'Online').map(course => (
                                    <div key={course.id} className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-xl'} rounded-[2.5rem] border overflow-hidden group hover:border-wtech-red/30 transition-all`}>
                                        <div className="aspect-video relative">
                                            <img 
                                                src={course.image || "https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80"} 
                                                alt={course.title}
                                                className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                            <div className="absolute top-6 left-6 flex gap-2">
                                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[10px] font-black text-wtech-red uppercase tracking-widest">
                                                    {course.location_type || 'Presencial'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-8">
                                            <h3 className={`text-2xl font-black italic uppercase tracking-tighter mb-4 group-hover:text-wtech-red transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{course.title}</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'} p-4 rounded-2xl border`}>
                                                    <p className={`text-[8px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-black uppercase tracking-widest mb-1`}>Data</p>
                                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{course.date ? new Date(course.date).toLocaleDateString('pt-BR') : 'A Combinar'}</p>
                                                </div>
                                                <div className={`${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'} p-4 rounded-2xl border`}>
                                                    <p className={`text-[8px] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-black uppercase tracking-widest mb-1`}>Local</p>
                                                    <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} truncate`}>{course.city || course.location}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => handleEnroll(course)}
                                                    className={`flex-1 ${isDarkMode ? 'bg-white text-black hover:bg-wtech-red hover:text-white' : 'bg-gray-900 text-white hover:bg-wtech-red'} py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl`}
                                                >
                                                    MATRICULAR AGORA
                                                </button>
                                                <a 
                                                    href={course.slug ? `/#/lp/${course.slug}` : `/#/courses`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-indigo-600'} p-4 rounded-2xl border transition-all`}
                                                >
                                                    <Eye size={18} />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Module for Earned Certificates from Profile */}
                        {client.completed_courses && client.completed_courses.length > 0 && (
                            <div className={`mt-20 pt-10 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-wtech-red/20 flex items-center justify-center text-wtech-red">
                                        <Award size={24} />
                                    </div>
                                    <div>
                                        <h2 className={`text-3xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Meus <span className="text-wtech-red">Certificados</span></h2>
                                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Documentos oficiais de sua trajetória W-TECH</p>
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {client.completed_courses.map((cert: any, idx: number) => (
                                        <div key={idx} className={`${isDarkMode ? 'bg-[#111] border-white/5 hover:border-wtech-red/20' : 'bg-white border-gray-100 hover:border-wtech-red/10 shadow-sm'} rounded-[2rem] p-6 border transition-all flex flex-col gap-4`}>
                                            <div className="flex justify-between items-start">
                                                <div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} flex items-center justify-center text-gray-500`}>
                                                    <FileText size={20} />
                                                </div>
                                                <span className={`text-[9px] font-black ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-50'} px-2 py-1 rounded-full uppercase tracking-widest`}>{cert.date ? new Date(cert.date).toLocaleDateString('pt-BR') : 'Data Indefinida'}</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-wtech-red uppercase tracking-widest mb-1 italic">{cert.type === 'experience' ? 'W-Tech Experience' : 'Curso de Suspensão'}</p>
                                                <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase italic leading-tight`}>{cert.type === 'experience' ? 'Treinamento Experience' : 'Curso Especialista em Suspensões'}</h4>
                                            </div>
                                            <button 
                                                onClick={() => handleDownloadCertificate(cert)}
                                                className={`w-full ${isDarkMode ? 'bg-white/5 hover:bg-wtech-red hover:text-white' : 'bg-gray-50 hover:bg-gray-900 hover:text-white'} py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2`}
                                            >
                                                <Download size={14} /> DOWNLOAD CERTIFICADO
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'certificates' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h2 className={`text-5xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Meus <span className="text-wtech-red">Certificados</span></h2>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Documentos oficiais emitidos pela W-TECH BRASIL</p>
                            </div>
                            <div className={`${isDarkMode ? 'bg-wtech-red/5 border-wtech-red/20' : 'bg-red-50 border-red-100'} px-6 py-4 rounded-[2rem] flex items-center gap-4 border`}>
                                <Award className="text-wtech-red" size={32} />
                                <div>
                                    <p className={`text-[10px] font-black ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-widest leading-none`}>Total Concluído</p>
                                    <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} italic leading-none mt-1`}>{(client.completed_courses || []).length} CURSOS</p>
                                </div>
                            </div>
                        </div>

                        {!client.completed_courses || client.completed_courses.length === 0 ? (
                            <div className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-sm'} rounded-[3rem] p-24 text-center border relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-wtech-red blur-[100px] opacity-10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                                <Award className="mx-auto text-gray-800 mb-8 group-hover:scale-110 transition-transform duration-500" size={100} />
                                <h3 className={`text-3xl font-black uppercase tracking-tighter mb-4 italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Nenhum Registro Encontrado</h3>
                                <p className="text-gray-500 max-w-sm mx-auto text-sm font-bold uppercase tracking-wider">
                                    Seus certificados aparecerão aqui assim que a conclusão do curso for registrada em nosso sistema.
                                </p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {client.completed_courses.map((cert: any, idx: number) => (
                                    <div key={idx} className={`${isDarkMode ? 'bg-[#111] border-white/5 hover:border-wtech-red/30' : 'bg-white border-gray-100 shadow-sm hover:border-wtech-red/20'} rounded-[2.5rem] p-8 border transition-all flex flex-col gap-6 group relative overflow-hidden`}>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-wtech-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        
                                        <div className="flex justify-between items-start relative z-10">
                                            <div className={`w-14 h-14 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'} flex items-center justify-center text-gray-400 group-hover:text-wtech-red group-hover:bg-wtech-red/10 transition-all border border-transparent group-hover:border-wtech-red/20`}>
                                                <GraduationCap size={28} />
                                            </div>
                                            <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500 bg-white/5' : 'text-gray-400 bg-gray-50'} px-3 py-1.5 rounded-xl uppercase tracking-[0.2em] border border-white/5`}>
                                                {cert.date ? new Date(cert.date).toLocaleDateString('pt-BR') : 'EM ANÁLISE'}
                                            </span>
                                        </div>

                                        <div className="relative z-10">
                                            <p className="text-[11px] font-black text-wtech-red uppercase tracking-[0.3em] mb-2 italic">
                                                {cert.type === 'experience' ? 'Módulo Internacional' : 'Módulo Técnico'}
                                            </p>
                                            <h4 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase italic leading-[1.1] tracking-tighter group-hover:translate-x-1 transition-transform`}>
                                                {cert.type === 'experience' ? 'W-Tech Experience' : 'Curso Suspensão'}
                                            </h4>
                                            <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-4 group-hover:text-gray-400 transition-colors">Digital ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                        </div>

                                        <button 
                                            onClick={() => handleDownloadCertificate(cert)}
                                            className={`w-full h-16 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:bg-white hover:text-black border-white/5 hover:border-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-900 hover:text-white border-gray-100 hover:border-gray-900'} rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative z-10 border shadow-xl shadow-transparent`}
                                        >
                                            <Download size={18} /> DOWNLOAD OFICIAL
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'new-order' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        {/* Sub-Tabs for New Order */}
                        <div className={`flex ${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-sm'} p-1.5 rounded-3xl border max-w-sm mx-auto shadow-2xl transition-all duration-500`}>
                             {[
                                 { step: 1, label: 'Catálogo', icon: Search },
                                 { step: 2, label: `Concluir (${cart.length})`, icon: ShoppingCart }
                             ].map((s) => (
                                 <button
                                     key={s.step}
                                     onClick={() => setOrderStep(s.step as 1 | 2)}
                                     className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${orderStep === s.step ? 'bg-wtech-red text-white shadow-xl shadow-red-500/20' : isDarkMode ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                 >
                                     <s.icon size={16} />
                                     {s.label}
                                 </button>
                             ))}
                        </div>

                        {orderStep === 1 ? (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <h2 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Selecione os <span className="text-wtech-red">Materiais</span></h2>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-2">Toque no + para adicionar itens à sua lista prioritária</p>
                                </div>

                                <div className="relative group max-w-2xl mx-auto">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-wtech-red to-transparent opacity-10 group-focus-within:opacity-30 blur transition"></div>
                                    <div className="relative">
                                        <Search className="absolute left-5 top-5 text-gray-600" size={24} />
                                        <input 
                                            className={`w-full ${isDarkMode ? 'bg-[#111] border-white/5 text-white placeholder:text-gray-800' : 'bg-white border-gray-100 text-gray-900 placeholder:text-gray-300 shadow-sm'} rounded-3xl py-6 pl-16 pr-8 text-lg font-bold outline-none focus:border-wtech-red/50 transition-all italic`}
                                            placeholder="BUSCAR PELO NOME OU CÓDIGO SKU..."
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                                    {filteredProducts.map(p => {
                                        const cartItem = cart.find(i => i.id === p.id);
                                        const quantityInCart = cartItem ? cartItem.quantity : 0;

                                        return (
                                            <div key={p.id} className={`${isDarkMode ? 'bg-[#111] border-white/5 hover:border-wtech-red/30' : 'bg-white border-gray-100 hover:border-wtech-red/20 shadow-sm'} rounded-3xl p-4 border flex items-center gap-4 transition-all group relative overflow-hidden`}>
                                                {quantityInCart > 0 && (
                                                     <div className="absolute top-0 right-0 bg-wtech-red text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl shadow-lg z-10 animate-bounce">
                                                         {quantityInCart}x NA LISTA
                                                     </div>
                                                )}
                                                
                                                <div className={`w-20 h-20 rounded-2xl ${isDarkMode ? 'bg-black border-white/5' : 'bg-gray-50 border-gray-100'} border overflow-hidden flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500`}>
                                                    {p.image_url ? (
                                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                                                            <Package className="text-gray-800" size={24} />
                                                            <span className="text-[7px] text-gray-700 font-black uppercase tracking-tighter mt-1">{p.sku || 'N/A'}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 pr-10">
                                                    <h3 className={`text-[11px] font-black italic uppercase tracking-tighter leading-tight mb-1 group-hover:text-wtech-red transition-colors line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</h3>
                                                    <p className={`text-[9px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} font-bold uppercase tracking-widest`}>{p.sku || 'REF-EXTERNA'}</p>
                                                </div>

                                                <button 
                                                    onClick={() => addToCart(p)}
                                                    className={`w-12 h-12 ${isDarkMode ? 'bg-white text-black hover:bg-wtech-red hover:text-white' : 'bg-gray-900 text-white hover:bg-wtech-red'} rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-90 flex-shrink-0 absolute right-4`}
                                                >
                                                    <Plus size={22} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto">
                                <div className={`${isDarkMode ? 'bg-[#111] border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.5)]' : 'bg-white border-gray-100 shadow-xl'} rounded-[2.5rem] border p-8 md:p-12 transition-all duration-500`}>
                                    <div className="flex items-center justify-between mb-12">
                                        <div>
                                            <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Resumo do <span className="text-wtech-red">Pedido</span></h2>
                                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Revise os itens antes de enviar ao consultor</p>
                                        </div>
                                        <div className={`w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-wtech-red/10 border-wtech-red/20' : 'bg-red-50 border-red-100'} flex items-center justify-center text-wtech-red border`}>
                                            <ShoppingCart size={32} />
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-12 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                                        {cart.length === 0 ? (
                                            <div className="text-center py-24 opacity-20 italic">
                                                <Package className={`mx-auto mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} size={80} />
                                                <p className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sua lista está vazia</p>
                                                <button onClick={() => setOrderStep(1)} className="mt-4 text-wtech-red underline text-[10px] font-black tracking-widest uppercase hover:text-black hover:no-underline transition-all">Voltar ao Catálogo</button>
                                            </div>
                                        ) : (
                                            cart.map(item => (
                                                <div key={item.id} className={`${isDarkMode ? 'bg-black/40 border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-100 hover:border-gray-200'} p-5 rounded-3xl border group transition-all flex items-center gap-6`}>
                                                    <div className={`w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-black border-white/5' : 'bg-white border-gray-100'} border overflow-hidden flex-shrink-0`}>
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className={`w-full h-full flex items-center justify-center text-gray-800 ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                                                                <Package size={24} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[10px] font-black ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-widest leading-none mb-1`}>{item.sku}</p>
                                                        <p className={`text-sm font-black uppercase italic tracking-tighter line-clamp-1 group-hover:text-wtech-red transition-all ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</p>
                                                        <div className="flex items-center gap-4 mt-3">
                                                            <div className={`flex items-center ${isDarkMode ? 'bg-black/60 border-white/5' : 'bg-white border-gray-100 shadow-sm'} rounded-xl px-2 border py-1`}>
                                                                <button onClick={() => updateQuantity(item.id, -1)} className={`p-1 px-3 hover:text-wtech-red font-black text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>-</button>
                                                                <span className={`text-xs font-black w-10 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity}</span>
                                                                <button onClick={() => updateQuantity(item.id, 1)} className={`p-1 px-3 hover:text-wtech-red font-black text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>+</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.id)} className={`p-3 ${isDarkMode ? 'text-gray-800 hover:text-wtech-red' : 'text-gray-300 hover:text-red-500'} transition-all transform hover:rotate-12`}>
                                                        <Trash2 size={24} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {cart.length > 0 && (
                                        <div className={`pt-8 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'} space-y-6`}>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className={`text-[9px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.3em] mb-1`}>Total de Itens</p>
                                                    <h4 className={`text-4xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Minha <span className="text-wtech-red">Seleção</span></h4>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-6xl font-black italic text-wtech-red leading-none">{cart.length}</span>
                                                    <p className={`text-[8px] font-black ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-widest mt-1`}>Produtos distintos</p>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleSubmitOrder}
                                                disabled={submittingOrder}
                                                className="w-full h-24 bg-wtech-red hover:bg-white hover:text-black text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-[0_25px_50px_rgba(255,0,0,0.2)] transition-all flex items-center justify-center gap-4 group active:scale-[0.98]"
                                            >
                                                {submittingOrder ? (
                                                    'REGISTRANDO SEU PEDIDO...'
                                                ) : (
                                                    <>
                                                        <Send size={24} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
                                                        FINALIZAR E ENVIAR
                                                    </>
                                                )}
                                            </button>
                                            
                                            <div className="flex items-center justify-center gap-6 pt-4">
                                                 <div className="flex flex-col items-center">
                                                    <p className={`text-[8px] ${isDarkMode ? 'text-gray-700' : 'text-gray-400'} font-black uppercase tracking-widest mb-1`}>Canal de Venda</p>
                                                    <div className={`px-3 py-1 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-red-50 border-red-100 shadow-sm'} border rounded-full text-[9px] font-black uppercase text-wtech-red italic`}>PORTAL B2B</div>
                                                 </div>
                                                 <div className={`w-px h-8 ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}></div>
                                                 <div className="flex flex-col items-center">
                                                    <p className={`text-[8px] ${isDarkMode ? 'text-gray-700' : 'text-gray-400'} font-black uppercase tracking-widest mb-1`}>Status Pré-Venda</p>
                                                    <div className={`px-3 py-1 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100 shadow-sm'} border rounded-full text-[9px] font-black uppercase text-gray-400 italic`}>AGUARDANDO CONSULTOR</div>
                                                 </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'profile' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
                        {/* Futuristic Profile Header */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-wtech-red to-red-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className={`relative ${isDarkMode ? 'bg-[#111] border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'} rounded-[3.5rem] p-8 md:p-12 border flex flex-col md:flex-row items-center gap-8 transition-all duration-500`}>
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-gradient-to-tr from-wtech-red to-transparent rounded-[2.5rem] animate-spin-slow opacity-20"></div>
                                    <div className={`w-32 h-32 rounded-[2.2rem] bg-gradient-to-br ${isDarkMode ? 'from-[#222] to-black border-white/10' : 'from-gray-50 to-white border-gray-100 shadow-inner'} border flex items-center justify-center font-black text-5xl text-wtech-red relative z-10`}>
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-[#111] text-white z-20">
                                        <CheckCircle2 size={18} />
                                    </div>
                                </div>
                                <div className="text-center md:text-left flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                                        <h3 className={`text-4xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{client.name}</h3>
                                        <span className="bg-wtech-red/10 text-wtech-red text-[10px] font-black px-3 py-1 rounded-full border border-wtech-red/20 w-fit mx-auto md:mx-0">LEVEL: PLATINUM</span>
                                    </div>
                                    <p className={`text-gray-500 font-black uppercase tracking-[0.3em] text-xs`}>Acesso: <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{client.client_code}</span></p>
                                    
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                                        <div className={`${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} px-4 py-2 rounded-xl border flex items-center gap-2`}>
                                            <CalendarIcon size={14} className="text-gray-600" />
                                            <span className="text-[9px] font-black uppercase text-gray-400">Desde: Jan 2024</span>
                                        </div>
                                        <div className={`${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'} px-4 py-2 rounded-xl border flex items-center gap-2`}>
                                            <Zap size={14} className="text-wtech-red" />
                                            <span className="text-[9px] font-black uppercase text-gray-400">{orders.length} Pedidos</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Legal Info Card */}
                            <div className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-xl'} rounded-[2.5rem] p-8 md:p-10 border space-y-8 relative overflow-hidden group transition-all duration-500`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-wtech-red/5 blur-3xl rounded-full"></div>
                                <h4 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <FileText size={24} className="text-wtech-red" /> Identificação <span className="text-wtech-red">Fiscal</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} font-black uppercase tracking-widest`}>Documento CPF/CNPJ</label>
                                        <p className={`text-sm font-bold font-mono ${isDarkMode ? 'text-gray-200 bg-black/40 border-white/5' : 'text-gray-700 bg-gray-50 border-gray-100'} p-3 rounded-xl border tracking-wider`}>{client.cpf || 'PENDENTE'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} font-black uppercase tracking-widest`}>Inscrição RG/IE</label>
                                        <p className={`text-sm font-bold font-mono ${isDarkMode ? 'text-gray-200 bg-black/40 border-white/5' : 'text-gray-700 bg-gray-50 border-gray-100'} p-3 rounded-xl border tracking-wider`}>{client.rg || 'PENDENTE'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className={`${isDarkMode ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100 shadow-xl'} rounded-[2.5rem] p-8 md:p-10 border space-y-8 relative overflow-hidden group transition-all duration-500`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                                <h4 className={`text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    <Zap size={24} className="text-wtech-red" /> Canais de <span className="text-wtech-red">Contato</span>
                                </h4>
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-4 ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'} p-4 rounded-2xl border`}>
                                        <div className="w-10 h-10 rounded-xl bg-wtech-red/10 flex items-center justify-center text-wtech-red ring-1 ring-wtech-red/30">
                                            <Plus size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} font-black uppercase tracking-widest`}>WhatsApp Principal</p>
                                            <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} italic`}>{client.phone}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-50 border-gray-100'} p-4 rounded-2xl border`}>
                                        <div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-white/5 ring-white/10' : 'bg-white ring-gray-100 shadow-sm'} flex items-center justify-center text-gray-400 ring-1`}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-[8px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} font-black uppercase tracking-widest`}>E-mail Corporativo</p>
                                            <p className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} italic lowercase`}>{client.email || 'Não informado'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logistics Full Width Card */}
                        <div className={`relative overflow-hidden rounded-[3rem] p-10 md:p-14 border transition-all duration-500 ${isDarkMode ? 'bg-gradient-to-br from-[#111] to-black border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-wtech-red/5 blur-[100px] rounded-full"></div>
                            <h3 className={`text-3xl font-black italic uppercase tracking-tighter mb-12 flex items-center gap-5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <MapPin size={36} className="text-wtech-red" /> Dados de <span className="text-wtech-red">Entrega e Logística</span>
                            </h3>

                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-2 relative">
                                    <div className="absolute -left-6 top-0 bottom-0 w-1 bg-wtech-red rounded-full shadow-[0_0_15px_rgba(255,0,0,0.5)]"></div>
                                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-[0.3em] block mb-2`}>Endereço Principal de Faturamento</label>
                                    <p className={`text-xl font-bold italic leading-relaxed ${isDarkMode ? 'text-gray-100' : 'text-gray-700'}`}>{client.address || 'Não cadastrado no sistema central.'}</p>
                                </div>
                                
                                <div className="space-y-2 relative">
                                    <div className={`absolute -left-6 top-0 bottom-0 w-1 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} rounded-full opacity-30`}></div>
                                    <label className={`text-[10px] font-black ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-[0.3em] block mb-2`}>Ponto de Entrega Prioritário</label>
                                    <p className={`text-xl font-bold italic leading-relaxed ${isDarkMode ? 'text-gray-100' : 'text-gray-700'}`}>
                                        {client.delivery_address?.full_address || client.address || 'Mesmo endereço de faturamento.'}
                                    </p>
                                </div>
                            </div>

                            <div className={`mt-14 pt-10 border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'} flex flex-col md:flex-row items-center justify-between gap-6`}>
                                <div className="flex items-center gap-4">
                                    <div className={`${isDarkMode ? 'bg-wtech-red/10 border-wtech-red/20' : 'bg-red-50 border-red-100'} w-12 h-12 rounded-2xl animate-pulse shadow-inner flex items-center justify-center border`}>
                                        <AlertCircle size={22} className="text-wtech-red" />
                                    </div>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase text-gray-500 tracking-widest`}>Informações Divergentes?</p>
                                        <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} italic uppercase tracking-tighter`}>Solicite alteração imediata ao suporte</p>
                                    </div>
                                </div>
                                <button className={`w-full md:w-fit px-10 py-5 ${isDarkMode ? 'bg-white text-black hover:bg-wtech-red hover:text-white' : 'bg-gray-900 text-white hover:bg-wtech-red'} rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-red-500/20 active:scale-95`}>
                                    ABRIR CHAMADO DE SUPORTE
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>

            <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${isDarkMode ? 'bg-[#111]/95' : 'bg-white/95'} backdrop-blur-2xl border-t ${isDarkMode ? 'border-white/5' : 'border-gray-100'} px-2 py-4 z-50 rounded-t-[2.5rem] shadow-[0_-15px_50px_rgba(0,0,0,0.4)] transition-colors duration-500`}>
                <div className="flex justify-around items-center max-w-lg mx-auto">
                    {[
                         { id: 'orders', label: 'Histórico', icon: Package },
                         { id: 'courses', label: 'Cursos', icon: GraduationCap },
                         { id: 'new-order', label: 'Pedido', icon: Plus },
                         { id: 'certificates', label: 'DOCS', icon: Award },
                         { id: 'profile', label: 'Perfil', icon: User },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex flex-col items-center min-w-[64px] transition-all gap-1.5 ${activeTab === tab.id ? 'text-wtech-red scale-110' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeTab === tab.id ? `${isDarkMode ? 'bg-wtech-red/20 border-wtech-red/20 shadow-red-500/20' : 'bg-red-50 border-red-100 shadow-red-200/20'} border shadow-lg` : ''}`}>
                                <tab.icon size={22} />
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-wider">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default ClientPortal;
