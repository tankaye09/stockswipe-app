This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project

- Screens live in `src/app/`; business rules are pure functions in `src/feed/` and `src/state/rules.ts`. Keep logic out of screens.
- Revenue settings live in `src/monetization/config.ts` (env vars). Screens use `purchases()` and `AdCard`, never `react-native-purchases` or `react-native-google-mobile-ads` directly. Free tier limits always come from `effectiveLimits(state)`, never constants.
- All market data goes through `MarketDataProvider` in `src/data/provider.ts`. Never import `src/data/mock` from screens.
- Tests live in `src/__tests__/` (never in `src/app/`, where every file is a route). `src/test-utils.tsx` renders with app state.
- React Native Testing Library v14: `render`, `fireEvent` and `userEvent` calls are async and must be awaited.
- Before finishing: `npm run typecheck`, `npx eslint . --max-warnings 0`, `npm run format:check`, `npm run test:coverage`.
- Add a Maestro flow in `e2e/flows` for any new user journey, and use `testID`s for anything a flow taps.
- No buy/sell language anywhere in the UI. Cards explain; they do not recommend.
