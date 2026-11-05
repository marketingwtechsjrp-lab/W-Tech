import * as THREE from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Simulação de uso da Vacuum Pump: chave, seletor, ponteiro, cooler, visor, mangueira e
 * câmara borbulhadora. Não conhece a câmera: a mesma lógica serve à página e à realidade
 * aumentada. Coordenadas em milímetros, dentro do nó `maquina` do modelo.
 */

export type SelectorPosition = 'pressure' | 'stabilization' | 'vacuum';

export interface MachineState {
    power: boolean;
    selector: SelectorPosition;
    bubbler: 'off' | 'loading' | 'on';
    sound: boolean;
}

export type MachineGuide = 'power' | 'selector' | 'bubbler' | null;

export interface MachineSim {
    readonly targets: THREE.Object3D[];
    getState: () => MachineState;
    setPower: (on: boolean) => void;
    setSelector: (position: SelectorPosition) => void;
    setBubbler: (on: boolean) => void;
    setSound: (on: boolean) => void;
    /** Som só enquanto a máquina está à vista. */
    setAudible: (audible: boolean) => void;
    /** A simulação só existe na realidade aumentada; desligada, a máquina volta ao repouso. */
    setActive: (active: boolean) => void;
    setGuide: (target: MachineGuide) => void;
    pick: (raycaster: THREE.Raycaster) => boolean;
    /** Devolve true enquanto algo se move e a cena precisa de novo quadro. */
    update: (delta: number) => boolean;
    dispose: () => void;
}

export interface MachineSimOptions {
    model: THREE.Object3D;
    loader: GLTFLoader;
    dialUrl: string;
    bubblerUrl: string;
    reducedMotion: boolean;
    onChange: (state: MachineState) => void;
    onReading: (bar: number) => void;
    onAssetReady: () => void;
}

const GAUGE = { x: 86.04, y: 241.43, z: 180.64 };
const SELECTOR_AXIS = { x: 86.04, y: 150.3 };
const SELECTOR_ANGLE: Record<SelectorPosition, number> = {
    pressure: THREE.MathUtils.degToRad(110),
    stabilization: 0,
    vacuum: THREE.MathUtils.degToRad(-110),
};
const SELECTOR_ORDER: SelectorPosition[] = ['stabilization', 'vacuum', 'pressure'];
const POWER_ON_ANGLE = THREE.MathUtils.degToRad(-90);
/** Ficha técnica: 14 PSI de vácuo e 70 PSI de pressão. */
const VACUUM_BAR = -14 / 14.5;
const PRESSURE_BAR = 70 / 14.5;
/** No mostrador, 2 bar fica no alto e cada bar anda 45 graus. */
const barToAngle = (bar: number) => -THREE.MathUtils.degToRad((bar - 2) * 45);

const BUBBLER_POSITION = new THREE.Vector3(-161, 364, 168);
const BUBBLER_DROP = 130;
const TUBE_RADIUS = 12;
const TUBE_BOTTOM = -62;
const TUBE_HEIGHT = 124;
const BUBBLE_COUNT = 42;

const smooth = (current: number, target: number, tau: number, delta: number) => current + (target - current) * (1 - Math.exp(-delta / tau));
type StdMaterial = THREE.MeshStandardMaterial;

function ringTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.strokeStyle = '#ff1d10';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
        ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
}

function glowStripTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const across = ctx.createLinearGradient(0, 0, 64, 0);
        across.addColorStop(0, 'rgba(255,26,16,0)');
        across.addColorStop(0.5, 'rgba(255,26,16,.9)');
        across.addColorStop(1, 'rgba(255,26,16,0)');
        ctx.fillStyle = across;
        ctx.fillRect(0, 0, 64, 256);
        // Apaga as pontas, para o brilho não terminar em corte reto.
        ctx.globalCompositeOperation = 'destination-in';
        const along = ctx.createLinearGradient(0, 0, 0, 256);
        along.addColorStop(0, 'rgba(0,0,0,0)');
        along.addColorStop(0.12, 'rgba(0,0,0,1)');
        along.addColorStop(0.88, 'rgba(0,0,0,1)');
        along.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = along;
        ctx.fillRect(0, 0, 64, 256);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function needleGeometry(): THREE.ShapeGeometry {
    // Medidas do ponteiro pintado no mostrador original, em milímetros.
    const pointer = new THREE.Shape();
    pointer.moveTo(-0.55, 0);
    pointer.lineTo(-0.08, 19.5);
    pointer.lineTo(0.08, 19.5);
    pointer.lineTo(0.55, 0);
    pointer.closePath();
    const center = new THREE.Shape();
    center.absarc(0, 0, 2.6, 0, Math.PI * 2, false);
    const tail = new THREE.Shape();
    tail.moveTo(-1.3, -1.8);
    tail.quadraticCurveTo(-1.5, -6, -3.6, -9.3);
    tail.lineTo(3.6, -9.3);
    tail.quadraticCurveTo(1.5, -6, 1.3, -1.8);
    tail.closePath();
    return new THREE.ShapeGeometry([pointer, center, tail], 24);
}

/** Som sintetizado, sem arquivo para baixar: motor do cooler, bomba e o clique dos comandos. */
class MachineSound {
    private ctx: AudioContext | null = null;
    private fan: GainNode | null = null;
    private pump: GainNode | null = null;
    private master: GainNode | null = null;
    private enabled = true;
    private audible = true;
    private power = false;
    private pumping = false;

    private ensure(): AudioContext | null {
        if (this.ctx) return this.ctx;
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        const ctx = new Ctor();
        const master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
        const voice = (type: OscillatorType, frequency: number, cutoff: number) => {
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = frequency;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = cutoff;
            const gain = ctx.createGain();
            gain.gain.value = 0;
            osc.connect(filter).connect(gain).connect(master);
            osc.start();
            return gain;
        };
        this.fan = voice('triangle', 118, 700);
        this.pump = voice('sawtooth', 58, 420);
        this.master = master;
        this.ctx = ctx;
        return ctx;
    }

    private apply() {
        const { ctx, fan, pump, master } = this;
        if (!ctx || !fan || !pump || !master) return;
        const now = ctx.currentTime;
        master.gain.setTargetAtTime(this.enabled && this.audible ? 1 : 0, now, 0.08);
        fan.gain.setTargetAtTime(this.power ? 0.035 : 0, now, 0.35);
        pump.gain.setTargetAtTime(this.power && this.pumping ? 0.08 : 0, now, 0.25);
    }

    /** Só chamado a partir de um toque: é o que o navegador exige para liberar o áudio. */
    click() {
        const ctx = this.enabled ? this.ensure() : null;
        if (!ctx) return;
        void ctx.resume();
        const length = Math.floor(ctx.sampleRate * 0.045);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = this.audible ? 0.22 : 0;
        source.connect(gain).connect(ctx.destination);
        source.start();
        this.apply();
    }

    set(power: boolean, pumping: boolean) {
        this.power = power;
        this.pumping = pumping;
        this.apply();
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (enabled) this.ensure();
        this.apply();
    }

    setAudible(audible: boolean) {
        this.audible = audible;
        this.apply();
    }

    dispose() {
        void this.ctx?.close();
        this.ctx = null;
    }
}

