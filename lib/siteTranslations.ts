export type SiteLanguage = 'pt-PT' | 'es' | 'en' | 'pt-BR';

export interface TranslationDictionary {
    flag: string;
    langName: string;
    nav: {
        home: string;
        springs: string;
        oil: string;
        courses: string;
        mechanics: string;
        store: string;
        blog: string;
        contact: string;
        admin: string;
    };
    header: {
        login: string;
        cart: string;
        myAccount: string;
        logout: string;
    };
    footer: {
        desc: string;
        quickLinks: string;
        legal: string;
        contact: string;
        terms: string;
        privacy: string;
        cancellation: string;
        support: string;
        rights: string;
    };
    home: {
        heroBadge: string;
        heroTitle1: string;
        heroHighlight: string;
        heroTitle2: string;
        heroSubtitle: string;
        ctaCourses: string;
        ctaMechanics: string;
        statStudents: string;
        statMechanics: string;
        statCourses: string;
        coursesSectionTitle: string;
        coursesSectionSubtitle: string;
        viewAllCourses: string;
        mechanicsSectionTitle: string;
        mechanicsSectionSubtitle: string;
        findMechanicBtn: string;
        aboutBadge: string;
        aboutTitlePart1: string;
        aboutTitleHighlight: string;
        aboutTitlePart2: string;
        aboutDesc1: string;
        aboutDesc2: string;
        aboutBullet1: string;
        aboutBullet2: string;
        aboutBullet3: string;
        aboutBullet4: string;
        aboutCta: string;
        whyTitlePart1: string;
        whyTitleHighlight: string;
        whySubtitle: string;
        whyBullet1: string;
        whyBullet2: string;
        whyBullet3: string;
        whyBullet4: string;
        mapTitle: string;
        mapSubtitle: string;
        mapCta: string;
        agendaTitlePart1: string;
        agendaTitleHighlight: string;
        agendaSubtitle: string;
        agendaDownload: string;
        videoBadge: string;
        videoTitle1: string;
        videoTitle2: string;
        videoScrollPrompt: string;
        videoMute: string;
        videoUnmute: string;
        videoNextLevelTitle: string;
        videoNextLevelDesc: string;
        blogTitlePart1: string;
        blogTitleHighlight: string;
        blogSubtitle: string;
        blogReadArticle: string;
    };
    courses: {
        title: string;
        subtitle: string;
        filterAll: string;
        filterOnline: string;
        filterPresencial: string;
        startingFrom: string;
        detailsBtn: string;
        enrollBtn: string;
    };
    courseDetail: {
        guaranteeBadge: string;
        enrollNow: string;
        curriculum: string;
        instructor: string;
        requirements: string;
        buyNow: string;
    };
    calculators: {
        molasTitle: string;
        molasSubtitle: string;
        oleoTitle: string;
        oleoSubtitle: string;
        calculateBtn: string;
        weightLabel: string;
        categoryLabel: string;
    };
    contact: {
        title: string;
        subtitle: string;
        nameLabel: string;
        emailLabel: string;
        phoneLabel: string;
        messageLabel: string;
        sendBtn: string;
        successMsg: string;
    };
    common: {
        guarantee: string;
        secureCheckout: string;
        instantAccess: string;
        support: string;
    };
}

