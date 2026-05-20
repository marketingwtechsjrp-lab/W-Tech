# LENIS SMOOTH SCROLL SKILL
> Skill de rolagem suave e efeitos de scroll para projetos web — Vanilla JS, React/Next.js, Vue/Nuxt
> Baseado em: https://github.com/darkroomengineering/lenis

---

## O QUE É ESTA SKILL

Lenis (latim: "suave") é a biblioteca líder de smooth scroll para a web. Ela **intercepta os eventos nativos do browser e substitui por uma implementação customizada** via `requestAnimationFrame`, criando rolagem fluida e cinematográfica.

**Usada por:** Vercel, Linear, Stripe, Awwwards sites, agências top de UI criativa.

**Quando usar esta skill:**
- Sempre que o projeto precisar de scroll suave, parallax, scroll-based animations
- Integração com GSAP ScrollTrigger
- Sites de portfólio, landing pages premium, cursos online, produtos digitais
- Qualquer entrega da 2TimeWeb ou W-Tech Brasil que precise de experiência visual diferenciada

---

## INSTALAÇÃO

### Via NPM (projetos Node.js, React, Next.js, Vue)
```bash
npm install lenis
```

### Via CDN (HTML puro, WordPress, projetos legados)
```html
<script src="https://unpkg.com/lenis@latest/dist/lenis.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/lenis@latest/dist/lenis.css">
```

### CSS obrigatório (sempre importar)
```css
/* Via CSS import */
@import 'lenis/dist/lenis.css';
```

---

## CONFIGURAÇÃO MÍNIMA (Padrão de Qualidade)

### Vanilla JS — Setup Completo e Correto
```javascript
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

const lenis = new Lenis({
  duration: 1.2,                          // duração da animação em segundos
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easing exponencial suave
  smoothWheel: true,                       // suaviza eventos de roda do mouse
  wheelMultiplier: 1,                      // velocidade do scroll por roda
  touchMultiplier: 2,                      // sensibilidade em touch
  orientation: 'vertical',                // 'vertical' | 'horizontal'
  gestureOrientation: 'vertical',         // 'vertical' | 'horizontal' | 'both'
  autoResize: true,                        // recalcula ao redimensionar
})

// Loop de animação (OBRIGATÓRIO quando autoRaf: false)
function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

// Alternativa simplificada (usa autoRaf interno):
// const lenis = new Lenis({ autoRaf: true })
```

### Vanilla JS — Setup Minimalista (autoRaf)
```javascript
import Lenis from 'lenis'

const lenis = new Lenis({ autoRaf: true })

lenis.on('scroll', (e) => {
  console.log(e.progress) // 0 a 1 — progresso do scroll
})
```

---

## REACT / NEXT.JS

### Setup Global (layout.tsx ou _app.tsx)
```tsx
// components/SmoothScroll.tsx
'use client'
import { ReactLenis } from 'lenis/react'

interface Props {
  children: React.ReactNode
}

export function SmoothScroll({ children }: Props) {
  return (
    <ReactLenis
      root
      options={{
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
      }}
    >
      {children}
    </ReactLenis>
  )
}
```

```tsx
// app/layout.tsx (Next.js App Router)
import { SmoothScroll } from '@/components/SmoothScroll'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  )
}
```

### Hook useLenis — Ler estado do scroll em qualquer componente
```tsx
'use client'
import { useLenis } from 'lenis/react'

export function ScrollProgress() {
  const lenis = useLenis(({ progress, velocity, direction }) => {
    // chamado em cada frame de scroll
    console.log({
      progress,   // 0 a 1
      velocity,   // velocidade atual
      direction,  // 1 (down) | -1 (up) | 0 (parado)
    })
  })

  return null
}
```

### Animação baseada em scroll com React + Lenis
```tsx
'use client'
import { useRef, useState } from 'react'
import { useLenis } from 'lenis/react'

export function ParallaxHero() {
  const [offset, setOffset] = useState(0)

  useLenis(({ scroll }) => {
    setOffset(scroll * 0.4) // parallax 40% da velocidade de scroll
  })

  return (
    <div className="hero" style={{ transform: `translateY(${offset}px)` }}>
      <h1>Seu headline aqui</h1>
    </div>
  )
}
```

