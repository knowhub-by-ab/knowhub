#!/usr/bin/env bash
# Configures (optional native Firebase), syncs Capacitor, and builds the APK.
# Run from apps/web by .github/workflows/android.yml. Behaviour depends on which
# secrets are present (passed in as env vars).
set -euo pipefail

if [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  echo "Enabling native Firebase auth (google-services.json present)…"
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > android/app/google-services.json
  sed -i 's#dependencies {#dependencies {\n        classpath "com.google.gms:google-services:4.4.2"#' android/build.gradle
  echo "apply plugin: 'com.google.gms.google-services'" >> android/app/build.gradle
else
  echo "No GOOGLE_SERVICES_JSON secret — native sign-in disabled in this build."
fi

npx cap sync android

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "Building SIGNED release APK…"
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.jks
  cat >> android/app/build.gradle <<'GRADLE'
android {
    signingConfigs {
        release {
            storeFile file("release.jks")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.release }
    }
}
GRADLE
  ( cd android && ./gradlew assembleRelease --no-daemon )
  cp android/app/build/outputs/apk/release/app-release.apk "$GITHUB_WORKSPACE/knowhub.apk"
else
  echo "Building unsigned debug APK (no keystore secret set)…"
  ( cd android && ./gradlew assembleDebug --no-daemon )
  cp android/app/build/outputs/apk/debug/app-debug.apk "$GITHUB_WORKSPACE/knowhub.apk"
fi

echo "APK ready at knowhub.apk"
