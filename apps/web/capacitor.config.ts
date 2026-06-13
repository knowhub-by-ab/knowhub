import type { CapacitorConfig } from "@capacitor/cli";

// KnowHub Android wrapper (Capacitor). The APK loads the live, always-updated
// site, so it stays in sync with deploys. `webDir` is still required for the
// build tooling. Built into an APK via .github/workflows/android.yml and
// distributed through GitHub Releases (spec 18).
const config: CapacitorConfig = {
  appId: "dev.knowhub.app",
  appName: "KnowHub",
  webDir: "dist",
  server: {
    url: "https://knowhub-ai.pages.dev",
    cleartext: false,
  },
  plugins: {
    // Use the native Google account picker, then sign the JS SDK in with the
    // returned credential (skipNativeAuth) so the web app's auth state is used.
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ["google.com"],
    },
  },
};

export default config;
