import { formatSignedPct } from '../format';

export type MetricPill = { label: string; tone: 'green' | 'red' | 'amber' | 'gray' } | null;

/** Green when the change is good; pass invert for metrics where growth is bad. */
export function changePill(value: number | null | undefined, invert = false): MetricPill {
  if (value == null) return null;
  const bad = invert ? value > 0 : value < 0;
  return { label: formatSignedPct(value), tone: bad ? 'red' : 'green' };
}

/** Page state that snaps back to page 1 whenever the filter key changes, without an effect. */
export function pageForKey(state: { key: string; page: number }, key: string): number {
  return state.key === key ? state.page : 1;
}

export function plural(count: number, noun: string): string {
  return `${count.toLocaleString('en-NG')} ${noun}${count === 1 ? '' : 's'}`;
}
