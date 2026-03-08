'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { speak, stopSpeaking } from './speech';

export function useGameSpeech(text: string | null, deps: unknown[] = []) {
  const spokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!text) return;

    // Prevent double-speak in Strict Mode: only speak if text/deps actually changed
    if (spokenRef.current === text) return;
    spokenRef.current = text;

    const timer = setTimeout(() => { speak(text); }, 400);
    return () => {
      clearTimeout(timer);
      spokenRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, ...deps]);

  useEffect(() => {
    return () => { stopSpeaking(); };
  }, []);

  const replay = useCallback(() => {
    if (!text) return;
    stopSpeaking();
    speak(text);
  }, [text]);

  return { replay };
}

export function useGameSpeechWithOptions(
  instruction: string | null,
  options: string[],
  deps: unknown[] = [],
) {
  const [activeOption, setActiveOption] = useState<number>(-1);
  const cancelledRef = useRef(false);
  const runIdRef = useRef(0);

  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    if (!instruction) {
      return;
    }

    const thisRun = ++runIdRef.current;
    cancelledRef.current = false;
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

  const replay = useCallback(() => {
    if (!instruction) return;
    const thisRun = ++runIdRef.current;
    cancelledRef.current = false;
    setActiveOption(-1);
    stopSpeaking();

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
    };

    run();
  }, [instruction, options]);

  // Never block interaction — speech is assistive, not gating
  return { activeOption, doneSpeaking: true, replay };
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
