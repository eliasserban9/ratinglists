import { useState, useCallback } from "react";

const STORAGE_KEY = "rated-lists-ui-scale";

const SCALE_STEPS = [0.70, 0.82, 0.91, 1.00, 1.15, 1.30, 1.50];
const DEFAULT_INDEX = 3;

function stepLabel(index: number): string {
  const v = SCALE_STEPS[index];
  return v === 1 ? "1x" : `${v}x`;
}

function readIndex(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const n = parseInt(saved, 10);
      if (n >= 0 && n < SCALE_STEPS.length) return n;
    }
  } catch {}
  return DEFAULT_INDEX;
}

export function useUIScale() {
  const [index, setIndex] = useState<number>(readIndex);

  const saveIndex = useCallback((next: number) => {
    setIndex(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  }, []);

  const scaleUp = useCallback(() => {
    setIndex((i) => {
      const next = Math.min(i + 1, SCALE_STEPS.length - 1);
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const scaleDown = useCallback(() => {
    setIndex((i) => {
      const next = Math.max(i - 1, 0);
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return {
    zoom: SCALE_STEPS[index],
    label: stepLabel(index),
    canUp: index < SCALE_STEPS.length - 1,
    canDown: index > 0,
    scaleUp,
    scaleDown,
  };
}
