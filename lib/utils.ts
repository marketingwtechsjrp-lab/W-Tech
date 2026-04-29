import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateLocal(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export const MONTHS = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

export function formatDateFull(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate() + 1; // Fix timezone offset rough patch if needed, or use split
  // Better safe parsing from YYYY-MM-DD
  const parts = dateStr.split('T')[0].split('-');
  const d = parseInt(parts[2]);
  const m = parseInt(parts[1]) - 1;
  const y = parts[0];
  return `${d} DE ${MONTHS[m]} DE ${y}`;
}

export function formatDateRange(startStr: string, endStr?: string) {
    if (!startStr) return '';
    const startParts = startStr.split('T')[0].split('-');
    const d1 = parseInt(startParts[2]);
    const m1 = parseInt(startParts[1]) - 1;
    const y1 = startParts[0];

    if (!endStr) return `${d1} DE ${MONTHS[m1]} DE ${y1}`;

    const endParts = endStr.split('T')[0].split('-');
    const d2 = parseInt(endParts[2]);
    const m2 = parseInt(endParts[1]) - 1;
    const y2 = endParts[0];

    if (m1 === m2 && y1 === y2) {
        return `${d1} E ${d2} DE ${MONTHS[m1]} DE ${y1}`;
    }
    
    return `${d1} DE ${MONTHS[m1]} E ${d2} DE ${MONTHS[m2]} DE ${y2}`;
}

/**
 * Simple sanitizer to allow only basic tags and strip scripts/events.
 * Not as robust as DOMPurify but works without extra deps.
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';
    
    // 1. Remove script tags and their content
    let sanitized = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    
    // 2. Remove on* event handlers (onclick, onload, etc)
    sanitized = sanitized.replace(/on\w+="[^"]*"/gim, "");
    sanitized = sanitized.replace(/on\w+='[^']*'/gim, "");
    
    // 3. Remove javascript: links
    sanitized = sanitized.replace(/href="javascript:[^"]*"/gim, 'href="#"');
    
    return sanitized;
}

/**
 * Retorna o link correto para um curso ou evento, priorizando links personalizados
 * e tratando tags específicas. Também remove prefixos de hash duplicados.
 */
export function getCourseLink(course: any) {
    let link = '';
    
    if (course.customLink) {
        link = course.customLink;
    } else {
        const tags = course.tags || [];
        if (tags.includes('LISBOA_ABRIL_2026')) link = '/lp-lisboa-fev-2026';
        else if (tags.includes('WTECH_EUROPA_2026')) link = '/lp-wtech-lisboa';
        else if (tags.includes('PRORIDERS_EUROPA_2026')) link = '/lp-proriders-lisboa';
        else if (tags.includes('ERGONOMIA_ONLINE')) link = '/curso-suspensao-piloto';
        else if (tags.includes('CHAO_DE_OFICINA')) link = '/chao-de-oficina';
        else link = `/lp/${course.slug || course.id}`;
    }

    // Sanitize: remove "/#/" prefix if it exists to avoid duplication in HashRouter
    if (link.startsWith('/#/')) {
        link = link.substring(2);
    } else if (link.startsWith('#/')) {
        link = link.substring(1);
    }
    
    return link;
}
