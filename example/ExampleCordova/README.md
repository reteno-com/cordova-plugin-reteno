# ExampleCordova (Cordova demo)

## Setup

```bash
npm ci
```

## iOS notes

Cordova generates the iOS project under `platforms/ios`.
Reteno iOS SDK requires iOS 15.0+, and this demo is configured with `<preference name="deployment-target" value="15.0" />` in `config.xml`.
This demo also auto-configures `NotificationServiceExtension` after `cordova prepare/build ios` via `scripts/patch-ios-notification-extension.js`.

## Publish iOS build to TestFlight

This demo uses **fastlane** located at `fastlane/`.

### Prerequisites

- Xcode
- Ruby + Bundler (`gem install bundler`)
- Access to App Store Connect API key (`.p8`) and Match certificates repo

### 1) Prepare env file (do not commit secrets)

Template:

- `fastlane/.env.testflight.example`

Copy it to `fastlane/.env.testflight` and fill in values.

If you need to override the iOS build number, set `BUILD_NUMBER` in `fastlane/.env.testflight` (this updates `CFBundleVersion`).
If you need to override the iOS marketing version, set `APP_VERSION` in `fastlane/.env.testflight` (this updates `CFBundleShortVersionString`).

At minimum you must provide:

- `MATCH_GIT_URL`, `FASTLANE_TEAM_ID`, `MATCH_APP_IDENTIFIER`
- `APP_STORE_CONNECT_API_KEY_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_KEY_ID`
- Either `APP_STORE_CONNECT_API_KEY_PATH` or `APP_STORE_CONNECT_API_KEY_GIT_REPO_URL`

### 2) Ensure iOS platform exists

If `platforms/ios` is missing or out of date, regenerate it:

```bash
npx cordova platform rm ios || true
npx cordova platform add ios
```

### 3) Upload to TestFlight

From the demo root:

```bash
npm run publish:ios:testflight
```

This command runs `npm run build:ios:debug`, then invokes fastlane.

Fastlane then builds the archive (Release configuration, as configured in `fastlane/.env.testflight`) and uploads it to TestFlight.

Or manually:

```bash
bundle install
bundle exec fastlane ios testflight --env testflight
```

### Notes

- `MATCH_APP_IDENTIFIER` must include all bundle IDs present in the Xcode project (main app + extensions).
- If you see provisioning/profile mapping errors, double-check the list of app identifiers and that the targets exist.
- `match` runs in readonly mode by default (`MATCH_READONLY=true`). If you intentionally need to create/repair certs/profiles, run with `MATCH_READONLY=false` and set `MATCH_PASSWORD`.
- If `match` fails with `couldn't set additional authenticated data`, set `MATCH_FORCE_LEGACY_ENCRYPTION=true` (or use the updated lane which auto-falls back on unsupported OpenSSL builds).