---

## VUE / NUXT

### Vue 3 — Setup com Composable
```vue
<!-- App.vue -->
<template>
  <ReactLenis root :options="lenisOptions">
    <slot />
  </ReactLenis>
</template>

<script setup>
// Para Vue, instalar: npm install lenis
import { onMounted, onBeforeUnmount } from 'vue'
import Lenis from 'lenis'

const lenis = ref(null)

onMounted(() => {
  lenis.value = new Lenis({
    duration: 1.2,
    smoothWheel: true,
    autoRaf: true,
  })
})

onBeforeUnmount(() => {
  lenis.value?.destroy()
})
</script>
```

```javascript
// Nuxt — plugins/lenis.client.js
import Lenis from 'lenis'

export default defineNuxtPlugin(() => {
  const lenis = new Lenis({ autoRaf: true })

  return {
    provide: {
      lenis,
    },
  }
})
```

---

## INTEGRAÇÃO COM GSAP + SCROLLTRIGGER (RECEITA PRINCIPAL)

Esta é a combinação mais poderosa para animações profissionais:

```javascript
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// 1. Inicializar Lenis
const lenis = new Lenis()

// 2. Sincronizar Lenis com ScrollTrigger
lenis.on('scroll', ScrollTrigger.update)

// 3. Adicionar ao ticker do GSAP (CRÍTICO — não use RAF separado)
gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

// 4. Desativar lag smoothing do GSAP (evita dupla suavização)
gsap.ticker.lagSmoothing(0)

// 5. Agora use ScrollTrigger normalmente
gsap.from('.hero-title', {
  scrollTrigger: {
    trigger: '.hero',
    start: 'top 80%',
    end: 'top 20%',
    scrub: true,
  },
  y: 80,
  opacity: 0,
  duration: 1,
})
```

### React + GSAP + Lenis (Next.js)
```tsx
'use client'
import { useEffect } from 'react'
import { useLenis } from 'lenis/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function GSAPAnimations() {
  // Conectar Lenis ao ScrollTrigger automaticamente
  useLenis(ScrollTrigger.update)

  useEffect(() => {
    // Suas animações ScrollTrigger aqui
    gsap.from('.card', {
      scrollTrigger: {
        trigger: '.cards-section',
        start: 'top 70%',
        toggleActions: 'play none none reverse',
      },
      y: 60,
      opacity: 0,
      stagger: 0.15,
    })

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  return null
}
```

---

## TODAS AS OPÇÕES DE CONFIGURAÇÃO

```javascript
const lenis = new Lenis({
  // CONTAINER
  wrapper: window,                    // elemento container do scroll (default: window)
  content: document.documentElement,  // conteúdo que será rolado
  eventsTarget: wrapper,              // elemento que receberá eventos de wheel/touch

  // COMPORTAMENTO
  smoothWheel: true,                  // suaviza scroll do mouse
  lerp: 0.1,                          // fator de interpolação linear (0-1). Menor = mais suave/lento
  duration: 1.2,                      // duração em segundos (substitui lerp se definido)
  easing: (t) => 1 - Math.pow(1 - t, 3), // função de easing customizada

  // ORIENTAÇÃO
  orientation: 'vertical',            // 'vertical' | 'horizontal'
  gestureOrientation: 'vertical',     // orientação dos gestos: 'vertical' | 'horizontal' | 'both'

  // TOUCH/MOBILE
  syncTouch: false,                   // sincroniza scroll touch (pode ser instável no iOS < 16)
  syncTouchLerp: 0.075,              // lerp do syncTouch
  touchInertiaMultiplier: 35,         // força da inércia no touch
  touchMultiplier: 1,                 // multiplicador de touch

  // VELOCIDADE
  wheelMultiplier: 1,                 // multiplicador de velocidade da roda do mouse

  // EXTRAS
  infinite: false,                    // scroll infinito (loop)
  autoResize: true,                   // recalcula dimensões ao redimensionar
  autoRaf: false,                     // usa RAF interno (não precisa de loop manual)
  overscroll: true,                   // permite overscroll em instâncias aninhadas

  // ANCORA
  anchors: false,                     // habilita scroll suave para âncoras (#section)
  // anchors: { offset: 0, immediate: false } // com opções

  // PREVENÇÃO SELETIVA (elementos que NÃO devem ter smooth scroll)
  prevent: (node) => node.classList.contains('modal-scroll'),

  // MODIFICAR EVENTOS DE SCROLL VIRTUAL
  virtualScroll: (e) => {
    e.deltaY *= 0.5 // reduz velocidade do scroll em 50%
    return true
  },

  // DIMENSÕES SIMPLES (para casos especiais)
  syncTouch: false,
})
```

