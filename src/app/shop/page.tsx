'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import CoinCounter from '@/components/ui/CoinCounter';
import { useGameStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { SHOP_ITEMS, type ShopItem } from '@/lib/shopItems';
import { playSoundEffect } from '@/lib/audio';
import { speakFeedback } from '@/lib/speech';

/** Item picture: generated art with emoji fallback (same pattern as WordCard). */
function ItemArt({ item, size }: { item: ShopItem; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span style={{ fontSize: size * 0.78, lineHeight: `${size}px`, width: size, height: size }} className="inline-block select-none">
        {item.emoji}
      </span>
    );
  }
  return (
    <img
      src={`/images/generated/shop/${item.id}.png`}
      alt={item.name}
      width={size}
      height={size}
      draggable={false}
      className="object-contain select-none"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

export default function ShopPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { coins, ownedItems, buyItem } = useGameStore();
  const [justBought, setJustBought] = useState<string | null>(null);
  const [cantAfford, setCantAfford] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const handleBuy = useCallback(
    (item: ShopItem) => {
      if (ownedItems.includes(item.id)) return;
      if (buyItem(item.id, item.price)) {
        playSoundEffect('coin');
        setJustBought(item.id);
        setShowCelebration(true);
        speakFeedback('correct');
        setTimeout(() => { setShowCelebration(false); setJustBought(null); }, 2600);
      } else {
        // Not enough coins: gentle wiggle, nothing scary, nothing lost
        setCantAfford(item.id);
        setTimeout(() => setCantAfford(null), 700);
      }
    },
    [ownedItems, buyItem],
  );

  if (!hydrated) return <div className="min-h-screen bg-gradient-to-b from-fuchsia-200 to-amber-100" />;

  const forSale = SHOP_ITEMS.filter((i) => !ownedItems.includes(i.id));
  const owned = SHOP_ITEMS.filter((i) => ownedItems.includes(i.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-200 via-pink-100 to-amber-100 px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between max-w-xl mx-auto mb-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/')}
          className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center text-xl shadow-md"
          aria-label="Back"
        >
          ◀
        </motion.button>
        <CoinCounter />
      </div>

      {/* Leni the shopkeeper */}
      <div className="flex flex-col items-center mb-3">
        <EleniCharacter pose="waving" size={120} />
        <h1 className="text-3xl font-bold font-[Fredoka] text-fuchsia-700">Leni&apos;s Shop</h1>
        <p className="text-fuchsia-900/70 font-[Fredoka]">Spend your coins on something fun!</p>
      </div>

      {/* Items for sale */}
      <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
        {forSale.map((item, index) => {
          const affordable = coins >= item.price;
          return (
            <motion.button
              key={item.id}
              onClick={() => handleBuy(item)}
              whileTap={{ scale: 0.93 }}
              initial={{ scale: 0, rotate: -6 }}
              animate={
                cantAfford === item.id
                  ? { x: [-7, 7, -7, 7, 0], scale: 1, rotate: 0 }
                  : { scale: 1, rotate: 0 }
              }
              transition={{ scale: { delay: Math.min(index * 0.05, 0.8), type: 'spring', stiffness: 260, damping: 17 } }}
              className={`relative rounded-3xl bg-white shadow-xl press-3d p-2 pt-3 flex flex-col items-center gap-1 transition-opacity ${
                affordable ? '' : 'opacity-60'
              }`}
            >
              <span className="animate-float" style={{ animationDelay: `${(index % 5) * 0.4}s` }}>
                <ItemArt item={item} size={84} />
              </span>
              <span className="text-sm font-bold font-[Fredoka] text-gray-700 leading-tight text-center">{item.name}</span>
              <span
                className={`flex items-center gap-1 rounded-full px-3 py-0.5 text-base font-bold font-[Fredoka] ${
                  affordable ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-500'
                }`}
              >
                🪙 {item.price}
              </span>
              {!affordable && <span className="absolute top-1.5 right-2 text-base">🔒</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Leni's Toybox — everything she owns */}
      <div className="max-w-xl mx-auto mt-6 bg-white/60 rounded-3xl p-4 shadow-inner">
        <h2 className="text-2xl font-bold font-[Fredoka] text-fuchsia-700 text-center mb-2">🧺 Leni&apos;s Toybox</h2>
        {owned.length === 0 ? (
          <p className="text-center text-fuchsia-900/60 font-[Fredoka] py-4">
            Buy something fun and it will live here!
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            <AnimatePresence>
              {owned.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className={`rounded-2xl bg-white shadow p-2 flex flex-col items-center ${
                    justBought === item.id ? 'ring-4 ring-amber-300' : ''
                  }`}
                >
                  <ItemArt item={item} size={64} />
                  <span className="text-xs font-bold font-[Fredoka] text-gray-600 text-center leading-tight">{item.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="It's yours!" />
    </div>
  );
}
