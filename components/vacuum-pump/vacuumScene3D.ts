import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Cena 3D da Vacuum Pump, sem React: só é baixada quando a pessoa chega perto do bloco.
 * Coordenadas em milímetros, como no projeto da máquina; o painel frontal olha para +Z.
 */

export type Vec3 = [number, number, number];

export interface VacuumView {
    /** Graus em torno da máquina: 0 é de frente, 90 é pelo lado direito do painel. */
    azimuth: number;
    /** Graus a partir do topo: 90 é na altura da máquina. */
    polar: number;
    /** Metros, em tela paisagem. */
    distance: number;
    target: Vec3;
}

export interface VacuumHotspot {
    id: string;
    /** Ponto na borda da peça, onde o fio encosta. */
    position: Vec3;
    /** Onde fica o número: ao lado da peça, para não cobrir o que a pessoa quer ver. */
    label: Vec3;
    normal: Vec3;
    inside: boolean;
}

export interface VacuumSceneOptions {
    canvas: HTMLCanvasElement;
    modelUrl: string;
    overview: VacuumView;
    hotspots: VacuumHotspot[];
    markerFor: (id: string) => HTMLElement | null;
    onProgress?: (fraction: number) => void;
    onReady?: () => void;
    onError?: (reason: string) => void;
    onUserInteract?: () => void;
}

export interface VacuumScene {
    focus: (view: VacuumView, partIds: string[]) => void;
    setOpen: (open: boolean) => void;
    /** Para de desenhar enquanto outra tela cobre a cena, sem perder o modelo carregado. */
    setPaused: (paused: boolean) => void;
    renderNow: () => void;
    dispose: () => void;
}

const MM = 0.001;
const MARKER_RADIUS = 15;
const MARKER_MARGIN = 20;
const COVER_LIFT = 150;
const COVER_MS = 1000;
const CAMERA_MS = 1100;
const IDLE_MS = 7000;
const SWAY_RAD = 0.5;
const SWAY_SPEED = 0.32;
const SLOW_FRAME_MS = 50;
/** Tamanho descomprimido do modelo: o gzip tira o content-length da resposta. */
const MODEL_BYTES = 1_810_000;
const HIGHLIGHT = new THREE.Color('#ff1d10');

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const toVector = (v: Vec3, scale = MM) => new THREE.Vector3(v[0] * scale, v[1] * scale, v[2] * scale);

function floorTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const shadow = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
        shadow.addColorStop(0, 'rgba(20,20,24,.42)');
        shadow.addColorStop(0.5, 'rgba(20,20,24,.2)');
        shadow.addColorStop(1, 'rgba(20,20,24,0)');
        ctx.fillStyle = shadow;
        ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

type StdMaterial = THREE.MeshStandardMaterial;
const materialsOf = (mesh: THREE.Mesh): StdMaterial[] => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as StdMaterial[];

function tint(model: THREE.Object3D, part: string, color: string, opacity: number) {
    model.getObjectByName(part)?.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const material of materialsOf(mesh)) {
            material.color.set(color);
            material.opacity = opacity;
            material.transparent = true;
            material.depthWrite = false;
        }
    });
}

