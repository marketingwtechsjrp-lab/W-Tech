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
