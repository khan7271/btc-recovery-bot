# btc-recovery-bot

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/khan7271/btc-recovery-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/khan7271/btc-recovery-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A trough-recovery trading bot for Coinbase Wrapped BTC (cbBTC) on Solana, built for make.fun's "Race a BTC trading bot live for 24 hours" bounty. Simulation only: it trades $1,000 of paper money against real on-chain 1-minute prices, minute by minute.

## Strategy

cbBTC on 1-minute bars is mostly noise — a typical 1-minute move is ~7 bps against a ~26 bps full-size round trip — so the bot trades rarely, and only after a recovery has confirmed itself on closed bars:

- **Entry (flat):** the close is at least 1% above the lowest close of the last 240 bars (4 hours) **and** above its 60-bar moving average. A bounce off a 4-hour trough that has already reclaimed its 1-hour average: a recovery, not a falling knife.
- **Exit (long):** the close is the lowest close of the last 60 bars — the recovery has rolled over — sell the whole position.
- **Cooldown:** no re-entry for 30 bars after an exit, so one chop cannot re-trigger the entry bar after bar.

Long only, one position, full cash on entry. No network, no wall clock, no files outside the repo, no randomness: the orders are a pure function of the closes seen, so two runs on the same bars answer identically.

## Local result (dev window)

Backtested on the kit's frozen 24-hour dev window with the replay's exact fill model (4 bps fee, 2 bps slippage, constant-product impact vs the bar's open depth):

- **Net PnL: +$6.09** (1 round trip: buy bar 397, sell bar 559)
- **Max drawdown: 0.76%**
- Buy-and-hold on the same window loses $31.63.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1: newline-delimited JSON on stdin/stdout (see the kit's `sdk/makefun-bars.ts`, vendored byte-identical under `vendor/`). Grade it locally with the kit:

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot . --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
