'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import { useGameStore } from '@/lib/store';
import { WORLDS } from '@/lib/constants';
import { speakFeedback, speakReveal } from '@/lib/speech';
import { useComposedSpeech, useGameSpeech, useInstructionSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import WordCard from '@/components/ui/WordCard';
import { playSoundEffect } from '@/lib/audio';
import { buildAssessmentChoiceSet } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { getInitialSoundGroups, getWordsForActivity } from '@/content/registry';
import { getPracticedPhonemes } from '@/content/progression';
import { canSharePictureChoices } from '@/content/pictureConflicts';
import { canShareSoundChoices } from '@/content/phonemeConflicts';
import { WORLD_4_PICTURE_ROUNDS, isWorld4PictureRoundSafe, isWorld4RoundDecodable } from '@/content/world4Content';
import { WORLD_5_BOSS_SENTENCES, WORLD_6_BOSS_SENTENCES } from '@/content/connectedText';
import { WORLD_1_BOSS_CHALLENGES } from '@/content/bossContent';

interface BossChallenge {
  type: 'picture-match' | 'word-read' | 'sentence';
  prompt: string;
  question?: string;
  icon: string;
  correct: string;
  options: string[];
  phonemeId?: string;
  contentId?: string;
}

const BOSS_DATA: Record<number, { name: string; challenges: BossChallenge[] }> = {
  1: { name: 'Fiesta Finale', challenges: WORLD_1_BOSS_CHALLENGES },
  2: { name: 'The Garden Party', challenges: [
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'snake', options: ['snake', 'tiger', 'egg'], phonemeId: 's' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'tiger', options: ['ant', 'tiger', 'lemon'], phonemeId: 't' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'apple', options: ['nut', 'apple', 'egg'], phonemeId: 'a' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'penguin', options: ['iguana', 'penguin', 'snake'], phonemeId: 'p' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'nut', options: ['nut', 'lemon', 'apple'], phonemeId: 'n' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'egg', options: ['egg', 'tiger', 'snake'], phonemeId: 'e' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'lemon', options: ['iguana', 'nut', 'lemon'], phonemeId: 'l' },
    { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'iguana', options: ['iguana', 'penguin', 'apple'], phonemeId: 'i' },
  ]},
  3: { name: 'The Regatta', challenges: [
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'sat', options: ['sat', 'pin', 'net'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'pin', options: ['tap', 'pin', 'let'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'net', options: ['net', 'pet', 'sat'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'tap', options: ['sip', 'nap', 'tap'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'pet', options: ['pet', 'ten', 'tip'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'let', options: ['tin', 'let', 'pan'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'sip', options: ['sip', 'set', 'nap'] },
    { type: 'word-read', prompt: 'What word is this?', icon: '', correct: 'ten', options: ['pen', 'ten', 'sit'] },
  ]},
  4: { name: "Dragon's Library", challenges: [
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'pan', options: ['pan', 'pen', 'pin'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'pen', options: ['pen', 'pan', 'pin'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'pin', options: ['pin', 'pan', 'pen'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'ten', options: ['ten', 'pen', 'net'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'net', options: ['net', 'ten', 'pen'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'lip', options: ['lip', 'net', 'pan'] },
  ]},
  5: { name: 'Atlas Mountain Riddle', challenges: WORLD_5_BOSS_SENTENCES.map((round) => ({
    type: 'sentence', prompt: round.prompt, question: round.question, icon: '', correct: round.correct, options: round.options,
  })) },
  6: { name: 'The Sunset Story', challenges: WORLD_6_BOSS_SENTENCES.map((round) => ({
    type: 'sentence', prompt: round.prompt, question: round.question, icon: '', correct: round.correct, options: round.options,
  })) },
};

const optionId = (option: string) => option;
const challengeId = (challenge: BossChallenge) => challenge.contentId || `${challenge.type}:${challenge.prompt}:${challenge.correct}`;

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function BossLevel({ worldId, onComplete }: Props) {
  const boss = BOSS_DATA[worldId];
  const world = WORLDS.find((w) => w.id === worldId);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const practicedPhonemes = useMemo(
    () => getPracticedPhonemes(enabledContentPackIds, taughtPhonemes),
    [enabledContentPackIds, taughtPhonemes],
  );
  const taughtPhonemeSet = useMemo(() => new Set(taughtPhonemes), [taughtPhonemes]);
  const earlyChallenges = useMemo(() => {
    if (worldId === 2) {
      const groups = getInitialSoundGroups(enabledContentPackIds, practicedPhonemes);
      return groups.map((group): BossChallenge => ({
        type: 'picture-match',
        prompt: 'Which picture starts with this sound?',
        icon: '',
        phonemeId: group.phonemeId,
        contentId: group.id,
        correct: group.words[0].text,
        options: groups
          .filter((candidate) => canShareSoundChoices(group.phonemeId, candidate.phonemeId))
          .map((candidate) => candidate.words[0]?.text)
          .filter(Boolean),
      }));
    }
    if (worldId === 4) {
      return WORLD_4_PICTURE_ROUNDS
        .filter((round) => isWorld4PictureRoundSafe(round) && isWorld4RoundDecodable(round, taughtPhonemeSet))
        .map((wordRound): BossChallenge => ({
          type: 'word-read',
          prompt: 'What word is this?',
          icon: '',
          contentId: `world4:${wordRound.word}`,
          correct: wordRound.word,
          options: [wordRound.word, ...wordRound.distractors],
        }));
    }
    if (worldId === 3) {
      const words = getWordsForActivity(
        enabledContentPackIds,
        'blend-to-picture',
        practicedPhonemes,
      );
      const optionWords = words.map((word) => word.text);
      return words.map((word): BossChallenge => ({
        type: 'word-read',
        prompt: 'What word is this?',
        icon: '',
        contentId: word.id,
        correct: word.text,
        options: optionWords,
      }));
    }
    return boss.challenges;
  }, [boss.challenges, enabledContentPackIds, practicedPhonemes, taughtPhonemeSet, worldId]);
  const session = useContentSession({
    gameId: `boss-${worldId}`,
    historyKey: worldId === 3 ? 'world3-blending-words' : `boss-${worldId}`,
    candidates: earlyChallenges,
    count: 6,
    getId: challengeId,
  });
  const challenges = session.items;
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeBoss, addCoins, addPassportStamp, addCompanion, addCostume } = useGameStore();

  const current = challenges[round];
  const stableOptions = useMemo(() => buildAssessmentChoiceSet(current.correct, current.options, {
    count: 3,
    round,
    seed: session.seed,
    getId: optionId,
    canUseDistractor: (answer, distractor) => canSharePictureChoices(answer, distractor),
  }), [current, round, session.seed]);

  // Assessment prompts never pronounce answer options. Written-word rounds
  // use picture-only choices, and sentence rounds remain self-read.
  const picturePrompt = useGameSpeech(current.type === 'picture-match' && !current.phonemeId ? current.prompt : null, [round]);
  const soundPicturePrompt = useComposedSpeech(
    current.type === 'picture-match' && current.phonemeId
      ? [{ say: 'Which picture starts with this sound?' }, { pause: 250 }, { phoneme: current.phonemeId }]
      : [],
    [round],
  );
  const wordReadPrompt = useInstructionSpeech('dragon-feed', current.type === 'word-read', [round]);
  const sentenceQuestionPrompt = useGameSpeech(
    current.type === 'sentence' ? current.question || null : null,
    [round],
  );
  const replay = current.type === 'picture-match'
    ? current.phonemeId ? soundPicturePrompt.replay : picturePrompt.replay
    : current.type === 'sentence' ? sentenceQuestionPrompt.replay : wordReadPrompt.replay;

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (!shouldReveal) return;
    let cancelled = false;
    (async () => {
      await speakReveal(current.correct);
      if (cancelled) return;
      await new Promise(r => setTimeout(r, 500));
      if (cancelled) return;
      if (round >= challenges.length - 1) {
        await speakFeedback('complete');
        if (cancelled) return;
        completeBoss(worldId);
        addPassportStamp(worldId);
        addCoins(20);
        if (world?.reward.companion) addCompanion(world.reward.companion);
        if (world?.reward.costume) addCostume(world.reward.costume);
        playSoundEffect('celebrate');
        setShowCelebration(true);
      } else {
        setRound((r) => r + 1);
      }
    })();
    return () => { cancelled = true; };
  }, [shouldReveal, current, round, challenges, worldId, world, completeBoss, addCoins, addPassportStamp, addCompanion, addCostume]);

  const handleAnswer = useCallback((answer: string) => {
    if (feedback || shouldReveal) return;
    const isLast = round >= challenges.length - 1;
    if (answer === current.correct) {
      playSoundEffect('correct');
      setFeedback('correct');
      (async () => {
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise(r => setTimeout(r, 400));
        setFeedback(null);
        if (isLast) {
          completeBoss(worldId);
          addPassportStamp(worldId);
          addCoins(20);
          if (world?.reward.companion) addCompanion(world.reward.companion);
          if (world?.reward.costume) addCostume(world.reward.costume);
          playSoundEffect('celebrate');
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
    } else {
      playSoundEffect('wrong');
      setFeedback('wrong');
      recordWrong();
      speakFeedback('wrong');
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, shouldReveal, current, round, challenges, worldId, world, completeBoss, addCoins, addPassportStamp, addCompanion, addCostume, recordWrong]);

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={challenges.length}
      progressIcon="\uD83C\uDFC6"
      bgClassName={world?.bgGradient || 'from-pink-400 to-purple-400'}
    >
      <div className="flex-1 flex flex-col items-center justify-evenly py-2">
        {/* Leni + boss title */}
        <div className="flex flex-col items-center gap-1">
          <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={120} />
          <h2 className="text-2xl font-bold font-[Fredoka] text-amber-700">\uD83C\uDFC6 {boss.name}</h2>
        </div>

        {/* The prompt / word / sentence */}
        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }} className="text-center w-full max-w-md">
            {current.type === 'word-read' ? (
              <div className="bg-white rounded-3xl px-12 py-7 shadow-xl mx-auto inline-block">
                <span className="text-6xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.correct}</span>
              </div>
            ) : current.type === 'sentence' ? (
              <div className="bg-white rounded-3xl px-6 py-5 shadow-xl">
                <p className="text-2xl font-bold font-[Fredoka] text-gray-800">{current.prompt}</p>
                <p data-testid="boss-question" className="text-xl font-semibold font-[Fredoka] text-violet-700 mt-3">{current.question}</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl px-6 py-4 shadow-xl">
                {current.icon && <span className="text-7xl block mb-1">{current.icon}</span>}
                <p className="text-xl font-[Fredoka] font-semibold text-gray-700">{current.prompt}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Big answer choices */}
        <div className="flex gap-4 flex-wrap justify-center">
          {stableOptions.map((opt) => {
            const isRight = opt === current.correct;
            const highlight =
              (shouldReveal && isRight) ? 'ring-4 ring-green-400 scale-105 animate-hint-pulse'
                : (feedback === 'correct' && isRight) ? 'ring-4 ring-green-400'
                  : '';
            return (
              <motion.button key={opt} data-testid="boss-answer-choice" whileTap={{ scale: 0.92 }} onClick={() => handleAnswer(opt)}
                disabled={feedback !== null || shouldReveal}
                className={`rounded-3xl shadow-xl bg-white press-3d transition-all ${highlight}`}>
                {current.type === 'word-read' || current.type === 'sentence' ? (
                  <span className="flex items-center justify-center p-3">
                    <WordCard word={opt} size={96} />
                  </span>
                ) : current.type === 'picture-match' && !/^\d+$/.test(opt) ? (
                  <span className="flex items-center justify-center p-3">
                    <WordCard word={opt} size={96} />
                  </span>
                ) : (
                  <span className="block px-8 py-5 text-4xl font-bold font-[Fredoka] text-gray-700 lowercase">{opt}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message={`${world?.subtitle} complete! Passport stamp earned!`}
        onComplete={onComplete}
      />
    </GameShell>
  );
}
