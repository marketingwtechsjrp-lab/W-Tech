import React from "react";
import { cn } from "@/lib/utils";

interface GridVignetteBackgroundProps {
    size?: number;
    x?: number;
    y?: number;
    horizontalVignetteSize?: number;
    verticalVignetteSize?: number;
    intensity?: number;
}

export function GridVignetteBackground({
    className,
    size = 48,
    x = 50,
    y = 50,
    horizontalVignetteSize = 100,
    verticalVignetteSize = 100,
    intensity = 0,
}: React.ComponentProps<"div"> & GridVignetteBackgroundProps) {
    return (
        <div
            className={cn(
                "absolute inset-0 z-0 opacity-50 pointer-events-none bg-[image:linear-gradient(to_right,rgba(212,175,55,0.4),transparent_1px),linear-gradient(to_bottom,rgba(212,175,55,0.4),transparent_1px)]",
                className
            )}
            style={{
                backgroundSize: `${size}px ${size}px`,
                maskImage: `radial-gradient(ellipse ${horizontalVignetteSize}% ${verticalVignetteSize}% at ${x}% ${y}%, black ${100 - intensity
                    }%, transparent 100%)`,
            }}
        />
    );
}
