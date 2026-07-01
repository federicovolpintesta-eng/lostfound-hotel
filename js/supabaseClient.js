const SUPABASE_URL = "https://nfjwpsnztkihqwdbmxja.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j5n8f34qwwukhOiWRZJqhw_eyFKtJGS";

// supabase global variable is loaded via script tag in index.html
export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
