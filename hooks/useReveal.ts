"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type UseRevealOptions = {
  threshold?: number;
  margin?: string;
  once?: boolean;
};

export function useReveal({
  threshold = 0.2,
  margin = "0px",
  once = true,
}: UseRevealOptions = {}) {
  const ref = useRef<Element>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: margin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, margin, once]);

  return { ref, visible };
}