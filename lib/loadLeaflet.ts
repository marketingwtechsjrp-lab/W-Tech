declare const L: any; // Leaflet Global from CDN

/** Carrega o Leaflet (CSS+JS) sob demanda — antes ficava render-blocking no index.html (afetava todas as páginas). */
let leafletPromise: Promise<void> | null = null;
export const loadLeaflet = (): Promise<void> => {
  if (typeof L !== 'undefined') return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      link.setAttribute('data-leaflet', 'true');
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.async = true;
    script.onload = () => {
      // Sem isto a Leaflet deduz a pasta pelo CSS; se o script chega antes dele, o pino padrão quebra.
      (window as any).L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
      resolve();
    };
    script.onerror = () => reject(new Error('Falha ao carregar Leaflet'));
    document.body.appendChild(script);
  });
  return leafletPromise;
};
