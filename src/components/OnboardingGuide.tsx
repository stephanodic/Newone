import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptic';

const SLIDES = [
  {
    emoji: '👋',
    title: 'Benvenuto in MoneyTrack',
    text: 'La tua app per tenere traccia di spese e entrate in tempo reale. Semplice, veloce, sempre con te.',
    color: '#1D9E75',
  },
  {
    emoji: '🏠',
    title: 'Aggiungi una spesa',
    text: 'Tocca l\'icona di una categoria in Dashboard per aggiungere una spesa. Per l\'input vocale tieni premuta l\'icona: si apre una schermata verde "In ascolto..." — di\' ad alta voce es: "caffè 2 euro" e viene compilato in automatico.',
    color: '#11cc98',
  },
  {
    emoji: '🔢',
    title: 'Inserisci l\'importo',
    text: 'Usa il tastierino per inserire l\'importo. Puoi anche fare calcoli rapidi: scrivi 10+5 e premi Salva. Il campo note suggerisce la categoria in base a quello che scrivi.',
    color: '#0EA5E9',
  },
  {
    emoji: '📋',
    title: 'Cronologia',
    text: 'In Cronologia vedi tutte le transazioni con il saldo cumulativo. Scorri a sinistra su una riga per eliminarla. Usa la barra di ricerca per cercare per categoria, nota o importo.',
    color: '#6366F1',
  },
  {
    emoji: '🛒',
    title: 'Lista della Spesa',
    text: 'Sfoglia il catalogo per categoria e tocca un articolo per aggiungerlo alla lista. Tocca un articolo in "Da prendere" per segnarlo come preso. Toccalo di nuovo per riportarlo in lista.',
    color: '#F97316',
  },
  {
    emoji: '📊',
    title: 'Grafici e Categorie',
    text: 'In Grafici vedi la distribuzione delle spese e l\'andamento mensile. In Categorie puoi personalizzare le voci, cambiare icona e colore, e impostare un budget mensile per ogni categoria.',
    color: '#8B5CF6',
  },
  {
    emoji: '🔄',
    title: 'Aggiornare l\'app',
    text: 'Dal Profilo tocca "Forza aggiornamento app" per installare gli aggiornamenti.\n\niOS: rimuovi l\'app dalla Home e reinstallala da Safari.\n\nAndroid: Impostazioni → App → MoneyTrack → Cancella cache.',
    color: '#64748B',
  },
];

interface OnboardingGuideProps {
  onClose: () => void;
}

const OnboardingGuide = React.memo(({ onClose }: OnboardingGuideProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = currentSlide === SLIDES.length - 1;

  const goNext = useCallback(() => {
    haptic.light?.();
    if (isLast) { onClose(); return; }
    setDirection(1);
    setCurrentSlide(s => s + 1);
  }, [isLast, onClose]);

  const goPrev = useCallback(() => {
    haptic.light?.();
    setDirection(-1);
    setCurrentSlide(s => s - 1);
  }, []);

  const handleSkip = useCallback(() => {
    haptic.light?.();
    onClose();
  }, [onClose]);

  const slide = SLIDES[currentSlide];

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} />
      <motion.div
        className="relative w-full max-w-[430px] bg-white dark:bg-slate-800 rounded-t-[28px] z-10 overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full mx-auto mt-4 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-2">
          <div className="w-8" />
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={cn('h-1.5 rounded-full transition-all duration-300',
                  i === currentSlide ? 'w-6' : 'w-1.5 opacity-30'
                )}
                style={{ backgroundColor: i === currentSlide ? slide.color : '#94A3B8' }}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="w-10 h-10 flex items-center justify-center text-slate-400 active:scale-90 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Slide */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentSlide}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -direction * 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="px-6 py-4 text-center min-h-[220px] flex flex-col items-center justify-center"
          >
            <div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center text-5xl mb-5 shadow-lg"
              style={{ backgroundColor: slide.color + '20', border: `2px solid ${slide.color}30` }}
            >
              {slide.emoji}
            </div>
            <h2 className="text-[20px] font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
              {slide.title}
            </h2>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] whitespace-pre-line">
              {slide.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Navigazione */}
        <div className="flex items-center gap-3 px-6 pt-2">
          {currentSlide > 0 && (
            <button
              onClick={goPrev}
              className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center active:scale-90 transition-all shrink-0"
            >
              <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
          )}
          <button
            onClick={goNext}
            className="flex-1 h-12 rounded-2xl font-black text-[15px] text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
            style={{ backgroundColor: slide.color }}
          >
            {isLast ? 'Inizia' : 'Avanti'}
            {!isLast && <ChevronRight size={18} strokeWidth={3} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});
OnboardingGuide.displayName = 'OnboardingGuide';
export default OnboardingGuide;
