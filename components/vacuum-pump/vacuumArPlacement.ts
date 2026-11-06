/**
 * Decisões de posição da realidade aumentada pelo navegador, sem depender do three:
 * a página pode importar daqui sem baixar a biblioteca 3D.
 */

export type ArStage = 'searching' | 'estimated' | 'ready' | 'placed' | 'lost';
export type ArPlacement = 'none' | 'estimated' | 'surface';

/** Perto o bastante para a máquina caber inteira na tela, sem ninguém precisar andar. */
const ESTIMATED_DISTANCE_M = 1;
/** Os pés sempre abaixo da câmera: com o celular em pé, a máquina não fica flutuando na altura dos olhos. */
const ESTIMATED_MIN_DROP_M = 0.35;
/** Só conta superfície virada para cima, para a máquina não ser posta numa parede. Mesmo limite do model-viewer. */
const MIN_FLOOR_NORMAL_Y = 0.75;

export function arStageOf(state: { tracking: boolean; everTracked: boolean; placement: ArPlacement; surface: boolean }): ArStage {
    // Antes da primeira referência a câmera ainda está começando: nada foi perdido.
    if (!state.tracking) return state.everTracked ? 'lost' : 'searching';
    if (state.placement === 'surface') return 'placed';
    if (state.placement === 'estimated') return 'estimated';
    return state.surface ? 'ready' : 'searching';
}

/** Matrizes do WebXR guardam as colunas em sequência: 4, 5 e 6 são o eixo Y da superfície. */
export function isUpFacing(matrix: ArrayLike<number>): boolean {
    return matrix[5] > MIN_FLOOR_NORMAL_Y;
}

/** Ponto para os pés da máquina, com o corpo dela no meio da tela, enquanto o celular não acha superfície. */
export function estimatedSpot(viewerMatrix: ArrayLike<number>, machineHeight: number): { x: number; y: number; z: number } {
    const m = viewerMatrix;
    // A câmera olha para o lado negativo do próprio eixo Z (coluna 8, 9 e 10).
    const centerY = m[13] - m[9] * ESTIMATED_DISTANCE_M;
    return {
        x: m[12] - m[8] * ESTIMATED_DISTANCE_M,
        y: Math.min(centerY - machineHeight / 2, m[13] - ESTIMATED_MIN_DROP_M),
        z: m[14] - m[10] * ESTIMATED_DISTANCE_M,
    };
}
