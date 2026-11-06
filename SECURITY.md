# Security

## Reporting a problem

Please don't open a public issue for a security problem. Email the maintainer
instead, and include steps to reproduce it.

## Rules for this codebase

- **Treat saved state and deep links as untrusted.** Anything read from
  storage goes through `parseSavedState` and any stock id from a route param
  goes through `parseStockIdParam` (both in `src/state/persist.ts`). When you
  add a field to `AppState`, add a check for it there too.
- **Secrets never go in the app.** Anything in the JS bundle, including every
  `EXPO_PUBLIC_*` variable, can be read by anyone who downloads the app. Only
  publishable keys (for example a RevenueCat public SDK key) belong there.
  Private keys stay on a server or in EAS/GitHub secrets.
- **Tokens and personal data go in `expo-secure-store`**, not AsyncStorage,
  once the app has accounts or sign-in.
- **HTTPS only.** Don't turn on cleartext traffic or relax App Transport
  Security.
- **Open outside links only to known hosts.** Broker links are built from a
  fixed list in `src/broker/brokers.ts` with the symbol URL-encoded.
- **Keep the privacy declarations true.** When you add an SDK that collects
  data (analytics, ads, crash reporting, payments), update
  `ios.privacyManifests` in `app.json`, the App Store privacy labels, the
  Google Play data safety form and the privacy policy (`src/legal/privacyPolicy.ts`, then
  `npm run privacy` for `PRIVACY.md`) in the same change.
- **Dependencies:** CI fails on any moderate or worse `npm audit` finding.
  Fix it with `npx expo install --fix`, `npm update`, or a narrow `overrides`
  entry in `package.json`, and remove the override once the parent package
  ships the fix.
