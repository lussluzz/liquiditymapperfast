import type { Store } from '../store.ts';
import { el } from '../dom.ts';
import { heading, note } from '../ui.ts';
import { t } from '../i18n.ts';
import { price as fmtPrice } from '../format.ts';
import { type DrawTool } from '../drawings.ts';

/** The names of the tools, in the order the panel offers them. */
const TOOL_LABELS: Exclude<DrawTool, ''>[] = ['hline', 'trend', 'fibo'];
const TOOL_NAME: Record<Exclude<DrawTool, ''>, string> = { hline: t('Horizontal line'), trend: t('Trend line'), fibo: t('Fib retracement') };

/**
 * The Drawings panel: three tools (a horizontal line, a trend line, a Fibonacci retracement), the drawings the page keeps (each with its
 * remove button), a clear-all, and how the keys work. The armed tool's press on the map is handled by the pane; this panel only arms it.
 */
export function buildDrawingsPanel(store: Store, tools: HTMLElement, body: HTMLElement, rebuild: () => void): void {
  const armed = store.state.drawTool, drawings = store.state.drawings;
  const row = el('div', { class: 'session-add draw-tools' });
  for (const kind of TOOL_LABELS) {
    row.append(el('button', { type: 'button', textContent: armed === kind ? t('Cancel') : TOOL_NAME[kind],
      tip: armed === kind ? t('Escape puts the tool down.') : TOOL_HINT[kind],
      onclick: () => { store.set({ drawTool: armed === kind ? '' : kind }); rebuild(); } }));
  }
  body.append(heading(t('Tools')), row);
  if (armed) body.append(note(armed === 'hline' ? t('Click the map at the price the line holds.') : t('Press on the map where the drawing begins, drag to where it ends.')));
  else body.append(note(t('Arm a tool, then lay the line on the map.')));
  body.append(heading(t('On the map')));
  if (!drawings.length) body.append(note(t('No drawings yet.')));
  drawings.forEach((d, i) => {
    const name = d.kind === 'hline' ? TOOL_NAME.hline : d.kind === 'trend' ? TOOL_NAME.trend : TOOL_NAME.fibo;
    const desc = d.kind === 'hline' ? fmtPrice(d.p1) : `${fmtPrice(d.p1)} → ${fmtPrice(d.p2)}`;
    const remove = el('button', { type: 'button', class: 'session-remove', ariaLabel: t('Remove'), tip: t('Remove this drawing'), onclick: () => { const list = store.state.drawings.slice(); list.splice(i, 1); store.set({ drawings: list }); rebuild(); } });
    body.append(el('div', { class: 'session-row vwap-anchor' }, el('span', { class: 'name', textContent: name }), el('span', { class: 'desc', textContent: desc }), remove));
  });
  if (drawings.length) {
    body.append(el('div', { class: 'session-add' }, el('button', { type: 'button', textContent: t('Clear drawings'), tip: t('Removes every drawing at once.'),
      onclick: () => { store.set({ drawings: [] }); rebuild(); } })));
  }
  body.append(note(t('Point at a drawing and press Delete to remove it; Escape puts the tool down.')));
}

const TOOL_HINT: Record<Exclude<DrawTool, ''>, string> = {
  hline: t('A line across the map at one price.'),
  trend: t('A line from one point of the map to another.'),
  fibo: t('The retracement levels between two prices.'),
};
