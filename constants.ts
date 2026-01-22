import { Course, BlogPost, GlossaryTerm, Lead, Mechanic, Order, Transaction, User, UserRole } from './types';

export const ASSETS = {
  LOGO_URL: 'http://w-techbrasil.com.br/wp-content/uploads/2022/03/logo-w-tech-preta.png',
  LOGO_WHITE_URL: 'https://via.placeholder.com/150x50/000000/FFFFFF?text=W-TECH+Brasil', 
  HERO_BG: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2832&auto=format&fit=crop',
};

export const APP_VERSION = '2.4.4';

export const MOCK_COURSES: Course[] = [
  {
    id: 'c-001',
    title: 'Imersão em Suspensão de Alta Performance',
    description: 'Aprenda os segredos da calibração e manutenção de suspensões para competição e street performance.',
    instructor: 'Eng. Carlos Silva',
    date: '2023-11-15T09:00:00',
    location: 'W-TECH HQ - São Paulo',
    locationType: 'Presencial',
    price: 1200,
    capacity: 20,
    registeredCount: 12,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000',
    tags: ['Suspensão', 'Avançado', 'Workshop'],
    features: ['Certificado W-TECH', 'Acesso a ferramentas especiais', 'Material didático incluso'],
    status: 'Published'
  },
  {
    id: 'c-002',
    title: 'Fundamentos de Telemetria Veicular',
    description: 'Curso introdutório sobre leitura de dados e ajustes baseados em telemetria digital.',
    instructor: 'Roberto Almeida',
    date: '2023-12-05T19:00:00',
    location: 'Zoom (Ao Vivo)',
    locationType: 'Online',
    price: 450,
    capacity: 100,
    registeredCount: 45,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000',
    tags: ['Telemetria', 'Eletrônica', 'Online'],
    features: ['Gravação disponível por 30 dias', 'Grupo de dúvidas no WhatsApp'],
    status: 'Published'
  },
  {
    id: 'c-003',
    title: 'Manutenção de Válvulas e Emuladores',
    description: 'Especialização técnica para mecânicos que desejam dominar o sistema interno de amortecedores.',
    instructor: 'Eng. Carlos Silva',
    date: '2024-01-20T08:00:00',
    location: 'W-TECH HQ - São Paulo',
    locationType: 'Presencial',
    price: 1500,
    capacity: 15,
    registeredCount: 2,
    image: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&q=80&w=1000',
    tags: ['Mecânica', 'Hidráulica', 'Especialização'],
    features: ['Prática em bancada', 'Kit de reparo incluso'],
    status: 'Draft'
  }
];

export const MOCK_POSTS: BlogPost[] = [
  {
    id: 'p-001',
    title: 'A Importância da Revisão Preventiva em Suspensões',
    excerpt: 'Descubra por que a manutenção preventiva pode economizar milhares de reais e garantir sua segurança nas pistas.',
    content: 'Lorem ipsum dolor sit amet...',
    author: 'W-TECH Editorial',
    date: '2023-10-10',
    category: 'Manutenção',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
    status: 'Published'
  },
  {
    id: 'p-002',
    title: 'Lançamento: Nova Linha de Emuladores 2024',
    excerpt: 'Tecnologia de ponta chegando para transformar a dirigibilidade do seu veículo.',
    content: 'Lorem ipsum dolor sit amet...',
    author: 'Marketing W-TECH',
    date: '2023-10-05',
    category: 'Novidades',
    image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=800',
    status: 'Published'
  }
];

