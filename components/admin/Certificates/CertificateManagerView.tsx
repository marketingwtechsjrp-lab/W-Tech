import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { CertificateLayout, CertificateElement } from '../../../types';
import { Plus, Trash2, Save, Image as ImageIcon, Type, LayoutTemplate, QrCode } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const CertificateManagerView = () => {
    const [layouts, setLayouts] = useState<CertificateLayout[]>([]);
    const [selectedLayout, setSelectedLayout] = useState<CertificateLayout | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Editor State
    const [elements, setElements] = useState<CertificateElement[]>([]);
    const [backgroundUrl, setBackgroundUrl] = useState('');
    const [canvasSize, setCanvasSize] = useState({ width: 842, height: 595 }); // A4 Landscape (approx)
    const [layoutName, setLayoutName] = useState('');
    const [layoutType, setLayoutType] = useState<'Certificate' | 'Badge'>('Certificate');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

    useEffect(() => {
        fetchLayouts();
    }, []);

    const fetchLayouts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('SITE_CertificateLayouts').select('*').order('created_at', { ascending: false });
        if (data) {
            setLayouts(data.map(l => ({
                ...l,
                backgroundUrl: l.background_url
            })));
        }
        setLoading(false);
    };

    const handleCreateNew = () => {
        setSelectedLayout(null);
        setElements([]);
        setBackgroundUrl('');
        setLayoutName('Novo Layout');
        setLayoutType('Certificate');
        setCanvasSize({ width: 842, height: 595 });
        setIsEditing(true);
    };

    const handleEdit = (layout: CertificateLayout) => {
        setSelectedLayout(layout);
        setElements(layout.elements || []);
        setBackgroundUrl(layout.backgroundUrl || '');
        setLayoutName(layout.name);
        setLayoutType(layout.type);
        setCanvasSize(layout.dimensions || { width: 842, height: 595 });
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este layout?')) return;
        await supabase.from('SITE_CertificateLayouts').delete().eq('id', id);
        fetchLayouts();
    };

    const handleSave = async () => {
        if (!layoutName) return alert('Dê um nome ao layout.');

        const payload = {
            name: layoutName,
            type: layoutType,
            background_url: backgroundUrl,
            elements: elements,
            dimensions: canvasSize
        };

        if (selectedLayout) {
            const { error } = await supabase.from('SITE_CertificateLayouts').update(payload).eq('id', selectedLayout.id);
            if (error) alert('Erro ao atualizar: ' + error.message);
        } else {
            const { error } = await supabase.from('SITE_CertificateLayouts').insert([payload]);
            if (error) alert('Erro ao criar: ' + error.message);
        }

        setIsEditing(false);
        fetchLayouts();
    };

    const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        const fileName = `certificates/bg_${Math.random()}_${file.name}`;
        
        const { error } = await supabase.storage.from('site-assets').upload(fileName, file);
        if (error) return alert('Erro upload: ' + error.message);
        
        const { data } = supabase.storage.from('site-assets').getPublicUrl(fileName);
        setBackgroundUrl(data.publicUrl);
    };

    const addElement = (type: 'Text' | 'QRCode') => {
        const newEl: CertificateElement = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            label: type === 'Text' ? 'Novo Texto' : 'QR Code',
            x: canvasSize.width / 2,
            y: canvasSize.height / 2,
            fontSize: 20,
            color: '#000000',
            content: type === 'Text' ? 'Novo Texto' : 'https://w-techbrasil.com.br/#/validar/{{enrollment_id}}',
            align: 'center',
            isDynamic: false
        };
        setElements([...elements, newEl]);
        setSelectedElementId(newEl.id);
    };

    const updateElement = (id: string, updates: Partial<CertificateElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const deleteElement = (id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
        setSelectedElementId(null);
    };
    
    // Canvas Click to deselect
    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) setSelectedElementId(null);
    };

    if (isEditing) {
        return (
            <div className="h-full flex flex-col bg-white text-gray-900">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsEditing(false)} className="text-sm underline">Voltar</button>
                        <input 
                            className="text-xl font-bold border-none focus:ring-0 bg-transparent" 
                            value={layoutName} 
                            onChange={e => setLayoutName(e.target.value)}
                            placeholder="Nome do Layout"
                        />
                         <select 
                            value={layoutType} 
                            onChange={e => {
                                setLayoutType(e.target.value as any);
                                if(e.target.value === 'Badge') setCanvasSize({ width: 350, height: 500 });
                                else setCanvasSize({ width: 842, height: 595 });
                            }}
                            className="border rounded p-1 text-sm bg-white"
                        >
                            <option value="Certificate">Certificado (A4 Landscape)</option>
                            <option value="Badge">Crachá (Portrait)</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => document.getElementById('bg-upload')?.click()} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
                            <ImageIcon size={16} /> Fundo
                            <input id="bg-upload" type="file" hidden accept="image/*" onChange={handleUploadBackground} />
                        </button>
                        <button onClick={() => addElement('Text')} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
                            <Type size={16} /> Texto
                        </button>
                         <button onClick={() => addElement('QRCode')} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
                            <QrCode size={16} /> QR Code
                        </button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-1 bg-wtech-gold font-bold rounded shadow-sm">
                            <Save size={16} /> Salvar
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Canvas Area */}
                    <div className="flex-1 bg-gray-100 overflow-auto p-8 flex justify-center items-start" onClick={handleCanvasClick}>
                        <div 
                            className="relative bg-white shadow-lg transition-all"
                            style={{ 
                                width: canvasSize.width, 
                                height: canvasSize.height,
                                backgroundImage: `url(${backgroundUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {!backgroundUrl && <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">Sem Fundo</div>}
                            
                            {elements.map(el => (
                                <div
                                    key={el.id}
                                    className={`absolute cursor-move group hover:outline hover:outline-1 hover:outline-blue-400 ${selectedElementId === el.id ? 'outline outline-2 outline-blue-500' : ''}`}
                                    style={{
                                        left: el.x,
                                        top: el.y,
                                        fontSize: el.fontSize,
                                        fontFamily: el.fontFamily || 'Arial',
                                        color: el.color,
                                        textAlign: el.align || 'left',
                                        whiteSpace: 'nowrap',
                                        transform: el.align === 'center' ? 'translateX(-50%)' : el.align === 'right' ? 'translateX(-100%)' : 'none'
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedElementId(el.id);
                                        // Simple Drag implementation
                                        const startX = e.clientX - el.x;
                                        const startY = e.clientY - el.y;
                                        
                                        const handleMouseMove = (mv: MouseEvent) => {
                                            updateElement(el.id, {
                                                x: mv.clientX - startX,
                                                y: mv.clientY - startY
                                            });
                                        };
                                        const handleMouseUp = () => {
                                            window.removeEventListener('mousemove', handleMouseMove);
                                            window.removeEventListener('mouseup', handleMouseUp);
                                        };
                                        window.addEventListener('mousemove', handleMouseMove);
                                        window.addEventListener('mouseup', handleMouseUp);
                                    }}
                                >
                                    {el.type === 'Text' && (
                                        <span>{el.content}</span>
                                    )}
                                    {el.type === 'QRCode' && (
                                        <div className="bg-white p-1 border border-gray-200" style={{ width: el.width || 100, height: el.height || 100 }}>
                                            <div className="w-full h-full bg-black/10 flex items-center justify-center text-[8px]">QR Placeholder</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Properties Panel */}
                    <div className="w-64 bg-white border-l overflow-y-auto p-4">
                        <h3 className="font-bold mb-4 uppercase text-xs text-gray-500">Propriedades</h3>
                        
                        {selectedElementId ? (
                            <div className="space-y-4">
                                {(() => {
                                    const el = elements.find(e => e.id === selectedElementId)!;
                                    return (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold block mb-1">Label (Interno)</label>
                                                <input className="w-full border rounded p-1 text-sm bg-gray-50" value={el.label} onChange={e => updateElement(el.id, { label: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold block mb-1">Conteúdo</label>
                                                {el.type === 'Text' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <textarea className="w-full border rounded p-1 text-sm bg-gray-50" rows={2} value={el.content} onChange={e => updateElement(el.id, { content: e.target.value })} />
                                                        <div className="text-[10px] text-gray-500 space-x-1">
                                                            <button onClick={() => updateElement(el.id, { content: '{{student_name}}', align: 'center', x: canvasSize.width / 2 })} className="underline">Nome</button>
                                                            <button onClick={() => updateElement(el.id, { content: el.content + '{{curso_nome}}' })} className="underline">Curso</button>
                                                            <button onClick={() => updateElement(el.id, { content: el.content + '{{data}}' })} className="underline">Data</button>
                                                            <button onClick={() => updateElement(el.id, { content: '{{date_location}}', align: 'center', x: canvasSize.width / 2 })} className="underline font-bold text-wtech-gold">Data+Local</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <input className="w-full border rounded p-1 text-sm bg-gray-50" value={el.content} onChange={e => updateElement(el.id, { content: e.target.value })} />
                                                )}
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                 <div className="flex-1">
                                                    <label className="text-xs font-bold block mb-1">X</label>
                                                    <input type="number" className="w-full border rounded p-1 text-sm bg-gray-50" value={Math.round(el.x)} onChange={e => updateElement(el.id, { x: Number(e.target.value) })} />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs font-bold block mb-1">Y</label>
                                                    <input type="number" className="w-full border rounded p-1 text-sm bg-gray-50" value={Math.round(el.y)} onChange={e => updateElement(el.id, { y: Number(e.target.value) })} />
                                                </div>
                                            </div>
                                            <button onClick={() => updateElement(el.id, { align: 'center', x: canvasSize.width / 2 })} className="w-full text-xs bg-gray-100 p-1 border rounded mt-2 hover:bg-gray-200">
                                                Centralizar Horizontalmente
                                            </button>

                                            {el.type === 'Text' && (
                                                <>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold block mb-1">Tamanho (px)</label>
                                                            <input type="number" className="w-full border rounded p-1 text-sm bg-gray-50" value={el.fontSize} onChange={e => updateElement(el.id, { fontSize: Number(e.target.value) })} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold block mb-1">Cor</label>
                                                            <input type="color" className="w-full border rounded h-8" value={el.color} onChange={e => updateElement(el.id, { color: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold block mb-1">Alinhamento</label>
                                                        <select className="w-full border rounded p-1 text-sm bg-gray-50 bg-white" value={el.align} onChange={e => updateElement(el.id, { align: e.target.value as any })}>
                                                            <option value="left">Esquerda</option>
                                                            <option value="center">Centro</option>
                                                            <option value="right">Direita</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}

                                             {el.type === 'QRCode' && (
                                                 <div className="flex gap-2">
                                                    <div className="flex-1">
                                                        <label className="text-xs font-bold block mb-1">Largura</label>
                                                        <input type="number" className="w-full border rounded p-1 text-sm bg-gray-50" value={el.width || 100} onChange={e => updateElement(el.id, { width: Number(e.target.value) })} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-xs font-bold block mb-1">Altura</label>
                                                        <input type="number" className="w-full border rounded p-1 text-sm bg-gray-50" value={el.height || 100} onChange={e => updateElement(el.id, { height: Number(e.target.value) })} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-4 border-t">
                                                 <button onClick={() => deleteElement(el.id)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-bold">
                                                    <Trash2 size={14} /> Remover Elemento
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                             <p className="text-sm text-gray-400">Selecione um elemento para editar.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow min-h-screen text-gray-900">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Certificados e Crachás</h2>
                    <p className="text-sm text-gray-500">Gerencie os layouts para geração automática de documentos.</p>
                </div>
                <button onClick={handleCreateNew} className="bg-wtech-gold text-black px-4 py-2 rounded font-bold flex items-center gap-2">
                    <Plus size={18} /> Novo Layout
                </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {layouts.map(layout => (
                    <div key={layout.id} className="border rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        <div className="h-40 bg-gray-100 relative bg-cover bg-center" style={{ backgroundImage: `url(${layout.backgroundUrl})` }}>
                            {!layout.backgroundUrl && <div className="flex items-center justify-center h-full text-gray-300"><LayoutTemplate size={32} /></div>}
                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded text-[10px] font-bold uppercase border">
                                {layout.type === 'Certificate' ? 'Certificado' : 'Crachá'}
                            </div>
                        </div>
                        <div className="p-4 flex-1">
                            <h3 className="font-bold">{layout.name}</h3>
                            <p className="text-xs text-gray-500">{layout.elements?.length || 0} elementos</p>
                        </div>
                        <div className="bg-gray-50 p-2 flex border-t">
                             <button onClick={() => handleEdit(layout)} className="flex-1 py-1 text-sm font-medium hover:bg-gray-200 rounded text-gray-700">Editar</button>
                             <div className="w-px bg-gray-200 mx-2"></div>
                             <button onClick={() => handleDelete(layout.id)} className="px-3 py-1 text-sm font-medium hover:bg-red-100 text-red-500 rounded"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CertificateManagerView;
