import { describe, it, expect } from 'vitest';
import { FIELD_NOTE_CAP, appendNote, createInitialState, migrateLoadedState, STARTING_BIOME_IDS } from '@/lib/save';
import { BIOMES } from '@/data/biomes';
import type { FieldNote, GameState } from '@/types/game';

function note(i: number): FieldNote {
  return { id: `n${i}`, timestamp: '2026-09-04T00:00:00Z', biomeId: 'muir-woods', type: 'collection', text: `note ${i}` };
}

describe('appendNote', () => {
  it('appends below the cap', () => {
    expect(appendNote([note(1)], note(2)).map(n => n.id)).toEqual(['n1', 'n2']);
  });
  it('drops the oldest once the cap is reached', () => {
    const full = Array.from({ length: FIELD_NOTE_CAP }, (_, i) => note(i));
    const next = appendNote(full, note(999));
    expect(next).toHaveLength(FIELD_NOTE_CAP);
    expect(next[0].id).toBe('n1');
    expect(next[next.length - 1].id).toBe('n999');
  });
});

describe('createInitialState', () => {
  it('starts with the two Marin biomes, full health, and empty exhibits for every biome', () => {
    const s = createInitialState('Maren', '🦉');
    expect(s.playerName).toBe('Maren');
    expect(s.avatar).toBe('🦉');
    expect(s.unlockedBiomes).toEqual([...STARTING_BIOME_IDS]);
    for (const b of BIOMES) {
      expect(s.biomeHealth[b.id]).toBe(100);
      expect(s.exhibits[b.id]).toEqual([null, null, null]);
    }
    expect(s.devMode).toBeUndefined();
  });
});

describe('migrateLoadedState', () => {
  it('fills every field missing from a minimal legacy save', () => {
    const legacy = { playerName: 'Old', xp: 250, rank: 'junior-explorer', specimens: [], discoveredSpecies: [] };
    const s = migrateLoadedState(legacy as Partial<GameState> & Record<string, unknown>);
    const fresh = createInitialState();
    for (const key of Object.keys(fresh) as (keyof GameState)[]) {
      expect(s[key], `missing ${key}`).toBeDefined();
    }
    expect(s.playerName).toBe('Old');
    expect(s.xp).toBe(250);
    expect(s.exhibits[BIOMES[0].id]).toEqual([null, null, null]);
  });
  it('pads short exhibit halls and adds missing biomes', () => {
    const s = migrateLoadedState({ exhibits: { 'muir-woods': ['tule-elk'] } } as Partial<GameState> & Record<string, unknown>);
    expect(s.exhibits['muir-woods']).toEqual(['tule-elk', null, null]);
    expect(s.exhibits['santa-rosa-island']).toEqual([null, null, null]);
  });
  it('trims an oversized field-note log to the cap', () => {
    const notes = Array.from({ length: FIELD_NOTE_CAP + 50 }, (_, i) => note(i));
    const s = migrateLoadedState({ fieldNotes: notes } as Partial<GameState> & Record<string, unknown>);
    expect(s.fieldNotes).toHaveLength(FIELD_NOTE_CAP);
    expect(s.fieldNotes[0].id).toBe('n50');
  });
});
