# Android app (Capacitor)

The Question Importer ships as the same React/Vite app on the web and inside a
Capacitor Android shell. `src/` is the single implementation; `android/` only
adds native bridges. The web build is unchanged and still deploys to Vercel.

## Architecture

```
src/ (React + TypeScript)
  ├─ web build ─────────────► dist/ ─────────────► Vercel
  └─ same dist/ ──► Capacitor WebView ──► android/
                        │
                        ├─ @capacitor/camera      camera + multi-gallery
                        ├─ @capacitor/app         app background/foreground
                        ├─ @capacitor/network     connectivity state
                        ├─ @capacitor/preferences local draft text
                        └─ secure storage plugin  encrypted session
```

- **App ID:** `bd.porokh.questionimporter` (Android `applicationId` and
  namespace).
- **App name:** `Porokh Importer`.
- **Scheme:** `https://localhost` inside the WebView (`server.androidScheme`).
- **HTTP:** `CapacitorHttp` is enabled, so API calls use the native HTTP stack.
  This keeps the deployed backend contract and CORS allowlist unchanged. The
  backend still verifies the Supabase bearer token on every request.
  `src/services/http.ts` calls `CapacitorHttp.request` directly on Android
  because the patched WebView `fetch` ignores `AbortSignal` and has no socket
  timeouts. Requests get a 15 s connect timeout and a 30 s read timeout
  (120 s for extraction), and the cancel button rejects the waiting caller.
  Native requests cannot be cancelled mid-socket; the timeout bounds them.
- **Base URL:** the same `VITE_API_URL` used by the web build, read at build
  time. For the Android emulator the backend host is `10.0.2.2`, e.g.
  `http://10.0.2.2:5000/api/v1`.

## Requirements

- Node.js 22+ and npm.
- JDK 21 (Capacitor 8 plugins compile with Java 21).
- Android Studio with Android SDK 36 and the matching build tools.
- An Android device or emulator running Android 7.0 (API 24) or newer.

Capacitor reads `android/local.properties` for the SDK path. Android Studio
creates it automatically; command-line builds can create it with:

```properties
sdk.dir=/absolute/path/to/Android/Sdk
```

`local.properties` is git-ignored.

## Development setup

```bash
npm install
cp .env.example .env.local   # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                  # web app on http://localhost:5173
```

The ANON key is a publishable client key. No AI provider key, service-role key
or other secret is read by the app or bundled into the APK.

### Sync web changes into Android

```bash
npm run build
npx cap sync android
```

`cap sync` copies `dist/` into `android/app/src/main/assets/public`, updates the
native plugin list and Gradle wiring. Run it after **every** web build; an old
`dist/` is the usual cause of "the app shows the previous version".

## Builds

### Debug APK

