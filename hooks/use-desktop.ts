"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";
const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribe(cb: () => void) {
  const desktop = window.matchMedia(DESKTOP_QUERY);
  const standalone = window.matchMedia(STANDALONE_QUERY);
  desktop.addEventListener("change", cb);
  standalone.addEventListener("change", cb);
  return () => {
    desktop.removeEventListener("change", cb);
    standalone.removeEventListener("change", cb);
  };
}

function getSnapshot() {
  // Desktop web UI only when the viewport is wide AND we're in a real browser
  // tab (not an installed PWA). Installed PWAs stay on the mobile UI.
  const isWide = window.matchMedia(DESKTOP_QUERY).matches;
  const isStandalone = window.matchMedia(STANDALONE_QUERY).matches;
  return isWide && !isStandalone;
}

function getServerSnapshot() {
  // SSR renders the mobile branch; the client swaps after mount. Matching the
  // server value to the mobile branch avoids hydration mismatches.
  return false;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