---

## EASING FUNCTIONS — RECEITUÁRIO COMPLETO

```javascript
// EXPONENCIAL (padrão recomendado) — suave e natural
easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))

// CUBIC — mais rápido no início, desacelera no fim
easing: (t) => 1 - Math.pow(1 - t, 3)

// EASE IN OUT QUAD — simétrico e elegante
easing: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

// EASE OUT CIRC — muito suave, premium
easing: (t) => Math.sqrt(1 - Math.pow(t - 1, 2))

// LINEAR — sem aceleração (evite, parece mecânico)
easing: (t) => t

// ELASTIC (efeito spring) — use com cuidado, pode enjoar
easing: (t) => {
  const c4 = (2 * Math.PI) / 3
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

// BOUNCE — para efeitos especiais (landing pages, gamification)
easing: (t) => {
  const n1 = 7.5625, d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  else return n1 * (t -= 2.625 / d1) * t + 0.984375
}
```

---

## MÉTODOS DA INSTÂNCIA

```javascript
// SCROLL PROGRAMÁTICO
lenis.scrollTo(0)                               // ir para o topo
lenis.scrollTo('#section-id')                   // ir para elemento por ID
lenis.scrollTo(document.querySelector('.hero'))  // ir para elemento DOM
lenis.scrollTo('bottom')                         // ir para o rodapé

// OPÇÕES DO scrollTo
lenis.scrollTo('#contato', {
  offset: -80,           // deslocamento em px (útil para navbar fixa)
  duration: 2,           // duração específica desta animação
  easing: (t) => t,      // easing específico desta animação
  immediate: false,       // se true, pula animação
  lock: false,            // bloqueia scroll do usuário durante animação
  onStart: () => {},      // callback quando começa
  onComplete: () => {},   // callback quando termina
  force: false,           // força mesmo se stopped
})

// CONTROLE
lenis.stop()             // pausar smooth scroll
lenis.start()            // retomar smooth scroll
lenis.destroy()          // destruir instância (sempre chamar no cleanup)
lenis.resize()           // recalcular dimensões manualmente

// PROPRIEDADES ÚTEIS (somente leitura)
lenis.scroll             // posição atual em px
lenis.progress           // progresso 0 a 1
lenis.velocity           // velocidade atual
lenis.direction          // 1 (baixo) | -1 (cima) | 0 (parado)
lenis.isScrolling        // boolean | 'native' | 'smooth'
lenis.isStopped          // boolean
lenis.isLocked           // boolean
lenis.limit              // valor máximo de scroll

// EVENTOS
lenis.on('scroll', ({ scroll, progress, velocity, direction }) => {
  // chamado em cada frame de scroll
})

lenis.on('virtual-scroll', ({ deltaX, deltaY, event }) => {
  // chamado nos eventos brutos de wheel/touch
})
```

---

## CASOS DE USO ESPECIAIS

### Prevenir smooth scroll em modais/overlays
```html
<!-- HTML: adicionar atributo especial -->
<div class="modal" data-lenis-prevent>
  <!-- conteúdo com scroll nativo -->
</div>
```

```javascript
// JavaScript: via opção prevent
const lenis = new Lenis({
  prevent: (node) => {
    return (
      node.classList.contains('modal') ||
      node.closest('[data-lenis-prevent]') !== null
    )
  }
})
```

### Scroll Horizontal
```javascript
const lenis = new Lenis({
  orientation: 'horizontal',
  gestureOrientation: 'both', // aceita gestos verticais e horizontais
})
```

```css
/* CSS necessário para scroll horizontal */
body {
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  width: max-content;
  height: 100vh;
}
```

