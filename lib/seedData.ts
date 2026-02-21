import { supabase } from './supabaseClient';
import { UserRole } from '../types';

export const seedDatabase = async () => {
  console.log("Starting Data Seeding...");

  // 1. Create Admin User
  const adminUser = {
    name: 'Admin W-TECH',
    email: 'admin@w-tech.com',
    password: '123', // Plain text for demo
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=Admin+WTECH&background=D4AF37&color=000',
    permissions: { viewFinance: true, manageTeam: true, manageContent: true, manageOrders: true },
    status: 'Active'
  };

  try {
      // Check if user exists first to avoid UPSERT constraint errors
      const { data: existingUser } = await supabase
        .from('SITE_Users')
        .select('id')
        .eq('email', adminUser.email)
        .maybeSingle();

      if (!existingUser) {
        // Try to insert with permissions. If it fails (old table schema), try without.
        const { error: insertError } = await supabase.from('SITE_Users').insert([adminUser]);
        
        if (insertError) {
             console.warn("Full user insert failed (possibly missing columns). Retrying minimal insert...", insertError.message);
             // Fallback for minimal table structure
             const minimalUser = {
                 name: adminUser.name,
                 email: adminUser.email,
                 password: adminUser.password,
                 role: adminUser.role,
                 status: adminUser.status
             };
             const { error: minError } = await supabase.from('SITE_Users').insert([minimalUser]);
             if (minError) throw new Error(`Erro fatal ao criar usuário: ${minError.message}`);
        }
        console.log("Admin User Created: admin@w-tech.com / 123");
      } else {
        console.log("Admin User already exists, skipping creation.");
      }

      // 2. Create Leads
      const { data: existingLead } = await supabase.from('SITE_Leads').select('id').eq('email', 'joao@oficina.com').maybeSingle();
      
      if (!existingLead) {
          const leads = [
            { name: 'João da Silva', email: 'joao@oficina.com', phone: '11999999999', type: 'Course_Registration', status: 'New', context_id: 'Suspensão Basics' },
            { name: 'Maria Auto Center', email: 'maria@center.com', phone: '11988888888', type: 'Contact_Form', status: 'Contacted', context_id: 'Parceria' },
            { name: 'Roberto Performance', email: 'beto@racing.com', phone: '11977777777', type: 'Newsletter', status: 'Converted', context_id: 'Blog' },
            { name: 'Carlos Drift', email: 'carlos@drift.com', phone: '11966666666', type: 'Course_Registration', status: 'Negotiating', context_id: 'Telemetria' },
            { name: 'Oficina 4x4', email: 'contato@4x4.com', phone: '11955555555', type: 'Contact_Form', status: 'New', context_id: 'Dúvida Técnica' },
          ];
          const { error: leadsError } = await supabase.from('SITE_Leads').insert(leads);
          if (leadsError) console.error("Error seeding leads:", leadsError);
      }

      // 3. Create Orders (Sales)
      const { data: existingOrder } = await supabase.from('SITE_Orders').select('id').eq('customer_email', 'alo@racing.com').maybeSingle();
      
      if (!existingOrder) {
          const orders = [
            {
              customer_name: 'Fernando Alonso',
              customer_email: 'alo@racing.com',
              customer_cpf: '123.456.789-00',
              customer_phone: '11999999999',
              total: 1200,
              payment_method: 'Credit_Card',
              status: 'Paid',
              items: [{ title: 'Imersão em Suspensão', price: 1200 }]
            },
            {
              customer_name: 'Lewis Hamilton',
              customer_email: 'ham@racing.com',
              customer_cpf: '111.222.333-44',
              customer_phone: '11988888888',
              total: 450,
              payment_method: 'Pix',
              status: 'Pending',
              items: [{ title: 'Telemetria Veicular', price: 450 }]
            },
            {
                customer_name: 'Max Verstappen',
                customer_email: 'max@redbull.com',
                customer_cpf: '555.666.777-88',
                customer_phone: '11977777777',
                total: 1500,
                payment_method: 'Credit_Card',
                status: 'Paid',
                items: [{ title: 'Manutenção de Válvulas', price: 1500 }]
            }
          ];
          const { error: ordersError } = await supabase.from('SITE_Orders').insert(orders);
          if (ordersError) console.error("Error seeding orders:", ordersError);
      }

      // 4. Create Transactions
      const { count } = await supabase.from('SITE_Transactions').select('*', { count: 'exact', head: true });
      if (count === 0) {
          const transactions = [
            { description: 'Venda Curso Suspensão', amount: 1200, type: 'Income', category: 'Sales', status: 'Completed' },
            { description: 'Aluguel Galpão', amount: 3500, type: 'Expense', category: 'Operational', status: 'Completed' },
            { description: 'Venda Curso Válvulas', amount: 1500, type: 'Income', category: 'Sales', status: 'Completed' },
            { description: 'Marketing Facebook', amount: 500, type: 'Expense', category: 'Marketing', status: 'Completed' },
          ];
          const { error: transError } = await supabase.from('SITE_Transactions').insert(transactions);
          if (transError) console.error("Error seeding transactions:", transError);
      }

      // 5. Create Courses
      const { count: courseCount } = await supabase.from('SITE_Courses').select('*', { count: 'exact', head: true });
      if (courseCount === 0) {
          const courses = [
              {
                title: 'Imersão em Suspensão de Alta Performance',
                description: 'Aprenda os segredos da calibração e manutenção de suspensões para competição e street performance com engenheiros renomados.',
                instructor: 'Eng. Carlos Silva',
                date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), // 15 days from now
                location: 'W-TECH HQ - São Paulo',
                location_type: 'Presencial',
                price: 1200,
                capacity: 20,
                registered_count: 12,
                image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000',
                tags: ['Suspensão', 'Avançado', 'Workshop'],
                features: ['Certificado W-TECH', 'Acesso a ferramentas especiais', 'Material didático incluso'],
                status: 'Published'
              },
              {
                title: 'Fundamentos de Telemetria Veicular',
                description: 'Curso introdutório sobre leitura de dados e ajustes baseados em telemetria digital para motos de pista.',
                instructor: 'Roberto Almeida',
                date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
                location: 'Zoom (Ao Vivo)',
                location_type: 'Online',
                price: 450,
                capacity: 100,
                registered_count: 45,
                image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000',
                tags: ['Telemetria', 'Eletrônica', 'Online'],
                features: ['Gravação disponível por 30 dias', 'Grupo de dúvidas no WhatsApp'],
                status: 'Published'
              },
              {
                title: 'Masterclass: Dinâmica de Motocicletas',
                description: 'Entenda a física por trás da pilotagem e como ajustar a moto para cada tipo de piloto.',
                instructor: 'Equipe W-TECH',
                date: new Date(new Date().setDate(new Date().getDate() + 45)).toISOString(),
                location: 'Autódromo de Interlagos',
                location_type: 'Presencial',
                price: 2500,
                capacity: 10,
                registered_count: 0,
                image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1000',
                tags: ['Pista', 'Engenharia', 'Premium'],
                features: ['Acesso ao Box', 'Análise de dados em tempo real', 'Almoço incluso'],
                status: 'Published'
              },
              {
                 title: 'Manutenção de Válvulas e Emuladores',
                 description: 'Especialização técnica para mecânicos que desejam dominar o sistema interno de amortecedores.',
                 instructor: 'Eng. Carlos Silva',
                 date: new Date(new Date().setDate(new Date().getDate() + 60)).toISOString(),
                 location: 'W-TECH HQ - São Paulo',
                 location_type: 'Presencial',
                 price: 1500,
                 capacity: 15,
                 registered_count: 5,
                 image: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&q=80&w=1000',
                 tags: ['Mecânica', 'Hidráulica', 'Especialização'],
                 features: ['Prática em bancada', 'Kit de reparo incluso'],
                 status: 'Published'
              }
          ];
          const { error: courseError } = await supabase.from('SITE_Courses').insert(courses);
          if (courseError) console.error("Error seeding courses:", courseError);
      }

      // 6. Create Mechanics
      const { count: mechCount } = await supabase.from('SITE_Mechanics').select('*', { count: 'exact', head: true });
      if (mechCount === 0) {
          const mechanics = [
              {
                name: 'Carlos "Magrão" Souza',
                workshop_name: 'Magrão Suspensões',
                email: 'magrao@oficina.com',
                city: 'São Paulo',
                state: 'SP',
                phone: '(11) 99999-1234',
                photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
                status: 'Approved',
                specialty: ['Off-road', 'Motocross'],
                description: 'Especialista em motos de terra com 15 anos de experiência.',
                latitude: -23.550520, 
                longitude: -46.633308
              },
              {
                name: 'Roberto Dias',
                workshop_name: 'Dias Performance',
                email: 'dias@performance.com',
                city: 'Curitiba',
                state: 'PR',
                phone: '(41) 98888-5678',
                photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
                status: 'Approved',
                specialty: ['Track Day', 'Drift'],
                description: 'Preparação completa para pista e rua.',
                latitude: -25.4284, 
                longitude: -49.2733
              },
              {
                name: 'Ricardo "Mão de Graxa"',
                workshop_name: 'Box 44 Racing',
                email: 'box44@racing.com',
                city: 'Rio de Janeiro',
                state: 'RJ',
                phone: '(21) 97777-4321',
                photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
                status: 'Approved',
                specialty: ['Street', 'Rebaixados'],
                description: 'O melhor acerto do RJ.',
                latitude: -22.9068, 
                longitude: -43.1729
              },
              {
                name: 'Oficina do Beto',
                workshop_name: 'Beto Motos',
                email: 'beto@motos.com',
                city: 'Belo Horizonte',
                state: 'MG',
                phone: '(31) 99988-7766',
                photo: 'https://ui-avatars.com/api/?name=Beto+Motos&background=random',
                status: 'Approved',
                specialty: ['Geral', 'Revisão'],
                description: 'Atendimento premium para alta cilindrada.',
                latitude: -19.9167, 
                longitude: -43.9345
              },
              {
                name: 'Sul Racing Team',
                workshop_name: 'SRT Performance',
                email: 'contato@srt.com.br',
                city: 'Porto Alegre',
                state: 'RS',
                phone: '(51) 98877-6655',
                photo: 'https://ui-avatars.com/api/?name=SRT&background=random',
                status: 'Approved',
                specialty: ['Competição', 'Dinamômetro'],
                description: 'Tecnologia de ponta para sua moto.',
                latitude: -30.0346, 
                longitude: -51.2177
              }
          ];
          const { error: mechError } = await supabase.from('SITE_Mechanics').insert(mechanics);
          if (mechError) console.error("Error seeding mechanics:", mechError);
      }

      return "Dados de teste (Cursos, Mecânicos, Leads, Usuários) gerados com sucesso!";

  } catch (err: any) {
      console.error("Seed Error:", err);
      throw err.message || err;
  }
};