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
| Free limits and ads  | `src/state/rules.ts`, `src/monetization/` (see Revenue below)                 |
| Premium paywall      | `src/app/paywall.tsx`, `src/monetization/purchases.ts` (RevenueCat)           |
| Admin page           | `src/app/admin.tsx` (test builds only: try limits on one device)              |
| US and SGX           | Both markets in sample data; pick in onboarding or Settings                   |

## Revenue

All settings live in `src/monetization/config.ts` and come from `EXPO_PUBLIC_*` variables (see `.env.example`), so
none of them need code changes. Without any of them set, the app runs in test mode: purchases are simulated and free,
and the ad card promotes Premium instead of showing a real ad.

| Feature          | How it works                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free tier        | Unlimited swipes for 7 days, then 50 a day. Counted per device.                                                                                                                 |
| Premium          | Unlimited swipes, no ads. Monthly and yearly plans through RevenueCat, which handles the App Store and Google Play with one API.                                                |
| Ads              | A card every 10 stock swipes for free users: a 300x250 AdMob ad, or a Premium card if no ad loads. Non-personalised only (no tracking prompt). Ads never change the stock feed. |
| Broker referrals | Users without a broker see “Open an account” links in Settings, with a referral-fee disclosure.                                                                                 |

### Changing the limits for everyone (no app update)

In the RevenueCat dashboard, open Product catalog → Offerings → your current offering → Metadata, and set:

```json
{ "free_days": 7, "daily_swipes": 50, "ad_every": 10 }
```

Leave a key out to keep the app's default. Apps pick up changes on next launch, and keep the last values when offline.
Order of precedence: built-in defaults (env vars), then dashboard metadata, then the admin page on one device.

### Admin page

Settings → “Admin: limits and test tools”, in development builds and builds made with `EXPO_PUBLIC_ADMIN_TOOLS=1`
(internal testing and e2e). It overrides limits on that device only and can end the trial or reset today's count. Never
set `EXPO_PUBLIC_ADMIN_TOOLS` in store builds, or anyone could give themselves unlimited swipes.

### Accounts to set up before launch

1. **RevenueCat** (free to start): create a project, connect App Store Connect and Google Play, add an entitlement
   `premium`, and an offering with standard Monthly and Annual packages. Put the public SDK keys in
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
2. **App Store Connect and Google Play Console**: create the two auto-renewing subscriptions and set their prices there.
   The paywall shows the store's price. `EXPO_PUBLIC_PREMIUM_*_PRICE` is only shown in test mode.
3. **Google AdMob**: create an iOS and an Android app, replace the test app IDs in `app.json` (plugin
   `react-native-google-mobile-ads`), create a 300x250 banner unit for each and set `EXPO_PUBLIC_ADMOB_FEED_UNIT_IOS` /
   `_ANDROID`. Set up the consent message (Privacy & messaging) for EU/UK users.
4. **Broker partner programmes** (moomoo, Tiger, IBKR): put each referral link in `EXPO_PUBLIC_REFERRAL_*`.

Purchases and AdMob need a development build (`npx expo run:ios|android`); Expo Go always uses test mode.

## How the code is organised

```
src/
  app/          Screens. Every file is a route (Expo Router). Keep logic out of here.
  components/   Reusable UI and small hooks.
  data/         Market data types and the provider interface. mock/ holds sample data.
  feed/         Feed rules (pure functions) and the hook that runs the card queue.
  state/        App state (reducer + provider, saved on device) and business rules.
  broker/       Links out to the user's broker, and referral sign-up links.
  monetization/ Revenue config, Premium purchases (RevenueCat), ads (AdMob) and the launch sync.
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
  saving, undo, skipping, paper trading, Trade mode, filters, Premium, the daily limit, feed ads and broker referrals.
  - **Isolated:** every flow starts with `e2e/subflows/onboard.yaml`, which stops the app and clears its data, so no
    flow depends on another or on the order they run in. Run one on its own with
    `maestro test e2e/flows/paper-trade.yaml`.
  - **Parallel:** in CI each flow runs in its own job on its own emulator. Locally, boot two simulators or emulators
    and run `npm run e2e:parallel`.
  - To run locally, build and install the app (`npx expo run:ios` or `npx expo run:android`) and install Maestro.

## CI

- `ci.yml`: typecheck, lint, format check and unit tests with coverage, on every push and pull request.
- `e2e-android.yml`: builds a release APK once, then runs every flow in parallel, each on its own emulator, on every
  pull request.
- `e2e-ios.yml`: builds for the iOS simulator on macOS 26 (Expo SDK 58 needs Xcode 26) and runs the flows one after
  another on one simulator, on pushes to `main` and on demand (macOS runners are
  slower and cost more).

## Before launch

- Choose a market data provider and licence (US and SGX), then replace the mock provider.
- Confirm broker deep links with moomoo, Tiger and IBKR, and join their referral programmes.
- Set up RevenueCat, store subscriptions and AdMob (see Revenue above).
- Generate the AI breakdowns from real filings and news (the sample text is hand-written).
- Fintech lawyer review (MAS) of the wording, paper trading and broker hand-off.
- App name, icon and store listings.
