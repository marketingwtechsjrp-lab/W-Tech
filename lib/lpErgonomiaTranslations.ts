export type LPLanguage = 'pt-PT' | 'es' | 'en' | 'pt-BR';

export interface LPTranslation {
  langName: string;
  flag: string;
  currency: 'EUR' | 'BRL';
  symbol: string;
  topBanner: {
    badge: string;
    text: string;
  };
  hero: {
    badge: string;
    titlePart1: string;
    titleHighlight: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badges: {
      students: string;
      rating: string;
      online: string;
    };
  };
  vsl: {
    label: string;
    titlePart1: string;
    titleHighlight: string;
  };
  profiles: {
    label: string;
    titlePart1: string;
    titleHighlight: string;
    desc: string;
    items: Array<{
      tag: string;
      title: string;
      pain: string;
    }>;
  };
  concepts: {
    label: string;
    titlePart1: string;
    titleHighlight: string;
    desc: string;
    boxText: string;
    items: Array<{
      title: string;
      desc: string;
    }>;
  };
  modules: {
    label: string;
    titlePart1: string;
    titleHighlight: string;
    cta: string;
    items: Array<{
      num: string;
      title: string;
      desc: string;
      aulas: number;
    }>;
  };
  instructor: {
    tag: string;
    name: string;
    lastName: string;
    bio: string;
    bullets: string[];
  };
  faq: {
    label: string;
    titlePart1: string;
    titleHighlight: string;
    items: Array<{ q: string; a: string }>;
  };
  offer: {
    badge: string;
    title: string;
    sub: string;
    strike: string;
    priceMain: string;
    priceAlt: string;
    cta: string;
    footnote: string;
  };
  buyers: Array<{ name: string; role: string; city: string }>;
}

