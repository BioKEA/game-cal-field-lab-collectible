// Single source of truth for "who is this player" across the weekly
// leaderboard and the Golden Sample hunt. The cross-game key is written
// by the shared BiokeaLeaderboardPrompt and by any other BioKEA game;
// we only fill it when it is empty so a handle chosen elsewhere wins.

export const CROSS_GAME_HANDLE_KEY = 'biokea:player:handle';
const DEFAULT_NAME = 'Researcher';
const HANDLE_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

export function sanitizeHandle(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

export function readCrossGameHandle(): string | null {
  try {
    const v = localStorage.getItem(CROSS_GAME_HANDLE_KEY);
    return v && HANDLE_REGEX.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function getPlayerHandle(playerName: string): string | null {
  const stored = readCrossGameHandle();
  if (stored) return stored;
  const fallback = sanitizeHandle(playerName);
  return fallback || null;
}

export function ensureCrossGameHandle(playerName: string): void {
  if (readCrossGameHandle()) return;
  const clean = sanitizeHandle(playerName);
  if (!clean || clean === DEFAULT_NAME) return;
  try {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, clean);
  } catch {
    /* ignore */
  }
}
