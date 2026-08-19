import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    Bike,
    Check,
    ChevronRight,
    CircleGauge,
    Crosshair,
    Gauge,
    Grip,
    Mountain,
    Route,
    ShieldCheck,
    Sparkles,
    Target,
    TimerReset,
    Waves,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SEO from '../components/SEO';
import ErrorBoundary from '../components/ErrorBoundary';
import { trackEvent } from '../components/AnalyticsTracker';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import type { SiteLanguage } from '../lib/siteTranslations';
import { captureTrackingParams, getLeadTrackingFields } from '../lib/tracking';
import { distributeLead } from '../lib/leadDistribution';
import { supabase } from '../lib/supabaseClient';
import { triggerWebhook } from '../lib/webhooks';

type QuizTheme = 'dark' | 'light';
type Profile = 'equilibrio' | 'tracao' | 'dianteira' | 'ergonomia';
type Answers = Record<string, string>;

interface OptionCopy {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
}

interface StepCopy {
    id: string;
    eyebrow: string;
    title: string;
    hint: string;
    options: OptionCopy[];
}

interface ResultCopy {
    label: string;
    title: string;
    description: string;
    insights: string[];
}

interface QuizCopy {
    seoTitle: string;
    seoDescription: string;
    badge: string;
    heroTitle: string;
    heroHighlight: string;
    heroDescription: string;
    start: string;
    free: string;
    duration: string;
    immediate: string;
    dark: string;
    light: string;
    step: string;
    of: string;
    back: string;
    transitionEyebrow: string;
    transitionLabels: string[];
    transitionHint: string;
    interactionHint: string;
    resultEyebrow: string;
    resultTitle: string;
    resultDescription: string;
    resultAction: string;
    resultFootnote: string;
    formTitle: string;
    formSubtitle: string;
    formName: string;
    formPhone: string;
    formNameError: string;
    formPhoneError: string;
    formFailure: string;
    formSending: string;
    formPrivacy: string;
    restart: string;
    interaction: string;
    profiles: Record<Profile, ResultCopy>;
    steps: StepCopy[];
}