export const lpTranslations: Record<LPLanguage, LPTranslation> = {
  'pt-PT': {
    langName: 'Português (PT)',
    flag: '🇵🇹',
    currency: 'EUR',
    symbol: '€',
    topBanner: {
      badge: 'Preço de Lançamento Ativo',
      text: 'Válido por tempo limitado',
    },
    hero: {
      badge: 'Novo Curso W-Tech Suspensões Europa',
      titlePart1: 'O Único Curso Que Precisas Para ',
      titleHighlight: 'Acertar a Tua Mota',
      subtitle: 'Chega de braços pesados e falta de performance. Aprende do zero a regular SAG, cliques, geometria e hidráulica de qualquer mota Off-Road.',
      ctaPrimary: 'Garantir a Minha Vaga Agora',
      ctaSecondary: 'Ver Detalhes',
      badges: {
        students: '+3.000 Alunos Treinados',
        rating: '4.9/5 Avaliação Geral',
        online: '100% Online e Prático',
      },
    },
    vsl: {
      label: 'Confere Clicando Abaixo',
      titlePart1: 'Entende Como o ',
      titleHighlight: 'Curso Funciona',
    },
    profiles: {
      label: 'O Teu Perfil',
      titlePart1: 'Não importa se ',
      titleHighlight: 'és iniciante',
      desc: 'Criámos metodologias precisas para aprenderes do básico aos ajustes avançados da forma certa.',
      items: [
        {
          tag: 'Para Todo Piloto',
          title: 'Piloto',
          pain: 'Os teus braços cansam rápido, sentes falta de performance, tração e equilíbrio. Isso cansa-te rápido — não é normal. Este curso é o guia definitivo para o acerto da tua mota.',
        },
        {
          tag: 'Trilha - Off Road',
          title: 'Enduro / Off-Road',
          pain: 'A tua mota perde tração nas subidas ou salta nos buracos? Não é falta de preparação física — a suspensão está ajustada incorretamente para o teu nível.',
        },
        {
          tag: 'Serviço Nobre',
          title: 'Mecânico / Preparador',
          pain: 'Eleva o teu nível com informações técnicas para realizar o acerto completo nas motas dos teus clientes, cobrando mais pelo serviço diferenciado.',
        },
        {
          tag: 'Diferencial',
          title: 'Dono de Oficina',
          pain: 'Os teus clientes pedem ajustes que a equipa não sabe resolver. Para de perder serviço para oficinas especializadas em Off-Road.',
        },
      ],
    },
    concepts: {
      label: 'O Segredo',
      titlePart1: 'O que faz o ',
      titleHighlight: 'Acerto Perfeito?',
      desc: 'Não adianta gastar com motor se a suspensão não copia o terreno, tirando a tua tração e aumentando a tua fadiga no guiador.',
      boxText: 'Quando molas, SAG, cliques e pneus trabalham em conjunto, a mota não espalha. Ganhas confiança e usas todo o potencial da máquina.',
      items: [
        { title: 'O SAG', desc: 'Ajuste da folga da suspensão. Com o primeiro terço preservado, garantes equilíbrio e segurança — o ponto de partida obrigatório.' },
        { title: 'Molas', desc: 'O item mais importante. Sustenta o peso equilibrando perfeitamente a absorção e o retorno na pista.' },
        { title: 'Ergonomia', desc: 'A mota moldada ao teu corpo. Altura do guiador, manetes e pousa-pés — a tua integração perfeita com a máquina.' },
        { title: 'Pneus e Tração', desc: 'Onde a suspensão começa. A pressão e a escolha do pneu são essenciais para ditar todo o comportamento da mota.' },
      ],
    },
    modules: {
      label: 'Conteúdo do Curso',
      titlePart1: '11 Módulos ',
      titleHighlight: '+ Bónus',
      cta: 'Ver Todos os Módulos Agora',
      items: [
        { num: '01', title: 'Boas-Vindas ao Curso', desc: 'Apresentação e visão geral do método', aulas: 4 },
        { num: '02', title: 'Ergonomia', desc: 'Guiador, manetes, pedal e mudança', aulas: 5 },
        { num: '03', title: 'Equilíbrio', desc: 'Verificação antes de todo o ajuste', aulas: 1 },
        { num: '04', title: 'Molas', desc: 'Rigidez, taxa e escolha correta', aulas: 1 },
        { num: '05', title: 'O SAG', desc: 'Medição e ajuste do zero', aulas: 2 },
        { num: '06', title: 'Óleo e Viscosidades', desc: 'A hidráulica que controla a dinâmica', aulas: 1 },
        { num: '07', title: 'Os Cliques', desc: 'Compressão e retorno: o que fazem', aulas: 2 },
        { num: '08', title: 'Eixo Dianteiro', desc: 'Bengalas e a montagem livre de torção', aulas: 2 },
        { num: '09', title: 'Pneus e Tração', desc: 'Pressão correta e PSI ideal', aulas: 2 },
        { num: '10', title: 'Relação e Corrente', desc: 'Ajustes que multiplicam a tua força', aulas: 2 },
        { num: '11', title: 'Kits e Ferramentas', desc: 'O setup da tua bancada profissional', aulas: 1 },
      ],
    },
    instructor: {
      tag: 'Instrutor Principal',
      name: 'Alex',
      lastName: 'Crepaldi',
      bio: 'Fundador da W-Tech Suspensões, é a maior referência em diagnósticos de suspensão Off-Road. Durante anos forjou metodologia técnica e agora disponibiliza para ti tudo de forma enxuta e prática.',
      bullets: [
        'Consultor Dinâmico de Competições Internacionais',
        'Mais de 3.000 profissionais e pilotos treinados',
        'Eleva a tua técnica de afinação para alta performance',
      ],
    },
    faq: {
      label: 'Dúvidas Frequentes',
      titlePart1: 'Tens alguma ',
      titleHighlight: 'dúvida?',
      items: [
        { q: 'Preciso de ter experiência avançada para iniciar o curso?', a: 'Não. O curso foi estruturado desde a teoria básica até aos cliques avançados. Vais aprender tudo do mais absoluto zero.' },
        { q: 'Como terei acesso após o pagamento?', a: 'O teu acesso é imediato logo após a aprovação no cartão ou MB WAY. O link chegará diretamente ao teu e-mail.' },
        { q: 'O curso oferece certificado de conclusão?', a: 'Sim. Terás um certificado oficial da W-Tech documentando a tua capacidade de regular suspensões Off-Road.' },
        { q: 'Serve para motas Nacionais e Importadas?', a: 'Sim. As teorias de SAG, molas, hidráulica e retorno aplicam-se a 100% das motas off-road (KTM, Yamaha, Honda, Husqvarna, GasGas, etc.).' },
      ],
    },
    offer: {
      badge: 'Oferta Especial de Lançamento Europa',
      title: 'O Curso Completo + Bónus',
      sub: 'Mais de 150 € em Planilhas e Material Complementar Grátis.',
      strike: 'De 179 € por',
      priceMain: '59 €',
      priceAlt: 'Pagamento único · sem renovação',
      cta: 'Quero a Minha Vaga Agora',
      footnote: 'Acesso libertado automaticamente no teu e-mail.',
    },
    buyers: [
      { name: 'Gonçalo M.', role: 'Piloto Enduro', city: 'Porto, Portugal' },
      { name: 'Diogo S.', role: 'Mecânico', city: 'Lisboa, Portugal' },
      { name: 'Rui P.', role: 'Piloto de Trilha', city: 'Braga, Portugal' },
      { name: 'Nuno A.', role: 'Dono de Oficina', city: 'Coimbra, Portugal' },
    ],
  },

  'es': {
    langName: 'Español (ES)',
    flag: '🇪🇸',
    currency: 'EUR',
    symbol: '€',
    topBanner: {
      badge: 'Precio de Lanzamiento Activo',
      text: 'Válido por tiempo limitado',
    },
    hero: {
      badge: 'Nuevo Curso W-Tech Suspensiones',
      titlePart1: 'El Único Curso Que Necesitas Para ',
      titleHighlight: 'Ajustar Tu Moto',
      subtitle: 'Basta de brazos cansados y falta de rendimiento. Aprende desde cero a ajustar SAG, clics, geometría e hidráulica de cualquier moto Off-Road.',
      ctaPrimary: 'Asegurar Mi Plaza Ahora',
      ctaSecondary: 'Ver Detalles',
      badges: {
        students: '+3.000 Alumnos Formados',
        rating: '4.9/5 Valoración General',
        online: '100% Online y Práctico',
      },
    },
    vsl: {
      label: 'Haz Clic Abajo Para Ver',
      titlePart1: 'Entiende Cómo ',
      titleHighlight: 'Funciona el Curso',
    },
    profiles: {
      label: 'Tu Perfil',
      titlePart1: 'No importa si ',
      titleHighlight: 'eres principiante',
      desc: 'Diseñamos metodologías precisas para que aprendas desde lo básico hasta los ajustes avanzados correctamente.',
      items: [
        {
          tag: 'Para Todo Piloto',
          title: 'Piloto',
          pain: 'Tus brazos se fatigan rápido, sientes falta de tracción y equilibrio. No es normal. Este curso es la guía definitiva para la puesta a punto de tu moto.',
        },
        {
          tag: 'Enduro / Off-Road',
          title: 'Piloto Off-Road',
          pain: '¿Tu moto pierde tracción en subidas o rebota en baches? No es falta de estado físico — la suspensión no está ajustada a tu peso y nivel.',
        },
        {
          tag: 'Servicio Premium',
          title: 'Mecánico / Preparador',
          pain: 'Eleva tu nivel técnico para realizar la puesta a punto completa en las motos de tus clientes, cobrando más por un servicio especializado.',
        },
        {
          tag: 'Diferencial',
          title: 'Dueño de Taller',
          pain: 'Tus clientes piden ajustes que tu equipo no sabe resolver. Deja de perder clientes frente a talleres especializados.',
        },
      ],
    },
    concepts: {
      label: 'El Secreto',
      titlePart1: '¿Qué logra el ',
      titleHighlight: 'Ajuste Perfecto?',
      desc: 'No sirve de nada invertir en motor si la suspensión no copia el terreno, restando tracción y aumentando la fatiga en el manillar.',
      boxText: 'Cuando muelles, SAG, clics y neumáticos trabajan en conjunto, la moto no se desplaza. Ganas confianza y aprovechas todo el potencial.',
      items: [
        { title: 'El SAG', desc: 'Ajuste de la holgura de suspensión. Preservando el primer tercio, garantizas equilibrio y seguridad.' },
        { title: 'Muelles / Resortes', desc: 'El componente clave. Sostiene el peso equilibrando absorción y rebote en la pista.' },
        { title: 'Ergonomía', desc: 'La moto moldeada a tu cuerpo. Altura del manillar, manetas y estriberas — tu integración total.' },
        { title: 'Neumáticos y Tracción', desc: 'Donde empieza la suspensión. La presión e elección del neumático dictan el comportamiento.' },
      ],
    },
    modules: {
      label: 'Contenido del Curso',
      titlePart1: '11 Módulos ',
      titleHighlight: '+ Bonos',
      cta: 'Ver Todos los Módulos Ahora',
      items: [
        { num: '01', title: 'Bienvenida al Curso', desc: 'Presentación y visión general del método', aulas: 4 },
        { num: '02', title: 'Ergonomía', desc: 'Manillar, manetas, pedales y cambios', aulas: 5 },
        { num: '03', title: 'Equilibrio', desc: 'Comprobación antes de cada ajuste', aulas: 1 },
        { num: '04', title: 'Muelles', desc: 'Rigidez, tasa y elección correcta', aulas: 1 },
        { num: '05', title: 'El SAG', desc: 'Medición y ajuste desde cero', aulas: 2 },
        { num: '06', title: 'Aceite y Viscosidades', desc: 'La hidráulica que controla la dinámica', aulas: 1 },
        { num: '07', title: 'Los Clics', desc: 'Compresión y rebote: cómo actúan', aulas: 2 },
        { num: '08', title: 'Eje Delantero', desc: 'Horquillas y montaje libre de torsión', aulas: 2 },
        { num: '09', title: 'Neumáticos y Tracción', desc: 'Presión correcta y PSI ideal', aulas: 2 },
        { num: '10', title: 'Transmisión y Cadena', desc: 'Ajustes que multiplican tu fuerza', aulas: 2 },
        { num: '11', title: 'Kits y Herramientas', desc: 'El equipamiento de tu banco profesional', aulas: 1 },
      ],
    },
    instructor: {
      tag: 'Instructor Principal',
      name: 'Alex',
      lastName: 'Crepaldi',
      bio: 'Fundador de W-Tech Suspensiones, es la mayor referencia en diagnóstico de suspensiones Off-Road. Ha creado una metodología técnica práctica y directa.',
      bullets: [
        'Consultor Dinámico en Competiciones Internacionales',
        'Más de 3.000 profesionales y pilotos capacitados',
        'Lleva tu técnica de ajuste al máximo rendimiento',
      ],
    },
    faq: {
      label: 'Preguntas Frecuentes',
      titlePart1: '¿Tienes alguna ',
      titleHighlight: 'duda?',
      items: [
        { q: '¿Necesito experiencia avanzada para iniciar?', a: 'No. El curso está diseñado desde los conceptos básicos hasta los ajustes avanzados de clics.' },
        { q: '¿Cómo accedo tras el pago?', a: 'El acceso es inmediato tras la aprobación de tu tarjeta. Recibirás el enlace por e-mail.' },
        { q: '¿El curso incluye certificado?', a: 'Sí. Obtendrás un certificado oficial de W-Tech que acredita tu capacidad para ajustar suspensiones Off-Road.' },
        { q: '¿Sirve para marcas Japonesas y Europeas?', a: 'Sí. El método de SAG, muelles e hidráulica aplica al 100% de motos Off-Road (KTM, Yamaha, Honda, Husqvarna, etc.).' },
      ],
    },
    offer: {
      badge: 'Oferta Especial de Lanzamiento',
      title: 'El Curso Completo + Bonos',
      sub: 'Más de 150 € en Materiales Complementarios Gratis.',
      strike: 'De 179 € por',
      priceMain: '59 €',
      priceAlt: 'Pago único · sin renovación',
      cta: 'Quiero Mi Plaza Ahora',
      footnote: 'Acceso enviado automáticamente a tu e-mail.',
    },
    buyers: [
      { name: 'Javier R.', role: 'Piloto Enduro', city: 'Madrid, España' },
      { name: 'Carlos M.', role: 'Mecánico', city: 'Barcelona, España' },
      { name: 'Mateo G.', role: 'Piloto Off-Road', city: 'Valencia, España' },
      { name: 'Lucas T.', role: 'Taller Especializado', city: 'Sevilla, España' },
    ],
  },

  'en': {
    langName: 'English (EN)',
    flag: '🇬🇧',
    currency: 'EUR',
    symbol: '€',
    topBanner: {
      badge: 'Active Launch Price',
      text: 'Valid for a limited time',
    },
    hero: {
      badge: 'New W-Tech Suspensions Course',
      titlePart1: 'The Only Course You Need To ',
      titleHighlight: 'Set Up Your Bike',
      subtitle: 'No more arm pump and poor handling. Learn from scratch how to adjust SAG, clicks, geometry and hydraulics on any Off-Road motorcycle.',
      ctaPrimary: 'Secure My Spot Now',
      ctaSecondary: 'View Details',
      badges: {
        students: '+3,000 Trained Students',
        rating: '4.9/5 Overall Rating',
        online: '100% Online & Practical',
      },
    },
    vsl: {
      label: 'Click Below to Watch',
      titlePart1: 'Understand How ',
      titleHighlight: 'The Course Works',
    },
    profiles: {
      label: 'Your Profile',
      titlePart1: 'No matter if ',
      titleHighlight: 'you are a beginner',
      desc: 'We created precise step-by-step methodologies for you to master basic to advanced suspension tuning.',
      items: [
        {
          tag: 'For Every Rider',
          title: 'Rider',
          pain: 'Your arms tire quickly, lacking traction and balance. This is not normal. This course is the ultimate setup guide for your bike.',
        },
        {
          tag: 'Enduro / Off-Road',
          title: 'Off-Road Rider',
          pain: 'Does your bike lose traction on climbs or bounce violently over bumps? It is not your fitness — your suspension is wrongly set.',
        },
        {
          tag: 'Pro Service',
          title: 'Mechanic / Tuner',
          pain: 'Elevate your technical skills to perform complete setups for your clients, charging premium rates for specialized service.',
        },
        {
          tag: 'Workshop Edge',
          title: 'Shop Owner',
          pain: 'Clients ask for suspension tuning your staff cannot solve. Stop losing business to specialized off-road shops.',
        },
      ],
    },
    concepts: {
      label: 'The Secret',
      titlePart1: 'What Makes The ',
      titleHighlight: 'Perfect Setup?',
      desc: 'Spending on engine power is useless if your suspension cannot trace the terrain, robbing traction and multiplying fatigue.',
      boxText: 'When springs, SAG, clickers, and tire pressure work in harmony, the bike stays planted. You gain confidence and ride faster with less effort.',
      items: [
        { title: 'The SAG', desc: 'Suspension sag measurement. Preserving the first third ensures balance and safety — the essential starting point.' },
        { title: 'Springs', desc: 'The core component. Supports weight while balancing absorption and rebound on rough tracks.' },
        { title: 'Ergonomics', desc: 'Tailoring the bike to your body. Bar height, levers and footpegs — your seamless machine integration.' },
        { title: 'Tires & Traction', desc: 'Where suspension meets the ground. Tire pressure and compound dictate front and rear end behavior.' },
      ],
    },
    modules: {
      label: 'Course Content',
      titlePart1: '11 Modules ',
      titleHighlight: '+ Bonuses',
      cta: 'View All Modules Now',
      items: [
        { num: '01', title: 'Welcome to the Course', desc: 'Overview and method presentation', aulas: 4 },
        { num: '02', title: 'Ergonomics', desc: 'Handlebars, levers, pedals, and shifters', aulas: 5 },
        { num: '03', title: 'Balance & Alignment', desc: 'Pre-adjustment check procedure', aulas: 1 },
        { num: '04', title: 'Spring Rates', desc: 'Stiffness, rates, and selecting the right spring', aulas: 1 },
        { num: '05', title: 'The SAG Setup', desc: 'Step-by-step measurement and adjustment', aulas: 2 },
        { num: '06', title: 'Oil & Viscosities', desc: 'Hydraulics controlling dynamic motion', aulas: 1 },
        { num: '07', title: 'Clicker Tuning', desc: 'Compression and rebound clickers explained', aulas: 2 },
        { num: '08', title: 'Front Axle & Forks', desc: 'Fork leg alignment and twist-free assembly', aulas: 2 },
        { num: '09', title: 'Tires & Traction', desc: 'Optimal tire pressure and ideal PSI setup', aulas: 2 },
        { num: '10', title: 'Drive & Chain Tension', desc: 'Adjustments multiplying rear wheel drive', aulas: 2 },
        { num: '11', title: 'Kits & Tools', desc: 'Professional workbench setup guide', aulas: 1 },
      ],
    },
    instructor: {
      tag: 'Head Instructor',
      name: 'Alex',
      lastName: 'Crepaldi',
      bio: 'Founder of W-Tech Suspensions, he is a leading international authority in Off-Road suspension diagnostics with over 20 years of hands-on experience.',
      bullets: [
        'Dynamic Consultant for International Competitions',
        'Trained over 3,000 mechanics and professional riders',
        'Elevates your suspension tuning to championship performance',
      ],
    },
    faq: {
      label: 'Frequently Asked Questions',
      titlePart1: 'Do You Have Any ',
      titleHighlight: 'Questions?',
      items: [
        { q: 'Do I need advanced experience to take this course?', a: 'No. The course builds step-by-step from basic theory to advanced clicker tuning for any skill level.' },
        { q: 'How do I access the course after payment?', a: 'Access is instant immediately after card processing. Login details are delivered to your email.' },
        { q: 'Does the course include a certificate?', a: 'Yes. You receive an official W-Tech certificate validating your Off-Road suspension setup skills.' },
        { q: 'Does this work for European & Japanese bikes?', a: 'Yes. SAG, springs, hydraulics, and clicker principles apply 100% to all off-road bikes (KTM, Husqvarna, GasGas, Yamaha, Honda, etc.).' },
      ],
    },
    offer: {
      badge: 'Special Launch Offer',
      title: 'Full Course + Bonuses',
      sub: 'Over €150 in Free Worksheets and Complementary Tools.',
      strike: 'Regular Price €179',
      priceMain: '€59',
      priceAlt: 'One-time payment · no renewal',
      cta: 'Secure My Spot Now',
      footnote: 'Instant automated access sent to your email.',
    },
    buyers: [
      { name: 'Mark T.', role: 'Enduro Rider', city: 'London, UK' },
      { name: 'Oliver B.', role: 'Tuner', city: 'Munich, Germany' },
      { name: 'Lars N.', role: 'Off-Road Rider', city: 'Amsterdam, Netherlands' },
      { name: 'Alexandre D.', role: 'Shop Owner', city: 'Lyon, France' },
    ],
  },

  'pt-BR': {
    langName: 'Português (BR)',
    flag: '🇧🇷',
    currency: 'BRL',
    symbol: 'R$',
    topBanner: {
      badge: 'Preço de Lançamento Ativo',
      text: 'Válido por tempo limitado',
    },
    hero: {
      badge: 'Novo Curso W-Tech Suspensões',
      titlePart1: 'O Único Curso Que Você ',
      titleHighlight: 'Precisa Para Acertar Sua Moto',
      subtitle: 'Chega de braços pesados e falta de performance. Aprenda do zero a regular SAG, clicks, geometria e hidráulica de qualquer moto Off-Road.',
      ctaPrimary: 'Garantir Minha Vaga Agora',
      ctaSecondary: 'Ver Detalhes',
      badges: {
        students: '+3.000 Alunos Treinados',
        rating: '4.9/5 Nota Geral',
        online: '100% Online e Prático',
      },
    },
    vsl: {
      label: 'Confira Clicando Abaixo',
      titlePart1: 'Entenda Como o ',
      titleHighlight: 'Curso Funciona',
    },
    profiles: {
      label: 'Seu Perfil',
      titlePart1: 'Não importa se ',
      titleHighlight: 'você é iniciante',
      desc: 'Desenhamos metodologias precisas para você aprender o básico até os ajustes avançados da forma certa.',
      items: [
        {
          tag: 'Para Todo Piloto',
          title: 'Piloto',
          pain: 'Seus braços cansam rápido, sente falta de performance, tração e equilíbrio. Isso te cansa rápido — não é normal. Este curso é o guia definitivo para o acerto da sua moto.',
        },
        {
          tag: 'Trilha - Off Road',
          title: 'Trilha / Off-Road',
          pain: 'Sua moto perde tração em subidas ou pula nos buracos? Não é falta de preparo físico — a suspensão está ajustada incorretamente para o seu nível.',
        },
        {
          tag: 'Serviço Nobre',
          title: 'Mecânico / Preparador',
          pain: 'Eleve seu nível com informações técnicas para realizar o acerto completo nas motos de seus clientes, cobrando mais pelo serviço diferenciado.',
        },
        {
          tag: 'Diferencial',
          title: 'Dono de Oficina',
          pain: 'Seus clientes pedem ajustes que a equipe não sabe resolver. Pare de perder serviço para oficinas especializadas em Off-Road.',
        },
      ],
    },
    concepts: {
      label: 'O Segredo',
      titlePart1: 'O que faz o ',
      titleHighlight: 'Acerto Perfeito?',
      desc: 'Não adianta gastar com motor se a suspensão não copia o terreno, tirando a sua tração e aumentando a sua fadiga no guidão.',
      boxText: 'Quando molas, SAG, cliques e pneus trabalham em conjunto, a moto não espalha. Você ganha confiança e usa todo o potencial da moto sem apanhar.',
      items: [
        { title: 'O SAG', desc: 'Ajuste da folga da suspensão. Com o primeiro terço preservado, você garante equilíbrio e segurança — o ponto de partida obrigatório.' },
        { title: 'Molas', desc: 'O item mais importante. Sustenta o peso equilibrando perfeitamente a absorção e o retorno na trilha.' },
        { title: 'Ergonomia', desc: 'A moto moldada ao seu corpo. Altura do guidão, manetes e pedaleiras — sua integração perfeita à máquina.' },
        { title: 'Pneus e Tração', desc: 'Onde a suspensão começa. A calibragem e a escolha do pneu são essenciais para ditar todo o comportamento da frente e da traseira.' },
      ],
    },
    modules: {
      label: 'Conteúdo do Curso',
      titlePart1: '11 Módulos ',
      titleHighlight: '+ Bônus',
      cta: 'Ver Todos os Módulos Agora',
      items: [
        { num: '01', title: 'Boas-Vindas ao Curso', desc: 'Apresentação e visão geral do método', aulas: 4 },
        { num: '02', title: 'Ergonomia', desc: 'Guidão, manetes, pedal e câmbio', aulas: 5 },
        { num: '03', title: 'Equilíbrio', desc: 'Verificação antes de todo o ajuste', aulas: 1 },
        { num: '04', title: 'Molas', desc: 'Rigidez, taxa e escolha correta', aulas: 1 },
        { num: '05', title: 'O SAG', desc: 'Medição e ajuste do zero', aulas: 2 },
        { num: '06', title: 'Óleo e Viscosidades', desc: 'A hidráulica que controla a dinâmica', aulas: 1 },
        { num: '07', title: 'Os Cliques', desc: 'Compressão e retorno: o que fazem', aulas: 2 },
        { num: '08', title: 'Eixo Dianteiro', desc: 'Bengalas e a montagem livre de torção', aulas: 2 },
        { num: '09', title: 'Pneus e Tração', desc: 'Pressão correta e PSI ideal', aulas: 2 },
        { num: '10', title: 'Relação e Corrente', desc: 'Ajustes que multiplicam a sua força', aulas: 2 },
        { num: '11', title: 'Kits e Ferramentas', desc: 'O setup da sua bancada profissional', aulas: 1 },
      ],
    },
    instructor: {
      tag: 'Instrutor Principal',
      name: 'Alex',
      lastName: 'Crepaldi',
      bio: 'Fundador da W-Tech Suspensões, é a maior referência nacional em diagnósticos de suspensão Off-Road. Durante anos forjou metodologia técnica e agora disponibiliza para você tudo de forma enxuta e prática.',
      bullets: [
        'Consultor Dinâmico de Competições',
        'Mais de 3.000 profissionais treinados',
        'Eleva sua técnica de manutenção para alta performance',
      ],
    },
    faq: {
      label: 'Dúvidas Frequentes',
      titlePart1: 'Você tem ',
      titleHighlight: 'alguma dúvida?',
      items: [
        { q: 'Preciso ter experiência avançada para iniciar o curso?', a: 'Não. O curso foi estruturado desenhando desde a teoria básica até os cliques avançados. Você vai aprender tudo do mais absoluto zero.' },
        { q: 'Como terei acesso após o pagamento?', a: 'Seu acesso é imediato logo após a aprovação no cartão ou Pix. O link chegará diretamente no seu e-mail.' },
        { q: 'O curso oferece algum tipo de certificado?', a: 'Sim. Você terá um certificado oficial de conclusão da W-Tech documentando sua capacidade de regular suspensões Off-Road.' },
        { q: 'Isso serve para motos Nacionais e Importadas?', a: 'Sim. As teorias de SAG, molas, hidráulica e retorno aplicam-se a 100% das motos off-road, independentemente se são antigas ou lançamentos.' },
      ],
    },
    offer: {
      badge: 'Oferta Especial de Lançamento',
      title: 'O Curso Completo + Bônus',
      sub: 'Mais de R$ 997 em Planilhas e Material Complementar Grátis.',
      strike: 'De R$ 997,00 por',
      priceMain: '12x R$ 35,89',
      priceAlt: 'ou apenas R$ 347,00 à vista',
      cta: 'Quero Minha Vaga Agora',
      footnote: 'Acesso liberado automaticamente em seu e-mail.',
    },
    buyers: [
      { name: 'Roberto S.', role: 'Piloto Amador', city: 'São Paulo, SP' },
      { name: 'Daniel M.', role: 'Mecânico', city: 'Belo Horizonte, MG' },
      { name: 'Thiago F.', role: 'Piloto de Trilha', city: 'Curitiba, PR' },
      { name: 'Lucas A.', role: 'Dono de Oficina', city: 'Goiânia, GO' },
    ],
  },
};

