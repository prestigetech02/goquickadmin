import { useLayoutEffect, useRef, useState } from 'react';

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Rounds an axis maximum up to 1, 2, 2.5, 5 or 10 × a power of ten. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const fraction = value / magnitude;
  const step = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Left gutter wide enough for the longest 9px axis label, e.g. "₦12,500,000". */
export function axisWidthFor(longestLabel: string, minimum: number): number {
  return Math.max(minimum, Math.ceil(longestLabel.length * 5.6) + 6);
}

/** Monotone cubic (Fritsch–Carlson): smooth, but never overshoots the data, so ₦0 days stay on the baseline. */
export function smoothPath(points: Array<{ x: number; y: number }>): string {
  const n = points.length;
  if (n === 0) return '';
  if (n < 3) return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const slopes = points.slice(0, -1).map((p, i) => (points[i + 1].y - p.y) / (points[i + 1].x - p.x));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  });
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      tangents[i] = (3 / h) * a * slopes[i];
      tangents[i + 1] = (3 / h) * b * slopes[i];
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = (p2.x - p1.x) / 3;
    d += ` C ${p1.x + dx} ${p1.y + tangents[i] * dx}, ${p2.x - dx} ${p2.y - tangents[i + 1] * dx}, ${p2.x} ${p2.y}`;
  }
  return d;
}
