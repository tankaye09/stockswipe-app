// Where stock data comes from. Sample data unless EXPO_PUBLIC_DATA_SOURCE=live
// and the Supabase URL and public read-only key are set (see .env.example).
// Unit tests and e2e flows always use sample data.

export type DataSource = 'mock' | 'live';

export interface LiveConfig {
  url: string;
  anonKey: string;
}

/** Returns the live database settings, or null to use sample data. */
export function liveConfig(
  source: string | undefined,
  url: string | undefined,
  anonKey: string | undefined,
): LiveConfig | null {
  if (source?.trim() !== 'live' || !url?.trim() || !anonKey?.trim()) return null;
  return { url: url.trim(), anonKey: anonKey.trim() };
}

// Expo only inlines env vars written out in full, so each is read by name.
export const LIVE = liveConfig(
  process.env.EXPO_PUBLIC_DATA_SOURCE,
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export const DATA_SOURCE: DataSource = LIVE ? 'live' : 'mock';