export function createVacuumScene(options: VacuumSceneOptions): VacuumScene {
    const { canvas, overview, hotspots, markerFor } = options;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutro: o preto do painel e o vermelho W-Tech não podem lavar nem puxar para o salmão.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();

    // A máquina é preta: é a luz recortada de cima e dos lados que desenha o volume do gabinete.
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(0.6, 1.1, 1.1);
    const left = new THREE.DirectionalLight(0xffffff, 0.9);
    left.position.set(-1.1, 0.6, 0.4);
    const back = new THREE.DirectionalLight(0xffffff, 0.9);
    back.position.set(0.5, 0.8, -1.1);
    scene.add(key, left, back);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 12);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    // Sem zoom na roda: o bloco fica no meio da página e não pode prender a rolagem.
    controls.enableZoom = false;
    controls.minPolarAngle = THREE.MathUtils.degToRad(12);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(97);
    // Vertical rola a página; horizontal gira a máquina.
    canvas.style.touchAction = 'pan-y';

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(0.56, 0.56),
        new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false, toneMapped: false })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.0135;
    scene.add(floor);

    const distanceScale = () => Math.max(1, 1.02 / Math.max(camera.aspect, 0.01));

    function placeCamera(view: VacuumView) {
        controls.target.copy(toVector(view.target));
        camera.position.copy(controls.target).add(offsetFor(view));
    }

    function offsetFor(view: VacuumView): THREE.Vector3 {
        const spherical = new THREE.Spherical(
            view.distance * distanceScale(),
            THREE.MathUtils.degToRad(view.polar),
            THREE.MathUtils.degToRad(view.azimuth)
        );
        return new THREE.Vector3().setFromSpherical(spherical);
    }

    let model: THREE.Object3D | null = null;
    let cover: THREE.Object3D | null = null;
    let coverMaterials: StdMaterial[] = [];
    let coverRestY = 0;
    let disposed = false;
    let inView = true;
    let paused = false;
    let raf = 0;
    let dirty = true;
    let lastTime = 0;

    let openTarget = 0;
    let openFrom = 0;
    let openStart = -1;
    let openValue = 0;

    let cameraTween: { start: number; fromSpherical: THREE.Spherical; toSpherical: THREE.Spherical; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null = null;

    let lastInteraction = performance.now();
    let swayTime = 0;
    let swayBase: THREE.Spherical | null = null;
    let userFocused = false;
    let slowFrames = 0;
    let lowQuality = false;

    let highlighted: StdMaterial[] = [];
    let highlightStart = 0;

    function applyOpen(value: number) {
        openValue = value;
        if (!cover) return;
        const eased = easeInOut(value);
        cover.position.y = coverRestY + COVER_LIFT * MM * eased;
        const opacity = 1 - clamp01((value - 0.2) / 0.7);
        cover.visible = opacity > 0.001;
        for (const material of coverMaterials) {
            const fading = opacity < 1;
            if (material.transparent !== fading) {
                material.transparent = fading;
                material.needsUpdate = true;
            }
            material.opacity = opacity;
            material.depthWrite = !fading;
        }
    }

    function updateMarkers() {
        const center = toVector([0, 150, 0]);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const toCamera = new THREE.Vector3();
        const projected = new THREE.Vector3();
        for (const spot of hotspots) {
            const marker = markerFor(spot.id);
            if (!marker) continue;
            const position = toVector(spot.position);
            toCamera.copy(camera.position).sub(position).normalize();
            const facing = toCamera.dot(new THREE.Vector3(...spot.normal).normalize());
            // Peça de dentro só aparece com a tampa aberta, e a de fora só do lado em que está.
            const insideOk = !spot.inside || openValue > 0.6;
            const towardCamera = toCamera.dot(position.clone().sub(center).normalize()) > -0.5;
            const visible = insideOk && facing > (spot.inside ? -0.35 : 0.3) && (!spot.inside || towardCamera);
            projected.copy(position).project(camera);
            const onScreen = Math.abs(projected.x) < 0.98 && Math.abs(projected.y) < 0.98;
            if (visible && onScreen) {
                const partX = ((projected.x + 1) / 2) * width;
                const partY = ((1 - projected.y) / 2) * height;
                projected.copy(toVector(spot.label)).project(camera);
                // O número não sai do quadro, nem quando a câmera chega perto da peça.
                const x = Math.min(width - MARKER_MARGIN, Math.max(MARKER_MARGIN, ((projected.x + 1) / 2) * width));
                const y = Math.min(height - MARKER_MARGIN, Math.max(MARKER_MARGIN, ((1 - projected.y) / 2) * height));
                marker.dataset.show = '';
                marker.style.pointerEvents = 'auto';
                marker.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
                const leader = marker.querySelector<HTMLElement>('.vp-3d-leader');
                if (leader) {
                    const dx = partX - x;
                    const dy = partY - y;
                    leader.style.width = `${Math.max(0, Math.hypot(dx, dy) - MARKER_RADIUS).toFixed(1)}px`;
                    leader.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad) translateX(${MARKER_RADIUS}px)`;
                }
            } else {
                delete marker.dataset.show;
                marker.style.pointerEvents = 'none';
            }
        }
    }

    function renderNow() {
        renderer.render(scene, camera);
        updateMarkers();
    }

    function stopSway() {
        swayBase = null;
        swayTime = 0;
    }

    function step(time: number) {
        raf = 0;
        if (disposed || paused || !inView || document.hidden) return;
        const delta = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
        const frameMs = lastTime ? time - lastTime : 0;
        lastTime = time;
        let animating = false;

        if (openStart >= 0) {
            const t = clamp01((time - openStart) / COVER_MS);
            applyOpen(openFrom + (openTarget - openFrom) * t);
            if (t >= 1) openStart = -1;
            animating = true;
        }

        if (cameraTween) {
            const t = clamp01((time - cameraTween.start) / CAMERA_MS);
            const eased = easeInOut(t);
            const { fromSpherical: a, toSpherical: b } = cameraTween;
            const spherical = new THREE.Spherical(
                THREE.MathUtils.lerp(a.radius, b.radius, eased),
                THREE.MathUtils.lerp(a.phi, b.phi, eased),
                THREE.MathUtils.lerp(a.theta, b.theta, eased)
            );
            controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
            camera.position.setFromSpherical(spherical).add(controls.target);
            if (t >= 1) cameraTween = null;
            animating = true;
        } else if (!reducedMotion && !userFocused && model && time - lastInteraction > IDLE_MS && !lowQuality) {
            // Parada, a máquina balança de leve em vez de dar a volta: o painel é o que vende.
            if (!swayBase) {
                swayBase = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
                swayTime = 0;
            }
            swayTime += delta;
            const spherical = swayBase.clone();
            spherical.theta += Math.sin(swayTime * SWAY_SPEED) * SWAY_RAD;
            camera.position.setFromSpherical(spherical).add(controls.target);
            animating = true;
            if (frameMs > SLOW_FRAME_MS) slowFrames += 1;
            if (slowFrames > 45) {
                lowQuality = true;
                renderer.setPixelRatio(1);
                resize();
            }
        }

        if (highlighted.length) {
            const elapsed = (time - highlightStart) / 1000;
            const pulse = elapsed < 2.4 ? 0.34 + 0.26 * Math.sin(elapsed * 5) : 0.22;
            for (const material of highlighted) material.emissiveIntensity = pulse;
            if (elapsed < 2.5) animating = true;
        }

        const moved = controls.update(delta);
        if (animating || moved || dirty) {
            dirty = false;
            renderNow();
        }
        raf = requestAnimationFrame(step);
    }

    function wake() {
        dirty = true;
        lastTime = 0;
        if (!raf && !disposed) raf = requestAnimationFrame(step);
    }

    function resize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;
        const scaleBefore = distanceScale();
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const offset = camera.position.clone().sub(controls.target);
        camera.position.copy(controls.target).add(offset.multiplyScalar(distanceScale() / scaleBefore));
        stopSway();
        wake();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const viewObserver = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) wake();
    });
    viewObserver.observe(canvas);

    const onVisibility = () => {
        if (!document.hidden) wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onControlsStart = () => {
        cameraTween = null;
        stopSway();
        lastInteraction = performance.now();
        options.onUserInteract?.();
    };
    const onControlsChange = () => {
        dirty = true;
    };
    const onControlsEnd = () => {
        lastInteraction = performance.now();
    };
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', onControlsChange);
    controls.addEventListener('end', onControlsEnd);

    const onContextLost = (event: Event) => {
        event.preventDefault();
        options.onError?.('context_lost');
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    camera.aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1) || 1;
    placeCamera(overview);
    resize();

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
        options.modelUrl,
        (gltf) => {
            if (disposed) return;
            model = gltf.scene;
            model.traverse((object) => {
                const mesh = object as THREE.Mesh;
                if (!mesh.isMesh) return;
                // Cada peça com o próprio material: o destaque e o sumiço da tampa não vazam para as outras.
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
            });
            // A conexão de latão atrás do seletor fica fora da demonstração.
            model.traverse((object) => {
                if (object.name.startsWith('tres_vias')) object.visible = false;
            });
            tint(model, 'pulmao', '#dfe6ea', 0.2);
            tint(model, 'oleo', '#c8891c', 0.55);
            cover = model.getObjectByName('cobertura') ?? null;
            if (cover) {
                coverRestY = cover.position.y;
                cover.traverse((object) => {
                    const mesh = object as THREE.Mesh;
                    if (mesh.isMesh) coverMaterials.push(...materialsOf(mesh));
                });
            }
            scene.add(model);
            options.onProgress?.(1);
            wake();
            options.onReady?.();
        },
        (event) => {
            options.onProgress?.(Math.min(0.97, event.loaded / (event.total || MODEL_BYTES)));
        },
        () => {
            if (!disposed) options.onError?.('load_failed');
        }
    );

    function clearHighlight() {
        for (const material of highlighted) {
            material.emissive.setRGB(0, 0, 0);
            material.emissiveIntensity = 1;
        }
        highlighted = [];
    }

    function highlight(partIds: string[]) {
        clearHighlight();
        if (!model || !partIds.length) return;
        const pattern = new RegExp(`^(${partIds.join('|')})(_\\d+)?$`);
        model.traverse((object) => {
            const mesh = object as THREE.Mesh;
            // O GLTFLoader pode criar um filho por primitivo; o nome da peça fica no pai.
            const name = mesh.name && pattern.test(mesh.name) ? mesh.name : mesh.parent?.name ?? '';
            if (!mesh.isMesh || !pattern.test(name)) return;
            for (const material of materialsOf(mesh)) {
                // Mostrador e adesivo têm texto: o destaque não pode tingir o que a pessoa quer ler.
                if (material.map) continue;
                material.emissive.copy(HIGHLIGHT);
                highlighted.push(material);
            }
        });
        highlightStart = performance.now();
    }

    return {
        focus(view, partIds) {
            stopSway();
            userFocused = partIds.length > 0;
            lastInteraction = performance.now();
            highlight(partIds);
            const toTarget = toVector(view.target);
            const toSpherical = new THREE.Spherical().setFromVector3(offsetFor(view));
            if (reducedMotion) {
                placeCamera(view);
                wake();
                return;
            }
            const fromSpherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
            // Pelo caminho mais curto em volta da máquina
            let theta = toSpherical.theta;
            while (theta - fromSpherical.theta > Math.PI) theta -= Math.PI * 2;
            while (theta - fromSpherical.theta < -Math.PI) theta += Math.PI * 2;
            toSpherical.theta = theta;
            cameraTween = { start: performance.now(), fromSpherical, toSpherical, fromTarget: controls.target.clone(), toTarget };
            wake();
        },
        setOpen(open) {
            const target = open ? 1 : 0;
            if (target === openTarget && openStart < 0) return;
            openTarget = target;
            if (reducedMotion) {
                applyOpen(target);
                wake();
                return;
            }
            openFrom = openValue;
            openStart = performance.now();
            wake();
        },
        setPaused(value) {
            if (paused === value) return;
            paused = value;
            if (!paused) wake();
        },
        renderNow,
        dispose() {
            disposed = true;
            if (raf) cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            viewObserver.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            canvas.removeEventListener('webglcontextlost', onContextLost);
            controls.removeEventListener('start', onControlsStart);
            controls.removeEventListener('change', onControlsChange);
            controls.removeEventListener('end', onControlsEnd);
            controls.dispose();
            scene.traverse((object) => {
                const mesh = object as THREE.Mesh;
                if (!mesh.isMesh) return;
                mesh.geometry.dispose();
                for (const material of materialsOf(mesh)) {
                    material.map?.dispose();
                    material.dispose();
                }
            });
            environment.dispose();
            renderer.dispose();
        },
    };
}
