# DayPilot mobile — TestFlight & Play internal testing

Use this guide for **Phase H** (items 28–30 in `docs/FLUTTER_MIGRATION_TASKS.md`).

**Bundle ID / application ID:** `com.dekuworks.daypilot` (URL scheme for Auth deep link remains `com.daypilot.daypilot://login-callback/`)  
**ASC app:** [DayPilot Daily](https://appstoreconnect.apple.com/apps/6798407960) (`6798407960`)  
**Version:** bump `version:` in `daypilot_flutter/pubspec.yaml` (e.g. `1.0.0+4`) for each store upload.

---

## 1. One-time store setup

### Apple (TestFlight)

1. [Apple Developer Program](https://developer.apple.com/programs/) membership.
2. [App Store Connect](https://appstoreconnect.apple.com/) → **Apps** → **+** → New App → iOS, name **DayPilot**, bundle ID `com.daypilot.daypilot`.
3. Xcode → open `daypilot_flutter/ios/Runner.xcworkspace` → **Signing & Capabilities** → select your **Team**, enable **Automatically manage signing**.
4. Privacy policy URL (required for external testers): e.g. `https://daypilot.co/privacy`.

### Google Play (internal testing)

1. [Google Play Console](https://play.google.com/console/) → create app **DayPilot**.
2. Complete **Dashboard** checklist (app access, ads, content rating, target audience, news app, COVID declarations as applicable).
3. **Internal testing** track → create release (first upload can be draft).

---

## 2. Build configuration (local)

### Environment

Production mobile / TestFlight builds need Supabase + Nest API baked in at compile time (`dart-define.json` is gitignored):

```bash
cd daypilot_flutter
cp dart-define.example.json dart-define.json
# Edit:
#   SUPABASE_URL=https://wmkytyrcxbzjqiykbauw.supabase.co
#   SUPABASE_ANON_KEY=<anon or publishable from Supabase dashboard>
#   DAYPILOT_API_URL=https://api-production-6c2c.up.railway.app
```

Release IPA (from Desktop sources; `./run.sh` rsyncs to `~/Developer/daypilot_flutter_run` for CodeSign):

```bash
# After editing dart-define.json + bumping pubspec build number:
DEV_RUN="${DAYPILOT_IOS_RUN_DIR:-$HOME/Developer/daypilot_flutter_run}"
# Prefer: sync via daypilot_flutter/run.sh pattern, then:
cd "$DEV_RUN"
flutter build ipa --release --dart-define-from-file=dart-define.json
# Upload: xcrun altool --upload-app -f build/ios/ipa/*.ipa -t ios --apiKey … --apiIssuer …
```

### Android signing

```bash
keytool -genkey -v -keystore daypilot-upload.keystore -alias daypilot -keyalg RSA -keysize 2048 -validity 10000
cp android/key.properties.example android/key.properties
# Fill storePassword, keyPassword, keyAlias, storeFile
```

Never commit `key.properties` or `*.keystore`.

### iOS

Use Xcode **Product → Archive** with **Release** and your distribution certificate, or GitHub Actions (below) with App Store Connect API key.

---

## 3. GitHub Actions — internal release workflow

Workflow: **`.github/workflows/flutter_release.yml`** (manual: **Actions → Flutter release → Run workflow**).

### Required GitHub secrets

| Secret | Used for |
|--------|----------|
| `ANDROID_KEYSTORE_BASE64` | Base64 of upload keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Key password |
| `ANDROID_KEY_ALIAS` | e.g. `daypilot` |
| `FLUTTER_DART_DEFINES_JSON` | Full JSON for `--dart-define-from-file` (prod Supabase + API URLs) |
| `APP_STORE_CONNECT_API_KEY_ID` | iOS upload (optional job) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | iOS upload |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | `.p8` key contents |
| `IOS_DISTRIBUTION_CERTIFICATE_BASE64` | Distribution `.p12` (optional) |
| `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD` | `.p12` password |
| `IOS_PROVISIONING_PROFILE_BASE64` | App Store profile for `com.daypilot.daypilot` |

Until secrets are set, the workflow still builds **unsigned** iOS and **debug-signed** Android artifacts for smoke checks.

### After a successful run

- Download **daypilot-android-aab** artifact → Play Console → **Internal testing** → Create release → upload AAB.
- Download **daypilot-ios-ipa** (when signing secrets exist) → Transporter or App Store Connect API → TestFlight **Internal testing** group.

---

## 4. Manual upload (no CI)

### Android AAB

```bash
cd daypilot_flutter
flutter build appbundle --release --dart-define-from-file=dart-define.prod.json
# Output: build/app/outputs/bundle/release/app-release.aab
```

### iOS (TestFlight)

```bash
flutter build ipa --release --dart-define-from-file=dart-define.prod.json
# Or Xcode Organizer after Archive
```

Upload with [Transporter](https://apps.apple.com/app/transporter/id1450874784) or Xcode **Distribute App**.

---

## 5. QA before beta (item 29)

Run **`docs/FLUTTER_QA_CHECKLIST.md`** on a physical device with **production** defines. Sign off on the checklist before inviting external testers.

---

## 6. Beta launch (item 30)

1. **TestFlight:** App Store Connect → your app → **TestFlight** → internal group → add testers by email.
2. **Play:** **Internal testing** → copy opt-in link → share with testers.
3. Track feedback; bump `version: x.y.z+N` in `pubspec.yaml` for each new binary.

---

## Related docs

- `daypilot_flutter/README.md` — local run & defines
- `docs/OPTION_C_SETUP.md` — Supabase + Nest API
- `docs/FLUTTER_QA_CHECKLIST.md` — manual QA
