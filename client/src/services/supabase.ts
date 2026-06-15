import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Create Supabase client
// URL polyfill is imported in index.js to fix protocol errors
export const supabase: SupabaseClient = createClient(
  'https://gclpmnclxvgqoiedguoc.supabase.co',
  'sb_publishable_go4YUYbWiKeTn0X8cfSOZQ_kZdm2dA6'
);

// Export getter function for consistency
export function getSupabase(): SupabaseClient {
  return supabase;
}
