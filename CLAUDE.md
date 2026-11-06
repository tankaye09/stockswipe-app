# CLAUDE.md

@AGENTS.md

AGENTS.md (imported above) holds the Expo rules and this project's code rules. This file adds the context that several
people and agents working on the repo at once keep needing. Keep it short, and update it in the same PR when a rule
changes.

## What this is

Haystack ("find the needle"): a swipe feed of stocks for iOS and Android, built with Expo (React Native + TypeScript) and Expo
Router. Cards explain a company in plain English with a chart and key stats. The feed tab is the Stack, and found stocks
are Needles: right-swipe saves to Needles > Watchlist, or in Trade mode hands off to the user's broker and lists the
stock under Needles > Trades, as paper trades do too. Left-swipe skips. Markets are US and SGX, US
first. The app runs on sample data in `src/data/mock` unless a build turns on live data, which comes from our Supabase
database, filled daily by `jobs/sync` from Yahoo, Nasdaq and SGX for private testing only (README "Real stock data").
Real stocks' breakdowns are written once by Claude in that job (`ANTHROPIC_API_KEY` secret); the app never calls Claude.
There is no real trading in the app. See README.md for the feature map and folder layout.

The app is called Haystack (store listing name "Haystack: Find the needle"). The bundle ID and Android package are
`com.needleinhaystack.app` and the link scheme is `haystack` (Kaye, 6 Nov 2026). Never change them after the first store
release. The Expo slug stays `stockswipe-app` so the EAS project, update URL and dev-client QR codes keep working.

## Code standards

- Easy to maintain, read and scale. Pure rules in `src/feed/` and `src/state/rules.ts`, thin screens.
- Full test coverage. Every change comes with unit/component tests (Jest thresholds in `package.json`: 98% statements,
  functions, lines; 95% branches) and a Maestro flow for any new or changed user journey.
- E2E flows are isolated and can run in parallel. Each flow starts with `runFlow: ../subflows/onboard.yaml` (which
  clears app state), never depends on another flow or on run order, and taps elements by `testID`.
- One shared UI for both platforms. No iOS-only or Android-only code, components or styling. The only accepted
  `Platform.select` is for values the stores force to differ, such as per-store SDK keys or ad unit IDs.
- No buy/sell verdicts anywhere in content or UI, and every feed card says why it was shown. The app explains; it does
  not recommend. (Paper trading buttons are fine.)
- The feed is rule-based and explainable (4 liked / 3 news / 3 wildcard per 10). Ads and payments never change which
  stocks are shown.

## Before you push

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test:coverage
```

Native builds and e2e flows run in CI; this container can't run simulators.

## CI and e2e

- The repo is public for now (5 Nov 2026), so standard runners are free, but it may go private again, and it has hit
  its Actions budget before. Don't trigger workflows by hand to iterate (`workflow_dispatch`, especially iOS at ~10x
  the price); push fewer, larger commits; mark PRs as drafts while iterating, since e2e skips drafts.
- Merging: required checks are `Typecheck, lint, format, unit tests` and `E2E (Android) result`. Open the PR as ready
  (not draft) when it's done and turn on auto-merge (squash); it merges itself when both pass. The Android result
  check passes when e2e was skipped for a docs-only PR and fails on drafts.
- `ci.yml`: typecheck, lint, format, unit tests with coverage on every PR (Markdown-only pushes to `main` skip it).
- `e2e-android.yml`: builds a release APK on non-draft PRs that touch the app or flows (its `changes` job decides)
  and runs the Maestro flows. The APK is built once (#4) and the flows are split across `E2E_SHARDS` emulators, not one job per flow, because each
  emulator costs minutes to start (#17). With #6 the APK, Gradle, native build output and the `aosp_atd` emulator
  snapshot are cached, and a build-only run on `main` keeps the caches warm for PRs. Bump `APK_CACHE_VERSION` if you
  change how the APK is built, and `NATIVE_CACHE_VERSION` if you change Gradle or NDK settings.
- `e2e-ios.yml` (~50 min, never blocks a PR): runs after each merge to `main` that touches the app while the repo is
  public, nightly instead while it is private, on PRs labelled `run-ios-e2e` (use it for native deps or `app.json`
  changes), and on demand. If it goes red on `main`, fix it before merging more app changes. Expo SDK 58 needs **Xcode 26**
  (`expo-modules-jsi` uses Swift tools 6.2), so the job must use the `macos-26` runner (#5). Keep `set -o pipefail` on
  piped build steps so a failed `xcodebuild` fails its own step.
- Phone previews: `preview.yml` publishes each PR as an EAS Update and comments a QR code to open it in the Haystack
  development build (`eas.json` profile `development`, built on demand by `dev-build.yml`). It skips until the
  `EXPO_TOKEN` secret and the Expo project ID in `app.json` exist. Native changes need a new development build.
  `update-main.yml` does the same for `main` after each merge (EAS branch `main`). Both use live stock data when the
  `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets exist.
  `updates.checkAutomatically` is `ON_ERROR_RECOVERY` so release and e2e builds never fetch updates on launch;
  revisit before shipping OTA updates to the stores.
- The e2e workflows set `EXPO_PUBLIC_UNDO_MS=20000` so slow emulators can tap Undo, and (with #7)
  `EXPO_PUBLIC_ADMIN_TOOLS=1` so flows can use the admin page.

## Premium, limits and ads (#7)

- All revenue settings are in `src/monetization/config.ts`, read from `EXPO_PUBLIC_*` env vars (see `.env.example`).
- Purchases go through RevenueCat (`src/monetization/purchases.ts`), one API for both stores. Without a key, and always in
  Expo Go, the app uses test mode.
- Free tier limits (trial days, daily swipes, ad interval) always come from `effectiveLimits(state)`, never constants.
  They are layered: built-in defaults (7 / 50 / 10), then RevenueCat offering metadata
  (`free_days`, `daily_swipes`, `ad_every`) set in the RevenueCat dashboard with no app update, then per-device
  overrides from the hidden admin page `src/app/admin.tsx`.
- The admin page only exists in dev builds and builds with `EXPO_PUBLIC_ADMIN_TOOLS=1`. Never enable it in store builds.

## Working alongside other PRs

Several PRs are often open at once and touch the same files (`package.json`, `package-lock.json`, the e2e workflows,
README, AGENTS.md). Keep changes narrow, and rebase rather than rewrite when another PR lands first. After a lockfile
conflict, re-run `npm install`.
