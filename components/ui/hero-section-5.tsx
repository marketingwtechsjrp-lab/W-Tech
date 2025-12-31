'use client'
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './button'
import { InfiniteSlider } from './infinite-slider'
import { ProgressiveBlur } from './progressive-blur'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight, Play } from 'lucide-react'
import { useScroll, motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '../../context/SettingsContext'

export function HeroSection() {
    const { get } = useSettings();
    const heroHeadline = get('hero_headline', 'A Elite da Tecnologia Automotiva');
    const heroSubheadline = get('hero_subheadline', 'Evolua sua oficina e sua carreira com treinamentos especializados em suspensões off-road e on-road.');
    const heroVideoUrl = get('hero_video_url', 'https://www.youtube.com/watch?v=_cGW7k6bOgc');
    
    // Function to check if URL is YouTube and get ID
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const youtubeId = getYouTubeId(heroVideoUrl);

    // Partner brands logic
    const partnerBrandsRaw = get('partner_brands', '[]');
    let partnerBrands = [];
    try {
        partnerBrands = JSON.parse(partnerBrandsRaw);
    } catch (e) {
        partnerBrands = [];
    }

    // Default partner brands if none configured
    const defaultPartners = [
        { name: 'Nvidia', logo: 'https://html.tailus.io/blocks/customers/nvidia.svg' },
        { name: 'Column', logo: 'https://html.tailus.io/blocks/customers/column.svg' },
        { name: 'GitHub', logo: 'https://html.tailus.io/blocks/customers/github.svg' },
        { name: 'Nike', logo: 'https://html.tailus.io/blocks/customers/nike.svg' },
        { name: 'Lemon Squeezy', logo: 'https://html.tailus.io/blocks/customers/lemonsqueezy.svg' },
        { name: 'Laravel', logo: 'https://html.tailus.io/blocks/customers/laravel.svg' },
        { name: 'Lilly', logo: 'https://html.tailus.io/blocks/customers/lilly.svg' },
        { name: 'OpenAI', logo: 'https://html.tailus.io/blocks/customers/openai.svg' },
    ];

    const displayPartners = partnerBrands.length > 0 ? partnerBrands : defaultPartners;

    return (
        <main className="overflow-x-hidden pt-0 mt-0">
            <section className="relative isolate overflow-hidden bg-black">
                <div className="py-24 md:pb-32 lg:pb-36 lg:pt-56">
                    <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
                        <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-3xl lg:text-left">
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="mt-8 max-w-2xl text-balance text-5xl font-black md:text-6xl lg:mt-16 xl:text-7xl text-white tracking-tighter"
                            >
                                {heroHeadline}
                            </motion.h1>
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="mt-8 max-w-2xl text-balance text-lg text-gray-300 font-medium"
                            >
                                {heroSubheadline}
                            </motion.p>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
                            >
                                <Button
                                    asChild
                                    size="lg"
                                    className="h-14 rounded-full pl-5 pr-3 text-base bg-wtech-gold text-black hover:bg-yellow-400 font-bold px-8"
                                >
                                    <Link to="/courses">
                                        <span className="text-nowrap uppercase tracking-wide">Ver Próximos Cursos</span>
                                        <ChevronRight className="ml-1" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="ghost"
                                    className="h-14 rounded-full px-8 text-base text-white hover:bg-white/10 font-bold uppercase tracking-wide border border-white/20 backdrop-blur-sm"
                                >
                                    <a href="#leads">
                                        <span className="text-nowrap">Falar com Consultor</span>
                                    </a>
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Background Video/Image */}
                <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                    
                    {youtubeId ? (
                        <div className="absolute inset-0 size-full pointer-events-none">
                            <iframe
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115vw] h-[115vh] min-w-[177.77vh] min-h-[56.25vw] object-cover opacity-60 grayscale"
                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${youtubeId}&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&enablejsapi=1`}
                                allow="autoplay; fullscreen"
                                frameBorder="0"
                            ></iframe>
                        </div>
                    ) : (
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="size-full object-cover opacity-60 grayscale"
                            src={heroVideoUrl}
                        ></video>
                    )}
                </div>
            </section>

            <section className="bg-white pb-12 pt-12">
                <div className="group relative m-auto max-w-7xl px-6">
                    <div className="flex flex-col items-center md:flex-row gap-8">
                        <div className="md:max-w-44 md:border-r border-gray-100 md:pr-12">
                            <p className="text-start md:text-end text-sm font-bold text-gray-400 uppercase tracking-widest">Parceiros de Performance</p>
                        </div>
                        <div className="relative py-6 md:w-[calc(100%-11rem)]">
                            <InfiniteSlider
                                durationOnHover={20}
                                duration={40}
                                gap={112}>
                                {displayPartners.map((brand, i) => (
                                    <div key={i} className="flex items-center grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100">
                                        <img
                                            className="mx-auto h-8 w-fit"
                                            src={brand.logo}
                                            alt={brand.name}
                                            height="32"
                                            width="auto"
                                        />
                                    </div>
                                ))}
                            </InfiniteSlider>

                            <div className="bg-gradient-to-r from-white absolute inset-y-0 left-0 w-20 z-10"></div>
                            <div className="bg-gradient-to-l from-white absolute inset-y-0 right-0 w-20 z-10"></div>
                            <ProgressiveBlur
                                className="pointer-events-none absolute left-0 top-0 h-full w-20 z-20"
                                direction="left"
                                blurIntensity={1}
                            />
                            <ProgressiveBlur
                                className="pointer-events-none absolute right-0 top-0 h-full w-20 z-20"
                                direction="right"
                                blurIntensity={1}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
