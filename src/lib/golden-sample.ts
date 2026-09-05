// src/lib/golden-sample.ts
//
// Biodiversity Discovery Lab's slice of the Golden Sample 26 hunt.
// Slot 3 unlocks once 5 specimens have reached the "identified" lab
// stage. Long-form games like this don't post to the shared `scores`
// table, so we report a milestone counter directly to the central
// hunt API. The handle comes from src/lib/handle.ts.
//
// I won't tell. That would be cheating.

const API_BASE = '/api/golden-sample';
const TICKETS_KEY = 'biokea:golden-tickets:v1';
const CLIENT_ID_KEY = 'biokea-leaderboard-client-id';

const GAME_ID = 'cal-field-lab-collectible';
const SLOT = 3;

function alreadyHeld(): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(TICKETS_KEY) ?? '{}');
    return !!map[String(SLOT)];
  } catch {
    return false;
  }
}

function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return '00000000-0000-4000-8000-000000000000';
  }
}

interface ClaimResponse {
  ok: boolean;
  slot?: number;
  word?: string;
  token?: string;
  issued_at?: string;
  first_earn?: boolean;
}

interface GoldenFoundDetail {
  game: string;
  slot: number;
  word: string;
  token?: string;
  issued_at?: string;
  alreadyHeld: boolean;
}

// Fire-and-forget. Server stores `max(stored, count)` so duplicate or
// out-of-order POSTs are safe.
export async function reportMilestone(handle: string, count: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/milestone`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle, game: GAME_ID, count }),
    });
  } catch {
    // network — non-fatal, retried on the next milestone tick
  }
}

export async function tryClaimGoldenSample(handle: string): Promise<void> {
  if (alreadyHeld()) return;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/claim/${GAME_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle, client_id: getClientId() }),
    });
  } catch {
    return;
  }
  if (!res.ok) return;
  let body: ClaimResponse;
  try {
    body = (await res.json()) as ClaimResponse;
  } catch {
    return;
  }
  if (!body.ok || !body.word || !body.slot) return;

  const detail: GoldenFoundDetail = {
    game: GAME_ID,
    slot: body.slot,
    word: body.word,
    token: body.token,
    issued_at: body.issued_at,
    alreadyHeld: !body.first_earn,
  };
  window.dispatchEvent(new CustomEvent<GoldenFoundDetail>('biokea:golden-found', { detail }));
}

// Report the new high-water mark, then attempt a claim. Called from the
// game-state hook whenever stats.totalIdentified rises.
export async function reportSpecimenIdentified(handle: string, totalIdentified: number): Promise<void> {
  await reportMilestone(handle, totalIdentified);
  await tryClaimGoldenSample(handle);
}
