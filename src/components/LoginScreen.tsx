import React, { useState } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';


export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await onLogin();
    } catch (e) {
      console.error(e);
      toast.error('Errore durante il login');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-[#1D9E75] to-[#0ea572] flex flex-col items-center justify-center p-8 font-sans"
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm flex flex-col items-center gap-10"
      >
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-24 h-24 bg-white/20 backdrop-blur rounded-[32px] flex items-center justify-center shadow-2xl shadow-black/20"
          >
            <img src="/logo.png" alt="MoneyTrack" className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-[32px] font-black text-white tracking-tight">MoneyTrack</h1>
            <p className="text-[13px] text-white/70 font-medium text-center">Tieni traccia delle tue spese</p>
          </div>
        </div>

        <motion.button
          onClick={handleLogin}
          disabled={isLoading}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-white rounded-[20px] shadow-xl flex items-center justify-center gap-3 font-black text-[13px] text-slate-700 uppercase tracking-widest transition-opacity disabled:opacity-70"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-slate-200 border-t-[#1D9E75] rounded-full"
            />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Accedi con Google
            </>
          )}
        </motion.button>

<p className="text-[11px] text-white/40 text-center">I tuoi dati sono protetti e privati</p>
      </motion.div>
    </motion.div>
  );
}