const createSteps = (language: SiteLanguage): StepCopy[] => {
    const dictionaries: Record<SiteLanguage, StepCopy[]> = {
        'pt-BR': [
            {
                id: 'modalidade',
                eyebrow: 'Seu Off-Road',
                title: 'Onde você mais pilota?',
                hint: 'Todas as rotas deste diagnóstico são exclusivas para uso fora de estrada.',
                options: [
                    { id: 'motocross', label: 'Motocross', description: 'Pista, saltos e costelas de frenagem', icon: Bike },
                    { id: 'enduro', label: 'Enduro', description: 'Provas longas e terreno técnico', icon: Route },
                    { id: 'trilha', label: 'Trilha', description: 'Pedras, raízes, erosões e subidas', icon: Mountain },
                    { id: 'hard_enduro', label: 'Hard Enduro', description: 'Obstáculos extremos e baixa velocidade', icon: Target },
                ],
            },
            {
                id: 'sintoma',
                eyebrow: 'Leitura da moto',
                title: 'Qual sintoma mais rouba sua confiança?',
                hint: 'Escolha o comportamento que aparece primeiro quando você aumenta o ritmo.',
                options: [
                    { id: 'fadiga', label: 'Braços cansam e travam', description: 'A moto transfere impacto demais para o corpo', icon: Grip },
                    { id: 'frente', label: 'A frente não comunica', description: 'Fecha, escapa ou parece vaga nas curvas', icon: Crosshair },
                    { id: 'traseira', label: 'A traseira quica e espalha', description: 'Perde contato e tração na aceleração', icon: Waves },
                    { id: 'impacto', label: 'Bate seco ou chega ao fim', description: 'Falta conforto e controle nos impactos', icon: Zap },
                ],
            },
            {
                id: 'metodo',
                eyebrow: 'Seu método atual',
                title: 'Como você regula a suspensão hoje?',
                hint: 'Não existe resposta errada. Isso define por onde sua evolução deve começar.',
                options: [
                    { id: 'nunca', label: 'Nunca mexi', description: 'Uso a regulagem como a moto chegou', icon: ShieldCheck },
                    { id: 'copio', label: 'Copio o acerto de alguém', description: 'Replico cliques sem considerar peso e tocada', icon: TimerReset },
                    { id: 'tentativa', label: 'Mexo por tentativa', description: 'Altero cliques, mas não registro o resultado', icon: Gauge },
                    { id: 'registro', label: 'Meço SAG e registro testes', description: 'Já tenho método, quero mais precisão', icon: CircleGauge },
                ],
            },
            {
                id: 'terreno',
                eyebrow: 'Resposta ao terreno',
                title: 'Qual chão mais expõe o problema?',
                hint: 'O terreno revela onde o conjunto perde equilíbrio.',
                options: [
                    { id: 'saltos', label: 'Saltos e frenagens', description: 'Recepções, costelas e entradas de curva', icon: Bike },
                    { id: 'pedras', label: 'Pedras e raízes', description: 'Impactos sucessivos em baixa e média velocidade', icon: Mountain },
                    { id: 'areia', label: 'Areia e canaletas', description: 'Frente solta e traseira buscando tração', icon: Waves },
                    { id: 'misto', label: 'Terreno misto', description: 'A moto muda demais ao longo do percurso', icon: Route },
                ],
            },
            {
                id: 'ergonomia',
                eyebrow: 'Cockpit e postura',
                title: 'Quanto sua ergonomia foi ajustada?',
                hint: 'Guidão, manetes, pedaleiras e postura mudam a leitura da suspensão.',
                options: [
                    { id: 'original', label: 'Está tudo original', description: 'Nunca adaptei o cockpit ao meu corpo', icon: Grip },
                    { id: 'conforto', label: 'Ajustei pelo conforto', description: 'Posicionei até parecer mais confortável', icon: ShieldCheck },
                    { id: 'arm_pump', label: 'Ainda tenho arm pump', description: 'Aperto demais a moto e perco mobilidade', icon: Zap },
                    { id: 'metodica', label: 'Testo postura e comandos', description: 'Cruzo ergonomia, terreno e resposta da moto', icon: Target },
                ],
            },
            {
                id: 'objetivo',
                eyebrow: 'Sua próxima pilotagem',
                title: 'Qual mudança você quer sentir primeiro?',
                hint: 'Seu diagnóstico vai priorizar este resultado.',
                options: [
                    { id: 'confianca', label: 'Frente previsível', description: 'Entrar e sustentar curvas com confiança', icon: Crosshair },
                    { id: 'tracao', label: 'Mais tração', description: 'Acelerar sem a traseira espalhar', icon: Waves },
                    { id: 'menos_fadiga', label: 'Menos fadiga', description: 'Pilotar mais solto e por mais tempo', icon: Grip },
                    { id: 'consistencia', label: 'Voltas consistentes', description: 'Repetir o ritmo em qualquer terreno', icon: CircleGauge },
                ],
            },
        ],
        'pt-PT': [
            {
                id: 'modalidade', eyebrow: 'O teu Off-Road', title: 'Onde pilotas mais?', hint: 'Todas as rotas deste diagnóstico são exclusivas para fora de estrada.',
                options: [
                    { id: 'motocross', label: 'Motocross', description: 'Pista, saltos e ondulações de travagem', icon: Bike },
                    { id: 'enduro', label: 'Enduro', description: 'Provas longas e terreno técnico', icon: Route },
                    { id: 'trilha', label: 'Trilho', description: 'Pedras, raízes, erosões e subidas', icon: Mountain },
                    { id: 'hard_enduro', label: 'Hard Enduro', description: 'Obstáculos extremos e baixa velocidade', icon: Target },
                ],
            },
            {
                id: 'sintoma', eyebrow: 'Leitura da moto', title: 'Que sintoma mais te tira confiança?', hint: 'Escolhe o comportamento que surge primeiro quando aumentas o ritmo.',
                options: [
                    { id: 'fadiga', label: 'Os braços cansam e bloqueiam', description: 'A moto transfere demasiado impacto para o corpo', icon: Grip },
                    { id: 'frente', label: 'A frente não comunica', description: 'Fecha, escapa ou parece vaga nas curvas', icon: Crosshair },
                    { id: 'traseira', label: 'A traseira salta e espalha', description: 'Perde contacto e tração na aceleração', icon: Waves },
                    { id: 'impacto', label: 'Bate seco ou chega ao fim', description: 'Falta conforto e controlo nos impactos', icon: Zap },
                ],
            },
            {
                id: 'metodo', eyebrow: 'O teu método atual', title: 'Como regulas a suspensão hoje?', hint: 'Não há resposta errada. Isto define onde deve começar a tua evolução.',
                options: [
                    { id: 'nunca', label: 'Nunca mexi', description: 'Uso a regulação com que a moto chegou', icon: ShieldCheck },
                    { id: 'copio', label: 'Copio a afinação de alguém', description: 'Replico cliques sem considerar peso e pilotagem', icon: TimerReset },
                    { id: 'tentativa', label: 'Mexo por tentativa', description: 'Altero cliques, mas não registo o resultado', icon: Gauge },
                    { id: 'registro', label: 'Meço SAG e registo testes', description: 'Já tenho método e quero mais precisão', icon: CircleGauge },
                ],
            },
            {
                id: 'terreno', eyebrow: 'Resposta ao terreno', title: 'Que piso expõe mais o problema?', hint: 'O terreno revela onde o conjunto perde equilíbrio.',
                options: [
                    { id: 'saltos', label: 'Saltos e travagens', description: 'Receções, ondulações e entradas de curva', icon: Bike },
                    { id: 'pedras', label: 'Pedras e raízes', description: 'Impactos sucessivos a baixa e média velocidade', icon: Mountain },
                    { id: 'areia', label: 'Areia e regos', description: 'Frente solta e traseira à procura de tração', icon: Waves },
                    { id: 'misto', label: 'Terreno misto', description: 'A moto muda demasiado ao longo do percurso', icon: Route },
                ],
            },
            {
                id: 'ergonomia', eyebrow: 'Cockpit e postura', title: 'Quanto ajustaste a tua ergonomia?', hint: 'Guiador, manetes, peseiras e postura mudam a leitura da suspensão.',
                options: [
                    { id: 'original', label: 'Está tudo original', description: 'Nunca adaptei o cockpit ao meu corpo', icon: Grip },
                    { id: 'conforto', label: 'Ajustei pelo conforto', description: 'Posicionei até parecer mais confortável', icon: ShieldCheck },
                    { id: 'arm_pump', label: 'Ainda tenho arm pump', description: 'Aperto demasiado a moto e perco mobilidade', icon: Zap },
                    { id: 'metodica', label: 'Testo postura e comandos', description: 'Cruzo ergonomia, terreno e resposta da moto', icon: Target },
                ],
            },
            {
                id: 'objetivo', eyebrow: 'A tua próxima pilotagem', title: 'Que mudança queres sentir primeiro?', hint: 'O teu diagnóstico vai priorizar este resultado.',
                options: [
                    { id: 'confianca', label: 'Frente previsível', description: 'Entrar e manter curvas com confiança', icon: Crosshair },
                    { id: 'tracao', label: 'Mais tração', description: 'Acelerar sem a traseira espalhar', icon: Waves },
                    { id: 'menos_fadiga', label: 'Menos fadiga', description: 'Pilotar mais solto e durante mais tempo', icon: Grip },
                    { id: 'consistencia', label: 'Voltas consistentes', description: 'Repetir o ritmo em qualquer terreno', icon: CircleGauge },
                ],
            },
        ],
        es: [
            {
                id: 'modalidade', eyebrow: 'Tu Off-Road', title: '¿Dónde pilotas más?', hint: 'Todas las rutas de este diagnóstico son exclusivamente Off-Road.',
                options: [
                    { id: 'motocross', label: 'Motocross', description: 'Circuito, saltos y baches de frenada', icon: Bike },
                    { id: 'enduro', label: 'Enduro', description: 'Pruebas largas y terreno técnico', icon: Route },
                    { id: 'trilha', label: 'Senderos', description: 'Piedras, raíces, erosiones y subidas', icon: Mountain },
                    { id: 'hard_enduro', label: 'Hard Enduro', description: 'Obstáculos extremos y baja velocidad', icon: Target },
                ],
            },
            {
                id: 'sintoma', eyebrow: 'Lectura de la moto', title: '¿Qué síntoma te quita más confianza?', hint: 'Elige lo que aparece primero cuando aumentas el ritmo.',
                options: [
                    { id: 'fadiga', label: 'Los brazos se cansan y bloquean', description: 'La moto transfiere demasiado impacto al cuerpo', icon: Grip },
                    { id: 'frente', label: 'El tren delantero no comunica', description: 'Se cierra, desliza o parece vago en curvas', icon: Crosshair },
                    { id: 'traseira', label: 'La trasera rebota y se abre', description: 'Pierde contacto y tracción al acelerar', icon: Waves },
                    { id: 'impacto', label: 'Golpea seco o hace tope', description: 'Falta comodidad y control en los impactos', icon: Zap },
                ],
            },
            {
                id: 'metodo', eyebrow: 'Tu método actual', title: '¿Cómo regulas la suspensión hoy?', hint: 'No hay respuesta incorrecta. Esto define dónde empezar.',
                options: [
                    { id: 'nunca', label: 'Nunca la toqué', description: 'Uso la configuración de entrega', icon: ShieldCheck },
                    { id: 'copio', label: 'Copio la puesta a punto', description: 'Repito clics sin considerar peso y pilotaje', icon: TimerReset },
                    { id: 'tentativa', label: 'Pruebo sin registrar', description: 'Cambio clics, pero no anoto el resultado', icon: Gauge },
                    { id: 'registro', label: 'Mido SAG y registro pruebas', description: 'Ya tengo método y quiero más precisión', icon: CircleGauge },
                ],
            },
            {
                id: 'terreno', eyebrow: 'Respuesta al terreno', title: '¿Qué terreno expone más el problema?', hint: 'El suelo revela dónde el conjunto pierde equilibrio.',
                options: [
                    { id: 'saltos', label: 'Saltos y frenadas', description: 'Recepciones, baches y entradas de curva', icon: Bike },
                    { id: 'pedras', label: 'Piedras y raíces', description: 'Impactos sucesivos a baja y media velocidad', icon: Mountain },
                    { id: 'areia', label: 'Arena y roderas', description: 'Frente suelto y trasera buscando tracción', icon: Waves },
                    { id: 'misto', label: 'Terreno mixto', description: 'La moto cambia demasiado durante el recorrido', icon: Route },
                ],
            },
            {
                id: 'ergonomia', eyebrow: 'Cockpit y postura', title: '¿Cuánto ajustaste tu ergonomía?', hint: 'Manillar, manetas, estriberas y postura cambian la lectura de la suspensión.',
                options: [
                    { id: 'original', label: 'Todo está original', description: 'Nunca adapté el cockpit a mi cuerpo', icon: Grip },
                    { id: 'conforto', label: 'Ajusté por comodidad', description: 'Lo posicioné hasta sentirlo cómodo', icon: ShieldCheck },
                    { id: 'arm_pump', label: 'Aún tengo arm pump', description: 'Aprieto demasiado la moto y pierdo movilidad', icon: Zap },
                    { id: 'metodica', label: 'Pruebo postura y mandos', description: 'Cruzo ergonomía, terreno y respuesta', icon: Target },
                ],
            },
            {
                id: 'objetivo', eyebrow: 'Tu próxima rodada', title: '¿Qué cambio quieres sentir primero?', hint: 'Tu diagnóstico priorizará este resultado.',
                options: [
                    { id: 'confianca', label: 'Frente predecible', description: 'Entrar y mantener curvas con confianza', icon: Crosshair },
                    { id: 'tracao', label: 'Más tracción', description: 'Acelerar sin que la trasera se abra', icon: Waves },
                    { id: 'menos_fadiga', label: 'Menos fatiga', description: 'Pilotar más suelto durante más tiempo', icon: Grip },
                    { id: 'consistencia', label: 'Vueltas consistentes', description: 'Repetir el ritmo en cualquier terreno', icon: CircleGauge },
                ],
            },
        ],
        en: [
            {
                id: 'modalidade', eyebrow: 'Your Off-Road ride', title: 'Where do you ride most?', hint: 'Every path in this diagnosis is built exclusively for Off-Road riding.',
                options: [
                    { id: 'motocross', label: 'Motocross', description: 'Tracks, jumps and braking bumps', icon: Bike },
                    { id: 'enduro', label: 'Enduro', description: 'Long events and technical terrain', icon: Route },
                    { id: 'trilha', label: 'Trail riding', description: 'Rocks, roots, erosion and climbs', icon: Mountain },
                    { id: 'hard_enduro', label: 'Hard Enduro', description: 'Extreme obstacles at technical pace', icon: Target },
                ],
            },
            {
                id: 'sintoma', eyebrow: 'Reading the bike', title: 'Which symptom steals your confidence?', hint: 'Choose what shows up first when you increase the pace.',
                options: [
                    { id: 'fadiga', label: 'My arms tire and lock up', description: 'The bike transfers too much impact to the body', icon: Grip },
                    { id: 'frente', label: 'The front gives no feedback', description: 'It tucks, slides or feels vague in turns', icon: Crosshair },
                    { id: 'traseira', label: 'The rear kicks and steps out', description: 'It loses contact and traction under power', icon: Waves },
                    { id: 'impacto', label: 'It feels harsh or bottoms out', description: 'Impacts lack comfort and control', icon: Zap },
                ],
            },
            {
                id: 'metodo', eyebrow: 'Your current method', title: 'How do you tune suspension today?', hint: 'There is no wrong answer. This sets the right starting point.',
                options: [
                    { id: 'nunca', label: 'I have never adjusted it', description: 'I ride the bike as delivered', icon: ShieldCheck },
                    { id: 'copio', label: 'I copy someone else’s setup', description: 'I repeat clicks without matching weight or style', icon: TimerReset },
                    { id: 'tentativa', label: 'I tune by trial and error', description: 'I change clicks but do not log the result', icon: Gauge },
                    { id: 'registro', label: 'I measure SAG and log tests', description: 'I have a method and want more precision', icon: CircleGauge },
                ],
            },
            {
                id: 'terreno', eyebrow: 'Terrain response', title: 'Which terrain exposes the problem most?', hint: 'Terrain shows where the chassis loses balance.',
                options: [
                    { id: 'saltos', label: 'Jumps and braking bumps', description: 'Landings, chop and turn entry', icon: Bike },
                    { id: 'pedras', label: 'Rocks and roots', description: 'Repeated impacts through technical terrain', icon: Mountain },
                    { id: 'areia', label: 'Sand and ruts', description: 'Loose front and rear searching for grip', icon: Waves },
                    { id: 'misto', label: 'Mixed terrain', description: 'The bike changes too much through the ride', icon: Route },
                ],
            },
            {
                id: 'ergonomia', eyebrow: 'Cockpit and posture', title: 'How much have you tuned your ergonomics?', hint: 'Bars, levers, pegs and posture change how suspension feels.',
                options: [
                    { id: 'original', label: 'Everything is stock', description: 'I have never fitted the cockpit to my body', icon: Grip },
                    { id: 'conforto', label: 'I adjusted for comfort', description: 'I positioned things until they felt comfortable', icon: ShieldCheck },
                    { id: 'arm_pump', label: 'I still get arm pump', description: 'I grip the bike too hard and lose mobility', icon: Zap },
                    { id: 'metodica', label: 'I test posture and controls', description: 'I connect ergonomics, terrain and bike response', icon: Target },
                ],
            },
            {
                id: 'objetivo', eyebrow: 'Your next ride', title: 'Which change do you want to feel first?', hint: 'Your diagnosis will prioritize this outcome.',
                options: [
                    { id: 'confianca', label: 'A predictable front end', description: 'Enter and hold turns with confidence', icon: Crosshair },
                    { id: 'tracao', label: 'More traction', description: 'Accelerate without the rear stepping out', icon: Waves },
                    { id: 'menos_fadiga', label: 'Less fatigue', description: 'Ride looser for longer', icon: Grip },
                    { id: 'consistencia', label: 'Consistent laps', description: 'Repeat your pace on any terrain', icon: CircleGauge },
                ],
            },
        ],
    };
    return dictionaries[language];
};

