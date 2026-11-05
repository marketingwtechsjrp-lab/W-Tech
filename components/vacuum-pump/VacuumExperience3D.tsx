import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Download, Move3d, RotateCcw, RotateCw, Scan, Volume2, VolumeX, X } from 'lucide-react';
import type { MachineState } from './vacuumMachineSim';
import type { VacuumArPhase, VacuumHotspot, VacuumScene, VacuumView } from './vacuumScene3D';
import { VacuumARButton, sceneViewerHref } from './VacuumARButton';

const MODEL_URL = '/models/vacuum-pump/maquina.glb?v=2';
const DIAL_URL = '/images/vacuum-pump/mostrador-sem-ponteiro.webp';
const BUBBLER_URL = '/models/vacuum-pump/borbulhador.glb';
const POSTER = '/images/vacuum-pump/machine-front.webp?v=2';
/** Antes disso o 3D não baixa: o bloco fica no meio da página e a maioria não chega nele. */
const LOAD_MARGIN = '250px';

const OVERVIEW: VacuumView = { azimuth: 26, polar: 76, distance: 1.32, target: [0, 140, 0] };
const OPEN_VIEW: VacuumView = { azimuth: -52, polar: 58, distance: 1.32, target: [0, 130, -10] };

type TutorialStep = 'power' | 'vacuum' | 'bubbler' | 'pressure' | 'done';

/** A ordem segue a narração aprovada do vídeo: vácuo primeiro, e só depois o óleo entra. */
const TUTORIAL: { id: Exclude<TutorialStep, 'done'>; title: string; text: string; action: string }[] = [
    { id: 'power', title: 'Ligue a máquina', text: 'Toque na chave da máquina, ou no botão aqui embaixo.', action: 'Ligar' },
    { id: 'vacuum', title: 'Puxe o vácuo', text: 'Gire o seletor para VACUUM. O ponteiro desce: o ar está saindo.', action: 'Girar para VACUUM' },
    { id: 'bubbler', title: 'Encaixe o borbulhador', text: 'Toque no bico da máquina e veja o ar sair do óleo em bolhas. Vendido à parte.', action: 'Encaixar o borbulhador' },
    { id: 'pressure', title: 'Deixe o óleo entrar', text: 'Com o ar fora, gire o seletor para PRESSURE.', action: 'Girar para PRESSURE' },
];

interface ArCoachProps {
    step: TutorialStep;
    machine: MachineState;
    bar: number;
    buyLabel: string;
    onAction: (step: Exclude<TutorialStep, 'done'>) => void;
    onSound: (on: boolean) => void;
    onRestart: () => void;
    onBuy: () => void;
}

