"use client";

import React, { useState } from "react";
import { Button } from "./button";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

interface CalendarDayProps {
  day: number | string;
  isHeader?: boolean;
  hasEvent?: boolean;
  isToday?: boolean;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isHeader,
  hasEvent,
  isToday,
}) => {
  return (
    <div
      className={cn(
        "col-span-1 row-span-1 flex h-10 w-10 items-center justify-center transition-all duration-300",
        isHeader ? "text-gray-500 font-bold" : "rounded-xl text-gray-400",
        hasEvent && "bg-wtech-gold text-black font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-105",
        !isHeader && !hasEvent && isToday && "border border-wtech-gold/30 text-white",
        !isHeader && !hasEvent && !isToday && "hover:bg-white/5 hover:text-white cursor-default"
      )}
    >
      <span className={cn(isHeader ? "text-[10px]" : "text-sm")}>
        {day}
      </span>
    </div>
  );
};

interface CalendarProps {
  events?: (string | { start: string; end?: string })[];
  className?: string;
}

export function Calendar({ events = [], className }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const firstDayOfMonth = new Date(currentYear, currentMonthIndex, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonthIndex + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === currentMonthIndex && 
           today.getFullYear() === currentYear;
  };

  const hasEvent = (day: number) => {
    const dayStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(e => {
        if (typeof e === 'string') return e.startsWith(dayStr);
        const start = e.start.split('T')[0];
        const end = (e.end || e.start).split('T')[0];
        return dayStr >= start && dayStr <= end;
    });
  };

  const renderCalendarDays = () => {
    const days: React.ReactNode[] = [];

    // Header days
    dayNames.forEach((day) => {
      days.push(<CalendarDay key={`header-${day}`} day={day} isHeader />);
    });

    // Empty start slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-start-${i}`} className="col-span-1 row-span-1 h-10 w-10" />
      );
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(
            <CalendarDay 
                key={`date-${i}`} 
                day={i} 
                hasEvent={hasEvent(i)}
                isToday={isToday(i)}
            />
        );
    }

    return days;
  };

  return (
    <BentoCard height="h-auto" className={className}>
      <div className="flex flex-col gap-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
             <div className="p-2 bg-wtech-gold/10 rounded-lg text-wtech-gold">
                <MessageSquare size={20} />
             </div>
             <h2 className="text-xl font-bold text-white uppercase tracking-tighter">
                Dúvidas sobre os treinamentos?
             </h2>
          </div>
          <p className="mb-6 text-sm text-gray-400 font-medium leading-relaxed">
            Nossa equipe técnica está pronta para ajudar você a escolher a melhor especialização.
          </p>
          <a 
            href="https://wa.me/551732312858" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button className="bg-wtech-gold text-black font-bold uppercase tracking-widest text-[10px] px-8 py-6 rounded-xl hover:scale-105 transition-transform flex items-center gap-2">
               Falar com Especialista
            </Button>
          </a>
        </div>

        <div className="relative">
          <div className="w-full rounded-[24px] border border-white/5 p-1 bg-black/20 backdrop-blur-sm">
            <div
              className="rounded-2xl border border-white/5 p-4 bg-gradient-to-b from-white/[0.02] to-transparent shadow-inner"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    {monthNames[currentMonthIndex]}, {currentYear}
                  </p>
                </div>
                <div className="flex gap-1">
                    <button 
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button 
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BentoCard>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  height?: string;
  className?: string;
}

export function BentoCard({
  children,
  height = "h-auto",
  className = "",
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-[2.5rem] border border-white/5 bg-[#0a0a0a] p-8 overflow-hidden transition-all duration-300",
        height,
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-wtech-gold/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
      
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
