'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

// Register standard GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

// ===========================================
// CONFIG: Image Sequence
// ===========================================
// Import images via glob
// NOTE: Make sure the GLOB path matches your actual folder structure
const imagesGlob = import.meta.glob('../pages/hero/animation/wp3_*.jpg', { eager: true, as: 'url' });
const imageKeys = Object.keys(imagesGlob).sort();
const imageUrls = imageKeys.map(key => imagesGlob[key]);


export function HeroScrollAnimation() {
  const { get } = useSettings();
  const heroHeadline = get('hero_headline', 'A Elite da Tecnologia Automotiva');
  const heroSubheadline = get('hero_subheadline', 'Evolua sua oficina e sua carreira com treinamentos especializados em suspensões off-road e on-road.');

  // Ref for the main container (the trigger)
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref for the canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // We need to store the loaded images in memory so we don't fetch repeatedly
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Partner data logic (kept as is)
  const partnerBrandsRaw = get('partner_brands', '[]');
  let partnerBrands = [];
  try {
    partnerBrands = Array.isArray(partnerBrandsRaw) 
      ? partnerBrandsRaw 
      : JSON.parse(partnerBrandsRaw);
  } catch(e) { partnerBrands = []; }

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

  // 1. Load Images
  useEffect(() => {
    if (imageUrls.length === 0) {
      setLoaded(true);
      return;
    }
    
    let loadedCount = 0;
    const imgElements: HTMLImageElement[] = [];

    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
            loadedCount++;
            if (loadedCount === imageUrls.length) {
                setLoaded(true);
            }
        };
        imgElements.push(img);
    });
    setImages(imgElements);
  }, []);

  // 2. Helper to Draw Frame
  // We keep this outside the effect or use a ref-based approach so GSAP can call it
  const renderFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !images[index]) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = images[index];
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Cover logic
    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
    } else {
        drawWidth = canvasHeight * imgRatio;
        drawHeight = canvasHeight;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // 3. GSAP Logic
  useGSAP(() => {
    // Only run if images are fully loaded and we have refs
    if (!loaded || images.length === 0 || !containerRef.current || !canvasRef.current) return;

    const totalFrames = images.length - 1;
    const obj = { frame: 0 }; // Object to tween

    // Initial render
    renderFrame(0);

    // Create the Timeline pinned to the container
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=500%", // 500vh scroll distance
        pin: true,     // Pin the hero section during animation
        scrub: 1,    // Smooth scrubbing (0.5s lag)
        // onLeave: () => console.log("Animation done, unpinning..."),
      }
    });

    // Animate the 'frame' property from 0 to totalFrames
    tl.to(obj, {
      frame: totalFrames,
      snap: "frame", // Snap to integer frames
      ease: "none",  // Linear frame progression mapped to scroll
      onUpdate: () => {
        renderFrame(Math.round(obj.frame));
      }
    });

    // Also animate Text opacity nicely
    // Text stays visible for first 20% of scroll, then fades
    const textTl = gsap.timeline({
        scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "+=150%", // Text fades out quicker than image animation finishes
            scrub: true
        }
    });
    
    textTl.to(".hero-text-content", {
        opacity: 0,
        y: -50,
        scale: 0.95,
        ease: "power1.in"
    });

  }, [loaded, images]); // Re-run when loaded changes


  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            // Re-render current frame if possible? 
            // GSAP usually handles tick, but on raw resize we might want to force a draw of frame 0 or last known.
            // For simplicity, we trust GSAP's ticker or next scroll event to fix it, 
            // but let's force a redraw of *some* image if we have one, just to avoid blank canvas.
            if (images.length > 0) renderFrame(0); 
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [images]);

  return (
    <div ref={containerRef} className="relative w-full h-[100vh] bg-black overflow-hidden">
      {/* 
        The container is 100vh. 
        GSAP will PIN this container for 500vh worth of scroll.
        So we don't need to manually set height: 500vh here. 
        We set height: 100vh so it fills the viewport. 
      */}

      {/* Canvas Layer */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full block object-cover z-0" 
      />
      
      {/* Overlay: Vignette / Gradient for cinematic feel */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none z-10" />

      {/* Loading Spinner */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
           <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-wtech-gold border-t-transparent rounded-full animate-spin"></div>
               <p className="text-wtech-gold font-bold uppercase tracking-widest text-xs animate-pulse">Carregando Experiência 3D...</p>
           </div>
        </div>
      )}

      {/* Hero Content (Floating on top) */}
      <div className="hero-text-content absolute inset-0 z-20 flex flex-col justify-center items-center text-center container mx-auto px-4 pointer-events-none">
         <div className="pointer-events-auto max-w-4xl">
             <span className="inline-block py-1 px-3 rounded-full bg-wtech-gold/10 border border-wtech-gold/20 text-wtech-gold text-[10px] font-black uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
                Tecnologia de Ponta
             </span>
             <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 drop-shadow-2xl leading-[0.9]">
                {heroHeadline}
             </h1>
             <p className="text-lg md:text-xl text-gray-300 font-medium mb-10 max-w-2xl mx-auto drop-shadow-lg leading-relaxed">
                {heroSubheadline}
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link to="/cursos" className="group">
                    <Button size="lg" className="h-14 px-8 bg-wtech-gold hover:bg-white text-black font-black uppercase tracking-widest rounded-none -skew-x-12 transition-all duration-300 hover:scale-105">
                        <span className="skew-x-12 flex items-center gap-2">
                           Ver Agenda <ChevronRight size={18} />
                        </span>
                    </Button>
                </Link>
                <a href="https://w-techstore.com.br/" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" className="h-14 px-8 border-white/30 text-white hover:bg-white hover:text-black font-bold uppercase tracking-widest rounded-none -skew-x-12 backdrop-blur-sm transition-all duration-300">
                         <span className="skew-x-12">Loja Oficial</span>
                    </Button>
                </a>
             </div>
         </div>
      </div>

       {/* Scroll Indicator */}
       <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 hero-text-content pointer-events-none">
            <div className="flex flex-col items-center gap-2 opacity-50">
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-white to-transparent"></div>
                <span className="text-[10px] text-white uppercase tracking-[0.3em]">Scrolle</span>
            </div>
       </div>

    </div>
  );
}
