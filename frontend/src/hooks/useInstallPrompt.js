import { useSyncExternalStore } from "react";

const INSTALLED_KEY = "collabry_pwa_installed";

/* =========================================================
   HELPERS
========================================================= */

const isBrowser = typeof window !== "undefined";

/* App standalone window me khuli hai = install ho chuka hai */
function isStandalone() {
  if (!isBrowser) return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    window.navigator.standalone === true // iOS
  );
}

/* iPhone / iPad: install event hota hi nahi, manual steps dikhane padte hain */
function detectIos() {
  if (!isBrowser) return false;

  const ua = window.navigator.userAgent;

  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1)
  );
}

function readInstalledFlag() {
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeInstalledFlag(value) {
  try {
    if (value) localStorage.setItem(INSTALLED_KEY, "1");
    else localStorage.removeItem(INSTALLED_KEY);
  } catch {
    /* storage band hai, koi baat nahi */
  }
}

/* =========================================================
   MODULE STORE
========================================================= */

let deferredPrompt = null;
let installed = isStandalone() || readInstalledFlag();

const listeners = new Set();

function buildSnapshot() {
  return {
    installed,

    /* Chrome / Edge / Android: asli install prompt available */
    canInstall: !installed && Boolean(deferredPrompt),

    /* Prompt nahi mila (iPhone, Firefox, dev server...): button phir bhi
       dikhao, click pe manual steps batao. Sirf installed ho to hide. */
    showManualHint: !installed && !deferredPrompt,

    isIos: detectIos(),
  };
}

let snapshot = buildSnapshot();

function emit() {
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

const serverSnapshot = {
  installed: false,
  canInstall: false,
  showManualHint: false,
  isIos: false,
};

const getServerSnapshot = () => serverSnapshot;

/* =========================================================
   BROWSER EVENTS (module load pe hi lagte hain, event miss nahi hota)
========================================================= */

if (isBrowser) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();

    deferredPrompt = event;

    /* Browser install offer kar raha hai => app abhi installed nahi hai
       (uninstall ke baad purana flag yahin saaf ho jata hai) */
    installed = false;
    writeInstalledFlag(false);

    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    writeInstalledFlag(true);

    emit();
  });
}

/* =========================================================
   PUBLIC API
========================================================= */

export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;

  /* prompt() ek event pe sirf ek baar chalta hai */
  deferredPrompt = null;

  emit();

  return outcome; // "accepted" | "dismissed"
}

export function useInstallPrompt() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return { ...state, install: promptInstall };
}