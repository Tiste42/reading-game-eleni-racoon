'use client';

import { useEffect } from 'react';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

/**
 * Auto-update: when a newer build is live, reload to it. iOS home-screen web
 * apps cache the old shell aggressively, so without this a parent has to
 * manually clear it after every deploy. Checks on load and whenever the app
 * regains focus (a natural, non-disruptive moment to refresh).
 */
export default function VersionWatcher() {
  useEffect(() => {
    if (APP_VERSION === 'dev') return; // never auto-reload in local dev

    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok || stopped) return;
        const live = (await res.json())?.v;
        if (!live || live === APP_VERSION) return;
        const key = `reloaded-${live}`;
        if (sessionStorage.getItem(key)) return; // guard against reload loops
        sessionStorage.setItem(key, '1');
        window.location.replace(`${window.location.pathname}?_v=${encodeURIComponent(live)}`);
      } catch {
        /* offline or fetch blocked — try again next focus */
      }
    };

    check();
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  return null;
}
