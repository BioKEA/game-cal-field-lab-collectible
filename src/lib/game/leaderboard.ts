import { GAME_ID, leaderboard } from '@/lib/leaderboard-client'
import type { GameState, PlayerRank } from '@/types/game'

export interface LeaderboardRow {
  id: string
  handle: string
  score: number
  rank: PlayerRank | null
  speciesCount: number
  exhibitsBuilt: number
  regionsUnlocked: number
  trend: 'up' | 'down' | 'flat'
  created_at: string
}

const HANDLE_KEY = 'cal-field-lab-handle'
const WEEKLY_SUBMIT_KEY = 'cal-field-lab-weekly-submitted'
const DAILY_SUBMIT_KEY = 'cal-field-lab-daily-submitted-v1'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function currentWeekKey(now: Date = new Date()): string {
  const weekNum = Math.floor(now.getTime() / WEEK_MS)
  return `week-${weekNum}`
}

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function loadHandle(): string | null {
  return localStorage.getItem(HANDLE_KEY)
}

export function saveHandle(handle: string) {
  const clean = sanitizeHandle(handle)
  if (!clean) return
  localStorage.setItem(HANDLE_KEY, clean)
}

export function sanitizeHandle(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .trim()
    .slice(0, 32)
}

export function hasSubmittedThisWeek(weekKey: string): boolean {
  const v = localStorage.getItem(WEEKLY_SUBMIT_KEY)
  if (!v) return false
  try {
    const data = JSON.parse(v)
    return data.week === weekKey
  } catch {
    return false
  }
}

export function markSubmittedThisWeek(weekKey: string, score: number) {
  localStorage.setItem(WEEKLY_SUBMIT_KEY, JSON.stringify({ week: weekKey, score }))
}

// Submit today's XP to the cross-game leaderboard. Idempotent per day if
// the recorded score hasn't risen — avoids spamming Supabase on every
// Team-page revisit. Mode 'daily' + seed=YYYY-MM-DD matches the BKP
// `ranked_modes` lookup in website-biokea migration 0003.
export async function submitDailyScore(args: {
  day: string
  state: GameState
}): Promise<{ ok: true; submitted: boolean } | { ok: false; error: string }> {
  const handle = sanitizeHandle(args.state.playerName)
  if (!handle) return { ok: true, submitted: false }
  if (args.state.xp <= 0) return { ok: true, submitted: false }

  // De-dupe: only submit if today's recorded best is lower than current XP.
  const prevRaw = localStorage.getItem(DAILY_SUBMIT_KEY)
  let prevScore = 0
  let prevDay = ''
  if (prevRaw) {
    try {
      const prev = JSON.parse(prevRaw) as { day?: string; score?: number }
      if (prev.day === args.day && typeof prev.score === 'number') prevScore = prev.score
      prevDay = prev.day ?? ''
    } catch {
      // ignore
    }
  }
  if (prevDay === args.day && args.state.xp <= prevScore) {
    return { ok: true, submitted: false }
  }

  const result = await leaderboard.submitScore({
    gameId: GAME_ID,
    mode: 'daily',
    seed: args.day,
    score: args.state.xp,
    playerHandle: handle,
    metadata: {
      rank: args.state.rank,
      speciesCount: args.state.discoveredSpecies.length,
      regionsUnlocked: args.state.unlockedBiomes.length,
    },
  })

  if (!result.ok) {
    const msg =
      result.reason === 'rate_limited' ? 'Slow down — too many submissions.' :
      result.reason === 'invalid' ? 'Score rejected.' :
      result.reason === 'unconfigured' ? 'Leaderboard offline.' :
      'Network error.'
    return { ok: false, error: msg }
  }
  localStorage.setItem(DAILY_SUBMIT_KEY, JSON.stringify({ day: args.day, score: args.state.xp }))
  return { ok: true, submitted: true }
}

export async function submitWeeklyScore(args: {
  weekKey: string
  state: GameState
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const handle = sanitizeHandle(args.state.playerName) || 'anon'

  const result = await leaderboard.submitScore({
    gameId: GAME_ID,
    mode: 'weekly',
    seed: args.weekKey,
    score: args.state.xp,
    playerHandle: handle,
    metadata: {
      rank: args.state.rank,
      speciesCount: args.state.discoveredSpecies.length,
      exhibitsBuilt: Object.values(args.state.exhibits ?? {}).reduce(
        (acc, slots) => acc + slots.filter(s => s !== null).length,
        0,
      ),
      regionsUnlocked: args.state.unlockedBiomes.length,
      totalPlaytimeSec: args.state.totalPlaytimeSec,
      avatar: args.state.avatar,
    },
  })

  if (!result.ok) {
    const msg =
      result.reason === 'rate_limited' ? 'Slow down — too many submissions.' :
      result.reason === 'invalid' ? 'Score rejected.' :
      result.reason === 'unconfigured' ? 'Leaderboard offline.' :
      'Network error.'
    return { ok: false, error: msg }
  }
  markSubmittedThisWeek(args.weekKey, args.state.xp)
  return { ok: true }
}

export async function fetchWeeklyTopScores(
  weekKey: string,
  limit = 25,
): Promise<LeaderboardRow[]> {
  const entries = await leaderboard.getTopScores({
    gameId: GAME_ID,
    mode: 'weekly',
    seed: weekKey,
    limit,
  })
  return entries.map(toRow)
}

export async function fetchPlayerWeeklyRank(
  weekKey: string,
  score: number,
): Promise<number | null> {
  return leaderboard.getPlayerRank({
    gameId: GAME_ID,
    mode: 'weekly',
    seed: weekKey,
    score,
  })
}

function toRow(entry: {
  id: string
  player_handle: string
  score: number
  metadata: Record<string, unknown>
  created_at: string
}): LeaderboardRow {
  const meta = entry.metadata ?? {}
  return {
    id: entry.id,
    handle: entry.player_handle,
    score: entry.score,
    rank: typeof meta.rank === 'string' ? (meta.rank as PlayerRank) : null,
    speciesCount: typeof meta.speciesCount === 'number' ? meta.speciesCount : 0,
    exhibitsBuilt: typeof meta.exhibitsBuilt === 'number' ? meta.exhibitsBuilt : 0,
    regionsUnlocked: typeof meta.regionsUnlocked === 'number' ? meta.regionsUnlocked : 0,
    trend: 'flat',
    created_at: entry.created_at,
  }
}
