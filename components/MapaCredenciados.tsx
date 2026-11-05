import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loadLeaflet } from '../lib/loadLeaflet';

declare const L: any; // Leaflet Global from CDN

/**
 * Mapa da rede de credenciados nas homes. A Leaflet e a consulta só saem quando o bloco chega
 * perto da tela: no index.html, a Leaflet travava a renderização de todas as páginas.
 */
const MapaCredenciados: React.FC<{ className?: string }> = ({ className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [perto, setPerto] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        const observador = new IntersectionObserver(([entrada]) => {
            if (!entrada.isIntersecting) return;
            setPerto(true);
            observador.disconnect();
        }, { rootMargin: '600px 0px' });
        observador.observe(containerRef.current);
        return () => observador.disconnect();
    }, []);

    useEffect(() => {
        if (!perto) return;
        let cancelado = false;
        let mapa: any = null;

        const desenhar = async () => {
            const credenciados = supabase
                .from('SITE_Mechanics')
                .select('id, name, workshop_name, latitude, longitude')
                .eq('status', 'Approved')
                .then(({ data, error }) => {
                    if (error) console.error('Error fetching mechanics', error);
                    return data || [];
                });

            await loadLeaflet();
            if (cancelado || !containerRef.current) return;

            mapa = L.map(containerRef.current, {
                // A página rola por cima do mapa: a roda do mouse e um dedo só continuam rolando
                scrollWheelZoom: false,
                dragging: !L.Browser.mobile
            }).setView([-15.793889, -47.882778], 4); // Center of Brazil

            // Mesmos blocos da /mapa: os da CARTO passaram a sair carimbados "API KEY REQUIRED"
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapa);
            // O crédito é exigido pela OpenStreetMap, e o degradê da home escurece a parte de baixo
            mapa.attributionControl.setPosition('topright');

            const pinos = await credenciados;
            if (cancelado) return;

            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: #EF4444; width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            });

            pinos.forEach((m) => {
                if (!m.latitude || !m.longitude) return;
                // Como texto: o nome vem do cadastro e o popup aceita HTML
                const nome = document.createElement('b');
                nome.textContent = m.workshop_name || m.name;
                L.marker([m.latitude, m.longitude], { icon }).addTo(mapa).bindPopup(nome);
            });
        };

        // Sem o Leaflet a página segue no ar, só sem o mapa
        desenhar().catch((erro) => console.error(erro));

        return () => {
            cancelado = true;
            mapa?.remove();
        };
    }, [perto]);

    return <div ref={containerRef} className={className}></div>;
};

export default MapaCredenciados;
