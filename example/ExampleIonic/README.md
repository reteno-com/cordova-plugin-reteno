# ExampleIonic (Capacitor demo)

This demo keeps the Capacitor native projects (`android/`, `ios/`) out of git.
Generate/sync them locally.

## Setup

```bash
npm i
npm run build
```

## Generate native projects

```bash
npx cap add android
npx cap add ios
```

## Sync

```bash
npx cap sync
```

Notes:
- iOS requires Xcode + CocoaPods.