const COPY: Record<SiteLanguage, Omit<QuizCopy, 'steps'>> = {
    'pt-BR': {
        seoTitle: 'Diagnóstico Off-Road de Suspensão e Ergonomia | W-Tech',
        seoDescription: 'Descubra em 90 segundos qual ajuste de suspensão e ergonomia deve transformar primeiro a sua pilotagem Off-Road.',
        badge: 'Diagnóstico imersivo Off-Road',
        heroTitle: 'Pare de adivinhar.',
        heroHighlight: 'Comece a sentir a moto.',
        heroDescription: 'Em 6 decisões, identifique o que está tirando controle, tração e energia da sua pilotagem — um diagnóstico 100% voltado a Motocross e Off-Road.',
        start: 'Iniciar meu diagnóstico',
        free: '100% gratuito',
        duration: 'Cerca de 90 segundos',
        immediate: 'Resultado imediato',
        dark: 'Escuro',
        light: 'Claro',
        step: 'Etapa',
        of: 'de',
        back: 'Voltar',
        transitionEyebrow: 'W-Tech preparando seu resultado',
        transitionLabels: ['Conectando seu estilo de pilotagem', 'Interpretando os sintomas da moto', 'Organizando sua base de regulagem', 'Cruzando terreno e resposta da suspensão', 'Relacionando ergonomia e fadiga', 'Finalizando seu diagnóstico'],
        transitionHint: 'Sua leitura personalizada está quase pronta.',
        interactionHint: 'Mova o cursor para girar a marca em 3D',
        resultEyebrow: 'Seu mapa de evolução',
        resultTitle: 'A primeira mudança não é acelerar mais.',
        resultDescription: 'É fazer a moto trabalhar com você. O diagnóstico abaixo define o melhor ponto de entrada para a sua regulagem.',
        resultAction: 'Ver meu plano de regulagem',
        formTitle: 'Para onde enviamos seu plano?',
        formSubtitle: 'Seu diagnóstico fica salvo e o acompanhamento chega no seu WhatsApp.',
        formName: 'Seu nome',
        formPhone: 'WhatsApp com DDD',
        formNameError: 'Informe seu nome.',
        formPhoneError: 'Informe um WhatsApp válido com DDD.',
        formFailure: 'Não foi possível salvar seus dados. Confira e tente de novo.',
        formSending: 'Preparando seu plano...',
        formPrivacy: 'Usamos seus dados apenas para enviar o plano e o acompanhamento do curso.',
        resultFootnote: 'A seguir você assiste à apresentação que liga este diagnóstico ao método completo — e a inscrição abre direto no checkout.',
        restart: 'Refazer diagnóstico',
        interaction: 'Interação 3D',
        profiles: {
            equilibrio: {
                label: 'Prioridade: Equilíbrio dinâmico',
                title: 'Sua moto muda demais quando o terreno muda.',
                description: 'O conjunto precisa de uma base repetível: SAG correto, posição de pilotagem e sequência de testes antes de qualquer ajuste fino.',
                insights: ['Crie uma referência de SAG para o seu peso equipado', 'Altere apenas uma variável por teste', 'Registre terreno, cliques e sensação da moto'],
            },
            tracao: {
                label: 'Prioridade: Tração traseira',
                title: 'A potência está chegando antes da aderência.',
                description: 'A traseira está perdendo contato ou transferindo força de forma brusca. O caminho começa no SAG, retorno e posição do corpo.',
                insights: ['Valide SAG estático e dinâmico antes dos cliques', 'Observe retorno em impactos sucessivos', 'Cruze posição do corpo com aceleração e terreno'],
            },
            dianteira: {
                label: 'Prioridade: Confiança na dianteira',
                title: 'Sua frente precisa conversar com você.',
                description: 'A entrada e o apoio de curva pedem mais leitura. Altura, compressão, retorno e cockpit devem trabalhar como um único sistema.',
                insights: ['Avalie altura e distribuição de peso', 'Teste compressão e retorno separadamente', 'Ajuste manetes e guidão para manter mobilidade'],
            },
            ergonomia: {
                label: 'Prioridade: Ergonomia e fadiga',
                title: 'Seu corpo está absorvendo o trabalho da moto.',
                description: 'Arm pump e rigidez não se resolvem apenas com preparo físico. Cockpit, postura e suspensão precisam devolver liberdade ao piloto.',
                insights: ['Ajuste comandos para pilotar em pé sem quebrar os punhos', 'Reduza tensão de mãos e antebraços', 'Cruze ergonomia com a resposta nos impactos'],
            },
        },
    },
    'pt-PT': {
        seoTitle: 'Diagnóstico Off-Road de Suspensão e Ergonomia | W-Tech',
        seoDescription: 'Descobre em 90 segundos que ajuste de suspensão e ergonomia deve transformar primeiro a tua pilotagem Off-Road.',
        badge: 'Diagnóstico imersivo Off-Road', heroTitle: 'Pára de adivinhar.', heroHighlight: 'Começa a sentir a moto.',
        heroDescription: 'Em 6 decisões, identifica o que está a tirar controlo, tração e energia da tua pilotagem — um diagnóstico 100% dedicado a Motocross e Off-Road.',
        start: 'Iniciar o meu diagnóstico', free: '100% gratuito', duration: 'Cerca de 90 segundos', immediate: 'Resultado imediato',
        dark: 'Escuro', light: 'Claro', step: 'Etapa', of: 'de', back: 'Voltar',
        transitionEyebrow: 'W-Tech a preparar o teu resultado',
        transitionLabels: ['A ligar o teu estilo de pilotagem', 'A interpretar os sintomas da mota', 'A organizar a tua base de afinação', 'A cruzar terreno e resposta da suspensão', 'A relacionar ergonomia e fadiga', 'A finalizar o teu diagnóstico'],
        transitionHint: 'A tua leitura personalizada está quase pronta.',
        interactionHint: 'Move o cursor para girar a marca em 3D',
        resultEyebrow: 'O teu mapa de evolução', resultTitle: 'A primeira mudança não é acelerar mais.',
        resultDescription: 'É fazer a moto trabalhar contigo. O diagnóstico abaixo define o melhor ponto de entrada para a tua regulação.',
        resultAction: 'Ver o meu plano de regulação',
        formTitle: 'Para onde enviamos o teu plano?',
        formSubtitle: 'O teu diagnóstico fica guardado e o acompanhamento chega ao teu WhatsApp.',
        formName: 'O teu nome',
        formPhone: 'WhatsApp com indicativo',
        formNameError: 'Indica o teu nome.',
        formPhoneError: 'Indica um WhatsApp válido com indicativo.',
        formFailure: 'Não foi possível guardar os teus dados. Confirma e tenta de novo.',
        formSending: 'A preparar o teu plano...',
        formPrivacy: 'Usamos os teus dados apenas para enviar o plano e o acompanhamento do curso.',
        resultFootnote: 'A seguir vês a apresentação que liga este diagnóstico ao método completo — e a inscrição abre diretamente no checkout.',
        restart: 'Repetir diagnóstico', interaction: 'Interação 3D',
        profiles: {
            equilibrio: { label: 'Prioridade: Equilíbrio dinâmico', title: 'A tua moto muda demasiado quando o terreno muda.', description: 'O conjunto precisa de uma base repetível: SAG correto, posição e sequência de testes antes de qualquer ajuste fino.', insights: ['Cria uma referência de SAG para o teu peso equipado', 'Altera apenas uma variável por teste', 'Regista terreno, cliques e sensação da moto'] },
            tracao: { label: 'Prioridade: Tração traseira', title: 'A potência está a chegar antes da aderência.', description: 'A traseira perde contacto ou transfere força de forma brusca. O caminho começa no SAG, retorno e posição do corpo.', insights: ['Valida o SAG estático e dinâmico antes dos cliques', 'Observa o retorno em impactos sucessivos', 'Cruza posição do corpo, aceleração e terreno'] },
            dianteira: { label: 'Prioridade: Confiança na dianteira', title: 'A tua frente precisa de comunicar contigo.', description: 'A entrada e o apoio de curva pedem mais leitura. Altura, compressão, retorno e cockpit devem funcionar como um sistema.', insights: ['Avalia altura e distribuição de peso', 'Testa compressão e retorno separadamente', 'Ajusta manetes e guiador para manter mobilidade'] },
            ergonomia: { label: 'Prioridade: Ergonomia e fadiga', title: 'O teu corpo está a absorver o trabalho da moto.', description: 'Arm pump e rigidez não se resolvem apenas com preparação física. Cockpit, postura e suspensão devem libertar o piloto.', insights: ['Ajusta comandos para pilotar de pé sem dobrar os pulsos', 'Reduz tensão nas mãos e antebraços', 'Cruza ergonomia com a resposta aos impactos'] },
        },
    },
    es: {
        seoTitle: 'Diagnóstico Off-Road de Suspensión y Ergonomía | W-Tech',
        seoDescription: 'Descubre en 90 segundos qué ajuste de suspensión y ergonomía debe transformar primero tu pilotaje Off-Road.',
        badge: 'Diagnóstico inmersivo Off-Road', heroTitle: 'Deja de adivinar.', heroHighlight: 'Empieza a sentir la moto.',
        heroDescription: 'En 6 decisiones, identifica qué te quita control, tracción y energía — un diagnóstico 100% dedicado al Motocross y Off-Road.',
        start: 'Iniciar mi diagnóstico', free: '100% gratuito', duration: 'Unos 90 segundos', immediate: 'Resultado inmediato',
        dark: 'Oscuro', light: 'Claro', step: 'Etapa', of: 'de', back: 'Volver',
        transitionEyebrow: 'W-Tech preparando tu resultado',
        transitionLabels: ['Conectando tu estilo de pilotaje', 'Interpretando los síntomas de la moto', 'Organizando tu base de ajuste', 'Cruzando terreno y respuesta de la suspensión', 'Relacionando ergonomía y fatiga', 'Finalizando tu diagnóstico'],
        transitionHint: 'Tu lectura personalizada está casi lista.',
        interactionHint: 'Mueve el cursor para girar la marca en 3D',
        resultEyebrow: 'Tu mapa de evolución', resultTitle: 'El primer cambio no es acelerar más.',
        resultDescription: 'Es hacer que la moto trabaje contigo. Este diagnóstico define el mejor punto de entrada para tu regulación.',
        resultAction: 'Ver mi plan de reglaje',
        formTitle: '¿A dónde enviamos tu plan?',
        formSubtitle: 'Tu diagnóstico queda guardado y el seguimiento llega a tu WhatsApp.',
        formName: 'Tu nombre',
        formPhone: 'WhatsApp con prefijo',
        formNameError: 'Indica tu nombre.',
        formPhoneError: 'Indica un WhatsApp válido con prefijo.',
        formFailure: 'No pudimos guardar tus datos. Revísalos e inténtalo de nuevo.',
        formSending: 'Preparando tu plan...',
        formPrivacy: 'Usamos tus datos solo para enviarte el plan y el seguimiento del curso.',
        resultFootnote: 'A continuación verás la presentación que conecta este diagnóstico con el método completo — y la inscripción abre directamente en el checkout.',
        restart: 'Repetir diagnóstico', interaction: 'Interacción 3D',
        profiles: {
            equilibrio: { label: 'Prioridad: Equilibrio dinámico', title: 'Tu moto cambia demasiado cuando cambia el terreno.', description: 'El conjunto necesita una base repetible: SAG correcto, posición y secuencia de pruebas antes del ajuste fino.', insights: ['Crea una referencia de SAG para tu peso equipado', 'Cambia solo una variable en cada prueba', 'Registra terreno, clics y sensación de la moto'] },
            tracao: { label: 'Prioridad: Tracción trasera', title: 'La potencia está llegando antes que el agarre.', description: 'La trasera pierde contacto o transfiere fuerza bruscamente. El camino empieza por SAG, rebote y posición del cuerpo.', insights: ['Valida SAG estático y dinámico antes de los clics', 'Observa el rebote en impactos sucesivos', 'Conecta posición del cuerpo, aceleración y terreno'] },
            dianteira: { label: 'Prioridad: Confianza delantera', title: 'El tren delantero debe hablar contigo.', description: 'La entrada y apoyo en curva necesitan más lectura. Altura, compresión, rebote y cockpit deben ser un sistema.', insights: ['Evalúa altura y distribución de peso', 'Prueba compresión y rebote por separado', 'Ajusta manetas y manillar para conservar movilidad'] },
            ergonomia: { label: 'Prioridad: Ergonomía y fatiga', title: 'Tu cuerpo está absorbiendo el trabajo de la moto.', description: 'El arm pump y la rigidez no se resuelven solo con físico. Cockpit, postura y suspensión deben liberar al piloto.', insights: ['Ajusta los mandos para pilotar de pie sin doblar las muñecas', 'Reduce tensión en manos y antebrazos', 'Conecta ergonomía con respuesta a impactos'] },
        },
    },
    en: {
        seoTitle: 'Off-Road Suspension & Ergonomics Diagnosis | W-Tech',
        seoDescription: 'Discover in 90 seconds which suspension and ergonomics adjustment should transform your Off-Road riding first.',
        badge: 'Immersive Off-Road diagnosis', heroTitle: 'Stop guessing.', heroHighlight: 'Start feeling the bike.',
        heroDescription: 'In 6 decisions, identify what is taking away control, traction and energy — a diagnosis built 100% for Motocross and Off-Road riding.',
        start: 'Start my diagnosis', free: '100% free', duration: 'About 90 seconds', immediate: 'Instant result',
        dark: 'Dark', light: 'Light', step: 'Step', of: 'of', back: 'Back',
        transitionEyebrow: 'W-Tech preparing your result',
        transitionLabels: ['Connecting your riding style', 'Interpreting the bike symptoms', 'Organizing your setup baseline', 'Matching terrain and suspension response', 'Connecting ergonomics and fatigue', 'Finalizing your diagnosis'],
        transitionHint: 'Your personalized reading is almost ready.',
        interactionHint: 'Move your pointer to spin the brand in 3D',
        resultEyebrow: 'Your progression map', resultTitle: 'The first change is not going faster.',
        resultDescription: 'It is making the bike work with you. This diagnosis defines the best entry point for your tuning.',
        resultAction: 'See my setup plan',
        formTitle: 'Where should we send your plan?',
        formSubtitle: 'Your diagnosis is saved and follow-up arrives on your WhatsApp.',
        formName: 'Your name',
        formPhone: 'WhatsApp with country code',
        formNameError: 'Please enter your name.',
        formPhoneError: 'Please enter a valid WhatsApp number with country code.',
        formFailure: 'We could not save your details. Please check and try again.',
        formSending: 'Preparing your plan...',
        formPrivacy: 'We use your details only to send the plan and course follow-up.',
        resultFootnote: 'Next you will watch the presentation that connects this diagnosis to the complete method — and enrollment opens directly in checkout.',
        restart: 'Restart diagnosis', interaction: '3D interaction',
        profiles: {
            equilibrio: { label: 'Priority: Dynamic balance', title: 'Your bike changes too much when terrain changes.', description: 'The chassis needs a repeatable baseline: correct SAG, rider position and a test sequence before fine tuning.', insights: ['Create a SAG baseline for your fully equipped weight', 'Change only one variable per test', 'Log terrain, clicks and bike feedback'] },
            tracao: { label: 'Priority: Rear traction', title: 'Power is arriving before grip.', description: 'The rear is losing contact or transferring force too abruptly. The path starts with SAG, rebound and body position.', insights: ['Validate static and rider SAG before clicks', 'Watch rebound through repeated impacts', 'Connect body position, throttle and terrain'] },
            dianteira: { label: 'Priority: Front-end confidence', title: 'Your front end needs to talk to you.', description: 'Turn entry and support need clearer feedback. Height, compression, rebound and cockpit must work as one system.', insights: ['Review ride height and weight distribution', 'Test compression and rebound separately', 'Set levers and bars to preserve mobility'] },
            ergonomia: { label: 'Priority: Ergonomics and fatigue', title: 'Your body is absorbing the bike’s work.', description: 'Arm pump and stiffness are not solved by fitness alone. Cockpit, posture and suspension must give the rider freedom.', insights: ['Set controls for standing without bent wrists', 'Reduce hand and forearm tension', 'Connect ergonomics with impact response'] },
        },
    },
};

