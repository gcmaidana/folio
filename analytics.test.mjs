import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalytics, movingAverage, relativeStrengthIndex } from './analytics.mjs';

const candles = closes => closes.map((close, index) => ({ date: `2026-01-${index + 1}`, close, high: close + 1, low: close - 1, volume: index * 100 }));
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('empty and short histories keep unavailable metrics null', () => {
  const empty = computeAnalytics([]);
  assert.equal(empty.rsi14, null);
  assert.equal(empty.volatility, null);
  assert.equal(empty.periodReturn, null);
  assert.equal(empty.averageVolume, null);
  assert.deepEqual(empty.range, { high: null, low: null });
  const short = computeAnalytics(candles([100, 110]));
  near(short.periodReturn, 0.1);
  assert.equal(short.volatility, null);
  assert.equal(short.rsi14, null);
  assert.deepEqual(short.sma30, [null, null]);
});

test('moving averages remain aligned and reset across missing values', () => {
  assert.deepEqual(movingAverage([1, 2, 3, null, 4, 5, 6], 3), [null, null, 2, null, null, null, 5]);
  const stats = computeAnalytics(candles(Array.from({ length: 200 }, (_, i) => i + 100)));
  assert.equal(stats.sma30[28], null);
  assert.equal(stats.sma30[29], 114.5);
  assert.equal(stats.sma100[98], null);
  assert.equal(stats.sma100[99], 149.5);
  assert.equal(stats.sma200[198], null);
  assert.equal(stats.sma200[199], 199.5);
});

test('RSI handles rising, falling, flat, and standard Wilder sample', () => {
  assert.equal(relativeStrengthIndex(Array.from({ length: 15 }, (_, i) => i + 100)), 100);
  assert.equal(relativeStrengthIndex(Array.from({ length: 15 }, (_, i) => 100 - i)), 0);
  assert.equal(relativeStrengthIndex(Array(15).fill(100)), 50);
  near(relativeStrengthIndex([44.34,44.09,44.15,43.61,44.33,44.83,45.10,45.42,45.84,46.08,45.89,46.03,45.61,46.28,46.28]), 70.46413502109705);
});

test('drawdown uses peak-to-trough closes and range uses intraday extrema', () => {
  const stats = computeAnalytics(candles([100, 120, 90, 110]));
  near(stats.maxDrawdown, -0.25);
  near(stats.periodReturn, 0.1);
  assert.equal(stats.averageVolume, 150);
  assert.deepEqual(stats.range, { high: 121, low: 89 });
});

test('annualized volatility uses sample deviation of daily log returns', () => {
  const stats = computeAnalytics(candles([100, 110, 99]));
  const a = Math.log(1.1), b = Math.log(0.9);
  near(stats.volatility, Math.abs(a - b) / Math.sqrt(2) * Math.sqrt(252));
});

test('invalid observations are neither zero prices nor fabricated returns', () => {
  const stats = computeAnalytics([{close:100}, {close:null}, {close:200}, {close:NaN,volume:-1}]);
  assert.equal(stats.observationCount, 2);
  assert.equal(stats.volatility, null);
  assert.equal(stats.averageVolume, null);
  assert.equal(stats.rsi14, null);
  assert.deepEqual(stats.range, {high:null,low:null});
  assert.throws(() => movingAverage([1,2], 0), RangeError);
});

test('YTD uses prior year final close, including first-session movement, and fails closed without baseline',()=>{
 const bars=candles([110,120]);
 near(computeAnalytics(bars,{requireBaseline:true,returnBaseline:{close:100}}).periodReturn,0.2);
 near(computeAnalytics(candles([110]),{requireBaseline:true,returnBaseline:{close:100}}).periodReturn,0.1);
 assert.equal(computeAnalytics(bars,{requireBaseline:true,returnBaseline:null}).periodReturn,null);
});
