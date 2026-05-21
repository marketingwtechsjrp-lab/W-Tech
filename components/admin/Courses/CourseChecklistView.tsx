import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import {
    X, Printer, CheckSquare, Square, Save, Loader2,
    Users, Calendar, MapPin, RefreshCw, CheckCircle2,
    ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import type { ChecklistTemplateItem } from './CourseChecklistConfig';
import { formatDateLocal } from '../../../lib/utils';

interface Course {
    id: string;
    title: string;
    date: string;
    date_end?: string;
    city?: string;
    state?: string;
    location?: string;
    start_time?: string;
    end_time?: string;
    registeredCount?: number;
    instructor?: string;
}

interface ChecklistState {
    [itemId: string]: boolean;
}

interface SavedChecklist {
    items: { id: string; checked: boolean; qty_actual: number }[];
    checked_by_1: string;
    checked_by_2: string;
}

const CATEGORY_ICONS: Record<string, string> = {
    'Material do Aluno':       '🎒',
    'Documentos':              '📄',
    'Alimentação':             '☕',
    'Marketing & Sinalização': '🎯',
    'Equipamentos':            '💻',
    'Ferramentas':             '🔧',
    'Logística':               '📍',
    'Outro':                   '📦',
};

interface Props {
    course: Course;
    confirmedCount: number;
    onClose: () => void;
}

export const CourseChecklistView: React.FC<Props> = ({ course, confirmedCount, onClose }) => {
    const [templateItems, setTemplateItems] = useState<ChecklistTemplateItem[]>([]);
    const [checked, setChecked] = useState<ChecklistState>({});
    const [checkedBy1, setCheckedBy1] = useState('');
    const [checkedBy2, setCheckedBy2] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const studentCount = confirmedCount || 0;

    useEffect(() => {
        loadData();
    }, [course.id]);

    const loadData = async () => {
        setLoading(true);
        const [{ data: tmpl }, { data: saved }] = await Promise.all([
            supabase.from('SITE_ChecklistTemplate').select('*').eq('is_active', true).order('sort_order'),
            supabase.from('SITE_CourseChecklists').select('*').eq('course_id', course.id).single()
        ]);

        if (tmpl) {
            setTemplateItems(tmpl as ChecklistTemplateItem[]);
            // Expand all categories initially
            const cats = new Set(tmpl.map((i: ChecklistTemplateItem) => i.category));
            setExpandedCategories(cats);
        }

        if (saved) {
            const state: ChecklistState = {};
            (saved.items || []).forEach((s: any) => { state[s.id] = s.checked; });
            setChecked(state);
            setCheckedBy1(saved.checked_by_1 || '');
            setCheckedBy2(saved.checked_by_2 || '');
        }

        setLoading(false);
    };

    const calcQty = (item: ChecklistTemplateItem) =>
        item.quantity_type === 'per_student'
            ? Math.ceil(item.quantity_value * studentCount)
            : item.quantity_value;

    const saveChecklist = useCallback(async (
        currentChecked: ChecklistState,
        by1: string,
        by2: string
    ) => {
        setSaving(true);
        const items = templateItems.map(i => ({
            id: i.id,
            checked: currentChecked[i.id] ?? false,
            qty_actual: calcQty(i)
        }));

        await supabase.from('SITE_CourseChecklists').upsert(
            { course_id: course.id, items, checked_by_1: by1, checked_by_2: by2, updated_at: new Date().toISOString() },
            { onConflict: 'course_id' }
        );

        setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setSaving(false);
    }, [templateItems, course.id, studentCount]);

    // Auto-save 1.5s após qualquer mudança
    const scheduleAutoSave = (newChecked: ChecklistState, by1: string, by2: string) => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
        autoSaveRef.current = setTimeout(() => saveChecklist(newChecked, by1, by2), 1500);
    };

    const toggle = (id: string) => {
        const next = { ...checked, [id]: !checked[id] };
        setChecked(next);
        scheduleAutoSave(next, checkedBy1, checkedBy2);
    };

    const toggleAll = (allChecked: boolean) => {
        const next: ChecklistState = {};
        templateItems.forEach(i => { next[i.id] = allChecked; });
        setChecked(next);
        scheduleAutoSave(next, checkedBy1, checkedBy2);
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    // Agrupar itens por categoria
    const categories = Array.from(new Set(templateItems.map(i => i.category)));
    const groupedItems = categories.reduce<Record<string, ChecklistTemplateItem[]>>((acc, cat) => {
        acc[cat] = templateItems.filter(i => i.category === cat);
        return acc;
    }, {});

    const totalItems = templateItems.length;
    const checkedCount = templateItems.filter(i => checked[i.id]).length;
    const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

    const handlePrint = () => {
        const html = buildPrintHTML();
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        w.document.write(html);
        w.document.close();
        w.onload = () => { w.focus(); w.print(); };
    };

    const buildPrintHTML = () => {
        const categoryBlocks = categories.map(cat => {
            const catItems = groupedItems[cat] || [];
            const rows = catItems.map(item => {
                const qty = calcQty(item);
                const isChecked = checked[item.id];
                return `
                <tr class="${isChecked ? 'checked-row' : ''}">
                    <td class="cb-cell">${isChecked ? '☑' : '☐'}</td>
                    <td class="name-cell">${item.name}${item.notes ? `<br><span class="notes">${item.notes}</span>` : ''}</td>
                    <td class="qty-cell">
                        <strong>${qty}</strong> <span class="unit">${item.unit}</span>
                        ${item.quantity_type === 'per_student' ? `<br><span class="calc">(${item.quantity_value}× ${studentCount} alunos)</span>` : ''}
                    </td>
                    <td class="ok-cell">${isChecked ? '<span class="ok">✓ OK</span>' : '<span class="nok">—</span>'}</td>
                </tr>`;
            }).join('');

            return `
            <div class="category-block">
                <div class="category-header">
                    <span class="cat-icon">${CATEGORY_ICONS[cat] || '📦'}</span>
                    ${cat}
                    <span class="cat-count">${catItems.filter(i => checked[i.id]).length}/${catItems.length}</span>
                </div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width:32px"></th>
                            <th>Item</th>
                            <th style="width:160px">Quantidade</th>
                            <th style="width:80px">Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        }).join('');

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Checklist Final — ${course.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px 28px; color: #111; font-size: 11px; }

  .page-header { border-bottom: 3px solid #D4AF37; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-bottom: 4px; }
  .doc-title { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #111; }
  .doc-sub { font-size: 11px; color: #666; margin-top: 2px; }

  .course-info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f9f8f6; border: 1px solid #e5e0d5; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; }
  .info-block .label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #999; }
  .info-block .value { font-size: 12px; font-weight: 700; color: #111; margin-top: 2px; }

  .progress-bar-wrap { margin-bottom: 18px; }
  .progress-label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #666; margin-bottom: 5px; display: flex; justify-content: space-between; }
  .progress-bar { width: 100%; height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: #D4AF37; border-radius: 4px; width: ${progressPct}%; }

  .category-block { margin-bottom: 16px; break-inside: avoid; }
  .category-header { background: #1a1a1a; color: #fff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding: 6px 12px; border-radius: 6px 6px 0 0; display: flex; align-items: center; gap: 8px; }
  .cat-icon { font-size: 13px; }
  .cat-count { margin-left: auto; background: #D4AF37; color: #000; padding: 1px 7px; border-radius: 10px; font-size: 9px; }

  .items-table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-top: none; }
  .items-table th { background: #f5f5f5; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: left; color: #555; }
  .items-table td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
  .items-table tr:last-child td { border-bottom: none; }
  .cb-cell { font-size: 15px; text-align: center; width: 32px; }
  .name-cell { font-weight: 600; }
  .notes { font-size: 9px; color: #999; font-weight: normal; font-style: italic; }
  .qty-cell { font-size: 11px; }
  .unit { color: #888; font-size: 10px; }
  .calc { font-size: 9px; color: #aaa; }
  .ok { color: #16a34a; font-weight: 900; font-size: 11px; }
  .nok { color: #ccc; }
  .checked-row { background: #f0fdf4; }

  .signature-section { margin-top: 28px; border-top: 2px solid #D4AF37; padding-top: 20px; break-inside: avoid; }
  .sig-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 18px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-block { }
  .sig-name { font-size: 13px; font-weight: 700; color: #111; min-height: 22px; border-bottom: 1px solid #111; padding-bottom: 2px; margin-bottom: 5px; }
  .sig-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; }
  .sig-line { border-bottom: 1px solid #ccc; margin-top: 28px; margin-bottom: 5px; }

  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #bbb; letter-spacing: 1px; border-top: 1px solid #eee; padding-top: 10px; }

  @media print {
    body { padding: 10px 18px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="page-header">
  <div class="brand">W-Tech Experience — Documento Interno</div>
  <div class="doc-title">✓ Checklist Final do Curso</div>
  <div class="doc-sub">Gerado em ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
</div>

<div class="course-info">
  <div class="info-block">
    <div class="label">Curso</div>
    <div class="value">${course.title}</div>
  </div>
  <div class="info-block">
    <div class="label">Data</div>
    <div class="value">${formatDateLocal(course.date)}${course.date_end && course.date_end !== course.date ? ` a ${formatDateLocal(course.date_end)}` : ''}${course.start_time ? ` · ${course.start_time}` : ''}</div>
  </div>
  <div class="info-block">
    <div class="label">Local</div>
    <div class="value">${[course.city, course.state].filter(Boolean).join(', ') || course.location || '—'}</div>
  </div>
  <div class="info-block">
    <div class="label">Alunos confirmados</div>
    <div class="value">${studentCount} aluno${studentCount !== 1 ? 's' : ''}</div>
  </div>
</div>

<div class="progress-bar-wrap">
  <div class="progress-label">
    <span>Progresso da conferência</span>
    <span>${checkedCount}/${totalItems} itens · ${progressPct}%</span>
  </div>
  <div class="progress-bar"><div class="progress-fill"></div></div>
</div>

${categoryBlocks}

<div class="signature-section">
  <div class="sig-title">Conferência realizada por</div>
  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-name">${checkedBy1 || ''}</div>
      <div class="sig-label">Responsável 1 — Nome completo</div>
      <div class="sig-line"></div>
      <div class="sig-label">Assinatura</div>
    </div>
    <div class="sig-block">
      <div class="sig-name">${checkedBy2 || ''}</div>
      <div class="sig-label">Responsável 2 — Nome completo</div>
      <div class="sig-line"></div>
      <div class="sig-label">Assinatura</div>
    </div>
  </div>
</div>

<div class="footer">
  W-Tech Experience · Checklist Final · Uso Interno · Não distribuir
</div>

<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-2xl h-full bg-[var(--admin-surface-1)] shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-border)] shrink-0 bg-[var(--admin-surface-2)]">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-wtech-gold">Checklist Final</p>
                        <h2 className="font-black text-[var(--admin-text-primary)] text-base leading-tight truncate">{course.title}</h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--admin-text-secondary)]">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {formatDateLocal(course.date)}</span>
                            {(course.city || course.location) && (
                                <span className="flex items-center gap-1"><MapPin size={11} /> {course.city || course.location}</span>
                            )}
                            <span className="flex items-center gap-1 font-black text-wtech-gold">
                                <Users size={11} /> {studentCount} aluno{studentCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black text-xs uppercase shadow-md hover:scale-105 active:scale-95 transition-all"
                        >
                            <Printer size={14} /> Imprimir
                        </button>
                        <button onClick={onClose} className="p-2 text-[var(--admin-text-tertiary)] hover:text-red-500 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-wtech-gold" size={40} />
                    </div>
                ) : templateItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                        <AlertCircle size={40} className="text-[var(--admin-text-tertiary)]" />
                        <div>
                            <p className="font-black text-[var(--admin-text-primary)]">Nenhum item configurado</p>
                            <p className="text-sm text-[var(--admin-text-secondary)] mt-1">
                                Vá em <strong>Configurações → Checklist de Cursos</strong> para adicionar os itens do template.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Progress bar */}
                        <div className="px-6 py-3 border-b border-[var(--admin-border)] shrink-0 bg-[var(--admin-surface-1)]">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-black text-[var(--admin-text-secondary)] uppercase tracking-wide">
                                    {checkedCount}/{totalItems} itens conferidos
                                </span>
                                <div className="flex items-center gap-2">
                                    {saving && <span className="text-[10px] text-[var(--admin-text-tertiary)] flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Salvando...</span>}
                                    {savedAt && !saving && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> Salvo {savedAt}</span>}
                                    <button onClick={() => toggleAll(checkedCount < totalItems)} className="text-[10px] font-black text-wtech-gold hover:underline uppercase">
                                        {checkedCount < totalItems ? 'Marcar tudo' : 'Desmarcar tudo'}
                                    </button>
                                </div>
                            </div>
                            <div className="h-2 bg-[var(--admin-surface-3)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-wtech-gold to-yellow-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            {progressPct === 100 && (
                                <p className="text-[10px] text-emerald-500 font-black mt-1 text-right flex items-center justify-end gap-1">
                                    <CheckCircle2 size={10} /> Tudo conferido — pronto para imprimir!
                                </p>
                            )}
                        </div>

                        {/* Checklist scrollable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-3">
                            {categories.map(cat => {
                                const catItems = groupedItems[cat] || [];
                                const catChecked = catItems.filter(i => checked[i.id]).length;
                                const isOpen = expandedCategories.has(cat);

                                return (
                                    <div key={cat} className="bg-[var(--admin-surface-2)] rounded-xl border border-[var(--admin-border)] overflow-hidden">
                                        <button
                                            onClick={() => toggleCategory(cat)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--admin-surface-3)] transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                                                <span className="text-xs font-black text-[var(--admin-text-primary)] uppercase tracking-wide">{cat}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${catChecked === catItems.length ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[var(--admin-surface-3)] text-[var(--admin-text-tertiary)]'}`}>
                                                    {catChecked}/{catItems.length}
                                                </span>
                                            </div>
                                            {isOpen ? <ChevronUp size={13} className="text-[var(--admin-text-tertiary)]" /> : <ChevronDown size={13} className="text-[var(--admin-text-tertiary)]" />}
                                        </button>

                                        {isOpen && (
                                            <div className="divide-y divide-[var(--admin-border)]">
                                                {catItems.map(item => {
                                                    const qty = calcQty(item);
                                                    const isChecked = !!checked[item.id];
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => toggle(item.id)}
                                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-[var(--admin-surface-3)] ${isChecked ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                                                        >
                                                            {isChecked
                                                                ? <CheckSquare size={18} className="text-emerald-500 shrink-0" />
                                                                : <Square size={18} className="text-[var(--admin-text-tertiary)] shrink-0" />
                                                            }
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold ${isChecked ? 'line-through text-[var(--admin-text-tertiary)]' : 'text-[var(--admin-text-primary)]'}`}>
                                                                    {item.name}
                                                                </p>
                                                                {item.notes && (
                                                                    <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-0.5 italic">{item.notes}</p>
                                                                )}
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <p className={`text-base font-black ${isChecked ? 'text-emerald-500' : 'text-[var(--admin-text-primary)]'}`}>
                                                                    {qty} <span className="text-xs font-normal text-[var(--admin-text-tertiary)]">{item.unit}</span>
                                                                </p>
                                                                {item.quantity_type === 'per_student' && (
                                                                    <p className="text-[9px] text-[var(--admin-text-tertiary)]">
                                                                        {item.quantity_value}× {studentCount} alunos
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Assinaturas */}
                        <div className="px-6 py-4 border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] shrink-0 space-y-3">
                            <p className="text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase tracking-widest">
                                Conferência realizada por
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Responsável 1</label>
                                    <input
                                        type="text"
                                        value={checkedBy1}
                                        onChange={e => {
                                            setCheckedBy1(e.target.value);
                                            scheduleAutoSave(checked, e.target.value, checkedBy2);
                                        }}
                                        placeholder="Nome completo"
                                        className="w-full px-3 py-2 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-lg text-sm outline-none focus:border-wtech-gold transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-[var(--admin-text-tertiary)] uppercase mb-1">Responsável 2</label>
                                    <input
                                        type="text"
                                        value={checkedBy2}
                                        onChange={e => {
                                            setCheckedBy2(e.target.value);
                                            scheduleAutoSave(checked, checkedBy1, e.target.value);
                                        }}
                                        placeholder="Nome completo"
                                        className="w-full px-3 py-2 bg-[var(--admin-surface-1)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-lg text-sm outline-none focus:border-wtech-gold transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-1">
                                <button
                                    onClick={() => saveChecklist(checked, checkedBy1, checkedBy2)}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    Salvar progresso
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-wtech-gold to-yellow-600 text-black rounded-xl font-black text-xs uppercase shadow-sm hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Printer size={13} /> Imprimir checklist
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CourseChecklistView;
