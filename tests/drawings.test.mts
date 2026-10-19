import test from 'node:test';
import assert from 'node:assert/strict';
import { commitDrawing, fiboPrices, hitDrawing, readDrawings } from '../src/app/drawings.ts';

// The geometry behind the trader's drawings: what a gesture must span to count, where a pointer counts as touching a line, and what
// storage may hand back.

test('a click is not a line: a trend or Fib drawing needs a real span, a horizontal line needs only its price', () => {
  assert.equal(commitDrawing('trend', 1_000, 60_000, 1_000, 60_000), null, 'both ends at the same point drew nothing');
  assert.equal(commitDrawing('trend', 1_000, 60_000, 1_000.5, 60_000.1), null, 'a hair of a drag is still a click');
  assert.deepEqual(commitDrawing('trend', 1_000, 60_000, 61_000, 61_000), { kind: 'trend', t1: 1_000, p1: 60_000, t2: 61_000, p2: 61_000 });
  assert.deepEqual(commitDrawing('hline', 5_000, 61_234.5, 9_000, 1), { kind: 'hline', t1: 5_000, p1: 61_234.5, t2: 5_000, p2: 61_234.5 }, 'the drag\'s other end is ignored: the line holds one price');
});

test('a pointer counts as touching a line when it lands within the slack on either axis', () => {
  const trend = { kind: 'trend' as const, t1: 0, p1: 0, t2: 1_000, p2: 1_000 };
  assert.equal(hitDrawing(trend, 500, 500, 10, 0.5), true, 'the middle of the segment');
  assert.equal(hitDrawing(trend, 500, 520, 10, 0.5), false, 'well off the line');
  assert.equal(hitDrawing(trend, 500, 509, 10, 5), true, 'inside the price slack');
  assert.equal(hitDrawing(trend, 1_100, 1_100, 10, 5), false, 'past the segment\'s end is not on it');
  const hline = { kind: 'hline' as const, t1: 0, p1: 61_000, t2: 0, p2: 61_000 };
  assert.equal(hitDrawing(hline, 123_456, 61_000.5, 1_000, 1), true, 'a horizontal line runs the whole map: any time is on it');
  assert.equal(hitDrawing(hline, 123_456, 60_000, 1_000, 1), false);
});

test('a Fibonacci retracement is touched on its level lines, and they read far anchor to near one', () => {
  const fib = { kind: 'fibo' as const, t1: 0, p1: 100, t2: 1_000, p2: 200 };
  const prices = fiboPrices(fib).map(f => f.price);
  assert.deepEqual(prices, [100, 123.6, 138.2, 150, 161.8, 178.6, 200]);
  assert.equal(hitDrawing(fib, 500, 149.7, 1_000, 0.5), true, 'the 0.5 level line');
  assert.equal(hitDrawing(fib, 500, 155, 1_000, 0.5), false, 'between the levels is not on the drawing');
  assert.equal(hitDrawing({ ...fib, t1: 400, t2: 600 }, 500, 150, 10, 0.5), true, 'inside the time span');
  assert.equal(hitDrawing({ ...fib, t1: 400, t2: 600 }, 100, 150, 10, 0.5), false, 'outside the time span');
});

test('storage may hand back anything: only whole, finite drawings of the three kinds survive the read', () => {
  const good = { kind: 'hline', t1: 1, p1: 2, t2: 1, p2: 2 };
  assert.deepEqual(readDrawings([good, { kind: 'circle', t1: 1, p1: 1, t2: 1, p2: 1 }, { kind: 'trend', t1: 'x', p1: 1, t2: 2, p2: 2 }, null, 7]), [good]);
  assert.deepEqual(readDrawings({ not: 'an array' }), []);
  assert.equal(readDrawings(Array.from({ length: 400 }, () => good)).length, 200, 'a hoard of drawings is capped');
});
