"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type TabItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
};

export type ExpandableTabsProps = {
  tabs: TabItem[];
  defaultTabId?: string;
  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
};

export const ExpandableTabs = ({
  tabs,
  defaultTabId,
  activeId,
  onChange,
  className,
}: ExpandableTabsProps) => {
  // Initialize state with activeId if provided, otherwise defaultTabId, otherwise first tab
  const [internalActiveTabId, setInternalActiveTabId] = useState(activeId || defaultTabId || tabs[0]?.id);

  // Sync internal state with external activeId prop if it changes
  useEffect(() => {
    if (activeId) {
        setInternalActiveTabId(activeId);
    }
  }, [activeId]);

  const handleTabClick = (id: string) => {
    setInternalActiveTabId(id);
    if (onChange) {
      onChange(id);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-black/20 text-secondary-foreground shadow-sm overflow-x-auto scrollbar-hide w-full",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = internalActiveTabId === tab.id;
        const Icon = tab.icon;

        return (
          <motion.div
            key={tab.id}
            layout
            className={cn(
              "flex items-center justify-center rounded-xl cursor-pointer overflow-hidden h-[50px] flex-shrink-0 transition-colors",
              // Use bg color only when active, or a neutral hover when not? 
              // The original used `tab.color` which contains a bg class. 
              // We'll trust the user provided `tab.color` has valid bg classes.
              // If not active, maybe gray? The original logic applies `tab.color` always, 
              // but maybe we only want it when active or always? 
              // Looking at the demo, `bg-pink-500` is applied.
              // Let's keep it simple: apply tab.color. 
              // BUT: usually inactive tabs are gray. 
              // Let's modify: if !isActive, use gray-100/dark:gray-800.
              isActive ? tab.color : "bg-gray-100 dark:bg-gray-800",
              isActive ? "flex-1" : "flex-none w-[50px]",
            )}
            onClick={() => handleTabClick(tab.id)}
            initial={false}
            animate={{
              width: isActive ? "auto" : 50, // Use auto for flexible width or fixed? Original used 140. Auto is better for varying label lengths.
              flexGrow: isActive ? 1 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
            // Minimum width to ensure icon fits
            style={{ minWidth: 50 }}
          >
            <motion.div
              className="flex items-center justify-center h-[50px] px-3"
              initial={{ filter: "blur(10px)" }}
              animate={{ filter: "blur(0px)" }}
              exit={{ filter: "blur(10px)" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Icon className={cn("flex-shrink-0 w-5 h-5", isActive ? "text-white" : "text-gray-500 dark:text-gray-400")} />
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.span
                    className="ml-3 text-white font-bold whitespace-nowrap"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {tab.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};