/** Tutorial sobre a câmera: um passo de cada vez, para a máquina continuar à vista. */
const ArCoach: React.FC<ArCoachProps> = ({ step, machine, bar, buyLabel, onAction, onSound, onRestart, onBuy }) => {
    const psi = Math.round(bar * 14.5);
    const index = TUTORIAL.findIndex((item) => item.id === step);
    const current = index >= 0 ? TUTORIAL[index] : null;
    return (
        <div className="vp-coach" data-ar-control>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0" role="status">
                    <p className="vp-coach-step">{current ? `Passo ${index + 1} de ${TUTORIAL.length}` : 'Pronto'}</p>
                    <h3 className="vp-display text-2xl leading-none">{current ? current.title : 'É assim na sua bancada'}</h3>
                    <p className="mt-1 text-[.86rem] leading-snug">{current ? current.text : 'Toque na chave e no seletor da máquina sempre que quiser.'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <div className="vp-coach-reading vp-num" aria-label={`Leitura do relógio: ${psi} PSI`}>
                        <b>{psi < 0 ? `−${Math.abs(psi)}` : psi}</b>
                        <span>PSI</span>
                    </div>
                    <button type="button" className="vp-coach-icon" aria-pressed={machine.sound} aria-label={machine.sound ? 'Desligar o som da máquina' : 'Ligar o som da máquina'} onClick={() => onSound(!machine.sound)}>
                        {machine.sound ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
                    </button>
                </div>
            </div>
            {current ? (
                <button type="button" className="vp-coach-main" disabled={machine.bubbler === 'loading'} onClick={() => onAction(current.id)} data-track={`vacuum_ar_${current.id}`} data-track-category="Vacuum Pump">
                    {machine.bubbler === 'loading' ? 'Encaixando...' : current.action}
                </button>
            ) : (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button type="button" className="vp-coach-main" onClick={onBuy} data-track="vacuum_ar_buy" data-track-category="Vacuum Pump">{buyLabel}</button>
                    <button type="button" className="vp-coach-icon !h-auto !w-auto px-3 text-sm font-semibold" onClick={onRestart}>Repetir</button>
                </div>
            )}
            <p className="text-[.66rem] opacity-70">Simulação ilustrativa.</p>
        </div>
    );
};

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

interface VacuumExperience3DProps {
    arInteractive: boolean;
    /** Linha da parcela na realidade aumentada, como "10x de R$ 799 sem juros". */
    offerLine: string;
    buyLabel: string;
    onBuy: () => void;
}

const VacuumExperience3D: React.FC<VacuumExperience3DProps> = ({ arInteractive, offerLine, buyLabel, onBuy }) => {
    const overlayRef = useRef<HTMLDivElement>(null);
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
    const [machine, setMachine] = useState<MachineState>({ power: false, selector: 'stabilization', bubbler: 'off', sound: true });
    const [bar, setBar] = useState(0);
    const [arPhase, setArPhase] = useState<VacuumArPhase | 'starting' | null>(null);
    const [tutorial, setTutorial] = useState<TutorialStep>('power');

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
                    dialUrl: DIAL_URL,
                    bubblerUrl: BUBBLER_URL,
                    onMachineChange: setMachine,
                    onMachineReading: setBar,
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

    const onTutorialAction = useCallback((step: Exclude<TutorialStep, 'done'>) => {
        const scene = sceneRef.current;
        if (step === 'power') scene?.setPower(true);
        if (step === 'vacuum') scene?.setSelector('vacuum');
        if (step === 'bubbler') scene?.setBubbler(true);
        if (step === 'pressure') scene?.setSelector('pressure');
    }, []);

    const onSound = useCallback((on: boolean) => sceneRef.current?.setSound(on), []);

    const onRestartTutorial = useCallback(() => {
        const scene = sceneRef.current;
        scene?.setSelector('stabilization');
        scene?.setBubbler(false);
        scene?.setPower(false);
        setTutorial('power');
    }, []);

    const onBuyFromAR = useCallback(() => {
        sceneRef.current?.exitAR();
        onBuy();
    }, [onBuy]);

    // O tutorial anda sozinho, tanto pelo botão quanto pelo toque na própria peça.
    useEffect(() => {
        setTutorial((step) => {
            if (step === 'power' && machine.power) return 'vacuum';
            if (step === 'vacuum' && machine.power && machine.selector === 'vacuum') return 'bubbler';
            if (step === 'bubbler' && machine.bubbler === 'on') return 'pressure';
            if (step === 'pressure' && machine.power && machine.selector === 'pressure') return 'done';
            return step;
        });
    }, [machine]);

    // O anel na máquina mostra onde tocar no passo atual.
    useEffect(() => {
        if (arPhase !== 'placed') {
            sceneRef.current?.setGuide(null);
            return;
        }
        sceneRef.current?.setGuide(tutorial === 'power' ? 'power' : tutorial === 'bubbler' ? 'bubbler' : tutorial === 'done' ? null : 'selector');
    }, [arPhase, tutorial]);

    const startAR = useCallback(async () => {
        const scene = sceneRef.current;
        const overlay = overlayRef.current;
        if (!scene || !overlay) return;
        setTutorial('power');
        setArPhase('starting');
        try {
            await scene.enterAR(overlay, (phase) => setArPhase(phase === 'ended' ? null : phase));
        } catch {
            // Sem a sessão interativa, a pessoa ainda vê a máquina na bancada pelo visualizador do Android.
            setArPhase(null);
            window.location.href = sceneViewerHref();
        }
    }, []);

    // Toque em botão da tela não pode virar toque na máquina dentro da realidade aumentada.
    useEffect(() => {
        const overlay = overlayRef.current;
        if (!overlay) return;
        const onBeforeSelect = (event: Event) => {
            if ((event.target as Element | null)?.closest?.('[data-ar-control]')) event.preventDefault();
        };
        overlay.addEventListener('beforexrselect', onBeforeSelect);
        return () => overlay.removeEventListener('beforexrselect', onBeforeSelect);
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
            <VacuumARButton placement="stage" interactive={arInteractive} onStartInteractive={startAR} interactiveBusy={!ready || arPhase === 'starting'} offerLine={offerLine} onBuy={onBuy} />
            </div>

            {/* Tela da realidade aumentada no Android: só aparece dentro da sessão (:xr-overlay). */}
            <div ref={overlayRef} className="vp-ar-overlay">
                <div className="vp-ar-tools" data-ar-control>
                    <button type="button" className="vp-3d-tool" onClick={() => sceneRef.current?.exitAR()}><X size={17} aria-hidden /> Sair</button>
                    {arPhase === 'placed' && (
                        <>
                            <button type="button" className="vp-3d-tool" onClick={() => { setArPhase('placing'); sceneRef.current?.repositionAR(); }}><Scan size={17} aria-hidden /> Mudar de lugar</button>
                            <button type="button" className="vp-3d-tool" aria-label="Girar a máquina" onClick={() => sceneRef.current?.rotateAR(90)}><RotateCw size={17} aria-hidden /></button>
                        </>
                    )}
                </div>
                {arPhase !== 'placed' && <p className="vp-ar-hint">Aponte para a bancada e toque para colocar a máquina, em tamanho real.</p>}
                {arPhase === 'placed' && <ArCoach step={tutorial} machine={machine} bar={bar} buyLabel={buyLabel} onAction={onTutorialAction} onSound={onSound} onRestart={onRestartTutorial} onBuy={onBuyFromAR} />}
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
