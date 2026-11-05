import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Download, Move3d, RotateCcw } from 'lucide-react';
import type { VacuumHotspot, VacuumScene, VacuumView } from './vacuumScene3D';
import { VacuumARButton } from './VacuumARButton';

const MODEL_URL = '/models/vacuum-pump/maquina.glb?v=2';
const POSTER = '/images/vacuum-pump/machine-front.webp?v=2';
/** Antes disso o 3D não baixa: o bloco fica no meio da página e a maioria não chega nele. */
const LOAD_MARGIN = '250px';

const OVERVIEW: VacuumView = { azimuth: 26, polar: 76, distance: 1.32, target: [0, 140, 0] };
const OPEN_VIEW: VacuumView = { azimuth: -52, polar: 58, distance: 1.32, target: [0, 130, -10] };

interface TourStop {
    id: string;
    title: string;
    text: string;
    parts: string[];
    inside: boolean;
    view: VacuumView;
    hotspot: Omit<VacuumHotspot, 'id' | 'inside'>;
}

const TOUR: TourStop[] = [
    {
        id: 'manometro',
        title: 'Medidor com glicerina',
        text: 'Lê a pressão positiva e o vácuo no mesmo mostrador, com ponteiro estável e maior durabilidade.',
        parts: ['manometro'],
        inside: false,
        view: { azimuth: 14, polar: 80, distance: 0.62, target: [70, 225, 140] },
        hotspot: { position: [122, 241, 184], label: [180, 262, 180], normal: [0, 0, 1] },
    },
    {
        id: 'seletor',
        title: 'Seletor de pressão e vácuo',
        text: 'Um comando só para trocar a função, com o ajuste de estabilização logo acima.',
        parts: ['seletor', 'seletor_base', 'seletor_ponta', 'seletor_inserto'],
        inside: false,
        view: { azimuth: 22, polar: 82, distance: 0.62, target: [70, 150, 150] },
        hotspot: { position: [110, 150, 198], label: [180, 165, 185], normal: [0, 0, 1] },
    },
    {
        id: 'visor',
        title: 'Visor de nível MAX/MIN',
        text: 'Acompanhe o nível do óleo pelo visor, sem abrir o gabinete.',
        parts: ['visor', 'visor_trava', 'visor_led'],
        inside: false,
        view: { azimuth: -20, polar: 84, distance: 0.7, target: [-85, 125, 150] },
        hotspot: { position: [-128, 150, 186], label: [-182, 150, 185], normal: [0, 0, 1] },
    },
    {
        id: 'bomba',
        title: 'Bomba de vácuo de pistão',
        text: '14 PSI de pressão negativa e 70 PSI de pressão positiva.',
        parts: ['bomba'],
        inside: true,
        view: { azimuth: -118, polar: 58, distance: 0.92, target: [-40, 95, -60] },
        hotspot: { position: [-49, 142, -86], label: [-175, 170, -120], normal: [-0.4, 1, -0.4] },
    },
    {
        id: 'pulmao',
        title: 'Pulmão de alta pressão',
        text: 'Usinado, com corpo anodizado.',
        parts: ['pulmao', 'pulmao_tampa', 'pulmao_haste', 'pulmao_espacador'],
        inside: true,
        view: { azimuth: -62, polar: 62, distance: 0.92, target: [-50, 145, 50] },
        hotspot: { position: [-50, 256, 63], label: [-120, 320, 63], normal: [-0.3, 1, 0.3] },
    },
    {
        id: 'reservatorio',
        title: 'Reservatório de óleo',
        text: 'Capacidade de 2 litros.',
        parts: ['oleo'],
        inside: true,
        view: { azimuth: -78, polar: 70, distance: 0.82, target: [-50, 105, 60] },
        hotspot: { position: [-128, 100, 63], label: [-195, 100, 63], normal: [-1, 0.2, 0] },
    },
    {
        id: 'fonte',
        title: 'Fonte 12 V',
        text: 'Fonte de 12 V dentro do gabinete. A máquina liga em 220 V.',
        parts: ['fonte', 'fonte_suporte'],
        inside: true,
        view: { azimuth: 68, polar: 60, distance: 0.82, target: [85, 50, 30] },
        hotspot: { position: [95, 36, 37], label: [180, 70, 37], normal: [0.6, 1, 0] },
    },
    {
        id: 'cooler',
        title: 'Arrefecimento por cooler',
        text: 'Cooler na traseira para refrigerar a máquina.',
        parts: ['cooler'],
        inside: false,
        view: { azimuth: 172, polar: 78, distance: 0.82, target: [-30, 170, -170] },
        hotspot: { position: [-108, 196, -180], label: [-180, 215, -178], normal: [0, 0, -1] },
    },
    {
        id: 'filtro',
        title: 'Filtragem externa',
        text: 'O filtro fica por fora, na traseira da máquina.',
        parts: ['filtro'],
        inside: false,
        view: { azimuth: 200, polar: 80, distance: 0.82, target: [30, 120, -190] },
        hotspot: { position: [22, 118, -226], label: [-45, 100, -226], normal: [0, 0, -1] },
    },
    {
        id: 'medidor_ar',
        title: 'Medidor de entrada de ar',
        text: 'Medidor na lateral da máquina, junto da entrada de ar.',
        parts: ['medidor_ar'],
        inside: false,
        view: { azimuth: 112, polar: 80, distance: 0.72, target: [120, 200, -140] },
        hotspot: { position: [150, 201, -122], label: [158, 215, -70], normal: [1, 0, 0] },
    },
];

