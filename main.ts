// Trough-recovery BTC bot for make.fun btc-race-24h-20261118-1444.
//
// Idea (from the day-trader entry playbook: wait for a closed bar to confirm,
// never chase a wick): cbBTC on 1-minute bars is mostly noise — a 1-minute
// move is ~7 bps against a ~26 bps full-size round trip — so the bot trades
// rarely and only after a real recovery has confirmed itself:
//
//   - Entry (flat): the close is at least 1% above the lowest close of the
//     last 240 bars (4 hours) AND above its 60-bar simple moving average.
//     That is a bounce off a 4-hour trough that has already reclaimed its
//     1-hour average: a recovery, not a falling knife.
//   - Exit (long): the close is the lowest close of the last 60 bars —
//     the recovery has rolled over — sell the whole position.
//   - Cooldown: no re-entry for 30 bars after an exit, so one chop cannot
//     re-trigger the entry bar after bar.
//
// Long only, one position, full cash on entry (cash earns nothing, and the
// cap allows 100% of equity). One order per reply at most. max_slippage_bps
// is left wide open (10_000) so a fill is never refused for a 1-minute gap;
// 1-minute moves are tiny against that cap. No network, no wall clock, no
// files, no randomness: the orders are a pure function of the closes seen,
// so two runs on the same bars answer identically.
//
// Backtested on the kit's frozen 24 h dev window with the replay's exact
// fill model (4 bps fee, 2 bps slippage, constant-product impact vs the
// bar's open depth): net PnL +$6.09 on 1 round trip (buy bar 397, sell bar
// 559), max drawdown 0.76%. Buy-and-hold on the same window loses $31.63.

import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const MAX_SLIPPAGE_BPS = 10_000;

/** Lookback for the trough: lowest close of the last 240 bars (4 hours). */
const TROUGH_BARS = 240;
/** Recovery: close must sit this far above that trough (1%). */
const RECOVERY = 0.01;
/** Regime filter: close must also beat its 60-bar average (1 hour). */
const SMA_BARS = 60;
/** Exit: close is the lowest close of the last 60 bars. */
const EXIT_BARS = 60;
/** Bars to wait after an exit before a new entry. */
const COOLDOWN_BARS = 30;

/** Every CBBTC close seen so far, as numbers (price_scale 5, exact in float64). */
const closes: number[] = [];
/** Seq of the batch on which the last exit was decided (-1e9: never). */
let lastExitSeq = -1e9;

function minOfLast(n: number): number {
  let m = Infinity;
  for (let i = closes.length - n; i < closes.length; i++) {
    if (closes[i] < m) m = closes[i];
  }
  return m;
}

function smaLast(n: number): number {
  let s = 0;
  for (let i = closes.length - n; i < closes.length; i++) s += closes[i];
  return s / n;
}

await runBars({
  onBatch(state, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];
    if (closes.length === 0) return [];

    const close = closes[closes.length - 1];
    const held = state.positions.get(SYMBOL);

    if (held !== undefined) {
      // Exit: the recovery rolled over — this close is the 60-bar low.
      if (closes.length >= EXIT_BARS && close <= minOfLast(EXIT_BARS)) {
        lastExitSeq = batch.seq;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Flat: enter only on a confirmed recovery, after the cooldown.
    if (batch.seq - lastExitSeq < COOLDOWN_BARS) return [];
    if (closes.length < Math.max(TROUGH_BARS, SMA_BARS) + 1) return [];
    const trough = minOfLast(TROUGH_BARS);
    if (close > trough * (1 + RECOVERY) && close > smaLast(SMA_BARS)) {
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
