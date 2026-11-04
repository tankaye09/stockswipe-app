# Swipe (working name)

A swipe feed of stocks for iOS and Android. Each card explains a company in plain English, with a price chart and key
stats. Swipe right to save (or hand off to your broker), swipe left to skip, and practise with paper trading.

> **Status: MVP on sample data.** Prices, stats and headlines are made up. No real trading happens in the app.

## Try it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. On a computer with Node 22: `npm install`, then `npm start`.
3. Scan the QR code with your phone camera (iOS) or the Expo Go app (Android).

## What's in the MVP

| Feature              | Where                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Interest onboarding  | `src/app/onboarding.tsx`                                                      |
| Swipe feed           | `src/app/(tabs)/index.tsx`, `src/components/SwipeDeck.tsx`                    |
| Explainable feed     | `src/feed/feedEngine.ts` (4 liked / 3 news / 3 wildcard per 10, with reasons) |
| Save / Trade mode    | Toggle on the feed; right-swipe saves or opens your broker, with undo         |
| Filters              | `src/app/filters.tsx` (sector, size, theme, earnings soon)                    |
| Stock detail         | `src/app/stock/[id].tsx` (breakdown, chart ranges, stats, news)               |
| Paper trading        | `src/components/PaperTradePanel.tsx`, `src/state/rules.ts` (buy/sell/short)   |
| Watchlist, portfolio | `src/app/(tabs)/watchlist.tsx`, `src/app/(tabs)/portfolio.tsx`                |
| Broker hand-off      | `src/broker/brokers.ts` (moomoo, Tiger, IBKR)                                 |
| Free limits and ads  | `src/state/rules.ts` (7 days unlimited, then 50/day; ad slot every 10 swipes) |
| US and SGX           | Both markets in sample data; pick in onboarding or Settings                   |

## How the code is organised

```
src/
  app/          Screens. Every file is a route (Expo Router). Keep logic out of here.
  components/   Reusable UI and small hooks.
  data/         Market data types and the provider interface. mock/ holds sample data.
  feed/         Feed rules (pure functions) and the hook that runs the card queue.
  state/        App state (reducer + provider, saved on device) and business rules.
  broker/       Links out to the user's broker.
  theme/        Colours, spacing, number formatting.
  __tests__/    Unit and component tests, mirroring the folders above.
e2e/            Maestro end-to-end flows for iOS and Android.
```

Principles:

- **Pure rules, thin screens.** Feed selection, limits, paper trade maths and valuation are plain functions in
  `feed/feedEngine.ts` and `state/rules.ts`, tested directly.
- **One seam for market data.** Everything goes through `MarketDataProvider` (`src/data/provider.ts`). To go live, write
  a provider for the chosen vendor and swap it in `src/data/index.ts`. Each market can use a different vendor, so SGX
  can come from a different source than US stocks.
- **No advice.** Cards describe and explain. They never say buy or sell, and every card says why it was shown.

## Commands

| Command                 | What it does                                |
| ----------------------- | ------------------------------------------- |
| `npm start`             | Start the dev server (scan with Expo Go)    |
| `npm test`              | Unit and component tests                    |
| `npm run test:coverage` | Tests with coverage (fails under 98% / 95%) |
| `npm run typecheck`     | TypeScript                                  |
| `npm run lint`          | ESLint (Expo config + React Compiler rules) |
| `npm run format`        | Prettier                                    |
| `npm run e2e`           | All Maestro flows on the connected device   |
| `npm run e2e:parallel`  | Flows split across 2 connected devices      |

## Tests

- **Unit and component tests** use Jest (`jest-expo`) and React Native Testing Library. Coverage is about 100% of lines
  and over 99% of branches. CI fails if coverage drops below the thresholds in `package.json`.
- **End-to-end tests** use [Maestro](https://maestro.mobile.dev). Flows live in `e2e/flows` and cover onboarding,
  saving, undo, skipping, paper trading, Trade mode and filters.
  - **Isolated:** every flow starts with `e2e/subflows/onboard.yaml`, which stops the app and clears its data, so no
    flow depends on another or on the order they run in. Run one on its own with
    `maestro test e2e/flows/paper-trade.yaml`.
  - **Parallel:** in CI each flow runs in its own job on its own emulator. Locally, boot two simulators or emulators
    and run `npm run e2e:parallel`.
  - To run locally, build and install the app (`npx expo run:ios` or `npx expo run:android`) and install Maestro.

## CI

- `ci.yml`: typecheck, lint, format check and unit tests with coverage, on every push and pull request.
- `e2e-android.yml`: builds a release APK once, then runs every flow in parallel, each on its own emulator, on every
  pull request. To keep it fast it reuses the last APK when nothing in it changed, restores the native build output
  and Gradle caches, skips R8 minifying, and boots each emulator from a saved snapshot of Google's slimmed-down
  `aosp_atd` test image. A build-only run on `main` fills the caches. Bump `APK_CACHE_VERSION` in the workflow after
  changing how the APK is built.
- `e2e-ios.yml`: builds for the iOS simulator and runs the flows, on pushes to `main` and on demand (macOS runners are
  slower and cost more).

## Before launch

- Choose a market data provider and licence (US and SGX), then replace the mock provider.
- Confirm broker deep links with moomoo, Tiger and IBKR, ideally with referral codes.
- Wire up in-app purchase for Premium (the Settings switch is a placeholder) and an ad network.
- Generate the AI breakdowns from real filings and news (the sample text is hand-written).
- Fintech lawyer review (MAS) of the wording, paper trading and broker hand-off.
- App name, icon and store listings.