const getProfile = (answers: Answers): Profile => {
    const scores: Record<Profile, number> = { equilibrio: 1, tracao: 0, dianteira: 0, ergonomia: 0 };
    if (answers.sintoma === 'fadiga') scores.ergonomia += 4;
    if (answers.sintoma === 'frente') scores.dianteira += 4;
    if (answers.sintoma === 'traseira') scores.tracao += 4;
    if (answers.sintoma === 'impacto') scores.equilibrio += 3;
    if (answers.terreno === 'areia') scores.tracao += 2;
    if (answers.terreno === 'saltos') scores.dianteira += 1;
    if (answers.terreno === 'misto') scores.equilibrio += 2;
    if (answers.ergonomia === 'original' || answers.ergonomia === 'arm_pump') scores.ergonomia += 3;
    if (answers.objetivo === 'confianca') scores.dianteira += 3;
    if (answers.objetivo === 'tracao') scores.tracao += 3;
    if (answers.objetivo === 'menos_fadiga') scores.ergonomia += 3;
    if (answers.objetivo === 'consistencia') scores.equilibrio += 3;
    return (Object.entries(scores) as [Profile, number][]).sort((a, b) => b[1] - a[1])[0][0];
};

const buildVslUrl = (theme: QuizTheme, profile: Profile, answers: Answers): string => {
    const destination = theme === 'light'
        ? '/curso-suspensao-piloto-vsl-clara'
        : '/curso-suspensao-piloto-vsl';
    if (typeof window === 'undefined') return destination;
    const params = new URLSearchParams(window.location.search);
    params.set('from', 'quiz');
    params.set('src', `quiz_${theme}`);
    params.set('quiz_theme', theme);
    params.set('quiz_profile', profile);
    params.set('quiz_discipline', answers.modalidade || 'offroad');
    params.set('utm_content', `quiz_${theme}_${profile}`);
    if (!params.has('utm_source')) params.set('utm_source', 'quiz');
    if (!params.has('utm_medium')) params.set('utm_medium', 'diagnostico');
    return `${destination}?${params.toString()}`;
};