const HOTSPOTS: VacuumHotspot[] = TOUR.map((stop) => ({ id: stop.id, inside: stop.inside, ...stop.hotspot }));

type LoadState = 'waiting' | 'manual' | 'loading' | 'ready' | 'failed';

function supportsWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

interface NetworkInformationLike {
    saveData?: boolean;
    effectiveType?: string;
}

/** Quem pediu economia de dados ou está em 2G decide se baixa o modelo. */
function prefersManualLoad(): boolean {
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    return !!connection && (connection.saveData === true || /(^|-)2g$/.test(connection.effectiveType ?? ''));
}

const VacuumExperience3D: React.FC = () => {
    const stageRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<VacuumScene | null>(null);
    const tourRef = useRef<HTMLOListElement>(null);
    const markers = useRef(new Map<string, HTMLButtonElement>());
    const [state, setState] = useState<LoadState>('waiting');
    const [progress, setProgress] = useState(0);
    const [open, setOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [hintVisible, setHintVisible] = useState(true);

    const start = useCallback(() => {
        setState((current) => (current === 'waiting' || current === 'manual' ? 'loading' : current));
    }, []);

    useEffect(() => {
        const node = stageRef.current;
        if (!node) return;
        if (!supportsWebGL()) {
            setState('failed');
            return;
        }
        if (prefersManualLoad()) {
            setState('manual');
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    observer.disconnect();
                    start();
                }
            },
            { rootMargin: LOAD_MARGIN }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [start]);

    useEffect(() => {
        if (state !== 'loading' || sceneRef.current) return;
        let cancelled = false;
        import('./vacuumScene3D')
            .then(({ createVacuumScene }) => {
                const canvas = canvasRef.current;
                if (cancelled || !canvas) return;
                sceneRef.current = createVacuumScene({
                    canvas,
                    modelUrl: MODEL_URL,
                    overview: OVERVIEW,
                    hotspots: HOTSPOTS,
                    markerFor: (id) => markers.current.get(id) ?? null,
                    onProgress: setProgress,
                    onReady: () => setState('ready'),
                    onError: () => setState('failed'),
                    onUserInteract: () => setHintVisible(false),
                });
            })
            .catch(() => setState('failed'));
        return () => {
            cancelled = true;
        };
    }, [state]);

    useEffect(
        () => () => {
            sceneRef.current?.dispose();
            sceneRef.current = null;
        },
        []
    );

    const select = useCallback((stop: TourStop) => {
        setActiveId(stop.id);
        setHintVisible(false);
        setOpen(stop.inside);
        sceneRef.current?.setOpen(stop.inside);
        sceneRef.current?.focus(stop.view, stop.parts);
        // No celular a lista é um carrossel: tocar no número da peça leva até o texto dela.
        const tour = tourRef.current;
        if (tour && tour.scrollWidth > tour.clientWidth) {
            tour.querySelector(`[data-stop="${stop.id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, []);

    const toggleOpen = useCallback(() => {
        setActiveId(null);
        setHintVisible(false);
        setOpen((current) => {
            const next = !current;
            sceneRef.current?.setOpen(next);
            sceneRef.current?.focus(next ? OPEN_VIEW : OVERVIEW, []);
            return next;
        });
    }, []);

    const reset = useCallback(() => {
        setActiveId(null);
        setOpen(false);
        sceneRef.current?.setOpen(false);
        sceneRef.current?.focus(OVERVIEW, []);
    }, []);

    const ready = state === 'ready';
    const failed = state === 'failed';

    return (
        <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <div className="min-w-0 space-y-3">
            <div ref={stageRef} className="vp-3d-stage vp-plate">
                <img
                    src={POSTER}
                    width={1100}
                    height={1100}
                    loading="lazy"
                    alt="Vacuum Pump Standard W-Tech, com painel, manômetro e seletor de pressão e vácuo"
                    className={`vp-3d-poster ${ready ? 'vp-3d-poster-off' : ''}`}
                />
                {!failed && <canvas ref={canvasRef} className={`vp-3d-canvas ${ready ? 'vp-3d-canvas-on' : ''}`} role="img" aria-label="Modelo 3D da Vacuum Pump Standard. Use a lista de peças para explorar a máquina." />}

                {ready && TOUR.map((stop, index) => (
                    <button
                        key={stop.id}
                        type="button"
                        tabIndex={-1}
                        aria-hidden
                        ref={(node) => {
                            if (node) markers.current.set(stop.id, node);
                            else markers.current.delete(stop.id);
                        }}
                        className={`vp-3d-marker ${activeId === stop.id ? 'vp-3d-marker-on' : ''}`}
                        onClick={() => select(stop)}
                    >
                        <span className="vp-3d-leader" aria-hidden />
                        {index + 1}
                    </button>
                ))}

                {state === 'loading' && (
                    <div className="vp-3d-progress" role="progressbar" aria-label="Carregando o modelo 3D" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                        <span style={{ width: `${Math.round(progress * 100)}%` }} />
                    </div>
                )}

                {state === 'manual' && (
                    <button type="button" className="vp-btn absolute bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-xs -translate-x-1/2" onClick={start} data-track="vacuum_3d_load" data-track-category="Vacuum Pump">
                        <Download size={20} aria-hidden /> Carregar em 3D (1,3 MB)
                    </button>
                )}

                {ready && hintVisible && (
                    <p className="vp-3d-hint"><Move3d size={16} aria-hidden /> Arraste para girar</p>
                )}

                {ready && (
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className="vp-3d-tool" onClick={toggleOpen} aria-pressed={open} data-track="vacuum_3d_open" data-track-category="Vacuum Pump">
                                <Box size={17} aria-hidden /> {open ? 'Fechar a máquina' : 'Ver por dentro'}
                            </button>
                            {(activeId || open) && (
                                <button type="button" className="vp-3d-tool" onClick={reset} aria-label="Voltar à vista inicial">
                                    <RotateCcw size={17} aria-hidden />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <VacuumARButton placement="stage" />
            </div>

            <ol ref={tourRef} className="vp-3d-tour" aria-label="Peças da máquina">
                {TOUR.map((stop, index) => (
                    <li key={stop.id} className="contents">
                        <button
                            type="button"
                            data-stop={stop.id}
                            className={`vp-3d-stop ${activeId === stop.id ? 'vp-3d-stop-on' : ''}`}
                            onClick={() => select(stop)}
                            disabled={!ready}
                            aria-pressed={activeId === stop.id}
                            data-track={`vacuum_3d_${stop.id}`}
                            data-track-category="Vacuum Pump"
                        >
                            <span className="vp-3d-stop-n">{index + 1}</span>
                            <span>
                                <span className="block font-bold">{stop.title}</span>
                                <span className="mt-0.5 block text-sm vp-muted">{stop.text}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
};

export default VacuumExperience3D;
