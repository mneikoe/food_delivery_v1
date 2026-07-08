const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = 'https://gclpmnclxvgqoiedguoc.supabase.co';
const supabaseKey = 'sb_publishable_go4YUYbWiKeTn0X8cfSOZQ_kZdm2dA6';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

module.exports = supabase;
