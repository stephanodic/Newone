import { useState, useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/** 30 minutes — auto-reload delay if the user ignores the update banner. */
const AUTO_RELOAD_DELAY = 30 * 60 * 1000;

/**
 * Detects when a new service-worker version has activated (autoUpdate mode).
 * Shows a persistent sonner toast at the top of the screen with an "Aggiorna"
 * button, and automatically reloads the page after AUTO_RELOAD_DELAY if the
 * user does nothing.
 *
 * ⚠️ Requires vite.config.ts to have `injectRegister: null` — if set to 'auto'
 * the plugin injects a second Workbox instance that reloads automatically,
 * bypassing onNeedReload and preventing the banner from ever appearing.
 *
 * Usage: call `useAppUpdate()` unconditionally at the top of App.
 */
export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // With registerType:'autoUpdate', the new SW calls skipWaiting automatically.
  // onNeedReload fires right after the new SW activates (workbox 'activated' event
  // with isUpdate=true). Providing onNeedReload suppresses the built-in
  // window.location.reload() so we can show the banner first.
  useRegisterSW({
    onNeedReload() {
      setUpdateReady(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Poll every 60 s in dev so we can test without waiting for browser poll
        if (import.meta.env.DEV) {
          setInterval(() => registration.update(), 60_000);
        }
      }
    },
    onRegisterError(error) {
      console.error('[SW] Registration error:', error);
    },
  });

  const doUpdate = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    toast.dismiss('app-update');
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!updateReady) return;

    toast('🔄 Aggiornamento disponibile', {
      id: 'app-update',
      description: "Nuova versione pronta — ricarica per applicarla.",
      duration: Infinity,
      position: 'top-center',
      action: {
        label: 'Aggiorna ora',
        onClick: doUpdate,
      },
    });

    // Auto-reload after 30 minutes even if the user ignores the banner
    timerRef.current = setTimeout(doUpdate, AUTO_RELOAD_DELAY);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [updateReady, doUpdate]);
}
