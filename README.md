# ATTENDANCE Staff (FEG-TECH 5.1): Android APK project

Federal University Otuoke staff attendance app, packaged as a native Android app with [Capacitor](https://capacitorjs.com).
GitHub builds the APK for you; you do not need Android Studio.

## Folder layout (every path is relative to the repository root)

```
fuo-attendance-staff/
├── README.md                          this file
├── package.json                       npm packages (Capacitor 7)
├── capacitor.config.json              app id ng.edu.fuo.attendance.staff, app name, web folder
├── .gitignore
├── .github/
│   └── workflows/
│       └── build-apk.yml              GitHub Actions: builds the APK on every push
├── scripts/
│   ├── fetch-vendor.mjs               downloads jsQR, face-api.js, xlsx and the face models into www/
│   └── patch-android.mjs              adds camera permission, FUO icon and launch screen to android/
├── cloudflare/
│   ├── worker.js                      the sync server (unchanged, deploy it on Cloudflare as before)
│   └── CLOUDFLARE_SETUP.md
├── docs/
│   └── DEPLOYMENT.md                  original PWA hosting notes
└── www/                               THE APP (edit files here)
    ├── index.html                     loads modal.css, modal.js, native.js first
    ├── modal.js   modal.css           NEW: in-app alert / confirm / prompt / form box
    ├── native.js                      NEW: Android bridge (file export, Back button)
    ├── version.js                     change the version number here for a new release
    ├── app.js  face.js  hod.js  qr.js  qrgen.js  sync5.js  roster.js  offline.js
    ├── v32.js v33.js v34.js v35.js v36.js v41.js v44.js v45.js v46.js v48.js v50.js
    ├── style.css
    ├── sw.js  manifest.webmanifest    web-only (not used inside the APK)
    ├── logo.png  logo-96.png  icon-192.png  icon-512.png  icon-maskable-192.png
    ├── icon-maskable-512.png  apple-touch-icon.png  favicon-32.png  icon.svg
    ├── vendor/                        filled automatically at build time (jsQR, face-api, xlsx)
    └── models/                        filled automatically at build time (face models)
```

`android/` is **not** stored in the repo. The workflow creates it fresh each build (`npx cap add android`), then
`scripts/patch-android.mjs` customises it. This keeps the repo small and avoids stale Gradle files.

## Get your APK from GitHub (about 10 minutes the first time)

1. On github.com click **New repository**, name it e.g. `fuo-attendance-staff`, leave it empty, **Create**.
2. Upload this project. Easiest with Git on your computer, from inside the unzipped folder:
   ```
   git init
   git add -A
   git commit -m "Staff app APK project"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/fuo-attendance-staff.git
   git push -u origin main
   ```
   (Using the website's "upload files" button also works, but make sure the hidden `.github/workflows/build-apk.yml`
   file is included, or use GitHub Desktop.)
3. Open the repo's **Actions** tab. The **Build Android APK** run starts by itself (about 5 to 8 minutes).
   You can also press **Run workflow**.
4. When it shows a green tick, open the run and download **ATTENDANCE-Staff-APK** under *Artifacts*.
   Unzip it to get `ATTENDANCE-Staff-5.1.apk`, copy it to the phone and install it
   (allow "install unknown apps" when asked).
5. Optional: to publish a download link, create a tag (`git tag v5.1 && git push origin v5.1`). The APK is then
   attached to the repo's **Releases** page.

## Releasing an update

Edit files in `www/`, change `APP_VERSION` in `www/version.js`, commit and push. A new APK is built automatically.
Install it over the old one: saved students and settings stay, because the app id does not change.

## What changed from the PWA

| Area | Change |
|---|---|
| Alerts, questions, text entry | Every browser `alert()`, `confirm()` and `prompt()` (41 places in 11 files) now uses the in-app box `AppModal` (`www/modal.js`). Dangerous actions show a red button. Multi-field edits (lecturer, course, student, class) are now one form with inline error messages instead of four pop-ups in a row. PIN fields are masked. |
| Safety net | `modal.js` also replaces `window.alert` and disables `confirm`/`prompt`, so a native pop-up can never appear. |
| Offline | jsQR, face-api.js, the Excel reader and the face models are bundled into the APK (downloaded by `scripts/fetch-vendor.mjs`). No internet is needed for the first face scan any more. The service worker and the "Offline readiness" card are skipped inside the APK. |
| Exports | CSV / Excel / backup downloads open the Android share sheet (`www/native.js`), where you pick Drive, Files, WhatsApp, etc. |
| Eligibility "PDF" | An Android WebView cannot print, so the button shares a printable `.html` file instead. Open it in Chrome and choose Print > Save as PDF. |
| Sync "Share link" | A web link cannot open the APK, so it shares the sync address (and key) as text. Paste it into **Sync URL** on the other phone. |
| Back button | Closes an open box first, then uses the screen's own Back button, otherwise minimises the app. |
| Font | The Google "Plus Jakarta Sans" download was removed (needs internet); the phone's system font is used. |

## Things to know

* The APK is signed with Android's **debug** key. It installs fine for staff. For the Play Store you will need a
  release keystore (ask and I will add signing to the workflow).
* I could not run the Gradle build in my sandbox (no internet), so the first GitHub run is the real test. If it fails,
  open the failed step in the Actions log and send me the red error lines.
* Face data lives in the app's private storage. Uninstalling the app deletes it, so keep using **Backup** in the app.
