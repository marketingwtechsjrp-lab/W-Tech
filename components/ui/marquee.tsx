import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from 'framer-motion';

interface MarqueeProps {
    children: React.ReactNode;
    reverse?: boolean;
    pauseOnHover?: boolean;
    speed?: number;
    className?: string;
    paused?: boolean;
}

export const Marquee = ({
    children,
    reverse = false,
    pauseOnHover = false,
    speed = 40,
    className = "",
    paused = false,
}: MarqueeProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const reducedMotion = useReducedMotion();
    const [distance, setDistance] = useState(0);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const measure = () => {
            const firstGroup = track.firstElementChild as HTMLElement | null;
            const gap = Number.parseFloat(window.getComputedStyle(track).columnGap || '0');
            const nextDistance = (firstGroup?.getBoundingClientRect().width || track.scrollWidth / 2) + gap;
            setDistance(nextDistance);
            x.set(reverse ? -nextDistance : 0);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        return () => observer.disconnect();
    }, [reverse, x]);

    useAnimationFrame((_time, delta) => {
        if (!distance || paused || (pauseOnHover && hovered) || reducedMotion) return;
        const pixelsPerMillisecond = distance / (Math.max(speed, 1) * 1000);
        let next = x.get() + (reverse ? 1 : -1) * pixelsPerMillisecond * delta;

        if (reverse && next >= 0) next -= distance;
        if (!reverse && next <= -distance) next += distance;
        x.set(next);
    });

    return (
        <div
            className={`flex w-full overflow-hidden whitespace-nowrap [mask-image:_linear-gradient(to_right,transparent_0,_black_64px,_black_calc(100%-64px),transparent_100%)] md:[mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)] ${className}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <motion.div
                ref={trackRef}
                className="flex gap-4 md:gap-6 w-max items-center"
                style={{ x }}
            >
                <div className="flex gap-4 md:gap-6 items-center shrink-0">
                    {children}
                </div>
                <div className="flex gap-4 md:gap-6 items-center shrink-0" aria-hidden="true">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};