const WTechLogo3D: React.FC<{
    light: boolean;
    interactive?: boolean;
    label?: string;
}> = ({ light, interactive = false, label = 'Logo W-Tech em 3D' }) => {
    const prefersReduced = useReducedMotion();
    const depthLayers = Array.from({ length: 9 });
    // Quando o painel é interativo, o cursor assume o comando da inclinação e a
    // animação em loop só volta a rodar depois que o ponteiro sai da área.
    const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive || prefersReduced) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: -y * 22, y: x * 34 });
    };

    return (
        <div
            className={`relative mx-auto w-full select-none overflow-hidden rounded-[2rem] ${
                interactive ? 'h-[270px] sm:h-[320px]' : 'h-[260px] max-w-lg sm:h-[300px]'
            }`}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setTilt(null)}
            role="img"
            aria-label={label}
        >
            <div className={`absolute inset-0 ${light ? 'bg-[radial-gradient(circle_at_50%_48%,rgba(181,33,31,.16),transparent_46%)]' : 'bg-[radial-gradient(circle_at_50%_48%,rgba(215,173,79,.13),transparent_48%)]'}`} />
            <motion.div
                className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d7ad4f]/25"
                animate={prefersReduced ? undefined : { rotate: 360, scale: [0.94, 1.06, 0.94] }}
                transition={{ rotate: { duration: 7, repeat: Infinity, ease: 'linear' }, scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
            >
                <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#d7ad4f] shadow-[0_0_18px_rgba(215,173,79,.9)]" />
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#b5211f] shadow-[0_0_18px_rgba(181,33,31,.9)]" />
            </motion.div>

            <div className="absolute inset-0 flex items-center justify-center [perspective:1100px]">
                <motion.div
                    className="relative flex h-32 w-[88%] max-w-[390px] items-center justify-center [transform-style:preserve-3d]"
                    animate={
                        tilt
                            ? { rotateX: tilt.x, rotateY: tilt.y, y: 0 }
                            : prefersReduced
                                ? { rotateX: 0, rotateY: 0 }
                                : { rotateX: [7, -4, 7], rotateY: [-17, 17, -17], y: [0, -7, 0] }
                    }
                    transition={
                        tilt
                            ? { type: 'spring', stiffness: 140, damping: 18 }
                            : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
                    }
                >
                    {depthLayers.map((_, layer) => (
                        <img
                            key={layer}
                            src="/logo-wtech-branca.webp"
                            alt=""
                            aria-hidden="true"
                            className="absolute w-full opacity-35"
                            style={{
                                filter: 'brightness(.16) saturate(.8)',
                                transform: `translate3d(${9 - layer}px, ${(9 - layer) * 0.65}px, ${-layer * 4}px)`,
                            }}
                        />
                    ))}
                    <div className="absolute inset-x-0 top-1/2 h-28 -translate-y-1/2 rounded-[1.7rem] border border-white/10 bg-gradient-to-br from-[#171717]/96 via-black/95 to-[#260909]/92 shadow-[0_28px_65px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.1)] [transform:translateZ(12px)]" />
                    <img
                        src="/logo-wtech-branca.webp"
                        alt="W-Tech Suspension"
                        className="relative z-10 w-[88%] drop-shadow-[0_12px_20px_rgba(0,0,0,.65)] [transform:translateZ(28px)]"
                    />
                    <motion.span
                        className="pointer-events-none absolute inset-y-3 z-20 w-16 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/35 to-transparent blur-sm [transform:translateZ(34px)]"
                        animate={prefersReduced ? { left: '110%' } : { left: ['-25%', '110%'] }}
                        transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 0.55, ease: 'easeInOut' }}
                    />
                </motion.div>
            </div>
            <div className="absolute inset-x-[20%] bottom-8 h-5 rounded-[100%] bg-black/45 blur-xl" />
        </div>
    );
};

