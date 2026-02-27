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
- Reteno iOS SDK requires iOS 15.0+.

## Publish iOS build to TestFlight

This demo uses **fastlane** located at `ios/App/fastlane`.

### Prerequisites

- Xcode
- Ruby + Bundler (`gem install bundler`)
- Access to App Store Connect API key (`.p8`) and Match certificates repo

### 1) Prepare env file (do not commit secrets)

Template:

- `ios/App/fastlane/.env.testflight.example`

Copy it to `.env.testflight` in the same folder and fill in values.

If you need to override the iOS build number, set `BUILD_NUMBER` in `.env.testflight` (this updates `CFBundleVersion`).
If you need to override the iOS marketing version, set `APP_VERSION` in `.env.testflight` (this updates `CFBundleShortVersionString`).

At minimum you must provide:

- `MATCH_GIT_URL`, `FASTLANE_TEAM_ID`, `MATCH_APP_IDENTIFIER`
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_KEY_ID`
- Either `APP_STORE_CONNECT_API_KEY_PATH` or `APP_STORE_CONNECT_API_KEY_GIT_REPO_URL`

### 2) Build web + sync iOS

```bash
npm ci
npm run build
npx cap sync ios
```

### 3) Upload to TestFlight

From the demo root:

```bash
npm run publish:ios:testflight
```

Or manually:

```bash
cd ios/App
bundle install
bundle exec fastlane ios testflight --env testflight
```

### Notes

- `MATCH_APP_IDENTIFIER` must include all bundle IDs present in the Xcode project (main app + extensions).
- If you see provisioning/profile mapping errors, double-check the list of app identifiers and that the targets exist.
- If CocoaPods fails with "required a higher minimum deployment target", ensure `ios/App/Podfile` uses `platform :ios, '14.0'` or higher, then run `npx cap sync ios` again.
- `match` runs in readonly mode by default (`MATCH_READONLY=true`). If you intentionally need to create/repair certs/profiles, run with `MATCH_READONLY=false` and set `MATCH_PASSWORD`.
- If `match` fails with `couldn't set additional authenticated data`, set `MATCH_FORCE_LEGACY_ENCRYPTION=true` (or use the updated lane which auto-falls back on unsupported OpenSSL builds).
