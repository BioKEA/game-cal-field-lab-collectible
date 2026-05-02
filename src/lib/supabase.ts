import { createClient } from '@supabase/supabase-js'

// Bespoke Supabase client retained for cross-save / save-sync only.
// Leaderboard now goes through @biokea/leaderboard via src/lib/leaderboard-client.ts.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase env vars not set. Save-sync queries will fail silently until ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are in .env.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
