"use client";

import { motion } from "framer-motion";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useSettings } from "@/context/SettingsContext";

const PRIMARY_ORB_HORIZONTAL_OFFSET = 40;
const PRIMARY_ORB_VERTICAL_OFFSET = 20;

export function NotFoundPage() {
  const { get } = useSettings();
  const logoUrl = get('logo_url');

  return (
    <div className="w-full relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_70%)] text-[var(--foreground)]">
      {/* Logo at the top */}
      {logoUrl && (
        <div className="absolute top-8 left-8 z-20">
          <a href="/">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-10 w-auto object-contain brightness-0 invert opacity-80 hover:opacity-100 transition-opacity" 
            />
          </a>
        </div>
      )}

      <div
        aria-hidden={true}
        className="-z-10 absolute inset-0 overflow-hidden"
      >
        <motion.div
          animate={{
            x: [
              0,
              PRIMARY_ORB_HORIZONTAL_OFFSET,
              -PRIMARY_ORB_HORIZONTAL_OFFSET,
              0,
            ],
            y: [
              0,
              PRIMARY_ORB_VERTICAL_OFFSET,
              -PRIMARY_ORB_VERTICAL_OFFSET,
              0,
            ],
            rotate: [0, 10, -10, 0],
          }}
          className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-purple-500/20 to-blue-500/20 blur-3xl"
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 5,
            ease: "easeInOut",
          }}
        />
        <motion.div
          animate={{
            x: [
              0,
              -PRIMARY_ORB_HORIZONTAL_OFFSET,
              PRIMARY_ORB_HORIZONTAL_OFFSET,
              0,
            ],
            y: [
              0,
              -PRIMARY_ORB_VERTICAL_OFFSET,
              PRIMARY_ORB_VERTICAL_OFFSET,
              0,
            ],
          }}
          className="absolute right-1/4 bottom-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400/10 to-pink-400/10 blur-3xl"
          transition={{
            repeat: Number.POSITIVE_INFINITY,
            duration: 5,
            ease: "easeInOut",
          }}
        />
      </div>

      <Empty>
        <EmptyHeader>
          <EmptyTitle className="font-extrabold text-8xl">404</EmptyTitle>
          <EmptyDescription className="text-nowrap">
            A página que você está procurando pode ter sido <br />
            removida ou não existe.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button asChild>
              <a href="/">
                <Home className="mr-2 h-4 w-4" /> Início
              </a>
            </Button>

            <Button asChild variant="outline">
              <a href="/cursos">
                <Compass className="mr-2 h-4 w-4" /> Explorar Cursos
              </a>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  );
}