const ThemeLinks: React.FC<{ theme: QuizTheme; copy: QuizCopy }> = ({ theme, copy }) => {
    const query = typeof window === 'undefined' ? '' : window.location.search;
    return (
        <div className="inline-flex rounded-full border border-current/10 bg-current/[0.035] p-1 text-[10px] font-black uppercase tracking-[0.12em]">
            <a
                href={`/quiz-suspensao${query}`}
                aria-current={theme === 'dark' ? 'page' : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors ${theme === 'dark' ? 'bg-[#171714] text-white shadow-sm' : 'opacity-55 hover:opacity-100'}`}
            >
                {copy.dark}
            </a>
            <a
                href={`/quiz-suspensao-clara${query}`}
                aria-current={theme === 'light' ? 'page' : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors ${theme === 'light' ? 'bg-white text-[#171714] shadow-sm' : 'opacity-55 hover:opacity-100'}`}
            >
                {copy.light}
            </a>
        </div>
    );
};

const QuizFallback: React.FC<{ light: boolean }> = ({ light }) => (
    <div className={`flex min-h-screen items-center justify-center px-6 text-center ${light ? 'bg-[#f5f1e8] text-[#171714]' : 'bg-[#050505] text-white'}`}>
        <div className="max-w-md">
            <ShieldCheck className="mx-auto mb-5 text-[#d7ad4f]" size={42} />
            <h1 className="text-2xl font-black uppercase">A experiência pode ser reiniciada com segurança.</h1>
            <button className="mt-7 rounded-xl bg-[#d7ad4f] px-7 py-4 font-black uppercase text-black" onClick={() => window.location.reload()}>
                Reiniciar diagnóstico
            </button>
        </div>
    </div>
);