export const MOCK_GLOSSARY: GlossaryTerm[] = [
  { id: 'g-1', term: 'Rebound (Retorno)', definition: 'Controle da velocidade com que a suspensão se estende após ser comprimida.', category: 'Dinâmica' },
  { id: 'g-2', term: 'Compression (Compressão)', definition: 'Controle da velocidade com que a suspensão se contrai ao atingir um obstáculo.', category: 'Dinâmica' },
  { id: 'g-3', term: 'Preload (Pré-carga)', definition: 'Ajuste inicial da mola que determina a altura do veículo e o sag.', category: 'Ajustes' },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'l-1', name: 'João Mecânico', email: 'joao@oficina.com', phone: '11999999999', type: 'Course_Registration', status: 'New', contextId: 'c-001', createdAt: '2023-10-25' },
  { id: 'l-2', name: 'Auto Center Sul', email: 'contato@acs.com', phone: '11988888888', type: 'Course_Registration', status: 'Contacted', contextId: 'c-002', createdAt: '2023-10-24' },
  { id: 'l-3', name: 'Pedro Paulo', email: 'pedro@email.com', phone: '11977777777', type: 'Newsletter', status: 'Converted', contextId: 'c-001', createdAt: '2023-10-20' },
  { id: 'l-4', name: 'Marcos Performance', email: 'marcos@racing.com', phone: '11966666666', type: 'Contact_Form', status: 'New', contextId: '', createdAt: '2023-10-26' },
  { id: 'l-5', name: 'Oficina do Zé', email: 'ze@oficina.com', phone: '11955555555', type: 'Course_Registration', status: 'Contacted', contextId: 'c-003', createdAt: '2023-10-22' },
];

export const MOCK_MECHANICS: Mechanic[] = [
  { id: 'm-1', name: 'Carlos "Magrão" Souza', workshopName: 'Magrão Suspensões', city: 'São Paulo', state: 'SP', phone: '(11) 99999-1234', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400', status: 'Approved', specialty: ['Off-road', 'Motocross'], joinedDate: '2023-01-15' },
  { id: 'm-2', name: 'Roberto Dias', workshopName: 'Dias Performance', city: 'Curitiba', state: 'PR', phone: '(41) 98888-5678', photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400', status: 'Approved', specialty: ['Track Day', 'Drift'], joinedDate: '2023-03-10' },
  { id: 'm-3', name: 'Oficina do Beto', workshopName: 'Beto Racing', city: 'Belo Horizonte', state: 'MG', phone: '(31) 97777-4321', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', status: 'Pending', specialty: ['Street', 'Rebaixados'], joinedDate: '2023-10-28' },
];

export const MOCK_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Admin Master',
    email: 'admin@w-tech.com',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin+Master&background=D4AF37&color=000',
    status: 'Active',
    permissions: { viewFinance: true, manageTeam: true, manageContent: true, manageOrders: true }
  },
  {
    id: 'u-2',
    name: 'Julia Financeiro',
    email: 'julia@w-tech.com',
    role: UserRole.MANAGER,
    avatar: 'https://ui-avatars.com/api/?name=Julia+F&background=ddd&color=333',
    status: 'Active',
    permissions: { viewFinance: true, manageTeam: false, manageContent: false, manageOrders: true }
  },
  {
    id: 'u-3',
    name: 'Marcos Editor',
    email: 'marcos@w-tech.com',
    role: UserRole.EDITOR,
    avatar: 'https://ui-avatars.com/api/?name=Marcos+E&background=ddd&color=333',
    status: 'Active',
    permissions: { viewFinance: false, manageTeam: false, manageContent: true, manageOrders: false }
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-1023',
    customerName: 'Fernando Alonso',
    customerEmail: 'alo@racing.com',
    date: '2023-10-28',
    status: 'Paid',
    total: 1200,
    items: [{ courseId: 'c-001', title: 'Imersão em Suspensão', price: 1200, image: '' }],
    paymentMethod: 'Credit_Card'
  },
  {
    id: 'ORD-1024',
    customerName: 'Lewis Hamilton',
    customerEmail: 'ham@racing.com',
    date: '2023-10-29',
    status: 'Pending',
    total: 450,
    items: [{ courseId: 'c-002', title: 'Telemetria', price: 450, image: '' }],
    paymentMethod: 'Pix'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't-1', description: 'Venda ORD-1023', amount: 1200, type: 'Income', date: '2023-10-28', category: 'Sales', status: 'Completed' },
  { id: 't-2', description: 'Aluguel Galpão', amount: 3500, type: 'Expense', date: '2023-10-01', category: 'Operational', status: 'Completed' },
  { id: 't-3', description: 'Marketing Facebook Ads', amount: 800, type: 'Expense', date: '2023-10-15', category: 'Marketing', status: 'Completed' },
  { id: 't-4', description: 'Venda ORD-1020', amount: 450, type: 'Income', date: '2023-10-20', category: 'Sales', status: 'Completed' },
  { id: 't-5', description: 'Compra de Ferramentas', amount: 1200, type: 'Expense', date: '2023-10-10', category: 'Operational', status: 'Completed' },
];