/**
 * Detect user's language via localStorage, Browser settings, and Timezone
 */
export const detectUserLanguage = (): LPLanguage => {
  if (typeof window === 'undefined') return 'pt-PT';

  // 1. Check explicit localStorage choice
  try {
    const saved = localStorage.getItem('wtech_lp4_lang');
    if (saved && ['pt-PT', 'es', 'en', 'pt-BR'].includes(saved)) {
      return saved as LPLanguage;
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // 2. Check timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      tz.includes('Lisbon') ||
      tz.includes('Madeira') ||
      tz.includes('Azores') ||
      tz.includes('Porto')
    ) {
      return 'pt-PT';
    }
    if (
      tz.includes('Madrid') ||
      tz.includes('Andorra') ||
      tz.includes('Canary') ||
      tz.includes('Argentina') ||
      tz.includes('Bogota') ||
      tz.includes('Mexico') ||
      tz.includes('Santiago') ||
      tz.includes('Lima')
    ) {
      return 'es';
    }
    if (
      tz.includes('Sao_Paulo') ||
      tz.includes('Fortaleza') ||
      tz.includes('Manaus') ||
      tz.includes('Recife') ||
      tz.includes('Belem')
    ) {
      return 'pt-BR';
    }
  } catch (e) {
    // Ignore timezone detection errors
  }

  // 3. Check Navigator languages
  try {
    const navLangs = (navigator.languages || [navigator.language || '']).map((l) =>
      l.toLowerCase()
    );
    for (const lang of navLangs) {
      if (lang.startsWith('pt-pt') || lang === 'pt') return 'pt-PT';
      if (lang.startsWith('pt')) return 'pt-BR';
      if (lang.startsWith('es')) return 'es';
      if (lang.startsWith('en')) return 'en';
    }
  } catch (e) {
    // Ignore navigator errors
  }

  // Default fallback for Europe / International
  return 'pt-PT';
};
