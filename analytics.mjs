/** Daily-candle analytics. Ratios are fractions; RSI is on a 0–100 scale. */
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function movingAverage(values, window) {
  if (!Number.isInteger(window) || window < 1) throw new RangeError('Window must be a positive integer');
  let sum = 0;
  const queue = [];
  return values.map(value => {
    if (!positive(value)) { queue.length = 0; sum = 0; return null; }
    queue.push(value); sum += value;
    if (queue.length > window) sum -= queue.shift();
    return queue.length === window ? sum / window : null;
  });
}

/** Wilder RSI; 14 changes require 15 consecutive closes. */
export function relativeStrengthIndex(values, window = 14) {
  if (!Number.isInteger(window) || window < 1) throw new RangeError('Window must be a positive integer');
  let previous = null, gains = 0, losses = 0, count = 0, result = null;
  for (const value of values) {
    if (!positive(value)) { previous = null; gains = 0; losses = 0; count = 0; result = null; continue; }
    if (previous === null) { previous = value; continue; }
    const change = value - previous;
    previous = value;
    const gain = Math.max(change, 0), loss = Math.max(-change, 0);
    count += 1;
    if (count <= window) {
      gains += gain; losses += loss;
      if (count < window) continue;
      gains /= window; losses /= window;
    } else {
      gains = (gains * (window - 1) + gain) / window;
      losses = (losses * (window - 1) + loss) / window;
    }
    result = losses === 0 ? (gains === 0 ? 50 : 100) : 100 - 100 / (1 + gains / losses);
  }
  return result;
}

export function computeAnalytics(candles = [], options = {}) {
  if (!Array.isArray(candles)) throw new TypeError('Candles must be an array');
  const closes = candles.map(candle => positive(candle?.close) ? candle.close : null);
  const validCloses = closes.filter(positive);
  const volumes = candles.map(candle => candle?.volume).filter(nonnegative);
  const highs = candles.map(candle => candle?.high).filter(positive);
  const lows = candles.map(candle => candle?.low).filter(positive);
  const logReturns = [];
  for (let index = 1; index < closes.length; index += 1) {
    if (closes[index] !== null && closes[index - 1] !== null) {
      logReturns.push(Math.log(closes[index] / closes[index - 1]));
    }
  }
  let volatility = null;
  if (logReturns.length >= 2) {
    const mean = logReturns.reduce((sum, value) => sum + value, 0) / logReturns.length;
    const variance = logReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (logReturns.length - 1);
    volatility = Math.sqrt(variance * 252);
  }
  let peak = 0, drawdown = 0;
  for (const close of validCloses) {
    peak = Math.max(peak, close);
    drawdown = Math.min(drawdown, close / peak - 1);
  }
  return {
    sma30: movingAverage(closes, 30),
    sma100: movingAverage(closes, 100),
    sma200: movingAverage(closes, 200),
    rsi14: relativeStrengthIndex(closes),
    volatility,
    periodReturn: options.requireBaseline ? (positive(options.returnBaseline?.close)&&validCloses.length ? validCloses.at(-1)/options.returnBaseline.close-1 : null) : validCloses.length >= 2 ? validCloses.at(-1) / validCloses[0] - 1 : null,
    maxDrawdown: validCloses.length >= 2 ? drawdown : null,
    averageVolume: volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : null,
    range: { high: highs.length ? Math.max(...highs) : null, low: lows.length ? Math.min(...lows) : null },
    latestClose: validCloses.at(-1) ?? null,
    observationCount: validCloses.length,
  };
}
