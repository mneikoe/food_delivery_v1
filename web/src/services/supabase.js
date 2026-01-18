import { createClient } from '@supabase/supabase-js';

// Use the same Supabase URL and key as the client app
const supabaseUrl = 'https://gclpmnclxvgqoiedguoc.supabase.co';
const supabaseKey = 'sb_publishable_go4YUYbWiKeTn0X8cfSOZQ_kZdm2dA6';

export const supabase = createClient(supabaseUrl, supabaseKey);
