'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { WORLDS } from '@/lib/constants';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface BossChallenge {
  type: 'picture-match' | 'word-read' | 'sentence';
  prompt: string;
  icon: string;
  correct: string;
  options: string[];
}

const BOSS_DATA: Record<number, { name: string; challenges: BossChallenge[] }> = {
  1: { name: 'Fiesta Finale', challenges: [
    { type: 'picture-match', prompt: 'Which one rhymes with cat?', icon: '\uD83D\uDC31', correct: 'hat', options: ['hat', 'dog', 'cup'] },
    { type: 'picture-match', prompt: 'Which starts with "s"?', icon: '\uD83D\uDC0D', correct: 'sun', options: ['sun', 'cat', 'pen'] },
    { type: 'picture-match', prompt: 'Which one rhymes with log?', icon: '\uD83E\uDEB5', correct: 'dog', options: ['hat', 'dog', 'cup'] },
    { type: 'picture-match', prompt: 'Which starts with "m"?', icon: '\uD83C\uDF19', correct: 'moon', options: ['red', 'moon', 'fan'] },
    { type: 'picture-match', prompt: 'Clap the beats: "banana" has...', icon: '\uD83C\uDF4C', correct: '3', options: ['1', '2', '3'] },
    { type: 'picture-match', prompt: 'Which doesn\'t start with "b"?', icon: '\uD83D\uDD0D', correct: 'cat', options: ['bat', 'bug', 'cat'] },
    { type: 'picture-match', prompt: 'Which starts with "p"?', icon: '\uD83D\uDC27', correct: 'penguin', options: ['sun', 'penguin', 'hat'] },
    { type: 'picture-match', prompt: 'Which one rhymes with pin?', icon: '\uD83D\uDCCC', correct: 'bin', options: ['cup', 'bin', 'hat'] },
  ]},
  2: { name: 'The Garden Party', challenges: [
    { type: 'picture-match', prompt: 'What sound does "s" make?', icon: '\uD83D\uDC0D', correct: 'snake', options: ['snake', 'tiger', 'egg'] },
    { type: 'picture-match', prompt: 'What sound does "t" make?', icon: '\uD83D\uDC2F', correct: 'tiger', options: ['ant', 'tiger', 'lemon'] },
    { type: 'picture-match', prompt: 'What sound does "a" make?', icon: '\uD83C\uDF4E', correct: 'apple', options: ['nut', 'apple', 'egg'] },
    { type: 'picture-match', prompt: 'What sound does "p" make?', icon: '\uD83D\uDC27', correct: 'penguin', options: ['iguana', 'penguin', 'snake'] },
    { type: 'picture-match', prompt: 'What sound does "n" make?', icon: '\uD83E\uDD5C', correct: 'nut', options: ['nut', 'lemon', 'apple'] },
    { type: 'picture-match', prompt: 'What sound does "e" make?', icon: '\uD83E\uDD5A', correct: 'egg', options: ['egg', 'tiger', 'snake'] },
    { type: 'picture-match', prompt: 'What sound does "l" make?', icon: '\uD83C\uDF4B', correct: 'lemon', options: ['iguana', 'nut', 'lemon'] },
    { type: 'picture-match', prompt: 'What sound does "i" make?', icon: '\uD83E\uDD8E', correct: 'iguana', options: ['iguana', 'penguin', 'apple'] },
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
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'cat', options: ['cat', 'hat', 'bat'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'dog', options: ['log', 'dog', 'fog'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'bug', options: ['mug', 'rug', 'bug'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'cup', options: ['cup', 'pup', 'cut'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'hen', options: ['pen', 'den', 'hen'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'bed', options: ['bed', 'red', 'fed'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'van', options: ['fan', 'man', 'van'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'fin', options: ['fin', 'bin', 'win'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'jet', options: ['jet', 'net', 'wet'] },
    { type: 'word-read', prompt: 'Read the word:', icon: '', correct: 'pot', options: ['pot', 'hot', 'dot'] },
  ]},
  5: { name: 'Atlas Mountain Riddle', challenges: [
    { type: 'sentence', prompt: 'The ship is big.', icon: '\uD83D\uDEA2', correct: 'big', options: ['big', 'small', 'red'] },
    { type: 'sentence', prompt: 'She said no.', icon: '\uD83D\uDE45', correct: 'no', options: ['yes', 'no', 'go'] },
    { type: 'sentence', prompt: 'He was sad.', icon: '\uD83D\uDE22', correct: 'sad', options: ['sad', 'happy', 'mad'] },
    { type: 'sentence', prompt: 'I have a thin cat.', icon: '\uD83D\uDC31', correct: 'thin', options: ['fat', 'thin', 'big'] },
    { type: 'sentence', prompt: 'We can go to the shop.', icon: '\uD83C\uDFEA', correct: 'shop', options: ['shop', 'ship', 'shed'] },
    { type: 'sentence', prompt: 'The dog is in the shed.', icon: '\uD83D\uDC36', correct: 'shed', options: ['shop', 'ship', 'shed'] },
  ]},
  6: { name: 'The Sunset Story', challenges: [
    { type: 'sentence', prompt: 'Sam sat on a mat.', icon: '\uD83E\uDDD1', correct: 'a mat', options: ['a mat', 'a cat', 'a hat'] },
    { type: 'sentence', prompt: 'The cat is big.', icon: '\uD83D\uDC31', correct: 'big', options: ['big', 'small', 'red'] },
    { type: 'sentence', prompt: 'A bug is on the log.', icon: '\uD83D\uDC1B', correct: 'on the log', options: ['on the log', 'in the cup', 'on the hat'] },
    { type: 'sentence', prompt: 'He got a red hat.', icon: '\uD83E\uDDE2', correct: 'red', options: ['red', 'blue', 'green'] },
    { type: 'sentence', prompt: 'The fish is in the net.', icon: '\uD83D\uDC1F', correct: 'in the net', options: ['on the bed', 'in the net', 'in the cup'] },
    { type: 'sentence', prompt: 'I have a pet dog.', icon: '\uD83D\uDC36', correct: 'a dog', options: ['a dog', 'a cat', 'a fish'] },
  ]},
};

const WORD_ICONS: Record<string, string> = {
  sat: '\uD83E\uDE91', pin: '\uD83D\uDCCC', net: '\uD83E\uDD45', tap: '\uD83D\uDEB0',
  pet: '\uD83D\uDC36', let: '\u2705', sip: '\uD83E\uDD64', ten: '\uD83D\uDD1F',
  cat: '\uD83D\uDC31', hat: '\uD83E\uDDE2', bat: '\uD83E\uDD87', dog: '\uD83D\uDC36',
  log: '\uD83E\uDEB5', fog: '\uD83C\uDF2B\uFE0F', bug: '\uD83D\uDC1B', mug: '\u2615',
  rug: '\uD83E\uDEA8', cup: '\u2615', pup: '\uD83D\uDC36', cut: '\u2702\uFE0F',
  hen: '\uD83D\uDC14', pen: '\uD83D\uDD8A\uFE0F', den: '\uD83E\uDEB8', bed: '\uD83D\uDECF\uFE0F',
  red: '\uD83D\uDD34', fed: '\uD83C\uDF7D\uFE0F', van: '\uD83D\uDE90', fan: '\uD83C\uDF2C\uFE0F',
  man: '\uD83D\uDC68', fin: '\uD83E\uDD88', bin: '\uD83D\uDDD1\uFE0F', win: '\uD83C\uDFC6',
  jet: '\u2708\uFE0F', wet: '\uD83D\uDCA7', pot: '\uD83C\uDF72', hot: '\uD83D\uDD25', dot: '\u26AB',
  tin: '\uD83E\uDD6B', nap: '\uD83D\uDCA4', pan: '\uD83C\uDF73', sit: '\uD83E\uDE91',
  tip: '\uD83D\uDCCC', set: '\u2705', sun: '\u2600\uFE0F', moon: '\uD83C\uDF19',
  snake: '\uD83D\uDC0D', tiger: '\uD83D\uDC2F', apple: '\uD83C\uDF4E', penguin: '\uD83D\uDC27',
  iguana: '\uD83E\uDD8E', nut: '\uD83E\uDD5C', egg: '\uD83E\uDD5A', lemon: '\uD83C\uDF4B',
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function BossLevel({ worldId, onComplete }: Props) {
  const boss = BOSS_DATA[worldId];
  const world = WORLDS.find((w) => w.id === worldId);
  const challenges = useMemo(() => shuffle(boss.challenges).slice(0, 6), [boss]);
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeBoss, addCoins, addPassportStamp, addCompanion, addCostume } = useGameStore();

  const current = challenges[round];
  const stableOptions = useMemo(() => current.options, [current]);

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    current.prompt,
    stableOptions,
    [round]
  );

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
        setShowCelebration(true);
      } else {
        setRound((r) => r + 1);
      }
    })();
    return () => { cancelled = true; };
  }, [shouldReveal, current, round, challenges, worldId, world, completeBoss, addCoins, addPassportStamp, addCompanion, addCostume]);

  const handleAnswer = useCallback((answer: string) => {
    if (feedback || !doneSpeaking || shouldReveal) return;
    const isLast = round >= challenges.length - 1;
    if (answer === current.correct) {
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
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(answer, current.correct);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, current, round, challenges, worldId, world, completeBoss, addCoins, addPassportStamp, addCompanion, addCostume, recordWrong]);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${world?.bgGradient ? world.bgGradient + '/90' : 'from-pink-400/90 to-purple-400/90'} px-4 py-6 flex flex-col`}>
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-amber-600">{round + 1}/{challenges.length}</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <span className="text-4xl">{'\uD83C\uDFC6'}</span>
        <h2 className="text-xl font-bold font-[Fredoka] text-white drop-shadow">{boss.name}</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={80} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }} className="text-center w-full max-w-sm">
            {current.type === 'word-read' ? (
              <div className="bg-white/90 rounded-2xl px-10 py-6 shadow-xl mx-auto inline-block">
                <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.correct}</span>
              </div>
            ) : current.type === 'sentence' ? (
              <div className="bg-amber-50 border-4 border-amber-700 rounded-2xl px-6 py-5 shadow-xl">
                {current.icon && <span className="text-5xl block mb-2">{current.icon}</span>}
                <p className="text-xl font-bold font-[Fredoka] text-gray-800">{current.prompt}</p>
              </div>
            ) : (
              <div className="bg-white/90 rounded-2xl px-6 py-4 shadow-xl">
                {current.icon && <span className="text-5xl block mb-2">{current.icon}</span>}
                <p className="text-lg font-[Nunito] text-gray-700">{current.prompt}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3 flex-wrap justify-center">
          {stableOptions.map((opt, i) => (
            <motion.button key={opt} whileTap={{ scale: 0.9 }} onClick={() => handleAnswer(opt)}
              disabled={feedback !== null || !doneSpeaking || shouldReveal}
              className={`px-6 py-4 rounded-2xl shadow-lg text-lg font-bold font-[Fredoka] lowercase min-w-[80px] transition-all ${
                shouldReveal && opt === current.correct
                  ? 'bg-green-300 text-green-800 ring-4 ring-green-400 scale-105'
                  : feedback === 'correct' && opt === current.correct
                    ? 'bg-green-300 text-green-800'
                    : activeOption === i
                      ? 'bg-white/90 text-gray-700 ring-4 ring-blue-400 scale-105'
                      : 'bg-white/90 text-gray-700'
              }`}>
              {WORD_ICONS[opt] ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="text-3xl">{WORD_ICONS[opt]}</span>
                  <span className="text-sm">{opt}</span>
                </span>
              ) : opt}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">Almost! Try again!</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message={`${world?.subtitle} complete! Passport stamp earned!`}
        onComplete={onComplete}
      />
    </div>
  );
}
