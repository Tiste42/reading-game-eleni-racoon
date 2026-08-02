'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { speak, speakInstruction, speakPhoneme, stopSpeaking } from './speech';

export function useInstructionSpeech(gameId: string, active = true, deps: unknown[] = []) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => { speakInstruction(gameId); }, 400);
    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, active, ...deps]);

  const replay = useCallback(() => {
    if (!active) return;
    stopSpeaking();
    speakInstruction(gameId);
  }, [active, gameId]);

  return { replay };
}

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

export type SpeechPart =
  | { say: string }
  | { phoneme: string }
  | { pause: number }
  | { options: string[] };

/**
 * Speak a composed sequence (e.g. instruction → letter sound → each option).
 * activeOption highlights the option currently being spoken.
 */
export function useComposedSpeech(parts: SpeechPart[], deps: unknown[] = []) {
  const [activeOption, setActiveOption] = useState(-1);
  const runIdRef = useRef(0);
  const partsRef = useRef(parts);
  partsRef.current = parts;
  const depsKey = JSON.stringify(deps);

  const runSequence = useCallback(async (thisRun: number) => {
    for (const part of partsRef.current) {
      if (thisRun !== runIdRef.current) return;
      if ('say' in part) {
        await speak(part.say);
      } else if ('phoneme' in part) {
        await speakPhoneme(part.phoneme);
      } else if ('pause' in part) {
        await new Promise((r) => setTimeout(r, part.pause));
      } else if ('options' in part) {
        for (let i = 0; i < part.options.length; i++) {
          if (thisRun !== runIdRef.current) return;
          setActiveOption(i);
          await speak(part.options[i]);
          if (thisRun !== runIdRef.current) return;
          await new Promise((r) => setTimeout(r, 350));
        }
        if (thisRun === runIdRef.current) setActiveOption(-1);
      }
    }
  }, []);

  useEffect(() => {
    const thisRun = ++runIdRef.current;
    setActiveOption(-1);
    const timer = setTimeout(() => runSequence(thisRun), 500);
    return () => {
      clearTimeout(timer);
      if (runIdRef.current === thisRun) runIdRef.current = thisRun + 1;
      stopSpeaking();
    };
  }, [depsKey, runSequence]);

  const replay = useCallback(() => {
    const thisRun = ++runIdRef.current;
    setActiveOption(-1);
    stopSpeaking();
    runSequence(thisRun);
  }, [runSequence]);

  return { activeOption, replay };
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
