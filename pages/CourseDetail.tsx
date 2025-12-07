import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, User, Check, ShoppingCart, Building } from 'lucide-react';
import { Course } from '../types';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import SEO from '../components/SEO';

const CourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchCourse = async () => {
            if (!id) return;
            setLoading(true);
            const { data } = await supabase
                .from('SITE_Courses')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setCourse({
                    ...data,
                    locationType: data.location_type,
                    registeredCount: data.registered_count,
                    hotelsInfo: data.hotels_info,
                    startTime: data.start_time,
                    endTime: data.end_time,
                    mapUrl: data.map_url,
                    schedule: data.schedule
                });
            }
            setLoading(false);
        };
        fetchCourse();
    }, [id]);

    const handleAddToCart = () => {
        if (course) {
            addToCart({
                courseId: course.id,
                title: course.title,
                price: course.price,
                image: course.image
            });
        }
    };

    if (loading) {
        return <div className="p-20 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-wtech-gold"></div></div>;
    }

    if (!course) {
        return <div className="p-12 text-center">Curso não encontrado. <Link to="/cursos" className="text-wtech-gold">Voltar</Link></div>;
    }

    return (
        <div className="pb-16">
            <SEO
                title={course.title}
                description={course.description}
                image={course.image}
                type="product"
                schema={{
                    "@context": "https://schema.org",
                    "@type": "Course",
                    "name": course.title,
                    "description": course.description,
                    "provider": {
                        "@type": "Organization",
                        "name": "W-TECH Brasil",
                        "sameAs": "https://w-techbrasil.com.br"
                    },
                    "offers": {
                        "@type": "Offer",
                        "price": course.price,
                        "priceCurrency": "BRL",
                        "availability": "https://schema.org/InStock"
                    },
                    "hasCourseInstance": {
                        "@type": "CourseInstance",
                        "courseMode": course.locationType === 'Online' ? 'online' : 'onsite',
                        "startDate": course.date,
                        "location": course.location
                    }
                }}
            />
            {/* Course Header */}
            <div className="bg-wtech-black text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="md:w-2/3">
                            <div className="flex gap-2 mb-4">
                                <span className="bg-wtech-gold text-black text-xs font-bold px-2 py-1 rounded">{course.locationType}</span>
                                {course.tags && course.tags.map(tag => (
                                    <span key={tag} className="border border-gray-600 text-gray-300 text-xs px-2 py-1 rounded">{tag}</span>
                                ))}
                            </div>
                            <h1 className="text-3xl md:text-5xl font-bold mb-6">{course.title}</h1>
                            <p className="text-gray-300 text-xl leading-relaxed">{course.description}</p>
                        </div>
                        <div className="md:w-1/3 w-full bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center text-gray-300">
                                    <Calendar className="w-5 h-5 mr-3 text-wtech-gold" />
                                    <div>
                                        <span className="block text-xs text-gray-500 uppercase">Data</span>
                                        <span className="font-medium">
                                            {new Date(course.date).toLocaleDateString('pt-BR')}
                                            {course.startTime && ` • ${course.startTime}`}
                                            {course.endTime && ` às ${course.endTime}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center text-gray-300">
                                    <MapPin className="w-5 h-5 mr-3 text-wtech-gold" />
                                    <div>
                                        <span className="block text-xs text-gray-500 uppercase">Local</span>
                                        <span className="font-medium">{course.location}</span>
                                    </div>
                                </div>
                                <div className="flex items-center text-gray-300">
                                    <User className="w-5 h-5 mr-3 text-wtech-gold" />
                                    <div>
                                        <span className="block text-xs text-gray-500 uppercase">Instrutor</span>
                                        <span className="font-medium">{course.instructor}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-white mb-6">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.price)}
                            </div>
                            <button
                                onClick={handleAddToCart}
                                className="w-full bg-wtech-gold text-black font-bold py-4 rounded hover:bg-white transition-colors flex items-center justify-center"
                            >
                                <ShoppingCart size={20} className="mr-2" />
                                ADICIONAR AO CARRINHO
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-3">Pagamento seguro via Cartão ou Pix.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 grid md:grid-cols-3 gap-12">
                <div className="md:col-span-2 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-wtech-black mb-4">Sobre o Curso</h2>
                        <div className="prose text-gray-600 max-w-none">
                            <p>{course.description}</p>
                            <p className="mt-4">Nossos cursos unem teoria avançada e prática intensiva com equipamentos de ponta.</p>
                        </div>
                    </section>

                    {/* SCHEDULE SECTION */}
                    {course.schedule && (
                        <section>
                            <h2 className="text-2xl font-bold text-wtech-black mb-4">Cronograma e Conteúdo</h2>
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 whitespace-pre-line text-gray-700 leading-relaxed">
                                {course.schedule}
                            </div>
                        </section>
                    )}

                    {/* MAP SECTION */}
                    {course.mapUrl && (
                        <section>
                            <h2 className="text-2xl font-bold text-wtech-black mb-4">Localização</h2>
                            <div className="bg-gray-100 rounded-lg overflow-hidden h-[400px] shadow-sm border border-gray-200">
                                {course.mapUrl.includes('iframe') ? (
                                    <div dangerouslySetInnerHTML={{ __html: course.mapUrl.replace('width="600"', 'width="100%"').replace('height="450"', 'height="100%"') }} className="w-full h-full" />
                                ) : (
                                    <iframe
                                        src={course.mapUrl}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen={true}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    ></iframe>
                                )}
                            </div>
                        </section>
                    )}

                    {course.hotelsInfo && (
                        <section className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Building className="text-blue-600" />
                                <h2 className="text-xl font-bold text-blue-900">Hotéis e Acomodações Próximas</h2>
                            </div>
                            <p className="text-gray-700 whitespace-pre-line">{course.hotelsInfo}</p>
                        </section>
                    )}

                    <section>
                        <h2 className="text-2xl font-bold text-wtech-black mb-4">O que está incluso</h2>
                        <ul className="grid md:grid-cols-2 gap-4">
                            {course.features && course.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start bg-white p-4 rounded shadow-sm border border-gray-100">
                                    <Check className="text-wtech-gold mt-1 mr-3 flex-shrink-0" size={20} />
                                    <span className="text-gray-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
