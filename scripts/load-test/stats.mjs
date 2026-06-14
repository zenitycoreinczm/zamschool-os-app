/**
 * @param {number[]} values
 * @param {number} p 0-100
 */
export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(rank, sorted.length - 1))];
}

/**
 * @param {number[]} latencies
 * @param {{ errors: number, total: number }} counters
 */
export function summarize(latencies, counters) {
  const total = counters.total || latencies.length;
  const errors = counters.errors || 0;
  const sum = latencies.reduce((acc, value) => acc + value, 0);

  return {
    total,
    errors,
    errorRatePercent: total ? Math.round((errors / total) * 10000) / 100 : 0,
    rps: 0,
    meanMs: latencies.length ? Math.round(sum / latencies.length) : 0,
    p50Ms: Math.round(percentile(latencies, 50)),
    p95Ms: Math.round(percentile(latencies, 95)),
    p99Ms: Math.round(percentile(latencies, 99)),
    maxMs: latencies.length ? Math.round(Math.max(...latencies)) : 0,
  };
}