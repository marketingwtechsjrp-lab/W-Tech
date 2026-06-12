================================================================================
rule-10-gtm-and-utms.md
LEI 10: Rastreamento GTM e Propagação de UTMs
================================================================================

MOTIVO:
Garantir rastreabilidade de conversões de ponta a ponta e evitar a perda de dados 
de atribuição (origem, campanha, IDs de checkout como sck/src) ao redirecionar leads 
para checkouts externos ou internos.

GATILHO:
Ativado ao criar ou modificar CTAs de redirecionamento, links de checkout, 
rotas de checkout ou fluxos de telemetria e rastreamento.

DIRETRIZES TÉCNICAS:

1. LINKS COMPATÍVEIS COM GOOGLE TAG MANAGER (GTM):
   - Não use <button> com handlers onClick contendo redirecionamentos em JavaScript 
     (como window.open ou window.location.href). O listener nativo gtm.linkClick 
     do GTM exige tags âncora nativas.
   - Sempre use tags <a> (ou <motion.a> no Framer Motion) para redirecionamentos externos.
   - Atributos Obrigatórios:
     - href: URL de destino válida.
     - id: Identificador exclusivo do botão (ex: kiwify-checkout-btn-lp-ergonomia).
     - className: Classes de estilização.
   - Ajuste de Layout: Como <a> é inline por padrão, garanta que herde comportamentos 
     de container usando flex/grid (ex: flex justify-center items-center) para evitar regressão visual.

2. CAPTURA DINÂMICA DE ATRIBUIÇÃO (UTMs / SCK):
   - Nunca use listas rígidas/fixas para capturar UTMs (ex: apenas as 5 tradicionais), 
     pois isso descarta parâmetros adicionais cruciais de campanhas (como sck, src, gclid, fbclid).
   - Capture de forma genérica todos os parâmetros da URL atual:
     ```typescript
     const getAttributionParams = (): Record<string, string> => {
         if (typeof window === 'undefined') return {};
         const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
         const sp = new URLSearchParams(window.location.search || hashQuery);
         const out: Record<string, string> = {};
         sp.forEach((val, k) => {
             if (val) out[k] = val;
         });
         return out;
     };
     ```

3. PROPAGAÇÃO DE PARÂMETROS PARA CHECKOUTS EXTERNOS:
   - Use o estado do componente React para armazenar e montar dinamicamente a URL de checkout:
     ```typescript
     const [checkoutUrl, setCheckoutUrl] = useState("https://pay.kiwify.com.br/19v4nIa");

     useEffect(() => {
         if (typeof window !== 'undefined') {
             const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
             const sp = new URLSearchParams(window.location.search || hashQuery);
             const paramsString = sp.toString();
             if (paramsString) {
                 setCheckoutUrl(`https://pay.kiwify.com.br/19v4nIa?${paramsString}`);
             }
         }
     }, []);
     ```

4. NAVEGAÇÃO INTERNA PRESERVANDO UTMs:
   - Ao navegar em SPAs usando bibliotecas de roteamento (como react-router-dom), 
     garanta que as UTMs da URL atual sejam clonadas e concatenadas na nova URL 
     para que tags de remarketing e rastreio continuem funcionando na tela de destino.
     ```typescript
     const searchParams = new URLSearchParams(window.location.search);
     searchParams.set('lid', leadId);
     searchParams.set('type', paymentType);
     navigate(`/checkout-curso/${courseId}?${searchParams.toString()}`);
     ```

================================================================================