### Scroll em Container Específico (não o body)
```javascript
const wrapper = document.querySelector('.scroll-container')
const content = document.querySelector('.scroll-content')

const lenis = new Lenis({
  wrapper: wrapper,
  content: content,
  autoRaf: true,
})
```

```css
.scroll-container {
  overflow: hidden;
  height: 100vh; /* ou qualquer altura fixa */
}
```

### Scroll Infinito
```javascript
const lenis = new Lenis({
  infinite: true,
  autoRaf: true,
})

// Útil para carrosséis infinitos ou sliders
lenis.on('scroll', ({ scroll }) => {
  const normalizedScroll = scroll % totalContentHeight
  // use normalizedScroll para posicionar conteúdo em loop
})
```

### Instâncias Aninhadas (scroll dentro de scroll)
```javascript
// Container pai
const mainLenis = new Lenis()

// Container filho (modal, panel, etc.)
const nestedLenis = new Lenis({
  wrapper: document.querySelector('.panel'),
  content: document.querySelector('.panel-content'),
  // overscroll: true (default) — propaga scroll para o pai quando atinge limite
})

// Loop manual para instâncias múltiplas
function raf(time) {
  mainLenis.raf(time)
  nestedLenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)
```

### Barra de Progresso do Scroll
```javascript
const lenis = new Lenis({ autoRaf: true })
const progressBar = document.querySelector('.progress-bar')

lenis.on('scroll', ({ progress }) => {
  progressBar.style.width = `${progress * 100}%`
})
```

### Animações baseadas em velocidade (efeito de blur/stretch)
```javascript
lenis.on('scroll', ({ velocity }) => {
  const blur = Math.abs(velocity) * 0.5
  document.querySelector('.hero-img').style.filter = `blur(${Math.min(blur, 8)}px)`
})
```

### Reveal de elementos no scroll (Intersection + Lenis)
```javascript
// Lenis preserva Intersection Observer — não quebra como Locomotive Scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible')
    }
  })
}, { threshold: 0.2 })

document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
```

---

## CSS HELPERS — CLASSES E ATRIBUTOS

```css
/* Classe adicionada automaticamente ao html pelo Lenis */
html.lenis {
  height: auto; /* necessário para scroll correto */
}

/* Quando está rolando */
html.lenis.lenis-scrolling {
  /* pode adicionar cursor custom, desativar pointer-events, etc. */
  pointer-events: none;
}

/* Quando está parado */
html.lenis.lenis-stopped {
  overflow: hidden;
}
```

```html
<!-- Prevenir smooth scroll em elemento específico -->
<div data-lenis-prevent>scroll nativo aqui</div>

<!-- Prevenir apenas scroll por roda -->
<div data-lenis-prevent-wheel>só wheel é nativo</div>

<!-- Prevenir apenas scroll touch -->
<div data-lenis-prevent-touch>só touch é nativo</div>
```

---

## PERFORMANCE — BOAS PRÁTICAS

```javascript
// 1. NUNCA mude o scroll position diretamente — use scrollTo()
// ❌ ERRADO:
window.scrollTo(0, 500)
// ✅ CERTO:
lenis.scrollTo(500)

// 2. Sempre destrua a instância ao desmontar componente
useEffect(() => {
  const lenis = new Lenis({ autoRaf: true })
  return () => lenis.destroy() // cleanup
}, [])

// 3. Use requestAnimationFrame corretamente (não use setInterval)
// ❌ ERRADO:
setInterval(() => lenis.raf(Date.now()), 16)
// ✅ CERTO:
const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf) }
requestAnimationFrame(raf)

// 4. Com GSAP: NUNCA use RAF manual E gsap.ticker simultaneamente
// Use um ou outro, nunca os dois

// 5. Evite JS pesado dentro do callback 'scroll'
// ❌ ERRADO (cria layout thrashing):
lenis.on('scroll', () => {
  document.querySelector('.el').getBoundingClientRect() // força layout
})
// ✅ CERTO: use transform e opacity para animações de scroll
lenis.on('scroll', ({ scroll }) => {
  el.style.transform = `translateY(${scroll * 0.1}px)`
})
```

---

