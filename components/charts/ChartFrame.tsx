"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChartFrameProps = {
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
  minHeight?: number;
};

/**
 * Measures its box before mounting Recharts so ResponsiveContainer never sees -1 dimensions.
 */
export function ChartFrame({ children, className, minHeight = 280 }: ChartFrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    };

    update(node.clientWidth, node.clientHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      update(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("w-full min-w-0", className)}
      style={{ minHeight }}
    >
      {size ? children(size) : null}
    </div>
  );
}