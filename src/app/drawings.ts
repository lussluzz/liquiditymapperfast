/** Chart drawings: the lines a trader lays over the map by hand. A drawing is two anchor points in chart space (time and price), so it
 * moves and zooms with the market, and a kind that says how the points are read. Pure geometry lives here; the pane draws and the store keeps. */

export interface Drawing {
  kind: 'hline' | 'trend' | 'fibo';
  t1: number; p1: number;
  t2: number; p2: number;
}

export const DRAW_TOOLS = ['', 'hline', 'trend', 'fibo'] as const;
export type DrawTool = (typeof DRAW_TOOLS)[number];

/** The retracement ratios, from the far anchor (0) to the near one (1); 0.5 is not a Fibonacci number but traders read it all the same. */
export const FIBO_LEVELS: readonly number[] = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** A drawing from storage or a layout file: only the three known kinds, finite numbers, kept as it came otherwise nothing. */
export function readDrawings(raw: unknown): Drawing[] {
  if (!Array.isArray(raw)) return [];
  const out: Drawing[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if ((r.kind !== 'hline' && r.kind !== 'trend' && r.kind !== 'fibo') || typeof r.t1 !== 'number' || !Number.isFinite(r.t1)
      || typeof r.p1 !== 'number' || !Number.isFinite(r.p1) || typeof r.t2 !== 'number' || !Number.isFinite(r.t2)
      || typeof r.p2 !== 'number' || !Number.isFinite(r.p2)) continue;
    out.push({ kind: r.kind, t1: r.t1, p1: r.p1, t2: r.t2, p2: r.p2 });
  }
  return out.slice(0, 200);
}

/** A finished drawing, or null when the gesture was too small to have meant anything (a click is not a line). A horizontal line only
 * needs the price; the drag's other end is ignored. */
export function commitDrawing(kind: Drawing['kind'], t1: number, p1: number, t2: number, p2: number): Drawing | null {
  if (kind === 'hline') return { kind, t1, p1, t2: t1, p2: p1 };
  const span = Math.hypot(t2 - t1, p2 - p1);
  if (!Number.isFinite(span) || span < 1) return null;
  return { kind, t1, p1, t2, p2 };
}

/** Whether a chart point lands on the drawing: `tolT` and `tolP` are the pointer's slack in chart units (the pane derives them from pixels). */
export function hitDrawing(d: Drawing, t: number, p: number, tolT: number, tolP: number): boolean {
  if (d.kind === 'hline') return Math.abs(p - d.p1) <= tolP;
  const tMin = Math.min(d.t1, d.t2) - tolT, tMax = Math.max(d.t1, d.t2) + tolT, pMin = Math.min(d.p1, d.p2) - tolP, pMax = Math.max(d.p1, d.p2) + tolP;
  if (t < tMin || t > tMax || p < pMin || p > pMax) return false;
  if (d.kind === 'fibo') {
    for (const level of FIBO_LEVELS) if (Math.abs(p - (d.p1 + (d.p2 - d.p1) * level)) <= tolP) return true;
    return false;
  }
  // The trend line: distance from the point to the segment, both axes normalised by their own tolerance so one unit is one hit everywhere.
  const dt = d.t2 - d.t1, dp = d.p2 - d.p1, lengthSq = (dt / tolT) ** 2 + (dp / tolP) ** 2;
  if (lengthSq === 0) return Math.abs(p - d.p1) <= tolP && Math.abs(t - d.t1) <= tolT;
  const u = Math.max(0, Math.min(1, ((t - d.t1) * dt / (tolT * tolT) + (p - d.p1) * dp / (tolP * tolP)) / lengthSq));
  return Math.hypot((t - d.t1 - u * dt) / tolT, (p - d.p1 - u * dp) / tolP) <= 1;
}

/** The retracement prices between the drawing's two anchors, far end first. The ratios leave float dust behind (100 + 78.6 reads
 * 178.60000000000002), and a price label would say so: trimmed at the twelfth decimal, far below any market's tick. */
export function fiboPrices(d: Drawing): { level: number; price: number }[] {
  return FIBO_LEVELS.map(level => ({ level, price: Math.round((d.p1 + (d.p2 - d.p1) * level) * 1e12) / 1e12 }));
}
