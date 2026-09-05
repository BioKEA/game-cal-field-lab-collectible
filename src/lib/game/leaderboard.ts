import { GAME_ID, leaderboard } from '@/lib/leaderboard-client'
import type { GameState, PlayerRank } from '@/types/game'
import { getPlayerHandle } from '@/lib/handle'

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

const WEEKLY_SUBMIT_KEY = 'cal-field-lab-weekly-submitted'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function currentWeekKey(now: Date = new Date()): string {
  const weekNum = Math.floor(now.getTime() / WEEK_MS)
  return `week-${weekNum}`
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

export async function submitWeeklyScore(args: {
  weekKey: string
  state: GameState
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const handle = getPlayerHandle(args.state.playerName) ?? 'anon'

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