export const siteTranslations: Record<SiteLanguage, TranslationDictionary> = {
    'pt-PT': {
        flag: '🇵🇹',
        langName: 'Português (PT)',
        nav: {
            home: 'Início',
            springs: 'Molas',
            oil: 'Óleo',
            courses: 'Cursos',
            mechanics: 'Rede',
            store: 'Loja',
            blog: 'Blog',
            contact: 'Contacto',
            admin: 'Painel Admin',
        },
        header: {
            login: 'Entrar',
            cart: 'Carrinho',
            myAccount: 'Minha Conta',
            logout: 'Sair',
        },
        footer: {
            desc: 'Referência europeia e internacional em tecnologia de suspensão, oferecendo produtos de alta performance e educação técnica especializada.',
            quickLinks: 'Acesso Rápido',
            legal: 'Legal',
            contact: 'Contacto',
            terms: 'Termos de Utilização',
            privacy: 'Privacidade',
            cancellation: 'Política de Cancelamento',
            support: 'Suporte',
            rights: 'Todos os direitos reservados.',
        },
        home: {
            heroBadge: 'TECNOLOGIA DE SUSPENSÃO OFF-ROAD & ON-ROAD',
            heroTitle1: 'DOMINE A',
            heroHighlight: 'SUSPENSÃO DA SUA MOTO',
            heroTitle2: 'COM PRECISÃO PROFISSIONAL',
            heroSubtitle: 'Soluções avançadas em válvulas, molas, óleos e formação técnica especializada para pilotos, mecânicos e preparadores em toda a Europa.',
            ctaCourses: 'Ver Cursos Disponíveis',
            ctaMechanics: 'Encontrar Oficina Recomendada',
            statStudents: '+5.000 Alunos Formados',
            statMechanics: '+150 Oficinas Recomendadas',
            statCourses: '100% Prático e Online',
            coursesSectionTitle: 'Formação Técnica Especializada',
            coursesSectionSubtitle: 'Cursos concebidos pelo especialista Alex Crepaldi para transformar o acerto da sua mota.',
            viewAllCourses: 'Ver Todos os Cursos',
            mechanicsSectionTitle: 'Rede de Oficinas Especializadas',
            mechanicsSectionSubtitle: 'Encontre os melhores mecânicos e preparadores certificados pela W-Tech na sua região.',
            findMechanicBtn: 'Localizar Oficina',
            aboutBadge: 'Sobre a W-Tech',
            aboutTitlePart1: 'A Maior Estrutura',
            aboutTitleHighlight: 'Independente',
            aboutTitlePart2: 'da América Latina & Europa',
            aboutDesc1: 'Com sede técnica de 1.200m², a W-Tech é o epicentro da alta performance em suspensões na América Latina e na Europa.',
            aboutDesc2: 'Nossa metodologia exclusiva une engenharia de precisão com a prática extrema do Motocross, Enduro e Rally, transformando oficinas em centros de excelência.',
            aboutBullet1: 'Laboratório de Eletrónica',
            aboutBullet2: 'Dinamómetro de Suspensão',
            aboutBullet3: 'Ferramentas Especializadas',
            aboutBullet4: 'Centro de Usinagem CNC',
            aboutCta: 'Conheça a Nossa Sede',
            whyTitlePart1: 'PORQUE SOMOS',
            whyTitleHighlight: 'A AUTORIDADE?',
            whySubtitle: 'A W-Tech não é apenas uma escola. É um ecossistema completo que une fabricante, engenheiro, mecânico e piloto.',
            whyBullet1: 'Material didático proprietário e exclusivo',
            whyBullet2: 'Suporte técnico vitalício para alunos',
            whyBullet3: 'Acesso às ferramentas mais modernas do mercado',
            whyBullet4: 'Certificação com validação via QR Code',
            mapTitle: 'Encontre Agora',
            mapSubtitle: 'Procure oficinas certificadas mais próximas',
            mapCta: 'Abrir Mapa Completo',
            agendaTitlePart1: 'AGENDA',
            agendaTitleHighlight: 'OFICIAL',
            agendaSubtitle: 'Planeie a sua especialização. Confira o calendário completo de formações presenciais e online da W-Tech.',
            agendaDownload: 'Baixar Lista',
            videoBadge: 'W-TECH BRASIL & EUROPA',
            videoTitle1: 'EXPERIÊNCIA',
            videoTitle2: 'IMERSIVA',
            videoScrollPrompt: '↓ SCROLLE PARA EXPANDIR',
            videoMute: 'Silenciar',
            videoUnmute: 'Ligar Som',
            videoNextLevelTitle: 'O Próximo Nível da Suspensão',
            videoNextLevelDesc: 'Mais do que uma formação, uma imersão completa no mundo da alta performance com os melhores especialistas.',
            blogTitlePart1: 'CONTEÚDO',
            blogTitleHighlight: 'TÉCNICO',
            blogSubtitle: 'Artigos, novidades e tecnologia do setor de suspensões.',
            blogReadArticle: 'Ler Artigo',
        },
        courses: {
            title: 'Cursos e Formação Técnica',
            subtitle: 'Aprenda a afinar e preparar a suspensão da sua mota com o método comprovado W-Tech.',
            filterAll: 'Todos',
            filterOnline: 'Online',
            filterPresencial: 'Presencial',
            startingFrom: 'A partir de',
            detailsBtn: 'Ver Detalhes',
            enrollBtn: 'Inscrever Agora',
        },
        courseDetail: {
            guaranteeBadge: 'Garantia Incondicional de 7 Dias',
            enrollNow: 'Garantir a Minha Vaga',
            curriculum: 'Programa do Curso',
            instructor: 'O Seu Instrutor',
            requirements: 'Requisitos',
            buyNow: 'Comprar Agora',
        },
        calculators: {
            molasTitle: 'Calculadora de Molas de Suspensão',
            molasSubtitle: 'Calcule a constante ideal de mola (k) para o seu peso e tipo de pilotagem.',
            oleoTitle: 'Calculadora de Óleo de Suspensão',
            oleoSubtitle: 'Determine a viscosidade e o nível de fluido recomendado para as suas bengalas.',
            calculateBtn: 'Calcular Agora',
            weightLabel: 'Peso do Piloto (com equipamento)',
            categoryLabel: 'Modalidade de Pilotagem',
        },
        contact: {
            title: 'Entre em Contacto',
            subtitle: 'A nossa equipa técnica está pronta para esclarecer todas as suas dúvidas sobre produtos e formações.',
            nameLabel: 'Nome Completo',
            emailLabel: 'E-mail',
            phoneLabel: 'Telefone / WhatsApp',
            messageLabel: 'Mensagem',
            sendBtn: 'Enviar Mensagem',
            successMsg: 'Mensagem enviada com sucesso! Responderemos em breve.',
        },
        common: {
            guarantee: 'Garantia de 7 Dias',
            secureCheckout: 'Pagamento 100% Seguro',
            instantAccess: 'Acesso Imediato',
            support: 'Suporte Técnico Especializado',
        },
    },
    'es': {
        flag: '🇪🇸',
        langName: 'Español',
        nav: {
            home: 'Inicio',
            springs: 'Muelles',
            oil: 'Aceite',
            courses: 'Cursos',
            mechanics: 'Red de Talleres',
            store: 'Tienda',
            blog: 'Blog',
            contact: 'Contacto',
            admin: 'Panel Admin',
        },
        header: {
            login: 'Acceder',
            cart: 'Carrito',
            myAccount: 'Mi Cuenta',
            logout: 'Salir',
        },
        footer: {
            desc: 'Referencia europea e internacional en tecnología de suspensión, ofreciendo productos de alto rendimiento y formación técnica especializada.',
            quickLinks: 'Enlaces Rápidos',
            legal: 'Legal',
            contact: 'Contacto',
            terms: 'Términos de Uso',
            privacy: 'Privacidad',
            cancellation: 'Política de Cancelación',
            support: 'Soporte',
            rights: 'Todos los derechos reservados.',
        },
        home: {
            heroBadge: 'TECNOLOGÍA DE SUSPENSIÓN OFF-ROAD & ON-ROAD',
            heroTitle1: 'DOMINA LA',
            heroHighlight: 'SUSPENSIÓN DE TU MOTO',
            heroTitle2: 'CON PRECISIÓN PROFESIONAL',
            heroSubtitle: 'Soluciones avanzadas en válvulas, muelles, aceites y formación técnica especializada para pilotos, mecánicos y preparadores.',
            ctaCourses: 'Ver Cursos Disponibles',
            ctaMechanics: 'Buscar Taller Recomendado',
            statStudents: '+5.000 Alumnos Formados',
            statMechanics: '+150 Talleres Certificados',
            statCourses: '100% Práctico y Online',
            coursesSectionTitle: 'Formación Técnica Especializada',
            coursesSectionSubtitle: 'Cursos diseñados por el especialista Alex Crepaldi para transformar el ajuste de tu moto.',
            viewAllCourses: 'Ver Todos los Cursos',
            mechanicsSectionTitle: 'Red de Talleres Especializados',
            mechanicsSectionSubtitle: 'Encuentra los mejores mecánicos y preparadores certificados por W-Tech en tu zona.',
            findMechanicBtn: 'Localizar Taller',
            aboutBadge: 'Sobre W-Tech',
            aboutTitlePart1: 'La Mayor Estructura',
            aboutTitleHighlight: 'Independiente',
            aboutTitlePart2: 'de América Latina y Europa',
            aboutDesc1: 'Con una sede técnica de 1.200m², W-Tech es el epicentro de la alta performance en suspensiones.',
            aboutDesc2: 'Nuestra metodología exclusiva une ingeniería de precisión con la práctica extrema del Motocross, Enduro y Rally.',
            aboutBullet1: 'Laboratorio Electrónico',
            aboutBullet2: 'Dinamómetro de Suspensión',
            aboutBullet3: 'Herramientas Especializadas',
            aboutBullet4: 'Centro Mecanizado CNC',
            aboutCta: 'Conoce Nuestra Sede',
            whyTitlePart1: '¿POR QUÉ SOMOS',
            whyTitleHighlight: 'LA AUTORIDAD?',
            whySubtitle: 'W-Tech es un ecosistema completo que conecta al fabricante, ingeniero, mecánico y piloto.',
            whyBullet1: 'Material didáctico exclusivo y propio',
            whyBullet2: 'Soporte técnico vitalicio para alumnos',
            whyBullet3: 'Acceso a las herramientas más modernas',
            whyBullet4: 'Certificación oficial con validación QR',
            mapTitle: 'Encuentra Ahora',
            mapSubtitle: 'Busca talleres certificados cerca de ti',
            mapCta: 'Abrir Mapa Completo',
            agendaTitlePart1: 'CALENDARIO',
            agendaTitleHighlight: 'OFICIAL',
            agendaSubtitle: 'Planifica tu especialización. Consulta el calendario completo de cursos presenciales y online.',
            agendaDownload: 'Descargar Calendario',
            videoBadge: 'W-TECH AMÉRICA LATINA & EUROPA',
            videoTitle1: 'EXPERIENCIA',
            videoTitle2: 'INMERSIVA',
            videoScrollPrompt: '↓ DESPLÁZATE PARA EXPANDIR',
            videoMute: 'Silenciar',
            videoUnmute: 'Activar Sonido',
            videoNextLevelTitle: 'El Siguiente Nivel de la Suspensión',
            videoNextLevelDesc: 'Más que una formación, una inmersión completa en el mundo del alto rendimiento con los mejores especialistas.',
            blogTitlePart1: 'CONTENIDO',
            blogTitleHighlight: 'TÉCNICO',
            blogSubtitle: 'Artículos, novedades y tecnología del sector.',
            blogReadArticle: 'Leer Artículo',
        },
        courses: {
            title: 'Cursos y Formación Técnica',
            subtitle: 'Aprende a ajustar y preparar la suspensión de tu moto con el método comprobado W-Tech.',
            filterAll: 'Todos',
            filterOnline: 'Online',
            filterPresencial: 'Presencial',
            startingFrom: 'Desde',
            detailsBtn: 'Ver Detalles',
            enrollBtn: 'Inscribirme Ahora',
        },
        courseDetail: {
            guaranteeBadge: 'Garantía Incondicional de 7 Días',
            enrollNow: 'Asegurar Mi Plaza',
            curriculum: 'Temario del Curso',
            instructor: 'Tu Instructor',
            requirements: 'Requisitos',
            buyNow: 'Comprar Ahora',
        },
        calculators: {
            molasTitle: 'Calculadora de Muelles de Suspensión',
            molasSubtitle: 'Calcula la constante de mola ideal (k) para tu peso y estilo de conducción.',
            oleoTitle: 'Calculadora de Aceite de Suspensión',
            oleoSubtitle: 'Determina la viscosidad y el nivel de fluido recomendado para tus horquillas.',
            calculateBtn: 'Calcular Ahora',
            weightLabel: 'Peso del Piloto (con equipamiento)',
            categoryLabel: 'Modalidad',
        },
        contact: {
            title: 'Ponte en Contacto',
            subtitle: 'Nuestro equipo técnico está listo para resolver cualquier duda sobre productos o cursos.',
            nameLabel: 'Nombre Completo',
            emailLabel: 'Correo Electrónico',
            phoneLabel: 'Teléfono / WhatsApp',
            messageLabel: 'Mensaje',
            sendBtn: 'Enviar Mensaje',
            successMsg: '¡Mensaje enviado con éxito! Te responderemos muy pronto.',
        },
        common: {
            guarantee: 'Garantía de 7 Días',
            secureCheckout: 'Pago 100% Seguro',
            instantAccess: 'Acceso Inmediato',
            support: 'Soporte Técnico Especializado',
        },
    },
    'en': {
        flag: '🇬🇧',
        langName: 'English',
        nav: {
            home: 'Home',
            springs: 'Springs',
            oil: 'Oil',
            courses: 'Courses',
            mechanics: 'Mechanics',
            store: 'Store',
            blog: 'Blog',
            contact: 'Contact',
            admin: 'Admin Panel',
        },
        header: {
            login: 'Login',
            cart: 'Cart',
            myAccount: 'My Account',
            logout: 'Logout',
        },
        footer: {
            desc: 'European & international reference in motorcycle suspension technology, offering high-performance products and expert technical training.',
            quickLinks: 'Quick Links',
            legal: 'Legal',
            contact: 'Contact',
            terms: 'Terms of Use',
            privacy: 'Privacy Policy',
            cancellation: 'Cancellation Policy',
            support: 'Support',
            rights: 'All rights reserved.',
        },
        home: {
            heroBadge: 'OFF-ROAD & ON-ROAD SUSPENSION TECHNOLOGY',
            heroTitle1: 'MASTER YOUR',
            heroHighlight: 'MOTORCYCLE SUSPENSION',
            heroTitle2: 'WITH PROFESSIONAL PRECISION',
            heroSubtitle: 'Advanced valves, springs, suspension fluids, and specialized technical training for riders, mechanics, and tuners.',
            ctaCourses: 'Explore Courses',
            ctaMechanics: 'Find Recommended Workshop',
            statStudents: '+5,000 Trained Students',
            statMechanics: '+150 Certified Workshops',
            statCourses: '100% Practical & Online',
            coursesSectionTitle: 'Specialized Technical Training',
            coursesSectionSubtitle: 'Masterclass courses designed by suspension expert Alex Crepaldi.',
            viewAllCourses: 'View All Courses',
            mechanicsSectionTitle: 'Certified Workshop Network',
            mechanicsSectionSubtitle: 'Find W-Tech certified mechanics and tuners near you.',
            findMechanicBtn: 'Locate Workshop',
            aboutBadge: 'About W-Tech',
            aboutTitlePart1: 'The Largest Independent',
            aboutTitleHighlight: 'Facility',
            aboutTitlePart2: 'in Latin America & Europe',
            aboutDesc1: 'With a 1,200m² technical headquarters, W-Tech is the epicenter of high-performance motorcycle suspension.',
            aboutDesc2: 'Our exclusive methodology combines precision engineering with extreme Motocross, Enduro, and Rally practice.',
            aboutBullet1: 'Electronics Lab',
            aboutBullet2: 'Suspension Dynamometer',
            aboutBullet3: 'Specialized Tooling',
            aboutBullet4: 'CNC Machining Center',
            aboutCta: 'Explore Our HQ',
            whyTitlePart1: 'WHY ARE WE THE',
            whyTitleHighlight: 'AUTHORITY?',
            whySubtitle: 'W-Tech is not just a school. It is an ecosystem connecting manufacturer, engineer, mechanic, and rider.',
            whyBullet1: 'Exclusive proprietary courseware',
            whyBullet2: 'Lifetime technical support for students',
            whyBullet3: 'Access to modern specialized tools',
            whyBullet4: 'Official QR Code validated certification',
            mapTitle: 'Find Now',
            mapSubtitle: 'Search certified workshops near your location',
            mapCta: 'Open Full Map',
            agendaTitlePart1: 'OFFICIAL',
            agendaTitleHighlight: 'SCHEDULE',
            agendaSubtitle: 'Plan your specialization. View our complete calendar of in-person and online trainings.',
            agendaDownload: 'Download Schedule',
            videoBadge: 'W-TECH WORLDWIDE',
            videoTitle1: 'IMMERSIVE',
            videoTitle2: 'EXPERIENCE',
            videoScrollPrompt: '↓ SCROLL TO EXPAND',
            videoMute: 'Mute',
            videoUnmute: 'Unmute',
            videoNextLevelTitle: 'The Next Level of Suspension',
            videoNextLevelDesc: 'More than a course, a complete immersion into high-performance suspension with industry-leading experts.',
            blogTitlePart1: 'TECHNICAL',
            blogTitleHighlight: 'CONTENT',
            blogSubtitle: 'Articles, news, and suspension technology insights.',
            blogReadArticle: 'Read Article',
        },
        courses: {
            title: 'Courses & Technical Training',
            subtitle: 'Learn how to tune and set up your suspension with the proven W-Tech method.',
            filterAll: 'All',
            filterOnline: 'Online',
            filterPresencial: 'In-Person',
            startingFrom: 'Starting from',
            detailsBtn: 'View Details',
            enrollBtn: 'Enroll Now',
        },
        courseDetail: {
            guaranteeBadge: '7-Day Unconditional Money-Back Guarantee',
            enrollNow: 'Secure My Spot',
            curriculum: 'Course Curriculum',
            instructor: 'Your Instructor',
            requirements: 'Requirements',
            buyNow: 'Buy Now',
        },
        calculators: {
            molasTitle: 'Suspension Springs Calculator',
            molasSubtitle: 'Calculate the ideal spring rate (k) for your body weight and riding style.',
            oleoTitle: 'Suspension Oil Calculator',
            oleoSubtitle: 'Determine recommended oil viscosity and fluid levels for your front forks.',
            calculateBtn: 'Calculate Now',
            weightLabel: 'Rider Weight (with full gear)',
            categoryLabel: 'Riding Discipline',
        },
        contact: {
            title: 'Get in Touch',
            subtitle: 'Our technical team is ready to answer any questions regarding products or training.',
            nameLabel: 'Full Name',
            emailLabel: 'Email Address',
            phoneLabel: 'Phone / WhatsApp',
            messageLabel: 'Message',
            sendBtn: 'Send Message',
            successMsg: 'Message sent successfully! We will get back to you shortly.',
        },
        common: {
            guarantee: '7-Day Guarantee',
            secureCheckout: '100% Secure Checkout',
            instantAccess: 'Instant Access',
            support: 'Dedicated Technical Support',
        },
    },
    'pt-BR': {
        flag: '🇧🇷',
        langName: 'Português (BR)',
        nav: {
            home: 'Início',
            springs: 'Molas',
            oil: 'Óleo',
            courses: 'Cursos',
            mechanics: 'Rede',
            store: 'Loja',
            blog: 'Blog',
            contact: 'Contato',
            admin: 'Painel Admin',
        },
        header: {
            login: 'Entrar',
            cart: 'Carrinho',
            myAccount: 'Minha Conta',
            logout: 'Sair',
        },
        footer: {
            desc: 'Referência nacional em tecnologia de suspensão, oferecendo produtos de alta performance e educação técnica especializada.',
            quickLinks: 'Acesso Rápido',
            legal: 'Legal',
            contact: 'Contato',
            terms: 'Termos de Uso',
            privacy: 'Privacidade',
            cancellation: 'Política de Cancelamento',
            support: 'Suporte',
            rights: 'Todos os direitos reservados.',
        },
        home: {
            heroBadge: 'TECNOLOGIA DE SUSPENSÃO OFF-ROAD & ON-ROAD',
            heroTitle1: 'DOMINE A',
            heroHighlight: 'SUSPENSÃO DA SUA MOTO',
            heroTitle2: 'COM PRECISÃO PROFISSIONAL',
            heroSubtitle: 'Soluções avançadas em válvulas, molas, óleos e formação técnica especializada para pilotos, mecânicos e preparadores.',
            ctaCourses: 'Ver Cursos Disponíveis',
            ctaMechanics: 'Encontrar Oficina Recomendada',
            statStudents: '+5.000 Alunos Formados',
            statMechanics: '+150 Oficinas Recomendadas',
            statCourses: '100% Prático e Online',
            coursesSectionTitle: 'Formação Técnica Especializada',
            coursesSectionSubtitle: 'Cursos concebidos pelo especialista Alex Crepaldi para transformar o acerto da sua moto.',
            viewAllCourses: 'Ver Todos os Cursos',
            mechanicsSectionTitle: 'Rede de Oficinas Especializadas',
            mechanicsSectionSubtitle: 'Encontre os melhores mecânicos e preparadores certificados pela W-Tech na sua região.',
            findMechanicBtn: 'Localizar Oficina',
            aboutBadge: 'Sobre a W-Tech',
            aboutTitlePart1: 'A Maior Estrutura',
            aboutTitleHighlight: 'Independente',
            aboutTitlePart2: 'do Brasil',
            aboutDesc1: 'Localizada estrategicamente em São José do Rio Preto, a sede da W-Tech Brasil é o epicentro da alta performance em duas rodas na América Latina.',
            aboutDesc2: 'Nossa metodologia exclusiva une a teoria da engenharia com a prática extrema do Motocross, Enduro e Rally. Não apenas ensinamos suspensão; entregamos a autoridade técnica que transforma oficinas comuns em centros de referência em preparação.',
            aboutBullet1: 'Laboratório de Eletrônica',
            aboutBullet2: 'Dinamômetro de Suspensão',
            aboutBullet3: 'Ferramentaria Especializada',
            aboutBullet4: 'Centro de Usinagem CNC',
            aboutCta: 'Conheça Nossa Sede',
            whyTitlePart1: 'POR QUE SOMOS',
            whyTitleHighlight: 'A AUTORIDADE?',
            whySubtitle: 'A W-Tech não é apenas uma escola. É um ecossistema. Conectamos o fabricante da peça, o engenheiro, o mecânico e o piloto.',
            whyBullet1: 'Material didático proprietário e exclusivo',
            whyBullet2: 'Suporte técnico vitalício para alunos',
            whyBullet3: 'Acesso às ferramentas mais modernas do mercado',
            whyBullet4: 'Certificação com validação via QR Code',
            mapTitle: 'Encontre Agora',
            mapSubtitle: 'Busque oficinas certificadas próximas',
            mapCta: 'Abrir Mapa Completo',
            agendaTitlePart1: 'AGENDA',
            agendaTitleHighlight: 'OFICIAL',
            agendaSubtitle: 'Planeje sua especialização. Confira o calendário completo de treinamentos presenciais e online da W-Tech Brasil.',
            agendaDownload: 'Baixar Lista',
            videoBadge: 'W-TECH BRASIL',
            videoTitle1: 'EXPERIÊNCIA',
            videoTitle2: 'IMERSIVA',
            videoScrollPrompt: '↓ SCROLLE PARA EXPANDIR',
            videoMute: 'Silenciar',
            videoUnmute: 'Ligar Som',
            videoNextLevelTitle: 'O Próximo Nível da Suspensão',
            videoNextLevelDesc: 'Mais do que um treinamento, uma imersão completa no mundo da alta performance. Na W-Tech, combinamos tecnologia de ponta com a experiência prática dos melhores especialistas do mercado para entregar um conhecimento que não existe em livros.',
            blogTitlePart1: 'CONTEÚDO',
            blogTitleHighlight: 'TÉCNICO',
            blogSubtitle: 'Artigos, novidades e tecnologia do setor.',
            blogReadArticle: 'Ler Artigo',
        },
        courses: {
            title: 'Cursos e Formação Técnica',
            subtitle: 'Aprenda a regular e preparar a suspensão da sua moto com o método comprovado W-Tech.',
            filterAll: 'Todos',
            filterOnline: 'Online',
            filterPresencial: 'Presencial',
            startingFrom: 'A partir de',
            detailsBtn: 'Ver Detalhes',
            enrollBtn: 'Inscrever Agora',
        },
        courseDetail: {
            guaranteeBadge: 'Garantia Incondicional de 7 Dias',
            enrollNow: 'Garantir Minha Vaga',
            curriculum: 'Conteúdo do Curso',
            instructor: 'Seu Instrutor',
            requirements: 'Requisitos',
            buyNow: 'Comprar Agora',
        },
        calculators: {
            molasTitle: 'Calculadora de Molas de Suspensão',
            molasSubtitle: 'Calcule a constante ideal de mola (k) para o seu peso e tipo de pilotagem.',
            oleoTitle: 'Calculadora de Óleo de Suspensão',
            oleoSubtitle: 'Determine a viscosidade e o nível de fluido recomendado para suas bengalas.',
            calculateBtn: 'Calcular Agora',
            weightLabel: 'Peso do Piloto (com equipamento)',
            categoryLabel: 'Modalidade de Pilotagem',
        },
        contact: {
            title: 'Entre em Contato',
            subtitle: 'Nossa equipe técnica está pronta para esclarecer todas as suas dúvidas sobre produtos e cursos.',
            nameLabel: 'Nome Completo',
            emailLabel: 'E-mail',
            phoneLabel: 'Telefone / WhatsApp',
            messageLabel: 'Mensagem',
            sendBtn: 'Enviar Mensagem',
            successMsg: 'Mensagem enviada com sucesso! Responderemos em breve.',
        },
        common: {
            guarantee: 'Garantia de 7 Dias',
            secureCheckout: 'Pagamento 100% Seguro',
            instantAccess: 'Acesso Imediato',
            support: 'Suporte Técnico Especializado',
        },
    },
};
