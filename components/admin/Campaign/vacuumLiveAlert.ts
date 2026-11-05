/**
 * Comemoração de cada venda no painel ao vivo: som sintetizado, sem arquivo para baixar,
 * e confete em canvas. O navegador só libera áudio depois de um clique na página.
 */

/** Caixa registradora seguida de uma fanfarra. A meta batida ganha uma fanfarra maior. */
export function scheduleSaleSound(ctx: BaseAudioContext, big: boolean) {
    const now = ctx.currentTime + 0.02;
    const tone = (destination: AudioNode, type: OscillatorType, frequency: number, start: number, length: number, volume: number) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        osc.connect(gain).connect(destination);
        osc.start(start);
        osc.stop(start + length + 0.05);
    };
    const compressor = ctx.createDynamicsCompressor();
    const master = ctx.createGain();
    // Forte o bastante para a sala ouvir, sem estourar: o compressor segura os picos.
    master.gain.value = 1.6;
    compressor.connect(master).connect(ctx.destination);

    // "Tchin": dois sinos metálicos sobre um ruído curto.
    const length = Math.floor(ctx.sampleRate * 0.07);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 3200;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.28;
    noise.connect(highpass).connect(noiseGain).connect(compressor);
    noise.start(now);
    for (const [frequency, delay] of [[2637, 0], [3951, 0.012], [2637, 0.14], [3951, 0.152], [5274, 0.165]] as const) {
        tone(compressor, 'sine', frequency, now + delay, 0.62, 0.17);
    }

    // Fanfarra de metais.
    const brass = ctx.createBiquadFilter();
    brass.type = 'lowpass';
    brass.frequency.value = 2600;
    brass.connect(compressor);
    const notes = big ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51] : [523.25, 659.25, 783.99];
    let at = now + 0.42;
    for (const frequency of notes) {
        tone(brass, 'sawtooth', frequency, at, 0.22, 0.2);
        at += 0.13;
    }
    for (const frequency of [523.25, 659.25, 783.99, 1046.5]) {
        tone(brass, 'sawtooth', frequency, at, big ? 1.7 : 1.05, 0.14);
    }
}

export class SaleSound {
    private ctx: AudioContext | null = null;
    private unlocked = false;

    /** Precisa partir de um clique: é o que o navegador exige para liberar o áudio. */
    unlock() {
        if (!this.ctx) {
            const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return;
            this.ctx = new Ctor();
        }
        this.unlocked = true;
        void this.ctx.resume().catch(() => undefined);
    }

    play(big = false) {
        // Sem clique o contexto fica parado e os sons se acumulariam para tocar todos juntos depois.
        if (!this.ctx || !this.unlocked) return;
        void this.ctx.resume().catch(() => undefined);
        scheduleSaleSound(this.ctx, big);
    }

    dispose() {
        void this.ctx?.close();
        this.ctx = null;
    }
}

interface Piece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    spin: number;
    angle: number;
}

const COLORS = ['#ff1a10', '#ffffff', '#ffc53d', '#25d07d', '#e60000'];

/** Dispara o confete a partir dos dois lados da tela. Devolve a função que para a animação. */
export function launchConfetti(canvas: HTMLCanvasElement, duration = 4200, amount = 220): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
        canvas.width = canvas.clientWidth * scale;
        canvas.height = canvas.clientHeight * scale;
    };
    resize();
    const width = () => canvas.width;
    const height = () => canvas.height;
    const pieces: Piece[] = Array.from({ length: amount }, (_, index) => {
        const fromLeft = index % 2 === 0;
        const speed = (7 + Math.random() * 13) * scale;
        const angle = -Math.PI * (fromLeft ? 0.2 + Math.random() * 0.25 : 0.55 + Math.random() * 0.25);
        return {
            x: fromLeft ? 0 : width(),
            y: height() * 0.82,
            vx: Math.cos(angle) * speed * 1.5,
            vy: Math.sin(angle) * speed * 1.5,
            size: (5 + Math.random() * 8) * scale,
            color: COLORS[index % COLORS.length],
            spin: (Math.random() - 0.5) * 0.4,
            angle: Math.random() * 6.28,
        };
    });
    const started = performance.now();
    let raf = 0;
    const frame = (time: number) => {
        const elapsed = time - started;
        ctx.clearRect(0, 0, width(), height());
        ctx.globalAlpha = Math.min(1, Math.max(0, (duration - elapsed) / 900));
        for (const piece of pieces) {
            piece.vy += 0.17 * scale;
            piece.vx *= 0.992;
            piece.x += piece.vx;
            piece.y += piece.vy;
            piece.angle += piece.spin;
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.angle);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * (0.35 + Math.abs(Math.sin(piece.angle)) * 0.5));
            ctx.restore();
        }
        if (elapsed < duration) raf = requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, width(), height());
    };
    raf = requestAnimationFrame(frame);
    return () => {
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, width(), height());
    };
}