export function createMachineSim(options: MachineSimOptions): MachineSim {
    const { model, reducedMotion } = options;
    const root = model.getObjectByName('maquina') ?? model;
    const sound = new MachineSound();

    const state: MachineState = { power: false, selector: 'stabilization', bubbler: 'off', sound: true };
    const emit = () => options.onChange({ ...state });

    // ─── Seletor: os três pedaços giram juntos em torno do eixo da base ───
    const selectorPivot = new THREE.Group();
    selectorPivot.position.set(SELECTOR_AXIS.x, SELECTOR_AXIS.y, 0);
    root.add(selectorPivot);
    selectorPivot.updateMatrixWorld(true);
    for (const name of ['seletor', 'seletor_ponta', 'seletor_inserto']) {
        const part = root.getObjectByName(name);
        if (part) selectorPivot.attach(part);
    }

    // ─── Chave liga/desliga, com a marca branca que a peça real tem ───
    const powerKnob = root.getObjectByName('chave') ?? null;
    const powerBase = powerKnob?.rotation.z ?? 0;
    if (powerKnob) {
        const mark = new THREE.Mesh(
            new THREE.BoxGeometry(2.4 / powerKnob.scale.x, 15 / powerKnob.scale.y, 0.6 / powerKnob.scale.z),
            new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.5 })
        );
        mark.position.set(0, 8 / powerKnob.scale.y, 47.8 / powerKnob.scale.z);
        powerKnob.add(mark);
    }

    // ─── Ponteiro: peça 3D sobre o mostrador sem o ponteiro pintado ───
    const needle = new THREE.Group();
    needle.position.set(GAUGE.x, GAUGE.y, GAUGE.z + 0.4);
    needle.rotation.z = barToAngle(0);
    needle.visible = false;
    const needleMaterial = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.45, metalness: 0.2 });
    needle.add(new THREE.Mesh(needleGeometry(), needleMaterial));
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshStandardMaterial({ color: '#b98f3e', metalness: 0.7, roughness: 0.4 }));
    hub.position.z = 0.1;
    needle.add(hub);
    root.add(needle);

    let dialMaterial: StdMaterial | null = null;
    root.getObjectByName('manometro')?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh && (mesh.material as StdMaterial).map) dialMaterial = mesh.material as StdMaterial;
    });
    // Na vitrine da página fica o ponteiro pintado; o mostrador sem ele só baixa ao abrir a realidade aumentada.
    let dialTexture: THREE.Texture | null = null;
    function loadDial() {
        if (dialTexture) return;
        dialTexture = new THREE.TextureLoader().load(options.dialUrl, (texture) => {
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = 8;
            texture.needsUpdate = true;
            if (dialMaterial) {
                dialMaterial.map = texture;
                dialMaterial.needsUpdate = true;
            }
            needle.visible = true;
            options.onAssetReady();
        });
    }

    // ─── Visor: faixa de LED e a coluna de óleo ───
    const ledMaterials: StdMaterial[] = [];
    root.getObjectByName('visor_led')?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) ledMaterials.push(mesh.material as StdMaterial);
    });
    const ledRest = ledMaterials.map((material) => ({ color: material.color.clone(), emissive: material.emissive.clone(), intensity: material.emissiveIntensity }));
    // O LED do modelo fica fundo no gabinete: esta placa traz a luz para junto da janela do visor.
    const windowMaterial = new THREE.MeshStandardMaterial({ color: '#2a0505', emissive: '#ff1a10', emissiveIntensity: 0, roughness: 0.35 });
    const visorWindow = new THREE.Mesh(new THREE.BoxGeometry(8, 150, 0.4), windowMaterial);
    visorWindow.position.set(-110, 121, 184);
    visorWindow.visible = false;
    root.add(visorWindow);
    const levelMaterial = new THREE.MeshStandardMaterial({ color: '#7b6518', emissive: '#ffb300', emissiveIntensity: 0, roughness: 0.4 });
    const level = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 0.4), levelMaterial);
    level.position.set(-110, 46, 184.3);
    level.visible = false;
    root.add(level);
    const glowTexture = glowStripTexture();
    const glowMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const visorGlow = new THREE.Mesh(new THREE.PlaneGeometry(52, 190), glowMaterial);
    visorGlow.position.set(-110, 121, 186.6);
    visorGlow.renderOrder = 4;
    visorGlow.visible = false;
    root.add(visorGlow);

    // ─── Cooler ───
    const cooler = root.getObjectByName('cooler') ?? null;

    // ─── Mangueira, da saída de óleo até o bico no suporte ───
    const hoseMaterial = new THREE.MeshStandardMaterial({ color: '#e4eaec', roughness: 0.18, transparent: true, opacity: 0.5, depthWrite: false });
    const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-161, 228, 168),
        new THREE.Vector3(-177, 192, 171),
        new THREE.Vector3(-191, 122, 173),
        new THREE.Vector3(-186, 52, 180),
        new THREE.Vector3(-150, 8, 202),
        new THREE.Vector3(-92, 1, 210),
        new THREE.Vector3(-46, 6, 203),
        new THREE.Vector3(-34, 10, 192),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 72, 3.2, 8, false), hoseMaterial);
    hose.renderOrder = 2;
    root.add(hose);
    const HOSE_EMPTY = new THREE.Color('#e4eaec');
    const HOSE_OIL = new THREE.Color('#d89a2b');

    // ─── Câmara borbulhadora, baixada só quando a pessoa encaixa ───
    const bubbler = new THREE.Group();
    bubbler.position.copy(BUBBLER_POSITION);
    bubbler.visible = false;
    root.add(bubbler);
    const oilMaterial = new THREE.MeshStandardMaterial({ color: '#d89a2b', roughness: 0.25, transparent: true, opacity: 0.74, depthWrite: false });
    const oil = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_RADIUS, TUBE_RADIUS, 1, 28), oilMaterial);
    oil.renderOrder = 1;
    bubbler.add(oil);
    const bubbleGeometry = new THREE.SphereGeometry(1, 10, 8);
    const bubbleMaterial = new THREE.MeshStandardMaterial({ color: '#fff7e4', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.92, depthWrite: false });
    const bubbles = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, BUBBLE_COUNT);
    bubbles.frustumCulled = false;
    bubbles.renderOrder = 2;
    bubbler.add(bubbles);
    const bubbleData = Array.from({ length: BUBBLE_COUNT }, () => ({ x: 0, y: 0, z: 0, speed: 0, size: 0, phase: Math.random() * 6.28, alive: false }));
    const dummy = new THREE.Object3D();
    let bubblerLoaded = false;
    let bubblerShown = 0;

    function loadBubbler() {
        options.loader.load(
            options.bubblerUrl,
            (gltf) => {
                gltf.scene.scale.setScalar(1000);
                gltf.scene.traverse((object) => {
                    const mesh = object as THREE.Mesh;
                    if (!mesh.isMesh) return;
                    if (/tubo/i.test(mesh.name) || /tubo/i.test(mesh.parent?.name ?? '')) {
                        const glass = (mesh.material as StdMaterial).clone();
                        glass.color.set('#eef5f7');
                        glass.transparent = true;
                        glass.opacity = 0.2;
                        glass.roughness = 0.04;
                        glass.metalness = 0;
                        glass.depthWrite = false;
                        mesh.material = glass;
                        mesh.renderOrder = 3;
                    }
                });
                bubbler.add(gltf.scene);
                bubblerLoaded = true;
                bubbler.visible = true;
                bubblerShown = 0;
                state.bubbler = 'on';
                sound.click();
                emit();
                options.onAssetReady();
            },
            undefined,
            () => {
                state.bubbler = 'off';
                emit();
            }
        );
    }

    // ─── Áreas de toque maiores que as peças: o dedo não acerta um botão de 3 cm ───
    const touchMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const touch = (x: number, y: number, z: number, radius: number, name: string) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), touchMaterial);
        mesh.position.set(x, y, z);
        mesh.name = name;
        root.add(mesh);
        return mesh;
    };
    const powerTouch = touch(86, 46, 196, 34, 'toque_chave');
    const selectorTouch = touch(86, 148, 196, 44, 'toque_seletor');
    const bubblerTouch = touch(BUBBLER_POSITION.x, BUBBLER_POSITION.y - 40, BUBBLER_POSITION.z, 46, 'toque_borbulhador');
    const nozzleTouch = touch(-161, 250, 180, 42, 'toque_bico');
    const targets: THREE.Object3D[] = [powerTouch, selectorTouch, nozzleTouch];
    const swapTouch = (add: THREE.Object3D, remove: THREE.Object3D) => {
        const index = targets.indexOf(remove);
        if (index >= 0) targets.splice(index, 1);
        if (!targets.includes(add)) targets.push(add);
    };

    // ─── Anel que mostra onde tocar ───
    const guideTexture = ringTexture();
    const guide = new THREE.Sprite(new THREE.SpriteMaterial({ map: guideTexture, transparent: true, depthTest: false, depthWrite: false }));
    guide.renderOrder = 6;
    guide.visible = false;
    root.add(guide);
    let guideTarget: MachineGuide = null;
    let active = false;
    const rootBase = root.position.clone();

    let powerAngle = powerBase;
    let selectorAngle = 0;
    let bar = 0;
    let fanSpeed = 0;
    let ledGlow = 0;
    let oilLevel = 0.78;
    let chamberLevel = 0.72;
    let air = 1;
    let hoseFlow = 0;
    let clock = 0;
    let lastReading = Number.NaN;
    let settled = false;

    function setPower(on: boolean) {
        if (state.power === on) return;
        state.power = on;
        if (!on) air = 1;
        sound.click();
        sound.set(on, on && state.selector !== 'stabilization');
        settled = false;
        emit();
    }

    function setSelector(position: SelectorPosition) {
        if (state.selector === position) return;
        state.selector = position;
        if (position === 'vacuum') air = 1;
        sound.click();
        sound.set(state.power, state.power && position !== 'stabilization');
        settled = false;
        emit();
    }

    function setBubbler(on: boolean) {
        if (on && state.bubbler !== 'off') return;
        if (!on) {
            state.bubbler = 'off';
            bubbler.visible = false;
            swapTouch(nozzleTouch, bubblerTouch);
            sound.click();
            settled = false;
            emit();
            return;
        }
        air = 1;
        chamberLevel = 0.72;
        settled = false;
        if (bubblerLoaded) {
            state.bubbler = 'on';
            bubbler.visible = true;
            bubblerShown = 0;
            sound.click();
            emit();
        } else {
            state.bubbler = 'loading';
            emit();
            loadBubbler();
        }
    }

    function targetBar(): { value: number; tau: number } {
        if (!state.power) return { value: 0, tau: 1.6 };
        if (state.selector === 'vacuum') return { value: VACUUM_BAR, tau: 1.8 };
        if (state.selector === 'pressure') return { value: PRESSURE_BAR, tau: 2.4 };
        return { value: 0, tau: 2.6 };
    }

    function updateBubbles(delta: number, emission: number): boolean {
        const surface = TUBE_BOTTOM + TUBE_HEIGHT * chamberLevel;
        let anyAlive = false;
        for (let i = 0; i < BUBBLE_COUNT; i += 1) {
            const bubble = bubbleData[i];
            if (!bubble.alive && Math.random() < emission * delta * 2.4) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.sqrt(Math.random()) * (TUBE_RADIUS - 3);
                bubble.x = Math.cos(angle) * radius;
                bubble.z = Math.sin(angle) * radius;
                bubble.y = TUBE_BOTTOM + Math.random() * 10;
                bubble.speed = 16 + Math.random() * 30;
                bubble.size = 0.55 + Math.random() * 1.5;
                bubble.alive = true;
            }
            if (bubble.alive) {
                bubble.y += bubble.speed * delta;
                // Subindo, a bolha se expande e se junta na calota superior.
                bubble.size = Math.min(2.7, bubble.size + delta * 0.32);
                if (bubble.y > surface) bubble.alive = false;
            }
            if (bubble.alive) {
                anyAlive = true;
                const wobble = reducedMotion ? 0 : Math.sin(clock * 7 + bubble.phase) * 0.7;
                dummy.position.set(bubble.x + wobble, bubble.y, bubble.z);
                dummy.scale.setScalar(bubble.size);
            } else {
                dummy.position.set(0, -9999, 0);
                dummy.scale.setScalar(0.0001);
            }
            dummy.updateMatrix();
            bubbles.setMatrixAt(i, dummy.matrix);
        }
        bubbles.instanceMatrix.needsUpdate = true;
        return anyAlive;
    }

    function backToRest() {
        state.power = false;
        state.selector = 'stabilization';
        state.bubbler = 'off';
        powerAngle = powerBase;
        if (powerKnob) powerKnob.rotation.z = powerBase;
        selectorAngle = 0;
        selectorPivot.rotation.z = 0;
        bar = 0;
        needle.rotation.z = barToAngle(0);
        lastReading = Number.NaN;
        fanSpeed = 0;
        ledGlow = 0;
        oilLevel = 0.78;
        chamberLevel = 0.72;
        air = 1;
        hoseFlow = 0;
        hoseMaterial.color.copy(HOSE_EMPTY);
        hoseMaterial.opacity = 0.5;
        bubbler.visible = false;
        swapTouch(nozzleTouch, bubblerTouch);
        root.position.copy(rootBase);
        guideTarget = null;
        guide.visible = false;
        sound.set(false, false);
        ledMaterials.forEach((material, index) => {
            material.color.copy(ledRest[index].color);
            material.emissive.copy(ledRest[index].emissive);
            material.emissiveIntensity = ledRest[index].intensity;
        });
    }

    function update(delta: number): boolean {
        if (!active) return false;
        clock += delta;
        let moving = false;

        const powerTarget = powerBase + (state.power ? POWER_ON_ANGLE : 0);
        if (powerKnob && Math.abs(powerAngle - powerTarget) > 0.002) {
            powerAngle = smooth(powerAngle, powerTarget, 0.05, delta);
            powerKnob.rotation.z = powerAngle;
            moving = true;
        }
        const selectorTarget = SELECTOR_ANGLE[state.selector];
        if (Math.abs(selectorAngle - selectorTarget) > 0.002) {
            selectorAngle = smooth(selectorAngle, selectorTarget, 0.08, delta);
            selectorPivot.rotation.z = selectorAngle;
            moving = true;
        }

        const { value, tau } = targetBar();
        const previousBar = bar;
        bar = smooth(bar, value, tau, delta);
        const pumping = state.power && state.selector !== 'stabilization';
        const jitter = pumping && !reducedMotion ? Math.sin(clock * 41) * 0.012 + Math.sin(clock * 23) * 0.01 : 0;
        needle.rotation.z = barToAngle(bar + jitter);
        if (Math.abs(bar - previousBar) > 0.0002 || jitter !== 0) moving = true;
        const reading = Math.round(bar * 14.5);
        if (reading !== lastReading) {
            lastReading = reading;
            options.onReading(bar);
        }

        const fanTarget = state.power ? 30 : 0;
        if (Math.abs(fanSpeed - fanTarget) > 0.02) {
            fanSpeed = smooth(fanSpeed, fanTarget, state.power ? 0.7 : 1.3, delta);
            moving = true;
        }
        if (cooler && fanSpeed > 0.02 && !reducedMotion) {
            cooler.rotation.z -= fanSpeed * delta;
            moving = true;
        }

        const ledTarget = state.power ? 1 : 0;
        if (Math.abs(ledGlow - ledTarget) > 0.004) {
            ledGlow = smooth(ledGlow, ledTarget, 0.14, delta);
            moving = true;
        }
        for (const material of ledMaterials) {
            material.color.setRGB(0.16 + ledGlow * 0.84, 0.02 + ledGlow * 0.05, 0.02 + ledGlow * 0.03);
            material.emissive.setRGB(1, 0.08, 0.04);
            material.emissiveIntensity = ledGlow * 1.5;
        }

        // Na pressão o óleo sai do reservatório, então o nível do visor desce devagar.
        const oilTarget = state.power && state.selector === 'pressure' ? 0.44 : 0.78;
        if (Math.abs(oilLevel - oilTarget) > 0.001) {
            oilLevel = smooth(oilLevel, oilTarget, 6, delta);
            moving = true;
        }
        const levelHeight = 150 * oilLevel;
        level.scale.y = levelHeight;
        level.position.y = 46 + levelHeight / 2;
        levelMaterial.emissiveIntensity = ledGlow * 1.25;
        levelMaterial.color.setRGB(0.48 + ledGlow * 0.52, 0.39 + ledGlow * 0.38, 0.09);
        windowMaterial.emissiveIntensity = ledGlow * 1.7;
        glowMaterial.opacity = ledGlow * 0.42;
        visorGlow.visible = ledGlow > 0.01;

        const flowTarget = state.power && state.selector === 'pressure' ? 1 : 0;
        if (Math.abs(hoseFlow - flowTarget) > 0.003) {
            hoseFlow = smooth(hoseFlow, flowTarget, 1.1, delta);
            hoseMaterial.color.lerpColors(HOSE_EMPTY, HOSE_OIL, hoseFlow);
            hoseMaterial.opacity = 0.5 + hoseFlow * 0.3;
            moving = true;
        }

        if (bubbler.visible) {
            if (bubblerShown < 1) {
                bubblerShown = Math.min(1, bubblerShown + delta / (reducedMotion ? 0.01 : 0.85));
                const eased = 1 - (1 - bubblerShown) ** 3;
                bubbler.position.y = BUBBLER_POSITION.y + BUBBLER_DROP * (1 - eased);
                moving = true;
                if (bubblerShown >= 1) {
                    sound.click();
                    swapTouch(bubblerTouch, nozzleTouch);
                }
            }
            const vacuum = state.power && state.selector === 'vacuum';
            // O ar acaba: as bolhas diminuem até quase parar, como no óleo já desaerado.
            if (vacuum) air = Math.max(0.1, air - delta / 15);
            const chamberTarget = state.power && state.selector === 'pressure' ? 0.34 : 0.72;
            if (Math.abs(chamberLevel - chamberTarget) > 0.001) {
                chamberLevel = smooth(chamberLevel, chamberTarget, 3.5, delta);
                moving = true;
            }
            const oilHeight = TUBE_HEIGHT * chamberLevel;
            oil.scale.y = oilHeight;
            oil.position.y = TUBE_BOTTOM + oilHeight / 2;
            if (updateBubbles(delta, vacuum ? air * 10 : 0) || vacuum) moving = true;
        }

        // A máquina treme de leve com a bomba em ação.
        const shake = pumping && !reducedMotion ? 0.16 : 0;
        root.position.x = rootBase.x + Math.sin(clock * 67) * shake * 0.001;
        root.position.y = rootBase.y + Math.sin(clock * 53) * shake * 0.001;

        // Anel que o tutorial acende na peça do passo atual.
        const guideOn = guideTarget === 'power' ? powerTouch : guideTarget === 'selector' ? selectorTouch : guideTarget === 'bubbler' ? nozzleTouch : null;
        guide.visible = !!guideOn;
        if (guideOn) {
            guide.position.set(guideOn.position.x, guideOn.position.y, guideOn.position.z + 12);
            const beat = reducedMotion ? 0.5 : (clock * 1.15) % 1;
            const size = guideOn === selectorTouch ? 64 + beat * 34 : 44 + beat * 30;
            guide.scale.set(size, size, 1);
            guide.material.opacity = reducedMotion ? 0.9 : 1 - beat;
            moving = true;
        }

        if (moving) settled = false;
        else if (!settled) {
            settled = true;
            return true;
        }
        return moving;
    }

    return {
        targets,
        getState: () => ({ ...state }),
        setPower,
        setSelector,
        setBubbler,
        setSound(on) {
            state.sound = on;
            sound.setEnabled(on);
            emit();
        },
        setAudible: (audible) => sound.setAudible(audible),
        setActive(on) {
            if (active === on) return;
            active = on;
            visorWindow.visible = on;
            level.visible = on;
            visorGlow.visible = false;
            settled = false;
            if (on) {
                loadDial();
                sound.setAudible(true);
            } else {
                backToRest();
                sound.setAudible(false);
                emit();
            }
        },
        setGuide(target) {
            guideTarget = target;
        },
        pick(raycaster) {
            const hit = raycaster.intersectObjects(targets, false)[0];
            if (!hit) return false;
            if (hit.object === powerTouch) setPower(!state.power);
            else if (hit.object === selectorTouch) setSelector(SELECTOR_ORDER[(SELECTOR_ORDER.indexOf(state.selector) + 1) % SELECTOR_ORDER.length]);
            else if (hit.object === nozzleTouch) setBubbler(true);
            else if (hit.object === bubblerTouch) setBubbler(false);
            return true;
        },
        update,
        dispose() {
            sound.dispose();
            dialTexture?.dispose();
            guideTexture.dispose();
            glowTexture.dispose();
            guide.material.dispose();
            touchMaterial.dispose();
        },
    };
}
