import { useState } from 'react';
import { SHOP_ITEMS } from '@/data/shop';
import { isTierUnlocked, getRegionByTier } from '@/data/regions';
import { RANK_THRESHOLDS, RANK_LABELS } from '@/types/game';
import type { GameState, PlayerRank } from '@/types/game';

interface ShopProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onPurchase: (itemId: string, price: number, effect: { type: string; key?: string; amount?: number }) => void;
}

type Category = 'all' | 'reagent' | 'equipment' | 'upgrade';

function meetsRankRequirement(currentRank: PlayerRank, requiredRank?: string): boolean {
  if (!requiredRank) return true;
  const currentXP = RANK_THRESHOLDS[currentRank];
  const requiredXP = RANK_THRESHOLDS[requiredRank as PlayerRank] ?? 0;
  return currentXP >= requiredXP;
}

export default function Shop({ state, onNavigate, onPurchase }: ShopProps) {
  const [category, setCategory] = useState<Category>('all');
  const [justBought, setJustBought] = useState<string | null>(null);

  const filteredItems = category === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(item => item.category === category);

  const handlePurchase = (item: typeof SHOP_ITEMS[0]) => {
    if (state.bioCredits < item.price) return;
    if (item.rankRequired && !meetsRankRequirement(state.rank, item.rankRequired)) return;
    if (item.tierRequired && !isTierUnlocked(item.tierRequired, state)) return;
    // Don't buy biome unlock if already unlocked
    if (item.effect.type === 'unlock-biome' && item.effect.key && state.unlockedBiomes.includes(item.effect.key)) return;

    onPurchase(item.id, item.price, item.effect);
    setJustBought(item.id);
    setTimeout(() => setJustBought(null), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1610' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#2a4030', background: '#0c1a12' }}>
        <button
          onClick={() => onNavigate('hq')}
          className="text-sm"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <h2 className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
          Supply Depot
        </h2>
        <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#c9a84c' }}>
          💰 {state.bioCredits}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 py-3 flex gap-2 border-b overflow-x-auto" style={{ borderColor: '#1a2a20' }}>
        {([
          { key: 'all', label: 'All' },
          { key: 'reagent', label: 'Reagents' },
          { key: 'equipment', label: 'Equipment' },
          { key: 'upgrade', label: 'Upgrades' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: category === tab.key ? '#1a3520' : 'transparent',
              border: `1px solid ${category === tab.key ? '#4a8a4a' : '#2a4030'}`,
              color: category === tab.key ? '#c9a84c' : '#5a7a5a',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.map(item => {
          const canAfford = state.bioCredits >= item.price;
          const hasRank = meetsRankRequirement(state.rank, item.rankRequired);
          const hasTier = item.tierRequired ? isTierUnlocked(item.tierRequired, state) : true;
          const alreadyOwned = item.effect.type === 'unlock-biome' && item.effect.key && state.unlockedBiomes.includes(item.effect.key);
          const wasBought = justBought === item.id;
          const tierRegion = item.tierRequired ? getRegionByTier(item.tierRequired - 1) : undefined;

          return (
            <div
              key={item.id}
              className="rounded-xl p-4 transition-all"
              style={{
                background: wasBought
                  ? 'linear-gradient(135deg, #1a4530, #14231a)'
                  : '#14231a',
                border: `1px solid ${wasBought ? '#4a8a4a' : '#2a4030'}`,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl shrink-0">{item.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
                      {item.name}
                    </div>
                    {alreadyOwned && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#4a8a4a20', color: '#4a8a4a' }}>
                        Owned
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#8aaa7a' }}>
                    {item.description}
                  </p>
                  {item.rankRequired && !hasRank && (
                    <div className="text-xs mt-2" style={{ color: '#c9a84c' }}>
                      Requires {RANK_LABELS[item.rankRequired as PlayerRank]}
                    </div>
                  )}
                  {!hasTier && tierRegion && (
                    <div className="text-xs mt-2" style={{ color: '#d4a574' }}>
                      Requires 60% of {tierRegion.name} catalogued
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford || !hasRank || !hasTier || !!alreadyOwned || !!wasBought}
                  className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  style={{
                    background: wasBought ? '#4a8a4a' : canAfford ? '#1a3520' : '#14231a',
                    border: `1px solid ${wasBought ? '#4a8a4a' : canAfford ? '#c9a84c40' : '#2a4030'}`,
                    color: wasBought ? '#e8e4d8' : '#c9a84c',
                  }}
                >
                  {wasBought ? '✓' : alreadyOwned ? 'Owned' : `💰 ${item.price}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Inventory */}
      <div className="px-4 py-3 border-t" style={{ borderColor: '#2a4030', background: '#0c1a12' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
          YOUR INVENTORY
        </div>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-xs" style={{ color: '#8aaa7a' }}>🧪 Kits</div>
            <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>{state.reagents.extractionKits}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#8aaa7a' }}>🔄 Primers</div>
            <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>{state.reagents.pcrPrimers}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#8aaa7a' }}>🧬 Cells</div>
            <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>{state.reagents.flowCells}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#8aaa7a' }}>⚡ Stamina</div>
            <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>{state.maxStamina}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: '#8aaa7a' }}>⛽ Fuel</div>
            <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>{state.maxExpeditionFuel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
