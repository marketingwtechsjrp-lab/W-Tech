import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mechanic } from '../types';
import { Search, MapPin, Phone, Award } from 'lucide-react';
import SEO from '../components/SEO';

declare const L: any; // Leaflet Global from CDN

const MechanicsMap: React.FC = () => {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMech, setSelectedMech] = useState<Mechanic | null>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMechanics();
  }, []);

  useEffect(() => {
    // Initialize Map only once and when mechanics are loaded (to fit bounds)
    if (!mapRef.current && mapContainerRef.current && !loading) {
      initMap();
    }
  }, [loading]);

  const fetchMechanics = async () => {
    setLoading(true);
    const { data } = await supabase.from('SITE_Mechanics').select('*').eq('status', 'Approved');

    if (data) {
      // Simulate Coordinates if missing (FOR DEMO/MVP ONLY)
      // Brazil Bounds: Lat -10 to -30, Lng -40 to -55 approx
      const processed: Mechanic[] = data.map((m: any) => ({
        ...m,
        workshopName: m.workshop_name,
        latitude: m.latitude || -23.550520 + (Math.random() - 0.5) * 10, // Random spread around SP/Center
        longitude: m.longitude || -46.633308 + (Math.random() - 0.5) * 10
      }));
      setMechanics(processed);
    }
    setLoading(false);
  };

  const initMap = () => {
    // Center on Brazil roughly
    mapRef.current = L.map(mapContainerRef.current).setView([-15.793889, -47.882778], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Add Markers
    mechanics.forEach(mech => {
      if (mech.latitude && mech.longitude) {
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: #EF4444; width: 10px; height: 10px; border-radius: 50%; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5]
        });

        const marker = L.marker([mech.latitude, mech.longitude], { icon }).addTo(mapRef.current);

        // Custom Popup Content
        const popupContent = `
          <div style="font-family: sans-serif; min-width: 200px;">
            <h3 style="font-weight: bold; color: #111; margin-bottom: 4px;">${mech.workshopName}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">${mech.name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px;">${mech.city}, ${mech.state}</p>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Click event to select in list
        marker.on('click', () => {
          setSelectedMech(mech);
          // Scroll list to item (optional implementation)
        });
      }
    });
  };

  const handleSelect = (mech: Mechanic) => {
    setSelectedMech(mech);
    if (mapRef.current && mech.latitude && mech.longitude) {
      mapRef.current.setView([mech.latitude, mech.longitude], 12, { animate: true });
      // Find and open popup (advanced usage, simplifying for MVP by just zooming)
    }
  };

  const filteredMechanics = mechanics.filter(m =>
    m.workshopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.specialty && m.specialty.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <SEO
        title="Rede de Credenciados"
        description="Encontre oficinas especializadas em suspensão certificadas pela W-Tech Brasil em todo o país."
      />
      {/* Header Bar */}
      <div className="bg-wtech-black text-white p-4 shadow-md z-20 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="text-wtech-gold" /> Rede de Credenciados
          </h1>
          <p className="text-xs text-gray-400">Encontre a oficina certificada mais próxima de você.</p>
        </div>
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar por cidade, estado ou oficina..."
            className="w-full pl-10 pr-4 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-wtech-gold"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-500" />
        </div>
      </div>

      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Left: List */}
        <div className="w-full md:w-1/3 bg-white border-r border-gray-200 overflow-y-auto custom-scrollbar z-10">
          {loading ? (
            <div className="p-10 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-wtech-gold"></div></div>
          ) : filteredMechanics.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredMechanics.map(mech => (
                <div
                  key={mech.id}
                  onClick={() => handleSelect(mech)}
                  className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMech?.id === mech.id ? 'bg-yellow-50 border-l-4 border-wtech-gold' : 'border-l-4 border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-lg">{mech.workshopName}</h3>
                    {mech.status === 'Approved' && (
                      <div title="Certificado">
                        <Award size={18} className="text-wtech-gold" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{mech.name}</p>

                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <MapPin size={14} className="mr-1" />
                    {mech.city} - {mech.state}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {mech.specialty && mech.specialty.slice(0, 3).map(s => (
                      <span key={s} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded uppercase font-bold">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="flex items-center text-sm font-bold text-gray-700">
                      <Phone size={14} className="mr-2" /> {mech.phone}
                    </span>
                    <button className="text-xs bg-wtech-black text-white px-3 py-1 rounded hover:bg-wtech-gold hover:text-black transition-colors">
                      Ver no Mapa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-gray-500">
              Nenhum credenciado encontrado nesta região.
            </div>
          )}
        </div>

        {/* Right: Map */}
        <div className="w-full md:w-2/3 bg-gray-200 relative">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        </div>
      </div>
    </div>
  );
};

export default MechanicsMap;