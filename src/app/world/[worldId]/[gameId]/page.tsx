'use client';

import { useParams, useRouter } from 'next/navigation';
import { WORLDS } from '@/lib/constants';
import { WORLD_BACKGROUNDS } from '@/lib/worldBackgrounds';
import { useHydrated } from '@/lib/useHydrated';
import RhymeBeach from '@/components/game/RhymeBeach';
import SoundSorting from '@/components/game/SoundSorting';
import LetterIntro from '@/components/game/LetterIntro';
import SyllableClap from '@/components/game/SyllableClap';
import OddSoundOut from '@/components/game/OddSoundOut';
import SoundHunt from '@/components/game/SoundHunt';
import SoundSafari from '@/components/game/SoundSafari';
import LetterMatch from '@/components/game/LetterMatch';
import SoundSort from '@/components/game/SoundSort';
import LetterTrace from '@/components/game/LetterTrace';
import SurfSlide from '@/components/game/SurfSlide';
import MarketBuilder from '@/components/game/MarketBuilder';
import SailboatRace from '@/components/game/SailboatRace';
import SoundTelescope from '@/components/game/SoundTelescope';
import PlazaPuzzle from '@/components/game/PlazaPuzzle';
import PotionLab from '@/components/game/PotionLab';
import WordTowers from '@/components/game/WordTowers';
import KnightsDoors from '@/components/game/KnightsDoors';
import DragonFeed from '@/components/game/DragonFeed';
import GardenGrow from '@/components/game/GardenGrow';
import HeartWordMap from '@/components/game/HeartWordMap';
import DigraphDiscovery from '@/components/game/DigraphDiscovery';
import RuinDecoder from '@/components/game/RuinDecoder';
import TreasureMemory from '@/components/game/TreasureMemory';
import SoukSentences from '@/components/game/SoukSentences';
import StoryStroll from '@/components/game/StoryStroll';
import ComicCreator from '@/components/game/ComicCreator';
import ManateeRescue from '@/components/game/ManateeRescue';
import BeachDetective from '@/components/game/BeachDetective';
import PostcardWriter from '@/components/game/PostcardWriter';
import BossLevel from '@/components/game/BossLevel';
import GameWrapper from '@/components/game/GameWrapper';
import { WorldProvider } from '@/lib/WorldContext';

type GameComponent = React.ComponentType<{ worldId: number; onComplete: () => void }>;

const GAME_COMPONENTS: Record<string, GameComponent> = {
  'rhyme-match': RhymeBeach,
  'syllable-clap': SyllableClap,
  'first-sound': SoundSorting,
  'odd-one-out': OddSoundOut,
  'sound-hunt': SoundHunt,
  'letter-intro': LetterIntro,
  'sound-safari': SoundSafari,
  'letter-match': LetterMatch,
  'sound-sort': SoundSort,
  'letter-trace': LetterTrace,
  'surf-slide': SurfSlide,
  'market-builder': MarketBuilder,
  'sailboat-race': SailboatRace,
  'sound-telescope': SoundTelescope,
  'plaza-puzzle': PlazaPuzzle,
  'potion-lab': PotionLab,
  'word-towers': WordTowers,
  'knights-doors': KnightsDoors,
  'dragon-feed': DragonFeed,
  'garden-grow': GardenGrow,
  'heart-word-map': HeartWordMap,
  'digraph-discovery': DigraphDiscovery,
  'ruin-decoder': RuinDecoder,
  'treasure-memory': TreasureMemory,
  'souk-sentences': SoukSentences,
  'story-stroll': StoryStroll,
  'comic-creator': ComicCreator,
  'manatee-rescue': ManateeRescue,
  'beach-detective': BeachDetective,
  'postcard-writer': PostcardWriter,
  'boss-1': BossLevel,
  'boss-2': BossLevel,
  'boss-3': BossLevel,
  'boss-4': BossLevel,
  'boss-5': BossLevel,
  'boss-6': BossLevel,
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const worldId = Number(params.worldId);
  const gameId = params.gameId as string;

  const world = WORLDS.find((w) => w.id === worldId);
  const game = world?.games.find((g) => g.id === gameId) || world?.bossGame;

  const handleComplete = () => {
    router.push(`/world/${worldId}`);
  };

  if (!hydrated) {
    return <div className={`min-h-screen bg-gradient-to-b ${world?.bgGradient || 'from-pink-300 to-purple-300'}`} />;
  }

  const GameComponent = GAME_COMPONENTS[gameId];

  if (!GameComponent) {
    return <ComingSoon worldId={worldId} gameName={game?.name || gameId} onBack={handleComplete} />;
  }

  const bgImage = WORLD_BACKGROUNDS[worldId];

  return (
    <WorldProvider worldId={worldId}>
      <div className="min-h-screen relative overflow-hidden">
        {bgImage && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={bgImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-50"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
          </div>
        )}
        <div className="relative z-10 min-h-screen">
          {/* Floating home button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/')}
            className="fixed top-5 right-5 z-50 w-12 h-12 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center text-xl shadow-md"
            aria-label="Home"
          >
            🏠
          </motion.button>
          <GameWrapper gameId={gameId}>
            <GameComponent worldId={worldId} onComplete={handleComplete} />
          </GameWrapper>
        </div>
      </div>
    </WorldProvider>
  );
}

function ComingSoon({ worldId, gameName, onBack }: { worldId: number; gameName: string; onBack: () => void }) {
  const world = WORLDS.find((w) => w.id === worldId);

  return (
    <div className={`min-h-screen bg-gradient-to-b ${world?.bgGradient || 'from-pink-300 to-purple-300'} flex flex-col items-center justify-center px-6`}>
      <div className="bg-white/90 rounded-3xl p-8 shadow-xl text-center max-w-sm">
        <span className="text-6xl block mb-4">🚧</span>
        <h2 className="text-2xl font-bold font-[Fredoka] text-purple-600 mb-2">
          Coming Soon!
        </h2>
        <p className="text-gray-500 font-[Nunito] mb-6">
          {gameName} is being built.
        </p>
        <button
          onClick={onBack}
          className="game-button bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-4 rounded-full shadow-lg mx-auto"
        >
          <span className="text-2xl">◀</span>
          <span>Back</span>
        </button>
      </div>
    </div>
  );
}
