import { createClient } from '@supabase/supabase-js';

// Server-side admin client (service role)
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  if (!url || !serviceRole) throw new Error('Missing Supabase env (URL or SERVICE ROLE KEY)');
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export function getPublicObjectUrl(bucket: string, path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  // Public bucket object URL
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