const QuizSuspensao: React.FC<{ theme?: QuizTheme }> = ({ theme = 'dark' }) => {
    const light = theme === 'light';
    const { currentLang } = useLanguage();
    const prefersReduced = useReducedMotion();
    const copy = useMemo<QuizCopy>(() => ({ ...COPY[currentLang], steps: createSteps(currentLang) }), [currentLang]);
    const [phase, setPhase] = useState<'welcome' | 'question' | 'transition' | 'result'>('welcome');
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});
    const [selected, setSelected] = useState<string | null>(null);
    const [lead, setLead] = useState({ name: '', phone: '' });
    const [leadLoading, setLeadLoading] = useState(false);
    const [leadError, setLeadError] = useState('');
    const transitionTimer = useRef<number | null>(null);
    const step = copy.steps[index];
    const profile = useMemo(() => getProfile(answers), [answers]);
    const progress = phase === 'result' ? 100 : Math.round((index / copy.steps.length) * 100);

    useEffect(() => {
        captureTrackingParams();
        return () => {
            if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
        };
    }, []);

    useEffect(() => {
        trackEvent('Quiz Off-Road', 'view', theme);
    }, [theme]);

    const start = () => {
        trackEvent('Quiz Off-Road', 'start', theme);
        setPhase('question');
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    };

    const choose = (option: OptionCopy) => {
        if (phase !== 'question') return;
        const nextAnswers = { ...answers, [step.id]: option.id };
        setAnswers(nextAnswers);
        setSelected(option.id);
        trackEvent('Quiz Off-Road', `answer_${step.id}`, option.id);
        window.setTimeout(() => {
            setPhase('transition');
            setSelected(null);
            transitionTimer.current = window.setTimeout(() => {
                if (index >= copy.steps.length - 1) {
                    const resultProfile = getProfile(nextAnswers);
                    trackEvent('Quiz Off-Road', 'result_view', resultProfile);
                    setPhase('result');
                } else {
                    setIndex((value) => value + 1);
                    setPhase('question');
                }
                window.scrollTo({ top: 0, behavior: 'auto' });
            }, prefersReduced ? 350 : 1050);
        }, prefersReduced ? 0 : 220);
    };

    const back = () => {
        if (phase !== 'question') return;
        if (index === 0) {
            setPhase('welcome');
            return;
        }
        setIndex((value) => value - 1);
    };

    const restart = () => {
        setAnswers({});
        setIndex(0);
        setSelected(null);
        setPhase('welcome');
        trackEvent('Quiz Off-Road', 'restart', theme);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // O lead é obrigatório antes da VSL: sem nome e WhatsApp o funil não avança.
    // Falha ao gravar não trava o piloto — registramos o erro e seguimos, porque
    // perder a venda por indisponibilidade do banco é pior que perder o contato.
    const submitLead = async (event: React.FormEvent) => {
        event.preventDefault();
        if (leadLoading) return;

        const name = lead.name.trim();
        const phone = lead.phone.replace(/\D/g, '');
        if (name.length < 2) {
            setLeadError(copy.formNameError);
            return;
        }
        if (phone.length < 10) {
            setLeadError(copy.formPhoneError);
            return;
        }

        setLeadLoading(true);
        setLeadError('');
        trackEvent('Quiz Off-Road', 'lead_submit', `${theme}_${profile}`);

        try {
            const assignedTo = await distributeLead();
            const payload = {
                name,
                phone,
                email: null,
                type: 'Quiz_Suspensao',
                status: 'New',
                context_id: `Quiz Suspensão · ${theme} · ${profile}`,
                tags: ['curso_online_suspensao', 'quiz_suspensao', `perfil_${profile}`],
                assigned_to: assignedTo,
                origin: window.location.href,
                quiz_data: { theme, profile, answers },
                ...getLeadTrackingFields(),
            };

            const { error: insertError } = await supabase.from('SITE_Leads').insert([payload]);
            if (insertError) throw insertError;

            await triggerWebhook('webhook_lead', payload).catch(() => undefined);
            trackEvent('Quiz Off-Road', 'lead_captured', `${theme}_${profile}`);
        } catch (submitError) {
            console.error('Falha ao registrar lead do quiz:', submitError);
            trackEvent('Quiz Off-Road', 'lead_failed', `${theme}_${profile}`);
        }

        goToVsl();
    };

    const goToVsl = () => {
        trackEvent('Quiz Off-Road', 'vsl_click', `${theme}_${profile}`);
        window.location.assign(buildVslUrl(theme, profile, answers));
    };

    const root = light ? 'bg-[#f5f1e8] text-[#171714]' : 'bg-[#050505] text-white';
    const muted = light ? 'text-[#655f54]' : 'text-zinc-400';
    const card = light
        ? 'border-[#d9d0bf] bg-white/75 hover:border-[#b77d16]/55 hover:bg-white'
        : 'border-white/10 bg-white/[0.045] hover:border-[#d7ad4f]/45 hover:bg-white/[0.07]';

    return (
        <ErrorBoundary fallback={<QuizFallback light={light} />}>
            <main className={`min-h-screen overflow-hidden font-sans selection:bg-[#d7ad4f] selection:text-black ${root}`}>
                <SEO title={copy.seoTitle} description={copy.seoDescription} />

                <header className={`relative z-40 border-b px-4 py-3 backdrop-blur-xl sm:px-7 ${light ? 'border-black/10 bg-[#f5f1e8]/88' : 'border-white/10 bg-[#050505]/88'}`}>
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
                        <img src="/logo-wtech-branca.webp" alt="W-Tech" className={`h-6 w-auto sm:h-7 ${light ? 'brightness-0' : ''}`} />
                        <ThemeLinks theme={theme} copy={copy} />
                        <LanguageSwitcher
                            variant={light ? 'light' : 'dark'}
                            compact
                            className="order-3 w-full justify-center sm:order-none sm:w-auto"
                        />
                    </div>
                </header>

                {phase !== 'welcome' && (
                    <div className={`sticky top-0 z-30 border-b backdrop-blur-xl ${light ? 'border-black/10 bg-[#f5f1e8]/92' : 'border-white/10 bg-[#050505]/92'}`}>
                        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
                            <button
                                type="button"
                                onClick={back}
                                disabled={phase !== 'question'}
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-opacity disabled:opacity-25 ${light ? 'border-black/10 bg-white/70' : 'border-white/10 bg-white/5'}`}
                                aria-label={copy.back}
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div className={`h-2 flex-1 overflow-hidden rounded-full ${light ? 'bg-black/10' : 'bg-white/10'}`}>
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-[#b5211f] via-[#dd5730] to-[#d7ad4f]"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: prefersReduced ? 0 : 0.45 }}
                                />
                            </div>
                            <span className="w-14 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#b77d16]">
                                {phase === 'result' ? '100%' : `${index + 1}/${copy.steps.length}`}
                            </span>
                        </div>
                    </div>
                )}

                {phase === 'welcome' && (
                    <section className="relative isolate min-h-[calc(100svh-57px)] overflow-hidden">
                        <img
                            src={light ? '/images/lp-curso/hero-light-premium.webp' : '/hero-desktop-alex.webp'}
                            alt=""
                            aria-hidden="true"
                            fetchPriority="high"
                            className={`absolute inset-0 -z-30 h-full w-full object-cover ${light ? 'object-[62%_center]' : 'object-center'}`}
                        />
                        <div className={`absolute inset-0 -z-20 ${light ? 'bg-gradient-to-r from-[#f8f5ed]/98 via-[#f5f1e8]/92 to-[#f5f1e8]/55' : 'bg-gradient-to-r from-black via-black/88 to-black/45'}`} />
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_40%,rgba(215,173,79,.16),transparent_34%)]" />
                        <div className="mx-auto grid min-h-[calc(100svh-57px)] max-w-6xl items-center gap-6 px-5 py-10 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
                            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-2xl">
                                <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] ${light ? 'border-[#b77d16]/30 bg-white/75 text-[#875d0f]' : 'border-[#d7ad4f]/30 bg-[#d7ad4f]/10 text-[#e6c467]'}`}>
                                    <Sparkles size={14} />
                                    {copy.badge}
                                </div>
                                <h1 className="max-w-3xl text-[2.7rem] font-black uppercase leading-[.88] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                                    {copy.heroTitle}{' '}
                                    <span className="bg-gradient-to-r from-[#d7ad4f] via-[#e69a2f] to-[#b5211f] bg-clip-text text-transparent">
                                        {copy.heroHighlight}
                                    </span>
                                </h1>
                                <p className={`mt-6 max-w-xl text-base font-medium leading-relaxed sm:text-lg ${muted}`}>{copy.heroDescription}</p>
                                <button
                                    type="button"
                                    onClick={start}
                                    className="mt-8 flex min-h-16 w-full max-w-md items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#f0ce6f] to-[#d7ad4f] px-7 text-sm font-black uppercase tracking-[0.11em] text-black shadow-[0_18px_50px_rgba(181,126,22,.28)] transition-transform hover:scale-[1.015] sm:text-base"
                                >
                                    {copy.start}
                                    <ArrowRight size={20} strokeWidth={3} />
                                </button>
                                <div className={`mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-black uppercase tracking-[0.11em] ${muted}`}>
                                    {[copy.free, copy.duration, copy.immediate].map((item) => (
                                        <span key={item} className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#d7ad4f]" />{item}</span>
                                    ))}
                                </div>
                            </motion.div>
                            <div className={`relative hidden rounded-[2.4rem] border backdrop-blur-md lg:block ${light ? 'border-white/70 bg-white/30 shadow-[0_25px_80px_rgba(47,38,21,.18)]' : 'border-white/10 bg-black/25 shadow-[0_25px_80px_rgba(0,0,0,.5)]'}`}>
                                <WTechLogo3D light={light} interactive label={copy.interaction} />
                                <span className={`absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] ${light ? 'border-black/10 bg-white/80 text-[#655f54]' : 'border-white/10 bg-black/70 text-zinc-400'}`}>
                                    {copy.interactionHint}
                                </span>
                            </div>
                        </div>
                    </section>
                )}

                {phase === 'question' && step && (
                    <motion.section
                        key={`${currentLang}-${index}`}
                        initial={{ opacity: 0, x: prefersReduced ? 0 : 28 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative mx-auto grid min-h-[calc(100svh-118px)] max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_.75fr] lg:px-8"
                    >
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#b77d16]">{step.eyebrow}</span>
                            <h1 className="mt-3 max-w-3xl text-3xl font-black uppercase leading-[.98] tracking-[-0.035em] sm:text-5xl">{step.title}</h1>
                            <p className={`mt-3 max-w-xl text-sm leading-relaxed sm:text-base ${muted}`}>{step.hint}</p>
                            <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                {step.options.map((option, optionIndex) => {
                                    const Icon = option.icon;
                                    const isSelected = selected === option.id;
                                    return (
                                        <motion.button
                                            key={option.id}
                                            type="button"
                                            data-testid="quiz-option"
                                            initial={{ opacity: 0, y: prefersReduced ? 0 : 14 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: prefersReduced ? 0 : optionIndex * 0.045 }}
                                            onClick={() => choose(option)}
                                            className={`group flex min-h-[106px] items-center gap-4 rounded-2xl border p-4 text-left transition-all sm:p-5 ${isSelected ? 'border-[#d7ad4f] bg-[#d7ad4f]/12 shadow-[0_0_30px_rgba(215,173,79,.16)]' : card}`}
                                        >
                                            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-[#d7ad4f] text-black' : light ? 'bg-[#f2ead9] text-[#9b6911]' : 'bg-[#d7ad4f]/10 text-[#d7ad4f]'}`}>
                                                <Icon size={23} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-black sm:text-base">{option.label}</span>
                                                <span className={`mt-1 block text-xs leading-snug ${muted}`}>{option.description}</span>
                                            </span>
                                            <ChevronRight size={18} className={`shrink-0 transition-transform group-hover:translate-x-1 ${light ? 'text-[#a89f8f]' : 'text-zinc-600'}`} />
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className={`relative hidden rounded-[2.4rem] border lg:block ${light ? 'border-[#d9d0bf] bg-white/55' : 'border-white/10 bg-white/[0.025]'}`}>
                            <WTechLogo3D light={light} label={copy.interaction} />
                            <div className={`absolute inset-x-6 bottom-5 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.15em] ${muted}`}>
                                <span>{copy.interaction}</span>
                                <span>{copy.step} {index + 1} {copy.of} {copy.steps.length}</span>
                            </div>
                        </div>
                    </motion.section>
                )}

                {phase === 'transition' && (
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex min-h-[calc(100svh-118px)] items-center justify-center px-5 py-8 text-center"
                    >
                        <div className="w-full max-w-xl">
                            <span className="text-[10px] font-black uppercase tracking-[0.26em] text-[#b77d16]">{copy.transitionEyebrow}</span>
                            <WTechLogo3D light={light} />
                            <h1 className="text-2xl font-black uppercase tracking-[-0.025em] sm:text-4xl">{copy.transitionLabels[index]}</h1>
                            <div className={`mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full ${light ? 'bg-black/10' : 'bg-white/10'}`}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: prefersReduced ? 0.3 : 0.95, ease: 'easeInOut' }}
                                    className="h-full bg-gradient-to-r from-[#b5211f] to-[#d7ad4f]"
                                />
                            </div>
                            <p className={`mt-4 text-xs ${muted}`}>{copy.transitionHint}</p>
                        </div>
                    </motion.section>
                )}

                {phase === 'result' && (
                    <motion.section
                        initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative isolate min-h-[calc(100svh-118px)] overflow-hidden px-5 py-10 sm:py-16"
                    >
                        <div className="absolute inset-0 -z-20">
                            <img src="/images/lp-curso/light-vsl-clicker-adjustment.webp" alt="" className="h-full w-full object-cover object-center" />
                            <div className={`absolute inset-0 ${light ? 'bg-[#f5f1e8]/94' : 'bg-black/90'}`} />
                        </div>
                        <div className="mx-auto max-w-4xl">
                            <div className="text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#b77d16]">{copy.resultEyebrow}</span>
                                <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black uppercase leading-[.95] tracking-[-0.04em] sm:text-5xl">{copy.resultTitle}</h1>
                                <p className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${muted}`}>{copy.resultDescription}</p>
                            </div>

                            <div className={`mt-9 overflow-hidden rounded-[2rem] border shadow-2xl ${light ? 'border-white bg-white/88 shadow-[#6d5524]/15' : 'border-white/10 bg-[#0d0d0d]/90 shadow-black/50'}`}>
                                <div className="h-1.5 bg-gradient-to-r from-[#b5211f] via-[#e15a31] to-[#d7ad4f]" />
                                <div className="p-6 sm:p-9">
                                    <span className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] ${light ? 'border-[#b77d16]/25 bg-[#f4ead7] text-[#875d0f]' : 'border-[#d7ad4f]/25 bg-[#d7ad4f]/10 text-[#e4c46d]'}`}>
                                        {copy.profiles[profile].label}
                                    </span>
                                    <h2 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">{copy.profiles[profile].title}</h2>
                                    <p className={`mt-3 max-w-3xl text-sm leading-relaxed sm:text-base ${muted}`}>{copy.profiles[profile].description}</p>
                                    <div className="mt-7 grid gap-3 md:grid-cols-3">
                                        {copy.profiles[profile].insights.map((insight, insightIndex) => (
                                            <div key={insight} className={`rounded-2xl border p-4 ${light ? 'border-[#e0d8c9] bg-[#faf8f3]' : 'border-white/10 bg-white/[0.035]'}`}>
                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7ad4f] text-xs font-black text-black">0{insightIndex + 1}</span>
                                                <p className="mt-3 text-sm font-bold leading-snug">{insight}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mx-auto mt-8 max-w-2xl text-center">
                                <form
                                    onSubmit={submitLead}
                                    className={`rounded-[1.7rem] border p-5 text-left sm:p-7 ${light ? 'border-[#e0d8c9] bg-white/85' : 'border-white/10 bg-white/[0.04]'}`}
                                >
                                    <h3 className="text-center text-lg font-black uppercase tracking-[-0.02em] sm:text-xl">{copy.formTitle}</h3>
                                    <p className={`mt-2 text-center text-xs leading-relaxed sm:text-sm ${muted}`}>{copy.formSubtitle}</p>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="sr-only">{copy.formName}</span>
                                            <input
                                                type="text"
                                                name="name"
                                                autoComplete="name"
                                                required
                                                value={lead.name}
                                                onChange={(event) => setLead((value) => ({ ...value, name: event.target.value }))}
                                                placeholder={copy.formName}
                                                className={`min-h-14 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:border-[#d7ad4f] ${light ? 'border-[#d9d0bf] bg-white text-[#171714] placeholder:text-[#9a927f]' : 'border-white/12 bg-black/45 text-white placeholder:text-zinc-500'}`}
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="sr-only">{copy.formPhone}</span>
                                            <input
                                                type="tel"
                                                name="phone"
                                                inputMode="tel"
                                                autoComplete="tel"
                                                required
                                                value={lead.phone}
                                                onChange={(event) => setLead((value) => ({ ...value, phone: event.target.value }))}
                                                placeholder={copy.formPhone}
                                                className={`min-h-14 w-full rounded-xl border px-4 text-sm font-semibold outline-none transition focus:border-[#d7ad4f] ${light ? 'border-[#d9d0bf] bg-white text-[#171714] placeholder:text-[#9a927f]' : 'border-white/12 bg-black/45 text-white placeholder:text-zinc-500'}`}
                                            />
                                        </label>
                                    </div>

                                    {leadError && (
                                        <p role="alert" className="mt-3 text-center text-xs font-bold text-[#e0564f]">{leadError}</p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={leadLoading}
                                        className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#f0ce6f] to-[#d7ad4f] px-6 text-sm font-black uppercase tracking-[0.1em] text-black shadow-[0_18px_55px_rgba(181,126,22,.25)] transition-transform hover:scale-[1.012] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 sm:text-base"
                                    >
                                        {leadLoading ? copy.formSending : copy.resultAction}
                                        {!leadLoading && <ArrowRight size={20} strokeWidth={3} />}
                                    </button>

                                    <p className={`mt-3 text-center text-[11px] leading-relaxed ${muted}`}>{copy.formPrivacy}</p>
                                </form>
                                <p className={`mt-4 text-xs leading-relaxed ${muted}`}>{copy.resultFootnote}</p>
                                <button type="button" onClick={restart} className={`mt-5 text-xs font-bold underline underline-offset-4 ${muted}`}>
                                    {copy.restart}
                                </button>
                            </div>
                        </div>
                    </motion.section>
                )}
            </main>
        </ErrorBoundary>
    );
};

export default QuizSuspensao;