## LIMITAÇÕES — PONTOS CEGOS (IMPORTANTES)

| Limitação | Impacto | Solução |
|-----------|---------|---------|
| Safari: máx 60fps, 30fps em low-power | Pode parecer menos suave no iPhone | Testar em dispositivos reais, considerar redução de duration |
| iOS < 16 com syncTouch: pode ser instável | Bugs visuais em iPhones antigos | Manter `syncTouch: false` (padrão) |
| Scroll nativo CSS (scroll-snap) não funciona nativo | Não combina direto com `scroll-snap-type` | Usar pacote `lenis/snap` separado |
| iframes não são controlados | Iframes têm scroll próprio | Usar `prevent` para iframes |
| Position: fixed pode lag no Safari antigo | Elementos fixos tremerem | Usar `transform: translateZ(0)` nos elementos fixos |
| `window.scrollY` pode ser impreciso | Código legado que usa `scrollY` | Usar `lenis.scroll` no lugar de `window.scrollY` |

---

## SNAP EXTENSION — SCROLL SNAPPING SUAVE

```bash
# Instalação separada
npm install lenis
```

```javascript
import Lenis from 'lenis'
import { LenisSnap } from 'lenis/snap'

const lenis = new Lenis({ autoRaf: true })

const snap = new LenisSnap(lenis, {
  type: 'mandatory',  // 'mandatory' | 'proximity'
  velocityThreshold: 0.8,
  elements: Array.from(document.querySelectorAll('.snap-section')),
})

// HTML
// <section class="snap-section" style="height: 100vh">...</section>
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

```
□ npm install lenis
□ Importar CSS: import 'lenis/dist/lenis.css'
□ Instanciar com duration e easing configurados
□ Configurar loop (autoRaf: true OU requestAnimationFrame manual)
□ Se usar GSAP: sincronizar via gsap.ticker + lagSmoothing(0)
□ Adicionar data-lenis-prevent em modais e áreas de scroll nativo
□ Testar em iOS (Safari)
□ Destruir instância no cleanup de SPA/React
□ Verificar que window.scrollY foi substituído por lenis.scroll se necessário
□ Testar acessibilidade: reduced-motion preference
```

### Suporte a reduced-motion (acessibilidade)
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = new Lenis({
  duration: prefersReducedMotion ? 0 : 1.2,
  lerp: prefersReducedMotion ? 1 : 0.1,  // lerp: 1 = sem suavização
  smoothWheel: !prefersReducedMotion,
})
```

---

## TEMPLATES PRONTOS

### Template: Landing Page Premium (HTML + Lenis)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/lenis@latest/dist/lenis.css">
  <style>
    html.lenis { height: auto; }
    .section { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .reveal { opacity: 0; transform: translateY(40px); transition: all 0.6s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>
  <section class="section"><h1 class="reveal">Hero Section</h1></section>
  <section class="section"><h2 class="reveal">Sobre</h2></section>
  <section class="section"><h2 class="reveal">Contato</h2></section>

  <script src="https://unpkg.com/lenis@latest/dist/lenis.min.js"></script>
  <script>
    const lenis = new Lenis({ autoRaf: true })

    // Reveal com IntersectionObserver (funciona 100% com Lenis)
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.2 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
  </script>
</body>
</html>
```

### Template: Next.js App Router Completo
```
src/
  components/
    SmoothScroll.tsx    ← ReactLenis root wrapper
    ScrollProgress.tsx  ← barra de progresso
    Parallax.tsx        ← componente parallax reutilizável
  app/
    layout.tsx          ← SmoothScroll envolve tudo
    page.tsx            ← conteúdo da página
```

---

## VERSÃO E COMPATIBILIDADE

- **Versão atual:** lenis@1.x
- **Browsers:** Chrome, Firefox, Safari, Edge (modernos)
- **Safari:** 60fps máx, 30fps low-power mode
- **iOS:** Funcional. `syncTouch: false` é mais estável (padrão)
- **Frameworks:** Vanilla JS, React, Next.js, Vue, Nuxt, Astro, SvelteKit

---

*Skill criada para projetos 2TimeWeb e W-Tech Brasil. Baseada na documentação oficial: https://github.com/darkroomengineering/lenis*
