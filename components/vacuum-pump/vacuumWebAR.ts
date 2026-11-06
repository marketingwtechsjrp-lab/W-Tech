import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { arStageOf, estimatedSpot, isUpFacing, type ArPlacement, type ArStage } from './vacuumArPlacement';

/**
 * Realidade aumentada dentro do navegador, para o Android que não abre o app do Google.
 *
 * Regras para celular com rastreamento fraco:
 *  - a máquina sempre aparece: sem superfície em 2 s, ela surge em frente à câmera;
 *  - ao achar uma superfície virada para cima, ela assenta ali uma vez, sem pedir toque, e fica presa
 *    a uma âncora do ARCore, que acompanha as correções do mapa do ambiente;
 *  - se a câmera perde a referência, ela some e a tela avisa, em vez de sair andando.
 * Sem suavização de posição: qualquer movimento aqui pareceria a máquina se mexendo sozinha.
 */

/** Tempo procurando superfície antes de mostrar a máquina assim mesmo. */
const SURFACE_WAIT_MS = 2000;
/** Raio abaixo do centro da tela: com o celular quase em pé, ele ainda alcança o chão. Igual ao model-viewer. */
const HIT_RAY_TILT = (20 * Math.PI) / 180;

/** Só o necessário para saber, sem o aparelho na mão, onde a câmera parou. */
export type ArReport = (event: 'opened' | 'placed' | 'end' | 'error', detail: string) => void;

export interface VacuumArSession {
    /** Tira a máquina do lugar para a pessoa escolher outro ponto. */
    replace: () => void;
    end: () => void;
}

export interface PreparedVacuumAr {
    /** Precisa ser chamada direto do toque no botão: o navegador exige o gesto. */
    start: (overlay: HTMLElement, onStage: (stage: ArStage) => void, onEnd: () => void, report: ArReport) => Promise<VacuumArSession>;
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

    const start: PreparedVacuumAr['start'] = async (overlay, onStage, onEnd, report) => {
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
        const hitSource = await session.requestHitTestSource?.({
            space: viewerSpace,
            offsetRay: new XRRay(new DOMPoint(0, 0, 0), { x: 0, y: -Math.sin(HIT_RAY_TILT), z: -Math.cos(HIT_RAY_TILT) }),
        });
        if (!hitSource) throw new Error('hit-test indisponível');
        report('opened', (session.enabledFeatures ?? []).join('+'));

        let placement: ArPlacement = 'none';
        /** Depois de "Mudar de lugar", quem escolhe o ponto é o toque na tela. */
        let choosing = false;
        let tapPending = false;
        let anchor: XRAnchor | null = null;
        let tracking = false;
        let everTracked = false;
        let waitingSince = 0;
        let lastFrameAt = 0;
        let placeToken = 0;
        let stage: ArStage | null = null;
        let frames = 0;
        let trackedFrames = 0;
        let surfaceFrames = 0;
        let firstFrameAt = 0;
        let errorReported = false;
        const reportedPlacements = new Set<ArPlacement>();
        const viewerPosition = new THREE.Vector3();

        const setMachinePosition = (x: number, y: number, z: number) => {
            placedRoot.position.set(x, y, z);
            // De frente para quem colocou, sempre em pé, mesmo se o piso estiver mal medido.
            placedRoot.rotation.set(0, Math.atan2(viewerPosition.x - x, viewerPosition.z - z), 0);
        };

        /** Sem âncora, a máquina fica no ponto medido; com ela, acompanha as correções do mapa. */
        const holdWith = (created: Promise<XRAnchor> | undefined) => {
            const token = ++placeToken;
            anchor?.delete();
            anchor = null;
            created
                ?.then((value) => {
                    if (token === placeToken) anchor = value;
                    else value.delete();
                })
                .catch(() => undefined);
        };

        const markPlaced = (kind: ArPlacement, time: number) => {
            placement = kind;
            choosing = false;
            if (reportedPlacements.has(kind)) return;
            reportedPlacements.add(kind);
            report('placed', `${kind} ${Math.round(time - firstFrameAt)}ms`);
        };

        // Só marca: a posição do toque precisa vir do quadro atual, com a medição ainda válida.
        const onSelect = () => { tapPending = true; };
        session.addEventListener('select', onSelect);

        const drawFrame = (time: number, frame: XRFrame) => {
            frames += 1;
            if (!firstFrameAt) firstFrameAt = time;
            lastFrameAt = time;
            const viewerPose = frame.getViewerPose(localSpace);
            tracking = !!viewerPose && !viewerPose.emulatedPosition;
            if (viewerPose) viewerPosition.set(viewerPose.transform.position.x, viewerPose.transform.position.y, viewerPose.transform.position.z);
            if (tracking) {
                trackedFrames += 1;
                if (!everTracked) waitingSince = time;
                everTracked = true;
            }

            let surfaceHit: XRHitTestResult | null = null;
            let surfacePose: XRPose | null = null;
            if (tracking && placement !== 'surface') {
                for (const hit of frame.getHitTestResults(hitSource)) {
                    const pose = hit.getPose(localSpace);
                    if (pose && isUpFacing(pose.transform.matrix)) {
                        surfaceHit = hit;
                        surfacePose = pose;
                        break;
                    }
                }
            }
            if (surfacePose) {
                surfaceFrames += 1;
                waitingSince = time;
            }

            if (surfaceHit && surfacePose && (!choosing || tapPending)) {
                const { x, y, z } = surfacePose.transform.position;
                setMachinePosition(x, y, z);
                markPlaced('surface', time);
                holdWith(surfaceHit.createAnchor?.());
            } else if (viewerPose && tracking && placement === 'none' && time - waitingSince >= SURFACE_WAIT_MS) {
                const spot = estimatedSpot(viewerPose.transform.matrix, size.y);
                setMachinePosition(spot.x, spot.y, spot.z);
                markPlaced('estimated', time);
                holdWith(frame.createAnchor?.(new XRRigidTransform(spot), localSpace));
            }
            tapPending = false;

            reticle.visible = choosing && !!surfacePose;
            if (surfacePose) reticle.matrix.fromArray(surfacePose.transform.matrix);

            if (placement !== 'none' && anchor && tracking && frame.trackedAnchors?.has(anchor)) {
                const anchorPose = frame.getPose(anchor.anchorSpace, localSpace);
                if (anchorPose) placedRoot.position.set(anchorPose.transform.position.x, anchorPose.transform.position.y, anchorPose.transform.position.z);
            }
            placedRoot.visible = placement !== 'none' && tracking;

            const next = arStageOf({ tracking, everTracked, placement, surface: !!surfacePose });
            if (next !== stage) {
                stage = next;
                onStage(next);
            }
            renderer.render(scene, camera);
        };

        const onFrame = (time: number, frame?: XRFrame) => {
            if (!frame) return;
            // Um erro aqui pararia a câmera em silêncio: o laço do three não se refaz depois de uma exceção.
            try {
                drawFrame(time, frame);
            } catch (err) {
                if (!errorReported) report('error', err instanceof Error ? err.message.slice(0, 120) : 'erro no quadro');
                errorReported = true;
            }
        };
        renderer.setAnimationLoop(onFrame);

        session.addEventListener('end', () => {
            report('end', `quadros=${frames} rastreados=${trackedFrames} superficie=${surfaceFrames} posicao=${placement} ${Math.round((lastFrameAt - firstFrameAt) / 1000)}s`);
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
                holdWith(undefined);
                placement = 'none';
                choosing = true;
                tapPending = false;
                waitingSince = lastFrameAt;
            },
            end: () => { void session.end().catch(() => undefined); },
        };
    };
    return { start };
}
