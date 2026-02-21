# Documentação Técnica: Integração Google (Analytics & SEO)

Este documento detalha toda a arquitetura e implementação das conexões com os serviços do Google (GA4 e Search Console/Sitemap) desenvolvidas para o ecossistema W-Tech.

---

## 1. Google Analytics 4 (GA4) Interface API

A integração foi desenvolvida utilizando a **Google Analytics Data API (v1beta)** para extrair métricas de performance diretamente para o painel administrativo.

### ⚙️ Arquitetura de Autenticação (OAuth2)
Para evitar que o token expire, implementamos um fluxo de **Refresh Token**:
1.  **Credenciais**: Client ID, Client Secret e Refresh Token são armazenados na tabela `SITE_Config` do Supabase.
2.  **Fluxo**: Toda vez que uma requisição é feita, o sistema verifica se precisa renovar o `access_token` usando o `refresh_token`.

```typescript
// Local: lib/googleAnalytics.ts
// Método de renovação de token
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    }),
});
```

### 📊 Métricas Implementadas (Módulos)

#### A. Tempo Real (Realtime)
- **Endpoint**: `properties/{propertyId}:runRealtimeReport`
- **Lógica**: Captura usuários ativos nos últimos 30 minutos, principais páginas e países.
- **Melhoria**: Atualizado para ler o campo `totals` do Google, garantindo 100% de precisão com o console oficial.

#### B. Canais de Aquisição (Gráfico de Linhas)
- **Endpoint**: `properties/{propertyId}:runReport`
- **Dimensões**: `date`, `firstUserDefaultChannelGroup` (Grupo de canais).
- **Métrica**: `activeUsers`.
- **Implementação**: O sistema processa os dados diários de cada canal e gera uma série "Total" calculada dinamicamente.

```typescript
// Exemplo de processamento de dados para o ApexCharts
const processAcquisitionChart = (gaData: any) => {
    // [Lógica para transformar linhas do GA em categorias de data e séries de canais]
    // Retorna: { categories: ["01/01", "02/01"...], series: [{ name: "Organic Search", data: [...] }] }
}
```

---

## 2. SEO & Google Search Console (Sitemap)

Para garantir que o Google Search Console indexe todas as páginas (especialmente as geradas dinamicamente via IA), automatizamos a geração do `sitemap.xml`.

### 🔄 Fluxo de Automação do Sitemap
O sitemap não é mais um arquivo estático; ele é reconstruído com base nos dados reais do banco de dados.

#### A. Utilitário Centralizado (`lib/sitemapUtils.ts`)
Responsável por buscar Slugs de Landing Pages, Cursos, Eventos e Blog Posts.

```typescript
export const generateSitemapXml = async () => {
    const { data: lpData } = await supabase.from('SITE_LandingPages').select('slug');
    const { data: courseData } = await supabase.from('SITE_Courses').select('id, slug').eq('status', 'Published');
    const { data: blogData } = await supabase.from('SITE_BlogPosts').select('slug').eq('status', 'Published');
    
    // Constrói o XML com prioridades: Home (1.0), Cursos (0.8), LPs (0.7), Blog (0.6)
}
```

#### B. Script de Build (`scripts/generate-sitemap.js`)
Um script Node.js que é executado durante o processo de build do projeto.
- **Onde**: Configurado no `package.json`.
- **Comando**: `vite build && node scripts/generate-sitemap.js`.

#### C. Gatilhos do Admin
Integrado nos métodos `handleSave` de:
- **Landing Page Editor**: Dispara log de atualização ao salvar.
- **Blog Manager**: Dispara log e oferece botão de download manual.
- **Courses Manager**: Dispara log ao criar novo curso ou evento.

---

## 🛠️ Lista de Arquivos Relacionados

| Arquivo | Função |
| :--- | :--- |
| `lib/googleAnalytics.ts` | Core da lógica de API, Autenticação e Processamento de dados. |
| `lib/sitemapUtils.ts` | Lógica de construção do XML do Sitemap. |
| `scripts/generate-sitemap.js` | Automação que escreve o arquivo `public/sitemap.xml`. |
| `components/admin/Analytics/AnalyticsView.tsx` | Dashboard visual (Gráficos, KPIs e Tempo Real). |
| `public/google-auth.html` | Ferramenta auxiliar para obter o código inicial do OAuth Google. |
| `package.json` | Orquestração da automação do Sitemap no build. |

---

## 🚀 Como testar/validar
1.  **Analytics**: Acesse Admin > Analytics e verifique as abas "Visão Geral", "Aquisição" e "Tempo Real".
2.  **Sitemap**: Acesse `https://w-techbrasil.com.br/sitemap.xml` para ver o arquivo gerado.
3.  **Logs**: No console do navegador, ao salvar qualquer conteúdo no admin, você verá: `"Sitemap update triggered automatically."`
