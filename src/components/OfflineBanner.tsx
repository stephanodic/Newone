import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface OfflineBannerProps {
  hasPendingWrites?: boolean;
  lastSyncedAt?: Date | null;
}

type BannerState = 'offline' | 'syncing' | 'synced' | 'hidden';

export default function OfflineBanner({ hasPendingWrites = false, lastSyncedAt }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [bannerState, setBannerState] = useState<BannerState>(
    navigator.onLine ? 'hidden' : 'offline',
  );

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;

    const handleOnline = () => {
      setIsOnline(true);
      setBannerState('syncing');
    };
    const handleOffline = () => {
      setIsOnline(false);
      clearTimeout(hideTimer);
      setBannerState('offline');
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(hideTimer);
    };
  }, []);

  // When pending writes are cleared while online → show "synced" briefly
  useEffect(() => {
    if (isOnline && !hasPendingWrites && bannerState === 'syncing') {
      setBannerState('synced');
      const t = setTimeout(() => setBannerState('hidden'), 2500);
      return () => clearTimeout(t);
    }
  }, [isOnline, hasPendingWrites, bannerState]);

  // Also hide the "synced" banner after delay if we jump straight there
  useEffect(() => {
    if (bannerState !== 'synced') return;
    const t = setTimeout(() => setBannerState('hidden'), 2500);
    return () => clearTimeout(t);
  }, [bannerState]);

  if (bannerState === 'hidden') return null;

  const syncLabel = lastSyncedAt
    ? format(lastSyncedAt, "d MMM · HH:mm", { locale: it })
    : null;

  const configs: Record<BannerState, { bg: string; icon: React.ReactNode; text: string; sub?: string }> = {
    offline: {
      bg: 'bg-slate-800 dark:bg-slate-700',
      icon: <WifiOff size={13} strokeWidth={2.5} className="shrink-0" />,
      text: hasPendingWrites ? `Offline · ${0} modifiche in attesa` : 'Offline',
      sub: syncLabel ? `Dati al ${syncLabel}` : 'Dati disponibili in cache',
    },
    syncing: {
      bg: 'bg-amber-500',
      icon: <RefreshCw size={13} strokeWidth={2.5} className="shrink-0 animate-spin" />,
      text: 'Sincronizzazione in corso...',
    },
    synced: {
      bg: 'bg-emerald-500',
      icon: <Wifi size={13} strokeWidth={2.5} className="shrink-0" />,
      text: 'Connesso',
      sub: syncLabel ? `Sincronizzato alle ${format(lastSyncedAt!, "HH:mm")}` : undefined,
    },
    hidden: { bg: '', icon: null, text: '' },
  };

  const cfg = configs[bannerState];

  return (
    <AnimatePresence>
      {bannerState !== 'hidden' && (
        <motion.div
          key={bannerState}
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          role="status"
          aria-live="polite"
          className={[
            'font-sans fixed top-0 left-0 right-0 z-[1001]',
            'flex flex-col items-center justify-center gap-0',
            'px-4 text-white',
            cfg.bg,
          ].join(' ')}
          style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))', paddingBottom: '0.5rem' }}
        >
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
            {cfg.icon}
            {cfg.text}
          </div>
          {cfg.sub && (
            <div className="flex items-center gap-1 text-[10px] text-white/70 mt-0.5">
              <Clock size={9} strokeWidth={2} />
              {cfg.sub}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
