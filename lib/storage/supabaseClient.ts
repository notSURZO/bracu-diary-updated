"use client";
import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;
export function getSupabaseClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  client = createClient(url, anon, { auth: { persistSession: false } });
  return client;
}
