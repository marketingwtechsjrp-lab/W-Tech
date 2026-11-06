import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Realidade aumentada dentro do navegador, para o Android que não abre o app do Google.
 *
 * Três regras para a máquina nunca "fugir" em celular com rastreamento fraco:
 *  - ela só aparece depois que o celular achou o chão e a pessoa tocou na tela;
 *  - fica presa a uma âncora do ARCore, que acompanha as correções do mapa do ambiente;
 *  - se a câmera perde a referência, ela some e a tela avisa, em vez de sair andando.
 * Sem suavização de posição: qualquer movimento aqui pareceria a máquina se mexendo sozinha.
 */

export type ArStage = 'searching' | 'ready' | 'placed' | 'lost';

export function arStageOf(state: { tracking: boolean; placed: boolean; surface: boolean }): ArStage {
    if (!state.tracking) return 'lost';
    if (state.placed) return 'placed';
    return state.surface ? 'ready' : 'searching';
}

export interface VacuumArSession {
    /** Tira a máquina do lugar para a pessoa escolher outro ponto. */
    replace: () => void;
    end: () => void;
}

export interface PreparedVacuumAr {
    /** Precisa ser chamada direto do toque no botão: o navegador exige o gesto. */
    start: (overlay: HTMLElement, onStage: (stage: ArStage) => void, onEnd: () => void) => Promise<VacuumArSession>;
}

function makeReticle(): THREE.Mesh {
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.11, 0.14, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false })
    );
    ring.matrixAutoUpdate = false;
    ring.visible = false;
    return ring;
}

/** Sombra de contato barata: uma imagem só, sem cálculo de sombra a cada quadro. */
function makeContactShadow(size: THREE.Vector3): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    const gradient = context.createRadialGradient(64, 64, 18, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0,0,0,.55)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(size.x * 1.7, size.z * 1.7).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
    );
    shadow.position.y = 0.002;
    return shadow;
}

/** Baixa o modelo antes do toque, para o clique abrir a câmera na hora. */
export async function prepareVacuumAr(glbUrl: string): Promise<PreparedVacuumAr> {
    const gltf = await new GLTFLoader().loadAsync(glbUrl);
    const machine = gltf.scene;
    const box = new THREE.Box3().setFromObject(machine);
    const center = box.getCenter(new THREE.Vector3());
    // Os pés da máquina no ponto tocado, centrada nele.
    machine.position.set(-center.x, -box.min.y, -center.z);
    const size = box.getSize(new THREE.Vector3());

    const start: PreparedVacuumAr['start'] = async (overlay, onStage, onEnd) => {
        const session = await (navigator as Navigator & { xr: XRSystem }).xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['anchors', 'dom-overlay'],
            domOverlay: { root: overlay },
        });

        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        renderer.setPixelRatio(1);
        renderer.xr.enabled = true;
        // Celular fraco: um pouco menos de resolução vale mais que câmera travando.
        renderer.xr.setFramebufferScaleFactor(0.8);
        renderer.xr.setReferenceSpaceType('local');
        renderer.domElement.style.display = 'none';
        document.body.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
        scene.environment = environment.texture;
        pmrem.dispose();

        const reticle = makeReticle();
        const placedRoot = new THREE.Group();
        placedRoot.visible = false;
        placedRoot.add(machine, makeContactShadow(size));
        scene.add(reticle, placedRoot);

        await renderer.xr.setSession(session);
        const localSpace = renderer.xr.getReferenceSpace() as XRReferenceSpace;
        const viewerSpace = await session.requestReferenceSpace('viewer');
        const hitSource = await (session.requestHitTestSource as NonNullable<XRSession['requestHitTestSource']>)({ space: viewerSpace });
        if (!hitSource) throw new Error('hit-test indisponível');

        let lastHit: XRHitTestResult | null = null;
        let anchor: XRAnchor | null = null;
        let placed = false;
        let tracking = true;
        let placeToken = 0;
        let stage: ArStage | null = null;
        const viewerPosition = new THREE.Vector3();

        const setMachinePosition = (x: number, y: number, z: number) => {
            placedRoot.position.set(x, y, z);
            // De frente para quem colocou, sempre em pé, mesmo se o piso estiver mal medido.
            placedRoot.rotation.set(0, Math.atan2(viewerPosition.x - x, viewerPosition.z - z), 0);
        };

        const onSelect = () => {
            if (placed || !tracking || !lastHit) return;
            const hit = lastHit;
            const pose = hit.getPose(localSpace);
            if (!pose) return;
            const { x, y, z } = pose.transform.position;
            setMachinePosition(x, y, z);
            placed = true;
            const token = ++placeToken;
            // Sem âncora, a máquina fica no ponto medido; com ela, acompanha as correções do mapa.
            hit.createAnchor?.()
                ?.then((created) => {
                    if (token === placeToken) anchor = created;
                    else created.delete();
                })
                .catch(() => undefined);
        };
        session.addEventListener('select', onSelect);

        const onFrame = (_time: number, frame?: XRFrame) => {
            if (!frame) return;
            const viewerPose = frame.getViewerPose(localSpace);
            tracking = !!viewerPose && !viewerPose.emulatedPosition;
            if (viewerPose) viewerPosition.set(viewerPose.transform.position.x, viewerPose.transform.position.y, viewerPose.transform.position.z);

            const hits = tracking && !placed ? frame.getHitTestResults(hitSource) : [];
            lastHit = hits[0] ?? null;
            const hitPose = lastHit?.getPose(localSpace);
            reticle.visible = !placed && !!hitPose;
            if (hitPose) reticle.matrix.fromArray(hitPose.transform.matrix);

            if (placed && anchor && tracking && frame.trackedAnchors?.has(anchor)) {
                const anchorPose = frame.getPose(anchor.anchorSpace, localSpace);
                if (anchorPose) placedRoot.position.set(anchorPose.transform.position.x, anchorPose.transform.position.y, anchorPose.transform.position.z);
            }
            placedRoot.visible = placed && tracking;

            const next = arStageOf({ tracking, placed, surface: !!hitPose });
            if (next !== stage) {
                stage = next;
                onStage(next);
            }
            renderer.render(scene, camera);
        };
        renderer.setAnimationLoop(onFrame);

        session.addEventListener('end', () => {
            renderer.setAnimationLoop(null);
            session.removeEventListener('select', onSelect);
            hitSource.cancel();
            anchor?.delete();
            placedRoot.remove(machine);
            environment.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            onEnd();
        }, { once: true });

        return {
            replace: () => {
                placeToken += 1;
                anchor?.delete();
                anchor = null;
                placed = false;
            },
            end: () => { void session.end().catch(() => undefined); },
        };
    };
    return { start };
}