```bash
npm run android:debug
# or
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Install on a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

`npm run android:open` opens the project in Android Studio.

### Release APK / AAB

```bash
npm run android:release
# or
cd android && ./gradlew assembleRelease   # APK
cd android && ./gradlew bundleRelease     # AAB
```

Outputs:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## Release signing

Signing keys are never committed. `android/app/build.gradle` reads
`android/keystore.properties` when the file exists and otherwise leaves the
release build unsigned, so local debug builds still work.

1. Create the keystore **outside the repository** (or anywhere ignored):

   ```bash
   keytool -genkeypair -v \
     -keystore ~/keys/porokh-importer-release.jks \
     -alias porokh-importer \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/keystore.properties` (git-ignored):

   ```properties
   storeFile=/absolute/path/to/porokh-importer-release.jks
   storePassword=REPLACE_ME
   keyAlias=porokh-importer
   keyPassword=REPLACE_ME
   ```

3. Build with `./gradlew bundleRelease`.

4. Keep the keystore, passwords and `keystore.properties` out of git and out of
   chat. Losing the keystore prevents updates to an already published app.

The debug keystore (`android/app/debug.keystore`) is the standard Android debug
key and is not used for release.

## Permissions

Declared in `android/app/src/main/AndroidManifest.xml`:

| Permission | Why |
| --- | --- |
| `INTERNET` | Backend and Supabase requests. |
| `ACCESS_NETWORK_STATE` | Online/offline banner and blocked extraction. |

There are deliberately **no camera or media permissions**. Camera 8.2.6 opens
`android.media.action.IMAGE_CAPTURE` in the system camera app, and gallery
selection uses the Android Photo Picker (with `ACTION_OPEN_DOCUMENT` as the
fallback). The plugin documentation states that it needs no permissions unless
`saveToGallery: true`; this app always passes `saveToGallery: false`. Removing
`READ_MEDIA_IMAGES` also avoids Android 14's partial "Selected photos" access
mode, because the picker returns only the URIs the user chose.

Cleartext HTTP is disabled by default and allowed only for `10.0.2.2`,
`localhost` and `127.0.0.1` through
`android/app/src/main/res/xml/network_security_config.xml`. This is for local
development only; production uses HTTPS.

## Android compatibility notes

- **API 24-28 (Android 7-9):** gallery uses `ACTION_OPEN_DOCUMENT`; no storage
  permission is requested. Camera uses the system camera intent.
- **API 29-32 (Android 10-12):** photo picker is used where available, otherwise
  `ACTION_OPEN_DOCUMENT`. No media permission is needed.
- **API 33+ (Android 13+):** system Photo Picker; `READ_MEDIA_IMAGES` is not
  declared or requested.
- **API 34+ (Android 14+):** no partial-media access to handle; the picker grants
  access only to selected URIs.
- **API 35-36 (Android 15-16):** target SDK 36, edge-to-edge and keyboard insets
  are handled by Capacitor 8 plus the app's safe-area CSS. Verify on a device.
- Multi-select `limit` is honoured on Android 13+ and may be ignored by older
  pickers, so the UI also enforces the 12-image cap.

## Continuous integration

`.github/workflows/android.yml` runs on GitHub-hosted Ubuntu with Node 24, JDK
21 and Android SDK 36. It runs `npm ci`, tests, typecheck, the Vite production
build, `npx cap sync android`, `./gradlew assembleDebug` and uploads
`porokh-question-importer-debug` (the `app-debug.apk`) for 14 days.

The workflow reads `VITE_API_URL`, `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` from repository **variables**, not secrets. Those are
publishable values; without them the build still succeeds but the APK is not
configured for a backend. No signing key or secret is committed or uploaded.

## Native plugins

| Plugin | Used for |
| --- | --- |
| `@capacitor/core` | Runtime, WebView bridge, `CapacitorHttp`. |
| `@capacitor/android` | Native platform project. |
| `@capacitor/camera` | `takePhoto` and multi-select `chooseFromGallery`. |
| `@capacitor/app` | Pauses an active extraction when the app backgrounds. |
| `@capacitor/network` | Connectivity state; extraction is blocked offline. |
| `@capacitor/preferences` | Non-sensitive local draft text only. |
| `@aparajita/capacitor-secure-storage` | Session tokens in Android Keystore-backed encrypted preferences. |

No push-notification plugin is installed in this phase.

## Image flow

1. Camera: `Camera.takePhoto({ quality: 85, correctOrientation: true })`.
2. Gallery: `Camera.chooseFromGallery` with multiple selection, up to 12 images.
3. Each native result is decoded through its WebView `webPath` with an `<img>`
   element and converted to a JPEG `File`. It is deliberately not read with
   `fetch`, because `CapacitorHttp` routes fetch through native HTTP and cannot
   reach the WebView's local file server.
4. Files are validated (JPG/PNG/WEBP, 6 MB) and photos are rendered to a
   downscaled JPEG (1800 px long edge, quality 0.85), which also applies EXIF
   orientation and keeps question text readable.
5. Selection order is preserved; images can be reordered and removed before
   extraction.
6. Extraction uses the existing `POST /ai/extract-questions` contract, batches
   and per-image error reporting. Failed images can be retried individually.

Native URIs are never treated as browser `File` objects; conversion happens in
`src/services/imagePickerService.ts`. The web build keeps the existing hidden
file inputs.

## Authentication and local recovery

- Native sessions are stored with the Android Keystore-backed secure storage
  plugin, not in `localStorage` or Preferences. The web build keeps its
  per-tab `sessionStorage` behaviour.
- Tokens refresh in `src/services/authService.ts`; concurrent requests share a
  single refresh. A session generation guard prevents an in-flight refresh from
  writing credentials back after sign-out, and storage writes are serialized so
  a slow write cannot land after the logout remove.
- A 401 clears the session and returns to sign-in. Logout removes the native
  secure-storage entry before the server revoke request (which is best effort).
- Draft text (pasted text and the reviewed plain text) is saved locally and
  restored after a restart with a visible "not imported" banner. Selected files
  and in-flight extraction are **not** recoverable: the backend does not persist
  import sessions yet.

## Testing

```bash
npm test             # node --test
npm run typecheck    # tsc -b
npm run build        # tsc -b && vite build
npm run android:sync # sync dist into android/
npx cap doctor       # inspect the native project
```

The reproducible APK build is the CI workflow above. Local Gradle builds require
JDK 21 and Android SDK 36; a Termux/Android-ARM environment cannot run the Linux
Android SDK build tools and is not a supported way to produce the APK.

Manual Android checks after installing a build:

- Sign in, kill the app, reopen: the session is restored.
- Take a photo with the rear camera; cancel the camera and confirm no error.
- Select several gallery images, reorder them, remove one, extract.
- Cancel the camera and the photo picker; confirm neither leaves an error or a
  stuck progress state.
- Turn on airplane mode: the offline banner appears and extraction is blocked.
- Background the app during extraction: the run stops without claiming success,
  and the partial text is kept.
- Import a validated batch and confirm import history.

## Known limitations

- Extraction cannot resume after app termination; the backend has no
  persistent import queue. Local drafts are text only.
- Multi-image selection uses the system picker; the `limit` option is honoured
  on Android 13+ and may be ignored on older versions.
- A native HTTP request cannot be cancelled mid-socket. Cancelling or timing out
  stops the UI from waiting; the socket is closed by the native timeouts.
- Native camera, gallery, Keystore restore and lifecycle behaviour still need a
  real-device test. CI builds and inspects the APK but does not run it.
- There is no server push notification support yet. A future phase can add
  `@capacitor/push-notifications` and register it beside the existing app
  lifecycle handling without restructuring the shell.
- Release builds require the local signing setup above; the repository ships no
  signing material.
- The Android project is generated by Capacitor. Re-running `npx cap add
  android` would overwrite the manifest, network config and signing block, so
  use `npx cap sync android` instead.
