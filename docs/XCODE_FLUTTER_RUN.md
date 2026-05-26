# Run DayPilot in Xcode & Simulator

## Quick start (recommended)

1. **Simulator:** Xcode → **Window → Devices and Simulators**, or run `open -a Simulator`.
2. **Config:** `daypilot_flutter/dart-define.json` must exist (copy from `dart-define.example.json`).
3. **Terminal (loads Supabase + API defines):**
   ```bash
   cd ~/Desktop/DayPilot
   pnpm flutter:run
   ```
   Or pick a device: `cd daypilot_flutter && ./run.sh -d "iPhone 17 Pro"`

4. **Xcode (inspect native iOS):** open **`daypilot_flutter/ios/Runner.xcworkspace`** (not `.xcodeproj`).

## Open Xcode

**If the repo lives on Desktop** (common CodeSign issue), open the **Developer run copy** used by `./run.sh`:

```bash
open ~/Developer/daypilot_flutter_run/ios/Runner.xcworkspace
```

Otherwise:

```bash
open ~/Desktop/DayPilot/daypilot_flutter/ios/Runner.xcworkspace
```

Long-term fix: move the repo to `~/Developer/DayPilot` (not Desktop).

In Xcode:

- **Scheme:** `Runner`
- **Destination:** any **iPhone** simulator (e.g. iPhone 17 Pro)
- **Signing:** **Runner** target → **Signing & Capabilities** → select your **Team** (Apple ID) for device builds; simulators do not require a paid team.

## Important: dart-defines

The app reads `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `DAYPILOT_API_URL` at compile time.  
**Pressing Run in Xcode alone** does not pass those unless you configure them.

| How to run | Dart-defines |
|------------|----------------|
| `pnpm flutter:run` / `./run.sh` | ✅ From `dart-define.json` |
| Xcode ▶ Run | ❌ unless you add them to the scheme (below) |

### Optional: Run from Xcode with defines

1. **Product → Scheme → Edit Scheme… → Run → Arguments**
2. Under **Environment Variables** or use a **Pre-action** script that exports defines (fragile).

Easier: keep using **`flutter run`** for day-to-day UI work; use Xcode for breakpoints in Swift/ObjC, signing, and **Product → Archive** for TestFlight.

## Option C API (events)

If `DAYPILOT_API_URL` is `http://localhost:3001`, start the Nest API from the repo root:

```bash
pnpm install
pnpm db:migrate:deploy   # once, with Postgres
pnpm dev --filter @daypilot/api
```

Simulator uses `localhost` for the Mac host.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Configuration missing” screen | Fill `dart-define.json`; run via `./run.sh`, not raw Xcode Run |
| No simulators in Flutter | `open -a Simulator`; `xcrun simctl boot "iPhone 17 Pro"` |
| Pod errors | `cd daypilot_flutter/ios && pod install --repo-update` |
| Signing errors on device | Xcode → Runner → Signing → Team + unique bundle ID |
| `resource fork, Finder information … not allowed` | Repo on **Desktop**: use `pnpm flutter:run` / `./run.sh` (syncs to `~/Developer/daypilot_flutter_run`) or move the project off Desktop |

See also: `daypilot_flutter/README.md`, `docs/OPTION_C_SETUP.md`.
