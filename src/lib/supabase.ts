import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export const isSupabaseConfigured = Boolean(url && key);

export const env = {
  appName: import.meta.env.VITE_APP_NAME ?? 'Garmin',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
};
