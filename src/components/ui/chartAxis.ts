export function formatAxisTick(value: number): string {
  return Math.round(value).toLocaleString('en-NG');
}

/** Y-axis width for 11px ticks; one spare digit covers Recharts rounding the top tick up. */
export function yAxisWidth(values: number[]): number {
  const longest = formatAxisTick(Math.max(0, ...values) * 10).length;
  return Math.max(40, Math.ceil(longest * 6.6) + 8);
}
