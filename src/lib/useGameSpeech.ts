'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { speak, stopSpeaking } from './speech';

export function useGameSpeech(text: string | null, deps: unknown[] = []) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!text) return;

    // Skip the first Strict Mode mount, play on the second
    if (!mountedRef.current) {
      mountedRef.current = true;
      // In production (no Strict Mode), this IS the only mount, so play
      const timer = setTimeout(() => { speak(text); }, 400);
      return () => { clearTimeout(timer); mountedRef.current = false; };
    }

    const timer = setTimeout(() => { speak(text); }, 400);
    return () => { clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, ...deps]);

  useEffect(() => {
    return () => { stopSpeaking(); };
  }, []);
}

export function useGameSpeechWithOptions(
  instruction: string | null,
  options: string[],
  deps: unknown[] = [],
) {
  const [activeOption, setActiveOption] = useState<number>(-1);
  const [doneSpeaking, setDoneSpeaking] = useState(false);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  // Serialize deps into a stable string for the effect dependency
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    if (!instruction) {
      setDoneSpeaking(true);
      return;
    }

    const thisRun = ++runIdRef.current;
    cancelledRef.current = false;
    setDoneSpeaking(false);
    setActiveOption(-1);

    const run = async () => {
      if (cancelledRef.current || thisRun !== runIdRef.current) return;

      await speak(instruction);

      for (let i = 0; i < options.length; i++) {
        if (cancelledRef.current || thisRun !== runIdRef.current) return;
        setActiveOption(i);
        await speak(options[i]);
        if (cancelledRef.current || thisRun !== runIdRef.current) return;
        await new Promise(r => setTimeout(r, 350));
      }

      if (cancelledRef.current || thisRun !== runIdRef.current) return;
      setActiveOption(-1);
      setDoneSpeaking(true);
    };

    const timer = setTimeout(run, 500);
    return () => {
      clearTimeout(timer);
      cancelledRef.current = true;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instruction, depsKey]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopSpeaking();
    };
  }, []);

  return { activeOption, doneSpeaking };
}

export function useWrongAttempts(roundKey: unknown, maxAttempts = 3) {
  const [attempts, setAttempts] = useState(0);
  const prevKey = useRef(roundKey);

  if (prevKey.current !== roundKey) {
    prevKey.current = roundKey;
    if (attempts !== 0) setAttempts(0);
  }

  const recordWrong = useCallback(() => {
    setAttempts(a => a + 1);
  }, []);

  return {
    attempts,
    shouldReveal: attempts >= maxAttempts,
    recordWrong,
  };
}
