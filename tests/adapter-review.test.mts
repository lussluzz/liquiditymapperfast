import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBitfinexSubscription, bitfinexInstrumentId } from '../src/adapters/bitfinex.mts';

// What an independent review found wrong in the exchange adapters.

test('Bitfinex: a lower-case t marks the trading pair, and a capital T is a letter of the symbol', () => {
  const symbol = (value: string): string => buildBitfinexSubscription('depth', { symbol: value }).symbol as string;
  assert.equal(symbol('BTCUSD'), 'tBTCUSD');
  assert.equal(symbol('tBTCUSD'), 'tBTCUSD', 'the native form is accepted as it is');
  assert.equal(symbol('TRXUSD'), 'tTRXUSD', 'TRON was turned into "tRXUSD"');
  assert.equal(symbol('TONUSD'), 'tTONUSD');
  assert.equal(symbol('tTRXUSD'), 'tTRXUSD');
  assert.equal(symbol('tTONUSD'), 'tTONUSD');
  assert.equal(symbol('ETH-USD'), 'tETHUSD');
});

test('Bitfinex: the perpetual keeps its colon on the wire, and both symbol spellings meet at one instrument id', () => {
  const subscription = buildBitfinexSubscription('depth', { symbol: 'BTCF0:USTF0', precision: 'P0', frequency: 'F0', len: 250 });
  assert.equal(subscription.symbol, 'tBTCF0:USTF0', 'the exchange rejects the concatenated form ("symbol: invalid"); the colon stays');
  assert.equal(subscription.topic, 'book:tBTCF0:USTF0');
  assert.equal(bitfinexInstrumentId('BTCF0:USTF0'), 'bitfinex:BTCF0USTF0', 'the instrument id drops the t and the colon');
  assert.equal(bitfinexInstrumentId('tBTCF0USTF0'), 'bitfinex:BTCF0USTF0', 'the concatenated spelling lands on the same instrument id');
  assert.throws(() => buildBitfinexSubscription('depth', { symbol: 'NOF0:USD' }), /Invalid Bitfinex/, 'a quote without its F0 suffix is not a derivative pair');
});

