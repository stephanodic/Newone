import { useRef, useCallback, useState } from 'react';
import type React from 'react';
import { haptic } from '@/lib/haptic';

interface VoiceResult {
  amount: number;
  note: string;
}

function parseVoiceText(text: string): VoiceResult {
  const lower = text.toLowerCase().trim();
  const numberWords: Record<string, number> = {
    'zero':0,'uno':1,'due':2,'tre':3,'quattro':4,'cinque':5,
    'sei':6,'sette':7,'otto':8,'nove':9,'dieci':10,
    'undici':11,'dodici':12,'tredici':13,'quattordici':14,'quindici':15,
    'sedici':16,'diciassette':17,'diciotto':18,'diciannove':19,'venti':20,
    'trenta':30,'quaranta':40,'cinquanta':50,'sessanta':60,'settanta':70,
    'ottanta':80,'novanta':90,'cento':100,'duecento':200,'trecento':300,
    'mille':1000
  };

  let amount = 0;
  let matchedWord: string | null = null;

  const digitMatch = lower.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (digitMatch) {
    amount = parseFloat(digitMatch[1].replace(',', '.'));
  } else {
    for (const [word, val] of Object.entries(numberWords)) {
      if (lower.includes(word)) {
        amount = val;
        matchedWord = word; // track so we can strip it from the note
        break;
      }
    }
  }

  // Build note: remove the number, currency words, and (if a word-number was matched) that word too
  const note = lower
    .replace(/(\d+(?:[.,]\d{1,2})?)/g, '')
    .replace(/euro|eur|€/g, '')
    .replace(matchedWord ? new RegExp(`\\b${matchedWord}\\b`, 'g') : /(?!)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { amount, note };
}

export function useVoiceInput(onResult: (amount: number, note: string) => void) {

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListening = useRef(false);
  const [isListeningState, setIsListeningState] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Tracks whether a long-press voice activation occurred.
  // Consumed by the caller's onClick to prevent the tap from also opening the BottomSheet.
  const voiceActivatedRef = useRef(false);

  const startVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Riconoscimento vocale non supportato su questo browser');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    isListening.current = true;
    voiceActivatedRef.current = true; // mark: voice started, block next onClick
    setIsListeningState(true);
    haptic.error();
    let hasResult = false;
    recognition.onresult = (event: any) => {
      if (hasResult) return;
      hasResult = true;
      const text = event.results[0][0].transcript;
      const { amount, note } = parseVoiceText(text);
      if (amount > 0) {
        haptic.heavy();
        onResultRef.current(amount, note);
      }
      isListening.current = false;
      setIsListeningState(false);
    };
    recognition.onerror = () => { isListening.current = false; setIsListeningState(false); };
    recognition.onend   = () => { isListening.current = false; setIsListeningState(false); };
    recognition.start();
  }, []);

  const cancelTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchOrigin.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchOrigin.current = { x: t.clientX, y: t.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      touchOrigin.current = null;
      startVoice();
    }, 700);
  }, [startVoice]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchOrigin.current || longPressTimer.current === null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchOrigin.current.x;
    const dy = t.clientY - touchOrigin.current.y;
    if (dx * dx + dy * dy > 100) cancelTimer(); // >10px = scroll, non long-press
  }, [cancelTimer]);

  const handleTouchEnd = useCallback(() => {
    cancelTimer();
  }, [cancelTimer]);

  /**
   * Call this at the top of the category button's onClick.
   * Returns true (and resets the flag) if voice was activated by a long press —
   * in that case the caller should skip the normal tap action.
   */
  const consumeVoiceActivation = useCallback((): boolean => {
    if (voiceActivatedRef.current) {
      voiceActivatedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return { handleTouchStart, handleTouchMove, handleTouchEnd, isListening, isListeningState, consumeVoiceActivation };
}
